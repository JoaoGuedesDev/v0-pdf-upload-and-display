export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import type { NextRequest } from 'next/server'

const isDev = process.env.NODE_ENV !== 'production'

function maskWs(ws: string) {
  try {
    const u = new URL(ws)
    if (u.searchParams.has('token')) {
      u.searchParams.set('token', '***')
    }
    return u.toString()
  } catch {
    return 'ws://***'
  }
}

async function getPuppeteer() {
  if (isDev) {
    const mod = await import('puppeteer')
    return mod.default
  } else {
    const mod = await import('puppeteer-core')
    return mod.default
  }
}

function extractId(_req: NextRequest, params?: { id?: string }) {
  // 1) Preferir params do Next (rota dinâmica)
  if (params?.id) return params.id
  try {
    const u = new URL(_req.url)
    // 2) Query string como fallback
    const fromQuery = u.searchParams.get('id')
    if (fromQuery) return fromQuery
    // 3) Extrair último segmento do pathname
    const parts = u.pathname.split('/').filter(Boolean)
    // Encontrar após 'pdf' se existir
    const idx = parts.lastIndexOf('pdf')
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]
    return parts[parts.length - 1] || ''
  } catch {
    return ''
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = extractId(_req, params)
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: { 'content-type': 'application/json' } })
  }
  const originFromReq = (() => {
    try { return new URL(_req.url).origin } catch { return '' }
  })()
  const base = process.env.NEXT_PUBLIC_BASE_URL || originFromReq || 'http://localhost:3000'
  const targetUrl = `${base}/d/${id}`

  const puppeteer = await getPuppeteer()
  let browser: any

  try {
    const wsEndpoint = process.env.BROWSER_WS_ENDPOINT || process.env.BROWSERLESS_URL || ''
    if (!isDev && wsEndpoint) {
      const puppeteerCore = (await import('puppeteer-core')).default
      console.log('[api/pdf/[id]] usando browser remoto via WS', maskWs(wsEndpoint))
      browser = await puppeteerCore.connect({ browserWSEndpoint: wsEndpoint })
    } else if (isDev) {
      browser = await puppeteer.launch({
        headless: true,
        defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 1.5 },
      })
    } else {
      const { default: chromium } = await import('@sparticuz/chromium')
      // Força modos seguros para serverless
      chromium.setHeadlessMode = true
      chromium.setGraphicsMode = false
      const extraArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process',
        '--no-zygote',
        '--disable-extensions',
        '--disable-gpu',
        '--disable-software-rasterizer',
      ]
      console.log('[api/pdf/[id]] runtime', { node: process.version, headless: chromium.headless })
      browser = await puppeteer.launch({
        args: [...chromium.args, ...extraArgs],
        defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 1.5 },
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      })
    }

    const page = await browser.newPage()
    await page.emulateMediaType('print')
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 120000 })
    try { await page.waitForFunction('document.fonts && document.fonts.ready', { timeout: 20000 }) } catch {}
    try { await page.waitForSelector('svg', { timeout: 20000 }) } catch {}

    try {
      await page.waitForFunction('window.__dashReady === true', { timeout: 20000 })
    } catch {}

    const pdf = await page.pdf({
      printBackground: true,
      landscape: true,
      format: 'A4',
      margin: { top: '10mm', right: '10mm', bottom: '12mm', left: '10mm' },
    })

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="dashboard-${id}.pdf"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e: any) {
    const msg = e?.message || ''
    if (msg.includes('Unexpected server response: 403') || msg.includes(' 403')) {
      console.error('[api/pdf/[id]] Browserless 403: token inválido, plano ou rate limit.', e)
      return new Response(JSON.stringify({ error: 'Browserless 403: token inválido, plano ou rate limit.' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (msg.includes(' 401') || msg.toLowerCase().includes('unauthorized')) {
      console.error('[api/pdf/[id]] Browserless 401: token ausente ou inválido.', e)
      return new Response(JSON.stringify({ error: 'Browserless 401: token ausente ou inválido.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (msg.includes('libnss3') || msg.includes('Failed to launch the browser process')) {
      console.error('[api/pdf] Chromium launch falhou (libs ausentes). Verifique @sparticuz/chromium / puppeteer-core versões e flags.', e)
    } else {
      console.error('[api/pdf] Erro ao gerar PDF:', e)
    }
    return new Response(JSON.stringify({ error: e?.message || 'Erro ao gerar PDF' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  } finally {
    try { await browser?.close() } catch {}
  }
}