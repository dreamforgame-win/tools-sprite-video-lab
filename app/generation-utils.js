(function exposeGenerationUtils(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.GenerationUtils = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createGenerationUtils() {
  function aspectRatioValue(value) {
    const [width, height] = String(value || "").split(":").map(Number);
    if (!(width > 0) || !(height > 0)) return 0;
    return width / height;
  }

  function closestSupportedAspectRatio(width, height, supportedRatios) {
    const ratios = Array.from(new Set((supportedRatios || []).map(String)))
      .filter((value) => aspectRatioValue(value) > 0);
    if (!ratios.length) return "1:1";
    const target = Number(width) > 0 && Number(height) > 0
      ? Number(width) / Number(height)
      : 1;
    return ratios.reduce((closest, candidate) => {
      const closestDistance = Math.abs(
        Math.log(aspectRatioValue(closest) / target),
      );
      const candidateDistance = Math.abs(
        Math.log(aspectRatioValue(candidate) / target),
      );
      return candidateDistance < closestDistance ? candidate : closest;
    }, ratios.includes("1:1") && target === 1 ? "1:1" : ratios[0]);
  }

  function generationReferencePaths(record) {
    const references = record?.params?.reference_images;
    if (!Array.isArray(references)) return [];
    const paths = references.map((item) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object") return "";
      return String(item.relative_path || "").trim();
    }).filter(Boolean);
    return Array.from(new Set(paths));
  }

  function styleDragContentKeys(draggedKey, selectedKeys, draggableKeys) {
    const allowed = new Set((draggableKeys || []).map(String));
    const dragged = String(draggedKey || "");
    if (!allowed.has(dragged)) return [];
    const selected = Array.from(new Set((selectedKeys || []).map(String)))
      .filter((key) => allowed.has(key));
    return selected.includes(dragged) ? selected : [dragged];
  }

  function styleGroupMoveKeys(items, targetGroupId) {
    const target = String(targetGroupId || "");
    return (items || [])
      .filter((item) => String(item?.groupId || "") !== target)
      .map((item) => String(item?.key || ""))
      .filter(Boolean);
  }

  return {
    aspectRatioValue,
    closestSupportedAspectRatio,
    generationReferencePaths,
    styleDragContentKeys,
    styleGroupMoveKeys,
  };
});
