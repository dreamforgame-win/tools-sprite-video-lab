# Game Art Style Guide Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete manual game-art style-guide loop: draft editing, immutable publishing, project default selection, deterministic task compilation, budgeted reference selection, generation snapshots, and removal of the old unique “confirmed project style” workflow.

**Architecture:** Add a file-backed `StyleGuideService` beside `ProjectService`, plus a pure `StyleGuideCompiler` that never calls remote AI. Keep UI-specific calculations in a browser utility file, render a dedicated guide editor from the existing workbench, and make the server compile a selected published version immediately before generation submission so preview and actual payload use the same rules.

**Tech Stack:** Python 3 standard library, Pillow, existing `ProjectService` and local HTTP server, vanilla HTML/CSS/JavaScript, `unittest`, Node `node:test`.

---

## Scope and delivery boundary

This plan delivers a working end-to-end feature without requiring a multimodal analysis provider. Users can manually create, edit, publish, set as default, and consume guide packages; a deterministic style board is rendered from selected real images.

The current codebase has no general image-understanding contract. AI-assisted draft generation and optional output consistency evaluation therefore remain separate follow-up plans that must target a real, configured multimodal provider. The core service and UI in this plan expose capability states and stable interfaces so those adapters can be added without changing published data or generation routing.

Git commit commands are documented for execution hygiene. Do not run a commit step until the user explicitly authorizes commits.

## File responsibility map

**Create**

- `style_guide_compiler.py` — pure asset-type routing, text budgets, conflict reporting, reference scoring and final compilation.
- `style_guide_service.py` — draft/version persistence, validation, publishing, default package state, source snapshots and compiler orchestration.
- `style_board_renderer.py` — deterministic Pillow layout for the human-facing board.
- `app/style-guide-utils.js` — pure browser helpers for status labels, module routing and display summaries.
- `tests/test_style_guide_compiler.py` — compiler behavior and reference-budget tests.
- `tests/test_style_guide_service.py` — storage, publishing, default and atomicity tests.
- `tests/test_style_board_renderer.py` — board dimensions and source-image composition tests.
- `tests/test_style_guide_utils.js` — browser helper tests.

**Modify**

- `project_service.py` — initialize guide storage paths, expose the default package field and stop enforcing a unique confirmed direction.
- `server.py` — instantiate the service, add guide APIs and compile guide input before image submission.
- `omnigen_service.py` — expose normalized server-side reference limits from model capabilities.
- `app/index.html` — load `style-guide-utils.js` before `app.js` and add the reusable guide editor shell.
- `app/app.js` — load guide state, render statuses/editor/production selector, call compile preview and submit the selection.
- `app/styles.css` — dense workbench styling for guide status, editor and generation summary.
- `docs/GENERATION_RULES.zh-CN.md` — replace unique-style confirmation rules with package publishing and modular runtime guidance.
- `tests/test_project_service.py` — migration and manifest defaults.
- `tests/test_omnigen_service.py` — model reference-limit normalization.
- `tests/test_style_content_interactions.js` — old confirmation UI removal and new guide entry checks.

**Identifier contract used throughout the plan**

- Guide documents and the nested generation request use `package_id` and `version_id`.
- Project defaults use `default_style_guide_package_id`; package summaries use `latest_published_version_id`.
- Flattened immutable history fields use `style_guide_package_id` and `style_guide_version_id`.
- Fixed module IDs are exactly `environment`, `character`, `ui_hud`, `skill_vfx`, and `props_equipment`.
- Mode values are exactly `economy`, `balanced`, and `precision`; the UI label for `balanced` is “智能平衡”.

## Phase A — File-backed guide core

### Task 1: Deterministic guide compiler

**Files:**

- Create: `style_guide_compiler.py`
- Create: `tests/test_style_guide_compiler.py`

- [ ] **Step 1: Write failing routing and budget tests**

```python
import unittest

from style_guide_compiler import compile_style_guide


def published_version():
    return {
        "id": "guidever_pixel_v1",
        "package_id": "guide_pixel",
        "core": {
            "prompt_fragment": "soft low-saturation eastern pixel art",
            "negative_fragment": "photorealistic, neon",
            "references": [
                {"id": "core-shape", "relative_path": "production/images/core.png", "roles": ["shape"], "priority": 80, "quality": 90}
            ],
        },
        "modules": {
            "character": {
                "enabled": True,
                "prompt_fragment": "clear silhouette, layered cloth and wood",
                "negative_fragment": "modern streetwear",
                "references": [
                    {"id": "char-silhouette", "relative_path": "production/images/char-a.png", "roles": ["silhouette"], "priority": 95, "quality": 90},
                    {"id": "char-material", "relative_path": "production/images/char-b.png", "roles": ["material"], "priority": 85, "quality": 90},
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
        self.assertIn("missing_reference", {item["code"] for item in result["blocking_warnings"]})
```

- [ ] **Step 2: Run the tests and verify the missing module failure**

Run: `.venv-ai\Scripts\python.exe -m unittest tests.test_style_guide_compiler -v`

Expected: `ModuleNotFoundError: No module named 'style_guide_compiler'`.

- [ ] **Step 3: Implement routing constants, budgets and reference selection**

```python
MODE_BUDGETS = {
    "economy": {"token_budget": 450, "reference_budget": 1, "module_budget": 1},
    "balanced": {"token_budget": 900, "reference_budget": 2, "module_budget": 1},
    "precision": {"token_budget": 1600, "reference_budget": 4, "module_budget": 2},
}

ASSET_MODULE_ROUTES = {
    "environment": ["environment"],
    "scene": ["environment"],
    "character": ["character"],
    "creature": ["character"],
    "ui": ["ui_hud"],
    "hud": ["ui_hud"],
    "skill": ["skill_vfx"],
    "skill_icon": ["skill_vfx", "ui_hud"],
    "vfx": ["skill_vfx"],
    "prop": ["props_equipment"],
    "equipment": ["props_equipment"],
    "weapon": ["props_equipment"],
}


def _reference_score(reference, seen_roles):
    roles = {str(role) for role in reference.get("roles") or []}
    coverage = len(roles - seen_roles) * 30
    priority = max(0, min(100, int(reference.get("priority") or 0)))
    quality = max(0, min(100, int(reference.get("quality") or 0)))
    return coverage + priority * 0.5 + quality * 0.2


def _select_references(candidates, limit):
    selected = []
    seen_roles = set()
    remaining = [dict(item) for item in candidates if item.get("relative_path")]
    while remaining and len(selected) < limit:
        remaining.sort(key=lambda item: _reference_score(item, seen_roles), reverse=True)
        chosen = remaining.pop(0)
        selected.append(chosen)
        seen_roles.update(str(role) for role in chosen.get("roles") or [])
    return selected
```

Implement `compile_style_guide(version, *, asset_type, prompt, mode, model_reference_limit, module_overrides=None, reference_overrides=None, style_strength=70, conflict_resolutions=None)` so it returns `positive_prompt`, `negative_prompt`, `module_types`, `references`, `warnings`, `blocking_warnings`, `can_continue`, and `budget` and never mutates the input version. Clamp `style_strength` to `0..100`, preserve it in `budget`, and use deterministic low/standard/high wording bands only around the style fragments; it must not alter the user's subject, count, action, or function requirements.

Every warning has `code`, `severity`, `message`, and structured `details`. Economy and balanced may trim optional references while returning `can_continue: true`; they still expose the degradation in `warnings`. Precision returns `can_continue: false` and copies the relevant entries into `blocking_warnings` when a required reference is missing/invalid or when the model limit makes the required set impossible. Prompt conflicts remain visible but do not silently rewrite user text.

- [ ] **Step 4: Add conflict and unknown-asset tests, then implement warnings**

```python
def test_unknown_asset_uses_core_and_warns(self):
    result = compile_style_guide(
        published_version(), asset_type="unknown", prompt="object", mode="balanced", model_reference_limit=12
    )
    self.assertEqual(result["module_types"], [])
    self.assertIn("module_required", {item["code"] for item in result["warnings"]})

def test_prompt_conflict_is_visible(self):
    result = compile_style_guide(
        published_version(), asset_type="character", prompt="photorealistic portrait", mode="balanced", model_reference_limit=12
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
```

Conflict detection must compare normalized user-prompt terms with structured `forbidden_terms`; it must report the conflicting terms and never delete user text. An unresolved conflict is blocking. `conflict_resolutions` accepts per-term `preserve_task`, `preserve_guide`, or `disable_rule`: `preserve_task`/`disable_rule` omit only the conflicting guide constraint for this compile, while `preserve_guide` stays blocked until the user edits the task prompt.

- [ ] **Step 5: Run the compiler tests**

Run: `.venv-ai\Scripts\python.exe -m unittest tests.test_style_guide_compiler -v`

Expected: all compiler tests pass.

- [ ] **Step 6: Commit if authorized**

```powershell
git add style_guide_compiler.py tests/test_style_guide_compiler.py
git commit -m "feat: add deterministic style guide compiler"
```

### Task 2: Guide package storage and manual drafts

**Files:**

- Create: `style_guide_service.py`
- Create: `tests/test_style_guide_service.py`
- Modify: `project_service.py:203-220`
- Modify: `project_service.py:386-405`

- [ ] **Step 1: Write failing initialization and draft tests**

```python
import copy
import tempfile
import unittest
from pathlib import Path

from project_service import ProjectService
from style_guide_service import StyleGuideService


class StyleGuideServiceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.projects = ProjectService(Path(self.temp.name) / "work")
        self.guides = StyleGuideService(self.projects)
        self.direction = self.projects.create_style_direction("default", name="Pixel Garden")

    def tearDown(self):
        self.temp.cleanup()

    def test_create_manual_draft_initializes_required_core(self):
        package = self.guides.create_draft("default", self.direction["id"])
        draft = self.guides.get_draft("default", package["id"])
        self.assertEqual(package["style_direction_id"], self.direction["id"])
        self.assertIn("vision_statement", draft["core"])
        self.assertEqual(draft["modules"], {})

    def test_direction_has_only_one_active_package(self):
        first = self.guides.create_draft("default", self.direction["id"])
        second = self.guides.create_draft("default", self.direction["id"])
        self.assertEqual(first["id"], second["id"])
```

- [ ] **Step 2: Run and verify the missing service failure**

Run: `.venv-ai\Scripts\python.exe -m unittest tests.test_style_guide_service.StyleGuideServiceTests.test_create_manual_draft_initializes_required_core -v`

Expected: import failure for `style_guide_service`.

- [ ] **Step 3: Add project paths and manifest defaults**

Add these entries to `ProjectService._project_paths`:

```python
"style_guide_registry": marker / "style-guide-packages.json",
"style_guide_root": marker / "style-guides",
```

Initialize the registry during project creation:

```python
self._atomic_write_json(
    paths["style_guide_registry"],
    {"schema_version": 1, "project_id": project_id, "packages": []},
)
paths["style_guide_root"].mkdir(parents=True, exist_ok=True)
```

Add `default_style_guide_package_id` with an empty-string default in new and existing manifests.

- [ ] **Step 4: Implement `StyleGuideService` draft persistence**

The constructor accepts `ProjectService`. Implement atomic JSON replacement with `NamedTemporaryFile` in the destination directory and `Path.replace`. Use a service `RLock` around registry, draft, publish and default mutations.

Required public methods in this task:

```python
class StyleGuideService:
    MODULE_TYPES = {"environment", "character", "ui_hud", "skill_vfx", "props_equipment"}

    def __init__(self, project_service):
        self.projects = project_service
        self._lock = threading.RLock()

    def list_packages(self, project_id):
        return copy.deepcopy(self._read_registry(project_id)["packages"])

    def create_draft(self, project_id, style_direction_id):
        return self._create_or_return_package(project_id, style_direction_id)

    def get_draft(self, project_id, package_id):
        return copy.deepcopy(self._read_draft(project_id, package_id))

    def save_draft(self, project_id, package_id, draft):
        normalized = self._normalize_draft(package_id, draft)
        self._atomic_write_json(self._draft_path(project_id, package_id), normalized)
        return copy.deepcopy(normalized)
```

Draft normalization must retain only documented core fields, known module types, valid reference entries and bounded strings; reject package-ID mismatches with `ProjectError`.

- [ ] **Step 5: Run service and existing project tests**

Run: `.venv-ai\Scripts\python.exe -m unittest tests.test_style_guide_service tests.test_project_service -v`

Expected: all tests pass.

- [ ] **Step 6: Commit if authorized**

```powershell
git add style_guide_service.py project_service.py tests/test_style_guide_service.py tests/test_project_service.py
git commit -m "feat: add file-backed style guide drafts"
```

### Task 3: Immutable publishing and project default

**Files:**

- Modify: `style_guide_service.py`
- Modify: `project_service.py:908-949`
- Modify: `tests/test_style_guide_service.py`
- Modify: `tests/test_project_service.py`

- [ ] **Step 1: Write failing publish/default tests**

```python
def valid_draft(package_id):
    return {
        "package_id": package_id,
        "core": {
            "vision_statement": "Quiet eastern pixel-art garden",
            "themes": ["quiet", "handcrafted"],
            "motifs": ["curved roof", "pine"],
            "shape_language": "rounded silhouettes with clear pixel clusters",
            "palette": ["#263d34", "#86a76d", "#d8d0b4"],
            "materials_lighting": "wood, grey tile, soft diffuse light",
            "rendering": "clean pixel clusters, no photographic texture",
            "dos": ["clear silhouette"],
            "donts": ["photorealistic", "neon"],
            "prompt_fragment": "quiet handcrafted eastern pixel art",
            "negative_fragment": "photorealistic, neon",
            "references": [],
        },
        "modules": {},
    }


def test_publish_creates_immutable_version(self):
    package = self.guides.create_draft("default", self.direction["id"])
    self.guides.save_draft("default", package["id"], valid_draft(package["id"]))
    version = self.guides.publish("default", package["id"])
    self.assertEqual(version["version"], 1)
    self.assertTrue(self.guides.get_version("default", package["id"], version["id"])["published_at"])

def test_set_default_requires_published_version(self):
    package = self.guides.create_draft("default", self.direction["id"])
    with self.assertRaisesRegex(Exception, "published"):
        self.guides.set_default("default", package["id"])
```

- [ ] **Step 2: Run the two tests and verify they fail for missing methods**

Run: `.venv-ai\Scripts\python.exe -m unittest tests.test_style_guide_service.StyleGuideServiceTests.test_publish_creates_immutable_version tests.test_style_guide_service.StyleGuideServiceTests.test_set_default_requires_published_version -v`

Expected: `AttributeError` for `publish` and `set_default`.

- [ ] **Step 3: Implement validation, source snapshot and atomic publish**

Add methods:

```python
def validate_draft(self, project_id, package_id):
    draft = self._read_draft(project_id, package_id)
    errors = []
    if not str(draft.get("core", {}).get("vision_statement") or "").strip():
        errors.append({"field": "core.vision_statement", "message": "视觉基因摘要不能为空"})
    if not str(draft.get("core", {}).get("prompt_fragment") or "").strip():
        errors.append({"field": "core.prompt_fragment", "message": "全局提示片段不能为空"})
    return {"valid": not errors, "errors": errors, "warnings": self._reference_warnings(project_id, draft)}

def publish(self, project_id, package_id):
    report = self.validate_draft(project_id, package_id)
    if not report["valid"]:
        raise ProjectError("Style guide draft is incomplete")
    return self._publish_version_atomically(project_id, package_id, report)
```

Write the version file first, then update the registry pointer. If registry replacement fails, remove the new version file. Version IDs use `guidever_<uuid>` and version numbers increase from the registry value.

Each published reference snapshot stores `id`, `relative_path`, `content_sha256`, `source_record_id`, `remote_asset_id`, `roles`, `priority`, `quality`, `required`, and availability status. Resolve `source_record_id` against existing OmniGen history during publish; when the source was generated through MCP, retain its `result_asset_id` as `remote_asset_id`. Do not upload anything during publishing.

- [ ] **Step 4: Implement default setting in the project manifest**

Add `default_style_guide_package_id` to `ProjectService.update_project` allowed fields. `StyleGuideService.set_default` must verify `latest_published_version_id`, call `update_project`, and return the updated package summary.

- [ ] **Step 5: Add immutable-version and default-removal regression tests**

Verify a second publish creates version 2 without changing version 1, and clearing/deleting the default package leaves `default_style_guide_package_id` empty rather than choosing another package.

- [ ] **Step 6: Run tests**

Run: `.venv-ai\Scripts\python.exe -m unittest tests.test_style_guide_service tests.test_project_service -v`

Expected: all tests pass.

- [ ] **Step 7: Commit if authorized**

```powershell
git add style_guide_service.py project_service.py tests/test_style_guide_service.py tests/test_project_service.py
git commit -m "feat: publish immutable style guide versions"
```

### Task 4: Deterministic human-facing style board

**Files:**

- Create: `style_board_renderer.py`
- Create: `tests/test_style_board_renderer.py`
- Modify: `style_guide_service.py`

- [ ] **Step 1: Write a failing board-render test**

```python
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from style_board_renderer import render_style_board


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
                self.assertNotEqual(board.getpixel((180, 260)), (255, 255, 255))
```

- [ ] **Step 2: Run and verify the missing renderer failure**

Run: `.venv-ai\Scripts\python.exe -m unittest tests.test_style_board_renderer -v`

Expected: import failure for `style_board_renderer`.

- [ ] **Step 3: Implement a fixed 16:9 layout with Pillow**

`render_style_board` must create a 1600×900 RGB image, place up to six source images with `ImageOps.contain`, draw palette chips, title and summary, and use `ImageFont.load_default()` when a Chinese-capable configured font is unavailable. It must never call a generation provider.

```python
def render_style_board(output_path, *, title, summary, palette, image_paths):
    board = Image.new("RGB", (1600, 900), "#f2f4f3")
    draw = ImageDraw.Draw(board)
    slots = [(48, 120, 900, 820), (924, 120, 1320, 450), (1344, 120, 1552, 450), (924, 474, 1230, 700)]
    for path, box in zip(image_paths[:4], slots):
        with Image.open(path) as source:
            tile = ImageOps.contain(source.convert("RGB"), (box[2] - box[0], box[3] - box[1]))
            x = box[0] + (box[2] - box[0] - tile.width) // 2
            y = box[1] + (box[3] - box[1] - tile.height) // 2
            board.paste(tile, (x, y))
    draw.text((48, 42), title[:80], fill="#17211c")
    draw.text((924, 742), summary[:240], fill="#445149")
    board.save(output_path, format="PNG", optimize=True)
```

Expand the implementation with palette chips and safe blank slots while preserving the tested dimensions.

- [ ] **Step 4: Render the board during publish and persist its relative path**

Resolve reference paths under the project root, skip missing files with validation warnings, render to `production/style-guides/<package-id>/<version-id>/style-board.png`, and store `style_board_relative_path` in the published version.

- [ ] **Step 5: Run renderer and service tests**

Run: `.venv-ai\Scripts\python.exe -m unittest tests.test_style_board_renderer tests.test_style_guide_service -v`

Expected: all tests pass.

- [ ] **Step 6: Commit if authorized**

```powershell
git add style_board_renderer.py style_guide_service.py tests/test_style_board_renderer.py tests/test_style_guide_service.py
git commit -m "feat: render deterministic style guide boards"
```

## Phase B — API and model capability integration

### Task 5: Model reference limits and guide API routes

**Files:**

- Modify: `omnigen_service.py:1216-1272`
- Modify: `server.py:38-45`
- Modify: `server.py:6959-6970`
- Modify: `server.py:7187-7220`
- Modify: `server.py:7874-7890`
- Modify: `tests/test_omnigen_service.py`

- [ ] **Step 1: Add a failing model-normalization test**

```python
def test_normalizes_reference_image_limit(self):
    payload = {
        "models": [
            {"id": "image-model", "modality": "image", "capabilities": {"max_reference_images": 4}}
        ]
    }
    models = OmniGenService._normalize_image_models(payload)
    self.assertEqual(models[0]["max_reference_images"], 4)
```

- [ ] **Step 2: Run and verify the assertion failure**

Run: `.venv-ai\Scripts\python.exe -m unittest tests.test_omnigen_service.OmniGenOperationsTests.test_normalizes_reference_image_limit -v`

Expected: failure because the normalized model lacks `max_reference_images`.

- [ ] **Step 3: Normalize the limit and add a lookup method**

Normalize `max_reference_images`, `reference_image_limit`, and `max_input_images` into `max_reference_images`, defaulting to 0 when unspecified. Add `image_model_capability(model_id)` that returns the normalized model or an empty capability object.

- [ ] **Step 4: Instantiate the guide service and add GET routes**

At server startup:

```python
STYLE_GUIDE_SERVICE = StyleGuideService(PROJECT_SERVICE)
```

Add GET routes for package list, package detail, draft, version and capability state. Capability state is explicit and stable in the manual core:

```json
{
  "manual_authoring": true,
  "automatic_analysis": false,
  "automatic_analysis_reason": "No multimodal style-guide analyzer is configured"
}
```

File URLs for board and references must use the existing project file endpoint.

- [ ] **Step 5: Add POST/PATCH routes**

Add these exact operations:

- `POST /api/v1/projects/{projectId}/styles/{directionId}/style-guide/draft`
- `PATCH /api/v1/projects/{projectId}/style-guides/{packageId}/draft`
- `POST /api/v1/projects/{projectId}/style-guides/{packageId}/publish`
- `POST /api/v1/projects/{projectId}/style-guides/{packageId}/default`
- `POST /api/v1/projects/{projectId}/style-guides/{packageId}/compile-preview`

Compile preview receives `version_id`, `asset_type`, `prompt`, `mode`, `module_types`, `reference_ids`, and `model`; the server derives `max_reference_images` from the normalized provider capability.

- [ ] **Step 6: Run Python syntax and focused tests**

Run: `.venv-ai\Scripts\python.exe -m py_compile server.py style_guide_service.py style_guide_compiler.py style_board_renderer.py`

Run: `.venv-ai\Scripts\python.exe -m unittest tests.test_omnigen_service tests.test_style_guide_service tests.test_style_guide_compiler -v`

Expected: syntax succeeds and all focused tests pass.

- [ ] **Step 7: Commit if authorized**

```powershell
git add omnigen_service.py server.py tests/test_omnigen_service.py
git commit -m "feat: expose style guide APIs and model limits"
```

## Phase C — Browser utilities and style-guide workspace

### Task 6: Pure browser guide helpers

**Files:**

- Create: `app/style-guide-utils.js`
- Create: `tests/test_style_guide_utils.js`
- Modify: `app/index.html:2319-2320`

- [ ] **Step 1: Write failing Node tests**

```javascript
const assert = require("node:assert/strict");
const test = require("node:test");

const {
  guideStatusLabel,
  defaultGuideModulesForAssetType,
  guideBudgetSummary,
} = require("../app/style-guide-utils.js");

test("maps character assets to the character module", () => {
  assert.deepEqual(defaultGuideModulesForAssetType("character"), ["character"]);
});

test("skill icons combine VFX and compact UI guidance", () => {
  assert.deepEqual(defaultGuideModulesForAssetType("skill_icon"), ["skill_vfx", "ui_hud"]);
});

test("balanced summary reports two references", () => {
  assert.equal(guideBudgetSummary("balanced", 12).referenceLimit, 2);
});

test("published default status is explicit", () => {
  assert.equal(
    guideStatusLabel({latest_published_version_id: "v1"}, {isDefault: true}),
    "已发布 · 项目默认",
  );
});
```

- [ ] **Step 2: Run and verify the missing file failure**

Run: `node --test tests/test_style_guide_utils.js`

Expected: module-not-found failure.

- [ ] **Step 3: Implement a UMD-style utility module**

Use the same CommonJS/browser export pattern as `generation-utils.js`:

```javascript
(function attachStyleGuideUtils(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StyleGuideUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createStyleGuideUtils() {
  const routes = {
    environment: ["environment"], scene: ["environment"], character: ["character"],
    creature: ["character"], ui: ["ui_hud"], hud: ["ui_hud"],
    skill: ["skill_vfx"], skill_icon: ["skill_vfx", "ui_hud"],
    prop: ["props_equipment"], equipment: ["props_equipment"], weapon: ["props_equipment"],
  };
  const budgets = {economy: 1, balanced: 2, precision: 4};
  return {
    defaultGuideModulesForAssetType: (type) => [...(routes[type] || [])],
    guideBudgetSummary: (mode, modelLimit) => ({referenceLimit: Math.min(budgets[mode] || 2, Math.max(0, Number(modelLimit || 0)))}),
    guideStatusLabel: (item, options = {}) => options.isDefault ? "已发布 · 项目默认" : item?.latest_published_version_id ? "已发布" : item?.draft_revision ? "草稿" : "未生成",
  };
});
```

- [ ] **Step 4: Load the utility before `app.js` and run tests**

Add `<script src="/app/style-guide-utils.js"></script>` after `generation-utils.js`.

Run: `node --test tests/test_style_guide_utils.js`

Expected: all tests pass.

- [ ] **Step 5: Commit if authorized**

```powershell
git add app/style-guide-utils.js app/index.html tests/test_style_guide_utils.js
git commit -m "feat: add browser style guide helpers"
```

### Task 7: Load guide state and replace unique-style confirmation UI

**Files:**

- Modify: `app/app.js:2297-2338`
- Modify: `app/app.js:2479-2532`
- Modify: `app/app.js:3414-3426`
- Modify: `app/app.js:4524-4624`
- Modify: `app/app.js:18824-18834`
- Modify: `app/styles.css`
- Modify: `tests/test_style_content_interactions.js`

- [ ] **Step 1: Add failing source-level UI assertions**

```javascript
test("style directions expose guide status instead of project-style confirmation", () => {
  const list = functionSource("renderStyleDirectionList", "renderStyleContentToolbar");
  assert.match(list, /style-guide-status/);
  assert.match(list, /latest_published_version_id/);
  assert.doesNotMatch(source, /已确认为项目风格/);
  assert.doesNotMatch(source, /settings-unconfirm-style/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test --test-name-pattern "guide status" tests/test_style_content_interactions.js`

Expected: assertion failure because the old confirmation UI remains.

- [ ] **Step 3: Add guide state loading**

Extend `state.projectAssets` with `styleGuides`, `selectedStyleGuidePackageId`, `styleGuideWorkspaceOpen`, and `styleGuideDraft`. Load `/style-guides` beside styles in the existing project-asset load sequence and merge guide summary fields into each direction by `style_direction_id`.

- [ ] **Step 4: Replace direction and settings status**

Direction rows show `未生成`, `草稿`, `已发布 vN`, and `项目默认`. Replace the settings “当前项目风格” card with a default-guide selector listing published packages and an explicit “无默认指导包” choice.

Delete client actions that patch `style_status`, `current_style_direction_id`, confirm other styles, archive sibling styles, or unconfirm the project style.

- [ ] **Step 5: Add actions for guide entry and default setting**

Add `style-guide-create`, `style-guide-edit`, `style-guide-view`, and `style-guide-set-default` project actions. Creation calls the manual-draft endpoint and opens the dedicated workspace.

- [ ] **Step 6: Run Node tests and syntax**

Run: `node --test tests/test_style_content_interactions.js tests/test_style_guide_utils.js`

Run: `node --check app/app.js`

Expected: all tests and syntax pass.

- [ ] **Step 7: Commit if authorized**

```powershell
git add app/app.js app/styles.css tests/test_style_content_interactions.js
git commit -m "feat: replace confirmed style with guide package status"
```

### Task 8: Dedicated guide editor and publish check

**Files:**

- Modify: `app/index.html`
- Modify: `app/app.js`
- Modify: `app/styles.css`
- Create: `tests/test_style_guide_workspace.js`

- [ ] **Step 1: Write failing workspace structure tests**

```javascript
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.resolve(__dirname, "..", "app", "app.js"), "utf8");

test("guide workspace contains core and fixed game-art modules", () => {
  assert.match(source, /renderStyleGuideWorkspace/);
  for (const type of ["environment", "character", "ui_hud", "skill_vfx", "props_equipment"]) {
    assert.match(source, new RegExp(type));
  }
  assert.match(source, /发布新版本/);
});
```

- [ ] **Step 2: Run and verify the missing renderer failure**

Run: `node --test tests/test_style_guide_workspace.js`

Expected: assertion failure for `renderStyleGuideWorkspace`.

- [ ] **Step 3: Implement the workspace layout**

Render a full workbench body instead of the normal three-column style explorer while `styleGuideWorkspaceOpen` is true. The top bar contains back, source revision, save, validation and publish. The main body uses two columns: board/reference selection on the left and core/module editor on the right.

The module navigation uses fixed identifiers and enable switches. Each module editor contains summary, rules, dos, donts, positive fragment, negative fragment and selected reference rows with role and priority controls. Show “人工整理可用” and the capability reason beside the disabled automatic-analysis entry; manual create/save/publish must remain fully usable.

- [ ] **Step 4: Implement save and publish actions**

Serialize fields into the documented draft schema, PATCH the draft, show server validation errors next to fields, and publish only after an explicit click. After publish, reload guide summaries and return to the direction with `已发布 vN` visible.

- [ ] **Step 5: Add manual reference selection**

Reuse the direction’s existing reference and generation-result candidates. Reference selection stores stable content IDs, relative paths, roles, priority and quality; it does not copy image files.

- [ ] **Step 6: Add dense editor styles**

Use the existing workbench tokens, internal scrolling, fixed action bar and responsive two-column-to-one-column collapse. Do not introduce landing-page cards or decorative hero content.

- [ ] **Step 7: Run tests and syntax**

Run: `node --test tests/test_style_guide_workspace.js tests/test_style_content_interactions.js`

Run: `node --check app/app.js`

Expected: all pass.

- [ ] **Step 8: Commit if authorized**

```powershell
git add app/index.html app/app.js app/styles.css tests/test_style_guide_workspace.js
git commit -m "feat: add game art style guide workspace"
```

## Phase D — Asset production compilation and snapshots

### Task 9: Production guide selector and compile preview

**Files:**

- Modify: `app/index.html`
- Modify: `app/app.js:18791-18860`
- Modify: `app/app.js:19117-19166`
- Modify: `app/styles.css`
- Create: `tests/test_style_guide_generation.js`

- [ ] **Step 1: Write failing generation-selector tests**

```javascript
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.resolve(__dirname, "..", "app", "app.js"), "utf8");

test("image generation submits a guide package selection", () => {
  assert.match(source, /style_guide_package_id/);
  assert.match(source, /style_guide_mode/);
  assert.match(source, /style_guide_module_types/);
  assert.match(source, /compile-preview/);
});
```

- [ ] **Step 2: Run and verify the assertions fail**

Run: `node --test tests/test_style_guide_generation.js`

Expected: missing guide selection fields.

- [ ] **Step 3: Add compact generation controls**

Add a published-guide select, mode select (`economy`, `balanced`, `precision`), `0..100` style-strength control defaulting to `70`, module chips, actual reference count, warning summary, “查看并调整本次引用”, and “不使用风格”. Initialize the package from `default_style_guide_package_id` and derive modules from the selected asset node type.

- [ ] **Step 4: Call compile preview with debouncing**

When prompt, asset node, model, package, mode or overrides change, wait 180 ms and POST compile preview. Discard stale responses with an incrementing request ID. Render returned references, roles, warnings and budget; do not locally invent the final model payload.

For each `prompt_conflict`, require one explicit per-term choice: “保留任务要求”, “保留指导规则”, or “关闭本次对应规则”. Store it in `conflict_resolutions`, recompile, and leave submit disabled while `can_continue` is false. If the configured default package or version is unavailable, select “不使用风格”, show a `missing_published_version` warning, and never silently substitute another package.

- [ ] **Step 5: Submit only selection and explicit overrides**

Add this object to the generation request:

```javascript
style_guide: {
  package_id: selectedPackageId,
  version_id: selectedVersionId,
  mode: selectedMode,
  style_strength: selectedStyleStrength,
  module_types: selectedModuleTypes,
  reference_ids: selectedReferenceIds,
  prompt_override: promptOverride,
  negative_override: negativeOverride,
  conflict_resolutions: selectedConflictResolutions,
}
```

Keep user-uploaded task references separate from guide references.

- [ ] **Step 6: Run tests and syntax**

Run: `node --test tests/test_style_guide_generation.js tests/test_style_guide_utils.js`

Run: `node --check app/app.js`

Expected: all pass.

- [ ] **Step 7: Commit if authorized**

```powershell
git add app/index.html app/app.js app/styles.css tests/test_style_guide_generation.js
git commit -m "feat: select style guides in image generation"
```

### Task 10: Server-side compilation and immutable generation snapshot

**Files:**

- Modify: `style_guide_service.py`
- Modify: `server.py:7294-7325`
- Modify: `omnigen_service.py`
- Modify: `tests/test_style_guide_service.py`
- Modify: `tests/test_omnigen_service.py`

- [ ] **Step 1: Write a failing compile-for-generation service test**

```python
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
    result = copy.deepcopy(package)
    result["latest_published_version_id"] = version["id"]
    return result

def test_compile_for_generation_returns_snapshot_and_relative_paths(self):
    package = self._published_character_package()
    compiled = self.guides.compile_for_generation(
        "default",
        package_id=package["id"],
        version_id=package["latest_published_version_id"],
        asset_type="character",
        prompt="village herbalist",
        mode="balanced",
        model_reference_limit=4,
        overrides={},
    )
    self.assertEqual(compiled["snapshot"]["style_guide_package_id"], package["id"])
    self.assertLessEqual(len(compiled["reference_paths"]), 2)
    self.assertIn("village herbalist", compiled["final_prompt"])

def test_mcp_generated_reference_keeps_remote_asset_identity(self):
    package = self._published_character_package(
        reference={
            "id": "generated-character",
            "relative_path": "omnigen/results/generated.png",
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
        version_id=package["latest_published_version_id"],
        asset_type="character",
        prompt="variation",
        mode="balanced",
        model_reference_limit=4,
        overrides={"style_strength": 70},
    )
    reference = compiled["snapshot"]["style_guide_reference_snapshot"][0]
    self.assertEqual(reference["remote_asset_id"], "asset-generated")
```

- [ ] **Step 2: Run and verify the missing method failure**

Run: `.venv-ai\Scripts\python.exe -m unittest tests.test_style_guide_service.StyleGuideServiceTests.test_compile_for_generation_returns_snapshot_and_relative_paths -v`

Expected: `AttributeError` for `compile_for_generation`.

- [ ] **Step 3: Implement service orchestration**

Load the exact published version, call `compile_style_guide`, combine user and guide negative prompts without duplicates, resolve reference relative paths under the same project, and return:

```python
{
    "final_prompt": final_prompt,
    "final_negative_prompt": final_negative_prompt,
    "reference_paths": reference_paths,
    "warnings": compiled["warnings"],
    "blocking_warnings": compiled["blocking_warnings"],
    "can_continue": compiled["can_continue"],
    "budget": compiled["budget"],
    "snapshot": {
        "style_guide_package_id": package_id,
        "style_guide_version_id": version_id,
        "style_guide_mode": mode,
        "style_guide_module_types": compiled["module_types"],
        "style_guide_reference_snapshot": compiled["references"],
        "style_guide_prompt_snapshot": compiled["positive_prompt"],
        "style_guide_overrides": copy.deepcopy(overrides),
    },
}
```

- [ ] **Step 4: Compile inside the generation endpoint**

If `style_guide.package_id` is present, derive the asset type from the selected asset node, obtain the server-side model limit, compile, replace the submitted prompt with `final_prompt`, merge guide reference paths into params after user references, set `negative_prompt`, and add the snapshot to `generation_context`. Pass `style_strength` and `conflict_resolutions` only through the documented compiler inputs. Pass local paths through the existing OmniGen `_reference_input` pipeline: it must reuse `result_asset_id` for MCP-generated images or the SHA-256 upload cache before considering `upload_asset`. Add an integration assertion that a guide reference with an existing `remote_asset_id` reaches `generate_image` as an `asset_id` input with no upload call.

If the package or exact published version cannot be loaded, do not compile a different version. Return a no-style preview with `missing_published_version`, or reject a direct generation request with the same structured warning so the client can visibly confirm the no-style fallback before resubmitting.

The generation service must persist the snapshot fields in the history record. A retry/regenerate action must reuse the saved version and snapshot unless the user explicitly selects “使用最新指导包”.

- [ ] **Step 5: Reject silent precision downgrades**

If `compiled["can_continue"]` is false, return HTTP 400 with `blocking_warnings` and do not submit generation. Precision produces blocking `missing_reference`, `invalid_material_id`, or `reference_limit` warnings when required references cannot be honored. Balanced and economy may continue only when the compile result explicitly marks `can_continue: true`; visible non-blocking warnings remain in the preview and generation snapshot.

- [ ] **Step 6: Run backend tests and syntax**

Run: `.venv-ai\Scripts\python.exe -m unittest tests.test_style_guide_service tests.test_style_guide_compiler tests.test_omnigen_service -v`

Run: `.venv-ai\Scripts\python.exe -m py_compile server.py style_guide_service.py style_guide_compiler.py omnigen_service.py`

Expected: all pass.

- [ ] **Step 7: Commit if authorized**

```powershell
git add style_guide_service.py server.py omnigen_service.py tests/test_style_guide_service.py tests/test_omnigen_service.py
git commit -m "feat: compile style guides into generation tasks"
```

## Phase E — Migration, rules and end-to-end verification

### Task 11: Remove unique confirmation semantics and migrate safely

**Files:**

- Modify: `project_service.py:1099-1145`
- Modify: `project_service.py:1284-1300`
- Modify: `app/app.js`
- Modify: `docs/GENERATION_RULES.zh-CN.md`
- Modify: `tests/test_project_service.py`

- [ ] **Step 1: Add failing migration tests**

```python
def test_confirming_a_direction_no_longer_archives_siblings(self):
    first = self.service.create_style_direction("default", name="First")
    second = self.service.create_style_direction("default", name="Second")
    self.service.update_style_direction("default", first["id"], changes={"status": "confirmed"})
    styles = {item["id"]: item for item in self.service.list_style_directions("default")}
    self.assertNotEqual(styles[second["id"]]["status"], "archived")

def test_existing_manifest_gets_empty_default_guide_field(self):
    project = self.service.get_project("default")
    self.assertIn("default_style_guide_package_id", project)
```

- [ ] **Step 2: Run and verify the sibling-archive test fails**

Run: `.venv-ai\Scripts\python.exe -m unittest tests.test_project_service.ProjectServiceTests.test_confirming_a_direction_no_longer_archives_siblings -v`

Expected: sibling remains archived under old logic, so the assertion fails.

- [ ] **Step 3: Remove the unique confirmation side effects**

Stop archiving sibling directions and stop writing `style_status` and `current_style_direction_id` when a direction status changes. Keep legacy fields readable with defaults for existing manifests, but remove them from active UI and generation payloads.

When trashing a direction, also trash or detach its guide package and clear `default_style_guide_package_id` when necessary. Published versions referenced by history remain in project metadata until a separate permanent-delete operation confirms they are unreferenced.

- [ ] **Step 4: Update project rules before final UI verification**

Document:

- every direction can own a guide package;
- one published package may be the non-exclusive project default;
- global visual DNA plus optional fixed game-art modules;
- task-specific module routing and three cost modes;
- the board is human-facing and not a default model reference;
- published versions and generation snapshots are immutable;
- missing analysis capability falls back to manual authoring.

- [ ] **Step 5: Run migration and relevant UI tests**

Run: `.venv-ai\Scripts\python.exe -m unittest tests.test_project_service tests.test_style_guide_service -v`

Run: `node --test tests/test_style_content_interactions.js tests/test_style_guide_workspace.js tests/test_style_guide_generation.js`

Expected: all pass.

- [ ] **Step 6: Commit if authorized**

```powershell
git add project_service.py app/app.js docs/GENERATION_RULES.zh-CN.md tests/test_project_service.py
git commit -m "refactor: replace unique project style with guide packages"
```

### Task 12: Full relevant regression and browser acceptance

**Files:**

- Verify: all files listed in this plan
- Update only if failures reveal in-scope defects

- [ ] **Step 1: Run all JavaScript tests**

Run: `node --test tests`

Expected: all JavaScript tests pass with zero failures.

- [ ] **Step 2: Run all Python tests**

Run: `.venv-ai\Scripts\python.exe -m unittest discover -s tests -p "test_*.py" -v`

Expected: all Python tests pass with zero failures.

- [ ] **Step 3: Run syntax and whitespace checks**

Run: `node --check app/app.js`

Run: `.venv-ai\Scripts\python.exe -m py_compile server.py project_service.py omnigen_service.py style_guide_service.py style_guide_compiler.py style_board_renderer.py`

Run: `git diff --check -- app/index.html app/app.js app/styles.css app/style-guide-utils.js project_service.py server.py omnigen_service.py style_guide_service.py style_guide_compiler.py style_board_renderer.py docs/GENERATION_RULES.zh-CN.md`

Expected: all commands exit 0.

- [ ] **Step 4: Start or reuse the root service and verify six browser scenarios**

Use `http://127.0.0.1:8895/app/index.html` from the root checkout. Verify:

1. two different directions can each own a published guide without archiving one another;
2. setting one package as default preselects it in image generation;
3. character generation shows core plus character and no UI module;
4. skill-icon generation shows core, skill/VFX and compact UI;
5. balanced preview uses no more than two guide references and shows their roles;
6. switching to no style removes guide modules and references from the submitted task.

Expected: each scenario behaves as specified with no console errors.

- [ ] **Step 5: Verify four failure/degradation scenarios**

1. missing published version falls back to no style with a visible warning;
2. model reference limit of one visibly trims balanced references;
3. conflicting user prompt shows the exact conflict and requires a choice;
4. precision mode blocks when a required reference cannot be resolved.

Expected: no scenario silently changes the selected guide or claims to use omitted references.

- [ ] **Step 6: Verify history reproducibility**

Submit one guided generation, publish a newer guide version, reopen the earlier history item, and confirm it still displays the original version ID, module list, final prompt snapshot and reference snapshot.

- [ ] **Step 7: Commit the completed core feature if authorized**

```powershell
git add app project_service.py server.py omnigen_service.py style_guide_service.py style_guide_compiler.py style_board_renderer.py tests docs/GENERATION_RULES.zh-CN.md docs/superpowers/specs/2026-07-17-game-art-style-guide-package-design.md docs/superpowers/plans/2026-07-17-game-art-style-guide-core.md
git commit -m "feat: add game art style guide packages"
```

## Follow-up plans after the core is accepted

Create separate implementation plans only after the required provider capability is available:

1. **AI draft analyzer:** a concrete multimodal provider adapter, asynchronous analysis tasks, image/module classification, rule-draft generation and capability diagnostics.
2. **Calibration and consistency evaluation:** optional low-cost module trial generation, explicit cost preview, post-generation rubric evaluation and user deviation feedback.

Both follow-ups consume the stable draft/version/compiler interfaces delivered here and must not alter historical published versions.
