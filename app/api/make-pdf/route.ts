import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getPrintCSS(zoom?: number, orientation: "portrait" | "landscape" = "portrait", pageMarginCSS = "10mm") {
  const zoomRule = typeof zoom === "number" && zoom > 0 && zoom !== 1 ? `html { zoom: ${zoom}; }` : ""
  const pageSize = orientation === "landscape" ? "@page { size: A4 landscape; }" : "@page { size: A4; }"
  return `
  <style>
    @media print {
      ${zoomRule}
      ${pageSize}
      /* Página e corpo */
      @page { margin: ${pageMarginCSS}; }
      html, body { margin: 0; padding: 0; font: 400 11px/1.3 Inter, Arial, sans-serif; color: #222; }

      /* Cabeçalhos super compactos */
      h2, h3 { margin: 4px 0 6px; font-weight: 700; }
      h2 { font-size: 13px; }
      h3 { font-size: 12px; }

      /* Grid 2 colunas para “Identificação + Totais” */
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: start; }
      .card { padding: 8px; border: 1px solid #eee; border-radius: 6px; }

      /* Espaçamento vertical enxuto */
      section { margin-bottom: 8px; }
      /* Tabelas compactas */
      table {
        border-collapse: collapse;
        width: 100%;
        font-size: 10px;
      }
      th, td { padding: 3px 6px; border-bottom: 1px solid #eee; }
      th { text-align: left; }
      td.num, th.num { text-align: right; white-space: nowrap; }

      /* Gráficos menores */
      .chart-wrap { height: 150px; width: 100%; }
      .legend-small { font-size: 9px; }

      /* Listas/insights */
      ul { margin: 6px 0; padding-left: 14px; }
      li { margin: 2px 0; }
      html, body, *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body { margin: 0; }
      * { animation: none !important; transition: none !important; }
      [role="tooltip"], .recharts-tooltip-wrapper { display: none !important; }
      .shadow, .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }
    }
  </style>
`
}

type MakePdfBody = {
  url?: string
  html?: string
  base?: string
  format?: "A4" | "Letter" | "Legal"
  deviceScaleFactor?: number
  margin?: { top?: string; right?: string; bottom?: string; left?: string }
  fileName?: string
  zoom?: number
  orientation?: "portrait" | "landscape"
}

async function generatePdf(params: {
  url?: string
  html?: string
  baseURL: string
  format: "A4" | "Letter" | "Legal"
  deviceScaleFactor: number
  margin: { top: string; right: string; bottom: string; left: string }
  zoom?: number
  orientation?: "portrait" | "landscape"
}) {
  const { url, html, baseURL, format, deviceScaleFactor, margin, zoom, orientation = "portrait" } = params

  const usePuppeteer = !!process.env.VERCEL

  if (usePuppeteer) {
    const puppeteerModule = await import("puppeteer-core")
    const chromiumModule = await import("@sparticuz/chromium")
    const puppeteer = puppeteerModule.default
    const chromium = chromiumModule.default

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
    const page = await browser.newPage()

    if (url) {
      const absoluteUrl = url.startsWith("http") ? url : new URL(url, baseURL).toString()
      await page.goto(absoluteUrl, { waitUntil: "networkidle0" })
      const pageMarginCSS = `${margin.top} ${margin.right} ${margin.bottom} ${margin.left}`
      await page.addStyleTag({ content: getPrintCSS(zoom, orientation, pageMarginCSS) })
    } else if (html) {
      const pageMarginCSS = `${margin.top} ${margin.right} ${margin.bottom} ${margin.left}`
      const preparedHtml = /<\/head>/i.test(html)
        ? html.replace(/<\/head>/i, `${getPrintCSS(zoom, orientation, pageMarginCSS)}\n</head>`)
        : `${getPrintCSS(zoom, orientation, pageMarginCSS)}${html}`
      await page.setContent(preparedHtml, { waitUntil: "networkidle0" })
    }

    await page.emulateMediaType("print")

    const pdfBuffer = await page.pdf({
      format,
      printBackground: true,
      margin,
      preferCSSPageSize: true,
      landscape: orientation === "landscape",
    })

    await browser.close()
    return pdfBuffer
  } else {
    const { chromium } = await import("playwright")
    const browser = await chromium.launch()
    const context = await browser.newContext({ deviceScaleFactor, baseURL })
    const page = await context.newPage()

    if (url) {
      const absoluteUrl = url.startsWith("http") ? url : new URL(url, baseURL).toString()
      await page.goto(absoluteUrl, { waitUntil: "networkidle" })
      const pageMarginCSS = `${margin.top} ${margin.right} ${margin.bottom} ${margin.left}`
      await page.addStyleTag({ content: getPrintCSS(zoom, orientation, pageMarginCSS) })
    } else if (html) {
      const pageMarginCSS = `${margin.top} ${margin.right} ${margin.bottom} ${margin.left}`
      const preparedHtml = /<\/head>/i.test(html)
        ? html.replace(/<\/head>/i, `${getPrintCSS(zoom, orientation, pageMarginCSS)}\n</head>`)
        : `${getPrintCSS(zoom, orientation, pageMarginCSS)}${html}`
      await page.setContent(preparedHtml, { waitUntil: "networkidle" })
    }

    await page.emulateMedia({ media: "print" })

    const pdfBuffer = await page.pdf({
      format,
      printBackground: true,
      margin,
      preferCSSPageSize: true,
      landscape: orientation === "landscape",
    })

    await browser.close()
    return pdfBuffer
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MakePdfBody
    const { url, html } = body

    if (!url && !html) {
      return new Response(JSON.stringify({ error: 'Informe "url" ou "html" no corpo da requisição.' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const baseURL = body.base ?? req.nextUrl.origin
    const format = body.format ?? "A4"
    const deviceScaleFactor = body.deviceScaleFactor ?? 3
    const margin = {
      top: body.margin?.top ?? "10mm",
      right: body.margin?.right ?? "10mm",
      bottom: body.margin?.bottom ?? "10mm",
      left: body.margin?.left ?? "10mm",
    }
    const orientation = body.orientation ?? "landscape"

    const pdfBuffer = await generatePdf({
      url,
      html,
      baseURL,
      format,
      deviceScaleFactor,
      margin,
      zoom: body.zoom,
      orientation,
    })

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${body.fileName || "relatorio.pdf"}"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error: any) {
    console.error("Erro em /api/make-pdf:", error)
    return new Response(JSON.stringify({ error: "Falha ao gerar PDF", details: String(error?.message || error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

export async function GET(req: NextRequest) {
  try {
    const urlParam = req.nextUrl.searchParams.get("url") || undefined
    const htmlParam = req.nextUrl.searchParams.get("html") || undefined
    if (!urlParam && !htmlParam) {
      return new Response(JSON.stringify({ error: 'Informe "url" ou "html" via query string.' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const baseURL = req.nextUrl.searchParams.get("base") || req.nextUrl.origin
    const format = (req.nextUrl.searchParams.get("format") as "A4" | "Letter" | "Legal") || "A4"
    const deviceScaleFactor = Number(req.nextUrl.searchParams.get("deviceScaleFactor") || 3)
    const margin = {
      top: req.nextUrl.searchParams.get("top") || "10mm",
      right: req.nextUrl.searchParams.get("right") || "10mm",
      bottom: req.nextUrl.searchParams.get("bottom") || "12mm",
      left: req.nextUrl.searchParams.get("left") || "10mm",
    }
    const fileName = req.nextUrl.searchParams.get("fileName") || "relatorio.pdf"
    const zoom = req.nextUrl.searchParams.get("zoom")
    const orientationParam = req.nextUrl.searchParams.get("orientation") as "portrait" | "landscape" | null
    const orientation = orientationParam ?? "landscape"
    const inline = req.nextUrl.searchParams.get("inline") === "true"

    const pdfBuffer = await generatePdf({
      url: urlParam,
      html: htmlParam,
      baseURL,
      format,
      deviceScaleFactor,
      margin,
      zoom: zoom ? Number(zoom) : undefined,
      orientation,
    })

    const disposition = inline ? "inline" : "attachment"

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${fileName}"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error: any) {
    console.error("Erro em GET /api/make-pdf:", error)
    return new Response(JSON.stringify({ error: "Falha ao gerar PDF", details: String(error?.message || error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
