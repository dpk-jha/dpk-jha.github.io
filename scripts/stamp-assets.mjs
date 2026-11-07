#!/usr/bin/env node
// Cache-busting for the shared CSS/JS (zero dependencies).
// GitHub Pages serves static assets with a 4 hour cache and HTML with 10 minutes, so after a deploy a returning
// visitor could pair the new HTML with an old cached stylesheet or script. This appends ?v=<content hash> to every
// /shared/*.css and /shared/*.js reference in the pages; the hash changes only when that file's bytes change.
//
//   node scripts/stamp-assets.mjs           rewrite the pages in place (idempotent)
//   node scripts/stamp-assets.mjs --check   change nothing; exit 1 if any reference is missing or has a stale stamp
//
// The pre-commit hook runs --check, so a stale stamp cannot be committed. Fonts and images are not stamped:
// they are never edited in place (a new file gets a new name).
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const ASSET_DIR = '/shared/';
const ASSET_EXT = /\.(?:css|js)$/;
const HASH_LENGTH = 10;
const SKIP_DIRS = new Set(['node_modules']);
// href="/shared/x.css" or src="/shared/x.js", optionally already stamped with ?v=...
const REF = /\b(href|src)="(\/shared\/[^"?#]+)(?:\?v=[^"#]*)?"/g;
// Any reference to shared/ that is NOT absolute would escape stamping, so it is reported.
const RELATIVE_REF = /\b(?:href|src)="(?!\/|https?:)(?:\.\.\/)*shared\/[^"]+"/g;

const check = process.argv.includes('--check');
const hashCache = new Map();
const hashOf = path => {
  if (!hashCache.has(path)) hashCache.set(path, createHash('sha256').update(readFileSync(join(ROOT, path))).digest('hex').slice(0, HASH_LENGTH));
  return hashCache.get(path);
};
const pagesIn = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.name.startsWith('.') || SKIP_DIRS.has(e.name) ? [] :
  e.isDirectory() ? pagesIn(join(dir, e.name)) : e.name.endsWith('.html') ? [join(dir, e.name)] : []);

let problems = 0, rewritten = 0;
for (const file of pagesIn(ROOT)) {
  const name = file.slice(ROOT.length + 1);
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(RELATIVE_REF)) { problems++; console.error(`${name}: relative shared/ reference cannot be stamped: ${m[0]}`); }
  const next = html.replace(REF, (whole, attr, path) => {
    if (!ASSET_EXT.test(path)) return whole;
    if (!existsSync(join(ROOT, path))) { problems++; console.error(`${name}: ${path} does not exist`); return whole; }
    return `${attr}="${path}?v=${hashOf(path)}"`;
  });
  if (next === html) continue;
  if (check) { problems++; console.error(`${name}: asset stamps are stale or missing`); }
  else { writeFileSync(file, next); rewritten++; console.log(`stamped ${name}`); }
}
if (check && problems) { console.error('\nRun: node scripts/stamp-assets.mjs'); process.exit(1); }
if (problems) process.exit(1);
console.log(check ? 'asset stamps are up to date' : `done (${rewritten} page(s) updated)`);
