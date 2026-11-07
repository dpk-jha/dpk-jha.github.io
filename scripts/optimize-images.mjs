#!/usr/bin/env node
// Compress and resize images locally. Zero npm dependencies: it drives the Chrome you already
// have (same approach as build-resume-pdf.mjs) and uses its canvas encoder, which writes WebP.
//
//   node scripts/optimize-images.mjs <file|dir> [<file|dir> ...] [options]
//
// Options
//   --format webp|jpeg   output format (default webp). Use jpeg for og:image / social previews,
//                        because some scrapers (WhatsApp, LinkedIn) do not read WebP.
//   --quality 1-100      encoder quality (default 80)
//   --max-width PX       downscale if wider than this, never upscale (default 1600).
//                        Rule of thumb: displayed CSS width x 2 for sharp high-density screens.
//   --out DIR            write results here instead of next to the originals
//   --bg "#rrggbb"       background used when flattening transparency for JPEG (default #0a0a0b)
//   --dry-run            show what would happen, write nothing
//   --overwrite          allow replacing an output file that already exists (default: skip it)
//   --force              keep a result even when it is not smaller than the original
//
// Safety: originals are never modified or deleted. Output is written next to the original with the
// new extension (hero.png -> hero.webp). An existing file at the destination is never replaced unless
// you pass --overwrite. A result that would not be smaller than its original is discarded. Files named
// *.min.* are skipped (they are earlier outputs). Exits 1 if any image failed. Needs Node 22+ and
// Chrome/Chromium (CHROME_PATH overrides discovery).
//
// Examples
//   node scripts/optimize-images.mjs toggldev/images/hero-1.png --max-width 600
//   node scripts/optimize-images.mjs terminal-studio/images --max-width 1400 --quality 78
//   node scripts/optimize-images.mjs banner.png --format jpeg --max-width 1200 --quality 80

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname, basename, dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const onFatal = e => { console.error(e instanceof Fail ? 'optimize-images: ' + e.message : e); process.exit(1); };
process.on('uncaughtException', onFatal);
process.on('unhandledRejection', onFatal);
const opt = { format: 'webp', quality: 80, maxWidth: 1600, out: null, bg: '#0a0a0b', dry: false, overwrite: false, force: false };
class Fail extends Error {}
const fail = msg => { throw new Fail(msg); };
const inputs = [];
const value = (i, name) => { if (i >= args.length || args[i].startsWith('--')) fail(name + ' needs a value'); return args[i]; };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--format') opt.format = value(++i, a);
  else if (a === '--quality') opt.quality = Number(value(++i, a));
  else if (a === '--max-width') opt.maxWidth = Number(value(++i, a));
  else if (a === '--out') opt.out = resolve(value(++i, a));
  else if (a === '--bg') opt.bg = value(++i, a);
  else if (a === '--dry-run') opt.dry = true;
  else if (a === '--overwrite') opt.overwrite = true;
  else if (a === '--force') opt.force = true;
  else if (a === '-h' || a === '--help') { usage(); process.exit(0); }
  else if (a.startsWith('--')) { usage(); fail('Unknown option ' + a); }
  else inputs.push(a);
}
if (!inputs.length) { usage(); process.exit(1); }
if (!['webp', 'jpeg', 'jpg'].includes(opt.format)) fail('--format must be webp or jpeg');
if (!(opt.quality >= 1 && opt.quality <= 100)) fail('--quality must be 1-100');
if (!(opt.maxWidth >= 16)) fail('--max-width must be a number of pixels');
if (!/^#[0-9a-f]{3,8}$/i.test(opt.bg)) fail('--bg must be a hex color like "#0a0a0b"');
const outExt = opt.format === 'webp' ? 'webp' : 'jpg';
const mime = opt.format === 'webp' ? 'image/webp' : 'image/jpeg';

const IMG = /\.(png|jpe?g|webp)$/i;
function collect(p) {
  const f = resolve(p);
  if (!existsSync(f)) fail('Not found: ' + p);
  if (statSync(f).isDirectory()) return readdirSync(f).flatMap(n => (n.startsWith('.') ? [] : collect(join(f, n))));
  return IMG.test(f) && !/\.min\.[^.]+$/i.test(f) ? [f] : [];
}
const files = [...new Set(inputs.flatMap(collect))];
if (!files.length) fail('No png/jpg/webp images found in the given paths (files named *.min.* are skipped).');

const chrome = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean).find(existsSync);
if (!chrome) fail('Chrome/Chromium not found. Set CHROME_PATH.');

const port = 9700 + Math.floor(Math.random() * 200);
const prof = mkdtempSync(join(tmpdir(), 'optimg-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pending = new Map();
try {
  let target;
  for (let i = 0; i < 40 && !target; i++) { try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {} if (!target) await sleep(250); }
  if (!target) fail('Could not start Chrome.');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

  const fmtKB = n => (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
  let before = 0, after = 0, written = 0, failed = 0, skipped = 0;
  console.log(`format=${outExt} quality=${opt.quality} max-width=${opt.maxWidth}${opt.dry ? '  (dry run)' : ''}\n`);

  for (const f of files) {
    const rel = f.replace(process.cwd() + '/', '');
    const orig = readFileSync(f);
    const srcMime = /\.png$/i.test(f) ? 'image/png' : /\.webp$/i.test(f) ? 'image/webp' : 'image/jpeg';
    const expr = `(async () => {
      const blob = await (await fetch('data:${srcMime};base64,${orig.toString('base64')}')).blob();
      const bmp = await createImageBitmap(blob);
      const scale = Math.min(1, ${opt.maxWidth} / bmp.width);
      const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      ${outExt === 'jpg' ? `g.fillStyle = ${JSON.stringify(opt.bg)}; g.fillRect(0, 0, w, h);` : ''}
      g.drawImage(bmp, 0, 0, w, h);
      const out = await new Promise(r => c.toBlob(r, '${mime}', ${opt.quality / 100}));
      const b64 = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(out); });
      return JSON.stringify({ ow: bmp.width, oh: bmp.height, w, h, b64 });
    })()`;
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result.exceptionDetails || !r.result.result.value) { failed++; console.log(`FAIL  ${rel}: ${r.result.exceptionDetails?.exception?.description?.split('\n')[0] || 'no result'}`); continue; }
    const res = JSON.parse(r.result.result.value);
    const buf = Buffer.from(res.b64, 'base64');
    let dest = join(opt.out || dirname(f), basename(f).replace(/\.[^.]+$/, '') + '.' + outExt);
    if (resolve(dest) === resolve(f)) dest = dest.replace(/\.([^.]+)$/, '.min.$1');
    const destRel = dest.replace(process.cwd() + '/', '');
    before += orig.length;
    if (buf.length >= orig.length && !opt.force) {
      after += orig.length; skipped++;
      console.log(`KEEP  ${rel}  ${res.ow}x${res.oh}  ${fmtKB(orig.length)} (result ${fmtKB(buf.length)} is not smaller; use --force to keep it)`);
      continue;
    }
    if (existsSync(dest) && !opt.overwrite) {
      after += orig.length; skipped++;
      console.log(`SKIP  ${rel}  ${destRel} already exists (use --overwrite to replace it)`);
      continue;
    }
    after += buf.length;
    if (!opt.dry) { mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, buf); written++; }
    const pct = Math.round((1 - buf.length / orig.length) * 100);
    console.log(`${opt.dry ? 'WOULD' : 'WROTE'} ${rel}  ${res.ow}x${res.oh}${res.w !== res.ow ? ' -> ' + res.w + 'x' + res.h : ''}  ${fmtKB(orig.length)} -> ${fmtKB(buf.length)}  (${pct >= 0 ? '-' + pct : '+' + Math.abs(pct)}%)  ${opt.dry ? '' : destRel}`);
  }
  console.log(`\n${files.length} image(s), ${written} written, ${skipped} kept/skipped, ${failed} failed: ${fmtKB(before)} -> ${fmtKB(after)}  (saved ${fmtKB(before - after)}, -${before ? Math.round((1 - after / before) * 100) : 0}%). Originals untouched.`);
  console.log('Next: point your <img> at the new file, set width/height to the new dimensions, and add loading="lazy" for anything below the fold.');
  if (failed) process.exitCode = 1;
} finally {
  try { ws && ws.close(); } catch {}
  proc.kill();
  await sleep(600);
  try { rmSync(prof, { recursive: true, force: true }); } catch {}
}
process.exit(process.exitCode || 0);

function usage() {
  console.log('Usage: node scripts/optimize-images.mjs <file|dir>... [--format webp|jpeg] [--quality 80] [--max-width 1600] [--out DIR] [--bg "#0a0a0b"] [--dry-run] [--overwrite] [--force]');
}
