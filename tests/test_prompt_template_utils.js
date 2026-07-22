const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "app", "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(root, "app", "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "app", "styles.css"), "utf8");
const utils = require(path.join(root, "app", "prompt-template-utils.js"));

function functionSource(name, nextName) {
  const start = appSource.indexOf(`function ${name}(`);
  const end = nextName ? appSource.indexOf(`function ${nextName}(`, start + 1) : appSource.length;
  assert.ok(start >= 0, `missing ${name}`);
  assert.ok(end > start, `missing boundary after ${name}`);
  return appSource.slice(start, end);
}

test("template entry sits directly below the asset-production prompt textarea", () => {
  const section = html.match(/<section class="style-generation-section ai-generation-section ai-generation-prompt-section">([\s\S]*?)<\/section>/)?.[1] || "";
  assert.ok(section.indexOf('id="aiPromptInput"') >= 0);
  assert.ok(section.indexOf('id="aiPromptTemplateButton"') > section.indexOf('id="aiPromptInput"'));
  assert.match(section, /选择提示词模板/);
  assert.ok(html.indexOf('/app/prompt-template-utils.js') < html.indexOf('/app/app.js'));
});

test("five built-in categories each provide nine templates", () => {
  assert.deepEqual(
    utils.PROMPT_TEMPLATE_CATEGORIES.map((category) => category.id),
    ["character", "scene", "ui", "icon", "effect"],
  );
  for (const category of utils.PROMPT_TEMPLATE_CATEGORIES) {
    assert.equal(utils.promptTemplatesByCategory(category.id).length, 9, category.id);
  }
  assert.equal(new Set(utils.PROMPT_TEMPLATES.map((template) => template.id)).size, 45);
});

test("character templates preserve the agreed view and directional layouts", () => {
  const three = utils.promptTemplateById("character-three-views");
  const four = utils.promptTemplateById("character-four-views");
  const standFour = utils.promptTemplateById("character-stand-four");
  const standEight = utils.promptTemplateById("character-stand-eight");
  const walkFive = utils.promptTemplateById("character-walk-five");
  assert.equal(three.layout, "three_columns");
  assert.match(three.prompt, /从左到右严格排列：正面、侧面、背面/);
  assert.equal(four.layout, "four_columns");
  assert.match(four.prompt, /从左到右严格排列：正面、左侧面、背面、右侧面/);
  assert.equal(standFour.layout, "directional_3x3_4");
  assert.match(standFour.prompt, /背面位于上中.*左侧面位于中左.*右侧面位于中右.*正面位于下中/);
  assert.equal(standEight.layout, "directional_3x3_8");
  assert.match(standEight.prompt, /左后方、背面、右后方.*左侧面、中心空白、右侧面.*左前方、正面、右前方/);
  assert.equal(walkFive.layout, "directional_3x3_5");
  assert.match(walkFive.prompt, /左后方位于左上.*背面位于上中.*左侧面位于中左.*左前方位于左下.*正面位于下中/);
  assert.doesNotMatch(
    utils.promptTemplatesByCategory("character").map((template) => template.prompt).join("\n"),
    /镜像|翻转/,
  );
});

test("scene, UI, icon, and effect templates expose usable prompt skeletons", () => {
  for (const category of ["scene", "ui", "icon", "effect"]) {
    for (const template of utils.promptTemplatesByCategory(category)) {
      assert.ok(template.name.length >= 4, `${template.id} name`);
      assert.ok(template.description.length >= 10, `${template.id} description`);
      assert.ok(template.layout, `${template.id} layout`);
      assert.ok(template.layoutLabel, `${template.id} layout label`);
      assert.ok(template.prompt.length >= 80, `${template.id} prompt`);
    }
  }
  assert.equal(utils.promptTemplateCategoryForAssetType("skill_icon"), "icon");
  assert.equal(utils.promptTemplateCategoryForAssetType("equipment"), "icon");
  assert.equal(utils.promptTemplateCategoryForAssetType("effect"), "effect");
});

test("selector renders category tabs, template list, prompt preview, and recommendations", () => {
  const render = functionSource("renderAiPromptTemplateModal", "openAiPromptTemplateModal");
  assert.match(render, /PROMPT_TEMPLATE_CATEGORIES\.map/);
  assert.match(render, /data-prompt-template-category/);
  assert.match(render, /data-prompt-template-id/);
  assert.match(render, /ai-prompt-template-recommendation/);
  assert.match(render, /<pre tabindex="0">/);
  assert.match(html, /id="aiPromptTemplatePreview"/);
});

test("applying a template replaces the prompt, emits input, and never switches the model", () => {
  const apply = functionSource("applyAiPromptTemplate", "selectedAiStyleGuide");
  assert.match(apply, /aiPromptInput\.value = template\.prompt/);
  assert.match(apply, /new Event\("input", \{ bubbles: true \}\)/);
  assert.match(apply, /closeAiPromptTemplateModal\(\)/);
  assert.doesNotMatch(apply, /selectedModel|aiModelSelect/);
});

test("template selector closes explicitly or with Escape, not by backdrop click", () => {
  assert.match(appSource, /aiPromptTemplateCloseButton\?\.addEventListener\("click", closeAiPromptTemplateModal\)/);
  assert.match(appSource, /aiPromptTemplateCancelButton\?\.addEventListener\("click", closeAiPromptTemplateModal\)/);
  assert.match(appSource, /if \(!els\.aiPromptTemplateModal\?\.hidden\) \{\s*closeAiPromptTemplateModal\(\);/);
  assert.doesNotMatch(appSource, /aiPromptTemplateBackdrop[^\n]*addEventListener/);
  const close = functionSource("closeAiPromptTemplateModal", "handleAiPromptTemplateModalClick");
  assert.match(close, /returnTarget\?\.focus\(\)/);
});

test("selector uses a desktop split layout and a narrow-screen single-column fallback", () => {
  assert.match(css, /\.ai-prompt-template-body\s*\{[\s\S]*?grid-template-columns:\s*minmax\(240px, 0\.8fr\) minmax\(0, 1\.45fr\)/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.ai-prompt-template-body\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
  assert.match(css, /\.ai-prompt-template-preview pre\s*\{[\s\S]*?user-select:\s*text/);
});
