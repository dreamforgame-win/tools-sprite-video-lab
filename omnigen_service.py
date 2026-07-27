import base64
import binascii
import copy
import hashlib
import http.client
import ipaddress
import io
import json
import math
import mimetypes
import os
import socket
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError


OMNIGEN_ENDPOINT = "https://omnigen.dianchu.cc/api/v1/mcp"
MCP_PROTOCOL_VERSION = "2024-11-05"
DEFAULT_PROFILE_NAME = "游客"
TERMINAL_TASK_STATUSES = {"succeeded", "failed", "canceled"}
MAX_MCP_RESPONSE_BYTES = 8 * 1024 * 1024
MAX_IMAGE_RESPONSE_BYTES = 32 * 1024 * 1024
MAX_AVATAR_BYTES = 5 * 1024 * 1024
AVATAR_SIZE = (256, 256)
AVATAR_MIME_TYPES = {"image/png", "image/jpeg", "image/webp"}
REFERENCE_COMPOSITE_RULE_VERSION = 1
REFERENCE_COMPOSITE_MAX_EDGE = 4096
REFERENCE_COMPOSITE_CELL_EDGE = 1024
REFERENCE_COMPOSITE_MAX_IMAGES = 40
REFERENCE_COMPOSITE_MAX_SOURCE_PIXELS = 64 * 1024 * 1024
REFERENCE_COMPOSITE_GAP = 24
REFERENCE_COMPOSITE_BACKGROUND = (238, 240, 243)
REFERENCE_ROLES = {"style", "content", "identity", "pose", "composition"}
IMAGE_MODEL_CAPABILITY_CACHE_SECONDS = 300.0
IMAGE_MODEL_CAPABILITY_RETRY_SECONDS = 30.0
FILE_TRANSACTION_LOCK_TIMEOUT_SECONDS = 5.0
IMAGE_EXTENSIONS = {
    "PNG": ".png",
    "JPEG": ".jpg",
    "WEBP": ".webp",
    "BMP": ".bmp",
}
IMAGE_BACKGROUND_PROMPT_SUFFIXES = {
    "magenta": (
        "Use a clean, solid magenta background (#FF00FF), evenly filled edge to edge, "
        "with no gradient, texture, scenery, shadows, or extra background elements."
    ),
    "green_screen": (
        "Use a clean, solid chroma key green background (#00FF00), evenly filled edge to edge, "
        "with no gradient, texture, scenery, shadows, or extra background elements."
    ),
    "white": (
        "Use a clean, solid pure white background (#FFFFFF), evenly filled edge to edge, "
        "with no gradient, texture, scenery, shadows, or extra background elements."
    ),
    "black": (
        "Use a clean, solid pure black background (#000000), evenly filled edge to edge, "
        "with no gradient, texture, scenery, shadows, or extra background elements."
    ),
}
DOWNLOAD_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 SpriteVideoLab/1.0"
)


def redact_secret(message: str, secret: str) -> str:
    text = str(message or "")
    return text.replace(secret, "[REDACTED]") if secret else text


def parse_mcp_tool_payload(payload: dict) -> dict:
    result = payload.get("result") or {}
    if isinstance(result.get("structuredContent"), dict):
        return result["structuredContent"]
    for item in result.get("content") or []:
        if not isinstance(item, dict):
            continue
        if item.get("type") == "text" and item.get("text"):
            parsed = json.loads(item["text"])
            if isinstance(parsed, dict):
                return parsed
    error = payload.get("error") or {}
    raise ValueError(
        str(error.get("message") or "OmniGen returned no structured payload")
    )


class OmniGenError(RuntimeError):
    pass


class OmniGenService:
    def __init__(
        self,
        work_dir: Path,
        endpoint: str = OMNIGEN_ENDPOINT,
        *,
        settings_path: Path | None = None,
        profile_dir: Path | None = None,
        omnigen_dir: Path | None = None,
        history_path: Path | None = None,
        results_dir: Path | None = None,
        trash_dir: Path | None = None,
        transaction_lock_path: Path | None = None,
        local_url_prefix: str = "/work/omnigen/results",
    ):
        lexical_work_dir = Path(
            os.path.abspath(os.path.normpath(str(work_dir)))
        )
        self._reject_link_or_junction(
            lexical_work_dir, "OmniGen work directory"
        )
        self.work_dir = lexical_work_dir.resolve()
        self.omnigen_dir = Path(omnigen_dir or (self.work_dir / "omnigen")).resolve()
        self.settings_path = Path(settings_path or (self.work_dir / "settings.json")).resolve()
        self.history_path = Path(history_path or (self.omnigen_dir / "history.json")).resolve()
        self.reference_assets_path = (
            self.omnigen_dir / "reference-assets.json"
        ).resolve()
        self.reference_composites_dir = (
            self.omnigen_dir / "reference-composites"
        ).resolve()
        self.results_dir = Path(results_dir or (self.omnigen_dir / "results")).resolve()
        self.trash_dir = Path(trash_dir or (self.omnigen_dir / ".trash")).resolve()
        self.transaction_lock_path = Path(
            transaction_lock_path or (self.omnigen_dir / ".transactions.lock")
        ).resolve()
        self.profile_dir = Path(profile_dir or (self.work_dir / "profile")).resolve()
        self.local_url_prefix = str(local_url_prefix or "").rstrip("/")
        self.endpoint = endpoint
        self._lock = threading.RLock()
        self._image_models_cache: dict[str, dict] = {}
        self._image_models_cache_refresh_after = 0.0

        self.work_dir.mkdir(parents=True, exist_ok=True)
        for path, label in (
            (self.omnigen_dir, "OmniGen data directory"),
            (self.reference_composites_dir, "reference composite directory"),
            (self.results_dir, "OmniGen results directory"),
            (self.trash_dir, "OmniGen trash directory"),
        ):
            self._reject_link_or_junction(path, label)
            path.mkdir(parents=True, exist_ok=True)
            self._reject_link_or_junction(path, label)
        self.profile_dir.mkdir(parents=True, exist_ok=True)
        self.settings_path.parent.mkdir(parents=True, exist_ok=True)
        self.history_path.parent.mkdir(parents=True, exist_ok=True)
        self.transaction_lock_path.parent.mkdir(parents=True, exist_ok=True)
        self._resolved_work_dir = self.work_dir.resolve()
        self._validate_managed_roots()
        with self._lock:
            with self._file_transaction_lock():
                self._recover_file_transactions_unlocked()

    @staticmethod
    def _is_junction(path: Path) -> bool:
        return bool(
            callable(getattr(path, "is_junction", None))
            and path.is_junction()
        )

    @classmethod
    def _reject_link_or_junction(cls, path: Path, label: str) -> None:
        path = Path(path)
        if path.is_symlink():
            raise ValueError(f"Refusing to access a symlinked {label}")
        if cls._is_junction(path):
            raise ValueError(f"Refusing to access a junction {label}")

    def _validate_managed_roots(self) -> None:
        for path, label in (
            (self.work_dir, "OmniGen work directory"),
            (self.omnigen_dir, "OmniGen data directory"),
            (self.reference_composites_dir, "reference composite directory"),
            (self.results_dir, "OmniGen results directory"),
            (self.trash_dir, "OmniGen trash directory"),
        ):
            self._reject_link_or_junction(path, label)
            resolved = path.resolve()
            if resolved != self._resolved_work_dir and not resolved.is_relative_to(
                self._resolved_work_dir
            ):
                raise ValueError(
                    f"Refusing to access {label} outside the work directory"
                )

    @contextmanager
    def _file_transaction_lock(
        self, timeout: float = FILE_TRANSACTION_LOCK_TIMEOUT_SECONDS
    ):
        self._validate_managed_roots()
        deadline = time.monotonic() + max(0.0, float(timeout))

        def wait_for_retry() -> None:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError(
                    "Timed out waiting for the OmniGen file transaction lock"
                )
            time.sleep(min(0.05, remaining))

        with self.transaction_lock_path.open("a+b") as handle:
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
                        wait_for_retry()
                try:
                    yield
                finally:
                    handle.seek(0)
                    msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl

                while True:
                    try:
                        fcntl.flock(
                            handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB
                        )
                        break
                    except OSError:
                        wait_for_retry()
                try:
                    yield
                finally:
                    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)

    def _read_json(self, path: Path, default):
        try:
            with Path(path).open("r", encoding="utf-8") as handle:
                return json.load(handle)
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            return default

    def _atomic_write_json(self, path: Path, payload) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(
                "w",
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

    def _atomic_write_image(
        self, path: Path, image: Image.Image, *, image_format: str
    ) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(
                "wb",
                dir=path.parent,
                prefix=f".{path.name}.",
                suffix=".tmp",
                delete=False,
            ) as handle:
                temporary_path = Path(handle.name)
                image.save(handle, format=image_format, optimize=True)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary_path, path)
        finally:
            if temporary_path is not None and temporary_path.exists():
                temporary_path.unlink()

    def _read_settings(self) -> dict:
        settings = self._read_json(self.settings_path, {})
        return settings if isinstance(settings, dict) else {}

    def _write_settings(self, settings: dict) -> None:
        self._atomic_write_json(self.settings_path, settings)

    @staticmethod
    def _utc_timestamp() -> str:
        return datetime.now(timezone.utc).isoformat()

    def _read_history_unlocked(self) -> dict:
        try:
            with self.history_path.open("r", encoding="utf-8") as handle:
                history = json.load(handle)
        except FileNotFoundError:
            return {"records": []}
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._backup_corrupt_history_unlocked()
            return {"records": []}
        if (
            not isinstance(history, dict)
            or not isinstance(history.get("records"), list)
            or not all(isinstance(record, dict) for record in history["records"])
        ):
            self._backup_corrupt_history_unlocked()
            return {"records": []}
        return history

    def _backup_corrupt_history_unlocked(self) -> None:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        corrupt_path = self.history_path.with_name(
            f"history.corrupt-{timestamp}.json"
        )
        os.replace(self.history_path, corrupt_path)

    def _validate_lexical_result_file(self, path) -> Path:
        self._validate_managed_roots()
        candidate = Path(os.path.abspath(os.path.normpath(str(path))))
        results_root = Path(os.path.abspath(str(self.results_dir)))
        if candidate == results_root or not candidate.is_relative_to(results_root):
            raise ValueError(
                "Refusing to access a file outside the OmniGen results directory"
            )
        cursor = results_root
        for part in candidate.relative_to(results_root).parts[:-1]:
            cursor = cursor / part
            self._reject_link_or_junction(cursor, "result path")
        self._reject_link_or_junction(candidate, "result path")
        resolved_results_root = results_root.resolve()
        resolved_parent = candidate.parent.resolve()
        if resolved_parent != resolved_results_root and not (
            resolved_parent.is_relative_to(resolved_results_root)
        ):
            raise ValueError(
                "Refusing to access a result path outside the results directory"
            )
        if candidate.exists() and candidate.is_dir():
            raise ValueError("Refusing to replace or delete a result directory")
        return candidate

    def _validate_lexical_trash_path(self, path) -> Path:
        self._validate_managed_roots()
        candidate = Path(os.path.abspath(os.path.normpath(str(path))))
        trash_root = Path(os.path.abspath(str(self.trash_dir)))
        if candidate == trash_root or not candidate.is_relative_to(trash_root):
            raise ValueError(
                "Refusing to access a path outside the OmniGen trash directory"
            )
        cursor = trash_root
        for part in candidate.relative_to(trash_root).parts:
            cursor = cursor / part
            self._reject_link_or_junction(cursor, "trash path")
        resolved_trash_root = trash_root.resolve()
        resolved_parent = candidate.parent.resolve()
        if resolved_parent != resolved_trash_root and not (
            resolved_parent.is_relative_to(resolved_trash_root)
        ):
            raise ValueError(
                "Refusing to access a trash path outside the trash directory"
            )
        return candidate

    @staticmethod
    def _transaction_id_from_dir(transaction_dir: Path) -> str:
        for prefix in (".delete-", ".replace-"):
            if transaction_dir.name.startswith(prefix):
                return transaction_dir.name[len(prefix) :]
        return ""

    def _create_file_transaction_unlocked(
        self,
        operation: str,
        record_ids: list[str],
        original_paths: list[Path],
        intended_final_path: Path | None = None,
    ) -> tuple[Path, dict]:
        transaction_id = str(uuid.uuid4())
        transaction_dir = self.trash_dir / f".{operation}-{transaction_id}"
        transaction_dir.mkdir()
        self._validate_lexical_trash_path(transaction_dir)
        mappings = []
        for index, original_path in enumerate(original_paths):
            mappings.append(
                {
                    "original_path": str(original_path),
                    "staged_path": str(
                        transaction_dir / f"old-{index}-{uuid.uuid4().hex}"
                    ),
                }
            )
        commit_marker = (
            {
                "scope": "history",
                "field": "file_transactions",
                "value": transaction_id,
            }
            if operation == "delete"
            else {
                "scope": "record",
                "record_id": record_ids[0],
                "field": "file_transaction_id",
                "value": transaction_id,
            }
        )
        manifest = {
            "version": 1,
            "operation": operation,
            "transaction_id": transaction_id,
            "record_ids": list(record_ids),
            "mappings": mappings,
            "intended_final_path": str(intended_final_path or ""),
            "commit_marker": commit_marker,
        }
        self._atomic_write_json(transaction_dir / "manifest.json", manifest)
        return transaction_dir, manifest

    def _read_transaction_manifest_unlocked(
        self, transaction_dir: Path
    ) -> dict | None:
        manifest_path = transaction_dir / "manifest.json"
        if manifest_path.is_symlink() or self._is_junction(manifest_path):
            return None
        try:
            with manifest_path.open("r", encoding="utf-8") as handle:
                manifest = json.load(handle)
        except (OSError, UnicodeError, json.JSONDecodeError):
            return None
        if (
            not isinstance(manifest, dict)
            or manifest.get("operation") not in {"delete", "replace"}
            or not isinstance(manifest.get("mappings"), list)
            or not str(manifest.get("transaction_id") or "")
        ):
            return None
        return manifest

    @staticmethod
    def _transaction_committed(manifest: dict, history: dict) -> bool:
        marker = manifest.get("commit_marker") or {}
        transaction_id = str(manifest.get("transaction_id") or "")
        if marker.get("scope") == "history":
            return transaction_id in (history.get("file_transactions") or [])
        if marker.get("scope") == "record":
            record_id = marker.get("record_id")
            return any(
                record.get("id") == record_id
                and record.get("file_transaction_id") == transaction_id
                for record in history.get("records") or []
            )
        return False

    def _purge_transaction_unlocked(self, transaction_dir: Path) -> bool:
        try:
            transaction_dir = self._validate_lexical_trash_path(transaction_dir)
        except ValueError:
            return False
        manifest_path = transaction_dir / "manifest.json"
        try:
            entries = list(transaction_dir.iterdir())
        except OSError:
            return False
        cleanup_ok = True
        for entry in entries:
            if entry == manifest_path:
                continue
            try:
                if self._is_junction(entry):
                    cleanup_ok = False
                elif entry.is_symlink() or not entry.is_dir():
                    entry.unlink()
                else:
                    cleanup_ok = False
            except OSError:
                cleanup_ok = False
        if not cleanup_ok:
            return False
        try:
            manifest_path.unlink(missing_ok=True)
        except OSError:
            return False
        try:
            transaction_dir.rmdir()
        except OSError:
            return False
        return True

    def _clear_transaction_marker_unlocked(self, manifest: dict) -> bool:
        try:
            history = self._read_history_unlocked()
            transaction_id = str(manifest.get("transaction_id") or "")
            operation = manifest.get("operation")
            changed = False
            if operation == "delete":
                markers = list(history.get("file_transactions") or [])
                remaining = [marker for marker in markers if marker != transaction_id]
                if remaining != markers:
                    changed = True
                    if remaining:
                        history["file_transactions"] = remaining
                    else:
                        history.pop("file_transactions", None)
            else:
                record_ids = set(manifest.get("record_ids") or [])
                for record in history.get("records") or []:
                    if (
                        record.get("id") in record_ids
                        and record.get("file_transaction_id") == transaction_id
                    ):
                        record.pop("file_transaction_id", None)
                        record.pop("cleanup_pending", None)
                        record["updated_at"] = self._utc_timestamp()
                        changed = True
            if changed:
                self._atomic_write_json(self.history_path, history)
            return True
        except OSError:
            return False

    def _restore_uncommitted_transaction_unlocked(
        self, transaction_dir: Path, manifest: dict
    ) -> bool:
        transaction_dir = self._validate_lexical_trash_path(transaction_dir)
        mappings = []
        for item in manifest.get("mappings") or []:
            if not isinstance(item, dict):
                raise ValueError("Invalid file transaction mapping")
            original_path = self._validate_lexical_result_file(
                item.get("original_path")
            )
            staged_path = self._validate_lexical_trash_path(
                item.get("staged_path") or ""
            )
            transaction_root = Path(os.path.abspath(str(transaction_dir)))
            if (
                staged_path == transaction_root
                or not staged_path.is_relative_to(transaction_root)
                or staged_path.is_symlink()
                or self._is_junction(staged_path)
            ):
                raise ValueError("Invalid staged transaction path")
            mappings.append((original_path, staged_path))

        if manifest.get("operation") == "replace":
            final_path = self._validate_lexical_result_file(
                manifest.get("intended_final_path")
            )
            final_mapping = next(
                (
                    staged_path
                    for original_path, staged_path in mappings
                    if original_path == final_path
                ),
                None,
            )
            if final_path.exists():
                old_was_staged = final_mapping is None or final_mapping.exists()
                if old_was_staged:
                    discarded_path = transaction_dir / (
                        f"uncommitted-new-{uuid.uuid4().hex}"
                    )
                    os.replace(final_path, discarded_path)

        for original_path, staged_path in reversed(mappings):
            if not staged_path.exists():
                continue
            if (
                original_path.exists()
                or original_path.is_symlink()
                or self._is_junction(original_path)
            ):
                raise OSError(f"Cannot restore occupied result path: {original_path}")
            os.replace(staged_path, original_path)
        return self._purge_transaction_unlocked(transaction_dir)

    def _clear_orphan_transaction_markers_unlocked(
        self, present_transaction_ids: set[str]
    ) -> None:
        try:
            history = self._read_history_unlocked()
            changed = False
            markers = list(history.get("file_transactions") or [])
            remaining = [
                marker for marker in markers if marker in present_transaction_ids
            ]
            if remaining != markers:
                changed = True
                if remaining:
                    history["file_transactions"] = remaining
                else:
                    history.pop("file_transactions", None)
            for record in history.get("records") or []:
                marker = str(record.get("file_transaction_id") or "")
                if marker and marker not in present_transaction_ids:
                    record.pop("file_transaction_id", None)
                    record.pop("cleanup_pending", None)
                    record["updated_at"] = self._utc_timestamp()
                    changed = True
            if changed:
                self._atomic_write_json(self.history_path, history)
        except OSError:
            pass

    def _recover_file_transactions_unlocked(self) -> None:
        try:
            transaction_dirs = [
                entry
                for entry in self.trash_dir.iterdir()
                if entry.is_dir()
                and not entry.is_symlink()
                and not self._is_junction(entry)
            ]
        except OSError:
            return
        for transaction_dir in transaction_dirs:
            manifest = self._read_transaction_manifest_unlocked(transaction_dir)
            if manifest is None:
                try:
                    transaction_dir.rmdir()
                except OSError:
                    pass
                continue
            history = self._read_history_unlocked()
            if self._transaction_committed(manifest, history):
                cleaned = self._purge_transaction_unlocked(transaction_dir)
                if cleaned:
                    self._clear_transaction_marker_unlocked(manifest)
            else:
                self._restore_uncommitted_transaction_unlocked(
                    transaction_dir, manifest
                )

        present_transaction_ids = set()
        try:
            for transaction_dir in self.trash_dir.iterdir():
                if (
                    transaction_dir.is_dir()
                    and not transaction_dir.is_symlink()
                    and not self._is_junction(transaction_dir)
                ):
                    transaction_id = self._transaction_id_from_dir(transaction_dir)
                    if transaction_id:
                        present_transaction_ids.add(transaction_id)
        except OSError:
            return
        self._clear_orphan_transaction_markers_unlocked(present_transaction_ids)

    def _list_history_unlocked(self) -> list[dict]:
        records = self._read_history_unlocked()["records"]
        records = sorted(
            records,
            key=lambda record: str(record.get("created_at") or ""),
            reverse=True,
        )
        return copy.deepcopy(records)

    def list_history(self) -> list[dict]:
        with self._lock:
            with self._file_transaction_lock():
                return self._list_history_unlocked()

    def _create_record_unlocked(
        self, prompt: str, model: str, params: dict, context: dict | None = None
    ) -> dict:
        timestamp = self._utc_timestamp()
        record = {
            "id": str(uuid.uuid4()),
            "media_type": "image",
            "prompt": str(prompt),
            "model": str(model),
            "params": copy.deepcopy(params),
            "task_id": "",
            "status": "submitting",
            "progress": 0,
            "remote_url": "",
            "local_path": "",
            "local_url": "",
            "width": 0,
            "height": 0,
            "bytes": 0,
            "error": "",
            "created_at": timestamp,
            "updated_at": timestamp,
        }
        for key in (
            "project_id",
            "asset_node_id",
            "style_direction_id",
            "workflow_run_id",
            "agent_run_id",
            "agent_action_id",
            "style_guide_visual_run_id",
            "style_guide_visual_node_id",
            "actor",
        ):
            value = (context or {}).get(key)
            if value is not None and str(value).strip():
                record[key] = str(value).strip()
        for key in (
            "style_guide_package_id",
            "style_guide_version_id",
            "style_guide_mode",
            "style_guide_module_types",
            "style_guide_reference_snapshot",
            "style_guide_prompt_snapshot",
            "style_guide_negative_prompt_snapshot",
            "style_guide_overrides",
            "style_guide_warnings",
            "style_guide_budget",
        ):
            if key in (context or {}):
                record[key] = copy.deepcopy(context[key])
        history = self._read_history_unlocked()
        history["records"].insert(0, record)
        self._atomic_write_json(self.history_path, history)
        return copy.deepcopy(record)

    def create_record(
        self, prompt: str, model: str, params: dict, context: dict | None = None
    ) -> dict:
        with self._lock:
            with self._file_transaction_lock():
                return self._create_record_unlocked(prompt, model, params, context)

    def _find_record_unlocked(self, record_id: str) -> dict:
        for record in self._read_history_unlocked()["records"]:
            if record.get("id") == record_id:
                return copy.deepcopy(record)
        raise ValueError(f"History record not found: {record_id}")

    def find_record(self, record_id: str) -> dict:
        with self._lock:
            with self._file_transaction_lock():
                return self._find_record_unlocked(record_id)

    def _update_record_unlocked(self, record_id: str, **changes) -> dict:
        history = self._read_history_unlocked()
        for record in history["records"]:
            if record.get("id") != record_id:
                continue
            record.update(copy.deepcopy(changes))
            record["id"] = record_id
            record["updated_at"] = self._utc_timestamp()
            self._atomic_write_json(self.history_path, history)
            return copy.deepcopy(record)
        raise ValueError(f"History record not found: {record_id}")

    def update_record(self, record_id: str, **changes) -> dict:
        with self._lock:
            with self._file_transaction_lock():
                return self._update_record_unlocked(record_id, **changes)

    def delete_records(
        self, record_ids: list[str], *, delete_files: bool = False
    ) -> dict:
        with self._lock:
            with self._file_transaction_lock():
                self._recover_file_transactions_unlocked()
                history = self._read_history_unlocked()
                selected_ids = set(record_ids)
                selected = [
                    record
                    for record in history["records"]
                    if record.get("id") in selected_ids
                ]
                result_paths = []
                if delete_files:
                    for record in selected:
                        local_path = str(record.get("local_path") or "").strip()
                        if not local_path:
                            continue
                        result_path = self._validate_lexical_result_file(local_path)
                        if result_path not in result_paths:
                            result_paths.append(result_path)

                remaining_records = [
                    record
                    for record in history["records"]
                    if record.get("id") not in selected_ids
                ]
                existing_paths = [path for path in result_paths if path.exists()]
                cleanup_pending = False
                if delete_files and existing_paths:
                    transaction_dir, manifest = (
                        self._create_file_transaction_unlocked(
                            "delete",
                            [record["id"] for record in selected],
                            existing_paths,
                        )
                    )
                    try:
                        for mapping in manifest["mappings"]:
                            os.replace(
                                mapping["original_path"], mapping["staged_path"]
                            )
                        committed_history = copy.deepcopy(history)
                        committed_history["records"] = remaining_records
                        markers = list(
                            committed_history.get("file_transactions") or []
                        )
                        markers.append(manifest["transaction_id"])
                        committed_history["file_transactions"] = markers
                        self._atomic_write_json(
                            self.history_path, committed_history
                        )
                    except Exception:
                        self._restore_uncommitted_transaction_unlocked(
                            transaction_dir, manifest
                        )
                        raise
                    cleaned = self._purge_transaction_unlocked(transaction_dir)
                    marker_cleared = (
                        cleaned
                        and self._clear_transaction_marker_unlocked(manifest)
                    )
                    cleanup_pending = not (cleaned and marker_cleared)
                else:
                    committed_history = copy.deepcopy(history)
                    committed_history["records"] = remaining_records
                    self._atomic_write_json(
                        self.history_path, committed_history
                    )
                return {
                    "deleted_ids": [record["id"] for record in selected],
                    "files_deleted": delete_files,
                    "cleanup_pending": cleanup_pending,
                }

    @staticmethod
    def _validate_result_url(result_url) -> str:
        url = str(result_url or "").strip()
        try:
            parsed_url = urllib.parse.urlparse(url)
            hostname = parsed_url.hostname
        except ValueError:
            hostname = None
            parsed_url = None
        if (
            parsed_url is None
            or parsed_url.scheme.lower() not in {"http", "https"}
            or not hostname
        ):
            raise ValueError(
                "Result URL must use HTTP or HTTPS and include a valid hostname"
            )
        return url

    def download_result(self, record_id: str, result_url: str) -> dict:
        result_url = self._validate_result_url(result_url)
        self.find_record(record_id)
        try:
            stable_record_id = str(uuid.UUID(str(record_id)))
        except ValueError:
            raise ValueError("History record ID is not a valid UUID") from None

        request = urllib.request.Request(
            str(result_url),
            headers={
                "User-Agent": DOWNLOAD_USER_AGENT,
                "Accept": "image/png,image/jpeg,image/webp,image/bmp,*/*;q=0.1",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                response_url = (
                    response.geturl()
                    if callable(getattr(response, "geturl", None))
                    else result_url
                )
                response_url = self._validate_result_url(response_url)
                image_bytes = response.read(MAX_IMAGE_RESPONSE_BYTES + 1)
        except (
            urllib.error.HTTPError,
            urllib.error.URLError,
            http.client.HTTPException,
            OSError,
        ) as exc:
            raise OmniGenError(f"Unable to download generated image: {exc}") from None
        if len(image_bytes) > MAX_IMAGE_RESPONSE_BYTES:
            raise OmniGenError("Generated image exceeded 32 MB limit")

        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(
                "wb",
                dir=self.results_dir,
                prefix=f".{stable_record_id}.",
                suffix=".tmp",
                delete=False,
            ) as handle:
                temporary_path = Path(handle.name)
                handle.write(image_bytes)
                handle.flush()
                os.fsync(handle.fileno())

            try:
                with Image.open(temporary_path) as image:
                    image_format = str(image.format or "").upper()
                    width, height = image.size
                    image.verify()
            except (
                UnidentifiedImageError,
                Image.DecompressionBombError,
                OSError,
                SyntaxError,
                ValueError,
            ):
                raise ValueError("Downloaded result is not a valid image") from None

            extension = IMAGE_EXTENSIONS.get(image_format)
            if extension is None:
                raise ValueError(
                    f"Downloaded image format is not supported: {image_format or 'unknown'}"
                )
            final_path = self._validate_lexical_result_file(
                self.results_dir / f"{stable_record_id}{extension}"
            )
            with self._lock:
                with self._file_transaction_lock():
                    self._recover_file_transactions_unlocked()
                    record = self._find_record_unlocked(record_id)
                    paths_to_stage = []
                    if final_path.exists():
                        paths_to_stage.append(final_path)
                    previous_local_path = str(
                        record.get("local_path") or ""
                    ).strip()
                    if previous_local_path:
                        previous_path = self._validate_lexical_result_file(
                            previous_local_path
                        )
                        if (
                            previous_path.exists()
                            and previous_path not in paths_to_stage
                        ):
                            paths_to_stage.append(previous_path)

                    transaction_dir, manifest = (
                        self._create_file_transaction_unlocked(
                            "replace",
                            [record_id],
                            paths_to_stage,
                            final_path,
                        )
                    )
                    try:
                        for mapping in manifest["mappings"]:
                            os.replace(
                                mapping["original_path"],
                                mapping["staged_path"],
                            )
                        os.replace(temporary_path, final_path)
                        temporary_path = None
                        updated = self._update_record_unlocked(
                            record_id,
                            remote_url=response_url,
                            local_path=str(final_path),
                            local_url=f"{self.local_url_prefix}/{final_path.name}",
                            width=width,
                            height=height,
                            bytes=len(image_bytes),
                            status="succeeded",
                            progress=100,
                            error="",
                            file_transaction_id=manifest["transaction_id"],
                            cleanup_pending=True,
                        )
                    except Exception:
                        self._restore_uncommitted_transaction_unlocked(
                            transaction_dir, manifest
                        )
                        raise
                    cleaned = self._purge_transaction_unlocked(transaction_dir)
                    marker_cleared = (
                        cleaned
                        and self._clear_transaction_marker_unlocked(manifest)
                    )
                    if cleaned and marker_cleared:
                        return self._find_record_unlocked(record_id)
                    return updated
        except ValueError:
            raise
        except OSError as exc:
            raise OmniGenError(f"Unable to save generated image: {exc}") from None
        finally:
            if temporary_path is not None:
                try:
                    temporary_path.unlink(missing_ok=True)
                except OSError:
                    pass

    @staticmethod
    def _normalize_task_status(status) -> str:
        normalized = (
            str(status or "")
            .strip()
            .lower()
            .replace("-", "_")
            .replace(" ", "_")
        )
        aliases = {
            "success": "succeeded",
            "successful": "succeeded",
            "completed": "succeeded",
            "complete": "succeeded",
            "done": "succeeded",
            "failure": "failed",
            "error": "failed",
            "errored": "failed",
            "cancelled": "canceled",
            "processing": "running",
            "in_progress": "running",
        }
        return aliases.get(normalized, normalized or "running")

    @staticmethod
    def _normalize_task_progress(progress, fallback):
        if progress is None or isinstance(progress, bool):
            return fallback
        try:
            if isinstance(progress, str):
                progress = progress.strip().removesuffix("%").strip()
            numeric = float(progress)
        except (TypeError, ValueError, OverflowError):
            return fallback
        numeric = max(0.0, min(100.0, numeric))
        return int(numeric) if numeric.is_integer() else numeric

    @staticmethod
    def _task_error_text(error) -> str:
        if error is None:
            return ""
        if isinstance(error, dict):
            for key in ("message", "error", "detail"):
                if key in error:
                    return OmniGenService._task_error_text(error[key])
            return json.dumps(error, ensure_ascii=False, sort_keys=True)
        if isinstance(error, list):
            return "; ".join(
                part for part in map(OmniGenService._task_error_text, error) if part
            )
        return str(error)

    @staticmethod
    def _first_http_result_url(payload) -> str:
        result_keys = (
            "result_url",
            "result",
            "results",
            "output",
            "outputs",
            "images",
            "image_url",
            "url",
            "urls",
        )

        def find(value):
            if isinstance(value, str):
                try:
                    return OmniGenService._validate_result_url(value)
                except ValueError:
                    return ""
            if isinstance(value, list):
                for item in value:
                    found = find(item)
                    if found:
                        return found
                return ""
            if isinstance(value, dict):
                for key in result_keys:
                    if key not in value:
                        continue
                    found = find(value[key])
                    if found:
                        return found
            return ""

        return find(payload)

    def refresh_task(self, record_id: str) -> dict:
        record = self.find_record(record_id)
        task_id = str(record.get("task_id") or "").strip()
        if not task_id:
            raise ValueError("Generation record has no task_id")

        try:
            payload = self.call_tool(
                "get_generation_task", {"task_id": task_id}
            )
        except OmniGenError as exc:
            safe_error = redact_secret(exc, self._token())
            self.update_record(record_id, error=safe_error)
            raise OmniGenError(safe_error) from None
        task_payload = payload.get("task") if isinstance(payload, dict) else None
        if not isinstance(task_payload, dict):
            task_payload = payload if isinstance(payload, dict) else {}
        raw_status = task_payload.get("status", task_payload.get("state"))
        status = self._normalize_task_status(raw_status or record.get("status"))
        progress = self._normalize_task_progress(
            task_payload.get("progress"), record.get("progress", 0)
        )
        result_asset_id = self._direct_asset_id(
            task_payload, "result_asset_id", "output_asset_id"
        ) or self._direct_asset_id(
            payload, "result_asset_id", "output_asset_id"
        )
        if result_asset_id and result_asset_id != record.get("result_asset_id"):
            record = self.update_record(
                record_id, result_asset_id=result_asset_id
            )

        if status in {"failed", "canceled"}:
            raw_error = task_payload.get("error")
            if raw_error is None:
                raw_error = task_payload.get("message")
            error = self._task_error_text(raw_error)
            if not error:
                error = f"Generation task {status}"
            return self.update_record(
                record_id,
                status=status,
                progress=progress,
                error=redact_secret(error, self._token()),
            )

        if status == "succeeded":
            result_url = self._first_http_result_url(task_payload)
            if not result_url:
                result_url = self._first_http_result_url(payload)
            if not result_url:
                result_url = self._first_http_result_url(record.get("remote_url"))
            if not result_url:
                return self.update_record(
                    record_id,
                    status="download_failed",
                    progress=100,
                    error="Succeeded generation returned no HTTP(S) image URL",
                )
            try:
                return self.download_result(record_id, result_url)
            except (OmniGenError, ValueError) as exc:
                return self.update_record(
                    record_id,
                    remote_url=result_url,
                    status="download_failed",
                    progress=100,
                    error=redact_secret(exc, self._token()),
                )

        return self.update_record(
            record_id,
            status=status,
            progress=progress,
            error="",
        )

    def public_profile(self) -> dict:
        with self._lock:
            settings = self._read_settings()
            profile = settings.get("profile")
            if not isinstance(profile, dict):
                profile = {}
            omnigen = settings.get("omnigen")
            if not isinstance(omnigen, dict):
                omnigen = {}
            name = str(profile.get("name") or "").strip() or DEFAULT_PROFILE_NAME
            token = str(omnigen.get("token") or "")
            last_error = omnigen.get("last_error")
            try:
                model_count = int(omnigen.get("model_count") or 0)
            except (TypeError, ValueError, OverflowError):
                model_count = 0
            return {
                "name": name,
                "avatar_url": str(profile.get("avatar_url") or ""),
                "mcp": {
                    "configured": bool(token),
                    "validated": bool(omnigen.get("validated", False)),
                    "model_count": model_count,
                    "last_error": (
                        redact_secret(last_error, token)
                        if last_error is not None
                        else None
                    ),
                },
            }

    def _save_avatar(self, avatar_data_url: str) -> str:
        header, separator, encoded = str(avatar_data_url or "").partition(",")
        if separator != "," or not header.startswith("data:"):
            raise ValueError("Avatar must be a valid image data URL")
        metadata = header[5:].split(";")
        mime_type = metadata[0].strip().lower()
        if mime_type not in AVATAR_MIME_TYPES or "base64" not in {
            item.strip().lower() for item in metadata[1:]
        }:
            raise ValueError("Avatar must be a base64 PNG, JPEG, or WebP image")
        try:
            avatar_bytes = base64.b64decode(encoded, validate=True)
        except (binascii.Error, ValueError):
            raise ValueError("Avatar contains malformed base64 data") from None
        if len(avatar_bytes) > MAX_AVATAR_BYTES:
            raise ValueError("Avatar exceeds the 5 MB limit")

        try:
            with Image.open(io.BytesIO(avatar_bytes)) as image:
                image.verify()
            with Image.open(io.BytesIO(avatar_bytes)) as image:
                image.load()
                converted = image.convert(
                    "RGBA" if "A" in image.getbands() else "RGB"
                )
        except (
            UnidentifiedImageError,
            Image.DecompressionBombError,
            OSError,
            SyntaxError,
            ValueError,
        ):
            raise ValueError("Avatar is not a valid image") from None

        converted.thumbnail(AVATAR_SIZE, Image.Resampling.LANCZOS)
        avatar_path = self.profile_dir / "avatar.png"
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(
                "wb",
                dir=self.profile_dir,
                prefix=".avatar.",
                suffix=".tmp",
                delete=False,
            ) as handle:
                temporary_path = Path(handle.name)
                converted.save(handle, format="PNG")
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary_path, avatar_path)
            temporary_path = None
        except OSError as exc:
            raise ValueError(f"Unable to save avatar: {exc}") from None
        finally:
            converted.close()
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
        return "/work/profile/avatar.png"

    def update_profile(
        self, name: str, avatar_data_url: str | None = None
    ) -> dict:
        with self._lock:
            settings = self._read_settings()
            profile = settings.get("profile")
            if not isinstance(profile, dict):
                profile = {}
            if str(avatar_data_url or "").strip():
                profile["avatar_url"] = self._save_avatar(avatar_data_url)
            profile["name"] = str(name or "").strip() or DEFAULT_PROFILE_NAME
            settings["profile"] = profile
            self._write_settings(settings)
            return self.public_profile()

    @staticmethod
    def _model_array(payload: dict) -> list:
        if not isinstance(payload, dict):
            return []
        for key in ("models", "items", "data"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
            if isinstance(value, dict):
                nested = OmniGenService._model_array(value)
                if nested:
                    return nested
        return []

    @staticmethod
    def _normalize_image_models(payload: dict) -> list[dict]:
        normalized = []
        for model in OmniGenService._model_array(payload):
            if not isinstance(model, dict):
                continue
            raw_modality = model.get("modality")
            if raw_modality:
                modalities = (
                    [str(item).strip().lower() for item in raw_modality]
                    if isinstance(raw_modality, (list, tuple, set))
                    else [str(raw_modality).strip().lower()]
                )
                if "image" not in modalities:
                    continue
                modality = "image"
            else:
                modality = "image"
            model_id = str(
                model.get("id")
                or model.get("model_id")
                or model.get("model")
                or model.get("name")
                or ""
            ).strip()
            if not model_id:
                continue
            capabilities = model.get("capabilities")
            if not isinstance(capabilities, dict):
                capabilities = {}

            def first_value(*keys):
                for source in (model, capabilities):
                    for key in keys:
                        if key in source:
                            return copy.deepcopy(source[key])
                return []

            def first_nonnegative_int(*keys):
                value = first_value(*keys)
                try:
                    return max(0, int(value))
                except (TypeError, ValueError):
                    return 0

            normalized.append(
                {
                    "id": model_id,
                    "display_name": str(
                        model.get("display_name")
                        or model.get("displayName")
                        or model.get("name")
                        or model_id
                    ),
                    "modality": modality,
                    "pricing": copy.deepcopy(model.get("pricing") or {}),
                    "billing_rules": copy.deepcopy(
                        model.get("billing_rules") or {}
                    ),
                    "capabilities": copy.deepcopy(capabilities),
                    "supported_aspect_ratios": first_value(
                        "supported_aspect_ratios", "aspect_ratios", "aspectRatios"
                    ),
                    "supported_resolutions": first_value(
                        "supported_resolutions", "resolutions", "sizes"
                    ),
                    "max_reference_images": first_nonnegative_int(
                        "max_reference_images",
                        "reference_image_limit",
                        "max_input_images",
                    ),
                }
            )
        return normalized

    @staticmethod
    def _billing_decimal(value: object) -> Decimal | None:
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            return None

    @classmethod
    def _resolution_price(
        cls, prices: object, resolution: str
    ) -> Decimal | None:
        if not isinstance(prices, dict):
            return None
        return cls._billing_decimal(
            prices.get(resolution, prices.get("default"))
        )

    @staticmethod
    def _estimated_output_pixels(
        resolution: str, aspect_ratio: str
    ) -> int:
        long_edges = {
            "512": 512,
            "1K": 1024,
            "2K": 2048,
            "4K": 4096,
            "8K": 8192,
        }
        edge = long_edges.get(str(resolution or "").upper(), 0)
        try:
            width_ratio, height_ratio = (
                float(item)
                for item in str(aspect_ratio or "1:1").split(":", 1)
            )
        except (TypeError, ValueError):
            width_ratio, height_ratio = 1.0, 1.0
        if edge <= 0 or width_ratio <= 0 or height_ratio <= 0:
            return 0
        scale = edge / max(width_ratio, height_ratio)
        width = max(1, round(width_ratio * scale))
        height = max(1, round(height_ratio * scale))
        return width * height

    @classmethod
    def estimate_image_cost(
        cls,
        model: dict,
        params: dict,
        *,
        effective_reference_count: int,
        original_reference_count: int,
        task_count: int = 1,
    ) -> dict:
        rules = copy.deepcopy(model.get("billing_rules") or {})
        resolution = str(params.get("resolution") or "").upper()
        aspect_ratio = str(params.get("aspect_ratio") or "1:1")
        effective = max(0, int(effective_reference_count))
        original = max(effective, int(original_reference_count))
        tasks = max(1, int(task_count))
        currency = str(rules.get("currency") or "CNY").upper()
        reference_unit = None
        reference_free = 0
        reference_billable = 0
        reference_subtotal: Decimal | None = Decimal("0")
        unoptimized_reference_subtotal: Decimal | None = Decimal("0")
        output_unit = None
        output_subtotal = None
        exact = True
        used_fallback = False
        unavailable_reason = ""

        unit = str(rules.get("unit") or "").lower()
        if unit == "composite":
            pixels = cls._estimated_output_pixels(resolution, aspect_ratio)
            for component in rules.get("components") or []:
                if not isinstance(component, dict):
                    continue
                key = str(component.get("key") or "")
                if key == "input_images":
                    reference_unit = cls._billing_decimal(
                        component.get("amount")
                    )
                    reference_free = max(
                        0, int(component.get("free_quantity") or 0)
                    )
                    reference_billable = max(0, effective - reference_free)
                    original_billable = max(0, original - reference_free)
                    if reference_unit is None:
                        reference_subtotal = None
                        unoptimized_reference_subtotal = None
                        unavailable_reason = "参考图计费规则缺少单价"
                        break
                    reference_subtotal = reference_unit * reference_billable
                    unoptimized_reference_subtotal = (
                        reference_unit * original_billable
                    )
                elif key == "output_images":
                    output_unit = cls._resolution_price(
                        component.get("prices") or {}, resolution
                    )
                    if output_unit is None:
                        output_unit = cls._billing_decimal(
                            component.get("amount")
                        )
                    if output_unit is None:
                        for candidate in component.get("rules") or []:
                            if not isinstance(candidate, dict):
                                continue
                            when = candidate.get("when") or {}
                            matches_lte = (
                                "output_pixels_lte" not in when
                                or pixels <= int(when["output_pixels_lte"])
                            )
                            matches_gt = (
                                "output_pixels_gt" not in when
                                or pixels > int(when["output_pixels_gt"])
                            )
                            if pixels > 0 and matches_lte and matches_gt:
                                output_unit = cls._billing_decimal(
                                    candidate.get("amount")
                                )
                                break
                    if output_unit is None:
                        unavailable_reason = "当前分辨率缺少生成价格"
                        break
                    output_subtotal = output_unit
            if output_subtotal is None and not unavailable_reason:
                unavailable_reason = "生成计费规则缺少输出图片组件"
        elif unit in {"cny/item", "yuan/item", "item"}:
            output_unit = cls._billing_decimal(rules.get("amount"))
            if output_unit is None:
                output_unit = cls._resolution_price(
                    rules.get("prices_by_resolution") or {}, resolution
                )
            if output_unit is None:
                unavailable_reason = "当前分辨率缺少生成价格"
            else:
                output_subtotal = output_unit
        elif unit == "token_usage":
            fallback = (
                rules.get("fallback")
                if isinstance(rules.get("fallback"), dict)
                else {}
            )
            output_unit = cls._resolution_price(
                fallback.get("prices_by_resolution") or {}, resolution
            )
            exact = False
            used_fallback = output_unit is not None
            reference_subtotal = None
            unoptimized_reference_subtotal = None
            if output_unit is None:
                unavailable_reason = "Token 计费缺少可用的分辨率回退价"
            else:
                output_subtotal = output_unit
        else:
            exact = False
            reference_subtotal = None
            unoptimized_reference_subtotal = None
            unavailable_reason = "当前模型未提供可识别的价格规则"

        if (
            unavailable_reason
            or output_subtotal is None
            or (unit == "composite" and reference_subtotal is None)
        ):
            per_task_total = None
            total = None
            unoptimized_total = None
            savings = None
        elif unit == "token_usage":
            per_task_total = float(output_subtotal)
            total = float(output_subtotal * tasks)
            unoptimized_total = None
            savings = None
        else:
            reference_cost = reference_subtotal or Decimal("0")
            unoptimized_reference_cost = (
                unoptimized_reference_subtotal or Decimal("0")
            )
            per_task = reference_cost + output_subtotal
            unoptimized_per_task = (
                unoptimized_reference_cost + output_subtotal
            )
            per_task_total = float(per_task)
            total = float(per_task * tasks)
            unoptimized_total = float(unoptimized_per_task * tasks)
            savings = float(
                max(
                    Decimal("0"),
                    (unoptimized_per_task - per_task) * tasks,
                )
            )

        return {
            "currency": currency,
            "exact": exact,
            "used_fallback": used_fallback,
            "reference": {
                "unit_price": (
                    float(reference_unit)
                    if reference_unit is not None
                    else None
                ),
                "free_quantity": reference_free,
                "billable_count": reference_billable,
                "subtotal": (
                    float(reference_subtotal)
                    if reference_subtotal is not None
                    else None
                ),
            },
            "generation": {
                "unit_price": (
                    float(output_unit) if output_unit is not None else None
                ),
                "subtotal": (
                    float(output_subtotal)
                    if output_subtotal is not None
                    else None
                ),
            },
            "per_task_total": per_task_total,
            "task_count": tasks,
            "total": total,
            "unoptimized_total": unoptimized_total,
            "savings": savings,
            "unavailable_reason": unavailable_reason,
        }

    def list_image_models(self) -> list[dict]:
        payload = self.call_tool(
            "list_generation_models", {"modality": "image"}
        )
        models = self._normalize_image_models(payload)
        if models:
            with self._lock:
                self._image_models_cache = {
                    str(model.get("id") or ""): copy.deepcopy(model)
                    for model in models
                    if str(model.get("id") or "")
                }
                self._image_models_cache_refresh_after = (
                    time.monotonic() + IMAGE_MODEL_CAPABILITY_CACHE_SECONDS
                )
        return models

    def image_model_capability(self, model_id: str) -> dict:
        model_id = str(model_id or "").strip()
        if not model_id:
            return {}
        now = time.monotonic()
        with self._lock:
            cached = copy.deepcopy(
                self._image_models_cache.get(model_id) or {}
            )
            refresh_after = self._image_models_cache_refresh_after
        if cached and now < refresh_after:
            return cached
        try:
            models = self.list_image_models()
        except OmniGenError:
            if not cached:
                raise
            with self._lock:
                self._image_models_cache_refresh_after = (
                    now + IMAGE_MODEL_CAPABILITY_RETRY_SECONDS
                )
            return cached
        return next(
            (
                copy.deepcopy(model)
                for model in models
                if str(model.get("id") or "") == model_id
            ),
            {},
        )

    def test_connection(self) -> dict:
        try:
            models = self.list_image_models()
        except OmniGenError as exc:
            safe_error = redact_secret(exc, self._token())
            with self._lock:
                settings = self._read_settings()
                omnigen = settings.get("omnigen")
                if not isinstance(omnigen, dict):
                    omnigen = {}
                omnigen["validated"] = False
                omnigen["model_count"] = 0
                omnigen["last_error"] = safe_error
                settings["omnigen"] = omnigen
                self._write_settings(settings)
            raise OmniGenError(safe_error) from None

        with self._lock:
            settings = self._read_settings()
            omnigen = settings.get("omnigen")
            if not isinstance(omnigen, dict):
                omnigen = {}
            omnigen["validated"] = True
            omnigen["model_count"] = len(models)
            omnigen["last_error"] = None
            settings["omnigen"] = omnigen
            self._write_settings(settings)
        return self.public_profile()

    @staticmethod
    def _direct_asset_id(payload, *keys: str) -> str:
        if not isinstance(payload, dict):
            return ""
        candidates = [payload]
        for envelope in ("task", "asset", "data", "result"):
            nested = payload.get(envelope)
            if isinstance(nested, dict):
                candidates.append(nested)
        for candidate in candidates:
            for key in keys:
                value = str(candidate.get(key) or "").strip()
                if value:
                    return value
        return ""

    def _resolve_project_reference_path(self, raw_path: object) -> Path:
        path_text = str(raw_path or "").strip()
        if not path_text:
            raise ValueError("Reference image path is required")
        candidate = Path(path_text)
        if not candidate.is_absolute():
            candidate = self.work_dir / candidate
        candidate = Path(os.path.abspath(os.path.normpath(str(candidate))))
        project_root = Path(os.path.abspath(str(self.work_dir)))
        if candidate == project_root or not candidate.is_relative_to(project_root):
            raise ValueError("Reference image must be inside the project")
        cursor = project_root
        for part in candidate.relative_to(project_root).parts:
            cursor = cursor / part
            self._reject_link_or_junction(cursor, "reference image path")
        resolved = candidate.resolve()
        resolved_root = project_root.resolve()
        if resolved == resolved_root or not resolved.is_relative_to(resolved_root):
            raise ValueError("Reference image must be inside the project")
        if not resolved.is_file():
            raise ValueError(f"Reference image was not found: {path_text}")
        return resolved

    @staticmethod
    def _reference_image_mime_type(path: Path) -> str:
        try:
            with Image.open(path) as image:
                image.verify()
                image_format = str(image.format or "").upper()
        except (OSError, UnidentifiedImageError) as exc:
            raise ValueError(f"Reference image is invalid: {path.name}") from exc
        mime_types = {
            "PNG": "image/png",
            "JPEG": "image/jpeg",
            "WEBP": "image/webp",
            "BMP": "image/bmp",
        }
        mime_type = mime_types.get(image_format)
        if not mime_type:
            mime_type = str(mimetypes.guess_type(path.name)[0] or "")
        if not mime_type.startswith("image/"):
            raise ValueError(f"Reference image type is unsupported: {path.name}")
        return mime_type

    @staticmethod
    def _reference_fingerprint(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            while chunk := handle.read(1024 * 1024):
                digest.update(chunk)
        return digest.hexdigest()

    def _read_reference_asset_cache(self) -> dict:
        cache = self._read_json(
            self.reference_assets_path,
            {"schema_version": 1, "assets": {}},
        )
        if not isinstance(cache, dict):
            cache = {}
        assets = cache.get("assets")
        if not isinstance(assets, dict):
            assets = {}
        return {"schema_version": 1, "assets": assets}

    def _cache_reference_asset(self, fingerprint: str, marker: dict) -> None:
        with self._lock:
            cache = self._read_reference_asset_cache()
            cache["assets"][fingerprint] = copy.deepcopy(marker)
            self._atomic_write_json(self.reference_assets_path, cache)

    def _generated_record_for_reference(
        self, reference_path: Path, current_record_id: str
    ) -> dict | None:
        for record in self.list_history():
            if record.get("id") == current_record_id:
                continue
            local_path = str(record.get("local_path") or "").strip()
            if not local_path:
                continue
            try:
                candidate = Path(local_path).resolve()
            except OSError:
                continue
            if candidate == reference_path:
                return record
        return None

    def _generated_reference_asset_id(self, record: dict) -> str:
        asset_id = str(record.get("result_asset_id") or "").strip()
        if asset_id:
            return asset_id
        task_id = str(record.get("task_id") or "").strip()
        if not task_id:
            return ""
        payload = self.call_tool("get_generation_task", {"task_id": task_id})
        asset_id = self._direct_asset_id(
            payload, "result_asset_id", "output_asset_id"
        )
        if asset_id:
            self.update_record(record["id"], result_asset_id=asset_id)
        return asset_id

    @staticmethod
    def _reference_identity(raw_reference: object) -> str:
        if isinstance(raw_reference, dict):
            relative_path = str(
                raw_reference.get("relative_path") or ""
            ).strip()
            if relative_path:
                return "path:" + relative_path.replace("\\", "/")
            asset_id = str(
                raw_reference.get("remote_asset_id")
                or raw_reference.get("asset_id")
                or ""
            ).strip()
            return f"asset:{asset_id}" if asset_id else ""
        text = str(raw_reference or "").strip()
        if not text:
            return ""
        parsed = urllib.parse.urlparse(text)
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            return f"url:{text}"
        return "path:" + text.replace("\\", "/")

    @staticmethod
    def _reference_role(raw_reference: object) -> str:
        if not isinstance(raw_reference, dict):
            return "content"
        role = str(raw_reference.get("reference_role") or "content").strip().lower()
        return role if role in REFERENCE_ROLES else "content"

    def _reference_local_path(
        self, raw_reference: object
    ) -> Path | None:
        if isinstance(raw_reference, dict):
            value = raw_reference.get("relative_path")
            has_remote_asset = bool(
                str(
                    raw_reference.get("remote_asset_id")
                    or raw_reference.get("asset_id")
                    or ""
                ).strip()
            )
        else:
            value = raw_reference
            has_remote_asset = False
        text = str(value or "").strip()
        parsed = urllib.parse.urlparse(text)
        if not text or (
            parsed.scheme in {"http", "https"} and parsed.netloc
        ):
            return None
        try:
            return self._resolve_project_reference_path(text)
        except ValueError:
            if has_remote_asset:
                return None
            raise

    def _render_reference_composite(self, paths: list[Path]) -> Path:
        if not 2 <= len(paths) <= REFERENCE_COMPOSITE_MAX_IMAGES:
            raise ValueError(
                "Reference composite requires between 2 and "
                f"{REFERENCE_COMPOSITE_MAX_IMAGES} local images"
            )
        fingerprints = [self._reference_fingerprint(path) for path in paths]
        signature = json.dumps(
            {
                "version": REFERENCE_COMPOSITE_RULE_VERSION,
                "fingerprints": fingerprints,
                "cell": REFERENCE_COMPOSITE_CELL_EDGE,
                "gap": REFERENCE_COMPOSITE_GAP,
            },
            separators=(",", ":"),
            sort_keys=True,
        )
        cache_name = (
            hashlib.sha256(signature.encode("utf-8")).hexdigest() + ".png"
        )
        destination = self.reference_composites_dir / cache_name
        if destination.is_file():
            return destination

        columns = max(1, math.ceil(math.sqrt(len(paths))))
        rows = math.ceil(len(paths) / columns)
        largest_axis = max(columns, rows)
        cell = min(
            REFERENCE_COMPOSITE_CELL_EDGE,
            max(
                256,
                (
                    REFERENCE_COMPOSITE_MAX_EDGE
                    - (largest_axis + 1) * REFERENCE_COMPOSITE_GAP
                )
                // largest_axis,
            ),
        )
        canvas = Image.new(
            "RGB",
            (
                columns * cell + (columns + 1) * REFERENCE_COMPOSITE_GAP,
                rows * cell + (rows + 1) * REFERENCE_COMPOSITE_GAP,
            ),
            REFERENCE_COMPOSITE_BACKGROUND,
        )
        try:
            for index, path in enumerate(paths):
                try:
                    with Image.open(path) as source:
                        source.load()
                        if (
                            source.width * source.height
                            > REFERENCE_COMPOSITE_MAX_SOURCE_PIXELS
                        ):
                            raise ValueError(
                                f"Reference image is too large: {path.name}"
                            )
                        rgb = source.convert("RGB")
                except (OSError, UnidentifiedImageError) as exc:
                    raise ValueError(
                        f"Reference image is invalid: {path.name}"
                    ) from exc
                try:
                    tile = ImageOps.contain(
                        rgb,
                        (min(cell, rgb.width), min(cell, rgb.height)),
                        Image.Resampling.LANCZOS,
                    )
                finally:
                    rgb.close()
                column = index % columns
                row = index // columns
                x = (
                    REFERENCE_COMPOSITE_GAP
                    + column * (cell + REFERENCE_COMPOSITE_GAP)
                    + (cell - tile.width) // 2
                )
                y = (
                    REFERENCE_COMPOSITE_GAP
                    + row * (cell + REFERENCE_COMPOSITE_GAP)
                    + (cell - tile.height) // 2
                )
                canvas.paste(tile, (x, y))
                tile.close()
            self._atomic_write_image(
                destination, canvas, image_format="PNG"
            )
        finally:
            canvas.close()
        return destination

    def _optimize_reference_images(
        self, raw_references: list[object], enabled: bool
    ) -> tuple[list[object], dict]:
        unique = []
        seen = set()
        for reference in raw_references:
            source_identity = self._reference_identity(reference)
            identity = f"{self._reference_role(reference)}|{source_identity}"
            if source_identity and identity not in seen:
                seen.add(identity)
                unique.append(reference)

        role_order = []
        role_entries = {}
        for index, reference in enumerate(unique):
            role = self._reference_role(reference)
            if role not in role_entries:
                role_order.append(role)
                role_entries[role] = []
            role_entries[role].append((index, reference, self._reference_local_path(reference)))

        optimized_by_index = {}
        composite_relative_path = ""
        groups = []
        for role in role_order:
            entries = role_entries[role]
            local_entries = [entry for entry in entries if entry[2] is not None]
            if role == "content" and len(local_entries) > REFERENCE_COMPOSITE_MAX_IMAGES:
                raise ValueError(
                    f"A maximum of {REFERENCE_COMPOSITE_MAX_IMAGES} local "
                    "content reference images can be combined per task"
                )
            group_composite = ""
            if enabled and role == "content" and len(local_entries) >= 2:
                composite = self._render_reference_composite(
                    [path for _index, _reference, path in local_entries]
                )
                group_composite = composite.relative_to(self.work_dir).as_posix()
                composite_relative_path = group_composite
                local_indexes = {index for index, _reference, _path in local_entries}
                first_local = min(local_indexes)
                for index, reference, _path in entries:
                    if index == first_local:
                        optimized_by_index[index] = {
                            "relative_path": group_composite,
                            "reference_role": "content",
                        }
                    elif index not in local_indexes:
                        optimized_by_index[index] = reference
            else:
                for index, reference, _path in entries:
                    optimized_by_index[index] = reference
            groups.append(
                {
                    "role": role,
                    "original_count": len(entries),
                    "effective_count": sum(
                        1 for index, _reference, _path in entries if index in optimized_by_index
                    ),
                    "composite_relative_path": group_composite,
                }
            )

        optimized = [optimized_by_index[index] for index in sorted(optimized_by_index)]

        unmerged_references = []
        for reference in optimized:
            if self._reference_local_path(reference) is None:
                identity = self._reference_identity(reference)
                if identity:
                    unmerged_references.append(identity)
        snapshot = {
            "enabled": bool(enabled),
            "rule_version": REFERENCE_COMPOSITE_RULE_VERSION,
            "original_count": len(unique),
            "effective_count": len(optimized),
            "composite_relative_path": composite_relative_path,
            "unmerged_references": unmerged_references,
            "groups": groups,
        }
        return optimized, snapshot

    def _reference_input(
        self, raw_reference: object, current_record_id: str
    ) -> tuple[dict, dict]:
        reference_role = self._reference_role(raw_reference)
        if isinstance(raw_reference, dict):
            asset_id = str(
                raw_reference.get("remote_asset_id")
                or raw_reference.get("asset_id")
                or ""
            ).strip()
            if asset_id:
                marker = {
                    "relative_path": str(raw_reference.get("relative_path") or ""),
                    "asset_id": asset_id,
                    "source": "style-guide-remote",
                    "record_id": str(raw_reference.get("source_record_id") or ""),
                    "content_sha256": str(raw_reference.get("content_sha256") or ""),
                    "updated_at": self._utc_timestamp(),
                    "reference_role": reference_role,
                }
                return (
                    {
                        "type": "asset_id",
                        "asset_id": asset_id,
                        "role": "reference",
                    },
                    marker,
                )
            raw_reference = raw_reference.get("relative_path") or ""
        reference_text = str(raw_reference or "").strip()
        parsed = urllib.parse.urlparse(reference_text)
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            marker = {
                "reference": reference_text,
                "source": "public-url",
                "url": reference_text,
                "reference_role": reference_role,
            }
            return (
                {"type": "url", "url": reference_text, "role": "reference"},
                marker,
            )

        reference_path = self._resolve_project_reference_path(reference_text)
        relative_path = reference_path.relative_to(self.work_dir).as_posix()
        fingerprint = self._reference_fingerprint(reference_path)
        generated_record = self._generated_record_for_reference(
            reference_path, current_record_id
        )
        if generated_record is not None:
            asset_id = self._generated_reference_asset_id(generated_record)
            if asset_id:
                marker = {
                    "relative_path": relative_path,
                    "asset_id": asset_id,
                    "source": "mcp-generate",
                    "record_id": generated_record["id"],
                    "content_sha256": fingerprint,
                    "updated_at": self._utc_timestamp(),
                    "reference_role": reference_role,
                }
                self._cache_reference_asset(fingerprint, marker)
                return (
                    {
                        "type": "asset_id",
                        "asset_id": asset_id,
                        "role": "reference",
                    },
                    marker,
                )

        cache = self._read_reference_asset_cache()
        cached = cache["assets"].get(fingerprint)
        cached_asset_id = (
            str(cached.get("asset_id") or "").strip()
            if isinstance(cached, dict)
            else ""
        )
        if cached_asset_id:
            marker = {
                **copy.deepcopy(cached),
                "relative_path": relative_path,
                "asset_id": cached_asset_id,
                "reference_role": reference_role,
            }
            return (
                {
                    "type": "asset_id",
                    "asset_id": cached_asset_id,
                    "role": "reference",
                },
                marker,
            )

        mime_type = self._reference_image_mime_type(reference_path)
        payload = self.call_tool(
            "upload_asset",
            {
                "filename": reference_path.name,
                "mime_type": mime_type,
                "data_base64": base64.b64encode(reference_path.read_bytes()).decode(
                    "ascii"
                ),
                "role": "reference",
                "kind": "image",
            },
        )
        asset_id = self._direct_asset_id(payload, "asset_id")
        if not asset_id:
            raise OmniGenError(
                f"OmniGen returned no asset ID for reference image: {reference_path.name}"
            )
        marker = {
            "relative_path": relative_path,
            "asset_id": asset_id,
            "source": "mcp-upload",
            "content_sha256": fingerprint,
            "updated_at": self._utc_timestamp(),
            "reference_role": reference_role,
        }
        self._cache_reference_asset(fingerprint, marker)
        return (
            {
                "type": "asset_id",
                "asset_id": asset_id,
                "role": "reference",
            },
            marker,
        )

    def _prepare_reference_inputs(
        self,
        params: dict,
        current_record_id: str,
        *,
        reference_limit: int = 0,
    ) -> tuple[list[dict], list[dict], dict]:
        remote_params = copy.deepcopy(params)
        raw_references = remote_params.pop("reference_images", [])
        optimization_enabled = bool(
            remote_params.pop("optimize_reference_images", True)
        )
        if raw_references is None:
            raw_references = []
        if not isinstance(raw_references, list):
            raise ValueError("Reference images must be an array")
        optimized_references, optimization_snapshot = (
            self._optimize_reference_images(
                raw_references, optimization_enabled
            )
        )
        self.update_record(
            current_record_id,
            reference_optimization=optimization_snapshot,
        )
        reference_limit = max(0, int(reference_limit or 0))
        effective_count = int(
            optimization_snapshot.get("effective_count") or 0
        )
        if reference_limit and effective_count > reference_limit:
            raise ValueError(
                f"当前模型最多支持 {reference_limit} 张实际参考输入，"
                f"本次优化后为 {effective_count} 张"
            )
        inputs = []
        markers = []
        for raw_reference in optimized_references:
            input_item, marker = self._reference_input(
                raw_reference, current_record_id
            )
            inputs.append(input_item)
            markers.append(marker)
        return inputs, markers, remote_params

    @staticmethod
    def _remote_prompt(prompt: str, background: object) -> str:
        suffix = IMAGE_BACKGROUND_PROMPT_SUFFIXES.get(str(background or "").strip())
        return f"{prompt}\n\n{suffix}" if suffix else prompt

    def submit_image(
        self,
        prompt: str,
        model: str,
        params: dict,
        *,
        context: dict | None = None,
    ) -> dict:
        prompt = str(prompt or "").strip()
        model = str(model or "").strip()
        if not prompt:
            raise ValueError("Image prompt is required")
        if not model:
            raise ValueError("Image model is required")
        if not isinstance(params, dict):
            raise ValueError("Image params must be an object")

        record = self.create_record(prompt, model, params, context=context)
        try:
            inputs, reference_assets, remote_params = (
                self._prepare_reference_inputs(
                    params,
                    record["id"],
                    reference_limit=max(
                        0,
                        int(
                            (context or {}).get("model_reference_limit")
                            or 0
                        ),
                    ),
                )
            )
            record = self.find_record(record["id"])
            if reference_assets:
                record = self.update_record(
                    record["id"], reference_assets=reference_assets
                )
            arguments = {
                "model": model,
                "prompt": self._remote_prompt(prompt, remote_params.get("background")),
                "params": remote_params,
            }
            if inputs:
                arguments["inputs"] = inputs
            payload = self.call_tool(
                "generate_image",
                arguments,
            )
            task = payload.get("task") if isinstance(payload, dict) else None
            if not isinstance(task, dict):
                task = payload if isinstance(payload, dict) else {}
            task_id = str(task.get("task_id") or task.get("id") or "").strip()
            if not task_id:
                raise OmniGenError("OmniGen returned no generation task ID")
            status = self._normalize_task_status(
                task.get("status") or task.get("state") or "queued"
            )
            status = "running" if status == "running" else "queued"
            return self.update_record(
                record["id"], task_id=task_id, status=status, error=""
            )
        except (OmniGenError, ValueError, OSError) as exc:
            safe_error = redact_secret(exc, self._token())
            self.update_record(
                record["id"], status="failed", error=safe_error
            )
            if isinstance(exc, ValueError):
                raise
            raise OmniGenError(safe_error) from None

    def set_token(self, token: str) -> dict:
        with self._lock:
            settings = self._read_settings()
            omnigen = settings.get("omnigen")
            if not isinstance(omnigen, dict):
                omnigen = {}
            omnigen["token"] = str(token or "").strip()
            omnigen["validated"] = False
            omnigen["model_count"] = 0
            omnigen["last_error"] = None
            settings["omnigen"] = omnigen
            self._write_settings(settings)
            return self.public_profile()

    def clear_token(self) -> dict:
        with self._lock:
            settings = self._read_settings()
            omnigen = settings.get("omnigen")
            if not isinstance(omnigen, dict):
                omnigen = {}
            omnigen.pop("token", None)
            omnigen["validated"] = False
            omnigen["model_count"] = 0
            omnigen["last_error"] = None
            settings["omnigen"] = omnigen
            self._write_settings(settings)
            return self.public_profile()

    def _token(self) -> str:
        with self._lock:
            settings = self._read_settings()
            omnigen = settings.get("omnigen")
            if not isinstance(omnigen, dict):
                return ""
            return str(omnigen.get("token") or "")

    def _mcp_endpoint_uses_private_network(self) -> bool:
        parsed = urllib.parse.urlsplit(self.endpoint)
        hostname = parsed.hostname
        if not hostname:
            return False
        try:
            port = parsed.port or (443 if parsed.scheme == "https" else 80)
            addresses = socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
        except (OSError, ValueError):
            return False
        for address_info in addresses:
            raw_address = str(address_info[4][0]).split("%", 1)[0]
            try:
                address = ipaddress.ip_address(raw_address)
            except ValueError:
                continue
            if address.is_private or address.is_loopback or address.is_link_local:
                return True
        return False

    def _open_mcp_request(self, request, *, timeout: int):
        if self._mcp_endpoint_uses_private_network():
            # Split-DNS MCP endpoints must not be tunneled through a public proxy.
            direct_opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
            return direct_opener.open(request, timeout=timeout)
        return urllib.request.urlopen(request, timeout=timeout)

    def _request_jsonrpc(
        self,
        method: str,
        params: dict,
        token: str,
        *,
        notification: bool = False,
    ) -> dict:
        try:
            request_payload = {
                "jsonrpc": "2.0",
                "method": method,
                "params": params,
            }
            if not notification:
                request_payload["id"] = 1
            request = urllib.request.Request(
                self.endpoint,
                data=json.dumps(request_payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/event-stream",
                    "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
                },
                method="POST",
            )
            with self._open_mcp_request(request, timeout=60) as response:
                content_type = response.headers.get("Content-Type", "")
                raw_body = response.read(MAX_MCP_RESPONSE_BYTES + 1)
            if len(raw_body) > MAX_MCP_RESPONSE_BYTES:
                raise ValueError("OmniGen response exceeded 8 MB limit")
            body = raw_body.decode("utf-8")
            if notification and not body.strip():
                return {}
            if "text/event-stream" in content_type.lower():
                payload = self._parse_event_stream(body)
            else:
                payload = json.loads(body)
            if notification and payload is None:
                return {}
            if not isinstance(payload, dict):
                raise ValueError("OmniGen returned a non-object JSON-RPC response")
            if "error" in payload:
                error = payload.get("error") or {}
                message = (
                    error.get("message")
                    if isinstance(error, dict)
                    else str(error)
                )
                raise OmniGenError(message or "OmniGen JSON-RPC request failed")
            return payload
        except OmniGenError as exc:
            raise OmniGenError(redact_secret(exc, token)) from None
        except (
            urllib.error.HTTPError,
            urllib.error.URLError,
            OSError,
            UnicodeError,
            TypeError,
            json.JSONDecodeError,
            ValueError,
        ) as exc:
            raise OmniGenError(redact_secret(exc, token)) from None

    @staticmethod
    def _parse_event_stream(body: str) -> dict:
        data_lines = []
        for line in body.splitlines():
            if not line:
                if data_lines:
                    payload = json.loads("\n".join(data_lines))
                    data_lines = []
                    if isinstance(payload, dict) and (
                        "result" in payload or "error" in payload
                    ):
                        return payload
                continue
            if not line.startswith("data:"):
                continue
            data = line[5:]
            if data.startswith(" "):
                data = data[1:]
            data_lines.append(data)
        if data_lines:
            payload = json.loads("\n".join(data_lines))
            if isinstance(payload, dict) and ("result" in payload or "error" in payload):
                return payload
        raise ValueError("OmniGen event stream contained no JSON-RPC response")

    def call_tool(self, name: str, arguments: dict | None = None) -> dict:
        token = self._token()
        if not token:
            raise OmniGenError("OmniGen token is not configured")
        try:
            self._request_jsonrpc(
                "initialize",
                {
                    "protocolVersion": MCP_PROTOCOL_VERSION,
                    "capabilities": {},
                    "clientInfo": {
                        "name": "sprite-video-lab",
                        "version": "1.0",
                    },
                },
                token,
            )
            self._request_jsonrpc(
                "notifications/initialized",
                {},
                token,
                notification=True,
            )
            payload = self._request_jsonrpc(
                "tools/call",
                {"name": name, "arguments": arguments or {}},
                token,
            )
            return parse_mcp_tool_payload(payload)
        except (OmniGenError, ValueError, json.JSONDecodeError) as exc:
            raise OmniGenError(redact_secret(exc, token)) from None
