# Style Content List Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify style-image commands and icons across list, canvas, detail, and context menus, while adding persistent drag-to-group behavior to the style list.

**Architecture:** Add pure selection and group-move helpers to `generation-utils.js` so drag behavior can be tested without a browser. Keep the existing project canvas as the only group data source, and add one shared style-content command/menu layer in `app.js` that both list cards and canvas nodes call.

**Tech Stack:** Browser JavaScript, HTML5 drag-and-drop, existing REST canvas persistence, CSS, Node test runner, Playwright CLI.

---

### Task 1: Pure drag-selection and group-move planning

**Files:**
- Modify: `app/generation-utils.js`
- Modify: `tests/test_generation_utils.js`

- [ ] **Step 1: Write failing tests**

```js
test("dragging a selected image moves the selected image set", () => {
  assert.deepEqual(
    generationUtils.styleDragContentKeys(
      "generation_result:a",
      ["generation_result:a", "style_reference:b", "note:c"],
      ["generation_result:a", "style_reference:b"],
    ),
    ["generation_result:a", "style_reference:b"],
  );
});

test("group move plan ignores items already in the target group", () => {
  assert.deepEqual(
    generationUtils.styleGroupMoveKeys([
      { key: "generation_result:a", groupId: "scene" },
      { key: "style_reference:b", groupId: "" },
    ], "scene"),
    ["style_reference:b"],
  );
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests\test_generation_utils.js`

Expected: FAIL because `styleDragContentKeys` and `styleGroupMoveKeys` do not exist.

- [ ] **Step 3: Implement minimal pure helpers**

```js
function styleDragContentKeys(draggedKey, selectedKeys, draggableKeys) {
  const allowed = new Set(draggableKeys || []);
  if (!allowed.has(draggedKey)) return [];
  const selected = Array.from(new Set(selectedKeys || [])).filter((key) => allowed.has(key));
  return selected.includes(draggedKey) ? selected : [draggedKey];
}

function styleGroupMoveKeys(items, targetGroupId) {
  const target = String(targetGroupId || "");
  return (items || [])
    .filter((item) => String(item?.groupId || "") !== target)
    .map((item) => String(item.key || ""))
    .filter(Boolean);
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests\test_generation_utils.js`

Expected: all generation utility tests pass.

### Task 2: Unified icons, cards, and menu descriptors

**Files:**
- Modify: `app/app.js`
- Modify: `app/styles.css`
- Create: `tests/test_style_content_interactions.js`

- [ ] **Step 1: Write failing source-behavior tests**

```js
test("style image cards are draggable and expose a shared context target", () => {
  const cards = functionSource("renderStyleContentCard", "renderStyleContentList");
  assert.match(cards, /draggable="true"/);
  assert.match(cards, /data-style-context-content/);
  assert.match(cards, /workbenchIcon\("expand"\)/);
});

test("shared style menu contains common and type-specific commands", () => {
  const menu = functionSource("styleContentMenuActions", "renderStyleContentContextMenu");
  assert.match(menu, /preview/);
  assert.match(menu, /adjust-group/);
  assert.match(menu, /transfer/);
  assert.match(menu, /regenerate/);
  assert.match(menu, /library/);
  assert.match(menu, /download/);
  assert.match(menu, /delete/);
});

test("asset and trash icons match the project navigation shapes", () => {
  const icons = functionSource("workbenchIcon", "renderStyleDirectionList");
  assert.match(icons, /M4 8v11/);
  assert.match(icons, /M10 12h4/);
  assert.match(icons, /M10 11v6/);
  assert.match(icons, /M14 11v6/);
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests\test_style_content_interactions.js`

Expected: FAIL because draggable markers and shared menu functions are missing.

- [ ] **Step 3: Add shared icon shapes and menu descriptors**

```js
function styleContentMenuActions(item, { canvas = false } = {}) {
  const common = [
    { command: "preview", label: "查看大图", icon: "expand" },
    { command: "adjust-group", label: "调整分组", icon: "group" },
    { command: "transfer", label: "移动/复制到方向", icon: "transfer" },
  ];
  const generated = item?.refType === "generation_result"
    ? [
      { command: "regenerate", label: "重新生成", icon: "refresh" },
      { command: "cover", label: "设为封面", icon: "cover" },
      { command: "library", label: "加入资产管理", icon: "library" },
      { command: "download", label: "下载", icon: "download" },
    ]
    : [{ command: "rename", label: "重命名", icon: "pencil" }];
  const spatial = canvas
    ? [
      { command: "lock", label: "锁定所选节点", icon: "lock" },
      { command: "group", label: "合并为分组", icon: "group" },
      { command: "align", label: "对齐所选节点", icon: "align" },
    ]
    : [];
  return [...generated.slice(0, 1), ...common, ...generated.slice(1), ...spatial,
    { command: "delete", label: "移入回收站", icon: "trash", danger: true }];
}
```

Update `workbenchIcon("library")` and `workbenchIcon("trash")` to use the exact asset-management and recycle-bin paths from `app/index.html`. Render the common expand icon on list and canvas thumbnails.

- [ ] **Step 4: Mark image cards as shared drag/context targets**

```html
<article
  class="style-content-card"
  draggable="true"
  data-style-context-content
  data-content-key="generation_result:record-id"
  data-content-type="generation_result"
  data-id="record-id"
  data-group-id="scene">
</article>
```

Notes remain non-draggable and do not receive `data-style-context-content`.

- [ ] **Step 5: Run tests and syntax checks**

Run:

```powershell
node --test tests\test_style_content_interactions.js
node --check app\app.js
```

Expected: tests pass and syntax checks exit 0.

### Task 3: Persistent drag-to-group interaction

**Files:**
- Modify: `app/app.js`
- Modify: `app/styles.css`
- Modify: `tests/test_style_content_interactions.js`

- [ ] **Step 1: Add failing tests for drop targets and persistence**

```js
test("style list renders every group as a drop target including ungrouped", () => {
  const list = functionSource("renderStyleContentList", "renderStyleCompareWorkspace");
  assert.match(list, /data-style-group-drop-target/);
  assert.match(list, /data-group-id/);
});

test("group moves update canvas group ids and persist the shared canvas", () => {
  const move = functionSource("moveStyleListContentToGroup", "createStyleDragGhost");
  assert.match(move, /node\.group_id = target/);
  assert.match(move, /persistStyleCanvas/);
  assert.match(move, /rerenderStyleModulePreservingScroll/);
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests\test_style_content_interactions.js`

Expected: FAIL because drop-target and move functions are missing.

- [ ] **Step 3: Always expose an ungrouped drop target**

Change `styleContentSections` so the ungrouped section remains visible when named groups exist, even when it contains zero items:

```js
if (sections.size || ungrouped.items.length) grouped.push(ungrouped);
```

Render each section with `data-style-group-drop-target`, `data-group-id`, and `data-group-name`. Add a hidden target hint whose text is “移到「名称」” or “移出分组”.

- [ ] **Step 4: Implement shared-canvas group persistence**

```js
async function moveStyleListContentToGroup(keys, targetGroupId, newGroupName = "") {
  const style = selectedStyleDirection();
  const items = styleContentItems(style);
  const canvas = currentStyleListCanvas(style, items);
  if (!style || !canvas) throw new Error("分组数据尚未加载，请稍后重试");
  const target = String(targetGroupId || "");
  const itemMap = new Map(items.map((item) => [styleContentKey(item), item]));
  const movable = styleGroupMoveKeys(
    keys.map((key) => {
      const item = itemMap.get(key);
      const node = item ? styleContentNode(canvas, item) : null;
      return { key, groupId: node?.group_id || "" };
    }),
    target,
  );
  movable.forEach((key) => {
    const node = styleContentNode(canvas, itemMap.get(key));
    if (node) node.group_id = target;
  });
  if (target && newGroupName && !ensureCanvasGroups(canvas).some((group) => group.id === target)) {
    canvas.groups.push({ id: target, name: newGroupName.slice(0, 80) });
  }
  await persistStyleCanvas(style, canvas);
  rerenderStyleModulePreservingScroll();
}
```

- [ ] **Step 5: Bind native drag events with custom drag image**

On `dragstart`, calculate the dragged key set with `styleDragContentKeys`, create a fixed-size clone of the thumbnail, and call `event.dataTransfer.setDragImage`. On `dragover`, clear old targets and add `.is-drag-target` to the current section. On `drop`, call `moveStyleListContentToGroup`. On `dragend`, remove the ghost and all target classes.

- [ ] **Step 6: Add target and ghost styling**

```css
.style-content-card[draggable="true"] { cursor: grab; }
.style-content-card.is-dragging { opacity: .45; }
.style-content-group.is-drag-target {
  outline: 2px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
.style-content-group-drop-hint { display: none; }
.style-content-group.is-drag-target .style-content-group-drop-hint { display: inline-flex; }
.style-content-drag-ghost {
  position: fixed;
  width: 128px;
  pointer-events: none;
}
```

- [ ] **Step 7: Run tests and syntax check**

Run:

```powershell
node --test tests\test_generation_utils.js tests\test_style_content_interactions.js
node --check app\app.js
```

Expected: all tests pass.

### Task 4: Shared list and canvas context menus

**Files:**
- Modify: `app/app.js`
- Modify: `app/styles.css`
- Modify: `tests/test_style_content_interactions.js`

- [ ] **Step 1: Add failing context-menu tests**

```js
test("list and canvas dispatch through the shared style content command", () => {
  const shared = functionSource("runStyleContentCommand", "closeStyleContentContextMenus");
  assert.match(shared, /style-result-regenerate/);
  assert.match(shared, /style-result-cover/);
  assert.match(shared, /style-result-library/);
  assert.match(shared, /style-open-transfer/);
  assert.match(shared, /style-result-delete|style-reference-remove/);
  const canvas = functionSource("runProjectCanvasContextCommand", "openProjectCanvasContextMenu");
  assert.match(canvas, /runStyleContentCommand/);
});

test("context menus support group choices and escape dismissal", () => {
  const menuSource = functionSource("renderStyleContentContextMenu", "runStyleContentCommand");
  assert.match(menuSource, /未分组/);
  assert.match(menuSource, /新建分组/);
  assert.match(menuSource, /data-style-group-choice/);
  assert.match(source, /event\.key === "Escape"/);
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `node --test tests\test_style_content_interactions.js`

Expected: FAIL because the shared menu renderer and dispatcher are missing.

- [ ] **Step 3: Implement one command dispatcher**

`runStyleContentCommand(command, item, context)` must:

- call the existing lightbox for `preview`;
- seed the existing generation panel for `regenerate`;
- patch the direction cover for `cover`;
- call the existing asset-ingestion function for `library`;
- click a temporary download anchor for `download`;
- open the existing transfer panel after populating the selection for `transfer`;
- call `moveStyleListContentToGroup` for a group choice;
- ask for a name and update reference metadata for `rename`;
- route generation deletion to lifecycle `trashed` and reference deletion to direction removal.

Canvas-only `lock`, `group`, and `align` continue through `handleCanvasAction`.

- [ ] **Step 4: Render and position a shared menu**

Create the menu under `document.body`, clamp it to the viewport, group items with separators, and render icon plus text for every command. “调整分组” opens an inline submenu containing ungrouped, existing groups, and new group. Mark the current group with `workbenchIcon("check")`.

- [ ] **Step 5: Bind list right-click and update canvas right-click**

The list `contextmenu` handler selects the clicked item, then opens the shared menu. Canvas node menus call the same renderer with `{ canvas: true }`; blank-canvas and group-frame menus keep their existing spatial commands.

- [ ] **Step 6: Add dismissal and accessibility**

Close menus on `Escape`, outside pointer-down, list scroll, window resize, and after command execution. Menu buttons receive `role="menuitem"`, icons remain `aria-hidden`, and dangerous commands use the existing danger color.

- [ ] **Step 7: Run tests**

Run:

```powershell
node --test tests\test_style_result_detail.js tests\test_style_content_interactions.js
node --check app\app.js
```

Expected: all tests pass and syntax checks exit 0.

### Task 5: Browser and regression verification

**Files:**
- Modify if needed: `app/app.js`
- Modify if needed: `app/styles.css`

- [ ] **Step 1: Run the full targeted automated suite**

```powershell
node --test tests\test_generation_utils.js tests\test_style_result_detail.js tests\test_style_content_interactions.js
.\.venv-ai\Scripts\python.exe -m unittest tests.test_project_service tests.test_omnigen_service
node --check app\generation-utils.js
node --check app\app.js
.\.venv-ai\Scripts\python.exe -m py_compile server.py project_service.py omnigen_service.py
git diff --check -- app\app.js app\styles.css app\generation-utils.js docs\GENERATION_RULES.zh-CN.md tests\test_generation_utils.js tests\test_style_result_detail.js tests\test_style_content_interactions.js
```

Expected: zero failures and zero syntax/diff errors.

- [ ] **Step 2: Verify in the active page**

Open `http://127.0.0.1:8895/app/index.html` and verify:

1. asset-management and recycle-bin icons match the sidebar;
2. list and canvas preview icons match;
3. dragging one image displays a thumbnail ghost and highlights a target group;
4. dropping into a named group updates both list and canvas;
5. dropping into ungrouped clears membership;
6. dragging a selected image moves the selected image set;
7. generation and reference right-click menus show their correct commands;
8. group submenu supports named groups, ungrouped, and new group;
9. menu stays in the viewport and closes with `Escape`;
10. browser console reports zero errors.

- [ ] **Step 3: Probe the page**

Run:

```powershell
$response = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8895/app/index.html'
"HTTP {0} {1}" -f [int]$response.StatusCode, $response.StatusDescription
```

Expected: `HTTP 200 OK`.
