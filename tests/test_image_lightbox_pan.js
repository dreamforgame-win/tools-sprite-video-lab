const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const app = fs.readFileSync(path.resolve(__dirname, "../app/app.js"), "utf8");
const css = fs.readFileSync(path.resolve(__dirname, "../app/styles.css"), "utf8");

test("zoomed lightbox image supports captured pointer pan", () => {
  assert.match(app, /function beginImageLightboxPan/);
  assert.match(app, /setPointerCapture/);
  assert.match(app, /function moveImageLightboxPan/);
  assert.match(app, /releasePointerCapture/);
});

test("lightbox pan is clamped from zoomed image and viewport bounds", () => {
  assert.match(app, /function imageLightboxPanBounds/);
  assert.match(app, /image\.offsetWidth \* zoom/);
  assert.match(app, /clamp\(Number\(x\)/);
  assert.match(app, /clamp\(Number\(y\)/);
});

test("lightbox pan resets and reclamps across lifecycle changes", () => {
  assert.match(app, /normalized <= 1\.01\) setImageLightboxPan\(0, 0\)/);
  assert.match(app, /addEventListener\("load", \(\) => setImageLightboxPan\(0, 0\)\)/);
  assert.match(app, /window\.addEventListener\("resize"/);
  assert.match(app, /imageLightboxPan = \{ x: 0, y: 0 \}/);
});

test("zoomed and actively panning images use grab cursors", () => {
  assert.match(css, /\.image-lightbox\.is-zoomed[\s\S]*cursor:\s*grab/);
  assert.match(css, /\.image-lightbox\.is-panning[\s\S]*cursor:\s*grabbing/);
  assert.match(css, /--lightbox-pan-x/);
  assert.match(css, /touch-action:\s*none/);
});
