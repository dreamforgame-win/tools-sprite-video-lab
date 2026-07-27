const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.resolve(__dirname, "../app/app.js"), "utf8");
const html = fs.readFileSync(path.resolve(__dirname, "../app/index.html"), "utf8");
const css = fs.readFileSync(path.resolve(__dirname, "../app/styles.css"), "utf8");
const rules = fs.readFileSync(path.resolve(__dirname, "../docs/GENERATION_RULES.zh-CN.md"), "utf8");
const design = fs.readFileSync(path.resolve(__dirname, "../docs/SUNNY_STAGE_DESIGN_LANGUAGE.zh-CN.md"), "utf8");

function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  return start >= 0 && end > start ? source.slice(start, end) : "";
}

test("Agent access is placed immediately to the right of the local profile entry", () => {
  const group = html.match(/<div class="topbar-access-actions">[\s\S]*?<\/div>\s*<\/header>/)?.[0] || "";
  assert.match(group, /id="localProfileButton"/);
  assert.match(group, /id="agentAccessButton"/);
  assert.ok(group.indexOf('id="localProfileButton"') < group.indexOf('id="agentAccessButton"'));
  assert.match(rules, /顶栏“本地资料”右侧/);
  assert.match(design, /Agent 接入入口紧邻本地资料入口右侧/);
});

test("Agent access dialog exposes the protocol, workflow, constraints, and endpoints", () => {
  const dialog = html.match(/<div id="agentAccessDialog"[\s\S]*?<div id="projectCreateDialog"/)?.[0] || "";
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /标准执行流程/);
  assert.match(dialog, /生图能力分支/);
  assert.match(dialog, /必须遵守的规范/);
  assert.match(dialog, /GET \/api\/v1\/agent\/manifest/);
  assert.match(dialog, /actions\/\{actionId\}\/artifacts/);
});

test("Manifest loading and generated prompt use the live origin and current project", () => {
  const prompt = functionSource("buildAgentAccessPrompt", "renderAgentAccessPrompt");
  const loader = functionSource("loadAgentAccessManifest", "openAgentAccessDialog");
  assert.match(prompt, /agentAccessOrigin\(\)/);
  assert.match(prompt, /activeProjectId\(\) \|\| "YOUR_PROJECT_ID"/);
  assert.match(loader, /\/api\/v1\/agent\/manifest/);
  assert.match(loader, /data\.manifest \|\| data\.result \|\| data/);
});

test("Copyable prompt tells AI how to negotiate image generation and follow next actions", () => {
  const prompt = functionSource("buildAgentAccessPrompt", "renderAgentAccessPrompt");
  const copy = functionSource("copyAgentAccessPrompt", "profileInitial");
  assert.match(prompt, /native_image_generation/);
  assert.match(prompt, /agent_native/);
  assert.match(prompt, /server_mcp/);
  assert.match(prompt, /next_actions/);
  assert.match(prompt, /Idempotency-Key/);
  assert.match(copy, /navigator\.clipboard\?\.writeText/);
  assert.match(copy, /document\.execCommand\("copy"\)/);
});

test("Dialog interaction preserves the workbench and has compact responsive styles", () => {
  const open = functionSource("openAgentAccessDialog", "closeAgentAccessDialog");
  const close = functionSource("closeAgentAccessDialog", "copyAgentAccessPrompt");
  assert.doesNotMatch(open, /setActiveModule/);
  assert.match(open, /agentAccessDialog\.hidden = false/);
  assert.match(close, /agentAccessButton\?\.focus/);
  assert.match(source, /event\.key !== "Escape"[\s\S]*agentAccessDialog/);
  assert.match(css, /body\.project-active \.topbar \.agent-access-button span\s*\{\s*display: none/);
  assert.match(css, /\.agent-access-workspace\s*\{[\s\S]*grid-template-columns/);
});
