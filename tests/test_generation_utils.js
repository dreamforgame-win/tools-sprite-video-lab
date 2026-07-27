const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
let generationUtils = {};
try {
  generationUtils = require(path.join(root, "app", "generation-utils.js"));
} catch {
  generationUtils = {};
}

test("smart ratio maps the first reference dimensions to the closest supported ratio", () => {
  const ratio = generationUtils.closestSupportedAspectRatio?.(
    1200,
    1600,
    ["1:1", "3:4", "4:3", "16:9", "9:16"],
  );
  assert.equal(ratio, "3:4");
});

test("smart ratio falls back to 1:1 without a reference image", () => {
  const ratio = generationUtils.closestSupportedAspectRatio?.(
    0,
    0,
    ["3:4", "1:1", "16:9"],
  );
  assert.equal(ratio, "1:1");
});

test("image generation count is initially one", () => {
  const html = fs.readFileSync(path.join(root, "app", "index.html"), "utf8");
  const select = html.match(/<select id="aiCountSelect"[^>]*>([\s\S]*?)<\/select>/)?.[1] || "";
  assert.match(select, /<option value="1" selected>生成 1 张<\/option>/);
  assert.doesNotMatch(select, /<option value="[248]" selected>/);
});

test("generation reference paths are normalized and deduplicated", () => {
  const references = generationUtils.generationReferencePaths?.({
    params: {
      reference_images: [
        "production/images/source.png",
        "",
        "production/images/source.png",
        ".sprite-lab/references/reference/other.png",
      ],
    },
  });
  assert.deepEqual(references, [
    "production/images/source.png",
    ".sprite-lab/references/reference/other.png",
  ]);
});

test("generation reference paths read relative paths from structured snapshots", () => {
  const references = generationUtils.generationReferencePaths?.({
    params: {
      reference_images: [
        {
          relative_path: "production/images/anchor.png",
          remote_asset_id: "asset-anchor",
          source_record_id: "record-anchor",
        },
      ],
    },
  });
  assert.deepEqual(references, ["production/images/anchor.png"]);
});

test("generation reference paths deduplicate mixed legacy and structured entries", () => {
  const references = generationUtils.generationReferencePaths?.({
    params: {
      reference_images: [
        "production/images/anchor.png",
        { relative_path: "production/images/anchor.png" },
        { relative_path: "production/images/module.png" },
      ],
    },
  });
  assert.deepEqual(references, [
    "production/images/anchor.png",
    "production/images/module.png",
  ]);
});

test("generation reference paths ignore malformed structured entries", () => {
  const references = generationUtils.generationReferencePaths?.({
    params: {
      reference_images: [
        null,
        {},
        { relative_path: "" },
        { remote_asset_id: "remote-only" },
        { relative_path: "  production/images/valid.png  " },
      ],
    },
  });
  assert.deepEqual(references, ["production/images/valid.png"]);
});

test("reference optimization predicts one input for two or more images", () => {
  assert.equal(generationUtils.effectiveReferenceCount?.(0, true), 0);
  assert.equal(generationUtils.effectiveReferenceCount?.(1, true), 1);
  assert.equal(generationUtils.effectiveReferenceCount?.(8, true), 1);
  assert.equal(generationUtils.effectiveReferenceCount?.(8, false), 8);
});

test("effective count combines only references with the same responsibility", () => {
  assert.equal(generationUtils.effectiveReferenceCountByRole?.({ content: 2, style: 1 }, true), 2);
  assert.equal(generationUtils.effectiveReferenceCountByRole?.({ content: 3, style: 1, identity: 1 }, true), 3);
  assert.equal(generationUtils.effectiveReferenceCountByRole?.({ content: 2, style: 1 }, false), 3);
});

test("reference optimization explains idle combined and disabled states", () => {
  assert.equal(
    generationUtils.generationOptimizationText?.(1, 1, true),
    "当前无需合并",
  );
  assert.equal(
    generationUtils.generationOptimizationText?.(8, 1, true),
    "将 8 张参考图合并为 1 张实际输入",
  );
  assert.equal(
    generationUtils.generationOptimizationText?.(8, 8, false),
    "将按 8 张参考图分别提交",
  );
});

test("batch CNY quote uses the shared requested formula", () => {
  const view = generationUtils.formatGenerationCostEstimate?.({
    currency: "CNY",
    exact: true,
    reference: {
      unit_price: 0.1,
      free_quantity: 0,
      billable_count: 1,
      subtotal: 0.1,
    },
    generation: { unit_price: 0.395, subtotal: 0.395 },
    per_task_total: 0.495,
    task_count: 4,
    total: 1.98,
    savings: 2.8,
  });

  assert.equal(
    view.formula,
    "（参考图 ¥0.10 × 1 + 生成 ¥0.395）× 4 张 = 预计 ¥1.98",
  );
  assert.equal(view.detail, "预计节省 ¥2.80");
  assert.equal(view.tone, "exact");
});

test("role-aware quote can distinguish content references and style templates", () => {
  const view = generationUtils.formatGenerationCostEstimate?.({
    currency: "CNY",
    exact: true,
    reference: {
      unit_price: 0.1,
      free_quantity: 0,
      billable_count: 2,
      subtotal: 0.2,
    },
    generation: { unit_price: 0.045, subtotal: 0.045 },
    task_count: 1,
    total: 0.245,
  }, { referenceLabel: "内容参考 + 风格模板" });

  assert.equal(
    view.formula,
    "内容参考 + 风格模板 ¥0.10 × 2 + 生成 ¥0.045 = 预计 ¥0.245",
  );
});

test("free reference pricing and fixed output pricing remain readable", () => {
  const free = generationUtils.formatGenerationCostEstimate?.({
    currency: "CNY",
    exact: true,
    reference: {
      unit_price: 0.02,
      free_quantity: 1,
      billable_count: 0,
      subtotal: 0,
    },
    generation: { unit_price: 0.3, subtotal: 0.3 },
    per_task_total: 0.3,
    task_count: 1,
    total: 0.3,
    savings: 0.06,
  });
  assert.equal(
    free.formula,
    "参考图首张免费，后续 ¥0.02 × 0 + 生成 ¥0.30 = 预计 ¥0.30",
  );

  const fixed = generationUtils.formatGenerationCostEstimate?.({
    currency: "CNY",
    exact: true,
    reference: {
      unit_price: null,
      free_quantity: 0,
      billable_count: 0,
      subtotal: 0,
    },
    generation: { unit_price: 0.25, subtotal: 0.25 },
    per_task_total: 0.25,
    task_count: 1,
    total: 0.25,
    savings: 0,
  });
  assert.equal(
    fixed.formula,
    "参考图不单独计费 + 生成 ¥0.25 = 预计 ¥0.25",
  );
});

test("token fallback and unavailable quote never pretend to be exact zero", () => {
  const fallback = generationUtils.formatGenerationCostEstimate?.({
    currency: "USD",
    exact: false,
    used_fallback: true,
    reference: {
      unit_price: null,
      billable_count: 0,
      subtotal: null,
    },
    generation: { unit_price: 0.0672, subtotal: 0.0672 },
    per_task_total: 0.0672,
    task_count: 1,
    total: 0.0672,
    savings: null,
  });
  assert.equal(fallback.formula, "供应商回退估价：约 $0.0672");
  assert.match(fallback.detail, /实际 Token 用量/);

  const unavailable = generationUtils.formatGenerationCostEstimate?.({
    currency: "USD",
    exact: false,
    total: null,
    unavailable_reason: "缺少可用回退价",
  });
  assert.equal(
    unavailable.formula,
    "暂无法精确预估：缺少可用回退价",
  );
  assert.notEqual(unavailable.formula, "$0.00");
});

test("dragging a selected image moves the selected image set", () => {
  assert.deepEqual(
    generationUtils.styleDragContentKeys?.(
      "generation_result:a",
      ["generation_result:a", "style_reference:b", "note:c"],
      ["generation_result:a", "style_reference:b"],
    ),
    ["generation_result:a", "style_reference:b"],
  );
});

test("dragging an unselected image moves only the dragged image", () => {
  assert.deepEqual(
    generationUtils.styleDragContentKeys?.(
      "generation_result:a",
      ["style_reference:b"],
      ["generation_result:a", "style_reference:b"],
    ),
    ["generation_result:a"],
  );
});

test("group move plan ignores items already in the target group", () => {
  assert.deepEqual(
    generationUtils.styleGroupMoveKeys?.([
      { key: "generation_result:a", groupId: "scene" },
      { key: "style_reference:b", groupId: "" },
    ], "scene"),
    ["style_reference:b"],
  );
});

test("moving to ungrouped clears only grouped images", () => {
  assert.deepEqual(
    generationUtils.styleGroupMoveKeys?.([
      { key: "generation_result:a", groupId: "scene" },
      { key: "style_reference:b", groupId: "" },
    ], ""),
    ["generation_result:a"],
  );
});
