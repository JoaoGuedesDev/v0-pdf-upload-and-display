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
    return NextResponse.redirect(new URL(`/d/${id}`, req.url), { status: 303 })
  } catch (e) {
    console.error('[upload] Falha ao processar PDF:', e)
    return NextResponse.json({ error: 'Falha ao ler o arquivo PDF.' }, { status: 500 })
  }
}