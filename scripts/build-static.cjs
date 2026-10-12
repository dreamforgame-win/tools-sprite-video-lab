const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
fs.cpSync(path.join(root, 'app'), path.join(output, 'app'), { recursive: true });
fs.copyFileSync(path.join(root, 'app', 'index.html'), path.join(output, 'index.html'));
console.log('Static site generated in dist/ (homepage and app/ assets).');
