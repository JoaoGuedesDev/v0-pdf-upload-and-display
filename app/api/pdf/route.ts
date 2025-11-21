export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'

async function getPuppeteer() {
  const mod = await import('puppeteer-core')
  return { puppeteer: (mod as any).default || (mod as any), core: true }
}

async function getChromium() {
  const mod = await import('@sparticuz/chromium')
  return (mod as any).default || (mod as any)
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

function getOrigin(req: NextRequest): string {
  try {
    const hs = req.headers
    const host = hs.get('host') || process.env.VERCEL_URL || 'localhost:3000'
    const proto = hs.get('x-forwarded-proto') || 'https'
    const origin = host.includes('http') ? host : `${proto}://${host}`
    return origin
  } catch {
    return typeof process !== 'undefined' && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
  }
}

export async function GET(req: NextRequest) {
  const { path: pathQ, w, h, scale, type } = parseQuery(req)
  const pathFixed = pathQ.startsWith('/') ? pathQ : `/${pathQ}`
  const base = getOrigin(req) || (process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.origin}`)
  const target = `${base}${pathFixed}`

  const { puppeteer } = await getPuppeteer()
  const chrome: any = await getChromium()
  const executablePath: string = await chrome.executablePath()
  const args = chrome.args
  const defaultViewport = { width: w, height: h, deviceScaleFactor: scale }
  const browser = await puppeteer.launch({
    args,
    headless: (typeof chrome.headless === 'boolean') ? chrome.headless : true,
    defaultViewport,
    executablePath,
    ignoreHTTPSErrors: true,
  })

  try {
    const page = await browser.newPage()
    await page.emulateMediaType('screen')
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 120000 })
    try { await page.waitForSelector('main', { timeout: 10000 }) } catch {}
    try { await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }) } catch {}

    const size = await page.evaluate(() => ({
      w: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth),
      h: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    }))

    const pdf = await page.pdf({
      width: `${Math.max(size.w, w)}px`,
      height: `${type === 'screen' ? Math.max(size.h, h) : h}px`,
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
    return NextResponse.json({ error: msg, target, details }, { status: 500 })
  } finally {
    await browser.close()
  }
}