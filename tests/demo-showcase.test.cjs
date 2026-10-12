const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const art = require('../scripts/demo-art.cjs');
function adapter() {
  const context = { window: {}, URL, structuredClone };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'app/demo-data.js'), 'utf8'), context);
  return context.window.SpriteDemo;
}
test('project selection and dashboard agree with eight assets', async () => {
  const demo = adapter();
  const registry = await demo.request('/api/v1/projects?ts=1');
  assert.equal(registry.projects.length, 1);
  const selected = await demo.request('/api/v1/projects/select', { method: 'POST', body: { project_id: registry.projects[0].id } });
  assert.equal(selected.project.id, registry.projects[0].id);
  const { dashboard } = await demo.request('/api/v1/projects/demo-forest/dashboard');
  assert.equal(dashboard.categories.reduce((n,c) => n+c.completed,0), demo.assets.length);
  assert.equal(dashboard.progress, Math.round(8/14*100));
});
test('all generation records reference valid tree nodes and original artwork', async () => {
  const demo = adapter();
  const tree = await demo.request('/api/v1/projects/demo-forest/asset-tree');
  for(const record of demo.records) {
    assert(tree.asset_tree.nodes.some(n => n.id === record.asset_node_id && n.type === 'asset'));
    assert(art[record.relative_path]);
  }
});
test('all guide versions and module references have images', async () => {
  const demo = adapter();
  const { style_guides } = await demo.request('/api/v1/projects/demo-forest/style-guides');
  const { versions } = await demo.request('/api/v1/projects/demo-forest/style-guides/guide-forest/versions');
  assert.equal(style_guides[0].confirmed_version_id, versions[0].id);
  assert.equal(Object.keys(versions[0].modules).length, 5);
  for(const module of Object.values(versions[0].modules)) assert(art[module.references[0].relative_path]);
});
test('real processing, uploads, credentials and writes are rejected', async () => {
  const demo = adapter();
  for(const [url,method] of [['/api/upload','POST'],['/api/v1/generation/tasks','POST'],['/api/local-profile','POST'],['/api/v1/projects/demo-forest','DELETE'],['/api/model-download-start','POST'],['/api/v1/projects/demo-forest/library/library-moss','PATCH']]) {
    await assert.rejects(demo.request(url,{method}), /展示模式/);
  }
});
test('returned fixtures cannot accidentally mutate subsequent responses', async () => {
  const demo = adapter();
  const response = await demo.request('/api/v1/projects/demo-forest/library');
  response.assets[0].name = 'changed'; response.assets.pop();
  const fresh = await demo.request('/api/v1/projects/demo-forest/library');
  assert.equal(fresh.assets.length, 8); assert.notEqual(fresh.assets[0].name, 'changed');
});
test('canvas edits live only in one adapter instance and reset on reload', async () => {
  const demo = adapter(); const url = '/api/v1/projects/demo-forest/canvases/style';
  await demo.request(url, { method: 'POST', body: { canvas: { nodes: [{ id: 'test' }] } } });
  assert.equal((await demo.request(url)).canvas.nodes.length, 1);
  assert.equal((await adapter().request(url)).canvas.nodes.length, 0);
});
test('twelve distinct animation frames and both matte inputs are present', () => {
  for(let i=0;i<12;i++) assert(art[`frame-${i}.svg`]);
  assert.notEqual(art['frame-0.svg'], art['frame-3.svg']);
  assert(art['moss-black.svg']); assert(art['moss-white.svg']);
});
test('only static output injects demo scripts; all referenced resources exist', () => {
  const local = fs.readFileSync(path.join(root,'app/index.html'),'utf8');
  const built = fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
  assert(!local.includes('/app/demo-data.js'));
  assert(built.indexOf('/app/demo-data.js') < built.indexOf('/app/app.js'));
  assert(built.includes('/app/demo-ui.js'));
  for(const match of built.matchAll(/(?:src|href)="(\/app\/[^"?#]+)(?:[^" ]*)"/g)) assert(fs.existsSync(path.join(root,'dist',match[1])),match[1]);
  assert(!fs.existsSync(path.join(root,'dist/server.py')));
  assert.equal(built,fs.readFileSync(path.join(root,'dist/app/index.html'),'utf8'));
});
