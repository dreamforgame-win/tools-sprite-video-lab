const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.resolve(__dirname, "../app/app.js"), "utf8");
const html = fs.readFileSync(path.resolve(__dirname, "../app/index.html"), "utf8");
const css = fs.readFileSync(path.resolve(__dirname, "../app/styles.css"), "utf8");
const rules = fs.readFileSync(path.resolve(__dirname, "../docs/GENERATION_RULES.zh-CN.md"), "utf8");
const design = fs.readFileSync(path.resolve(__dirname, "../docs/SUNNY_STAGE_DESIGN_LANGUAGE.zh-CN.md"), "utf8");

function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  return start >= 0 && end > start ? source.slice(start, end) : "";
}

test("shared rules define blank-area actions and production canvas node details", () => {
  assert.match(rules, /空白区域右键/);
  assert.match(rules, /生成图片.*添加参考图/);
  assert.match(rules, /图片资产生产.*画布节点.*详情/);
  assert.match(design, /生成视觉指导图.*蓝色辅助按钮/);
});

test("style toolbar uses the blue guide action and icon-only reference action beside settings", () => {
  const toolbar = functionSource("renderStyleContentToolbar", "styleGuideVersionModuleLabel");
  assert.match(toolbar, /secondary-button/);
  assert.match(toolbar, /style-reference-icon-button/);
  assert.match(toolbar, /workbenchIcon\("imagePlus"\)/);
  assert.ok(toolbar.indexOf("style-reference-icon-button") < toolbar.indexOf("style-settings-icon-button"));
});

test("blank context actions cover style resources, guide repository, and production", () => {
  const actions = functionSource("workspaceQuickActionItems", "runWorkspaceQuickAction");
  const runner = functionSource("runWorkspaceQuickAction", "openWorkspaceQuickActionContextMenu");
  const menu = functionSource("openWorkspaceQuickActionContextMenu", "renderStyleDirectionList");
  assert.match(actions, /style-resources/);
  assert.match(actions, /style-guides/);
  assert.match(actions, /production/);
  assert.match(actions, /生成图片/);
  assert.match(actions, /添加参考图/);
  assert.match(actions, /生成风格模板/);
  assert.match(runner, /style-open-generate/);
  assert.match(runner, /style-open-reference/);
  assert.match(menu, /style-content-context-menu/);
  assert.match(menu, /ensureStyleContentContextMenuBindings\(\)/);
});

test("list, repository, and shared canvas blank areas open the matching quick menu", () => {
  const list = functionSource("bindStyleContentListInteractions", "renderStyleCompareWorkspace");
  const repository = functionSource("bindStyleGuideRepositoryInteractions", "renderStyleModule");
  const canvas = functionSource("openProjectCanvasContextMenu", "updateProjectCanvasGeometry");
  const aiContext = functionSource("handleAiResultContextMenu", "runAiResultContextCommand");
  assert.match(list, /openWorkspaceQuickActionContextMenu\("style-resources"/);
  assert.match(repository, /openWorkspaceQuickActionContextMenu\("style-guides"/);
  assert.match(canvas, /workspaceQuickActionItems/);
  assert.match(aiContext, /openWorkspaceQuickActionContextMenu\("production"/);
});

test("production blank quick actions stay out of generation history", () => {
  const aiContext = functionSource("handleAiResultContextMenu", "runAiResultContextCommand");
  assert.match(aiContext, /event\.currentTarget !== els\.aiResultGrid/);
});

test("production list and canvas share usable generation and reference buttons", () => {
  assert.match(html, /id="aiOpenGeneratePanelButton"/);
  assert.match(html, /id="aiAddReferenceButton"/);
  const productionHeader = html.match(/<header class="ai-production-header">[\s\S]*?<\/header>/)?.[0] || "";
  const resultSection = html.match(/<section class="ai-node-results-section">[\s\S]*?<\/section>/)?.[0] || "";
  const canvasSection = html.match(/<section id="aiProductionCanvasWorkspace"[\s\S]*?<\/section>/)?.[0] || "";
  assert.doesNotMatch(productionHeader, /ai-production-quick-actions/);
  assert.match(resultSection, /class="ai-production-quick-actions"/);
  assert.match(canvasSection, /class="ai-production-quick-actions"/);
  assert.match(resultSection, /data-ai-production-action="generate"/);
  assert.match(canvasSection, /data-ai-production-action="reference"/);
  const context = functionSource("renderAiAssetContext", "renderAiResultDetail");
  assert.match(context, /data-ai-production-action/);
  assert.match(context, /button\.disabled = !isGenerationTarget/);
  assert.match(source, /openAiProductionReferencePicker/);
});

test("production canvas nodes open result or asset-node information in the shared inspector", () => {
  const detail = functionSource("renderAiProductionCanvasNodeDetail", "renderAiProductionInspector");
  const open = functionSource("openAiProductionCanvasNodeInspector", "closeAiProductionInspector");
  const canvas = functionSource("bindCanvasInteractions", "handleCanvasAction");
  assert.match(detail, /aiAssetNodeById/);
  assert.match(detail, /asset-detail-meta/);
  assert.match(open, /activeInspector = "result"/);
  assert.match(open, /activeInspector = "canvas-node"/);
  assert.match(canvas, /openAiProductionCanvasNodeInspector/);
});

test("auxiliary and icon quick actions have dedicated styles", () => {
  assert.match(css, /\.secondary-button/);
  assert.match(css, /\.style-reference-icon-button/);
  assert.match(css, /\.ai-production-quick-actions/);
});
