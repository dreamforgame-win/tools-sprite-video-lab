const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
fs.cpSync(path.join(root, 'app'), path.join(output, 'app'), { recursive: true });
const art = require('./demo-art.cjs');
for (const folder of ['app/demo-assets', 'api/v1/projects/demo-forest/files']) {
  fs.mkdirSync(path.join(output, folder), { recursive: true });
  for (const [name, content] of Object.entries(art)) fs.writeFileSync(path.join(output, folder, name), content);
}
const html = fs.readFileSync(path.join(root, 'app', 'index.html'), 'utf8')
  .replace('配置生成服务 MCP Token 后可开始生成。', '展示版可预览参数与示例结果；无需配置 Token，不执行在线生成。')
  .replace('数据来自项目文件清单', '示例进度 · 8 / 14 项素材')
  .replace('</head>', '  <link rel="stylesheet" href="/app/demo.css">\n</head>')
  .replace('<script src="/app/app.js"></script>', '<script src="/app/demo-data.js"></script>\n  <script src="/app/app.js"></script>\n  <script src="/app/demo-ui.js"></script>');
fs.writeFileSync(path.join(output, 'index.html'), html);
fs.writeFileSync(path.join(output, 'app', 'index.html'), html);
console.log('Static site generated in dist/ (homepage and app/ assets).');
