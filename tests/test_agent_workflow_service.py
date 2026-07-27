import base64
import io
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from agent_workflow_service import AgentWorkflowError, AgentWorkflowService
from omnigen_service import OmniGenService
from project_service import ProjectService


def image_data_url(size=(6, 4), color=(12, 34, 56, 255)) -> str:
    output = io.BytesIO()
    Image.new("RGBA", size, color).save(output, format="PNG")
    return "data:image/png;base64," + base64.b64encode(output.getvalue()).decode()


class FakeGenerationService(OmniGenService):
    def __init__(self, project_service: ProjectService, project_id: str):
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
        self.refresh_count = 0

    def image_model_capability(self, model_id: str) -> dict:
        if model_id == "missing":
            return {}
        return {
            "id": model_id,
            "billing_rules": {
                "unit": "cny/item",
                "currency": "CNY",
                "amount": 1.25,
            },
        }

    def submit_image(self, prompt, model, params, *, context=None):
        self.submit_count += 1
        record = self.create_record(prompt, model, params, context=context)
        return self.update_record(
            record["id"], status="queued", task_id=f"task-{record['id']}"
        )

    def refresh_task(self, record_id: str) -> dict:
        self.refresh_count += 1
        record = self.find_record(record_id)
        target = self.results_dir / f"{record_id}.png"
        Image.new("RGBA", (5, 3), (20, 40, 60, 255)).save(target)
        return self.update_record(
            record_id,
            status="succeeded",
            progress=100,
            local_path=str(target),
            local_url=f"{self.local_url_prefix}/{target.name}",
            width=5,
            height=3,
            bytes=target.stat().st_size,
            source_executor="server_mcp",
            error="",
        )


class AgentWorkflowServiceTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.work_dir = Path(self.temporary_directory.name) / "work"
        self.project_service = ProjectService(self.work_dir)
        self.asset_node = self.project_service.create_asset_node(
            "default",
            parent_id="category-character",
            name="Agent Test Target",
            target_count=1,
        )
        self.generation_services = {}
        self.processing_calls = []

        def generation_factory(project_id):
            if project_id not in self.generation_services:
                self.generation_services[project_id] = FakeGenerationService(
                    self.project_service, project_id
                )
            return self.generation_services[project_id]

        def processing_executor(action_type, inputs, context):
            self.processing_calls.append((action_type, inputs, context))
            return {
                "record_ids": [str(inputs.get("record_id") or "")],
                "processor": action_type,
            }

        self.service = AgentWorkflowService(
            self.project_service,
            generation_factory,
            processing_executor=processing_executor,
        )

    def tearDown(self):
        self.temporary_directory.cleanup()

    def native_generation_steps(self):
        return [
            {
                "id": "generate",
                "type": "image.generate",
                "inputs": {
                    "prompt": "pixel hero",
                    "model": "native-image",
                    "asset_node_id": self.asset_node["id"],
                    "params": {"resolution": "1K"},
                },
            }
        ]

    def mcp_generation_steps(self):
        return [
            {
                "id": "generate",
                "type": "image.generate",
                "inputs": {
                    "prompt": "pixel hero",
                    "model": "mcp-image",
                    "asset_node_id": self.asset_node["id"],
                    "params": {"resolution": "1K"},
                },
            }
        ]

    def test_01_manifest_describes_negotiated_image_execution(self):
        manifest = self.service.manifest()

        self.assertEqual(manifest["protocol_version"], "1.0")
        self.assertEqual(
            manifest["action_types"]["image.generate"]["executor"], "negotiated"
        )
        self.assertIn("native_image_generation", manifest["capability_negotiation"])

    def test_02_recipe_creation_is_versioned_and_persisted(self):
        recipe = self.service.create_recipe(
            "default",
            name="角色流程",
            steps=self.native_generation_steps(),
        )

        loaded = self.service.get_recipe("default", recipe["id"])
        self.assertEqual(loaded["version"], 1)
        self.assertEqual(loaded["steps"][0]["type"], "image.generate")

    def test_03_recipe_creation_is_idempotent(self):
        first = self.service.create_recipe(
            "default",
            name="角色流程",
            steps=self.native_generation_steps(),
            idempotency_key="recipe-one",
        )
        second = self.service.create_recipe(
            "default",
            name="不会创建第二份",
            steps=self.native_generation_steps(),
            idempotency_key="recipe-one",
        )

        self.assertEqual(first["id"], second["id"])
        self.assertEqual(len(self.service.list_recipes("default")), 1)

    def test_04_recipe_update_creates_immutable_new_version(self):
        first = self.service.create_recipe(
            "default", name="角色流程", steps=self.native_generation_steps()
        )
        second = self.service.update_recipe(
            "default", first["id"], changes={"name": "角色流程二版"}
        )

        self.assertEqual(second["version"], 2)
        self.assertEqual(
            self.service.get_recipe("default", first["id"], 1)["name"], "角色流程"
        )

    def test_05_recipe_rejects_dependency_cycles(self):
        with self.assertRaises(AgentWorkflowError):
            self.service.create_recipe(
                "default",
                name="循环",
                steps=[
                    {
                        "id": "a",
                        "type": "style.define",
                        "depends_on": ["b"],
                    },
                    {
                        "id": "b",
                        "type": "asset.plan",
                        "depends_on": ["a"],
                    },
                ],
            )

    def test_06_default_run_returns_machine_readable_plan_action(self):
        run = self.service.create_run(
            "default", request_text="制作角色素材", capabilities={}
        )

        self.assertEqual(run["status"], "awaiting_action")
        self.assertEqual(run["next_actions"][0]["type"], "workflow.plan")
        self.assertTrue(run["next_actions"][0]["result_url"].endswith("/result"))

    def test_07_plan_result_expands_steps_and_is_idempotent(self):
        run = self.service.create_run(
            "default", request_text="制作角色素材", capabilities={}
        )
        result = {"steps": [{"id": "style", "type": "style.define"}]}
        updated = self.service.submit_action_result(
            "default",
            run["id"],
            "plan",
            result=result,
            idempotency_key="plan-result",
        )
        repeated = self.service.submit_action_result(
            "default",
            run["id"],
            "plan",
            result=result,
            idempotency_key="plan-result",
        )

        self.assertEqual(updated["next_actions"][0]["id"], "style")
        self.assertEqual(len(repeated["steps"]), 2)

    def test_08_native_capability_selects_agent_native_executor(self):
        run = self.service.create_run(
            "default",
            request_text="生成角色",
            capabilities={"native_image_generation": True},
            steps=self.native_generation_steps(),
        )

        self.assertEqual(run["next_actions"][0]["executor"], "agent_native")
        self.assertIn("artifact_url", run["next_actions"][0])

    def test_09_forced_native_executor_requires_declared_capability(self):
        with self.assertRaises(AgentWorkflowError):
            self.service.create_run(
                "default",
                request_text="生成角色",
                capabilities={"native_image_generation": False},
                execution_policy={"image_generator": "agent_native"},
                steps=self.native_generation_steps(),
            )

    def test_10_mcp_generation_waits_for_cost_approval(self):
        run = self.service.create_run(
            "default",
            request_text="生成角色",
            capabilities={"native_image_generation": False},
            steps=self.mcp_generation_steps(),
        )

        self.assertEqual(run["status"], "awaiting_approval")
        self.assertEqual(run["next_actions"][0]["quote"]["total"], 1.25)
        self.assertEqual(self.generation_services["default"].submit_count, 0)

    def test_11_approved_mcp_generation_submits_and_finishes_once(self):
        run = self.service.create_run(
            "default",
            request_text="生成角色",
            capabilities={},
            steps=self.mcp_generation_steps(),
        )
        finished = self.service.approve_run(
            "default", run["id"], action_id="generate"
        )

        generation = self.generation_services["default"]
        self.assertEqual(finished["status"], "succeeded")
        self.assertEqual(generation.submit_count, 1)
        self.assertEqual(generation.refresh_count, 1)

    def test_12_auto_under_budget_mcp_generation_needs_no_manual_approval(self):
        run = self.service.create_run(
            "default",
            request_text="生成角色",
            capabilities={},
            execution_policy={
                "paid_generation": {
                    "mode": "auto_under_budget",
                    "max_total": 2,
                    "currency": "CNY",
                }
            },
            steps=self.mcp_generation_steps(),
        )

        self.assertEqual(run["status"], "succeeded")
        self.assertEqual(self.generation_services["default"].submit_count, 1)

    def test_13_native_artifact_creates_normal_generation_record(self):
        run = self.service.create_run(
            "default",
            request_text="生成角色",
            capabilities={"native_image_generation": True},
            steps=self.native_generation_steps(),
        )
        finished = self.service.submit_artifact(
            "default",
            run["id"],
            "generate",
            data_url=image_data_url(),
            idempotency_key="native-one",
        )

        record_id = finished["outputs"]["generate"]["record_id"]
        record = self.generation_services["default"].find_record(record_id)
        self.assertEqual(finished["status"], "succeeded")
        self.assertEqual(record["source_executor"], "agent_native")
        self.assertTrue(Path(record["local_path"]).is_file())
        self.assertEqual((record["width"], record["height"]), (6, 4))

    def test_14_native_artifact_rejects_invalid_image_content(self):
        run = self.service.create_run(
            "default",
            request_text="生成角色",
            capabilities={"native_image_generation": True},
            steps=self.native_generation_steps(),
        )
        invalid = "data:image/png;base64," + base64.b64encode(b"not-image").decode()

        with self.assertRaises(AgentWorkflowError):
            self.service.submit_artifact(
                "default", run["id"], "generate", data_url=invalid
            )

    def test_15_native_artifact_retry_with_same_key_does_not_duplicate(self):
        run = self.service.create_run(
            "default",
            request_text="生成角色",
            capabilities={"native_image_generation": True},
            steps=self.native_generation_steps(),
        )
        first = self.service.submit_artifact(
            "default",
            run["id"],
            "generate",
            data_url=image_data_url(),
            idempotency_key="native-one",
        )
        second = self.service.submit_artifact(
            "default",
            run["id"],
            "generate",
            data_url=image_data_url(color=(1, 2, 3, 255)),
            idempotency_key="native-one",
        )

        self.assertEqual(
            first["outputs"]["generate"]["record_id"],
            second["outputs"]["generate"]["record_id"],
        )
        self.assertEqual(len(self.generation_services["default"].list_history()), 1)

    def test_16_server_actions_resolve_prior_action_outputs(self):
        run = self.service.create_run(
            "default",
            request_text="建立资产并生成",
            capabilities={"native_image_generation": True},
            steps=[
                {
                    "id": "asset",
                    "type": "asset.create",
                    "inputs": {
                        "parent_id": "category-character",
                        "name": "Hero",
                    },
                },
                {
                    "id": "generate",
                    "type": "image.generate",
                    "depends_on": ["asset"],
                    "inputs": {
                        "prompt": "hero",
                        "model": "native-image",
                        "asset_node_id": {
                            "$from": "asset",
                            "path": "asset_node_id",
                        },
                    },
                },
            ],
        )

        created_id = run["outputs"]["asset"]["asset_node_id"]
        self.assertEqual(
            run["next_actions"][0]["resolved_inputs"]["asset_node_id"], created_id
        )

    def test_17_style_confirmation_updates_project_manifest(self):
        run = self.service.create_run(
            "default",
            request_text="确认风格",
            steps=[
                {
                    "id": "style",
                    "type": "style.create",
                    "inputs": {"name": "Soft Pixel"},
                },
                {
                    "id": "confirm",
                    "type": "style.confirm",
                    "depends_on": ["style"],
                    "inputs": {
                        "style_id": {"$from": "style", "path": "style_id"}
                    },
                },
            ],
        )

        project = self.project_service.project_dashboard("default")["project"]
        self.assertEqual(run["status"], "succeeded")
        self.assertEqual(project["style_status"], "confirmed")
        self.assertEqual(
            project["current_style_direction_id"],
            run["outputs"]["style"]["style_id"],
        )

    def test_18_processing_actions_use_project_scoped_executor(self):
        run = self.service.create_run(
            "default",
            request_text="处理图片",
            steps=[
                {
                    "id": "matte",
                    "type": "image.matte",
                    "inputs": {"record_id": "record-one"},
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
            ],
        )

        self.assertEqual(run["status"], "succeeded")
        self.assertEqual(
            [item[0] for item in self.processing_calls],
            ["image.matte", "image.split"],
        )
        self.assertEqual(self.processing_calls[1][1]["record_id"], "record-one")

    def test_19_flow_save_action_creates_reusable_recipe(self):
        run = self.service.create_run(
            "default",
            request_text="保存流程",
            steps=[
                {
                    "id": "define",
                    "type": "style.define",
                },
                {
                    "id": "save",
                    "type": "flow.save",
                    "depends_on": ["define"],
                    "inputs": {"name": "保存后的流程"},
                },
            ],
        )
        finished = self.service.submit_action_result(
            "default", run["id"], "define", result={"style": "pixel"}
        )

        recipe_id = finished["outputs"]["save"]["recipe_id"]
        self.assertEqual(finished["status"], "succeeded")
        self.assertEqual(
            self.service.get_recipe("default", recipe_id)["name"],
            "保存后的流程",
        )

    def test_20_cancel_is_persistent_and_restart_safe(self):
        run = self.service.create_run(
            "default", request_text="等待规划", capabilities={}
        )
        canceled = self.service.cancel_run("default", run["id"])
        restarted = AgentWorkflowService(
            self.project_service,
            self.service.generation_service_factory,
            processing_executor=self.service.processing_executor,
        )

        self.assertEqual(canceled["status"], "canceled")
        self.assertEqual(
            restarted.get_run("default", run["id"])["status"], "canceled"
        )
        with self.assertRaises(AgentWorkflowError):
            restarted.resume_run("default", run["id"])


if __name__ == "__main__":
    unittest.main()
