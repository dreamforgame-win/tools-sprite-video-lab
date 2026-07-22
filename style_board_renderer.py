"""Deterministic, human-facing style board rendering."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


BOARD_SIZE = (1600, 900)
BOARD_BACKGROUND = "#f2f4f3"
SLOT_BACKGROUND = "#dfe5e1"


def _font(size: int):
    candidates = (
        Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/msyhbd.ttc"),
        Path("C:/Windows/Fonts/arial.ttf"),
    )
    for path in candidates:
        if path.is_file():
            try:
                return ImageFont.truetype(str(path), size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def _crop_text(value: object, limit: int) -> str:
    text = " ".join(str(value or "").strip().split())
    return text if len(text) <= limit else f"{text[: max(0, limit - 1)]}…"


def render_style_board(
    output_path,
    *,
    title: str,
    summary: str,
    palette: list[str] | tuple[str, ...],
    image_paths,
) -> Path:
    """Render a stable 16:9 board from real source images without AI calls."""

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    board = Image.new("RGB", BOARD_SIZE, BOARD_BACKGROUND)
    draw = ImageDraw.Draw(board)
    title_font = _font(38)
    summary_font = _font(19)
    label_font = _font(15)

    draw.text((48, 34), _crop_text(title, 80), font=title_font, fill="#17211c")
    draw.text(
        (48, 92),
        _crop_text(summary, 220),
        font=summary_font,
        fill="#445149",
    )

    slots = (
        (48, 150, 900, 808),
        (924, 150, 1226, 370),
        (1250, 150, 1552, 370),
        (924, 394, 1226, 614),
        (1250, 394, 1552, 614),
        (924, 638, 1552, 808),
    )
    sources = [Path(path) for path in image_paths if Path(path).is_file()][: len(slots)]
    for index, box in enumerate(slots):
        draw.rounded_rectangle(box, radius=16, fill=SLOT_BACKGROUND)
        if index >= len(sources):
            draw.text(
                (box[0] + 18, box[1] + 16),
                "REFERENCE",
                font=label_font,
                fill="#89948e",
            )
            continue
        try:
            with Image.open(sources[index]) as source:
                tile = ImageOps.contain(
                    source.convert("RGB"),
                    (box[2] - box[0], box[3] - box[1]),
                    method=Image.Resampling.LANCZOS,
                )
        except (OSError, ValueError):
            continue
        x = box[0] + (box[2] - box[0] - tile.width) // 2
        y = box[1] + (box[3] - box[1] - tile.height) // 2
        board.paste(tile, (x, y))

    palette_values = [str(value or "").strip() for value in palette if str(value or "").strip()][:12]
    chip_width = 72
    for index, color in enumerate(palette_values):
        x = 48 + index * (chip_width + 10)
        try:
            draw.rounded_rectangle((x, 832, x + chip_width, 870), radius=9, fill=color)
        except ValueError:
            draw.rounded_rectangle(
                (x, 832, x + chip_width, 870), radius=9, fill="#bcc5c0"
            )
    draw.text((1390, 840), "STYLE BOARD", font=label_font, fill="#69756e")
    board.save(output, format="PNG", optimize=True)
    return output


__all__ = ["BOARD_SIZE", "render_style_board"]
