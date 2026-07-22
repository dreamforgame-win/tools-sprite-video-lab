"""File-backed game-art style guide drafts and immutable versions."""

from __future__ import annotations

import copy
import hashlib
import re
import threading
import uuid
from pathlib import Path

from project_service import ProjectError, ProjectService, utc_now
from style_board_renderer import render_style_board
from style_guide_compiler import compile_style_guide
from style_guide_visual_prompts import (
    DETAIL_PROFILE_DEFAULT,
    detail_profile_negative,
    detail_profile_prompt,
    normalize_detail_profile,
)


GUIDE_SCHEMA_VERSION = 2
PACKAGE_ID_PATTERN = re.compile(r"^guide_[a-f0-9]{32}$")
VERSION_ID_PATTERN = re.compile(r"^guidever_[a-f0-9]{32}$")


class StyleGuideService:
    MODULE_TYPES = {
        "environment",
        "character",
        "ui_hud",
        "skill_vfx",
        "props_equipment",
    }

    CORE_STRING_FIELDS = {
        "vision_statement": 2000,
        "world_tone": 1000,
        "shape_language": 2000,
        "color_semantics": 2000,
        "materials_lighting": 2000,
        "rendering": 2000,
        "prompt_fragment": 6000,
        "negative_fragment": 4000,
        "notes": 2000,
    }
    CORE_LIST_FIELDS = {
        "themes": (40, 160),
        "motifs": (40, 160),
        "palette": (32, 32),
        "dos": (80, 500),
        "donts": (80, 500),
        "forbidden_terms": (80, 160),
    }
    MODULE_STRING_FIELDS = {
        "summary": 2000,
        "relationship_to_core": 2000,
        "prompt_fragment": 6000,
        "negative_fragment": 4000,
        "completeness_status": 80,
        "missing_reason": 1000,
        "notes": 2000,
    }
    MODULE_LIST_FIELDS = {
        "asset_types": (40, 120),
        "rules": (100, 500),
        "dos": (80, 500),
        "donts": (80, 500),
        "forbidden_terms": (80, 160),
    }

    def __init__(self, project_service: ProjectService, generation_service=None):
        self.projects = project_service
        self.generation_service = generation_service
        self._lock = threading.RLock()

    @staticmethod
    def capability_state() -> dict:
        return {
            "manual_authoring": True,
            "visual_generation": True,
            "visual_generation_requires_image_model": True,
            "automatic_text_analysis": False,
            "automatic_analysis": False,
        }

    def _paths(self, project_id: str) -> dict[str, Path]:
        return self.projects.project_paths(project_id)

    def _ensure_storage(self, project_id: str) -> dict[str, Path]:
        paths = self._paths(project_id)
        paths["style_guide_root"].mkdir(parents=True, exist_ok=True)
        if not paths["style_guide_registry"].is_file():
            self.projects._atomic_write_json(
                paths["style_guide_registry"],
                {
                    "schema_version": GUIDE_SCHEMA_VERSION,
                    "project_id": project_id,
                    "packages": [],
                },
            )
        return paths

    def _read_registry(self, project_id: str) -> dict:
        paths = self._ensure_storage(project_id)
        registry = self.projects._read_json(
            paths["style_guide_registry"],
            {
                "schema_version": GUIDE_SCHEMA_VERSION,
                "project_id": project_id,
                "packages": [],
            },
        )
        if not isinstance(registry.get("packages"), list):
            raise ProjectError("Invalid style guide package registry")
        migrated = int(registry.get("schema_version") or 0) < GUIDE_SCHEMA_VERSION
        for package in registry["packages"]:
            if "confirmed_version_id" not in package:
                package["confirmed_version_id"] = ""
                migrated = True
            if "confirmed_version" not in package:
                package["confirmed_version"] = 0
                migrated = True
        registry["schema_version"] = GUIDE_SCHEMA_VERSION
        registry["project_id"] = project_id
        if migrated:
            self._write_registry(project_id, registry)
        return registry

    def _write_registry(self, project_id: str, registry: dict) -> None:
        payload = copy.deepcopy(registry)
        payload["schema_version"] = GUIDE_SCHEMA_VERSION
        payload["project_id"] = project_id
        payload["updated_at"] = utc_now()
        self.projects._atomic_write_json(
            self._paths(project_id)["style_guide_registry"], payload
        )

    @staticmethod
    def _validate_package_id(package_id: str) -> str:
        package_id = str(package_id or "").strip()
        if not PACKAGE_ID_PATTERN.fullmatch(package_id):
            raise ProjectError(f"Invalid style guide package ID: {package_id}")
        return package_id

    @staticmethod
    def _validate_version_id(version_id: str) -> str:
        version_id = str(version_id or "").strip()
        if not VERSION_ID_PATTERN.fullmatch(version_id):
            raise ProjectError(f"Invalid style guide version ID: {version_id}")
        return version_id

    def _package_dir(self, project_id: str, package_id: str) -> Path:
        package_id = self._validate_package_id(package_id)
        return self._paths(project_id)["style_guide_root"] / package_id

    def _draft_path(self, project_id: str, package_id: str) -> Path:
        return self._package_dir(project_id, package_id) / "draft.json"

    def _version_path(self, project_id: str, package_id: str, version_id: str) -> Path:
        version_id = self._validate_version_id(version_id)
        return self._package_dir(project_id, package_id) / "versions" / f"{version_id}.json"

    @staticmethod
    def _package(registry: dict, package_id: str) -> dict:
        package = next(
            (
                item
                for item in registry.get("packages", [])
                if str(item.get("id") or "") == package_id
            ),
            None,
        )
        if package is None:
            raise ProjectError(f"Style guide package does not exist: {package_id}")
        return package

    def _package_summary(self, project_id: str, package: dict) -> dict:
        result = copy.deepcopy(package)
        result["is_default"] = (
            self.projects.get_project(project_id).get("default_style_guide_package_id")
            == package.get("id")
        )
        return result

    def list_packages(self, project_id: str) -> list[dict]:
        with self._lock:
            registry = self._read_registry(project_id)
            default_id = str(
                self.projects.get_project(project_id).get(
                    "default_style_guide_package_id"
                )
                or ""
            )
            result = []
            for package in registry["packages"]:
                if package.get("trashed_at"):
                    continue
                item = copy.deepcopy(package)
                item["is_default"] = item.get("id") == default_id
                result.append(item)
            return result

    def get_package(self, project_id: str, package_id: str) -> dict:
        package_id = self._validate_package_id(package_id)
        with self._lock:
            return self._package_summary(
                project_id, self._package(self._read_registry(project_id), package_id)
            )

    @staticmethod
    def _blank_core() -> dict:
        return {
            "vision_statement": "",
            "world_tone": "",
            "themes": [],
            "motifs": [],
            "shape_language": "",
            "palette": [],
            "color_semantics": "",
            "materials_lighting": "",
            "rendering": "",
            "dos": [],
            "donts": [],
            "forbidden_terms": [],
            "prompt_fragment": "",
            "negative_fragment": "",
            "references": [],
            "notes": "",
        }

    def create_draft(self, project_id: str, style_direction_id: str) -> dict:
        style_direction_id = str(style_direction_id or "").strip()
        with self._lock:
            direction = next(
                (
                    item
                    for item in self.projects.list_style_directions(project_id)
                    if item.get("id") == style_direction_id
                ),
                None,
            )
            if direction is None:
                raise ProjectError(
                    f"Style direction does not exist: {style_direction_id}"
                )
            registry = self._read_registry(project_id)
            existing = next(
                (
                    item
                    for item in registry["packages"]
                    if item.get("style_direction_id") == style_direction_id
                    and not item.get("trashed_at")
                ),
                None,
            )
            if existing is not None:
                return self._package_summary(project_id, existing)

            now = utc_now()
            package_id = f"guide_{uuid.uuid4().hex}"
            package = {
                "id": package_id,
                "style_direction_id": style_direction_id,
                "title": str(direction.get("name") or "Game Art Style Guide")[:120],
                "draft_revision": 1,
                "latest_published_version_id": "",
                "latest_published_version": 0,
                "confirmed_version_id": "",
                "confirmed_version": 0,
                "enabled_module_types": [],
                "created_at": now,
                "updated_at": now,
            }
            draft = {
                "schema_version": GUIDE_SCHEMA_VERSION,
                "package_id": package_id,
                "style_direction_id": style_direction_id,
                "revision": 1,
                "title": package["title"],
                "summary": "",
                "core": self._blank_core(),
                "modules": {},
                "created_at": now,
                "updated_at": now,
            }
            draft_path = self._draft_path(project_id, package_id)
            self.projects._atomic_write_json(draft_path, draft)
            registry["packages"].insert(0, package)
            try:
                self._write_registry(project_id, registry)
            except Exception:
                draft_path.unlink(missing_ok=True)
                raise
            return self._package_summary(project_id, package)

    def _read_draft(self, project_id: str, package_id: str) -> dict:
        package_id = self._validate_package_id(package_id)
        self._package(self._read_registry(project_id), package_id)
        path = self._draft_path(project_id, package_id)
        draft = self.projects._read_json(path, {})
        if draft.get("package_id") != package_id:
            raise ProjectError(f"Invalid style guide draft: {path}")
        return draft

    def get_draft(self, project_id: str, package_id: str) -> dict:
        with self._lock:
            return copy.deepcopy(self._read_draft(project_id, package_id))

    @staticmethod
    def _string_list(value, *, limit: int, item_limit: int) -> list[str]:
        if not isinstance(value, list):
            return []
        result = []
        seen = set()
        for item in value:
            text = str(item or "").strip()[:item_limit]
            marker = text.casefold()
            if not text or marker in seen:
                continue
            seen.add(marker)
            result.append(text)
            if len(result) >= limit:
                break
        return result

    @staticmethod
    def _normalized_relative_path(value: object) -> str:
        text = str(value or "").strip().replace("\\", "/")[:500]
        if not text:
            return ""
        path = Path(text)
        if path.is_absolute() or ".." in path.parts:
            raise ProjectError("Style guide reference path must be project-relative")
        return path.as_posix()

    def _normalize_reference(self, reference: dict) -> dict:
        reference_id = str(reference.get("id") or "").strip()[:120]
        if not reference_id:
            reference_id = f"guide_ref_{uuid.uuid4().hex}"
        return {
            "id": reference_id,
            "relative_path": self._normalized_relative_path(
                reference.get("relative_path")
            ),
            "source_record_id": str(reference.get("source_record_id") or "")[:120],
            "remote_asset_id": str(reference.get("remote_asset_id") or "")[:240],
            "content_sha256": str(reference.get("content_sha256") or "")[:128],
            "roles": self._string_list(
                reference.get("roles"), limit=12, item_limit=80
            ),
            "priority": max(0, min(int(reference.get("priority") or 0), 100)),
            "quality": max(0, min(int(reference.get("quality") or 0), 100)),
            "required": bool(reference.get("required")),
            "availability": str(reference.get("availability") or "available")[:40],
            "name": str(reference.get("name") or "")[:160],
            "visual_run_id": str(reference.get("visual_run_id") or "")[:120],
            "visual_node_id": str(reference.get("visual_node_id") or "")[:120],
            "module_type": str(reference.get("module_type") or "")[:80],
        }

    def _normalize_references(self, value) -> list[dict]:
        if not isinstance(value, list):
            return []
        result = []
        seen = set()
        for item in value[:40]:
            if not isinstance(item, dict):
                continue
            reference = self._normalize_reference(item)
            if reference["id"] in seen:
                continue
            seen.add(reference["id"])
            result.append(reference)
        return result

    def _normalize_draft(
        self,
        package: dict,
        draft: dict,
        *,
        revision: int,
        created_at: str,
    ) -> dict:
        if not isinstance(draft, dict):
            raise ProjectError("Style guide draft must be an object")
        package_id = str(draft.get("package_id") or "")
        if package_id != package["id"]:
            raise ProjectError("Style guide draft package ID does not match")
        core_input = draft.get("core") if isinstance(draft.get("core"), dict) else {}
        core = self._blank_core()
        for key, limit in self.CORE_STRING_FIELDS.items():
            core[key] = str(core_input.get(key) or "").strip()[:limit]
        for key, (limit, item_limit) in self.CORE_LIST_FIELDS.items():
            core[key] = self._string_list(
                core_input.get(key), limit=limit, item_limit=item_limit
            )
        core["references"] = self._normalize_references(
            core_input.get("references")
        )

        modules = {}
        module_input = draft.get("modules") if isinstance(draft.get("modules"), dict) else {}
        for module_type in self.MODULE_TYPES:
            raw = module_input.get(module_type)
            if not isinstance(raw, dict):
                continue
            module = {"enabled": bool(raw.get("enabled", True))}
            for key, limit in self.MODULE_STRING_FIELDS.items():
                module[key] = str(raw.get(key) or "").strip()[:limit]
            for key, (limit, item_limit) in self.MODULE_LIST_FIELDS.items():
                module[key] = self._string_list(
                    raw.get(key), limit=limit, item_limit=item_limit
                )
            module["references"] = self._normalize_references(raw.get("references"))
            modules[module_type] = module

        now = utc_now()
        visual_input = draft.get("visual_guide") if isinstance(draft.get("visual_guide"), dict) else {}
        visual_guide = {
            "run_id": str(visual_input.get("run_id") or "")[:120],
            "mode": str(visual_input.get("mode") or "")[:40],
            "model": str(visual_input.get("model") or "")[:160],
            "template_relative_path": self._normalized_relative_path(
                visual_input.get("template_relative_path")
            ),
            "module_types": self._string_list(
                visual_input.get("module_types"), limit=5, item_limit=80
            ),
            "source_reference_count": max(
                0, min(int(visual_input.get("source_reference_count") or 0), 40)
            ),
            "detail_profile": normalize_detail_profile(
                visual_input.get("detail_profile") or DETAIL_PROFILE_DEFAULT
            ),
            "detail_prompt_fragment": str(
                visual_input.get("detail_prompt_fragment") or ""
            ).strip()[:4000],
            "detail_negative_fragment": str(
                visual_input.get("detail_negative_fragment") or ""
            ).strip()[:3000],
            "completed_at": str(visual_input.get("completed_at") or "")[:80],
            "updated_at": str(visual_input.get("updated_at") or "")[:80],
        } if visual_input else {}

        return {
            "schema_version": GUIDE_SCHEMA_VERSION,
            "package_id": package["id"],
            "style_direction_id": package["style_direction_id"],
            "revision": revision,
            "title": str(draft.get("title") or package.get("title") or "")[:120],
            "summary": str(draft.get("summary") or "").strip()[:1000],
            "core": core,
            "modules": modules,
            "visual_guide": visual_guide,
            "created_at": str(created_at or now),
            "updated_at": now,
        }

    def apply_visual_run(
        self,
        project_id: str,
        package_id: str,
        *,
        run_snapshot: dict,
    ) -> dict:
        """Apply generated visual references and minimal compile text to the draft."""

        roles_by_module = {
            "environment": ["composition", "material", "lighting"],
            "character": ["silhouette", "costume", "pose"],
            "ui_hud": ["layout", "frame", "icon", "color"],
            "skill_vfx": ["timing", "shape", "color", "readability"],
            "props_equipment": ["shape", "material", "rarity", "function"],
        }
        with self._lock:
            draft = self._read_draft(project_id, package_id)
            run_id = str(run_snapshot.get("id") or "")
            nodes = [
                node
                for node in run_snapshot.get("nodes") or []
                if node.get("kind") == "image" and node.get("status") == "succeeded"
            ]

            def generated_reference(node: dict, roles: list[str]) -> dict:
                return {
                    "id": f"guide_ref_{run_id.removeprefix('visualrun_')}_{str(node.get('id') or '')}"[:120],
                    "relative_path": str(node.get("result_relative_path") or ""),
                    "source_record_id": str(node.get("record_id") or ""),
                    "remote_asset_id": str(node.get("result_remote_asset_id") or ""),
                    "roles": roles,
                    "priority": 90,
                    "quality": 90,
                    "required": True,
                    "availability": "available",
                    "name": str(node.get("label") or "视觉指导图"),
                    "visual_run_id": run_id,
                    "visual_node_id": str(node.get("id") or ""),
                    "module_type": str(node.get("module_type") or ""),
                }

            core = draft.setdefault("core", self._blank_core())
            core["references"] = [
                item
                for item in core.get("references") or []
                if not str(item.get("visual_run_id") or "")
            ]
            for module in draft.setdefault("modules", {}).values():
                module["references"] = [
                    item
                    for item in module.get("references") or []
                    if not str(item.get("visual_run_id") or "")
                ]

            for node in nodes:
                node_id = str(node.get("id") or "")
                if node_id == "anchor":
                    core["references"].append(generated_reference(node, ["style-anchor"]))
                elif node_id == "overall":
                    core["references"].append(generated_reference(node, ["overview"]))
                elif node_id in roles_by_module:
                    module = draft["modules"].setdefault(node_id, {"enabled": True, "references": []})
                    module["enabled"] = True
                    module.setdefault("references", []).append(
                        generated_reference(node, roles_by_module[node_id])
                    )

            prompts = (
                run_snapshot.get("prompt_bundle")
                if isinstance(run_snapshot.get("prompt_bundle"), dict)
                else {}
            )
            detail_profile = normalize_detail_profile(
                run_snapshot.get("detail_profile") or DETAIL_PROFILE_DEFAULT
            )
            detail_prompt_fragment = str(
                prompts.get("detail_prompt") or detail_profile_prompt(detail_profile)
            ).strip()
            detail_negative_fragment = str(
                prompts.get("detail_negative") or detail_profile_negative(detail_profile)
            ).strip()
            core_prompt = str(
                prompts.get("anchor")
                or prompts.get("overall")
                or prompts.get("master")
                or ""
            ).strip()
            if not str(core.get("vision_statement") or "").strip():
                core["vision_statement"] = str(
                    draft.get("summary")
                    or f"{draft.get('title') or '游戏美术'}视觉基因"
                )[:2000]
            if not str(core.get("prompt_fragment") or "").strip():
                core["prompt_fragment"] = core_prompt[:6000]
            if not str(core.get("negative_fragment") or "").strip():
                core["negative_fragment"] = str(prompts.get("negative") or "")[:4000]

            prompt_modules = (
                prompts.get("modules")
                if isinstance(prompts.get("modules"), dict)
                else {}
            )
            node_labels = {
                str(node.get("id") or ""): str(node.get("label") or "")
                for node in run_snapshot.get("nodes") or []
            }
            for module_type in run_snapshot.get("module_types") or []:
                if module_type not in self.MODULE_TYPES:
                    continue
                module = draft.setdefault("modules", {}).setdefault(
                    module_type, {"enabled": True, "references": []}
                )
                module["enabled"] = True
                module_prompt = str(prompt_modules.get(module_type) or "").strip()
                if len(module_prompt) < 20:
                    module_prompt = str(prompts.get("overall") or core_prompt).strip()
                if not str(module.get("summary") or "").strip():
                    module["summary"] = str(
                        node_labels.get(module_type) or module_type
                    )[:2000]
                if not str(module.get("relationship_to_core") or "").strip():
                    module["relationship_to_core"] = "遵循本版本的全局视觉基因与锚点图。"
                if not str(module.get("prompt_fragment") or "").strip():
                    module["prompt_fragment"] = module_prompt[:6000]
                if not str(module.get("negative_fragment") or "").strip():
                    module["negative_fragment"] = str(
                        prompts.get("negative") or ""
                    )[:4000]
                module["completeness_status"] = "generated"

            template = next(
                (node for node in run_snapshot.get("nodes") or [] if node.get("id") == "template"),
                {},
            )
            if not core.get("palette"):
                core["palette"] = list(template.get("palette") or [])
            draft["visual_guide"] = {
                "run_id": run_id,
                "mode": str(run_snapshot.get("mode") or ""),
                "model": str(run_snapshot.get("model") or ""),
                "template_relative_path": str(run_snapshot.get("template_relative_path") or ""),
                "module_types": list(run_snapshot.get("module_types") or []),
                "source_reference_count": len(run_snapshot.get("reference_sources") or []),
                "detail_profile": detail_profile,
                "detail_prompt_fragment": detail_prompt_fragment,
                "detail_negative_fragment": detail_negative_fragment,
                "completed_at": str(run_snapshot.get("updated_at") or utc_now()),
                "updated_at": utc_now(),
            }
            return self.save_draft(project_id, package_id, draft)

    def save_draft(self, project_id: str, package_id: str, draft: dict) -> dict:
        package_id = self._validate_package_id(package_id)
        with self._lock:
            registry = self._read_registry(project_id)
            package = self._package(registry, package_id)
            current = self._read_draft(project_id, package_id)
            revision = int(package.get("draft_revision") or 0) + 1
            normalized = self._normalize_draft(
                package,
                draft,
                revision=revision,
                created_at=str(current.get("created_at") or ""),
            )
            self.projects._atomic_write_json(
                self._draft_path(project_id, package_id), normalized
            )
            package["title"] = normalized["title"]
            package["draft_revision"] = revision
            package["enabled_module_types"] = [
                module_type
                for module_type, module in normalized["modules"].items()
                if module.get("enabled")
            ]
            package["updated_at"] = normalized["updated_at"]
            self._write_registry(project_id, registry)
            return copy.deepcopy(normalized)

    def _reference_warnings(self, project_id: str, draft: dict) -> list[dict]:
        warnings = []
        sections = [("core", draft.get("core") or {})]
        sections.extend((key, value) for key, value in (draft.get("modules") or {}).items())
        for module_type, section in sections:
            for reference in section.get("references") or []:
                relative_path = str(reference.get("relative_path") or "")
                remote_asset_id = str(reference.get("remote_asset_id") or "")
                available = bool(remote_asset_id)
                if relative_path:
                    try:
                        available = self.projects.resolve_project_file(
                            project_id, relative_path
                        ).is_file() or available
                    except ProjectError:
                        available = False
                if not available:
                    warnings.append(
                        {
                            "field": f"{module_type}.references.{reference.get('id')}",
                            "code": "missing_reference",
                            "message": "参考图文件或远端素材不可用",
                        }
                    )
        return warnings

    def validate_draft(self, project_id: str, package_id: str) -> dict:
        with self._lock:
            draft = self._read_draft(project_id, package_id)
            errors = []
            if not str(draft.get("core", {}).get("vision_statement") or "").strip():
                errors.append(
                    {"field": "core.vision_statement", "message": "视觉基因摘要不能为空"}
                )
            if not str(draft.get("core", {}).get("prompt_fragment") or "").strip():
                errors.append(
                    {"field": "core.prompt_fragment", "message": "全局提示片段不能为空"}
                )
            for module_type, module in (draft.get("modules") or {}).items():
                if not module.get("enabled"):
                    continue
                if not str(module.get("summary") or "").strip():
                    errors.append(
                        {
                            "field": f"modules.{module_type}.summary",
                            "message": "已启用模块需要填写定位摘要",
                        }
                    )
                if not str(module.get("prompt_fragment") or "").strip():
                    errors.append(
                        {
                            "field": f"modules.{module_type}.prompt_fragment",
                            "message": "已启用模块需要填写提示片段",
                        }
                    )
            warnings = self._reference_warnings(project_id, draft)
            return {"valid": not errors, "errors": errors, "warnings": warnings}

    @staticmethod
    def _sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    def _published_references(self, project_id: str, references: list[dict]) -> list[dict]:
        result = []
        for raw in references:
            reference = copy.deepcopy(raw)
            relative_path = str(reference.get("relative_path") or "")
            if relative_path:
                path = self.projects.resolve_project_file(project_id, relative_path)
                if path.is_file():
                    reference["content_sha256"] = self._sha256(path)
                    reference["availability"] = "available"
                elif not reference.get("remote_asset_id"):
                    reference["availability"] = "missing"
            elif not reference.get("remote_asset_id"):
                reference["availability"] = "missing"
            result.append(reference)
        return result

    def _published_version(self, project_id: str, package: dict, draft: dict) -> dict:
        version_number = int(package.get("latest_published_version") or 0) + 1
        version_id = f"guidever_{uuid.uuid4().hex}"
        version = copy.deepcopy(draft)
        version.update(
            {
                "id": version_id,
                "package_id": package["id"],
                "style_direction_id": package["style_direction_id"],
                "version": version_number,
                "published_at": utc_now(),
            }
        )
        version["core"]["references"] = self._published_references(
            project_id, version["core"].get("references") or []
        )
        for module in version.get("modules", {}).values():
            module["references"] = self._published_references(
                project_id, module.get("references") or []
            )
        direction = next(
            (
                item
                for item in self.projects.list_style_directions(project_id)
                if item.get("id") == package["style_direction_id"]
            ),
            {},
        )
        version["source_snapshot"] = {
            "draft_revision": draft.get("revision"),
            "style_direction": copy.deepcopy(direction),
        }
        version["validation"] = self.validate_draft(project_id, package["id"])
        return version

    def publish(self, project_id: str, package_id: str) -> dict:
        package_id = self._validate_package_id(package_id)
        with self._lock:
            report = self.validate_draft(project_id, package_id)
            if not report["valid"]:
                raise ProjectError("Style guide draft is incomplete")
            registry = self._read_registry(project_id)
            package = self._package(registry, package_id)
            draft = self._read_draft(project_id, package_id)
            version = self._published_version(project_id, package, draft)
            root = self.projects.project_root(project_id)
            board_path = (
                root
                / "production"
                / "style-guides"
                / package_id
                / version["id"]
                / "style-board.png"
            )
            reference_paths = []
            sections = [version.get("core") or {}]
            sections.extend(version.get("modules", {}).values())
            for section in sections:
                for reference in section.get("references") or []:
                    relative_path = str(reference.get("relative_path") or "")
                    if not relative_path:
                        continue
                    path = self.projects.resolve_project_file(
                        project_id, relative_path
                    )
                    if path.is_file() and path not in reference_paths:
                        reference_paths.append(path)
            template_relative_path = str(
                version.get("visual_guide", {}).get("template_relative_path") or ""
            )
            template_path = (
                self.projects.resolve_project_file(project_id, template_relative_path)
                if template_relative_path
                else None
            )
            if template_path and template_path.is_file():
                version["style_board_relative_path"] = template_relative_path
            else:
                render_style_board(
                    board_path,
                    title=version.get("title") or package.get("title") or "Style Guide",
                    summary=version.get("summary")
                    or version.get("core", {}).get("vision_statement")
                    or "",
                    palette=version.get("core", {}).get("palette") or [],
                    image_paths=reference_paths,
                )
                version["style_board_relative_path"] = board_path.relative_to(
                    root
                ).as_posix()
            version_path = self._version_path(
                project_id, package_id, version["id"]
            )
            self.projects._atomic_write_json(version_path, version)
            package["latest_published_version_id"] = version["id"]
            package["latest_published_version"] = version["version"]
            package["enabled_module_types"] = [
                key
                for key, module in version.get("modules", {}).items()
                if module.get("enabled")
            ]
            package["updated_at"] = version["published_at"]
            try:
                self._write_registry(project_id, registry)
            except Exception:
                version_path.unlink(missing_ok=True)
                if version.get("style_board_relative_path") != template_relative_path:
                    board_path.unlink(missing_ok=True)
                raise
            return copy.deepcopy(version)

    def _version_resource_state(self, project_id: str, version: dict) -> dict:
        hydrated = copy.deepcopy(version)
        resources = []
        visual = hydrated.get("visual_guide") if isinstance(hydrated.get("visual_guide"), dict) else {}
        visual_run_id = str(visual.get("run_id") or "").strip()
        if visual_run_id:
            sections = [hydrated.get("core") or {}]
            sections.extend((hydrated.get("modules") or {}).values())
            for section in sections:
                section["references"] = [
                    reference
                    for reference in section.get("references") or []
                    if not str(reference.get("visual_run_id") or "").strip()
                    or str(reference.get("visual_run_id") or "").strip() == visual_run_id
                ]
        primary_path = str(
            visual.get("template_relative_path")
            or hydrated.get("style_board_relative_path")
            or ""
        )
        if primary_path:
            resources.append(
                {
                    "kind": "template",
                    "module_type": "overview",
                    "relative_path": primary_path,
                    "remote_asset_id": "",
                }
            )
        sections = [("core", hydrated.get("core") or {})]
        sections.extend((key, value) for key, value in (hydrated.get("modules") or {}).items())
        for module_type, section in sections:
            for reference in section.get("references") or []:
                remote_asset_id = str(reference.get("remote_asset_id") or "").strip()
                relative_path = str(reference.get("relative_path") or "").strip()
                available = bool(remote_asset_id)
                if relative_path:
                    try:
                        available = self.projects.resolve_project_file(
                            project_id, relative_path
                        ).is_file() or available
                    except ProjectError:
                        available = False
                reference["availability"] = "available" if available else "missing"
                resources.append(
                    {
                        "kind": "reference",
                        "module_type": module_type,
                        "reference_id": str(reference.get("id") or ""),
                        "relative_path": relative_path,
                        "remote_asset_id": remote_asset_id,
                        "available": available,
                    }
                )
        for resource in resources:
            if "available" in resource:
                continue
            relative_path = str(resource.get("relative_path") or "")
            try:
                resource["available"] = bool(
                    relative_path
                    and self.projects.resolve_project_file(
                        project_id, relative_path
                    ).is_file()
                )
            except ProjectError:
                resource["available"] = False
        missing = [item for item in resources if not item.get("available")]
        hydrated["resources"] = resources
        hydrated["resource_count"] = len(resources)
        hydrated["missing_resources"] = missing
        hydrated["resource_state"] = "missing" if missing else "available"
        return hydrated

    def get_version(
        self, project_id: str, package_id: str, version_id: str
    ) -> dict:
        package_id = self._validate_package_id(package_id)
        version_id = self._validate_version_id(version_id)
        with self._lock:
            self._package(self._read_registry(project_id), package_id)
            path = self._version_path(project_id, package_id, version_id)
            version = self.projects._read_json(path, {})
            if (
                version.get("id") != version_id
                or version.get("package_id") != package_id
            ):
                raise ProjectError(f"Style guide version does not exist: {version_id}")
            return self._version_resource_state(project_id, version)

    def list_versions(self, project_id: str, package_id: str) -> list[dict]:
        package_id = self._validate_package_id(package_id)
        with self._lock:
            package = self._package(self._read_registry(project_id), package_id)
            directory = self._package_dir(project_id, package_id) / "versions"
            versions = []
            if directory.is_dir():
                for path in directory.glob("guidever_*.json"):
                    version = self.projects._read_json(path, {})
                    if version.get("package_id") != package_id or not version.get("id"):
                        continue
                    item = self._version_resource_state(project_id, version)
                    item["is_confirmed"] = (
                        item.get("id") == package.get("confirmed_version_id")
                    )
                    versions.append(item)
            versions.sort(
                key=lambda item: (
                    bool(item.get("is_confirmed")),
                    str(item.get("published_at") or ""),
                ),
                reverse=True,
            )
            return versions

    def find_version_by_visual_run(
        self, project_id: str, package_id: str, run_id: str
    ) -> dict | None:
        run_id = str(run_id or "").strip()
        if not run_id:
            return None
        for version in self.list_versions(project_id, package_id):
            if str(version.get("visual_guide", {}).get("run_id") or "") == run_id:
                return version
        return None

    def set_confirmed_version(
        self, project_id: str, package_id: str, version_id: str
    ) -> dict:
        package_id = self._validate_package_id(package_id)
        version_id = self._validate_version_id(version_id)
        with self._lock:
            registry = self._read_registry(project_id)
            package = self._package(registry, package_id)
            if package.get("trashed_at"):
                raise ProjectError("Trashed style guide package cannot be confirmed")
            version = self.get_version(project_id, package_id, version_id)
            if version.get("missing_resources"):
                raise ProjectError("Style guide version has missing resources")
            package["confirmed_version_id"] = version_id
            package["confirmed_version"] = int(version.get("version") or 0)
            package["updated_at"] = utc_now()
            self._write_registry(project_id, registry)
            return self._package_summary(project_id, package)

    def set_default(self, project_id: str, package_id: str) -> dict:
        package_id = str(package_id or "").strip()
        with self._lock:
            if not package_id:
                self.projects.update_project(
                    project_id, changes={"default_style_guide_package_id": ""}
                )
                return {"id": "", "is_default": False}
            package_id = self._validate_package_id(package_id)
            package = self._package(self._read_registry(project_id), package_id)
            if package.get("trashed_at"):
                raise ProjectError("Trashed style guide package cannot be the default")
            if not package.get("confirmed_version_id"):
                raise ProjectError("Only a confirmed style guide can be the default")
            self.projects.update_project(
                project_id,
                changes={"default_style_guide_package_id": package_id},
            )
            return self._package_summary(project_id, package)

    def compile_preview(self, project_id: str, *, package_id: str, request: dict) -> dict:
        package_id = self._validate_package_id(package_id)
        request = request if isinstance(request, dict) else {}
        with self._lock:
            package = self._package(self._read_registry(project_id), package_id)
            if package.get("trashed_at"):
                raise ProjectError("Trashed style guide package cannot be compiled")
            version_id = str(request.get("version_id") or "").strip()
            confirmed_version_id = str(package.get("confirmed_version_id") or "")
            if not version_id:
                version_id = confirmed_version_id
            if not version_id:
                raise ProjectError("Style guide package has no confirmed version")
            if version_id != confirmed_version_id:
                raise ProjectError("Style guide version is not the confirmed version")
            version = self.get_version(project_id, package_id, version_id)
            if version.get("missing_resources"):
                raise ProjectError("Style guide version has missing resources")
            compiled = compile_style_guide(
                version,
                asset_type=str(request.get("asset_type") or ""),
                prompt=str(request.get("prompt") or ""),
                mode=str(request.get("mode") or "balanced"),
                model_reference_limit=int(
                    request.get("model_reference_limit") or 0
                ),
                module_overrides=request.get("module_types"),
                reference_overrides=request.get("reference_ids"),
                style_strength=request.get("style_strength", 70),
                conflict_resolutions=request.get("conflict_resolutions") or {},
            )
            compiled["package_id"] = package_id
            compiled["version_id"] = version_id
            return compiled

    @staticmethod
    def _merge_prompt_fragments(*values: object) -> str:
        result = []
        seen = set()
        for value in values:
            for item in str(value or "").replace("，", ",").split(","):
                normalized = item.strip()
                key = normalized.casefold()
                if normalized and key not in seen:
                    seen.add(key)
                    result.append(normalized)
        return ", ".join(result)

    def compile_for_generation(
        self,
        project_id: str,
        *,
        package_id: str,
        version_id: str,
        asset_type: str,
        prompt: str,
        mode: str,
        model_reference_limit: int,
        overrides: dict,
    ) -> dict:
        package_id = self._validate_package_id(package_id)
        version_id = self._validate_version_id(version_id)
        overrides = copy.deepcopy(overrides) if isinstance(overrides, dict) else {}
        with self._lock:
            package = self._package(self._read_registry(project_id), package_id)
            if package.get("trashed_at"):
                raise ProjectError("Trashed style guide package cannot be used")
            confirmed_version_id = str(package.get("confirmed_version_id") or "")
            if not confirmed_version_id:
                raise ProjectError("Style guide package has no confirmed version")
            if version_id != confirmed_version_id:
                raise ProjectError("Style guide version is not the confirmed version")
            version = self.get_version(project_id, package_id, version_id)
            if version.get("missing_resources"):
                raise ProjectError("Style guide version has missing resources")
            compiled = compile_style_guide(
                version,
                asset_type=str(asset_type or ""),
                prompt=str(prompt or ""),
                mode=str(mode or "balanced"),
                model_reference_limit=int(model_reference_limit or 0),
                module_overrides=overrides.get("module_types"),
                reference_overrides=overrides.get("reference_ids"),
                style_strength=overrides.get("style_strength", 70),
                conflict_resolutions=overrides.get("conflict_resolutions") or {},
            )
            prompt_override = str(overrides.get("prompt_override") or "").strip()
            final_prompt = self._merge_prompt_fragments(
                compiled.get("positive_prompt"), prompt_override
            )
            final_negative_prompt = self._merge_prompt_fragments(
                overrides.get("user_negative_prompt"),
                compiled.get("negative_prompt"),
                overrides.get("negative_override"),
            )
            reference_inputs = []
            for reference in compiled.get("references") or []:
                relative_path = str(reference.get("relative_path") or "").strip()
                remote_asset_id = str(reference.get("remote_asset_id") or "").strip()
                if remote_asset_id:
                    reference_inputs.append(
                        {
                            "relative_path": relative_path,
                            "remote_asset_id": remote_asset_id,
                            "content_sha256": str(reference.get("content_sha256") or ""),
                            "source_record_id": str(reference.get("source_record_id") or ""),
                        }
                    )
                elif relative_path:
                    self.projects.resolve_project_file(project_id, relative_path)
                    reference_inputs.append(relative_path)
            snapshot = {
                "style_guide_package_id": package_id,
                "style_guide_version_id": version_id,
                "style_guide_mode": str(mode or "balanced"),
                "style_guide_module_types": copy.deepcopy(
                    compiled.get("module_types") or []
                ),
                "style_guide_reference_snapshot": copy.deepcopy(
                    compiled.get("references") or []
                ),
                "style_guide_prompt_snapshot": final_prompt,
                "style_guide_negative_prompt_snapshot": final_negative_prompt,
                "style_guide_overrides": copy.deepcopy(overrides),
            }
            return {
                "final_prompt": final_prompt,
                "final_negative_prompt": final_negative_prompt,
                "reference_paths": reference_inputs,
                "warnings": copy.deepcopy(compiled.get("warnings") or []),
                "blocking_warnings": copy.deepcopy(
                    compiled.get("blocking_warnings") or []
                ),
                "can_continue": bool(compiled.get("can_continue")),
                "budget": copy.deepcopy(compiled.get("budget") or {}),
                "snapshot": snapshot,
            }


__all__ = ["StyleGuideService"]
