export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

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
  const { path: pathQ, w, h, scale, type } = parseQuery(req)
  const pathFixed = pathQ.startsWith('/') ? pathQ : `/${pathQ}`
  const origin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `${process.env.NEXT_PUBLIC_SITE_URL || ''}`
  const base = origin || `${req.nextUrl.origin}`
  const target = `${base}${pathFixed}`

  const { puppeteer, core } = await getPuppeteer()
  const chromiumMod = await getChromium()
  const chrome: any = await chromiumMod
  let executablePath: string | undefined
  try {
    executablePath = core ? await chrome.executablePath() : undefined
  } catch {}
  if (!executablePath && process.platform === 'win32') {
    const candidates = [
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
      'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      'C:/Users/Default/AppData/Local/Google/Chrome/Application/chrome.exe',
      'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
      'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ]
    for (const pth of candidates) {
      try { if (fs.existsSync(pth)) { executablePath = pth; break } } catch {}
    }
  }

  const usingLocalBrowser = !!executablePath && typeof executablePath === 'string' && !/chromium/i.test(executablePath)
  const browser = await puppeteer.launch({
    args: usingLocalBrowser ? ['--no-sandbox','--disable-setuid-sandbox'] : chrome.args,
    headless: chrome.headless,
    defaultViewport: { width: w, height: h, deviceScaleFactor: scale },
    executablePath,
    ignoreDefaultArgs: [ '--enable-automation' ],
  })

  try {
    const page = await browser.newPage()
    await page.emulateMediaType('screen')
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await new Promise((r) => setTimeout(r, 500))

    const size = await page.evaluate(() => ({
      w: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth),
      h: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
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
        'Content-Disposition': `inline; filename="dashboard.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    const msg = err?.message || 'Erro ao gerar PDF'
    const details = err?.stack || String(err)
    return NextResponse.json({ error: msg, target, details, executablePath }, { status: 500 })
  } finally {
    await browser.close()
  }
}