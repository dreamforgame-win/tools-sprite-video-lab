const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.resolve(__dirname, "..", "app", "app.js"), "utf8");

function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  return start >= 0 && end > start ? source.slice(start, end) : "";
}

test("global paste dispatch gives style exploration first refusal", () => {
  assert.match(source, /if \(await handleStylePasteImport\(event\)\) return;\s*await handleImagePasteImport\(event\);/);
});

test("style paste ignores editable fields and unrelated modules", () => {
  const handler = functionSource("handleStylePasteImport", "supportsClipboardImageRead");
  assert.match(handler, /state\.activeModule !== "style"/);
  assert.match(handler, /isPasteInsideEditable\(event\.target\)/);
  assert.match(handler, /clipboardImageFiles\(event\)\.filter\(isSupportedImageFile\)/);
});

test("generation-panel paste appends local files without importing immediately", () => {
  const append = functionSource("appendStyleGenerationReferenceFiles", "styleCanvasForReferenceImport");
  const handler = functionSource("handleStylePasteImport", "supportsClipboardImageRead");
  assert.match(append, /new DataTransfer\(\)/);
  assert.match(append, /syncStyleGenerationReferenceState\(\)/);
  assert.match(handler, /styleContent\?\.type === "generation"/);
  assert.doesNotMatch(append, /uploadProjectReferenceImages|patchStyle/);
});

test("resource paste uploads, assigns the selected group, and persists canvas", () => {
  const importer = functionSource("importPastedStyleReferenceImages", "handleStylePasteImport");
  assert.match(importer, /uploadProjectReferenceImages/);
  assert.match(importer, /patchStyle/);
  assert.match(importer, /node\.group_id = groupId/);
  assert.match(importer, /persistStyleCanvas/);
  assert.match(importer, /到未分组/);
});

test("ordinary generate action starts with an empty reference selection", () => {
  const actions = functionSource("runProjectAssetAction", "activateProjectModule");
  assert.match(actions, /action === "style-open-generate"[\s\S]*?styleGenerationReferencePaths = new Set\(\)/);
});

test("canvas group menu can prefill generation within the model limit", () => {
  const command = functionSource("runProjectCanvasContextCommand", "openProjectCanvasContextMenu");
  const menu = functionSource("openProjectCanvasContextMenu", "updateProjectCanvasGeometry");
  const open = functionSource("openStyleGenerationFromCanvasGroup", "runProjectAssetAction");
  assert.match(command, /reference-generate-group/);
  assert.match(menu, /以此为参考生图/);
  assert.match(open, /styleModelReferenceLimit\(\)/);
  assert.match(open, /paths\.slice\(0, limit\)/);
  assert.match(open, /styleGenerationReferencePaths = new Set/);
});
