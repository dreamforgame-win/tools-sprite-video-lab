const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(
  path.resolve(__dirname, "..", "app", "app.js"),
  "utf8",
);
const styles = fs.readFileSync(
  path.resolve(__dirname, "..", "app", "styles.css"),
  "utf8",
);

function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  return start >= 0 && end > start ? source.slice(start, end) : "";
}

test("all reusable style cards expose a context target while only images are draggable", () => {
  const cards = functionSource("renderStyleContentCard", "renderStyleContentList");
  assert.ok(cards);
  assert.match(cards, /draggable="true"/);
  assert.match(cards, /data-style-drag-content/);
  assert.match(cards, /contextEnabled/);
  assert.match(cards, /style_reference.*generation_result.*note/);
  assert.match(cards, /data-style-context-content/);
  assert.match(cards, /workbenchIcon\("expand"\)/);
});

test("shared style menu contains common and type-specific commands", () => {
  const menu = functionSource("styleContentMenuActions", "styleContentMenuButton");
  assert.ok(menu);
  assert.match(menu, /preview/);
  assert.match(menu, /adjust-group/);
  assert.match(menu, /transfer/);
  assert.match(menu, /regenerate/);
  assert.match(menu, /library/);
  assert.match(menu, /download/);
  assert.match(menu, /delete/);
  assert.match(menu, /edit-note/);
  assert.match(menu, /删除便签/);
  assert.match(menu, /resultReady/);
});

test("list group headers and notes open custom menus instead of browser menus", () => {
  const list = functionSource("renderStyleContentList", "bindStyleContentListInteractions");
  const bindings = functionSource("bindStyleContentListInteractions", "renderStyleCompareWorkspace");
  assert.match(list, /data-style-context-group/);
  assert.match(bindings, /event\.preventDefault\(\)/);
  assert.match(bindings, /renderStyleGroupContextMenu/);
  assert.match(bindings, /data-style-context-content/);
  assert.match(bindings, /styleContentSections\(style\)\.sections/);
  assert.match(bindings, /flatMap/);
});

test("list group menu exposes only shared group operations", () => {
  const menu = functionSource("renderStyleGroupContextMenu", "runStyleListGroupCommand");
  assert.match(menu, /重命名分组/);
  assert.match(menu, /选择组内内容/);
  assert.match(menu, /以此为参考生图/);
  assert.match(menu, /移动\/复制到方向/);
  assert.match(menu, /解除分组/);
  assert.doesNotMatch(menu, /锁定组内节点/);
  assert.doesNotMatch(menu, /自动整理/);
});

test("note grouping and deletion persist through the shared style canvas", () => {
  const move = functionSource("moveStyleListContentToGroup", "createStyleDragGhost");
  const commands = functionSource("runStyleContentCommand", "closeStyleContentContextMenus");
  assert.match(move, /styleCanvasNoteItems/);
  assert.match(move, /persistStyleCanvas/);
  assert.match(commands, /command === "edit-note"/);
  assert.match(commands, /item\.refType === "note"/);
  assert.match(commands, /node\.ref_type === "note"/);
  assert.match(commands, /persistStyleCanvas/);
});

test("canvas note nodes resolve into the shared content menu", () => {
  const item = functionSource("styleCanvasContextItem", "runProjectCanvasContextCommand");
  const menu = functionSource("openProjectCanvasContextMenu", "updateProjectCanvasGeometry");
  assert.match(item, /node\.ref_type === "note"/);
  assert.match(item, /refType: "note"/);
  assert.match(menu, /styleCanvasContextItem/);
  assert.match(menu, /renderStyleContentContextMenu/);
});

test("asset and trash icons match the project navigation shapes", () => {
  const icons = functionSource("workbenchIcon", "renderStyleDirectionList");
  assert.match(icons, /M4 8v11/);
  assert.match(icons, /M10 12h4/);
  assert.match(icons, /M10 11v6/);
  assert.match(icons, /M14 11v6/);
});

test("style list renders every group as a drop target including ungrouped", () => {
  const sections = functionSource("styleContentSections", "projectFileRelativePathFromUrl");
  const list = functionSource("renderStyleContentList", "renderStyleCompareWorkspace");
  assert.match(sections, /sections\.size \|\| ungrouped\.items\.length/);
  assert.match(list, /data-style-group-drop-target/);
  assert.match(list, /data-group-id/);
  assert.doesNotMatch(list, /style-content-group-drop-hint/);
});

test("group moves update canvas group ids and persist the shared canvas", () => {
  const move = functionSource("moveStyleListContentToGroup", "createStyleDragGhost");
  assert.ok(move);
  assert.match(move, /node\.group_id = target/);
  assert.match(move, /persistStyleCanvas/);
  assert.match(move, /rerenderStyleModulePreservingScroll/);
});

test("list drag binding uses a custom drag image and target feedback", () => {
  const drag = functionSource("bindStyleContentListInteractions", "renderStyleCompareWorkspace");
  assert.ok(drag);
  assert.match(drag, /setDragImage/);
  assert.match(drag, /is-drag-target/);
  assert.match(drag, /moveStyleListContentToGroup/);
  assert.match(drag, /styleDragContentKeys/);
  assert.match(drag, /data-style-drag-content/);
});

test("list and canvas dispatch through the shared style content command", () => {
  const shared = functionSource("runStyleContentCommand", "closeStyleContentContextMenus");
  assert.ok(shared);
  assert.match(shared, /regenerate/);
  assert.match(shared, /cover/);
  assert.match(shared, /library/);
  assert.match(shared, /transfer/);
  assert.match(shared, /delete/);
  const canvas = functionSource("runProjectCanvasContextCommand", "openProjectCanvasContextMenu");
  assert.match(canvas, /runStyleContentCommand/);
});

test("context menus support group choices and escape dismissal", () => {
  const menu = functionSource("renderStyleContentContextMenu", "runStyleContentCommand");
  assert.ok(menu);
  assert.match(menu, /未分组/);
  assert.match(menu, /新建分组/);
  assert.match(menu, /data-style-group-choice/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /closeStyleContentContextMenus/);
});

test("canvas uses the normal cursor until middle-button panning starts", () => {
  assert.match(styles, /\.asset-canvas-viewport\s*\{[^}]*cursor:\s*default;/s);
  assert.match(styles, /\.asset-canvas-viewport\.is-panning\s*\{[^}]*cursor:\s*grabbing;/s);
});

test("adjust group opens a secondary menu instead of expanding the primary menu", () => {
  const menu = functionSource("renderStyleContentContextMenu", "runStyleContentCommand");
  assert.match(menu, /data-style-group-submenu-trigger/);
  assert.match(menu, /style-context-group-submenu/);
  assert.doesNotMatch(menu, /if \(groupSubmenu\.hidden\)/);
  assert.doesNotMatch(menu, /<details class="style-context-group-menu"/);
});

test("group submenu is positioned beside the primary menu and flips at the viewport edge", () => {
  const position = functionSource("positionStyleContextGroupSubmenu", "renderStyleContentContextMenu");
  assert.match(position, /triggerRect\.right \+ gap/);
  assert.match(position, /triggerRect\.left - submenuRect\.width - gap/);
  assert.match(position, /window\.innerWidth/);
  assert.match(position, /window\.innerHeight/);
});

test("escape and outside clicks close both primary and secondary style menus", () => {
  const close = functionSource("closeStyleContentContextMenus", "ensureStyleContentContextMenuBindings");
  const bindings = functionSource("ensureStyleContentContextMenuBindings", "removeSelectedStyleListContent");
  assert.match(close, /data-style-content-context-submenu/);
  assert.match(bindings, /data-style-content-context-submenu/);
  assert.match(bindings, /event\.key === "Escape"/);
});

test("list batch actions include the shared adjust-group command", () => {
  const list = functionSource("renderStyleContentList", "bindStyleContentListInteractions");
  assert.match(list, /style-open-group-menu/);
  assert.match(list, /workbenchIcon\("group"\)/);
});

test("style directions expose guide status instead of project-style confirmation", () => {
  const list = functionSource("renderStyleDirectionList", "renderStyleContentToolbar");
  const toolbar = functionSource("renderStyleContentToolbar", "renderStyleContentCard");
  assert.match(list, /style-guide-status/);
  assert.match(list, /confirmed_version_id/);
  assert.match(toolbar, /style-guide-create/);
  assert.doesNotMatch(source, /已确认为项目风格/);
  assert.doesNotMatch(source, /settings-unconfirm-style/);
});

test("direction resources filter only unfinished internal visual-guide records", () => {
  const records = functionSource("styleGenerationRecords", "styleContentItems");
  assert.match(records, /isStyleDirectionResourceRecord/);
});

test("async reference-group refresh preserves the image picker view state", () => {
  const refresh = functionSource("refreshStyleGenerationReferencePickerPreservingView", "requestStyleListCanvas");
  assert.match(refresh, /styleGenerationReferencePaths = new Set/);
  assert.match(refresh, /style-reference-option-list/);
  assert.match(refresh, /style-reference-picker-modal/);
  assert.match(refresh, /preserveScrollPosition/);
  const dependent = functionSource("refreshStyleCanvasDependentUi", "refreshStyleGenerationReferencePickerPreservingView");
  assert.match(dependent, /refreshStyleGenerationReferencePickerPreservingView/);
  assert.doesNotMatch(dependent, /picker\.outerHTML/);
});

test("style module local actions preserve every independent scroll region", () => {
  const rerender = functionSource("rerenderStyleModulePreservingScroll", "saveStyleGroupChanges");
  assert.match(rerender, /preserveScrollPositions/);
  assert.match(rerender, /\.canvas-direction-list/);
  assert.match(rerender, /\.style-content-list/);
  assert.match(rerender, /#styleInspectorPanel \.style-inspector-body/);

  const actions = source.slice(source.indexOf('action === "style-content-select"'), source.indexOf('action === "style-transfer-submit"'));
  assert.match(actions, /style-content-select[\s\S]*rerenderStyleModulePreservingScroll/);
  assert.match(actions, /style-content-clear[\s\S]*rerenderStyleModulePreservingScroll/);
  assert.match(actions, /style-open-settings[\s\S]*rerenderStyleModulePreservingScroll/);
  assert.match(actions, /style-open-generate[\s\S]*rerenderStyleModulePreservingScroll/);
  assert.match(actions, /style-open-reference[\s\S]*rerenderStyleModulePreservingScroll/);
  assert.match(actions, /style-close-inspector[\s\S]*rerenderStyleModulePreservingScroll/);
  assert.match(actions, /style-open-transfer[\s\S]*rerenderStyleModulePreservingScroll/);
});

test("style async list refresh and group detail selection preserve list scroll", () => {
  const dependent = functionSource("refreshStyleCanvasDependentUi", "refreshStyleGenerationReferencePickerPreservingView");
  assert.match(dependent, /rerenderStyleModulePreservingScroll/);
  const actions = source.slice(source.indexOf('action === "style-group-select"'), source.indexOf('action === "style-reference-clear"'));
  assert.match(actions, /style-group-select[\s\S]*rerenderStyleModulePreservingScroll/);
});

test("library row selection and mutations preserve the table scroll container", () => {
  const rerender = functionSource("rerenderLibraryModulePreservingScroll", "renderLibraryDetail");
  assert.match(rerender, /preserveScrollPositions/);
  assert.match(rerender, /\.library-data-table/);
  assert.match(rerender, /\.asset-detail-panel/);
  const actions = source.slice(source.indexOf('action === "library-select"'), source.indexOf('action === "library-download-selected"'));
  assert.match(actions, /library-select[\s\S]*rerenderLibraryModulePreservingScroll/);
  assert.match(actions, /library-save[\s\S]*rerenderLibraryModulePreservingScroll/);
  assert.match(actions, /library-remove[\s\S]*rerenderLibraryModulePreservingScroll/);
});
