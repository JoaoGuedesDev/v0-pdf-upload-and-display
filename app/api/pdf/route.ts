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

function guessLocalChrome(): string | null {
  const localAppData = process.env.LOCALAPPDATA || ''
  const candidates = [
    process.env.CHROME_BIN || '',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    localAppData ? path.join(localAppData, 'Google/Chrome/Application/chrome.exe') : '',
    localAppData ? path.join(localAppData, 'Microsoft/Edge/Application/msedge.exe') : '',
  ].filter(Boolean)
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p
    } catch {}
  }
  return null
}

function parseQuery(req: NextRequest) {
  const url = new URL(req.url)
  const path = url.searchParams.get('path') || '/dashboard-das'
  const w = Number(url.searchParams.get('w') || 1280)
  const h = Number(url.searchParams.get('h') || 1800)
  const scale = Number(url.searchParams.get('scale') || 2)
  const type = url.searchParams.get('type') || 'screen'
  const download = url.searchParams.get('download') === 'true'
  const filename = url.searchParams.get('filename') || 'dashboard.pdf'
  return { path, w, h, scale, type, download, filename }
}

function getOrigin(req: NextRequest): string {
  try {
    // Prefer the framework-provided origin which matches the current request
    const fallback = req.nextUrl?.origin || ''
    const hs = req.headers
    const host = hs.get('host') || process.env.VERCEL_URL || 'localhost:3000'
    let proto = hs.get('x-forwarded-proto') || ''
    // Local development commonly runs on http
    if (!proto) proto = host.includes('localhost') ? 'http' : 'https'
    const origin = host.includes('http') ? host : `${proto}://${host}`
    return origin || fallback
  } catch {
    return req.nextUrl?.origin || (typeof process !== 'undefined' && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  }
}

export async function GET(req: NextRequest) {
  const { path: pathQ, w, h, scale, type, download, filename } = parseQuery(req)
  const pathFixed = pathQ.startsWith('/') ? pathQ : `/${pathQ}`
  const base = getOrigin(req) || (process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.origin}`)
  const target = `${base}${pathFixed}`

  const { puppeteer } = await getPuppeteer()
  
  // Tenta encontrar Chrome local primeiro (melhor para Windows/Dev)
  let executablePath: string | undefined = guessLocalChrome() || undefined
  let args: string[] = []
  let headless: any = true

  // Se não achou local e não é Windows, tenta @sparticuz/chromium (Lambda/Linux)
  if (!executablePath && process.platform !== 'win32') {
    try {
      const chrome: any = await getChromium()
      executablePath = await chrome.executablePath()
      args = chrome.args
      headless = chrome.headless
    } catch {}
  }

  // Fallback final: tenta sparticuz mesmo no Windows se nada mais funcionar (improvável funcionar, mas tenta)
  if (!executablePath) {
    try {
      const chrome: any = await getChromium()
      const p = await chrome.executablePath()
      // Verifica se o caminho retornado realmente existe antes de usar
      if (fs.existsSync(p)) {
        executablePath = p
        args = chrome.args
        headless = chrome.headless
      }
    } catch {}
  }

  if (!executablePath) {
    return NextResponse.json({ 
      error: 'Chromium/Chrome não encontrado no ambiente local', 
      hint: 'Defina CHROME_BIN com o caminho do seu Chrome/Edge ou instale o Chrome.',
      platform: process.platform,
      scannedPaths: 'Program Files, AppData/Local'
    }, { status: 500 })
  }
  
  const defaultViewport = { width: w, height: h, deviceScaleFactor: scale }
  
  let browser: any = null
  try {
    browser = await puppeteer.launch({
      args,
      headless: (typeof headless === 'boolean') ? headless : true,
      defaultViewport,
      executablePath,
      ignoreHTTPSErrors: true,
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao iniciar navegador', details: err.message }, { status: 500 })
  }

  try {
    const page = await browser.newPage()

    // Encaminhar cookies da requisição original para o Puppeteer
    // Isso permite que o PDF acesse rotas protegidas (autenticadas)
    const cookies = req.cookies.getAll().map(c => ({
      name: c.name,
      value: c.value,
      domain: new URL(target).hostname,
      path: '/',
    }))
    
    if (cookies.length > 0) {
      await page.setCookie(...cookies)
    }

    await page.emulateMediaType((type === 'print' || type === 'screen') ? (type as any) : 'screen')
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 120000 })
    try { await page.waitForSelector('main', { timeout: 10000 }) } catch {}
    try { await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }) } catch {}

    const isPaginated = pathQ.includes('pdf_gen=true')
    const isOnlyConsolidated = pathQ.includes('only_consolidated=true')

    let pdfOptions: any = {
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 120000,
    }

    if (!isPaginated || isOnlyConsolidated) {
      const size = await page.evaluate(() => ({
        w: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth),
        h: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      }))

      pdfOptions = {
        ...pdfOptions,
        width: `${Math.max(size.w, w)}px`,
        height: `${Math.max(size.h, h)}px`,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      }
    } else {
      pdfOptions = {
        ...pdfOptions,
        width: `${w}px`,
        height: `${h}px`,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      }
    }

    const pdf = await page.pdf(pdfOptions)

    return new Response(pdf as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
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
