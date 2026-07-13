import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from omnigen_service import OmniGenService, parse_mcp_tool_payload, redact_secret


class FakeResponse:
    def __init__(self, body, content_type):
        self._body = body.encode("utf-8")
        self.headers = {"Content-Type": content_type}

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def read(self):
        return self._body


class LocalProfileTests(unittest.TestCase):
    def test_public_profile_never_returns_token(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            service.update_profile(name="本地创作者")
            service.set_token("secret-token")

            profile = service.public_profile()

            self.assertEqual(profile["name"], "本地创作者")
            self.assertTrue(profile["mcp"]["configured"])
            self.assertEqual(
                set(profile["mcp"]),
                {"configured", "validated", "model_count", "last_error"},
            )
            serialized = json.dumps(profile)
            self.assertNotIn("token", serialized.lower())
            self.assertNotIn("secret-token", serialized)

    def test_empty_name_falls_back_to_guest(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))

            profile = service.update_profile(name="   ")

            self.assertEqual(profile["name"], "游客")

    def test_settings_writes_preserve_unrelated_keys(self):
        with tempfile.TemporaryDirectory() as directory:
            settings_path = Path(directory) / "settings.json"
            settings_path.write_text(
                json.dumps({"unrelated": {"enabled": True}}), encoding="utf-8"
            )
            service = OmniGenService(Path(directory))

            service.update_profile(name="本地创作者")
            service.set_token("secret-token")
            stored = json.loads(settings_path.read_text(encoding="utf-8"))

            self.assertEqual(stored["unrelated"], {"enabled": True})
            self.assertEqual(stored["omnigen"]["token"], "secret-token")

    def test_public_profile_redacts_secret_from_persisted_error(self):
        with tempfile.TemporaryDirectory() as directory:
            settings_path = Path(directory) / "settings.json"
            settings_path.write_text(
                json.dumps(
                    {
                        "omnigen": {
                            "token": "secret-token",
                            "last_error": "request failed for secret-token",
                        }
                    }
                ),
                encoding="utf-8",
            )
            service = OmniGenService(Path(directory))

            serialized = json.dumps(service.public_profile())

            self.assertNotIn("secret-token", serialized)
            self.assertIn("[REDACTED]", serialized)


class McpPayloadTests(unittest.TestCase):
    def test_parses_structured_content(self):
        payload = {"result": {"structuredContent": {"models": [{"id": "model-a"}]}}}

        parsed = parse_mcp_tool_payload(payload)

        self.assertEqual(parsed["models"][0]["id"], "model-a")

    def test_parses_json_text_content(self):
        payload = {
            "result": {
                "content": [{"type": "text", "text": '{"status":"succeeded"}'}]
            }
        }

        parsed = parse_mcp_tool_payload(payload)

        self.assertEqual(parsed["status"], "succeeded")

    def test_redacts_token_from_error(self):
        message = redact_secret("request failed for secret-token", "secret-token")

        self.assertEqual(message, "request failed for [REDACTED]")

    def test_request_parses_http_json_response(self):
        response = FakeResponse(
            '{"jsonrpc":"2.0","id":1,"result":{"ready":true}}',
            "application/json; charset=utf-8",
        )
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            with mock.patch("urllib.request.urlopen", return_value=response):
                payload = service._request_jsonrpc("initialize", {}, "secret-token")

        self.assertEqual(payload["result"], {"ready": True})

    def test_request_parses_event_stream_data_lines(self):
        response = FakeResponse(
            "event: message\n"
            "data: {\"jsonrpc\":\"2.0\",\"id\":1}\n\n"
            "data: {\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{}}\n\n",
            "text/event-stream",
        )
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            with mock.patch("urllib.request.urlopen", return_value=response):
                payload = service._request_jsonrpc("initialize", {}, "secret-token")

        self.assertEqual(payload["result"], {})


if __name__ == "__main__":
    unittest.main()
