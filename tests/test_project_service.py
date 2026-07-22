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

    def test_rebases_stale_default_project_path_to_current_work_dir(self):
        other_work = Path(self.temporary_directory.name) / "other-work"
        old_default = other_work / "projects" / "default"
        registry_path = other_work / "project-registry.json"
        other_work.mkdir(parents=True)
        registry_path.write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "active_project_id": "",
                    "projects": [
                        {
                            "id": "default",
                            "root_path": str(self.work_dir / "stale-worktree" / "projects" / "default"),
                            "added_at": "2026-01-01T00:00:00+00:00",
                            "last_opened_at": "2026-01-01T00:00:00+00:00",
                        }
                    ],
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        service = ProjectService(other_work)
        default_project = service.list_projects()["projects"][0]

        self.assertEqual(default_project["id"], "default")
        self.assertTrue(default_project["available"])
        self.assertEqual(Path(default_project["root_path"]), old_default)

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

    def test_generation_count_defaults_to_one(self):
        default_project = self.service.get_project("default")
        project = self.service.create_project(
            display_name="Single Image",
            slug="single-image",
        )

        self.assertEqual(default_project["default_image_count"], 1)
        self.assertEqual(project["default_image_count"], 1)

    def test_legacy_generation_count_default_is_migrated_to_one(self):
        manifest_path = (
            self.work_dir / "projects" / "default" / ".sprite-lab" / "project.json"
        )
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["default_image_count"] = 4
        manifest.pop("generation_defaults_version", None)
        manifest_path.write_text(
            json.dumps(manifest, ensure_ascii=False),
            encoding="utf-8",
        )

        project = self.service.get_project("default")
        persisted = json.loads(manifest_path.read_text(encoding="utf-8"))

        self.assertEqual(project["default_image_count"], 1)
        self.assertEqual(persisted["default_image_count"], 1)
        self.assertEqual(persisted["generation_defaults_version"], 2)

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

    def test_container_generation_records_migrate_to_uncategorized_assets_idempotently(self):
        group = self.service.create_asset_node(
            "default",
            parent_id="category-character",
            name="主角组",
            node_type="group",
        )
        paths = self.service.project_paths("default")
        history = json.loads(paths["generation_history"].read_text(encoding="utf-8"))
        history["records"].extend(
            [
                {
                    "id": "legacy-category-result",
                    "asset_node_id": "category-character",
                    "status": "succeeded",
                    "lifecycle_status": "confirmed",
                    "created_at": "2026-07-01T00:00:00+00:00",
                    "local_path": "production/images/category.png",
                },
                {
                    "id": "legacy-group-result",
                    "asset_node_id": group["id"],
                    "status": "succeeded",
                    "lifecycle_status": "selected",
                    "created_at": "2026-07-02T00:00:00+00:00",
                    "local_path": "production/images/group.png",
                },
            ]
        )
        paths["generation_history"].write_text(
            json.dumps(history, ensure_ascii=False),
            encoding="utf-8",
        )

        tree = self.service.list_asset_tree("default")
        uncategorized = [
            node
            for node in tree["nodes"]
            if node.get("system_role") == "uncategorized-generation-results"
        ]
        self.assertEqual(len(uncategorized), 2)
        targets = {node["parent_id"]: node["id"] for node in uncategorized}
        migrated = json.loads(paths["generation_history"].read_text(encoding="utf-8"))
        migrated_by_id = {record["id"]: record for record in migrated["records"]}
        category_record = migrated_by_id["legacy-category-result"]
        group_record = migrated_by_id["legacy-group-result"]
        self.assertEqual(category_record["asset_node_id"], targets["category-character"])
        self.assertEqual(group_record["asset_node_id"], targets[group["id"]])
        self.assertEqual(category_record["lifecycle_status"], "confirmed")
        self.assertEqual(category_record["created_at"], "2026-07-01T00:00:00+00:00")
        self.assertEqual(category_record["local_path"], "production/images/category.png")
        self.assertEqual(
            category_record["asset_node_migration"]["previous_asset_node_id"],
            "category-character",
        )

        migration_root = paths["marker"] / "migrations" / "asset-leaf-generation-target-v1"
        self.assertTrue((migration_root / "asset-tree.before.json").is_file())
        self.assertTrue((migration_root / "generation-history.before.json").is_file())
        self.assertTrue((migration_root / "migration.json").is_file())
        first_node_ids = [node["id"] for node in tree["nodes"]]
        second_tree = self.service.list_asset_tree("default")
        self.assertEqual([node["id"] for node in second_tree["nodes"]], first_node_ids)
        self.assertTrue(
            any(
                event.get("type") == "generation.asset-targets-migrated"
                for event in self.service.list_events("default")
            )
        )

    def test_generation_target_requires_asset_with_internal_container_fallback(self):
        asset = self.service.create_asset_node(
            "default",
            parent_id="category-character",
            name="主角",
        )
        resolved = self.service.resolve_generation_target("default", asset["id"])
        self.assertEqual(resolved["id"], asset["id"])

        with self.assertRaisesRegex(ProjectError, "请选择具体资产"):
            self.service.resolve_generation_target("default", "category-character")

        fallback = self.service.resolve_generation_target(
            "default",
            "category-other",
            allow_container_fallback=True,
        )
        repeated = self.service.resolve_generation_target(
            "default",
            "category-other",
            allow_container_fallback=True,
        )
        self.assertEqual(fallback["type"], "asset")
        self.assertEqual(fallback["parent_id"], "category-other")
        self.assertEqual(fallback["system_role"], "uncategorized-generation-results")
        self.assertEqual(repeated["id"], fallback["id"])
        with self.assertRaisesRegex(ProjectError, "System asset nodes cannot be edited"):
            self.service.update_asset_node("default", fallback["id"], name="改名")

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
        self.assertEqual(self.service.get_project("default")["style_status"], "unconfirmed")

    def test_confirming_a_direction_no_longer_archives_siblings(self):
        first = self.service.create_style_direction("default", name="First")
        second = self.service.create_style_direction("default", name="Second")
        self.service.update_style_direction(
            "default", first["id"], changes={"status": "confirmed"}
        )
        self.service.update_style_direction(
            "default", second["id"], changes={"status": "confirmed"}
        )
        styles = {
            item["id"]: item
            for item in self.service.list_style_directions("default")
        }
        self.assertEqual(styles[first["id"]]["status"], "confirmed")
        self.assertEqual(styles[second["id"]]["status"], "confirmed")
        self.assertEqual(
            self.service.get_project("default")["current_style_direction_id"],
            "",
        )

    def test_style_content_transfer_moves_references_and_generation_results(self):
        source = self.service.create_style_direction("default", name="Source")
        target = self.service.create_style_direction("default", name="Target")
        reference = {
            "relative_path": "production/images/reference.png",
            "file_name": "reference.png",
            "original_name": "reference.png",
            "display_name": "Reference",
        }
        self.service.update_style_direction(
            "default", source["id"], changes={"reference_images": [reference]}
        )
        paths = self.service.project_paths("default")
        generated = paths["production_images"] / "move-result.png"
        generated.write_bytes(b"move-result")
        history = json.loads(paths["generation_history"].read_text(encoding="utf-8"))
        history["records"].append(
            {
                "id": "move-result",
                "status": "succeeded",
                "style_direction_id": source["id"],
                "local_path": str(generated),
            }
        )
        paths["generation_history"].write_text(
            json.dumps(history, ensure_ascii=False), encoding="utf-8"
        )

        result = self.service.transfer_style_content(
            "default",
            source_style_id=source["id"],
            target_style_id=target["id"],
            reference_paths=[reference["relative_path"]],
            record_ids=["move-result"],
            mode="move",
        )

        self.assertEqual(result["source_style"]["reference_images"], [])
        self.assertEqual(
            result["target_style"]["reference_images"][0]["relative_path"],
            reference["relative_path"],
        )
        moved = next(
            item for item in self.service.list_generation_results("default")
            if item["id"] == "move-result"
        )
        self.assertEqual(moved["style_direction_id"], target["id"])
        self.assertTrue(generated.is_file())

    def test_style_content_transfer_copies_completed_result_and_checks_ownership(self):
        source = self.service.create_style_direction("default", name="Source")
        target = self.service.create_style_direction("default", name="Target")
        other = self.service.create_style_direction("default", name="Other")
        paths = self.service.project_paths("default")
        generated = paths["production_images"] / "copy-result.png"
        generated.write_bytes(b"copy-result")
        history = json.loads(paths["generation_history"].read_text(encoding="utf-8"))
        history["records"].append(
            {
                "id": "copy-result",
                "status": "succeeded",
                "style_direction_id": source["id"],
                "local_path": str(generated),
                "lifecycle_status": "selected",
            }
        )
        paths["generation_history"].write_text(
            json.dumps(history, ensure_ascii=False), encoding="utf-8"
        )

        result = self.service.transfer_style_content(
            "default",
            source_style_id=source["id"],
            target_style_id=target["id"],
            record_ids=["copy-result"],
            mode="copy",
        )

        copied = result["records"][0]
        copied_path = Path(copied["local_path"])
        self.assertNotEqual(copied["id"], "copy-result")
        self.assertEqual(copied["source_record_id"], "copy-result")
        self.assertEqual(copied["style_direction_id"], target["id"])
        self.assertEqual(copied["lifecycle_status"], "normal")
        self.assertNotEqual(copied_path, generated)
        self.assertEqual(copied_path.read_bytes(), generated.read_bytes())
        self.assertTrue(generated.is_file())
        source_record = next(
            item for item in self.service.list_generation_results("default")
            if item["id"] == "copy-result"
        )
        self.assertEqual(source_record["style_direction_id"], source["id"])

        with self.assertRaises(ProjectError):
            self.service.transfer_style_content(
                "default",
                source_style_id=other["id"],
                target_style_id=target["id"],
                record_ids=["copy-result"],
                mode="move",
            )

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
