(function exposeCanvasLayoutUtils(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CanvasLayoutUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCanvasLayoutUtils() {
  function numberOr(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizedRect(rect) {
    return {
      x: numberOr(rect?.x, 0),
      y: numberOr(rect?.y, 0),
      width: Math.max(1, numberOr(rect?.width, 220)),
      height: Math.max(1, numberOr(rect?.height, 160)),
    };
  }

  function rectanglesOverlap(leftValue, rightValue, gap = 0) {
    const left = normalizedRect(leftValue);
    const right = normalizedRect(rightValue);
    const spacing = Math.max(0, numberOr(gap, 0));
    return left.x < right.x + right.width + spacing
      && left.x + left.width + spacing > right.x
      && left.y < right.y + right.height + spacing
      && left.y + left.height + spacing > right.y;
  }

  function findAvailableCanvasPosition(size, occupied = [], options = {}) {
    const width = Math.max(1, numberOr(size?.width, 220));
    const height = Math.max(1, numberOr(size?.height, 160));
    const originX = numberOr(options.originX, 70);
    const originY = numberOr(options.originY, 70);
    const gap = Math.max(0, numberOr(options.gap, 32));
    const columns = Math.max(1, Math.floor(numberOr(options.columns, 4)));
    const stepX = Math.max(width + gap, numberOr(options.stepX, width + gap));
    const stepY = Math.max(height + gap, numberOr(options.stepY, height + gap));
    const obstacles = (occupied || []).map(normalizedRect);

    for (let index = 0; index < 4000; index += 1) {
      const candidate = {
        x: originX + (index % columns) * stepX,
        y: originY + Math.floor(index / columns) * stepY,
        width,
        height,
      };
      if (!obstacles.some((rect) => rectanglesOverlap(candidate, rect, gap))) {
        return { x: candidate.x, y: candidate.y };
      }
    }
    return { x: originX, y: originY + 4000 * stepY };
  }

  function nodeBounds(nodes) {
    const normalized = (nodes || []).map(normalizedRect);
    if (!normalized.length) return { x: 0, y: 0, width: 1, height: 1 };
    const left = Math.min(...normalized.map((rect) => rect.x));
    const top = Math.min(...normalized.map((rect) => rect.y));
    const right = Math.max(...normalized.map((rect) => rect.x + rect.width));
    const bottom = Math.max(...normalized.map((rect) => rect.y + rect.height));
    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  function autoArrangeCanvasNodes(nodes, selectedIds = [], options = {}) {
    const source = Array.isArray(nodes) ? nodes : [];
    const selected = new Set(Array.from(selectedIds || [], (value) => String(value || "")));
    const selectionActive = selected.size > 0;
    const grouped = new Map();
    source.forEach((node) => {
      const groupId = String(node?.group_id || "");
      if (!groupId) return;
      if (!grouped.has(groupId)) grouped.set(groupId, []);
      grouped.get(groupId).push(node);
    });

    const units = [];
    const movableIds = new Set();
    grouped.forEach((groupNodes, groupId) => {
      const fullySelected = !selectionActive || groupNodes.every((node) => selected.has(String(node.id || "")));
      if (!fullySelected || groupNodes.some((node) => node.locked)) return;
      groupNodes.forEach((node) => movableIds.add(String(node.id || "")));
      units.push({ id: `group:${groupId}`, nodes: groupNodes, bounds: nodeBounds(groupNodes) });
    });
    source.forEach((node) => {
      if (node?.group_id || node?.locked) return;
      if (selectionActive && !selected.has(String(node.id || ""))) return;
      movableIds.add(String(node.id || ""));
      units.push({ id: `node:${node.id || ""}`, nodes: [node], bounds: nodeBounds([node]) });
    });
    units.sort((left, right) => {
      const topDelta = left.bounds.y - right.bounds.y;
      if (Math.abs(topDelta) > 1) return topDelta;
      const leftDelta = left.bounds.x - right.bounds.x;
      if (Math.abs(leftDelta) > 1) return leftDelta;
      return left.id.localeCompare(right.id);
    });
    if (!units.length) return { changed: false, movedNodeIds: [] };

    const gap = Math.max(0, numberOr(options.gap, 32));
    const maxWidth = Math.max(...units.map((unit) => unit.bounds.width));
    const maxHeight = Math.max(...units.map((unit) => unit.bounds.height));
    const occupied = source
      .filter((node) => !movableIds.has(String(node?.id || "")))
      .map(normalizedRect);
    const movedNodeIds = [];
    units.forEach((unit) => {
      const position = findAvailableCanvasPosition(unit.bounds, occupied, {
        ...options,
        gap,
        stepX: maxWidth + gap,
        stepY: maxHeight + gap,
      });
      const deltaX = position.x - unit.bounds.x;
      const deltaY = position.y - unit.bounds.y;
      unit.nodes.forEach((node) => {
        if (deltaX || deltaY) movedNodeIds.push(String(node.id || ""));
        node.x = numberOr(node.x, 0) + deltaX;
        node.y = numberOr(node.y, 0) + deltaY;
      });
      unit.bounds = { ...unit.bounds, x: position.x, y: position.y };
      occupied.push(unit.bounds);
    });
    return { changed: movedNodeIds.length > 0, movedNodeIds };
  }

  return {
    autoArrangeCanvasNodes,
    findAvailableCanvasPosition,
    rectanglesOverlap,
  };
});
