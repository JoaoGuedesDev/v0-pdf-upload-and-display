import { NextResponse } from 'next/server'
import { generateDasReportPDF, type DasReportData, type PdfMetadata } from '@/lib/pdf-generators/das-report-generator'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || !body.data) {
      return NextResponse.json(
        { error: 'Payload inválido: envie { data: DasReportData, metadata?: PdfMetadata }' },
        { status: 400 },
      )
    }

    const data = body.data as DasReportData
    const metadata = body.metadata as PdfMetadata | undefined

    const pdfBytes = await generateDasReportPDF(data, metadata)
    // Usa Uint8Array como corpo para evitar incompatibilidades com SharedArrayBuffer
    const bodyUint8 = new Uint8Array(pdfBytes)

    const title = metadata?.title || 'relatorio-das'
    return new Response(bodyUint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(bodyUint8.byteLength),
        'Content-Disposition': `inline; filename="${title}.pdf"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    console.error('Erro ao gerar PDF:', e)
    const url = new URL(req.url)
    if (url.searchParams.get('debug') === '1') {
      return NextResponse.json({ error: e?.message || 'Erro ao gerar PDF', stack: e?.stack || '' }, { status: 200 })
    }
    return NextResponse.json({ error: e?.message || 'Erro ao gerar PDF' }, { status: 500 })
  }
}