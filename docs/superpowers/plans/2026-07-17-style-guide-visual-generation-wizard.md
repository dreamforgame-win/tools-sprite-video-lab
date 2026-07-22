# Style Guide Visual Generation Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent three-step wizard that uses the existing image-generation model to create either one overall game-art guide image or a visual-DNA anchor plus selected module boards, then deterministically assembles and applies the result to a style-guide draft.

**Architecture:** Add a pure prompt builder, a file-backed visual-run orchestration service and a deterministic template renderer beside the existing style-guide services. Reuse `OmniGenService` for all remote image tasks and asset-ID reuse, advance persistent runs from the visual-run polling endpoint, and keep the browser responsible only for wizard state, user choices and rendering. Apply successful results to the mutable guide draft; immutable publishing remains owned by `StyleGuideService`.

**Tech Stack:** Python 3 standard library, Pillow, existing `ProjectService` / `StyleGuideService` / `OmniGenService`, vanilla HTML/CSS/JavaScript, Python `unittest`, Node `node:test`.

---

## Scope and delivery boundary

This plan implements the approved design in:

- `docs/superpowers/specs/2026-07-17-style-guide-visual-generation-wizard-design.md`

It does not add a multimodal-analysis provider, OCR, free-form AI-written art-direction prose, automatic publishing, output consistency scoring or a new remote supplier. Image models produce visual sheets only. Accurate Chinese labels, palette display and module names are local deterministic output.

Git commit steps are included for execution hygiene. Do not run any commit until the user explicitly authorizes it.

## File responsibility map

**Create**

- `style_guide_visual_prompts.py` — pure master/module prompt construction and negative constraints.
- `style_guide_visual_service.py` — persistent run documents, node state machine, task submission, refresh/retry, supersession and draft application orchestration.
- `style_guide_visual_renderer.py` — palette extraction and deterministic overall template composition.
- `app/style-guide-visual-utils.js` — pure wizard step, module, task-count and node-status helpers.
- `tests/test_style_guide_visual_prompts.py` — prompt isolation and no-text rules.
- `tests/test_style_guide_visual_service.py` — run storage, node transitions, retry/recovery and application.
- `tests/test_style_guide_visual_renderer.py` — output dimensions, real source use and palette extraction.
- `tests/test_style_guide_visual_utils.js` — browser helper behavior.
- `tests/test_style_guide_visual_wizard.js` — source-level wizard, picker, prompt dialog and polling contracts.

**Modify**

- `style_guide_service.py` — accept visual-guide metadata and append generated references to draft core/modules without mutating published versions.
- `server.py` — instantiate visual service and expose create/list/get/retry/apply visual-run APIs.
- `app/index.html` — load visual helpers and add wizard, reference-picker and prompt-viewer dialog shells.
- `app/app.js` — wizard state, three-step navigation, second-level picker, run polling/resume and apply actions.
- `app/styles.css` — dense wizard, stepper, thumbnail strip, secondary dialog and dynamic-node styles.
- `docs/GENERATION_RULES.zh-CN.md` — document visual generation, dialog layering, overall/modular references and local text rendering.
- `tests/test_style_guide_service.py` — generated-reference draft application and immutable version regression.
- `tests/test_omnigen_service.py` — visual-run API integration and remote asset reuse regression.

## Identifier and state contracts

Fixed module IDs remain:

```python
MODULE_TYPES = (
    "environment",
    "character",
    "ui_hud",
    "skill_vfx",
    "props_equipment",
)
```

Visual run modes are exactly `overall` and `modular`.

Run statuses are exactly `running`, `succeeded`, `failed`, `superseded`, and `applied`.

Node statuses are exactly `pending`, `submitting`, `queued`, `running`, `succeeded`, `failed`, and `invalidated`.

Node IDs are deterministic within a run:

- overall mode: `overall`, `template`;
- modular mode: `anchor`, zero to five module IDs, `template`.

The modular request always includes the implicit core anchor; `module_types` contains only the five selectable professional module IDs.

## L3 verification commitment

New focused coverage target:

- 7 prompt-builder tests;
- 26 visual-run service/state-machine tests;
- 4 renderer tests;
- 7 API/OmniGen integration tests;
- 10 browser utility tests;
- 24 wizard source/interaction tests;
- 2 capability/messaging regression tests;
- 10 browser acceptance scenarios on `http://127.0.0.1:8895/app/index.html`.

This is 80 new focused automated checks plus 10 browser scenarios. Final delivery also runs the complete existing Python and JavaScript suites, syntax checks and `git diff --check`.

## Spec acceptance coverage

| Spec criterion | Implementation and verification coverage |
|---|---|
| 1. Exactly three major steps | Task 9 stepper shell and browser scenarios 1–2 |
| 2. Secondary reference picker reuses grouping, selection and preview | Task 10 and browser scenarios 3–4 |
| 3. Locked steps and stale-input protection | Tasks 9, 11 and 12; run input signature plus `supersedes_run_id` |
| 4. Overall mode makes one image call plus local template | Tasks 5 and 7; browser scenario 5 and cost invariant |
| 5. Modular anchor precedes dynamic selected modules | Tasks 4 and 6; browser scenario 6 |
| 6. Visual DNA fixed, five professional modules default selected | Tasks 2 and 11 |
| 7. Prompt preview uses a separate dialog | Tasks 9 and 11; browser scenario 7 |
| 8. One image per node and targeted retry | Tasks 5, 6 and 12; browser scenario 9 |
| 9. Reload restores persistent run state | Tasks 4, 6 and 12; browser scenario 8 |
| 10. MCP asset IDs are retained and reused | Tasks 5, 6 and 8; cost/history invariants |
| 11. Accurate labels are rendered locally | Tasks 3 and 7 |
| 12. Apply updates draft without automatic publish | Tasks 7, 12 and 13; browser scenario 10 |

## Phase A — Pure contracts and deterministic output

### Task 1: Pure visual prompt builder

**Files:**

- Create: `style_guide_visual_prompts.py`
- Create: `tests/test_style_guide_visual_prompts.py`

- [ ] **Step 1: Write failing prompt contract tests**

```python
import unittest

from style_guide_visual_prompts import (
    build_anchor_prompt,
    build_module_prompt,
    build_overall_prompt,
    prompt_bundle,
)


class StyleGuideVisualPromptTests(unittest.TestCase):
    def test_anchor_prompt_requires_visual_specimen_without_text(self):
        prompt = build_anchor_prompt("像素田园", "温暖、手工感")
        self.assertIn("像素田园", prompt)
        self.assertIn("视觉基因", prompt)
        self.assertIn("不生成标题", prompt)
        self.assertIn("不生成伪文字", prompt)

    def test_module_prompt_contains_only_requested_module(self):
        prompt = build_module_prompt(
            "像素田园", "", "ui_hud"
        )
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

    def test_prompt_bundle_is_immutable_and_complete(self):
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
```

Add three more tests for unknown modules, empty overall selection and stable output for identical inputs.

- [ ] **Step 2: Run the tests and verify the missing module failure**

Run:

```powershell
.venv-ai\Scripts\python.exe -m unittest tests.test_style_guide_visual_prompts -v
```

Expected: `ModuleNotFoundError: No module named 'style_guide_visual_prompts'`.

- [ ] **Step 3: Implement fixed prompts and validation**

Implement these public contracts:

```python
MODULE_LABELS = {
    "environment": "场景与环境",
    "character": "角色与生物",
    "ui_hud": "UI / HUD",
    "skill_vfx": "技能与 VFX",
    "props_equipment": "道具与装备",
}
```

- `build_anchor_prompt(title, description)` returns the visual-DNA prompt string.
- `build_module_prompt(title, description, module_type)` returns one isolated professional-module prompt string.
- `build_overall_prompt(title, description, module_types)` returns one combined-board prompt string.
- `prompt_bundle(title=, description=, mode=, module_types=)` returns the exact master, anchor/module, negative-constraint and reference-order sections consumed by preview and submission.

The master fragment must explicitly require original designs, reference-style fidelity, consistent medium/palette/shape/material/lighting, neutral presentation, no captions, no labels, no readable or pseudo text and no watermark. Reject unknown modes and module IDs with `ValueError`. Reject overall mode with zero modules. Modular mode always returns an anchor prompt plus only the requested module prompts.

- [ ] **Step 4: Run all seven prompt tests**

Run the command from Step 2.

Expected: 7 tests pass.

- [ ] **Step 5: Commit if authorized**

```powershell
git add style_guide_visual_prompts.py tests/test_style_guide_visual_prompts.py
git commit -m "feat: add visual guide prompt templates"
```

### Task 2: Pure browser wizard helpers

**Files:**

- Create: `app/style-guide-visual-utils.js`
- Create: `tests/test_style_guide_visual_utils.js`
- Modify: `app/index.html`

- [ ] **Step 1: Write failing helper tests**

```javascript
const assert = require("node:assert/strict");
const test = require("node:test");
const {
  visualGuideNodePlan,
  visualGuideTaskCount,
  visualGuideStepState,
  normalizeVisualGuideModules,
} = require("../app/style-guide-visual-utils.js");

test("overall mode has one image node and one local template node", () => {
  assert.deepEqual(
    visualGuideNodePlan("overall", ["environment", "ui_hud"]),
    ["overall", "template"],
  );
  assert.equal(visualGuideTaskCount("overall", ["environment", "ui_hud"]), 1);
});

test("modular mode has anchor, selected modules and template", () => {
  assert.deepEqual(
    visualGuideNodePlan("modular", ["ui_hud", "environment"]),
    ["anchor", "environment", "ui_hud", "template"],
  );
  assert.equal(visualGuideTaskCount("modular", ["ui_hud", "environment"]), 3);
});

test("future steps remain locked", () => {
  assert.equal(visualGuideStepState(1, 3), "locked");
  assert.equal(visualGuideStepState(2, 2), "current");
  assert.equal(visualGuideStepState(3, 2), "locked");
});
```

Add seven tests covering module order, unknown IDs, default five professional modules, completed steps, overall minimum selection, status labels and node retry eligibility.

- [ ] **Step 2: Run and verify the missing module failure**

Run:

```powershell
node --test tests/test_style_guide_visual_utils.js
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement a UMD-style pure helper module**

Follow the same browser/Node export pattern as `app/style-guide-utils.js` and export the constants below plus six pure helpers.

```javascript
const PROFESSIONAL_MODULES = [
  "environment",
  "character",
  "ui_hud",
  "skill_vfx",
  "props_equipment",
];
```

The exported helpers are `normalizeVisualGuideModules`, `visualGuideNodePlan`, `visualGuideTaskCount`, `visualGuideStepState`, `visualGuideNodeStatusLabel` and `canRetryVisualGuideNode`. Implement the exact ordering, node-plan, task-count, step-state, label and retry contracts asserted in Step 1.

Canonical module order must not depend on checkbox click order.

- [ ] **Step 4: Load the helper before `app.js`**

Add to `app/index.html`:

```html
<script src="style-guide-visual-utils.js"></script>
<script src="app.js"></script>
```

- [ ] **Step 5: Run all ten helper tests and syntax**

```powershell
node --test tests/test_style_guide_visual_utils.js
node --check app/style-guide-visual-utils.js
```

Expected: 10 tests pass and syntax exits 0.

- [ ] **Step 6: Commit if authorized**

```powershell
git add app/style-guide-visual-utils.js app/index.html tests/test_style_guide_visual_utils.js
git commit -m "feat: add visual guide wizard helpers"
```

### Task 3: Deterministic visual template renderer

**Files:**

- Create: `style_guide_visual_renderer.py`
- Create: `tests/test_style_guide_visual_renderer.py`

- [ ] **Step 1: Write failing renderer tests**

```python
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
```

Add tests for overall mode and missing source rejection.

- [ ] **Step 2: Run and verify the missing module failure**

```powershell
.venv-ai\Scripts\python.exe -m unittest tests.test_style_guide_visual_renderer -v
```

Expected: import failure.

- [ ] **Step 3: Implement palette extraction and local composition**

Public contracts:

```python
TEMPLATE_SIZE = (1600, 1600)
```

- `extract_palette(image_paths, count=8)` returns stable hexadecimal colors.
- `render_visual_template(output_path, title=, mode=, sources=)` opens the real sources, composes them without cropping, draws local labels, saves the requested output and returns its path, dimensions and palette.

Use Pillow only. Normalize inputs to RGB, quantize deterministically without dithering, order colors by frequency and remove near-duplicates. Render accurate local Chinese-capable labels using the existing renderer font fallback strategy. Use `ImageOps.contain`, never crop source subjects. Return output path, size and extracted palette.

- [ ] **Step 4: Run all four renderer tests**

Run Step 2 command.

Expected: 4 tests pass.

- [ ] **Step 5: Commit if authorized**

```powershell
git add style_guide_visual_renderer.py tests/test_style_guide_visual_renderer.py
git commit -m "feat: render generated visual guide templates"
```

## Phase B — Persistent visual-run orchestration

### Task 4: File-backed run documents and node plans

**Files:**

- Create: `style_guide_visual_service.py`
- Create: `tests/test_style_guide_visual_service.py`

- [ ] **Step 1: Write failing run-creation tests**

```python
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from project_service import ProjectService
from style_guide_service import StyleGuideService
from style_guide_visual_service import StyleGuideVisualService


class StyleGuideVisualServiceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.projects = ProjectService(Path(self.temp.name) / "work")
        self.guides = StyleGuideService(self.projects)
        self.visuals = StyleGuideVisualService(self.projects, self.guides)
        self.direction = self.projects.create_style_direction(
            "default", name="像素田园"
        )
        self.package = self.guides.create_draft(
            "default", self.direction["id"]
        )

    def tearDown(self):
        self.temp.cleanup()

    def test_create_modular_run_builds_dynamic_node_plan(self):
        run = self.visuals.create_run_document(
            "default",
            self.package["id"],
            {
                "mode": "modular",
                "module_types": ["ui_hud", "environment"],
                "model": "image-a",
                "params": {"aspect_ratio": "16:9", "resolution": "1K"},
                "reference_sources": [
                    {"kind": "style_reference", "relative_path": "refs/a.png"}
                ],
            },
        )
        self.assertEqual(
            [node["id"] for node in run["nodes"]],
            ["anchor", "environment", "ui_hud", "template"],
        )
        self.assertEqual(run["status"], "running")

    def test_create_overall_run_has_exactly_two_nodes(self):
        run = self.visuals.create_run_document(
            "default",
            self.package["id"],
            {
                "mode": "overall",
                "module_types": ["environment"],
                "model": "image-a",
                "params": {"aspect_ratio": "1:1"},
                "reference_sources": [
                    {"kind": "style_reference", "relative_path": "refs/a.png"}
                ],
            },
        )
        self.assertEqual([node["id"] for node in run["nodes"]], ["overall", "template"])
```

Add tests for unknown mode, empty overall modules, zero references, canonical module order, atomic persistence, deep-copy reads and `supersedes_run_id` marking the previous run as superseded.

- [ ] **Step 2: Run and verify the missing service failure**

```powershell
.venv-ai\Scripts\python.exe -m unittest tests.test_style_guide_visual_service -v
```

Expected: import failure.

- [ ] **Step 3: Implement validated run storage**

Create `StyleGuideVisualService(project_service, style_guide_service)` with public methods `list_runs(project_id, package_id)`, `get_run(project_id, package_id, run_id)` and `create_run_document(project_id, package_id, request)`. The first two return deep-copied run documents; the last validates and atomically persists a run without submitting remote work.

Store each run at:

```text
.sprite-lab/style-guides/<package-id>/visual-runs/<run-id>.json
```

Create the exact fields listed in the spec data model. Use the existing project atomic JSON writer under a service `RLock`. Validate IDs using the same strict patterns as `StyleGuideService`. Normalize module order, strings and parameter maps. Store `input_revision` plus a deterministic `input_signature` over resolved reference snapshots, mode, canonical modules, model and normalized parameters. Once created, mode, modules, prompts, source snapshots and the signature are immutable.

- [ ] **Step 4: Implement deterministic node records**

Each node has:

```python
{
    "id": "anchor",
    "kind": "image",
    "module_type": "core",
    "label": "视觉基因锚点",
    "order": 0,
    "depends_on": [],
    "status": "pending",
    "record_id": "",
    "result_relative_path": "",
    "result_remote_asset_id": "",
    "error": "",
    "attempt": 0,
}
```

The template node uses `kind: "local"` and depends on every required image node.

- [ ] **Step 5: Run the nine run-document tests**

Expected: 9 tests pass.

- [ ] **Step 6: Commit if authorized**

```powershell
git add style_guide_visual_service.py tests/test_style_guide_visual_service.py
git commit -m "feat: persist visual guide generation runs"
```

### Task 5: Safe reference resolution and initial task submission

**Files:**

- Modify: `style_guide_visual_service.py`
- Modify: `tests/test_style_guide_visual_service.py`

- [ ] **Step 1: Add failing reference-resolution tests**

Add five tests named `test_reference_source_must_resolve_inside_project`, `test_generation_result_source_reuses_remote_asset_id`, `test_reference_count_is_trimmed_to_server_model_limit_with_warning`, `test_overall_run_submits_one_image_task` and `test_modular_run_submits_only_anchor_initially`. Each test must perform the stated action and assert the exact persisted source snapshot, warning or submitted node rather than merely checking that a method was called.

Use a mocked generation service with:

```python
generation.image_model_capability.return_value = {"max_reference_images": 2}
generation.submit_image.return_value = {
    "id": "record-anchor", "status": "queued"
}
```

Assert submitted `params["reference_images"]` uses project-relative paths or existing `{remote_asset_id, relative_path}` markers and never an unvalidated client path.

- [ ] **Step 2: Run the five tests and verify missing methods fail**

Run the Task 4 test command.

Expected: attribute or assertion failures for submission behavior.

- [ ] **Step 3: Resolve and snapshot sources server-side**

Add `create_run(project_id, package_id, request, generation_service=)` as the orchestration entry point. It first validates and resolves the same server-owned inputs for both preview and execution. With `preview_only: true`, return the exact prompt bundle, resolved reference order, per-node reference-limit decisions and input signature without creating files or tasks. Otherwise call `create_run_document`, submit only the first required remote node, persist the returned record fields and return the refreshed run document.

For `style_reference`, resolve `relative_path` through `ProjectService.resolve_project_file`. For `generation_result`, load the record from the project generation service, verify it belongs to the selected style direction and succeeded, then copy `local_path`, project-relative path, `result_asset_id` and content fingerprint. Do not trust a client-provided remote asset ID without its source record.

Obtain `max_reference_images` from `generation_service.image_model_capability(model)`. Preserve the user order, trim only the actual per-node input, and record a structured `reference_limit` warning containing requested IDs, selected IDs and the limit.

- [ ] **Step 4: Submit the first remote node**

Overall mode submits `overall`; modular mode submits `anchor`. Call:

```python
record = generation_service.submit_image(
    node_prompt,
    run["model"],
    {
        **run["params"],
        "reference_images": selected_reference_inputs,
    },
    context={
        "project_id": project_id,
        "style_direction_id": run["style_direction_id"],
        "actor": run["actor"],
        "style_guide_visual_run_id": run["id"],
        "style_guide_visual_node_id": node["id"],
    },
)
```

Store the record ID, increment attempt and copy the returned status atomically.

- [ ] **Step 5: Run the fourteen accumulated service tests**

Expected: all pass.

- [ ] **Step 6: Commit if authorized**

```powershell
git add style_guide_visual_service.py tests/test_style_guide_visual_service.py
git commit -m "feat: submit visual guide generation runs"
```

### Task 6: Advance, retry and recover dynamic runs

**Files:**

- Modify: `style_guide_visual_service.py`
- Modify: `omnigen_service.py`
- Modify: `tests/test_style_guide_visual_service.py`
- Modify: `tests/test_omnigen_service.py`

- [ ] **Step 1: Write failing transition tests**

Add six transition tests named `test_anchor_success_submits_selected_modules_in_canonical_order`, `test_module_inputs_use_anchor_asset_and_one_source_within_limit`, `test_failed_module_does_not_invalidate_successful_sibling`, `test_retry_resets_only_requested_failed_node`, `test_regenerated_anchor_invalidates_existing_module_results` and `test_refresh_after_new_service_instance_recovers_persisted_run`. Exercise persisted run documents across service instances and assert exact node statuses, attempts, dependencies and submitted reference IDs.

Mock `refresh_task` to return succeeded records with local paths and `result_asset_id` values. Assert module calls use the anchor remote ID and do not call `upload_asset`.

- [ ] **Step 2: Run the tests and verify transition failures**

Run:

```powershell
.venv-ai\Scripts\python.exe -m unittest tests.test_style_guide_visual_service tests.test_omnigen_service -v
```

Expected: new tests fail.

- [ ] **Step 3: Persist visual-run context fields in OmniGen history**

Extend `_create_record_unlocked` in `omnigen_service.py` to copy:

```python
"style_guide_visual_run_id",
"style_guide_visual_node_id",
```

as strings when present. This allows recovery and auditing without changing remote model arguments.

- [ ] **Step 4: Implement `refresh_run`**

Implement `refresh_run(project_id, package_id, run_id, generation_service=)` as the only method that advances existing remote records and schedules newly unblocked nodes.

Refresh active image records through `generation_service.refresh_task(record_id)`. Normalize history status to node status. On success copy project-relative result path and remote asset ID. On anchor success, submit every pending selected module exactly once. Do not resubmit queued/running/succeeded records.

When all image nodes succeed, render the local template in Task 7. When any required image node is failed, run status becomes `failed` but successful siblings remain unchanged.

- [ ] **Step 5: Implement targeted retry**

Implement `retry_node(project_id, package_id, run_id, node_id, generation_service=)` and require the exact persisted node ID; it must never reconstruct or substitute a node from browser state.

Failed or invalidated image nodes can retry. Retrying anchor marks all succeeded professional nodes `invalidated` with `error: "视觉基因锚点已更新"`. Retrying a professional node leaves siblings unchanged. The local template returns to pending whenever any source is retried. A failed local template can also retry: reset only that node and call the local renderer again after dependencies are checked, without submitting or refreshing any remote image task. Cover this no-remote-call rule in `test_all_image_nodes_render_template_without_remote_call`.

If OmniGen reports that a retained remote asset ID is invalid, use its existing asset-cache recovery path at most once with the validated local source, persist the repaired asset ID, and retry the affected submission once. A second invalid-ID failure remains on the node as an actionable error; polling must not loop uploads or submissions.

- [ ] **Step 6: Run all transition and OmniGen tests**

Expected: all accumulated tests pass.

- [ ] **Step 7: Commit if authorized**

```powershell
git add style_guide_visual_service.py omnigen_service.py tests/test_style_guide_visual_service.py tests/test_omnigen_service.py
git commit -m "feat: advance and recover visual guide runs"
```

### Task 7: Render final template and apply results to the guide draft

**Files:**

- Modify: `style_guide_visual_service.py`
- Modify: `style_guide_service.py`
- Modify: `tests/test_style_guide_visual_service.py`
- Modify: `tests/test_style_guide_service.py`

- [ ] **Step 1: Write failing application tests**

Add six application tests named `test_all_image_nodes_render_template_without_remote_call`, `test_apply_modular_run_adds_anchor_and_module_references`, `test_apply_overall_run_adds_core_overview_only`, `test_apply_preserves_existing_manual_draft_text`, `test_apply_cannot_modify_published_version` and `test_apply_is_idempotent_for_same_run`. Assert exact remote-call counts, reference roles, preserved manual fields, published snapshot contents and duplicate-free repeated application.

Assert roles are exact:

```python
anchor["roles"] == ["style-anchor"]
scene["roles"] == ["composition", "material", "lighting"]
ui["roles"] == ["layout", "frame", "icon", "color"]
```

- [ ] **Step 2: Run and verify missing application behavior**

```powershell
.venv-ai\Scripts\python.exe -m unittest tests.test_style_guide_visual_service tests.test_style_guide_service -v
```

Expected: new tests fail.

- [ ] **Step 3: Render the local template when dependencies succeed**

In `refresh_run`, resolve every successful node source through the project root and call `render_visual_template`. Save output at:

```text
production/style-guides/<package-id>/visual-runs/<run-id>/guide-template.png
```

Update the template node to succeeded with the relative path and extracted palette. No OmniGen call is allowed for this node.

- [ ] **Step 4: Add a narrow draft-application method**

Implement `StyleGuideService.apply_visual_run(project_id, package_id, run_snapshot=)` as the narrow draft mutation boundary.

Load the current draft and append or replace only references with matching `visual_run_id` and module role. Preserve all manually edited strings and lists. Populate `core.palette` only when currently empty. Store top-level mutable draft metadata:

```python
"visual_guide": {
    "run_id": run_id,
    "mode": mode,
    "template_relative_path": template_path,
    "module_types": module_types,
    "updated_at": timestamp,
}
```

Extend draft normalization and publishing snapshots to retain `visual_guide`. Published versions remain immutable because the method only writes `draft.json`.

- [ ] **Step 5: Expose `apply_run` from the visual service**

Implement `StyleGuideVisualService.apply_run(project_id, package_id, run_id)`. Require run status `succeeded`; call `StyleGuideService.apply_visual_run`, then atomically set run status to `applied` and `applied_at`. Return one object containing both `visual_run` and `draft`. Repeated apply returns the same shape with the current draft and no duplicate references.

- [ ] **Step 6: Run renderer, visual service and guide service tests**

```powershell
.venv-ai\Scripts\python.exe -m unittest tests.test_style_guide_visual_renderer tests.test_style_guide_visual_service tests.test_style_guide_service -v
```

Expected: all pass.

- [ ] **Step 7: Commit if authorized**

```powershell
git add style_guide_visual_service.py style_guide_service.py tests/test_style_guide_visual_service.py tests/test_style_guide_service.py
git commit -m "feat: apply visual runs to style guide drafts"
```

## Phase C — REST API

### Task 8: Visual-run API routes and structured failures

**Files:**

- Modify: `server.py`
- Modify: `tests/test_omnigen_service.py`

- [ ] **Step 1: Add failing API tests**

Add seven API tests named `test_create_visual_run_uses_project_generation_service`, `test_list_visual_runs_supports_active_filter`, `test_get_visual_run_advances_remote_tasks`, `test_retry_visual_node_delegates_exact_node`, `test_apply_visual_run_returns_updated_draft`, `test_missing_visual_run_returns_400_without_leaking_paths` and `test_visual_run_remote_asset_reaches_generate_image_without_upload`. Use real HTTP handlers with isolated project roots and mocked remote generation; assert status codes, response fields, delegation arguments and absence of absolute filesystem paths.

Within the create-route test, also submit `preview_only: true` and assert it returns the server-built prompt bundle without creating a run file, generation record or remote task.

Use these request paths:

```text
POST /api/v1/projects/default/style-guides/guide-one/visual-runs
GET  /api/v1/projects/default/style-guides/guide-one/visual-runs?active=true
GET  /api/v1/projects/default/style-guides/guide-one/visual-runs/run-one
POST /api/v1/projects/default/style-guides/guide-one/visual-runs/run-one/nodes/ui_hud/retry
POST /api/v1/projects/default/style-guides/guide-one/visual-runs/run-one/apply
```

- [ ] **Step 2: Run focused API tests and verify 404/failures**

```powershell
.venv-ai\Scripts\python.exe -m unittest tests.test_omnigen_service.ServerApiTests -v
```

Expected: new routes fail.

- [ ] **Step 3: Instantiate the visual service**

At server module initialization:

```python
STYLE_GUIDE_VISUAL_SERVICE = StyleGuideVisualService(
    PROJECT_SERVICE, STYLE_GUIDE_SERVICE
)
```

Import the new service beside existing guide imports.

- [ ] **Step 4: Add GET routes**

List runs without refreshing every entry. `active=true` returns running/failed resumable runs. Getting one run calls `refresh_run` with `project_generation_service(project_id)` before sending the response.

- [ ] **Step 5: Add POST create/retry/apply routes**

Create calls `StyleGuideVisualService.create_run` with the parsed JSON request and project generation service. When `preview_only` is true, `create_run` validates the same request and returns the prompt/reference preview before `create_run_document`, so no run file or remote task can be created. GET-one calls `refresh_run`. Retry calls `retry_node` with the exact decoded node ID. Apply calls `apply_run` and returns both `visual_run` and the updated `draft`.

All errors use JSON with `ok: false`, a safe `error` string, and structured `warnings` when reference limits or invalid source IDs are involved. Never return absolute filesystem paths.

- [ ] **Step 6: Run seven API tests and syntax**

```powershell
.venv-ai\Scripts\python.exe -m unittest tests.test_omnigen_service.ServerApiTests -v
.venv-ai\Scripts\python.exe -m py_compile server.py style_guide_visual_service.py
```

Expected: all API tests pass and syntax exits 0.

- [ ] **Step 7: Commit if authorized**

```powershell
git add server.py tests/test_omnigen_service.py
git commit -m "feat: expose visual guide run APIs"
```

## Phase D — Three-step wizard

### Task 9: Wizard shell, stepper and dialog layering

**Files:**

- Modify: `app/index.html`
- Modify: `app/app.js`
- Modify: `app/styles.css`
- Create: `tests/test_style_guide_visual_wizard.js`

- [ ] **Step 1: Write failing shell tests**

```javascript
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const app = fs.readFileSync(path.resolve(__dirname, "../app/app.js"), "utf8");
const html = fs.readFileSync(path.resolve(__dirname, "../app/index.html"), "utf8");

test("wizard contains three numbered steps", () => {
  assert.match(html, /styleGuideVisualWizard/);
  assert.match(app, /选择参考图/);
  assert.match(app, /生成设置/);
  assert.match(app, /生成指导图/);
});

test("locked steps show a prerequisite message", () => {
  assert.match(app, /data-visual-guide-step/);
  assert.match(app, /请先完成/);
});

test("visual generation replaces unavailable analyzer wording", () => {
  assert.doesNotMatch(app, /自动归纳未接入/);
  assert.match(app, /生成视觉指导图/);
});
```

Add tests for fixed-size internal scrolling, secondary dialog IDs and Escape layer ordering.

- [ ] **Step 2: Run and verify six shell tests fail**

```powershell
node --test tests/test_style_guide_visual_wizard.js
```

Expected: missing wizard assertions fail.

- [ ] **Step 3: Add dialog shells**

Add hidden semantic dialogs:

```html
<section id="styleGuideVisualWizard" class="style-guide-visual-wizard" role="dialog" aria-modal="true" hidden></section>
<section id="styleGuideVisualReferenceDialog" class="style-guide-visual-secondary" role="dialog" aria-modal="true" hidden></section>
<section id="styleGuideVisualPromptDialog" class="style-guide-visual-secondary" role="dialog" aria-modal="true" hidden></section>
```

Do not close editing dialogs by clicking the outer backdrop. Explicit close and Escape are supported.

- [ ] **Step 4: Add wizard state and open/close rendering**

Add under `state.projectAssets`:

```javascript
styleGuideVisualWizard: {
  open: false,
  packageId: "",
  step: 1,
  mode: "modular",
  moduleTypes: ["environment", "character", "ui_hud", "skill_vfx", "props_equipment"],
  referenceSources: [],
  referenceDraft: [],
  model: "",
  params: { aspect_ratio: "smart", resolution: "1K", background: "transparent" },
  run: null,
  supersedesRunId: "",
  pollTimer: null,
}
```

Render three connected numbered nodes using actual buttons. Locked nodes remain buttons for discoverability but do not change step. Add the “生成视觉指导图” action to the guide workspace capability area.

- [ ] **Step 5: Implement Escape layering**

Existing global key handling closes in this order:

1. global image lightbox;
2. prompt secondary dialog;
3. reference secondary dialog;
4. visual wizard;
5. underlying guide workspace.

Closing the wizard while a run is active hides it but does not clear run state or polling.

- [ ] **Step 6: Style the fixed workbench dialog**

Use a stable desktop width, maximum viewport-safe height, fixed header/footer and one internal scrolling content area. The stepper line sits behind circular nodes; current/completed/locked use distinct shape, fill and text contrast, not color alone.

- [ ] **Step 7: Run six shell tests and syntax**

```powershell
node --test tests/test_style_guide_visual_wizard.js
node --check app/app.js
```

Expected: all pass.

- [ ] **Step 8: Commit if authorized**

```powershell
git add app/index.html app/app.js app/styles.css tests/test_style_guide_visual_wizard.js
git commit -m "feat: add visual guide wizard shell"
```

### Task 10: Compact first step and secondary reference picker

**Files:**

- Modify: `app/app.js`
- Modify: `app/styles.css`
- Modify: `tests/test_style_guide_visual_wizard.js`

- [ ] **Step 1: Add failing picker tests**

Add tests that assert source contains:

```javascript
test("first step keeps only a selected thumbnail strip", () => {
  assert.match(app, /style-guide-visual-reference-strip/);
  assert.match(app, /选择参考图/);
  assert.match(app, /清空/);
});

test("secondary picker reuses grouped candidates and global preview", () => {
  assert.match(app, /styleContentSections/);
  assert.match(app, /openImageLightbox/);
  assert.match(app, /data-visual-reference-toggle/);
  assert.match(app, /data-visual-reference-group-toggle/);
});

test("cancel preserves committed references", () => {
  assert.match(app, /referenceDraft/);
  assert.match(app, /styleGuideVisualCancelReferences/);
});
```

Add tests for selected/limit count, group collapse and fixed footer confirm.

- [ ] **Step 2: Run and verify six picker tests fail**

Run the Task 9 Node command.

- [ ] **Step 3: Build candidates from the existing style content model**

Use `styleContentItems(selectedStyleDirection())` and the shared canvas grouping from `styleContentSections`. Include only items with valid images and project-relative paths. Candidate objects sent to the server contain:

```javascript
{
  kind: item.refType,
  id: item.id,
  relative_path: styleContentRelativePath(item),
  display_name: item.name,
}
```

Do not send or trust browser-owned remote asset IDs.

- [ ] **Step 4: Render the compact main-step strip**

Show selected thumbnails, candidate count, model per-task limit, remove buttons, choose button and clear. Thumbnail hover/focus displays the standard enlarge icon and opens the global lightbox.

- [ ] **Step 5: Render the grouped secondary dialog**

Reuse the 16:9 non-cropping grid semantics from `renderStyleGenerationReferencePicker`. Checkbox controls selection; image body only previews. Maintain `referenceDraft` while open. Confirm copies it to `referenceSources`; cancel discards it. Keep a fixed footer with `已选 N 张`, cancel and confirm.

- [ ] **Step 6: Enforce next-step validation**

At least one valid reference is required. If selected candidates exceed the model limit, allow the user to continue but display which leading references each node will actually use; do not claim omitted sources are submitted.

- [ ] **Step 7: Run picker tests and syntax**

Expected: all twelve accumulated wizard tests pass.

- [ ] **Step 8: Commit if authorized**

```powershell
git add app/app.js app/styles.css tests/test_style_guide_visual_wizard.js
git commit -m "feat: select visual guide references"
```

### Task 11: Mode, modules, prompt viewer and generation parameters

**Files:**

- Modify: `app/app.js`
- Modify: `app/styles.css`
- Modify: `tests/test_style_guide_visual_wizard.js`

- [ ] **Step 1: Add failing generation-setting tests**

Add six tests asserting that the wizard defaults to modular mode with all five professional modules, visual DNA stays fixed in modular mode, overall mode rejects zero modules, the prompt viewer exposes master/module/negative/reference sections, the estimate counts only image calls, and every visual node submits `count: 1`. Each test must assert the relevant DOM hook plus the handler or helper that enforces the behavior.

- [ ] **Step 2: Run and verify six new tests fail**

Run the Task 9 command.

- [ ] **Step 3: Render mode and module controls**

Use one segmented control for overall/modular. Render six module rows, with visual DNA fixed and checked in modular mode. Default all professional modules selected. In overall mode allow the core row and professional rows to toggle, but prevent zero total selections.

Switching mode resets the suggested ratio only when the user has not manually changed it: nearest supported square for overall, nearest supported landscape for modular.

- [ ] **Step 4: Fetch and show the exact prompt preview**

The create-run endpoint accepts `preview_only: true` and returns the server-built prompt bundle without creating files or tasks. Debounce mode/module/direction-description changes by 180 ms and discard stale responses by request ID. The prompt dialog shows read-only tabs for master, module extensions, negative constraints and actual reference order, with copy buttons.

- [ ] **Step 5: Render shared generation parameters and estimate**

Reuse `state.aiCreation.models` and existing model capability options. Fixed count is 1 and is displayed as metadata rather than an editable count control. Show remote image call estimate from `visualGuideTaskCount`; template composition is labeled local and excluded from credit estimate.

- [ ] **Step 6: Submit the run**

POST exact server-owned selections:

```javascript
{
  mode,
  module_types: moduleTypes,
  model,
  params: {
    aspect_ratio: resolvedRatio,
    resolution,
    background,
  },
  reference_sources: referenceSources,
  supersedes_run_id: supersedesRunId,
  actor: "user",
}
```

On success move to step 3, store the run and start polling.

Persist a deterministic input signature over references, mode, modules, model and resolved parameters. If the user returns to step 1 or 2 and changes any signed input after a run exists, keep the old run as history, set `supersedesRunId` to its ID, mark the displayed result stale and disable apply until a newly submitted run with the current signature succeeds.

- [ ] **Step 7: Run setting tests and syntax**

Expected: all accumulated wizard tests pass.

- [ ] **Step 8: Commit if authorized**

```powershell
git add app/app.js app/styles.css tests/test_style_guide_visual_wizard.js
git commit -m "feat: configure visual guide generation"
```

### Task 12: Dynamic generation nodes, polling, resume and apply

**Files:**

- Modify: `app/app.js`
- Modify: `app/styles.css`
- Modify: `tests/test_style_guide_visual_wizard.js`

- [ ] **Step 1: Add failing run-progress tests**

Add six tests asserting that step three renders server-owned nodes, failed nodes expose exact-node retry, closing the wizard preserves active polling, reopening resumes the latest matching active run, anchor retry communicates downstream invalidation, and apply remains disabled until the template succeeds with an input signature equal to the current wizard input. Assert both the visible controls and the state/update functions that govern them; the final test must also change one signed input and verify the old successful run becomes ineligible for apply.

- [ ] **Step 2: Run and verify six progress tests fail**

Run the Task 9 command.

- [ ] **Step 3: Poll visual runs independently from modal visibility**

Implement one timer per current visual run. GET the exact run every two seconds. Do not rebuild the whole style workspace during each poll; update node status/progress/preview DOM in place. On terminal state perform one full wizard result render. Clear timers only when terminal or project/package changes.

- [ ] **Step 4: Render server node order and statuses**

Never reconstruct expected nodes locally after run creation. Render `run.nodes` with connected status markers, progress, safe errors, preview buttons and retry actions. The overall run therefore displays exactly two nodes; modular runs display anchor, selected modules and template.

- [ ] **Step 5: Implement retry and upstream invalidation UX**

POST the exact node retry endpoint. Before retrying a succeeded anchor, explain that module outputs will become based on an old anchor; confirmation allows the server to invalidate them. Failed professional modules retry without prompting about siblings.

- [ ] **Step 6: Resume after reload or reopening**

When opening a guide workspace, GET `visual-runs?active=true`. Select the newest matching run without substituting another package. Restore step 3 and resume polling. A superseded run is history-only and never auto-resumed.

- [ ] **Step 7: Apply to draft**

Enable “写入指导包草稿” only when the template node and run are succeeded and the persisted run input signature matches the current wizard signature. POST apply, replace `state.projectAssets.styleGuideDraft` with the response draft, mark the run applied, close the wizard and rerender the guide workspace. Publishing remains a separate existing action.

- [ ] **Step 8: Run all wizard tests and syntax**

```powershell
node --test tests/test_style_guide_visual_utils.js tests/test_style_guide_visual_wizard.js
node --check app/app.js
```

Expected: 34 focused JS tests pass (10 utility plus 24 accumulated wizard tests) and syntax exits 0.

- [ ] **Step 9: Commit if authorized**

```powershell
git add app/app.js app/styles.css tests/test_style_guide_visual_wizard.js
git commit -m "feat: track visual guide generation progress"
```

## Phase E — Rules, migration and full verification

### Task 13: Replace unavailable-analyzer messaging and document the workflow

**Files:**

- Modify: `style_guide_service.py`
- Modify: `app/app.js`
- Modify: `docs/GENERATION_RULES.zh-CN.md`
- Modify: `tests/test_style_guide_workspace.js`

- [ ] **Step 1: Write failing messaging tests**

```javascript
test("guide workspace offers image-model visual generation", () => {
  assert.match(source, /生成视觉指导图/);
  assert.doesNotMatch(source, /No multimodal style-guide analyzer/);
  assert.doesNotMatch(source, /自动归纳未接入/);
});
```

Add a Python capability-state test asserting manual authoring and image-model visual generation are distinct from multimodal text analysis.

- [ ] **Step 2: Run and verify old wording fails**

```powershell
node --test tests/test_style_guide_workspace.js
.venv-ai\Scripts\python.exe -m unittest tests.test_style_guide_service -v
```

- [ ] **Step 3: Update capability state and visible copy**

Expose:

```python
{
    "manual_authoring": True,
    "visual_generation": True,
    "visual_generation_requires_image_model": True,
    "automatic_text_analysis": False,
}
```

The browser derives actual availability from the loaded image-model list and provider validation. Use Chinese copy only. Disabled state says “请先配置可用图片模型”, not that an unrelated analyzer is missing.

- [ ] **Step 4: Update project rules before final browser validation**

Document:

- visual guide generation uses existing image models and selected references;
- overall mode is one remote image plus local composition;
- modular mode is anchor plus selected professional boards;
- full reference grids live in a secondary dialog;
- image models do not generate authoritative guide prose;
- local labels and palette extraction are deterministic;
- visual runs are persistent, retryable and snapshot all inputs;
- generated MCP asset IDs must be reused;
- applying updates the draft and never publishes automatically.

- [ ] **Step 5: Run focused messaging and workspace tests**

Expected: all pass.

- [ ] **Step 6: Commit if authorized**

```powershell
git add style_guide_service.py app/app.js docs/GENERATION_RULES.zh-CN.md tests/test_style_guide_workspace.js tests/test_style_guide_service.py
git commit -m "docs: define visual guide generation workflow"
```

### Task 14: Full L3 regression and browser acceptance

**Files:**

- Verify all files listed in this plan.
- Modify only when verification exposes an in-scope defect.

- [ ] **Step 1: Run all JavaScript tests**

```powershell
node --test tests\*.js
```

Expected: zero failures.

- [ ] **Step 2: Run all Python tests**

```powershell
.venv-ai\Scripts\python.exe -m unittest discover -s tests -p "test_*.py" -v
```

Expected: zero failures; the existing Windows symlink-permission skip remains acceptable.

- [ ] **Step 3: Run syntax and whitespace checks**

```powershell
node --check app\app.js
node --check app\style-guide-visual-utils.js
.venv-ai\Scripts\python.exe -m py_compile server.py omnigen_service.py style_guide_service.py style_guide_visual_service.py style_guide_visual_prompts.py style_guide_visual_renderer.py
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 4: Restart only the root 8895 service**

Confirm the listening process command points to `F:\Codex-Program\sprite-video-lab\server.py`, restart it from this root, and verify:

```text
http://127.0.0.1:8895/app/index.html -> HTTP 200
```

Do not use archived port 8894.

- [ ] **Step 5: Verify ten browser scenarios**

On the 8895 root page verify:

1. “生成视觉指导图” opens the three-step wizard with step 1 active and later steps locked.
2. Clicking a locked step shows its prerequisite without changing steps.
3. The main first step remains compact; “选择参考图” opens the grouped secondary dialog.
4. Checkbox selection, group selection, large preview, cancel and confirm follow existing reference-picker semantics.
5. Overall mode with selected modules shows one remote task plus one local template node.
6. Modular mode keeps visual DNA enabled and creates anchor plus exactly the selected module nodes and template.
7. The prompt viewer opens separately and displays master, module, negative and reference sections without resizing the wizard.
8. Closing and reopening the wizard preserves an active run and continues visible progress without console errors.
9. A failed module retries alone; retrying anchor visibly invalidates module results based on the old anchor.
10. A succeeded template applies to the draft, displays its generated references and does not publish automatically.

- [ ] **Step 6: Verify cost and history invariants**

Use one overall run and one three-image calibration run:

- overall submits exactly one `generate_image` call;
- calibration submits anchor, environment and UI only;
- every call uses `count = 1` semantics;
- module inputs reuse anchor `asset_id` without `upload_asset`;
- history records retain run ID, node ID, prompt, references and remote asset ID;
- local template retry makes no remote call.

- [ ] **Step 7: Review the final diff against all twelve spec acceptance criteria**

Check every acceptance item in the design spec and record any gap before reporting completion. Do not infer UI compliance from unit tests alone.

- [ ] **Step 8: Commit the completed feature if authorized**

```powershell
git add app server.py omnigen_service.py style_guide_service.py style_guide_visual_service.py style_guide_visual_prompts.py style_guide_visual_renderer.py tests docs/GENERATION_RULES.zh-CN.md docs/superpowers/specs/2026-07-17-style-guide-visual-generation-wizard-design.md docs/superpowers/plans/2026-07-17-style-guide-visual-generation-wizard.md
git commit -m "feat: generate modular game art visual guides"
```

## Execution notes

- Execute from the root checkout on the current main development workspace.
- Preserve all existing uncommitted changes; never reset or discard unrelated work.
- Before implementation, restate L3 verification: 80 new focused automated checks, complete existing suites and 10 browser scenarios.
- The user must explicitly authorize any commit or push.
