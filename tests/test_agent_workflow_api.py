import base64
import http.client
import io
import json
import tempfile
import threading
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image, ImageDraw

from omnigen_service import OmniGenService
from project_service import ProjectService
import server as server_module


class HttpGenerationService(OmniGenService):
    def __init__(self, project_service, project_id):
        paths = project_service.project_paths(project_id)
        root = project_service.project_root(project_id)
        super().__init__(
            root,
            history_path=paths["generation_history"],
            results_dir=paths["production_images"],
            omnigen_dir=paths["marker"] / "generation",
            trash_dir=paths["trash"] / "generation",
            transaction_lock_path=paths["locks"] / "generation.transactions.lock",
            local_url_prefix=f"/api/v1/projects/{project_id}/files/production/images",
        )
        self.submit_count = 0

    def image_model_capability(self, model_id):
        return {
            "id": model_id,
            "billing_rules": {
                "unit": "cny/item",
                "currency": "CNY",
                "amount": 0.5,
            },
        }

    def submit_image(self, prompt, model, params, *, context=None):
        self.submit_count += 1
        record = self.create_record(prompt, model, params, context=context)
        return self.update_record(
            record["id"], status="queued", task_id=f"task-{record['id']}"
        )

    def refresh_task(self, record_id):
        record = self.find_record(record_id)
        target = self.results_dir / f"{record_id}.png"
        Image.new("RGBA", (8, 8), (30, 50, 70, 255)).save(target)
        return self.update_record(
            record_id,
            status="succeeded",
            progress=100,
            local_path=str(target),
            local_url=f"{self.local_url_prefix}/{target.name}",
            width=8,
            height=8,
            bytes=target.stat().st_size,
            source_executor="server_mcp",
            error="",
        )


def split_fixture_data_url():
    image = Image.new("RGBA", (24, 12), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rectangle((1, 2, 7, 9), fill=(255, 20, 20, 255))
    draw.rectangle((16, 2, 22, 9), fill=(20, 255, 20, 255))
    output = io.BytesIO()
    image.save(output, format="PNG")
    return "data:image/png;base64," + base64.b64encode(output.getvalue()).decode()


class AgentWorkflowApiSmokeTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.project_service = ProjectService(
            Path(self.temporary_directory.name) / "work"
        )
        self.generation_services = {}

        def generation_factory(project_id):
            if project_id not in self.generation_services:
                self.generation_services[project_id] = HttpGenerationService(
                    self.project_service, project_id
                )
            return self.generation_services[project_id]

        self.project_patch = mock.patch.object(
            server_module, "PROJECT_SERVICE", self.project_service
        )
        self.generation_patch = mock.patch.object(
            server_module, "project_generation_service", generation_factory
        )
        self.project_patch.start()
        self.generation_patch.start()
        server_module.AGENT_WORKFLOW_SERVICE = None
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
        shutdown = threading.Thread(target=self.httpd.shutdown, daemon=True)
        shutdown.start()
        shutdown.join(timeout=2)
        self.httpd.server_close()
        self.thread.join(timeout=2)
        server_module.AGENT_WORKFLOW_SERVICE = None
        self.generation_patch.stop()
        self.project_patch.stop()
        self.temporary_directory.cleanup()
        self.assertFalse(shutdown.is_alive())
        self.assertFalse(self.thread.is_alive())

    def request(self, method, path, payload=None, idempotency_key=""):
        connection = http.client.HTTPConnection(
            "127.0.0.1", self.httpd.server_address[1], timeout=10
        )
        body = None if payload is None else json.dumps(payload)
        headers = {"Content-Type": "application/json"} if body is not None else {}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        try:
            connection.request(method, path, body=body, headers=headers)
            response = connection.getresponse()
            raw = response.read()
            content_type = response.getheader("Content-Type", "")
        finally:
            connection.close()
        parsed = (
            json.loads(raw)
            if content_type.startswith("application/json") and raw
            else None
        )
        return response.status, parsed

    def test_native_agent_http_flow_generates_mattes_splits_and_ingests(self):
        status, payload = self.request(
            "POST",
            "/api/v1/projects/default/agent-runs",
            {
                "request": "生成、抠图、拆分并入库角色素材",
                "capabilities": {"native_image_generation": True},
                "steps": [
                    {
                        "id": "asset",
                        "type": "asset.create",
                        "inputs": {
                            "parent_id": "category-character",
                            "name": "Agent Hero",
                        },
                    },
                    {
                        "id": "generate",
                        "type": "image.generate",
                        "depends_on": ["asset"],
                        "inputs": {
                            "prompt": "two separated pixel sprites",
                            "model": "native-image",
                            "asset_node_id": {
                                "$from": "asset",
                                "path": "asset_node_id",
                            },
                        },
                    },
                    {
                        "id": "matte",
                        "type": "image.matte",
                        "depends_on": ["generate"],
                        "inputs": {
                            "record_id": {
                                "$from": "generate",
                                "path": "record_id",
                            },
                            "matte_mode": "auto",
                        },
                    },
                    {
                        "id": "split",
                        "type": "image.split",
                        "depends_on": ["matte"],
                        "inputs": {
                            "record_id": {
                                "$from": "matte",
                                "path": "record_ids.0",
                            }
                        },
                    },
                    {
                        "id": "ingest",
                        "type": "library.ingest",
                        "depends_on": ["split"],
                        "inputs": {
                            "record_ids": {
                                "$from": "split",
                                "path": "record_ids",
                            }
                        },
                    },
                ],
            },
            idempotency_key="native-http-flow",
        )
        self.assertEqual(status, 201)
        run = payload["agent_run"]
        self.assertEqual(run["status"], "awaiting_action")

        status, payload = self.request(
            "POST",
            run["next_actions"][0]["artifact_url"],
            {
                "data_url": split_fixture_data_url(),
                "file_name": "two-sprites.png",
            },
            idempotency_key="native-artifact",
        )

        self.assertEqual(status, 200)
        finished = payload["agent_run"]
        self.assertEqual(finished["status"], "succeeded")
        self.assertEqual(len(finished["outputs"]["split"]["record_ids"]), 2)
        self.assertEqual(len(finished["outputs"]["ingest"]["asset_ids"]), 2)
        self.assertEqual(len(self.project_service.list_library_assets("default")), 2)

    def test_mcp_http_flow_uses_server_executor_under_budget(self):
        status, payload = self.request(
            "POST",
            "/api/v1/projects/default/agent-runs",
            {
                "request": "使用 MCP 生成一张素材",
                "capabilities": {"native_image_generation": False},
                "execution_policy": {
                    "paid_generation": {
                        "mode": "auto_under_budget",
                        "max_total": 1,
                        "currency": "CNY",
                    }
                },
                "steps": [
                    {
                        "id": "asset",
                        "type": "asset.create",
                        "inputs": {
                            "parent_id": "category-icon",
                            "name": "MCP Icon",
                        },
                    },
                    {
                        "id": "generate",
                        "type": "image.generate",
                        "depends_on": ["asset"],
                        "inputs": {
                            "prompt": "pixel icon",
                            "model": "mcp-image",
                            "asset_node_id": {
                                "$from": "asset",
                                "path": "asset_node_id",
                            },
                            "params": {"resolution": "1K"},
                        },
                    }
                ],
            },
        )

        self.assertEqual(status, 201)
        self.assertEqual(payload["agent_run"]["status"], "succeeded")
        self.assertEqual(self.generation_services["default"].submit_count, 1)
        self.assertEqual(
            payload["agent_run"]["steps"][1]["executor"], "server_mcp"
        )

    def test_manifest_and_run_survive_service_recreation(self):
        status, manifest = self.request("GET", "/api/v1/agent/manifest")
        self.assertEqual(status, 200)
        self.assertEqual(manifest["manifest"]["protocol_version"], "1.0")
        status, created = self.request(
            "POST",
            "/api/v1/projects/default/agent-runs",
            {"request": "等待 Agent 编译流程", "capabilities": {}},
        )
        self.assertEqual(status, 201)
        run_id = created["agent_run"]["id"]

        server_module.AGENT_WORKFLOW_SERVICE = None
        status, restored = self.request(
            "GET", f"/api/v1/projects/default/agent-runs/{run_id}"
        )

        self.assertEqual(status, 200)
        self.assertEqual(restored["agent_run"]["status"], "awaiting_action")
        self.assertEqual(restored["agent_run"]["next_actions"][0]["id"], "plan")


if __name__ == "__main__":
    unittest.main()
