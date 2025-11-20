export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

async function getPuppeteer() {
  const mod = await import('puppeteer-core')
  return { puppeteer: mod.default || (mod as any), core: true }
}

function getChromium() {
  return import('@sparticuz/chromium')
}

function parseQuery(req: NextRequest) {
  const url = new URL(req.url)
  const path = url.searchParams.get('path') || '/dashboard-das'
  const w = Number(url.searchParams.get('w') || 1280)
  const h = Number(url.searchParams.get('h') || 1800)
  const scale = Number(url.searchParams.get('scale') || 1)
  const type = url.searchParams.get('type') || 'screen'
  return { path, w, h, scale, type }
}

export async function GET(req: NextRequest) {
  const { path, w, h, scale, type } = parseQuery(req)
  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `${process.env.NEXT_PUBLIC_SITE_URL || ''}`
  const base = origin || `${req.nextUrl.origin}`
  const target = `${base}${path}`

  const { puppeteer, core } = await getPuppeteer()
  const chromiumMod = await getChromium()
  const chrome: any = await chromiumMod
  const executablePath = core ? await chrome.executablePath() : undefined

  const browser = await puppeteer.launch({
    args: chrome.args,
    headless: chrome.headless,
    defaultViewport: { width: w, height: h, deviceScaleFactor: scale },
    executablePath,
  })

  try {
    const page = await browser.newPage()
    await page.emulateMediaType('screen')
    await page.goto(target, { waitUntil: 'networkidle0', timeout: 120000 })
    await new Promise((r) => setTimeout(r, 500))

    const size = await page.evaluate(() => ({
      w: window.innerWidth,
      h: document.documentElement.scrollHeight,
    }))

    const pdf = await page.pdf({
      width: `${size.w}px`,
      height: `${type === 'screen' ? size.h : h}px`,
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 120000,
    })

    return new Response(pdf as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dashboard.pdf"`,
      },
    })
  } catch (err: any) {
    const msg = err?.message || 'Erro ao gerar PDF'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    await browser.close()
  }
}