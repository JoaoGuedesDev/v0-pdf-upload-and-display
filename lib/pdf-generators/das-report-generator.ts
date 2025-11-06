import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'node:fs'
import path from 'node:path'

export interface DasReportData {
  identificacao: {
    cnpj: string
    razaoSocial: string
    periodoApuracao: string
    abertura?: string
    municipio: string
    uf: string
  }
  receitas: {
    receitaPA: number
    rbt12: number
    rba: number
    rbaa: number
    limite?: number
    receitaPAFormatada?: string
    mercadoExterno?: {
      rpa: number
      rbt12: number
      rba: number
      rbaa: number
      limite?: number
    }
  }
  tributos: {
    IRPJ: number
    CSLL: number
    COFINS: number
    PIS_Pasep: number
    INSS_CPP: number
    ICMS: number
    IPI: number
    ISS: number
    Total: number
  }
  calculos?: {
    aliquotaEfetiva?: number
    aliquotaEfetivaFormatada?: string
    aliquotaEfetivaPercent?: number
    margemLiquida?: number
    margemLiquidaPercent?: number
  }
  insights?: {
    comparativoSetorial?: string
    pontosAtencao?: string[]
    oportunidades?: string[]
    recomendacoes?: string[]
    economiaImpostos?: string[]
    regimeTributario?: { adequado: boolean; sugestao?: string; justificativa?: string }
    dasObservacoes?: string[]
  }
  charts?: { title?: string; dataUrl?: string; svg?: string; alt?: string }[]
}

export interface PdfMetadata {
  title: string
  author?: string
  keywords?: string[]
  createdAt?: Date
}

const CM = 28.35
const formatBRL = (n: number | undefined) =>
  typeof n === 'number' ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'

export async function generateDasReportPDF(
  data: DasReportData,
  meta?: PdfMetadata,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.setTitle(meta?.title || 'Relatório DAS')
  pdfDoc.setAuthor(meta?.author || 'Integra Soluções Empresariais')
  pdfDoc.setSubject('Relatório de apuração e indicadores do DAS')
  if (meta?.keywords?.length) pdfDoc.setKeywords(meta.keywords)
  pdfDoc.setCreationDate(meta?.createdAt ?? new Date())

  let page = pdfDoc.addPage([595, 842]) // A4
  const margin = CM
  let { width, height } = page.getSize()
  let cursorY = height - margin

  const font = await pdfDoc.embedStandardFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedStandardFont(StandardFonts.HelveticaBold)

  const sanitize = (s: string) =>
    String(s)
      // Remove replacement char and normalize common non-ANSI punctuation
      .replace(/\uFFFD/g, '')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')

  const drawText = (text: string, size = 11, color = rgb(0.06, 0.09, 0.16), isBold = false) => {
    const f = isBold ? bold : font
    if (cursorY < margin + size * 2) newPage()
    page.drawText(sanitize(text), { x: margin, y: cursorY, size, font: f, color })
    cursorY -= size * 1.5
  }

  // Try to embed a small logo from /public
  let logoImg: any | null = null
  try {
    const logoPath = path.resolve('public', 'placeholder-logo.png')
    if (fs.existsSync(logoPath)) {
      const bytes = fs.readFileSync(logoPath)
      const pngData: Uint8Array = new Uint8Array(bytes)
      logoImg = await pdfDoc.embedPng(pngData)
    }
  } catch {}

  const drawHeader = () => {
    page.drawText(sanitize('Relatório DAS'), { x: margin, y: height - margin / 2, size: 9, font, color: rgb(0.28, 0.33, 0.35) })
    if (logoImg) {
      const maxW = 60
      const scale = maxW / (logoImg?.width || maxW)
      const w = (logoImg?.width || maxW) * scale
      const h = (logoImg?.height || maxW) * scale
      page.drawImage(logoImg, { x: width - margin - w, y: height - margin / 2 - h / 2, width: w, height: h })
    }
  }

  const drawFooter = () => {
    const ts = new Date().toLocaleString('pt-BR')
    page.drawText(sanitize(ts), { x: margin, y: margin / 2, size: 9, font, color: rgb(0.28, 0.33, 0.35) })
  }

  const newPage = () => {
    drawFooter()
    page = pdfDoc.addPage([595, 842])
    ;({ width, height } = page.getSize())
    cursorY = height - margin
    drawHeader()
  }

  // Header inicial
  drawHeader()

  // Identificação
  drawText('Identificação', 14, rgb(0.12, 0.25, 0.68), true)
  drawText(`CNPJ: ${data.identificacao?.cnpj ?? 'N/D'}`)
  drawText(`Município/UF: ${(data.identificacao?.municipio ?? 'N/D')}/${data.identificacao?.uf ?? 'N/D'}`)
  drawText(`Razão Social: ${data.identificacao?.razaoSocial ?? 'N/D'}`)
  drawText(`Período de Apuração: ${data.identificacao?.periodoApuracao ?? 'N/D'}`)
  if (data.identificacao?.abertura) drawText(`Abertura: ${data.identificacao.abertura}`)

  // Resumo (tolerante a ausência de receitas)
  drawText('Resumo', 12, rgb(0.12, 0.25, 0.68), true)
  const rec = data.receitas || ({} as any)
  drawText(`Receita PA: ${formatBRL(rec?.receitaPA ?? 0)}`)
  drawText(`RBT12: ${formatBRL(rec?.rbt12 ?? 0)}`)
  drawText(`Base de Cálculo (RBA): ${formatBRL(rec?.rba ?? 0)}`)
  drawText(`RBA Ajustada (RBAA): ${formatBRL(rec?.rbaa ?? 0)}`)

  if (rec?.mercadoExterno) {
    drawText('Mercado Externo', 12, rgb(0.12, 0.25, 0.68), true)
    drawText(`RPA: ${formatBRL(rec.mercadoExterno?.rpa ?? 0)}`)
    drawText(`RBT12: ${formatBRL(rec.mercadoExterno?.rbt12 ?? 0)}`)
    drawText(`RBA: ${formatBRL(rec.mercadoExterno?.rba ?? 0)}`)
    drawText(`RBAA: ${formatBRL(rec.mercadoExterno?.rbaa ?? 0)}`)
  }

  // Tributos table
  cursorY -= 8
  drawText('Tributos', 12, rgb(0.12, 0.25, 0.68), true)
  if (cursorY < margin + 220) newPage()
  const tableTop = cursorY
  const col1X = margin
  const col2X = width - margin - 150
  const rowHeight = 18
  const rows: [string, string][] = [
    ['IRPJ', formatBRL(data.tributos.IRPJ)],
    ['CSLL', formatBRL(data.tributos.CSLL)],
    ['COFINS', formatBRL(data.tributos.COFINS)],
    ['PIS/Pasep', formatBRL(data.tributos.PIS_Pasep)],
    ['INSS/CPP', formatBRL(data.tributos.INSS_CPP)],
    ['ICMS', formatBRL(data.tributos.ICMS)],
    ['IPI', formatBRL(data.tributos.IPI)],
    ['ISS', formatBRL(data.tributos.ISS)],
    ['Total', formatBRL(data.tributos.Total)],
  ]
  // Header
  page.drawText('Tributo', { x: col1X, y: cursorY, size: 10, font: bold })
  page.drawText('Valor', { x: col2X, y: cursorY, size: 10, font: bold })
  cursorY -= rowHeight
  rows.forEach(([k, v]) => {
    page.drawText(k, { x: col1X, y: cursorY, size: 10, font })
    page.drawText(v, { x: col2X, y: cursorY, size: 10, font })
    cursorY -= rowHeight
  })
  // Simple border
  page.drawRectangle({ x: margin, y: cursorY - 6, width: width - margin * 2, height: tableTop - cursorY + 6, borderColor: rgb(0.8, 0.85, 0.9), borderWidth: 0.5 })

  // Indicadores
  drawText('Indicadores', 12, rgb(0.12, 0.25, 0.68), true)
  const efetiva = data.calculos?.aliquotaEfetivaFormatada ?? (data.calculos?.aliquotaEfetivaPercent != null ? `${data.calculos.aliquotaEfetivaPercent.toFixed(2)}%` : '-')
  const margem = data.calculos?.margemLiquidaPercent != null ? `${data.calculos.margemLiquidaPercent.toFixed(2)}%` : '-'
  drawText(`Alíquota Efetiva: ${efetiva}`)
  drawText(`Margem Líquida: ${margem}`)

  // Observações
  drawText('Observações', 12, rgb(0.12, 0.25, 0.68), true)
  const obs: string[] = [
    ...(data.insights?.dasObservacoes ?? []),
    ...(data.insights?.pontosAtencao ?? []),
    ...(data.insights?.oportunidades ?? []),
    ...(data.insights?.recomendacoes ?? []),
  ]
  if (obs.length === 0) {
    drawText('- Sem observações adicionais.')
  } else {
    obs.forEach((o) => drawText(`• ${o}`))
  }

  // Charts (embed PNG/JPEG data URLs)
  if (data.charts?.length) {
    drawText('Dashboards', 12, rgb(0.12, 0.25, 0.68), true)
    for (const c of data.charts) {
      if (c.title) drawText(c.title, 10, rgb(0.06, 0.09, 0.16), true)
      const m = c.dataUrl?.match(/^data:(image\/(png|jpeg));base64,(.+)$/i)
      if (m) {
        const mime = m[1]
        const b64 = m[3]
        try {
          const bytes = Buffer.from(b64, 'base64')
          const raw: Uint8Array = new Uint8Array(bytes)
          const img = mime === 'image/png' ? await pdfDoc.embedPng(raw) : await pdfDoc.embedJpg(raw)
          const targetW = Math.min(400, width - margin * 2)
          const scale = targetW / (img.width || targetW)
          const w = (img.width || targetW) * scale
          const h = (img.height || targetW) * scale
          if (cursorY < margin + h + 40) newPage()
          page.drawImage(img, { x: margin, y: cursorY - h, width: w, height: h })
          cursorY -= h + 10
        } catch {}
      }
      if (c.alt) drawText(c.alt, 9, rgb(0.28, 0.33, 0.35))
    }
  }

  // Footer final na última página
  drawFooter()

  const pdfBytes = await pdfDoc.save()
  return new Uint8Array(pdfBytes)
}