import unittest

from style_guide_visual_prompts import (
    build_anchor_prompt,
    build_module_prompt,
    build_overall_prompt,
    normalize_template_variants,
    prompt_bundle,
)


class StyleGuideVisualPromptTests(unittest.TestCase):
    def test_template_variants_default_to_compact_and_are_canonical(self):
        self.assertEqual(normalize_template_variants(None), ["compact"])
        self.assertEqual(
            normalize_template_variants(["detailed", "compact", "detailed"]),
            ["compact", "detailed"],
        )

    def test_template_variants_reject_empty_and_unknown_values(self):
        with self.assertRaisesRegex(ValueError, "至少选择一种模板规格"):
            normalize_template_variants([])
        with self.assertRaisesRegex(ValueError, "Unknown style template variant"):
            normalize_template_variants(["poster"])

    def test_compact_character_is_one_clean_sample_without_board_layout(self):
        bundle = prompt_bundle(
            title="软陶奇幻",
            description="圆润低饱和",
            mode="modular",
            module_types=["character"],
            detail_profile="rich",
            template_variant="compact",
        )
        text = bundle["modules"]["character"]
        self.assertEqual(bundle["template_variant"], "compact")
        self.assertIn("一个原创完整角色", text)
        for forbidden in (
            "色卡",
            "文字",
            "多格排版",
            "转面",
            "表情合集",
            "局部放大",
            "资产堆叠",
        ):
            self.assertIn(f"禁止{forbidden}", text)
        self.assertEqual(bundle["detail_profile"], "rich")

    def test_detailed_prompt_preserves_existing_guide_board_contract(self):
        bundle = prompt_bundle(
            title="软陶奇幻",
            description="圆润低饱和",
            mode="modular",
            module_types=["character"],
            detail_profile="compact",
            template_variant="detailed",
        )
        self.assertEqual(bundle["template_variant"], "detailed")
        self.assertIn("设计展示", bundle["modules"]["character"])
        self.assertIn("视觉基因锚点图", bundle["anchor"])

    def test_anchor_prompt_requires_visual_specimen_without_text(self):
        prompt = build_anchor_prompt("像素田园", "温暖、手工感")
        self.assertIn("像素田园", prompt)
        self.assertIn("视觉基因", prompt)
        self.assertIn("不生成标题", prompt)
        self.assertIn("不生成伪文字", prompt)

    def test_module_prompt_contains_only_requested_module(self):
        prompt = build_module_prompt("像素田园", "", "ui_hud")
        self.assertIn("UI / HUD", prompt)
        self.assertNotIn("角色与生物设计展示", prompt)
        self.assertNotIn("技能与 VFX 设计展示", prompt)

    def test_overall_prompt_lists_only_selected_modules(self):
        prompt = build_overall_prompt(
            "像素田园", "", ["environment", "ui_hud"]
        )
        self.assertIn("场景与环境", prompt)
        self.assertIn("UI / HUD", prompt)
        self.assertNotIn("道具与装备", prompt)

    def test_prompt_bundle_is_complete_and_detached(self):
        result = prompt_bundle(
            title="像素田园",
            description="温暖乡村",
            mode="modular",
            module_types=["environment"],
        )
        self.assertEqual(set(result["modules"]), {"environment"})
        self.assertTrue(result["master"])
        self.assertTrue(result["anchor"])
        self.assertTrue(result["negative"])
        result["modules"]["environment"] = "changed"
        fresh = prompt_bundle(
            title="像素田园",
            description="温暖乡村",
            mode="modular",
            module_types=["environment"],
        )
        self.assertNotEqual(fresh["modules"]["environment"], "changed")

    def test_unknown_module_is_rejected(self):
        with self.assertRaises(ValueError):
            build_module_prompt("测试", "", "unknown")

    def test_empty_overall_selection_is_rejected(self):
        with self.assertRaises(ValueError):
            build_overall_prompt("测试", "", [])

    def test_identical_inputs_have_stable_output(self):
        kwargs = {
            "title": "像素田园",
            "description": "温暖乡村",
            "mode": "overall",
            "module_types": ["environment", "character"],
        }
        self.assertEqual(prompt_bundle(**kwargs), prompt_bundle(**kwargs))

    def test_default_compact_profile_has_mobile_game_detail_budget(self):
        prompt = build_module_prompt("像素田园", "", "character")
        self.assertIn("96–128px", prompt)
        self.assertIn("主要材质不超过 2 种", prompt)
        self.assertIn("最多一个标志配件", prompt)
        self.assertIn("不做局部放大", prompt)
        self.assertNotIn("多个有明确差异的设计样例和局部放大", prompt)

    def test_detail_profiles_change_prompt_and_bundle_metadata(self):
        compact = prompt_bundle(
            title="像素田园",
            description="温暖乡村",
            mode="overall",
            module_types=["environment"],
            detail_profile="compact",
        )
        rich = prompt_bundle(
            title="像素田园",
            description="温暖乡村",
            mode="overall",
            module_types=["environment"],
            detail_profile="rich",
        )
        self.assertEqual(compact["detail_profile"], "compact")
        self.assertEqual(rich["detail_label"], "丰富（概念展示）")
        self.assertNotEqual(compact["overall"], rich["overall"])
        self.assertIn("密集雕花", compact["negative"])

    def test_unknown_detail_profile_is_rejected(self):
        with self.assertRaises(ValueError):
            prompt_bundle(
                title="测试",
                description="",
                mode="overall",
                module_types=["environment"],
                detail_profile="unknown",
            )


if __name__ == "__main__":
    unittest.main()
