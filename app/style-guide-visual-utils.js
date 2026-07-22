(function exposeStyleGuideVisualUtils(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StyleGuideVisualUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createStyleGuideVisualUtils() {
  const PROFESSIONAL_MODULES = Object.freeze([
    "environment",
    "character",
    "ui_hud",
    "skill_vfx",
    "props_equipment",
  ]);

  const STATUS_LABELS = Object.freeze({
    pending: "等待中",
    submitting: "提交中",
    queued: "排队中",
    running: "生成中",
    succeeded: "已完成",
    failed: "失败",
    canceled: "已取消",
    invalidated: "需重新生成",
  });
  const ACTIVE_NODE_STATUSES = new Set(["submitting", "queued", "running"]);

  function normalizeVisualGuideModules(values) {
    const requested = Array.isArray(values) ? values : PROFESSIONAL_MODULES;
    const selected = new Set(requested.map((value) => String(value || "").trim()));
    return PROFESSIONAL_MODULES.filter((value) => selected.has(value));
  }

  function visualGuideNodePlan(mode, moduleTypes) {
    const normalizedMode = String(mode || "").trim().toLowerCase();
    const modules = normalizeVisualGuideModules(moduleTypes);
    if (normalizedMode === "overall") {
      if (!modules.length) throw new Error("整体生成至少选择一个模块");
      return ["overall", "template"];
    }
    if (normalizedMode === "modular") return ["anchor", ...modules, "template"];
    throw new Error(`未知生成模式：${normalizedMode}`);
  }

  function visualGuideTaskCount(mode, moduleTypes) {
    return visualGuideNodePlan(mode, moduleTypes).filter((value) => value !== "template").length;
  }

  function visualGuideStepState(step, activeStep, { runStarted = false } = {}) {
    const candidate = Math.max(1, Math.min(3, Number(step || 1)));
    const active = Math.max(1, Math.min(3, Number(activeStep || 1)));
    if (candidate === active) return "current";
    if (runStarted) return "available";
    return candidate < active ? "completed" : "locked";
  }

  function visualGuideNodeStatusLabel(status) {
    return STATUS_LABELS[String(status || "").trim()] || "未知状态";
  }

  function isVisualGuideRunActive(run) {
    if (["running", "canceling"].includes(String(run?.status || "").trim())) return true;
    return (Array.isArray(run?.nodes) ? run.nodes : [])
      .some((node) => ACTIVE_NODE_STATUSES.has(String(node?.status || "").trim()));
  }

  function isVisualGuideRunLocked(run) {
    const status = String(run?.status || "").trim();
    return status === "canceling" || isVisualGuideRunActive(run);
  }

  function isStyleDirectionResourceRecord(record) {
    if (!record?.style_guide_visual_run_id) return true;
    return String(record.status || "") === "succeeded" && Boolean(record.local_url);
  }

  function visualGuideRunIndicator(run) {
    const status = String(run?.status || "").trim();
    const active = isVisualGuideRunActive(run);
    if (!active && !["failed", "finalize_failed"].includes(status)) return null;
    const nodes = Array.isArray(run?.nodes) ? run.nodes : [];
    const completed = nodes.filter((node) => String(node?.status || "") === "succeeded").length;
    const progress = `${completed}/${nodes.length}`;
    if (status === "canceling") {
      return {
        active: true,
        tone: "canceling",
        label: "取消中 · 查看进度",
        progress,
        ariaLabel: `视觉指导图取消中，已完成 ${completed} / ${nodes.length} 个节点，查看进度`,
      };
    }
    if (active) {
      return {
        active: true,
        tone: "running",
        label: "生成中 · 查看进度",
        progress,
        ariaLabel: `视觉指导图生成中，已完成 ${completed} / ${nodes.length} 个节点，查看进度`,
      };
    }
    const finalizeFailed = status === "finalize_failed";
    return {
      active: true,
      tone: "failed",
      label: finalizeFailed ? "保存失败 · 查看详情" : "生成失败 · 查看详情",
      progress,
      ariaLabel: `${finalizeFailed ? "视觉指导图保存失败" : "视觉指导图生成失败"}，已完成 ${completed} / ${nodes.length} 个节点，查看详情`,
    };
  }

  function canRetryVisualGuideNode(node) {
    const status = String(node?.status || "");
    if (node?.kind === "local") return status === "failed";
    return node?.kind === "image" && ["failed", "invalidated"].includes(status);
  }

  function preserveScrollPositions(root, selectors, render) {
    const positions = Array.from(new Set(Array.isArray(selectors) ? selectors : [selectors]))
      .map((selector) => ({ selector, scrollTop: Number(root?.querySelector?.(selector)?.scrollTop || 0) }));
    const result = render();
    positions.forEach(({ selector, scrollTop }) => {
      const after = root?.querySelector?.(selector);
      if (!after) return;
      const maxScrollTop = Math.max(0, Number(after.scrollHeight || 0) - Number(after.clientHeight || 0));
      after.scrollTop = Math.min(Math.max(0, scrollTop), maxScrollTop);
    });
    return result;
  }

  function preserveScrollPosition(root, selector, render) {
    return preserveScrollPositions(root, [selector], render);
  }

  return {
    PROFESSIONAL_MODULES,
    canRetryVisualGuideNode,
    isStyleDirectionResourceRecord,
    isVisualGuideRunActive,
    isVisualGuideRunLocked,
    normalizeVisualGuideModules,
    preserveScrollPosition,
    preserveScrollPositions,
    visualGuideNodePlan,
    visualGuideNodeStatusLabel,
    visualGuideRunIndicator,
    visualGuideStepState,
    visualGuideTaskCount,
  };
});
