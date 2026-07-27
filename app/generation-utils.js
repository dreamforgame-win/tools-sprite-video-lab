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

  function effectiveReferenceCount(originalCount, optimizationEnabled) {
    const count = Math.max(0, Number(originalCount) || 0);
    return optimizationEnabled && count >= 2 ? 1 : count;
  }

  function effectiveReferenceCountByRole(counts, optimizationEnabled) {
    return Object.entries(counts || {}).reduce((total, [role, rawCount]) => {
      const count = Math.max(0, Number(rawCount) || 0);
      const mergeable = role === "content";
      return total + (optimizationEnabled && mergeable && count >= 2 ? 1 : count);
    }, 0);
  }

  function generationOptimizationText(originalCount, effectiveCount, enabled) {
    const original = Math.max(0, Number(originalCount) || 0);
    const effective = Math.max(0, Number(effectiveCount) || 0);
    if (original <= 1) return "当前无需合并";
    if (!enabled) return `将按 ${original} 张参考图分别提交`;
    return `将 ${original} 张参考图合并为 ${effective} 张实际输入`;
  }

  function currencyText(value, currency, { approximate = false } = {}) {
    const symbol = currency === "CNY"
      ? "¥"
      : currency === "USD"
        ? "$"
        : `${currency || ""} `;
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "";
    const fractionLength = String(amount).split(".")[1]?.length || 0;
    const digits = Math.abs(amount) >= 1
      ? 2
      : Math.min(4, Math.max(2, fractionLength));
    return `${approximate ? "约 " : ""}${symbol}${amount.toFixed(digits)}`;
  }

  function formatGenerationCostEstimate(estimate, { referenceLabel = "参考图" } = {}) {
    const currency = String(estimate?.currency || "CNY").toUpperCase();
    if (estimate?.total == null || !Number.isFinite(Number(estimate.total))) {
      return {
        formula: `暂无法精确预估${estimate?.unavailable_reason ? `：${estimate.unavailable_reason}` : ""}`,
        detail: "",
        tone: "unavailable",
      };
    }
    if (estimate?.used_fallback) {
      return {
        formula: `供应商回退估价：${currencyText(estimate.total, currency, { approximate: true })}`,
        detail: "实际 Token 用量可能导致最终价格不同",
        tone: "approximate",
      };
    }
    const reference = estimate.reference || {};
    const generation = estimate.generation || {};
    const referencePrice = currencyText(reference.unit_price, currency);
    const generationPrice = currencyText(generation.unit_price, currency);
    const totalPrice = currencyText(estimate.total, currency);
    const taskCount = Math.max(1, Number(estimate.task_count) || 1);
    const normalizedReferenceLabel = String(referenceLabel || "参考图").trim() || "参考图";
    const referenceFormula = reference.unit_price == null
      || !Number.isFinite(Number(reference.unit_price))
      ? `${normalizedReferenceLabel}不单独计费`
      : Number(reference.free_quantity || 0) > 0
        ? `${normalizedReferenceLabel}首张免费，后续 ${referencePrice} × ${Number(reference.billable_count || 0)}`
        : `${normalizedReferenceLabel} ${referencePrice} × ${Number(reference.billable_count || 0)}`;
    const perTask = `${referenceFormula} + 生成 ${generationPrice}`;
    const formula = taskCount > 1
      ? `（${perTask}）× ${taskCount} 张 = 预计 ${totalPrice}`
      : `${perTask} = 预计 ${totalPrice}`;
    const savings = Number(estimate.savings);
    return {
      formula,
      detail: Number.isFinite(savings) && savings > 0
        ? `预计节省 ${currencyText(savings, currency)}`
        : "",
      tone: estimate.exact === false ? "approximate" : "exact",
    };
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
    effectiveReferenceCount,
    effectiveReferenceCountByRole,
    formatGenerationCostEstimate,
    generationOptimizationText,
    generationReferencePaths,
    styleDragContentKeys,
    styleGroupMoveKeys,
  };
});
