import copy
import http.client
import json
import os
import tempfile
import threading
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, UnidentifiedImageError


OMNIGEN_ENDPOINT = "https://omnigen.dianchu.cc/api/v1/mcp"
MCP_PROTOCOL_VERSION = "2024-11-05"
DEFAULT_PROFILE_NAME = "游客"
TERMINAL_TASK_STATUSES = {"succeeded", "failed", "canceled"}
MAX_MCP_RESPONSE_BYTES = 8 * 1024 * 1024
MAX_IMAGE_RESPONSE_BYTES = 32 * 1024 * 1024
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
        self.work_dir = Path(work_dir).resolve()
        self.settings_path = self.work_dir / "settings.json"
        self.history_path = self.work_dir / "omnigen" / "history.json"
        self.results_dir = self.work_dir / "omnigen" / "results"
        self.profile_dir = self.work_dir / "profile"
        self.endpoint = endpoint
        self._lock = threading.RLock()

        self.results_dir.mkdir(parents=True, exist_ok=True)
        self.profile_dir.mkdir(parents=True, exist_ok=True)

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
            if not isinstance(history, dict) or not isinstance(
                history.get("records"), list
            ):
                raise ValueError("invalid history structure")
            return history
        except FileNotFoundError:
            return {"records": []}
        except (json.JSONDecodeError, OSError, ValueError):
            if self.history_path.exists():
                timestamp = datetime.now(timezone.utc).strftime(
                    "%Y%m%dT%H%M%S%fZ"
                )
                corrupt_path = self.history_path.with_name(
                    f"history.corrupt-{timestamp}.json"
                )
                try:
                    os.replace(self.history_path, corrupt_path)
                except OSError:
                    pass
            return {"records": []}

    def list_history(self) -> list[dict]:
        with self._lock:
            records = self._read_history_unlocked()["records"]
            records = sorted(
                records,
                key=lambda record: str(record.get("created_at") or ""),
                reverse=True,
            )
            return copy.deepcopy(records)

    def create_record(self, prompt: str, model: str, params: dict) -> dict:
        with self._lock:
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

    def find_record(self, record_id: str) -> dict:
        with self._lock:
            for record in self._read_history_unlocked()["records"]:
                if record.get("id") == record_id:
                    return copy.deepcopy(record)
        raise ValueError(f"History record not found: {record_id}")

    def update_record(self, record_id: str, **changes) -> dict:
        with self._lock:
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

    def delete_records(
        self, record_ids: list[str], *, delete_files: bool = False
    ) -> dict:
        with self._lock:
            history = self._read_history_unlocked()
            selected_ids = set(record_ids)
            selected = [
                record
                for record in history["records"]
                if record.get("id") in selected_ids
            ]
            resolved_paths = []
            if delete_files:
                results_root = self.results_dir.resolve()
                for record in selected:
                    local_path = str(record.get("local_path") or "").strip()
                    if not local_path:
                        continue
                    resolved_path = Path(local_path).resolve()
                    if not resolved_path.is_relative_to(results_root):
                        raise ValueError(
                            "Refusing to delete a file outside the OmniGen results directory"
                        )
                    if resolved_path.exists() and resolved_path.is_dir():
                        raise ValueError(
                            "Refusing to delete a directory from OmniGen history"
                        )
                    resolved_paths.append(resolved_path)

                for resolved_path in resolved_paths:
                    if resolved_path.exists():
                        resolved_path.unlink()

            history["records"] = [
                record
                for record in history["records"]
                if record.get("id") not in selected_ids
            ]
            self._atomic_write_json(self.history_path, history)
            return {
                "deleted_ids": [record["id"] for record in selected],
                "files_deleted": delete_files,
            }

    def download_result(self, record_id: str, result_url: str) -> dict:
        parsed_url = urllib.parse.urlparse(str(result_url))
        if parsed_url.scheme.lower() not in {"http", "https"}:
            raise ValueError("Result URL must use HTTP or HTTPS")
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
            final_path = self.results_dir / f"{stable_record_id}{extension}"
            backup_path = None
            final_installed = False
            try:
                if final_path.exists():
                    backup_path = self.results_dir / (
                        f".{stable_record_id}.{uuid.uuid4().hex}.bak"
                    )
                    os.replace(final_path, backup_path)
                os.replace(temporary_path, final_path)
                temporary_path = None
                final_installed = True
                updated = self.update_record(
                    record_id,
                    remote_url=str(result_url),
                    local_path=str(final_path.resolve()),
                    local_url=f"/work/omnigen/results/{final_path.name}",
                    width=width,
                    height=height,
                    bytes=len(image_bytes),
                    status="succeeded",
                    progress=100,
                    error="",
                )
            except Exception:
                if backup_path is not None and backup_path.exists():
                    os.replace(backup_path, final_path)
                elif final_installed:
                    final_path.unlink(missing_ok=True)
                raise
            else:
                if backup_path is not None:
                    backup_path.unlink()
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
        result_keys = ("result", "results", "output", "outputs", "url", "urls")

        def find(value):
            if isinstance(value, str):
                parsed = urllib.parse.urlparse(value)
                return value if parsed.scheme.lower() in {"http", "https"} else ""
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

        payload = self.call_tool("get_generation_task", {"task_id": task_id})
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
