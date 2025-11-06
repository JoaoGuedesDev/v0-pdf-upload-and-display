// CommonJS script to generate a PDF using Playwright Chromium
// Usage examples:
//   node scripts/make-pdf.js --url=http://localhost:3013/demo-pdf --out=relatorio.pdf
//   node scripts/make-pdf.js --html=pagina.html --out=relatorio.pdf --base=http://localhost:3013

const fs = require('fs/promises');
const path = require('path');
const { chromium } = require('playwright');

function getArg(name, defaultValue) {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`));
  if (!arg) return defaultValue;
  return arg.split('=')[1];
}

(async () => {
  const url = getArg('url');
  const htmlFile = getArg('html');
  const outPath = getArg('out', 'relatorio.pdf');
  const baseURL = getArg('base', 'http://localhost:3013');

  if (!url && !htmlFile) {
    console.error('Erro: informe --url=<http://...> ou --html=<arquivo.html>');
    process.exit(1);
  }

  const printCSS = `
    <style>
      @media print {
        html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { margin: 0; }
        * { animation: none !important; transition: none !important; }
        [role="tooltip"], .recharts-tooltip-wrapper { display: none !important; }
        .shadow, .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }
      }
    </style>
  `;

  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();

  if (url) {
    await page.goto(url, { waitUntil: 'networkidle' });
    // Inject print CSS into the page for consistent rendering
    await page.addStyleTag({ content: printCSS });
  } else {
    const htmlPath = path.resolve(htmlFile);
    const raw = await fs.readFile(htmlPath, 'utf8');
    const html = raw.replace(/<\/head>/i, `${printCSS}\n</head>`);
    await page.setContent(html, { waitUntil: 'networkidle', baseURL });
  }

  await page.emulateMedia({ media: 'screen' });

  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '12mm', left: '10mm' },
  });

  await browser.close();
  console.log(`✅ PDF gerado: ${outPath}`);
})().catch(async (err) => {
  console.error('Falha ao gerar PDF:', err);
  process.exit(1);
});
