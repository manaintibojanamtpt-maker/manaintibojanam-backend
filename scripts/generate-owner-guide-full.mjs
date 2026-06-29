/**
 * BhojanOS Owner Guide — Trilingual PDF with logo & screenshots
 * Run: npm run docs:owner-guide-full
 */
import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import {
  meta,
  cover,
  screenshots,
  sections,
  langs,
} from './owner-guide-i18n.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DOCS = join(ROOT, 'docs');
const SHOTS = join(DOCS, 'guide-screenshots');
const LOGO = join(ROOT, 'src', 'assets', 'bhojan-os-logo.png');
const HTML_OUT = join(DOCS, 'BhojanOS-Owner-Guide-Preview.html');
const PDF_OUT = join(DOCS, 'BhojanOS-Owner-Complete-Guide-Trilingual.pdf');

const args = process.argv.slice(2);
const shouldCapture = args.includes('--capture') || args.includes('-c');

function toDataUri(filePath) {
  if (!existsSync(filePath)) return null;
  const buf = readFileSync(filePath);
  const ext = filePath.endsWith('.png') ? 'png' : 'jpeg';
  return `data:image/${ext};base64,${buf.toString('base64')}`;
}

async function runCapture() {
  const missing = screenshots.some((s) => !existsSync(join(SHOTS, s.file)));
  if (!shouldCapture && !missing) return;
  console.log('Capturing screenshots from bhojanos.com…');
  await new Promise((resolve, reject) => {
    const child = spawn('node', ['scripts/capture-guide-screenshots.mjs'], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`capture exit ${code}`))));
  });
}

function langBlock(label, text, fontClass) {
  if (!text) return '';
  return `
    <div class="lang-block ${fontClass}">
      <div class="lang-label">${label}</div>
      <div class="lang-text">${text}</div>
    </div>`;
}

function triField(obj) {
  return [
    langBlock('English', obj.en, 'lang-en'),
    langBlock('हिन्दी', obj.hi, 'lang-hi'),
    langBlock('తెలుగు', obj.te, 'lang-te'),
  ].join('');
}

function triBullets(obj) {
  return langs
    .map((l) => {
      const items = obj[l.code];
      if (!items?.length) return '';
      return `
        <div class="lang-block ${l.fontClass}">
          <div class="lang-label">${l.label}</div>
          <ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>
        </div>`;
    })
    .join('');
}

function screenshotFigure(shotKey) {
  const shot = screenshots.find((s) => s.file === shotKey || s.file.startsWith(shotKey));
  if (!shot) return '';
  const uri = toDataUri(join(SHOTS, shot.file));
  if (!uri) {
    return `<div class="shot-missing">Screenshot: ${shot.file} (run with --capture)</div>`;
  }
  return `
    <figure class="screenshot">
      <img src="${uri}" alt="${shot.caption.en}" />
      <figcaption>
        <span class="cap-en">${shot.caption.en}</span>
        <span class="cap-hi">${shot.caption.hi}</span>
        <span class="cap-te">${shot.caption.te}</span>
      </figcaption>
    </figure>`;
}

function renderSection(sec) {
  let html = `<section class="chapter" id="${sec.id}">`;
  html += `<h2>${triField(sec.title)}</h2>`;
  if (sec.body) html += triField(sec.body);
  if (sec.bullets) html += `<div class="bullets-wrap">${triBullets(sec.bullets)}</div>`;
  if (sec.setupSteps) {
    html += `<table class="setup-table"><thead><tr><th>#</th><th>English</th><th>हिन्दी</th><th>తెలుగు</th></tr></thead><tbody>`;
    sec.setupSteps.forEach((step, i) => {
      html += `<tr><td>${i + 1}</td><td>${step.en}</td><td class="lang-hi">${step.hi}</td><td class="lang-te">${step.te}</td></tr>`;
    });
    html += '</tbody></table>';
  }
  if (sec.features) {
    html += `<table class="feat-table"><thead><tr><th>Path</th><th>English</th><th>हिन्दी</th><th>తెలుగు</th></tr></thead><tbody>`;
    sec.features.forEach((f) => {
      html += `<tr><td><code>${f.path}</code></td><td>${f.en}</td><td class="lang-hi">${f.hi}</td><td class="lang-te">${f.te}</td></tr>`;
    });
    html += '</tbody></table>';
  }
  if (sec.flow) {
    html += `<div class="flow-grid">${langs
      .map(
        (l) => `
      <div class="flow-col ${l.fontClass}">
        <div class="lang-label">${l.label}</div>
        <ol>${sec.flow[l.code].map((s) => `<li>${s}</li>`).join('')}</ol>
      </div>`,
      )
      .join('')}</div>`;
  }
  if (sec.checklist) {
    html += `<div class="checklist">${triBullets(sec.checklist)}</div>`;
  }
  if (sec.screenshot) html += screenshotFigure(sec.screenshot);
  html += '</section>';
  return html;
}

function buildHtml() {
  const logoUri = toDataUri(LOGO);
  const shotGallery = screenshots.map((s) => screenshotFigure(s.file)).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>BhojanOS Owner Guide — Trilingual</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Telugu:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4; margin: 14mm 16mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Inter, system-ui, sans-serif;
      font-size: 10pt;
      line-height: 1.45;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
    }
    .lang-hi { font-family: 'Noto Sans Devanagari', sans-serif; }
    .lang-te { font-family: 'Noto Sans Telugu', sans-serif; }

    .cover {
      page-break-after: always;
      min-height: 260mm;
      background: linear-gradient(160deg, #1a0505 0%, #2d0f0f 40%, #1a0505 100%);
      color: #fff;
      padding: 28mm 20mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
    }
    .cover-logo {
      width: 72mm;
      max-height: 32mm;
      object-fit: contain;
      margin-bottom: 10mm;
      filter: drop-shadow(0 4px 12px rgba(255,122,0,0.35));
    }
    .cover h1 {
      font-size: 32pt;
      margin: 0 0 4mm;
      color: #ff7a00;
      letter-spacing: -0.02em;
    }
    .cover .sub {
      font-size: 14pt;
      margin-bottom: 8mm;
      color: #f0f0f0;
    }
    .cover .tri-sub { margin: 3mm 0; opacity: 0.92; font-size: 11pt; }
    .cover .tag { font-size: 10pt; color: #bbb; margin-top: 6mm; max-width: 140mm; }
    .cover .meta {
      position: absolute;
      bottom: 18mm;
      left: 20mm;
      font-size: 9pt;
      color: #888;
    }
    .cover .langs-badge {
      display: inline-block;
      background: rgba(255,122,0,0.2);
      border: 1px solid #ff7a00;
      color: #ff7a00;
      padding: 2mm 5mm;
      border-radius: 4mm;
      font-size: 9pt;
      margin-top: 8mm;
    }

    h2 { page-break-before: always; margin-top: 0; }
    h2 .lang-block { margin-bottom: 4mm; }
    h2 .lang-text { font-size: 13pt; font-weight: 700; color: #ff7a00; }

    .lang-block { margin-bottom: 4mm; padding: 3mm 4mm; border-left: 3px solid #eee; }
    .lang-block.lang-en { border-left-color: #ff7a00; background: #fff8f3; }
    .lang-block.lang-hi { border-left-color: #e65100; background: #fffaf5; }
    .lang-block.lang-te { border-left-color: #bf360c; background: #fffbf7; }
    .lang-label { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #888; margin-bottom: 1mm; }
    .lang-text { font-size: 10pt; }
    ul { margin: 2mm 0; padding-left: 5mm; }
    li { margin-bottom: 1.5mm; }

    .gallery { page-break-before: always; }
    .gallery h2 { page-break-before: avoid; }
    .screenshot {
      margin: 5mm 0 8mm;
      page-break-inside: avoid;
      text-align: center;
    }
    .screenshot img {
      max-width: 52mm;
      border-radius: 4mm;
      border: 1px solid #ddd;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }
    .screenshot figcaption { font-size: 8pt; color: #555; margin-top: 2mm; }
    .screenshot figcaption span { display: block; }
    .cap-hi, .cap-te { font-size: 7.5pt; color: #777; }

    .shot-missing {
      background: #f5f5f5;
      border: 1px dashed #ccc;
      padding: 4mm;
      font-size: 8pt;
      color: #666;
      margin: 4mm 0;
    }

    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 4mm 0 6mm; page-break-inside: avoid; }
    th { background: #ff7a00; color: #fff; padding: 2mm 3mm; text-align: left; }
    td { border: 1px solid #e0e0e0; padding: 2mm 3mm; vertical-align: top; }
    tr:nth-child(even) td { background: #fafafa; }
    code { font-size: 7.5pt; background: #f0f0f0; padding: 0.5mm 1.5mm; border-radius: 1mm; }

    .flow-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 3mm;
      margin: 4mm 0;
    }
    .flow-col { background: #fafafa; padding: 3mm; border-radius: 2mm; font-size: 8.5pt; }
    .flow-col ol { padding-left: 4mm; margin: 0; }

    .footer-note {
      margin-top: 10mm;
      padding-top: 4mm;
      border-top: 1px solid #ddd;
      font-size: 8pt;
      color: #888;
      text-align: center;
    }
  </style>
</head>
<body>

  <div class="cover">
    ${logoUri ? `<img class="cover-logo" src="${logoUri}" alt="BhojanOS Logo" />` : '<h1 style="color:#ff7a00">BhojanOS</h1>'}
    <div class="sub">${cover.subtitle.en}</div>
    <div class="tri-sub lang-hi">${cover.subtitle.hi}</div>
    <div class="tri-sub lang-te">${cover.subtitle.te}</div>
    <div class="tag">${cover.tagline.en}</div>
    <div class="tag lang-hi">${cover.tagline.hi}</div>
    <div class="tag lang-te">${cover.tagline.te}</div>
    <div class="langs-badge">English · हिन्दी · తెలుగు</div>
    <div class="meta">
      v${meta.version} · ${meta.date}<br/>
      ${meta.website} · ${meta.support}<br/>
      <span class="lang-hi">${cover.audience.hi}</span><br/>
      <span class="lang-te">${cover.audience.te}</span>
    </div>
  </div>

  <section class="gallery">
    <h2>
      ${langBlock('English', 'Product Screenshots', 'lang-en')}
      ${langBlock('हिन्दी', 'उत्पाद स्क्रीनशॉट', 'lang-hi')}
      ${langBlock('తెలుగు', 'ఉత్పత్తి స్క్రీన్‌షాట్లు', 'lang-te')}
    </h2>
    ${shotGallery}
  </section>

  ${sections.map(renderSection).join('\n')}

  <div class="footer-note">
    BhojanOS Owner Guide · Confidential · ${meta.website} · Zero commission on every order
  </div>
</body>
</html>`;
}

async function htmlToPdf(htmlPath, pdfPath) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const html = readFileSync(htmlPath, 'utf8');
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '12mm', right: '14mm', bottom: '14mm', left: '14mm' },
  });
  await browser.close();
}

mkdirSync(DOCS, { recursive: true });
mkdirSync(SHOTS, { recursive: true });

try {
  await runCapture();
} catch (e) {
  console.warn('Screenshot capture skipped or partial:', e.message);
}

const html = buildHtml();
writeFileSync(HTML_OUT, html, 'utf8');
console.log(`HTML preview: ${HTML_OUT}`);

console.log('Generating PDF…');
await htmlToPdf(HTML_OUT, PDF_OUT);

const size = readFileSync(PDF_OUT).length;
console.log(`\n✓ PDF: ${PDF_OUT}`);
console.log(`  Size: ${(size / 1024).toFixed(1)} KB`);
