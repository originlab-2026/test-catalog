/**
 * Batch resize + WebP for future-partner-test, love-decoding-test, test-catalog.
 * Run from this directory: npm install && npm run optimize
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QODER = path.resolve(__dirname, '../..');

const REPOS = {
  futurePartner: path.join(QODER, 'future-partner-test'),
  loveDecoding: path.join(QODER, 'love-decoding-test'),
  testCatalog: path.join(QODER, 'test-catalog'),
};

const MAX_ILLUSTRATION = 960;
const MAX_HERO = 1100;
/** 进度条小猫展示约 40px，2x 屏足够 */
const MAX_PROGRESS_CAT = 160;
/** 进度条草地条带：全宽细长 */
const MAX_PROGRESS_GRASS_W = 1280;
const MAX_PROGRESS_GRASS_H = 48;
/** 收款码展示宽度 */
const MAX_PAYMENT_QR = 480;
const WEBP_QUALITY = 82;
const JPEG_QUALITY = 85;
const WEBP_QUALITY_PROGRESS = 80;

const auditOnly = process.argv.includes('--audit-only');
const progressOnly = process.argv.includes('--progress-only');

async function statFile(p) {
  try {
    const s = await fs.stat(p);
    return s.size;
  } catch {
    return 0;
  }
}

async function auditDir(label, dir, ext = ['.png', '.jpg', '.jpeg', '.webp']) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    console.warn(`[audit] skip missing: ${dir}`);
    return { label, dir, files: 0, totalBytes: 0, largest: null };
  }
  let total = 0;
  let largest = { name: '', bytes: 0 };
  let count = 0;
  for (const e of entries) {
    if (!e.isFile()) continue;
    const lower = e.name.toLowerCase();
    if (!ext.some((x) => lower.endsWith(x))) continue;
    const fp = path.join(dir, e.name);
    const bytes = await statFile(fp);
    total += bytes;
    count++;
    if (bytes > largest.bytes) largest = { name: e.name, bytes };
  }
  return { label, dir, files: count, totalBytes: total, largest };
}

async function writeAtomic(targetPath, buffer) {
  const tmp = `${targetPath}.tmp-${process.pid}`;
  await fs.writeFile(tmp, buffer);
  await fs.rename(tmp, targetPath);
}

/**
 * From PNG: write .webp alongside, replace .png with resized compressed PNG.
 */
async function optimizePngPair(dir) {
  const names = await fs.readdir(dir);
  const pngs = names.filter((n) => n.endsWith('.png') && !n.startsWith('.'));
  for (const file of pngs) {
    const base = file.replace(/\.png$/i, '');
    const inputPath = path.join(dir, file);
    const webpPath = path.join(dir, `${base}.webp`);
    const inputBuf = await fs.readFile(inputPath);
    const pipeline = sharp(inputBuf).rotate().resize({
      width: MAX_ILLUSTRATION,
      height: MAX_ILLUSTRATION,
      fit: 'inside',
      withoutEnlargement: true,
    });
    const webpBuf = await pipeline.clone().webp({ quality: WEBP_QUALITY, effort: 6 }).toBuffer();
    await writeAtomic(webpPath, webpBuf);
    const pngBuf = await sharp(inputBuf)
      .rotate()
      .resize({
        width: MAX_ILLUSTRATION,
        height: MAX_ILLUSTRATION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();
    await writeAtomic(inputPath, pngBuf);
    const inSize = inputBuf.length;
    console.log(
      `[png+webp] ${path.relative(QODER, inputPath)} ${(inSize / 1024 / 1024).toFixed(2)}MB -> png ${(pngBuf.length / 1024).toFixed(0)}KB webp ${(webpBuf.length / 1024).toFixed(0)}KB`,
    );
  }
}

/** JPG + WEBP in persona dir (love-decoding): recompress both */
async function optimizeJpgWebpPair(dir) {
  const names = await fs.readdir(dir);
  const jpgs = names.filter((n) => /\.jpe?g$/i.test(n) && !n.startsWith('.'));
  for (const file of jpgs) {
    const base = file.replace(/\.jpe?g$/i, '');
    const inputPath = path.join(dir, file);
    const webpPath = path.join(dir, `${base}.webp`);
    const inputBuf = await fs.readFile(inputPath);
    const pipeline = sharp(inputBuf).rotate().resize({
      width: MAX_ILLUSTRATION,
      height: MAX_ILLUSTRATION,
      fit: 'inside',
      withoutEnlargement: true,
    });
    const jpgBuf = await pipeline.clone().jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    const webpBuf = await pipeline.clone().webp({ quality: WEBP_QUALITY, effort: 6 }).toBuffer();
    await writeAtomic(inputPath, jpgBuf);
    await writeAtomic(webpPath, webpBuf);
    console.log(
      `[jpg+webp] ${path.relative(QODER, inputPath)} ${(inputBuf.length / 1024).toFixed(0)}KB -> jpg ${(jpgBuf.length / 1024).toFixed(0)}KB webp ${(webpBuf.length / 1024).toFixed(0)}KB`,
    );
  }
}

/** Single hero PNG: webp + replace png */
async function optimizeProgressBarDir(dir) {
  let names;
  try {
    names = await fs.readdir(dir);
  } catch {
    console.warn(`[progress] skip missing: ${dir}`);
    return;
  }
  const pngs = names.filter((n) => n.endsWith('.png') && !n.startsWith('.'));
  for (const file of pngs) {
    const base = file.replace(/\.png$/i, '');
    const inputPath = path.join(dir, file);
    const webpPath = path.join(dir, `${base}.webp`);
    const inputBuf = await fs.readFile(inputPath);
    const isCat = base.includes('小猫');
    const resize = isCat
      ? { width: MAX_PROGRESS_CAT, height: MAX_PROGRESS_CAT, fit: 'inside', withoutEnlargement: true }
      : {
          width: MAX_PROGRESS_GRASS_W,
          height: MAX_PROGRESS_GRASS_H,
          fit: 'inside',
          withoutEnlargement: true,
        };
    const pipeline = sharp(inputBuf).rotate().resize(resize);
    const webpBuf = await pipeline
      .clone()
      .webp({ quality: WEBP_QUALITY_PROGRESS, effort: 6, alphaQuality: 80 })
      .toBuffer();
    await writeAtomic(webpPath, webpBuf);
    const pngBuf = await sharp(inputBuf).rotate().resize(resize).png({ compressionLevel: 9, effort: 10 }).toBuffer();
    await writeAtomic(inputPath, pngBuf);
    console.log(
      `[progress] ${path.relative(QODER, inputPath)} ${(inputBuf.length / 1024 / 1024).toFixed(2)}MB -> png ${(pngBuf.length / 1024).toFixed(0)}KB webp ${(webpBuf.length / 1024).toFixed(0)}KB`,
    );
  }
}

async function optimizePaymentDir(dir) {
  let names;
  try {
    names = await fs.readdir(dir);
  } catch {
    return;
  }
  const photos = names.filter((n) => /\.jpe?g$/i.test(n) && !n.startsWith('.'));
  for (const file of photos) {
    const inputPath = path.join(dir, file);
    const inputBuf = await fs.readFile(inputPath);
    const jpgBuf = await sharp(inputBuf)
      .rotate()
      .resize({ width: MAX_PAYMENT_QR, height: MAX_PAYMENT_QR, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    await writeAtomic(inputPath, jpgBuf);
    const webpPath = path.join(dir, file.replace(/\.jpe?g$/i, '.webp'));
    const webpBuf = await sharp(jpgBuf).webp({ quality: 82, effort: 6 }).toBuffer();
    await writeAtomic(webpPath, webpBuf);
    console.log(
      `[payment] ${path.relative(QODER, inputPath)} ${(inputBuf.length / 1024).toFixed(0)}KB -> jpg ${(jpgBuf.length / 1024).toFixed(0)}KB webp ${(webpBuf.length / 1024).toFixed(0)}KB`,
    );
  }
}

async function optimizeHeroPng(filePath, maxW = MAX_HERO) {
  const inputBuf = await fs.readFile(filePath);
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  const webpPath = path.join(dir, `${base}.webp`);
  const pipeline = sharp(inputBuf).rotate().resize({
    width: maxW,
    height: maxW,
    fit: 'inside',
    withoutEnlargement: true,
  });
  const webpBuf = await pipeline.clone().webp({ quality: WEBP_QUALITY, effort: 6 }).toBuffer();
  const pngBuf = await sharp(inputBuf)
    .rotate()
    .resize({ width: maxW, height: maxW, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer();
  await writeAtomic(webpPath, webpBuf);
  await writeAtomic(filePath, pngBuf);
  console.log(
    `[hero] ${path.relative(QODER, filePath)} ${(inputBuf.length / 1024 / 1024).toFixed(2)}MB -> png ${(pngBuf.length / 1024).toFixed(0)}KB webp ${(webpBuf.length / 1024).toFixed(0)}KB`,
  );
}

async function runAudit() {
  const rows = [];
  rows.push(
    await auditDir('fp persona', path.join(REPOS.futurePartner, 'assets/persona')),
    await auditDir('fp dimension', path.join(REPOS.futurePartner, 'assets/dimension')),
    await auditDir('ld persona', path.join(REPOS.loveDecoding, 'assets/persona')),
    await auditDir('ld dimension', path.join(REPOS.loveDecoding, 'assets/dimension')),
    await auditDir('tc images', path.join(REPOS.testCatalog, 'assets/images')),
    await auditDir('fp elements', path.join(REPOS.futurePartner, 'assets/elements')),
    await auditDir('ld elements', path.join(REPOS.loveDecoding, 'assets/elements')),
    await auditDir('fp progress bar', path.join(REPOS.futurePartner, 'assets/progress bar')),
    await auditDir('ld progress bar', path.join(REPOS.loveDecoding, 'assets/progress bar')),
    await auditDir('fp payment', path.join(REPOS.futurePartner, 'assets/payment')),
    await auditDir('ld payment', path.join(REPOS.loveDecoding, 'assets/payment')),
  );
  console.log('\n=== Audit (before/after run separately) ===\n');
  for (const r of rows) {
    const mb = (r.totalBytes / 1024 / 1024).toFixed(2);
    const lg = r.largest && r.largest.bytes ? `${r.largest.name} ${(r.largest.bytes / 1024 / 1024).toFixed(2)}MB` : '—';
    console.log(`${r.label}: ${r.files} files, total ${mb}MB, largest: ${lg}`);
  }
  console.log('\nConstants: MAX_ILLUSTRATION=', MAX_ILLUSTRATION, 'MAX_HERO=', MAX_HERO, 'WEBP_Q=', WEBP_QUALITY);
}

async function main() {
  if (auditOnly) {
    await runAudit();
    return;
  }

  await runAudit();
  console.log('\n=== Optimizing ===\n');

  if (!progressOnly) {
  await optimizePngPair(path.join(REPOS.futurePartner, 'assets/persona'));
  await optimizePngPair(path.join(REPOS.futurePartner, 'assets/dimension'));

  await optimizeJpgWebpPair(path.join(REPOS.loveDecoding, 'assets/persona'));
  await optimizePngPair(path.join(REPOS.loveDecoding, 'assets/dimension'));

  await optimizeHeroPng(path.join(REPOS.futurePartner, 'assets/elements/未来伴侣首页.png'));
  await optimizeHeroPng(path.join(REPOS.futurePartner, 'assets/elements/开始测试按钮.png'), 640);

  await optimizeHeroPng(path.join(REPOS.loveDecoding, 'assets/elements/爱的五种语言首页.png'));
  await optimizeHeroPng(path.join(REPOS.loveDecoding, 'assets/elements/开始测试按钮.png'), 480);

  await optimizeHeroPng(path.join(REPOS.testCatalog, 'assets/images/未来伴侣首页.png'));
  await optimizeHeroPng(path.join(REPOS.testCatalog, 'assets/images/爱的解码首页.png'));
  }

  for (const repo of [REPOS.futurePartner, REPOS.loveDecoding]) {
    await optimizeProgressBarDir(path.join(repo, 'assets/progress bar'));
    await optimizePaymentDir(path.join(repo, 'assets/payment'));
  }

  console.log('\n=== Audit (after) ===\n');
  await runAudit();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
