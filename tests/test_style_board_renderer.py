import tempfile
import unittest
from pathlib import Path

from PIL import Image

from project_service import ProjectService
from style_board_renderer import render_style_board
from style_guide_service import StyleGuideService
from tests.test_style_guide_service import valid_draft


class StyleBoardRendererTests(unittest.TestCase):
    def test_board_uses_real_sources_and_fixed_dimensions(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.png"
            output = root / "board.png"
            Image.new("RGB", (320, 240), (38, 61, 52)).save(source)
            render_style_board(
                output,
                title="Pixel Garden",
                summary="Quiet handcrafted eastern garden",
                palette=["#263d34", "#86a76d", "#d8d0b4"],
                image_paths=[source],
            )
            with Image.open(output) as board:
                self.assertEqual(board.size, (1600, 900))
                self.assertEqual(board.getpixel((180, 260)), (38, 61, 52))

    def test_publish_persists_human_facing_board_path(self):
        with tempfile.TemporaryDirectory() as directory:
            projects = ProjectService(Path(directory) / "work")
            guides = StyleGuideService(projects)
            direction = projects.create_style_direction("default", name="Pixel Garden")
            package = guides.create_draft("default", direction["id"])
            root = projects.project_root("default")
            source = root / "production" / "images" / "board-source.png"
            source.parent.mkdir(parents=True, exist_ok=True)
            Image.new("RGB", (64, 64), (38, 61, 52)).save(source)
            draft = valid_draft(package["id"])
            draft["core"]["references"] = [
                {
                    "id": "board-source",
                    "relative_path": "production/images/board-source.png",
                    "roles": ["shape"],
                    "priority": 100,
                    "quality": 100,
                }
            ]
            guides.save_draft("default", package["id"], draft)
            version = guides.publish("default", package["id"])
            self.assertTrue(version["style_board_relative_path"].endswith("style-board.png"))
            self.assertTrue(
                projects.resolve_project_file(
                    "default", version["style_board_relative_path"]
                ).is_file()
            )


if __name__ == "__main__":
    unittest.main()
