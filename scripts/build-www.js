'use strict';

// 把 Web 端源码（index.html / css / js / assets）拷进 www/，
// 供 Capacitor 打包安卓使用；Electron 直接读根目录，不走这里。

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');

const entries = ['index.html', 'css', 'js', 'assets'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const name of entries) {
  const src = path.join(root, name);
  if (!fs.existsSync(src)) {
    console.error('缺少文件或目录：' + name);
    process.exit(1);
  }
  fs.cpSync(src, path.join(out, name), { recursive: true });
}

console.log('已生成 www/：' + entries.join('、'));