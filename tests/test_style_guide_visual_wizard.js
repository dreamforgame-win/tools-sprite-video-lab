const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const app = fs.readFileSync(path.resolve(__dirname, "../app/app.js"), "utf8");
const html = fs.readFileSync(path.resolve(__dirname, "../app/index.html"), "utf8");
const css = fs.readFileSync(path.resolve(__dirname, "../app/styles.css"), "utf8");
const visualUtils = fs.readFileSync(path.resolve(__dirname, "../app/style-guide-visual-utils.js"), "utf8");

test("wizard contains the main semantic dialog", () => assert.match(html, /id="styleGuideVisualWizard"/));
test("wizard contains three named steps", () => {
  assert.match(app, /选择参考图/);
  assert.match(app, /生成设置/);
  assert.match(app, /生成模板/);
});
test("locked steps explain prerequisites", () => {
  assert.match(app, /data-visual-guide-step/);
  assert.match(app, /请先完成/);
});
test("created runs keep every wizard tab reachable", () => {
  assert.match(app, /visualGuideStepState\(step, wizard\.step, \{ runStarted: Boolean\(wizard\.run\) \}\)/);
  assert.match(app, /if \(!wizard\.run && step > wizard\.step\)/);
  assert.match(css, /\.style-guide-visual-stepper \.available/);
});
test("wizard uses a fixed workbench with internal scrolling", () => {
  assert.match(css, /\.style-guide-visual-wizard/);
  assert.match(css, /\.style-guide-visual-body[\s\S]*overflow:\s*auto/);
});
test("secondary reference and prompt dialogs have stable ids", () => {
  assert.match(html, /styleGuideVisualReferenceDialog/);
  assert.match(html, /styleGuideVisualPromptDialog/);
});
test("escape layering checks lightbox before visual dialogs", () => {
  assert.ok(app.indexOf("imageLightbox?.hidden") < app.lastIndexOf("styleGuideVisualPromptDialog"));
});
test("first step keeps a selected thumbnail strip", () => assert.match(app, /style-guide-visual-reference-strip/));
test("first step exposes choose and clear actions", () => {
  assert.match(app, /选择参考图/);
  assert.match(app, /清空/);
});
test("reference picker reuses grouped style content", () => assert.match(app, /styleContentSections/));
test("reference picker removes notes and unresolved sources after grouping", () => {
  assert.match(app, /section\.items[\s\S]*?filter\(\(item\) => item\.image && styleContentRelativePath\(item\)\)/);
  assert.match(app, /filter\(\(section\) => section\.items\.length\)/);
});
test("reference picker reuses global large preview", () => assert.match(app, /openImageLightbox/));
test("reference preview image cannot cover its independent checkbox", () => {
  assert.match(css, /\.style-guide-visual-reference-grid button\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.match(css, /\.style-guide-visual-reference-grid button img\s*\{[\s\S]*?position:\s*absolute[\s\S]*?inset:\s*0/);
});
test("cancel keeps committed references through referenceDraft", () => {
  assert.match(app, /referenceDraft/);
  assert.match(app, /styleGuideVisualCancelReferences/);
});
test("picker displays selected and model limit count", () => assert.match(app, /data-visual-reference-count/));
test("reference selection updates in place without rebuilding the scrolled dialog", () => {
  const bindings = app.match(/function bindStyleGuideVisualDialogs[\s\S]*?function renderStyleModule/)?.[0] || "";
  assert.match(app, /function updateStyleGuideVisualReferenceDialogState/);
  assert.match(bindings, /updateStyleGuideVisualReferenceDialogState\(\)/);
  const changeHandler = bindings.match(/references\?\.addEventListener\("change"[\s\S]*?\n\s*}\);/)?.[0] || "";
  assert.doesNotMatch(changeHandler, /renderStyleGuideVisualReferenceDialog\(\)/);
});
test("wizard defaults to modular mode with professional modules", () => {
  assert.match(app, /mode:\s*"modular"/);
  assert.match(app, /PROFESSIONAL_MODULES/);
});

test("wizard defaults to compact template and allows both variants", () => {
  assert.match(app, /requestedVariants:\s*\["compact"\]/);
  assert.match(app, /data-visual-template-variant="\$\{variant\}"/);
  assert.match(app, /\["compact", "简略版"/);
  assert.match(app, /\["detailed", "详细版"/);
  assert.match(app, /至少保留一种模板规格/);
});

test("variant controls lock while tabs previews and scoped cancel stay available", () => {
  assert.match(app, /data-visual-template-variant/);
  assert.match(app, /data-visual-variant-tab/);
  assert.match(app, /data-visual-cancel-variant/);
  assert.match(app, /preview-node/);
  assert.match(app, /body: variant \? \{ variant \} : \{\}/);
});

test("dual selection renders variant estimates and an arithmetic total", () => {
  for (const label of ["简略版预计", "详细版预计", "合计预计"]) assert.match(app, new RegExp(label));
  assert.match(app, /visualGuideCostEstimateInputs/);
  assert.match(app, /totals\.reduce/);
});
test("wizard defaults to compact mobile-game detail profile and exposes three profiles", () => {
  assert.match(app, /detailProfile:\s*"compact"/);
  assert.match(app, /data-visual-detail-profile/);
  for (const text of ["小游戏推荐", "移动端常规细节", "近距离概念展示"]) assert.match(app, new RegExp(text));
});
test("detail profile participates in requests input keys and run recovery", () => {
  const occurrences = app.match(/detail_profile/g) || [];
  assert.ok(occurrences.length >= 3);
  assert.match(app, /run\.detail_profile\s*\|\|\s*"compact"/);
});
test("visual dna is fixed in modular mode", () => assert.match(app, /视觉基因[\s\S]*disabled/));
test("overall mode requires at least one module", () => assert.match(app, /整体生成至少选择一个模块/));
test("mode changes do not overwrite the reference-derived smart ratio", () => {
  assert.doesNotMatch(app, /smartRatio\s*=\s*mode\s*===/);
});
test("prompt viewer shows master module negative and reference sections", () => {
  for (const text of ["母提示词", "模块提示词", "负面约束", "参考图顺序"]) assert.match(app, new RegExp(text));
});
test("task estimate excludes local template", () => assert.match(app, /远端图片任务[\s\S]*本地模板/));
test("generation settings show a shared live price estimate", () => {
  assert.match(app, /id="styleGuideVisualCostEstimate"/);
  assert.match(app, /scheduleStyleGuideVisualCostEstimate/);
  assert.match(app, /requestGenerationCostEstimate/);
  assert.match(app, /paintGenerationCostEstimate/);
});
test("visual guide quote guards against stale responses and does not block generation", () => {
  assert.match(app, /styleGuideVisualCostEstimateRequestId/);
  assert.match(app, /styleGuideVisualCostEstimateTimer/);
  assert.match(app, /paintGenerationCostEstimateError/);
  assert.match(app, /wizard\.moduleTypes\.length && wizard\.model/);
});
test("generation settings use a compact desktop grid and only fall back to one column on narrow screens", () => {
  assert.match(app, /style-guide-visual-settings-grid/);
  assert.match(css, /\.style-guide-visual-settings-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*0\.9fr\)\s+minmax\(0,\s*1\.1fr\)/s);
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*?\.style-guide-visual-settings-grid[\s\S]*?grid-template-columns:\s*1fr/s);
});
test("each visual node submits one image", () => assert.match(app, /count:\s*1/));
test("third step renders server owned dynamic nodes", () => assert.match(app, /run\.nodes/));
test("failed nodes expose targeted retry", () => assert.match(app, /data-visual-node-retry/));
test("closing wizard preserves polling", () => assert.match(app, /closeStyleGuideVisualWizard[\s\S]*pollTimer/));
test("opening guide resumes latest active visual run", () => assert.match(app, /visual-runs\?active=true/));
test("polling and cached run recovery follow active children instead of stale parent status", () => {
  assert.match(app, /isVisualGuideRunActive\(wizard\.run\)/);
  const resume = app.match(/async function resumeStyleGuideVisualRun[\s\S]*?\n}/)?.[0] || "";
  assert.match(resume, /scheduleStyleGuideVisualPoll\(\)/);
});
test("the page entry shows live progress and restores the same visual run", () => {
  assert.match(visualUtils, /生成中 · 查看进度/);
  assert.match(app, /data-style-guide-visual-run/);
  assert.match(app, /updateStyleGuideVisualRunIndicators/);
  assert.match(app, /visualGuideRunIndicator/);
});
test("anchor retry communicates downstream invalidation", () => assert.match(app, /锚点[\s\S]*失效/));
test("completed runs are auto-versioned and finalize failures can retry without generation", () => {
  assert.match(app, /published_version_id/);
  assert.match(app, /已自动保存为/);
  assert.match(app, /retry-finalize/);
  assert.match(app, /重试保存版本/);
});

test("starting a visual run immediately blocks the wizard and rejects duplicate submission", () => {
  assert.match(app, /submittingRun:\s*false/);
  assert.match(app, /if \(wizard\.submittingRun\) return/);
  assert.match(app, /aria-busy/);
  assert.match(app, /style-guide-visual-submit-overlay/);
  assert.match(app, /首次使用的图片可能需要上传/);
});

test("visual run submission enters progress on success and restores settings on failure", () => {
  const submit = app.match(/async function startStyleGuideVisualRun\(\)[\s\S]*?\n}\n\nfunction scheduleStyleGuideVisualPoll/)?.[0] || "";
  assert.match(submit, /wizard\.submittingRun = true/);
  assert.match(submit, /wizard\.step = 3/);
  assert.match(submit, /catch \(error\)/);
  assert.match(submit, /wizard\.submitError/);
  assert.match(submit, /wizard\.submittingRun = false/);
});

test("active runs lock reference and generation settings while keeping previews available", () => {
  const references = app.match(/function styleGuideVisualReferenceStrip[\s\S]*?\n}/)?.[0] || "";
  const settings = app.match(/function styleGuideVisualStepTwoMarkup[\s\S]*?\n}/)?.[0] || "";
  assert.match(references, /isVisualGuideRunLocked/);
  assert.match(references, /locked \? "disabled"/);
  assert.match(settings, /isVisualGuideRunLocked/);
  assert.match(settings, /locked \? "disabled"/);
  assert.match(settings, /open-prompt/);
});

test("active runs replace submission with progress navigation and cancellation", () => {
  const render = app.match(/function renderStyleGuideVisualWizard[\s\S]*?\n}/)?.[0] || "";
  assert.match(render, /view-progress/);
  assert.match(render, /cancel-run/);
  assert.match(render, /isVisualGuideRunLocked/);
});

test("soft cancellation warns about submitted tasks and calls the run cancel endpoint", () => {
  assert.match(app, /已提交的远端任务可能继续完成并计费/);
  assert.match(app, /visual-runs\/\$\{encodeURIComponent\(wizard\.run\.id\)\}\/cancel/);
  assert.match(app, /async function cancelStyleGuideVisualRun/);
});

test("canceling runs keep a visible progress tone after indicator refresh", () => {
  assert.match(app, /classList\.toggle\("is-canceling", indicator\?\.tone === "canceling"\)/);
  assert.match(css, /\.style-guide-visual-run-entry\.is-canceling/);
});

test("active visual nodes use localized status and visible motion hooks", () => {
  assert.match(app, /生成中/);
  assert.match(app, /is-active/);
  assert.match(css, /@keyframes style-guide-visual-orbit/);
  assert.match(css, /@keyframes style-guide-visual-flow/);
  assert.match(css, /\.style-guide-visual-nodes article\.is-active/);
});

test("visual guide motion has an explicit reduced-motion fallback", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.style-guide-visual-submit-spinner[\s\S]*?animation:\s*none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.style-guide-visual-nodes article\.is-active[\s\S]*?animation:\s*none/);
});
