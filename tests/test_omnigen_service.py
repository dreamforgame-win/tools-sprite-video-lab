import base64
import http.client
import io
import json
import os
import subprocess
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

from omnigen_service import (
    OmniGenError,
    OmniGenService,
    parse_mcp_tool_payload,
    redact_secret,
)
from project_service import ProjectError
import server as server_module


class FakeResponse:
    def __init__(self, body, content_type):
        self._body = body.encode("utf-8")
        self.headers = {"Content-Type": content_type}

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def read(self, size=-1):
        return self._body if size < 0 else self._body[:size]


class BinaryResponse:
    def __init__(self, body):
        self._body = body
        self.headers = {"Content-Type": "application/octet-stream"}
        self.read_sizes = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def read(self, size=-1):
        self.read_sizes.append(size)
        return self._body if size < 0 else self._body[:size]


def make_image_bytes(image_format="PNG", size=(3, 2)):
    output = io.BytesIO()
    Image.new("RGB", size, (12, 34, 56)).save(output, format=image_format)
    return output.getvalue()


def write_transaction_manifest(
    service,
    operation,
    transaction_id,
    record_ids,
    mappings,
    intended_final_path="",
):
    transaction_dir = service.trash_dir / f".{operation}-{transaction_id}"
    transaction_dir.mkdir()
    manifest = {
        "version": 1,
        "operation": operation,
        "transaction_id": transaction_id,
        "record_ids": record_ids,
        "mappings": [
            {
                "original_path": str(original),
                "staged_path": str(staged),
            }
            for original, staged in mappings
        ],
        "intended_final_path": str(intended_final_path or ""),
        "commit_marker": (
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
        ),
    }
    service._atomic_write_json(transaction_dir / "manifest.json", manifest)
    return transaction_dir, manifest


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

    def test_public_profile_tolerates_malformed_settings_sections(self):
        malformed_settings = (
            {"profile": [], "omnigen": "invalid"},
            {"profile": {}, "omnigen": {"model_count": "many"}},
        )
        for settings in malformed_settings:
            with self.subTest(settings=settings), tempfile.TemporaryDirectory() as directory:
                settings_path = Path(directory) / "settings.json"
                settings_path.write_text(json.dumps(settings), encoding="utf-8")
                service = OmniGenService(Path(directory))

                profile = service.public_profile()

                self.assertEqual(profile["name"], "游客")
                self.assertFalse(profile["mcp"]["configured"])
                self.assertEqual(profile["mcp"]["model_count"], 0)


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
            with mock.patch.object(
                service, "_open_mcp_request", return_value=response
            ):
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
            with mock.patch.object(
                service, "_open_mcp_request", return_value=response
            ):
                payload = service._request_jsonrpc("initialize", {}, "secret-token")

        self.assertEqual(payload["result"], {})

    def test_request_parses_multiline_event_stream_event(self):
        response = FakeResponse(
            "data: {\"jsonrpc\":\"2.0\",\n"
            "data: \"id\":1,\"result\":{\"ready\":true}}\n\n",
            "text/event-stream",
        )
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            with mock.patch.object(
                service, "_open_mcp_request", return_value=response
            ):
                payload = service._request_jsonrpc("initialize", {}, "secret-token")

        self.assertEqual(payload["result"], {"ready": True})

    def test_request_accepts_null_notification_response(self):
        response = FakeResponse("null", "application/json")
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            with mock.patch.object(
                service, "_open_mcp_request", return_value=response
            ):
                payload = service._request_jsonrpc(
                    "notifications/initialized",
                    {},
                    "secret-token",
                    notification=True,
                )

        self.assertEqual(payload, {})

    def test_request_redacts_json_construction_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            with mock.patch(
                "omnigen_service.json.dumps",
                side_effect=TypeError("cannot encode secret-token"),
            ):
                with self.assertRaises(OmniGenError) as raised:
                    service._request_jsonrpc("initialize", {}, "secret-token")

        self.assertEqual(str(raised.exception), "cannot encode [REDACTED]")

    def test_request_rejects_oversized_response(self):
        response = FakeResponse("x" * (8 * 1024 * 1024 + 1), "application/json")
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            with mock.patch.object(
                service, "_open_mcp_request", return_value=response
            ):
                with self.assertRaises(OmniGenError) as raised:
                    service._request_jsonrpc("initialize", {}, "secret-token")

        self.assertIn("response exceeded", str(raised.exception).lower())

    def test_private_mcp_endpoint_bypasses_environment_proxy(self):
        response = FakeResponse(
            '{"jsonrpc":"2.0","id":1,"result":{}}', "application/json"
        )
        direct_opener = mock.Mock()
        direct_opener.open.return_value = response
        private_address = [(None, None, None, None, ("192.168.5.118", 443))]

        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            with mock.patch(
                "omnigen_service.socket.getaddrinfo", return_value=private_address
            ), mock.patch(
                "omnigen_service.urllib.request.build_opener",
                return_value=direct_opener,
            ) as build_opener, mock.patch(
                "omnigen_service.urllib.request.urlopen"
            ) as urlopen:
                opened = service._open_mcp_request(mock.sentinel.request, timeout=60)

        self.assertIs(opened, response)
        proxy_handler = build_opener.call_args.args[0]
        self.assertEqual(proxy_handler.proxies, {})
        direct_opener.open.assert_called_once_with(mock.sentinel.request, timeout=60)
        urlopen.assert_not_called()

    def test_public_mcp_endpoint_keeps_environment_proxy(self):
        response = FakeResponse(
            '{"jsonrpc":"2.0","id":1,"result":{}}', "application/json"
        )
        public_address = [(None, None, None, None, ("8.8.8.8", 443))]

        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            with mock.patch(
                "omnigen_service.socket.getaddrinfo", return_value=public_address
            ), mock.patch(
                "omnigen_service.urllib.request.build_opener"
            ) as build_opener, mock.patch(
                "omnigen_service.urllib.request.urlopen", return_value=response
            ) as urlopen:
                opened = service._open_mcp_request(mock.sentinel.request, timeout=60)

        self.assertIs(opened, response)
        urlopen.assert_called_once_with(mock.sentinel.request, timeout=60)
        build_opener.assert_not_called()


class McpClientTests(unittest.TestCase):
    def test_call_tool_sends_initialize_notification_then_tool_call(self):
        responses = iter(
            (
                FakeResponse(
                    '{"jsonrpc":"2.0","id":1,"result":{}}',
                    "application/json",
                ),
                FakeResponse("", "application/json"),
                FakeResponse(
                    '{"jsonrpc":"2.0","id":1,"result":'
                    '{"structuredContent":{"status":"succeeded"}}}',
                    "application/json",
                ),
            )
        )
        requests = []

        def open_request(request, timeout):
            requests.append((json.loads(request.data), timeout))
            return next(responses)

        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            service.set_token("secret-token")
            with mock.patch.object(
                service, "_open_mcp_request", side_effect=open_request
            ):
                result = service.call_tool("generate_image", {"prompt": "pixel art"})

        self.assertEqual(result, {"status": "succeeded"})
        self.assertEqual(
            [payload for payload, _timeout in requests],
            [
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "initialize",
                    "params": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {},
                        "clientInfo": {
                            "name": "sprite-video-lab",
                            "version": "1.0",
                        },
                    },
                },
                {
                    "jsonrpc": "2.0",
                    "method": "notifications/initialized",
                    "params": {},
                },
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "tools/call",
                    "params": {
                        "name": "generate_image",
                        "arguments": {"prompt": "pixel art"},
                    },
                },
            ],
        )
        self.assertEqual([timeout for _payload, timeout in requests], [60, 60, 60])

    def test_call_tool_redacts_transport_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            service.set_token("secret-token")
            with mock.patch.object(
                service,
                "_request_jsonrpc",
                side_effect=(
                    {"result": {}},
                    {},
                    OmniGenError("request failed for secret-token"),
                ),
            ):
                with self.assertRaises(OmniGenError) as raised:
                    service.call_tool("generate_image", {})

        self.assertEqual(str(raised.exception), "request failed for [REDACTED]")


class OmniGenOperationsTests(unittest.TestCase):
    def test_normalizes_reference_image_limit(self):
        payload = {
            "models": [
                {
                    "id": "image-model",
                    "modality": "image",
                    "capabilities": {"max_reference_images": 4},
                }
            ]
        }
        models = OmniGenService._normalize_image_models(payload)
        self.assertEqual(models[0]["max_reference_images"], 4)

    def test_normalizes_reference_image_limit_aliases(self):
        for key in ("reference_image_limit", "max_input_images"):
            with self.subTest(key=key):
                models = OmniGenService._normalize_image_models(
                    {"models": [{"id": "image-model", key: 3}]}
                )
                self.assertEqual(models[0]["max_reference_images"], 3)

    def test_connection_updates_only_omnigen_validation_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            settings_path = Path(directory) / "settings.json"
            settings_path.write_text(
                json.dumps(
                    {
                        "export_root": "D:/exports",
                        "profile": {"name": "Creator"},
                        "omnigen": {"token": "secret-token", "custom": "keep"},
                    }
                ),
                encoding="utf-8",
            )
            service = OmniGenService(Path(directory))
            models_payload = {
                "models": [
                    {"id": "image-a", "modality": "image"},
                    {"id": "video-a", "modality": "video"},
                ]
            }

            with mock.patch.object(
                service, "call_tool", return_value=models_payload
            ) as call_tool:
                profile = service.test_connection()

            call_tool.assert_called_once_with(
                "list_generation_models", {"modality": "image"}
            )
            stored = json.loads(settings_path.read_text(encoding="utf-8"))
            self.assertEqual(stored["export_root"], "D:/exports")
            self.assertEqual(stored["profile"], {"name": "Creator"})
            self.assertEqual(stored["omnigen"]["token"], "secret-token")
            self.assertEqual(stored["omnigen"]["custom"], "keep")
            self.assertTrue(stored["omnigen"]["validated"])
            self.assertEqual(stored["omnigen"]["model_count"], 1)
            self.assertIsNone(stored["omnigen"]["last_error"])
            self.assertNotIn("secret-token", json.dumps(profile))

    def test_connection_failure_persists_redacted_error_and_raises(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            service.set_token("secret-token")
            settings = json.loads(service.settings_path.read_text(encoding="utf-8"))
            settings["omnigen"]["model_count"] = 4
            service.settings_path.write_text(json.dumps(settings), encoding="utf-8")

            with mock.patch.object(
                service,
                "call_tool",
                side_effect=OmniGenError("rejected secret-token"),
            ):
                with self.assertRaises(OmniGenError) as raised:
                    service.test_connection()

            settings = json.loads(service.settings_path.read_text(encoding="utf-8"))
            self.assertFalse(settings["omnigen"]["validated"])
            self.assertEqual(settings["omnigen"]["model_count"], 0)
            self.assertEqual(
                settings["omnigen"]["last_error"], "rejected [REDACTED]"
            )
            self.assertNotIn("secret-token", str(raised.exception))
            self.assertNotIn("secret-token", json.dumps(service.public_profile()))

    def test_list_image_models_normalizes_supported_provider_envelopes(self):
        model = {
            "id": "image-a",
            "name": "Image A",
            "modality": "image",
            "pricing": {"credits": 2},
            "capabilities": {"seed": True},
            "supported_aspect_ratios": ["1:1", "16:9"],
            "resolutions": ["1024x1024"],
        }
        for envelope in ("models", "items", "data"):
            with self.subTest(envelope=envelope), tempfile.TemporaryDirectory() as directory:
                service = OmniGenService(Path(directory))
                with mock.patch.object(
                    service,
                    "call_tool",
                    return_value={
                        envelope: [model, {"id": "video-a", "modality": "video"}]
                    },
                ) as call_tool:
                    models = service.list_image_models()

                call_tool.assert_called_once_with(
                    "list_generation_models", {"modality": "image"}
                )
                self.assertEqual(
                    models,
                    [
                        {
                            "id": "image-a",
                            "display_name": "Image A",
                            "modality": "image",
                            "pricing": {"credits": 2},
                            "capabilities": {"seed": True},
                            "supported_aspect_ratios": ["1:1", "16:9"],
                            "supported_resolutions": ["1024x1024"],
                            "max_reference_images": 0,
                        }
                    ],
                )

    def test_submit_image_updates_the_persisted_record_after_remote_submission(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))

            def submit(_name, _arguments):
                history_during_call = service.list_history()
                self.assertEqual(len(history_during_call), 1)
                self.assertEqual(history_during_call[0]["status"], "submitting")
                return {"task_id": "task-1", "status": "running"}

            with mock.patch.object(service, "call_tool", side_effect=submit) as call_tool:
                record = service.submit_image(
                    "pixel hero", "image-a", {"aspect_ratio": "1:1"}
                )

            call_tool.assert_called_once_with(
                "generate_image",
                {
                    "model": "image-a",
                    "prompt": "pixel hero",
                    "params": {"aspect_ratio": "1:1"},
                },
            )
            self.assertEqual(record["task_id"], "task-1")
            self.assertEqual(record["status"], "running")
            history = service.list_history()
            self.assertEqual(len(history), 1)
            self.assertEqual(history[0]["id"], record["id"])

    def test_submit_image_adds_selected_color_only_to_remote_prompt(self):
        expected_backgrounds = {
            "magenta": ("#FF00FF", "magenta"),
            "green_screen": ("#00FF00", "chroma key green"),
            "white": ("#FFFFFF", "pure white"),
            "black": ("#000000", "pure black"),
        }
        for background, expected_fragments in expected_backgrounds.items():
            with self.subTest(background=background), tempfile.TemporaryDirectory() as directory:
                service = OmniGenService(Path(directory))
                with mock.patch.object(
                    service,
                    "call_tool",
                    return_value={"task_id": f"task-{background}"},
                ) as call_tool:
                    record = service.submit_image(
                        "pixel hero",
                        "image-a",
                        {"background": background},
                    )

                remote_prompt = call_tool.call_args.args[1]["prompt"]
                self.assertTrue(remote_prompt.startswith("pixel hero\n\n"))
                for fragment in expected_fragments:
                    self.assertIn(fragment, remote_prompt)
                self.assertEqual(record["prompt"], "pixel hero")
                self.assertEqual(service.list_history()[0]["prompt"], "pixel hero")

        self.assertEqual(
            OmniGenService._remote_prompt("pixel hero", "default"),
            "pixel hero",
        )

    def test_submit_image_uploads_local_references_and_sends_asset_inputs(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            reference_path = service.work_dir / "references" / "hero.png"
            reference_path.parent.mkdir()
            reference_bytes = make_image_bytes()
            reference_path.write_bytes(reference_bytes)

            def call_tool(name, arguments):
                if name == "upload_asset":
                    self.assertEqual(arguments["filename"], "hero.png")
                    self.assertEqual(arguments["mime_type"], "image/png")
                    self.assertEqual(arguments["role"], "reference")
                    self.assertEqual(arguments["kind"], "image")
                    self.assertEqual(
                        base64.b64decode(arguments["data_base64"]),
                        reference_bytes,
                    )
                    return {"asset_id": "asset-uploaded"}
                if name == "generate_image":
                    return {"task_id": "task-with-reference"}
                self.fail(f"Unexpected tool call: {name}")

            with mock.patch.object(
                service, "call_tool", side_effect=call_tool
            ) as mocked_call:
                record = service.submit_image(
                    "pixel hero",
                    "image-a",
                    {
                        "aspect_ratio": "1:1",
                        "reference_images": ["references/hero.png"],
                    },
                )

            self.assertEqual(mocked_call.call_count, 2)
            self.assertEqual(
                mocked_call.call_args_list[1],
                mock.call(
                    "generate_image",
                    {
                        "model": "image-a",
                        "prompt": "pixel hero",
                        "inputs": [
                            {
                                "type": "asset_id",
                                "asset_id": "asset-uploaded",
                                "role": "reference",
                            }
                        ],
                        "params": {"aspect_ratio": "1:1"},
                    },
                ),
            )
            self.assertEqual(
                record["params"]["reference_images"],
                ["references/hero.png"],
            )
            self.assertEqual(
                record["reference_assets"][0]["source"],
                "mcp-upload",
            )
            self.assertEqual(
                record["reference_assets"][0]["asset_id"],
                "asset-uploaded",
            )

    def test_submit_image_reuses_generated_result_asset_without_uploading(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            generated_path = service.results_dir / "generated.png"
            generated_path.write_bytes(make_image_bytes())
            source_record = service.create_record("source", "image-a", {})
            service.update_record(
                source_record["id"],
                status="succeeded",
                local_path=str(generated_path),
                result_asset_id="asset-generated",
            )

            with mock.patch.object(
                service,
                "call_tool",
                return_value={"task_id": "task-reusing-generated"},
            ) as call_tool:
                record = service.submit_image(
                    "variation",
                    "image-a",
                    {"reference_images": ["omnigen/results/generated.png"]},
                )

            call_tool.assert_called_once_with(
                "generate_image",
                {
                    "model": "image-a",
                    "prompt": "variation",
                    "inputs": [
                        {
                            "type": "asset_id",
                            "asset_id": "asset-generated",
                            "role": "reference",
                        }
                    ],
                    "params": {},
                },
            )
            self.assertEqual(
                record["reference_assets"][0]["source"],
                "mcp-generate",
            )
            self.assertEqual(
                record["reference_assets"][0]["record_id"],
                source_record["id"],
            )

    def test_submit_image_uses_style_guide_remote_asset_without_uploading(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            with mock.patch.object(
                service,
                "call_tool",
                return_value={"task_id": "task-style-guide"},
            ) as call_tool:
                record = service.submit_image(
                    "guided hero",
                    "image-a",
                    {
                        "reference_images": [
                            {
                                "relative_path": "production/images/hero.png",
                                "remote_asset_id": "asset-style-guide",
                                "content_sha256": "abc123",
                                "source_record_id": "record-source",
                            }
                        ]
                    },
                )

            call_tool.assert_called_once_with(
                "generate_image",
                {
                    "model": "image-a",
                    "prompt": "guided hero",
                    "inputs": [
                        {
                            "type": "asset_id",
                            "asset_id": "asset-style-guide",
                            "role": "reference",
                        }
                    ],
                    "params": {},
                },
            )
            self.assertEqual(
                record["reference_assets"][0]["source"],
                "style-guide-remote",
            )

    def test_submit_image_reuses_cached_uploaded_reference_asset(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            reference_path = service.work_dir / "references" / "hero.png"
            reference_path.parent.mkdir()
            reference_path.write_bytes(make_image_bytes())
            upload_count = 0

            def call_tool(name, _arguments):
                nonlocal upload_count
                if name == "upload_asset":
                    upload_count += 1
                    return {"asset_id": "asset-uploaded"}
                if name == "generate_image":
                    return {"task_id": f"task-{upload_count}"}
                self.fail(f"Unexpected tool call: {name}")

            with mock.patch.object(
                service, "call_tool", side_effect=call_tool
            ):
                first = service.submit_image(
                    "first",
                    "image-a",
                    {"reference_images": ["references/hero.png"]},
                )
                second = service.submit_image(
                    "second",
                    "image-a",
                    {"reference_images": ["references/hero.png"]},
                )

            self.assertEqual(upload_count, 1)
            self.assertTrue(service.reference_assets_path.is_file())
            self.assertEqual(
                first["reference_assets"][0]["asset_id"],
                "asset-uploaded",
            )
            self.assertEqual(
                second["reference_assets"][0]["asset_id"],
                "asset-uploaded",
            )

    def test_submit_image_recovers_legacy_generated_result_asset_from_task(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            generated_path = service.results_dir / "legacy.png"
            generated_path.write_bytes(make_image_bytes())
            source_record = service.create_record("source", "image-a", {})
            service.update_record(
                source_record["id"],
                task_id="legacy-task",
                status="succeeded",
                local_path=str(generated_path),
            )

            def call_tool(name, arguments):
                if name == "get_generation_task":
                    return {
                        "task_id": arguments["task_id"],
                        "status": "succeeded",
                        "result_asset_id": "asset-recovered",
                    }
                if name == "generate_image":
                    return {"task_id": "new-task"}
                self.fail(f"Unexpected tool call: {name}")

            with mock.patch.object(
                service, "call_tool", side_effect=call_tool
            ) as mocked_call:
                record = service.submit_image(
                    "variation",
                    "image-a",
                    {"reference_images": ["omnigen/results/legacy.png"]},
                )

            self.assertEqual(
                [call.args[0] for call in mocked_call.call_args_list],
                ["get_generation_task", "generate_image"],
            )
            self.assertEqual(
                service.find_record(source_record["id"])["result_asset_id"],
                "asset-recovered",
            )
            self.assertEqual(
                record["reference_assets"][0]["asset_id"],
                "asset-recovered",
            )

    def test_submit_image_rejects_reference_outside_project(self):
        with tempfile.TemporaryDirectory() as directory, tempfile.TemporaryDirectory() as outside:
            service = OmniGenService(Path(directory))
            outside_path = Path(outside) / "reference.png"
            outside_path.write_bytes(make_image_bytes())

            with mock.patch.object(service, "call_tool") as call_tool:
                with self.assertRaisesRegex(
                    ValueError, "inside the project"
                ):
                    service.submit_image(
                        "pixel hero",
                        "image-a",
                        {"reference_images": [str(outside_path)]},
                    )

            call_tool.assert_not_called()
            record = service.list_history()[0]
            self.assertEqual(record["status"], "failed")
            self.assertIn("inside the project", record["error"])

    def test_submit_image_failure_marks_the_same_record_failed(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            service.set_token("secret-token")

            with mock.patch.object(
                service,
                "call_tool",
                side_effect=OmniGenError("failed with secret-token"),
            ):
                with self.assertRaises(OmniGenError) as raised:
                    service.submit_image("pixel hero", "image-a", {})

            history = service.list_history()
            self.assertEqual(len(history), 1)
            self.assertEqual(history[0]["status"], "failed")
            self.assertEqual(history[0]["error"], "failed with [REDACTED]")
            self.assertNotIn("secret-token", str(raised.exception))

    def test_submit_image_validates_before_creating_history(self):
        invalid_values = (
            ("", "image-a", {}),
            ("prompt", "", {}),
            ("prompt", "image-a", []),
        )
        for prompt, model, params in invalid_values:
            with self.subTest(prompt=prompt, model=model, params=params), tempfile.TemporaryDirectory() as directory:
                service = OmniGenService(Path(directory))

                with self.assertRaises(ValueError):
                    service.submit_image(prompt, model, params)

                self.assertEqual(service.list_history(), [])


class ProfileAvatarTests(unittest.TestCase):
    @staticmethod
    def data_url(image_format="PNG", size=(512, 128), mode="RGBA"):
        output = io.BytesIO()
        Image.new(mode, size, (12, 34, 56, 128)).save(
            output, format=image_format
        )
        mime = {
            "PNG": "image/png",
            "JPEG": "image/jpeg",
            "WEBP": "image/webp",
        }[image_format]
        return f"data:{mime};base64,{base64.b64encode(output.getvalue()).decode('ascii')}"

    def test_valid_avatar_is_resized_atomically_and_exposed_in_profile(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))

            profile = service.update_profile(
                "Creator", avatar_data_url=self.data_url()
            )

            avatar_path = service.profile_dir / "avatar.png"
            self.assertTrue(avatar_path.is_file())
            with Image.open(avatar_path) as avatar:
                self.assertEqual(avatar.format, "PNG")
                self.assertEqual(avatar.size, (256, 64))
                self.assertEqual(avatar.mode, "RGBA")
            self.assertEqual(profile["avatar_url"], "/work/profile/avatar.png")
            self.assertEqual(
                service.public_profile()["avatar_url"],
                "/work/profile/avatar.png",
            )
            self.assertEqual(list(service.profile_dir.glob(".*.tmp")), [])

    def test_small_avatar_is_not_enlarged(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))

            service.update_profile(
                "Creator", avatar_data_url=self.data_url(size=(32, 16))
            )

            with Image.open(service.profile_dir / "avatar.png") as avatar:
                self.assertEqual(avatar.size, (32, 16))

    def test_invalid_avatar_payloads_are_rejected_without_changing_profile(self):
        invalid_payloads = {
            "unsupported type": "data:image/gif;base64,R0lGODlh",
            "malformed base64": "data:image/png;base64,not!base64",
            "nonimage": (
                "data:image/png;base64,"
                + base64.b64encode(b"not an image").decode("ascii")
            ),
            "oversize": (
                "data:image/png;base64,"
                + base64.b64encode(b"x" * (5 * 1024 * 1024 + 1)).decode("ascii")
            ),
        }
        for label, payload in invalid_payloads.items():
            with self.subTest(label=label), tempfile.TemporaryDirectory() as directory:
                service = OmniGenService(Path(directory))
                original = service.update_profile("Original")

                with self.assertRaises(ValueError):
                    service.update_profile("Changed", avatar_data_url=payload)

                self.assertEqual(service.public_profile(), original)
                self.assertFalse((service.profile_dir / "avatar.png").exists())

    def test_omitted_or_empty_avatar_preserves_existing_avatar(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            service.update_profile("Creator", avatar_data_url=self.data_url())
            original_bytes = (service.profile_dir / "avatar.png").read_bytes()

            service.update_profile("Renamed")
            profile = service.update_profile("Renamed again", avatar_data_url="")

            self.assertEqual(
                (service.profile_dir / "avatar.png").read_bytes(), original_bytes
            )
            self.assertEqual(profile["avatar_url"], "/work/profile/avatar.png")


class ServerApiTests(unittest.TestCase):
    def setUp(self):
        self.service = mock.Mock()
        self.service._token.return_value = "secret-token"
        self.service.public_profile.return_value = {
            "name": "Creator",
            "avatar_url": "",
            "mcp": {"configured": True},
        }
        self.service.list_image_models.return_value = [{"id": "image-a"}]
        self.service.list_history.return_value = [{"id": "record-1"}]
        self.service.refresh_task.return_value = {
            "id": "record-1",
            "status": "running",
        }
        self.service.update_profile.return_value = (
            self.service.public_profile.return_value
        )
        self.service.set_token.return_value = self.service.public_profile.return_value
        self.service.clear_token.return_value = (
            self.service.public_profile.return_value
        )
        self.service.test_connection.return_value = (
            self.service.public_profile.return_value
        )
        self.service.submit_image.return_value = {
            "id": "record-1",
            "status": "queued",
        }
        self.service.image_model_capability.return_value = {
            "id": "image-a",
            "max_reference_images": 4,
        }
        self.service.delete_records.return_value = {"deleted_ids": ["record-1"]}
        self.patch = mock.patch.object(
            server_module, "GENERATION_PROVIDER", self.service, create=True
        )
        self.patch.start()
        self.project_service_patch = mock.patch.object(
            server_module,
            "project_generation_service",
            return_value=self.service,
        )
        self.project_service_patch.start()
        self.generation_target_patch = mock.patch.object(
            server_module.PROJECT_SERVICE,
            "resolve_generation_target",
            return_value={
                "id": "asset-character-test",
                "name": "测试角色资产",
                "type": "asset",
                "asset_type": "character",
                "parent_id": "",
            },
        )
        self.generation_target_patch.start()
        self.guide_service = mock.Mock()
        self.guide_service.capability_state.return_value = {
            "manual_authoring": True,
            "automatic_analysis": False,
        }
        self.guide_service.list_packages.return_value = [{"id": "guide-one"}]
        self.guide_service.get_package.return_value = {"id": "guide-one"}
        self.guide_service.get_draft.return_value = {"package_id": "guide-one"}
        self.guide_service.get_version.return_value = {"id": "version-one"}
        self.guide_service.list_versions.return_value = [{"id": "version-one"}]
        self.guide_service.create_draft.return_value = {"id": "guide-one"}
        self.guide_service.publish.return_value = {"id": "version-one"}
        self.guide_service.set_default.return_value = {"id": "guide-one"}
        self.guide_service.set_confirmed_version.return_value = {
            "id": "guide-one",
            "confirmed_version_id": "version-one",
        }
        self.guide_service.compile_preview.return_value = {"can_continue": True}
        self.guide_service.compile_for_generation.return_value = {
            "final_prompt": "hero, guided pixel art",
            "final_negative_prompt": "photorealistic",
            "reference_paths": [
                {
                    "relative_path": "production/images/guide.png",
                    "remote_asset_id": "asset-guide",
                }
            ],
            "warnings": [],
            "blocking_warnings": [],
            "can_continue": True,
            "budget": {"reference_limit": 2},
            "snapshot": {
                "style_guide_package_id": "guide-one",
                "style_guide_version_id": "version-one",
                "style_guide_mode": "balanced",
                "style_guide_module_types": ["character"],
                "style_guide_reference_snapshot": [],
                "style_guide_prompt_snapshot": "hero, guided pixel art",
                "style_guide_overrides": {},
            },
        }
        self.guide_service.save_draft.return_value = {"package_id": "guide-one"}
        self.guide_patch = mock.patch.object(
            server_module, "STYLE_GUIDE_SERVICE", self.guide_service, create=True
        )
        self.guide_patch.start()
        self.visual_service = mock.Mock()
        self.visual_service.list_runs.return_value = [
            {"id": "visualrun-one", "status": "running"}
        ]
        self.visual_service.get_run.return_value = {
            "id": "visualrun-one",
            "status": "running",
        }
        self.visual_service.cancel_run.return_value = {
            "id": "visualrun-one",
            "status": "canceling",
        }
        self.visual_service.create_run.return_value = {
            "id": "visualrun-one",
            "status": "running",
        }
        self.visual_service.refresh_run.return_value = {
            "id": "visualrun-one",
            "status": "running",
        }
        self.visual_service.retry_node.return_value = {
            "id": "visualrun-one",
            "status": "running",
        }
        self.visual_service.apply_run.return_value = {
            "visual_run": {"id": "visualrun-one", "status": "applied"},
            "draft": {"package_id": "guide-one"},
        }
        self.visual_patch = mock.patch.object(
            server_module,
            "STYLE_GUIDE_VISUAL_SERVICE",
            self.visual_service,
            create=True,
        )
        self.visual_patch.start()
        self.httpd = server_module.ThreadingHTTPServer(
            ("127.0.0.1", 0), server_module.AppHandler
        )
        self.httpd.daemon_threads = True
        self.httpd.block_on_close = False
        self.thread = threading.Thread(
            target=self.httpd.serve_forever,
            kwargs={"poll_interval": 0.05},
            daemon=True,
        )
        self.thread.start()

    def tearDown(self):
        shutdown_thread = threading.Thread(
            target=self.httpd.shutdown, daemon=True
        )
        shutdown_thread.start()
        shutdown_thread.join(timeout=2)
        self.httpd.server_close()
        self.thread.join(timeout=2)
        self.patch.stop()
        self.project_service_patch.stop()
        self.generation_target_patch.stop()
        self.guide_patch.stop()
        self.visual_patch.stop()
        self.assertFalse(shutdown_thread.is_alive(), "HTTP shutdown timed out")
        self.assertFalse(self.thread.is_alive(), "HTTP server thread did not exit")

    def request(self, method, path, payload=None):
        connection = http.client.HTTPConnection(
            "127.0.0.1", self.httpd.server_address[1], timeout=2
        )
        body = None if payload is None else json.dumps(payload)
        headers = {"Content-Type": "application/json"} if body is not None else {}
        try:
            connection.request(method, path, body=body, headers=headers)
            response = connection.getresponse()
            raw = response.read()
            content_type = response.getheader("Content-Type", "")
        finally:
            connection.close()
        parsed = json.loads(raw) if content_type.startswith("application/json") else None
        return response.status, parsed

    def test_get_routes_expose_profile_models_history_and_task(self):
        cases = (
            (
                "/api/local-profile",
                "profile",
                self.service.public_profile.return_value,
            ),
            (
                "/api/omnigen/models",
                "models",
                self.service.list_image_models.return_value,
            ),
            (
                "/api/omnigen/history?project_id=default",
                "history",
                self.service.list_history.return_value,
            ),
            (
                "/api/omnigen/task?id=record-1&project_id=default",
                "record",
                self.service.refresh_task.return_value,
            ),
        )
        for path, key, expected in cases:
            with self.subTest(path=path):
                status, payload = self.request("GET", path)
                self.assertEqual(status, 200)
                self.assertTrue(payload["ok"])
                self.assertEqual(payload[key], expected)
        self.service.refresh_task.assert_called_once_with("record-1")

    def test_style_guide_routes_expose_manual_core_operations(self):
        status, payload = self.request("GET", "/api/v1/projects/default/style-guides")
        self.assertEqual(status, 200)
        self.assertEqual(payload["style_guides"], [{"id": "guide-one"}])

        status, payload = self.request(
            "POST",
            "/api/v1/projects/default/styles/style-one/style-guide/draft",
            {},
        )
        self.assertEqual(status, 201)
        self.assertEqual(payload["style_guide"]["id"], "guide-one")

        status, payload = self.request(
            "POST",
            "/api/v1/projects/default/style-guides/guide-one/compile-preview",
            {"model": "image-a", "asset_type": "character"},
        )
        self.assertEqual(status, 200)
        self.assertTrue(payload["compiled"]["can_continue"])
        compile_request = self.guide_service.compile_preview.call_args.kwargs[
            "request"
        ]
        self.assertEqual(compile_request["model_reference_limit"], 4)

        status, payload = self.request(
            "PATCH",
            "/api/v1/projects/default/style-guides/guide-one/draft",
            {"draft": {"package_id": "guide-one"}},
        )
        self.assertEqual(status, 200)
        self.assertEqual(payload["draft"]["package_id"], "guide-one")

        status, payload = self.request(
            "GET",
            "/api/v1/projects/default/style-guides/guide-one/versions",
        )
        self.assertEqual(status, 200)
        self.assertEqual(payload["versions"], [{"id": "version-one"}])

        status, payload = self.request(
            "POST",
            "/api/v1/projects/default/style-guides/guide-one/confirm-version",
            {"version_id": "version-one"},
        )
        self.assertEqual(status, 200)
        self.assertEqual(payload["style_guide"]["confirmed_version_id"], "version-one")
        self.guide_service.set_confirmed_version.assert_called_once_with(
            "default", "guide-one", "version-one"
        )

    def test_create_visual_run_uses_project_generation_service(self):
        status, payload = self.request(
            "POST",
            "/api/v1/projects/default/style-guides/guide-one/visual-runs",
            {"mode": "overall", "preview_only": True},
        )
        self.assertEqual(status, 201)
        self.assertEqual(payload["visual_run"]["id"], "visualrun-one")
        self.visual_service.create_run.assert_called_once_with(
            "default",
            "guide-one",
            {"mode": "overall", "preview_only": True},
            generation_service=self.service,
        )

    def test_list_visual_runs_supports_active_filter(self):
        status, payload = self.request(
            "GET",
            "/api/v1/projects/default/style-guides/guide-one/visual-runs?active=true",
        )
        self.assertEqual(status, 200)
        self.assertEqual(payload["visual_runs"][0]["id"], "visualrun-one")
        self.visual_service.list_runs.assert_called_once_with("default", "guide-one")

    def test_get_visual_run_advances_remote_tasks(self):
        status, payload = self.request(
            "GET",
            "/api/v1/projects/default/style-guides/guide-one/visual-runs/visualrun-one",
        )
        self.assertEqual(status, 200)
        self.assertEqual(payload["visual_run"]["id"], "visualrun-one")
        self.visual_service.refresh_run.assert_called_once_with(
            "default",
            "guide-one",
            "visualrun-one",
            generation_service=self.service,
        )

    def test_retry_visual_node_delegates_exact_node(self):
        status, payload = self.request(
            "POST",
            "/api/v1/projects/default/style-guides/guide-one/visual-runs/visualrun-one/nodes/ui_hud/retry",
            {},
        )
        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])
        self.visual_service.retry_node.assert_called_once_with(
            "default",
            "guide-one",
            "visualrun-one",
            "ui_hud",
            generation_service=self.service,
        )

    def test_apply_visual_run_returns_updated_draft(self):
        status, payload = self.request(
            "POST",
            "/api/v1/projects/default/style-guides/guide-one/visual-runs/visualrun-one/apply",
            {},
        )
        self.assertEqual(status, 200)
        self.assertEqual(payload["visual_run"]["status"], "applied")
        self.assertEqual(payload["draft"]["package_id"], "guide-one")

    def test_cancel_visual_run_delegates_persistent_soft_cancel(self):
        status, payload = self.request(
            "POST",
            "/api/v1/projects/default/style-guides/guide-one/visual-runs/visualrun-one/cancel",
            {},
        )
        self.assertEqual(status, 200)
        self.assertEqual(payload["visual_run"]["status"], "canceling")
        self.visual_service.cancel_run.assert_called_once_with(
            "default", "guide-one", "visualrun-one"
        )

    def test_missing_visual_run_returns_400_without_leaking_paths(self):
        self.visual_service.refresh_run.side_effect = ProjectError(
            "Visual guide run does not exist: missing"
        )
        status, payload = self.request(
            "GET",
            "/api/v1/projects/default/style-guides/guide-one/visual-runs/missing",
        )
        self.assertEqual(status, 400)
        self.assertNotIn("F:\\", payload["error"])

    def test_visual_run_remote_asset_reaches_generate_image_without_upload(self):
        status, _payload = self.request(
            "POST",
            "/api/v1/projects/default/style-guides/guide-one/visual-runs",
            {
                "reference_sources": [
                    {"kind": "generation_result", "id": "record-1"}
                ]
            },
        )
        self.assertEqual(status, 201)
        request_payload = self.visual_service.create_run.call_args.args[2]
        self.assertEqual(request_payload["reference_sources"][0]["id"], "record-1")

    def test_generation_compiles_exact_style_guide_version_before_submit(self):
        status, payload = self.request(
            "POST",
            "/api/v1/generation/tasks",
            {
                "project_id": "default",
                "asset_node_id": "asset-character-test",
                "prompt": "hero",
                "model": "image-a",
                "params": {
                    "negative_prompt": "text",
                    "reference_images": ["references/user.png"],
                },
                "style_guide": {
                    "package_id": "guide-one",
                    "version_id": "version-one",
                    "mode": "balanced",
                    "style_strength": 70,
                    "module_types": ["character"],
                    "reference_ids": None,
                    "conflict_resolutions": {},
                },
            },
        )
        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])
        self.guide_service.compile_for_generation.assert_called_once()
        call = self.service.submit_image.call_args
        self.assertEqual(call.args[0], "hero, guided pixel art")
        self.assertEqual(call.args[2]["negative_prompt"], "photorealistic")
        self.assertEqual(len(call.args[2]["reference_images"]), 2)
        self.assertEqual(
            call.kwargs["context"]["style_guide_version_id"], "version-one"
        )

    def test_generation_rejects_blocking_style_guide_compile(self):
        self.guide_service.compile_for_generation.return_value = {
            "warnings": [{"code": "missing_reference"}],
            "blocking_warnings": [{"code": "missing_reference"}],
            "can_continue": False,
        }
        status, payload = self.request(
            "POST",
            "/api/v1/generation/tasks",
            {
                "project_id": "default",
                "asset_node_id": "asset-character-test",
                "prompt": "hero",
                "model": "image-a",
                "params": {},
                "style_guide": {
                    "package_id": "guide-one",
                    "version_id": "version-one",
                    "mode": "precision",
                },
            },
        )
        self.assertEqual(status, 400)
        self.assertFalse(payload["ok"])
        self.assertEqual(payload["blocking_warnings"][0]["code"], "missing_reference")
        self.service.submit_image.assert_not_called()

    def test_post_and_delete_routes_delegate_structured_payloads(self):
        cases = (
            (
                "/api/local-profile",
                {
                    "name": "Renamed",
                    "avatar_data_url": "data:image/png;base64,AA==",
                },
                "profile",
            ),
            ("/api/omnigen/token", {"token": "new-token"}, "profile"),
            ("/api/omnigen/test", {}, "profile"),
            (
                "/api/omnigen/generate",
                {
                    "project_id": "default",
                    "asset_node_id": "asset-character-test",
                    "prompt": "hero",
                    "model": "image-a",
                    "params": {"seed": 7},
                },
                "record",
            ),
            (
                "/api/omnigen/history/delete",
                {"project_id": "default", "ids": ["record-1"], "delete_files": True},
                "result",
            ),
        )
        for path, request_payload, response_key in cases:
            with self.subTest(path=path):
                status, response_payload = self.request(
                    "POST", path, request_payload
                )
                self.assertEqual(status, 200)
                self.assertTrue(response_payload["ok"])
                self.assertIn(response_key, response_payload)

        self.service.update_profile.assert_called_once_with(
            "Renamed", avatar_data_url="data:image/png;base64,AA=="
        )
        self.service.set_token.assert_called_once_with("new-token")
        self.service.test_connection.assert_called_once_with()
        self.service.submit_image.assert_called_once_with(
            "hero",
            "image-a",
            {"seed": 7},
            context={
                "project_id": "default",
                "asset_node_id": "asset-character-test",
                "workflow_run_id": None,
                "actor": "user",
            },
        )
        self.service.delete_records.assert_called_once_with(
            ["record-1"], delete_files=True
        )

        status, payload = self.request("DELETE", "/api/omnigen/token")
        self.assertEqual(status, 200)
        self.assertEqual(payload["profile"], self.service.clear_token.return_value)
        self.service.clear_token.assert_called_once_with()

    def test_refresh_history_continues_after_safe_per_record_errors(self):
        records = [
            {"id": "submitting", "status": "submitting"},
            {"id": "queued", "status": "queued"},
            {"id": "running", "status": "running"},
            {"id": "done", "status": "succeeded"},
        ]
        updated = [
            {"id": "submitting", "status": "submitting"},
            {"id": "queued", "status": "failed"},
            {"id": "running", "status": "succeeded"},
            {"id": "done", "status": "succeeded"},
        ]
        self.service.list_history.side_effect = [records, updated]

        def refresh(record_id):
            if record_id == "queued":
                raise OmniGenError("failed secret-token")
            return {"id": record_id}

        self.service.refresh_task.side_effect = refresh

        status, payload = self.request(
            "POST", "/api/omnigen/history/refresh", {"project_id": "default"}
        )

        self.assertEqual(status, 200)
        self.assertEqual(payload["history"], updated)
        self.assertEqual(
            payload["errors"],
            [{"id": "queued", "error": "failed [REDACTED]"}],
        )
        self.assertEqual(
            [call.args[0] for call in self.service.refresh_task.call_args_list],
            ["submitting", "queued", "running"],
        )
        self.assertNotIn("secret-token", json.dumps(payload))

    def test_removed_and_unknown_routes_remain_404_and_errors_are_redacted(self):
        status, _payload = self.request("POST", "/api/one-click-login", {})
        self.assertEqual(status, 404)

        self.service.test_connection.side_effect = OmniGenError(
            "token secret-token rejected"
        )
        status, payload = self.request("POST", "/api/omnigen/test", {})

        self.assertEqual(status, 400)
        self.assertEqual(payload["error"], "token [REDACTED] rejected")


class HistoryStoreTests(unittest.TestCase):
    def test_create_record_persists_complete_image_record(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))

            record = service.create_record(
                "prompt", "model-a", {"aspect_ratio": "1:1"}
            )

            stored = json.loads(service.history_path.read_text(encoding="utf-8"))
            self.assertEqual(stored, {"records": [record]})
            self.assertEqual(record["media_type"], "image")
            self.assertEqual(record["prompt"], "prompt")
            self.assertEqual(record["model"], "model-a")
            self.assertEqual(record["params"], {"aspect_ratio": "1:1"})
            self.assertEqual(record["status"], "submitting")
            self.assertEqual(record["progress"], 0)
            self.assertEqual(record["width"], 0)
            self.assertEqual(record["height"], 0)
            self.assertEqual(record["bytes"], 0)
            self.assertEqual(record["created_at"], record["updated_at"])
            self.assertEqual(
                set(record),
                {
                    "id",
                    "media_type",
                    "prompt",
                    "model",
                    "params",
                    "task_id",
                    "status",
                    "progress",
                    "remote_url",
                    "local_path",
                    "local_url",
                    "width",
                    "height",
                    "bytes",
                    "error",
                    "created_at",
                    "updated_at",
                },
            )

    def test_update_record_persists_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})

            updated = service.update_record(
                record["id"], status="running", task_id="task-1"
            )

            reloaded = OmniGenService(Path(directory)).find_record(record["id"])
            self.assertEqual(updated["status"], "running")
            self.assertEqual(reloaded["task_id"], "task-1")
            self.assertGreaterEqual(updated["updated_at"], record["updated_at"])

    def test_stale_writer_cannot_resurrect_cross_service_delete(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            service_a = OmniGenService(root)
            service_b = OmniGenService(root)
            local_file = service_a.results_dir / "result.png"
            local_file.write_bytes(b"image")
            record = service_a.create_record("prompt", "model-a", {})
            service_a.update_record(record["id"], local_path=str(local_file))
            read_complete = threading.Event()
            resume_writer = threading.Event()
            delete_complete = threading.Event()
            errors = []
            real_read_history = service_a._read_history_unlocked

            def read_then_pause():
                history = real_read_history()
                if not read_complete.is_set():
                    read_complete.set()
                    if not resume_writer.wait(timeout=2):
                        raise TimeoutError("stale writer test did not resume")
                return history

            def update_from_service_a():
                try:
                    service_a.update_record(record["id"], progress=50)
                except Exception as exc:
                    errors.append(exc)

            def delete_from_service_b():
                try:
                    service_b.delete_records(
                        [record["id"]], delete_files=True
                    )
                except Exception as exc:
                    errors.append(exc)
                finally:
                    delete_complete.set()

            update_thread = threading.Thread(
                target=update_from_service_a, daemon=True
            )
            delete_thread = threading.Thread(
                target=delete_from_service_b, daemon=True
            )
            try:
                with mock.patch.object(
                    service_a,
                    "_read_history_unlocked",
                    side_effect=read_then_pause,
                ), mock.patch.object(
                    service_b,
                    "_purge_transaction_unlocked",
                    return_value=False,
                ):
                    update_thread.start()
                    self.assertTrue(read_complete.wait(timeout=2))
                    delete_thread.start()
                    self.assertFalse(delete_complete.wait(timeout=0.2))
                    resume_writer.set()
                    update_thread.join(timeout=3)
                    delete_thread.join(timeout=3)
            finally:
                resume_writer.set()
                if update_thread.ident is not None:
                    update_thread.join(timeout=1)
                if delete_thread.ident is not None:
                    delete_thread.join(timeout=1)

            self.assertFalse(update_thread.is_alive())
            self.assertFalse(delete_thread.is_alive())
            self.assertEqual(errors, [])
            stored = json.loads(
                service_a.history_path.read_text(encoding="utf-8")
            )
            self.assertEqual(stored["records"], [])
            self.assertEqual(len(stored.get("file_transactions") or []), 1)

    def test_list_history_returns_newest_first_copies(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            older = service.create_record("older", "model-a", {})
            newer = service.create_record("newer", "model-a", {})

            history = service.list_history()
            history[0]["prompt"] = "mutated"
            history[0]["params"]["changed"] = True

            self.assertEqual(
                [item["id"] for item in history], [newer["id"], older["id"]]
            )
            stored = service.find_record(newer["id"])
            self.assertEqual(stored["prompt"], "newer")
            self.assertNotIn("changed", stored["params"])

    def test_find_record_rejects_missing_id(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))

            with self.assertRaisesRegex(ValueError, "not found"):
                service.find_record("missing")

    def test_corrupt_history_is_renamed_and_empty_history_starts(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            service.history_path.parent.mkdir(parents=True, exist_ok=True)
            service.history_path.write_text("not-json", encoding="utf-8")

            self.assertEqual(service.list_history(), [])

            backups = list(service.history_path.parent.glob("history.corrupt-*.json"))
            self.assertEqual(len(backups), 1)
            self.assertEqual(backups[0].read_text(encoding="utf-8"), "not-json")
            self.assertFalse(service.history_path.exists())

    def test_invalid_utf8_history_is_backed_up_before_empty_history_starts(self):
        corrupt_bytes = b'\xff\xfe{"records": []}'
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            service.history_path.parent.mkdir(parents=True, exist_ok=True)
            service.history_path.write_bytes(corrupt_bytes)

            self.assertEqual(service.list_history(), [])

            backups = list(service.history_path.parent.glob("history.corrupt-*.json"))
            self.assertEqual(len(backups), 1)
            self.assertEqual(backups[0].read_bytes(), corrupt_bytes)
            self.assertFalse(service.history_path.exists())

    def test_corrupt_history_backup_failure_propagates_without_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            service.history_path.parent.mkdir(parents=True, exist_ok=True)
            service.history_path.write_text("not-json", encoding="utf-8")

            with mock.patch(
                "omnigen_service.os.replace", side_effect=OSError("backup denied")
            ):
                with self.assertRaisesRegex(OSError, "backup denied"):
                    service.list_history()
                with self.assertRaisesRegex(OSError, "backup denied"):
                    service.create_record("prompt", "model-a", {})

            self.assertEqual(
                service.history_path.read_text(encoding="utf-8"), "not-json"
            )
            self.assertEqual(
                list(service.history_path.parent.glob("history.corrupt-*.json")), []
            )

    def test_history_read_oserror_propagates_without_corruption_backup(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            service.history_path.parent.mkdir(parents=True, exist_ok=True)
            service.history_path.write_text('{"records": []}', encoding="utf-8")

            with mock.patch(
                "omnigen_service.Path.open", side_effect=PermissionError("read denied")
            ):
                with self.assertRaisesRegex(PermissionError, "read denied"):
                    service.list_history()

            self.assertTrue(service.history_path.exists())
            self.assertEqual(
                list(service.history_path.parent.glob("history.corrupt-*.json")), []
            )

    def test_delete_records_only_leaves_local_file_intact(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            local_file = service.results_dir / "result.png"
            local_file.write_bytes(b"image")
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], local_path=str(local_file.resolve()))

            result = service.delete_records([record["id"]], delete_files=False)

            self.assertTrue(local_file.exists())
            self.assertEqual(service.list_history(), [])
            self.assertEqual(
                result,
                {
                    "deleted_ids": [record["id"]],
                    "files_deleted": False,
                    "cleanup_pending": False,
                },
            )

    def test_delete_records_and_files_removes_file_inside_results(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            local_file = service.results_dir / "result.png"
            local_file.write_bytes(b"image")
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], local_path=str(local_file.resolve()))

            service.delete_records([record["id"]], delete_files=True)

            self.assertFalse(local_file.exists())
            self.assertEqual(service.list_history(), [])

    def test_delete_rejects_path_outside_results_before_any_change(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            outside_file = Path(directory) / "outside.png"
            outside_file.write_bytes(b"image")
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], local_path=str(outside_file.resolve()))

            with self.assertRaises(ValueError):
                service.delete_records([record["id"]], delete_files=True)

            self.assertTrue(outside_file.exists())
            self.assertEqual(service.find_record(record["id"])["id"], record["id"])

    def test_multiple_deletions_are_all_or_nothing_on_path_validation(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            inside_file = service.results_dir / "inside.png"
            outside_file = Path(directory) / "outside.png"
            inside_file.write_bytes(b"inside")
            outside_file.write_bytes(b"outside")
            inside = service.create_record("inside", "model-a", {})
            outside = service.create_record("outside", "model-a", {})
            service.update_record(inside["id"], local_path=str(inside_file.resolve()))
            service.update_record(outside["id"], local_path=str(outside_file.resolve()))

            with self.assertRaises(ValueError):
                service.delete_records(
                    [inside["id"], outside["id"]], delete_files=True
                )

            self.assertTrue(inside_file.exists())
            self.assertTrue(outside_file.exists())
            self.assertEqual(len(service.list_history()), 2)

    def test_directory_candidate_rejects_all_deletions_before_any_change(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            local_file = service.results_dir / "result.png"
            local_directory = service.results_dir / "result-directory"
            local_file.write_bytes(b"image")
            local_directory.mkdir()
            file_record = service.create_record("file", "model-a", {})
            directory_record = service.create_record("directory", "model-a", {})
            service.update_record(
                file_record["id"], local_path=str(local_file.resolve())
            )
            service.update_record(
                directory_record["id"], local_path=str(local_directory.resolve())
            )

            with self.assertRaisesRegex(ValueError, "directory"):
                service.delete_records(
                    [file_record["id"], directory_record["id"]],
                    delete_files=True,
                )

            self.assertTrue(local_file.exists())
            self.assertTrue(local_directory.is_dir())
            self.assertEqual(
                {record["id"] for record in service.list_history()},
                {file_record["id"], directory_record["id"]},
            )

    def test_second_file_staging_failure_restores_all_files_and_history(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            files = [
                service.results_dir / "first.png",
                service.results_dir / "second.png",
            ]
            records = []
            for index, local_file in enumerate(files):
                local_file.write_bytes(f"image-{index}".encode("ascii"))
                record = service.create_record(f"prompt-{index}", "model-a", {})
                records.append(
                    service.update_record(
                        record["id"], local_path=str(local_file.resolve())
                    )
                )
            history_before = service.history_path.read_bytes()
            real_replace = os.replace
            staging_calls = 0

            def fail_second_staging(source, destination):
                nonlocal staging_calls
                destination = Path(destination)
                if (
                    destination.parent.parent == service.trash_dir
                    and destination.parent.name.startswith(".delete-")
                    and destination.name != "manifest.json"
                ):
                    self.assertTrue(
                        (destination.parent / "manifest.json").exists()
                    )
                    staging_calls += 1
                    if staging_calls == 2:
                        raise OSError("second staging failed")
                return real_replace(source, destination)

            with mock.patch(
                "omnigen_service.os.replace", side_effect=fail_second_staging
            ):
                with self.assertRaisesRegex(OSError, "second staging failed"):
                    service.delete_records(
                        [record["id"] for record in records], delete_files=True
                    )

            self.assertEqual(files[0].read_bytes(), b"image-0")
            self.assertEqual(files[1].read_bytes(), b"image-1")
            self.assertEqual(service.history_path.read_bytes(), history_before)
            self.assertEqual(len(service.list_history()), 2)
            self.assertEqual(list(service.results_dir.glob(".delete-*")), [])
            self.assertEqual(list(service.trash_dir.iterdir()), [])

    def test_history_write_failure_restores_staged_files_and_history(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            files = [
                service.results_dir / "first.png",
                service.results_dir / "second.png",
            ]
            record_ids = []
            for index, local_file in enumerate(files):
                local_file.write_bytes(f"image-{index}".encode("ascii"))
                record = service.create_record(f"prompt-{index}", "model-a", {})
                service.update_record(
                    record["id"], local_path=str(local_file.resolve())
                )
                record_ids.append(record["id"])
            history_before = service.history_path.read_bytes()
            real_replace = os.replace

            def fail_history_replace(source, destination):
                if Path(destination) == service.history_path:
                    raise OSError("history replace failed")
                return real_replace(source, destination)

            with mock.patch(
                "omnigen_service.os.replace", side_effect=fail_history_replace
            ):
                with self.assertRaisesRegex(OSError, "history replace failed"):
                    service.delete_records(record_ids, delete_files=True)

            self.assertEqual(files[0].read_bytes(), b"image-0")
            self.assertEqual(files[1].read_bytes(), b"image-1")
            self.assertEqual(service.history_path.read_bytes(), history_before)
            self.assertEqual(len(service.list_history()), 2)
            self.assertEqual(list(service.results_dir.glob(".delete-*")), [])
            self.assertEqual(list(service.trash_dir.iterdir()), [])

    def test_delete_unlink_cleanup_failure_returns_success_and_retries_later(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            service = OmniGenService(root)
            local_file = service.results_dir / "result.png"
            local_file.write_bytes(b"image")
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], local_path=str(local_file.resolve()))
            real_unlink = Path.unlink

            def fail_trash_unlink(path, *args, **kwargs):
                if Path(path).is_relative_to(service.trash_dir):
                    raise OSError("trash unlink failed")
                return real_unlink(path, *args, **kwargs)

            with mock.patch(
                "omnigen_service.Path.unlink",
                autospec=True,
                side_effect=fail_trash_unlink,
            ):
                deleted = service.delete_records(
                    [record["id"]], delete_files=True
                )

            self.assertEqual(deleted["deleted_ids"], [record["id"]])
            self.assertTrue(deleted["cleanup_pending"])
            self.assertEqual(service.list_history(), [])
            self.assertFalse(local_file.exists())
            self.assertEqual(list(service.results_dir.iterdir()), [])
            self.assertTrue(any(service.trash_dir.rglob("*")))

            reloaded = OmniGenService(root)

            self.assertEqual(list(reloaded.trash_dir.iterdir()), [])


class FileTransactionRecoveryTests(unittest.TestCase):
    def test_precommit_delete_transaction_restores_file_and_keeps_history(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            service = OmniGenService(root)
            original = service.results_dir / "result.png"
            original.write_bytes(b"original")
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], local_path=str(original))
            transaction_id = "delete-precommit"
            staged = service.trash_dir / f".delete-{transaction_id}" / "old-0"
            write_transaction_manifest(
                service,
                "delete",
                transaction_id,
                [record["id"]],
                [(original, staged)],
            )
            os.replace(original, staged)

            recovered = OmniGenService(root)

            self.assertEqual(original.read_bytes(), b"original")
            self.assertEqual(recovered.find_record(record["id"])["id"], record["id"])
            self.assertEqual(list(recovered.trash_dir.iterdir()), [])

    def test_committed_delete_transaction_purges_staged_file_and_marker(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            service = OmniGenService(root)
            original = service.results_dir / "result.png"
            original.write_bytes(b"original")
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], local_path=str(original))
            transaction_id = "delete-committed"
            staged = service.trash_dir / f".delete-{transaction_id}" / "old-0"
            write_transaction_manifest(
                service,
                "delete",
                transaction_id,
                [record["id"]],
                [(original, staged)],
            )
            os.replace(original, staged)
            service._atomic_write_json(
                service.history_path,
                {"records": [], "file_transactions": [transaction_id]},
            )

            recovered = OmniGenService(root)

            self.assertFalse(original.exists())
            self.assertEqual(recovered.list_history(), [])
            stored = json.loads(recovered.history_path.read_text(encoding="utf-8"))
            self.assertNotIn("file_transactions", stored)
            self.assertEqual(list(recovered.trash_dir.iterdir()), [])

    def test_precommit_replacement_restores_old_and_removes_new_file(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            service = OmniGenService(root)
            old_path = service.results_dir / "result.png"
            final_path = service.results_dir / "result.jpg"
            old_path.write_bytes(b"old")
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], local_path=str(old_path))
            transaction_id = "replace-precommit"
            staged = service.trash_dir / f".replace-{transaction_id}" / "old-0"
            write_transaction_manifest(
                service,
                "replace",
                transaction_id,
                [record["id"]],
                [(old_path, staged)],
                final_path,
            )
            os.replace(old_path, staged)
            final_path.write_bytes(b"new")

            recovered = OmniGenService(root)

            self.assertEqual(old_path.read_bytes(), b"old")
            self.assertFalse(final_path.exists())
            self.assertEqual(
                recovered.find_record(record["id"])["local_path"], str(old_path)
            )
            self.assertEqual(list(recovered.trash_dir.iterdir()), [])

    def test_committed_replacement_keeps_new_file_and_purges_old(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            service = OmniGenService(root)
            old_path = service.results_dir / "result.png"
            final_path = service.results_dir / "result.jpg"
            old_path.write_bytes(b"old")
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], local_path=str(old_path))
            transaction_id = "replace-committed"
            staged = service.trash_dir / f".replace-{transaction_id}" / "old-0"
            write_transaction_manifest(
                service,
                "replace",
                transaction_id,
                [record["id"]],
                [(old_path, staged)],
                final_path,
            )
            os.replace(old_path, staged)
            final_path.write_bytes(b"new")
            service.update_record(
                record["id"],
                local_path=str(final_path),
                file_transaction_id=transaction_id,
                cleanup_pending=True,
            )

            recovered = OmniGenService(root)

            self.assertEqual(final_path.read_bytes(), b"new")
            self.assertFalse(old_path.exists())
            stored_record = recovered.find_record(record["id"])
            self.assertEqual(stored_record["local_path"], str(final_path))
            self.assertNotIn("file_transaction_id", stored_record)
            self.assertNotIn("cleanup_pending", stored_record)
            self.assertEqual(list(recovered.trash_dir.iterdir()), [])

    def test_same_path_replacement_marker_distinguishes_commit_state(self):
        for committed in (False, True):
            with self.subTest(
                committed=committed
            ), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                service = OmniGenService(root)
                final_path = service.results_dir / "result.png"
                final_path.write_bytes(b"old")
                record = service.create_record("prompt", "model-a", {})
                service.update_record(record["id"], local_path=str(final_path))
                transaction_id = f"same-path-{committed}"
                staged = (
                    service.trash_dir
                    / f".replace-{transaction_id}"
                    / "old-0"
                )
                write_transaction_manifest(
                    service,
                    "replace",
                    transaction_id,
                    [record["id"]],
                    [(final_path, staged)],
                    final_path,
                )
                os.replace(final_path, staged)
                final_path.write_bytes(b"new")
                if committed:
                    service.update_record(
                        record["id"],
                        local_path=str(final_path),
                        file_transaction_id=transaction_id,
                        cleanup_pending=True,
                    )

                recovered = OmniGenService(root)

                expected = b"new" if committed else b"old"
                self.assertEqual(final_path.read_bytes(), expected)
                stored_record = recovered.find_record(record["id"])
                self.assertNotIn("file_transaction_id", stored_record)
                self.assertEqual(list(recovered.trash_dir.iterdir()), [])

    def test_second_service_waits_for_active_transaction_lock(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            service = OmniGenService(root)
            original = service.results_dir / "result.png"
            original.write_bytes(b"original")
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], local_path=str(original))
            transaction_id = "delete-active"
            staged = service.trash_dir / f".delete-{transaction_id}" / "old-0"
            write_transaction_manifest(
                service,
                "delete",
                transaction_id,
                [record["id"]],
                [(original, staged)],
            )
            recovered = {}
            completed = threading.Event()
            timeout_error = {}

            def open_second_service():
                try:
                    recovered["service"] = OmniGenService(root)
                finally:
                    completed.set()

            def try_bounded_lock():
                try:
                    with service._file_transaction_lock(timeout=0.05):
                        pass
                except Exception as exc:
                    timeout_error["error"] = exc

            with service._file_transaction_lock():
                os.replace(original, staged)
                thread = threading.Thread(target=open_second_service, daemon=True)
                thread.start()
                bounded_thread = threading.Thread(
                    target=try_bounded_lock, daemon=True
                )
                bounded_thread.start()
                bounded_thread.join(timeout=1)
                time.sleep(0.2)
                self.assertFalse(bounded_thread.is_alive())
                self.assertIsInstance(timeout_error.get("error"), TimeoutError)
                self.assertFalse(completed.is_set())
                self.assertFalse(original.exists())

            thread.join(timeout=3)
            self.assertTrue(completed.is_set())
            self.assertEqual(original.read_bytes(), b"original")
            self.assertEqual(
                recovered["service"].find_record(record["id"])["id"], record["id"]
            )

    def test_delete_rmdir_cleanup_failure_returns_success_and_retries_later(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            service = OmniGenService(root)
            local_file = service.results_dir / "result.png"
            local_file.write_bytes(b"image")
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], local_path=str(local_file.resolve()))
            real_rmdir = Path.rmdir

            def fail_trash_rmdir(path, *args, **kwargs):
                if Path(path).is_relative_to(service.trash_dir):
                    raise OSError("trash rmdir failed")
                return real_rmdir(path, *args, **kwargs)

            with mock.patch(
                "omnigen_service.Path.rmdir",
                autospec=True,
                side_effect=fail_trash_rmdir,
            ):
                deleted = service.delete_records(
                    [record["id"]], delete_files=True
                )

            self.assertEqual(deleted["deleted_ids"], [record["id"]])
            self.assertTrue(deleted["cleanup_pending"])
            self.assertEqual(service.list_history(), [])
            self.assertFalse(local_file.exists())
            self.assertEqual(list(service.results_dir.iterdir()), [])
            self.assertTrue(any(service.trash_dir.iterdir()))

            reloaded = OmniGenService(root)

            self.assertEqual(list(reloaded.trash_dir.iterdir()), [])


class DownloadResultTests(unittest.TestCase):
    def test_rejects_non_http_url_without_opening_network(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})

            with mock.patch("urllib.request.urlopen") as urlopen:
                with self.assertRaisesRegex(ValueError, "HTTP"):
                    service.download_result(record["id"], "file:///tmp/result.png")

            urlopen.assert_not_called()

    def test_rejects_http_url_without_valid_hostname(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})
            response = BinaryResponse(make_image_bytes())

            with mock.patch(
                "urllib.request.urlopen", return_value=response
            ) as urlopen:
                with self.assertRaisesRegex(ValueError, "hostname"):
                    service.download_result(record["id"], "https:////bad")

            urlopen.assert_not_called()

    def test_rejects_redirected_response_without_valid_http_hostname(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})
            response = BinaryResponse(make_image_bytes())
            response.geturl = mock.Mock(return_value="https:////bad")

            with mock.patch("urllib.request.urlopen", return_value=response):
                with self.assertRaisesRegex(ValueError, "hostname"):
                    service.download_result(
                        record["id"], "https://example.test/result.png"
                    )

            self.assertEqual(list(service.results_dir.iterdir()), [])
            self.assertEqual(service.find_record(record["id"])["remote_url"], "")

    def test_replacement_rejects_symlink_without_touching_external_target(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            service = OmniGenService(root / "work")
            record = service.create_record("prompt", "model-a", {})
            external = root / "external.png"
            external.write_bytes(b"external")
            final_path = service.results_dir / f'{record["id"]}.png'
            try:
                final_path.symlink_to(external)
            except OSError as exc:
                if getattr(exc, "winerror", None) == 1314:
                    self.skipTest(f"symlinks unavailable: {exc}")
                raise
            response = BinaryResponse(make_image_bytes("PNG"))

            with mock.patch("urllib.request.urlopen", return_value=response):
                with self.assertRaisesRegex(ValueError, "symlink"):
                    service.download_result(
                        record["id"], "https://example.test/result.png"
                    )

            self.assertTrue(final_path.is_symlink())
            self.assertEqual(external.read_bytes(), b"external")
            self.assertEqual(service.find_record(record["id"])["local_path"], "")

    def test_delete_rejects_windows_junction_result_parent(self):
        if os.name != "nt":
            self.skipTest("Windows directory junctions are unavailable")
        if not hasattr(Path("."), "is_junction"):
            self.skipTest("pathlib junction detection is unavailable")

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            service = OmniGenService(root / "work")
            external = root / "external"
            external.mkdir()
            external_file = external / "result.png"
            external_file.write_bytes(b"external")
            junction = service.results_dir / "linked"
            created = subprocess.run(
                [
                    "cmd.exe",
                    "/d",
                    "/c",
                    "mklink",
                    "/J",
                    str(junction),
                    str(external),
                ],
                capture_output=True,
                text=True,
                timeout=5,
            )
            self.assertEqual(
                created.returncode,
                0,
                created.stdout + created.stderr,
            )
            self.assertTrue(junction.is_junction())
            record = service.create_record("prompt", "model-a", {})
            service.update_record(
                record["id"], local_path=str(junction / external_file.name)
            )

            with self.assertRaisesRegex(ValueError, "junction"):
                service.delete_records([record["id"]], delete_files=True)

            self.assertEqual(external_file.read_bytes(), b"external")
            self.assertEqual(service.find_record(record["id"])["id"], record["id"])

    def test_downloads_verified_png_to_stable_name_and_persists_metadata(self):
        image_data = make_image_bytes("PNG", (3, 2))
        response = BinaryResponse(image_data)
        requests = []

        def open_request(request, timeout):
            requests.append((request, timeout))
            return response

        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})
            with mock.patch("urllib.request.urlopen", side_effect=open_request):
                downloaded = service.download_result(
                    record["id"], "https://example.test/result.not-an-extension"
                )

            expected_path = service.results_dir / f'{record["id"]}.png'
            self.assertEqual(Path(downloaded["local_path"]), expected_path.resolve())
            self.assertEqual(
                downloaded["local_url"],
                f'/work/omnigen/results/{record["id"]}.png',
            )
            self.assertEqual(
                downloaded["remote_url"],
                "https://example.test/result.not-an-extension",
            )
            self.assertEqual(downloaded["width"], 3)
            self.assertEqual(downloaded["height"], 2)
            self.assertEqual(downloaded["bytes"], len(image_data))
            self.assertEqual(downloaded["status"], "succeeded")
            self.assertEqual(downloaded["progress"], 100)
            self.assertEqual(downloaded["error"], "")
            self.assertEqual(expected_path.read_bytes(), image_data)
            self.assertEqual(service.find_record(record["id"]), downloaded)
            self.assertEqual(list(service.results_dir.glob("*.tmp")), [])
            self.assertEqual(response.read_sizes, [32 * 1024 * 1024 + 1])
            self.assertEqual(requests[0][1], 60)
            self.assertIn("Mozilla", requests[0][0].get_header("User-agent"))

    def test_rejects_response_larger_than_32_mb(self):
        response = BinaryResponse(b"x" * (32 * 1024 * 1024 + 1))
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})

            with mock.patch("urllib.request.urlopen", return_value=response):
                with self.assertRaisesRegex(OmniGenError, "32 MB"):
                    service.download_result(
                        record["id"], "https://example.test/oversized.png"
                    )

            self.assertEqual(list(service.results_dir.iterdir()), [])

    def test_uses_extension_for_each_supported_verified_format(self):
        for image_format, extension in (
            ("PNG", ".png"),
            ("JPEG", ".jpg"),
            ("WEBP", ".webp"),
            ("BMP", ".bmp"),
        ):
            with self.subTest(
                image_format=image_format
            ), tempfile.TemporaryDirectory() as directory:
                service = OmniGenService(Path(directory))
                record = service.create_record("prompt", "model-a", {})
                response = BinaryResponse(make_image_bytes(image_format))

                with mock.patch("urllib.request.urlopen", return_value=response):
                    downloaded = service.download_result(
                        record["id"], "https://example.test/image"
                    )

                self.assertEqual(Path(downloaded["local_path"]).suffix, extension)

    def test_cross_format_retry_retires_previous_recorded_file_after_commit(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})
            png_response = BinaryResponse(make_image_bytes("PNG"))
            jpeg_response = BinaryResponse(make_image_bytes("JPEG"))

            with mock.patch("urllib.request.urlopen", return_value=png_response):
                first = service.download_result(
                    record["id"], "https://example.test/result.png"
                )
            png_path = Path(first["local_path"])
            with mock.patch("urllib.request.urlopen", return_value=jpeg_response):
                second = service.download_result(
                    record["id"], "https://example.test/result.jpg"
                )

            jpeg_path = Path(second["local_path"])
            self.assertEqual(jpeg_path.suffix, ".jpg")
            self.assertTrue(jpeg_path.exists())
            self.assertFalse(png_path.exists())
            self.assertEqual(list(service.results_dir.iterdir()), [jpeg_path])

    def test_cross_format_persistence_failure_restores_staged_previous_file(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})
            png_response = BinaryResponse(make_image_bytes("PNG"))
            jpeg_response = BinaryResponse(make_image_bytes("JPEG"))
            with mock.patch("urllib.request.urlopen", return_value=png_response):
                first = service.download_result(
                    record["id"], "https://example.test/result.png"
                )
            png_path = Path(first["local_path"])

            def fail_persistence(*args, **kwargs):
                self.assertFalse(png_path.exists())
                raise ValueError("history write failed")

            with mock.patch(
                "urllib.request.urlopen", return_value=jpeg_response
            ), mock.patch.object(
                service, "_update_record_unlocked", side_effect=fail_persistence
            ):
                with self.assertRaisesRegex(ValueError, "history write failed"):
                    service.download_result(
                        record["id"], "https://example.test/result.jpg"
                    )

            self.assertTrue(png_path.exists())
            self.assertFalse((service.results_dir / f'{record["id"]}.jpg').exists())
            self.assertEqual(
                service.find_record(record["id"])["local_path"], str(png_path)
            )

    def test_cross_format_cleanup_failure_stays_succeeded_and_retries_later(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            service = OmniGenService(root)
            record = service.create_record("prompt", "model-a", {})
            png_response = BinaryResponse(make_image_bytes("PNG"))
            jpeg_response = BinaryResponse(make_image_bytes("JPEG"))
            with mock.patch("urllib.request.urlopen", return_value=png_response):
                first = service.download_result(
                    record["id"], "https://example.test/result.png"
                )
            png_path = Path(first["local_path"])
            real_unlink = Path.unlink

            def fail_trash_unlink(path, *args, **kwargs):
                if Path(path).is_relative_to(service.trash_dir):
                    raise OSError("trash unlink failed")
                return real_unlink(path, *args, **kwargs)

            with mock.patch(
                "urllib.request.urlopen", return_value=jpeg_response
            ), mock.patch(
                "omnigen_service.Path.unlink",
                autospec=True,
                side_effect=fail_trash_unlink,
            ):
                second = service.download_result(
                    record["id"], "https://example.test/result.jpg"
                )

            jpeg_path = Path(second["local_path"])
            self.assertEqual(second["status"], "succeeded")
            self.assertTrue(second["cleanup_pending"])
            self.assertEqual(
                service.find_record(record["id"])["local_path"], str(jpeg_path)
            )
            self.assertTrue(jpeg_path.exists())
            self.assertFalse(png_path.exists())
            self.assertEqual(list(service.results_dir.iterdir()), [jpeg_path])
            self.assertTrue(any(service.trash_dir.rglob("*")))

            reloaded = OmniGenService(root)

            self.assertEqual(list(reloaded.trash_dir.iterdir()), [])

    def test_invalid_image_is_rejected_and_temporary_file_removed(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})
            response = BinaryResponse(b"this is not an image")

            with mock.patch("urllib.request.urlopen", return_value=response):
                with self.assertRaises(ValueError):
                    service.download_result(
                        record["id"], "https://example.test/broken.png"
                    )

            self.assertEqual(list(service.results_dir.iterdir()), [])
            self.assertEqual(service.find_record(record["id"])["local_path"], "")

    def test_temporary_file_is_removed_when_disk_flush_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})
            response = BinaryResponse(make_image_bytes())

            with mock.patch("urllib.request.urlopen", return_value=response), mock.patch(
                "omnigen_service.os.fsync", side_effect=OSError("disk failure")
            ):
                with self.assertRaises(OmniGenError):
                    service.download_result(
                        record["id"], "https://example.test/result.png"
                    )

            self.assertEqual(list(service.results_dir.iterdir()), [])

    def test_persistence_failure_restores_previous_final_file(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})
            final_path = service.results_dir / f'{record["id"]}.png'
            final_path.write_bytes(b"previous image")
            response = BinaryResponse(make_image_bytes())

            with mock.patch(
                "urllib.request.urlopen", return_value=response
            ), mock.patch.object(
                service,
                "_update_record_unlocked",
                side_effect=ValueError("history write failed"),
            ):
                with self.assertRaisesRegex(ValueError, "history write failed"):
                    service.download_result(
                        record["id"], "https://example.test/result.png"
                    )

            self.assertEqual(final_path.read_bytes(), b"previous image")
            self.assertEqual(list(service.results_dir.iterdir()), [final_path])

    def test_persistence_failure_removes_new_final_file(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})
            response = BinaryResponse(make_image_bytes())

            with mock.patch(
                "urllib.request.urlopen", return_value=response
            ), mock.patch.object(
                service,
                "_update_record_unlocked",
                side_effect=ValueError("history write failed"),
            ):
                with self.assertRaisesRegex(ValueError, "history write failed"):
                    service.download_result(
                        record["id"], "https://example.test/result.png"
                    )

            self.assertEqual(list(service.results_dir.iterdir()), [])


class RefreshTaskTests(unittest.TestCase):
    def test_missing_task_id_is_rejected_without_calling_tool(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})
            service.call_tool = mock.Mock()

            with self.assertRaisesRegex(ValueError, "task_id"):
                service.refresh_task(record["id"])

            service.call_tool.assert_not_called()

    def test_nonterminal_task_normalizes_status_and_progress(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], task_id="task-1")
            service.call_tool = mock.Mock(
                return_value={"status": "PROCESSING", "progress": "42.5%"}
            )

            refreshed = service.refresh_task(record["id"])

            service.call_tool.assert_called_once_with(
                "get_generation_task", {"task_id": "task-1"}
            )
            self.assertEqual(refreshed["status"], "running")
            self.assertEqual(refreshed["progress"], 42.5)

    def test_call_tool_failure_persists_redacted_error_and_reraises(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            service.set_token("secret-token")
            record = service.create_record("prompt", "model-a", {})
            service.update_record(
                record["id"], task_id="task-1", status="running", progress=37
            )
            service.call_tool = mock.Mock(
                side_effect=OmniGenError("poll secret-token failed")
            )

            with self.assertRaises(OmniGenError) as raised:
                service.refresh_task(record["id"])

            persisted = service.find_record(record["id"])
            self.assertEqual(persisted["status"], "running")
            self.assertEqual(persisted["progress"], 37)
            self.assertIn("[REDACTED]", persisted["error"])
            self.assertNotIn("secret-token", persisted["error"])
            self.assertNotIn("secret-token", str(raised.exception))

    def test_failed_and_canceled_tasks_store_redacted_errors(self):
        cases = (
            ("ERROR", "failed", {"message": "secret-token failed"}),
            ("CANCELLED", "canceled", "canceled for secret-token"),
        )
        for remote_status, expected_status, remote_error in cases:
            with self.subTest(
                remote_status=remote_status
            ), tempfile.TemporaryDirectory() as directory:
                service = OmniGenService(Path(directory))
                service.set_token("secret-token")
                record = service.create_record("prompt", "model-a", {})
                service.update_record(record["id"], task_id="task-1")
                service.call_tool = mock.Mock(
                    return_value={
                        "status": remote_status,
                        "progress": 75,
                        "error": remote_error,
                    }
                )

                refreshed = service.refresh_task(record["id"])

                self.assertEqual(refreshed["status"], expected_status)
                self.assertEqual(refreshed["progress"], 75)
                self.assertNotIn("secret-token", refreshed["error"])
                self.assertIn("[REDACTED]", refreshed["error"])

    def test_succeeded_task_downloads_first_nested_http_image_url(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], task_id="task-1")
            service.call_tool = mock.Mock(
                return_value={
                    "status": "COMPLETED",
                    "result": {
                        "outputs": [
                            {"url": "ftp://example.test/ignored.png"},
                            {
                                "urls": [
                                    "not-a-url",
                                    "https://example.test/result.png",
                                    "https://example.test/later.png",
                                ]
                            },
                        ]
                    },
                }
            )
            downloaded = service.update_record(
                record["id"], status="succeeded", progress=100
            )
            service.download_result = mock.Mock(return_value=downloaded)

            refreshed = service.refresh_task(record["id"])

            service.download_result.assert_called_once_with(
                record["id"], "https://example.test/result.png"
            )
            self.assertEqual(refreshed["status"], "succeeded")

    def test_succeeded_nested_task_result_downloads_its_image_url(self):
        result_url = "https://example.test/nested-result.png"
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], task_id="task-1")
            service.call_tool = mock.Mock(
                return_value={
                    "task": {
                        "status": "succeeded",
                        "result": {"url": result_url},
                    }
                }
            )
            downloaded = service.update_record(
                record["id"], status="succeeded", progress=100
            )
            service.download_result = mock.Mock(return_value=downloaded)

            refreshed = service.refresh_task(record["id"])

            service.download_result.assert_called_once_with(record["id"], result_url)
            self.assertEqual(refreshed["status"], "succeeded")

    def test_succeeded_provider_image_shapes_download_first_url(self):
        result_url = "https://example.test/provider-result.png"
        payloads = (
            {"status": "succeeded", "result_url": result_url},
            {"status": "succeeded", "images": [{"url": result_url}]},
            {"status": "succeeded", "output": {"image_url": result_url}},
        )
        for payload in payloads:
            with self.subTest(
                payload=payload
            ), tempfile.TemporaryDirectory() as directory:
                service = OmniGenService(Path(directory))
                record = service.create_record("prompt", "model-a", {})
                service.update_record(record["id"], task_id="task-1")
                service.call_tool = mock.Mock(return_value=payload)
                downloaded = service.update_record(
                    record["id"], status="succeeded", progress=100
                )
                service.download_result = mock.Mock(return_value=downloaded)

                service.refresh_task(record["id"])

                service.download_result.assert_called_once_with(
                    record["id"], result_url
                )

    def test_succeeded_task_retries_persisted_remote_url_when_payload_omits_it(self):
        result_url = "https://example.test/persisted-result.png"
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})
            service.update_record(
                record["id"],
                task_id="task-1",
                status="download_failed",
                remote_url=result_url,
            )
            service.call_tool = mock.Mock(return_value={"status": "succeeded"})
            downloaded = service.update_record(
                record["id"], status="succeeded", progress=100
            )
            service.download_result = mock.Mock(return_value=downloaded)

            service.refresh_task(record["id"])

            service.download_result.assert_called_once_with(record["id"], result_url)

    def test_truncated_http_download_becomes_safe_download_failed_record(self):
        result_url = "https://example.test/truncated.png"
        response = BinaryResponse(make_image_bytes())
        response.read = mock.Mock(
            side_effect=http.client.IncompleteRead(b"partial", 128)
        )
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            service.set_token("secret-token")
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], task_id="task-1")
            service.call_tool = mock.Mock(
                return_value={"status": "succeeded", "result": {"url": result_url}}
            )

            with mock.patch("urllib.request.urlopen", return_value=response):
                refreshed = service.refresh_task(record["id"])

            self.assertEqual(refreshed["status"], "download_failed")
            self.assertEqual(refreshed["remote_url"], result_url)
            self.assertTrue(refreshed["error"])
            self.assertNotIn("secret-token", refreshed["error"])
            self.assertEqual(list(service.results_dir.iterdir()), [])

    def test_decompression_bomb_becomes_safe_download_failed_record(self):
        result_url = "https://example.test/oversized-dimensions.png"
        response = BinaryResponse(make_image_bytes())
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            service.set_token("secret-token")
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], task_id="task-1")
            service.call_tool = mock.Mock(
                return_value={"status": "succeeded", "result": {"url": result_url}}
            )

            with mock.patch(
                "urllib.request.urlopen", return_value=response
            ), mock.patch(
                "omnigen_service.Image.open",
                side_effect=Image.DecompressionBombError(
                    "unsafe dimensions for secret-token"
                ),
            ):
                refreshed = service.refresh_task(record["id"])

            self.assertEqual(refreshed["status"], "download_failed")
            self.assertEqual(refreshed["remote_url"], result_url)
            self.assertTrue(refreshed["error"])
            self.assertNotIn("secret-token", refreshed["error"])
            self.assertEqual(list(service.results_dir.iterdir()), [])

    def test_download_failure_preserves_remote_url_and_next_refresh_retries(self):
        result_url = "https://example.test/result.png"
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            service.set_token("secret-token")
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], task_id="task-1")
            service.call_tool = mock.Mock(
                return_value={"status": "succeeded", "output": {"url": result_url}}
            )

            def download(record_id, remote_url):
                if service.download_result.call_count == 1:
                    raise OmniGenError("download secret-token failed")
                return service.update_record(
                    record_id,
                    remote_url=remote_url,
                    status="succeeded",
                    progress=100,
                    error="",
                )

            service.download_result = mock.Mock(side_effect=download)

            failed = service.refresh_task(record["id"])
            retried = service.refresh_task(record["id"])

            self.assertEqual(failed["remote_url"], result_url)
            self.assertEqual(failed["status"], "download_failed")
            self.assertEqual(failed["progress"], 100)
            self.assertNotIn("secret-token", failed["error"])
            self.assertIn("[REDACTED]", failed["error"])
            self.assertEqual(service.download_result.call_count, 2)
            self.assertEqual(retried["status"], "succeeded")

    def test_succeeded_task_without_http_result_marks_download_failed(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})
            service.update_record(record["id"], task_id="task-1")
            service.call_tool = mock.Mock(
                return_value={
                    "status": "succeeded",
                    "results": ["file:///tmp/image.png"],
                }
            )

            refreshed = service.refresh_task(record["id"])

            self.assertEqual(refreshed["status"], "download_failed")
            self.assertIn("HTTP", refreshed["error"])


if __name__ == "__main__":
    unittest.main()
