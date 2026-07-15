import json
import tempfile
import unittest
from pathlib import Path

from project_service import ProjectError, ProjectService


class ProjectServiceTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.work_dir = Path(self.temporary_directory.name) / "work"
        self.service = ProjectService(self.work_dir)

    def tearDown(self):
        self.temporary_directory.cleanup()

    def test_initializes_file_backed_default_project(self):
        payload = self.service.list_projects()

        self.assertEqual(payload["active_project_id"], "")
        self.assertEqual(payload["projects"][0]["id"], "default")
        self.assertTrue(payload["projects"][0]["available"])
        root = self.work_dir / "projects" / "default"
        self.assertTrue((root / ".sprite-lab" / "project.json").is_file())
        self.assertTrue((root / ".sprite-lab" / "asset-tree.json").is_file())
        self.assertTrue((root / "production" / "images").is_dir())
        self.assertTrue((root / "processing" / "videos").is_dir())
        self.assertTrue((root / "library" / "assets").is_dir())

    def test_creates_project_under_english_slug(self):
        project = self.service.create_project(
            display_name="星球防线",
            slug="planet-defense",
            project_type="vertical-shooter",
            aspect_ratio="9:16",
        )

        self.assertEqual(project["display_name"], "星球防线")
        self.assertEqual(project["slug"], "planet-defense")
        self.assertEqual(Path(project["root_path"]).name, "planet-defense")
        self.assertEqual(self.service.list_projects()["active_project_id"], project["id"])

    def test_template_project_creates_expected_asset_nodes_and_custom_ratio(self):
        project = self.service.create_project(
            display_name="Wide UI",
            slug="wide-ui",
            aspect_ratio="21:9",
            create_mode="template",
            template_id="game-ui-kit",
        )

        self.assertEqual(project["aspect_ratio"], "21:9")
        tree = self.service.list_asset_tree(project["id"])
        names = {node["name"] for node in tree["nodes"]}
        self.assertTrue({"HUD Layout", "Menu Panels", "Core Icons"}.issubset(names))

    def test_rejects_non_english_slug(self):
        with self.assertRaises(ProjectError):
            self.service.create_project(display_name="星球防线", slug="星球防线")

    def test_rejects_non_empty_unrecognized_directory(self):
        parent = Path(self.temporary_directory.name) / "custom"
        target = parent / "occupied"
        target.mkdir(parents=True)
        (target / "foreign.txt").write_text("keep", encoding="utf-8")

        with self.assertRaises(ProjectError):
            self.service.create_project(
                display_name="Occupied Project",
                slug="occupied",
                parent_path=str(parent),
            )

        self.assertEqual((target / "foreign.txt").read_text(encoding="utf-8"), "keep")

    def test_can_reopen_existing_project_from_another_registry(self):
        project = self.service.create_project(
            display_name="Reusable Project",
            slug="reusable-project",
        )
        other_work = Path(self.temporary_directory.name) / "other-work"
        other_service = ProjectService(other_work)

        opened = other_service.open_project(project["root_path"])

        self.assertEqual(opened["id"], project["id"])
        self.assertEqual(other_service.list_projects()["active_project_id"], project["id"])

    def test_resolve_project_file_rejects_escape(self):
        with self.assertRaises(ProjectError):
            self.service.resolve_project_file("default", "../settings.json")

    def test_workflow_run_is_idempotent_and_audited(self):
        first = self.service.create_workflow_run(
            "default",
            actor="codex",
            request_text="Create a complete UI asset set",
            steps=[{"id": "generate", "status": "pending"}],
            idempotency_key="request-001",
        )
        second = self.service.create_workflow_run(
            "default",
            actor="codex",
            request_text="This retry must not duplicate the run",
            idempotency_key="request-001",
        )

        self.assertEqual(first["id"], second["id"])
        events = self.service.list_events("default")
        self.assertTrue(any(event.get("type") == "workflow.created" for event in events))
        run_path = self.work_dir / "projects" / "default" / ".sprite-lab" / "workflows" / f"{first['id']}.json"
        payload = json.loads(run_path.read_text(encoding="utf-8"))
        self.assertEqual(payload["actor"], "codex")

    def test_asset_tree_nodes_are_file_backed_and_audited(self):
        node = self.service.create_asset_node(
            "default",
            parent_id="category-character",
            name="主角设定图",
            target_count=8,
        )

        tree = self.service.list_asset_tree("default")
        self.assertTrue(any(item["id"] == node["id"] for item in tree["nodes"]))
        updated = self.service.update_asset_node(
            "default", node["id"], name="主角动作", target_count=12
        )
        self.assertEqual(updated["name"], "主角动作")
        self.assertEqual(updated["target_count"], 12)
        events = self.service.list_events("default")
        self.assertTrue(any(event.get("type") == "asset-node.created" for event in events))
        self.assertTrue(any(event.get("type") == "asset-node.updated" for event in events))

        deleted = self.service.delete_asset_node("default", node["id"])
        self.assertEqual(deleted["deleted_id"], node["id"])

    def test_asset_tree_protects_categories_and_referenced_nodes(self):
        with self.assertRaises(ProjectError):
            self.service.delete_asset_node("default", "category-character")

        node = self.service.create_asset_node(
            "default", parent_id="category-character", name="主角设定图"
        )
        history_path = self.work_dir / "projects" / "default" / ".sprite-lab" / "generation-history.json"
        history = json.loads(history_path.read_text(encoding="utf-8"))
        history["records"].append(
            {"id": "gen-1", "asset_node_id": node["id"], "status": "succeeded"}
        )
        history_path.write_text(json.dumps(history, ensure_ascii=False), encoding="utf-8")

        counted = self.service.list_asset_tree("default")
        counted_node = next(item for item in counted["nodes"] if item["id"] == node["id"])
        self.assertEqual(counted_node["generated_count"], 1)
        self.assertEqual(counted_node["completed_count"], 1)
        with self.assertRaises(ProjectError):
            self.service.delete_asset_node("default", node["id"])

    def test_processing_intake_copies_sources_and_preserves_lineage(self):
        paths = self.service.project_paths("default")
        source = paths["production_images"] / "generated.png"
        source.write_bytes(b"generated-image-content")
        history = json.loads(paths["generation_history"].read_text(encoding="utf-8"))
        history["records"].append(
            {
                "id": "gen-ready",
                "asset_node_id": "category-character",
                "status": "succeeded",
                "local_path": str(source),
            }
        )
        paths["generation_history"].write_text(
            json.dumps(history, ensure_ascii=False), encoding="utf-8"
        )

        intake = self.service.create_processing_intake(
            "default",
            record_ids=["gen-ready"],
            actor="codex",
            idempotency_key="intake-request-1",
        )
        retried = self.service.create_processing_intake(
            "default",
            record_ids=["gen-ready"],
            actor="codex",
            idempotency_key="intake-request-1",
        )

        self.assertEqual(intake["id"], retried["id"])
        copied = paths["root"] / intake["sources"][0]["working_relative_path"]
        self.assertEqual(copied.read_bytes(), source.read_bytes())
        self.assertEqual(len(intake["sources"][0]["sha256"]), 64)
        manifest = paths["processing_intakes"] / f"{intake['id']}.json"
        self.assertTrue(manifest.is_file())
        events = self.service.list_events("default")
        self.assertTrue(
            any(event.get("type") == "processing.intake-created" for event in events)
        )

    def test_style_canvas_and_project_settings_are_file_backed(self):
        direction = self.service.create_style_direction(
            "default", name="Ink Adventure", description="Bold black outlines", tags=["ink", "game"]
        )
        confirmed = self.service.update_style_direction(
            "default", direction["id"], changes={"status": "confirmed"}
        )
        project = self.service.update_project(
            "default",
            changes={"description": "A file-backed project", "default_image_count": 2},
        )
        canvas = self.service.save_canvas(
            "default",
            "style",
            canvas={
                "viewport": {"x": 12, "y": -8, "zoom": 1.25},
                "nodes": [{"id": "n1", "ref_type": "style", "ref_id": direction["id"], "x": 30, "y": 40}],
            },
        )

        self.assertEqual(confirmed["status"], "confirmed")
        self.assertEqual(project["description"], "A file-backed project")
        self.assertEqual(canvas["nodes"][0]["ref_id"], direction["id"])
        self.assertEqual(self.service.load_canvas("default", "style")["viewport"]["zoom"], 1.25)
        self.assertEqual(self.service.get_project("default")["style_status"], "confirmed")

    def test_generation_lifecycle_library_trash_and_restore(self):
        paths = self.service.project_paths("default")
        source = paths["production_images"] / "generated.png"
        source.write_bytes(b"generated-image-content")
        history = json.loads(paths["generation_history"].read_text(encoding="utf-8"))
        history["records"].append(
            {
                "id": "gen-library",
                "asset_node_id": "category-character",
                "status": "succeeded",
                "prompt": "Hero portrait",
                "local_path": str(source),
                "width": 128,
                "height": 128,
            }
        )
        paths["generation_history"].write_text(json.dumps(history), encoding="utf-8")

        selected = self.service.update_generation_lifecycle(
            "default", record_ids=["gen-library"], lifecycle_status="selected"
        )
        assets = self.service.ingest_library_assets("default", record_ids=["gen-library"])
        trash_item = self.service.trash_library_asset("default", assets[0]["id"])

        self.assertEqual(selected[0]["lifecycle_status"], "selected")
        self.assertEqual(len(self.service.list_library_assets("default")), 0)
        self.assertEqual(self.service.list_trash("default")[0]["id"], trash_item["id"])

        self.service.restore_trash_items("default", [trash_item["id"]])
        restored = self.service.list_library_assets("default")
        self.assertEqual(restored[0]["id"], assets[0]["id"])
        self.assertTrue((paths["root"] / restored[0]["relative_path"]).is_file())

    def test_style_trash_restore_and_purge(self):
        direction = self.service.create_style_direction("default", name="Candidate")
        trashed = self.service.trash_style_direction("default", direction["id"])
        self.assertEqual(self.service.list_style_directions("default"), [])
        self.service.restore_trash_items("default", [trashed["id"]])
        self.assertEqual(self.service.list_style_directions("default")[0]["id"], direction["id"])

        trashed_again = self.service.trash_style_direction("default", direction["id"])
        result = self.service.purge_trash_items("default", [trashed_again["id"]])
        self.assertEqual(result["purged_ids"], [trashed_again["id"]])

    def test_integration_preflight_and_deploy_are_verified_and_idempotent(self):
        paths = self.service.project_paths("default")
        source = paths["production_images"] / "deploy.png"
        source.write_bytes(b"deploy-image")
        history = json.loads(paths["generation_history"].read_text(encoding="utf-8"))
        history["records"].append(
            {"id": "gen-deploy", "asset_node_id": "category-icon", "status": "succeeded", "prompt": "Icon", "local_path": str(source)}
        )
        paths["generation_history"].write_text(json.dumps(history), encoding="utf-8")
        asset = self.service.ingest_library_assets("default", record_ids=["gen-deploy"])[0]
        target_root = Path(self.temporary_directory.name) / "formal-project"
        self.service.update_integration("default", target_root=str(target_root), mappings={"icon": "Assets/Icons"})

        preflight = self.service.integration_preflight("default", [asset["id"]])
        first = self.service.deploy_library_assets("default", [asset["id"]], idempotency_key="deploy-1")
        second = self.service.deploy_library_assets("default", [asset["id"]], idempotency_key="deploy-1")

        self.assertTrue(preflight["ready"])
        self.assertEqual(first["id"], second["id"])
        self.assertTrue((target_root / "Assets" / "Icons" / asset["file_name"]).is_file())

    def test_project_fields_follow_ui_contract_limits(self):
        with self.assertRaises(ProjectError):
            self.service.create_project(display_name="x" * 31, slug="too-long-name")
        with self.assertRaises(ProjectError):
            self.service.create_project(
                display_name="Valid Project",
                slug="too-long-description",
                description="x" * 201,
            )

    def test_asset_node_delete_uses_recoverable_trash(self):
        node = self.service.create_asset_node(
            "default", parent_id="category-ui", name="HUD Panel"
        )
        trashed = self.service.trash_asset_node("default", node["id"])

        self.assertFalse(
            any(item["id"] == node["id"] for item in self.service.list_asset_tree("default")["nodes"])
        )
        self.assertEqual(trashed["object_type"], "asset_node")
        self.service.restore_trash_items("default", [trashed["id"]])
        self.assertTrue(
            any(item["id"] == node["id"] for item in self.service.list_asset_tree("default")["nodes"])
        )

    def test_purging_generation_result_removes_record_and_project_file(self):
        paths = self.service.project_paths("default")
        source = paths["production_images"] / "purge-me.png"
        source.write_bytes(b"generated")
        history = json.loads(paths["generation_history"].read_text(encoding="utf-8"))
        history["records"].append(
            {
                "id": "gen-purge",
                "status": "succeeded",
                "prompt": "Temporary",
                "local_path": str(source),
            }
        )
        paths["generation_history"].write_text(json.dumps(history), encoding="utf-8")

        self.service.update_generation_lifecycle(
            "default", record_ids=["gen-purge"], lifecycle_status="trashed"
        )
        trash_item = next(
            item for item in self.service.list_trash("default")
            if item["object_id"] == "gen-purge"
        )
        self.service.purge_trash_items("default", [trash_item["id"]])

        self.assertFalse(source.exists())
        self.assertFalse(
            any(item["id"] == "gen-purge" for item in self.service.list_generation_results("default"))
        )

    def test_workflow_runs_can_be_listed_read_and_updated(self):
        run = self.service.create_workflow_run(
            "default",
            actor="codex",
            request_text="Build a UI asset",
            steps=[{"id": "produce", "status": "planned"}],
            idempotency_key="workflow-1",
        )
        running = self.service.update_workflow_run(
            "default",
            run["id"],
            changes={
                "status": "running",
                "steps": [{"id": "produce", "status": "running", "retry_count": 0}],
            },
            actor="codex",
        )
        succeeded = self.service.update_workflow_run(
            "default",
            run["id"],
            changes={"status": "succeeded", "outputs": {"asset_ids": ["asset-1"]}},
            actor="codex",
        )

        self.assertTrue(running.get("started_at"))
        self.assertTrue(succeeded.get("finished_at"))
        self.assertEqual(self.service.get_workflow_run("default", run["id"])["status"], "succeeded")
        self.assertEqual(self.service.list_workflow_runs("default")[0]["id"], run["id"])


if __name__ == "__main__":
    unittest.main()
