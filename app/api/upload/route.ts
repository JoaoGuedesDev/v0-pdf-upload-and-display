import { NextRequest, NextResponse } from 'next/server'
import { createRequire } from 'module'
import { processDasData } from '@/lib/das-parse'
import { saveDashboard } from '@/lib/store'
import { Buffer } from 'node:buffer'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = (formData.get('pdf') as File) || (formData.get('file') as File)

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'PDF não enviado' }, { status: 400 })
  }

  try {
    const type = (file as any).type || ''
    const allowed = ['application/pdf']
    if (type && !allowed.includes(type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não suportado' }, { status: 415 })
    }
    const maxBytes = (() => {
      const v = Number(process.env.UPLOAD_MAX_BYTES || '')
      return Number.isFinite(v) && v > 0 ? v : 10 * 1024 * 1024
    })()
    if (typeof (file as any).size === 'number' && (file as any).size > maxBytes) {
      return NextResponse.json({ error: 'Arquivo excede o tamanho máximo' }, { status: 413 })
    }
    try {
      const head = await file.slice(0, 1024).arrayBuffer()
      const headBuf = Buffer.from(head)
      const headStr = headBuf.toString('latin1')
      if (!headStr.includes('%PDF-')) {
        return NextResponse.json({ error: 'Arquivo não parece ser um PDF válido' }, { status: 400 })
      }
    } catch {}
    try {
      const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL) && !!(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN)
      const hasVercelRest = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN
      const hasKvUrl = !!process.env.KV_URL
      console.log('[upload] env check:', { hasUpstash, hasVercelRest, hasKvUrl })
    } catch {}

    const urlObj = new URL(req.url)
    const forceN8N = ['1','true','yes','n8n'].includes(String(urlObj.searchParams.get('n8n') || '').toLowerCase())
      || ['n8n','1','true','yes'].includes(String(urlObj.searchParams.get('use') || '').toLowerCase())
    const webhookFromQuery = String(urlObj.searchParams.get('webhook') || '').trim()
    const webhookCandidate = String(
      process.env.N8N_UPLOAD_WEBHOOK_URL
      || process.env.N8N_WEBHOOK_URL
      || ''
    ).trim()
    const publicWebhook = String(process.env.NEXT_PUBLIC_N8N_UPLOAD_WEBHOOK_URL || '').trim()
    const defaultWebhook = 'https://primary-production-498b5.up.railway.app/webhook/pgdasd'
    const webhook = (webhookFromQuery || webhookCandidate || publicWebhook)
    const target = webhook || (forceN8N ? defaultWebhook : '')
    if (target) {
      const fd = new FormData()
      const name = (file as any).name || 'documento.pdf'
      const mime = (file as any).type || 'application/pdf'
      const size = Number((file as any).size || 0)
      fd.append('file', file, name)
      fd.append('pdf', file, name)
      fd.append('upload', file, name)
      fd.append('files[]', file, name)
      fd.append('filename', name)
      fd.append('mimetype', mime)
      fd.append('size', String(size))
      fd.append('source', 'dashboard-das')
      const r2 = await fetch(String(target), { method: 'POST', body: fd, redirect: 'follow', headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
      const loc = r2.headers.get('Location')
      if (r2.redirected && r2.url) {
        return NextResponse.redirect(r2.url, { status: 303 })
      }
      if (loc) {
        const abs = new URL(loc, req.url).toString()
        return NextResponse.redirect(abs, { status: 303 })
      }
      const ct = r2.headers.get('content-type') || ''
      const bodyText = await r2.text().catch(() => '')
      let data: any = null
      try {
        if (ct.includes('application/json')) {
          const parsed = JSON.parse(bodyText)
          const unwrap = (x: any): any => {
            if (!x) return x
            if (Array.isArray(x)) {
              const first = x[0]
              return unwrap(first)
            }
            if (typeof x === 'object') {
              if ('json' in x) return unwrap((x as any).json)
              if ('data' in x) return unwrap((x as any).data)
            }
            return x
          }
          data = unwrap(parsed)
        }
      } catch {}
      const idFromData = data?.id || data?.shareId || data?.dashboardId
      const redirectUrl = data?.redirect || data?.url
      if (redirectUrl) {
        const abs = new URL(redirectUrl, req.url).toString()
        return NextResponse.redirect(abs, { status: 303 })
      }
      if (idFromData) {
        return NextResponse.redirect(new URL(`/d/${idFromData}`, req.url), { status: 303 })
      }
      if (r2.ok) {
        // Tenta normalizar e salvar qualquer payload retornado pelo n8n
        try {
          const payload = (() => {
            if (data && typeof data === 'object') {
              return data
            }
            if (typeof bodyText === 'string' && bodyText.trim().length > 0) {
              try { return JSON.parse(bodyText) } catch { return bodyText }
            }
            return null
          })()
          if (payload) {
            const isNormalized = typeof payload === 'object' && payload && ('success' in (payload as any)) && ('dados' in (payload as any))
            const normalized = typeof payload === 'string' ? processDasData(payload) : (isNormalized ? payload : processDasData(JSON.stringify(payload)))
            try {
              const src: any = payload || {}
              const root = (normalized as any)?.dados || normalized
              if (root && typeof root === 'object') {
                const calc = root.calculos || (root.calculos = {})
                const aa = src?.analise_aliquota || src?.calculos?.analise_aliquota
                if (aa && typeof aa === 'object') calc.analise_aliquota = aa
                const protocolo = src?.protocolo
                if (protocolo) {
                  const meta = root.metadata || (root.metadata = {})
                  ;(meta as any).protocolo = protocolo
                  ;(root as any).protocolo = protocolo
                }
              }
            } catch {}
            const genId = await saveDashboard(normalized, 60)
            return NextResponse.redirect(new URL(`/d/${genId}`, req.url), { status: 303 })
          }
        } catch {}
      }
      return NextResponse.json({ ok: r2.ok, status: r2.status, data: data ?? bodyText }, { status: r2.status || 200 })
    } else {
      const arrayBuffer = await file.arrayBuffer()
      const buf = Buffer.from(arrayBuffer)
      const require = createRequire(import.meta.url)
      const pdfParse = require('pdf-parse/lib/pdf-parse.js')
      const result = await pdfParse(buf)
      const text = (result?.text || '') as string
      if (!text || text.trim().length === 0) {
        return NextResponse.json({ error: 'Texto do PDF está vazio' }, { status: 400 })
      }

      const dasData = processDasData(text)
      const id = await saveDashboard(dasData, 60) // expira em 60 dias
      try {
        console.log('[upload] ID gerado:', id)
      } catch {}
      return NextResponse.redirect(new URL(`/d/${id}`, req.url), { status: 303 })
    }
  } catch (e) {
    console.error('[upload] Falha ao processar PDF:', e)
    return NextResponse.json({ error: 'Falha ao ler o arquivo PDF.' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    return NextResponse.redirect(new URL('/', req.url), { status: 302 })
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 })
}

// Assegura que esta rota execute no runtime Node.js (necessário para Buffer/createRequire/pdf-parse)
export const runtime = 'nodejs'
