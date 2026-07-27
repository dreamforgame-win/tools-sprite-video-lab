import copy
import tempfile
import unittest
from pathlib import Path

from project_service import ProjectError, ProjectService
from style_guide_service import StyleGuideService


def valid_draft(package_id):
    return {
        "package_id": package_id,
        "title": "Pixel Garden",
        "summary": "Quiet handcrafted eastern garden",
        "core": {
            "vision_statement": "Quiet eastern pixel-art garden",
            "world_tone": "calm and handcrafted",
            "themes": ["quiet", "handcrafted"],
            "motifs": ["curved roof", "pine"],
            "shape_language": "rounded silhouettes with clear pixel clusters",
            "palette": ["#263d34", "#86a76d", "#d8d0b4"],
            "materials_lighting": "wood, grey tile, soft diffuse light",
            "rendering": "clean pixel clusters, no photographic texture",
            "dos": ["clear silhouette"],
            "donts": ["photorealistic", "neon"],
            "forbidden_terms": ["photorealistic", "neon"],
            "prompt_fragment": "quiet handcrafted eastern pixel art",
            "negative_fragment": "photorealistic, neon",
            "references": [],
        },
        "modules": {},
    }


class StyleGuideServiceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.projects = ProjectService(Path(self.temp.name) / "work")
        self.guides = StyleGuideService(self.projects)
        self.direction = self.projects.create_style_direction(
            "default", name="Pixel Garden"
        )

    def tearDown(self):
        self.temp.cleanup()

    def test_project_initializes_registry_and_default_field(self):
        paths = self.projects.project_paths("default")
        self.assertTrue(paths["style_guide_registry"].is_file())
        self.assertTrue(paths["style_guide_root"].is_dir())
        self.assertEqual(
            self.projects.get_project("default")["default_style_guide_package_id"],
            "",
        )

    def test_create_manual_draft_initializes_required_core(self):
        package = self.guides.create_draft("default", self.direction["id"])
        draft = self.guides.get_draft("default", package["id"])
        self.assertEqual(package["style_direction_id"], self.direction["id"])
        self.assertIn("vision_statement", draft["core"])
        self.assertEqual(draft["modules"], {})
        self.assertEqual(package["confirmed_version_id"], "")
        self.assertEqual(package["confirmed_version"], 0)

    def test_direction_has_only_one_active_package(self):
        first = self.guides.create_draft("default", self.direction["id"])
        second = self.guides.create_draft("default", self.direction["id"])
        self.assertEqual(first["id"], second["id"])

    def test_save_rejects_package_id_mismatch(self):
        package = self.guides.create_draft("default", self.direction["id"])
        draft = valid_draft("guide_wrong")
        with self.assertRaisesRegex(ProjectError, "package ID"):
            self.guides.save_draft("default", package["id"], draft)

    def test_publish_creates_immutable_version(self):
        package = self.guides.create_draft("default", self.direction["id"])
        self.guides.save_draft("default", package["id"], valid_draft(package["id"]))
        version = self.guides.publish("default", package["id"])
        original = copy.deepcopy(
            self.guides.get_version("default", package["id"], version["id"])
        )
        changed = valid_draft(package["id"])
        changed["core"]["vision_statement"] = "Changed draft"
        self.guides.save_draft("default", package["id"], changed)
        self.assertEqual(
            self.guides.get_version("default", package["id"], version["id"]),
            original,
        )
        self.assertEqual(version["version"], 1)
        self.assertTrue(version["published_at"])

    def test_legacy_version_hydrates_as_detailed_without_rewriting_json(self):
        package = self._published_character_package()
        version_id = package["confirmed_version_id"]
        path = self.guides._version_path("default", package["id"], version_id)
        raw = self.projects._read_json(path, {})
        raw.pop("variants", None)
        self.projects._atomic_write_json(path, raw)
        before = path.read_bytes()

        hydrated = self.guides.get_version("default", package["id"], version_id)

        self.assertEqual(hydrated["available_variants"], ["detailed"])
        self.assertTrue(hydrated["variants"]["detailed"]["legacy"])
        self.assertEqual(path.read_bytes(), before)

    def test_set_default_requires_confirmed_version(self):
        package = self.guides.create_draft("default", self.direction["id"])
        with self.assertRaisesRegex(ProjectError, "confirmed"):
            self.guides.set_default("default", package["id"])

    def test_second_publish_increments_version_and_default_can_clear(self):
        package = self.guides.create_draft("default", self.direction["id"])
        self.guides.save_draft("default", package["id"], valid_draft(package["id"]))
        first = self.guides.publish("default", package["id"])
        second = self.guides.publish("default", package["id"])
        self.assertEqual((first["version"], second["version"]), (1, 2))
        self.guides.set_confirmed_version("default", package["id"], second["id"])
        selected = self.guides.set_default("default", package["id"])
        self.assertTrue(selected["is_default"])
        self.guides.set_default("default", "")
        self.assertEqual(
            self.projects.get_project("default")["default_style_guide_package_id"],
            "",
        )

    def _published_character_package(self, reference=None):
        package = self.guides.create_draft("default", self.direction["id"])
        draft = valid_draft(package["id"])
        draft["modules"]["character"] = {
            "enabled": True,
            "summary": "Readable handcrafted characters",
            "rules": ["clear silhouette"],
            "dos": ["layer cloth and wood"],
            "donts": ["modern streetwear"],
            "prompt_fragment": "clear silhouette, layered cloth and wood",
            "negative_fragment": "modern streetwear",
            "references": [reference] if reference else [],
        }
        self.guides.save_draft("default", package["id"], draft)
        version = self.guides.publish("default", package["id"])
        self.guides.set_confirmed_version("default", package["id"], version["id"])
        return self.guides.get_package("default", package["id"])

    def test_compile_for_generation_returns_snapshot_and_relative_paths(self):
        package = self._published_character_package()
        compiled = self.guides.compile_for_generation(
            "default",
            package_id=package["id"],
            version_id=package["confirmed_version_id"],
            asset_type="character",
            prompt="village herbalist",
            mode="balanced",
            model_reference_limit=4,
            overrides={},
        )
        self.assertEqual(
            compiled["snapshot"]["style_guide_package_id"], package["id"]
        )
        self.assertLessEqual(len(compiled["reference_paths"]), 2)
        self.assertIn("village herbalist", compiled["final_prompt"])

    def test_mcp_generated_reference_keeps_remote_asset_identity(self):
        relative_path = "production/images/generated.png"
        path = self.projects.project_root("default") / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"generated")
        package = self._published_character_package(
            reference={
                "id": "generated-character",
                "relative_path": relative_path,
                "source_record_id": "record-source",
                "remote_asset_id": "asset-generated",
                "content_sha256": "abc123",
                "roles": ["silhouette"],
                "priority": 100,
                "quality": 100,
            }
        )
        compiled = self.guides.compile_for_generation(
            "default",
            package_id=package["id"],
            version_id=package["confirmed_version_id"],
            asset_type="character",
            prompt="variation",
            mode="balanced",
            model_reference_limit=4,
            overrides={"style_strength": 70},
        )
        reference = compiled["snapshot"]["style_guide_reference_snapshot"][0]
        self.assertEqual(reference["remote_asset_id"], "asset-generated")

    def test_apply_visual_run_replaces_previous_generated_references_and_keeps_manual(self):
        package = self.guides.create_draft("default", self.direction["id"])
        draft = valid_draft(package["id"])
        draft["core"]["references"] = [
            {
                "id": "manual-core",
                "relative_path": "references/manual-core.png",
                "roles": ["style-anchor"],
            }
        ]
        draft["modules"]["character"] = {
            "enabled": True,
            "references": [
                {
                    "id": "manual-character",
                    "relative_path": "references/manual-character.png",
                    "roles": ["silhouette"],
                }
            ],
        }
        self.guides.save_draft("default", package["id"], draft)

        def run_snapshot(run_id, suffix):
            return {
                "id": run_id,
                "mode": "modular",
                "model": "test-model",
                "module_types": ["character"],
                "nodes": [
                    {
                        "id": "anchor",
                        "kind": "image",
                        "status": "succeeded",
                        "label": "Visual anchor",
                        "result_relative_path": f"generated/{suffix}-anchor.png",
                    },
                    {
                        "id": "character",
                        "kind": "image",
                        "status": "succeeded",
                        "label": "Character",
                        "module_type": "character",
                        "result_relative_path": f"generated/{suffix}-character.png",
                    },
                ],
                "prompt_bundle": {},
            }

        self.guides.apply_visual_run(
            "default",
            package["id"],
            run_snapshot=run_snapshot("visualrun_v1", "v1"),
        )
        self.guides.apply_visual_run(
            "default",
            package["id"],
            run_snapshot=run_snapshot("visualrun_v2", "v2"),
        )

        saved = self.guides.get_draft("default", package["id"])
        self.assertEqual(
            [(item["id"], item["visual_run_id"]) for item in saved["core"]["references"]],
            [("manual-core", ""), ("guide_ref_v2_detailed_anchor", "visualrun_v2")],
        )
        self.assertEqual(
            [
                (item["id"], item["visual_run_id"])
                for item in saved["modules"]["character"]["references"]
            ],
            [
                ("manual-character", ""),
                ("guide_ref_v2_detailed_character", "visualrun_v2"),
            ],
        )

    def test_get_version_filters_generated_references_from_other_visual_runs(self):
        package = self.guides.create_draft("default", self.direction["id"])
        draft = valid_draft(package["id"])
        draft["visual_guide"] = {"run_id": "visualrun_v2"}
        draft["core"]["references"] = [
            {
                "id": "manual-core",
                "relative_path": "references/manual-core.png",
                "roles": ["style-anchor"],
            },
            {
                "id": "generated-v1",
                "relative_path": "generated/v1-anchor.png",
                "visual_run_id": "visualrun_v1",
                "visual_node_id": "anchor",
                "roles": ["style-anchor"],
            },
            {
                "id": "generated-v2",
                "relative_path": "generated/v2-anchor.png",
                "visual_run_id": "visualrun_v2",
                "visual_node_id": "anchor",
                "roles": ["style-anchor"],
            },
        ]
        self.guides.save_draft("default", package["id"], draft)
        version = self.guides.publish("default", package["id"])

        hydrated = self.guides.get_version("default", package["id"], version["id"])

        self.assertEqual(
            [item["id"] for item in hydrated["core"]["references"]],
            ["manual-core", "generated-v2"],
        )
        self.assertEqual(
            [
                item["reference_id"]
                for item in hydrated["resources"]
                if item["kind"] == "reference"
            ],
            ["manual-core", "generated-v2"],
        )

    def test_trashing_direction_detaches_guide_and_clears_default(self):
        package = self._published_character_package()
        self.guides.set_default("default", package["id"])

        self.projects.trash_style_direction("default", self.direction["id"])

        self.assertEqual(self.guides.list_packages("default"), [])
        self.assertEqual(
            self.projects.get_project("default")["default_style_guide_package_id"],
            "",
        )
        version = self.guides.get_version(
            "default", package["id"], package["latest_published_version_id"]
        )
        self.assertEqual(version["package_id"], package["id"])

    def test_confirmed_version_is_single_and_sorted_first(self):
        package = self.guides.create_draft("default", self.direction["id"])
        self.guides.save_draft("default", package["id"], valid_draft(package["id"]))
        first = self.guides.publish("default", package["id"])
        second = self.guides.publish("default", package["id"])
        self.guides.set_confirmed_version("default", package["id"], first["id"])
        versions = self.guides.list_versions("default", package["id"])
        self.assertEqual(versions[0]["id"], first["id"])
        self.assertTrue(versions[0]["is_confirmed"])
        self.assertFalse(versions[1]["is_confirmed"])
        self.guides.set_confirmed_version("default", package["id"], second["id"])
        package = self.guides.get_package("default", package["id"])
        self.assertEqual(package["confirmed_version_id"], second["id"])

    def test_compile_rejects_latest_when_it_is_not_confirmed(self):
        package = self.guides.create_draft("default", self.direction["id"])
        self.guides.save_draft("default", package["id"], valid_draft(package["id"]))
        first = self.guides.publish("default", package["id"])
        second = self.guides.publish("default", package["id"])
        self.guides.set_confirmed_version("default", package["id"], first["id"])
        with self.assertRaisesRegex(ProjectError, "not the confirmed"):
            self.guides.compile_for_generation(
                "default",
                package_id=package["id"],
                version_id=second["id"],
                asset_type="character",
                prompt="hero",
                mode="balanced",
                model_reference_limit=2,
                overrides={},
            )

    def test_missing_primary_resource_blocks_confirmation(self):
        package = self.guides.create_draft("default", self.direction["id"])
        self.guides.save_draft("default", package["id"], valid_draft(package["id"]))
        version = self.guides.publish("default", package["id"])
        board = self.projects.resolve_project_file(
            "default", version["style_board_relative_path"]
        )
        board.unlink()
        with self.assertRaisesRegex(ProjectError, "missing resources"):
            self.guides.set_confirmed_version(
                "default", package["id"], version["id"]
            )

    def test_registry_migration_adds_empty_confirmation_without_selecting_latest(self):
        package = self.guides.create_draft("default", self.direction["id"])
        registry_path = self.projects.project_paths("default")["style_guide_registry"]
        registry = self.projects._read_json(registry_path, {})
        registry["schema_version"] = 1
        registry["packages"][0].pop("confirmed_version_id", None)
        registry["packages"][0].pop("confirmed_version", None)
        self.projects._atomic_write_json(registry_path, registry)
        migrated = StyleGuideService(self.projects).get_package("default", package["id"])
        stored = self.projects._read_json(registry_path, {})
        self.assertEqual(migrated["confirmed_version_id"], "")
        self.assertEqual(migrated["confirmed_version"], 0)
        self.assertEqual(stored["schema_version"], 2)


if __name__ == "__main__":
    unittest.main()
