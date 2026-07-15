import base64
import copy
import hashlib
import json
import os
import re
import shutil
import tempfile
import threading
import time
import unicodedata
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path


PROJECT_SCHEMA_VERSION = 1
REGISTRY_SCHEMA_VERSION = 1
WORKFLOW_SCHEMA_VERSION = 1
WORKFLOW_STATUSES = {"planned", "running", "succeeded", "failed", "canceled"}
PROJECT_MARKER_DIR = ".sprite-lab"
PROJECT_MANIFEST_NAME = "project.json"
SLUG_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$")
LOCK_TIMEOUT_SECONDS = 5.0
ASSET_CATEGORIES = (
    ("character", "角色"),
    ("scene", "场景"),
    ("ui", "UI"),
    ("icon", "图标"),
    ("effect", "特效"),
    ("other", "其他"),
)
PROJECT_TEMPLATES = {
    "game-ui-kit": (("ui", "HUD Layout"), ("ui", "Menu Panels"), ("icon", "Core Icons")),
    "character-pack": (("character", "Main Character"), ("character", "Enemy Set"), ("effect", "Character Effects")),
    "scene-pack": (("scene", "Main Scene"), ("scene", "Background Layers"), ("icon", "Scene Icons")),
}


class ProjectError(RuntimeError):
    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class ProjectService:
    def __init__(self, work_dir: Path):
        self.work_dir = Path(work_dir).expanduser().resolve()
        self.projects_dir = self.work_dir / "projects"
        self.registry_path = self.work_dir / "project-registry.json"
        self.lock_path = self.work_dir / ".projects.lock"
        self._lock = threading.RLock()
        self.work_dir.mkdir(parents=True, exist_ok=True)
        self.projects_dir.mkdir(parents=True, exist_ok=True)
        with self._locked():
            self._ensure_default_project_unlocked()

    @staticmethod
    def _is_junction(path: Path) -> bool:
        return bool(
            callable(getattr(path, "is_junction", None))
            and path.is_junction()
        )

    @classmethod
    def _reject_link(cls, path: Path, label: str) -> None:
        if path.is_symlink() or cls._is_junction(path):
            raise ProjectError(f"Refusing to use a linked {label}: {path}")

    @contextmanager
    def _file_lock(self, timeout: float = LOCK_TIMEOUT_SECONDS):
        deadline = time.monotonic() + max(0.0, float(timeout))
        with self.lock_path.open("a+b") as handle:
            handle.seek(0, os.SEEK_END)
            if handle.tell() == 0:
                handle.write(b"\0")
                handle.flush()
            handle.seek(0)
            if os.name == "nt":
                import msvcrt

                while True:
                    try:
                        msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
                        break
                    except OSError:
                        if time.monotonic() >= deadline:
                            raise TimeoutError("Timed out waiting for project registry lock")
                        time.sleep(0.05)
                try:
                    yield
                finally:
                    handle.seek(0)
                    msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl

                while True:
                    try:
                        fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                        break
                    except OSError:
                        if time.monotonic() >= deadline:
                            raise TimeoutError("Timed out waiting for project registry lock")
                        time.sleep(0.05)
                try:
                    yield
                finally:
                    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)

    @contextmanager
    def _locked(self):
        with self._lock:
            with self._file_lock():
                yield

    @staticmethod
    def _atomic_write_json(path: Path, payload: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=path.parent,
                prefix=f".{path.name}.",
                suffix=".tmp",
                delete=False,
            ) as handle:
                json.dump(payload, handle, ensure_ascii=False, indent=2)
                handle.write("\n")
                handle.flush()
                os.fsync(handle.fileno())
                temporary_path = Path(handle.name)
            os.replace(temporary_path, path)
        finally:
            if temporary_path is not None and temporary_path.exists():
                temporary_path.unlink()

    @staticmethod
    def _read_json(path: Path, fallback: dict) -> dict:
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            return copy.deepcopy(fallback)
        except (OSError, json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise ProjectError(f"Invalid JSON file: {path}") from exc
        if not isinstance(payload, dict):
            raise ProjectError(f"Expected a JSON object: {path}")
        return payload

    @staticmethod
    def normalize_slug(value: str, *, fallback: str = "project") -> str:
        raw_value = str(value or "").strip()
        normalized = unicodedata.normalize("NFKD", raw_value)
        ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
        slug = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
        slug = re.sub(r"-+", "-", slug)[:64].rstrip("-")
        if raw_value and not slug:
            raise ProjectError(
                "Project slug must use lowercase English letters, numbers, and hyphens"
            )
        if not slug:
            slug = fallback
        if not SLUG_PATTERN.fullmatch(slug):
            raise ProjectError(
                "Project slug must use lowercase English letters, numbers, and hyphens"
            )
        return slug

    def default_parent_path(self) -> str:
        return str(self.projects_dir)

    def _read_registry_unlocked(self) -> dict:
        registry = self._read_json(
            self.registry_path,
            {
                "schema_version": REGISTRY_SCHEMA_VERSION,
                "active_project_id": "",
                "projects": [],
            },
        )
        if not isinstance(registry.get("projects"), list):
            raise ProjectError("Project registry projects must be an array")
        registry["schema_version"] = REGISTRY_SCHEMA_VERSION
        registry["active_project_id"] = str(registry.get("active_project_id") or "")
        return registry

    def _write_registry_unlocked(self, registry: dict) -> None:
        registry = copy.deepcopy(registry)
        registry["schema_version"] = REGISTRY_SCHEMA_VERSION
        registry["updated_at"] = utc_now()
        self._atomic_write_json(self.registry_path, registry)

    @staticmethod
    def _manifest_path(root: Path) -> Path:
        return root / PROJECT_MARKER_DIR / PROJECT_MANIFEST_NAME

    @staticmethod
    def _project_paths(root: Path) -> dict[str, Path]:
        marker = root / PROJECT_MARKER_DIR
        return {
            "root": root,
            "marker": marker,
            "manifest": marker / PROJECT_MANIFEST_NAME,
            "asset_tree": marker / "asset-tree.json",
            "style_directions": marker / "style-directions.json",
            "generation_history": marker / "generation-history.json",
            "library_manifest": marker / "library.json",
            "trash_manifest": marker / "trash.json",
            "integration_manifest": marker / "integration.json",
            "events": marker / "events" / "events.jsonl",
            "workflows": marker / "workflows",
            "manifests": marker / "manifests",
            "processing_intakes": marker / "processing" / "intakes",
            "canvases": marker / "canvases",
            "deployments": marker / "deployments",
            "locks": marker / "locks",
            "production_images": root / "production" / "images",
            "production_videos": root / "production" / "videos",
            "production_audio": root / "production" / "audio",
            "processing_images": root / "processing" / "images",
            "processing_image_intakes": root / "processing" / "images" / "intakes",
            "processing_videos": root / "processing" / "videos",
            "processing_audio": root / "processing" / "audio",
            "library_assets": root / "library" / "assets",
            "exports": root / "exports",
            "cache": root / "cache",
            "trash": root / "trash",
        }

    @staticmethod
    def _initial_asset_tree(project_id: str) -> dict:
        now = utc_now()
        nodes = [
            {
                "id": f"category-{key}",
                "project_id": project_id,
                "parent_id": None,
                "name": label,
                "type": "category",
                "category": key,
                "generated_count": 0,
                "selected_count": 0,
                "target_count": 0,
                "order": index,
                "created_at": now,
                "updated_at": now,
            }
            for index, (key, label) in enumerate(ASSET_CATEGORIES)
        ]
        return {"schema_version": 1, "project_id": project_id, "nodes": nodes}

    def _initialize_project_unlocked(
        self,
        root: Path,
        *,
        project_id: str,
        display_name: str,
        slug: str,
        project_type: str = "",
        aspect_ratio: str = "1:1",
        description: str = "",
        style_tags: list[str] | None = None,
        create_mode: str = "blank",
        template_id: str = "",
        default_background: str = "transparent",
        default_image_count: int = 4,
        default_file_format: str = "png",
        is_default: bool = False,
    ) -> dict:
        root = Path(os.path.abspath(os.path.normpath(str(root))))
        if root.exists():
            self._reject_link(root, "project directory")
            if not root.is_dir():
                raise ProjectError(f"Project path is not a directory: {root}")
            entries = list(root.iterdir())
            if entries and not self._manifest_path(root).is_file():
                raise ProjectError(
                    "Project directory is not empty and has no .sprite-lab/project.json"
                )
        else:
            root.mkdir(parents=True, exist_ok=False)
        paths = self._project_paths(root)
        if paths["manifest"].is_file():
            return self._read_project_manifest_unlocked(root)
        for key, path in paths.items():
            if key in {
                "root",
                "manifest",
                "asset_tree",
                "style_directions",
                "generation_history",
                "library_manifest",
                "trash_manifest",
                "integration_manifest",
                "events",
            }:
                continue
            path.mkdir(parents=True, exist_ok=True)
        paths["events"].parent.mkdir(parents=True, exist_ok=True)
        now = utc_now()
        manifest = {
            "schema_version": PROJECT_SCHEMA_VERSION,
            "id": project_id,
            "display_name": str(display_name or "Untitled Project").strip(),
            "slug": slug,
            "project_type": str(project_type or "").strip(),
            "aspect_ratio": str(aspect_ratio or "1:1").strip(),
            "description": str(description or "").strip(),
            "style_status": "unconfirmed",
            "current_style_direction_id": "",
            "style_tags": [str(tag).strip()[:30] for tag in (style_tags or []) if str(tag).strip()][:20],
            "create_mode": str(create_mode or "blank"),
            "template_id": str(template_id or "").strip()[:80],
            "cover_relative_path": "",
            "default_background": str(default_background or "transparent"),
            "default_image_count": max(1, min(int(default_image_count or 4), 16)),
            "default_file_format": str(default_file_format or "png"),
            "default_aspect_ratio": str(aspect_ratio or "1:1").strip(),
            "is_default": bool(is_default),
            "created_at": now,
            "updated_at": now,
        }
        self._atomic_write_json(paths["manifest"], manifest)
        asset_tree = self._initial_asset_tree(project_id)
        for index, (category, name) in enumerate(PROJECT_TEMPLATES.get(manifest["template_id"], ()), start=1):
            asset_tree["nodes"].append(
                {
                    "id": f"asset_{uuid.uuid4().hex}",
                    "project_id": project_id,
                    "parent_id": f"category-{category}",
                    "name": name,
                    "type": "asset",
                    "category": category,
                    "generated_count": 0,
                    "selected_count": 0,
                    "target_count": 1,
                    "order": index,
                    "created_at": now,
                    "updated_at": now,
                }
            )
        self._atomic_write_json(paths["asset_tree"], asset_tree)
        self._atomic_write_json(
            paths["style_directions"],
            {"schema_version": 1, "project_id": project_id, "directions": []},
        )
        self._atomic_write_json(
            paths["generation_history"],
            {"schema_version": 1, "project_id": project_id, "records": []},
        )
        self._atomic_write_json(
            paths["library_manifest"],
            {"schema_version": 1, "project_id": project_id, "assets": []},
        )
        self._atomic_write_json(
            paths["trash_manifest"],
            {"schema_version": 1, "project_id": project_id, "items": []},
        )
        self._atomic_write_json(
            paths["integration_manifest"],
            {
                "schema_version": 1,
                "project_id": project_id,
                "target_root": "",
                "mappings": {key: key for key, _label in ASSET_CATEGORIES},
                "deployments": [],
            },
        )
        self._append_event_unlocked(
            root,
            {
                "type": "project.created",
                "actor": "system" if is_default else "user",
                "project_id": project_id,
                "data": {"display_name": manifest["display_name"], "slug": slug},
            },
        )
        return manifest

    def _read_project_manifest_unlocked(self, root: Path) -> dict:
        manifest_path = self._manifest_path(root)
        manifest = self._read_json(manifest_path, {})
        if int(manifest.get("schema_version") or 0) != PROJECT_SCHEMA_VERSION:
            raise ProjectError(f"Unsupported project schema: {manifest_path}")
        project_id = str(manifest.get("id") or "").strip()
        slug = str(manifest.get("slug") or "").strip()
        if not project_id or not SLUG_PATTERN.fullmatch(slug):
            raise ProjectError(f"Invalid project manifest: {manifest_path}")
        manifest.setdefault("style_status", "unconfirmed")
        manifest.setdefault("current_style_direction_id", "")
        manifest.setdefault("style_tags", [])
        manifest.setdefault("create_mode", "blank")
        manifest.setdefault("template_id", "")
        manifest.setdefault("cover_relative_path", "")
        manifest.setdefault("default_background", "transparent")
        manifest.setdefault("default_image_count", 4)
        manifest.setdefault("default_file_format", "png")
        manifest.setdefault("default_aspect_ratio", manifest.get("aspect_ratio") or "1:1")
        return manifest

    def _register_project_unlocked(self, registry: dict, root: Path, manifest: dict) -> None:
        now = utc_now()
        projects = [
            entry
            for entry in registry["projects"]
            if str(entry.get("id") or "") != manifest["id"]
            and str(entry.get("root_path") or "").lower() != str(root).lower()
        ]
        projects.insert(
            0,
            {
                "id": manifest["id"],
                "root_path": str(root),
                "added_at": now,
                "last_opened_at": now,
            },
        )
        registry["projects"] = projects

    def _ensure_default_project_unlocked(self) -> None:
        root = self.projects_dir / "default"
        manifest = self._initialize_project_unlocked(
            root,
            project_id="default",
            display_name="Default",
            slug="default",
            is_default=True,
        )
        registry = self._read_registry_unlocked()
        existing = next(
            (entry for entry in registry["projects"] if entry.get("id") == "default"),
            None,
        )
        if existing is None:
            self._register_project_unlocked(registry, root, manifest)
        if not registry.get("active_project_id"):
            registry["active_project_id"] = ""
        self._write_registry_unlocked(registry)

    def _project_summary_unlocked(self, entry: dict) -> dict:
        root = Path(str(entry.get("root_path") or ""))
        available = root.is_dir() and self._manifest_path(root).is_file()
        summary = {
            "id": str(entry.get("id") or ""),
            "root_path": str(root),
            "available": available,
            "last_opened_at": str(entry.get("last_opened_at") or ""),
        }
        if not available:
            summary.update(
                {
                    "display_name": root.name or "Unavailable project",
                    "slug": root.name,
                    "project_type": "",
                    "aspect_ratio": "",
                    "description": "",
                    "is_default": summary["id"] == "default",
                    "created_at": "",
                    "updated_at": "",
                }
            )
            return summary
        try:
            summary.update(self._read_project_manifest_unlocked(root))
        except ProjectError:
            summary["available"] = False
        return summary

    def list_projects(self) -> dict:
        with self._locked():
            registry = self._read_registry_unlocked()
            projects = [self._project_summary_unlocked(entry) for entry in registry["projects"]]
            projects.sort(key=lambda item: (not item.get("is_default"), item.get("display_name", "").lower()))
            return {
                "schema_version": REGISTRY_SCHEMA_VERSION,
                "default_parent_path": self.default_parent_path(),
                "active_project_id": registry.get("active_project_id") or "",
                "projects": projects,
            }

    def create_project(
        self,
        *,
        display_name: str,
        slug: str,
        parent_path: str = "",
        project_type: str = "",
        aspect_ratio: str = "1:1",
        description: str = "",
        style_tags: list[str] | None = None,
        create_mode: str = "blank",
        template_id: str = "",
        default_background: str = "transparent",
        default_image_count: int = 4,
        default_file_format: str = "png",
    ) -> dict:
        display_name = str(display_name or "").strip()
        if len(display_name) < 2 or len(display_name) > 30:
            raise ProjectError("Project display name must contain 2 to 30 characters")
        description = str(description or "").strip()
        if len(description) > 200:
            raise ProjectError("Project description must contain at most 200 characters")
        create_mode = str(create_mode or "blank")
        if create_mode not in {"blank", "reference", "template"}:
            raise ProjectError("Invalid project create mode")
        template_id = str(template_id or "").strip()
        if create_mode == "template" and template_id not in PROJECT_TEMPLATES:
            raise ProjectError("A supported project template is required")
        fallback_slug = datetime.now().strftime("project-%Y%m%d-%H%M%S")
        slug = self.normalize_slug(slug, fallback=fallback_slug)
        parent = Path(parent_path).expanduser() if str(parent_path or "").strip() else self.projects_dir
        parent = Path(os.path.abspath(os.path.normpath(str(parent))))
        parent.mkdir(parents=True, exist_ok=True)
        self._reject_link(parent, "project parent directory")
        root = parent / slug
        with self._locked():
            project_id = f"prj_{uuid.uuid4().hex}"
            manifest = self._initialize_project_unlocked(
                root,
                project_id=project_id,
                display_name=display_name,
                slug=slug,
                project_type=project_type,
                aspect_ratio=aspect_ratio,
                description=description,
                style_tags=style_tags,
                create_mode=create_mode,
                template_id=template_id,
                default_background=default_background,
                default_image_count=default_image_count,
                default_file_format=default_file_format,
            )
            registry = self._read_registry_unlocked()
            self._register_project_unlocked(registry, root, manifest)
            registry["active_project_id"] = project_id
            self._write_registry_unlocked(registry)
            return self._project_summary_unlocked(
                {"id": project_id, "root_path": str(root), "last_opened_at": utc_now()}
            )

    def open_project(self, root_path: str) -> dict:
        root = Path(str(root_path or "").strip()).expanduser()
        if not str(root_path or "").strip():
            raise ProjectError("Project path is required")
        root = Path(os.path.abspath(os.path.normpath(str(root))))
        if not root.is_dir():
            raise ProjectError(f"Project directory does not exist: {root}")
        self._reject_link(root, "project directory")
        with self._locked():
            manifest = self._read_project_manifest_unlocked(root)
            registry = self._read_registry_unlocked()
            self._register_project_unlocked(registry, root, manifest)
            registry["active_project_id"] = manifest["id"]
            self._write_registry_unlocked(registry)
            return self._project_summary_unlocked(
                {"id": manifest["id"], "root_path": str(root), "last_opened_at": utc_now()}
            )

    def select_project(self, project_id: str) -> dict:
        project_id = str(project_id or "").strip()
        with self._locked():
            registry = self._read_registry_unlocked()
            entry = next(
                (entry for entry in registry["projects"] if str(entry.get("id") or "") == project_id),
                None,
            )
            if entry is None:
                raise ProjectError(f"Project is not registered: {project_id}")
            summary = self._project_summary_unlocked(entry)
            if not summary.get("available"):
                raise ProjectError(f"Project directory is unavailable: {entry.get('root_path')}")
            entry["last_opened_at"] = utc_now()
            registry["active_project_id"] = project_id
            self._write_registry_unlocked(registry)
            return summary

    def clear_active_project(self) -> None:
        with self._locked():
            registry = self._read_registry_unlocked()
            registry["active_project_id"] = ""
            self._write_registry_unlocked(registry)

    def get_project(self, project_id: str) -> dict:
        project_id = str(project_id or "").strip()
        with self._locked():
            registry = self._read_registry_unlocked()
            entry = next(
                (entry for entry in registry["projects"] if str(entry.get("id") or "") == project_id),
                None,
            )
            if entry is None:
                raise ProjectError(f"Project is not registered: {project_id}")
            summary = self._project_summary_unlocked(entry)
            if not summary.get("available"):
                raise ProjectError(f"Project directory is unavailable: {entry.get('root_path')}")
            return summary

    def _project_root_unlocked(self, project_id: str) -> Path:
        registry = self._read_registry_unlocked()
        entry = next(
            (entry for entry in registry["projects"] if str(entry.get("id") or "") == project_id),
            None,
        )
        if entry is None:
            raise ProjectError(f"Project is not registered: {project_id}")
        summary = self._project_summary_unlocked(entry)
        if not summary.get("available"):
            raise ProjectError(f"Project directory is unavailable: {entry.get('root_path')}")
        return Path(summary["root_path"])

    def project_root(self, project_id: str) -> Path:
        return Path(self.get_project(project_id)["root_path"])

    def project_paths(self, project_id: str) -> dict[str, Path]:
        return self._project_paths(self.project_root(project_id))

    def _read_asset_tree_unlocked(self, root: Path) -> dict:
        paths = self._project_paths(root)
        tree = self._read_json(paths["asset_tree"], {})
        nodes = tree.get("nodes")
        if int(tree.get("schema_version") or 0) != 1 or not isinstance(nodes, list):
            raise ProjectError(f"Invalid asset tree: {paths['asset_tree']}")
        node_ids = set()
        for node in nodes:
            if not isinstance(node, dict):
                raise ProjectError(f"Invalid asset node: {paths['asset_tree']}")
            node_id = str(node.get("id") or "").strip()
            if not node_id or node_id in node_ids:
                raise ProjectError(f"Invalid asset node id: {paths['asset_tree']}")
            node_ids.add(node_id)
        for node in nodes:
            parent_id = str(node.get("parent_id") or "").strip()
            if parent_id and parent_id not in node_ids:
                raise ProjectError(f"Asset node parent is missing: {parent_id}")
            if parent_id == node.get("id"):
                raise ProjectError("Asset node cannot be its own parent")
        return tree

    def _asset_tree_with_counts_unlocked(self, root: Path) -> dict:
        tree = copy.deepcopy(self._read_asset_tree_unlocked(root))
        history = self._read_json(
            self._project_paths(root)["generation_history"],
            {"schema_version": 1, "records": []},
        )
        records = history.get("records") if isinstance(history.get("records"), list) else []
        counts: dict[str, dict[str, int]] = {}
        for record in records:
            if not isinstance(record, dict):
                continue
            node_id = str(record.get("asset_node_id") or "").strip()
            if not node_id:
                continue
            node_counts = counts.setdefault(node_id, {"generated": 0, "completed": 0, "selected": 0})
            node_counts["generated"] += 1
            if record.get("status") == "succeeded":
                node_counts["completed"] += 1
            if record.get("lifecycle_status") in {"selected", "confirmed", "in_library"}:
                node_counts["selected"] += 1
        for node in tree["nodes"]:
            node_counts = counts.get(str(node.get("id") or ""), {})
            node["generated_count"] = int(node_counts.get("generated") or 0)
            node["completed_count"] = int(node_counts.get("completed") or 0)
            node["selected_count"] = int(node_counts.get("selected") or 0)
        return tree

    def list_asset_tree(self, project_id: str) -> dict:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            return self._asset_tree_with_counts_unlocked(root)

    def get_asset_node(self, project_id: str, node_id: str) -> dict:
        node_id = str(node_id or "").strip() or "category-other"
        with self._locked():
            root = self._project_root_unlocked(project_id)
            tree = self._read_asset_tree_unlocked(root)
            node = next(
                (item for item in tree["nodes"] if str(item.get("id") or "") == node_id),
                None,
            )
            if node is None:
                raise ProjectError(f"Asset node does not exist: {node_id}")
            return copy.deepcopy(node)

    def create_asset_node(
        self,
        project_id: str,
        *,
        parent_id: str,
        name: str,
        node_type: str = "asset",
        target_count: int = 0,
        actor: str = "user",
    ) -> dict:
        name = str(name or "").strip()
        if not 1 <= len(name) <= 60:
            raise ProjectError("Asset node name must contain 1 to 60 characters")
        node_type = str(node_type or "asset").strip().lower()
        if node_type not in {"group", "asset"}:
            raise ProjectError("Asset node type must be group or asset")
        parent_id = str(parent_id or "").strip()
        if not parent_id:
            raise ProjectError("Asset node parent is required")
        try:
            target_count = max(0, min(int(target_count or 0), 100000))
        except (TypeError, ValueError) as exc:
            raise ProjectError("Asset node target count must be an integer") from exc
        with self._locked():
            root = self._project_root_unlocked(project_id)
            tree = self._read_asset_tree_unlocked(root)
            parent = next(
                (item for item in tree["nodes"] if str(item.get("id") or "") == parent_id),
                None,
            )
            if parent is None:
                raise ProjectError(f"Asset node parent does not exist: {parent_id}")
            if parent.get("type") == "asset":
                raise ProjectError("Asset nodes cannot contain child nodes")
            siblings = [item for item in tree["nodes"] if item.get("parent_id") == parent_id]
            if any(str(item.get("name") or "").casefold() == name.casefold() for item in siblings):
                raise ProjectError("An asset node with this name already exists")
            now = utc_now()
            node = {
                "id": f"asset_{uuid.uuid4().hex}",
                "project_id": project_id,
                "parent_id": parent_id,
                "name": name,
                "type": node_type,
                "category": str(parent.get("category") or "other"),
                "generated_count": 0,
                "completed_count": 0,
                "selected_count": 0,
                "target_count": target_count,
                "order": len(siblings),
                "created_at": now,
                "updated_at": now,
            }
            tree["nodes"].append(node)
            self._atomic_write_json(self._project_paths(root)["asset_tree"], tree)
            self._append_event_unlocked(
                root,
                {
                    "type": "asset-node.created",
                    "actor": str(actor or "user"),
                    "project_id": project_id,
                    "data": {"node_id": node["id"], "parent_id": parent_id, "name": name},
                },
            )
            return copy.deepcopy(node)

    def update_asset_node(
        self,
        project_id: str,
        node_id: str,
        *,
        name: str | None = None,
        target_count: int | None = None,
        actor: str = "user",
    ) -> dict:
        node_id = str(node_id or "").strip()
        with self._locked():
            root = self._project_root_unlocked(project_id)
            tree = self._read_asset_tree_unlocked(root)
            node = next(
                (item for item in tree["nodes"] if str(item.get("id") or "") == node_id),
                None,
            )
            if node is None:
                raise ProjectError(f"Asset node does not exist: {node_id}")
            if name is not None:
                normalized_name = str(name or "").strip()
                if not 1 <= len(normalized_name) <= 60:
                    raise ProjectError("Asset node name must contain 1 to 60 characters")
                siblings = [
                    item
                    for item in tree["nodes"]
                    if item.get("parent_id") == node.get("parent_id") and item.get("id") != node_id
                ]
                if any(
                    str(item.get("name") or "").casefold() == normalized_name.casefold()
                    for item in siblings
                ):
                    raise ProjectError("An asset node with this name already exists")
                node["name"] = normalized_name
            if target_count is not None:
                try:
                    node["target_count"] = max(0, min(int(target_count), 100000))
                except (TypeError, ValueError) as exc:
                    raise ProjectError("Asset node target count must be an integer") from exc
            node["updated_at"] = utc_now()
            self._atomic_write_json(self._project_paths(root)["asset_tree"], tree)
            self._append_event_unlocked(
                root,
                {
                    "type": "asset-node.updated",
                    "actor": str(actor or "user"),
                    "project_id": project_id,
                    "data": {"node_id": node_id, "name": node.get("name")},
                },
            )
            return copy.deepcopy(node)

    def delete_asset_node(self, project_id: str, node_id: str, *, actor: str = "user") -> dict:
        node_id = str(node_id or "").strip()
        with self._locked():
            root = self._project_root_unlocked(project_id)
            tree = self._read_asset_tree_unlocked(root)
            node = next(
                (item for item in tree["nodes"] if str(item.get("id") or "") == node_id),
                None,
            )
            if node is None:
                raise ProjectError(f"Asset node does not exist: {node_id}")
            if node.get("type") == "category":
                raise ProjectError("Built-in asset categories cannot be deleted")
            if any(item.get("parent_id") == node_id for item in tree["nodes"]):
                raise ProjectError("Asset node must be empty before deletion")
            history = self._read_json(
                self._project_paths(root)["generation_history"],
                {"schema_version": 1, "records": []},
            )
            if any(
                isinstance(record, dict) and str(record.get("asset_node_id") or "") == node_id
                for record in history.get("records", [])
            ):
                raise ProjectError("Asset node is referenced by generation history")
            tree["nodes"] = [item for item in tree["nodes"] if item.get("id") != node_id]
            self._atomic_write_json(self._project_paths(root)["asset_tree"], tree)
            self._append_event_unlocked(
                root,
                {
                    "type": "asset-node.deleted",
                    "actor": str(actor or "user"),
                    "project_id": project_id,
                    "data": {"node_id": node_id, "name": node.get("name")},
                },
            )
            return {"deleted_id": node_id}

    def trash_asset_node(self, project_id: str, node_id: str, *, actor: str = "user") -> dict:
        node_id = str(node_id or "").strip()
        with self._locked():
            root = self._project_root_unlocked(project_id)
            tree = self._read_asset_tree_unlocked(root)
            node = next(
                (item for item in tree["nodes"] if str(item.get("id") or "") == node_id),
                None,
            )
            if node is None:
                raise ProjectError(f"Asset node does not exist: {node_id}")
            if node.get("type") == "category":
                raise ProjectError("Built-in asset categories cannot be deleted")
            if any(item.get("parent_id") == node_id for item in tree["nodes"]):
                raise ProjectError("Asset node must be empty before deletion")
            history = self._read_json(
                self._project_paths(root)["generation_history"],
                {"schema_version": 1, "records": []},
            )
            if any(
                isinstance(record, dict) and str(record.get("asset_node_id") or "") == node_id
                for record in history.get("records", [])
            ):
                raise ProjectError("Asset node is referenced by generation history")
            tree["nodes"] = [item for item in tree["nodes"] if item.get("id") != node_id]
            self._atomic_write_json(self._project_paths(root)["asset_tree"], tree)
            item = self._add_trash_item_unlocked(
                root,
                object_type="asset_node",
                object_id=node_id,
                name=node.get("name", ""),
                source_module="production",
                payload=node,
            )
            self._append_event_unlocked(
                root,
                {
                    "type": "asset-node.trashed",
                    "actor": str(actor or "user"),
                    "project_id": project_id,
                    "data": {"node_id": node_id, "trash_id": item["id"]},
                },
            )
            return copy.deepcopy(item)

    @staticmethod
    def _normalized_tags(tags: list | None) -> list[str]:
        if not isinstance(tags, list):
            return []
        return list(
            dict.fromkeys(
                str(tag or "").strip()[:30]
                for tag in tags
                if str(tag or "").strip()
            )
        )[:20]

    def update_project(self, project_id: str, *, changes: dict, actor: str = "user") -> dict:
        allowed = {
            "display_name",
            "project_type",
            "aspect_ratio",
            "description",
            "style_tags",
            "cover_relative_path",
            "default_aspect_ratio",
            "default_background",
            "default_image_count",
            "default_file_format",
            "style_status",
            "current_style_direction_id",
        }
        with self._locked():
            root = self._project_root_unlocked(project_id)
            paths = self._project_paths(root)
            manifest = self._read_project_manifest_unlocked(root)
            for key, value in changes.items():
                if key not in allowed:
                    continue
                if key == "display_name":
                    value = str(value or "").strip()
                    if not 2 <= len(value) <= 30:
                        raise ProjectError("Project display name must contain 2 to 30 characters")
                elif key == "description":
                    value = str(value or "").strip()[:200]
                elif key == "style_tags":
                    value = self._normalized_tags(value)
                elif key == "default_image_count":
                    value = max(1, min(int(value or 4), 16))
                elif key == "style_status":
                    value = str(value or "unconfirmed")
                    if value not in {"unconfirmed", "confirmed"}:
                        raise ProjectError("Invalid project style status")
                else:
                    value = str(value or "").strip()
                manifest[key] = value
            manifest["updated_at"] = utc_now()
            self._atomic_write_json(paths["manifest"], manifest)
            self._append_event_unlocked(
                root,
                {
                    "type": "project.updated",
                    "actor": str(actor or "user"),
                    "project_id": project_id,
                    "data": {"fields": sorted(set(changes).intersection(allowed))},
                },
            )
            return self._project_summary_unlocked(
                {"id": project_id, "root_path": str(root), "last_opened_at": utc_now()}
            )

    def delete_project(self, project_id: str, *, actor: str = "user") -> dict:
        if project_id == "default":
            raise ProjectError("Default project cannot be deleted")
        with self._locked():
            registry = self._read_registry_unlocked()
            entry = next((item for item in registry["projects"] if str(item.get("id") or "") == project_id), None)
            if entry is None:
                raise ProjectError(f"Project is not registered: {project_id}")
            root = Path(str(entry.get("root_path") or ""))
            manifest = self._read_project_manifest_unlocked(root)
            archive_root = self.work_dir / "deleted-projects"
            archive_root.mkdir(parents=True, exist_ok=True)
            archive = archive_root / f"{manifest['slug']}-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{project_id[-8:]}"
            if archive.exists():
                raise ProjectError(f"Project archive already exists: {archive}")
            shutil.move(str(root), str(archive))
            registry["projects"] = [item for item in registry["projects"] if str(item.get("id") or "") != project_id]
            if registry.get("active_project_id") == project_id:
                registry["active_project_id"] = ""
            self._write_registry_unlocked(registry)
            return {"deleted_id": project_id, "archive_path": str(archive), "actor": str(actor or "user")}

    def import_project_image(self, project_id: str, *, data_url: str, file_name: str = "reference.png", role: str = "reference", actor: str = "user") -> dict:
        match = re.fullmatch(r"data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=\r\n]+)", str(data_url or ""), flags=re.IGNORECASE)
        if not match:
            raise ProjectError("Project image must be a PNG, JPEG, or WebP data URL")
        try:
            content = base64.b64decode(match.group(2), validate=True)
        except ValueError as exc:
            raise ProjectError("Project image data is invalid") from exc
        if not content or len(content) > 20 * 1024 * 1024:
            raise ProjectError("Project image must be smaller than 20 MB")
        role = "cover" if role == "cover" else "reference"
        extension = ".jpg" if match.group(1).lower() == "jpeg" else f".{match.group(1).lower()}"
        with self._locked():
            root = self._project_root_unlocked(project_id)
            target_dir = self._project_paths(root)["marker"] / "references" / role
            target_dir.mkdir(parents=True, exist_ok=True)
            target = target_dir / f"{role}_{uuid.uuid4().hex}{extension}"
            target.write_bytes(content)
            relative = target.relative_to(root).as_posix()
            manifest = self._read_project_manifest_unlocked(root)
            if role == "cover":
                manifest["cover_relative_path"] = relative
            else:
                references = list(manifest.get("reference_images") or [])
                references.append({"relative_path": relative, "file_name": str(file_name or target.name)[:160], "created_at": utc_now()})
                manifest["reference_images"] = references[-20:]
            manifest["updated_at"] = utc_now()
            self._atomic_write_json(self._project_paths(root)["manifest"], manifest)
            self._append_event_unlocked(root, {"type": "project.image-imported", "actor": actor, "project_id": project_id, "data": {"role": role, "relative_path": relative}})
            return {"role": role, "relative_path": relative, "file_name": target.name}

    def project_dashboard(self, project_id: str) -> dict:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            manifest = self._read_project_manifest_unlocked(root)
            tree = self._asset_tree_with_counts_unlocked(root)
            library = self._read_json(
                self._project_paths(root)["library_manifest"], {"assets": []}
            )
            categories = []
            completed_total = 0
            target_total = 0
            for key, label in ASSET_CATEGORIES:
                category_id = f"category-{key}"
                descendants = [
                    node for node in tree["nodes"]
                    if node.get("id") == category_id or node.get("category") == key
                ]
                completed = sum(int(node.get("selected_count") or node.get("completed_count") or 0) for node in descendants if node.get("type") == "asset")
                target = sum(int(node.get("target_count") or 0) for node in descendants if node.get("type") == "asset")
                if target == 0:
                    completed = sum(1 for asset in library.get("assets", []) if asset.get("category") == key)
                    target = max(completed, 0)
                completed_total += min(completed, target) if target else completed
                target_total += target
                categories.append({"key": key, "label": label, "completed": completed, "target": target})
            progress = round((completed_total / target_total) * 100) if target_total else 0
            return {
                "project": copy.deepcopy(manifest),
                "progress": progress,
                "categories": categories,
                "library_count": len(library.get("assets", [])),
                "style_status": manifest.get("style_status", "unconfirmed"),
            }

    def _read_style_directions_unlocked(self, root: Path) -> dict:
        payload = self._read_json(
            self._project_paths(root)["style_directions"],
            {"schema_version": 1, "directions": []},
        )
        if not isinstance(payload.get("directions"), list):
            raise ProjectError("Invalid style direction manifest")
        return payload

    def list_style_directions(self, project_id: str) -> list[dict]:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            return copy.deepcopy(self._read_style_directions_unlocked(root)["directions"])

    def create_style_direction(
        self,
        project_id: str,
        *,
        name: str,
        description: str = "",
        tags: list | None = None,
        group_id: str = "",
        actor: str = "user",
    ) -> dict:
        name = str(name or "").strip()
        if not 1 <= len(name) <= 60:
            raise ProjectError("Style direction name must contain 1 to 60 characters")
        with self._locked():
            root = self._project_root_unlocked(project_id)
            payload = self._read_style_directions_unlocked(root)
            now = utc_now()
            direction = {
                "id": f"style_{uuid.uuid4().hex}",
                "project_id": project_id,
                "name": name,
                "description": str(description or "").strip()[:1000],
                "tags": self._normalized_tags(tags),
                "status": "normal",
                "cover_image_id": "",
                "reference_images": [],
                "group_id": str(group_id or "").strip()[:80],
                "created_at": now,
                "updated_at": now,
            }
            payload["directions"].insert(0, direction)
            self._atomic_write_json(self._project_paths(root)["style_directions"], payload)
            self._append_event_unlocked(root, {"type": "style.created", "actor": actor, "project_id": project_id, "data": {"style_direction_id": direction["id"], "name": name}})
            return copy.deepcopy(direction)

    def update_style_direction(self, project_id: str, direction_id: str, *, changes: dict, actor: str = "user") -> dict:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            payload = self._read_style_directions_unlocked(root)
            direction = next((item for item in payload["directions"] if item.get("id") == direction_id), None)
            if direction is None:
                raise ProjectError(f"Style direction does not exist: {direction_id}")
            for key in ("name", "description", "group_id", "cover_image_id"):
                if key in changes:
                    value = str(changes.get(key) or "").strip()
                    if key == "name" and not 1 <= len(value) <= 60:
                        raise ProjectError("Style direction name must contain 1 to 60 characters")
                    direction[key] = value[:1000 if key == "description" else 80]
            if "tags" in changes:
                direction["tags"] = self._normalized_tags(changes.get("tags"))
            if "reference_images" in changes:
                references = changes.get("reference_images")
                if not isinstance(references, list):
                    raise ProjectError("Style reference images must be an array")
                direction["reference_images"] = [
                    {
                        "relative_path": str(item.get("relative_path") or "")[:500],
                        "file_name": str(item.get("file_name") or "")[:160],
                    }
                    for item in references[:20]
                    if isinstance(item, dict) and str(item.get("relative_path") or "")
                ]
            if "status" in changes:
                status = str(changes.get("status") or "normal")
                if status not in {"normal", "selected", "confirmed", "archived"}:
                    raise ProjectError("Invalid style direction status")
                direction["status"] = status
                if status == "confirmed":
                    for item in payload["directions"]:
                        if item.get("id") != direction_id and item.get("status") == "confirmed":
                            item["status"] = "archived"
                            item["updated_at"] = utc_now()
                    manifest = self._read_project_manifest_unlocked(root)
                    manifest["style_status"] = "confirmed"
                    manifest["current_style_direction_id"] = direction_id
                    manifest["updated_at"] = utc_now()
                    self._atomic_write_json(self._project_paths(root)["manifest"], manifest)
            direction["updated_at"] = utc_now()
            self._atomic_write_json(self._project_paths(root)["style_directions"], payload)
            self._append_event_unlocked(root, {"type": "style.updated", "actor": actor, "project_id": project_id, "data": {"style_direction_id": direction_id, "status": direction.get("status")}})
            return copy.deepcopy(direction)

    def _read_trash_unlocked(self, root: Path) -> dict:
        payload = self._read_json(self._project_paths(root)["trash_manifest"], {"schema_version": 1, "items": []})
        if not isinstance(payload.get("items"), list):
            raise ProjectError("Invalid trash manifest")
        return payload

    def _add_trash_item_unlocked(self, root: Path, *, object_type: str, object_id: str, name: str, source_module: str, payload: dict, file_path: Path | None = None) -> dict:
        paths = self._project_paths(root)
        trash = self._read_trash_unlocked(root)
        trash_id = f"trash_{uuid.uuid4().hex}"
        item = {
            "id": trash_id,
            "object_type": object_type,
            "object_id": object_id,
            "name": str(name or object_id),
            "source_module": source_module,
            "payload": copy.deepcopy(payload),
            "original_relative_path": "",
            "trash_relative_path": "",
            "trashed_at": utc_now(),
        }
        if file_path and file_path.is_file():
            resolved = file_path.resolve()
            if not resolved.is_relative_to(root.resolve()):
                raise ProjectError("Trash file must be inside the project")
            target_dir = paths["trash"] / trash_id
            target_dir.mkdir(parents=True, exist_ok=False)
            target = target_dir / resolved.name
            item["original_relative_path"] = resolved.relative_to(root).as_posix()
            item["trash_relative_path"] = target.relative_to(root).as_posix()
            os.replace(resolved, target)
        trash["items"].insert(0, item)
        self._atomic_write_json(paths["trash_manifest"], trash)
        return item

    def trash_style_direction(self, project_id: str, direction_id: str, *, actor: str = "user") -> dict:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            styles = self._read_style_directions_unlocked(root)
            direction = next((item for item in styles["directions"] if item.get("id") == direction_id), None)
            if direction is None:
                raise ProjectError(f"Style direction does not exist: {direction_id}")
            styles["directions"] = [item for item in styles["directions"] if item.get("id") != direction_id]
            self._atomic_write_json(self._project_paths(root)["style_directions"], styles)
            manifest = self._read_project_manifest_unlocked(root)
            if manifest.get("current_style_direction_id") == direction_id:
                manifest["style_status"] = "unconfirmed"
                manifest["current_style_direction_id"] = ""
                manifest["updated_at"] = utc_now()
                self._atomic_write_json(self._project_paths(root)["manifest"], manifest)
            item = self._add_trash_item_unlocked(root, object_type="style_direction", object_id=direction_id, name=direction.get("name", ""), source_module="style", payload=direction)
            self._append_event_unlocked(root, {"type": "style.trashed", "actor": actor, "project_id": project_id, "data": {"trash_id": item["id"], "style_direction_id": direction_id}})
            return copy.deepcopy(item)

    def load_canvas(self, project_id: str, canvas_type: str) -> dict:
        canvas_type = re.sub(r"[^a-z0-9-]", "", str(canvas_type or "").lower())[:40]
        if not canvas_type:
            raise ProjectError("Canvas type is required")
        with self._locked():
            root = self._project_root_unlocked(project_id)
            return self._read_json(self._project_paths(root)["canvases"] / f"{canvas_type}.json", {"schema_version": 1, "project_id": project_id, "canvas_type": canvas_type, "viewport": {"x": 0, "y": 0, "zoom": 1}, "nodes": [], "updated_at": ""})

    def save_canvas(self, project_id: str, canvas_type: str, *, canvas: dict, actor: str = "user") -> dict:
        if not isinstance(canvas, dict) or not isinstance(canvas.get("nodes", []), list):
            raise ProjectError("Canvas payload must contain a nodes array")
        canvas_type = re.sub(r"[^a-z0-9-]", "", str(canvas_type or "").lower())[:40]
        if not canvas_type:
            raise ProjectError("Canvas type is required")
        nodes = []
        for raw in canvas.get("nodes", [])[:1000]:
            if not isinstance(raw, dict):
                continue
            nodes.append({
                "id": str(raw.get("id") or f"node_{uuid.uuid4().hex}"),
                "ref_type": str(raw.get("ref_type") or "note"),
                "ref_id": str(raw.get("ref_id") or ""),
                "title": str(raw.get("title") or "")[:120],
                "note": str(raw.get("note") or "")[:1000],
                "x": float(raw.get("x") or 0), "y": float(raw.get("y") or 0),
                "width": max(80, min(float(raw.get("width") or 220), 2000)),
                "height": max(60, min(float(raw.get("height") or 160), 2000)),
                "locked": bool(raw.get("locked")), "z_index": int(raw.get("z_index") or 0),
                "group_id": str(raw.get("group_id") or ""),
            })
        viewport = canvas.get("viewport") if isinstance(canvas.get("viewport"), dict) else {}
        payload = {"schema_version": 1, "project_id": project_id, "canvas_type": canvas_type, "viewport": {"x": float(viewport.get("x") or 0), "y": float(viewport.get("y") or 0), "zoom": max(0.1, min(float(viewport.get("zoom") or 1), 4))}, "nodes": nodes, "updated_at": utc_now()}
        with self._locked():
            root = self._project_root_unlocked(project_id)
            self._atomic_write_json(self._project_paths(root)["canvases"] / f"{canvas_type}.json", payload)
            self._append_event_unlocked(root, {"type": "canvas.saved", "actor": actor, "project_id": project_id, "data": {"canvas_type": canvas_type, "node_count": len(nodes)}})
            return copy.deepcopy(payload)

    def list_generation_results(self, project_id: str) -> list[dict]:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            history = self._read_json(self._project_paths(root)["generation_history"], {"records": []})
            records = copy.deepcopy(history.get("records", []))
            for record in records:
                record.setdefault("lifecycle_status", "normal")
                record.setdefault("background", "transparent")
                record.setdefault("file_format", Path(str(record.get("local_path") or "result.png")).suffix.lower().lstrip(".") or "png")
            return records

    def update_generation_lifecycle(self, project_id: str, *, record_ids: list[str], lifecycle_status: str, actor: str = "user") -> list[dict]:
        if lifecycle_status not in {"normal", "selected", "confirmed", "archived", "in_library", "trashed"}:
            raise ProjectError("Invalid generation result lifecycle status")
        ids = {str(item or "") for item in (record_ids or []) if str(item or "")}
        with self._locked():
            root = self._project_root_unlocked(project_id)
            paths = self._project_paths(root)
            history = self._read_json(paths["generation_history"], {"schema_version": 1, "records": []})
            changed = []
            for record in history.get("records", []):
                if record.get("id") not in ids:
                    continue
                previous = record.get("lifecycle_status", "normal")
                record["lifecycle_status"] = lifecycle_status
                record["updated_at"] = utc_now()
                changed.append(copy.deepcopy(record))
                if lifecycle_status == "trashed" and previous != "trashed":
                    self._add_trash_item_unlocked(root, object_type="generation_result", object_id=record["id"], name=record.get("prompt") or record["id"], source_module="production", payload={"record": copy.deepcopy(record), "previous_lifecycle_status": previous})
            if len(changed) != len(ids):
                raise ProjectError("One or more generation records do not exist")
            self._atomic_write_json(paths["generation_history"], history)
            self._append_event_unlocked(root, {"type": "generation.lifecycle-updated", "actor": actor, "project_id": project_id, "data": {"record_ids": sorted(ids), "lifecycle_status": lifecycle_status}})
            return changed

    def _read_library_unlocked(self, root: Path) -> dict:
        payload = self._read_json(self._project_paths(root)["library_manifest"], {"schema_version": 1, "assets": []})
        if not isinstance(payload.get("assets"), list):
            raise ProjectError("Invalid library manifest")
        return payload

    def list_library_assets(self, project_id: str) -> list[dict]:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            return copy.deepcopy(self._read_library_unlocked(root)["assets"])

    def ingest_library_assets(self, project_id: str, *, record_ids: list[str], actor: str = "user") -> list[dict]:
        ids = list(dict.fromkeys(str(item or "") for item in (record_ids or []) if str(item or "")))
        if not ids:
            raise ProjectError("At least one generation record is required")
        with self._locked():
            root = self._project_root_unlocked(project_id)
            paths = self._project_paths(root)
            history = self._read_json(paths["generation_history"], {"records": []})
            records = {str(item.get("id") or ""): item for item in history.get("records", []) if isinstance(item, dict)}
            library = self._read_library_unlocked(root)
            existing = {str(item.get("source_record_id") or ""): item for item in library["assets"]}
            added = []
            for record_id in ids:
                record = records.get(record_id)
                if record is None or record.get("status") != "succeeded":
                    raise ProjectError(f"Generation record is not available: {record_id}")
                if record_id in existing:
                    added.append(copy.deepcopy(existing[record_id]))
                    continue
                source = Path(str(record.get("local_path") or "")).resolve()
                if not source.is_file() or not source.is_relative_to(paths["production_images"].resolve()):
                    raise ProjectError(f"Generation result file is unavailable: {record_id}")
                asset_id = f"lib_{uuid.uuid4().hex}"
                suffix = source.suffix.lower() or ".png"
                target = paths["library_assets"] / f"{asset_id}{suffix}"
                shutil.copy2(source, target)
                node_id = str(record.get("asset_node_id") or "category-other")
                tree = self._read_asset_tree_unlocked(root)
                source_node = next((item for item in tree["nodes"] if item.get("id") == node_id), None)
                category = str((source_node or {}).get("category") or "other")
                now = utc_now()
                asset = {"id": asset_id, "project_id": project_id, "name": str(record.get("asset_name") or record.get("prompt") or source.stem)[:120], "category": category, "status": "in_library", "tags": [], "background": str(record.get("background") or (record.get("params") or {}).get("background") or "transparent"), "source_record_id": record_id, "source_asset_node_id": node_id, "relative_path": target.relative_to(root).as_posix(), "file_name": target.name, "file_format": suffix.lstrip("."), "width": int(record.get("width") or 0), "height": int(record.get("height") or 0), "bytes": target.stat().st_size, "sha256": self._file_sha256(target), "created_at": now, "updated_at": now}
                library["assets"].insert(0, asset)
                record["lifecycle_status"] = "in_library"
                record["updated_at"] = now
                added.append(copy.deepcopy(asset))
            self._atomic_write_json(paths["library_manifest"], library)
            self._atomic_write_json(paths["generation_history"], history)
            self._append_event_unlocked(root, {"type": "library.assets-ingested", "actor": actor, "project_id": project_id, "data": {"asset_ids": [item["id"] for item in added], "record_ids": ids}})
            return added

    def update_library_asset(self, project_id: str, asset_id: str, *, changes: dict, actor: str = "user") -> dict:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            library = self._read_library_unlocked(root)
            asset = next((item for item in library["assets"] if item.get("id") == asset_id), None)
            if asset is None:
                raise ProjectError(f"Library asset does not exist: {asset_id}")
            if "name" in changes:
                asset["name"] = str(changes.get("name") or "").strip()[:120] or asset["name"]
            if "category" in changes:
                category = str(changes.get("category") or "other")
                if category not in {key for key, _label in ASSET_CATEGORIES}:
                    raise ProjectError("Invalid asset category")
                asset["category"] = category
            if "tags" in changes:
                asset["tags"] = self._normalized_tags(changes.get("tags"))
            if "status" in changes and str(changes.get("status")) in {"normal", "selected", "confirmed", "in_library", "archived"}:
                asset["status"] = str(changes.get("status"))
            asset["updated_at"] = utc_now()
            self._atomic_write_json(self._project_paths(root)["library_manifest"], library)
            self._append_event_unlocked(root, {"type": "library.asset-updated", "actor": actor, "project_id": project_id, "data": {"asset_id": asset_id}})
            return copy.deepcopy(asset)

    def trash_library_asset(self, project_id: str, asset_id: str, *, actor: str = "user") -> dict:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            paths = self._project_paths(root)
            library = self._read_library_unlocked(root)
            asset = next((item for item in library["assets"] if item.get("id") == asset_id), None)
            if asset is None:
                raise ProjectError(f"Library asset does not exist: {asset_id}")
            source = (root / str(asset.get("relative_path") or "")).resolve()
            library["assets"] = [item for item in library["assets"] if item.get("id") != asset_id]
            item = self._add_trash_item_unlocked(root, object_type="library_asset", object_id=asset_id, name=asset.get("name", ""), source_module="library", payload=asset, file_path=source if source.is_file() else None)
            self._atomic_write_json(paths["library_manifest"], library)
            self._append_event_unlocked(root, {"type": "library.asset-trashed", "actor": actor, "project_id": project_id, "data": {"asset_id": asset_id, "trash_id": item["id"]}})
            return copy.deepcopy(item)

    def list_trash(self, project_id: str) -> list[dict]:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            return copy.deepcopy(self._read_trash_unlocked(root)["items"])

    def restore_trash_items(self, project_id: str, item_ids: list[str], *, actor: str = "user") -> list[dict]:
        ids = {str(item or "") for item in item_ids or [] if str(item or "")}
        with self._locked():
            root = self._project_root_unlocked(project_id)
            paths = self._project_paths(root)
            trash = self._read_trash_unlocked(root)
            restored = []
            for item in list(trash["items"]):
                if item.get("id") not in ids:
                    continue
                payload = copy.deepcopy(item.get("payload") or {})
                object_type = item.get("object_type")
                if object_type == "style_direction":
                    styles = self._read_style_directions_unlocked(root)
                    if not any(entry.get("id") == payload.get("id") for entry in styles["directions"]):
                        styles["directions"].insert(0, payload)
                        self._atomic_write_json(paths["style_directions"], styles)
                elif object_type == "generation_result":
                    history = self._read_json(paths["generation_history"], {"records": []})
                    record = next((entry for entry in history.get("records", []) if entry.get("id") == item.get("object_id")), None)
                    if record:
                        record["lifecycle_status"] = payload.get("previous_lifecycle_status", "normal")
                        record["updated_at"] = utc_now()
                        self._atomic_write_json(paths["generation_history"], history)
                elif object_type == "library_asset":
                    library = self._read_library_unlocked(root)
                    if not any(entry.get("id") == payload.get("id") for entry in library["assets"]):
                        trash_path = root / str(item.get("trash_relative_path") or "")
                        original_path = root / str(item.get("original_relative_path") or payload.get("relative_path") or "")
                        if trash_path.is_file():
                            original_path.parent.mkdir(parents=True, exist_ok=True)
                            if original_path.exists():
                                raise ProjectError(f"Cannot restore occupied file: {original_path}")
                            os.replace(trash_path, original_path)
                        library["assets"].insert(0, payload)
                        self._atomic_write_json(paths["library_manifest"], library)
                elif object_type == "asset_node":
                    tree = self._read_asset_tree_unlocked(root)
                    parent_id = str(payload.get("parent_id") or "")
                    if parent_id and not any(entry.get("id") == parent_id for entry in tree["nodes"]):
                        raise ProjectError("Cannot restore asset node because its parent is unavailable")
                    if not any(entry.get("id") == payload.get("id") for entry in tree["nodes"]):
                        tree["nodes"].append(payload)
                        self._atomic_write_json(paths["asset_tree"], tree)
                restored.append(copy.deepcopy(item))
            if len(restored) != len(ids):
                raise ProjectError("One or more trash items do not exist")
            trash["items"] = [item for item in trash["items"] if item.get("id") not in ids]
            self._atomic_write_json(paths["trash_manifest"], trash)
            for item in restored:
                trash_dir = paths["trash"] / item["id"]
                if trash_dir.is_dir() and not any(trash_dir.iterdir()):
                    trash_dir.rmdir()
            self._append_event_unlocked(root, {"type": "trash.restored", "actor": actor, "project_id": project_id, "data": {"trash_ids": sorted(ids)}})
            return restored

    def purge_trash_items(self, project_id: str, item_ids: list[str] | None = None, *, actor: str = "user") -> dict:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            paths = self._project_paths(root)
            trash = self._read_trash_unlocked(root)
            ids = {str(item or "") for item in (item_ids or []) if str(item or "")}
            if not ids:
                ids = {str(item.get("id") or "") for item in trash["items"]}
            matched = [item for item in trash["items"] if item.get("id") in ids]
            if len(matched) != len(ids):
                raise ProjectError("One or more trash items do not exist")
            for item in matched:
                if item.get("object_type") == "generation_result":
                    history = self._read_json(paths["generation_history"], {"records": []})
                    record = next(
                        (entry for entry in history.get("records", []) if entry.get("id") == item.get("object_id")),
                        None,
                    )
                    if record:
                        local_path = Path(str(record.get("local_path") or "")).resolve()
                        if local_path.is_file() and local_path.is_relative_to(paths["production_images"].resolve()):
                            local_path.unlink()
                        history["records"] = [
                            entry for entry in history.get("records", [])
                            if entry.get("id") != item.get("object_id")
                        ]
                        self._atomic_write_json(paths["generation_history"], history)
                relative = str(item.get("trash_relative_path") or "")
                if relative:
                    target = (root / relative).resolve()
                    if target.is_file() and target.is_relative_to(paths["trash"].resolve()):
                        target.unlink()
                item_dir = paths["trash"] / str(item.get("id") or "")
                if item_dir.is_dir():
                    shutil.rmtree(item_dir)
            trash["items"] = [item for item in trash["items"] if item.get("id") not in ids]
            self._atomic_write_json(paths["trash_manifest"], trash)
            self._append_event_unlocked(root, {"type": "trash.purged", "actor": actor, "project_id": project_id, "data": {"trash_ids": sorted(ids)}})
            return {"purged_ids": sorted(ids)}

    def _read_integration_unlocked(self, root: Path, project_id: str) -> dict:
        return self._read_json(self._project_paths(root)["integration_manifest"], {"schema_version": 1, "project_id": project_id, "target_root": "", "mappings": {}, "deployments": []})

    def get_integration(self, project_id: str) -> dict:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            return self._read_integration_unlocked(root, project_id)

    def update_integration(self, project_id: str, *, target_root: str | None = None, mappings: dict | None = None, actor: str = "user") -> dict:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            paths = self._project_paths(root)
            integration = self._read_integration_unlocked(root, project_id)
            if target_root is not None:
                text = str(target_root or "").strip()
                integration["target_root"] = str(Path(text).expanduser().resolve()) if text else ""
            if mappings is not None:
                if not isinstance(mappings, dict):
                    raise ProjectError("Integration mappings must be an object")
                integration["mappings"] = {key: str(mappings.get(key) or key).replace("\\", "/").strip("/") for key, _label in ASSET_CATEGORIES}
            integration["updated_at"] = utc_now()
            self._atomic_write_json(paths["integration_manifest"], integration)
            self._append_event_unlocked(root, {"type": "integration.updated", "actor": actor, "project_id": project_id, "data": {"target_root": integration.get("target_root")}})
            return copy.deepcopy(integration)

    def integration_preflight(self, project_id: str, asset_ids: list[str] | None = None) -> dict:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            integration = self._read_integration_unlocked(root, project_id)
            target_text = str(integration.get("target_root") or "")
            if not target_text:
                return {"ready": False, "errors": ["Target project directory is not configured"], "files": [], "conflicts": []}
            target_root = Path(target_text)
            library = self._read_library_unlocked(root)
            ids = {str(item or "") for item in (asset_ids or []) if str(item or "")}
            assets = [item for item in library["assets"] if not ids or item.get("id") in ids]
            errors, files, conflicts = [], [], []
            for asset in assets:
                source = (root / str(asset.get("relative_path") or "")).resolve()
                if not source.is_file():
                    errors.append(f"Missing source file: {asset.get('name')}")
                    continue
                category_dir = str((integration.get("mappings") or {}).get(asset.get("category")) or asset.get("category") or "other")
                target = target_root / category_dir / str(asset.get("file_name") or source.name)
                entry = {"asset_id": asset.get("id"), "source": str(source), "target": str(target), "sha256": asset.get("sha256") or self._file_sha256(source)}
                files.append(entry)
                if target.is_file() and self._file_sha256(target) != entry["sha256"]:
                    conflicts.append(entry)
            return {"ready": not errors, "errors": errors, "files": files, "conflicts": conflicts, "target_root": str(target_root)}

    def deploy_library_assets(self, project_id: str, asset_ids: list[str] | None = None, *, actor: str = "user", idempotency_key: str = "") -> dict:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            paths = self._project_paths(root)
            integration = self._read_integration_unlocked(root, project_id)
            for deployment in integration.get("deployments", []):
                if idempotency_key and deployment.get("idempotency_key") == idempotency_key:
                    return copy.deepcopy(deployment)
            target_text = str(integration.get("target_root") or "")
            if not target_text:
                raise ProjectError("Target project directory is not configured")
            library = self._read_library_unlocked(root)
            selected_ids = {str(item or "") for item in (asset_ids or []) if str(item or "")}
            assets = [item for item in library["assets"] if not selected_ids or item.get("id") in selected_ids]
            files, errors, conflicts = [], [], []
            target_root = Path(target_text)
            for asset in assets:
                source = (root / str(asset.get("relative_path") or "")).resolve()
                if not source.is_file():
                    errors.append(f"Missing source file: {asset.get('name')}")
                    continue
                category_dir = str((integration.get("mappings") or {}).get(asset.get("category")) or asset.get("category") or "other")
                target = target_root / category_dir / str(asset.get("file_name") or source.name)
                entry = {"asset_id": asset.get("id"), "source": str(source), "target": str(target), "sha256": asset.get("sha256") or self._file_sha256(source)}
                files.append(entry)
                if target.is_file() and self._file_sha256(target) != entry["sha256"]:
                    conflicts.append(entry)
            preflight = {"ready": not errors, "errors": errors, "files": files, "conflicts": conflicts, "target_root": str(target_root)}
            if not preflight["ready"]:
                raise ProjectError(preflight["errors"][0])
            deployment_id = f"deploy_{uuid.uuid4().hex}"
            backup_root = paths["deployments"] / deployment_id / "backups"
            deployed = []
            for file_entry in preflight["files"]:
                source = Path(file_entry["source"])
                target = Path(file_entry["target"])
                target.parent.mkdir(parents=True, exist_ok=True)
                backup = ""
                if target.is_file() and self._file_sha256(target) != file_entry["sha256"]:
                    backup_root.mkdir(parents=True, exist_ok=True)
                    backup_path = backup_root / f"{file_entry['asset_id']}-{target.name}"
                    shutil.copy2(target, backup_path)
                    backup = str(backup_path)
                shutil.copy2(source, target)
                actual_hash = self._file_sha256(target)
                if actual_hash != file_entry["sha256"]:
                    raise ProjectError(f"Deployment verification failed: {target}")
                deployed.append({**file_entry, "backup": backup, "verified_sha256": actual_hash})
            now = utc_now()
            deployment = {"id": deployment_id, "project_id": project_id, "status": "succeeded", "actor": actor, "idempotency_key": str(idempotency_key or "")[:160], "target_root": preflight["target_root"], "files": deployed, "created_at": now, "updated_at": now}
            integration.setdefault("deployments", []).insert(0, deployment)
            self._atomic_write_json(paths["integration_manifest"], integration)
            self._atomic_write_json(paths["deployments"] / f"{deployment_id}.json", deployment)
            self._append_event_unlocked(root, {"type": "integration.deployed", "actor": actor, "project_id": project_id, "data": {"deployment_id": deployment_id, "asset_ids": [item["asset_id"] for item in deployed]}})
            return copy.deepcopy(deployment)

    @staticmethod
    def _file_sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    def create_processing_intake(
        self,
        project_id: str,
        *,
        record_ids: list[str],
        actor: str = "user",
        idempotency_key: str = "",
    ) -> dict:
        if not isinstance(record_ids, list):
            raise ProjectError("Processing intake record ids must be an array")
        normalized_ids = list(
            dict.fromkeys(str(record_id or "").strip() for record_id in record_ids)
        )
        normalized_ids = [record_id for record_id in normalized_ids if record_id]
        if not normalized_ids or len(normalized_ids) > 100:
            raise ProjectError("Processing intake requires 1 to 100 generation records")
        idempotency_key = str(idempotency_key or "").strip()[:160]
        with self._locked():
            root = self._project_root_unlocked(project_id)
            paths = self._project_paths(root)
            if idempotency_key:
                for manifest_path in paths["processing_intakes"].glob("intake_*.json"):
                    existing = self._read_json(manifest_path, {})
                    if existing.get("idempotency_key") == idempotency_key:
                        return existing
            history = self._read_json(
                paths["generation_history"],
                {"schema_version": 1, "records": []},
            )
            records_by_id = {
                str(record.get("id") or ""): record
                for record in history.get("records", [])
                if isinstance(record, dict)
            }
            missing = [record_id for record_id in normalized_ids if record_id not in records_by_id]
            if missing:
                raise ProjectError(f"Generation record does not exist: {missing[0]}")
            intake_id = f"intake_{uuid.uuid4().hex}"
            final_dir = paths["processing_image_intakes"] / intake_id
            final_dir.parent.mkdir(parents=True, exist_ok=True)
            staging_dir = Path(
                tempfile.mkdtemp(prefix=f".{intake_id}.", dir=final_dir.parent)
            )
            sources = []
            try:
                for index, record_id in enumerate(normalized_ids, start=1):
                    record = records_by_id[record_id]
                    if record.get("status") != "succeeded":
                        raise ProjectError(f"Generation record is not complete: {record_id}")
                    source_text = str(record.get("local_path") or "").strip()
                    source_path = Path(source_text).resolve() if source_text else None
                    if source_path is None or not source_path.is_file():
                        raise ProjectError(f"Generation result file is unavailable: {record_id}")
                    production_root = paths["production_images"].resolve()
                    if not source_path.is_relative_to(production_root):
                        raise ProjectError("Generation result is outside the project production folder")
                    suffix = source_path.suffix.lower() or ".png"
                    target_name = f"{index:03d}_{record_id[:12]}{suffix}"
                    target_path = staging_dir / target_name
                    shutil.copy2(source_path, target_path)
                    sources.append(
                        {
                            "generation_record_id": record_id,
                            "asset_node_id": str(record.get("asset_node_id") or "category-other"),
                            "source_relative_path": source_path.relative_to(root).as_posix(),
                            "working_relative_path": (
                                final_dir.relative_to(root) / target_name
                            ).as_posix(),
                            "file_name": target_name,
                            "media_type": "image",
                            "bytes": target_path.stat().st_size,
                            "sha256": self._file_sha256(target_path),
                        }
                    )
                os.replace(staging_dir, final_dir)
            except Exception:
                shutil.rmtree(staging_dir, ignore_errors=True)
                raise
            now = utc_now()
            intake = {
                "schema_version": 1,
                "id": intake_id,
                "project_id": project_id,
                "media_type": "image",
                "status": "ready",
                "actor": str(actor or "user"),
                "idempotency_key": idempotency_key,
                "sources": sources,
                "created_at": now,
                "updated_at": now,
            }
            self._atomic_write_json(
                paths["processing_intakes"] / f"{intake_id}.json", intake
            )
            self._append_event_unlocked(
                root,
                {
                    "type": "processing.intake-created",
                    "actor": intake["actor"],
                    "project_id": project_id,
                    "data": {
                        "intake_id": intake_id,
                        "media_type": "image",
                        "source_count": len(sources),
                        "asset_node_ids": sorted(
                            {source["asset_node_id"] for source in sources}
                        ),
                    },
                },
            )
            return copy.deepcopy(intake)

    def resolve_project_file(self, project_id: str, relative_path: str) -> Path:
        root = self.project_root(project_id).resolve()
        relative = Path(str(relative_path or "").replace("\\", "/"))
        if relative.is_absolute() or ".." in relative.parts:
            raise ProjectError("Project file path must be relative")
        target = (root / relative).resolve()
        if target == root or not target.is_relative_to(root):
            raise ProjectError("Project file path escapes project root")
        current = target
        while current != root:
            if current.exists() and (current.is_symlink() or self._is_junction(current)):
                raise ProjectError("Project file path crosses a link")
            current = current.parent
        return target

    def _append_event_unlocked(self, root: Path, event: dict) -> dict:
        paths = self._project_paths(root)
        paths["events"].parent.mkdir(parents=True, exist_ok=True)
        payload = copy.deepcopy(event)
        payload.setdefault("id", f"evt_{uuid.uuid4().hex}")
        payload.setdefault("created_at", utc_now())
        with paths["events"].open("a", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        return payload

    def append_event(self, project_id: str, event_type: str, *, actor: str, data: dict | None = None) -> dict:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            return self._append_event_unlocked(
                root,
                {
                    "type": str(event_type or "project.event"),
                    "actor": str(actor or "system"),
                    "project_id": project_id,
                    "data": copy.deepcopy(data or {}),
                },
            )

    def list_events(self, project_id: str, limit: int = 100) -> list[dict]:
        paths = self.project_paths(project_id)
        try:
            lines = paths["events"].read_text(encoding="utf-8").splitlines()
        except FileNotFoundError:
            return []
        events = []
        for line in lines[-max(1, min(int(limit or 100), 1000)) :]:
            try:
                payload = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(payload, dict):
                events.append(payload)
        return events

    def create_workflow_run(
        self,
        project_id: str,
        *,
        actor: str,
        request_text: str,
        steps: list[dict] | None = None,
        idempotency_key: str = "",
    ) -> dict:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            paths = self._project_paths(root)
            if idempotency_key:
                for workflow_path in paths["workflows"].glob("run_*.json"):
                    payload = self._read_json(workflow_path, {})
                    if payload.get("idempotency_key") == idempotency_key:
                        return payload
            run_id = f"run_{uuid.uuid4().hex}"
            now = utc_now()
            workflow = {
                "schema_version": WORKFLOW_SCHEMA_VERSION,
                "id": run_id,
                "project_id": project_id,
                "actor": str(actor or "system"),
                "request": str(request_text or "").strip(),
                "status": "planned",
                "idempotency_key": str(idempotency_key or ""),
                "steps": copy.deepcopy(steps or []),
                "created_at": now,
                "updated_at": now,
            }
            self._atomic_write_json(paths["workflows"] / f"{run_id}.json", workflow)
            self._append_event_unlocked(
                root,
                {
                    "type": "workflow.created",
                    "actor": workflow["actor"],
                    "project_id": project_id,
                    "data": {"workflow_run_id": run_id, "request": workflow["request"]},
                },
            )
            return workflow

    def list_workflow_runs(self, project_id: str, limit: int = 100) -> list[dict]:
        with self._locked():
            root = self._project_root_unlocked(project_id)
            paths = self._project_paths(root)
            runs = [self._read_json(path, {}) for path in paths["workflows"].glob("run_*.json")]
            runs = [run for run in runs if run.get("id")]
            runs.sort(key=lambda run: str(run.get("created_at") or ""), reverse=True)
            return copy.deepcopy(runs[: max(1, min(int(limit or 100), 1000))])

    def get_workflow_run(self, project_id: str, run_id: str) -> dict:
        run_id = str(run_id or "").strip()
        if not re.fullmatch(r"run_[a-f0-9]{32}", run_id):
            raise ProjectError("Invalid workflow run ID")
        with self._locked():
            root = self._project_root_unlocked(project_id)
            run = self._read_json(self._project_paths(root)["workflows"] / f"{run_id}.json", {})
            if not run.get("id"):
                raise ProjectError(f"Workflow run does not exist: {run_id}")
            return copy.deepcopy(run)

    def update_workflow_run(
        self,
        project_id: str,
        run_id: str,
        *,
        changes: dict,
        actor: str = "system",
    ) -> dict:
        allowed = {"status", "steps", "outputs", "error", "retry_count"}
        run_id = str(run_id or "").strip()
        if not re.fullmatch(r"run_[a-f0-9]{32}", run_id):
            raise ProjectError("Invalid workflow run ID")
        with self._locked():
            root = self._project_root_unlocked(project_id)
            path = self._project_paths(root)["workflows"] / f"{run_id}.json"
            workflow = self._read_json(path, {})
            if not workflow.get("id"):
                raise ProjectError(f"Workflow run does not exist: {run_id}")
            for key, value in (changes or {}).items():
                if key not in allowed:
                    continue
                if key == "status":
                    value = str(value or "")
                    if value not in WORKFLOW_STATUSES:
                        raise ProjectError("Invalid workflow run status")
                    workflow["status"] = value
                    if value == "running" and not workflow.get("started_at"):
                        workflow["started_at"] = utc_now()
                    if value in {"succeeded", "failed", "canceled"}:
                        workflow["finished_at"] = utc_now()
                elif key == "steps":
                    if not isinstance(value, list):
                        raise ProjectError("Workflow steps must be an array")
                    workflow["steps"] = copy.deepcopy(value[:500])
                elif key == "outputs":
                    if not isinstance(value, dict):
                        raise ProjectError("Workflow outputs must be an object")
                    workflow["outputs"] = copy.deepcopy(value)
                elif key == "retry_count":
                    workflow["retry_count"] = max(0, int(value or 0))
                else:
                    workflow[key] = str(value or "")[:4000]
            workflow["updated_at"] = utc_now()
            self._atomic_write_json(path, workflow)
            self._append_event_unlocked(
                root,
                {
                    "type": "workflow.updated",
                    "actor": str(actor or "system"),
                    "project_id": project_id,
                    "data": {"workflow_run_id": run_id, "status": workflow.get("status")},
                },
            )
            return copy.deepcopy(workflow)
