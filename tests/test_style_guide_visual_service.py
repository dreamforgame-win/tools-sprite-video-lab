import copy
import re
import tempfile
import unittest
from unittest import mock
from pathlib import Path

from PIL import Image

from project_service import ProjectError, ProjectService
from style_guide_service import StyleGuideService
from style_guide_visual_service import StyleGuideVisualService


class FakeGenerationService:
    def __init__(self, root: Path, limit: int = 2):
        self.root = root
        self.limit = limit
        self.records = {}
        self.calls = []
        self.upload_calls = 0

    def image_model_capability(self, model):
        return {"max_reference_images": self.limit}

    def submit_image(self, prompt, model, params, *, context=None):
        record_id = f"record-{len(self.records) + 1}"
        record = {
            "id": record_id,
            "status": "queued",
            "progress": 0,
            "local_path": "",
            "result_asset_id": "",
            "error": "",
        }
        self.records[record_id] = record
        self.calls.append(
            {
                "prompt": prompt,
                "model": model,
                "params": copy.deepcopy(params),
                "context": copy.deepcopy(context or {}),
                "record_id": record_id,
            }
        )
        return copy.deepcopy(record)

    def refresh_task(self, record_id):
        return copy.deepcopy(self.records[record_id])

    def find_record(self, record_id):
        if record_id not in self.records:
            raise ValueError(f"History record not found: {record_id}")
        return copy.deepcopy(self.records[record_id])

    def succeed(self, record_id, relative_path, asset_id):
        path = self.root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", (320, 180), "#346854").save(path)
        self.records[record_id].update(
            {
                "status": "succeeded",
                "progress": 100,
                "local_path": str(path),
                "result_asset_id": asset_id,
            }
        )

    def fail(self, record_id, message="failed"):
        self.records[record_id].update({"status": "failed", "error": message})


class StyleGuideVisualServiceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.projects = ProjectService(Path(self.temp.name) / "work")
        self.guides = StyleGuideService(self.projects)
        self.direction = self.projects.create_style_direction("default", name="像素田园")
        self.package = self.guides.create_draft("default", self.direction["id"])
        self.visuals = StyleGuideVisualService(self.projects, self.guides)
        self.root = self.projects.project_root("default")
        self.reference = self.root / "references" / "source.png"
        self.reference.parent.mkdir(parents=True, exist_ok=True)
        Image.new("RGB", (64, 64), "#aa7744").save(self.reference)
        self.generation = FakeGenerationService(self.root)

    def tearDown(self):
        self.temp.cleanup()

    def request(self, **changes):
        request = {
            "mode": "modular",
            "module_types": ["environment", "ui_hud"],
            "model": "image-a",
            "params": {"aspect_ratio": "16:9", "resolution": "1K"},
            "reference_sources": [
                {
                    "kind": "style_reference",
                    "id": "reference-a",
                    "relative_path": "references/source.png",
                    "display_name": "源图",
                }
            ],
            "actor": "user",
        }
        request.update(changes)
        return request

    def create(self, **changes):
        return self.visuals.create_run(
            "default",
            self.package["id"],
            self.request(**changes),
            generation_service=self.generation,
        )

    def finish_modular(self, module_types=None):
        run = self.create(module_types=module_types or ["environment"])
        anchor = run["nodes"][0]
        self.generation.succeed(anchor["record_id"], "production/generated/anchor.png", "asset-anchor")
        run = self.visuals.refresh_run(
            "default", self.package["id"], run["id"], generation_service=self.generation
        )
        for node in run["nodes"]:
            if node["kind"] == "image" and node["id"] != "anchor":
                self.generation.succeed(
                    node["record_id"], f"production/generated/{node['id']}.png", f"asset-{node['id']}"
                )
        return self.visuals.refresh_run(
            "default", self.package["id"], run["id"], generation_service=self.generation
        )

    def finish_overall(self):
        run = self.create(mode="overall", module_types=["environment"])
        self.generation.succeed(run["nodes"][0]["record_id"], "production/generated/overall.png", "asset-overall")
        return self.visuals.refresh_run(
            "default", self.package["id"], run["id"], generation_service=self.generation
        )

    def style_canvas_type(self):
        direction_id = re.sub(r"^style_", "", self.direction["id"])
        return f"style-{re.sub(r'[^a-zA-Z0-9-]', '', direction_id)[:32]}"

    def test_create_modular_run_builds_dynamic_node_plan(self):
        run = self.visuals.create_run_document("default", self.package["id"], self.request(module_types=["ui_hud", "environment"]))
        self.assertEqual([node["id"] for node in run["nodes"]], ["anchor", "environment", "ui_hud", "template"])

    def test_create_overall_run_has_exactly_two_nodes(self):
        run = self.visuals.create_run_document("default", self.package["id"], self.request(mode="overall", module_types=["environment"]))
        self.assertEqual([node["id"] for node in run["nodes"]], ["overall", "template"])

    def test_unknown_mode_is_rejected(self):
        with self.assertRaises(ValueError):
            self.visuals.create_run_document("default", self.package["id"], self.request(mode="unknown"))

    def test_empty_overall_modules_are_rejected(self):
        with self.assertRaises(ValueError):
            self.visuals.create_run_document("default", self.package["id"], self.request(mode="overall", module_types=[]))

    def test_zero_references_are_rejected(self):
        with self.assertRaises(ValueError):
            self.create(reference_sources=[])

    def test_modules_use_canonical_order(self):
        run = self.visuals.create_run_document("default", self.package["id"], self.request(module_types=["ui_hud", "character", "environment"]))
        self.assertEqual(run["module_types"], ["environment", "character", "ui_hud"])

    def test_detail_profile_defaults_to_compact_and_is_persisted(self):
        run = self.visuals.create_run_document("default", self.package["id"], self.request())
        self.assertEqual(run["detail_profile"], "compact")
        self.assertEqual(run["prompt_bundle"]["detail_profile"], "compact")
        self.assertIn("96–128px", run["nodes"][0]["prompt"])

    def test_detail_profile_changes_input_signature_and_preview(self):
        compact = self.visuals.create_run_document(
            "default", self.package["id"], self.request(detail_profile="compact")
        )
        rich = self.visuals.create_run_document(
            "default", self.package["id"], self.request(detail_profile="rich")
        )
        preview = self.create(detail_profile="standard", preview_only=True)
        self.assertNotEqual(compact["input_signature"], rich["input_signature"])
        self.assertEqual(preview["detail_profile"], "standard")
        self.assertEqual(preview["prompt_bundle"]["detail_profile"], "standard")

    def test_unknown_detail_profile_is_rejected(self):
        with self.assertRaises(ValueError):
            self.visuals.create_run_document(
                "default", self.package["id"], self.request(detail_profile="unknown")
            )

    def test_list_and_get_return_deep_copies(self):
        run = self.visuals.create_run_document("default", self.package["id"], self.request())
        fetched = self.visuals.get_run("default", self.package["id"], run["id"])
        fetched["nodes"].clear()
        self.assertTrue(self.visuals.get_run("default", self.package["id"], run["id"])["nodes"])

    def test_supersedes_run_marks_previous_history(self):
        first = self.visuals.create_run_document("default", self.package["id"], self.request())
        self.visuals.create_run_document("default", self.package["id"], self.request(supersedes_run_id=first["id"]))
        self.assertEqual(self.visuals.get_run("default", self.package["id"], first["id"])["status"], "superseded")

    def test_reference_source_must_resolve_inside_project(self):
        with self.assertRaises(ProjectError):
            self.create(reference_sources=[{"kind": "style_reference", "relative_path": "../outside.png"}])

    def test_generation_result_source_reuses_remote_asset_id(self):
        record = self.generation.submit_image("seed", "image-a", {})
        self.generation.succeed(record["id"], "production/generated/source.png", "asset-generated")
        self.generation.records[record["id"]]["style_direction_id"] = self.direction["id"]
        run = self.create(reference_sources=[{"kind": "generation_result", "id": record["id"]}])
        self.assertEqual(run["reference_sources"][0]["remote_asset_id"], "asset-generated")

    def test_reference_count_is_trimmed_with_warning(self):
        second = self.root / "references" / "second.png"
        third = self.root / "references" / "third.png"
        Image.new("RGB", (8, 8)).save(second)
        Image.new("RGB", (8, 8)).save(third)
        sources = [
            {"kind": "style_reference", "id": name, "relative_path": f"references/{name}.png"}
            for name in ("source", "second", "third")
        ]
        run = self.create(reference_sources=sources)
        self.assertEqual(len(self.generation.calls[-1]["params"]["reference_images"]), 2)
        self.assertEqual(run["warnings"][0]["type"], "reference_limit")

    def test_overall_run_submits_one_image_task(self):
        run = self.create(mode="overall", module_types=["environment"])
        self.assertEqual(len(self.generation.calls), 1)
        self.assertEqual(run["nodes"][0]["id"], "overall")

    def test_modular_run_submits_only_anchor_initially(self):
        run = self.create()
        self.assertEqual(len(self.generation.calls), 1)
        self.assertEqual(run["nodes"][0]["id"], "anchor")

    def test_preview_only_has_no_files_or_tasks(self):
        before = len(self.visuals.list_runs("default", self.package["id"]))
        result = self.create(preview_only=True)
        self.assertTrue(result["preview_only"])
        self.assertEqual(len(self.visuals.list_runs("default", self.package["id"])), before)
        self.assertFalse(self.generation.calls)

    def test_anchor_success_submits_selected_modules_in_order(self):
        run = self.create(module_types=["ui_hud", "environment"])
        self.generation.succeed(run["nodes"][0]["record_id"], "production/generated/anchor.png", "asset-anchor")
        self.visuals.refresh_run("default", self.package["id"], run["id"], generation_service=self.generation)
        self.assertEqual([call["context"]["style_guide_visual_node_id"] for call in self.generation.calls], ["anchor", "environment", "ui_hud"])

    def test_module_inputs_use_anchor_asset_within_limit(self):
        run = self.create(module_types=["environment"])
        self.generation.succeed(run["nodes"][0]["record_id"], "production/generated/anchor.png", "asset-anchor")
        self.visuals.refresh_run("default", self.package["id"], run["id"], generation_service=self.generation)
        references = self.generation.calls[-1]["params"]["reference_images"]
        self.assertEqual(references[0]["remote_asset_id"], "asset-anchor")
        self.assertLessEqual(len(references), 2)

    def test_failed_module_preserves_successful_sibling(self):
        run = self.create()
        self.generation.succeed(run["nodes"][0]["record_id"], "production/generated/anchor.png", "asset-anchor")
        run = self.visuals.refresh_run("default", self.package["id"], run["id"], generation_service=self.generation)
        environment = next(node for node in run["nodes"] if node["id"] == "environment")
        ui = next(node for node in run["nodes"] if node["id"] == "ui_hud")
        self.generation.succeed(environment["record_id"], "production/generated/environment.png", "asset-environment")
        self.generation.fail(ui["record_id"])
        run = self.visuals.refresh_run("default", self.package["id"], run["id"], generation_service=self.generation)
        self.assertEqual(next(node for node in run["nodes"] if node["id"] == "environment")["status"], "succeeded")

    def test_active_module_keeps_parent_running_when_sibling_failed(self):
        run = self.create()
        self.generation.succeed(run["nodes"][0]["record_id"], "production/generated/anchor.png", "asset-anchor")
        run = self.visuals.refresh_run(
            "default", self.package["id"], run["id"], generation_service=self.generation
        )
        ui = next(node for node in run["nodes"] if node["id"] == "ui_hud")
        self.generation.fail(ui["record_id"])

        refreshed = self.visuals.refresh_run(
            "default", self.package["id"], run["id"], generation_service=self.generation
        )

        self.assertEqual(
            next(node for node in refreshed["nodes"] if node["id"] == "environment")["status"],
            "queued",
        )
        self.assertEqual(refreshed["status"], "running")

    def test_retried_module_keeps_parent_running_while_sibling_remains_failed(self):
        run = self.create()
        self.generation.succeed(run["nodes"][0]["record_id"], "production/generated/anchor.png", "asset-anchor")
        run = self.visuals.refresh_run(
            "default", self.package["id"], run["id"], generation_service=self.generation
        )
        for node in run["nodes"]:
            if node["id"] in {"environment", "ui_hud"}:
                self.generation.fail(node["record_id"])
        run = self.visuals.refresh_run(
            "default", self.package["id"], run["id"], generation_service=self.generation
        )
        retried = self.visuals.retry_node(
            "default",
            self.package["id"],
            run["id"],
            "environment",
            generation_service=self.generation,
        )

        refreshed = self.visuals.refresh_run(
            "default", self.package["id"], retried["id"], generation_service=self.generation
        )

        self.assertEqual(
            next(node for node in refreshed["nodes"] if node["id"] == "environment")["status"],
            "queued",
        )
        self.assertEqual(refreshed["status"], "running")

    def test_shared_budget_failure_stops_remaining_module_submissions(self):
        run = self.create(module_types=["environment", "character", "ui_hud"])
        self.generation.succeed(run["nodes"][0]["record_id"], "production/generated/anchor.png", "asset-anchor")

        with mock.patch.object(
            self.generation,
            "submit_image",
            side_effect=ValueError("预算不足：MCP Token test 本月预算已用尽"),
        ) as submit:
            refreshed = self.visuals.refresh_run(
                "default", self.package["id"], run["id"], generation_service=self.generation
            )

        modules = [node for node in refreshed["nodes"] if node["id"] in refreshed["module_types"]]
        self.assertEqual(submit.call_count, 1)
        self.assertTrue(all(node["status"] == "failed" for node in modules))
        self.assertEqual([node["attempt"] for node in modules], [1, 0, 0])
        self.assertTrue(all("预算" in node["error"] for node in modules))

    def test_cancel_during_anchor_stops_downstream_module_submission(self):
        run = self.create(module_types=["environment", "character"])

        canceling = self.visuals.cancel_run(
            "default", self.package["id"], run["id"]
        )

        self.assertEqual(canceling["status"], "canceling")
        self.assertTrue(canceling["cancel_requested_at"])
        self.assertEqual(
            [node["status"] for node in canceling["nodes"] if node["id"] in run["module_types"]],
            ["canceled", "canceled"],
        )
        self.generation.succeed(
            run["nodes"][0]["record_id"],
            "production/generated/canceled-anchor.png",
            "asset-canceled-anchor",
        )
        canceled = self.visuals.refresh_run(
            "default", self.package["id"], run["id"], generation_service=self.generation
        )

        self.assertEqual(canceled["status"], "canceled")
        self.assertTrue(canceled["canceled_at"])
        self.assertEqual(len(self.generation.calls), 1)
        self.assertFalse(canceled["template_relative_path"])
        self.assertFalse(self.guides.list_versions("default", self.package["id"]))

    def test_cancel_after_module_submission_waits_for_remote_nodes(self):
        run = self.create(module_types=["environment", "character"])
        self.generation.succeed(run["nodes"][0]["record_id"], "production/generated/anchor.png", "asset-anchor")
        run = self.visuals.refresh_run(
            "default", self.package["id"], run["id"], generation_service=self.generation
        )

        canceling = self.visuals.cancel_run(
            "default", self.package["id"], run["id"]
        )

        self.assertEqual(canceling["status"], "canceling")
        self.assertEqual(len(self.generation.calls), 3)
        for node in canceling["nodes"]:
            if node["id"] in canceling["module_types"]:
                self.generation.succeed(
                    node["record_id"],
                    f"production/generated/canceled-{node['id']}.png",
                    f"asset-canceled-{node['id']}",
                )
        canceled = self.visuals.refresh_run(
            "default", self.package["id"], run["id"], generation_service=self.generation
        )

        self.assertEqual(canceled["status"], "canceled")
        self.assertEqual(next(node for node in canceled["nodes"] if node["id"] == "template")["status"], "canceled")
        self.assertFalse(self.guides.list_versions("default", self.package["id"]))

    def test_cancel_request_is_idempotent_and_persisted(self):
        run = self.create(module_types=["environment"])
        first = self.visuals.cancel_run("default", self.package["id"], run["id"])
        second = self.visuals.cancel_run("default", self.package["id"], run["id"])
        recovered = StyleGuideVisualService(self.projects, self.guides).get_run(
            "default", self.package["id"], run["id"]
        )

        self.assertEqual(second["cancel_requested_at"], first["cancel_requested_at"])
        self.assertEqual(recovered["status"], "canceling")

    def test_terminal_visual_run_cannot_be_canceled(self):
        run = self.finish_overall()

        with self.assertRaises(ValueError):
            self.visuals.cancel_run("default", self.package["id"], run["id"])

    def test_retry_resets_only_failed_module(self):
        run = self.create(module_types=["environment"])
        self.generation.succeed(run["nodes"][0]["record_id"], "production/generated/anchor.png", "asset-anchor")
        run = self.visuals.refresh_run("default", self.package["id"], run["id"], generation_service=self.generation)
        module = next(node for node in run["nodes"] if node["id"] == "environment")
        self.generation.fail(module["record_id"])
        self.visuals.refresh_run("default", self.package["id"], run["id"], generation_service=self.generation)
        retried = self.visuals.retry_node("default", self.package["id"], run["id"], "environment", generation_service=self.generation)
        self.assertEqual(next(node for node in retried["nodes"] if node["id"] == "anchor")["status"], "succeeded")

    def test_regenerated_anchor_invalidates_module_results(self):
        run = self.finish_modular(["environment"])
        regenerated = self.visuals.retry_node("default", self.package["id"], run["id"], "anchor", generation_service=self.generation)
        self.assertNotEqual(regenerated["id"], run["id"])
        self.assertEqual(regenerated["nodes"][0]["id"], "anchor")
        self.assertEqual(regenerated["nodes"][0]["status"], "queued")

    def test_new_service_instance_recovers_persisted_run(self):
        run = self.create()
        recovered = StyleGuideVisualService(self.projects, self.guides).get_run("default", self.package["id"], run["id"])
        self.assertEqual(recovered["id"], run["id"])

    def test_all_image_nodes_render_template_without_remote_call(self):
        run = self.finish_modular(["environment"])
        self.assertEqual(run["status"], "applied")
        self.assertTrue((self.root / run["template_relative_path"]).is_file())
        self.assertEqual(len(self.generation.calls), 2)
        self.assertTrue(run["published_version_id"])

    def test_apply_modular_run_adds_anchor_and_module_references(self):
        run = self.finish_modular(["environment"])
        result = self.visuals.apply_run("default", self.package["id"], run["id"])
        self.assertEqual(result["draft"]["core"]["references"][0]["roles"], ["style-anchor"])
        self.assertIn("composition", result["draft"]["modules"]["environment"]["references"][0]["roles"])

    def test_apply_overall_run_adds_core_overview_only(self):
        run = self.finish_overall()
        result = self.visuals.apply_run("default", self.package["id"], run["id"])
        self.assertEqual(result["draft"]["core"]["references"][0]["roles"], ["overview"])
        self.assertTrue(result["draft"]["modules"]["environment"]["enabled"])
        self.assertEqual(result["draft"]["modules"]["environment"]["references"], [])

    def test_apply_preserves_existing_manual_draft_text(self):
        draft = self.guides.get_draft("default", self.package["id"])
        draft["core"]["vision_statement"] = "保留人工内容"
        self.guides.save_draft("default", self.package["id"], draft)
        run = self.finish_overall()
        result = self.visuals.apply_run("default", self.package["id"], run["id"])
        self.assertEqual(result["draft"]["core"]["vision_statement"], "保留人工内容")

    def test_apply_does_not_modify_published_version(self):
        draft = self.guides.get_draft("default", self.package["id"])
        draft["core"].update({"vision_statement": "视觉", "prompt_fragment": "提示"})
        self.guides.save_draft("default", self.package["id"], draft)
        version = self.guides.publish("default", self.package["id"])
        snapshot = copy.deepcopy(self.guides.get_version("default", self.package["id"], version["id"]))
        run = self.finish_overall()
        self.visuals.apply_run("default", self.package["id"], run["id"])
        self.assertEqual(self.guides.get_version("default", self.package["id"], version["id"]), snapshot)

    def test_apply_is_idempotent_for_same_run(self):
        run = self.finish_overall()
        first = self.visuals.apply_run("default", self.package["id"], run["id"])
        second = self.visuals.apply_run("default", self.package["id"], run["id"])
        self.assertEqual(len(first["draft"]["core"]["references"]), len(second["draft"]["core"]["references"]))

    def test_successful_run_auto_creates_unconfirmed_version(self):
        run = self.finish_modular(["environment", "ui_hud"])
        package = self.guides.get_package("default", self.package["id"])
        versions = self.guides.list_versions("default", self.package["id"])
        self.assertEqual(run["status"], "applied")
        self.assertEqual(len(versions), 1)
        self.assertEqual(versions[0]["id"], run["published_version_id"])
        self.assertEqual(package["confirmed_version_id"], "")
        self.assertEqual(versions[0]["visual_guide"]["model"], "image-a")
        self.assertEqual(versions[0]["visual_guide"]["detail_profile"], "compact")
        self.assertIn("96–128px", versions[0]["visual_guide"]["detail_prompt_fragment"])

    def test_successful_run_groups_generated_images_on_the_style_canvas(self):
        run = self.finish_modular(["environment", "ui_hud"])
        version = self.guides.get_version(
            "default", self.package["id"], run["published_version_id"]
        )
        canvas = self.projects.load_canvas("default", self.style_canvas_type())
        expected_record_ids = {
            node["record_id"]
            for node in run["nodes"]
            if node["kind"] == "image" and node["status"] == "succeeded"
        }

        self.assertEqual(len(canvas["groups"]), 1)
        group = canvas["groups"][0]
        self.assertEqual(group["name"], f"{version['title']} v{version['version']}")
        grouped_nodes = [node for node in canvas["nodes"] if node["group_id"] == group["id"]]
        self.assertEqual({node["ref_id"] for node in grouped_nodes}, expected_record_ids)
        self.assertTrue(all(node["ref_type"] == "generation_result" for node in grouped_nodes))

    def test_overall_run_canvas_group_is_idempotent(self):
        run = self.finish_overall()
        self.visuals.apply_run("default", self.package["id"], run["id"])
        self.visuals.apply_run("default", self.package["id"], run["id"])
        canvas = self.projects.load_canvas("default", self.style_canvas_type())

        self.assertEqual(len(canvas["groups"]), 1)
        self.assertEqual(
            [node["ref_id"] for node in canvas["nodes"]],
            [run["nodes"][0]["record_id"]],
        )

    def test_visual_guide_canvas_group_is_placed_below_existing_content(self):
        canvas_type = self.style_canvas_type()
        self.projects.save_canvas(
            "default",
            canvas_type,
            canvas={
                "viewport": {"x": 0, "y": 0, "zoom": 1},
                "nodes": [
                    {
                        "id": "existing-note",
                        "ref_type": "note",
                        "ref_id": "",
                        "title": "Existing",
                        "x": 70,
                        "y": 70,
                        "width": 220,
                        "height": 160,
                        "locked": False,
                        "z_index": 0,
                        "group_id": "",
                    }
                ],
                "groups": [],
            },
        )
        run = self.finish_overall()
        canvas = self.projects.load_canvas("default", canvas_type)
        generated = next(
            node
            for node in canvas["nodes"]
            if node.get("ref_id") == run["nodes"][0]["record_id"]
        )

        self.assertGreaterEqual(generated["y"], 302)

    def test_finalize_failure_preserves_results_and_retry_does_not_generate(self):
        original_publish = self.guides.publish
        with mock.patch.object(self.guides, "publish", side_effect=ProjectError("save failed")):
            run = self.finish_overall()
        self.assertEqual(run["status"], "finalize_failed")
        self.assertTrue(run["template_relative_path"])
        calls_before_retry = len(self.generation.calls)
        with mock.patch.object(self.guides, "publish", side_effect=original_publish):
            result = self.visuals.apply_run("default", self.package["id"], run["id"])
        self.assertEqual(result["visual_run"]["status"], "applied")
        self.assertEqual(len(self.generation.calls), calls_before_retry)

    def test_visual_version_routes_anchor_and_module_for_balanced_generation(self):
        run = self.finish_modular(["character"])
        self.guides.set_confirmed_version(
            "default", self.package["id"], run["published_version_id"]
        )
        compiled = self.guides.compile_for_generation(
            "default",
            package_id=self.package["id"],
            version_id=run["published_version_id"],
            asset_type="character",
            prompt="new hero",
            mode="balanced",
            model_reference_limit=4,
            overrides={},
        )
        module_types = {
            item["module_type"]
            for item in compiled["snapshot"]["style_guide_reference_snapshot"]
        }
        self.assertEqual(module_types, {"core", "character"})


if __name__ == "__main__":
    unittest.main()
