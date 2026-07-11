from __future__ import annotations

import argparse
import cgi
import gc
import importlib.util
import json
import math
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid
import zipfile
from io import BytesIO
from datetime import datetime
from fractions import Fraction
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlparse
from urllib.request import Request, urlopen

from PIL import Image, ImageChops, ImageFilter


ROOT_DIR = Path(__file__).resolve().parent
APP_DIR = ROOT_DIR / "app"
WORK_DIR = ROOT_DIR / "work"
UPLOADS_DIR = WORK_DIR / "uploads"
JOBS_DIR = WORK_DIR / "jobs"
EXPORTS_DIR = WORK_DIR / "exports"
PREVIEWS_DIR = WORK_DIR / "previews"
COMPRESSED_DIR = WORK_DIR / "compressed"
VIDEO_PROCESS_DIR = WORK_DIR / "video-process"
LINE_CLEANER_DIR = WORK_DIR / "line-cleaner"
MAGIC_DIR = WORK_DIR / "magic"
SETTINGS_PATH = WORK_DIR / "settings.json"
MAGIC_PREVIEW_LOCK = threading.Lock()
PROCESS_PROGRESS_LOCK = threading.Lock()
PROCESS_PROGRESS: dict[str, dict] = {}

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8894
PRODUCT_NAME = "Sprite Forge Lab"
PRODUCT_NAME_ZH = "灵帧工坊"
DEFAULT_FFMPEG_FALLBACK_ROOT = Path(r"F:\Codex-Program\tools\ffmpeg\bin")
DEFAULT_REALESRGAN_ROOT = Path(r"F:\Codex-Program\tools\realesrgan-ncnn-vulkan")
HOST_ENV = "SPRITE_VIDEO_LAB_HOST"
PORT_ENV = "SPRITE_VIDEO_LAB_PORT"
FFMPEG_DIR_ENV = "SPRITE_VIDEO_LAB_FFMPEG_DIR"
REAL_ESRGAN_BINARY_ENV = "SPRITE_VIDEO_LAB_REALESRGAN_BIN"
REAL_ESRGAN_MODEL_DIR_ENV = "SPRITE_VIDEO_LAB_REALESRGAN_MODEL_DIR"
AI_MODEL_CACHE_ENV = "SPRITE_VIDEO_LAB_AI_MODEL_CACHE"
CORRIDORKEY_ROOT_ENV = "SPRITE_VIDEO_LAB_CORRIDORKEY_ROOT"
LANCZOS = Image.Resampling.LANCZOS
BOX = Image.Resampling.BOX
NEAREST = Image.Resampling.NEAREST
APP_VERSION_POLL_MS = 1200
VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".gif"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
ANIMATION_FRAME_EXTENSIONS = IMAGE_EXTENSIONS
CONTENT_TYPE_EXTENSIONS = {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/x-matroska": ".mkv",
    "video/webm": ".webm",
    "image/gif": ".gif",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
}
MOJIBAKE_REPLACEMENTS = {
    "\u677b\ufe40\u75c2": "\u8f66\u5b9d",
}
FFMPEG_ACCEL_ENV = "SPRITE_VIDEO_LAB_FFMPEG_ACCEL"
FFMPEG_ACCEL_PRIORITY = ("cuda", "qsv", "d3d11va", "dxva2")
FFMPEG_ACCEL_ALIASES = {
    "": "auto",
    "auto": "auto",
    "default": "auto",
    "gpu": "auto",
    "cpu": "cpu",
    "off": "cpu",
    "none": "cpu",
    "disabled": "cpu",
    "cuda": "cuda",
    "nvdec": "cuda",
    "qsv": "qsv",
    "d3d11va": "d3d11va",
    "dxva2": "dxva2",
}
AI_MATTE_MODEL_REPOS = {
    "birefnet-hr-matting": "ZhengPeng7/BiRefNet_HR-matting",
    "birefnet-lite-2k": "ZhengPeng7/BiRefNet_lite-2K",
    "birefnet-general": "ZhengPeng7/BiRefNet",
}
AI_MATTE_MODEL_LABELS = {
    "birefnet-hr-matting": "BiRefNet HR-matting",
    "birefnet-lite-2k": "BiRefNet lite-2K",
    "birefnet-general": "BiRefNet general",
}
AI_MATTE_MODES = {
    "none",
    "chroma",
    "edge_connected_chroma",
    "birefnet",
    "corridorkey",
    "luma",
    "birefnet_corridorkey",
    "birefnet_corridorkey_key",
    "birefnet_luma",
    "birefnet_luma_key",
    "birefnet_luma_corridorkey",
    "subject_protect_chroma",
}
AI_MATTE_DEVICE_ALIASES = {
    "": "auto",
    "auto": "auto",
    "gpu": "cuda",
    "cuda": "cuda",
    "cuda:0": "cuda",
    "cpu": "cpu",
}
DEFAULT_AI_MATTE_MODEL = "birefnet-hr-matting"
DEFAULT_AI_MATTE_RESOLUTION = 1024
AI_MATTE_RESOLUTION_AUTO = "auto"
AI_MATTE_MIN_RESOLUTION = 256
AI_MATTE_MAX_RESOLUTION = 2560
AI_MATTE_RESOLUTION_MULTIPLE = 32
OUTPUT_SCALE_MIN = 0.05
OUTPUT_SCALE_MAX = 2.0
CORRIDORKEY_REPO_URL = "https://github.com/nikopueringer/CorridorKey"
REALESRGAN_RELEASE_API_URL = "https://api.github.com/repos/xinntao/Real-ESRGAN/releases/latest"
CORRIDORKEY_IMG_SIZE = 2048
CORRIDORKEY_GPU_DESPECKLE_PIXEL_LIMIT = 2**24
CORRIDORKEY_SCREEN_COLORS = {"auto", "green", "blue"}
CANVAS_MODES = {"auto", "square_bottom", "square_center"}
LINE_CLEANER_METHODS = {"classic", "realesrgan_anime"}
REAL_ESRGAN_ANIME_MODEL = "realesrgan-x4plus-anime"
MAGIC_CROP_PADDING = 24
MAGIC_VARIANTS = (
    {"key": "half", "label": "1/2", "scale": 0.5, "dir": "frames"},
    {"key": "quarter", "label": "1/4", "scale": 0.25, "dir": "frames-quarter"},
    {"key": "eighth", "label": "1/8", "scale": 0.125, "dir": "frames-eighth"},
)
MAGIC_RESIZE_MODE_DEFAULT = "hard"
MAGIC_RESIZE_MODES = {
    "hard": {"label": "硬", "resample": NEAREST},
    "soft": {"label": "软", "resample": BOX},
}

_FFMPEG_HWACCELS_CACHE: set[str] | None = None
_BIREFNET_MODEL_CACHE: dict[tuple[str, str], object] = {}
_CORRIDORKEY_ENGINE_CACHE: dict[tuple[str, str], object] = {}


def ensure_runtime_dirs() -> None:
    for directory in (APP_DIR, WORK_DIR, UPLOADS_DIR, JOBS_DIR, EXPORTS_DIR, PREVIEWS_DIR, COMPRESSED_DIR, VIDEO_PROCESS_DIR, LINE_CLEANER_DIR, MAGIC_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def load_app_settings() -> dict:
    try:
        if SETTINGS_PATH.exists():
            return json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return {}


def save_app_settings(settings: dict) -> None:
    SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_PATH.write_text(json.dumps(settings, ensure_ascii=False, indent=2), encoding="utf-8")


def set_process_progress(
    progress_id: str,
    current: int,
    total: int,
    phase: str = "processing",
    *,
    done: bool = False,
    error: str = "",
    detail: str = "",
) -> None:
    progress_id = str(progress_id or "").strip()
    if not progress_id:
        return
    total = max(1, int(total or 1))
    current = max(0, min(int(current or 0), total))
    with PROCESS_PROGRESS_LOCK:
        PROCESS_PROGRESS[progress_id] = {
            "id": progress_id,
            "current": current,
            "total": total,
            "phase": phase,
            "done": bool(done),
            "error": str(error or ""),
            "detail": str(detail or ""),
            "updated_at": iso_now(),
        }


def get_process_progress(progress_id: str) -> dict:
    progress_id = str(progress_id or "").strip()
    if not progress_id:
        return {"id": "", "current": 0, "total": 1, "phase": "idle", "done": True, "error": "", "detail": ""}
    with PROCESS_PROGRESS_LOCK:
        progress = dict(PROCESS_PROGRESS.get(progress_id) or {})
    if progress:
        return progress
    return {"id": progress_id, "current": 0, "total": 1, "phase": "waiting", "done": False, "error": "", "detail": ""}


def configured_exports_dir() -> Path:
    settings = load_app_settings()
    raw = str(settings.get("export_root") or "").strip()
    if not raw:
        return EXPORTS_DIR.resolve()
    path = Path(raw).expanduser()
    if not path.is_absolute():
        path = (ROOT_DIR / path).resolve()
    return path.resolve()


def export_url(target_dir: Path, filename: str) -> str:
    return f"/exports/{target_dir.name}/{filename}"


def output_path_payload() -> dict:
    settings = load_app_settings()
    raw = str(settings.get("export_root") or "").strip()
    path = configured_exports_dir()
    default_path = EXPORTS_DIR.resolve()
    return {
        "path": str(path),
        "is_default": not raw or path == default_path,
        "default_path": str(default_path),
    }


def one_click_login_payload() -> dict:
    settings = load_app_settings()
    auth = settings.get("local_auth")
    if not isinstance(auth, dict):
        auth = {}

    now = datetime.now().astimezone().isoformat(timespec="seconds")
    user_id = str(auth.get("user_id") or f"svl-{uuid.uuid4().hex[:8]}")
    login_count = safe_int(auth.get("login_count"), 0) + 1
    payload = {
        "user_id": user_id,
        "display_name": "本地创作者",
        "provider": "local-one-click",
        "login_count": login_count,
        "last_login_at": now,
    }
    settings["local_auth"] = payload
    save_app_settings(settings)
    return payload


def set_output_path(raw_path: str) -> dict:
    raw = str(raw_path or "").strip().strip("\"'")
    settings = load_app_settings()
    if not raw:
        settings.pop("export_root", None)
        EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
        save_app_settings(settings)
        return output_path_payload()

    path = Path(raw).expanduser()
    if not path.is_absolute():
        path = (ROOT_DIR / path).resolve()
    path = path.resolve()
    if path.exists() and not path.is_dir():
        raise ValueError(f"output path is not a folder: {path}")
    path.mkdir(parents=True, exist_ok=True)
    if path == EXPORTS_DIR.resolve():
        settings.pop("export_root", None)
        save_app_settings(settings)
        return output_path_payload()
    settings["export_root"] = str(path)
    save_app_settings(settings)
    return output_path_payload()


def choose_output_path() -> dict:
    try:
        import tkinter as tk
        from tkinter import filedialog
    except Exception as exc:
        raise RuntimeError("folder picker is unavailable on this Python runtime") from exc

    current_path = configured_exports_dir()
    initial_dir = current_path if current_path.exists() else EXPORTS_DIR.resolve()
    root = tk.Tk()
    root.withdraw()
    try:
        root.attributes("-topmost", True)
    except tk.TclError:
        pass
    try:
        selected = filedialog.askdirectory(
            parent=root,
            title=f"选择 {PRODUCT_NAME_ZH} 输出路径",
            initialdir=str(initial_dir),
            mustexist=False,
        )
    finally:
        root.destroy()

    if not selected:
        payload = output_path_payload()
        payload["cancelled"] = True
        return payload

    payload = set_output_path(selected)
    payload["cancelled"] = False
    return payload


def choose_resource_folder() -> dict:
    try:
        import tkinter as tk
        from tkinter import filedialog
    except Exception as exc:
        raise RuntimeError("folder picker is unavailable on this Python runtime") from exc

    initial_dir = configured_exports_dir() if configured_exports_dir().exists() else ROOT_DIR
    root = tk.Tk()
    root.withdraw()
    try:
        root.attributes("-topmost", True)
    except tk.TclError:
        pass
    try:
        selected = filedialog.askdirectory(
            parent=root,
            title="选择资源项目文件夹",
            initialdir=str(initial_dir),
            mustexist=True,
        )
    finally:
        root.destroy()

    if not selected:
        return {"path": "", "cancelled": True}
    path = Path(selected).expanduser().resolve()
    if not path.is_dir():
        raise ValueError(f"resource folder is not a folder: {path}")
    return {"path": str(path), "cancelled": False}


def resource_file_url(path: Path) -> str:
    return f"/api/resource-file?path={quote(str(path.resolve()), safe='')}"


def scan_resource_folder(raw_path: str, limit: int = 500) -> dict:
    root = Path(str(raw_path or "").strip()).expanduser().resolve()
    if not root.is_dir():
        raise FileNotFoundError(f"resource folder not found: {root}")

    assets: list[dict] = []
    limit = max(1, min(2000, int(limit or 500)))
    supported_extensions = IMAGE_EXTENSIONS | VIDEO_EXTENSIONS
    first_level_dirs = [
        item.name
        for item in sorted(root.iterdir(), key=lambda path: natural_sort_key(path.name))
        if item.is_dir() and not item.name.startswith(".") and item.name not in {"__pycache__", "node_modules"}
    ]
    for current_root, dirs, files in os.walk(root):
        dirs[:] = sorted(
            [name for name in dirs if not name.startswith(".") and name not in {"__pycache__", "node_modules"}],
            key=natural_sort_key,
        )
        for filename in sorted(files, key=natural_sort_key):
            if len(assets) >= limit:
                break
            if filename.startswith("."):
                continue
            path = Path(current_root) / filename
            suffix = path.suffix.lower()
            if suffix not in supported_extensions:
                continue
            kind = "video" if suffix in VIDEO_EXTENSIONS else "image"
            stat = path.stat()
            asset = {
                "name": path.name,
                "path": str(path),
                "relative_path": str(path.relative_to(root)),
                "kind": kind,
                "bytes": stat.st_size,
                "updated_at": datetime.fromtimestamp(stat.st_mtime).astimezone().isoformat(timespec="seconds"),
                "url": resource_file_url(path),
                "thumbUrl": resource_file_url(path) if kind == "image" else "",
            }
            if kind == "image":
                try:
                    with Image.open(path) as image:
                        asset["width"] = image.width
                        asset["height"] = image.height
                except Exception:
                    asset["width"] = 0
                    asset["height"] = 0
            assets.append(asset)
        if len(assets) >= limit:
            break
    return {"path": str(root), "assets": assets, "folders": first_level_dirs, "truncated": len(assets) >= limit}


def resource_root_path(raw_root: str) -> Path:
    root = Path(str(raw_root or "").strip()).expanduser().resolve()
    if not root.is_dir():
        raise FileNotFoundError(f"resource folder not found: {root}")
    return root


def resource_target_dir(raw_root: str, raw_relative: str = "") -> Path:
    root = resource_root_path(raw_root)
    relative_text = str(raw_relative or "").strip().replace("\\", "/")
    if relative_text.startswith("/") or relative_text.startswith("~"):
        raise ValueError("target folder must be inside the bound resource folder")
    target = (root / relative_text).resolve()
    if not is_within_root(target, root):
        raise ValueError("target folder must be inside the bound resource folder")
    if not target.is_dir():
        raise FileNotFoundError(f"target folder not found: {target}")
    return target


def resource_asset_path_from_url(raw_url: str, root: Path) -> Path | None:
    raw_url = str(raw_url or "").strip()
    if not raw_url:
        return None
    parsed = urlparse(raw_url)
    if parsed.path == "/api/resource-file":
        raw_path = (parse_qs(parsed.query).get("path") or [""])[0]
        return Path(unquote(raw_path)).expanduser().resolve() if raw_path else None
    if parsed.path.startswith("/work/"):
        return (WORK_DIR / unquote(parsed.path.removeprefix("/work/"))).resolve()
    if parsed.path.startswith("/exports/"):
        return (configured_exports_dir() / unquote(parsed.path.removeprefix("/exports/"))).resolve()
    if raw_url and not parsed.scheme and not parsed.netloc:
        candidate = Path(unquote(raw_url)).expanduser()
        if candidate.is_absolute():
            return candidate.resolve()
    return None


def resource_asset_source_path(asset: dict, root: Path) -> Path:
    raw_path = str(asset.get("path") or "").strip()
    path = Path(raw_path).expanduser().resolve() if raw_path else None
    if not path:
        path = resource_asset_path_from_url(str(asset.get("url") or asset.get("thumbUrl") or ""), root)
    if not path or not path.is_file():
        raise FileNotFoundError(f"resource file not found: {raw_path or asset.get('url') or asset.get('name') or ''}")

    source_type = str(asset.get("source") or "").strip()
    source_root = Path(str(asset.get("root") or "")).expanduser().resolve() if str(asset.get("root") or "").strip() else root
    allowed_roots = [source_root] if source_type == "folder" else [root, WORK_DIR, configured_exports_dir()]
    if not any(is_within_root(path, allowed_root) for allowed_root in allowed_roots):
        raise ValueError(f"resource file is outside allowed folders: {path}")
    return path


def unique_resource_destination(target_dir: Path, filename: str, source_path: Path) -> Path:
    safe_name = Path(str(filename or "")).name or source_path.name
    if not Path(safe_name).suffix and source_path.suffix:
        safe_name = f"{safe_name}{source_path.suffix}"
    stem = Path(safe_name).stem or source_path.stem or "resource"
    suffix = Path(safe_name).suffix or source_path.suffix
    candidate = (target_dir / f"{stem}{suffix}").resolve()
    if source_path.resolve() == candidate:
        return candidate
    index = 2
    while candidate.exists():
        candidate = (target_dir / f"{stem}_{index}{suffix}").resolve()
        index += 1
    return candidate


def render_resource_asset_canvas(source_path: Path, asset: dict) -> tuple[Image.Image, int, int, str] | None:
    crop = asset.get("crop") if isinstance(asset.get("crop"), dict) else {}
    if not crop:
        return None

    with open_rgba_image(source_path) as source:
        frame_width = max(1, safe_int(crop.get("frameWidth"), source.width))
        frame_height = max(1, safe_int(crop.get("frameHeight"), source.height))
        crop_x = clamp_float(safe_float(crop.get("x"), 0.0), 0.0, float(max(0, frame_width - 1)))
        crop_y = clamp_float(safe_float(crop.get("y"), 0.0), 0.0, float(max(0, frame_height - 1)))
        crop_w = max(1.0, safe_float(crop.get("w"), float(frame_width)))
        crop_h = max(1.0, safe_float(crop.get("h"), float(frame_height)))
        crop_right = clamp_float(crop_x + crop_w, crop_x + 1.0, float(frame_width))
        crop_bottom = clamp_float(crop_y + crop_h, crop_y + 1.0, float(frame_height))
        source_logical_width = max(1, int(round(crop_right - crop_x)))
        source_logical_height = max(1, int(round(crop_bottom - crop_y)))

        scale_x = source.width / frame_width
        scale_y = source.height / frame_height
        left = max(0, min(source.width - 1, int(round(crop_x * scale_x))))
        top = max(0, min(source.height - 1, int(round(crop_y * scale_y))))
        right = max(left + 1, min(source.width, int(round(crop_right * scale_x))))
        bottom = max(top + 1, min(source.height, int(round(crop_bottom * scale_y))))
        cropped = source.crop((left, top, right, bottom))

        mode = str(crop.get("outputMode") or "source")
        output_width = max(1, safe_int(crop.get("outputWidth"), safe_int(asset.get("width"), source_logical_width)))
        output_height = max(1, safe_int(crop.get("outputHeight"), safe_int(asset.get("height"), source_logical_height)))

        if mode == "fit":
            fit_scale = min(output_width / source_logical_width, output_height / source_logical_height)
            draw_width = max(1, int(round(source_logical_width * fit_scale)))
            draw_height = max(1, int(round(source_logical_height * fit_scale)))
            resized = cropped if cropped.size == (draw_width, draw_height) else resize_rgba_with_premultiplied_alpha(cropped, (draw_width, draw_height))
            canvas = Image.new("RGBA", (output_width, output_height), (0, 0, 0, 0))
            canvas.alpha_composite(resized, ((output_width - draw_width) // 2, (output_height - draw_height) // 2))
        else:
            output_width = source_logical_width
            output_height = source_logical_height
            canvas = cropped if cropped.size == (output_width, output_height) else resize_rgba_with_premultiplied_alpha(cropped, (output_width, output_height))

        canvas = anti_alias_alpha_edges(canvas, radius=0.85, band_radius=1, rgb_radius=0.35)
        return canvas, output_width, output_height, mode


def delete_resource_assets(raw_root: str, assets: list[dict]) -> dict:
    root = resource_root_path(raw_root)
    deleted: list[dict] = []
    errors: list[dict] = []
    for asset in assets:
        client_key = str(asset.get("client_key") or "")
        try:
            source_path = resource_asset_source_path({**asset, "source": "folder"}, root)
            if not is_within_root(source_path, root):
                raise ValueError(f"resource file is outside bound folder: {source_path}")
            source_path.unlink()
            deleted.append({"client_key": client_key, "path": str(source_path)})
        except Exception as exc:
            errors.append({"client_key": client_key, "error": str(exc)})
    return {"deleted": deleted, "errors": errors}


def move_resource_assets(raw_root: str, raw_target_relative: str, assets: list[dict]) -> dict:
    root = resource_root_path(raw_root)
    target_dir = resource_target_dir(str(root), raw_target_relative)
    moved: list[dict] = []
    errors: list[dict] = []
    for asset in assets:
        client_key = str(asset.get("client_key") or "")
        try:
            source_path = resource_asset_source_path(asset, root)
            rendered = render_resource_asset_canvas(source_path, asset) if str(asset.get("source") or "") == "project" else None
            destination_name = str(asset.get("name") or source_path.name)
            if rendered:
                destination_name = f"{Path(destination_name).stem or source_path.stem}.png"
            destination = unique_resource_destination(target_dir, destination_name, source_path)
            if not is_within_root(destination, root):
                raise ValueError("target file must be inside the bound resource folder")
            if rendered:
                destination.parent.mkdir(parents=True, exist_ok=True)
                canvas, width, height, mode = rendered
                canvas.save(destination)
            elif source_path.resolve() != destination.resolve():
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(source_path), str(destination))
                width = safe_int(asset.get("width"), 0)
                height = safe_int(asset.get("height"), 0)
                mode = ""
            else:
                width = safe_int(asset.get("width"), 0)
                height = safe_int(asset.get("height"), 0)
                mode = ""
            moved.append(
                {
                    "client_key": client_key,
                    "source_path": str(source_path),
                    "path": str(destination),
                    "relative_path": str(destination.relative_to(root)),
                    "width": width,
                    "height": height,
                    "mode": mode,
                }
            )
        except Exception as exc:
            errors.append({"client_key": client_key, "error": str(exc)})
    return {"moved": moved, "errors": errors}


def configured_host(cli_host: str | None = None) -> str:
    value = str(cli_host or os.environ.get(HOST_ENV, DEFAULT_HOST)).strip()
    return value or DEFAULT_HOST


def configured_port(cli_port: int | None = None) -> int:
    if cli_port is not None:
        return cli_port
    raw = str(os.environ.get(PORT_ENV, DEFAULT_PORT)).strip()
    try:
        port = int(raw)
    except ValueError:
        return DEFAULT_PORT
    return port if 1 <= port <= 65535 else DEFAULT_PORT


def ffmpeg_fallback_root() -> Path | None:
    configured = str(os.environ.get(FFMPEG_DIR_ENV, "")).strip()
    if configured:
        return Path(configured).expanduser()
    if DEFAULT_FFMPEG_FALLBACK_ROOT.exists():
        return DEFAULT_FFMPEG_FALLBACK_ROOT
    return None


def default_ai_model_cache_dir() -> Path:
    configured = str(os.environ.get(AI_MODEL_CACHE_ENV, "")).strip()
    if configured:
        return Path(configured).expanduser()
    return ROOT_DIR.parent / "sprite-video-lab-models" / "huggingface"


def default_corridorkey_root() -> Path:
    configured = str(os.environ.get(CORRIDORKEY_ROOT_ENV, "")).strip()
    if configured:
        return Path(configured).expanduser()
    return ROOT_DIR.parent / "sprite-video-lab-models" / "CorridorKey"


def configure_ai_model_cache() -> Path:
    cache_dir = default_ai_model_cache_dir()
    cache_dir.mkdir(parents=True, exist_ok=True)
    hub_cache = cache_dir / "hub"
    hub_cache.mkdir(parents=True, exist_ok=True)
    modules_cache = cache_dir / "modules"
    modules_cache.mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("HF_HOME", str(cache_dir))
    os.environ.setdefault("HUGGINGFACE_HUB_CACHE", str(hub_cache))
    os.environ.setdefault("TRANSFORMERS_CACHE", str(cache_dir / "transformers"))
    os.environ.setdefault("HF_MODULES_CACHE", str(modules_cache))
    os.environ.setdefault("HF_XET_CACHE", str(cache_dir / "xet"))
    os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
    return cache_dir


def clean_filename(name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", Path(name).name).strip(".-")
    return cleaned or "video"


def repair_mojibake_text(value: str) -> str:
    repaired = value
    for bad, good in MOJIBAKE_REPLACEMENTS.items():
        repaired = repaired.replace(bad, good)
    return repaired


def repair_mojibake_path(path: Path) -> Path:
    return Path(repair_mojibake_text(str(path)))


def slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "-", value).strip("-")
    return cleaned or "item"


def json_bytes(payload: dict) -> bytes:
    return json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")


def iso_now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def timestamped_id() -> str:
    return f"{datetime.now():%Y%m%d-%H%M%S}-{uuid.uuid4().hex[:4]}"


def parse_hex_color(raw: str) -> tuple[int, int, int]:
    value = raw.strip().lstrip("#")
    if len(value) != 6:
        raise ValueError(f"invalid color: {raw}")
    return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16))


def rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    return f"#{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"


def safe_int(value, default: int) -> int:
    try:
        return int(value)
    except Exception:
        return default


def safe_float(value, default: float) -> float:
    try:
        return float(value)
    except Exception:
        return default


def normalize_ai_resolution(value) -> int:
    resolution = safe_int(value, DEFAULT_AI_MATTE_RESOLUTION)
    resolution = max(AI_MATTE_MIN_RESOLUTION, min(AI_MATTE_MAX_RESOLUTION, resolution))
    half_step = AI_MATTE_RESOLUTION_MULTIPLE // 2
    aligned = ((resolution + half_step) // AI_MATTE_RESOLUTION_MULTIPLE) * AI_MATTE_RESOLUTION_MULTIPLE
    return max(AI_MATTE_MIN_RESOLUTION, min(AI_MATTE_MAX_RESOLUTION, aligned))


def is_auto_ai_resolution(value) -> bool:
    return str(value or "").strip().lower() in {"", AI_MATTE_RESOLUTION_AUTO}


def auto_ai_resolution_for_image(image: Image.Image) -> int:
    width, height = image.size
    long_edge = max(width, height, DEFAULT_AI_MATTE_RESOLUTION)
    return normalize_ai_resolution(min(long_edge, AI_MATTE_MAX_RESOLUTION))


def resolve_ai_resolution(value, image: Image.Image) -> int:
    if is_auto_ai_resolution(value):
        return auto_ai_resolution_for_image(image)
    return normalize_ai_resolution(value)


def clamp_float(value: float, minimum: float, maximum: float) -> float:
    return min(maximum, max(minimum, value))


def clamp_int(value: int, minimum: int, maximum: int) -> int:
    return min(maximum, max(minimum, value))


def normalize_output_scale(value) -> float:
    return clamp_float(safe_float(value, 1.0), OUTPUT_SCALE_MIN, OUTPUT_SCALE_MAX)


def payload_has_value(payload: dict, key: str) -> bool:
    if key not in payload or payload.get(key) is None:
        return False
    return str(payload.get(key)).strip() != ""


def output_scale_from_payload(payload: dict, info: dict | None = None) -> float:
    if payload_has_value(payload, "output_scale"):
        return normalize_output_scale(payload.get("output_scale"))
    target_size = safe_int(payload.get("target_size"), 0)
    source_height = safe_int((info or {}).get("height"), 0)
    if target_size > 0 and source_height > 0:
        return normalize_output_scale(target_size / source_height)
    return 1.0


def output_scale_from_upload_payload(upload_id: str, payload: dict) -> float:
    if payload_has_value(payload, "output_scale"):
        return normalize_output_scale(payload.get("output_scale"))
    source_path, media_type = source_media_entry(upload_id)
    if media_type in {"image", "image_sequence"}:
        return 1.0
    if payload_has_value(payload, "target_size"):
        return output_scale_from_payload(payload, upload_media_info(upload_id, source_path, media_type))
    return 1.0


def target_size_from_source_height(source_height: int, output_scale: float) -> int:
    return max(8, round(max(1, source_height) * normalize_output_scale(output_scale)))


def normalize_matte_mode(raw: str, chroma_enabled: bool) -> str:
    raw_value = str(raw or "").strip().lower()
    compact_value = re.sub(r"\s+", "", raw_value)
    dash_aliases = {
        "birefnet-luma": "birefnet_luma_key",
        "birefnet-luma-key": "birefnet_luma_key",
        "birefnet-corridor": "birefnet_corridorkey_key",
        "birefnet-corridor-key": "birefnet_corridorkey_key",
        "birefnet-corridorkey": "birefnet_corridorkey_key",
        "birefnet-corridorkey-key": "birefnet_corridorkey_key",
    }
    if raw_value in dash_aliases or compact_value in dash_aliases:
        return dash_aliases.get(raw_value, dash_aliases[compact_value])
    value = raw_value.replace("-", "_")
    aliases = {
        "": "chroma" if chroma_enabled else "none",
        "off": "none",
        "disabled": "none",
        "no": "none",
        "key": "chroma",
        "color": "chroma",
        "green": "chroma",
        "green_screen": "chroma",
        "greenscreen": "chroma",
        "green_key": "chroma",
        "chroma_key": "chroma",
        "edge": "edge_connected_chroma",
        "edge_chroma": "edge_connected_chroma",
        "edge_connected": "edge_connected_chroma",
        "edge_connected_chroma": "edge_connected_chroma",
        "boundary": "edge_connected_chroma",
        "boundary_chroma": "edge_connected_chroma",
        "border": "edge_connected_chroma",
        "border_chroma": "edge_connected_chroma",
        "ai": "birefnet",
        "birefnet": "birefnet",
        "corridor": "corridorkey",
        "corridor_key": "corridorkey",
        "corridorkey": "corridorkey",
        "luma": "luma",
        "luma_key": "luma",
        "luminance": "luma",
        "birefnet_corridor": "birefnet_corridorkey",
        "birefnet_corridor_key": "birefnet_corridorkey",
        "birefnet_corridorkey": "birefnet_corridorkey",
        "birefnet+corridor": "birefnet_corridorkey",
        "birefnet+corridorkey": "birefnet_corridorkey",
        "birefnet_corridorkey_key": "birefnet_corridorkey_key",
        "birefnet_corridor_keyer": "birefnet_corridorkey_key",
        "birefnet_corridorkey_keyer": "birefnet_corridorkey_key",
        "birefnet_luma": "birefnet_luma",
        "birefnet+luma": "birefnet_luma",
        "birefnet_luma_key": "birefnet_luma_key",
        "birefnet_luma_keyer": "birefnet_luma_key",
        "birefnet_luma_corridorkey": "birefnet_luma_corridorkey",
        "birefnet_luma_corridor": "birefnet_luma_corridorkey",
        "birefnet_luma_corridor_key": "birefnet_luma_corridorkey",
        "birefnet_corridorkey_luma": "birefnet_luma_corridorkey",
        "birefnet_corridor_luma": "birefnet_luma_corridorkey",
        "birefnet+luma+corridor": "birefnet_luma_corridorkey",
        "birefnet+luma+corridorkey": "birefnet_luma_corridorkey",
        "birefnet+corridor+luma": "birefnet_luma_corridorkey",
        "birefnet+corridorkey+luma": "birefnet_luma_corridorkey",
        "ai_luma": "birefnet_luma",
        "ai_glow": "birefnet_luma",
        "subject_protect": "subject_protect_chroma",
        "subject_protect_chroma": "subject_protect_chroma",
        "protect_subject": "subject_protect_chroma",
        "image_subject_protect": "subject_protect_chroma",
    }
    mode = aliases.get(value, value)
    return mode if mode in AI_MATTE_MODES else ("chroma" if chroma_enabled else "none")


def normalize_ai_model_key(raw: str) -> str:
    value = str(raw or DEFAULT_AI_MATTE_MODEL).strip().lower()
    aliases = {
        "hr": "birefnet-hr-matting",
        "hr-matting": "birefnet-hr-matting",
        "matting": "birefnet-hr-matting",
        "lite": "birefnet-lite-2k",
        "lite-2k": "birefnet-lite-2k",
        "2k": "birefnet-lite-2k",
        "general": "birefnet-general",
        "default": "birefnet-general",
    }
    value = aliases.get(value, value)
    return value if value in AI_MATTE_MODEL_REPOS else DEFAULT_AI_MATTE_MODEL


def normalize_ai_device(raw: str) -> str:
    value = str(raw or "auto").strip().lower()
    return AI_MATTE_DEVICE_ALIASES.get(value, "auto")


def normalize_corridorkey_screen(raw: str) -> str:
    value = str(raw or "auto").strip().lower()
    return value if value in CORRIDORKEY_SCREEN_COLORS else "auto"


def normalize_canvas_mode(raw: str) -> str:
    value = str(raw or "auto").strip().lower().replace("-", "_")
    aliases = {
        "": "auto",
        "auto_width": "auto",
        "auto_center": "auto",
        "rect": "auto",
        "rectangle": "auto",
        "center": "square_center",
        "square": "square_bottom",
        "bottom": "square_bottom",
    }
    value = aliases.get(value, value)
    return value if value in CANVAS_MODES else "auto"


def resolve_corridorkey_screen(raw: str, key_rgb: tuple[int, int, int]) -> str:
    normalized = normalize_corridorkey_screen(raw)
    if normalized != "auto":
        return normalized
    return "blue" if key_rgb[2] > key_rgb[1] and key_rgb[2] >= key_rgb[0] else "green"


def resolve_ffmpeg_binary(name: str) -> str:
    direct = shutil.which(name)
    if direct:
        return direct
    fallback_root = ffmpeg_fallback_root()
    if fallback_root is not None:
        candidate = fallback_root / f"{name}.exe"
        if candidate.exists():
            return str(candidate)
    raise FileNotFoundError(f"could not resolve {name}")


def run_process(args: list[str]) -> str:
    completed = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="ignore")
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "").strip()
        raise RuntimeError(detail or f"command failed: {' '.join(args)}")
    return completed.stdout


def configured_ffmpeg_accel_mode() -> str:
    raw = str(os.environ.get(FFMPEG_ACCEL_ENV, "auto") or "auto").strip().lower()
    return FFMPEG_ACCEL_ALIASES.get(raw, "auto")


def available_ffmpeg_hwaccels() -> set[str]:
    global _FFMPEG_HWACCELS_CACHE
    if _FFMPEG_HWACCELS_CACHE is not None:
        return _FFMPEG_HWACCELS_CACHE

    ffmpeg = resolve_ffmpeg_binary("ffmpeg")
    try:
        output = run_process([ffmpeg, "-hide_banner", "-hwaccels"])
    except Exception:
        _FFMPEG_HWACCELS_CACHE = set()
        return _FFMPEG_HWACCELS_CACHE

    available: set[str] = set()
    for line in output.splitlines():
        value = line.strip().lower()
        if not value or value.endswith(":"):
            continue
        if re.fullmatch(r"[a-z0-9_]+", value):
            available.add(value)
    _FFMPEG_HWACCELS_CACHE = available
    return _FFMPEG_HWACCELS_CACHE


def preferred_ffmpeg_hwaccel() -> tuple[str, str | None]:
    requested = configured_ffmpeg_accel_mode()
    if requested == "cpu":
        return requested, None

    available = available_ffmpeg_hwaccels()
    if requested == "auto":
        for candidate in FFMPEG_ACCEL_PRIORITY:
            if candidate in available:
                return requested, candidate
        return requested, None

    if requested in available:
        return requested, requested
    return requested, None


def ffmpeg_accel_label(mode: str) -> str:
    return "CPU" if mode == "cpu" else f"GPU ({mode})"


def ffmpeg_accel_payload(
    requested_mode: str,
    selected_mode: str | None,
    used_mode: str,
    fallback_reason: str | None = None,
) -> dict:
    return {
        "requested_mode": requested_mode,
        "selected_mode": selected_mode,
        "used_mode": used_mode,
        "used_label": ffmpeg_accel_label(used_mode),
        "fallback_to_cpu": bool(selected_mode and used_mode == "cpu"),
        "fallback_reason": fallback_reason or "",
    }


def static_image_payload() -> dict:
    return {
        "requested_mode": "image",
        "selected_mode": "",
        "used_mode": "image",
        "used_label": "Static image",
        "fallback_to_cpu": False,
        "fallback_reason": "",
    }


def custom_animation_payload() -> dict:
    return {
        "requested_mode": "animation",
        "selected_mode": "",
        "used_mode": "animation",
        "used_label": "Custom animation frames",
        "fallback_to_cpu": False,
        "fallback_reason": "",
    }


def image_sequence_payload() -> dict:
    return {
        "requested_mode": "image_sequence",
        "selected_mode": "",
        "used_mode": "image_sequence",
        "used_label": "Image sequence",
        "fallback_to_cpu": False,
        "fallback_reason": "",
    }


def run_ffmpeg_with_auto_accel(args_builder) -> dict:
    requested_mode, selected_mode = preferred_ffmpeg_hwaccel()
    if selected_mode:
        try:
            run_process(args_builder(selected_mode))
            return ffmpeg_accel_payload(requested_mode, selected_mode, selected_mode)
        except RuntimeError as exc:
            detail = str(exc).strip()
            print(
                f"[ffmpeg] {selected_mode} decode failed, falling back to CPU: {detail}",
                file=sys.stderr,
            )
            run_process(args_builder(None))
            return ffmpeg_accel_payload(
                requested_mode,
                selected_mode,
                "cpu",
                fallback_reason=detail,
            )

    run_process(args_builder(None))
    return ffmpeg_accel_payload(requested_mode, None, "cpu")


def extract_image_frame(source_path: Path, output_path: Path) -> tuple[Path, dict]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image = open_rgba_image(source_path)
    image.save(output_path)
    image.close()
    return output_path, static_image_payload()


def is_within_root(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def open_rgba_image(path: Path) -> Image.Image:
    with Image.open(path) as image:
        return image.convert("RGBA")


def watch_targets() -> list[Path]:
    targets = [ROOT_DIR / "server.py"]
    if APP_DIR.exists():
        targets.extend(path for path in APP_DIR.rglob("*") if path.is_file())
    return sorted(set(path.resolve() for path in targets))


def current_app_version() -> str:
    mtimes = [str(path.stat().st_mtime_ns) for path in watch_targets() if path.exists()]
    if not mtimes:
        return "0"
    return max(mtimes)


def python_package_status(package_name: str, import_name: str | None = None) -> dict:
    name = import_name or package_name
    installed = importlib.util.find_spec(name) is not None
    return {"name": package_name, "import": name, "installed": installed}


def command_readiness(name: str, resolver) -> dict:
    try:
        path = resolver(name)
        return {"name": name, "ready": True, "path": str(path), "message": ""}
    except Exception as exc:
        return {"name": name, "ready": False, "path": "", "message": str(exc)}


def hf_cache_model_dir(cache_dir: Path, repo_id: str) -> Path:
    return cache_dir / "hub" / ("models--" + repo_id.replace("/", "--"))


def hf_cache_model_dirs(cache_dir: Path, repo_id: str) -> list[Path]:
    folder_name = "models--" + repo_id.replace("/", "--")
    candidates = [cache_dir / folder_name, cache_dir / "hub" / folder_name]
    result: list[Path] = []
    for path in candidates:
        if path not in result:
            result.append(path)
    return result


def hf_cache_has_snapshot_files(model_dir: Path) -> bool:
    snapshots_dir = model_dir / "snapshots"
    snapshot_dirs = [path for path in snapshots_dir.iterdir() if path.is_dir()] if snapshots_dir.exists() else []
    return any(any(child.is_file() for child in path.rglob("*")) for path in snapshot_dirs)


def hf_model_cache_status(model_key: str, repo_id: str, cache_dir: Path) -> dict:
    model_dirs = hf_cache_model_dirs(cache_dir, repo_id)
    ready_dirs = [path for path in model_dirs if hf_cache_has_snapshot_files(path)]
    display_dir = ready_dirs[0] if ready_dirs else model_dirs[0]
    has_files = bool(ready_dirs)
    return {
        "key": model_key,
        "label": AI_MATTE_MODEL_LABELS.get(model_key, model_key),
        "repo_id": repo_id,
        "ready": has_files,
        "path": str(display_dir),
        "paths": [str(path) for path in model_dirs],
        "message": "" if has_files else "模型缓存未找到，首次使用或点击下载时会从 Hugging Face 获取。",
    }


def corridorkey_status() -> dict:
    root = default_corridorkey_root()
    module_dir = root / "CorridorKeyModule"
    checkpoint_dir = module_dir / "checkpoints"
    checkpoints = list(checkpoint_dir.glob("*")) if checkpoint_dir.exists() else []
    ready = module_dir.exists()
    return {
        "ready": ready,
        "root": str(root),
        "module_dir": str(module_dir),
        "checkpoint_count": len([path for path in checkpoints if path.is_file()]),
        "message": "" if ready else f"未找到 CorridorKeyModule。请运行 setup_ai_runtime.bat 或克隆 {CORRIDORKEY_REPO_URL}。",
    }


def realesrgan_status() -> dict:
    binary = resolve_realesrgan_binary()
    model_dir = resolve_realesrgan_model_dir(binary) if binary else None
    ready = bool(binary and model_dir)
    return {
        "ready": ready,
        "binary": binary or "",
        "model_dir": str(model_dir) if model_dir else "",
        "model": REAL_ESRGAN_ANIME_MODEL,
        "message": "" if ready else realesrgan_missing_message(),
    }


def runtime_info() -> dict:
    torch_info = {"installed": False, "version": "", "cuda_available": False, "error": ""}
    try:
        import torch

        torch_info = {
            "installed": True,
            "version": str(getattr(torch, "__version__", "")),
            "cuda_available": bool(torch.cuda.is_available()),
            "error": "",
        }
    except Exception as exc:
        torch_info["error"] = str(exc)

    cache_dir = default_ai_model_cache_dir()
    default_model = hf_model_cache_status(
        DEFAULT_AI_MATTE_MODEL,
        AI_MATTE_MODEL_REPOS[DEFAULT_AI_MATTE_MODEL],
        cache_dir,
    )
    ai_packages = [
        python_package_status("transformers"),
        python_package_status("huggingface-hub", "huggingface_hub"),
        python_package_status("timm"),
        python_package_status("torchvision"),
        python_package_status("numpy"),
        python_package_status("cv2"),
    ]
    ffmpeg_status = command_readiness("ffmpeg", resolve_ffmpeg_binary)
    ffprobe_status = command_readiness("ffprobe", resolve_ffmpeg_binary)
    basic_ready = ffmpeg_status["ready"] and ffprobe_status["ready"]
    ai_dependency_ready = torch_info["installed"] and all(
        package["installed"] for package in ai_packages[:4]
    )
    checks = {
        "basic": {
            "ready": basic_ready,
            "message": "" if basic_ready else "基础视频处理需要 ffmpeg 和 ffprobe。",
        },
        "ai_dependencies": {
            "ready": ai_dependency_ready,
            "packages": ai_packages,
            "message": "" if ai_dependency_ready else "AI 抠图依赖不完整，请运行 setup_ai_runtime.bat 或安装 requirements-ai.txt。",
        },
        "default_birefnet_model": default_model,
        "corridorkey": corridorkey_status(),
        "realesrgan": realesrgan_status(),
    }
    checks["ai_matte"] = {
        "ready": ai_dependency_ready and default_model["ready"],
        "message": "" if ai_dependency_ready and default_model["ready"] else "默认 BiRefNet 模型或 AI 依赖尚未准备。",
    }

    return {
        "product": {"name": PRODUCT_NAME, "name_zh": PRODUCT_NAME_ZH},
        "python_executable": sys.executable,
        "python_prefix": sys.prefix,
        "torch": torch_info,
        "ffmpeg": ffmpeg_status,
        "ffprobe": ffprobe_status,
        "ai_model_cache": str(cache_dir),
        "corridorkey_root": str(default_corridorkey_root()),
        "checks": checks,
        "actions": {
            "download_default_birefnet": bool(ai_dependency_ready and not default_model["ready"] and python_package_status("huggingface-hub", "huggingface_hub")["installed"]),
            "setup_script": str(ROOT_DIR / "setup_ai_runtime.bat"),
        },
    }


def download_default_birefnet_model(progress_id: str = "") -> dict:
    cache_dir = configure_ai_model_cache()
    repo_id = AI_MATTE_MODEL_REPOS[DEFAULT_AI_MATTE_MODEL]
    return download_huggingface_model(DEFAULT_AI_MATTE_MODEL, repo_id, cache_dir, progress_id=progress_id)


def huggingface_progress_tqdm_class(progress_id: str, label: str):
    from tqdm.auto import tqdm

    class ProgressTqdm(tqdm):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._progress_label = str(self.desc or label or "下载中")
            if progress_id:
                set_process_progress(
                    progress_id,
                    int(self.n or 0),
                    int(self.total or 1),
                    "downloading",
                    detail=self._progress_label,
                )

        def update(self, n=1):
            result = super().update(n)
            if progress_id:
                set_process_progress(
                    progress_id,
                    int(self.n or 0),
                    int(self.total or max(self.n, 1) or 1),
                    "downloading",
                    detail=self._progress_label,
                )
            return result

    return ProgressTqdm


def download_huggingface_model(
    model_key: str,
    repo_id: str,
    cache_dir: Path | None = None,
    *,
    progress_id: str = "",
) -> dict:
    resolved_cache_dir = cache_dir or configure_ai_model_cache()
    try:
        from huggingface_hub import snapshot_download
    except ModuleNotFoundError as exc:
        raise RuntimeError("huggingface-hub 未安装，请先运行 setup_ai_runtime.bat 或安装 requirements-ai.txt。") from exc

    if progress_id:
        set_process_progress(progress_id, 0, 100, "preparing", detail=f"准备下载 {repo_id}")
    local_path = snapshot_download(
        repo_id=repo_id,
        cache_dir=str(resolved_cache_dir),
        local_files_only=False,
        max_workers=1,
        tqdm_class=huggingface_progress_tqdm_class(progress_id, AI_MATTE_MODEL_LABELS.get(model_key, model_key)) if progress_id else None,
    )
    if progress_id:
        set_process_progress(progress_id, 100, 100, "finalizing", detail="整理模型缓存")
    return {
        "model": hf_model_cache_status(model_key, repo_id, resolved_cache_dir),
        "local_path": str(local_path),
    }


def directory_size_bytes(path: Path) -> int:
    if not path.exists():
        return 0
    total = 0
    for child in path.rglob("*"):
        try:
            if child.is_file():
                total += child.stat().st_size
        except OSError:
            continue
    return total


def safe_remove_tree(path: Path, allowed_roots: list[Path]) -> None:
    resolved = path.expanduser().resolve()
    if not resolved.exists():
        return
    if not resolved.is_dir():
        raise ValueError(f"只能卸载目录：{resolved}")
    allowed = any(is_within_root(resolved, root) or resolved == root.resolve() for root in allowed_roots)
    if not allowed:
        raise ValueError(f"拒绝删除受控目录之外的路径：{resolved}")
    shutil.rmtree(resolved)


def model_cache_root() -> Path:
    return default_ai_model_cache_dir().resolve()


def managed_tools_root() -> Path:
    return DEFAULT_REALESRGAN_ROOT.parent.resolve()


def huggingface_model_item(model_key: str, repo_id: str) -> dict:
    cache_dir = default_ai_model_cache_dir()
    status = hf_model_cache_status(model_key, repo_id, cache_dir)
    paths = [Path(raw_path) for raw_path in status.get("paths", [])]
    existing_paths = [path for path in paths if path.exists()]
    return {
        "key": model_key,
        "label": AI_MATTE_MODEL_LABELS.get(model_key, model_key),
        "kind": "huggingface",
        "category": "AI 主体抠图",
        "source": repo_id,
        "description": "BiRefNet 主体/角色抠图模型，首次使用会加载远程模型代码。",
        "ready": bool(status["ready"]),
        "path": status["path"],
        "size_bytes": sum(directory_size_bytes(path) for path in existing_paths),
        "message": status["message"],
        "downloadable": python_package_status("huggingface-hub", "huggingface_hub")["installed"],
        "uninstallable": bool(existing_paths),
        "required": model_key == DEFAULT_AI_MATTE_MODEL,
    }


def corridorkey_model_item() -> dict:
    status = corridorkey_status()
    root = Path(status["root"])
    return {
        "key": "corridorkey",
        "label": "CorridorKey",
        "kind": "git",
        "category": "绿幕/蓝幕精修",
        "source": CORRIDORKEY_REPO_URL,
        "description": "绿幕/蓝幕边缘重建和前景颜色恢复组件。",
        "ready": bool(status["ready"]),
        "path": status["root"],
        "size_bytes": directory_size_bytes(root),
        "message": status["message"],
        "downloadable": shutil.which("git") is not None,
        "uninstallable": root.exists() and (is_within_root(root, ROOT_DIR.parent / "sprite-video-lab-models") or root.resolve() == default_corridorkey_root().resolve()),
        "required": False,
        "meta": {"checkpoint_count": status.get("checkpoint_count", 0)},
    }


def realesrgan_model_item() -> dict:
    status = realesrgan_status()
    binary_path = Path(status["binary"]).resolve() if status["binary"] else DEFAULT_REALESRGAN_ROOT
    root = DEFAULT_REALESRGAN_ROOT if not status["binary"] else binary_path.parent
    if root.name.lower() != "realesrgan-ncnn-vulkan":
        root = root.parent if root.parent.name.lower() == "realesrgan-ncnn-vulkan" else root
    return {
        "key": "realesrgan-anime",
        "label": "Real-ESRGAN anime x4",
        "kind": "release",
        "category": "MAGIC / 线稿清理",
        "source": "xinntao/Real-ESRGAN latest release",
        "description": "realesrgan-ncnn-vulkan 二进制工具及 realesrgan-x4plus-anime 模型文件。",
        "ready": bool(status["ready"]),
        "path": str(root),
        "size_bytes": directory_size_bytes(root),
        "message": status["message"],
        "downloadable": True,
        "uninstallable": root.exists() and (is_within_root(root, managed_tools_root()) or root.resolve() == DEFAULT_REALESRGAN_ROOT.resolve()),
        "required": False,
        "meta": {"binary": status["binary"], "model_dir": status["model_dir"], "model": status["model"]},
    }


def external_tool_item(key: str, label: str, binary_name: str, category: str, description: str) -> dict:
    status = command_readiness(binary_name, resolve_ffmpeg_binary)
    return {
        "key": key,
        "label": label,
        "kind": "tool",
        "category": category,
        "source": f"{binary_name} executable",
        "description": description,
        "ready": bool(status["ready"]),
        "path": status.get("path") or "",
        "size_bytes": 0,
        "message": status.get("message") or ("" if status["ready"] else f"未找到 {binary_name}，请安装 ffmpeg 或配置 {FFMPEG_DIR_ENV}。"),
        "downloadable": False,
        "uninstallable": False,
        "required": True,
        "affected": ["视频导入", "抽帧", "视频处理", "透明 WebM 导出"] if binary_name == "ffmpeg" else ["视频信息读取", "截取预览", "帧率/时长识别"],
    }


def python_dependency_item(package_name: str, import_name: str | None, category: str, description: str, affected: list[str]) -> dict:
    status = python_package_status(package_name, import_name)
    return {
        "key": f"python-{status['import']}",
        "label": package_name,
        "kind": "python",
        "category": category,
        "source": "requirements-ai.txt",
        "description": description,
        "ready": bool(status["installed"]),
        "path": sys.executable if status["installed"] else "",
        "size_bytes": 0,
        "message": "" if status["installed"] else f"Python 依赖 {package_name} 未安装，可在本页点击下载安装 AI 运行依赖。",
        "downloadable": not bool(status["installed"]),
        "uninstallable": False,
        "required": package_name in {"torch", "transformers", "huggingface-hub", "timm", "torchvision"},
        "affected": affected,
    }


def model_management_payload() -> dict:
    items = [huggingface_model_item(model_key, repo_id) for model_key, repo_id in AI_MATTE_MODEL_REPOS.items()]
    items.append(corridorkey_model_item())
    items.append(realesrgan_model_item())
    items.append(
        external_tool_item(
            "tool-ffmpeg",
            "ffmpeg",
            "ffmpeg",
            "基础视频工具",
            "视频解码、抽帧、导出 WebM 和视频处理所需的命令行工具。",
        )
    )
    items.append(
        external_tool_item(
            "tool-ffprobe",
            "ffprobe",
            "ffprobe",
            "基础视频工具",
            "读取视频时长、帧率、尺寸和编码信息所需的命令行工具。",
        )
    )
    items.extend(
        [
            python_dependency_item("torch", "torch", "Python AI 依赖", "BiRefNet / CorridorKey 推理所需的深度学习运行库。", ["BiRefNet", "CorridorKey"]),
            python_dependency_item("torchvision", "torchvision", "Python AI 依赖", "AI 图像预处理和模型推理辅助库。", ["BiRefNet"]),
            python_dependency_item("transformers", "transformers", "Python AI 依赖", "从 Hugging Face 加载 BiRefNet 模型所需。", ["BiRefNet"]),
            python_dependency_item("huggingface-hub", "huggingface_hub", "Python AI 依赖", "下载和缓存 Hugging Face 模型所需。", ["BiRefNet 下载", "模型管理"]),
            python_dependency_item("timm", "timm", "Python AI 依赖", "BiRefNet 远程模型代码常用依赖。", ["BiRefNet"]),
            python_dependency_item("numpy", "numpy", "Python AI 依赖", "图像矩阵计算和 CorridorKey 所需。", ["CorridorKey", "图像处理"]),
            python_dependency_item("opencv-python / cv2", "cv2", "Python AI 依赖", "CorridorKey 和部分图像处理流程所需。", ["CorridorKey"]),
        ]
    )
    ready_count = sum(1 for item in items if item["ready"])
    return {
        "models": items,
        "summary": {
            "total": len(items),
            "ready": ready_count,
            "missing": len(items) - ready_count,
            "cache_root": str(default_ai_model_cache_dir()),
            "tools_root": str(managed_tools_root()),
        },
    }


def download_corridorkey(progress_id: str = "") -> dict:
    root = default_corridorkey_root()
    module_dir = root / "CorridorKeyModule"
    if module_dir.exists():
        if progress_id:
            set_process_progress(progress_id, 100, 100, "done", done=True, detail="CorridorKey 已存在")
        return {"model": corridorkey_model_item(), "message": "CorridorKey 已存在。"}
    if root.exists() and any(root.iterdir()):
        raise RuntimeError(f"{root} 已存在但不是完整 CorridorKey 目录，请手动检查后再处理。")
    git = shutil.which("git")
    if not git:
        raise RuntimeError("未找到 git，无法自动下载 CorridorKey。请先安装 git 或运行 setup_ai_runtime.bat。")
    root.parent.mkdir(parents=True, exist_ok=True)
    if root.exists():
        root.rmdir()
    if progress_id:
        set_process_progress(progress_id, 10, 100, "downloading", detail="正在克隆 CorridorKey 仓库")
    run_process([git, "clone", "--depth", "1", CORRIDORKEY_REPO_URL, str(root)])
    if progress_id:
        set_process_progress(progress_id, 100, 100, "done", done=True, detail="CorridorKey 已下载")
    return {"model": corridorkey_model_item(), "message": "CorridorKey 已下载。"}


def latest_realesrgan_windows_asset_url() -> str:
    request = Request(REALESRGAN_RELEASE_API_URL, headers={"User-Agent": PRODUCT_NAME})
    with urlopen(request, timeout=60) as response:
        release = json.loads(response.read().decode("utf-8"))
    assets = release.get("assets") if isinstance(release, dict) else []
    for asset in assets:
        name = str(asset.get("name") or "").lower()
        url = str(asset.get("browser_download_url") or "")
        if "realesrgan-ncnn-vulkan" in name and "windows" in name and name.endswith(".zip") and url:
            return url
    raise RuntimeError("没有在 Real-ESRGAN 最新 release 中找到 Windows realesrgan-ncnn-vulkan 压缩包。")


def stream_download_to_file(url: str, target: Path, progress_id: str, label: str) -> None:
    request = Request(url, headers={"User-Agent": PRODUCT_NAME})
    with urlopen(request, timeout=300) as response:
        total = int(response.headers.get("Content-Length") or 0)
        current = 0
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("wb") as handle:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)
                current += len(chunk)
                if progress_id:
                    set_process_progress(progress_id, current, total or max(current, 1), "downloading", detail=label)


def download_realesrgan_anime(progress_id: str = "") -> dict:
    target_root = DEFAULT_REALESRGAN_ROOT
    if realesrgan_status()["ready"]:
        if progress_id:
            set_process_progress(progress_id, 100, 100, "done", done=True, detail="Real-ESRGAN anime 已存在")
        return {"model": realesrgan_model_item(), "message": "Real-ESRGAN anime 已存在。"}
    target_root.parent.mkdir(parents=True, exist_ok=True)
    download_dir = WORK_DIR / "downloads"
    download_dir.mkdir(parents=True, exist_ok=True)
    archive_path = download_dir / "realesrgan-ncnn-vulkan-windows.zip"
    if progress_id:
        set_process_progress(progress_id, 0, 100, "preparing", detail="查询 Real-ESRGAN release")
    asset_url = latest_realesrgan_windows_asset_url()
    extract_root = download_dir / "realesrgan-extract"
    if extract_root.exists():
        shutil.rmtree(extract_root)
    extract_root.mkdir(parents=True, exist_ok=True)
    stream_download_to_file(asset_url, archive_path, progress_id, "下载 Real-ESRGAN 压缩包")
    if progress_id:
        set_process_progress(progress_id, 90, 100, "extracting", detail="正在解压 Real-ESRGAN")
    with zipfile.ZipFile(archive_path) as archive:
        archive.extractall(extract_root)
    candidates = [path for path in extract_root.rglob("*") if path.is_dir() and (path / "realesrgan-ncnn-vulkan.exe").exists()]
    if not candidates:
        raise RuntimeError("Real-ESRGAN 压缩包中没有找到 realesrgan-ncnn-vulkan.exe。")
    source_dir = candidates[0]
    if target_root.exists():
        safe_remove_tree(target_root, [managed_tools_root()])
    shutil.copytree(source_dir, target_root)
    if progress_id:
        set_process_progress(progress_id, 100, 100, "done", done=True, detail="Real-ESRGAN anime 已下载")
    return {"model": realesrgan_model_item(), "message": "Real-ESRGAN anime 已下载。"}


def download_python_ai_runtime(progress_id: str = "") -> dict:
    if progress_id:
        set_process_progress(progress_id, 0, 100, "preparing", detail="准备安装 Python AI 依赖")
    python = sys.executable
    requirements_path = ROOT_DIR / "requirements-ai.txt"
    if not requirements_path.exists():
        raise FileNotFoundError("requirements-ai.txt 不存在")
    if progress_id:
        set_process_progress(progress_id, 10, 100, "installing", detail="安装 requirements-ai.txt")
    run_process([python, "-m", "pip", "install", "-r", str(requirements_path)])
    if progress_id:
        set_process_progress(progress_id, 75, 100, "installing", detail="安装 PyTorch / torchvision")
    run_process([python, "-m", "pip", "install", "--force-reinstall", "--no-deps", "--index-url", "https://download.pytorch.org/whl/cu128", "torch", "torchvision"])
    if progress_id:
        set_process_progress(progress_id, 100, 100, "done", done=True, detail="Python AI 依赖已安装")
    return {"models": model_management_payload(), "message": "Python AI 依赖已安装。"}


def download_managed_model(model_key: str, progress_id: str = "") -> dict:
    normalized = normalize_ai_model_key(model_key)
    if model_key in AI_MATTE_MODEL_REPOS:
        return download_huggingface_model(normalized, AI_MATTE_MODEL_REPOS[normalized], progress_id=progress_id)
    if model_key == "corridorkey":
        return download_corridorkey(progress_id=progress_id)
    if model_key == "realesrgan-anime":
        return download_realesrgan_anime(progress_id=progress_id)
    if model_key.startswith("python-"):
        return download_python_ai_runtime(progress_id=progress_id)
    raise ValueError(f"未知模型：{model_key}")


def start_model_download_task(model_key: str) -> dict:
    normalized_key = str(model_key or "").strip()
    if normalized_key not in AI_MATTE_MODEL_REPOS and normalized_key not in {"corridorkey", "realesrgan-anime"} and not normalized_key.startswith("python-"):
        raise ValueError(f"未知模型：{normalized_key}")
    progress_id = f"model-{timestamped_id()}"
    set_process_progress(progress_id, 0, 100, "queued", detail="等待下载任务启动")

    def run_download() -> None:
        try:
            set_process_progress(progress_id, 0, 100, "preparing", detail="准备下载")
            download_managed_model(normalized_key, progress_id=progress_id)
            set_process_progress(progress_id, 100, 100, "done", done=True, detail="下载完成")
        except Exception as exc:
            set_process_progress(progress_id, 0, 1, "error", done=True, error=str(exc), detail="下载失败")

    threading.Thread(target=run_download, daemon=True).start()
    return {"progress_id": progress_id, "progress": get_process_progress(progress_id)}


def unload_birefnet_cache(model_key: str | None = None) -> None:
    keys = list(_BIREFNET_MODEL_CACHE.keys())
    for cache_key in keys:
        if model_key is None or cache_key[0] == model_key:
            _BIREFNET_MODEL_CACHE.pop(cache_key, None)
    gc.collect()
    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception:
        pass


def uninstall_managed_model(model_key: str) -> dict:
    if model_key in AI_MATTE_MODEL_REPOS:
        repo_id = AI_MATTE_MODEL_REPOS[model_key]
        unload_birefnet_cache(model_key)
        for path in hf_cache_model_dirs(default_ai_model_cache_dir(), repo_id):
            safe_remove_tree(path, [model_cache_root()])
        return {"model": huggingface_model_item(model_key, repo_id), "message": "模型缓存已卸载。"}
    if model_key == "corridorkey":
        root = default_corridorkey_root()
        _CORRIDORKEY_ENGINE_CACHE.clear()
        safe_remove_tree(root, [(ROOT_DIR.parent / "sprite-video-lab-models").resolve()])
        return {"model": corridorkey_model_item(), "message": "CorridorKey 已卸载。"}
    if model_key == "realesrgan-anime":
        item = realesrgan_model_item()
        root = Path(str(item.get("path") or "")).expanduser()
        safe_remove_tree(root, [managed_tools_root()])
        return {"model": realesrgan_model_item(), "message": "Real-ESRGAN anime 已卸载。"}
    raise ValueError(f"未知模型：{model_key}")


def watch_snapshot() -> dict[str, int]:
    snapshot: dict[str, int] = {}
    for path in watch_targets():
        try:
            snapshot[str(path)] = path.stat().st_mtime_ns
        except FileNotFoundError:
            continue
    return snapshot


def open_path_in_file_browser(target: Path) -> None:
    resolved = target.resolve()
    if sys.platform.startswith("win"):
        os.startfile(str(resolved))
        return
    if sys.platform == "darwin":
        subprocess.run(["open", str(resolved)], check=True)
        return
    subprocess.run(["xdg-open", str(resolved)], check=True)


def enforce_hard_alpha(image: Image.Image, cutoff: int = 128) -> Image.Image:
    rgba = image.convert("RGBA")
    hardened_pixels: list[tuple[int, int, int, int]] = []
    for r_value, g_value, b_value, alpha in rgba.getdata():
        if alpha >= cutoff:
            hardened_pixels.append((r_value, g_value, b_value, 255))
        else:
            hardened_pixels.append((0, 0, 0, 0))
    hardened = Image.new("RGBA", rgba.size)
    hardened.putdata(hardened_pixels)
    return hardened


def resize_rgba_with_premultiplied_alpha(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    rgba = image.convert("RGBA")
    red, green, blue, alpha = rgba.split()
    premultiplied_red = ImageChops.multiply(red, alpha)
    premultiplied_green = ImageChops.multiply(green, alpha)
    premultiplied_blue = ImageChops.multiply(blue, alpha)

    resized_alpha = alpha.resize(size, LANCZOS)
    resized_red = premultiplied_red.resize(size, LANCZOS)
    resized_green = premultiplied_green.resize(size, LANCZOS)
    resized_blue = premultiplied_blue.resize(size, LANCZOS)

    pixels: list[tuple[int, int, int, int]] = []
    for r_value, g_value, b_value, alpha_value in zip(
        resized_red.getdata(),
        resized_green.getdata(),
        resized_blue.getdata(),
        resized_alpha.getdata(),
    ):
        if alpha_value <= 0:
            pixels.append((0, 0, 0, 0))
            continue
        pixels.append(
            (
                min(255, int((r_value * 255 + (alpha_value // 2)) / alpha_value)),
                min(255, int((g_value * 255 + (alpha_value // 2)) / alpha_value)),
                min(255, int((b_value * 255 + (alpha_value // 2)) / alpha_value)),
                alpha_value,
            )
        )

    resized = Image.new("RGBA", size)
    resized.putdata(pixels)
    return resized


def ffprobe_json(path: Path) -> dict:
    ffprobe = resolve_ffmpeg_binary("ffprobe")
    output = run_process(
        [
            ffprobe,
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_streams",
            "-show_format",
            str(path),
        ]
    )
    return json.loads(output)


def parse_frame_rate(raw: str) -> float:
    if not raw or raw == "0/0":
        return 0.0
    try:
        return float(Fraction(raw))
    except Exception:
        return 0.0


def video_info(path: Path) -> dict:
    payload = ffprobe_json(path)
    streams = payload.get("streams") or []
    video_stream = next((item for item in streams if item.get("codec_type") == "video"), {})
    width = safe_int(video_stream.get("width"), 0)
    height = safe_int(video_stream.get("height"), 0)
    fps = parse_frame_rate(str(video_stream.get("avg_frame_rate") or video_stream.get("r_frame_rate") or "0/0"))
    duration = safe_float((payload.get("format") or {}).get("duration"), 0.0)
    return {
        "width": width,
        "height": height,
        "fps": fps,
        "duration": duration,
        "codec": str(video_stream.get("codec_name") or ""),
    }


def video_has_audio(path: Path) -> bool:
    try:
        payload = ffprobe_json(path)
    except Exception:
        return False
    return any((item.get("codec_type") == "audio") for item in (payload.get("streams") or []))


def image_info(path: Path) -> dict:
    with Image.open(path) as image:
        width, height = image.size
        codec = str((image.format or path.suffix.removeprefix(".") or "image")).lower()
    return {
        "width": width,
        "height": height,
        "fps": 0.0,
        "duration": 0.0,
        "codec": codec,
    }


def content_type_extension(content_type: str | None) -> str:
    normalized = str(content_type or "").split(";", 1)[0].strip().lower()
    return CONTENT_TYPE_EXTENSIONS.get(normalized, "")


def sniff_media_extension(path: Path) -> str:
    if not path.exists() or not path.is_file():
        return ""
    with path.open("rb") as handle:
        head = handle.read(64)
    if len(head) >= 12 and head[4:8] == b"ftyp":
        return ".mp4"
    if head.startswith(b"\x1a\x45\xdf\xa3"):
        return ".webm"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if head.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if head.startswith(b"BM"):
        return ".bmp"
    if len(head) >= 12 and head.startswith(b"RIFF") and head[8:12] == b"WEBP":
        return ".webp"
    if head.startswith(b"GIF87a") or head.startswith(b"GIF89a"):
        return ".gif"
    return ""


def detect_media_type(path: Path, content_type: str | None = None) -> str:
    suffix = path.suffix.lower()
    if suffix in VIDEO_EXTENSIONS:
        return "video"
    if suffix in IMAGE_EXTENSIONS:
        return "image"

    content_extension = content_type_extension(content_type)
    if content_extension in VIDEO_EXTENSIONS:
        return "video"
    if content_extension in IMAGE_EXTENSIONS:
        return "image"

    sniffed_extension = sniff_media_extension(path)
    if sniffed_extension in VIDEO_EXTENSIONS:
        return "video"
    if sniffed_extension in IMAGE_EXTENSIONS:
        return "image"

    if path.exists() and path.is_file():
        try:
            with Image.open(path):
                return "image"
        except Exception:
            pass
        try:
            ffprobe_json(path)
            return "video"
        except Exception:
            pass

    detail = path.suffix or content_type or path.name
    raise ValueError(f"unsupported media type: {detail}")


def preferred_media_extension(path: Path, media_type: str, content_type: str | None = None) -> str:
    suffix = path.suffix.lower()
    allowed = VIDEO_EXTENSIONS if media_type == "video" else IMAGE_EXTENSIONS
    if suffix in allowed:
        return suffix
    content_extension = content_type_extension(content_type)
    if content_extension in allowed:
        return content_extension
    sniffed_extension = sniff_media_extension(path)
    if sniffed_extension in allowed:
        return sniffed_extension
    return ".mp4" if media_type == "video" else ".png"


def media_info(path: Path, media_type: str | None = None) -> dict:
    resolved_type = media_type or detect_media_type(path)
    payload = video_info(path) if resolved_type == "video" else image_info(path)
    payload["media_type"] = resolved_type
    payload["bytes"] = path.stat().st_size if path.exists() else 0
    return payload


def upload_dir(upload_id: str) -> Path:
    return UPLOADS_DIR / upload_id


def upload_manifest_path(upload_id: str) -> Path:
    return upload_dir(upload_id) / "manifest.json"


def load_upload_manifest(upload_id: str) -> dict:
    path = upload_manifest_path(upload_id)
    if not path.exists():
        raise FileNotFoundError(f"upload not found: {upload_id}")
    return json.loads(path.read_text(encoding="utf-8"))


def save_upload_manifest(upload_id: str, payload: dict) -> None:
    path = upload_manifest_path(upload_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def source_media_entry(upload_id: str) -> tuple[Path, str]:
    manifest = load_upload_manifest(upload_id)
    path = repair_mojibake_path(Path(manifest["source_path"]))
    if not path.exists():
        raise FileNotFoundError(f"source missing: {path}")
    media_type = str(manifest.get("media_type") or detect_media_type(path))
    return path, media_type


def source_frame_entries(upload_id: str) -> list[dict]:
    manifest = load_upload_manifest(upload_id)
    entries = manifest.get("source_frames") or []
    if entries:
        result = []
        for index, entry in enumerate(entries):
            path = repair_mojibake_path(Path(str(entry.get("path") or "")))
            if not path.exists():
                raise FileNotFoundError(f"source frame missing: {path}")
            result.append(
                {
                    "path": path,
                    "name": str(entry.get("name") or path.name),
                    "index": index,
                }
            )
        return result

    path, _ = source_media_entry(upload_id)
    return [{"path": path, "name": path.name, "index": 0}]


def image_sequence_info(entries: list[dict]) -> dict:
    max_width = 0
    max_height = 0
    total_bytes = 0
    for entry in entries:
        path = Path(entry["path"])
        with Image.open(path) as image:
            width, height = image.size
        max_width = max(max_width, width)
        max_height = max(max_height, height)
        total_bytes += path.stat().st_size
    return {
        "width": max_width,
        "height": max_height,
        "fps": 0.0,
        "duration": 0.0,
        "codec": "image-sequence",
        "frame_count": len(entries),
        "bytes": total_bytes,
        "media_type": "image_sequence",
    }


def upload_media_info(upload_id: str, source_path: Path, media_type: str) -> dict:
    if media_type == "image_sequence":
        return image_sequence_info(source_frame_entries(upload_id))
    return media_info(source_path, media_type)


def source_video_path(upload_id: str) -> Path:
    manifest = load_upload_manifest(upload_id)
    preview_path = str(manifest.get("preview_path") or "").strip()
    if preview_path:
        path = repair_mojibake_path(Path(preview_path))
        if path.exists():
            return path
    path, _ = source_media_entry(upload_id)
    return path


def build_upload_payload(
    upload_id: str,
    source_path: Path,
    display_name: str,
    media_type: str,
    preview_path: Path | None = None,
    media_info_payload: dict | None = None,
) -> dict:
    info_path = preview_path if preview_path and preview_path.exists() and media_type == "video" else source_path
    info = media_info_payload or media_info(info_path, media_type)
    info["media_type"] = media_type
    payload = {
        "upload_id": upload_id,
        "display_name": display_name,
        "media_url": f"/media/upload/{upload_id}",
        "video_url": f"/media/upload/{upload_id}",
        "source_path": str(source_path),
        "preview_path": str(preview_path) if preview_path else "",
        "media_type": media_type,
        "video_info": info,
        "media_info": info,
    }
    if media_type == "image_sequence":
        payload["source_frames"] = [
            {
                "index": int(frame.get("index", index)),
                "name": frame.get("name") or f"image_{index + 1}",
                "raw_name": frame.get("raw_name") or frame.get("name") or "",
                "width": int(frame.get("width") or 0),
                "height": int(frame.get("height") or 0),
                "url": f"/media/upload/{upload_id}/frames/{int(frame.get('index', index))}",
            }
            for index, frame in enumerate(source_frame_entries(upload_id))
        ]
    return payload


def is_gif_source(path: Path) -> bool:
    if path.suffix.lower() == ".gif":
        return True
    try:
        return sniff_media_extension(path) == ".gif"
    except Exception:
        return False


def create_gif_video_preview(source_path: Path, output_path: Path) -> Path:
    ffmpeg = resolve_ffmpeg_binary("ffmpeg")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = output_path.with_name(f"{output_path.stem}.tmp{output_path.suffix}")
    if temp_path.exists():
        temp_path.unlink()
    if output_path.exists():
        output_path.unlink()
    run_process(
        [
            ffmpeg,
            "-y",
            "-i",
            str(source_path),
            "-vf",
            "scale=ceil(iw/2)*2:ceil(ih/2)*2",
            "-movflags",
            "+faststart",
            "-pix_fmt",
            "yuv420p",
            str(temp_path),
        ]
    )
    if not temp_path.exists() or temp_path.stat().st_size <= 0:
        temp_path.unlink(missing_ok=True)
        raise RuntimeError("failed to create GIF video preview")
    temp_path.replace(output_path)
    return output_path


def register_video_from_path(source_path: Path) -> dict:
    source_path = repair_mojibake_path(source_path).expanduser().resolve()
    if not source_path.exists() or not source_path.is_file():
        raise FileNotFoundError(f"file not found: {source_path}")
    media_type = detect_media_type(source_path)

    upload_id = timestamped_id()
    preview_path: Path | None = None
    if media_type == "video" and is_gif_source(source_path):
        preview_path = create_gif_video_preview(source_path, upload_dir(upload_id) / "preview.mp4")
    manifest = {
        "upload_id": upload_id,
        "source_path": str(source_path),
        "preview_path": str(preview_path) if preview_path else "",
        "display_name": source_path.name,
        "media_type": media_type,
        "created_at": iso_now(),
    }
    save_upload_manifest(upload_id, manifest)
    return build_upload_payload(upload_id, source_path, source_path.name, media_type, preview_path)


def register_uploaded_file(file_item) -> dict:
    filename = clean_filename(file_item.filename or "media")
    content_type = str(getattr(file_item, "type", "") or "")
    upload_id = timestamped_id()
    target_dir = upload_dir(upload_id)
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / filename
    with target_path.open("wb") as handle:
        shutil.copyfileobj(file_item.file, handle)
    media_type = detect_media_type(target_path, content_type)
    preferred_extension = preferred_media_extension(target_path, media_type, content_type)
    if target_path.suffix.lower() not in (VIDEO_EXTENSIONS | IMAGE_EXTENSIONS):
        renamed_path = target_path.with_name(f"{target_path.name}{preferred_extension}")
        target_path.rename(renamed_path)
        target_path = renamed_path
        filename = target_path.name
    preview_path: Path | None = None
    if media_type == "video" and is_gif_source(target_path):
        preview_path = create_gif_video_preview(target_path, target_dir / "preview.mp4")
    manifest = {
        "upload_id": upload_id,
        "source_path": str(target_path),
        "preview_path": str(preview_path) if preview_path else "",
        "display_name": filename,
        "media_type": media_type,
        "created_at": iso_now(),
    }
    save_upload_manifest(upload_id, manifest)
    return build_upload_payload(upload_id, target_path, filename, media_type, preview_path)


def register_uploaded_image_sequence(file_items: list) -> dict:
    candidates = []
    for item in file_items:
        raw_filename = str(getattr(item, "filename", "") or "frame")
        display_name = Path(raw_filename.replace("\\", "/")).name or "frame"
        if not getattr(item, "file", None):
            continue
        suffix = Path(display_name).suffix.lower()
        content_type = str(getattr(item, "type", "") or "")
        if suffix not in IMAGE_EXTENSIONS and not content_type.startswith("image/"):
            raise ValueError("multiple-file import only supports image sequences")
        candidates.append((raw_filename, display_name, item))

    candidates.sort(key=lambda pair: natural_sort_key(pair[0]))
    if len(candidates) < 2:
        raise ValueError("image sequence import needs at least 2 image files")

    upload_id = timestamped_id()
    target_dir = upload_dir(upload_id)
    frames_dir = target_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    source_frames: list[dict] = []
    max_width = 0
    max_height = 0
    total_bytes = 0
    first_path: Path | None = None
    for index, (raw_filename, display_name, item) in enumerate(candidates):
        suffix = Path(display_name).suffix.lower()
        content_type = str(getattr(item, "type", "") or "")
        extension = suffix if suffix in IMAGE_EXTENSIONS else content_type_extension(content_type) or ".png"
        frame_name = f"frame_{index + 1:05d}{extension}"
        target_path = frames_dir / frame_name
        with target_path.open("wb") as handle:
            shutil.copyfileobj(item.file, handle)
        with Image.open(target_path) as image:
            width, height = image.size
            max_width = max(max_width, width)
            max_height = max(max_height, height)
        total_bytes += target_path.stat().st_size
        if first_path is None:
            first_path = target_path
        source_frames.append(
            {
                "index": index,
                "name": display_name,
                "raw_name": raw_filename,
                "path": str(target_path),
                "width": width,
                "height": height,
            }
        )

    if first_path is None:
        raise ValueError("no supported image frames found")

    display_name = f"{len(source_frames)} images ({source_frames[0]['name']} ... {source_frames[-1]['name']})"
    info = {
        "width": max_width,
        "height": max_height,
        "fps": 0.0,
        "duration": 0.0,
        "codec": "image-sequence",
        "frame_count": len(source_frames),
        "bytes": total_bytes,
        "media_type": "image_sequence",
    }
    manifest = {
        "source_path": str(first_path),
        "preview_path": "",
        "display_name": display_name,
        "media_type": "image_sequence",
        "source_frames": source_frames,
        "created_at": iso_now(),
    }
    save_upload_manifest(upload_id, manifest)
    return build_upload_payload(upload_id, first_path, display_name, "image_sequence", media_info_payload=info)


def register_uploaded_media(file_items: list) -> dict:
    items = [item for item in file_items if getattr(item, "file", None)]
    if not items:
        raise ValueError("media file missing")
    if len(items) == 1:
        return register_uploaded_file(items[0])
    return register_uploaded_image_sequence(items)


def register_job_frame_as_upload(job_id: str, frame_index: int = 0) -> dict:
    manifest = load_job_manifest(job_id)
    frames = manifest.get("frames") or []
    if not frames:
        raise ValueError("job has no image frames")
    frame = next((item for item in frames if safe_int(item.get("index"), -1) == frame_index), None) or frames[0]
    processed_dir = job_dir(job_id) / "processed"
    source_name = Path(str(frame.get("name") or "frame.png")).name
    source_path = processed_dir / source_name
    if not source_path.is_file():
        raise FileNotFoundError(f"processed frame missing: {source_path}")

    upload_id = timestamped_id()
    target_dir = upload_dir(upload_id)
    target_dir.mkdir(parents=True, exist_ok=True)
    display_name = clean_filename(str(frame.get("original_name") or source_name or "dual-background-result.png"))
    if not display_name.lower().endswith(tuple(IMAGE_EXTENSIONS)):
        display_name = f"{Path(display_name).stem or 'image'}.png"
    target_path = target_dir / display_name
    shutil.copy2(source_path, target_path)
    with Image.open(target_path) as image:
        width, height = image.size
    manifest_payload = {
        "upload_id": upload_id,
        "source_path": str(target_path),
        "preview_path": "",
        "display_name": display_name,
        "media_type": "image",
        "source_job_id": job_id,
        "source_frame_index": safe_int(frame.get("index"), 0),
        "created_at": iso_now(),
    }
    save_upload_manifest(upload_id, manifest_payload)
    payload = build_upload_payload(
        upload_id,
        target_path,
        display_name,
        "image",
        media_info_payload={
            "width": width,
            "height": height,
            "fps": 0.0,
            "duration": 0.0,
            "codec": "image",
            "frame_count": 1,
            "bytes": target_path.stat().st_size,
            "media_type": "image",
        },
    )
    payload["source_job_id"] = job_id
    payload["source_frame_index"] = safe_int(frame.get("index"), 0)
    return payload


def auto_key_color(image: Image.Image) -> tuple[int, int, int]:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    sample_size = max(4, min(width, height) // 16)
    boxes = [
        (0, 0, sample_size, sample_size),
        (width - sample_size, 0, width, sample_size),
        (0, height - sample_size, sample_size, height),
        (width - sample_size, height - sample_size, width, height),
    ]
    totals = [0, 0, 0]
    count = 0
    for left, top, right, bottom in boxes:
        for y in range(top, bottom):
            for x in range(left, right):
                r_value, g_value, b_value, _ = rgba.getpixel((x, y))
                totals[0] += r_value
                totals[1] += g_value
                totals[2] += b_value
                count += 1
    if count <= 0:
        return (0, 255, 0)
    return tuple(int(value / count) for value in totals)


def chroma_key_frame(
    image: Image.Image,
    key_rgb: tuple[int, int, int],
    threshold: int,
    softness: int,
    despill_strength: float,
    halo_pixels: int,
) -> Image.Image:
    rgba = image.convert("RGBA")
    output_pixels: list[tuple[int, int, int, int]] = []
    k_r, k_g, k_b = key_rgb
    if softness <= 0:
        max_distance = max(threshold, 1)
    else:
        max_distance = threshold + softness

    for r_value, g_value, b_value, _ in rgba.getdata():
        dist = math.sqrt(
            (r_value - k_r) ** 2
            + (g_value - k_g) ** 2
            + (b_value - k_b) ** 2
        )
        if dist <= threshold:
            alpha = 0
        elif softness <= 0 or dist >= max_distance:
            alpha = 255
        else:
            alpha = int(((dist - threshold) / softness) * 255)

        max_rb = max(r_value, b_value)
        spill = max(0, g_value - max_rb)
        closeness = max(0.0, 1.0 - min(dist / max_distance, 1.0))
        reduction = int(spill * despill_strength * max(closeness, 1.0 - (alpha / 255.0)))
        output_pixels.append(
            (
                r_value,
                max(0, g_value - reduction),
                b_value,
                alpha,
            )
        )

    keyed = Image.new("RGBA", rgba.size)
    keyed.putdata(output_pixels)

    if halo_pixels > 0:
        alpha_channel = keyed.getchannel("A")
        filter_size = (halo_pixels * 2) + 1
        eroded = alpha_channel.filter(ImageFilter.MinFilter(filter_size))
        keyed.putalpha(eroded)

    return keyed


def color_distance_rgb(pixel: tuple[int, int, int], key_rgb: tuple[int, int, int]) -> float:
    r_value, g_value, b_value = pixel
    k_r, k_g, k_b = key_rgb
    return math.sqrt((r_value - k_r) ** 2 + (g_value - k_g) ** 2 + (b_value - k_b) ** 2)


def anti_alias_alpha_edges(
    image: Image.Image,
    radius: float = 1.35,
    band_radius: int = 2,
    rgb_radius: float = 0.55,
) -> Image.Image:
    normalized_radius = max(0.0, float(radius or 0.0))
    normalized_band_radius = max(1, int(band_radius or 1))
    if normalized_radius <= 0:
        return image.convert("RGBA")

    rgba = image.convert("RGBA")
    red, green, blue, alpha = rgba.split()
    filter_size = (normalized_band_radius * 2) + 1
    max_alpha = alpha.filter(ImageFilter.MaxFilter(filter_size))
    min_alpha = alpha.filter(ImageFilter.MinFilter(filter_size))
    edge_band = ImageChops.difference(max_alpha, min_alpha).point(lambda value: 255 if value else 0)

    # Soften only the inside edge. Raising outside alpha would reveal background-color halos.
    blurred_alpha = alpha.filter(ImageFilter.GaussianBlur(radius=normalized_radius))
    inward_soft_alpha = ImageChops.darker(alpha, blurred_alpha)
    antialiased_alpha = Image.composite(inward_soft_alpha, alpha, edge_band)
    antialiased_alpha = antialiased_alpha.point(lambda value: 0 if value <= 1 else 255 if value >= 254 else value)

    normalized_rgb_radius = max(0.0, float(rgb_radius or 0.0))
    if normalized_rgb_radius > 0:
        blurred_rgb = Image.merge("RGB", (red, green, blue)).filter(ImageFilter.GaussianBlur(radius=normalized_rgb_radius))
        edge_rgb = Image.composite(blurred_rgb, Image.merge("RGB", (red, green, blue)), edge_band)
        red, green, blue = edge_rgb.split()
    return Image.merge("RGBA", (red, green, blue, antialiased_alpha))


def edge_antialias_radius_from_softness(softness: int) -> float:
    return clamp_float(1.1 + (max(0, int(softness)) * 0.045), 1.2, 1.8)


def edge_connected_chroma_key_frame(
    image: Image.Image,
    key_rgb: tuple[int, int, int],
    threshold: int,
    softness: int,
    halo_pixels: int,
    despill_strength: float = 0.0,
) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = list(rgba.getdata())
    total = width * height
    if total <= 0:
        return rgba

    max_distance = max(1, int(threshold) + max(0, int(softness)))
    background = bytearray(total)
    visited = bytearray(total)
    queue: list[int] = []

    def matches_background(index: int) -> bool:
        r_value, g_value, b_value, alpha = pixels[index]
        if alpha <= 0:
            return False
        return color_distance_rgb((r_value, g_value, b_value), key_rgb) <= max_distance

    def seed(index: int) -> None:
        if not visited[index] and matches_background(index):
            visited[index] = 1
            background[index] = 1
            queue.append(index)

    for x in range(width):
        seed(x)
        seed((height - 1) * width + x)
    for y in range(height):
        seed(y * width)
        seed(y * width + width - 1)

    alpha_bbox = rgba.getchannel("A").getbbox()
    if alpha_bbox:
        left, top, right, bottom = alpha_bbox
        right -= 1
        bottom -= 1
        for x in range(left, right + 1):
            seed(top * width + x)
            seed(bottom * width + x)
        for y in range(top, bottom + 1):
            seed(y * width + left)
            seed(y * width + right)

    head = 0
    while head < len(queue):
        index = queue[head]
        head += 1
        x = index % width
        y = index // width
        neighbors = []
        if x > 0:
            neighbors.append(index - 1)
        if x + 1 < width:
            neighbors.append(index + 1)
        if y > 0:
            neighbors.append(index - width)
        if y + 1 < height:
            neighbors.append(index + width)
        for next_index in neighbors:
            if visited[next_index]:
                continue
            visited[next_index] = 1
            if matches_background(next_index):
                background[next_index] = 1
                queue.append(next_index)

    output_pixels: list[tuple[int, int, int, int]] = []
    for index, (r_value, g_value, b_value, alpha) in enumerate(pixels):
        if alpha <= 0:
            output_pixels.append((r_value, g_value, b_value, 0))
            continue
        if not background[index]:
            output_pixels.append((r_value, g_value, b_value, alpha))
            continue
        dist = color_distance_rgb((r_value, g_value, b_value), key_rgb)
        if softness > 0 and dist > threshold:
            next_alpha = int(alpha * max(0.0, min(1.0, (dist - threshold) / max(1, softness))))
        else:
            next_alpha = 0
        output_pixels.append((r_value, g_value, b_value, next_alpha))

    keyed = Image.new("RGBA", rgba.size)
    keyed.putdata(output_pixels)
    if halo_pixels > 0:
        alpha_channel = keyed.getchannel("A")
        filter_size = (max(0, int(halo_pixels)) * 2) + 1
        keyed.putalpha(alpha_channel.filter(ImageFilter.MinFilter(filter_size)))
    antialias_radius = edge_antialias_radius_from_softness(softness)
    keyed = anti_alias_alpha_edges(keyed, radius=antialias_radius, band_radius=2, rgb_radius=0.55)
    keyed = despill_alpha_edges(keyed, key_rgb, despill_strength)
    return keyed


def import_ai_matte_dependencies():
    configure_ai_model_cache()
    try:
        import torch
        from torchvision import transforms
        from transformers import AutoModelForImageSegmentation
    except ModuleNotFoundError as exc:
        missing_name = getattr(exc, "name", "AI matting dependency")
        raise RuntimeError(
            f"{missing_name} is not installed. Run: python -m pip install -r requirements-ai.txt"
        ) from exc
    return torch, transforms, AutoModelForImageSegmentation


def resolve_ai_runtime_device(torch_module, requested_device: str) -> str:
    requested = normalize_ai_device(requested_device)
    cuda_available = bool(torch_module.cuda.is_available())
    if requested == "cuda" and not cuda_available:
        raise RuntimeError("CUDA was requested for BiRefNet, but torch cannot see an NVIDIA GPU.")
    if requested == "cuda":
        return "cuda"
    if requested == "cpu":
        return "cpu"
    return "cuda" if cuda_available else "cpu"


def load_birefnet_model(model_key: str, requested_device: str):
    torch_module, _transforms, auto_model = import_ai_matte_dependencies()
    normalized_model_key = normalize_ai_model_key(model_key)
    repo_id = AI_MATTE_MODEL_REPOS[normalized_model_key]
    device = resolve_ai_runtime_device(torch_module, requested_device)
    cache_key = (repo_id, device)
    if cache_key in _BIREFNET_MODEL_CACHE:
        return _BIREFNET_MODEL_CACHE[cache_key], device, normalized_model_key, repo_id

    if hasattr(torch_module, "set_float32_matmul_precision"):
        try:
            torch_module.set_float32_matmul_precision("high")
        except Exception:
            pass

    cache_dir = configure_ai_model_cache()
    model = auto_model.from_pretrained(repo_id, trust_remote_code=True, cache_dir=str(cache_dir))
    model.to(device)
    if device == "cpu" and hasattr(model, "float"):
        model.float()
    model.eval()
    _BIREFNET_MODEL_CACHE[cache_key] = model
    return model, device, normalized_model_key, repo_id


def import_corridorkey_dependencies():
    configure_ai_model_cache()
    root = default_corridorkey_root()
    module_dir = root / "CorridorKeyModule"
    if not module_dir.exists():
        raise RuntimeError(
            f"CorridorKey is not installed at {root}. Run setup_ai_runtime.bat or clone {CORRIDORKEY_REPO_URL}."
        )

    root_text = str(root)
    if root_text not in sys.path:
        sys.path.insert(0, root_text)

    os.environ.setdefault("OPENCV_IO_ENABLE_OPENEXR", "1")
    os.environ.setdefault("CORRIDORKEY_SKIP_COMPILE", "1")

    try:
        import importlib
        import numpy as np
        import torch
    except ModuleNotFoundError as exc:
        missing_name = getattr(exc, "name", "CorridorKey dependency")
        raise RuntimeError(
            f"{missing_name} is not installed. Run: python -m pip install -r requirements-ai.txt"
        ) from exc

    try:
        corridor_backend = importlib.import_module("CorridorKeyModule.backend")
    except ModuleNotFoundError as exc:
        raise RuntimeError(f"CorridorKey could not be imported from {root}.") from exc

    try:
        corridor_inference = importlib.import_module("CorridorKeyModule.inference_engine")
    except ModuleNotFoundError as exc:
        raise RuntimeError(f"CorridorKey inference engine could not be imported from {root}.") from exc

    patch_corridorkey_gpu_despeckle(corridor_inference, torch)

    checkpoint_dir = module_dir / "checkpoints"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    corridor_backend.CHECKPOINT_DIR = str(checkpoint_dir)
    return np, torch, corridor_backend, root


def patch_corridorkey_gpu_despeckle(corridor_inference, torch_module) -> None:
    try:
        color_utils = corridor_inference.cu
        transforms_functional = corridor_inference.TF
    except Exception:
        return
    if getattr(color_utils.clean_matte_torch, "_sprite_video_lab_safe", False):
        return

    original_clean_matte_torch = color_utils.clean_matte_torch
    functional = torch_module.nn.functional

    def safe_clean_matte_torch(alpha, area_threshold: int, dilation: int = 15, blur_size: int = 5):
        _batch, _channels, height, width = alpha.shape
        if (height * width) <= CORRIDORKEY_GPU_DESPECKLE_PIXEL_LIMIT:
            return original_clean_matte_torch(alpha, area_threshold, dilation=dilation, blur_size=blur_size)

        mask = (alpha > 0.25).to(dtype=alpha.dtype)
        if area_threshold > 0:
            opening_radius = max(1, min(4, area_threshold // 100))
            kernel_size = (opening_radius * 2) + 1
            for _ in range(2):
                mask = -functional.max_pool2d(-mask, kernel_size, stride=1, padding=opening_radius)
                mask = functional.max_pool2d(mask, kernel_size, stride=1, padding=opening_radius)
        if dilation > 0:
            repeats = max(1, dilation // 2)
            for _ in range(repeats):
                mask = functional.max_pool2d(mask, 5, stride=1, padding=2)
        if blur_size > 0:
            kernel_size = int(blur_size * 2 + 1)
            mask = transforms_functional.gaussian_blur(mask, [kernel_size, kernel_size])
        return alpha * mask

    safe_clean_matte_torch._sprite_video_lab_safe = True
    color_utils.clean_matte_torch = safe_clean_matte_torch


def load_corridorkey_engine(requested_device: str, screen_color: str):
    _np, torch_module, corridor_backend, root = import_corridorkey_dependencies()
    device = resolve_ai_runtime_device(torch_module, requested_device)
    cache_key = (device, screen_color)
    if cache_key in _CORRIDORKEY_ENGINE_CACHE:
        return _CORRIDORKEY_ENGINE_CACHE[cache_key], device, root

    engine = corridor_backend.create_engine(
        backend="torch",
        device=device,
        img_size=CORRIDORKEY_IMG_SIZE,
        screen_color=screen_color,
    )
    _CORRIDORKEY_ENGINE_CACHE[cache_key] = engine
    return engine, device, root


def linear_to_srgb_array(values):
    import numpy as np

    clipped = np.clip(values, 0.0, None)
    return np.where(clipped <= 0.0031308, clipped * 12.92, 1.055 * np.power(clipped, 1.0 / 2.4) - 0.055)


def corridorkey_processed_to_image(processed) -> Image.Image:
    import numpy as np

    alpha = np.clip(processed[..., 3:4], 0.0, 1.0)
    premul_rgb = np.clip(processed[..., :3], 0.0, None)
    straight_linear = np.zeros_like(premul_rgb)
    np.divide(premul_rgb, np.maximum(alpha, 1e-6), out=straight_linear, where=alpha > 1e-6)
    straight_srgb = linear_to_srgb_array(straight_linear)
    rgba = np.concatenate([straight_srgb, alpha], axis=-1)
    rgba_u8 = (np.clip(rgba, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8)
    return Image.fromarray(rgba_u8, "RGBA")


def corridorkey_auto_despeckle_on_gpu(image: Image.Image) -> bool:
    return True


def corridorkey_postprocess_on_gpu(device: str) -> bool:
    return str(device).startswith("cuda")


def corridorkey_process_arrays(
    engine,
    rgb,
    mask,
    screen_channel: int,
    despill_strength: float,
    post_process_on_gpu: bool,
    auto_despeckle: bool,
):
    result = engine.process_frame(
        rgb,
        mask,
        input_is_linear=False,
        fg_is_straight=True,
        despill_strength=max(0.0, min(1.0, float(despill_strength or 0.0))),
        auto_despeckle=auto_despeckle,
        despeckle_size=400,
        generate_comp=False,
        post_process_on_gpu=post_process_on_gpu,
        screen_channel=screen_channel,
    )
    return result


def corridorkey_alpha_to_image(alpha) -> Image.Image:
    import numpy as np

    alpha_array = np.asarray(alpha)
    if alpha_array.ndim == 3:
        alpha_array = alpha_array[..., 0]
    alpha_u8 = (np.clip(alpha_array, 0.0, 1.0) * 255.0 + 0.5).astype(np.uint8)
    return Image.fromarray(alpha_u8, "L")


def corridorkey_refine_frame(
    image: Image.Image,
    alpha_mask: Image.Image,
    requested_device: str,
    screen_color: str,
    despill_strength: float,
) -> tuple[Image.Image, dict]:
    import numpy as np

    engine, device, root = load_corridorkey_engine(requested_device, screen_color)
    screen_channel = 2 if screen_color == "blue" else 1
    post_process_on_gpu = corridorkey_postprocess_on_gpu(device)
    auto_despeckle = not post_process_on_gpu or corridorkey_auto_despeckle_on_gpu(image)
    uses_safe_despeckle = post_process_on_gpu and (image.size[0] * image.size[1]) > CORRIDORKEY_GPU_DESPECKLE_PIXEL_LIMIT
    rgb = np.array(image.convert("RGB"), dtype=np.uint8, copy=True)
    mask = np.array(alpha_mask.convert("L"), dtype=np.uint8, copy=True)
    result = corridorkey_process_arrays(
        engine,
        rgb,
        mask,
        screen_channel,
        despill_strength,
        post_process_on_gpu,
        auto_despeckle,
    )
    alpha = corridorkey_alpha_to_image(result["processed"][..., 3:4])
    refined = apply_alpha_mask(image, alpha)
    refined = despill_alpha_edges(refined, auto_key_color(image), despill_strength)

    info = {
        "corridorkey_enabled": True,
        "corridorkey_color_source": "original",
        "corridorkey_screen_color": screen_color,
        "corridorkey_device": device,
        "corridorkey_resolution": CORRIDORKEY_IMG_SIZE,
        "corridorkey_post_process": "gpu" if post_process_on_gpu else "cpu",
        "corridorkey_auto_despeckle": auto_despeckle,
        "corridorkey_safe_despeckle": uses_safe_despeckle,
        "corridorkey_tiled": False,
        "corridorkey_root": str(root),
    }
    return refined, info


def fit_image_to_square(image: Image.Image, size: int) -> tuple[Image.Image, tuple[int, int, int, int]]:
    rgb = image.convert("RGB")
    width, height = rgb.size
    if width <= 0 or height <= 0:
        raise ValueError("invalid image size for BiRefNet inference")

    scale = min(size / width, size / height)
    resized_size = (
        max(1, round(width * scale)),
        max(1, round(height * scale)),
    )
    resized = rgb.resize(resized_size, LANCZOS)
    canvas = Image.new("RGB", (size, size), (0, 0, 0))
    left = (size - resized_size[0]) // 2
    top = (size - resized_size[1]) // 2
    canvas.paste(resized, (left, top))
    return canvas, (left, top, left + resized_size[0], top + resized_size[1])


def birefnet_mask_score(mask: Image.Image) -> dict:
    alpha = mask.convert("L")
    total = max(1, alpha.size[0] * alpha.size[1])
    histogram = alpha.histogram()
    strong_pixels = sum(histogram[160:256])
    visible_pixels = total - histogram[0]
    max_alpha = max(index for index, count in enumerate(histogram) if count)
    mean_alpha = sum(index * count for index, count in enumerate(histogram)) / total
    return {
        "max_alpha": max_alpha,
        "mean_alpha": mean_alpha,
        "visible_pixels": visible_pixels,
        "strong_pixels": strong_pixels,
        "visible_ratio": visible_pixels / total,
        "strong_ratio": strong_pixels / total,
    }


def is_weak_birefnet_mask(score: dict) -> bool:
    max_alpha = int(score.get("max_alpha") or 0)
    strong_ratio = float(score.get("strong_ratio") or 0.0)
    visible_ratio = float(score.get("visible_ratio") or 0.0)
    return max_alpha < 80 or (max_alpha < 128 and strong_ratio < 0.002 and visible_ratio < 0.08)


def should_use_birefnet_fallback(current_score: dict, fallback_score: dict) -> bool:
    current_max = int(current_score.get("max_alpha") or 0)
    fallback_max = int(fallback_score.get("max_alpha") or 0)
    current_strong = float(current_score.get("strong_ratio") or 0.0)
    fallback_strong = float(fallback_score.get("strong_ratio") or 0.0)
    if fallback_max < 128:
        return False
    if fallback_max >= max(160, current_max * 2) and fallback_strong > current_strong:
        return True
    return current_max < 80 and fallback_strong >= 0.005


def run_birefnet_inference(
    image: Image.Image,
    model_key: str,
    requested_device: str,
    resolution: int,
) -> tuple[Image.Image, dict]:
    torch_module, transforms, _auto_model = import_ai_matte_dependencies()
    model, device, normalized_model_key, repo_id = load_birefnet_model(model_key, requested_device)
    fitted_image, fitted_box = fit_image_to_square(image, resolution)
    transform = transforms.Compose(
        [
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )
    input_tensor = transform(fitted_image).unsqueeze(0).to(device)
    try:
        model_dtype = next(model.parameters()).dtype
    except StopIteration:
        model_dtype = input_tensor.dtype
    if model_dtype in {torch_module.float16, torch_module.bfloat16, torch_module.float32, torch_module.float64}:
        input_tensor = input_tensor.to(dtype=model_dtype)
    with torch_module.no_grad():
        prediction = model(input_tensor)[-1].sigmoid().to("cpu")
    mask = transforms.ToPILImage()(prediction[0].squeeze()).convert("L")
    mask = mask.crop(fitted_box).resize(image.size, LANCZOS)
    return mask, {
        "model_key": normalized_model_key,
        "model_label": AI_MATTE_MODEL_LABELS[normalized_model_key],
        "repo_id": repo_id,
        "device": device,
        "resolution": resolution,
    }


def birefnet_alpha_mask(
    image: Image.Image,
    model_key: str,
    requested_device: str,
    inference_resolution: int | str | None,
) -> tuple[Image.Image, dict]:
    normalized_model_key = normalize_ai_model_key(model_key)
    resolution = resolve_ai_resolution(inference_resolution, image)
    mask, info = run_birefnet_inference(image, normalized_model_key, requested_device, resolution)
    score = birefnet_mask_score(mask)
    info["mask_score"] = score
    info["requested_model_key"] = normalized_model_key
    info["fallback_model_key"] = ""
    info["fallback_reason"] = ""

    fallback_model_key = "birefnet-general"
    if normalized_model_key != fallback_model_key and is_weak_birefnet_mask(score):
        fallback_mask, fallback_info = run_birefnet_inference(image, fallback_model_key, requested_device, resolution)
        fallback_score = birefnet_mask_score(fallback_mask)
        if should_use_birefnet_fallback(score, fallback_score):
            fallback_info["mask_score"] = fallback_score
            fallback_info["requested_model_key"] = normalized_model_key
            fallback_info["fallback_model_key"] = fallback_model_key
            fallback_info["fallback_reason"] = "selected BiRefNet model produced a weak alpha mask"
            return fallback_mask, fallback_info

    return mask, info


def update_ai_model_after_fallback(ai_model: str, ai_info: dict | None) -> str:
    if not ai_info:
        return ai_model
    return str(ai_info.get("model_key") or ai_model)


def luminance_alpha_mask(
    image: Image.Image,
    black_point: int,
    white_point: int,
    gamma: float,
    strength: float,
    key_rgb: tuple[int, int, int] | None = None,
    key_suppression: float = 0.95,
) -> Image.Image:
    black = max(0, min(254, int(black_point)))
    white = max(black + 1, min(255, int(white_point)))
    curve_gamma = max(0.05, float(gamma or 1.0))
    curve_strength = max(0.0, min(2.0, float(strength or 1.0)))
    key_strength = max(0.0, min(1.0, float(key_suppression)))
    rgb = image.convert("RGB")
    scale = white - black
    output = Image.new("L", rgb.size)
    output_pixels: list[int] = []
    for r_value, g_value, b_value in rgb.getdata():
        luma = int((0.2126 * r_value) + (0.7152 * g_value) + (0.0722 * b_value))
        normalized = clamp_float((luma - black) / scale, 0.0, 1.0)
        adjusted = normalized ** curve_gamma
        alpha = clamp_float(adjusted * curve_strength, 0.0, 1.0)
        if key_rgb is not None and key_strength > 0:
            k_r, k_g, k_b = key_rgb
            dist = math.sqrt((r_value - k_r) ** 2 + (g_value - k_g) ** 2 + (b_value - k_b) ** 2)
            closeness = 1.0 - min(dist / 180.0, 1.0)
            alpha *= 1.0 - ((closeness ** 2) * key_strength)
        output_pixels.append(round(alpha * 255))
    output.putdata(output_pixels)
    return output


def apply_alpha_mask(image: Image.Image, alpha_mask: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    mask = alpha_mask.convert("L")
    if mask.size != rgba.size:
        mask = mask.resize(rgba.size, LANCZOS)
    rgba.putalpha(mask)
    return rgba


def despill_alpha_edges(
    image: Image.Image,
    key_rgb: tuple[int, int, int],
    strength: float,
) -> Image.Image:
    normalized_strength = max(0.0, min(2.5, float(strength or 0.0)))
    if normalized_strength <= 0:
        return image

    rgba = image.convert("RGBA")
    k_r, k_g, k_b = key_rgb
    key_channels = (k_r, k_g, k_b)
    spill_channel = max(range(3), key=lambda index: key_channels[index])
    output_pixels: list[tuple[int, int, int, int]] = []
    for r_value, g_value, b_value, alpha in rgba.getdata():
        channels = [r_value, g_value, b_value]
        spill_value = channels[spill_channel]
        other_values = [value for index, value in enumerate(channels) if index != spill_channel]
        spill = max(0, spill_value - max(other_values))
        if spill <= 0:
            output_pixels.append((r_value, g_value, b_value, alpha))
            continue

        dist = math.sqrt((r_value - k_r) ** 2 + (g_value - k_g) ** 2 + (b_value - k_b) ** 2)
        key_closeness = 1.0 - min(dist / 220.0, 1.0)
        edge_factor = 1.0 - (alpha / 255.0)
        cleanup_factor = max(edge_factor, key_closeness * 0.7)
        reduction = int(spill * normalized_strength * cleanup_factor)
        channels[spill_channel] = max(0, spill_value - reduction)
        output_pixels.append((channels[0], channels[1], channels[2], alpha))

    cleaned = Image.new("RGBA", rgba.size)
    cleaned.putdata(output_pixels)
    return cleaned


def subject_protect_alpha_mask(chroma_alpha: Image.Image, subject_alpha: Image.Image) -> Image.Image:
    chroma_mask = chroma_alpha.convert("L")
    subject_mask = subject_alpha.convert("L")
    if subject_mask.size != chroma_mask.size:
        subject_mask = subject_mask.resize(chroma_mask.size, LANCZOS)

    protect_size = max(3, min(17, ((min(chroma_mask.size) // 96) * 2) + 3))
    subject_core = subject_mask.filter(ImageFilter.MinFilter(protect_size))
    subject_core = subject_core.point(lambda value: 255 if value >= 176 else 0)
    return ImageChops.lighter(chroma_mask, subject_core)


def despill_alpha_edges_with_protection(
    image: Image.Image,
    key_rgb: tuple[int, int, int],
    strength: float,
    protection_alpha: Image.Image,
) -> Image.Image:
    normalized_strength = max(0.0, min(2.5, float(strength or 0.0)))
    if normalized_strength <= 0:
        return image

    rgba = image.convert("RGBA")
    protection = protection_alpha.convert("L")
    if protection.size != rgba.size:
        protection = protection.resize(rgba.size, LANCZOS)

    k_r, k_g, k_b = key_rgb
    key_channels = (k_r, k_g, k_b)
    spill_channel = max(range(3), key=lambda index: key_channels[index])
    output_pixels: list[tuple[int, int, int, int]] = []
    for (r_value, g_value, b_value, alpha), protected_value in zip(rgba.getdata(), protection.getdata()):
        channels = [r_value, g_value, b_value]
        spill_value = channels[spill_channel]
        other_values = [value for index, value in enumerate(channels) if index != spill_channel]
        spill = max(0, spill_value - max(other_values))
        if spill <= 0:
            output_pixels.append((r_value, g_value, b_value, alpha))
            continue

        dist = math.sqrt((r_value - k_r) ** 2 + (g_value - k_g) ** 2 + (b_value - k_b) ** 2)
        key_closeness = 1.0 - min(dist / 220.0, 1.0)
        edge_factor = 1.0 - (alpha / 255.0)
        protection_factor = 1.0 - (protected_value / 255.0)
        cleanup_factor = max(edge_factor, key_closeness * 0.7) * protection_factor
        reduction = int(spill * normalized_strength * cleanup_factor)
        channels[spill_channel] = max(0, spill_value - reduction)
        output_pixels.append((channels[0], channels[1], channels[2], alpha))

    cleaned = Image.new("RGBA", rgba.size)
    cleaned.putdata(output_pixels)
    return cleaned


def apply_matte_pipeline(
    raw_images: list[Image.Image],
    chroma_enabled: bool,
    matte_mode: str,
    key_mode: str,
    manual_key_hex: str,
    threshold: int,
    softness: int,
    despill_strength: float,
    halo_pixels: int,
    ai_model: str,
    ai_device: str,
    ai_resolution: int | str | None,
    luma_black: int,
    luma_white: int,
    luma_gamma: float,
    luma_strength: float,
    corridorkey_enabled: bool,
    corridorkey_screen: str,
    progress_callback=None,
) -> tuple[list[Image.Image], tuple[int, int, int], dict]:
    if not raw_images:
        raise ValueError("no frames to matte")

    mode = normalize_matte_mode(matte_mode, chroma_enabled)
    key_rgb = auto_key_color(raw_images[0])
    if key_mode == "manual":
        key_rgb = parse_hex_color(manual_key_hex)
    normalized_luma_black = max(0, min(254, int(luma_black)))
    normalized_luma_white = max(normalized_luma_black + 1, min(255, int(luma_white)))
    matte_info = {
        "mode": mode,
        "model_key": "",
        "model_label": "",
        "repo_id": "",
        "device": "",
        "resolution": 0,
        "luma_enabled": mode in {"luma", "birefnet_luma", "birefnet_luma_key", "birefnet_luma_corridorkey"},
        "luma_black": normalized_luma_black,
        "luma_white": normalized_luma_white,
        "luma_gamma": max(0.05, float(luma_gamma or 1.0)),
        "luma_strength": max(0.0, min(2.0, float(luma_strength or 1.0))),
        "despill_strength": max(0.0, min(2.5, float(despill_strength or 0.0))),
        "halo_pixels": max(0, int(halo_pixels)),
        "edge_antialias_radius": 0.0,
        "corridorkey_enabled": False,
        "corridorkey_screen_color": "",
        "corridorkey_device": "",
        "corridorkey_resolution": 0,
    }
    mode_uses_corridorkey = mode in {
        "corridorkey",
        "birefnet_corridorkey",
        "birefnet_corridorkey_key",
        "birefnet_luma_corridorkey",
    }
    use_corridorkey = bool((corridorkey_enabled or mode_uses_corridorkey) and mode != "none")
    resolved_corridorkey_screen = resolve_corridorkey_screen(corridorkey_screen, key_rgb)

    if mode == "none":
        return raw_images, key_rgb, matte_info

    if mode == "edge_connected_chroma":
        keyed_frames = []
        matte_info["edge_antialias_radius"] = edge_antialias_radius_from_softness(softness)
        for index, raw_image in enumerate(raw_images, start=1):
            keyed_frames.append(
                edge_connected_chroma_key_frame(
                    image=raw_image,
                    key_rgb=key_rgb,
                    threshold=threshold,
                    softness=softness,
                    halo_pixels=halo_pixels,
                    despill_strength=matte_info["despill_strength"],
                )
            )
            if progress_callback:
                progress_callback(index)
        return keyed_frames, key_rgb, matte_info

    if mode in {"chroma", "corridorkey"}:
        keyed_frames = []
        corridor_info: dict | None = None
        for index, raw_image in enumerate(raw_images, start=1):
            chroma_frame = chroma_key_frame(
                image=raw_image,
                key_rgb=key_rgb,
                threshold=threshold,
                softness=softness,
                despill_strength=despill_strength,
                halo_pixels=halo_pixels,
            )
            if use_corridorkey:
                refined_frame, corridor_info = corridorkey_refine_frame(
                    raw_image,
                    chroma_frame.getchannel("A"),
                    ai_device,
                    resolved_corridorkey_screen,
                    matte_info["despill_strength"],
                )
                keyed_frames.append(refined_frame)
            else:
                keyed_frames.append(chroma_frame)
            if progress_callback:
                progress_callback(index)
        if corridor_info:
            matte_info.update(corridor_info)
        return keyed_frames, key_rgb, matte_info

    if mode == "luma":
        keyed_frames: list[Image.Image] = []
        for index, raw_image in enumerate(raw_images, start=1):
            alpha = luminance_alpha_mask(
                raw_image,
                matte_info["luma_black"],
                max(matte_info["luma_black"] + 1, matte_info["luma_white"]),
                matte_info["luma_gamma"],
                matte_info["luma_strength"],
                key_rgb=key_rgb,
            )
            if matte_info["halo_pixels"] > 0:
                filter_size = (matte_info["halo_pixels"] * 2) + 1
                alpha = alpha.filter(ImageFilter.MinFilter(filter_size))
            keyed_frame = apply_alpha_mask(raw_image, alpha)
            keyed_frame = despill_alpha_edges(keyed_frame, key_rgb, matte_info["despill_strength"])
            keyed_frames.append(keyed_frame)
            if progress_callback:
                progress_callback(index)
        return keyed_frames, key_rgb, matte_info

    keyed_frames: list[Image.Image] = []
    ai_info: dict | None = None
    corridor_info: dict | None = None
    resolved_ai_model = ai_model
    for index, raw_image in enumerate(raw_images, start=1):
        ai_alpha, ai_info = birefnet_alpha_mask(raw_image, resolved_ai_model, ai_device, ai_resolution)
        resolved_ai_model = update_ai_model_after_fallback(resolved_ai_model, ai_info)
        if matte_info["halo_pixels"] > 0:
            filter_size = (matte_info["halo_pixels"] * 2) + 1
            ai_alpha = ai_alpha.filter(ImageFilter.MinFilter(filter_size))
        if mode == "subject_protect_chroma":
            chroma_alpha = chroma_key_frame(
                image=raw_image,
                key_rgb=key_rgb,
                threshold=threshold,
                softness=softness,
                despill_strength=0,
                halo_pixels=halo_pixels,
            ).getchannel("A")
            alpha = subject_protect_alpha_mask(chroma_alpha, ai_alpha)
        elif mode in {"birefnet_luma", "birefnet_luma_key", "birefnet_luma_corridorkey"}:
            luma_alpha = luminance_alpha_mask(
                raw_image,
                matte_info["luma_black"],
                max(matte_info["luma_black"] + 1, matte_info["luma_white"]),
                matte_info["luma_gamma"],
                matte_info["luma_strength"],
                key_rgb=key_rgb,
            )
            if mode == "birefnet_luma_key":
                alpha = ImageChops.darker(ai_alpha, luma_alpha)
            else:
                alpha = ImageChops.lighter(ai_alpha, luma_alpha)
        else:
            alpha = ai_alpha
        if use_corridorkey:
            keyed_frame, corridor_info = corridorkey_refine_frame(
                raw_image,
                alpha,
                ai_device,
                resolved_corridorkey_screen,
                matte_info["despill_strength"],
            )
            if mode == "birefnet_corridorkey_key":
                refined_alpha = ImageChops.darker(ai_alpha, keyed_frame.getchannel("A"))
                keyed_frame.putalpha(refined_alpha)
        else:
            keyed_frame = apply_alpha_mask(raw_image, alpha)
            if mode == "subject_protect_chroma":
                keyed_frame = despill_alpha_edges_with_protection(
                    keyed_frame,
                    key_rgb,
                    matte_info["despill_strength"],
                    ai_alpha,
                )
            else:
                keyed_frame = despill_alpha_edges(keyed_frame, key_rgb, matte_info["despill_strength"])
        keyed_frames.append(keyed_frame)
        if progress_callback:
            progress_callback(index)

    if ai_info:
        matte_info.update(ai_info)
    if corridor_info:
        matte_info.update(corridor_info)
    return keyed_frames, key_rgb, matte_info


def stable_resize_frames(
    keyed_frames: list[Image.Image],
    target_size: int,
    reduce_px: int,
    canvas_mode: str = "auto",
    hard_alpha: bool = False,
) -> tuple[list[Image.Image], list[tuple[int, int, int, int] | None], float, tuple[int, int]]:
    bboxes = [frame.getchannel("A").getbbox() for frame in keyed_frames]
    valid_boxes = [box for box in bboxes if box is not None]
    if not valid_boxes:
        raise RuntimeError("all frames became transparent after chroma key")

    stable_box = (
        min(box[0] for box in valid_boxes),
        min(box[1] for box in valid_boxes),
        max(box[2] for box in valid_boxes),
        max(box[3] for box in valid_boxes),
    )
    stable_width = stable_box[2] - stable_box[0]
    stable_height = stable_box[3] - stable_box[1]
    canvas_mode = normalize_canvas_mode(canvas_mode)
    canvas_height = max(8, target_size)
    margin = max(0, min(reduce_px, max(0, (canvas_height - 8) // 2)))

    if canvas_mode == "auto":
        inner_height = max(8, canvas_height - (margin * 2))
        scale = inner_height / max(stable_height, 1)
        resized_stable_size = (
            max(1, round(stable_width * scale)),
            max(1, round(stable_height * scale)),
        )
        canvas_width = max(8, resized_stable_size[0] + (margin * 2))
        paste_x = (canvas_width - resized_stable_size[0]) // 2
        paste_y = (canvas_height - resized_stable_size[1]) // 2
    else:
        inner_size = max(8, canvas_height - (margin * 2))
        scale = min(inner_size / max(stable_width, 1), inner_size / max(stable_height, 1))
        resized_stable_size = (
            max(1, round(stable_width * scale)),
            max(1, round(stable_height * scale)),
        )
        canvas_width = canvas_height
        paste_x = (canvas_width - resized_stable_size[0]) // 2
        if canvas_mode == "square_center":
            paste_y = (canvas_height - resized_stable_size[1]) // 2
        else:
            paste_y = canvas_height - margin - resized_stable_size[1]

    canvas_size = (canvas_width, canvas_height)

    rendered: list[Image.Image] = []
    for frame in keyed_frames:
        canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
        cropped = frame.crop(stable_box)
        resized = resize_rgba_with_premultiplied_alpha(
            cropped,
            resized_stable_size,
        )
        if hard_alpha:
            resized = enforce_hard_alpha(resized)
        canvas.paste(resized, (paste_x, paste_y), resized)
        if hard_alpha:
            canvas = enforce_hard_alpha(canvas)
        rendered.append(canvas)

    return rendered, bboxes, scale, canvas_size


def should_preserve_source_canvas(media_type: str, reduce_px: int, canvas_mode: str) -> bool:
    return media_type in {"image", "image_sequence"} and reduce_px <= 0 and normalize_canvas_mode(canvas_mode) == "auto"


def resize_frames_on_source_canvas(
    keyed_frames: list[Image.Image],
    output_scale: float,
    hard_alpha: bool = False,
) -> tuple[list[Image.Image], list[tuple[int, int, int, int] | None], float, tuple[int, int]]:
    bboxes = [frame.getchannel("A").getbbox() for frame in keyed_frames]
    if not any(box is not None for box in bboxes):
        raise RuntimeError("all frames became transparent after chroma key")

    scale = normalize_output_scale(output_scale)
    rendered: list[Image.Image] = []
    max_width = 0
    max_height = 0
    for frame in keyed_frames:
        target_size = (
            max(1, round(frame.width * scale)),
            max(1, round(frame.height * scale)),
        )
        resized = frame.copy() if target_size == frame.size else resize_rgba_with_premultiplied_alpha(frame, target_size)
        if hard_alpha:
            resized = enforce_hard_alpha(resized)
        rendered.append(resized)
        max_width = max(max_width, resized.width)
        max_height = max(max_height, resized.height)

    return rendered, bboxes, scale, (max_width, max_height)


def job_dir(job_id: str) -> Path:
    return JOBS_DIR / job_id


def job_manifest_path(job_id: str) -> Path:
    return job_dir(job_id) / "manifest.json"


def save_job_manifest(job_id: str, payload: dict) -> None:
    path = job_manifest_path(job_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def load_job_manifest(job_id: str) -> dict:
    path = job_manifest_path(job_id)
    if not path.exists():
        raise FileNotFoundError(f"job not found: {job_id}")
    return json.loads(path.read_text(encoding="utf-8"))


def extract_raw_frames(
    source_path: Path,
    raw_dir: Path,
    start_time: float,
    end_time: float,
    keep_every: int,
) -> tuple[list[Path], dict]:
    ffmpeg = resolve_ffmpeg_binary("ffmpeg")
    if raw_dir.exists():
        shutil.rmtree(raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)

    def build_args(hwaccel: str | None) -> list[str]:
        args = [ffmpeg, "-y"]
        if hwaccel:
            args += ["-hwaccel", hwaccel]
        args += [
            "-ss",
            f"{start_time:.3f}",
            "-to",
            f"{end_time:.3f}",
            "-i",
            str(source_path),
        ]
        if keep_every > 1:
            args += ["-vf", f"select=not(mod(n\\,{keep_every}))"]
        args += ["-vsync", "0", str(raw_dir / "frame_%05d.png")]
        return args

    accel = run_ffmpeg_with_auto_accel(build_args)
    frames = sorted(raw_dir.glob("frame_*.png"))
    if not frames:
        raise RuntimeError("no frames extracted from the selected segment")
    return frames, accel


def extract_single_frame(source_path: Path, output_path: Path, sample_time: float) -> tuple[Path, dict]:
    ffmpeg = resolve_ffmpeg_binary("ffmpeg")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    def build_args(hwaccel: str | None) -> list[str]:
        args = [ffmpeg, "-y"]
        if hwaccel:
            args += ["-hwaccel", hwaccel]
        args += [
            "-ss",
            f"{sample_time:.3f}",
            "-i",
            str(source_path),
            "-frames:v",
            "1",
            str(output_path),
        ]
        return args

    accel = run_ffmpeg_with_auto_accel(build_args)
    if not output_path.exists():
        raise RuntimeError("failed to extract preview frame")
    return output_path, accel


def copy_sequence_frames(
    upload_id: str,
    raw_dir: Path,
    start_frame: int,
    end_frame: int,
) -> tuple[list[Path], list[dict]]:
    entries = source_frame_entries(upload_id)
    frame_count = len(entries)
    start_index = clamp_int(int(start_frame or 1), 1, frame_count) - 1
    end_index = clamp_int(int(end_frame or frame_count), 1, frame_count) - 1
    if end_index < start_index:
        end_index = start_index

    if raw_dir.exists():
        shutil.rmtree(raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)

    raw_paths: list[Path] = []
    selected_entries: list[dict] = []
    for output_index, entry in enumerate(entries[start_index : end_index + 1]):
        raw_path = raw_dir / f"frame_{output_index + 1:05d}.png"
        with Image.open(entry["path"]) as image:
            image.convert("RGBA").save(raw_path)
        raw_paths.append(raw_path)
        selected_entries.append(entry)
    if not raw_paths:
        raise RuntimeError("no image sequence frames selected")
    return raw_paths, selected_entries


def process_video_to_job(
    upload_id: str,
    start_time: float,
    end_time: float,
    start_frame: int,
    end_frame: int,
    keep_every: int,
    output_scale: float,
    reduce_px: int,
    canvas_mode: str,
    chroma_enabled: bool,
    matte_mode: str,
    key_mode: str,
    manual_key_hex: str,
    threshold: int,
    softness: int,
    despill_strength: float,
    halo_pixels: int,
    ai_model: str,
    ai_device: str,
    ai_resolution: int | str | None,
    luma_black: int,
    luma_white: int,
    luma_gamma: float,
    luma_strength: float,
    corridorkey_enabled: bool,
    corridorkey_screen: str,
    batch_green_to_black: bool = False,
    batch_green_desaturate: bool = False,
    batch_semitransparent_to_black: bool = False,
    batch_semitransparent_to_opaque: bool = False,
    progress_id: str = "",
) -> dict:
    source_path, media_type = source_media_entry(upload_id)
    info = upload_media_info(upload_id, source_path, media_type)
    start_time = max(0.0, start_time)
    duration = safe_float(info.get("duration"), 0.0)
    if media_type == "video" and duration > 0:
        end_time = min(end_time, duration)
    elif media_type == "image":
        start_time = 0.0
        end_time = 0.0
        start_frame = 1
        end_frame = 1
    elif media_type == "image_sequence":
        frame_count = max(1, safe_int(info.get("frame_count"), len(source_frame_entries(upload_id))))
        start_time = 0.0
        end_time = 0.0
        keep_every = 1
        start_frame = clamp_int(int(start_frame or 1), 1, frame_count)
        end_frame = clamp_int(int(end_frame or frame_count), start_frame, frame_count)
    if media_type == "video" and end_time <= start_time:
        raise ValueError("end time must be greater than start time")
    if media_type == "video":
        requested_start_frame = int(start_frame or 0)
        requested_end_frame = int(end_frame or 0)
        if requested_start_frame > 0 and requested_end_frame >= requested_start_frame:
            start_frame = requested_start_frame
            end_frame = requested_end_frame
        else:
            start_frame = 0
            end_frame = 0

    job_id = timestamped_id()
    root = job_dir(job_id)
    raw_dir = root / "raw"
    processed_dir = root / "processed"
    thumbs_dir = root / "thumbs"
    for directory in (processed_dir, thumbs_dir):
        directory.mkdir(parents=True, exist_ok=True)

    if media_type == "image":
        raw_path = raw_dir / "frame_00001.png"
        _, ffmpeg_accel = extract_image_frame(source_path, raw_path)
        raw_paths = [raw_path]
        source_entries = [{"name": source_path.name}]
    elif media_type == "image_sequence":
        raw_paths, source_entries = copy_sequence_frames(upload_id, raw_dir, start_frame, end_frame)
        ffmpeg_accel = image_sequence_payload()
    else:
        raw_paths, ffmpeg_accel = extract_raw_frames(
            source_path,
            raw_dir,
            start_time,
            end_time,
            max(1, keep_every),
        )
        source_entries = []
    progress_total = max(1, len(raw_paths))
    set_process_progress(progress_id, 0, progress_total, "matte")

    def update_frame_progress(current: int) -> None:
        set_process_progress(progress_id, current, progress_total, "processing")

    raw_images = [open_rgba_image(path) for path in raw_paths]
    output_scale = normalize_output_scale(output_scale)
    target_size = target_size_from_source_height(max(image.height for image in raw_images), output_scale)

    keyed_frames, key_rgb, matte_info = apply_matte_pipeline(
        raw_images=raw_images,
        chroma_enabled=chroma_enabled,
        matte_mode=matte_mode,
        key_mode=key_mode,
        manual_key_hex=manual_key_hex,
        threshold=threshold,
        softness=softness,
        despill_strength=despill_strength,
        halo_pixels=halo_pixels,
        ai_model=ai_model,
        ai_device=ai_device,
        ai_resolution=ai_resolution,
        luma_black=luma_black,
        luma_white=luma_white,
        luma_gamma=luma_gamma,
        luma_strength=luma_strength,
        corridorkey_enabled=corridorkey_enabled,
        corridorkey_screen=corridorkey_screen,
        progress_callback=update_frame_progress,
    )

    hard_alpha = matte_info["mode"] == "chroma" and softness == 0 and not matte_info["corridorkey_enabled"]
    if should_preserve_source_canvas(media_type, reduce_px, canvas_mode):
        rendered_frames, bboxes, scale, canvas_size = resize_frames_on_source_canvas(
            keyed_frames,
            output_scale,
            hard_alpha=hard_alpha,
        )
    else:
        rendered_frames, bboxes, scale, canvas_size = stable_resize_frames(
            keyed_frames,
            target_size,
            reduce_px,
            canvas_mode,
            hard_alpha=hard_alpha,
        )
    frame_entries: list[dict] = []
    postprocess_changed = {
        "green_to_black": 0,
        "green_desaturate": 0,
        "semitransparent_to_black": 0,
        "semitransparent_to_opaque": 0,
    }
    for index, frame in enumerate(rendered_frames):
        frame_name = f"frame_{index + 1:03d}.png"
        thumb_name = f"thumb_{index + 1:03d}.png"
        frame_path = processed_dir / frame_name
        thumb_path = thumbs_dir / thumb_name
        if batch_green_to_black:
            frame, changed = green_to_black_image(frame)
            postprocess_changed["green_to_black"] += changed
        if batch_green_desaturate:
            frame, changed = green_desaturate_image(frame)
            postprocess_changed["green_desaturate"] += changed
        if batch_semitransparent_to_black:
            frame, changed = semitransparent_to_black_image(frame)
            postprocess_changed["semitransparent_to_black"] += changed
        if batch_semitransparent_to_opaque:
            frame, changed = semitransparent_to_opaque_image(frame)
            postprocess_changed["semitransparent_to_opaque"] += changed
        frame.save(frame_path)
        thumb = frame.copy()
        thumb.thumbnail((128, 128))
        thumb.save(thumb_path)
        frame_entries.append(
            {
                "index": index,
                "name": frame_name,
                "original_name": source_entries[index]["name"] if index < len(source_entries) else frame_name,
                "url": f"/work/jobs/{job_id}/processed/{frame_name}",
                "thumb_url": f"/work/jobs/{job_id}/thumbs/{thumb_name}",
                "bbox": list(bboxes[index]) if bboxes[index] else None,
                "width": frame.size[0],
                "height": frame.size[1],
            }
        )
        set_process_progress(progress_id, index + 1, progress_total, "saving")

    manifest = {
        "job_id": job_id,
        "upload_id": upload_id,
        "job_dir": str(root),
        "processed_dir": str(processed_dir),
        "raw_dir": str(raw_dir),
        "source_path": str(source_path),
        "source_media_type": media_type,
        "ffmpeg_accel": ffmpeg_accel,
        "video_info": info,
        "options": {
            "start_time": start_time,
            "end_time": end_time,
            "start_frame": start_frame,
            "end_frame": end_frame,
            "keep_every": keep_every,
            "target_size": target_size,
            "output_scale": output_scale,
            "reduce_px": reduce_px,
            "canvas_mode": normalize_canvas_mode(canvas_mode),
            "preserve_source_canvas": should_preserve_source_canvas(media_type, reduce_px, canvas_mode),
            "output_width": canvas_size[0],
            "output_height": canvas_size[1],
            "chroma_enabled": chroma_enabled,
            "matte_mode": matte_info["mode"],
            "matte": matte_info,
            "key_mode": key_mode,
            "key_color": rgb_to_hex(key_rgb),
            "threshold": threshold,
            "softness": softness,
            "despill_strength": despill_strength,
            "halo_pixels": halo_pixels,
            "corridorkey_enabled": matte_info["corridorkey_enabled"],
            "corridorkey_screen": matte_info["corridorkey_screen_color"],
            "batch_green_to_black": bool(batch_green_to_black),
            "batch_green_desaturate": bool(batch_green_desaturate),
            "batch_semitransparent_to_black": bool(batch_semitransparent_to_black),
            "batch_semitransparent_to_opaque": bool(batch_semitransparent_to_opaque),
            "postprocess_changed_pixels": postprocess_changed,
            "scale": scale,
        },
        "frame_count": len(frame_entries),
        "frames": frame_entries,
    }
    save_job_manifest(job_id, manifest)
    set_process_progress(progress_id, len(frame_entries), progress_total, "done", done=True)
    return manifest


def matte_selected_frames_to_job(
    source_job_id: str,
    selected_indices: list[int],
    output_scale: float,
    reduce_px: int,
    canvas_mode: str,
    chroma_enabled: bool,
    matte_mode: str,
    key_mode: str,
    manual_key_hex: str,
    threshold: int,
    softness: int,
    despill_strength: float,
    halo_pixels: int,
    ai_model: str,
    ai_device: str,
    ai_resolution: int | str | None,
    luma_black: int,
    luma_white: int,
    luma_gamma: float,
    luma_strength: float,
    corridorkey_enabled: bool,
    corridorkey_screen: str,
    batch_green_to_black: bool = False,
    batch_green_desaturate: bool = False,
    batch_semitransparent_to_black: bool = False,
    batch_semitransparent_to_opaque: bool = False,
    progress_id: str = "",
) -> dict:
    source_job_id = str(source_job_id or "").strip()
    if not source_job_id:
        raise ValueError("source job id is required")

    source_manifest = load_job_manifest(source_job_id)
    source_frames = source_manifest.get("frames") or []
    frame_map = {int(entry.get("index", -1)): entry for entry in source_frames}
    raw_dir = Path(str(source_manifest.get("raw_dir") or job_dir(source_job_id) / "raw"))
    raw_paths = sorted(raw_dir.glob("frame_*.png"), key=lambda path: natural_sort_key(path.name))
    if not raw_paths:
        raise FileNotFoundError(f"raw frames missing for job: {source_job_id}")

    seen_indices: set[int] = set()
    selected_entries: list[dict] = []
    selected_raw_paths: list[Path] = []
    for raw_index in selected_indices:
        frame_index = int(raw_index)
        if frame_index in seen_indices or frame_index not in frame_map:
            continue
        entry = frame_map[frame_index]
        position = int(entry.get("index", frame_index))
        if position < 0 or position >= len(raw_paths):
            raise FileNotFoundError(f"raw frame missing for index: {frame_index}")
        selected_entries.append(entry)
        selected_raw_paths.append(raw_paths[position])
        seen_indices.add(frame_index)
    if not selected_raw_paths:
        raise ValueError("no frames selected for matting")

    job_id = timestamped_id()
    root = job_dir(job_id)
    raw_output_dir = root / "raw"
    processed_dir = root / "processed"
    thumbs_dir = root / "thumbs"
    for directory in (raw_output_dir, processed_dir, thumbs_dir):
        directory.mkdir(parents=True, exist_ok=True)

    copied_raw_paths: list[Path] = []
    for output_index, raw_path in enumerate(selected_raw_paths, start=1):
        copied_path = raw_output_dir / f"frame_{output_index:05d}.png"
        shutil.copy2(raw_path, copied_path)
        copied_raw_paths.append(copied_path)

    progress_total = max(1, len(copied_raw_paths))
    set_process_progress(progress_id, 0, progress_total, "matte")

    def update_frame_progress(current: int) -> None:
        set_process_progress(progress_id, current, progress_total, "processing")

    raw_images = [open_rgba_image(path) for path in copied_raw_paths]
    output_scale = normalize_output_scale(output_scale)
    target_size = target_size_from_source_height(max(image.height for image in raw_images), output_scale)
    keyed_frames, key_rgb, matte_info = apply_matte_pipeline(
        raw_images=raw_images,
        chroma_enabled=chroma_enabled,
        matte_mode=matte_mode,
        key_mode=key_mode,
        manual_key_hex=manual_key_hex,
        threshold=threshold,
        softness=softness,
        despill_strength=despill_strength,
        halo_pixels=halo_pixels,
        ai_model=ai_model,
        ai_device=ai_device,
        ai_resolution=ai_resolution,
        luma_black=luma_black,
        luma_white=luma_white,
        luma_gamma=luma_gamma,
        luma_strength=luma_strength,
        corridorkey_enabled=corridorkey_enabled,
        corridorkey_screen=corridorkey_screen,
        progress_callback=update_frame_progress,
    )

    media_type = str(source_manifest.get("source_media_type") or "animation").lower()
    hard_alpha = matte_info["mode"] == "chroma" and softness == 0 and not matte_info["corridorkey_enabled"]
    if should_preserve_source_canvas(media_type, reduce_px, canvas_mode):
        rendered_frames, bboxes, scale, canvas_size = resize_frames_on_source_canvas(
            keyed_frames,
            output_scale,
            hard_alpha=hard_alpha,
        )
    else:
        rendered_frames, bboxes, scale, canvas_size = stable_resize_frames(
            keyed_frames,
            target_size,
            reduce_px,
            canvas_mode,
            hard_alpha=hard_alpha,
        )

    frame_entries: list[dict] = []
    postprocess_changed = {
        "green_to_black": 0,
        "green_desaturate": 0,
        "semitransparent_to_black": 0,
        "semitransparent_to_opaque": 0,
    }
    for index, frame in enumerate(rendered_frames):
        frame_name = f"frame_{index + 1:03d}.png"
        thumb_name = f"thumb_{index + 1:03d}.png"
        frame_path = processed_dir / frame_name
        thumb_path = thumbs_dir / thumb_name
        if batch_green_to_black:
            frame, changed = green_to_black_image(frame)
            postprocess_changed["green_to_black"] += changed
        if batch_green_desaturate:
            frame, changed = green_desaturate_image(frame)
            postprocess_changed["green_desaturate"] += changed
        if batch_semitransparent_to_black:
            frame, changed = semitransparent_to_black_image(frame)
            postprocess_changed["semitransparent_to_black"] += changed
        if batch_semitransparent_to_opaque:
            frame, changed = semitransparent_to_opaque_image(frame)
            postprocess_changed["semitransparent_to_opaque"] += changed
        frame.save(frame_path)
        thumb = frame.copy()
        thumb.thumbnail((128, 128))
        thumb.save(thumb_path)
        source_entry = selected_entries[index]
        frame_entries.append(
            {
                "index": index,
                "source_index": source_entry.get("index"),
                "name": frame_name,
                "original_name": source_entry.get("original_name") or source_entry.get("name") or frame_name,
                "url": f"/work/jobs/{job_id}/processed/{frame_name}",
                "thumb_url": f"/work/jobs/{job_id}/thumbs/{thumb_name}",
                "bbox": list(bboxes[index]) if bboxes[index] else None,
                "width": frame.size[0],
                "height": frame.size[1],
            }
        )
        set_process_progress(progress_id, index + 1, progress_total, "saving")

    source_options = source_manifest.get("options") or {}
    manifest = {
        "job_id": job_id,
        "source_job_id": source_job_id,
        "upload_id": source_manifest.get("upload_id") or "",
        "job_dir": str(root),
        "processed_dir": str(processed_dir),
        "raw_dir": str(raw_output_dir),
        "source_path": source_manifest.get("source_path") or "",
        "source_media_type": media_type,
        "ffmpeg_accel": source_manifest.get("ffmpeg_accel") or {},
        "video_info": source_manifest.get("video_info") or {},
        "options": {
            "start_time": source_options.get("start_time", 0),
            "end_time": source_options.get("end_time", 0),
            "start_frame": source_options.get("start_frame", 1),
            "end_frame": source_options.get("end_frame", len(source_frames)),
            "keep_every": source_options.get("keep_every", 1),
            "target_size": target_size,
            "output_scale": output_scale,
            "reduce_px": reduce_px,
            "canvas_mode": normalize_canvas_mode(canvas_mode),
            "preserve_source_canvas": should_preserve_source_canvas(media_type, reduce_px, canvas_mode),
            "output_width": canvas_size[0],
            "output_height": canvas_size[1],
            "chroma_enabled": chroma_enabled,
            "matte_mode": matte_info["mode"],
            "matte": matte_info,
            "key_mode": key_mode,
            "key_color": rgb_to_hex(key_rgb),
            "threshold": threshold,
            "softness": softness,
            "despill_strength": despill_strength,
            "halo_pixels": halo_pixels,
            "corridorkey_enabled": matte_info["corridorkey_enabled"],
            "corridorkey_screen": matte_info["corridorkey_screen_color"],
            "batch_green_to_black": bool(batch_green_to_black),
            "batch_green_desaturate": bool(batch_green_desaturate),
            "batch_semitransparent_to_black": bool(batch_semitransparent_to_black),
            "batch_semitransparent_to_opaque": bool(batch_semitransparent_to_opaque),
            "postprocess_changed_pixels": postprocess_changed,
            "selected_source_indices": [entry.get("index") for entry in selected_entries],
            "scale": scale,
        },
        "frame_count": len(frame_entries),
        "frames": frame_entries,
    }
    save_job_manifest(job_id, manifest)
    set_process_progress(progress_id, len(frame_entries), progress_total, "done", done=True)
    return manifest


def preview_dir(preview_id: str) -> Path:
    return PREVIEWS_DIR / preview_id


def load_preview_manifest(preview_id: str) -> dict:
    preview_id = str(preview_id or "").strip()
    if not preview_id or Path(preview_id).name != preview_id:
        raise ValueError("invalid preview id")
    path = preview_dir(preview_id) / "preview.json"
    if not path.exists():
        raise FileNotFoundError(f"preview not found: {preview_id}")
    return json.loads(path.read_text(encoding="utf-8"))


def save_preview_manifest(preview_id: str, manifest: dict) -> None:
    root = preview_dir(preview_id)
    root.mkdir(parents=True, exist_ok=True)
    (root / "preview.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def is_green_residue_pixel(
    r_value: int,
    g_value: int,
    b_value: int,
    alpha: int,
    threshold: int,
    dominance: int,
    alpha_floor: int,
) -> bool:
    if alpha < alpha_floor:
        return False

    raw_green_excess = g_value - max(r_value, b_value)
    is_raw_green = g_value >= threshold and raw_green_excess >= dominance
    if is_raw_green:
        return True

    if alpha <= 0:
        return False

    alpha_scale = 255.0 / alpha
    scaled_r = min(255, round(r_value * alpha_scale))
    scaled_g = min(255, round(g_value * alpha_scale))
    scaled_b = min(255, round(b_value * alpha_scale))
    scaled_green_excess = scaled_g - max(scaled_r, scaled_b)
    return scaled_g >= threshold and scaled_green_excess >= dominance


def green_to_black_image(
    image: Image.Image,
    threshold: int = 42,
    dominance: int = 24,
    alpha_floor: int = 1,
) -> tuple[Image.Image, int]:
    rgba = image.convert("RGBA")
    output_pixels: list[tuple[int, int, int, int]] = []
    changed = 0
    threshold = max(0, min(255, int(threshold)))
    dominance = max(0, min(255, int(dominance)))
    alpha_floor = max(0, min(255, int(alpha_floor)))

    for r_value, g_value, b_value, alpha in rgba.getdata():
        if is_green_residue_pixel(r_value, g_value, b_value, alpha, threshold, dominance, alpha_floor):
            output_pixels.append((0, 0, 0, alpha))
            changed += 1
        else:
            output_pixels.append((r_value, g_value, b_value, alpha))

    cleaned = Image.new("RGBA", rgba.size)
    cleaned.putdata(output_pixels)
    return cleaned, changed


def green_desaturate_image(
    image: Image.Image,
    threshold: int = 42,
    dominance: int = 24,
    alpha_floor: int = 1,
) -> tuple[Image.Image, int]:
    rgba = image.convert("RGBA")
    output_pixels: list[tuple[int, int, int, int]] = []
    changed = 0
    threshold = max(0, min(255, int(threshold)))
    dominance = max(0, min(255, int(dominance)))
    alpha_floor = max(0, min(255, int(alpha_floor)))

    for r_value, g_value, b_value, alpha in rgba.getdata():
        if is_green_residue_pixel(r_value, g_value, b_value, alpha, threshold, dominance, alpha_floor):
            gray = clamp_int(round(0.299 * r_value + 0.587 * g_value + 0.114 * b_value), 0, 255)
            output_pixels.append((gray, gray, gray, alpha))
            changed += 1
        else:
            output_pixels.append((r_value, g_value, b_value, alpha))

    cleaned = Image.new("RGBA", rgba.size)
    cleaned.putdata(output_pixels)
    return cleaned, changed


def green_to_black_preview(preview_id: str, threshold: int = 42, dominance: int = 24) -> dict:
    preview = load_preview_manifest(preview_id)
    root = preview_dir(preview["preview_id"])
    processed_path = root / "processed.png"
    if not processed_path.exists():
        raise FileNotFoundError(f"processed preview missing: {processed_path}")

    image = open_rgba_image(processed_path)
    cleaned, changed = green_to_black_image(image, threshold=threshold, dominance=dominance)
    image.close()
    cleaned.save(processed_path)
    cleaned.close()

    postprocess = preview.setdefault("postprocess", {})
    green_black = postprocess.setdefault("green_to_black", {})
    green_black["enabled"] = True
    green_black["threshold"] = max(0, min(255, int(threshold)))
    green_black["dominance"] = max(0, min(255, int(dominance)))
    green_black["changed_pixels"] = changed
    green_black["updated_at"] = iso_now()
    preview["processed_url"] = f"/work/previews/{preview['preview_id']}/processed.png?ts={int(time.time() * 1000)}"
    save_preview_manifest(preview["preview_id"], preview)
    return preview


def green_desaturate_preview(preview_id: str, threshold: int = 42, dominance: int = 24) -> dict:
    preview = load_preview_manifest(preview_id)
    root = preview_dir(preview["preview_id"])
    processed_path = root / "processed.png"
    if not processed_path.exists():
        raise FileNotFoundError(f"processed preview missing: {processed_path}")

    image = open_rgba_image(processed_path)
    cleaned, changed = green_desaturate_image(image, threshold=threshold, dominance=dominance)
    image.close()
    cleaned.save(processed_path)
    cleaned.close()

    postprocess = preview.setdefault("postprocess", {})
    green_desaturate = postprocess.setdefault("green_desaturate", {})
    green_desaturate["enabled"] = True
    green_desaturate["threshold"] = max(0, min(255, int(threshold)))
    green_desaturate["dominance"] = max(0, min(255, int(dominance)))
    green_desaturate["changed_pixels"] = changed
    green_desaturate["updated_at"] = iso_now()
    preview["processed_url"] = f"/work/previews/{preview['preview_id']}/processed.png?ts={int(time.time() * 1000)}"
    save_preview_manifest(preview["preview_id"], preview)
    return preview


def semitransparent_to_black_image(
    image: Image.Image,
    alpha_min: int = 1,
    alpha_max: int = 254,
) -> tuple[Image.Image, int]:
    rgba = image.convert("RGBA")
    output_pixels: list[tuple[int, int, int, int]] = []
    changed = 0
    alpha_min = max(0, min(255, int(alpha_min)))
    alpha_max = max(alpha_min, min(255, int(alpha_max)))

    for r_value, g_value, b_value, alpha in rgba.getdata():
        if alpha_min <= alpha <= alpha_max:
            output_pixels.append((0, 0, 0, alpha))
            changed += 1
        else:
            output_pixels.append((r_value, g_value, b_value, alpha))

    cleaned = Image.new("RGBA", rgba.size)
    cleaned.putdata(output_pixels)
    return cleaned, changed


def semitransparent_to_black_preview(preview_id: str, alpha_min: int = 1, alpha_max: int = 254) -> dict:
    preview = load_preview_manifest(preview_id)
    root = preview_dir(preview["preview_id"])
    processed_path = root / "processed.png"
    if not processed_path.exists():
        raise FileNotFoundError(f"processed preview missing: {processed_path}")

    image = open_rgba_image(processed_path)
    cleaned, changed = semitransparent_to_black_image(image, alpha_min=alpha_min, alpha_max=alpha_max)
    image.close()
    cleaned.save(processed_path)
    cleaned.close()

    postprocess = preview.setdefault("postprocess", {})
    semitransparent_black = postprocess.setdefault("semitransparent_to_black", {})
    semitransparent_black["enabled"] = True
    semitransparent_black["alpha_min"] = max(0, min(255, int(alpha_min)))
    semitransparent_black["alpha_max"] = max(0, min(255, int(alpha_max)))
    semitransparent_black["changed_pixels"] = changed
    semitransparent_black["updated_at"] = iso_now()
    preview["processed_url"] = f"/work/previews/{preview['preview_id']}/processed.png?ts={int(time.time() * 1000)}"
    save_preview_manifest(preview["preview_id"], preview)
    return preview


def semitransparent_to_opaque_image(
    image: Image.Image,
    alpha_min: int = 1,
    alpha_max: int = 254,
) -> tuple[Image.Image, int]:
    rgba = image.convert("RGBA")
    output_pixels: list[tuple[int, int, int, int]] = []
    changed = 0
    alpha_min = max(0, min(255, int(alpha_min)))
    alpha_max = max(alpha_min, min(255, int(alpha_max)))

    for r_value, g_value, b_value, alpha in rgba.getdata():
        if alpha_min <= alpha <= alpha_max:
            output_pixels.append((r_value, g_value, b_value, 255))
            changed += 1
        else:
            output_pixels.append((r_value, g_value, b_value, alpha))

    cleaned = Image.new("RGBA", rgba.size)
    cleaned.putdata(output_pixels)
    return cleaned, changed


def semitransparent_to_opaque_preview(preview_id: str, alpha_min: int = 1, alpha_max: int = 254) -> dict:
    preview = load_preview_manifest(preview_id)
    root = preview_dir(preview["preview_id"])
    processed_path = root / "processed.png"
    if not processed_path.exists():
        raise FileNotFoundError(f"processed preview missing: {processed_path}")

    image = open_rgba_image(processed_path)
    cleaned, changed = semitransparent_to_opaque_image(image, alpha_min=alpha_min, alpha_max=alpha_max)
    image.close()
    cleaned.save(processed_path)
    cleaned.close()

    postprocess = preview.setdefault("postprocess", {})
    semitransparent_opaque = postprocess.setdefault("semitransparent_to_opaque", {})
    semitransparent_opaque["enabled"] = True
    semitransparent_opaque["alpha_min"] = max(0, min(255, int(alpha_min)))
    semitransparent_opaque["alpha_max"] = max(0, min(255, int(alpha_max)))
    semitransparent_opaque["changed_pixels"] = changed
    semitransparent_opaque["updated_at"] = iso_now()
    preview["processed_url"] = f"/work/previews/{preview['preview_id']}/processed.png?ts={int(time.time() * 1000)}"
    save_preview_manifest(preview["preview_id"], preview)
    return preview


def color_distance_sq(left: tuple[int, int, int], right: tuple[int, int, int]) -> int:
    return sum((int(left[index]) - int(right[index])) ** 2 for index in range(3))


def manual_point_repair_image(
    processed_image: Image.Image,
    source_image: Image.Image,
    x: int,
    y: int,
    mode: str,
    radius: int,
    tolerance: int,
) -> tuple[Image.Image, int]:
    processed = processed_image.convert("RGBA")
    source = source_image.convert("RGBA")
    if source.size != processed.size:
        source = source.resize(processed.size, LANCZOS)

    width, height = processed.size
    if width <= 0 or height <= 0:
        return processed, 0
    x = clamp_int(x, 0, width - 1)
    y = clamp_int(y, 0, height - 1)
    radius = clamp_int(radius, 1, max(width, height))
    tolerance = clamp_int(tolerance, 0, 255)
    tolerance_sq = tolerance * tolerance * 3
    radius_sq = radius * radius
    mode = "remove" if str(mode).lower() == "remove" else "keep"

    processed_pixels = processed.load()
    source_pixels = source.load()
    seed = source_pixels[x, y][:3]
    queue = [(x, y)]
    seen = {(x, y)}
    changed = 0

    while queue:
        px, py = queue.pop()
        if (px - x) * (px - x) + (py - y) * (py - y) > radius_sq:
            continue
        source_pixel = source_pixels[px, py]
        if color_distance_sq(source_pixel[:3], seed) > tolerance_sq:
            continue

        current = processed_pixels[px, py]
        if mode == "remove":
            if current[3] != 0:
                processed_pixels[px, py] = (current[0], current[1], current[2], 0)
                changed += 1
        else:
            restored = (source_pixel[0], source_pixel[1], source_pixel[2], 255)
            if current != restored:
                processed_pixels[px, py] = restored
                changed += 1

        for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in seen:
                seen.add((nx, ny))
                queue.append((nx, ny))

    return processed, changed


def manual_brush_repair_image(
    processed_image: Image.Image,
    source_image: Image.Image,
    points: list[dict],
    mode: str,
    radius: int,
    tolerance: int,
    feather: int = 6,
) -> tuple[Image.Image, int]:
    processed = processed_image.convert("RGBA")
    source = source_image.convert("RGBA")
    if source.size != processed.size:
        source = source.resize(processed.size, LANCZOS)

    width, height = processed.size
    if width <= 0 or height <= 0:
        return processed, 0
    mode = "remove" if str(mode).lower() == "remove" else "keep"
    radius = clamp_int(radius, 1, max(width, height))
    tolerance = clamp_int(tolerance, 0, 255)
    feather = clamp_int(feather, 0, radius)
    tolerance_sq = tolerance * tolerance * 3
    radius_sq = radius * radius
    hard_radius = max(0, radius - feather)
    hard_radius_sq = hard_radius * hard_radius
    processed_pixels = processed.load()
    source_pixels = source.load()
    changed_pixels: set[tuple[int, int]] = set()

    for raw_point in points[:512]:
        px = clamp_int(safe_int(raw_point.get("x"), 0), 0, width - 1)
        py = clamp_int(safe_int(raw_point.get("y"), 0), 0, height - 1)
        seed = source_pixels[px, py][:3]
        left = max(0, px - radius)
        right = min(width - 1, px + radius)
        top = max(0, py - radius)
        bottom = min(height - 1, py + radius)

        for y_pos in range(top, bottom + 1):
            dy = y_pos - py
            for x_pos in range(left, right + 1):
                dx = x_pos - px
                distance_sq = dx * dx + dy * dy
                if distance_sq > radius_sq:
                    continue
                source_pixel = source_pixels[x_pos, y_pos]
                if color_distance_sq(source_pixel[:3], seed) > tolerance_sq:
                    continue

                if feather <= 0 or distance_sq <= hard_radius_sq:
                    strength = 1.0
                else:
                    distance = math.sqrt(distance_sq)
                    strength = clamp_float((radius - distance) / max(1, feather), 0.0, 1.0)
                if strength <= 0:
                    continue

                current = processed_pixels[x_pos, y_pos]
                if mode == "remove":
                    next_alpha = clamp_int(round(current[3] * (1.0 - strength)), 0, 255)
                    next_pixel = (current[0], current[1], current[2], next_alpha)
                else:
                    next_alpha = clamp_int(round(current[3] + (255 - current[3]) * strength), 0, 255)
                    next_pixel = (source_pixel[0], source_pixel[1], source_pixel[2], next_alpha)

                if current != next_pixel:
                    processed_pixels[x_pos, y_pos] = next_pixel
                    changed_pixels.add((x_pos, y_pos))

    return processed, len(changed_pixels)


def soften_alpha_edges_image(image: Image.Image, radius: int = 2, passes: int = 1) -> tuple[Image.Image, int]:
    rgba = image.convert("RGBA")
    radius = clamp_int(radius, 1, 20)
    passes = clamp_int(passes, 1, 5)
    red, green, blue, alpha = rgba.split()
    softened = alpha
    for _ in range(passes):
        softened = softened.filter(ImageFilter.GaussianBlur(radius=radius))
    changed = sum(1 for before, after in zip(alpha.getdata(), softened.getdata()) if before != after)
    return Image.merge("RGBA", (red, green, blue, softened)), changed


def preview_manual_point_repair(
    preview_id: str,
    x: int,
    y: int,
    mode: str,
    radius: int,
    tolerance: int,
    points: list[dict] | None = None,
    feather: int = 6,
) -> dict:
    preview = load_preview_manifest(preview_id)
    root = preview_dir(preview["preview_id"])
    processed_path = root / "processed.png"
    source_path = root / "source.png"
    raw_path = root / "raw.png"
    if not processed_path.exists():
        raise FileNotFoundError(f"processed preview missing: {processed_path}")
    source_for_repair = raw_path if raw_path.exists() else source_path
    if not source_for_repair.exists():
        raise FileNotFoundError(f"source preview missing: {source_for_repair}")

    push_repair_undo(root, "processed", processed_path)
    processed_image = open_rgba_image(processed_path)
    source_image = open_rgba_image(source_for_repair)
    brush_points = points if points else [{"x": x, "y": y}]
    repaired, changed = manual_brush_repair_image(processed_image, source_image, brush_points, mode, radius, tolerance, feather)
    processed_image.close()
    source_image.close()
    repaired.save(processed_path)
    repaired.close()

    postprocess = preview.setdefault("postprocess", {})
    manual = postprocess.setdefault("manual_point_repair", {"operations": []})
    operation = {
        "mode": "remove" if str(mode).lower() == "remove" else "keep",
        "x": int(x),
        "y": int(y),
        "radius": clamp_int(radius, 1, 4096),
        "tolerance": clamp_int(tolerance, 0, 255),
        "feather": clamp_int(feather, 0, 4096),
        "point_count": len(brush_points),
        "changed_pixels": changed,
        "updated_at": iso_now(),
    }
    manual.setdefault("operations", []).append(operation)
    manual["changed_pixels"] = int(manual.get("changed_pixels") or 0) + changed
    manual["last_operation"] = operation
    preview["processed_url"] = f"/work/previews/{preview['preview_id']}/processed.png?ts={int(time.time() * 1000)}"
    save_preview_manifest(preview["preview_id"], preview)
    return preview


def preview_soften_alpha_edges(preview_id: str, radius: int = 2, passes: int = 1) -> dict:
    preview = load_preview_manifest(preview_id)
    root = preview_dir(preview["preview_id"])
    processed_path = root / "processed.png"
    if not processed_path.exists():
        raise FileNotFoundError(f"processed preview missing: {processed_path}")

    push_repair_undo(root, "processed", processed_path)
    image = open_rgba_image(processed_path)
    softened, changed = soften_alpha_edges_image(image, radius, passes)
    image.close()
    softened.save(processed_path)
    softened.close()

    postprocess = preview.setdefault("postprocess", {})
    edge_soften = postprocess.setdefault("edge_soften", {"operations": []})
    operation = {
        "radius": clamp_int(radius, 1, 20),
        "passes": clamp_int(passes, 1, 5),
        "changed_pixels": changed,
        "updated_at": iso_now(),
    }
    edge_soften.setdefault("operations", []).append(operation)
    edge_soften["changed_pixels"] = int(edge_soften.get("changed_pixels") or 0) + changed
    edge_soften["last_operation"] = operation
    preview["processed_url"] = f"/work/previews/{preview['preview_id']}/processed.png?ts={int(time.time() * 1000)}"
    save_preview_manifest(preview["preview_id"], preview)
    return preview


def preview_repair_history(preview_id: str, direction: str) -> dict:
    preview = load_preview_manifest(preview_id)
    root = preview_dir(preview["preview_id"])
    processed_path = root / "processed.png"
    if not processed_path.exists():
        raise FileNotFoundError(f"processed preview missing: {processed_path}")
    restore_repair_history(root, "processed", processed_path, direction)
    preview["processed_url"] = f"/work/previews/{preview['preview_id']}/processed.png?ts={int(time.time() * 1000)}"
    repair_history = preview.setdefault("postprocess", {}).setdefault("repair_history", {})
    repair_history["last_direction"] = "redo" if str(direction).lower() == "redo" else "undo"
    repair_history["updated_at"] = iso_now()
    save_preview_manifest(preview["preview_id"], preview)
    return preview


def raw_frame_path_for_job(manifest: dict, frame_entry: dict, frame_index: int) -> Path:
    raw_dir = Path(manifest.get("raw_dir") or job_dir(str(manifest.get("job_id") or "")) / "raw")
    candidates = [
        raw_dir / f"frame_{frame_index + 1:05d}.png",
        raw_dir / f"frame_{frame_index + 1:03d}.png",
        raw_dir / str(frame_entry.get("name") or ""),
    ]
    source_index = frame_entry.get("source_index")
    if source_index is not None:
        source_index = safe_int(source_index, frame_index)
        candidates.insert(0, raw_dir / f"frame_{source_index + 1:05d}.png")
        candidates.insert(1, raw_dir / f"frame_{source_index + 1:03d}.png")
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"raw frame missing for frame {frame_index + 1}")


def url_basename(value: str, fallback: str) -> str:
    parsed_name = Path(urlparse(str(value or "")).path).name
    return parsed_name or fallback


def repair_history_dirs(root: Path, key: str) -> tuple[Path, Path]:
    safe_key = re.sub(r"[^a-zA-Z0-9_.-]+", "_", str(key or "processed"))
    history_root = root / "repair_history" / safe_key
    undo_dir = history_root / "undo"
    redo_dir = history_root / "redo"
    undo_dir.mkdir(parents=True, exist_ok=True)
    redo_dir.mkdir(parents=True, exist_ok=True)
    return undo_dir, redo_dir


def clear_history_dir(path: Path) -> None:
    if not path.exists():
        return
    for item in path.glob("*.png"):
        try:
            item.unlink()
        except OSError:
            pass


def sorted_history_files(path: Path) -> list[Path]:
    if not path.exists():
        return []
    return sorted(path.glob("*.png"), key=lambda item: item.name)


def trim_history_dir(path: Path, limit: int = 30) -> None:
    files = sorted_history_files(path)
    for item in files[:-limit]:
        try:
            item.unlink()
        except OSError:
            pass


def push_repair_undo(root: Path, key: str, current_path: Path) -> None:
    if not current_path.exists():
        return
    undo_dir, redo_dir = repair_history_dirs(root, key)
    snapshot_name = f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}.png"
    shutil.copy2(current_path, undo_dir / snapshot_name)
    clear_history_dir(redo_dir)
    trim_history_dir(undo_dir)


def restore_repair_history(root: Path, key: str, current_path: Path, direction: str) -> None:
    undo_dir, redo_dir = repair_history_dirs(root, key)
    is_redo = str(direction or "").lower() == "redo"
    source_dir = redo_dir if is_redo else undo_dir
    target_dir = undo_dir if is_redo else redo_dir
    source_files = sorted_history_files(source_dir)
    if not source_files:
        raise FileNotFoundError("no repair history to restore")
    source_path = source_files[-1]
    if current_path.exists():
        snapshot_name = f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}.png"
        shutil.copy2(current_path, target_dir / snapshot_name)
        trim_history_dir(target_dir)
    shutil.copy2(source_path, current_path)
    try:
        source_path.unlink()
    except OSError:
        pass


def job_manual_point_repair(
    job_id: str,
    frame_index: int,
    x: int,
    y: int,
    mode: str,
    radius: int,
    tolerance: int,
    points: list[dict] | None = None,
    feather: int = 6,
) -> dict:
    manifest = load_job_manifest(job_id)
    frames = manifest.get("frames") or []
    if not frames:
        raise ValueError("job has no frames")
    frame_index = clamp_int(frame_index, 0, len(frames) - 1)
    frame_entry = frames[frame_index]
    root = job_dir(str(manifest.get("job_id") or job_id))
    processed_path = root / "processed" / str(frame_entry.get("name") or f"frame_{frame_index + 1:03d}.png")
    thumb_path = root / "thumbs" / url_basename(str(frame_entry.get("thumb_url") or ""), f"thumb_{frame_index + 1:03d}.png")
    if not processed_path.exists():
        raise FileNotFoundError(f"processed frame missing: {processed_path}")
    raw_path = raw_frame_path_for_job(manifest, frame_entry, frame_index)

    push_repair_undo(root, processed_path.stem, processed_path)
    processed_image = open_rgba_image(processed_path)
    source_image = open_rgba_image(raw_path)
    brush_points = points if points else [{"x": x, "y": y}]
    repaired, changed = manual_brush_repair_image(processed_image, source_image, brush_points, mode, radius, tolerance, feather)
    processed_image.close()
    source_image.close()
    repaired.save(processed_path)

    thumb = repaired.copy()
    thumb.thumbnail((128, 128))
    thumb_path.parent.mkdir(parents=True, exist_ok=True)
    thumb.save(thumb_path)
    bbox = repaired.getchannel("A").getbbox()
    canvas_size = repaired.size
    repaired.close()

    ts = int(time.time() * 1000)
    frame_entry["bbox"] = list(bbox) if bbox else None
    frame_entry["width"] = canvas_size[0]
    frame_entry["height"] = canvas_size[1]
    frame_entry["url"] = f"/work/jobs/{manifest['job_id']}/processed/{processed_path.name}?ts={ts}"
    frame_entry["thumb_url"] = f"/work/jobs/{manifest['job_id']}/thumbs/{thumb_path.name}?ts={ts}"
    postprocess = manifest.setdefault("postprocess", {})
    manual = postprocess.setdefault("manual_point_repair", {"operations": []})
    operation = {
        "frame_index": frame_index,
        "mode": "remove" if str(mode).lower() == "remove" else "keep",
        "x": int(x),
        "y": int(y),
        "radius": clamp_int(radius, 1, 4096),
        "tolerance": clamp_int(tolerance, 0, 255),
        "feather": clamp_int(feather, 0, 4096),
        "point_count": len(brush_points),
        "changed_pixels": changed,
        "updated_at": iso_now(),
    }
    manual.setdefault("operations", []).append(operation)
    manual["changed_pixels"] = int(manual.get("changed_pixels") or 0) + changed
    manual["last_operation"] = operation
    save_job_manifest(manifest["job_id"], manifest)
    return manifest


def job_soften_alpha_edges(job_id: str, frame_index: int, radius: int = 2, passes: int = 1) -> dict:
    manifest = load_job_manifest(job_id)
    frames = manifest.get("frames") or []
    if not frames:
        raise ValueError("job has no frames")
    frame_index = clamp_int(frame_index, 0, len(frames) - 1)
    frame_entry = frames[frame_index]
    root = job_dir(str(manifest.get("job_id") or job_id))
    processed_path = root / "processed" / str(frame_entry.get("name") or f"frame_{frame_index + 1:03d}.png")
    thumb_path = root / "thumbs" / url_basename(str(frame_entry.get("thumb_url") or ""), f"thumb_{frame_index + 1:03d}.png")
    if not processed_path.exists():
        raise FileNotFoundError(f"processed frame missing: {processed_path}")

    push_repair_undo(root, processed_path.stem, processed_path)
    image = open_rgba_image(processed_path)
    softened, changed = soften_alpha_edges_image(image, radius, passes)
    image.close()
    softened.save(processed_path)
    thumb = softened.copy()
    thumb.thumbnail((128, 128))
    thumb_path.parent.mkdir(parents=True, exist_ok=True)
    thumb.save(thumb_path)
    bbox = softened.getchannel("A").getbbox()
    canvas_size = softened.size
    softened.close()

    ts = int(time.time() * 1000)
    frame_entry["bbox"] = list(bbox) if bbox else None
    frame_entry["width"] = canvas_size[0]
    frame_entry["height"] = canvas_size[1]
    frame_entry["url"] = f"/work/jobs/{manifest['job_id']}/processed/{processed_path.name}?ts={ts}"
    frame_entry["thumb_url"] = f"/work/jobs/{manifest['job_id']}/thumbs/{thumb_path.name}?ts={ts}"
    postprocess = manifest.setdefault("postprocess", {})
    edge_soften = postprocess.setdefault("edge_soften", {"operations": []})
    operation = {
        "frame_index": frame_index,
        "radius": clamp_int(radius, 1, 20),
        "passes": clamp_int(passes, 1, 5),
        "changed_pixels": changed,
        "updated_at": iso_now(),
    }
    edge_soften.setdefault("operations", []).append(operation)
    edge_soften["changed_pixels"] = int(edge_soften.get("changed_pixels") or 0) + changed
    edge_soften["last_operation"] = operation
    save_job_manifest(manifest["job_id"], manifest)
    return manifest


def job_repair_history(job_id: str, frame_index: int, direction: str) -> dict:
    manifest = load_job_manifest(job_id)
    frames = manifest.get("frames") or []
    if not frames:
        raise ValueError("job has no frames")
    frame_index = clamp_int(frame_index, 0, len(frames) - 1)
    frame_entry = frames[frame_index]
    root = job_dir(str(manifest.get("job_id") or job_id))
    processed_path = root / "processed" / str(frame_entry.get("name") or f"frame_{frame_index + 1:03d}.png")
    thumb_path = root / "thumbs" / url_basename(str(frame_entry.get("thumb_url") or ""), f"thumb_{frame_index + 1:03d}.png")
    if not processed_path.exists():
        raise FileNotFoundError(f"processed frame missing: {processed_path}")

    restore_repair_history(root, processed_path.stem, processed_path, direction)
    frame = open_rgba_image(processed_path)
    thumb = frame.copy()
    thumb.thumbnail((128, 128))
    thumb_path.parent.mkdir(parents=True, exist_ok=True)
    thumb.save(thumb_path)
    bbox = frame.getchannel("A").getbbox()
    canvas_size = frame.size
    frame.close()

    ts = int(time.time() * 1000)
    frame_entry["bbox"] = list(bbox) if bbox else None
    frame_entry["width"] = canvas_size[0]
    frame_entry["height"] = canvas_size[1]
    frame_entry["url"] = f"/work/jobs/{manifest['job_id']}/processed/{processed_path.name}?ts={ts}"
    frame_entry["thumb_url"] = f"/work/jobs/{manifest['job_id']}/thumbs/{thumb_path.name}?ts={ts}"
    repair_history = manifest.setdefault("postprocess", {}).setdefault("repair_history", {})
    repair_history["last_direction"] = "redo" if str(direction).lower() == "redo" else "undo"
    repair_history["frame_index"] = frame_index
    repair_history["updated_at"] = iso_now()
    save_job_manifest(manifest["job_id"], manifest)
    return manifest


def preview_frame(
    upload_id: str,
    sample_time: float,
    sample_frame: int,
    output_scale: float,
    reduce_px: int,
    canvas_mode: str,
    chroma_enabled: bool,
    matte_mode: str,
    key_mode: str,
    manual_key_hex: str,
    threshold: int,
    softness: int,
    despill_strength: float,
    halo_pixels: int,
    ai_model: str,
    ai_device: str,
    ai_resolution: int | str | None,
    luma_black: int,
    luma_white: int,
    luma_gamma: float,
    luma_strength: float,
    corridorkey_enabled: bool,
    corridorkey_screen: str,
    batch_green_to_black: bool = False,
    batch_green_desaturate: bool = False,
    batch_semitransparent_to_black: bool = False,
    batch_semitransparent_to_opaque: bool = False,
) -> dict:
    source_path, media_type = source_media_entry(upload_id)
    info = upload_media_info(upload_id, source_path, media_type)
    duration = safe_float(info.get("duration"), 0.0)
    if media_type == "video" and duration > 0:
        sample_time = clamp_float(sample_time, 0.0, duration)
    else:
        sample_time = 0.0
    selected_source_name = source_path.name
    selected_sample_frame = 1

    preview_id = timestamped_id()
    root = preview_dir(preview_id)
    raw_path = root / "raw.png"
    source_preview_path = root / "source.png"
    processed_path = root / "processed.png"
    root.mkdir(parents=True, exist_ok=True)

    if media_type == "image":
        _, ffmpeg_accel = extract_image_frame(source_path, raw_path)
    elif media_type == "image_sequence":
        entries = source_frame_entries(upload_id)
        selected_index = clamp_int(int(sample_frame or 1), 1, len(entries)) - 1
        selected_entry = entries[selected_index]
        selected_source_name = selected_entry["name"]
        selected_sample_frame = selected_index + 1
        with Image.open(selected_entry["path"]) as image:
            image.convert("RGBA").save(raw_path)
        ffmpeg_accel = image_sequence_payload()
    else:
        _, ffmpeg_accel = extract_single_frame(source_path, raw_path, sample_time)
    raw_image = open_rgba_image(raw_path)
    output_scale = normalize_output_scale(output_scale)
    target_size = target_size_from_source_height(raw_image.height, output_scale)

    raw_image.save(source_preview_path)

    keyed_frames, key_rgb, matte_info = apply_matte_pipeline(
        raw_images=[raw_image],
        chroma_enabled=chroma_enabled,
        matte_mode=matte_mode,
        key_mode=key_mode,
        manual_key_hex=manual_key_hex,
        threshold=threshold,
        softness=softness,
        despill_strength=despill_strength,
        halo_pixels=halo_pixels,
        ai_model=ai_model,
        ai_device=ai_device,
        ai_resolution=ai_resolution,
        luma_black=luma_black,
        luma_white=luma_white,
        luma_gamma=luma_gamma,
        luma_strength=luma_strength,
        corridorkey_enabled=corridorkey_enabled,
        corridorkey_screen=corridorkey_screen,
    )
    keyed_image = keyed_frames[0]

    hard_alpha = matte_info["mode"] == "chroma" and softness == 0 and not matte_info["corridorkey_enabled"]
    if should_preserve_source_canvas(media_type, reduce_px, canvas_mode):
        rendered_frames, _, scale, canvas_size = resize_frames_on_source_canvas(
            [keyed_image],
            output_scale,
            hard_alpha=hard_alpha,
        )
    else:
        rendered_frames, _, scale, canvas_size = stable_resize_frames(
            [keyed_image],
            target_size,
            reduce_px,
            canvas_mode,
            hard_alpha=hard_alpha,
        )
    rendered_frame = rendered_frames[0]
    postprocess_changed = {
        "green_to_black": 0,
        "green_desaturate": 0,
        "semitransparent_to_black": 0,
        "semitransparent_to_opaque": 0,
    }
    if batch_green_to_black:
        rendered_frame, changed = green_to_black_image(rendered_frame)
        postprocess_changed["green_to_black"] += changed
    if batch_green_desaturate:
        rendered_frame, changed = green_desaturate_image(rendered_frame)
        postprocess_changed["green_desaturate"] += changed
    if batch_semitransparent_to_black:
        rendered_frame, changed = semitransparent_to_black_image(rendered_frame)
        postprocess_changed["semitransparent_to_black"] += changed
    if batch_semitransparent_to_opaque:
        rendered_frame, changed = semitransparent_to_opaque_image(rendered_frame)
        postprocess_changed["semitransparent_to_opaque"] += changed
    rendered_frame.save(processed_path)

    manifest = {
        "preview_id": preview_id,
        "upload_id": upload_id,
        "sample_time": sample_time,
        "sample_frame": selected_sample_frame,
        "source_name": selected_source_name,
        "source_path": str(source_path),
        "source_media_type": media_type,
        "source_url": f"/work/previews/{preview_id}/source.png",
        "processed_url": f"/work/previews/{preview_id}/processed.png",
        "key_color": rgb_to_hex(key_rgb),
        "matte": matte_info,
        "ffmpeg_accel": ffmpeg_accel,
        "scale": scale,
        "postprocess_changed": postprocess_changed,
        "options": {
            "target_size": target_size,
            "output_scale": output_scale,
            "reduce_px": reduce_px,
            "canvas_mode": normalize_canvas_mode(canvas_mode),
            "preserve_source_canvas": should_preserve_source_canvas(media_type, reduce_px, canvas_mode),
            "output_width": canvas_size[0],
            "output_height": canvas_size[1],
            "chroma_enabled": chroma_enabled,
            "matte_mode": matte_info["mode"],
            "key_mode": key_mode,
            "threshold": threshold,
            "softness": softness,
            "despill_strength": despill_strength,
            "halo_pixels": halo_pixels,
            "corridorkey_enabled": matte_info["corridorkey_enabled"],
            "corridorkey_screen": matte_info["corridorkey_screen_color"],
            "batch_green_to_black": bool(batch_green_to_black),
            "batch_green_desaturate": bool(batch_green_desaturate),
            "batch_semitransparent_to_black": bool(batch_semitransparent_to_black),
            "batch_semitransparent_to_opaque": bool(batch_semitransparent_to_opaque),
            "postprocess_changed_pixels": postprocess_changed,
        },
    }
    (root / "preview.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def save_preview_as_job(preview_id: str) -> dict:
    preview = load_preview_manifest(preview_id)
    if str(preview.get("source_media_type") or "").lower() != "image":
        raise ValueError("direct preview save is only available for image uploads")

    source_preview_path = preview_dir(preview["preview_id"]) / "source.png"
    raw_preview_path = preview_dir(preview["preview_id"]) / "raw.png"
    processed_preview_path = preview_dir(preview["preview_id"]) / "processed.png"
    if not processed_preview_path.exists():
        raise FileNotFoundError(f"processed preview missing: {processed_preview_path}")

    source_path = repair_mojibake_path(Path(preview["source_path"]))
    media_type = str(preview.get("source_media_type") or "image").lower()
    info = media_info(source_path, media_type)
    options = preview.get("options") or {}
    matte_info = preview.get("matte") or {"mode": options.get("matte_mode") or "chroma"}

    job_id = timestamped_id()
    root = job_dir(job_id)
    raw_dir = root / "raw"
    processed_dir = root / "processed"
    thumbs_dir = root / "thumbs"
    for directory in (raw_dir, processed_dir, thumbs_dir):
        directory.mkdir(parents=True, exist_ok=True)

    if raw_preview_path.exists():
        shutil.copy2(raw_preview_path, raw_dir / "frame_00001.png")
    elif source_preview_path.exists():
        shutil.copy2(source_preview_path, raw_dir / "frame_00001.png")

    frame_name = "frame_001.png"
    thumb_name = "thumb_001.png"
    frame_path = processed_dir / frame_name
    thumb_path = thumbs_dir / thumb_name
    shutil.copy2(processed_preview_path, frame_path)

    frame = open_rgba_image(frame_path)
    thumb = frame.copy()
    thumb.thumbnail((128, 128))
    thumb.save(thumb_path)
    bbox = frame.getchannel("A").getbbox()
    canvas_size = frame.size

    manifest = {
        "job_id": job_id,
        "upload_id": preview.get("upload_id") or "",
        "job_dir": str(root),
        "processed_dir": str(processed_dir),
        "raw_dir": str(raw_dir),
        "source_path": str(source_path),
        "source_media_type": media_type,
        "ffmpeg_accel": preview.get("ffmpeg_accel") or {},
        "video_info": info,
        "options": {
            "start_time": 0,
            "end_time": 0,
            "keep_every": 1,
            "target_size": options.get("target_size") or canvas_size[1],
            "output_scale": options.get("output_scale") or preview.get("output_scale") or 1,
            "reduce_px": options.get("reduce_px") or 0,
            "canvas_mode": normalize_canvas_mode(str(options.get("canvas_mode") or "auto")),
            "output_width": options.get("output_width") or canvas_size[0],
            "output_height": options.get("output_height") or canvas_size[1],
            "chroma_enabled": bool(options.get("chroma_enabled", True)),
            "matte_mode": matte_info.get("mode") or options.get("matte_mode") or "chroma",
            "matte": matte_info,
            "key_mode": options.get("key_mode") or "auto",
            "key_color": preview.get("key_color") or "#000000",
            "threshold": options.get("threshold") or 0,
            "softness": options.get("softness") or 0,
            "despill_strength": options.get("despill_strength") or 0,
            "halo_pixels": options.get("halo_pixels") or 0,
            "corridorkey_enabled": bool(options.get("corridorkey_enabled", False)),
            "corridorkey_screen": options.get("corridorkey_screen") or "auto",
            "scale": preview.get("scale") or 1,
        },
        "frame_count": 1,
        "frames": [
            {
                "index": 0,
                "name": frame_name,
                "url": f"/work/jobs/{job_id}/processed/{frame_name}",
                "thumb_url": f"/work/jobs/{job_id}/thumbs/{thumb_name}",
                "bbox": list(bbox) if bbox else None,
                "width": canvas_size[0],
                "height": canvas_size[1],
            }
        ],
    }
    save_job_manifest(job_id, manifest)
    return manifest


def natural_sort_key(value: str) -> list[object]:
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", value)]


def field_storage_items(form: cgi.FieldStorage, key: str) -> list:
    if key not in form:
        return []
    value = form[key]
    return value if isinstance(value, list) else [value]


def import_animation_frames_to_job(file_items: list) -> dict:
    candidates = []
    for item in file_items:
        raw_filename = str(getattr(item, "filename", "") or "frame")
        display_name = Path(raw_filename.replace("\\", "/")).name or "frame"
        if not getattr(item, "file", None):
            continue
        suffix = Path(display_name).suffix.lower()
        content_type = str(getattr(item, "type", "") or "")
        if suffix not in ANIMATION_FRAME_EXTENSIONS and not content_type.startswith("image/"):
            continue
        candidates.append((raw_filename, display_name, item))

    candidates.sort(key=lambda pair: natural_sort_key(pair[0]))
    if not candidates:
        raise ValueError("no supported image frames found")

    job_id = timestamped_id()
    root = job_dir(job_id)
    raw_dir = root / "raw"
    processed_dir = root / "processed"
    thumbs_dir = root / "thumbs"
    for directory in (raw_dir, processed_dir, thumbs_dir):
        directory.mkdir(parents=True, exist_ok=True)

    frame_entries: list[dict] = []
    max_width = 0
    max_height = 0
    for index, (_, display_name, item) in enumerate(candidates):
        frame_name = f"frame_{index + 1:03d}.png"
        thumb_name = f"thumb_{index + 1:03d}.png"
        raw_path = raw_dir / frame_name
        frame_path = processed_dir / frame_name
        thumb_path = thumbs_dir / thumb_name

        with Image.open(item.file) as source_image:
            image = source_image.convert("RGBA")
            image.save(raw_path)
            image.save(frame_path)
            thumb = image.copy()
            thumb.thumbnail((128, 128))
            thumb.save(thumb_path)
            bbox = image.getchannel("A").getbbox()
            max_width = max(max_width, image.size[0])
            max_height = max(max_height, image.size[1])

            frame_entries.append(
                {
                    "index": index,
                    "name": frame_name,
                    "original_name": display_name,
                    "url": f"/work/jobs/{job_id}/processed/{frame_name}",
                    "thumb_url": f"/work/jobs/{job_id}/thumbs/{thumb_name}",
                    "bbox": list(bbox) if bbox else None,
                    "width": image.size[0],
                    "height": image.size[1],
                }
            )
            image.close()

    manifest = {
        "job_id": job_id,
        "upload_id": "",
        "job_dir": str(root),
        "processed_dir": str(processed_dir),
        "raw_dir": str(raw_dir),
        "source_path": "",
        "source_media_type": "animation",
        "ffmpeg_accel": custom_animation_payload(),
        "video_info": {
            "media_type": "animation",
            "duration": 0,
            "fps": 0,
            "width": max_width,
            "height": max_height,
        },
        "options": {
            "start_time": 0,
            "end_time": 0,
            "keep_every": 1,
            "target_size": max_height,
            "reduce_px": 0,
            "canvas_mode": "custom",
            "output_width": max_width,
            "output_height": max_height,
            "chroma_enabled": False,
            "matte_mode": "none",
            "matte": {"mode": "none", "source": "custom_animation"},
            "key_mode": "none",
            "key_color": "#000000",
            "threshold": 0,
            "softness": 0,
            "despill_strength": 0,
            "halo_pixels": 0,
            "corridorkey_enabled": False,
            "corridorkey_screen": "auto",
            "scale": 1,
            "source_order": "filename",
        },
        "frame_count": len(frame_entries),
        "frames": frame_entries,
    }
    save_job_manifest(job_id, manifest)
    return manifest


def line_cleaner_dir(run_id: str) -> Path:
    return LINE_CLEANER_DIR / run_id


def resolve_realesrgan_binary() -> str | None:
    configured = str(os.environ.get(REAL_ESRGAN_BINARY_ENV, "")).strip().strip("\"'")
    if configured:
        path = Path(configured).expanduser()
        if path.exists() and path.is_file():
            return str(path)
    for name in ("realesrgan-ncnn-vulkan.exe", "realesrgan-ncnn-vulkan"):
        found = shutil.which(name)
        if found:
            return found
    for path in (
        DEFAULT_REALESRGAN_ROOT / "realesrgan-ncnn-vulkan.exe",
        DEFAULT_REALESRGAN_ROOT / "realesrgan-ncnn-vulkan",
        ROOT_DIR.parent / "tools" / "realesrgan-ncnn-vulkan.exe",
        ROOT_DIR.parent / "tools" / "realesrgan-ncnn-vulkan" / "realesrgan-ncnn-vulkan.exe",
        ROOT_DIR / "tools" / "realesrgan-ncnn-vulkan.exe",
        ROOT_DIR / "tools" / "realesrgan-ncnn-vulkan" / "realesrgan-ncnn-vulkan.exe",
        WORK_DIR / "tools" / "realesrgan-ncnn-vulkan.exe",
        WORK_DIR / "tools" / "realesrgan-ncnn-vulkan" / "realesrgan-ncnn-vulkan.exe",
    ):
        if path.exists() and path.is_file():
            return str(path)
    return None


def resolve_realesrgan_model_dir(binary: str | None = None) -> Path | None:
    configured = str(os.environ.get(REAL_ESRGAN_MODEL_DIR_ENV, "")).strip().strip("\"'")
    candidates: list[Path] = []
    if configured:
        candidates.append(Path(configured).expanduser())
    if binary:
        candidates.append(Path(binary).resolve().parent / "models")
    candidates.extend(
        [
            ROOT_DIR / "tools" / "realesrgan-ncnn-vulkan" / "models",
            ROOT_DIR.parent / "tools" / "realesrgan-ncnn-vulkan" / "models",
            DEFAULT_REALESRGAN_ROOT / "models",
            WORK_DIR / "tools" / "realesrgan-ncnn-vulkan" / "models",
        ]
    )
    for path in candidates:
        param_path = path / f"{REAL_ESRGAN_ANIME_MODEL}.param"
        bin_path = path / f"{REAL_ESRGAN_ANIME_MODEL}.bin"
        if param_path.exists() and bin_path.exists():
            return path
    return None


def realesrgan_missing_message() -> str:
    return (
        "Real-ESRGAN anime is not ready. Expected "
        "realesrgan-ncnn-vulkan.exe plus models/realesrgan-x4plus-anime.param and .bin. "
        f"Set {REAL_ESRGAN_BINARY_ENV} and optionally {REAL_ESRGAN_MODEL_DIR_ENV}, "
        "or install the portable package under F:\\Codex-Program\\tools\\realesrgan-ncnn-vulkan."
    )


def average_visible_rgb(image: Image.Image) -> tuple[int, int, int]:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return (0, 0, 0)
    cropped = rgba.crop(bbox)
    pixels = list(cropped.getdata())
    visible = [pixel for pixel in pixels if pixel[3] > 0]
    if not visible:
        return (0, 0, 0)
    count = len(visible)
    return (
        sum(pixel[0] for pixel in visible) // count,
        sum(pixel[1] for pixel in visible) // count,
        sum(pixel[2] for pixel in visible) // count,
    )


def prepare_realesrgan_rgb_input(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    background = Image.new("RGB", rgba.size, average_visible_rgb(rgba))
    background.paste(rgba.convert("RGB"), mask=rgba.getchannel("A"))
    return background


def apply_alpha_cutoff(image: Image.Image, alpha_cutoff: int) -> Image.Image:
    rgba = image.convert("RGBA")
    if alpha_cutoff <= 0:
        return rgba
    red, green, blue, alpha = rgba.split()
    alpha = alpha.point(lambda value: 0 if value <= alpha_cutoff else value)
    return Image.merge("RGBA", (red, green, blue, alpha))


def quantize_rgba(image: Image.Image, color_count: int) -> Image.Image:
    if color_count >= 256:
        return image.convert("RGBA")
    rgba = image.convert("RGBA")
    try:
        return rgba.quantize(colors=color_count, method=Image.Quantize.FASTOCTREE).convert("RGBA")
    except Exception:
        return rgba


def resize_to_scale(image: Image.Image, source_size: tuple[int, int], scale: float) -> Image.Image:
    rgba = image.convert("RGBA")
    source_width, source_height = source_size
    target_width = max(1, round(source_width * scale))
    target_height = max(1, round(source_height * scale))
    return rgba.resize((target_width, target_height), LANCZOS)


def resize_rgba_premultiplied(
    image: Image.Image,
    target_size: tuple[int, int],
    resample: Image.Resampling = LANCZOS,
) -> Image.Image:
    return image.convert("RGBA").convert("RGBa").resize(target_size, resample).convert("RGBA")


def normalize_magic_resize_mode(value: str | None) -> str:
    mode = str(value or MAGIC_RESIZE_MODE_DEFAULT).strip().lower()
    return mode if mode in MAGIC_RESIZE_MODES else MAGIC_RESIZE_MODE_DEFAULT


def resize_magic_frame(
    image: Image.Image,
    source_size: tuple[int, int],
    scale: float,
    resize_mode: str = MAGIC_RESIZE_MODE_DEFAULT,
) -> Image.Image:
    source_width, source_height = source_size
    target_size = (max(1, round(source_width * scale)), max(1, round(source_height * scale)))
    mode = MAGIC_RESIZE_MODES[normalize_magic_resize_mode(resize_mode)]
    return resize_rgba_premultiplied(image, target_size, mode["resample"])


def expand_bbox(
    bbox: tuple[int, int, int, int],
    image_size: tuple[int, int],
    padding: int,
) -> tuple[int, int, int, int]:
    width, height = image_size
    left, top, right, bottom = bbox
    return (
        max(0, left - padding),
        max(0, top - padding),
        min(width, right + padding),
        min(height, bottom + padding),
    )


def build_magic_upscaled_frame(
    source_rgba: Image.Image,
    ai_input_path: Path,
    ai_output_path: Path,
) -> tuple[Image.Image, tuple[int, int]]:
    source_rgba = source_rgba.convert("RGBA")
    source_size = source_rgba.size
    alpha_bbox = source_rgba.getchannel("A").getbbox()
    if not alpha_bbox:
        return Image.new("RGBA", (max(1, source_size[0] * 4), max(1, source_size[1] * 4)), (0, 0, 0, 0)), source_size

    crop_box = expand_bbox(alpha_bbox, source_size, MAGIC_CROP_PADDING)
    crop_rgba = source_rgba.crop(crop_box)
    crop_rgba.save(ai_input_path)
    run_realesrgan_anime(ai_input_path, ai_output_path)

    with Image.open(ai_output_path) as upscaled_image:
        upscaled_crop = upscaled_image.convert("RGBA")
    scale_x = max(1, round(upscaled_crop.width / crop_rgba.width))
    scale_y = max(1, round(upscaled_crop.height / crop_rgba.height))

    upscaled_full_size = (source_size[0] * scale_x, source_size[1] * scale_y)
    upscaled_full = Image.new("RGBA", upscaled_full_size, (0, 0, 0, 0))
    upscaled_full.alpha_composite(upscaled_crop, (crop_box[0] * scale_x, crop_box[1] * scale_y))
    return upscaled_full, source_size


def process_magic_frame(source_rgba: Image.Image, ai_input_path: Path, ai_output_path: Path) -> Image.Image:
    upscaled_full, source_size = build_magic_upscaled_frame(source_rgba, ai_input_path, ai_output_path)
    return resize_magic_frame(upscaled_full, source_size, 0.5, MAGIC_RESIZE_MODE_DEFAULT)


def run_realesrgan_anime(input_path: Path, output_path: Path, output_scale: int | None = None) -> None:
    binary = resolve_realesrgan_binary()
    model_dir = resolve_realesrgan_model_dir(binary)
    if not binary or not model_dir:
        raise RuntimeError(realesrgan_missing_message())
    output_path.parent.mkdir(parents=True, exist_ok=True)
    args = [
        binary,
        "-i",
        str(input_path),
        "-o",
        str(output_path),
        "-n",
        REAL_ESRGAN_ANIME_MODEL,
        "-m",
        str(model_dir),
        "-f",
        "png",
    ]
    if output_scale:
        args.extend(["-s", str(output_scale)])
    run_process(args)
    if not output_path.exists():
        raise RuntimeError("Real-ESRGAN anime did not produce an output image")


def resolve_magic_variant_dir(manifest: dict, variant: dict) -> Path:
    source_dir = Path(str(variant.get("frames_dir") or ""))
    if not source_dir.is_absolute():
        source_dir = MAGIC_DIR / f"{manifest['magic_id']}-magic" / str(source_dir)
    return source_dir


def find_cached_magic_frames(job_id: str, resize_mode: str) -> dict[int, dict[str, dict]]:
    cache: dict[int, dict[str, dict]] = {}
    manifest_paths = sorted(
        MAGIC_DIR.glob("*-magic/manifest.json"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    for manifest_path in manifest_paths:
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if manifest.get("job_id") != job_id:
            continue
        if manifest.get("model") != REAL_ESRGAN_ANIME_MODEL:
            continue
        if normalize_magic_resize_mode(manifest.get("resize_mode")) != resize_mode:
            continue

        variant_sources: dict[str, dict[int, dict]] = {}
        for variant_config in MAGIC_VARIANTS:
            variant = magic_manifest_variant(manifest, str(variant_config["key"]))
            source_dir = resolve_magic_variant_dir(manifest, variant)
            entries: dict[int, dict] = {}
            for entry in variant.get("frames") or []:
                source_index = safe_int(entry.get("source_index"), -1)
                source_path = source_dir / str(entry.get("name") or "")
                if source_index >= 0 and source_path.exists():
                    entries[source_index] = {
                        "entry": entry,
                        "path": source_path,
                    }
            variant_sources[str(variant_config["key"])] = entries

        primary_entries = variant_sources.get(str(MAGIC_VARIANTS[0]["key"]), {})
        for source_index in primary_entries:
            if source_index in cache:
                continue
            cached_variants = {}
            for variant_config in MAGIC_VARIANTS:
                variant_key = str(variant_config["key"])
                cached = variant_sources.get(variant_key, {}).get(source_index)
                if not cached:
                    break
                cached_variants[variant_key] = cached
            else:
                cache[source_index] = cached_variants
    return cache


def process_line_cleaner_frames(
    file_items: list,
    method: str,
    scale: float,
    alpha_cutoff: int,
    sharpen_percent: int,
    color_count: int,
) -> dict:
    method = method if method in LINE_CLEANER_METHODS else "classic"
    candidates = []
    for item in file_items:
        raw_filename = str(getattr(item, "filename", "") or "frame")
        display_name = Path(raw_filename.replace("\\", "/")).name or "frame"
        if not getattr(item, "file", None):
            continue
        suffix = Path(display_name).suffix.lower()
        content_type = str(getattr(item, "type", "") or "")
        if suffix not in ANIMATION_FRAME_EXTENSIONS and not content_type.startswith("image/"):
            continue
        candidates.append((raw_filename, display_name, item))

    candidates.sort(key=lambda pair: natural_sort_key(pair[0]))
    if not candidates:
        raise ValueError("no supported image frames found")

    if method == "realesrgan_anime":
        binary = resolve_realesrgan_binary()
        if not binary or not resolve_realesrgan_model_dir(binary):
            raise RuntimeError(realesrgan_missing_message())

    run_id = timestamped_id()
    root = line_cleaner_dir(run_id)
    raw_dir = root / "raw"
    ai_input_dir = root / "ai-input"
    ai_output_dir = root / "ai-output"
    processed_dir = root / "processed"
    for directory in (raw_dir, ai_input_dir, ai_output_dir, processed_dir):
        directory.mkdir(parents=True, exist_ok=True)

    frames: list[dict] = []
    total_source_bytes = 0
    total_processed_bytes = 0
    max_width = 0
    max_height = 0

    for index, (_, display_name, item) in enumerate(candidates):
        frame_name = f"frame_{index + 1:03d}.png"
        raw_path = raw_dir / frame_name
        processed_path = processed_dir / frame_name

        with Image.open(item.file) as source_image:
            source_rgba = source_image.convert("RGBA")
        source_rgba.save(raw_path, optimize=True, compress_level=9)
        total_source_bytes += raw_path.stat().st_size

        working = source_rgba
        if method == "realesrgan_anime":
            ai_input_path = ai_input_dir / frame_name
            ai_output_path = ai_output_dir / frame_name
            prepare_realesrgan_rgb_input(source_rgba).save(ai_input_path)
            run_realesrgan_anime(ai_input_path, ai_output_path)
            upscaled_rgb = Image.open(ai_output_path).convert("RGB")
            upscaled_alpha = source_rgba.getchannel("A").resize(upscaled_rgb.size, LANCZOS)
            working = Image.merge("RGBA", (*upscaled_rgb.split(), upscaled_alpha))

        resized = resize_to_scale(working, source_rgba.size, scale)
        cleaned = apply_alpha_cutoff(resized, alpha_cutoff)
        if sharpen_percent > 0:
            cleaned = cleaned.filter(ImageFilter.UnsharpMask(radius=1.0, percent=sharpen_percent, threshold=1))
        cleaned = quantize_rgba(cleaned, color_count)
        cleaned.save(processed_path, optimize=True, compress_level=9)

        processed_bytes = processed_path.stat().st_size
        total_processed_bytes += processed_bytes
        max_width = max(max_width, cleaned.width)
        max_height = max(max_height, cleaned.height)
        frames.append(
            {
                "index": index,
                "name": frame_name,
                "original_name": display_name,
                "url": f"/work/line-cleaner/{run_id}/processed/{frame_name}",
                "width": cleaned.width,
                "height": cleaned.height,
                "bytes": processed_bytes,
            }
        )

    manifest = {
        "run_id": run_id,
        "method": method,
        "model": REAL_ESRGAN_ANIME_MODEL if method == "realesrgan_anime" else "",
        "scale": scale,
        "alpha_cutoff": alpha_cutoff,
        "sharpen_percent": sharpen_percent,
        "color_count": color_count,
        "frame_count": len(frames),
        "source_bytes": total_source_bytes,
        "processed_bytes": total_processed_bytes,
        "max_width": max_width,
        "max_height": max_height,
        "frames": frames,
        "created_at": iso_now(),
    }
    (root / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def write_aligned_rgba_video_frames(
    frame_paths: list[Path],
    frame_sizes: list[tuple[int, int]],
    target_dir: Path,
    cell_width: int,
    cell_height: int,
    render_sizes: list[tuple[int, int]] | None = None,
    resize_resample: Image.Resampling = NEAREST,
) -> None:
    target_dir.mkdir(parents=True, exist_ok=True)
    for index, frame_path in enumerate(frame_paths, start=1):
        frame = open_rgba_image(frame_path)
        render_size = render_sizes[index - 1] if render_sizes else frame_sizes[index - 1]
        frame_width, frame_height = render_size
        if frame.size != render_size:
            resized = frame.resize(render_size, resize_resample)
            frame.close()
            frame = resized
        canvas = Image.new("RGBA", (cell_width, cell_height), (0, 0, 0, 0))
        offset_x = (cell_width - frame_width) // 2
        offset_y = (cell_height - frame_height) // 2
        canvas.paste(frame, (offset_x, offset_y), frame)
        frame.close()
        canvas.save(target_dir / f"frame_{index:03d}.png")
        canvas.close()


def save_alpha_mov(
    frame_paths: list[Path],
    frame_sizes: list[tuple[int, int]],
    output_path: Path,
    cell_width: int,
    cell_height: int,
    duration_ms: int,
    render_sizes: list[tuple[int, int]] | None = None,
) -> None:
    if not frame_paths:
        raise ValueError("no frames selected for alpha video export")
    ffmpeg = resolve_ffmpeg_binary("ffmpeg")
    duration_ms = clamp_int(duration_ms, 20, 5000)
    video_frames_dir = output_path.parent / "mov_frames_tmp"
    if video_frames_dir.exists():
        shutil.rmtree(video_frames_dir)
    try:
        write_aligned_rgba_video_frames(
            frame_paths,
            frame_sizes,
            video_frames_dir,
            cell_width,
            cell_height,
            render_sizes=render_sizes,
            resize_resample=NEAREST,
        )
        input_pattern = video_frames_dir / "frame_%03d.png"
        run_process(
            [
                ffmpeg,
                "-y",
                "-framerate",
                f"1000/{duration_ms}",
                "-start_number",
                "1",
                "-i",
                str(input_pattern),
                "-frames:v",
                str(len(frame_paths)),
                "-c:v",
                "qtrle",
                "-pix_fmt",
                "argb",
                "-an",
                str(output_path),
            ]
        )
    finally:
        shutil.rmtree(video_frames_dir, ignore_errors=True)


def save_gif(
    frame_paths: list[Path],
    frame_sizes: list[tuple[int, int]],
    output_path: Path,
    cell_width: int,
    cell_height: int,
    duration_ms: int,
) -> None:
    if not frame_paths:
        raise ValueError("no frames selected for GIF export")
    ffmpeg = resolve_ffmpeg_binary("ffmpeg")
    duration_ms = clamp_int(duration_ms, 20, 5000)
    video_frames_dir = output_path.parent / "gif_frames_tmp"
    palette_path = output_path.parent / f"{output_path.stem}-palette.png"
    if video_frames_dir.exists():
        shutil.rmtree(video_frames_dir)
    if palette_path.exists():
        palette_path.unlink()
    try:
        write_aligned_rgba_video_frames(frame_paths, frame_sizes, video_frames_dir, cell_width, cell_height)
        input_pattern = video_frames_dir / "frame_%03d.png"
        run_process(
            [
                ffmpeg,
                "-y",
                "-framerate",
                f"1000/{duration_ms}",
                "-start_number",
                "1",
                "-i",
                str(input_pattern),
                "-frames:v",
                str(len(frame_paths)),
                "-vf",
                "palettegen=reserve_transparent=1:transparency_color=000000",
                str(palette_path),
            ]
        )
        run_process(
            [
                ffmpeg,
                "-y",
                "-framerate",
                f"1000/{duration_ms}",
                "-start_number",
                "1",
                "-i",
                str(input_pattern),
                "-i",
                str(palette_path),
                "-frames:v",
                str(len(frame_paths)),
                "-lavfi",
                "paletteuse=alpha_threshold=128",
                "-loop",
                "0",
                str(output_path),
            ]
        )
    finally:
        shutil.rmtree(video_frames_dir, ignore_errors=True)
        if palette_path.exists():
            palette_path.unlink()


def save_sprite_sheet(
    frame_paths: list[Path],
    frame_sizes: list[tuple[int, int]],
    sheet_path: Path,
    metadata_path: Path,
    cell_width: int,
    cell_height: int,
    duration_ms: int,
) -> dict:
    if not frame_paths:
        raise ValueError("no frames selected for sprite sheet export")

    frame_count = len(frame_paths)
    columns = max(1, math.ceil(math.sqrt(frame_count)))
    rows = max(1, math.ceil(frame_count / columns))
    sheet_width = columns * cell_width
    sheet_height = rows * cell_height
    sheet = Image.new("RGBA", (sheet_width, sheet_height), (0, 0, 0, 0))
    frames: list[dict] = []

    try:
        for index, frame_path in enumerate(frame_paths):
            frame = open_rgba_image(frame_path)
            frame_width, frame_height = frame_sizes[index]
            column = index % columns
            row = index // columns
            cell_x = column * cell_width
            cell_y = row * cell_height
            offset_x = cell_x + (cell_width - frame_width) // 2
            offset_y = cell_y + (cell_height - frame_height) // 2
            sheet.paste(frame, (offset_x, offset_y), frame)
            frame.close()
            frames.append(
                {
                    "index": index,
                    "name": frame_path.name,
                    "duration_ms": duration_ms,
                    "frame": {
                        "x": cell_x,
                        "y": cell_y,
                        "w": cell_width,
                        "h": cell_height,
                    },
                    "sprite": {
                        "x": offset_x,
                        "y": offset_y,
                        "w": frame_width,
                        "h": frame_height,
                    },
                    "source_size": {
                        "w": frame_width,
                        "h": frame_height,
                    },
                }
            )
        sheet.save(sheet_path, optimize=True, compress_level=9)
    finally:
        sheet.close()

    metadata = {
        "image": sheet_path.name,
        "format": "fixed-grid",
        "frame_count": frame_count,
        "columns": columns,
        "rows": rows,
        "cell_width": cell_width,
        "cell_height": cell_height,
        "width": sheet_width,
        "height": sheet_height,
        "duration_ms": duration_ms,
        "frames": frames,
    }
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    return metadata


def magic_preview_job(
    job_id: str,
    selected_indices: list[int],
    resize_mode: str = MAGIC_RESIZE_MODE_DEFAULT,
) -> dict:
    resize_mode = normalize_magic_resize_mode(resize_mode)
    resize_mode_label = str(MAGIC_RESIZE_MODES[resize_mode]["label"])
    manifest = load_job_manifest(job_id)
    processed_dir = job_dir(job_id) / "processed"
    frame_map = {entry["index"]: entry for entry in manifest["frames"]}
    seen_indices: set[int] = set()
    indices: list[int] = []
    for index in selected_indices:
        if index in frame_map and index not in seen_indices:
            indices.append(index)
            seen_indices.add(index)
    if not indices:
        raise ValueError("no frames selected for MAGIC")

    binary = resolve_realesrgan_binary()
    if not binary or not resolve_realesrgan_model_dir(binary):
        raise RuntimeError(realesrgan_missing_message())

    magic_id = timestamped_id()
    root = MAGIC_DIR / f"{magic_id}-magic"
    ai_input_dir = root / "ai-input"
    ai_output_dir = root / "ai-output"
    variants: dict[str, dict] = {}
    for variant in MAGIC_VARIANTS:
        frames_dir = root / str(variant["dir"])
        variants[str(variant["key"])] = {
            "key": str(variant["key"]),
            "label": str(variant["label"]),
            "scale": float(variant["scale"]),
            "frames_dir": str(frames_dir),
            "frame_count": 0,
            "max_width": 0,
            "max_height": 0,
            "bytes": 0,
            "frames": [],
        }

    for directory in (ai_input_dir, ai_output_dir, *[Path(variant["frames_dir"]) for variant in variants.values()]):
        directory.mkdir(parents=True, exist_ok=True)

    cached_magic = find_cached_magic_frames(job_id, resize_mode)
    generated_count = 0
    reused_count = 0
    for output_index, frame_index in enumerate(indices, start=1):
        entry = frame_map[frame_index]
        source_path = processed_dir / entry["name"]
        frame_name = f"frame_{output_index:03d}.png"
        ai_input_path = ai_input_dir / frame_name
        ai_output_path = ai_output_dir / frame_name

        cached_variants = cached_magic.get(frame_index)
        if cached_variants:
            for variant in variants.values():
                variant_key = str(variant["key"])
                cached = cached_variants[variant_key]
                cached_entry = cached["entry"]
                frames_dir = Path(variant["frames_dir"])
                processed_path = frames_dir / frame_name
                shutil.copy2(cached["path"], processed_path)
                processed_bytes = processed_path.stat().st_size
                frame_width = safe_int(cached_entry.get("width"), 0)
                frame_height = safe_int(cached_entry.get("height"), 0)
                if frame_width <= 0 or frame_height <= 0:
                    with Image.open(processed_path) as frame:
                        frame_width, frame_height = frame.size
                variant["bytes"] += processed_bytes
                variant["frame_count"] += 1
                variant["max_width"] = max(int(variant["max_width"]), frame_width)
                variant["max_height"] = max(int(variant["max_height"]), frame_height)
                variant["frames"].append(
                    {
                        "index": output_index - 1,
                        "source_index": frame_index,
                        "name": frame_name,
                        "original_name": entry.get("original_name") or entry.get("name") or frame_name,
                        "url": f"/work/magic/{root.name}/{frames_dir.name}/{frame_name}",
                        "width": frame_width,
                        "height": frame_height,
                        "bytes": processed_bytes,
                        "cached": True,
                    }
                )
            reused_count += 1
            continue

        with Image.open(source_path) as image:
            source_rgba = image.convert("RGBA")
        upscaled_frame, source_size = build_magic_upscaled_frame(source_rgba, ai_input_path, ai_output_path)
        generated_count += 1

        for variant in variants.values():
            frames_dir = Path(variant["frames_dir"])
            processed_path = frames_dir / frame_name
            magic_frame = resize_magic_frame(
                upscaled_frame,
                source_size,
                float(variant["scale"]),
                resize_mode,
            )
            magic_frame.save(processed_path, optimize=True, compress_level=9)
            processed_bytes = processed_path.stat().st_size
            variant["bytes"] += processed_bytes
            variant["frame_count"] += 1
            variant["max_width"] = max(int(variant["max_width"]), magic_frame.width)
            variant["max_height"] = max(int(variant["max_height"]), magic_frame.height)
            variant["frames"].append(
                {
                    "index": output_index - 1,
                    "source_index": frame_index,
                    "name": frame_name,
                    "original_name": entry.get("original_name") or entry.get("name") or frame_name,
                    "url": f"/work/magic/{root.name}/{frames_dir.name}/{frame_name}",
                    "width": magic_frame.width,
                    "height": magic_frame.height,
                    "bytes": processed_bytes,
                    "cached": False,
                }
            )
            magic_frame.close()

        source_rgba.close()
        upscaled_frame.close()

    primary = variants["half"]

    result = {
        "magic_id": magic_id,
        "job_id": job_id,
        "model": REAL_ESRGAN_ANIME_MODEL,
        "upscale": 4,
        "final_scale": 0.5,
        "resize_mode": resize_mode,
        "resize_mode_label": resize_mode_label,
        "output_dir": str(root),
        "frames_dir": str(primary["frames_dir"]),
        "frame_count": int(primary["frame_count"]),
        "max_width": int(primary["max_width"]),
        "max_height": int(primary["max_height"]),
        "bytes": int(primary["bytes"]),
        "frames": primary["frames"],
        "variants": variants,
        "generated_count": generated_count,
        "reused_count": reused_count,
        "created_at": iso_now(),
    }
    (root / "manifest.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def load_magic_manifest(magic_id: str) -> dict:
    magic_id = str(magic_id or "").strip()
    if not magic_id or Path(magic_id).name != magic_id:
        raise ValueError("invalid MAGIC id")
    path = MAGIC_DIR / f"{magic_id}-magic" / "manifest.json"
    if not path.exists():
        raise FileNotFoundError(f"MAGIC result not found: {magic_id}")
    return json.loads(path.read_text(encoding="utf-8"))


def magic_manifest_variant(manifest: dict, variant_key: str) -> dict:
    variants = manifest.get("variants") or {}
    key = variant_key if variant_key in variants else "half"
    if key in variants:
        return variants[key]
    return {
        "key": "half",
        "label": "1/2",
        "frames_dir": manifest.get("frames_dir") or "",
        "frame_count": manifest.get("frame_count") or 0,
        "max_width": manifest.get("max_width") or 0,
        "max_height": manifest.get("max_height") or 0,
        "frames": manifest.get("frames") or [],
    }


def export_magic_frames(
    magic_id: str,
    variant_key: str = "half",
    video_duration_ms: int = 100,
) -> dict:
    manifest = load_magic_manifest(magic_id)
    job_manifest = load_job_manifest(str(manifest.get("job_id") or ""))
    job_frame_sizes = {
        entry["index"]: (
            safe_int(entry.get("width"), 0),
            safe_int(entry.get("height"), 0),
        )
        for entry in job_manifest.get("frames") or []
    }
    variant = magic_manifest_variant(manifest, variant_key)
    source_dir = resolve_magic_variant_dir(manifest, variant)
    if not source_dir.exists():
        raise FileNotFoundError(f"MAGIC frames not found: {manifest['magic_id']}")

    variant_key = str(variant.get("key") or "half")
    target_dir = configured_exports_dir() / f"{timestamped_id()}-magic-{variant_key}-frames"
    frames_dir = target_dir / "frames"
    sheet_dir = target_dir / "sprite-sheet"
    frames_dir.mkdir(parents=True, exist_ok=True)
    sheet_dir.mkdir(parents=True, exist_ok=True)

    copied_count = 0
    copied_paths: list[Path] = []
    mov_frame_sizes: list[tuple[int, int]] = []
    for output_index, entry in enumerate(variant.get("frames") or [], start=1):
        source_path = source_dir / str(entry.get("name") or "")
        if not source_path.exists():
            continue
        target_path = frames_dir / f"frame_{output_index:03d}.png"
        shutil.copy2(source_path, target_path)
        copied_count += 1
        copied_paths.append(target_path)
        source_size = job_frame_sizes.get(safe_int(entry.get("source_index"), -1))
        if not source_size or source_size[0] <= 0 or source_size[1] <= 0:
            source_size = (
                max(1, round(safe_int(entry.get("width"), 1) / max(float(variant.get("scale") or 1), 0.0001))),
                max(1, round(safe_int(entry.get("height"), 1) / max(float(variant.get("scale") or 1), 0.0001))),
            )
        mov_frame_sizes.append(source_size)

    if copied_count <= 0:
        raise ValueError("no MAGIC frames exported")

    cell_width = 0
    cell_height = 0
    frame_sizes: list[tuple[int, int]] = []
    for frame_path in copied_paths:
        frame = open_rgba_image(frame_path)
        frame_sizes.append(frame.size)
        cell_width = max(cell_width, frame.size[0])
        cell_height = max(cell_height, frame.size[1])
        frame.close()

    video_duration_ms = clamp_int(video_duration_ms, 20, 5000)
    timestamp = f"{datetime.now():%Y%m%d-%H%M%S}"
    mov_name = f"magic-{variant_key}-{timestamp}.mov"
    gif_name = f"magic-{variant_key}-{timestamp}.gif"
    sheet_name = "sheet.png"
    sheet_json_name = "sheet.json"
    mov_cell_width = max(width for width, _height in mov_frame_sizes)
    mov_cell_height = max(height for _width, height in mov_frame_sizes)
    save_alpha_mov(
        copied_paths,
        frame_sizes,
        target_dir / mov_name,
        mov_cell_width,
        mov_cell_height,
        video_duration_ms,
        render_sizes=mov_frame_sizes,
    )
    save_gif(copied_paths, frame_sizes, target_dir / gif_name, cell_width, cell_height, video_duration_ms)
    sheet_metadata = save_sprite_sheet(
        copied_paths,
        frame_sizes,
        sheet_dir / sheet_name,
        sheet_dir / sheet_json_name,
        cell_width,
        cell_height,
        video_duration_ms,
    )

    result = {
        "output_dir": str(target_dir),
        "frames_dir": str(frames_dir),
        "sheet_dir": str(sheet_dir),
        "video_name": mov_name,
        "video_url": export_url(target_dir, mov_name),
        "mov_name": mov_name,
        "mov_url": export_url(target_dir, mov_name),
        "gif_name": gif_name,
        "gif_url": export_url(target_dir, gif_name),
        "sheet_name": sheet_name,
        "sheet_url": export_url(target_dir, f"sprite-sheet/{sheet_name}"),
        "sheet_json_name": sheet_json_name,
        "sheet_json_url": export_url(target_dir, f"sprite-sheet/{sheet_json_name}"),
        "sheet_columns": sheet_metadata["columns"],
        "sheet_rows": sheet_metadata["rows"],
        "sheet_width": sheet_metadata["width"],
        "sheet_height": sheet_metadata["height"],
        "frame_count": copied_count,
        "max_width": mov_cell_width,
        "max_height": mov_cell_height,
        "gif_width": variant.get("max_width") or 0,
        "gif_height": variant.get("max_height") or 0,
        "video_duration_ms": video_duration_ms,
        "source_magic_id": manifest.get("magic_id") or magic_id,
        "variant_key": variant_key,
        "variant_label": variant.get("label") or "1/2",
        "resize_mode": manifest.get("resize_mode") or MAGIC_RESIZE_MODE_DEFAULT,
        "resize_mode_label": manifest.get("resize_mode_label") or MAGIC_RESIZE_MODES[MAGIC_RESIZE_MODE_DEFAULT]["label"],
        "created_at": iso_now(),
    }
    (target_dir / "export.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def export_job(job_id: str, selected_indices: list[int], video_duration_ms: int) -> dict:
    manifest = load_job_manifest(job_id)
    processed_dir = job_dir(job_id) / "processed"
    target_dir = configured_exports_dir() / f"{timestamped_id()}-export"
    frames_dir = target_dir / "frames"
    sheet_dir = target_dir / "sprite-sheet"
    frames_dir.mkdir(parents=True, exist_ok=True)
    sheet_dir.mkdir(parents=True, exist_ok=True)

    frame_map = {entry["index"]: entry for entry in manifest["frames"]}
    seen_indices: set[int] = set()
    indices: list[int] = []
    for index in selected_indices:
        if index in frame_map and index not in seen_indices:
            indices.append(index)
            seen_indices.add(index)
    if not indices:
        raise ValueError("no frames selected for export")

    copied_paths: list[Path] = []
    for output_index, frame_index in enumerate(indices, start=1):
        entry = frame_map[frame_index]
        source_path = processed_dir / entry["name"]
        target_path = frames_dir / f"frame_{output_index:03d}.png"
        shutil.copy2(source_path, target_path)
        copied_paths.append(target_path)

    cell_width = 0
    cell_height = 0
    frame_sizes: list[tuple[int, int]] = []
    for frame_path in copied_paths:
        frame = open_rgba_image(frame_path)
        frame_sizes.append(frame.size)
        cell_width = max(cell_width, frame.size[0])
        cell_height = max(cell_height, frame.size[1])
        frame.close()

    video_duration_ms = clamp_int(video_duration_ms, 20, 5000)
    timestamp = f"{datetime.now():%Y%m%d-%H%M%S}"
    mov_name = f"animation-{timestamp}.mov"
    gif_name = f"animation-{timestamp}.gif"
    sheet_name = "sheet.png"
    sheet_json_name = "sheet.json"
    save_alpha_mov(copied_paths, frame_sizes, target_dir / mov_name, cell_width, cell_height, video_duration_ms)
    save_gif(copied_paths, frame_sizes, target_dir / gif_name, cell_width, cell_height, video_duration_ms)
    sheet_metadata = save_sprite_sheet(
        copied_paths,
        frame_sizes,
        sheet_dir / sheet_name,
        sheet_dir / sheet_json_name,
        cell_width,
        cell_height,
        video_duration_ms,
    )

    return {
        "output_dir": str(target_dir),
        "frames_dir": str(frames_dir),
        "sheet_dir": str(sheet_dir),
        "video_name": mov_name,
        "video_url": export_url(target_dir, mov_name),
        "mov_name": mov_name,
        "mov_url": export_url(target_dir, mov_name),
        "gif_name": gif_name,
        "gif_url": export_url(target_dir, gif_name),
        "sheet_name": sheet_name,
        "sheet_url": export_url(target_dir, f"sprite-sheet/{sheet_name}"),
        "sheet_json_name": sheet_json_name,
        "sheet_json_url": export_url(target_dir, f"sprite-sheet/{sheet_json_name}"),
        "sheet_columns": sheet_metadata["columns"],
        "sheet_rows": sheet_metadata["rows"],
        "sheet_width": sheet_metadata["width"],
        "sheet_height": sheet_metadata["height"],
        "frame_count": len(copied_paths),
        "video_duration_ms": video_duration_ms,
    }


def normalize_video_process_format(value: str) -> str:
    value = str(value or "mp4").strip().lower()
    return value if value in {"mp4", "webm", "mov", "gif"} else "mp4"


def normalize_video_process_quality(value: str) -> str:
    value = str(value or "balanced").strip().lower()
    return value if value in {"high", "balanced", "small"} else "balanced"


def ffmpeg_drawtext_escape(value: str) -> str:
    return (
        str(value or "")
        .replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace(",", "\\,")
        .replace("'", "\\'")
        .replace("[", "\\[")
        .replace("]", "\\]")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
    )


def ffmpeg_color(value: str, fallback: str = "white") -> str:
    raw = str(value or "").strip()
    if re.fullmatch(r"#[0-9a-fA-F]{6}", raw):
        return "0x" + raw[1:]
    if re.fullmatch(r"0x[0-9a-fA-F]{6}", raw):
        return raw
    if re.fullmatch(r"[a-zA-Z]+", raw):
        return raw.lower()
    return fallback


def normalized_video_process_subtitles(raw_subtitles, legacy_subtitle: dict | None = None) -> list[dict]:
    source = raw_subtitles if isinstance(raw_subtitles, list) else []
    if not source and isinstance(legacy_subtitle, dict) and str(legacy_subtitle.get("text") or "").strip():
        source = [legacy_subtitle]
    result: list[dict] = []
    for item in source:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        start = max(0.0, safe_float(item.get("start"), 0.0))
        end = max(0.0, safe_float(item.get("end"), 0.0))
        size = clamp_int(safe_int(item.get("size"), 32), 12, 128)
        position = str(item.get("position") or "bottom").strip().lower()
        if position not in {"top", "middle", "bottom"}:
            position = "bottom"
        box = str(item.get("box") or "boxed").strip().lower()
        if box not in {"boxed", "outline", "none"}:
            box = "boxed"
        result.append(
            {
                "text": text,
                "start": start,
                "end": end,
                "size": size,
                "position": position,
                "color": ffmpeg_color(str(item.get("color") or "white")),
                "box": box,
            }
        )
    return result[:256]


def build_video_process_subtitle_filters(subtitles: list[dict]) -> list[str]:
    filters: list[str] = []
    for subtitle in subtitles:
        start = max(0.0, safe_float(subtitle.get("start"), 0.0))
        end = max(0.0, safe_float(subtitle.get("end"), 0.0))
        enable = f":enable='gte(t,{start:.3f})'" if end <= start else f":enable='between(t,{start:.3f},{end:.3f})'"
        position = str(subtitle.get("position") or "bottom")
        y_expr = {
            "top": "44",
            "middle": "(h-text_h)/2",
            "bottom": "h-text_h-44",
        }.get(position, "h-text_h-44")
        box_mode = str(subtitle.get("box") or "boxed")
        style = ""
        if box_mode == "boxed":
            style = ":box=1:boxcolor=black@0.48:boxborderw=12"
        elif box_mode == "outline":
            style = ":borderw=3:bordercolor=black@0.82"
        filters.append(
            "drawtext="
            f"text='{ffmpeg_drawtext_escape(str(subtitle.get('text') or ''))}':"
            f"x=(w-text_w)/2:y={y_expr}:"
            f"fontsize={clamp_int(safe_int(subtitle.get('size'), 32), 12, 128)}:"
            f"fontcolor={subtitle.get('color') or 'white'}"
            f"{style}"
            f"{enable}"
        )
    return filters


def build_video_process_filters(
    width: int,
    height: int,
    fps: int,
    *,
    subtitle: dict | None = None,
    subtitles: list[dict] | None = None,
    force_gif_fps: bool = False,
    include_resize: bool = True,
) -> list[str]:
    filters: list[str] = []
    if fps > 0:
        filters.append(f"fps={fps}")
    elif force_gif_fps:
        filters.append("fps=15")
    if include_resize and width > 0 and height > 0:
        filters.append(f"scale={width}:{height}:flags=lanczos")
    elif include_resize and width > 0:
        filters.append(f"scale={width}:-2:flags=lanczos")
    elif include_resize and height > 0:
        filters.append(f"scale=-2:{height}:flags=lanczos")
    normalized_subtitles = subtitles if isinstance(subtitles, list) else normalized_video_process_subtitles([], subtitle)
    filters.extend(build_video_process_subtitle_filters(normalized_subtitles))
    return filters


def normalized_video_process_segments(raw_segments, duration: float) -> list[dict]:
    if not isinstance(raw_segments, list):
        return []
    result: list[dict] = []
    for item in raw_segments:
        if not isinstance(item, dict):
            continue
        start = max(0.0, safe_float(item.get("start"), 0.0))
        end = max(0.0, safe_float(item.get("end"), 0.0))
        if duration > 0:
            start = min(start, duration)
            end = min(end, duration)
        if end > start:
            result.append({"start": start, "end": end})
    return result[:64]


def normalized_video_process_clips(raw_clips, fallback_upload_id: str, fallback_duration: float) -> list[dict]:
    source = raw_clips if isinstance(raw_clips, list) else []
    result: list[dict] = []
    for item in source:
        if not isinstance(item, dict):
            continue
        upload_id = str(item.get("uploadId") or item.get("upload_id") or fallback_upload_id or "").strip()
        if not upload_id:
            continue
        start = max(0.0, safe_float(item.get("start"), 0.0))
        end = max(0.0, safe_float(item.get("end"), 0.0))
        duration = fallback_duration
        try:
            clip_path, media_type = source_media_entry(upload_id)
            if media_type == "video":
                duration = safe_float(media_info(clip_path, "video").get("duration"), fallback_duration)
        except Exception:
            duration = fallback_duration
        if duration > 0:
            start = min(start, duration)
            end = min(end, duration)
        if end > start:
            result.append(
                {
                    "upload_id": upload_id,
                    "start": start,
                    "end": end,
                    "source_name": clean_filename(str(item.get("sourceName") or item.get("source_name") or upload_id)),
                }
            )
    return result[:128]


def even_dimension(value: int, fallback: int) -> int:
    safe = value if value > 0 else fallback
    safe = max(2, safe)
    return safe if safe % 2 == 0 else safe + 1


def video_process_canvas_size(width: int, height: int, source_infos: list[dict]) -> tuple[int, int]:
    first = next((info for info in source_infos if safe_int(info.get("width"), 0) > 0 and safe_int(info.get("height"), 0) > 0), {})
    source_width = safe_int(first.get("width"), 1280)
    source_height = safe_int(first.get("height"), 720)
    if width > 0 and height > 0:
        return even_dimension(width, source_width), even_dimension(height, source_height)
    if width > 0 and source_width > 0:
        computed_height = int(round((source_height / source_width) * width))
        return even_dimension(width, source_width), even_dimension(computed_height, source_height)
    if height > 0 and source_height > 0:
        computed_width = int(round((source_width / source_height) * height))
        return even_dimension(computed_width, source_width), even_dimension(height, source_height)
    return even_dimension(source_width, 1280), even_dimension(source_height, 720)


def append_video_process_codec_args(args: list[str], output_format: str, quality: str, mute: bool) -> None:
    crf_map = {
        "mp4": {"high": "18", "balanced": "23", "small": "29"},
        "webm": {"high": "24", "balanced": "32", "small": "42"},
    }
    if output_format == "mp4":
        args += ["-c:v", "libx264", "-preset", "medium", "-crf", crf_map["mp4"][quality], "-pix_fmt", "yuv420p"]
        if not mute:
            args += ["-c:a", "aac", "-b:a", "160k"]
    elif output_format == "webm":
        args += ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", crf_map["webm"][quality], "-pix_fmt", "yuv420p"]
        if not mute:
            args += ["-c:a", "libopus", "-b:a", "128k"]
    else:
        args += ["-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le"]
        if not mute:
            args += ["-c:a", "pcm_s16le"]


def process_video_export(upload_id: str, options: dict) -> dict:
    source_path, media_type = source_media_entry(upload_id)
    if media_type != "video":
        raise ValueError("video processing only supports video or GIF sources")

    source_info = media_info(source_path, "video")
    output_format = normalize_video_process_format(str(options.get("format") or "mp4"))
    quality = normalize_video_process_quality(str(options.get("quality") or "balanced"))
    width = clamp_int(safe_int(options.get("width"), 0), 0, 16384)
    height = clamp_int(safe_int(options.get("height"), 0), 0, 16384)
    fps = clamp_int(safe_int(options.get("fps"), 0), 0, 240)
    mute = bool(options.get("mute"))
    trim_start = max(0.0, safe_float(options.get("trim_start"), 0.0))
    trim_end = max(0.0, safe_float(options.get("trim_end"), 0.0))
    if trim_end <= trim_start:
        trim_end = 0.0
    subtitle = options.get("subtitle") if isinstance(options.get("subtitle"), dict) else {}
    subtitles = normalized_video_process_subtitles(options.get("subtitles"), subtitle)
    segments = normalized_video_process_segments(options.get("segments"), safe_float(source_info.get("duration"), 0.0))
    clips = normalized_video_process_clips(options.get("clips") if isinstance(options.get("clips"), list) else options.get("segments"), upload_id, safe_float(source_info.get("duration"), 0.0))
    raw_name = clean_filename(str(options.get("name") or source_path.stem or "processed_video"))
    target_stem = Path(raw_name).stem or "processed_video"
    output_scope = "export" if str(options.get("output_scope") or "work") == "export" else "work"
    target_dir = (configured_exports_dir() if output_scope == "export" else VIDEO_PROCESS_DIR) / f"{timestamped_id()}-video-process"
    target_dir.mkdir(parents=True, exist_ok=True)
    target_name = f"{target_stem}.{output_format}"
    target_path = target_dir / target_name

    ffmpeg = resolve_ffmpeg_binary("ffmpeg")
    filters = build_video_process_filters(width, height, fps, subtitles=subtitles, force_gif_fps=output_format == "gif")
    filter_chain = ",".join(filters)

    if clips:
        clip_entries: list[dict] = []
        for clip in clips:
            clip_path, clip_type = source_media_entry(str(clip.get("upload_id") or upload_id))
            if clip_type != "video":
                continue
            clip_info = media_info(clip_path, "video")
            clip_entries.append({**clip, "path": clip_path, "info": clip_info, "has_audio": video_has_audio(clip_path)})
        if not clip_entries:
            raise ValueError("no valid video clips to render")
        canvas_width, canvas_height = video_process_canvas_size(width, height, [entry["info"] for entry in clip_entries])
        target_fps = fps if fps > 0 else (15 if output_format == "gif" else safe_int(round(safe_float(clip_entries[0]["info"].get("fps"), 0.0)), 0))
        preserve_audio = (not mute) and output_format != "gif" and all(bool(entry.get("has_audio")) for entry in clip_entries)
        trim_parts: list[str] = []
        video_inputs: list[str] = []
        audio_inputs: list[str] = []
        for index, entry in enumerate(clip_entries):
            video_label = f"v{index}"
            per_clip_filters = [
                f"[{index}:v]trim=start={entry['start']:.3f}:end={entry['end']:.3f}",
                "setpts=PTS-STARTPTS",
                f"scale={canvas_width}:{canvas_height}:force_original_aspect_ratio=decrease:flags=lanczos",
                f"pad={canvas_width}:{canvas_height}:(ow-iw)/2:(oh-ih)/2",
                "setsar=1",
                "format=yuv420p",
            ]
            if target_fps > 0:
                per_clip_filters.append(f"fps={target_fps}")
            trim_parts.append(",".join(per_clip_filters) + f"[{video_label}]")
            video_inputs.append(f"[{video_label}]")
            if preserve_audio:
                audio_label = f"a{index}"
                trim_parts.append(
                    f"[{index}:a]atrim=start={entry['start']:.3f}:end={entry['end']:.3f},asetpts=PTS-STARTPTS,aresample=async=1[{audio_label}]"
                )
                audio_inputs.append(f"[{audio_label}]")
        if preserve_audio:
            trim_parts.append("".join([part for pair in zip(video_inputs, audio_inputs) for part in pair]) + f"concat=n={len(clip_entries)}:v=1:a=1[vcat][aout]")
        else:
            trim_parts.append("".join(video_inputs) + f"concat=n={len(clip_entries)}:v=1:a=0[vcat]")
        post_filters = build_video_process_filters(0, 0, 0, subtitles=subtitles, force_gif_fps=False, include_resize=False)
        trim_parts.append(f"[vcat]{','.join(post_filters) if post_filters else 'null'}[vout]")
        if output_format == "gif":
            palette_colors = {"high": 256, "balanced": 128, "small": 64}[quality]
            trim_parts.append(f"[vout]split[s0][s1];[s0]palettegen=max_colors={palette_colors}[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3[gifout]")
            args = [ffmpeg, "-y"]
            for entry in clip_entries:
                args += ["-i", str(entry["path"])]
            args += ["-filter_complex", ";".join(trim_parts), "-map", "[gifout]", "-loop", "0", str(target_path)]
            run_process(args)
            accel = ffmpeg_accel_payload(configured_ffmpeg_accel_mode(), None, "cpu")
        else:
            args = [ffmpeg, "-y"]
            for entry in clip_entries:
                args += ["-i", str(entry["path"])]
            args += ["-filter_complex", ";".join(trim_parts), "-map", "[vout]"]
            if preserve_audio:
                args += ["-map", "[aout]"]
            else:
                args += ["-an"]
            append_video_process_codec_args(args, output_format, quality, not preserve_audio)
            args.append(str(target_path))
            run_process(args)
            accel = ffmpeg_accel_payload(configured_ffmpeg_accel_mode(), None, "cpu")
    elif output_format == "gif":
        palette_colors = {"high": 256, "balanced": 128, "small": 64}[quality]
        gif_filter_chain = filter_chain if filter_chain else "fps=15"
        filter_complex = (
            f"[0:v]{gif_filter_chain},split[s0][s1];"
            f"[s0]palettegen=max_colors={palette_colors}[p];"
            f"[s1][p]paletteuse=dither=bayer:bayer_scale=3"
        )
        args = [ffmpeg, "-y"]
        if trim_start > 0:
            args += ["-ss", f"{trim_start:.3f}"]
        args += ["-i", str(source_path)]
        if trim_end > trim_start:
            args += ["-t", f"{trim_end - trim_start:.3f}"]
        args += ["-filter_complex", filter_complex, "-loop", "0", str(target_path)]
        run_process(args)
        accel = ffmpeg_accel_payload(configured_ffmpeg_accel_mode(), None, "cpu")
    else:
        def build_args(hwaccel: str | None) -> list[str]:
            args = [ffmpeg, "-y"]
            if hwaccel:
                args += ["-hwaccel", hwaccel]
            if trim_start > 0:
                args += ["-ss", f"{trim_start:.3f}"]
            args += ["-i", str(source_path)]
            if trim_end > trim_start:
                args += ["-t", f"{trim_end - trim_start:.3f}"]
            if filter_chain:
                args += ["-vf", filter_chain]
            if mute:
                args += ["-an"]
            append_video_process_codec_args(args, output_format, quality, mute)
            args.append(str(target_path))
            return args

        accel = run_ffmpeg_with_auto_accel(build_args)

    if not target_path.exists():
        raise RuntimeError("FFmpeg did not create an output file")

    output_info = media_info(target_path, "video")
    result = {
        "name": target_name,
        "url": export_url(target_dir, target_name) if output_scope == "export" else f"/work/video-process/{target_dir.name}/{target_name}",
        "path": str(target_path),
        "output_dir": str(target_dir),
        "output_scope": output_scope,
        "format": output_format,
        "quality": quality,
        "width": output_info.get("width") or 0,
        "height": output_info.get("height") or 0,
        "fps": output_info.get("fps") or 0,
        "duration": output_info.get("duration") or 0,
        "codec": output_info.get("codec") or "",
        "source_bytes": source_path.stat().st_size if source_path.exists() else 0,
        "output_bytes": target_path.stat().st_size,
        "segments": clips if clips else segments,
        "clips": clips,
        "trim_start": trim_start,
        "trim_end": trim_end,
        "subtitles": subtitles,
        "subtitle_enabled": bool(subtitles),
        "ffmpeg_accel": accel,
        "created_at": iso_now(),
    }
    (target_dir / "video-process.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def export_video_process_result(source: str, name: str = "") -> dict:
    source_path = repair_mojibake_path(Path(str(source or "")))
    if not source_path.exists() or not source_path.is_file():
        raise FileNotFoundError("video process result not found")
    if not is_within_root(source_path, VIDEO_PROCESS_DIR) and not is_within_root(source_path, configured_exports_dir()):
        raise ValueError("video process result is outside the allowed workspace")
    output_format = normalize_video_process_format(source_path.suffix.removeprefix("."))
    target_name = clean_filename(name or source_path.name)
    if not target_name.lower().endswith(source_path.suffix.lower()):
        target_name = f"{Path(target_name).stem or source_path.stem}{source_path.suffix.lower()}"
    target_dir = configured_exports_dir() / f"{timestamped_id()}-video-export"
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / target_name
    counter = 2
    while target_path.exists():
        target_path = target_dir / f"{Path(target_name).stem}-{counter:02d}{source_path.suffix.lower()}"
        counter += 1
    shutil.copy2(source_path, target_path)
    output_info = media_info(target_path, "video")
    result = {
        "name": target_path.name,
        "url": export_url(target_dir, target_path.name),
        "path": str(target_path),
        "output_dir": str(target_dir),
        "format": output_format,
        "width": output_info.get("width") or 0,
        "height": output_info.get("height") or 0,
        "output_bytes": target_path.stat().st_size,
        "created_at": iso_now(),
    }
    (target_dir / "video-export.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def export_image_result_job(job_id: str) -> dict:
    manifest = load_job_manifest(job_id)
    processed_dir = job_dir(job_id) / "processed"
    if not processed_dir.is_dir():
        raise FileNotFoundError(f"processed image folder not found: {processed_dir}")

    target_dir = configured_exports_dir() / f"{timestamped_id()}-image-matte"
    target_dir.mkdir(parents=True, exist_ok=True)

    copied: list[dict] = []
    for index, entry in enumerate(manifest.get("frames") or [], start=1):
        source_name = str(entry.get("name") or f"frame_{index:03d}.png")
        source_path = processed_dir / source_name
        if not source_path.is_file():
            continue
        original_name = clean_filename(str(entry.get("original_name") or source_name))
        if not original_name.lower().endswith(".png"):
            original_name = f"{Path(original_name).stem or f'image_{index:03d}'}.png"
        target_name = original_name
        target_path = target_dir / target_name
        if target_path.exists():
            target_name = f"{Path(original_name).stem}-{index:03d}.png"
            target_path = target_dir / target_name
        shutil.copy2(source_path, target_path)
        copied.append(
            {
                "index": safe_int(entry.get("index"), index - 1),
                "name": target_name,
                "source_name": source_name,
                "path": str(target_path),
            }
        )

    if not copied:
        raise ValueError("no matte result images to export")

    result = {
        "target_dir": str(target_dir),
        "frame_count": len(copied),
        "frames": copied,
        "source_job_id": manifest.get("job_id") or job_id,
        "created_at": iso_now(),
    }
    (target_dir / "export.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def dual_background_source_image(form: cgi.FieldStorage, role: str, upload_id: str) -> tuple[Image.Image, str, str]:
    file_items = field_storage_items(form, f"{role}_file")
    for item in file_items:
        if getattr(item, "file", None) and str(getattr(item, "filename", "") or "").strip():
            name = clean_filename(Path(str(item.filename).replace("\\", "/")).name or f"{role}.png")
            with Image.open(item.file) as image:
                return image.convert("RGBA"), name, "file"

    if not upload_id:
        raise ValueError(f"{role} image is missing")
    target_index = safe_int(form.getfirst(f"{role}_index", ""), -1)
    entries = source_frame_entries(upload_id)
    entry = next((item for item in entries if safe_int(item.get("index"), -1) == target_index), None)
    if entry is None and target_index >= 0 and target_index < len(entries):
        entry = entries[target_index]
    if not entry:
        raise ValueError(f"{role} imported image is missing")
    path = repair_mojibake_path(Path(str(entry.get("path") or "")))
    with Image.open(path) as image:
        return image.convert("RGBA"), clean_filename(str(entry.get("name") or path.name)), "import"


def solve_dual_background_alpha(
    black_image: Image.Image,
    white_image: Image.Image,
    bias: int = 0,
    feather: int = 0,
) -> Image.Image:
    import numpy as np

    black = black_image.convert("RGB")
    white = white_image.convert("RGB")
    if white.size != black.size:
        white = white.resize(black.size, LANCZOS)

    black_arr = np.asarray(black, dtype=np.float32) / 255.0
    white_arr = np.asarray(white, dtype=np.float32) / 255.0
    transparency = np.clip(np.mean(white_arr - black_arr, axis=2) + (float(bias) / 255.0), 0.0, 1.0)
    alpha = np.clip(1.0 - transparency, 0.0, 1.0)

    rgb = np.zeros_like(black_arr)
    np.divide(black_arr, np.maximum(alpha[..., None], 1.0 / 255.0), out=rgb, where=alpha[..., None] > 1.0 / 255.0)
    rgb = np.clip(rgb, 0.0, 1.0)
    rgba = np.dstack([rgb, alpha])
    output = Image.fromarray((rgba * 255.0 + 0.5).astype(np.uint8), "RGBA")
    if feather > 0:
        channels = output.split()
        alpha_channel = channels[3].filter(ImageFilter.GaussianBlur(radius=max(0, min(8, feather)) / 2))
        output = Image.merge("RGBA", (*channels[:3], alpha_channel))
    return output


def dual_background_matte_job(form: cgi.FieldStorage) -> dict:
    upload_id = str(form.getfirst("upload_id", "") or "").strip()
    black_image, black_name, black_source = dual_background_source_image(form, "black", upload_id)
    white_image, white_name, white_source = dual_background_source_image(form, "white", upload_id)
    bias = max(-64, min(64, safe_int(form.getfirst("bias", 0), 0)))
    feather = max(0, min(8, safe_int(form.getfirst("feather", 0), 0)))
    trim = str(form.getfirst("trim", "1") or "1").lower() not in {"0", "false", "no"}

    result_image = solve_dual_background_alpha(black_image, white_image, bias=bias, feather=feather)
    if trim:
        bbox = result_image.getchannel("A").getbbox()
        if bbox:
            result_image = result_image.crop(bbox)
    bbox = result_image.getchannel("A").getbbox()

    job_id = timestamped_id()
    root = job_dir(job_id)
    raw_dir = root / "raw"
    processed_dir = root / "processed"
    thumbs_dir = root / "thumbs"
    for directory in (raw_dir, processed_dir, thumbs_dir):
        directory.mkdir(parents=True, exist_ok=True)

    black_raw = raw_dir / "dual_black.png"
    white_raw = raw_dir / "dual_white.png"
    frame_name = "dual_background_matte.png"
    thumb_name = "thumb_001.png"
    frame_path = processed_dir / frame_name
    thumb_path = thumbs_dir / thumb_name

    black_image.save(black_raw)
    white_image.save(white_raw)
    result_image.save(frame_path, optimize=True)
    thumb = result_image.copy()
    thumb.thumbnail((128, 128))
    thumb.save(thumb_path)

    info = {
        "media_type": "dual_background",
        "duration": 0,
        "fps": 0,
        "width": result_image.width,
        "height": result_image.height,
        "frame_count": 1,
        "bytes": frame_path.stat().st_size,
    }
    manifest = {
        "job_id": job_id,
        "upload_id": upload_id,
        "job_dir": str(root),
        "processed_dir": str(processed_dir),
        "raw_dir": str(raw_dir),
        "source_path": str(black_raw),
        "source_media_type": "dual_background",
        "ffmpeg_accel": static_image_payload(),
        "video_info": info,
        "options": {
            "start_time": 0,
            "end_time": 0,
            "keep_every": 1,
            "target_size": result_image.height,
            "output_scale": 1,
            "reduce_px": 0,
            "canvas_mode": "dual_background",
            "output_width": result_image.width,
            "output_height": result_image.height,
            "chroma_enabled": True,
            "matte_mode": "dual_background",
            "matte": {
                "mode": "dual_background",
                "black_source": black_source,
                "white_source": white_source,
                "black_name": black_name,
                "white_name": white_name,
                "bias": bias,
                "feather": feather,
                "trim": trim,
            },
            "scale": 1,
        },
        "frame_count": 1,
        "frames": [
            {
                "index": 0,
                "source_index": 0,
                "name": frame_name,
                "original_name": f"{Path(black_name).stem or 'dual'}-matte.png",
                "url": f"/work/jobs/{job_id}/processed/{frame_name}",
                "thumb_url": f"/work/jobs/{job_id}/thumbs/{thumb_name}",
                "bbox": list(bbox) if bbox else None,
                "width": result_image.width,
                "height": result_image.height,
            }
        ],
    }
    save_job_manifest(job_id, manifest)
    black_image.close()
    white_image.close()
    result_image.close()
    thumb.close()
    return manifest


def render_image_split_canvas(processed_dir: Path, frame_map: dict[int, dict], item: dict) -> tuple[Image.Image, Path, int, int, str] | None:
    source_index = safe_int(item.get("source_index"), -1)
    entry = frame_map.get(source_index)
    source_name = str(item.get("source_name") or "")
    if not source_name and entry:
        source_name = str(entry.get("name") or "")
    source_path = processed_dir / Path(source_name).name
    if not source_path.is_file() and entry:
        source_path = processed_dir / Path(str(entry.get("name") or "")).name
    if not source_path.is_file():
        return None

    with open_rgba_image(source_path) as source:
        crop = item.get("crop") if isinstance(item.get("crop"), dict) else {}
        frame_width = max(1, safe_int(crop.get("frameWidth"), source.width))
        frame_height = max(1, safe_int(crop.get("frameHeight"), source.height))
        crop_x = clamp_float(safe_float(crop.get("x"), 0.0), 0.0, float(max(0, frame_width - 1)))
        crop_y = clamp_float(safe_float(crop.get("y"), 0.0), 0.0, float(max(0, frame_height - 1)))
        crop_w = max(1.0, safe_float(crop.get("w"), float(frame_width)))
        crop_h = max(1.0, safe_float(crop.get("h"), float(frame_height)))
        crop_right = clamp_float(crop_x + crop_w, crop_x + 1.0, float(frame_width))
        crop_bottom = clamp_float(crop_y + crop_h, crop_y + 1.0, float(frame_height))
        source_logical_width = max(1, int(round(crop_right - crop_x)))
        source_logical_height = max(1, int(round(crop_bottom - crop_y)))

        scale_x = source.width / frame_width
        scale_y = source.height / frame_height
        left = max(0, min(source.width - 1, int(round(crop_x * scale_x))))
        top = max(0, min(source.height - 1, int(round(crop_y * scale_y))))
        right = max(left + 1, min(source.width, int(round(crop_right * scale_x))))
        bottom = max(top + 1, min(source.height, int(round(crop_bottom * scale_y))))
        cropped = source.crop((left, top, right, bottom))

        output = item.get("output") if isinstance(item.get("output"), dict) else {}
        mode = str(output.get("mode") or "source")
        output_width = max(1, safe_int(output.get("width"), source_logical_width))
        output_height = max(1, safe_int(output.get("height"), source_logical_height))

        if mode == "fit":
            fit_scale = min(output_width / source_logical_width, output_height / source_logical_height)
            draw_width = max(1, int(round(source_logical_width * fit_scale)))
            draw_height = max(1, int(round(source_logical_height * fit_scale)))
            resized = cropped if cropped.size == (draw_width, draw_height) else resize_rgba_with_premultiplied_alpha(cropped, (draw_width, draw_height))
            canvas = Image.new("RGBA", (output_width, output_height), (0, 0, 0, 0))
            canvas.alpha_composite(resized, ((output_width - draw_width) // 2, (output_height - draw_height) // 2))
            canvas = anti_alias_alpha_edges(canvas, radius=0.85, band_radius=1, rgb_radius=0.35)
            return canvas, source_path, output_width, output_height, mode

        output_width = source_logical_width
        output_height = source_logical_height
        canvas = cropped if cropped.size == (output_width, output_height) else resize_rgba_with_premultiplied_alpha(cropped, (output_width, output_height))
        canvas = anti_alias_alpha_edges(canvas, radius=0.85, band_radius=1, rgb_radius=0.35)
        return canvas, source_path, output_width, output_height, mode


def png_bytes(image: Image.Image, optimize: bool = True) -> bytes:
    buffer = BytesIO()
    image.save(buffer, format="PNG", optimize=optimize)
    return buffer.getvalue()


PNG_COMPRESSION_LEVELS = {
    "faithful": {"colors": 256, "label": "faithful"},
    "balanced": {"colors": 128, "label": "balanced"},
    "strong": {"colors": 64, "label": "strong"},
    "extreme": {"colors": 32, "label": "extreme"},
}


def normalize_png_compression_level(value: str) -> str:
    value = str(value or "balanced")
    return value if value in PNG_COMPRESSION_LEVELS else "balanced"


def compressed_png_bytes(image: Image.Image, compression_level: str = "balanced") -> bytes:
    compression_level = normalize_png_compression_level(compression_level)
    colors = int(PNG_COMPRESSION_LEVELS[compression_level]["colors"])
    candidates = [png_bytes(image, optimize=True)]
    try:
        quantized = image.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
        candidates.append(png_bytes(quantized, optimize=True))
    except Exception:
        pass
    return min(candidates, key=len)


def compress_image_split_result_job(job_id: str, items: list[dict], compression_level: str = "balanced") -> dict:
    compression_level = normalize_png_compression_level(compression_level)
    colors = int(PNG_COMPRESSION_LEVELS[compression_level]["colors"])
    manifest = load_job_manifest(job_id)
    processed_dir = job_dir(job_id) / "processed"
    if not processed_dir.is_dir():
        raise FileNotFoundError(f"processed image folder not found: {processed_dir}")
    if not items:
        raise ValueError("no split images to compress")

    frame_map: dict[int, dict] = {}
    for entry in manifest.get("frames") or []:
        frame_map[safe_int(entry.get("source_index", entry.get("index")), 0)] = entry
        frame_map[safe_int(entry.get("index"), 0)] = entry

    run_id = f"{timestamped_id()}-image-compress"
    target_dir = COMPRESSED_DIR / run_id
    target_dir.mkdir(parents=True, exist_ok=True)
    frames: list[dict] = []
    used_names: set[str] = set()
    for output_index, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            continue
        rendered = render_image_split_canvas(processed_dir, frame_map, item)
        if not rendered:
            continue
        canvas, source_path, width, height, mode = rendered
        before = png_bytes(canvas, optimize=False)
        after = compressed_png_bytes(canvas, compression_level)
        name = clean_filename(str(item.get("name") or f"part_{output_index:02d}"))
        target_stem = Path(name).stem or f"part_{output_index:02d}"
        target_name = f"{target_stem}.png"
        counter = 2
        while target_name.lower() in used_names or (target_dir / target_name).exists():
            target_name = f"{target_stem}-{counter:02d}.png"
            counter += 1
        used_names.add(target_name.lower())
        target_path = target_dir / target_name
        target_path.write_bytes(after)
        frames.append(
            {
                "key": str(item.get("key") or ""),
                "index": output_index - 1,
                "name": target_name,
                "source_name": source_path.name,
                "url": f"/work/compressed/{run_id}/{target_name}",
                "width": width,
                "height": height,
                "mode": mode,
                "before_bytes": len(before),
                "after_bytes": len(after),
                "saved_bytes": max(0, len(before) - len(after)),
                "saved_ratio": 0 if not before else max(0.0, 1.0 - (len(after) / len(before))),
                "compression_level": compression_level,
                "compressor": f"Pillow PNG quantize {colors} + optimize",
            }
        )

    if not frames:
        raise ValueError("no split images were compressed")

    result = {
        "compress_id": run_id,
        "frame_count": len(frames),
        "frames": frames,
        "compression_level": compression_level,
        "compressor": f"Pillow PNG quantize {colors} + optimize",
        "created_at": iso_now(),
    }
    (target_dir / "compression.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def export_image_split_result_job(job_id: str, items: list[dict], export_mode: str = "folder") -> dict:
    manifest = load_job_manifest(job_id)
    processed_dir = job_dir(job_id) / "processed"
    if not processed_dir.is_dir():
        raise FileNotFoundError(f"processed image folder not found: {processed_dir}")
    if not items:
        raise ValueError("no split images to export")

    frame_map: dict[int, dict] = {}
    for entry in manifest.get("frames") or []:
        frame_map[safe_int(entry.get("source_index", entry.get("index")), 0)] = entry
        frame_map[safe_int(entry.get("index"), 0)] = entry

    normalized_export_mode = "direct" if str(export_mode or "") == "direct" else "folder"
    export_root = configured_exports_dir()
    target_dir = export_root if normalized_export_mode == "direct" else export_root / f"{timestamped_id()}-image-split"
    target_dir.mkdir(parents=True, exist_ok=True)
    used_names: set[str] = set()

    def unique_target_path(raw_name: str, fallback_index: int) -> tuple[str, Path]:
        name = clean_filename(raw_name or f"part_{fallback_index:02d}")
        stem = Path(name).stem or f"part_{fallback_index:02d}"
        suffix = ".png"
        candidate = f"{stem}{suffix}"
        counter = 2
        while candidate.lower() in used_names or (target_dir / candidate).exists():
            candidate = f"{stem}-{counter:02d}{suffix}"
            counter += 1
        used_names.add(candidate.lower())
        return candidate, target_dir / candidate

    exported: list[dict] = []
    for output_index, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            continue
        source_index = safe_int(item.get("source_index"), -1)
        entry = frame_map.get(source_index)
        source_name = str(item.get("source_name") or "")
        if not source_name and entry:
            source_name = str(entry.get("name") or "")
        source_path = processed_dir / Path(source_name).name
        if not source_path.is_file() and entry:
            source_path = processed_dir / Path(str(entry.get("name") or "")).name
        if not source_path.is_file():
            continue

        with open_rgba_image(source_path) as source:
            crop = item.get("crop") if isinstance(item.get("crop"), dict) else {}
            frame_width = max(1, safe_int(crop.get("frameWidth"), source.width))
            frame_height = max(1, safe_int(crop.get("frameHeight"), source.height))
            crop_x = clamp_float(safe_float(crop.get("x"), 0.0), 0.0, float(max(0, frame_width - 1)))
            crop_y = clamp_float(safe_float(crop.get("y"), 0.0), 0.0, float(max(0, frame_height - 1)))
            crop_w = max(1.0, safe_float(crop.get("w"), float(frame_width)))
            crop_h = max(1.0, safe_float(crop.get("h"), float(frame_height)))
            crop_right = clamp_float(crop_x + crop_w, crop_x + 1.0, float(frame_width))
            crop_bottom = clamp_float(crop_y + crop_h, crop_y + 1.0, float(frame_height))
            source_logical_width = max(1, int(round(crop_right - crop_x)))
            source_logical_height = max(1, int(round(crop_bottom - crop_y)))

            scale_x = source.width / frame_width
            scale_y = source.height / frame_height
            left = max(0, min(source.width - 1, int(round(crop_x * scale_x))))
            top = max(0, min(source.height - 1, int(round(crop_y * scale_y))))
            right = max(left + 1, min(source.width, int(round(crop_right * scale_x))))
            bottom = max(top + 1, min(source.height, int(round(crop_bottom * scale_y))))
            cropped = source.crop((left, top, right, bottom))

            output = item.get("output") if isinstance(item.get("output"), dict) else {}
            mode = str(output.get("mode") or "source")
            output_width = max(1, safe_int(output.get("width"), source_logical_width))
            output_height = max(1, safe_int(output.get("height"), source_logical_height))

            if mode == "fit":
                fit_scale = min(output_width / source_logical_width, output_height / source_logical_height)
                draw_width = max(1, int(round(source_logical_width * fit_scale)))
                draw_height = max(1, int(round(source_logical_height * fit_scale)))
                resized = cropped if cropped.size == (draw_width, draw_height) else resize_rgba_with_premultiplied_alpha(cropped, (draw_width, draw_height))
                canvas = Image.new("RGBA", (output_width, output_height), (0, 0, 0, 0))
                canvas.alpha_composite(resized, ((output_width - draw_width) // 2, (output_height - draw_height) // 2))
            else:
                output_width = source_logical_width
                output_height = source_logical_height
                canvas = cropped if cropped.size == (output_width, output_height) else resize_rgba_with_premultiplied_alpha(cropped, (output_width, output_height))
            canvas = anti_alias_alpha_edges(canvas, radius=0.85, band_radius=1, rgb_radius=0.35)

            target_name, target_path = unique_target_path(str(item.get("name") or ""), output_index)
            if bool(item.get("compressed")):
                target_path.write_bytes(compressed_png_bytes(canvas, str(item.get("compression_level") or "balanced")))
            else:
                canvas.save(target_path)
            exported.append(
                {
                    "index": output_index - 1,
                    "name": target_name,
                    "source_name": source_path.name,
                    "path": str(target_path),
                    "width": output_width,
                    "height": output_height,
                    "mode": mode,
                    "compressed": bool(item.get("compressed")),
                }
            )

    if not exported:
        raise ValueError("no split images were exported")

    result = {
        "target_dir": str(target_dir),
        "frame_count": len(exported),
        "frames": exported,
        "export_mode": normalized_export_mode,
        "source_job_id": manifest.get("job_id") or job_id,
        "created_at": iso_now(),
    }
    manifest_name = "export.json" if normalized_export_mode == "folder" else f"{timestamped_id()}-image-split-export.json"
    (target_dir / manifest_name).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


class AppHandler(BaseHTTPRequestHandler):
    server_version = "SpriteVideoLab/0.1"

    def log_message(self, format, *args) -> None:
        return

    def send_json(self, payload: dict, status: int = HTTPStatus.OK) -> None:
        body = json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, message: str, status: int = HTTPStatus.BAD_REQUEST) -> None:
        self.send_json({"ok": False, "error": message}, status=status)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/app-version":
            self.send_json(
                {
                    "ok": True,
                    "version": current_app_version(),
                    "poll_ms": APP_VERSION_POLL_MS,
                }
            )
            return
        if parsed.path == "/api/runtime-info":
            self.send_json({"ok": True, "runtime": runtime_info()})
            return
        if parsed.path == "/api/models":
            self.send_json({"ok": True, **model_management_payload()})
            return
        if parsed.path == "/api/process-progress":
            progress_id = (parse_qs(parsed.query).get("id") or [""])[0]
            self.send_json({"ok": True, "progress": get_process_progress(progress_id)})
            return
        if parsed.path == "/api/output-path":
            self.send_json({"ok": True, "output_path": output_path_payload()})
            return
        if parsed.path == "/api/resource-file":
            resource_path = Path(unquote((parse_qs(parsed.query).get("path") or [""])[0])).expanduser().resolve()
            if not resource_path.is_file():
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            self.serve_file(resource_path, allow_range=resource_path.suffix.lower() in VIDEO_EXTENSIONS)
            return
        if parsed.path == "/":
            self.serve_app_file(APP_DIR / "index.html", content_type="text/html; charset=utf-8")
            return
        if parsed.path.startswith("/app/"):
            relative = parsed.path.removeprefix("/app/")
            self.serve_app_file(APP_DIR / relative)
            return
        if parsed.path.startswith("/media/upload/"):
            media_path = parsed.path.removeprefix("/media/upload/")
            if "/frames/" in media_path:
                upload_id, frame_index_text = media_path.split("/frames/", 1)
                frame_index = safe_int(frame_index_text.strip("/"), -1)
                frame_entries = source_frame_entries(upload_id)
                frame_entry = next((entry for entry in frame_entries if safe_int(entry.get("index"), -1) == frame_index), None)
                if not frame_entry:
                    self.send_error(HTTPStatus.NOT_FOUND)
                    return
                self.serve_media_file(Path(str(frame_entry.get("path") or "")), allow_range=False)
                return
            upload_id = media_path
            self.serve_media_file(source_video_path(upload_id), allow_range=True)
            return
        if parsed.path.startswith("/work/"):
            relative = parsed.path.removeprefix("/work/")
            self.serve_work_file((WORK_DIR / relative).resolve())
            return
        if parsed.path.startswith("/exports/"):
            relative = parsed.path.removeprefix("/exports/")
            self.serve_export_file((configured_exports_dir() / relative).resolve())
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        progress_id_for_error = ""
        try:
            if parsed.path == "/api/one-click-login":
                self.send_json({"ok": True, "auth": one_click_login_payload()})
                return
            if parsed.path == "/api/download-default-birefnet":
                result = download_default_birefnet_model()
                self.send_json({"ok": True, "download": result, "runtime": runtime_info()})
                return
            if parsed.path == "/api/model-download":
                payload = self.read_json_body()
                result = download_managed_model(str(payload.get("key") or "").strip())
                self.send_json({"ok": True, "result": result, **model_management_payload()})
                return
            if parsed.path == "/api/model-download-start":
                payload = self.read_json_body()
                result = start_model_download_task(str(payload.get("key") or "").strip())
                self.send_json({"ok": True, **result})
                return
            if parsed.path == "/api/model-uninstall":
                payload = self.read_json_body()
                result = uninstall_managed_model(str(payload.get("key") or "").strip())
                self.send_json({"ok": True, "result": result, **model_management_payload()})
                return
            if parsed.path == "/api/import-path":
                payload = self.read_json_body()
                raw_path = str(payload.get("path") or "").strip().strip("\"'")
                result = register_video_from_path(Path(raw_path))
                self.send_json({"ok": True, "upload": result})
                return
            if parsed.path == "/api/upload":
                form = cgi.FieldStorage(
                    fp=self.rfile,
                    headers=self.headers,
                    environ={
                        "REQUEST_METHOD": "POST",
                        "CONTENT_TYPE": self.headers.get("Content-Type", ""),
                        "CONTENT_LENGTH": self.headers.get("Content-Length", "0"),
                    },
                )
                file_items = field_storage_items(form, "video")
                if not file_items:
                    raise ValueError("media file missing")
                result = register_uploaded_media(file_items)
                self.send_json({"ok": True, "upload": result})
                return
            if parsed.path == "/api/import-animation":
                form = cgi.FieldStorage(
                    fp=self.rfile,
                    headers=self.headers,
                    environ={
                        "REQUEST_METHOD": "POST",
                        "CONTENT_TYPE": self.headers.get("Content-Type", ""),
                        "CONTENT_LENGTH": self.headers.get("Content-Length", "0"),
                    },
                )
                result = import_animation_frames_to_job(field_storage_items(form, "frames"))
                self.send_json({"ok": True, "job": result})
                return
            if parsed.path == "/api/line-cleaner-process":
                form = cgi.FieldStorage(
                    fp=self.rfile,
                    headers=self.headers,
                    environ={
                        "REQUEST_METHOD": "POST",
                        "CONTENT_TYPE": self.headers.get("Content-Type", ""),
                        "CONTENT_LENGTH": self.headers.get("Content-Length", "0"),
                    },
                )
                result = process_line_cleaner_frames(
                    field_storage_items(form, "frames"),
                    method=str(form.getfirst("method", "classic")),
                    scale=clamp_float(safe_float(form.getfirst("scale", form.getfirst("output_scale", 0.5)), 0.5), 0.05, 2.0),
                    alpha_cutoff=clamp_int(safe_int(form.getfirst("alpha_cutoff", 8), 8), 0, 255),
                    sharpen_percent=clamp_int(safe_int(form.getfirst("sharpen_percent", 80), 80), 0, 300),
                    color_count=clamp_int(safe_int(form.getfirst("color_count", 128), 128), 2, 256),
                )
                self.send_json({"ok": True, "result": result})
                return
            if parsed.path == "/api/dual-background-matte":
                form = cgi.FieldStorage(
                    fp=self.rfile,
                    headers=self.headers,
                    environ={
                        "REQUEST_METHOD": "POST",
                        "CONTENT_TYPE": self.headers.get("Content-Type", ""),
                        "CONTENT_LENGTH": self.headers.get("Content-Length", "0"),
                    },
                )
                result = dual_background_matte_job(form)
                self.send_json({"ok": True, "job": result})
                return
            if parsed.path == "/api/process":
                payload = self.read_json_body()
                progress_id_for_error = str(payload.get("progress_id") or "").strip()
                upload_id = str(payload.get("upload_id") or "")
                result = process_video_to_job(
                    upload_id=upload_id,
                    start_time=safe_float(payload.get("start_time"), 0.0),
                    end_time=safe_float(payload.get("end_time"), 0.0),
                    start_frame=safe_int(payload.get("start_frame"), 0),
                    end_frame=safe_int(payload.get("end_frame"), 0),
                    keep_every=max(1, safe_int(payload.get("keep_every"), 1)),
                    output_scale=output_scale_from_upload_payload(upload_id, payload),
                    reduce_px=max(0, safe_int(payload.get("reduce_px"), 0)),
                    canvas_mode=normalize_canvas_mode(str(payload.get("canvas_mode") or "auto")),
                    chroma_enabled=bool(payload.get("chroma_enabled", True)),
                    matte_mode=str(payload.get("matte_mode") or ""),
                    key_mode=str(payload.get("key_mode") or "auto"),
                    manual_key_hex=str(payload.get("manual_key_hex") or "#00FF00"),
                    threshold=max(0, safe_int(payload.get("threshold"), 80)),
                    softness=max(0, safe_int(payload.get("softness"), 32)),
                    despill_strength=max(0.0, safe_float(payload.get("despill_strength"), 0.85)),
                    halo_pixels=max(0, safe_int(payload.get("halo_pixels"), 1)),
                    ai_model=normalize_ai_model_key(str(payload.get("ai_model") or DEFAULT_AI_MATTE_MODEL)),
                    ai_device=normalize_ai_device(str(payload.get("ai_device") or "auto")),
                    ai_resolution=payload.get("ai_resolution"),
                    luma_black=max(0, min(254, safe_int(payload.get("luma_black"), 24))),
                    luma_white=max(1, min(255, safe_int(payload.get("luma_white"), 230))),
                    luma_gamma=max(0.05, safe_float(payload.get("luma_gamma"), 1.0)),
                    luma_strength=max(0.0, min(2.0, safe_float(payload.get("luma_strength"), 1.0))),
                    corridorkey_enabled=bool(payload.get("corridorkey_enabled", False)),
                    corridorkey_screen=normalize_corridorkey_screen(str(payload.get("corridorkey_screen") or "auto")),
                    batch_green_to_black=bool(payload.get("batch_green_to_black", False)),
                    batch_green_desaturate=bool(payload.get("batch_green_desaturate", False)),
                    batch_semitransparent_to_black=bool(payload.get("batch_semitransparent_to_black", False)),
                    batch_semitransparent_to_opaque=bool(payload.get("batch_semitransparent_to_opaque", False)),
                    progress_id=progress_id_for_error,
                )
                self.send_json({"ok": True, "job": result})
                return
            if parsed.path == "/api/matte-selected-frames":
                payload = self.read_json_body()
                progress_id_for_error = str(payload.get("progress_id") or "").strip()
                job_id = str(payload.get("job_id") or "")
                selected_indices_raw = payload.get("selected_indices") or []
                if not isinstance(selected_indices_raw, list):
                    selected_indices_raw = []
                source_manifest = load_job_manifest(job_id)
                result = matte_selected_frames_to_job(
                    source_job_id=job_id,
                    selected_indices=[safe_int(value, -1) for value in selected_indices_raw],
                    output_scale=output_scale_from_payload(payload, source_manifest.get("video_info") or {}),
                    reduce_px=max(0, safe_int(payload.get("reduce_px"), 0)),
                    canvas_mode=normalize_canvas_mode(str(payload.get("canvas_mode") or "auto")),
                    chroma_enabled=bool(payload.get("chroma_enabled", True)),
                    matte_mode=str(payload.get("matte_mode") or ""),
                    key_mode=str(payload.get("key_mode") or "auto"),
                    manual_key_hex=str(payload.get("manual_key_hex") or "#00FF00"),
                    threshold=max(0, safe_int(payload.get("threshold"), 80)),
                    softness=max(0, safe_int(payload.get("softness"), 32)),
                    despill_strength=max(0.0, safe_float(payload.get("despill_strength"), 0.85)),
                    halo_pixels=max(0, safe_int(payload.get("halo_pixels"), 1)),
                    ai_model=normalize_ai_model_key(str(payload.get("ai_model") or DEFAULT_AI_MATTE_MODEL)),
                    ai_device=normalize_ai_device(str(payload.get("ai_device") or "auto")),
                    ai_resolution=payload.get("ai_resolution"),
                    luma_black=max(0, min(254, safe_int(payload.get("luma_black"), 24))),
                    luma_white=max(1, min(255, safe_int(payload.get("luma_white"), 230))),
                    luma_gamma=max(0.05, safe_float(payload.get("luma_gamma"), 1.0)),
                    luma_strength=max(0.0, min(2.0, safe_float(payload.get("luma_strength"), 1.0))),
                    corridorkey_enabled=bool(payload.get("corridorkey_enabled", False)),
                    corridorkey_screen=normalize_corridorkey_screen(str(payload.get("corridorkey_screen") or "auto")),
                    batch_green_to_black=bool(payload.get("batch_green_to_black", False)),
                    batch_green_desaturate=bool(payload.get("batch_green_desaturate", False)),
                    batch_semitransparent_to_black=bool(payload.get("batch_semitransparent_to_black", False)),
                    batch_semitransparent_to_opaque=bool(payload.get("batch_semitransparent_to_opaque", False)),
                    progress_id=progress_id_for_error,
                )
                self.send_json({"ok": True, "job": result})
                return
            if parsed.path == "/api/preview-frame":
                payload = self.read_json_body()
                upload_id = str(payload.get("upload_id") or "")
                result = preview_frame(
                    upload_id=upload_id,
                    sample_time=safe_float(payload.get("sample_time"), 0.0),
                    sample_frame=safe_int(payload.get("sample_frame"), 1),
                    output_scale=output_scale_from_upload_payload(upload_id, payload),
                    reduce_px=max(0, safe_int(payload.get("reduce_px"), 0)),
                    canvas_mode=normalize_canvas_mode(str(payload.get("canvas_mode") or "auto")),
                    chroma_enabled=bool(payload.get("chroma_enabled", True)),
                    matte_mode=str(payload.get("matte_mode") or ""),
                    key_mode=str(payload.get("key_mode") or "auto"),
                    manual_key_hex=str(payload.get("manual_key_hex") or "#00FF00"),
                    threshold=max(0, safe_int(payload.get("threshold"), 80)),
                    softness=max(0, safe_int(payload.get("softness"), 32)),
                    despill_strength=max(0.0, safe_float(payload.get("despill_strength"), 0.85)),
                    halo_pixels=max(0, safe_int(payload.get("halo_pixels"), 1)),
                    ai_model=normalize_ai_model_key(str(payload.get("ai_model") or DEFAULT_AI_MATTE_MODEL)),
                    ai_device=normalize_ai_device(str(payload.get("ai_device") or "auto")),
                    ai_resolution=payload.get("ai_resolution"),
                    luma_black=max(0, min(254, safe_int(payload.get("luma_black"), 24))),
                    luma_white=max(1, min(255, safe_int(payload.get("luma_white"), 230))),
                    luma_gamma=max(0.05, safe_float(payload.get("luma_gamma"), 1.0)),
                    luma_strength=max(0.0, min(2.0, safe_float(payload.get("luma_strength"), 1.0))),
                    corridorkey_enabled=bool(payload.get("corridorkey_enabled", False)),
                    corridorkey_screen=normalize_corridorkey_screen(str(payload.get("corridorkey_screen") or "auto")),
                    batch_green_to_black=bool(payload.get("batch_green_to_black", False)),
                    batch_green_desaturate=bool(payload.get("batch_green_desaturate", False)),
                    batch_semitransparent_to_black=bool(payload.get("batch_semitransparent_to_black", False)),
                    batch_semitransparent_to_opaque=bool(payload.get("batch_semitransparent_to_opaque", False)),
                )
                self.send_json({"ok": True, "preview": result})
                return
            if parsed.path == "/api/save-preview":
                payload = self.read_json_body()
                result = save_preview_as_job(str(payload.get("preview_id") or ""))
                self.send_json({"ok": True, "job": result})
                return
            if parsed.path == "/api/preview-green-to-black":
                payload = self.read_json_body()
                result = green_to_black_preview(
                    str(payload.get("preview_id") or ""),
                    threshold=max(0, min(255, safe_int(payload.get("threshold"), 42))),
                    dominance=max(0, min(255, safe_int(payload.get("dominance"), 24))),
                )
                self.send_json({"ok": True, "preview": result})
                return
            if parsed.path == "/api/preview-green-desaturate":
                payload = self.read_json_body()
                result = green_desaturate_preview(
                    str(payload.get("preview_id") or ""),
                    threshold=max(0, min(255, safe_int(payload.get("threshold"), 42))),
                    dominance=max(0, min(255, safe_int(payload.get("dominance"), 24))),
                )
                self.send_json({"ok": True, "preview": result})
                return
            if parsed.path == "/api/preview-semitransparent-to-black":
                payload = self.read_json_body()
                result = semitransparent_to_black_preview(
                    str(payload.get("preview_id") or ""),
                    alpha_min=max(0, min(255, safe_int(payload.get("alpha_min"), 1))),
                    alpha_max=max(0, min(255, safe_int(payload.get("alpha_max"), 254))),
                )
                self.send_json({"ok": True, "preview": result})
                return
            if parsed.path == "/api/preview-semitransparent-to-opaque":
                payload = self.read_json_body()
                result = semitransparent_to_opaque_preview(
                    str(payload.get("preview_id") or ""),
                    alpha_min=max(0, min(255, safe_int(payload.get("alpha_min"), 1))),
                    alpha_max=max(0, min(255, safe_int(payload.get("alpha_max"), 254))),
                )
                self.send_json({"ok": True, "preview": result})
                return
            if parsed.path == "/api/preview-manual-point":
                payload = self.read_json_body()
                raw_points = payload.get("points") if isinstance(payload.get("points"), list) else None
                result = preview_manual_point_repair(
                    str(payload.get("preview_id") or ""),
                    x=safe_int(payload.get("x"), 0),
                    y=safe_int(payload.get("y"), 0),
                    mode=str(payload.get("mode") or "keep"),
                    radius=max(1, min(4096, safe_int(payload.get("radius"), 18))),
                    tolerance=max(0, min(255, safe_int(payload.get("tolerance"), 28))),
                    points=raw_points,
                    feather=max(0, min(4096, safe_int(payload.get("feather"), 6))),
                )
                self.send_json({"ok": True, "preview": result})
                return
            if parsed.path == "/api/preview-soften-alpha":
                payload = self.read_json_body()
                result = preview_soften_alpha_edges(
                    str(payload.get("preview_id") or ""),
                    radius=max(1, min(20, safe_int(payload.get("radius"), 2))),
                    passes=max(1, min(5, safe_int(payload.get("passes"), 1))),
                )
                self.send_json({"ok": True, "preview": result})
                return
            if parsed.path == "/api/preview-repair-history":
                payload = self.read_json_body()
                result = preview_repair_history(
                    str(payload.get("preview_id") or ""),
                    direction=str(payload.get("direction") or "undo"),
                )
                self.send_json({"ok": True, "preview": result})
                return
            if parsed.path == "/api/job-manual-point":
                payload = self.read_json_body()
                raw_points = payload.get("points") if isinstance(payload.get("points"), list) else None
                result = job_manual_point_repair(
                    str(payload.get("job_id") or ""),
                    frame_index=safe_int(payload.get("frame_index"), 0),
                    x=safe_int(payload.get("x"), 0),
                    y=safe_int(payload.get("y"), 0),
                    mode=str(payload.get("mode") or "keep"),
                    radius=max(1, min(4096, safe_int(payload.get("radius"), 18))),
                    tolerance=max(0, min(255, safe_int(payload.get("tolerance"), 28))),
                    points=raw_points,
                    feather=max(0, min(4096, safe_int(payload.get("feather"), 6))),
                )
                self.send_json({"ok": True, "job": result})
                return
            if parsed.path == "/api/job-soften-alpha":
                payload = self.read_json_body()
                result = job_soften_alpha_edges(
                    str(payload.get("job_id") or ""),
                    frame_index=safe_int(payload.get("frame_index"), 0),
                    radius=max(1, min(20, safe_int(payload.get("radius"), 2))),
                    passes=max(1, min(5, safe_int(payload.get("passes"), 1))),
                )
                self.send_json({"ok": True, "job": result})
                return
            if parsed.path == "/api/job-repair-history":
                payload = self.read_json_body()
                result = job_repair_history(
                    str(payload.get("job_id") or ""),
                    frame_index=safe_int(payload.get("frame_index"), 0),
                    direction=str(payload.get("direction") or "undo"),
                )
                self.send_json({"ok": True, "job": result})
                return
            if parsed.path == "/api/export":
                payload = self.read_json_body()
                result = export_job(
                    job_id=str(payload.get("job_id") or ""),
                    selected_indices=[safe_int(value, -1) for value in (payload.get("selected_indices") or [])],
                    video_duration_ms=safe_int(payload.get("video_duration_ms"), 100),
                )
                self.send_json({"ok": True, "export": result})
                return
            if parsed.path == "/api/process-video-export":
                payload = self.read_json_body()
                result = process_video_export(
                    upload_id=str(payload.get("upload_id") or ""),
                    options=payload,
                )
                self.send_json({"ok": True, "video": result})
                return
            if parsed.path == "/api/export-video-process-result":
                payload = self.read_json_body()
                result = export_video_process_result(
                    source=str(payload.get("path") or ""),
                    name=str(payload.get("name") or ""),
                )
                self.send_json({"ok": True, "video": result})
                return
            if parsed.path == "/api/register-job-frame-upload":
                payload = self.read_json_body()
                result = register_job_frame_as_upload(
                    job_id=str(payload.get("job_id") or ""),
                    frame_index=safe_int(payload.get("frame_index"), 0),
                )
                self.send_json({"ok": True, "upload": result})
                return
            if parsed.path == "/api/export-image-result":
                payload = self.read_json_body()
                result = export_image_result_job(job_id=str(payload.get("job_id") or ""))
                self.send_json({"ok": True, "export": result})
                return
            if parsed.path == "/api/export-image-split-result":
                payload = self.read_json_body()
                raw_items = payload.get("items") if isinstance(payload.get("items"), list) else []
                result = export_image_split_result_job(
                    job_id=str(payload.get("job_id") or ""),
                    items=raw_items,
                    export_mode=str(payload.get("export_mode") or "folder"),
                )
                self.send_json({"ok": True, "export": result})
                return
            if parsed.path == "/api/compress-image-split-result":
                payload = self.read_json_body()
                raw_items = payload.get("items") if isinstance(payload.get("items"), list) else []
                result = compress_image_split_result_job(
                    job_id=str(payload.get("job_id") or ""),
                    items=raw_items,
                    compression_level=str(payload.get("compression_level") or "balanced"),
                )
                self.send_json({"ok": True, "compression": result})
                return
            if parsed.path == "/api/magic-preview":
                if not MAGIC_PREVIEW_LOCK.acquire(blocking=False):
                    self.send_error_json("MAGIC 正在处理，请等当前任务结束后再点。", HTTPStatus.CONFLICT)
                    return
                payload = self.read_json_body()
                try:
                    result = magic_preview_job(
                        job_id=str(payload.get("job_id") or ""),
                        selected_indices=[safe_int(value, -1) for value in (payload.get("selected_indices") or [])],
                        resize_mode=str(payload.get("resize_mode") or MAGIC_RESIZE_MODE_DEFAULT),
                    )
                    self.send_json({"ok": True, "magic": result})
                finally:
                    MAGIC_PREVIEW_LOCK.release()
                return
            if parsed.path == "/api/export-magic-frames":
                payload = self.read_json_body()
                result = export_magic_frames(
                    str(payload.get("magic_id") or ""),
                    variant_key=str(payload.get("variant_key") or "half"),
                    video_duration_ms=safe_int(payload.get("video_duration_ms"), 100),
                )
                self.send_json({"ok": True, "export": result})
                return
            if parsed.path == "/api/output-path":
                payload = self.read_json_body()
                result = set_output_path(str(payload.get("path") or ""))
                self.send_json({"ok": True, "output_path": result})
                return
            if parsed.path == "/api/select-output-path":
                result = choose_output_path()
                self.send_json(
                    {
                        "ok": True,
                        "output_path": result,
                        "cancelled": bool(result.get("cancelled")),
                    }
                )
                return
            if parsed.path == "/api/select-resource-folder":
                result = choose_resource_folder()
                self.send_json(
                    {
                        "ok": True,
                        "folder": result,
                        "cancelled": bool(result.get("cancelled")),
                    }
                )
                return
            if parsed.path == "/api/resource-folder-assets":
                payload = self.read_json_body()
                result = scan_resource_folder(
                    str(payload.get("path") or ""),
                    limit=max(1, min(2000, safe_int(payload.get("limit"), 500))),
                )
                self.send_json({"ok": True, **result})
                return
            if parsed.path == "/api/resource-assets-delete":
                payload = self.read_json_body()
                raw_assets = payload.get("assets") if isinstance(payload.get("assets"), list) else []
                result = delete_resource_assets(str(payload.get("root") or ""), raw_assets)
                self.send_json({"ok": True, **result})
                return
            if parsed.path == "/api/resource-assets-move":
                payload = self.read_json_body()
                raw_assets = payload.get("assets") if isinstance(payload.get("assets"), list) else []
                result = move_resource_assets(
                    str(payload.get("root") or ""),
                    str(payload.get("target_relative_path") or ""),
                    raw_assets,
                )
                self.send_json({"ok": True, **result})
                return
            if parsed.path == "/api/open-path":
                payload = self.read_json_body()
                target = Path(str(payload.get("path") or "").strip()).expanduser().resolve()
                if not target.exists():
                    raise FileNotFoundError(target)
                open_path_in_file_browser(target)
                self.send_json({"ok": True})
                return
        except FileNotFoundError as exc:
            if progress_id_for_error:
                set_process_progress(progress_id_for_error, 0, 1, "error", done=True, error=str(exc))
            self.send_error_json(str(exc), status=HTTPStatus.NOT_FOUND)
            return
        except Exception as exc:
            if progress_id_for_error:
                set_process_progress(progress_id_for_error, 0, 1, "error", done=True, error=str(exc))
            self.send_error_json(str(exc), status=HTTPStatus.BAD_REQUEST)
            return

        self.send_error(HTTPStatus.NOT_FOUND)

    def read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length > 0 else b"{}"
        return json.loads(raw.decode("utf-8"))

    def serve_app_file(self, path: Path, content_type: str | None = None, allow_range: bool = False) -> None:
        if not is_within_root(path, APP_DIR):
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        self.serve_file(path, content_type=content_type, allow_range=allow_range, cache_control="no-store")

    def serve_work_file(self, path: Path, content_type: str | None = None, allow_range: bool = False) -> None:
        if not is_within_root(path, WORK_DIR):
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        self.serve_file(path, content_type=content_type, allow_range=allow_range)

    def serve_export_file(self, path: Path, content_type: str | None = None, allow_range: bool = False) -> None:
        export_root = configured_exports_dir()
        if not is_within_root(path, export_root):
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        self.serve_file(path, content_type=content_type, allow_range=allow_range)

    def serve_media_file(self, path: Path, content_type: str | None = None, allow_range: bool = False) -> None:
        self.serve_file(path, content_type=content_type, allow_range=allow_range)

    def serve_file(
        self,
        path: Path,
        content_type: str | None = None,
        allow_range: bool = False,
        cache_control: str | None = None,
    ) -> None:
        path = path.resolve()
        if not path.exists() or not path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        guessed_type = content_type or mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        file_size = path.stat().st_size
        range_header = self.headers.get("Range") if allow_range else None

        if range_header and range_header.startswith("bytes="):
            start_text, _, end_text = range_header.removeprefix("bytes=").partition("-")
            start = int(start_text or "0")
            end = int(end_text or file_size - 1)
            end = min(end, file_size - 1)
            if start > end:
                self.send_error(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
                return
            length = (end - start) + 1
            self.send_response(HTTPStatus.PARTIAL_CONTENT)
            self.send_header("Content-Type", guessed_type)
            if cache_control:
                self.send_header("Cache-Control", cache_control)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
            self.send_header("Content-Length", str(length))
            self.end_headers()
            with path.open("rb") as handle:
                handle.seek(start)
                self.wfile.write(handle.read(length))
            return

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", guessed_type)
        if cache_control:
            self.send_header("Cache-Control", cache_control)
        self.send_header("Content-Length", str(file_size))
        if allow_range:
            self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        with path.open("rb") as handle:
            shutil.copyfileobj(handle, self.wfile)


def serve_once(host: str, port: int) -> None:
    ensure_runtime_dirs()
    server = ThreadingHTTPServer((host, port), AppHandler)
    print(f"{PRODUCT_NAME} ({PRODUCT_NAME_ZH}) running at http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def stop_child_process(process: subprocess.Popen | None) -> None:
    if process is None or process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def run_with_reloader(host: str, port: int) -> None:
    ensure_runtime_dirs()
    watch_state = watch_snapshot()
    child: subprocess.Popen | None = None
    print(f"{PRODUCT_NAME} reloader watching {len(watch_state)} files.")
    try:
        while True:
            if child is None or child.poll() is not None:
                child = subprocess.Popen(
                    [
                        sys.executable,
                        str(ROOT_DIR / "server.py"),
                        "--serve",
                        "--host",
                        host,
                        "--port",
                        str(port),
                    ],
                    cwd=str(ROOT_DIR),
                )
            time.sleep(0.8)
            next_snapshot = watch_snapshot()
            if next_snapshot != watch_state:
                print(f"Changes detected. Reloading {PRODUCT_NAME}...")
                watch_state = next_snapshot
                stop_child_process(child)
                child = None
    except KeyboardInterrupt:
        pass
    finally:
        stop_child_process(child)


def main() -> None:
    parser = argparse.ArgumentParser(description=f"Run {PRODUCT_NAME}.")
    parser.add_argument("--serve", action="store_true", help="Run the HTTP server once without file watching.")
    parser.add_argument("--host", default=None, help=f"Host to bind. Defaults to ${HOST_ENV} or {DEFAULT_HOST}.")
    parser.add_argument("--port", type=int, default=None, help=f"Port to bind. Defaults to ${PORT_ENV} or {DEFAULT_PORT}.")
    args = parser.parse_args()
    host = configured_host(args.host)
    port = configured_port(args.port)
    if args.serve:
        serve_once(host, port)
        return
    run_with_reloader(host, port)


if __name__ == "__main__":
    main()
