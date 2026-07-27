import base64
import copy
import hashlib
import io
import json
import re
import threading
import uuid
from pathlib import Path
from typing import Callable
from urllib.parse import quote

from PIL import Image

from project_service import ProjectError, ProjectService, utc_now


AGENT_PROTOCOL_VERSION = "1.0"
AGENT_RECIPE_SCHEMA_VERSION = 1
AGENT_RUN_SCHEMA_VERSION = 1
AGENT_RUN_STATUSES = {
    "planned",
    "running",
    "awaiting_action",
    "awaiting_approval",
    "succeeded",
    "failed",
    "canceled",
}
AGENT_ACTION_STATUSES = {
    "pending",
    "action_required",
    "awaiting_approval",
    "submitting",
    "queued",
    "running",
    "succeeded",
    "failed",
    "canceled",
    "skipped",
}
AGENT_ACTION_TYPES = {
    "workflow.plan",
    "style.define",
    "style.create",
    "style.confirm",
    "asset.plan",
    "asset.create",
    "image.generate",
    "image.matte",
    "image.split",
    "quality.review",
    "library.ingest",
    "flow.save",
}
AGENT_OWNED_ACTION_TYPES = {
    "workflow.plan",
    "style.define",
    "asset.plan",
    "quality.review",
}
SERVER_ACTION_TYPES = {
    "style.create",
    "style.confirm",
    "asset.create",
    "image.matte",
    "image.split",
    "library.ingest",
    "flow.save",
}
ACTION_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$")
DATA_URL_PATTERN = re.compile(
    r"data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=\r\n]+)",
    flags=re.IGNORECASE,
)
MAX_AGENT_IMAGE_BYTES = 20 * 1024 * 1024
TERMINAL_ACTION_STATUSES = {"succeeded", "failed", "canceled", "skipped"}


class AgentWorkflowError(ProjectError):
    pass


class AgentWorkflowService:
    def __init__(
        self,
        project_service: ProjectService,
        generation_service_factory: Callable[[str], object],
        *,
        processing_executor: Callable[[str, dict, dict], dict] | None = None,
    ):
        self.project_service = project_service
        self.generation_service_factory = generation_service_factory
        self.processing_executor = processing_executor
        self._lock = threading.RLock()

    @staticmethod
    def manifest() -> dict:
        return {
            "protocol_version": AGENT_PROTOCOL_VERSION,
            "transport": {
                "content_type": "application/json; charset=utf-8",
                "idempotency_header": "Idempotency-Key",
            },
            "capability_negotiation": {
                "native_image_generation": {
                    "type": "boolean",
                    "default": False,
                    "description": "Agent 是否能够直接生成图片并回传。",
                },
                "image_input": {
                    "type": "boolean",
                    "default": False,
                    "description": "Agent 是否能够读取图片并执行质量检查。",
                },
            },
            "image_executors": {
                "agent_native": "Agent 根据动作中的输出契约生成图片并回传。",
                "server_mcp": "灵帧工坊通过已配置的 MCP 图片服务提交并轮询任务。",
            },
            "run_states": sorted(AGENT_RUN_STATUSES),
            "action_states": sorted(AGENT_ACTION_STATUSES),
            "action_types": {
                "workflow.plan": {
                    "executor": "agent",
                    "purpose": "把原始需求编译成有依赖关系的机器可执行步骤。",
                    "result_schema": {"steps": "array"},
                },
                "style.define": {
                    "executor": "agent",
                    "purpose": "确定风格名称、风格约束、负面约束与参考职责。",
                },
                "style.create": {
                    "executor": "server",
                    "required_inputs": ["name"],
                },
                "style.confirm": {
                    "executor": "server",
                    "required_inputs": ["style_id"],
                },
                "asset.plan": {
                    "executor": "agent",
                    "purpose": "把需求拆成具体资产节点及生成规格。",
                },
                "asset.create": {
                    "executor": "server",
                    "required_inputs": ["parent_id", "name"],
                },
                "image.generate": {
                    "executor": "negotiated",
                    "required_inputs": ["prompt", "model", "asset_node_id"],
                    "native_result": {
                        "data_url": "PNG/JPEG/WebP data URL，最大 20 MB",
                        "file_name": "string",
                    },
                },
                "image.matte": {
                    "executor": "server",
                    "required_inputs": ["record_id"],
                },
                "image.split": {
                    "executor": "server",
                    "required_inputs": ["record_id"],
                },
                "quality.review": {
                    "executor": "agent",
                    "purpose": "按动作验收条件检查输出并返回通过或问题清单。",
                },
                "library.ingest": {
                    "executor": "server",
                    "required_inputs": ["record_ids"],
                },
                "flow.save": {
                    "executor": "server",
                    "purpose": "把当前运行步骤保存为新的可复用流程配方。",
                },
            },
            "reference_syntax": {
                "shape": {"$from": "action_id", "path": "record.id"},
                "description": "输入对象可引用已成功动作的输出字段。",
            },
            "recommended_flow": [
                "style.define",
                "style.create",
                "image.generate",
                "style.confirm",
                "asset.plan",
                "asset.create",
                "image.generate",
                "image.matte",
                "image.split",
                "quality.review",
                "library.ingest",
                "flow.save",
            ],
            "safety": {
                "paid_generation": "MCP 任务必须先得到报价，并按运行预算或显式批准继续。",
                "paths": "图片只允许通过受控 data URL 回传；不接受客户端绝对路径。",
                "retries": "动作结果、生成提交、处理和入库均应使用幂等键。",
            },
        }

    def _workflow_root(self, project_id: str) -> Path:
        root = self.project_service.project_paths(project_id)["marker"] / "agent-workflows"
        root.mkdir(parents=True, exist_ok=True)
        return root

    def _recipes_root(self, project_id: str) -> Path:
        path = self._workflow_root(project_id) / "recipes"
        path.mkdir(parents=True, exist_ok=True)
        return path

    def _runs_root(self, project_id: str) -> Path:
        path = self._workflow_root(project_id) / "runs"
        path.mkdir(parents=True, exist_ok=True)
        return path

    def _recipe_versions(self, project_id: str, recipe_id: str) -> list[Path]:
        if not re.fullmatch(r"recipe_[a-f0-9]{32}", str(recipe_id or "")):
            raise AgentWorkflowError("Invalid workflow recipe ID")
        root = self._recipes_root(project_id) / recipe_id
        return sorted(root.glob("v*.json"))

    def _read_json(self, path: Path) -> dict:
        return self.project_service._read_json(path, {})

    def _write_json(self, path: Path, payload: dict) -> None:
        with self.project_service._locked():
            self.project_service._atomic_write_json(path, payload)

    @staticmethod
    def _normalized_capabilities(value: object) -> dict:
        payload = value if isinstance(value, dict) else {}
        return {
            "native_image_generation": bool(
                payload.get("native_image_generation", False)
            ),
            "image_input": bool(payload.get("image_input", False)),
        }

    @staticmethod
    def _normalized_policy(value: object) -> dict:
        payload = value if isinstance(value, dict) else {}
        paid = payload.get("paid_generation")
        if not isinstance(paid, dict):
            paid = {}
        mode = str(paid.get("mode") or "manual")
        if mode not in {"manual", "auto_under_budget", "always"}:
            raise AgentWorkflowError("Invalid paid generation approval mode")
        max_total = paid.get("max_total")
        if max_total is not None:
            try:
                max_total = max(0.0, float(max_total))
            except (TypeError, ValueError) as exc:
                raise AgentWorkflowError("Generation budget must be numeric") from exc
        return {
            "image_generator": (
                str(payload.get("image_generator") or "auto")
                if str(payload.get("image_generator") or "auto")
                in {"auto", "agent_native", "server_mcp"}
                else "auto"
            ),
            "paid_generation": {
                "mode": mode,
                "max_total": max_total,
                "currency": str(paid.get("currency") or "CNY").upper(),
            },
        }

    @staticmethod
    def _action_executor(action_type: str, capabilities: dict, policy: dict) -> str:
        if action_type in AGENT_OWNED_ACTION_TYPES:
            return "agent"
        if action_type == "image.generate":
            requested = policy.get("image_generator") or "auto"
            if requested == "agent_native":
                if not capabilities.get("native_image_generation"):
                    raise AgentWorkflowError(
                        "Agent declared no native image generation capability"
                    )
                return "agent_native"
            if requested == "server_mcp":
                return "server_mcp"
            return (
                "agent_native"
                if capabilities.get("native_image_generation")
                else "server_mcp"
            )
        return "server"

    def _normalize_steps(
        self,
        steps: object,
        *,
        capabilities: dict | None = None,
        policy: dict | None = None,
    ) -> list[dict]:
        if not isinstance(steps, list) or not steps:
            raise AgentWorkflowError("Workflow steps must be a non-empty array")
        if len(steps) > 100:
            raise AgentWorkflowError("Workflow supports at most 100 steps")
        capabilities = capabilities or self._normalized_capabilities({})
        policy = policy or self._normalized_policy({})
        normalized: list[dict] = []
        seen = set()
        for index, raw_step in enumerate(steps):
            if not isinstance(raw_step, dict):
                raise AgentWorkflowError("Each workflow step must be an object")
            action_id = str(raw_step.get("id") or f"step-{index + 1}").strip()
            if not ACTION_ID_PATTERN.fullmatch(action_id) or action_id in seen:
                raise AgentWorkflowError(f"Invalid or duplicate action ID: {action_id}")
            action_type = str(raw_step.get("type") or "").strip()
            if action_type not in AGENT_ACTION_TYPES:
                raise AgentWorkflowError(f"Unsupported action type: {action_type}")
            dependencies = raw_step.get("depends_on")
            if dependencies is None:
                dependencies = []
            if not isinstance(dependencies, list):
                raise AgentWorkflowError("Action dependencies must be an array")
            dependencies = list(
                dict.fromkeys(str(item or "").strip() for item in dependencies)
            )
            if action_id in dependencies:
                raise AgentWorkflowError("Action cannot depend on itself")
            seen.add(action_id)
            normalized.append(
                {
                    "id": action_id,
                    "type": action_type,
                    "name": str(raw_step.get("name") or action_type)[:160],
                    "depends_on": dependencies,
                    "executor": self._action_executor(
                        action_type, capabilities, policy
                    ),
                    "status": "pending",
                    "inputs": copy.deepcopy(
                        raw_step.get("inputs")
                        if isinstance(raw_step.get("inputs"), dict)
                        else {}
                    ),
                    "instructions": copy.deepcopy(
                        raw_step.get("instructions")
                        if isinstance(raw_step.get("instructions"), dict)
                        else {}
                    ),
                    "output_contract": copy.deepcopy(
                        raw_step.get("output_contract")
                        if isinstance(raw_step.get("output_contract"), dict)
                        else {}
                    ),
                    "retry_count": 0,
                    "created_at": utc_now(),
                    "updated_at": utc_now(),
                }
            )
        known = {step["id"] for step in normalized}
        for step in normalized:
            missing = [item for item in step["depends_on"] if item not in known]
            if missing:
                raise AgentWorkflowError(
                    f"Action dependency does not exist: {missing[0]}"
                )
        self._assert_acyclic(normalized)
        return normalized

    @staticmethod
    def _assert_acyclic(steps: list[dict]) -> None:
        dependencies = {step["id"]: set(step["depends_on"]) for step in steps}
        remaining = set(dependencies)
        while remaining:
            ready = {
                action_id
                for action_id in remaining
                if not dependencies[action_id].intersection(remaining)
            }
            if not ready:
                raise AgentWorkflowError("Workflow dependencies contain a cycle")
            remaining.difference_update(ready)

    def create_recipe(
        self,
        project_id: str,
        *,
        name: str,
        steps: list[dict],
        actor: str = "agent",
        description: str = "",
        idempotency_key: str = "",
    ) -> dict:
        name = str(name or "").strip()
        if not name:
            raise AgentWorkflowError("Workflow recipe name is required")
        normalized_steps = self._normalize_steps(steps)
        key = str(idempotency_key or "").strip()[:160]
        with self._lock:
            if key:
                for path in self._recipes_root(project_id).glob("recipe_*/v*.json"):
                    payload = self._read_json(path)
                    if payload.get("idempotency_key") == key:
                        return payload
            recipe_id = f"recipe_{uuid.uuid4().hex}"
            now = utc_now()
            recipe = {
                "schema_version": AGENT_RECIPE_SCHEMA_VERSION,
                "protocol_version": AGENT_PROTOCOL_VERSION,
                "id": recipe_id,
                "project_id": project_id,
                "version": 1,
                "name": name[:160],
                "description": str(description or "")[:1000],
                "steps": normalized_steps,
                "actor": str(actor or "agent"),
                "idempotency_key": key,
                "created_at": now,
                "updated_at": now,
            }
            self._write_json(
                self._recipes_root(project_id) / recipe_id / "v0001.json",
                recipe,
            )
            self.project_service.append_event(
                project_id,
                "agent.recipe-created",
                actor=recipe["actor"],
                data={"recipe_id": recipe_id, "version": 1},
            )
            return copy.deepcopy(recipe)

    def list_recipes(self, project_id: str) -> list[dict]:
        recipes = []
        with self._lock:
            for recipe_dir in self._recipes_root(project_id).glob("recipe_*"):
                versions = sorted(recipe_dir.glob("v*.json"))
                if versions:
                    recipes.append(self._read_json(versions[-1]))
        recipes.sort(key=lambda item: str(item.get("updated_at") or ""), reverse=True)
        return recipes

    def get_recipe(
        self, project_id: str, recipe_id: str, version: int | None = None
    ) -> dict:
        versions = self._recipe_versions(project_id, recipe_id)
        if not versions:
            raise AgentWorkflowError("Workflow recipe does not exist")
        if version is None:
            path = versions[-1]
        else:
            path = self._recipes_root(project_id) / recipe_id / f"v{int(version):04d}.json"
            if not path.is_file():
                raise AgentWorkflowError("Workflow recipe version does not exist")
        return self._read_json(path)

    def update_recipe(
        self,
        project_id: str,
        recipe_id: str,
        *,
        changes: dict,
        actor: str = "agent",
    ) -> dict:
        with self._lock:
            current = self.get_recipe(project_id, recipe_id)
            version = int(current.get("version") or 1) + 1
            recipe = copy.deepcopy(current)
            if "name" in changes:
                name = str(changes.get("name") or "").strip()
                if not name:
                    raise AgentWorkflowError("Workflow recipe name is required")
                recipe["name"] = name[:160]
            if "description" in changes:
                recipe["description"] = str(changes.get("description") or "")[:1000]
            if "steps" in changes:
                recipe["steps"] = self._normalize_steps(changes.get("steps"))
            recipe["version"] = version
            recipe["actor"] = str(actor or "agent")
            recipe["updated_at"] = utc_now()
            recipe.pop("idempotency_key", None)
            self._write_json(
                self._recipes_root(project_id)
                / recipe_id
                / f"v{version:04d}.json",
                recipe,
            )
            self.project_service.append_event(
                project_id,
                "agent.recipe-version-created",
                actor=recipe["actor"],
                data={"recipe_id": recipe_id, "version": version},
            )
            return copy.deepcopy(recipe)

    def _run_path(self, project_id: str, run_id: str) -> Path:
        if not re.fullmatch(r"arun_[a-f0-9]{32}", str(run_id or "")):
            raise AgentWorkflowError("Invalid Agent run ID")
        return self._runs_root(project_id) / f"{run_id}.json"

    def _load_run(self, project_id: str, run_id: str) -> dict:
        run = self._read_json(self._run_path(project_id, run_id))
        if not run.get("id"):
            raise AgentWorkflowError("Agent run does not exist")
        return run

    def _save_run(self, run: dict) -> None:
        run["updated_at"] = utc_now()
        self._write_json(
            self._run_path(str(run["project_id"]), str(run["id"])), run
        )

    @staticmethod
    def _default_plan_step() -> list[dict]:
        return [
            {
                "id": "plan",
                "type": "workflow.plan",
                "name": "编译生产流程",
                "instructions": {
                    "goal": "把原始需求编译成风格确定、素材生成、抠图、拆分、质量检查、入库与流程保存步骤。",
                    "required_order": [
                        "style.define",
                        "style.create",
                        "image.generate",
                        "style.confirm",
                        "asset.plan",
                        "asset.create",
                        "image.generate",
                        "image.matte",
                        "image.split",
                        "quality.review",
                        "library.ingest",
                        "flow.save",
                    ],
                    "note": "可按实际需求省略不需要的处理步骤，但必须保留来源追溯和最终保存。",
                },
                "output_contract": {
                    "type": "object",
                    "required": ["steps"],
                    "properties": {"steps": {"type": "array"}},
                },
            }
        ]

    def create_run(
        self,
        project_id: str,
        *,
        request_text: str,
        capabilities: dict | None = None,
        execution_policy: dict | None = None,
        recipe_id: str = "",
        recipe_version: int | None = None,
        steps: list[dict] | None = None,
        variables: dict | None = None,
        actor: str = "agent",
        idempotency_key: str = "",
    ) -> dict:
        request_text = str(request_text or "").strip()
        if not request_text:
            raise AgentWorkflowError("Agent run request is required")
        capabilities = self._normalized_capabilities(capabilities)
        policy = self._normalized_policy(execution_policy)
        key = str(idempotency_key or "").strip()[:160]
        with self._lock:
            if key:
                for path in self._runs_root(project_id).glob("arun_*.json"):
                    payload = self._read_json(path)
                    if payload.get("idempotency_key") == key:
                        return self.advance_run(project_id, payload["id"])
            recipe = None
            if recipe_id:
                recipe = self.get_recipe(project_id, recipe_id, recipe_version)
                raw_steps = recipe["steps"]
            elif steps:
                raw_steps = steps
            else:
                raw_steps = self._default_plan_step()
            normalized_steps = self._normalize_steps(
                raw_steps, capabilities=capabilities, policy=policy
            )
            workflow = self.project_service.create_workflow_run(
                project_id,
                actor=actor,
                request_text=request_text,
                steps=normalized_steps,
                idempotency_key=f"agent:{key}" if key else "",
            )
            run_id = f"arun_{uuid.uuid4().hex}"
            now = utc_now()
            run = {
                "schema_version": AGENT_RUN_SCHEMA_VERSION,
                "protocol_version": AGENT_PROTOCOL_VERSION,
                "id": run_id,
                "project_id": project_id,
                "workflow_run_id": workflow["id"],
                "recipe_id": recipe.get("id") if recipe else "",
                "recipe_version": recipe.get("version") if recipe else None,
                "request": request_text,
                "actor": str(actor or "agent"),
                "capabilities": capabilities,
                "execution_policy": policy,
                "variables": copy.deepcopy(variables or {}),
                "status": "planned",
                "steps": normalized_steps,
                "outputs": {},
                "approvals": [],
                "idempotency_key": key,
                "created_at": now,
                "updated_at": now,
            }
            self._save_run(run)
            return self.advance_run(project_id, run_id)

    def list_runs(self, project_id: str, limit: int = 100) -> list[dict]:
        runs = [
            self._read_json(path)
            for path in self._runs_root(project_id).glob("arun_*.json")
        ]
        runs = [self._public_run(run) for run in runs if run.get("id")]
        runs.sort(key=lambda item: str(item.get("created_at") or ""), reverse=True)
        return runs[: max(1, min(int(limit or 100), 1000))]

    def get_run(self, project_id: str, run_id: str, *, advance: bool = True) -> dict:
        if advance:
            return self.advance_run(project_id, run_id)
        return self._public_run(self._load_run(project_id, run_id))

    @staticmethod
    def _action_by_id(run: dict, action_id: str) -> dict:
        action = next(
            (item for item in run.get("steps", []) if item.get("id") == action_id),
            None,
        )
        if action is None:
            raise AgentWorkflowError("Agent action does not exist")
        return action

    @staticmethod
    def _dependencies_succeeded(run: dict, action: dict) -> bool:
        by_id = {item["id"]: item for item in run.get("steps", [])}
        return all(
            by_id.get(dependency, {}).get("status") in {"succeeded", "skipped"}
            for dependency in action.get("depends_on", [])
        )

    @staticmethod
    def _dependency_failed(run: dict, action: dict) -> bool:
        by_id = {item["id"]: item for item in run.get("steps", [])}
        return any(
            by_id.get(dependency, {}).get("status") in {"failed", "canceled"}
            for dependency in action.get("depends_on", [])
        )

    @staticmethod
    def _value_at_path(value: object, path: str) -> object:
        current = value
        for segment in [item for item in str(path or "").split(".") if item]:
            if isinstance(current, dict):
                current = current.get(segment)
            elif isinstance(current, list) and segment.isdigit():
                index = int(segment)
                current = current[index] if 0 <= index < len(current) else None
            else:
                return None
        return copy.deepcopy(current)

    def _resolve_inputs(self, run: dict, value: object) -> object:
        if isinstance(value, dict):
            if set(value) == {"$from", "path"}:
                source = run.get("outputs", {}).get(str(value["$from"]), {})
                return self._value_at_path(source, str(value["path"]))
            return {
                key: self._resolve_inputs(run, child)
                for key, child in value.items()
            }
        if isinstance(value, list):
            return [self._resolve_inputs(run, child) for child in value]
        return copy.deepcopy(value)

    def _generation_quote(self, generation_service: object, inputs: dict) -> dict:
        model_id = str(inputs.get("model") or "").strip()
        params = inputs.get("params") if isinstance(inputs.get("params"), dict) else {}
        capability = generation_service.image_model_capability(model_id)
        if not capability:
            raise AgentWorkflowError(f"Unknown image model: {model_id}")
        references = params.get("reference_images")
        original_count = len(references) if isinstance(references, list) else 0
        return generation_service.estimate_image_cost(
            capability,
            params,
            effective_reference_count=original_count,
            original_reference_count=original_count,
            task_count=1,
        )

    @staticmethod
    def _quote_is_approved(run: dict, action: dict, quote_payload: dict) -> bool:
        policy = run.get("execution_policy", {}).get("paid_generation", {})
        mode = policy.get("mode") or "manual"
        if mode == "always":
            return True
        if any(
            approval.get("action_id") == action["id"]
            or approval.get("action_id") == "*"
            for approval in run.get("approvals", [])
        ):
            return True
        if mode != "auto_under_budget":
            return False
        total = quote_payload.get("total")
        maximum = policy.get("max_total")
        currency = str(quote_payload.get("currency") or "CNY").upper()
        return (
            total is not None
            and maximum is not None
            and currency == str(policy.get("currency") or "CNY").upper()
            and float(total) <= float(maximum)
        )

    def _execute_server_action(self, run: dict, action: dict, inputs: dict) -> dict:
        project_id = run["project_id"]
        actor = run.get("actor") or "agent"
        action_type = action["type"]
        if action_type == "style.create":
            style = self.project_service.create_style_direction(
                project_id,
                name=inputs.get("name"),
                description=inputs.get("description") or "",
                tags=inputs.get("tags"),
                actor=actor,
                idempotency_key=f"agent:{run['id']}:{action['id']}",
            )
            return {"style": style, "style_id": style["id"]}
        if action_type == "style.confirm":
            style = self.project_service.confirm_style_direction(
                project_id,
                style_id=str(inputs.get("style_id") or ""),
                actor=actor,
            )
            return {"style": style, "style_id": style["id"]}
        if action_type == "asset.create":
            node = self.project_service.create_asset_node(
                project_id,
                parent_id=inputs.get("parent_id"),
                name=inputs.get("name"),
                node_type=inputs.get("type") or "asset",
                target_count=inputs.get("target_count") or 1,
                actor=actor,
                idempotency_key=f"agent:{run['id']}:{action['id']}",
            )
            return {"node": node, "asset_node_id": node["id"]}
        if action_type in {"image.matte", "image.split"}:
            if self.processing_executor is None:
                raise AgentWorkflowError(
                    f"No processing executor is configured for {action_type}"
                )
            return self.processing_executor(
                action_type,
                inputs,
                {
                    "project_id": project_id,
                    "agent_run_id": run["id"],
                    "workflow_run_id": run["workflow_run_id"],
                    "action_id": action["id"],
                    "actor": actor,
                },
            )
        if action_type == "library.ingest":
            record_ids = inputs.get("record_ids")
            if not isinstance(record_ids, list):
                record_ids = [record_ids] if record_ids else []
            assets = self.project_service.ingest_library_assets(
                project_id, record_ids=record_ids, actor=actor
            )
            return {
                "assets": assets,
                "asset_ids": [item["id"] for item in assets],
            }
        if action_type == "flow.save":
            recipe = self.create_recipe(
                project_id,
                name=inputs.get("name") or f"{run['request'][:60]} 流程",
                description=inputs.get("description") or "",
                steps=[
                    {
                        key: copy.deepcopy(value)
                        for key, value in item.items()
                        if key
                        in {
                            "id",
                            "type",
                            "name",
                            "depends_on",
                            "inputs",
                            "instructions",
                            "output_contract",
                        }
                    }
                    for item in run["steps"]
                    if item["type"] not in {"workflow.plan", "flow.save"}
                ],
                actor=actor,
                idempotency_key=str(
                    inputs.get("idempotency_key")
                    or f"agent:{run['id']}:{action['id']}"
                ),
            )
            return {"recipe_id": recipe["id"], "recipe_version": recipe["version"]}
        raise AgentWorkflowError(f"Unsupported server action: {action_type}")

    def _submit_mcp_generation(
        self, run: dict, action: dict, inputs: dict
    ) -> dict | None:
        service = self.generation_service_factory(run["project_id"])
        existing = next(
            (
                record
                for record in service.list_history()
                if record.get("agent_run_id") == run["id"]
                and record.get("agent_action_id") == action["id"]
            ),
            None,
        )
        if existing is not None:
            action["generation_record_id"] = existing["id"]
            existing_status = str(existing.get("status") or "")
            action["status"] = (
                existing_status
                if existing_status in AGENT_ACTION_STATUSES
                else "running"
            )
            if existing_status == "succeeded":
                action["finished_at"] = utc_now()
                return self._generation_output(run["project_id"], existing)
            if existing_status in {"failed", "canceled", "download_failed"}:
                action["status"] = (
                    "canceled" if existing_status == "canceled" else "failed"
                )
                action["error"] = str(existing.get("error") or existing_status)
                return None
            return None
        quote_payload = self._generation_quote(service, inputs)
        action["quote"] = quote_payload
        if not self._quote_is_approved(run, action, quote_payload):
            action["status"] = "awaiting_approval"
            action["updated_at"] = utc_now()
            return None
        context = {
            "project_id": run["project_id"],
            "asset_node_id": str(inputs.get("asset_node_id") or ""),
            "style_direction_id": str(inputs.get("style_direction_id") or ""),
            "workflow_run_id": run["workflow_run_id"],
            "agent_run_id": run["id"],
            "agent_action_id": action["id"],
            "actor": run.get("actor") or "agent",
        }
        record = service.submit_image(
            str(inputs.get("prompt") or ""),
            str(inputs.get("model") or ""),
            inputs.get("params") if isinstance(inputs.get("params"), dict) else {},
            context=context,
        )
        action["generation_record_id"] = record["id"]
        action["status"] = str(record.get("status") or "queued")
        action["submitted_at"] = utc_now()
        action["updated_at"] = utc_now()
        return self._generation_output(run["project_id"], record)

    def _refresh_mcp_generation(self, run: dict, action: dict) -> dict | None:
        record_id = str(action.get("generation_record_id") or "")
        if not record_id:
            return None
        service = self.generation_service_factory(run["project_id"])
        record = service.refresh_task(record_id)
        status = str(record.get("status") or "")
        action["status"] = status if status in AGENT_ACTION_STATUSES else "running"
        action["updated_at"] = utc_now()
        if status == "succeeded":
            action["finished_at"] = utc_now()
            return self._generation_output(run["project_id"], record)
        if status in {"failed", "canceled", "download_failed"}:
            action["status"] = "failed" if status != "canceled" else "canceled"
            action["error"] = str(record.get("error") or status)[:4000]
            action["finished_at"] = utc_now()
        return None

    def _generation_output(self, project_id: str, record: dict) -> dict:
        result = {
            "record": {
                key: copy.deepcopy(record.get(key))
                for key in (
                    "id",
                    "status",
                    "prompt",
                    "model",
                    "params",
                    "width",
                    "height",
                    "bytes",
                    "local_url",
                    "asset_node_id",
                    "style_direction_id",
                    "workflow_run_id",
                    "source_executor",
                    "sha256",
                )
                if key in record
            },
            "record_id": record.get("id"),
        }
        local_path = str(record.get("local_path") or "").strip()
        if local_path:
            try:
                path = Path(local_path).resolve()
                root = self.project_service.project_root(project_id).resolve()
                if path.is_file() and path.is_relative_to(root):
                    result["relative_path"] = path.relative_to(root).as_posix()
            except OSError:
                pass
        return result

    def _refresh_run_status(self, run: dict) -> None:
        statuses = [item.get("status") for item in run.get("steps", [])]
        if run.get("status") == "canceled":
            return
        if statuses and all(
            status in {"succeeded", "skipped"} for status in statuses
        ):
            run["status"] = "succeeded"
            run.setdefault("finished_at", utc_now())
        elif any(status == "failed" for status in statuses):
            active = {"pending", "submitting", "queued", "running"}
            run["status"] = (
                "running"
                if any(status in active for status in statuses)
                else "failed"
            )
            if run["status"] == "failed":
                run.setdefault("finished_at", utc_now())
        elif any(status == "awaiting_approval" for status in statuses):
            run["status"] = "awaiting_approval"
        elif any(status == "action_required" for status in statuses):
            run["status"] = "awaiting_action"
        elif statuses:
            run["status"] = "running"
            run.setdefault("started_at", utc_now())
        else:
            run["status"] = "planned"

    def _sync_workflow_run(self, run: dict) -> None:
        mapped_status = {
            "planned": "planned",
            "succeeded": "succeeded",
            "failed": "failed",
            "canceled": "canceled",
        }.get(run["status"], "running")
        self.project_service.update_workflow_run(
            run["project_id"],
            run["workflow_run_id"],
            changes={
                "status": mapped_status,
                "steps": copy.deepcopy(run["steps"]),
                "outputs": copy.deepcopy(run.get("outputs") or {}),
                "error": str(run.get("error") or ""),
                "retry_count": sum(
                    int(item.get("retry_count") or 0) for item in run["steps"]
                ),
            },
            actor=run.get("actor") or "agent",
        )

    def advance_run(self, project_id: str, run_id: str) -> dict:
        with self._lock:
            run = self._load_run(project_id, run_id)
            if run.get("status") in {"succeeded", "failed", "canceled"}:
                return self._public_run(run)
            changed = True
            guard = 0
            while changed and guard < 200:
                guard += 1
                changed = False
                for action in run.get("steps", []):
                    status = action.get("status")
                    if (
                        action.get("type") == "image.generate"
                        and action.get("executor") == "server_mcp"
                        and status in {"submitting", "queued", "running"}
                    ):
                        output = self._refresh_mcp_generation(run, action)
                        if output is not None:
                            run["outputs"][action["id"]] = output
                        changed = True
                        continue
                    if status != "pending":
                        continue
                    if self._dependency_failed(run, action):
                        action["status"] = "skipped"
                        action["error"] = "Dependency failed or was canceled"
                        action["updated_at"] = utc_now()
                        changed = True
                        continue
                    if not self._dependencies_succeeded(run, action):
                        continue
                    inputs = self._resolve_inputs(run, action.get("inputs") or {})
                    if action.get("type") == "image.generate":
                        try:
                            target = self.project_service.resolve_generation_target(
                                run["project_id"],
                                str(inputs.get("asset_node_id") or ""),
                                allow_container_fallback=bool(
                                    inputs.get("style_direction_id")
                                ),
                                actor=run.get("actor") or "agent",
                            )
                        except ProjectError as exc:
                            action["status"] = "failed"
                            action["error"] = str(exc)[:4000]
                            action["finished_at"] = utc_now()
                            action["updated_at"] = utc_now()
                            changed = True
                            continue
                        inputs["asset_node_id"] = target["id"]
                    action["resolved_inputs"] = inputs
                    executor = action.get("executor")
                    if executor in {"agent", "agent_native"}:
                        action["status"] = "action_required"
                        action["updated_at"] = utc_now()
                        changed = True
                        continue
                    if action["type"] == "image.generate":
                        output = self._submit_mcp_generation(run, action, inputs)
                        if output is not None and action["status"] == "succeeded":
                            run["outputs"][action["id"]] = output
                        changed = True
                        continue
                    action["status"] = "running"
                    action["started_at"] = utc_now()
                    try:
                        output = self._execute_server_action(run, action, inputs)
                    except Exception as exc:
                        action["status"] = "failed"
                        action["error"] = str(exc)[:4000]
                        action["finished_at"] = utc_now()
                    else:
                        action["status"] = "succeeded"
                        action["output"] = copy.deepcopy(output)
                        run["outputs"][action["id"]] = copy.deepcopy(output)
                        action["finished_at"] = utc_now()
                    action["updated_at"] = utc_now()
                    changed = True
                self._refresh_run_status(run)
                if run["status"] in {
                    "awaiting_action",
                    "awaiting_approval",
                    "succeeded",
                    "failed",
                    "canceled",
                }:
                    break
            self._save_run(run)
            self._sync_workflow_run(run)
            return self._public_run(run)

    def submit_action_result(
        self,
        project_id: str,
        run_id: str,
        action_id: str,
        *,
        result: dict,
        idempotency_key: str = "",
    ) -> dict:
        if not isinstance(result, dict):
            raise AgentWorkflowError("Agent action result must be an object")
        with self._lock:
            run = self._load_run(project_id, run_id)
            action = self._action_by_id(run, action_id)
            key = str(idempotency_key or "").strip()[:160]
            if (
                action.get("status") == "succeeded"
                and key
                and action.get("result_idempotency_key") == key
            ):
                return self._public_run(run)
            if action.get("status") != "action_required":
                raise AgentWorkflowError("Agent action is not awaiting a result")
            if action.get("executor") not in {"agent", "agent_native"}:
                raise AgentWorkflowError("This action is not executed by the Agent")
            if action["type"] == "image.generate":
                raise AgentWorkflowError(
                    "Native image actions must use the artifact result endpoint"
                )
            if action["type"] == "workflow.plan":
                planned_steps = self._normalize_steps(
                    result.get("steps"),
                    capabilities=run["capabilities"],
                    policy=run["execution_policy"],
                )
                existing = {item["id"] for item in run["steps"]}
                if any(item["id"] in existing for item in planned_steps):
                    raise AgentWorkflowError(
                        "Planned action IDs must not duplicate existing actions"
                    )
                run["steps"].extend(planned_steps)
            action["status"] = "succeeded"
            action["output"] = copy.deepcopy(result)
            action["result_idempotency_key"] = key
            action["finished_at"] = utc_now()
            action["updated_at"] = utc_now()
            run["outputs"][action_id] = copy.deepcopy(result)
            self._save_run(run)
        return self.advance_run(project_id, run_id)

    @staticmethod
    def _decode_image_data_url(data_url: object) -> tuple[bytes, str, int, int]:
        match = DATA_URL_PATTERN.fullmatch(str(data_url or ""))
        if not match:
            raise AgentWorkflowError(
                "Agent image must be a PNG, JPEG, or WebP data URL"
            )
        try:
            content = base64.b64decode(match.group(2), validate=True)
        except ValueError as exc:
            raise AgentWorkflowError("Agent image data is invalid") from exc
        if not content or len(content) > MAX_AGENT_IMAGE_BYTES:
            raise AgentWorkflowError("Agent image must be smaller than 20 MB")
        try:
            with Image.open(io.BytesIO(content)) as image:
                image.verify()
            with Image.open(io.BytesIO(content)) as image:
                width, height = image.size
        except (OSError, ValueError) as exc:
            raise AgentWorkflowError("Agent image content is invalid") from exc
        extension = ".jpg" if match.group(1).lower() == "jpeg" else f".{match.group(1).lower()}"
        return content, extension, width, height

    def _register_image_record(
        self,
        project_id: str,
        *,
        content: bytes,
        extension: str,
        width: int,
        height: int,
        prompt: str,
        model: str,
        params: dict,
        context: dict,
        source_executor: str,
        source_record_id: str = "",
        source_action_id: str = "",
    ) -> dict:
        service = self.generation_service_factory(project_id)
        record = service.create_record(prompt, model, params, context=context)
        target = service.results_dir / f"{record['id']}{extension}"
        temporary = service.results_dir / f".{record['id']}.{uuid.uuid4().hex}.tmp"
        try:
            temporary.write_bytes(content)
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary.replace(target)
        finally:
            temporary.unlink(missing_ok=True)
        local_url = f"{service.local_url_prefix}/{quote(target.name)}"
        return service.update_record(
            record["id"],
            status="succeeded",
            progress=100,
            local_path=str(target),
            local_url=local_url,
            width=width,
            height=height,
            bytes=len(content),
            sha256=hashlib.sha256(content).hexdigest(),
            source_executor=source_executor,
            source_record_id=str(source_record_id or ""),
            source_action_id=str(source_action_id or ""),
            error="",
        )

    def submit_artifact(
        self,
        project_id: str,
        run_id: str,
        action_id: str,
        *,
        data_url: str,
        file_name: str = "agent-result.png",
        metadata: dict | None = None,
        idempotency_key: str = "",
    ) -> dict:
        del file_name
        content, extension, width, height = self._decode_image_data_url(data_url)
        with self._lock:
            run = self._load_run(project_id, run_id)
            action = self._action_by_id(run, action_id)
            key = str(idempotency_key or "").strip()[:160]
            if (
                action.get("status") == "succeeded"
                and key
                and action.get("result_idempotency_key") == key
            ):
                return self._public_run(run)
            if (
                action.get("type") != "image.generate"
                or action.get("executor") != "agent_native"
                or action.get("status") != "action_required"
            ):
                raise AgentWorkflowError(
                    "Agent action is not awaiting a native image artifact"
                )
            inputs = action.get("resolved_inputs") or self._resolve_inputs(
                run, action.get("inputs") or {}
            )
            service = self.generation_service_factory(project_id)
            existing = next(
                (
                    record
                    for record in service.list_history()
                    if record.get("agent_run_id") == run["id"]
                    and record.get("agent_action_id") == action_id
                    and record.get("status") == "succeeded"
                ),
                None,
            )
            if existing is not None:
                output = self._generation_output(project_id, existing)
                action["status"] = "succeeded"
                action["generation_record_id"] = existing["id"]
                action["output"] = copy.deepcopy(output)
                action["result_idempotency_key"] = key
                action["finished_at"] = utc_now()
                action["updated_at"] = utc_now()
                run["outputs"][action_id] = copy.deepcopy(output)
                self._save_run(run)
                return self.advance_run(project_id, run_id)
            context = {
                "project_id": project_id,
                "asset_node_id": str(inputs.get("asset_node_id") or ""),
                "style_direction_id": str(inputs.get("style_direction_id") or ""),
                "workflow_run_id": run["workflow_run_id"],
                "agent_run_id": run["id"],
                "agent_action_id": action_id,
                "actor": run.get("actor") or "agent",
            }
            record = self._register_image_record(
                project_id,
                content=content,
                extension=extension,
                width=width,
                height=height,
                prompt=str(inputs.get("prompt") or ""),
                model=str(inputs.get("model") or "agent-native"),
                params=inputs.get("params")
                if isinstance(inputs.get("params"), dict)
                else {},
                context=context,
                source_executor="agent_native",
                source_action_id=action_id,
            )
            output = self._generation_output(project_id, record)
            if metadata:
                output["metadata"] = copy.deepcopy(metadata)
            action["status"] = "succeeded"
            action["generation_record_id"] = record["id"]
            action["output"] = copy.deepcopy(output)
            action["result_idempotency_key"] = key
            action["finished_at"] = utc_now()
            action["updated_at"] = utc_now()
            run["outputs"][action_id] = copy.deepcopy(output)
            self._save_run(run)
        return self.advance_run(project_id, run_id)

    def register_processed_image(
        self,
        project_id: str,
        *,
        image: Image.Image,
        prompt: str,
        model: str,
        asset_node_id: str,
        workflow_run_id: str,
        actor: str,
        source_record_id: str,
        source_action_id: str,
        params: dict | None = None,
    ) -> dict:
        output = io.BytesIO()
        image.convert("RGBA").save(output, format="PNG")
        content = output.getvalue()
        record = self._register_image_record(
            project_id,
            content=content,
            extension=".png",
            width=image.width,
            height=image.height,
            prompt=prompt,
            model=model,
            params=params or {},
            context={
                "project_id": project_id,
                "asset_node_id": asset_node_id,
                "workflow_run_id": workflow_run_id,
                "actor": actor,
            },
            source_executor="server_processing",
            source_record_id=source_record_id,
            source_action_id=source_action_id,
        )
        return self._generation_output(project_id, record)

    def approve_run(
        self,
        project_id: str,
        run_id: str,
        *,
        action_id: str = "*",
        actor: str = "user",
    ) -> dict:
        with self._lock:
            run = self._load_run(project_id, run_id)
            waiting = [
                item
                for item in run["steps"]
                if item.get("status") == "awaiting_approval"
                and action_id in {"*", item["id"]}
            ]
            if not waiting:
                raise AgentWorkflowError("No matching action is awaiting approval")
            run["approvals"].append(
                {
                    "action_id": action_id,
                    "actor": str(actor or "user"),
                    "approved_at": utc_now(),
                }
            )
            for action in waiting:
                action["status"] = "pending"
                action["updated_at"] = utc_now()
            self._save_run(run)
        return self.advance_run(project_id, run_id)

    def retry_action(
        self, project_id: str, run_id: str, action_id: str
    ) -> dict:
        with self._lock:
            run = self._load_run(project_id, run_id)
            action = self._action_by_id(run, action_id)
            if action.get("status") not in {"failed", "canceled", "skipped"}:
                raise AgentWorkflowError("Only failed or canceled actions can retry")
            action["status"] = "pending"
            action["retry_count"] = int(action.get("retry_count") or 0) + 1
            action["error"] = ""
            action.pop("generation_record_id", None)
            action.pop("output", None)
            run["outputs"].pop(action_id, None)
            run["status"] = "running"
            run.pop("finished_at", None)
            self._save_run(run)
        return self.advance_run(project_id, run_id)

    def cancel_run(
        self, project_id: str, run_id: str, *, actor: str = "user"
    ) -> dict:
        with self._lock:
            run = self._load_run(project_id, run_id)
            if run.get("status") in {"succeeded", "failed", "canceled"}:
                return self._public_run(run)
            for action in run["steps"]:
                if action.get("status") in {
                    "pending",
                    "action_required",
                    "awaiting_approval",
                }:
                    action["status"] = "canceled"
                    action["updated_at"] = utc_now()
            run["status"] = "canceled"
            run["canceled_by"] = str(actor or "user")
            run["finished_at"] = utc_now()
            self._save_run(run)
            self._sync_workflow_run(run)
            return self._public_run(run)

    def resume_run(self, project_id: str, run_id: str) -> dict:
        with self._lock:
            run = self._load_run(project_id, run_id)
            if run.get("status") == "canceled":
                raise AgentWorkflowError("Canceled Agent runs cannot resume")
            if run.get("status") == "failed":
                raise AgentWorkflowError(
                    "Retry the failed action before resuming the run"
                )
        return self.advance_run(project_id, run_id)

    @staticmethod
    def _public_run(run: dict) -> dict:
        payload = copy.deepcopy(run)
        next_actions = []
        for action in payload.get("steps", []):
            if action.get("status") not in {
                "action_required",
                "awaiting_approval",
                "queued",
                "running",
            }:
                continue
            item = {
                key: copy.deepcopy(action.get(key))
                for key in (
                    "id",
                    "type",
                    "name",
                    "executor",
                    "status",
                    "depends_on",
                    "instructions",
                    "output_contract",
                    "resolved_inputs",
                    "quote",
                    "error",
                )
                if key in action
            }
            item["result_url"] = (
                f"/api/v1/projects/{quote(str(run['project_id']), safe='')}"
                f"/agent-runs/{quote(str(run['id']), safe='')}"
                f"/actions/{quote(str(action['id']), safe='')}/result"
            )
            if (
                action.get("type") == "image.generate"
                and action.get("executor") == "agent_native"
            ):
                item["artifact_url"] = (
                    f"/api/v1/projects/{quote(str(run['project_id']), safe='')}"
                    f"/agent-runs/{quote(str(run['id']), safe='')}"
                    f"/actions/{quote(str(action['id']), safe='')}/artifacts"
                )
            next_actions.append(item)
        payload["next_actions"] = next_actions
        return payload
