const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(
  path.resolve(__dirname, "..", "app", "app.js"),
  "utf8",
);

function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  return start >= 0 && end > start ? source.slice(start, end) : "";
}

test("style result detail removes status and obsolete result actions", () => {
  const detail = functionSource("renderGenerationReferenceThumbs", "libraryStatusLabel");
  assert.ok(detail);
  assert.doesNotMatch(
    detail,
    /结果状态|业务状态|设为候选|确认结果|生成变体|<textarea/,
  );
});

test("style result detail uses compact reference metadata and actions", () => {
  const detail = functionSource("renderGenerationReferenceThumbs", "libraryStatusLabel");
  assert.match(detail, /提示词/);
  assert.match(detail, /参考图/);
  assert.match(detail, /style-result-reference-preview/);
  assert.match(detail, /style-result-regenerate/);
  assert.match(detail, /style-result-library/);
  assert.match(detail, /style-result-cover/);
  assert.match(detail, /style-result-delete/);
});

test("regenerate opens the generation panel without submitting immediately", () => {
  const handler = functionSource(
    "runStyleContentCommand",
    "closeStyleContentContextMenus",
  );
  assert.match(handler, /command === "regenerate"/);
  assert.match(handler, /styleGenerationReferencePaths/);
  assert.match(handler, /type: "generation"/);
  assert.doesNotMatch(handler, /generateStyleImage/);
});

test("completed style result cards and comparisons omit status labels", () => {
  const items = functionSource("styleContentItems", "styleContentKey");
  const cards = functionSource("renderStyleContentCard", "renderStyleContentList");
  const compare = functionSource(
    "renderStyleCompareWorkspace",
    "renderStyleModule",
  );
  assert.doesNotMatch(items, /styleStatusLabel\(record\.lifecycle_status/);
  assert.doesNotMatch(cards, /aiStatusLabel\(record\).*lifecycle-chip/);
  assert.doesNotMatch(compare, /aiStatusLabel\(item\.record\)/);
});
