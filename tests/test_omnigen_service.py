import http.client
import io
import json
import tempfile
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

    def test_request_parses_multiline_event_stream_event(self):
        response = FakeResponse(
            "data: {\"jsonrpc\":\"2.0\",\n"
            "data: \"id\":1,\"result\":{\"ready\":true}}\n\n",
            "text/event-stream",
        )
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            with mock.patch("urllib.request.urlopen", return_value=response):
                payload = service._request_jsonrpc("initialize", {}, "secret-token")

        self.assertEqual(payload["result"], {"ready": True})

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
            with mock.patch("urllib.request.urlopen", return_value=response):
                with self.assertRaises(OmniGenError) as raised:
                    service._request_jsonrpc("initialize", {}, "secret-token")

        self.assertIn("response exceeded", str(raised.exception).lower())


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
            with mock.patch("urllib.request.urlopen", side_effect=open_request):
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
                {"deleted_ids": [record["id"]], "files_deleted": False},
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


class DownloadResultTests(unittest.TestCase):
    def test_rejects_non_http_url_without_opening_network(self):
        with tempfile.TemporaryDirectory() as directory:
            service = OmniGenService(Path(directory))
            record = service.create_record("prompt", "model-a", {})

            with mock.patch("urllib.request.urlopen") as urlopen:
                with self.assertRaisesRegex(ValueError, "HTTP"):
                    service.download_result(record["id"], "file:///tmp/result.png")

            urlopen.assert_not_called()

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
                service, "update_record", side_effect=ValueError("history write failed")
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
                service, "update_record", side_effect=ValueError("history write failed")
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
