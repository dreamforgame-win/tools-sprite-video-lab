const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "app", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app", "app.js"), "utf8");

test("asset generation exposes shared optimization and estimate controls", () => {
  assert.match(html, /id="aiReferenceOptimizationInput"[^>]*checked/);
  assert.match(html, /id="aiGenerationCostEstimate"/);
});

test("style generation uses the same shared controls without a footer cancel button", () => {
  assert.match(app, /renderGenerationReferenceOptimizationControl\("style"/);
  assert.match(app, /renderGenerationCostEstimateContainer\("style"/);
  const panel = app.slice(
    app.indexOf("function renderStyleGenerationPanel"),
    app.indexOf("function syncStyleGenerationCapabilityControls"),
  );
  assert.doesNotMatch(panel, />取消<\/button>/);
});

test("both submissions persist the reference optimization flag", () => {
  assert.match(app, /optimize_reference_images:\s*seedRecord\?\.params\?\.optimize_reference_images[\s\S]{0,100}styleReferenceOptimizationEnabled\(\)/);
  assert.match(app, /optimize_reference_images:\s*aiReferenceOptimizationEnabled\(\)/);
});
