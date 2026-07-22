const assert = require("node:assert/strict");
const test = require("node:test");

const {
  autoArrangeCanvasNodes,
  findAvailableCanvasPosition,
  rectanglesOverlap,
} = require("../app/canvas-layout-utils.js");

test("new canvas content is placed in the first free grid slot", () => {
  const occupied = [
    { x: 70, y: 70, width: 220, height: 160 },
    { x: 322, y: 70, width: 220, height: 160 },
  ];
  const position = findAvailableCanvasPosition(
    { width: 220, height: 160 },
    occupied,
  );

  assert.deepEqual(position, { x: 574, y: 70 });
  assert.equal(
    occupied.some((rect) => rectanglesOverlap({ ...position, width: 220, height: 160 }, rect, 24)),
    false,
  );
});

test("auto arrange moves complete groups as units and leaves locked nodes fixed", () => {
  const nodes = [
    { id: "locked", x: 70, y: 70, width: 220, height: 160, locked: true, group_id: "" },
    { id: "a", x: 80, y: 80, width: 100, height: 80, locked: false, group_id: "group-a" },
    { id: "b", x: 210, y: 80, width: 100, height: 80, locked: false, group_id: "group-a" },
    { id: "c", x: 90, y: 90, width: 220, height: 160, locked: false, group_id: "" },
  ];
  const groupDeltaBefore = nodes[1].x - nodes[2].x;

  const result = autoArrangeCanvasNodes(nodes);

  assert.equal(result.changed, true);
  assert.deepEqual({ x: nodes[0].x, y: nodes[0].y }, { x: 70, y: 70 });
  assert.equal(nodes[1].x - nodes[2].x, groupDeltaBefore);
  for (let index = 0; index < nodes.length; index += 1) {
    for (let other = index + 1; other < nodes.length; other += 1) {
      assert.equal(rectanglesOverlap(nodes[index], nodes[other], 24), false);
    }
  }
});

test("selection-scoped arrange keeps unselected and partially selected groups as obstacles", () => {
  const nodes = [
    { id: "obstacle", x: 70, y: 70, width: 220, height: 160, locked: false, group_id: "" },
    { id: "selected", x: 80, y: 80, width: 220, height: 160, locked: false, group_id: "" },
    { id: "group-a", x: 320, y: 70, width: 100, height: 80, locked: false, group_id: "partial" },
    { id: "group-b", x: 440, y: 70, width: 100, height: 80, locked: false, group_id: "partial" },
  ];

  autoArrangeCanvasNodes(nodes, ["selected", "group-a"]);

  assert.deepEqual({ x: nodes[0].x, y: nodes[0].y }, { x: 70, y: 70 });
  assert.deepEqual({ x: nodes[2].x, y: nodes[2].y }, { x: 320, y: 70 });
  assert.deepEqual({ x: nodes[3].x, y: nodes[3].y }, { x: 440, y: 70 });
  assert.equal(rectanglesOverlap(nodes[1], nodes[0], 24), false);
  assert.equal(rectanglesOverlap(nodes[1], nodes[2], 24), false);
  assert.equal(rectanglesOverlap(nodes[1], nodes[3], 24), false);
});
