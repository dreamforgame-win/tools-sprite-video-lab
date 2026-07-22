"""Deterministic local composition for game-art visual guide sheets."""

from __future__ import annotations

from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


TEMPLATE_SIZE = (1600, 1600)
BACKGROUND = "#111714"
PANEL = "#202925"
TEXT = "#f2f4f3"
MUTED = "#9daaa4"
MODULE_LABELS = {
    "core": "视觉基因",
    "overview": "综合视觉图",
    "environment": "场景设计",
    "character": "角色设计",
    "ui_hud": "UI / HUD",
    "skill_vfx": "技能特效",
    "props_equipment": "道具装备",
}


def _font(size: int, *, bold: bool = False):
    candidates = (
        Path("C:/Windows/Fonts/msyhbd.ttc") if bold else Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/arial.ttf"),
    )
    for path in candidates:
        if path.is_file():
            try:
                return ImageFont.truetype(str(path), size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def _color_distance(left: tuple[int, int, int], right: tuple[int, int, int]) -> int:
    return sum((left[index] - right[index]) ** 2 for index in range(3))


def extract_palette(image_paths: list[Path], count: int = 8) -> list[str]:
    limit = max(1, min(16, int(count or 8)))
    frequencies: Counter[tuple[int, int, int]] = Counter()
    first_seen: dict[tuple[int, int, int], int] = {}
    cursor = 0
    for raw_path in image_paths:
        path = Path(raw_path)
        if not path.is_file():
            raise FileNotFoundError(path)
        with Image.open(path) as source:
            image = source.convert("RGB")
            image.thumbnail((160, 160), Image.Resampling.LANCZOS)
            pixels = (
                image.get_flattened_data()
                if hasattr(image, "get_flattened_data")
                else image.getdata()
            )
            for color in pixels:
                frequencies[color] += 1
                if color not in first_seen:
                    first_seen[color] = cursor
                    cursor += 1
    ordered = sorted(frequencies, key=lambda color: (-frequencies[color], first_seen[color]))
    selected: list[tuple[int, int, int]] = []
    for color in ordered:
        if any(_color_distance(color, existing) < 18 * 18 for existing in selected):
            continue
        selected.append(color)
        if len(selected) >= limit:
            break
    return [f"#{red:02x}{green:02x}{blue:02x}" for red, green, blue in selected]


def _source_boxes(mode: str, count: int) -> list[tuple[int, int, int, int]]:
    if mode == "overall" or count == 1:
        return [(64, 190, 1536, 1390)]
    columns = 2 if count <= 4 else 3
    rows = (count + columns - 1) // columns
    gap = 24
    left, top, right, bottom = 64, 190, 1536, 1390
    width = (right - left - gap * (columns - 1)) // columns
    height = (bottom - top - gap * (rows - 1)) // rows
    return [
        (
            left + (index % columns) * (width + gap),
            top + (index // columns) * (height + gap),
            left + (index % columns) * (width + gap) + width,
            top + (index // columns) * (height + gap) + height,
        )
        for index in range(count)
    ]


def render_visual_template(
    output_path: Path,
    *,
    title: str,
    mode: str,
    sources: list[dict],
) -> dict:
    normalized_mode = str(mode or "").strip().lower()
    if normalized_mode not in {"overall", "modular"}:
        raise ValueError(f"Unknown visual template mode: {normalized_mode}")
    normalized_sources = []
    for source in sources or []:
        path = Path(source.get("path") or "")
        if not path.is_file():
            raise FileNotFoundError(path)
        normalized_sources.append({**source, "path": path})
    if not normalized_sources:
        raise ValueError("Visual template requires at least one source")

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGB", TEMPLATE_SIZE, BACKGROUND)
    draw = ImageDraw.Draw(canvas)
    draw.text((64, 48), str(title or "视觉指导图")[:80], font=_font(44, bold=True), fill=TEXT)
    draw.text(
        (64, 112),
        "整体生成 · 本地整理" if normalized_mode == "overall" else "视觉基因锚点 · 分模块指导",
        font=_font(22),
        fill=MUTED,
    )

    boxes = _source_boxes(normalized_mode, len(normalized_sources))
    for source, box in zip(normalized_sources, boxes):
        draw.rounded_rectangle(box, radius=24, fill=PANEL)
        label = MODULE_LABELS.get(str(source.get("module_type") or ""), "视觉模块")
        draw.text((box[0] + 20, box[1] + 16), label, font=_font(22, bold=True), fill=TEXT)
        image_box = (box[0] + 20, box[1] + 62, box[2] - 20, box[3] - 20)
        with Image.open(source["path"]) as raw:
            tile = ImageOps.contain(
                raw.convert("RGB"),
                (image_box[2] - image_box[0], image_box[3] - image_box[1]),
                method=Image.Resampling.LANCZOS,
            )
        x = image_box[0] + (image_box[2] - image_box[0] - tile.width) // 2
        y = image_box[1] + (image_box[3] - image_box[1] - tile.height) // 2
        canvas.paste(tile, (x, y))

    palette = extract_palette([source["path"] for source in normalized_sources], 8)
    draw.text((64, 1440), "核心色板", font=_font(20, bold=True), fill=TEXT)
    for index, color in enumerate(palette):
        x = 190 + index * 154
        draw.rounded_rectangle((x, 1430, x + 128, 1490), radius=12, fill=color)
        draw.text((x, 1500), color.upper(), font=_font(16), fill=MUTED)

    canvas.save(output, format="PNG", optimize=True)
    return {
        "output_path": str(output),
        "size": list(TEMPLATE_SIZE),
        "palette": palette,
        "source_count": len(normalized_sources),
    }


__all__ = ["TEMPLATE_SIZE", "extract_palette", "render_visual_template"]
