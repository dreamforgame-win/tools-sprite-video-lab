const assert = require("node:assert/strict");
const test = require("node:test");
const {
  PROFESSIONAL_MODULES,
  canRetryVisualGuideNode,
  isStyleDirectionResourceRecord,
  isVisualGuideRunActive,
  isVisualGuideRunLocked,
  normalizeVisualGuideVariants,
  normalizeVisualGuideModules,
  preserveScrollPosition,
  preserveScrollPositions,
  visualGuideNodePlan,
  visualGuideNodeStatusLabel,
  visualGuideCostEstimateInput,
  visualGuideCostEstimateInputs,
  visualGuideRunIndicator,
  visualGuideStepState,
  visualGuideTaskCount,
} = require("../app/style-guide-visual-utils.js");

test("template variants default to compact and never normalize to empty", () => {
  assert.deepEqual(normalizeVisualGuideVariants(), ["compact"]);
  assert.deepEqual(normalizeVisualGuideVariants(["detailed", "compact"]), ["compact", "detailed"]);
  assert.throws(() => normalizeVisualGuideVariants([]), /至少选择一种模板规格/);
});

test("compact and detailed modular graphs remain independent", () => {
  assert.deepEqual(
    visualGuideNodePlan("modular", ["character"], ["compact", "detailed"]),
    [
      "compact:anchor",
      "compact:character",
      "detailed:anchor",
      "detailed:character",
      "detailed:template",
    ],
  );
  assert.equal(visualGuideTaskCount("modular", ["character"], ["compact", "detailed"]), 4);
});

test("variant quote inputs exclude the detailed local renderer", () => {
  assert.deepEqual(
    visualGuideCostEstimateInputs("overall", ["environment"], ["compact", "detailed"], 4, 2),
    [
      { variant: "compact", originalCount: 2, optimizationEnabled: true, taskCount: 1 },
      { variant: "detailed", originalCount: 2, optimizationEnabled: true, taskCount: 1 },
    ],
  );
});

test("visual guide cost input counts only paid image tasks and caps selected references", () => {
  assert.equal(typeof visualGuideCostEstimateInput, "function");
  assert.deepEqual(
    visualGuideCostEstimateInput("overall", ["environment"], 4, 2),
    { originalCount: 2, optimizationEnabled: true, taskCount: 1 },
  );
  assert.deepEqual(
    visualGuideCostEstimateInput("modular", PROFESSIONAL_MODULES, 4, 3),
    { originalCount: 3, optimizationEnabled: true, taskCount: 6 },
  );
});

test("overall mode has one image node and one local template node", () => {
  assert.deepEqual(
    visualGuideNodePlan("overall", ["environment", "ui_hud"], ["detailed"]),
    ["detailed:overall", "detailed:template"],
  );
  assert.equal(visualGuideTaskCount("overall", ["environment", "ui_hud"], ["detailed"]), 1);
});

test("modular mode has anchor selected modules and template", () => {
  assert.deepEqual(
    visualGuideNodePlan("modular", ["ui_hud", "environment"], ["detailed"]),
    ["detailed:anchor", "detailed:environment", "detailed:ui_hud", "detailed:template"],
  );
  assert.equal(visualGuideTaskCount("modular", ["ui_hud", "environment"], ["detailed"]), 3);
});

test("future steps remain locked", () => {
  assert.equal(visualGuideStepState(1, 1), "current");
  assert.equal(visualGuideStepState(2, 1), "locked");
  assert.equal(visualGuideStepState(3, 2), "locked");
});

test("completed steps are distinguished", () => {
  assert.equal(visualGuideStepState(1, 2), "completed");
  assert.equal(visualGuideStepState(2, 2), "current");
});

test("all steps become available after a run has been created", () => {
  assert.equal(visualGuideStepState(3, 1, { runStarted: true }), "available");
  assert.equal(visualGuideStepState(1, 2, { runStarted: true }), "available");
  assert.equal(visualGuideStepState(2, 2, { runStarted: true }), "current");
});

test("module order is canonical", () => {
  assert.deepEqual(normalizeVisualGuideModules(["ui_hud", "character", "environment"]), ["environment", "character", "ui_hud"]);
});

test("unknown module ids are removed", () => {
  assert.deepEqual(normalizeVisualGuideModules(["unknown", "environment"]), ["environment"]);
});

test("professional module default contains five entries", () => {
  assert.equal(PROFESSIONAL_MODULES.length, 5);
  assert.deepEqual(normalizeVisualGuideModules(), PROFESSIONAL_MODULES);
});

test("overall mode requires one selected module", () => {
  assert.throws(() => visualGuideNodePlan("overall", []), /至少选择一个模块/);
});

test("node status labels are localized", () => {
  assert.equal(visualGuideNodeStatusLabel("running"), "生成中");
  assert.equal(visualGuideNodeStatusLabel("invalidated"), "需重新生成");
});

test("failed and invalidated image nodes plus failed templates can retry", () => {
  assert.equal(canRetryVisualGuideNode({ status: "failed", kind: "image" }), true);
  assert.equal(canRetryVisualGuideNode({ status: "invalidated", kind: "image" }), true);
  assert.equal(canRetryVisualGuideNode({ status: "failed", kind: "local" }), true);
  assert.equal(canRetryVisualGuideNode({ status: "succeeded", kind: "image" }), false);
});

test("running visual guides expose recoverable progress outside the dialog", () => {
  assert.deepEqual(visualGuideRunIndicator({
    status: "running",
    nodes: [{ status: "succeeded" }, { status: "running" }, { status: "pending" }],
  }), {
    active: true,
    tone: "running",
    label: "生成中 · 查看进度",
    progress: "1/3",
    ariaLabel: "视觉指导图生成中，已完成 1 / 3 个节点，查看进度",
  });
});

test("failed visual guides stay recoverable while completed runs return to create", () => {
  assert.equal(visualGuideRunIndicator({ status: "failed", nodes: [{ status: "succeeded" }, { status: "failed" }] }).label, "生成失败 · 查看详情");
  assert.equal(visualGuideRunIndicator({ status: "finalize_failed", nodes: [{ status: "succeeded" }] }).label, "保存失败 · 查看详情");
  assert.equal(visualGuideRunIndicator({ status: "applied", nodes: [{ status: "succeeded" }] }), null);
  assert.equal(visualGuideRunIndicator(null), null);
});

test("active child nodes override a stale failed parent status", () => {
  const run = {
    status: "failed",
    nodes: [{ status: "failed" }, { status: "running" }, { status: "pending" }],
  };
  assert.equal(isVisualGuideRunActive(run), true);
  assert.deepEqual(visualGuideRunIndicator(run), {
    active: true,
    tone: "running",
    label: "生成中 · 查看进度",
    progress: "0/3",
    ariaLabel: "视觉指导图生成中，已完成 0 / 3 个节点，查看进度",
  });
});

test("direction resources hide unfinished internal visual records but retain ordinary failures", () => {
  assert.equal(isStyleDirectionResourceRecord({ status: "failed", style_guide_visual_run_id: "run-1" }), false);
  assert.equal(isStyleDirectionResourceRecord({ status: "queued", style_guide_visual_run_id: "run-1" }), false);
  assert.equal(isStyleDirectionResourceRecord({ status: "succeeded", style_guide_visual_run_id: "run-1", local_url: "/image.png" }), true);
  assert.equal(isStyleDirectionResourceRecord({ status: "failed" }), true);
});

test("only active and canceling runs lock visual settings", () => {
  assert.equal(isVisualGuideRunLocked({ status: "running" }), true);
  assert.equal(isVisualGuideRunLocked({ status: "failed", nodes: [{ status: "queued" }] }), true);
  assert.equal(isVisualGuideRunLocked({ status: "canceling", nodes: [] }), true);
  assert.equal(isVisualGuideRunLocked({ status: "failed" }), false);
  assert.equal(isVisualGuideRunLocked({ status: "canceled" }), false);
});

test("canceling visual guides expose cancellation progress", () => {
  const indicator = visualGuideRunIndicator({ status: "canceling", nodes: [{ status: "running" }, { status: "canceled" }] });
  assert.equal(indicator.tone, "canceling");
  assert.equal(indicator.label, "取消中 · 查看进度");
});

test("dialog refresh restores the prior scroll position on the replacement body", () => {
  const before = { scrollTop: 611, scrollHeight: 1259, clientHeight: 535 };
  const after = { scrollTop: 0, scrollHeight: 1259, clientHeight: 535 };
  let rendered = false;
  const root = { querySelector: () => rendered ? after : before };
  preserveScrollPosition(root, ".scroll-body", () => { rendered = true; });
  assert.equal(after.scrollTop, 611);
});

test("module refresh restores multiple independent scroll containers and clamps removed content", () => {
  const before = new Map([
    [".directions", { scrollTop: 240, scrollHeight: 900, clientHeight: 300 }],
    [".content", { scrollTop: 720, scrollHeight: 1600, clientHeight: 500 }],
    [".detail", { scrollTop: 180, scrollHeight: 700, clientHeight: 300 }],
  ]);
  const after = new Map([
    [".directions", { scrollTop: 0, scrollHeight: 900, clientHeight: 300 }],
    [".content", { scrollTop: 0, scrollHeight: 850, clientHeight: 500 }],
    [".detail", { scrollTop: 0, scrollHeight: 700, clientHeight: 300 }],
  ]);
  let rendered = false;
  const root = { querySelector: (selector) => (rendered ? after : before).get(selector) || null };
  preserveScrollPositions(root, [".directions", ".content", ".detail"], () => { rendered = true; });
  assert.equal(after.get(".directions").scrollTop, 240);
  assert.equal(after.get(".content").scrollTop, 350);
  assert.equal(after.get(".detail").scrollTop, 180);
});
