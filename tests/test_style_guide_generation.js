const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.resolve(__dirname, "..", "app", "app.js"), "utf8");

test("image generation submits a guide package selection", () => {
  assert.match(source, /style_guide_package_id/);
  assert.match(source, /style_guide_mode/);
  assert.match(source, /style_guide_module_types/);
  assert.match(source, /compile-preview/);
});

test("guide preview uses server output and explicit conflict choices", () => {
  assert.match(source, /can_continue/);
  assert.match(source, /conflict_resolutions/);
  assert.match(source, /保留任务要求/);
  assert.match(source, /不使用风格/);
});

test("new production uses only the confirmed guide version", () => {
  assert.match(source, /confirmed_version_id/);
  assert.match(source, /version_id:\s*guide\.confirmed_version_id/);
  assert.match(source, /filter\(\(item\) => item\.confirmed_version_id\)/);
});
