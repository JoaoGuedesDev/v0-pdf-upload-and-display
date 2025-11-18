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
  } catch (e) {
    console.error('[upload] Falha ao processar PDF:', e)
    return NextResponse.json({ error: 'Falha ao ler o arquivo PDF.' }, { status: 500 })
  }
}

// Assegura que esta rota execute no runtime Node.js (necessário para Buffer/createRequire/pdf-parse)
export const runtime = 'nodejs'
