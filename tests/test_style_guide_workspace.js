const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.resolve(__dirname, "..", "app", "app.js"), "utf8");
const styles = fs.readFileSync(path.resolve(__dirname, "..", "app", "styles.css"), "utf8");

test("style exploration exposes resource and visual guide repository tabs", () => {
  assert.match(source, /方向资源/);
  assert.match(source, /风格模板仓库/);
  assert.match(source, /renderStyleGuideRepositoryPanel/);
});

test("repository uses style template naming and exposes legacy compact backfill", () => {
  assert.match(source, /风格模板仓库/);
  assert.match(source, /生成风格模板/);
  assert.match(source, /补生成简略版/);
  assert.match(source, /available_variants/);
  assert.match(source, /仅详细版/);
});

test("asset production exposes actual style template trace metadata", () => {
  const traceHelper = source.match(/function aiStyleGuideReferenceTrace[\s\S]*?function aiStyleGuideReferenceTitle/)?.[0] || "";
  const controls = source.match(/function renderAiStyleGuideControls[\s\S]*?function scheduleAiStyleGuidePreview/)?.[0] || "";
  assert.match(traceHelper, /template_variant/);
  assert.match(traceHelper, /template_module_type/);
  assert.match(traceHelper, /reference_role/);
  assert.match(traceHelper, /风格职责/);
  assert.match(controls, /aiStyleGuideReferenceTrace/);
  assert.match(source, /内容参考 \+ 风格模板/);
});

test("direction tabs are centered above tab-specific tools", () => {
  const toolbar = source.match(/function renderStyleContentToolbar[\s\S]*?function styleGuideVersionModuleLabel/)?.[0] || "";
  const moduleRender = source.match(/function renderStyleModule[\s\S]*?function renderStyleCanvasNodeActions/)?.[0] || "";
  assert.match(toolbar, /style-content-heading/);
  assert.match(toolbar, /style-content-tabs/);
  assert.match(toolbar, /projectModuleViewSwitch\("style"\)/);
  assert.match(toolbar, /activeTab === "resources"[\s\S]*\$\{guideAction\}[\s\S]*style-settings-icon-button/);
  assert.match(toolbar, /activeTab === "guides"[\s\S]*style-guide-content-actions/);
  assert.match(moduleRender, /projectAssetModuleActions\.innerHTML = ""/);
  assert.match(styles, /\.style-content-tabs\s*\{[^}]*grid-column:\s*2;[^}]*border-radius:\s*var\(--radius-pill\)/s);
  assert.match(styles, /\.style-content-toolbar > \.workbench-view-switch\s*\{[^}]*grid-row:\s*2;/s);
});

test("visual guide repository contains fixed game-art modules", () => {
  for (const type of ["environment", "character", "ui_hud", "skill_vfx", "props_equipment"]) {
    assert.match(source, new RegExp(type));
  }
  assert.match(source, /综合视觉指导图/);
  assert.match(source, /视觉基因锚点/);
});

test("main entry opens visual generation instead of the editor workspace", () => {
  const toolbar = source.match(/function renderStyleContentToolbar[\s\S]*?\n}/)?.[0] || "";
  assert.match(source, /生成风格模板/);
  assert.match(source, /style-guide-visual-open/);
  assert.match(toolbar, /activeTab === "resources"[\s\S]*\$\{guideAction\}/);
  assert.match(toolbar, /activeTab === "guides"[\s\S]*\$\{guideAction\}/);
  assert.doesNotMatch(toolbar, /style-guide-edit/);
});

test("repository confirms one version and uses common image preview", () => {
  assert.match(source, /confirm-version/);
  assert.match(source, /style-guide-version-confirm/);
  assert.match(source, /style-guide-version-preview/);
  assert.match(source, /openImageLightbox/);
});

test("visual guide thumbnails expose the whole image as the large-preview target", () => {
  const card = source.match(/function styleGuideVersionImageCard[\s\S]*?\n}/)?.[0] || "";
  assert.match(card, /style-guide-version-image-preview/);
  assert.match(card, /data-project-action="style-guide-version-preview"/);
  assert.match(card, /image-hover-preview-button[^>]*aria-hidden="true"/);
  assert.doesNotMatch(card, /<img[^>]*>[\s\S]*?<button class="image-hover-preview-button"/);
});
