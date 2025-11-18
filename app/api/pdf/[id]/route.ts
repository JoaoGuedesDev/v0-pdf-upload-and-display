export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import type { NextRequest } from 'next/server'
import playwright from 'playwright-core'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

function extractTokenFromWs(ws?: string): string | null {
  if (!ws) return null
  try {
    const replaced = ws.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:')
    const url = new URL(replaced)
    return url.searchParams.get('token')
  } catch {
    return null
  }
}

// 🧩 Extrai ID da rota ou query
function extractId(_req: NextRequest, params?: { id?: string }) {
  if (params?.id) return params.id
  try {
    const u = new URL(_req.url)
    const q = u.searchParams.get('id')
    if (q) return q
    const parts = u.pathname.split('/').filter(Boolean)
    const idx = parts.lastIndexOf('pdf')
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
    return parts.at(-1) || ''
  } catch {
    return ''
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = extractId(_req, params)
  if (!id)
    return new Response(JSON.stringify({ error: 'Missing id' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })

  const envBase = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  const origin = (() => {
    try {
      return new URL(_req.url).origin
    } catch {
      return ''
    }
  })()
  const baseRaw = envBase || origin || 'http://localhost:3000'
  let base = baseRaw
  try {
    new URL(base)
  } catch {
    base = origin || 'http://localhost:3000'
  }

  const targetUrl = `${base}/d/${id}`
  const ws = process.env.BROWSERLESS_URL

  if (!ws)
    return new Response(
      JSON.stringify({
        error: 'BROWSERLESS_URL não definido. Configure com seu token do Browserless.io',
      }),
      { status: 500 }
    )

  console.log(`[api/pdf/${id}] Conectando ao Browserless remoto...`)

  let browser
  try {
    browser = await playwright.chromium.connectOverCDP(ws)
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
    const page = await context.newPage()

    // Logs úteis
    page.on('console', msg => console.log('🧭', msg.text()))
    page.on('pageerror', err => console.error('❌ PAGE ERROR:', err))
    page.on('crash', () => console.error('💥 PAGE CRASHED!'))

    // Acessa dashboard
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.evaluate(() => { (window as any).__pdfMode = true })
    await page.waitForTimeout(1000)  // Reduzido para otimizar tempo

    // Remove animações e efeitos
    await page.addStyleTag({
      content: `
        * { animation: none !important; transition: none !important; }
        .chartjs-container { opacity: 1 !important; }
        canvas { opacity: 1 !important; height: 320px !important; max-height: 320px !important; }
        .grid, .flex { gap: 16px !important; }
        .grid { grid-template-columns: minmax(0,1fr) !important; }
        .flex { flex-direction: column !important; }
        /* PDF dark-mode detection for labels */
        @media (prefers-color-scheme: dark) {
          .forced-label { color: #fff !important; text-shadow: 0 0 3px #000 !important; }
        }
        /* Mostrar gráficos ocultos no print */
        .print\\:hidden { display: block !important; }
        .print\\:contents { display: block !important; }
      `,
    })

    // Injeta labels dos gráficos de forma otimizada
    await page.evaluate(() => {
      document.querySelectorAll('.forced-label').forEach(l => l.remove())

      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const textColor = isDark ? '#fff' : '#222'
      const textShadow = isDark ? '0 0 3px #000' : '0 0 3px #fff'

      // Find Chart.js canvas elements
      const chartContainers = document.querySelectorAll('[id*="chart-"]')
      chartContainers.forEach((container: any) => {
        const canvas = container.querySelector('canvas')
        if (canvas) {
          // For Chart.js charts, we can extract data from the chart instance
          const chartInstance = (window as any).Chart?.getChart?.(canvas)
          if (chartInstance && chartInstance.data && chartInstance.data.datasets) {
            chartInstance.data.datasets.forEach((dataset: any, datasetIndex: number) => {
              dataset.data.forEach((value: any, index: number) => {
                const meta = chartInstance.getDatasetMeta(datasetIndex)
                const element = meta.data[index]
                if (element && element.x !== undefined && element.y !== undefined) {
                  const lbl = document.createElement('div')
                  lbl.textContent = parseFloat(value).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 2,
                  })
                  lbl.style.position = 'absolute'
                  lbl.style.left = `${element.x}px`
                  lbl.style.top = `${element.y + window.scrollY - 10}px`
                  lbl.style.transform = 'translate(-50%, -100%)'
                  lbl.style.font = 'bold 10px Inter, sans-serif'
                  lbl.style.color = textColor
                  lbl.style.textShadow = textShadow
                  lbl.style.pointerEvents = 'none'
                  lbl.classList.add('forced-label')
                  document.body.appendChild(lbl)
                }
              })
            })
          }
        } else {
          // Fallback for SVG charts (legacy Recharts support)
          const charts = document.querySelectorAll('.chartjs-container')
          charts.forEach((chart: any) => {
            const shapes = chart.querySelectorAll('path, rect, circle')
            shapes.forEach((shape: any) => {
              const d = shape.__data__ || {}
              const v =
                d.value ||
                d.payload?.value ||
                d.payload?.total ||
                d.payload?.valor ||
                shape.getAttribute('data-value') ||
                0
              const b = shape.getBBox()
              if (!b.width || !b.height) return
              const lbl = document.createElement('div')
              lbl.textContent = parseFloat(v).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })
              lbl.style.position = 'absolute'
              lbl.style.left = `${b.x + b.width / 2}px`
              lbl.style.top = `${b.y + window.scrollY + b.height / 2}px`
              lbl.style.transform = 'translate(-50%, -50%)'
              lbl.style.font = 'bold 12px Inter, sans-serif'
              lbl.style.color = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#fff' : '#222'
              lbl.style.textShadow = window.matchMedia('(prefers-color-scheme: dark)').matches ? '0 0 3px #000' : '0 0 3px #fff'
              lbl.classList.add('forced-label')
              document.body.appendChild(lbl)
            })
          })
        }
      })
      // Força re-render para aplicar __pdfMode
      const canvases = Array.from(document.querySelectorAll('canvas'))
      canvases.forEach((canvas) => {
        const chart = (window as any).Chart?.getChart?.(canvas)
        chart?.update?.()
      })
    })

    // Espera os labels renderizarem
    await page.waitForFunction(() => {
      const canvases = Array.from(document.querySelectorAll('canvas'));
      const chartsReady = canvases.every(canvas => {
        const chart = (window as any).Chart?.getChart?.(canvas);
        return chart && chart.data && chart.data.datasets;
      });
      return chartsReady && document.querySelectorAll('.forced-label').length > 0;
    })

    // Ajusta altura real do dashboard
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight)
    await page.setViewportSize({ width: 1920, height: bodyHeight })
    await page.waitForTimeout(1500)

    // Data e hora
    const now = new Date()
    const dateStr = now.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })

    // Gera PDF
    const pdfBuffer = await page.pdf({
      printBackground: true,
      width: '1920px',
      height: `${bodyHeight}px`,
      preferCSSPageSize: false,
      margin: { top: '25mm', right: '10mm', bottom: '20mm', left: '10mm' },
    })

    // Adiciona cabeçalho e rodapé
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const pages = pdfDoc.getPages()

    pages.forEach((page, index: number) => {
      const { width, height } = page.getSize()

      // Cabeçalho
      page.drawText('INTEGRA — Relatório Mensal PGDAS', {
        x: 40,
        y: height - 40,
        size: 12,
        font,
        color: rgb(0.1, 0.1, 0.1),
      })

      // Linha do cabeçalho
      page.drawLine({
        start: { x: 40, y: height - 45 },
        end: { x: width - 40, y: height - 45 },
        thickness: 0.5,
        color: rgb(0.6, 0.6, 0.6),
      })

      // Rodapé - texto à esquerda
      page.drawText(`INTEGRA — Gerado em ${dateStr}`, {
        x: 40,
        y: 20,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
      })

      // Rodapé - numeração
      page.drawText(`Página ${index + 1} de ${pages.length}`, {
        x: width - 120,
        y: 20,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
      })
    })

    const finalPDF = await pdfDoc.save()

    return new Response(Buffer.from(finalPDF), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="dashboard-${id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    console.error('[api/pdf] erro crítico:', e)
    try {
      const token = extractTokenFromWs(ws)
      if (token) {
        const restUrl = `https://production-sfo.browserless.io/pdf?token=${encodeURIComponent(token)}&headless=true`
        const payload = {
          url: targetUrl,
          options: {
            printBackground: true,
            format: 'A4',
            landscape: true,
            margin: { top: '10mm', right: '10mm', bottom: '12mm', left: '10mm' },
          },
          waitForTimeout: 3000,
          bestAttempt: true,
          addStyleTag: [
            {
              content:
                '*{animation:none !important; transition:none !important} canvas{opacity:1 !important; height:320px !important; max-height:320px !important} .chartjs-container{opacity:1 !important} .grid{grid-template-columns:minmax(0,1fr)!important; gap:16px!important} .flex{flex-direction:column!important; gap:16px!important} .print\\:hidden{display:block!important} .print\\:contents{display:block!important}',
            },
          ],
        }
        const resp = await fetch(restUrl, {
          method: 'POST',
          headers: { 'Cache-Control': 'no-cache', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (resp.ok) {
          const ab = await resp.arrayBuffer()
          const pdf = Buffer.from(ab)
          return new Response(pdf, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="dashboard-${id}.pdf"`,
              'Cache-Control': 'no-store',
            },
          })
        }
      }
    } catch (err) {
      console.error('[api/pdf] REST fallback falhou', err)
    }
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (() => { try { return new URL(_req.url).origin } catch { return '' } })() ||
      'http://localhost:3000'
    return new Response(null, { status: 302, headers: { Location: `${base}/api/pdf/id?id=${id}` } })
  } finally {
    try {
      await browser?.close()
    } catch {}
  }
}
