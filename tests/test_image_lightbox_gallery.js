const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.resolve(__dirname, "../app/app.js"), "utf8");
const html = fs.readFileSync(path.resolve(__dirname, "../app/index.html"), "utf8");
const css = fs.readFileSync(path.resolve(__dirname, "../app/styles.css"), "utf8");

function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  return start >= 0 && end > start ? source.slice(start, end) : "";
}

test("lightbox markup exposes cyclic navigation, thumbnail rail, and prompt panel", () => {
  for (const id of [
    "imageLightboxPreviousButton",
    "imageLightboxNextButton",
    "imageLightboxGallery",
    "imageLightboxGalleryTrack",
    "imageLightboxPromptButton",
    "imageLightboxPromptPanel",
    "imageLightboxPromptText",
  ]) assert.match(html, new RegExp(`id="${id}"`));
});

test("gallery switching wraps and updates through one shared index function", () => {
  const gallery = functionSource("showImageLightboxGalleryIndex", "stepImageLightboxGallery");
  const step = functionSource("stepImageLightboxGallery", "toggleImageLightboxPrompt");
  assert.match(gallery, /imageLightboxGalleryState/);
  assert.match(gallery, /% items\.length/);
  assert.match(gallery, /setImageLightboxZoom\(1\)/);
  assert.match(gallery, /scrollIntoView/);
  assert.match(step, /showImageLightboxGalleryIndex/);
});

test("direction content preview derives its gallery from the shared canvas group", () => {
  const preview = functionSource("styleContentLightboxGallery", "openStyleContentLightbox");
  assert.match(preview, /styleContentSections/);
  assert.match(preview, /section\.id/);
  assert.match(preview, /item\.image/);
  assert.match(preview, /generationRecordLightboxPayload/);
});

test("visual guide repository previews the complete version as one gallery", () => {
  const gallery = functionSource("styleGuideVersionPreviewItems", "styleGuideVersionImageCard");
  const action = source.slice(source.indexOf('action === "style-guide-version-preview"'), source.indexOf('action === "style-guide-version-confirm"'));
  assert.match(gallery, /template_relative_path/);
  assert.match(gallery, /core\.references/);
  assert.match(gallery, /STYLE_GUIDE_MODULES/);
  assert.match(action, /styleGuideVersionPreviewItems/);
  assert.match(action, /gallery/);
});

test("generation prompt is separated from the compact caption", () => {
  const payload = functionSource("generationRecordLightboxPayload", "styleContentLightboxPayload");
  assert.match(payload, /prompt:\s*record\.prompt/);
  assert.match(payload, /caption:\s*meta/);
  assert.doesNotMatch(payload, /caption:\s*\[record\.prompt/);
});

test("lightbox keyboard handling cycles images and closes prompt before the modal", () => {
  assert.match(source, /event\.key === "ArrowLeft"/);
  assert.match(source, /event\.key === "ArrowRight"/);
  assert.match(source, /imageLightboxPromptPanel[^\n]*hidden/);
  assert.match(source, /toggleImageLightboxPrompt\(false\)/);
});

test("gallery and prompt panel have desktop and mobile layouts", () => {
  assert.match(css, /\.image-lightbox-gallery\s*\{/);
  assert.match(css, /\.image-lightbox-gallery-track\s*\{/);
  assert.match(css, /\.image-lightbox-nav-button/);
  assert.match(css, /\.image-lightbox-prompt-panel\s*\{/);
  const mobile = css.slice(css.lastIndexOf("@media (max-width: 760px)"));
  assert.match(mobile, /image-lightbox-prompt-panel/);
  assert.match(mobile, /bottom:/);
});

test("single-image lightbox keeps the frame in the center grid column", () => {
  assert.match(
    css,
    /\.image-lightbox-stage\s*>\s*\.image-lightbox-frame\s*\{[^}]*grid-column:\s*2;/s,
  );
});
