import tempfile
import unittest
from pathlib import Path

from PIL import Image

from style_guide_visual_renderer import extract_palette, render_visual_template


class StyleGuideVisualRendererTests(unittest.TestCase):
    def test_extract_palette_returns_stable_hex_colors(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.png"
            image = Image.new("RGB", (80, 40), "#204060")
            image.paste("#d0a040", (40, 0, 80, 40))
            image.save(source)
            self.assertEqual(extract_palette([source], 2), ["#204060", "#d0a040"])

    def test_modular_template_uses_real_images_and_fixed_dimensions(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            anchor = root / "anchor.png"
            scene = root / "scene.png"
            Image.new("RGB", (320, 180), "#225544").save(anchor)
            Image.new("RGB", (320, 180), "#cc8844").save(scene)
            output = root / "template.png"
            result = render_visual_template(
                output,
                title="像素田园",
                mode="modular",
                sources=[
                    {"module_type": "core", "path": anchor},
                    {"module_type": "environment", "path": scene},
                ],
            )
            self.assertEqual(result["size"], [1600, 1600])
            self.assertTrue(output.is_file())
            self.assertEqual(len(result["palette"]), 2)

    def test_overall_template_keeps_source_visible(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "overall.png"
            Image.new("RGB", (800, 450), "#446688").save(source)
            output = root / "template.png"
            result = render_visual_template(
                output,
                title="综合指导图",
                mode="overall",
                sources=[{"module_type": "overview", "path": source}],
            )
            self.assertEqual(result["source_count"], 1)
            self.assertTrue(output.is_file())

    def test_missing_source_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(FileNotFoundError):
                render_visual_template(
                    Path(directory) / "template.png",
                    title="缺失",
                    mode="overall",
                    sources=[{"module_type": "overview", "path": Path(directory) / "missing.png"}],
                )


if __name__ == "__main__":
    unittest.main()
