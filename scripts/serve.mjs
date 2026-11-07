#!/usr/bin/env node
// Local preview server that behaves like GitHub Pages (zero dependencies).
//   node scripts/serve.mjs [port]      default port 8140
//   HOST=0.0.0.0 node scripts/serve.mjs   also reachable from other devices on your network (phone, other PC)
// /projects -> projects.html, /dir -> /dir/ -> dir/index.html, unknown paths -> 404.html with status 404.
// Listens on localhost only unless HOST is set, hides dotfiles (.git, .claude ...), and matches file-name case exactly like
// GitHub Pages does (macOS is case-insensitive, so /Projects would otherwise work here and 404 live).
import { createServer } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { join, extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.argv[2]) || 8140;
const host = process.env.HOST || '127.0.0.1';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };
const isFile = async p => { try { return (await stat(p)).isFile(); } catch { return false; } };
const isDir = async p => { try { return (await stat(p)).isDirectory(); } catch { return false; } };
// True only if every path segment exists with exactly this capitalization.
const exactCase = async p => {
  let cur = root;
  for (const seg of p.slice(root.length).split(/[\\/]/).filter(Boolean)) {
    let names; try { names = await readdir(cur); } catch { return false; }
    if (!names.includes(seg)) return false;
    cur = join(cur, seg);
  }
  return true;
};

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let decoded;
  try { decoded = decodeURIComponent(url.pathname); } catch { res.writeHead(400).end('Bad request'); return; }
  let rel = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, rel), status = 200;
  if (!(file === root || file.startsWith(root + '/'))) { res.writeHead(403).end('Forbidden'); return; }
  const hidden = rel.split(/[\\/]/).some(seg => seg.startsWith('.'));
  if (await isDir(file)) {
    if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: url.pathname + '/' + url.search }).end(); return; }
    file = join(file, 'index.html');
  } else if (!(await isFile(file)) && !extname(file) && (await isFile(file + '.html'))) file += '.html';
  if (hidden || !(await isFile(file)) || !(await exactCase(file))) { file = join(root, '404.html'); status = 404; }
  try {
    const body = await readFile(file);
    res.writeHead(status, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch { res.writeHead(404).end('Not found'); }
  console.log(status, req.method, url.pathname);
}).listen(port, host, () => console.log(`Serving ${root}\nhttp://localhost:${port}/` + (host === '127.0.0.1' ? '' : `  (listening on ${host}: reachable from your network)`)));
