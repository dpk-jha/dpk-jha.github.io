---
name: resume-pdf
description: "Keep the resume and its downloadable PDF in sync for dpkay.com. Use whenever resume-print.html is edited (summary, years of experience, projects, stats, skills), when the user asks to update, regenerate, or check DeepakJha.pdf, or when numbers shown on the resume (users, downloads, ratings, npm count) change elsewhere on the site."
---

# resume-pdf: regenerate DeepakJha.pdf from resume-print.html

## Source of truth
- `resume-print.html` is the only place resume content is edited. The site's resume modal (Resume link, Print button) renders it in an iframe, and `DeepakJha.pdf` is generated from it.
- `DeepakJha.pdf` is the public "Download PDF" target (`/DeepakJha.pdf`, linked from the resume modal on `/`, `/projects` and `/resume`). Never edit the PDF by hand.

## The rule
After ANY edit to `resume-print.html`, regenerate the PDF in the same change, then verify it. A resume edit without a regenerated PDF leaves the public download stale.

## Regenerate
```
node scripts/build-resume-pdf.mjs                          # writes DeepakJha.pdf
node scripts/build-resume-pdf.mjs --out /some/path.pdf     # write elsewhere, e.g. to preview first
```
- No npm install needed. It serves the repo on a random local port and uses Chrome's headless printer (`CHROME_PATH` overrides Chrome discovery). Works offline: Inter is self-hosted (`shared/fonts.css`, linked by `resume-print.html`).
- It refuses to write unless the result is exactly **1 page** with **Inter embedded**, and exits 1 otherwise, leaving the existing PDF untouched. Page size comes from `@page { size: letter }` in `resume-print.html`.

## Verify (do not assume)
1. The script prints `1 page ... Inter embedded`.
2. Look at the result: `qlmanage -t -s 2000 -o <scratch dir> DeepakJha.pdf` renders a PNG you can read. Check nothing overflowed or got clipped.
3. To check text, extract it with `pypdf` (Chrome PDFs have a real text layer, so the changed numbers can be grepped).

## Numbers that must agree across the site
When a shared stat changes, update all of these in the same change, then regenerate the PDF:
- Years of experience: `index.html` (proof strip, meta description), `llms.txt`, `resume-print.html` (subtitle).
- Open-source and npm tool counts: `index.html` (proof strip, meta/OG/twitter descriptions, journey, tools section), `projects.html`, `llms.txt`, `resume-print.html` (summary, AI-native block, Shipped Products). Keep one framing: 11 published npm tools, 10 open source (MIT); toggldev-remote is proprietary.
- TogglDev rating and downloads: `index.html`, `projects.html`, `toggldev/index.html`, `llms.txt`, `resume-print.html`.

## Pre-commit hook
`.githooks/pre-commit` regenerates and stages `DeepakJha.pdf` whenever `resume-print.html` is staged. It is active once per clone with `git config core.hooksPath .githooks` (bypass one commit with `--no-verify`).
