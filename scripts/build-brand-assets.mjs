#!/usr/bin/env node
// Builds the site's social cards and favicon set from one definition each (zero dependencies).
//   node scripts/build-brand-assets.mjs            everything
//   node scripts/build-brand-assets.mjs og         only the social cards (shared/og/*.jpg)
//   node scripts/build-brand-assets.mjs favicon    only favicon.svg / favicon.ico / apple-touch-icon.png
// Needs Google Chrome (headless screenshots) and macOS `sips` (PNG -> JPEG). Self-hosted fonts come from shared/fonts.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const JPEG_QUALITY = '86';
const ICO_SIZE = 48; // Google wants favicons in multiples of 48px
const APPLE_TOUCH_SIZE = 180;

const COLORS = { bg: '#0a0a0b', fg: '#f4f4f5', muted: '#a1a1aa', accent: '#f2b35a', mark: '#1e293b' };
const fontUrl = name => pathToFileURL(join(root, 'shared/fonts', name)).href;

// ---- Social cards: one entry per page. `shot` is an optional screenshot shown on the right. ----
const CARDS = [
  { file: 'shared/og/home.jpg', kicker: 'Deepak Jha · dpkay.com', title: 'I build the systems that let coding agents <em>ship to production.</em>', sub: 'AI-native product engineer and architect, building end to end.' },
  { file: 'shared/og/projects.jpg', kicker: 'Work & projects', title: 'What I&rsquo;ve <em>built</em>', sub: 'AI agent tooling, systems architecture at scale, and apps used by thousands.' },
  { file: 'shared/og/ai-sdlc.jpg', kicker: 'Case study', title: 'Spec to deployment, <em>automated.</em>', sub: 'An agent-driven delivery pipeline: a spec goes in, and a tested, reviewed, deployed and reported change comes out.' },
  { file: 'claude-shift/images/og.jpg', kicker: 'Open source · CLI', title: 'claude-<em>shift</em>', sub: 'Align your Claude Max 5-hour usage windows with your schedule.', shot: 'claude-shift/images/cli.png' },
];

const cardHtml = ({ kicker, title, sub, shot }) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url('${fontUrl('inter-var-latin.woff2')}');font-weight:100 900}
@font-face{font-family:Playfair;src:url('${fontUrl('playfair-var-latin.woff2')}');font-weight:400 900}
@font-face{font-family:Mono;src:url('${fontUrl('jetbrains-mono-var-latin.woff2')}');font-weight:400 700}
*{box-sizing:border-box;margin:0}
body{width:${OG_WIDTH}px;height:${OG_HEIGHT}px;background:radial-gradient(900px 420px at 85% 0%,rgba(242,179,90,.13),transparent 70%),${COLORS.bg};color:${COLORS.fg};font-family:Inter,sans-serif;display:flex;align-items:center;padding:0 72px;overflow:hidden}
.text{flex:1;min-width:0}
.kicker{font:600 22px Mono,monospace;letter-spacing:.14em;text-transform:uppercase;color:${COLORS.accent};margin-bottom:28px}
h1{font:700 ${shot ? 84 : 92}px/1.06 Playfair,Georgia,serif;letter-spacing:-.01em}
h1 em{color:${COLORS.accent};font-style:italic}
p{font-size:30px;line-height:1.4;color:${COLORS.muted};margin-top:30px;max-width:${shot ? 480 : 900}px;text-wrap:balance}
img{width:540px;border-radius:14px;border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 80px rgba(0,0,0,.6);margin-left:40px}
</style><div class="text"><div class="kicker">${kicker}</div><h1>${title}</h1><p>${sub}</p></div>${shot ? `<img src="${pathToFileURL(join(root, shot)).href}" alt="">` : ''}`;

// ---- Favicon: one mark, three renderings. ----
const markSvg = ({ rounded }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32"${rounded ? ' rx="6"' : ''} fill="${COLORS.mark}"/><text x="16" y="23" font-family="Georgia,serif" font-size="22" font-weight="700" fill="${COLORS.accent}" text-anchor="middle">D</text></svg>`;

const dir = mkdtempSync(join(tmpdir(), 'brand-'));
const shoot = (html, size, out) => {
  const page = join(dir, 'page.html');
  writeFileSync(page, html);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--default-background-color=00000000', `--window-size=${size.w},${size.h}`, `--screenshot=${out}`, pathToFileURL(page).href], { stdio: 'ignore' });
};
const toJpeg = (png, out) => execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', JPEG_QUALITY, png, '--out', out], { stdio: 'ignore' });
// A one-image .ico: ICONDIR + one ICONDIRENTRY + the PNG bytes (valid since Windows Vista, every browser reads it).
const pngToIco = (png, size) => {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  header[6] = header[7] = size; header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
};
const imgPage = (svg, px) => `<!doctype html><style>*{margin:0}body{width:${px}px;height:${px}px;background:transparent}img{width:${px}px;height:${px}px;display:block}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`;

const what = process.argv[2] || 'all';
try {
  if (what === 'all' || what === 'og') {
    CARDS.forEach((card, i) => {
      const png = join(dir, `card-${i}.png`);
      shoot(cardHtml(card), { w: OG_WIDTH, h: OG_HEIGHT }, png);
      toJpeg(png, join(root, card.file));
      console.log('wrote', card.file);
    });
  }
  if (what === 'all' || what === 'favicon') {
    writeFileSync(join(root, 'favicon.svg'), markSvg({ rounded: true }) + '\n');
    const icoPng = join(dir, 'ico.png');
    shoot(imgPage(markSvg({ rounded: true }), ICO_SIZE), { w: ICO_SIZE, h: ICO_SIZE }, icoPng);
    writeFileSync(join(root, 'favicon.ico'), pngToIco(readFileSync(icoPng), ICO_SIZE));
    const applePng = join(dir, 'apple.png');
    shoot(imgPage(markSvg({ rounded: false }), APPLE_TOUCH_SIZE), { w: APPLE_TOUCH_SIZE, h: APPLE_TOUCH_SIZE }, applePng);
    writeFileSync(join(root, 'apple-touch-icon.png'), readFileSync(applePng));
    console.log('wrote favicon.svg favicon.ico apple-touch-icon.png');
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
