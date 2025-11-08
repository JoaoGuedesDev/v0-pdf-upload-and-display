export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import type { NextRequest } from 'next/server'

const isDev = process.env.NODE_ENV !== 'production'

async function getPuppeteer() {
  if (isDev) {
    const mod = await import('puppeteer')
    return mod.default
  } else {
    const mod = await import('puppeteer-core')
    return mod.default
  }
}

export async function GET(_req: NextRequest) {
  let id = ''
  try {
    const u = new URL(_req.url)
    id = u.searchParams.get('id') || ''
  } catch {}
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
      console.log('[api/pdf/id] usando browser remoto via WS')
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
      // Flags adicionais para ambientes serverless (Vercel/AWS Lambda)
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
      console.log('[api/pdf/id] runtime', { node: process.version, headless: chromium.headless })
      browser = await puppeteer.launch({
        args: [...chromium.args, ...extraArgs],
        defaultViewport: { width: 1600, height: 1000, deviceScaleFactor: 1.5 },
        executablePath: await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v129.0.0/chromium-v129.0.0-pack.tar'),
        headless: chromium.headless,
      })
    }

    const page = await browser.newPage()
    await page.emulateMediaType('screen')
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 120000 })

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
    if (msg.includes('libnss3') || msg.includes('Failed to launch the browser process')) {
      console.error('[api/pdf/id] Chromium launch falhou (libs ausentes). Verifique @sparticuz/chromium / puppeteer-core versões e flags.', e)
    } else {
      console.error('[api/pdf/id] Erro ao gerar PDF:', e)
    }
    return new Response(JSON.stringify({ error: e?.message || 'Erro ao gerar PDF' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  } finally {
    try { await browser?.close() } catch {}
  }
}