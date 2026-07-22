"""Persistent orchestration for visual style-guide image generation."""

from __future__ import annotations

import copy
import hashlib
import json
import re
import threading
import uuid
from pathlib import Path

from project_service import ProjectError, ProjectService, utc_now
from style_guide_service import StyleGuideService
from style_guide_visual_prompts import (
    DETAIL_PROFILE_DEFAULT,
    MODULE_LABELS,
    normalize_detail_profile,
    prompt_bundle,
)
from style_guide_visual_renderer import render_visual_template


RUN_ID_PATTERN = re.compile(r"^visualrun_[a-f0-9]{32}$")
MODULE_TYPES = tuple(MODULE_LABELS)
NODE_LABELS = {
    "anchor": "视觉基因锚点",
    "overall": "综合视觉图",
    "template": "本地模板整理",
    **MODULE_LABELS,
}
TERMINAL_RECORD_FAILURES = {"failed", "canceled", "download_failed"}
ACTIVE_NODE_STATUSES = {"submitting", "queued", "running"}
TERMINAL_NODE_FAILURES = {"failed", "canceled"}
SHARED_BUDGET_ERROR_MARKERS = (
    "预算不足",
    "预算已用尽",
    "余额不足",
    "额度不足",
    "额度已用尽",
    "budget exceeded",
    "budget exhausted",
    "insufficient balance",
    "insufficient quota",
    "monthly budget",
)


class StyleGuideVisualService:
    def __init__(self, project_service: ProjectService, style_guide_service: StyleGuideService):
        self.projects = project_service
        self.guides = style_guide_service
        self._lock = threading.RLock()

    @staticmethod
    def _validate_run_id(run_id: str) -> str:
        value = str(run_id or "").strip()
        if not RUN_ID_PATTERN.fullmatch(value):
            raise ProjectError(f"Invalid visual guide run ID: {value}")
        return value

    def _run_dir(self, project_id: str, package_id: str) -> Path:
        package_id = self.guides._validate_package_id(package_id)
        return self.guides._package_dir(project_id, package_id) / "visual-runs"

    def _run_path(self, project_id: str, package_id: str, run_id: str) -> Path:
        return self._run_dir(project_id, package_id) / f"{self._validate_run_id(run_id)}.json"

    def _write_run(self, project_id: str, package_id: str, run: dict) -> dict:
        payload = copy.deepcopy(run)
        payload["updated_at"] = utc_now()
        self.projects._atomic_write_json(
            self._run_path(project_id, package_id, payload["id"]), payload
        )
        return copy.deepcopy(payload)

    def _read_run(self, project_id: str, package_id: str, run_id: str) -> dict:
        path = self._run_path(project_id, package_id, run_id)
        if not path.is_file():
            raise ProjectError(f"Visual guide run does not exist: {run_id}")
        run = self.projects._read_json(path, {})
        if run.get("id") != run_id or run.get("package_id") != package_id:
            raise ProjectError("Invalid visual guide run document")
        return run

    def list_runs(self, project_id: str, package_id: str) -> list[dict]:
        with self._lock:
            self.guides.get_package(project_id, package_id)
            directory = self._run_dir(project_id, package_id)
            if not directory.is_dir():
                return []
            runs = []
            for path in directory.glob("visualrun_*.json"):
                run = self.projects._read_json(path, {})
                if run.get("package_id") == package_id:
                    runs.append(run)
            return copy.deepcopy(
                sorted(runs, key=lambda item: str(item.get("created_at") or ""), reverse=True)
            )

    def get_run(self, project_id: str, package_id: str, run_id: str) -> dict:
        with self._lock:
            return copy.deepcopy(self._read_run(project_id, package_id, run_id))

    @staticmethod
    def _module_types(values, *, mode: str) -> list[str]:
        requested = []
        for raw in values if isinstance(values, list) else []:
            value = str(raw or "").strip()
            if value not in MODULE_TYPES:
                raise ValueError(f"Unknown visual guide module: {value}")
            if value not in requested:
                requested.append(value)
        modules = [value for value in MODULE_TYPES if value in requested]
        if mode == "overall" and not modules:
            raise ValueError("整体生成至少选择一个模块")
        return modules

    @staticmethod
    def _normalized_params(value) -> dict:
        if not isinstance(value, dict):
            raise ValueError("Visual guide generation params must be an object")
        result = {
            "aspect_ratio": str(value.get("aspect_ratio") or "smart").strip(),
            "resolution": str(value.get("resolution") or "1K").strip(),
            "background": str(value.get("background") or "transparent").strip(),
            "count": 1,
        }
        return result

    @staticmethod
    def _detail_profile(value) -> str:
        return normalize_detail_profile(value or DETAIL_PROFILE_DEFAULT)

    @staticmethod
    def _input_signature(payload: dict) -> str:
        encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(encoded.encode("utf-8")).hexdigest()

    @staticmethod
    def _node(node_id: str, order: int, *, depends_on=None, prompt="") -> dict:
        return {
            "id": node_id,
            "kind": "local" if node_id == "template" else "image",
            "module_type": "core" if node_id in {"anchor", "overall", "template"} else node_id,
            "label": NODE_LABELS[node_id],
            "order": order,
            "depends_on": list(depends_on or []),
            "status": "pending",
            "record_id": "",
            "result_relative_path": "",
            "result_remote_asset_id": "",
            "error": "",
            "attempt": 0,
            "prompt": prompt,
            "palette": [],
        }

    def _build_nodes(self, mode: str, modules: list[str], prompts: dict) -> list[dict]:
        if mode == "overall":
            overall = self._node("overall", 0, prompt=prompts["overall"])
            return [overall, self._node("template", 1, depends_on=["overall"])]
        nodes = [self._node("anchor", 0, prompt=prompts["anchor"])]
        for module_type in modules:
            nodes.append(
                self._node(
                    module_type,
                    len(nodes),
                    depends_on=["anchor"],
                    prompt=prompts["modules"][module_type],
                )
            )
        nodes.append(
            self._node(
                "template",
                len(nodes),
                depends_on=[node["id"] for node in nodes],
            )
        )
        return nodes

    def create_run_document(self, project_id: str, package_id: str, request: dict) -> dict:
        if not isinstance(request, dict):
            raise ValueError("Visual guide request must be an object")
        with self._lock:
            package = self.guides.get_package(project_id, package_id)
            draft = self.guides.get_draft(project_id, package_id)
            mode = str(request.get("mode") or "modular").strip().lower()
            if mode not in {"overall", "modular"}:
                raise ValueError(f"Unknown visual guide mode: {mode}")
            modules = self._module_types(request.get("module_types"), mode=mode)
            model = str(request.get("model") or "").strip()
            if not model:
                raise ValueError("Image model is required")
            references = request.get("reference_sources")
            if not isinstance(references, list) or not references:
                raise ValueError("至少选择一张参考图")
            references = copy.deepcopy(references)
            params = self._normalized_params(request.get("params") or {})
            detail_profile = self._detail_profile(request.get("detail_profile"))
            prompts = prompt_bundle(
                title=str(draft.get("title") or package.get("title") or ""),
                description=str(draft.get("summary") or ""),
                mode=mode,
                module_types=modules,
                detail_profile=detail_profile,
            )
            signature_payload = {
                "mode": mode,
                "module_types": modules,
                "model": model,
                "params": params,
                "detail_profile": detail_profile,
                "reference_sources": references,
            }
            now = utc_now()
            run = {
                "schema_version": 3,
                "id": f"visualrun_{uuid.uuid4().hex}",
                "project_id": project_id,
                "package_id": package_id,
                "style_direction_id": package["style_direction_id"],
                "status": "running",
                "mode": mode,
                "module_types": modules,
                "model": model,
                "params": params,
                "detail_profile": detail_profile,
                "reference_sources": references,
                "prompt_bundle": prompts,
                "input_revision": int(draft.get("revision") or 0),
                "input_signature": self._input_signature(signature_payload),
                "invalid_reason": "",
                "nodes": self._build_nodes(mode, modules, prompts),
                "warnings": copy.deepcopy(request.get("warnings") or []),
                "supersedes_run_id": str(request.get("supersedes_run_id") or ""),
                "template_relative_path": "",
                "actor": str(request.get("actor") or "user")[:80],
                "created_at": now,
                "updated_at": now,
                "applied_at": "",
                "cancel_requested_at": "",
                "canceled_at": "",
                "published_version_id": "",
                "published_version": 0,
                "finalize_error": "",
            }
            previous_id = run["supersedes_run_id"]
            if previous_id:
                previous = self._read_run(project_id, package_id, previous_id)
                if previous.get("status") not in {"applied", "superseded"}:
                    previous["status"] = "superseded"
                    previous["invalid_reason"] = "输入已更新，已由新运行替代"
                    self._write_run(project_id, package_id, previous)
            return self._write_run(project_id, package_id, run)

    def _relative_result_path(self, project_id: str, value: object) -> str:
        path = Path(str(value or ""))
        if not path.is_absolute():
            path = self.projects.resolve_project_file(project_id, str(value or ""))
        resolved = path.resolve()
        root = self.projects.project_root(project_id).resolve()
        if not resolved.is_relative_to(root):
            raise ProjectError("Generation result escapes project root")
        if not resolved.is_file():
            raise ProjectError(f"Generation result file is missing: {resolved.name}")
        return resolved.relative_to(root).as_posix()

    def _resolve_sources(
        self, project_id: str, package_id: str, sources: list, generation_service
    ) -> list[dict]:
        package = self.guides.get_package(project_id, package_id)
        direction = next(
            (
                item
                for item in self.projects.list_style_directions(project_id)
                if item.get("id") == package["style_direction_id"]
            ),
            {},
        )
        direction_references = {
            str(item.get("relative_path") or ""): item
            for item in direction.get("reference_images") or []
            if isinstance(item, dict)
        }
        resolved = []
        for index, raw in enumerate(sources if isinstance(sources, list) else []):
            if not isinstance(raw, dict):
                raise ValueError("Reference source must be an object")
            kind = str(raw.get("kind") or "style_reference").strip()
            source_id = str(raw.get("id") or f"reference-{index}").strip()
            if kind == "generation_result":
                record = generation_service.find_record(source_id)
                if record.get("status") != "succeeded":
                    raise ValueError(f"Generation reference is not succeeded: {source_id}")
                owner = str(record.get("style_direction_id") or "")
                if owner and owner != package["style_direction_id"]:
                    raise ValueError("Generation reference belongs to another style direction")
                relative_path = self._relative_result_path(
                    project_id,
                    record.get("local_path") or record.get("relative_path"),
                )
                remote_asset_id = str(record.get("result_asset_id") or "").strip()
                source_record_id = source_id
            elif kind == "style_reference":
                relative_path = str(raw.get("relative_path") or "").strip().replace("\\", "/")
                path = self.projects.resolve_project_file(project_id, relative_path)
                if not path.is_file():
                    raise ProjectError(f"Reference image is missing: {path.name}")
                known = direction_references.get(relative_path) or {}
                remote_asset_id = str(known.get("remote_asset_id") or "").strip()
                source_record_id = str(known.get("source_record_id") or "").strip()
            else:
                raise ValueError(f"Unknown reference source kind: {kind}")
            item = {
                "kind": kind,
                "id": source_id,
                "relative_path": relative_path,
                "display_name": str(raw.get("display_name") or Path(relative_path).name)[:160],
                "remote_asset_id": remote_asset_id,
                "source_record_id": source_record_id,
                "content_sha256": str(raw.get("content_sha256") or "")[:128],
            }
            resolved.append(item)
        if not resolved:
            raise ValueError("至少选择一张参考图")
        return resolved

    @staticmethod
    def _reference_inputs(sources: list[dict]) -> list[object]:
        result = []
        for source in sources:
            if source.get("remote_asset_id"):
                result.append(
                    {
                        "relative_path": source.get("relative_path"),
                        "remote_asset_id": source.get("remote_asset_id"),
                        "source_record_id": source.get("source_record_id"),
                        "content_sha256": source.get("content_sha256"),
                    }
                )
            else:
                result.append(source.get("relative_path"))
        return result

    def _reference_limit(self, generation_service, model: str) -> int:
        capability = generation_service.image_model_capability(model) or {}
        limit = max(0, int(capability.get("max_reference_images") or 0))
        if limit <= 0:
            raise ValueError("所选图片模型不支持参考图")
        return limit

    @staticmethod
    def _is_shared_budget_error(message: object) -> bool:
        normalized = str(message or "").strip().lower()
        return bool(normalized) and any(
            marker in normalized for marker in SHARED_BUDGET_ERROR_MARKERS
        )

    @staticmethod
    def _block_node_after_shared_budget_error(node: dict, message: str) -> None:
        node["status"] = "failed"
        node["record_id"] = ""
        node["result_relative_path"] = ""
        node["result_remote_asset_id"] = ""
        node["error"] = f"未提交：同一运行已遇到共享预算限制。{message}"[:1000]

    def _submit_node(self, project_id: str, run: dict, node: dict, generation_service) -> None:
        limit = self._reference_limit(generation_service, run["model"])
        references = list(run["reference_sources"])
        if run["mode"] == "modular" and node["id"] != "anchor":
            anchor = next(item for item in run["nodes"] if item["id"] == "anchor")
            references = [
                {
                    "relative_path": anchor["result_relative_path"],
                    "remote_asset_id": anchor["result_remote_asset_id"],
                    "source_record_id": anchor["record_id"],
                    "content_sha256": "",
                },
                *references,
            ]
        selected = references[:limit]
        node["status"] = "submitting"
        node["error"] = ""
        node["attempt"] = int(node.get("attempt") or 0) + 1
        try:
            record = generation_service.submit_image(
                node["prompt"],
                run["model"],
                {
                    **copy.deepcopy(run["params"]),
                    "count": 1,
                    "reference_images": self._reference_inputs(selected),
                },
                context={
                    "project_id": project_id,
                    "style_direction_id": run["style_direction_id"],
                    "actor": run["actor"],
                    "style_guide_visual_run_id": run["id"],
                    "style_guide_visual_node_id": node["id"],
                },
            )
            node["record_id"] = str(record.get("id") or "")
            status = str(record.get("status") or "queued")
            node["status"] = (
                "canceled"
                if status == "canceled"
                else "failed"
                if status in TERMINAL_RECORD_FAILURES
                else status
            )
            node["error"] = str(record.get("error") or "")
        except Exception as exc:
            node["status"] = "failed"
            node["error"] = str(exc)[:1000]

    def create_run(
        self,
        project_id: str,
        package_id: str,
        request: dict,
        *,
        generation_service,
    ) -> dict:
        with self._lock:
            resolved = self._resolve_sources(
                project_id,
                package_id,
                request.get("reference_sources") if isinstance(request, dict) else [],
                generation_service,
            )
            prepared = copy.deepcopy(request)
            prepared["reference_sources"] = resolved
            mode = str(prepared.get("mode") or "modular").strip().lower()
            modules = self._module_types(prepared.get("module_types"), mode=mode)
            params = self._normalized_params(prepared.get("params") or {})
            detail_profile = self._detail_profile(prepared.get("detail_profile"))
            prepared["detail_profile"] = detail_profile
            model = str(prepared.get("model") or "").strip()
            limit = self._reference_limit(generation_service, model)
            warnings = []
            if len(resolved) > limit:
                warnings.append(
                    {
                        "type": "reference_limit",
                        "limit": limit,
                        "requested_ids": [item["id"] for item in resolved],
                        "selected_ids": [item["id"] for item in resolved[:limit]],
                    }
                )
            prepared["warnings"] = warnings
            draft = self.guides.get_draft(project_id, package_id)
            prompts = prompt_bundle(
                title=str(draft.get("title") or ""),
                description=str(draft.get("summary") or ""),
                mode=mode,
                module_types=modules,
                detail_profile=detail_profile,
            )
            signature = self._input_signature(
                {
                    "mode": mode,
                    "module_types": modules,
                    "model": model,
                    "params": params,
                    "detail_profile": detail_profile,
                    "reference_sources": resolved,
                }
            )
            if prepared.get("preview_only"):
                prompts["reference_order"] = [copy.deepcopy(item) for item in resolved]
                return {
                    "preview_only": True,
                    "prompt_bundle": prompts,
                    "detail_profile": detail_profile,
                    "reference_sources": resolved,
                    "warnings": warnings,
                    "input_signature": signature,
                    "task_count": 1 if mode == "overall" else 1 + len(modules),
                }
            run = self.create_run_document(project_id, package_id, prepared)
            run["input_signature"] = signature
            first = run["nodes"][0]
            self._submit_node(project_id, run, first, generation_service)
            if first["status"] in TERMINAL_NODE_FAILURES:
                run["status"] = "failed"
            return self._write_run(project_id, package_id, run)

    @staticmethod
    def _node_by_id(run: dict, node_id: str) -> dict:
        node = next((item for item in run.get("nodes") or [] if item.get("id") == node_id), None)
        if node is None:
            raise ProjectError(f"Visual guide node does not exist: {node_id}")
        return node

    def _update_node_from_record(self, project_id: str, node: dict, record: dict) -> None:
        status = str(record.get("status") or node.get("status") or "running")
        if status in TERMINAL_RECORD_FAILURES:
            node["status"] = "canceled" if status == "canceled" else "failed"
            node["error"] = str(record.get("error") or status)[:1000]
            return
        if status == "succeeded":
            node["result_relative_path"] = self._relative_result_path(
                project_id, record.get("local_path") or record.get("relative_path")
            )
            node["result_remote_asset_id"] = str(record.get("result_asset_id") or "")
            node["status"] = "succeeded"
            node["error"] = ""
            return
        node["status"] = status if status in {"submitting", "queued", "running"} else "running"

    def _render_template(self, project_id: str, package_id: str, run: dict) -> None:
        template = self._node_by_id(run, "template")
        sources = []
        for node in run["nodes"]:
            if node["kind"] != "image":
                continue
            path = self.projects.resolve_project_file(project_id, node["result_relative_path"])
            sources.append({"module_type": node["module_type"] if node["id"] != "overall" else "overview", "path": path})
        relative = f"production/style-guides/{package_id}/visual-runs/{run['id']}/guide-template.png"
        output = self.projects.resolve_project_file(project_id, relative)
        template["attempt"] = int(template.get("attempt") or 0) + 1
        try:
            result = render_visual_template(
                output,
                title=self.guides.get_draft(project_id, package_id).get("title") or "视觉指导图",
                mode=run["mode"],
                sources=sources,
            )
            template["status"] = "succeeded"
            template["result_relative_path"] = relative
            template["palette"] = result["palette"]
            template["error"] = ""
            run["template_relative_path"] = relative
        except Exception as exc:
            template["status"] = "failed"
            template["error"] = str(exc)[:1000]

    def refresh_run(
        self,
        project_id: str,
        package_id: str,
        run_id: str,
        *,
        generation_service,
    ) -> dict:
        with self._lock:
            run = self._read_run(project_id, package_id, run_id)
            if run.get("status") in {"superseded", "applied", "finalize_failed", "canceled"}:
                return copy.deepcopy(run)
            for node in run["nodes"]:
                if node["kind"] == "image" and node.get("record_id") and node["status"] in {"submitting", "queued", "running"}:
                    try:
                        self._update_node_from_record(
                            project_id, node, generation_service.refresh_task(node["record_id"])
                        )
                    except Exception as exc:
                        node["status"] = "failed"
                        node["error"] = str(exc)[:1000]
            if run.get("cancel_requested_at") or run.get("status") == "canceling":
                for node in run["nodes"]:
                    if node["status"] in {"pending", "invalidated"}:
                        node["status"] = "canceled"
                        node["error"] = ""
                if any(
                    node["status"] in ACTIVE_NODE_STATUSES
                    for node in run["nodes"]
                    if node["kind"] == "image"
                ):
                    run["status"] = "canceling"
                else:
                    run["status"] = "canceled"
                    run["canceled_at"] = str(run.get("canceled_at") or utc_now())
                return self._write_run(project_id, package_id, run)
            if run["mode"] == "modular":
                anchor = self._node_by_id(run, "anchor")
                if anchor["status"] == "succeeded":
                    shared_budget_error = ""
                    for node in run["nodes"]:
                        if node["id"] in run["module_types"] and node["status"] in {"pending", "invalidated"}:
                            if shared_budget_error:
                                self._block_node_after_shared_budget_error(
                                    node, shared_budget_error
                                )
                                continue
                            self._submit_node(project_id, run, node, generation_service)
                            if node["status"] == "failed" and self._is_shared_budget_error(
                                node.get("error")
                            ):
                                shared_budget_error = str(node.get("error") or "")
            image_nodes = [node for node in run["nodes"] if node["kind"] == "image"]
            template = self._node_by_id(run, "template")
            if all(node["status"] == "succeeded" for node in image_nodes) and template["status"] == "pending":
                self._render_template(project_id, package_id, run)
            if template["status"] == "succeeded":
                run["status"] = "succeeded"
            elif any(node["status"] in ACTIVE_NODE_STATUSES for node in image_nodes):
                run["status"] = "running"
            elif template["status"] in TERMINAL_NODE_FAILURES or any(
                node["status"] in TERMINAL_NODE_FAILURES for node in image_nodes
            ):
                run["status"] = "failed"
            else:
                run["status"] = "running"
            if run["status"] == "succeeded":
                try:
                    run, _, _ = self._finalize_run(
                        project_id, package_id, run
                    )
                except Exception as exc:
                    run["status"] = "finalize_failed"
                    run["finalize_error"] = str(exc)[:1000]
            return self._write_run(project_id, package_id, run)

    def cancel_run(self, project_id: str, package_id: str, run_id: str) -> dict:
        with self._lock:
            run = self._read_run(project_id, package_id, run_id)
            if run.get("status") in {"canceling", "canceled"}:
                return copy.deepcopy(run)
            active = run.get("status") == "running" or any(
                node.get("status") in ACTIVE_NODE_STATUSES
                for node in run.get("nodes") or []
            )
            if not active:
                raise ValueError("Only an active visual guide run can be canceled")
            run["cancel_requested_at"] = str(
                run.get("cancel_requested_at") or utc_now()
            )
            for node in run.get("nodes") or []:
                if node.get("status") in {"pending", "invalidated"}:
                    node["status"] = "canceled"
                    node["error"] = ""
            if any(
                node.get("status") in ACTIVE_NODE_STATUSES
                for node in run.get("nodes") or []
                if node.get("kind") == "image"
            ):
                run["status"] = "canceling"
            else:
                run["status"] = "canceled"
                run["canceled_at"] = str(run.get("canceled_at") or utc_now())
            return self._write_run(project_id, package_id, run)

    def retry_node(
        self,
        project_id: str,
        package_id: str,
        run_id: str,
        node_id: str,
        *,
        generation_service,
    ) -> dict:
        with self._lock:
            run = self._read_run(project_id, package_id, run_id)
            node = self._node_by_id(run, str(node_id or ""))
            if run.get("status") == "applied":
                if node.get("id") != "anchor":
                    raise ValueError("A versioned visual guide run cannot retry this node")
                return self.create_run(
                    project_id,
                    package_id,
                    {
                        "mode": run.get("mode"),
                        "module_types": copy.deepcopy(run.get("module_types") or []),
                        "model": run.get("model"),
                        "params": copy.deepcopy(run.get("params") or {}),
                        "detail_profile": run.get("detail_profile") or DETAIL_PROFILE_DEFAULT,
                        "reference_sources": copy.deepcopy(
                            run.get("reference_sources") or []
                        ),
                        "actor": run.get("actor") or "user",
                    },
                    generation_service=generation_service,
                )
            if node["kind"] == "local":
                if node["status"] != "failed":
                    raise ValueError("Only a failed local template can retry")
                node["status"] = "pending"
                node["error"] = ""
                self._render_template(project_id, package_id, run)
            else:
                allowed = {"failed", "invalidated"}
                if node["id"] == "anchor":
                    allowed.add("succeeded")
                if node["status"] not in allowed:
                    raise ValueError("Visual guide node cannot retry in its current state")
                node.update(
                    {
                        "status": "pending",
                        "record_id": "",
                        "result_relative_path": "",
                        "result_remote_asset_id": "",
                        "error": "",
                    }
                )
                if node["id"] == "anchor":
                    for sibling in run["nodes"]:
                        if sibling["id"] in run["module_types"] and sibling["status"] == "succeeded":
                            sibling["status"] = "invalidated"
                            sibling["error"] = "视觉基因锚点已更新"
                template = self._node_by_id(run, "template")
                template.update({"status": "pending", "result_relative_path": "", "error": ""})
                run["template_relative_path"] = ""
                self._submit_node(project_id, run, node, generation_service)
            run["status"] = "failed" if node["status"] == "failed" else "running"
            return self._write_run(project_id, package_id, run)

    @staticmethod
    def _style_canvas_type(style_direction_id: str) -> str:
        value = re.sub(r"^style_", "", str(style_direction_id or ""))
        value = re.sub(r"[^a-zA-Z0-9-]", "", value)[:32]
        return f"style-{value}" if value else "style"

    @staticmethod
    def _canvas_rect_overlaps(left: dict, right: dict, gap: float = 24) -> bool:
        return (
            float(left.get("x") or 0) < float(right.get("x") or 0) + float(right.get("width") or 220) + gap
            and float(left.get("x") or 0) + float(left.get("width") or 220) + gap > float(right.get("x") or 0)
            and float(left.get("y") or 0) < float(right.get("y") or 0) + float(right.get("height") or 160) + gap
            and float(left.get("y") or 0) + float(left.get("height") or 160) + gap > float(right.get("y") or 0)
        )

    def _canvas_slot(self, occupied: list[dict], *, origin_y: float = 70) -> tuple[float, float]:
        for index in range(4000):
            candidate = {
                "x": 70 + (index % 3) * 244,
                "y": origin_y + (index // 3) * 184,
                "width": 220,
                "height": 160,
            }
            if not any(self._canvas_rect_overlaps(candidate, node) for node in occupied):
                return candidate["x"], candidate["y"]
        return 70, origin_y + 4000 * 184

    def _group_version_images_on_canvas(
        self, project_id: str, run: dict, version: dict
    ) -> None:
        image_nodes = [
            node
            for node in run.get("nodes") or []
            if node.get("kind") == "image"
            and node.get("status") == "succeeded"
            and str(node.get("record_id") or "")
        ]
        if not image_nodes:
            return
        canvas_type = self._style_canvas_type(version.get("style_direction_id"))
        canvas = self.projects.load_canvas(project_id, canvas_type)
        canvas_nodes = canvas.setdefault("nodes", [])
        groups = canvas.setdefault("groups", [])
        group_id = f"guidegroup_{version.get('id')}"
        group_name = f"{version.get('title') or '指导版本'} v{int(version.get('version') or 1)}"
        existing_group_nodes = [
            node for node in canvas_nodes if str(node.get("group_id") or "") == group_id
        ]
        expected_record_ids = {str(node["record_id"]) for node in image_nodes}
        matched_nodes = [
            node
            for node in canvas_nodes
            if node.get("ref_type") == "generation_result"
            and str(node.get("ref_id") or "") in expected_record_ids
        ]
        first_layout = not existing_group_nodes
        occupied = [node for node in canvas_nodes if node not in matched_nodes]
        origin_y = 70.0
        if first_layout and occupied:
            origin_y = max(
                float(node.get("y") or 0) + float(node.get("height") or 160)
                for node in occupied
            ) + 72
        z_index = max([int(node.get("z_index") or 0) for node in canvas_nodes] or [-1]) + 1

        for image_node in image_nodes:
            record_id = str(image_node["record_id"])
            canvas_node = next(
                (
                    node
                    for node in matched_nodes
                    if str(node.get("ref_id") or "") == record_id
                ),
                None,
            )
            if canvas_node is None:
                stable_key = hashlib.sha1(
                    f"{version.get('id')}:{record_id}".encode("utf-8")
                ).hexdigest()[:20]
                canvas_node = {
                    "id": f"guide_node_{stable_key}",
                    "ref_type": "generation_result",
                    "ref_id": record_id,
                    "title": str(image_node.get("label") or NODE_LABELS.get(image_node.get("id"), "视觉指导图"))[:120],
                    "note": f"视觉指导图 · v{int(version.get('version') or 1)}",
                    "x": 0,
                    "y": 0,
                    "width": 220,
                    "height": 160,
                    "locked": False,
                    "z_index": z_index,
                    "group_id": group_id,
                }
                z_index += 1
                canvas_nodes.append(canvas_node)
                matched_nodes.append(canvas_node)
            canvas_node["ref_type"] = "generation_result"
            canvas_node["ref_id"] = record_id
            canvas_node["title"] = str(
                image_node.get("label")
                or NODE_LABELS.get(image_node.get("id"), "视觉指导图")
            )[:120]
            canvas_node["note"] = f"视觉指导图 · v{int(version.get('version') or 1)}"
            canvas_node["group_id"] = group_id
            if first_layout or canvas_node.get("x") is None or canvas_node.get("y") is None:
                canvas_node["x"], canvas_node["y"] = self._canvas_slot(
                    occupied, origin_y=origin_y
                )
            occupied.append(canvas_node)

        group = next((item for item in groups if item.get("id") == group_id), None)
        if group is None:
            groups.append({"id": group_id, "name": group_name})
        else:
            group["name"] = group_name
        self.projects.save_canvas(
            project_id, canvas_type, canvas=canvas, actor="style-guide-visual"
        )

    def _finalize_run(
        self, project_id: str, package_id: str, run: dict
    ) -> tuple[dict, dict, dict]:
        existing = self.guides.find_version_by_visual_run(
            project_id, package_id, run.get("id")
        )
        if existing is None:
            draft = self.guides.apply_visual_run(
                project_id, package_id, run_snapshot=copy.deepcopy(run)
            )
            version = self.guides.publish(project_id, package_id)
        else:
            draft = self.guides.get_draft(project_id, package_id)
            version = existing
        self._group_version_images_on_canvas(project_id, run, version)
        run["status"] = "applied"
        run["applied_at"] = str(run.get("applied_at") or utc_now())
        run["published_version_id"] = str(version.get("id") or "")
        run["published_version"] = int(version.get("version") or 0)
        run["finalize_error"] = ""
        return run, draft, version

    def apply_run(self, project_id: str, package_id: str, run_id: str) -> dict:
        with self._lock:
            run = self._read_run(project_id, package_id, run_id)
            if run.get("status") == "applied":
                version = self.guides.get_version(
                    project_id, package_id, run.get("published_version_id")
                )
                return {
                    "visual_run": copy.deepcopy(run),
                    "draft": self.guides.get_draft(project_id, package_id),
                    "version": version,
                    "style_guide": self.guides.get_package(project_id, package_id),
                }
            if run.get("status") not in {"succeeded", "finalize_failed"}:
                raise ValueError("Visual guide run is not ready to finalize")
            run, draft, version = self._finalize_run(
                project_id, package_id, run
            )
            run = self._write_run(project_id, package_id, run)
            return {
                "visual_run": run,
                "draft": draft,
                "version": version,
                "style_guide": self.guides.get_package(project_id, package_id),
            }


__all__ = ["MODULE_TYPES", "StyleGuideVisualService"]
