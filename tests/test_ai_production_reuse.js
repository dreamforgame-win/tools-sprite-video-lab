const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "app", "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "app", "index.html"), "utf8");
const styles = fs.readFileSync(path.join(root, "app", "styles.css"), "utf8");

function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  return start >= 0 && end > start ? source.slice(start, end) : "";
}

function productionPanelMarkup() {
  const start = html.indexOf('<section id="aiCreationModule"');
  const end = html.indexOf('<section id="imageModule"', start + 1);
  return start >= 0 && end > start ? html.slice(start, end) : "";
}

test("asset production removes the asset description field and payload", () => {
  assert.doesNotMatch(productionPanelMarkup(), /aiAssetDescriptionInput|资产描述/);
  assert.doesNotMatch(source, /asset_description/);
});

test("generation settings follow reference, prompt, style, model and advanced order", () => {
  const panel = productionPanelMarkup();
  const positions = [
    panel.indexOf("aiGenerationReferencePicker"),
    panel.indexOf("aiPromptInput"),
    panel.indexOf("aiStyleGuideControls"),
    panel.indexOf("aiModelSelect"),
    panel.indexOf("ai-advanced-settings"),
  ];
  assert.ok(positions.every((value) => value >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test("asset summary is compact text instead of an editable description", () => {
  const panel = productionPanelMarkup();
  assert.match(panel, /class="ai-current-asset-summary"/);
  assert.match(panel, /id="aiCurrentAssetInput">未选择<\/strong>/);
  assert.match(panel, /id="aiCurrentAssetHint"/);
  assert.match(styles, /\.ai-current-asset-summary\s*\{[^}]*display:\s*grid;/s);
  assert.doesNotMatch(panel, /aiModelMeta|ai-model-meta/);
});

test("containers browse descendants while concrete assets own generation", () => {
  const context = functionSource("renderAiAssetContext", "loadAiAssetTree");
  const availability = functionSource("updateAiGenerateAvailability", "submitAiImageGeneration");
  const submit = functionSource("submitAiImageGeneration", "upsertAiHistoryRecord");
  assert.match(context, /isAiAssetGenerationTarget/);
  assert.match(context, /下的全部结果/);
  assert.match(context, /aiChildAssetsSection\.hidden = !selected \|\| isGenerationTarget/);
  assert.match(context, /请选择具体资产/);
  assert.match(context, /asset-container-active/);
  assert.match(context, /aiOpenGeneratePanelButton\.disabled = !isGenerationTarget/);
  assert.match(context, /aiAddReferenceButton\.disabled = !isGenerationTarget/);
  assert.match(context, /aiChildAssetCreateLabel\.textContent = `创建/);
  assert.match(availability, /!hasGenerationTarget/);
  assert.match(submit, /分类和分组不能作为生成目标/);
  assert.match(submit, /asset_node_id: targetNode\.id/);
  assert.match(styles, /\.ai-image-workspace\.asset-leaf-active\s*\{[^}]*grid-template-rows:\s*minmax\(0, 1fr\);/s);
  assert.match(productionPanelMarkup(), /class="ai-production-quick-actions"/);
  assert.match(productionPanelMarkup(), /id="aiAddReferenceButton"/);
  assert.match(styles, /\.ai-image-workspace\.asset-container-active\s*\{[^}]*grid-template-columns:\s*250px minmax\(0, 1fr\);/s);
  assert.match(styles, /\.ai-image-workspace\.asset-container-active \.ai-child-asset-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);[^}]*grid-auto-rows:\s*82px;[^}]*align-content:\s*start;/s);
});

test("container workspace keeps creation visible and groups aggregate results by asset", () => {
  const panel = productionPanelMarkup();
  const create = functionSource("createAiAssetNode", "renameSelectedAiAssetNode");
  const grid = functionSource("renderAiResultGrid", "selectedAiResultIds");
  const actions = functionSource("handleAiCardAction", "openAiPreviewDialog");
  assert.match(panel, /id="aiChildAssetCreateButton"/);
  assert.match(panel, /id="aiChildAssetCreateLabel">创建资产/);
  assert.match(styles, /\.ai-child-assets-section\s*\{[^}]*grid-template-rows:\s*auto auto minmax\(0, 1fr\);/s);
  assert.match(create, /selectAiAssetNode\(data\.node\.id\)/);
  assert.match(grid, /collapsedResultGroupIds/);
  assert.match(grid, /style-content-group/);
  assert.match(grid, /data-ai-result-group-action="select"/);
  assert.match(actions, /data-ai-result-group-action/);
});

test("aggregate results disclose their concrete asset source", () => {
  const card = functionSource("aiRecordCard", "renderAiResultGrid");
  const grid = functionSource("renderAiResultGrid", "selectedAiResultIds");
  assert.match(card, /showAssetSource/);
  assert.match(card, /归属：/);
  assert.match(grid, /includeDescendants = node\?\.type !== "asset"/);
  assert.match(grid, /showAssetSource: true/);
  assert.match(grid, /groupLabel/);
  assert.match(styles, /\.ai-result-card \.ai-card-asset-source/);
});

test("image generation count remains available and defaults to one", () => {
  const select = productionPanelMarkup().match(/<select id="aiCountSelect"[\s\S]*?<\/select>/)?.[0] || "";
  assert.match(select, /<option value="1" selected>生成 1 张<\/option>/);
  assert.doesNotMatch(select, /<option value="[248]" selected>/);
});

test("asset backgrounds remain transparent, solid and scene with swatches", () => {
  const constants = source.match(/const ASSET_GENERATION_BACKGROUNDS = \[([\s\S]*?)\];/)?.[1] || "";
  assert.match(constants, /value: "transparent"[\s\S]*swatch: "default"/);
  assert.match(constants, /value: "solid"[\s\S]*swatch: "white"/);
  assert.match(constants, /value: "scene"[\s\S]*swatch: "scene"/);
  assert.equal((constants.match(/value:/g) || []).length, 3);
  assert.match(styles, /\.style-background-swatch\.is-scene\s*\{/);
});

test("style and asset panels share the generic background control", () => {
  const render = functionSource("renderGenerationBackgroundControl", "renderStyleGenerationBackgroundControl");
  const bind = functionSource("bindGenerationBackgroundControl", "bindStyleGenerationBackgroundControl");
  const asset = functionSource("renderAiGenerationBackgroundControl", "updateAiGenerateAvailability");
  assert.match(render, /data-generation-background-control/);
  assert.match(bind, /data-generation-background-value/);
  assert.match(source, /data-generation-background-control="style"/);
  assert.match(asset, /data-generation-background-control="asset"/);
});

test("model occupies its own row and remaining parameters form a two by two grid", () => {
  const panel = productionPanelMarkup();
  const model = panel.indexOf('id="aiModelSelect"');
  const grid = panel.indexOf('class="ai-generation-parameter-grid"');
  assert.ok(model >= 0 && grid > model);
  assert.match(styles, /\.ai-generation-parameter-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
  assert.match(panel.slice(grid), /aiAspectRatioSelect[\s\S]*aiResolutionSelect[\s\S]*aiBackgroundControl[\s\S]*aiCountSelect/);
});

test("resolution options use the resolution xK display format", () => {
  const controls = functionSource("renderGenerationCapabilityControls", "renderAiGenerationBackgroundControl");
  assert.match(controls, /`分辨率 \$\{styleResolutionLabel\(value\)\}`/);
  assert.match(productionPanelMarkup(), />分辨率 1K<\/option>/);
});

test("reference picker supports grouped reuse, local files, preview and limits", () => {
  const render = functionSource("renderAiGenerationReferencePicker", "syncAiGenerationReferenceState");
  const clicks = functionSource("handleAiGenerationReferenceClick", "handleAiGenerationReferenceChange");
  assert.match(render, /data-ai-reference-section/);
  assert.match(render, /data-ai-reference-group/);
  assert.match(render, /data-ai-reference-record/);
  assert.match(clicks, /openImageLightbox/);
  assert.match(source, /aiModelReferenceLimit/);
  assert.match(productionPanelMarkup(), /id="aiReferenceImageInput"[^>]*multiple/);
});

test("submission merges reused and uploaded references without the removed description", () => {
  const submit = functionSource("submitAiImageGeneration", "upsertAiHistoryRecord");
  assert.match(submit, /selectedReferences\.map\(aiReferenceRecordPath\)/);
  assert.match(submit, /references\.map\(\(item\) => item\.relative_path\)/);
  assert.match(submit, /new Set/);
  assert.doesNotMatch(submit, /asset_description/);
});

test("result cards reuse style cards, detail, preview and temporary multi-select", () => {
  const card = functionSource("aiRecordCard", "renderAiResultGrid");
  assert.match(card, /style-content-card ai-result-card/);
  assert.match(card, /style-content-card-main/);
  assert.match(card, /data-ai-action="detail"/);
  assert.match(card, /data-ai-action="preview"/);
  assert.match(card, /data-ai-action="select"/);
  assert.match(card, /lifecycle === "normal" \? ""/);
  assert.doesNotMatch(card, /ai-card-actions|ai-card-more|data-ai-action="lifecycle"/);
  assert.doesNotMatch(card, /record\.id[^\n]*<small/);
  assert.match(styles, /\.ai-result-card\.style-content-card\s*\{[^}]*height:\s*220px;/s);
});

test("result selection bar and context menu expose shared production actions without business selection states", () => {
  const actions = functionSource("aiResultContextActions", "renderAiResultContextMenu");
  assert.match(styles, /\.ai-node-results-section\s*\{[^}]*grid-template-rows:\s*auto auto minmax\(0, 1fr\);/s);
  assert.match(productionPanelMarkup(), /id="aiResultSelectionBar"/);
  for (const command of ["preview", "process", "library", "similar", "download", "open", "delete"]) {
    assert.match(actions, new RegExp(`command: "${command}"`));
  }
  assert.doesNotMatch(actions, /mark-selected|command: "confirm"|设为已选|确认结果/);
  assert.doesNotMatch(productionPanelMarkup(), /value="selected"|value="confirmed"|data-production-canvas-action="select-result"/);
  assert.match(functionSource("workbenchIcon", "styleContentMenuActions"), /folder:/);
});

test("asset production omits the task queue and opens generation or result in an inset inspector", () => {
  const panel = productionPanelMarkup();
  const inspector = functionSource("renderAiProductionInspector", "closeAiProductionInspector");
  const open = functionSource("openAiProductionInspector", "setAiCreationView");
  assert.doesNotMatch(panel, /ai-task-panel|aiTaskTitle|aiTaskCount|aiTaskList|任务队列/);
  assert.doesNotMatch(panel, /ai-result-filter-row|aiResultStatusFilter|aiResultSortSelect/);
  assert.doesNotMatch(panel, /aiOpenProfileButton|服务配置/);
  assert.doesNotMatch(source, /renderAiTaskQueue|aiTaskCount|aiTaskList/);
  assert.match(panel, /id="aiSettingsColumn"[^>]*hidden/);
  assert.match(panel, /id="aiResultDetailPanel"/);
  assert.match(inspector, /ai-inspector-open/);
  assert.match(open, /activeInspector = "generation"/);
  assert.match(open, /activeInspector = "result"/);
  assert.match(styles, /\.ai-creation-module\.ai-inspector-open \.ai-settings-column\s*\{[^}]*position:\s*absolute;[^}]*top:\s*12px;[^}]*right:\s*12px;[^}]*bottom:\s*12px;[^}]*width:\s*min\(400px,/s);
  assert.match(styles, /\.ai-production-inspector-body\s*\{[^}]*background:\s*transparent;/s);
  assert.match(styles, /\.ai-production-inspector-body \.ai-create-panel\s*\{[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;/s);
  assert.match(styles, /\.style-inspector-body\s*\{[^}]*overflow:\s*auto;/s);
  assert.match(styles, /@media \(max-width: 760px\)[\s\S]*?\.ai-creation-module\.ai-inspector-open \.ai-settings-column\s*\{[^}]*top:\s*8px;[^}]*right:\s*8px;[^}]*bottom:\s*8px;/s);
  assert.match(styles, /body\.project-active \.ai-creation-module\.history-active\s*\{[^}]*grid-template-columns:\s*250px minmax\(420px, 1fr\);/s);
});

test("legacy selected and confirmed records render as normal and canvas reads all successful live results", () => {
  const lifecycle = functionSource("aiProductionLifecycle", "aiRecordsForAssetNode");
  const canvas = functionSource("productionCanvasItems", "setProductionView");
  assert.match(lifecycle, /\["in_library", "archived", "trashed"\]/);
  assert.doesNotMatch(lifecycle, /selected|confirmed/);
  assert.match(canvas, /entry\.status === "succeeded"/);
  assert.match(canvas, /entry\.lifecycle_status !== "trashed"/);
  assert.doesNotMatch(canvas, /\["selected", "confirmed", "in_library"\]/);
});

test("regenerate and similar actions prefill the generation inspector without submitting", () => {
  const commands = functionSource("runAiResultContextCommand", "handleAiCardAction");
  const cardActions = functionSource("handleAiCardAction", "setAiRecordLifecycle");
  const open = functionSource("openAiProductionInspector", "setAiCreationView");
  assert.match(commands, /command === "similar"\) openAiProductionInspector\("generation", record\)/);
  assert.match(commands, /command === "regenerate"\) openAiProductionInspector\("generation", record\)/);
  assert.match(cardActions, /action === "regenerate"[\s\S]*openAiProductionInspector\("generation", record\)/);
  assert.match(open, /aiPromptInput\.value = record\.prompt/);
  assert.match(open, /referenceRecordIds = new Set\(record\.id \? \[record\.id\]/);
  assert.doesNotMatch(commands, /submitAiImageGeneration/);
});
