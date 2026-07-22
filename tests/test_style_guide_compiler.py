import copy
import unittest

from style_guide_compiler import compile_style_guide


def published_version():
    return {
        "id": "guidever_pixel_v1",
        "package_id": "guide_pixel",
        "core": {
            "prompt_fragment": "soft low-saturation eastern pixel art",
            "negative_fragment": "photorealistic, neon",
            "forbidden_terms": ["photorealistic", "neon"],
            "references": [
                {
                    "id": "core-shape",
                    "relative_path": "production/images/core.png",
                    "roles": ["shape"],
                    "priority": 80,
                    "quality": 90,
                }
            ],
        },
        "modules": {
            "character": {
                "enabled": True,
                "prompt_fragment": "clear silhouette, layered cloth and wood",
                "negative_fragment": "modern streetwear",
                "references": [
                    {
                        "id": "char-silhouette",
                        "relative_path": "production/images/char-a.png",
                        "roles": ["silhouette"],
                        "priority": 95,
                        "quality": 90,
                    },
                    {
                        "id": "char-material",
                        "relative_path": "production/images/char-b.png",
                        "roles": ["material"],
                        "priority": 85,
                        "quality": 90,
                    },
                ],
            },
            "ui_hud": {
                "enabled": True,
                "prompt_fragment": "compact framed HUD",
                "negative_fragment": "glassmorphism",
                "references": [],
            },
        },
    }


class StyleGuideCompilerTests(unittest.TestCase):
    def test_character_balanced_uses_core_and_character_only(self):
        result = compile_style_guide(
            published_version(),
            asset_type="character",
            prompt="young village herbalist",
            mode="balanced",
            model_reference_limit=12,
        )
        self.assertEqual(result["module_types"], ["character"])
        self.assertNotIn("compact framed HUD", result["positive_prompt"])
        self.assertEqual(len(result["references"]), 2)

    def test_visual_detail_profile_is_compiled_even_with_manual_section_prompts(self):
        version = published_version()
        version["visual_guide"] = {
            "detail_profile": "compact",
            "detail_prompt_fragment": "mobile-game silhouette first, two main materials maximum",
            "detail_negative_fragment": "dense ornament, micro scratches",
        }
        result = compile_style_guide(
            version,
            asset_type="character",
            prompt="village guard",
            mode="balanced",
            model_reference_limit=4,
        )
        self.assertIn("two main materials maximum", result["positive_prompt"])
        self.assertIn("dense ornament", result["negative_prompt"])

    def test_economy_caps_references_at_one(self):
        result = compile_style_guide(
            published_version(),
            asset_type="character",
            prompt="village guard",
            mode="economy",
            model_reference_limit=12,
        )
        self.assertLessEqual(len(result["references"]), 1)

    def test_model_limit_is_never_exceeded(self):
        result = compile_style_guide(
            published_version(),
            asset_type="character",
            prompt="hero",
            mode="precision",
            model_reference_limit=1,
        )
        self.assertEqual(len(result["references"]), 1)
        self.assertIn("reference_limit", {item["code"] for item in result["warnings"]})

    def test_economy_and_balanced_can_continue_after_visible_reference_trimming(self):
        for mode in ("economy", "balanced"):
            with self.subTest(mode=mode):
                result = compile_style_guide(
                    published_version(),
                    asset_type="character",
                    prompt="village guard",
                    mode=mode,
                    model_reference_limit=1,
                )
                self.assertTrue(result["can_continue"])
                self.assertEqual(result["blocking_warnings"], [])

    def test_precision_blocks_when_required_reference_is_unavailable(self):
        version = published_version()
        version["modules"]["character"]["references"].append(
            {
                "id": "required-turnaround",
                "relative_path": "",
                "roles": ["turnaround"],
                "priority": 100,
                "quality": 100,
                "required": True,
            }
        )
        result = compile_style_guide(
            version,
            asset_type="character",
            prompt="hero turnaround",
            mode="precision",
            model_reference_limit=4,
        )
        self.assertFalse(result["can_continue"])
        self.assertIn(
            "missing_reference",
            {item["code"] for item in result["blocking_warnings"]},
        )

    def test_unknown_asset_uses_core_and_warns(self):
        result = compile_style_guide(
            published_version(),
            asset_type="unknown",
            prompt="object",
            mode="balanced",
            model_reference_limit=12,
        )
        self.assertEqual(result["module_types"], [])
        self.assertIn("module_required", {item["code"] for item in result["warnings"]})

    def test_prompt_conflict_is_visible_and_blocking(self):
        result = compile_style_guide(
            published_version(),
            asset_type="character",
            prompt="photorealistic portrait",
            mode="balanced",
            model_reference_limit=12,
        )
        self.assertIn("prompt_conflict", {item["code"] for item in result["warnings"]})
        self.assertFalse(result["can_continue"])

    def test_explicit_task_first_conflict_resolution_preserves_user_prompt(self):
        result = compile_style_guide(
            published_version(),
            asset_type="character",
            prompt="photorealistic portrait",
            mode="balanced",
            model_reference_limit=12,
            conflict_resolutions={"photorealistic": "preserve_task"},
        )
        self.assertTrue(result["can_continue"])
        self.assertIn("photorealistic portrait", result["positive_prompt"])
        self.assertNotIn("photorealistic", result["negative_prompt"])

    def test_input_version_is_not_mutated_and_strength_is_clamped(self):
        version = published_version()
        original = copy.deepcopy(version)
        result = compile_style_guide(
            version,
            asset_type="character",
            prompt="hero",
            mode="balanced",
            model_reference_limit=4,
            style_strength=999,
        )
        self.assertEqual(version, original)
        self.assertEqual(result["budget"]["style_strength"], 100)

    def test_skill_icon_uses_vfx_and_ui_modules(self):
        version = published_version()
        version["modules"]["skill_vfx"] = {
            "enabled": True,
            "prompt_fragment": "layered readable energy arc",
            "negative_fragment": "muddy timing",
            "references": [],
        }
        result = compile_style_guide(
            version,
            asset_type="skill_icon",
            prompt="fire slash icon",
            mode="balanced",
            model_reference_limit=2,
        )
        self.assertEqual(result["module_types"], ["skill_vfx", "ui_hud"])


if __name__ == "__main__":
    unittest.main()
