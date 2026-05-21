/**
 * Post-optimization asset report (run after npm run optimize).
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QODER = path.resolve(__dirname, '../..');

const TARGETS = [
  { label: 'future-partner persona', dir: 'future-partner-test/assets/persona' },
  { label: 'future-partner dimension', dir: 'future-partner-test/assets/dimension' },
  { label: 'love-decoding persona', dir: 'love-decoding-test/assets/persona' },
  { label: 'love-decoding dimension', dir: 'love-decoding-test/assets/dimension' },
  { label: 'test-catalog images', dir: 'test-catalog/assets/images' },
  { label: 'fp hero elements', dir: 'future-partner-test/assets/elements' },
  { label: 'ld hero elements', dir: 'love-decoding-test/assets/elements' },
  { label: 'fp progress bar', dir: 'future-partner-test/assets/progress bar' },
  { label: 'ld progress bar', dir: 'love-decoding-test/assets/progress bar' },
  { label: 'fp payment', dir: 'future-partner-test/assets/payment' },
  { label: 'ld payment', dir: 'love-decoding-test/assets/payment' },
];

async function dirStats(relDir) {
  const abs = path.join(QODER, relDir);
  let entries;
  try {
    entries = await fs.readdir(abs, { withFileTypes: true });
  } catch {
    return null;
  }
  let total = 0;
  let largest = { name: '', bytes: 0 };
  const byExt = {};
  for (const e of entries) {
    if (!e.isFile() || e.name.startsWith('.')) continue;
    const fp = path.join(abs, e.name);
    const st = await fs.stat(fp);
    total += st.size;
    const ext = path.extname(e.name).toLowerCase() || '(none)';
    byExt[ext] = (byExt[ext] || 0) + st.size;
    if (st.size > largest.bytes) largest = { name: e.name, bytes: st.size };
  }
  return { total, largest, byExt };
}

function fmt(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  return (bytes / 1024).toFixed(0) + ' KB';
}

console.log('# Asset verification report\n');
console.log('| Directory | Total | Largest file | WebP share |');
console.log('|-----------|-------|--------------|------------|');

for (const t of TARGETS) {
  const s = await dirStats(t.dir);
  if (!s) {
    console.log(`| ${t.label} | (missing) | — | — |`);
    continue;
  }
  const webp = s.byExt['.webp'] || 0;
  const webpPct = s.total ? Math.round((webp / s.total) * 100) : 0;
  console.log(
    `| ${t.label} | ${fmt(s.total)} | ${s.largest.name} ${fmt(s.largest.bytes)} | ${webpPct}% webp |`,
  );
}

console.log('\n## Expected browser behavior');
console.log('- Modern browsers load .webp via <picture><source type="image/webp">');
console.log('- Result persona (future-partner): ~80KB webp vs former ~12MB PNG per image');
console.log('- Catalog LCP: preload 爱的解码首页.webp (~33KB) + lazy second card (~45KB webp)');
