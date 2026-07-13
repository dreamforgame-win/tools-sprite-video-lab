import json
import os
import tempfile
import threading
import urllib.error
import urllib.request
from pathlib import Path


OMNIGEN_ENDPOINT = "https://omnigen.dianchu.cc/api/v1/mcp"
MCP_PROTOCOL_VERSION = "2024-11-05"
DEFAULT_PROFILE_NAME = "游客"
TERMINAL_TASK_STATUSES = {"succeeded", "failed", "canceled"}
MAX_MCP_RESPONSE_BYTES = 8 * 1024 * 1024


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
