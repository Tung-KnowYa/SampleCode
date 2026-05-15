const fs = require('fs');
const path = require('path');

const frontendRoot = path.join(__dirname, '..');
const distDir = path.join(frontendRoot, 'dist');
const embeddedDest = path.join(
  frontendRoot,
  '..',
  '..',
  'ExampleHostApp',
  'frontend',
  'public',
  'embedded',
);

if (!fs.existsSync(distDir)) {
  console.error('copy-embedded-to-board: dist/ not found; run webpack build first.');
  process.exit(1);
}

fs.mkdirSync(embeddedDest, { recursive: true });
fs.cpSync(distDir, embeddedDest, { recursive: true, force: true });
console.log(`copy-embedded-to-board: copied ${distDir} -> ${embeddedDest}`);
