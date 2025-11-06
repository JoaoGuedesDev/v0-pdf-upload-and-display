import { NextRequest } from 'next/server'
import { chromium } from 'playwright'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getPrintCSS(zoom?: number, orientation: 'portrait' | 'landscape' = 'portrait') {
  const zoomRule = typeof zoom === 'number' && zoom > 0 && zoom !== 1
    ? `html { zoom: ${zoom}; }`
    : ''
  const pageSize = orientation === 'landscape' ? '@page { size: A4 landscape; }' : '@page { size: A4; }'
  return `
  <style>
    @media print {
      ${zoomRule}
      ${pageSize}
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
  format?: 'A4' | 'Letter' | 'Legal'
  deviceScaleFactor?: number
  margin?: { top?: string; right?: string; bottom?: string; left?: string }
  fileName?: string
  zoom?: number
  orientation?: 'portrait' | 'landscape'
}

async function generatePdf(params: {
  url?: string
  html?: string
  baseURL: string
  format: 'A4' | 'Letter' | 'Legal'
  deviceScaleFactor: number
  margin: { top: string; right: string; bottom: string; left: string }
  zoom?: number
  orientation?: 'portrait' | 'landscape'
}) {
  const { url, html, baseURL, format, deviceScaleFactor, margin, zoom, orientation = 'portrait' } = params

  const browser = await chromium.launch()
  const context = await browser.newContext({ deviceScaleFactor })
  const page = await context.newPage()

  if (url) {
    const absoluteUrl = url.startsWith('http') ? url : new URL(url, baseURL).toString()
    await page.goto(absoluteUrl, { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: getPrintCSS(zoom, orientation) })
  } else if (html) {
    const preparedHtml = /<\/head>/i.test(html)
      ? html.replace(/<\/head>/i, `${getPrintCSS(zoom, orientation)}\n</head>`)
      : `${getPrintCSS(zoom, orientation)}${html}`
    await page.setContent(preparedHtml, { waitUntil: 'networkidle', baseURL })
  }

  await page.emulateMedia({ media: 'print' })

  const pdfBuffer = await page.pdf({
    format,
    printBackground: true,
    margin,
    preferCSSPageSize: true,
    landscape: orientation === 'landscape',
  })

  await browser.close()
  return pdfBuffer
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MakePdfBody
    const { url, html } = body

    if (!url && !html) {
      return new Response(JSON.stringify({ error: 'Informe "url" ou "html" no corpo da requisição.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const baseURL = body.base ?? req.nextUrl.origin
    const format = body.format ?? 'A4'
    const deviceScaleFactor = body.deviceScaleFactor ?? 3
    const margin = {
      top: body.margin?.top ?? '10mm',
      right: body.margin?.right ?? '10mm',
      bottom: body.margin?.bottom ?? '12mm',
      left: body.margin?.left ?? '10mm',
    }
    const orientation = body.orientation ?? 'landscape'

    const pdfBuffer = await generatePdf({ url, html, baseURL, format, deviceScaleFactor, margin, zoom: body.zoom, orientation })

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${body.fileName || 'relatorio.pdf'}"`,
      },
    })
  } catch (error: any) {
    console.error('Erro em /api/make-pdf:', error)
    return new Response(JSON.stringify({ error: 'Falha ao gerar PDF', details: String(error?.message || error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function GET(req: NextRequest) {
  try {
    const urlParam = req.nextUrl.searchParams.get('url') || undefined
    const htmlParam = req.nextUrl.searchParams.get('html') || undefined
    if (!urlParam && !htmlParam) {
      return new Response(JSON.stringify({ error: 'Informe "url" ou "html" via query string.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const baseURL = req.nextUrl.searchParams.get('base') || req.nextUrl.origin
    const format = (req.nextUrl.searchParams.get('format') as 'A4' | 'Letter' | 'Legal') || 'A4'
    const deviceScaleFactor = Number(req.nextUrl.searchParams.get('deviceScaleFactor') || 3)
    const margin = {
      top: req.nextUrl.searchParams.get('top') || '10mm',
      right: req.nextUrl.searchParams.get('right') || '10mm',
      bottom: req.nextUrl.searchParams.get('bottom') || '12mm',
      left: req.nextUrl.searchParams.get('left') || '10mm',
    }
    const fileName = req.nextUrl.searchParams.get('fileName') || 'relatorio.pdf'
    const zoom = req.nextUrl.searchParams.get('zoom')
    const orientationParam = req.nextUrl.searchParams.get('orientation') as 'portrait' | 'landscape' | null
    const orientation = orientationParam ?? 'landscape'

    const pdfBuffer = await generatePdf({ url: urlParam, html: htmlParam, baseURL, format, deviceScaleFactor, margin, zoom: zoom ? Number(zoom) : undefined, orientation })

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    console.error('Erro em GET /api/make-pdf:', error)
    return new Response(JSON.stringify({ error: 'Falha ao gerar PDF', details: String(error?.message || error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}