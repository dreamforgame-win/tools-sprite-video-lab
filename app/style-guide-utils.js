(function exposeStyleGuideUtils(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StyleGuideUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createStyleGuideUtils() {
  const routes = {
    environment: ["environment"],
    scene: ["environment"],
    architecture: ["environment"],
    character: ["character"],
    npc: ["character"],
    enemy: ["character"],
    creature: ["character"],
    ui: ["ui_hud"],
    hud: ["ui_hud"],
    panel: ["ui_hud"],
    control: ["ui_hud"],
    skill: ["skill_vfx"],
    spell: ["skill_vfx"],
    skill_icon: ["skill_vfx", "ui_hud"],
    vfx: ["skill_vfx"],
    prop: ["props_equipment"],
    equipment: ["props_equipment"],
    weapon: ["props_equipment"],
  };
  const referenceBudgets = { economy: 1, balanced: 2, precision: 4 };
  const tokenBudgets = { economy: 450, balanced: 900, precision: 1600 };

  function defaultGuideModulesForAssetType(type) {
    return [...(routes[String(type || "").toLowerCase()] || [])];
  }

  function guideBudgetSummary(mode, modelLimit) {
    const normalizedMode = Object.hasOwn(referenceBudgets, mode) ? mode : "balanced";
    const limit = Math.max(0, Number(modelLimit || 0));
    return {
      mode: normalizedMode,
      tokenLimit: tokenBudgets[normalizedMode],
      referenceLimit: Math.min(referenceBudgets[normalizedMode], limit),
    };
  }

  function guideStatusLabel(item, options = {}) {
    if (item?.confirmed_version_id) {
      const version = Number(item.confirmed_version || 0);
      return options.isDefault || item?.is_default
        ? `已确认 v${version || 1} · 项目默认`
        : `已确认 v${version || 1}`;
    }
    if (item?.latest_published_version_id) {
      const version = Number(item.latest_published_version || 0);
      return version > 0 ? `待确认 v${version}` : "待确认";
    }
    if (Number(item?.draft_revision || 0) > 0) return "草稿";
    return "未生成";
  }

  return {
    defaultGuideModulesForAssetType,
    guideBudgetSummary,
    guideStatusLabel,
  };
});
