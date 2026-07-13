import copy
import http.client
import json
import os
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, UnidentifiedImageError


OMNIGEN_ENDPOINT = "https://omnigen.dianchu.cc/api/v1/mcp"
MCP_PROTOCOL_VERSION = "2024-11-05"
DEFAULT_PROFILE_NAME = "游客"
TERMINAL_TASK_STATUSES = {"succeeded", "failed", "canceled"}
MAX_MCP_RESPONSE_BYTES = 8 * 1024 * 1024
MAX_IMAGE_RESPONSE_BYTES = 32 * 1024 * 1024
FILE_TRANSACTION_LOCK_TIMEOUT_SECONDS = 5.0
IMAGE_EXTENSIONS = {
    "PNG": ".png",
    "JPEG": ".jpg",
    "WEBP": ".webp",
    "BMP": ".bmp",
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
    def __init__(self, work_dir: Path, endpoint: str = OMNIGEN_ENDPOINT):
        lexical_work_dir = Path(
            os.path.abspath(os.path.normpath(str(work_dir)))
        )
        self._reject_link_or_junction(
            lexical_work_dir, "OmniGen work directory"
        )
        self.work_dir = lexical_work_dir.resolve()
        self.omnigen_dir = self.work_dir / "omnigen"
        self.settings_path = self.work_dir / "settings.json"
        self.history_path = self.omnigen_dir / "history.json"
        self.results_dir = self.omnigen_dir / "results"
        self.trash_dir = self.omnigen_dir / ".trash"
        self.transaction_lock_path = self.omnigen_dir / ".transactions.lock"
        self.profile_dir = self.work_dir / "profile"
        self.endpoint = endpoint
        self._lock = threading.RLock()

        self.work_dir.mkdir(parents=True, exist_ok=True)
        for path, label in (
            (self.omnigen_dir, "OmniGen data directory"),
            (self.results_dir, "OmniGen results directory"),
            (self.trash_dir, "OmniGen trash directory"),
        ):
            self._reject_link_or_junction(path, label)
            path.mkdir(exist_ok=True)
            self._reject_link_or_junction(path, label)
        self.profile_dir.mkdir(parents=True, exist_ok=True)
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
        self, prompt: str, model: str, params: dict
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
        history = self._read_history_unlocked()
        history["records"].insert(0, record)
        self._atomic_write_json(self.history_path, history)
        return copy.deepcopy(record)

    def create_record(self, prompt: str, model: str, params: dict) -> dict:
        with self._lock:
            with self._file_transaction_lock():
                return self._create_record_unlocked(prompt, model, params)

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
                            local_url=f"/work/omnigen/results/{final_path.name}",
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

    def update_profile(self, name: str) -> dict:
        with self._lock:
            settings = self._read_settings()
            profile = settings.get("profile")
            if not isinstance(profile, dict):
                profile = {}
            profile["name"] = str(name or "").strip() or DEFAULT_PROFILE_NAME
            settings["profile"] = profile
            self._write_settings(settings)
            return self.public_profile()

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
            with urllib.request.urlopen(request, timeout=60) as response:
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
