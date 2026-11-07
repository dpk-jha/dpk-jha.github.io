#!/usr/bin/env node
// Regenerates DeepakJha.pdf from resume-print.html (the single source of truth for the resume).
// Zero npm dependencies: serves the repo on a throwaway local port and drives Chrome's headless printer.
//
//   node scripts/build-resume-pdf.mjs [--out path/to/file.pdf]
//
// Env: CHROME_PATH overrides Chrome/Chromium discovery.
// The output is only written if sanity checks pass (exactly 1 page, Inter font embedded).

import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, mkdirSync, rmSync, renameSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

let server, work;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outIdx = process.argv.indexOf('--out');
const out = resolve(outIdx > -1 ? process.argv[outIdx + 1] : join(root, 'DeepakJha.pdf'));

const candidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);
const chrome = candidates.find(existsSync);
if (!chrome) fail('Chrome/Chromium not found. Set CHROME_PATH.');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
server = http.createServer((req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const f = join(root, p);
  if (!f.startsWith(root) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' }).end(readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/resume-print.html`;

work = mkdtempSync(join(tmpdir(), 'resume-pdf-'));
const tmpPdf = join(work, 'resume.pdf');
const run = args => new Promise(res => {
  const chunks = [];
  const p = spawn(chrome, [
    '--headless=new', '--disable-gpu',
    `--user-data-dir=${join(work, 'profile')}`,   // isolated profile: works while your normal Chrome is open
    '--virtual-time-budget=20000',                 // lets the self-hosted font finish loading before printing
    ...args, url,
  ], { stdio: ['ignore', 'pipe', 'ignore'] });
  p.stdout.on('data', d => chunks.push(d));
  p.on('exit', code => res({ code, out: Buffer.concat(chunks).toString('utf8') }));
  p.on('error', () => res({ code: -1, out: '' }));
});
const { code } = await run(['--no-pdf-header-footer', `--print-to-pdf=${tmpPdf}`]);
// The printed body is clipped at 11in, so overflowing content would silently disappear and still be "1 page".
const dom = await run(['--dump-dom']);
server.close();
const contentH = Number((dom.out.match(/data-content-h="(\d+)"/) || [])[1]);
const boxH = Number((dom.out.match(/data-box-h="(\d+)"/) || [])[1]);

try {
  if (code !== 0 || !existsSync(tmpPdf)) fail(`Chrome exited with code ${code}; no PDF produced.`);
  if (!contentH || !boxH) fail('Could not measure the resume height (data-content-h / data-box-h missing from resume-print.html).');
  if (contentH > boxH + 1) fail(`Resume content is ${contentH}px tall but the page box is ${boxH}px: the bottom would be clipped. Shorten resume-print.html.`);
  const buf = readFileSync(tmpPdf);
  const text = buf.toString('latin1');
  const pages = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
  if (pages !== 1) fail(`Expected a 1-page resume, got ${pages} page(s). Check resume-print.html layout.`);
  if (!/\+Inter/.test(text)) fail('Inter font not embedded. Check that shared/fonts.css and shared/fonts/inter-var-latin.woff2 load (resume-print.html links them).');
  mkdirSync(dirname(out), { recursive: true });
  const staged = out + '.tmp';
  writeFileSync(staged, buf); renameSync(staged, out);
  console.log(`resume PDF written: ${out} (${pages} page, ${(buf.length / 1024).toFixed(0)} KB, Inter embedded, content ${contentH}/${boxH}px)`);
} finally {
  rmSync(work, { recursive: true, force: true });
}

function fail(msg) {
  console.error('build-resume-pdf: ' + msg);
  if (work) rmSync(work, { recursive: true, force: true });
  if (server) server.close();
  process.exit(1);
}
