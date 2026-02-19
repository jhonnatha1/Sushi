const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

if (fs.existsSync(publicDir)) fs.rmSync(publicDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

copyRecursive(path.join(root, 'index.html'), path.join(publicDir, 'index.html'));
if (fs.existsSync(path.join(root, 'imgs'))) copyRecursive(path.join(root, 'imgs'), path.join(publicDir, 'imgs'));
copyRecursive(path.join(root, 'sobre-carousel'), path.join(publicDir, 'sobre-carousel'));

console.log('Public folder ready at ./public');
