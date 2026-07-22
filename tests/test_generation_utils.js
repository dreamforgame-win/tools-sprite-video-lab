const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
let generationUtils = {};
try {
  generationUtils = require(path.join(root, "app", "generation-utils.js"));
} catch {
  generationUtils = {};
}

test("smart ratio maps the first reference dimensions to the closest supported ratio", () => {
  const ratio = generationUtils.closestSupportedAspectRatio?.(
    1200,
    1600,
    ["1:1", "3:4", "4:3", "16:9", "9:16"],
  );
  assert.equal(ratio, "3:4");
});

test("smart ratio falls back to 1:1 without a reference image", () => {
  const ratio = generationUtils.closestSupportedAspectRatio?.(
    0,
    0,
    ["3:4", "1:1", "16:9"],
  );
  assert.equal(ratio, "1:1");
});

test("image generation count is initially one", () => {
  const html = fs.readFileSync(path.join(root, "app", "index.html"), "utf8");
  const select = html.match(/<select id="aiCountSelect"[^>]*>([\s\S]*?)<\/select>/)?.[1] || "";
  assert.match(select, /<option value="1" selected>生成 1 张<\/option>/);
  assert.doesNotMatch(select, /<option value="[248]" selected>/);
});

test("generation reference paths are normalized and deduplicated", () => {
  const references = generationUtils.generationReferencePaths?.({
    params: {
      reference_images: [
        "production/images/source.png",
        "",
        "production/images/source.png",
        ".sprite-lab/references/reference/other.png",
      ],
    },
  });
  assert.deepEqual(references, [
    "production/images/source.png",
    ".sprite-lab/references/reference/other.png",
  ]);
});

test("generation reference paths read relative paths from structured snapshots", () => {
  const references = generationUtils.generationReferencePaths?.({
    params: {
      reference_images: [
        {
          relative_path: "production/images/anchor.png",
          remote_asset_id: "asset-anchor",
          source_record_id: "record-anchor",
        },
      ],
    },
  });
  assert.deepEqual(references, ["production/images/anchor.png"]);
});

test("generation reference paths deduplicate mixed legacy and structured entries", () => {
  const references = generationUtils.generationReferencePaths?.({
    params: {
      reference_images: [
        "production/images/anchor.png",
        { relative_path: "production/images/anchor.png" },
        { relative_path: "production/images/module.png" },
      ],
    },
  });
  assert.deepEqual(references, [
    "production/images/anchor.png",
    "production/images/module.png",
  ]);
});

test("generation reference paths ignore malformed structured entries", () => {
  const references = generationUtils.generationReferencePaths?.({
    params: {
      reference_images: [
        null,
        {},
        { relative_path: "" },
        { remote_asset_id: "remote-only" },
        { relative_path: "  production/images/valid.png  " },
      ],
    },
  });
  assert.deepEqual(references, ["production/images/valid.png"]);
});

test("dragging a selected image moves the selected image set", () => {
  assert.deepEqual(
    generationUtils.styleDragContentKeys?.(
      "generation_result:a",
      ["generation_result:a", "style_reference:b", "note:c"],
      ["generation_result:a", "style_reference:b"],
    ),
    ["generation_result:a", "style_reference:b"],
  );
});

test("dragging an unselected image moves only the dragged image", () => {
  assert.deepEqual(
    generationUtils.styleDragContentKeys?.(
      "generation_result:a",
      ["style_reference:b"],
      ["generation_result:a", "style_reference:b"],
    ),
    ["generation_result:a"],
  );
});

test("group move plan ignores items already in the target group", () => {
  assert.deepEqual(
    generationUtils.styleGroupMoveKeys?.([
      { key: "generation_result:a", groupId: "scene" },
      { key: "style_reference:b", groupId: "" },
    ], "scene"),
    ["style_reference:b"],
  );
});

test("moving to ungrouped clears only grouped images", () => {
  assert.deepEqual(
    generationUtils.styleGroupMoveKeys?.([
      { key: "generation_result:a", groupId: "scene" },
      { key: "style_reference:b", groupId: "" },
    ], ""),
    ["generation_result:a"],
  );
});
