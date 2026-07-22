const assert = require("node:assert/strict");
const test = require("node:test");

const {
  defaultGuideModulesForAssetType,
  guideBudgetSummary,
  guideStatusLabel,
} = require("../app/style-guide-utils.js");

test("character assets use character guidance", () => {
  assert.deepEqual(defaultGuideModulesForAssetType("character"), ["character"]);
});

test("skill icons combine VFX and compact UI guidance", () => {
  assert.deepEqual(defaultGuideModulesForAssetType("skill_icon"), ["skill_vfx", "ui_hud"]);
});

test("balanced summary reports two references", () => {
  assert.equal(guideBudgetSummary("balanced", 12).referenceLimit, 2);
});

test("model reference limits cap the selected mode", () => {
  assert.equal(guideBudgetSummary("precision", 1).referenceLimit, 1);
});

test("confirmed default status is explicit", () => {
  assert.equal(
    guideStatusLabel({ confirmed_version_id: "v1", confirmed_version: 2 }, { isDefault: true }),
    "已确认 v2 · 项目默认",
  );
});

test("unconfirmed latest version is marked for review", () => {
  assert.equal(
    guideStatusLabel({ latest_published_version_id: "v3", latest_published_version: 3 }),
    "待确认 v3",
  );
});
