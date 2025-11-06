import jsPDF from 'jspdf'

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
  charts?: { title?: string; dataUrl: string }[]
}

// Utilitário simples para formatar reais
const formatBRL = (n: number | undefined) =>
  typeof n === 'number' ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'

// Utilitário para desenhar uma seção com título
function sectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 64, 175) // azul
  doc.text(title, 15, y)
  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.4)
  doc.line(15, y + 2, 195, y + 2)
  doc.setTextColor(15, 23, 42) // texto principal
}

export function generateDasReportPDF(data: DasReportData): Uint8Array {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Cabeçalho
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text('Relatório DAS', 15, 20)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 15, 27)

  // Identificação
  let y = 40
  sectionTitle(doc, 'Identificação', y - 6)
  doc.setFontSize(11)
  doc.text(`CNPJ: ${data.identificacao.cnpj}`, 15, y)
  doc.text(`Razão Social: ${data.identificacao.razaoSocial}`, 15, y + 6)
  doc.text(`Período de Apuração: ${data.identificacao.periodoApuracao}`, 15, y + 12)
  doc.text(`Município/UF: ${data.identificacao.municipio}/${data.identificacao.uf}`, 15, y + 18)

  // Resumo
  y += 32
  sectionTitle(doc, 'Resumo', y - 6)
  doc.text(`Receita PA: ${formatBRL(data.receitas.receitaPA)}`, 15, y)
  doc.text(`RBT12: ${formatBRL(data.receitas.rbt12)}`, 100, y)
  doc.text(`Base de Cálculo (RBA): ${formatBRL(data.receitas.rba)}`, 15, y + 6)
  doc.text(`RBA Ajustada (RBAA): ${formatBRL(data.receitas.rbaa)}`, 100, y + 6)
  if (data.receitas.mercadoExterno) {
    doc.setFont('helvetica', 'italic')
    doc.text('Mercado Externo:', 15, y + 14)
    doc.setFont('helvetica', 'normal')
    doc.text(`RPA: ${formatBRL(data.receitas.mercadoExterno.rpa)}`, 15, y + 20)
    doc.text(`RBT12: ${formatBRL(data.receitas.mercadoExterno.rbt12)}`, 100, y + 20)
    doc.text(`RBA: ${formatBRL(data.receitas.mercadoExterno.rba)}`, 15, y + 26)
    doc.text(`RBAA: ${formatBRL(data.receitas.mercadoExterno.rbaa)}`, 100, y + 26)
    y += 30
  } else {
    y += 16
  }

  // Tributos
  sectionTitle(doc, 'Tributos', y)
  y += 8
  const tributos = data.tributos
  const tributosLista: Array<[string, number]> = [
    ['IRPJ', tributos.IRPJ],
    ['CSLL', tributos.CSLL],
    ['COFINS', tributos.COFINS],
    ['PIS/Pasep', tributos.PIS_Pasep],
    ['INSS/CPP', tributos.INSS_CPP],
    ['ICMS', tributos.ICMS],
    ['IPI', tributos.IPI],
    ['ISS', tributos.ISS],
  ]
  tributosLista.forEach((t, idx) => {
    const colX = idx % 2 === 0 ? 15 : 100
    const rowY = y + Math.floor(idx / 2) * 6
    doc.text(`${t[0]}: ${formatBRL(t[1])}`, colX, rowY)
  })
  y += Math.ceil(tributosLista.length / 2) * 6 + 6
  doc.setFont('helvetica', 'bold')
  doc.text(`Total: ${formatBRL(tributos.Total)}`, 15, y)
  doc.setFont('helvetica', 'normal')

  // Cálculos
  y += 12
  sectionTitle(doc, 'Indicadores', y)
  y += 8
  if (data.calculos) {
    const { aliquotaEfetivaFormatada, aliquotaEfetivaPercent, margemLiquidaPercent } = data.calculos
    doc.text(`Alíquota Efetiva: ${aliquotaEfetivaFormatada ?? (aliquotaEfetivaPercent ? `${aliquotaEfetivaPercent.toFixed(2)}%` : '-')}`, 15, y)
    doc.text(`Margem Líquida: ${typeof margemLiquidaPercent === 'number' ? `${margemLiquidaPercent.toFixed(2)}%` : '-'}`, 100, y)
    y += 8
  }

  // Observações e Insights
  sectionTitle(doc, 'Observações', y)
  y += 8
  const obs: string[] = [
    ...(data.insights?.dasObservacoes ?? []),
    ...(data.insights?.pontosAtencao ?? []),
    ...(data.insights?.oportunidades ?? []),
    ...(data.insights?.recomendacoes ?? []),
  ]
  if (obs.length === 0) {
    doc.text('- Sem observações adicionais.', 15, y)
  } else {
    const maxWidth = 180
    obs.forEach((o) => {
      const lines = doc.splitTextToSize(`• ${o}`, maxWidth)
      if (y + lines.length * 5 > 280) {
        doc.addPage()
        y = 20
      }
      doc.text(lines, 15, y)
      y += lines.length * 5 + 2
    })
  }

  // Dashboards (imagens geradas dos gráficos)
  if (data.charts && data.charts.length > 0) {
    y += 8
    sectionTitle(doc, 'Dashboards', y)
    y += 8
    data.charts.forEach((chart, index) => {
      // Medidas/escala
      const imgProps = (doc as any).getImageProperties?.(chart.dataUrl)
      const pageWidth = doc.internal.pageSize.getWidth()
      const maxWidth = Math.min(180, pageWidth - 30)
      let imgWidth = maxWidth
      let imgHeight = 100
      if (imgProps && imgProps.width && imgProps.height) {
        const ratio = imgProps.width / imgProps.height
        imgHeight = Math.round((imgWidth / ratio) * 100) / 100
      }

      if (y + imgHeight > 280) {
        doc.addPage()
        y = 20
      }
      if (chart.title) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.text(chart.title, 15, y)
        y += 6
      }
      doc.addImage(chart.dataUrl, 'PNG', 15, y, imgWidth, imgHeight)
      y += imgHeight + 6
    })
  }

  // Rodapé
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text('Documento gerado automaticamente a partir do DAS enviado.', 15, 290)

  return new Uint8Array(doc.output('arraybuffer'))
}