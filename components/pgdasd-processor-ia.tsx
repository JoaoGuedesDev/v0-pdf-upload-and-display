"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useTheme } from 'next-themes'
import {
  Upload,
  FileText,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  Target,
  Loader2,
  DollarSign,
  Package,
  Briefcase,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Info,
  Download,
  Clock,
  Shield,
  HelpCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts"
import { toPng } from "html-to-image"
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
 

interface DASData {
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
  cenario?: string
  atividades?: {
    atividade1?: {
      descricao: string
      Total: number
    }
    atividade2?: {
      descricao: string
      Total: number
    }
  }
  graficos?: {
    tributosBar?: {
      labels: string[]
      values: number[]
    }
    totalTributos?: {
      labels: string[]
      values: number[]
    }
    dasPie?: {
      labels: string[]
      values: number[]
    }
    receitaLine?: {
      labels: string[]
      values: number[]
    }
    receitaMensal?: {
      labels: string[]
      values: number[]
    }
    // Série opcional para Mercado Externo retornada pelo parser
    receitaLineExterno?: {
      labels: string[]
      values: number[]
      valuesFormatados?: string[]
    }
    atividadesComparativo?: any
  }
  calculos?: {
    aliquotaEfetiva?: number
    aliquotaEfetivaFormatada?: string
    aliquotaEfetivaPercent?: number
    margemLiquida?: number
    margemLiquidaPercent?: number
  }
  insights?: {
    comparativoSetorial: string
    pontosAtencao: string[]
    oportunidades: string[]
    recomendacoes: string[]
    economiaImpostos?: string[]
    regimeTributario?: { adequado: boolean; sugestao?: string; justificativa?: string }
    dasObservacoes?: string[]
    receitaMensal?: string[]
  }
  debug?: any
}

const CHART_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0891b2"]

  const ATIVIDADES_COLORS = {
    servicos: "#10b981", // verde
    mercadorias: "#3b82f6", // azul
  }

  // Helper: normaliza texto pt-BR (minúsculas, sem acentos, espaços únicos)
  function normalizeTextPTBR(s: string): string {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()
  }

  // Helper: classifica atividade em { tipo, mercado }
  function classifyAtividade(nome: string): { tipo: "servicos" | "mercadorias"; mercado: "interno" | "externo" } {
    const t = normalizeTextPTBR(nome)

    // Detecta serviços por palavra-raiz
    const isServico = /servi/.test(t) || /prestacao de servico/.test(t)

    // Sinais de negação do exterior (prioridade máxima)
    const negExternoPatterns = [
      /(exceto|nao)\s+(para\s+)?(o\s+)?exterior/,
      /mercado\s+interno/,
      /(sem|exceto)\s+exportacao/,
      /(nao|não)\s+destinad[ao]s?\s+ao\s+exterior/,
    ]
    const hasNegExterno = negExternoPatterns.some((rx) => rx.test(t))

    // Sinais afirmativos de exterior (após normalizeTextPTBR)
    // Cobrem: "para o exterior", "exterior", "mercado externo", "exportacao/exportacoes"
    const posExternoPatterns = [
      /\bpara\s+o\s+exterior\b/,
      /\bpara\s+exterior\b/,
      /\bmercado\s+externo\b/,
      /\bexterior\b/,
      /\bexterno\b/,
      /\bexporta(cao|coes)\b/,
      /\bpara\s+exporta(cao|coes)\b/,
      /\bdestinad[ao]s?\s+ao\s+exterior\b/,
    ]
    const hasPosExterno = posExternoPatterns.some((rx) => rx.test(t))

    const isExterior = !hasNegExterno && hasPosExterno
    const mercado: "interno" | "externo" = isExterior ? "externo" : "interno"
    const tipo: "servicos" | "mercadorias" = isServico ? "servicos" : "mercadorias"
    return { tipo, mercado }
  }

  // Sanitiza insights para remover frases proibidas
  function sanitizeInsights(insights: DASData["insights"]): DASData["insights"] {
    if (!insights) return insights
    const banned = [
      "desbalanceamento entre serviços e mercadorias",
      "otimizar divisão entre serviços e mercadorias"
    ]
    const isBanned = (txt: string) => {
      const n = normalizeTextPTBR(txt)
      return banned.some(b => n.includes(b))
    }
    const filterArr = (arr?: string[]) => Array.isArray(arr) ? arr.filter(item => !isBanned(item)) : []
    return {
      comparativoSetorial: insights.comparativoSetorial,
      pontosAtencao: filterArr(insights.pontosAtencao),
      oportunidades: filterArr(insights.oportunidades),
      recomendacoes: insights.recomendacoes || [],
      economiaImpostos: insights.economiaImpostos || [],
      regimeTributario: insights.regimeTributario,
      dasObservacoes: insights.dasObservacoes || [],
      receitaMensal: insights.receitaMensal || [],
    }
  }

export function PGDASDProcessorIA() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DASData | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [processViaN8n, setProcessViaN8n] = useState(false)
  const [showConsistencyDetails, setShowConsistencyDetails] = useState(false)
  const [downloadingServerPdf, setDownloadingServerPdf] = useState(false)
  const [downloadingScreenshotPdf, setDownloadingScreenshotPdf] = useState(false)
  const [downloadingClientPdf, setDownloadingClientPdf] = useState(false)
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('landscape')
  const [pdfFitMode, setPdfFitMode] = useState<'multipage' | 'single_contain' | 'single_cover'>('multipage')
  const [clientPixelRatio, setClientPixelRatio] = useState<number>(3)
  

  const handleServerDownloadPDF = async (
    scale: number = 3,
    maxPages?: number,
    orientation: 'portrait' | 'landscape' = 'landscape',
    pixelOffsetPx: number = 30
  ) => {
    try {
      if (!contentRef.current) return
      setDownloadingServerPdf(true)

      const base = window.location.origin
      // Coletar estilos atuais (Tailwind/Next) para preservar cores e layout
      const headLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map((el) => el.outerHTML)
        .join('\n')
      const headStyles = Array.from(document.querySelectorAll('style'))
        .map((el) => el.outerHTML)
        .join('\n')
      // Usa o conteúdo completo, mas oculta pizza, insights e controles via CSS para o print
      const bodyHtml = contentRef.current.outerHTML
      const htmlContent = `<!doctype html><html><head><base href="${base}" />\n${headLinks}\n${headStyles}
        <style>
          @page { size: A4 ${pdfOrientation === 'landscape' ? 'landscape' : 'portrait'}; margin: 0; }
          body { background: ${darkMode ? '#0f172a' : '#ffffff'}; }
          .print-container { padding: 12mm; }
          #print-pie, #print-insights, #print-controls { display: none !important; }
        </style>
      </head><body><div class="print-container">${bodyHtml}</div></body></html>`

      // Função util para conversão
      const mmToPx = (mm: number) => (mm / 25.4) * 96

      // Cálculo opcional de zoom para caber em até maxPages
      let zoom: number | undefined
      if (maxPages && contentRef.current) {
        const a4HeightPx = mmToPx(297)
        const top = 10, bottom = 10
        const printableHeight = a4HeightPx - mmToPx(top + bottom)
        const targetHeight = printableHeight * maxPages
        const currentHeight = contentRef.current.scrollHeight
        const computedZoom = targetHeight / currentHeight
        // Limitar zoom a um intervalo razoável
        zoom = Math.max(0.6, Math.min(1, computedZoom))
      }

      // Aplicar redução global de escala por pixelOffsetPx baseado na largura imprimível
      const pageWidthMm = orientation === 'landscape' ? 297 : 210
      const left = 10, right = 10
      const printableWidthPx = mmToPx(pageWidthMm) - mmToPx(left + right)
      const offsetZoom = (printableWidthPx - Math.max(0, pixelOffsetPx)) / printableWidthPx
      zoom = Math.max(0.6, Math.min(1, (zoom ?? 1) * offsetZoom))

      const payload = {
        html: htmlContent,
        base,
        fileName: 'relatorio-pgdasd.pdf',
        format: 'A4' as const,
        deviceScaleFactor: scale,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        orientation,
        ...(zoom ? { zoom } : {}),
      }

      const resp = await fetch('/api/make-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!resp.ok) {
        throw new Error(`Falha ao gerar PDF no servidor: ${resp.status} ${resp.statusText}`)
      }

      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'relatorio-pgdasd.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e?.message || 'Erro ao baixar PDF do servidor')
    } finally {
      setDownloadingServerPdf(false)
    }
  }

  const generateImage = async () => {
    if (!contentRef.current || !data) return
    try {
      setIsGeneratingImage(true)
      const node = contentRef.current as HTMLElement
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: darkMode ? '#0f172a' : '#ffffff',
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `DAS_${data.identificacao.cnpj.replace(/[^\d]/g, '')}_${new Date().toISOString().split('T')[0]}.png`
      a.click()
    } catch (err) {
      console.error('Erro ao gerar imagem', err)
      setError('Erro ao gerar imagem. Tente novamente.')
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const downloadScreenshotPdf = async () => {
    if (!contentRef.current || !data) return
    // Variáveis compartilhadas entre try/finally
    let controlsEls: HTMLElement[] = []
    let prevControlsDisplay: string[] = []
    try {
      setDownloadingScreenshotPdf(true)
      const node = contentRef.current as HTMLElement

      // Oculta temporariamente elementos marcados para esconder no PDF do cliente
      controlsEls = Array.from(node.querySelectorAll('[data-hide-for-client-pdf]')) as HTMLElement[]
      prevControlsDisplay = controlsEls.map(el => el.style.display)
      controlsEls.forEach(el => (el.style.display = 'none'))

      // Captura a tela como PNG
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: clientPixelRatio,
        backgroundColor: darkMode ? '#0f172a' : '#ffffff',
      })

      // Obter dimensões naturais da imagem capturada
      // Não usar zoom: dimensionamos a imagem em mm para preencher a página A4 landscape

      // Constrói um HTML mínimo com a imagem ocupando toda a largura da página
      const base = window.location.origin
      const pageWmm = pdfOrientation === 'landscape' ? 297 : 210
      const pageHmm = pdfOrientation === 'landscape' ? 210 : 297
      const fit = pdfFitMode === 'single_cover' ? 'cover' : 'contain'
      const html = `<!doctype html><html><head><base href="${base}" />
        <style>
          html, body { margin: 0; padding: 0; }
          /* Garantir que a imagem caiba em uma página A4 conforme orientação */
          @media print {
            /* Preencher página A4 sem margens */
            html, body { width: ${pageWmm}mm; height: ${pageHmm}mm; }
            img { width: ${pageWmm}mm; height: ${pageHmm}mm; object-fit: ${fit}; object-position: center top; display: block; }
          }
        </style>
      </head><body>
        <img src="${dataUrl}" alt="Dashboard" />
      </body></html>`

      const payload = {
        html,
        base,
        fileName: `dashboard-print-${new Date().toISOString().split('T')[0]}.pdf`,
        format: 'A4' as const,
        deviceScaleFactor: 3,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        orientation: pdfOrientation,
      }

      const resp = await fetch('/api/make-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!resp.ok) {
        throw new Error(`Falha ao gerar PDF do print: ${resp.status} ${resp.statusText}`)
      }

      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = payload.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Erro ao gerar PDF (print):', err)
      setError(err?.message || 'Erro ao gerar PDF do print. Tente novamente.')
    } finally {
      // Restaura visibilidade dos controles
      if (controlsEls.length) {
        controlsEls.forEach((el, idx) => (el.style.display = prevControlsDisplay[idx] || ''))
      }
      setDownloadingScreenshotPdf(false)
    }
  }

  const downloadClientPdf = async () => {
    if (!contentRef.current || !data) return
    const node = contentRef.current as HTMLElement
    const pieEl = node.querySelector('#print-pie') as HTMLElement | null
    const insightsEl = node.querySelector('#print-insights') as HTMLElement | null
    const prevPieDisplay = pieEl?.style.display
    const prevInsightsDisplay = insightsEl?.style.display
    const controlsEls = Array.from(node.querySelectorAll('[data-hide-for-client-pdf]')) as HTMLElement[]
    const prevControlsDisplay = controlsEls.map(el => el.style.display)
    try {
      setDownloadingClientPdf(true)
      if (pieEl) pieEl.style.display = 'none'
      if (insightsEl) insightsEl.style.display = 'none'
      controlsEls.forEach(el => (el.style.display = 'none'))
      const whatsappAnchor = node.querySelector('a[href^="https://wa.me/"]') as HTMLAnchorElement | null
      const waUrl = whatsappAnchor?.href || 'https://wa.me/559481264638?text=Ol%C3%A1%20quero%20uma%20an%C3%A1lise%20mais%20completa%20do%20meu%20DAS'
      const waLabel = (whatsappAnchor?.textContent || '94 8126-4638').trim()

      // Usa html-to-image para evitar parsing de cores lab()/oklch do html2canvas
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: clientPixelRatio,
        backgroundColor: darkMode ? '#0f172a' : '#ffffff',
      })

      // Descobre dimensões naturais da imagem
      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
        img.onerror = reject
        img.src = dataUrl
      })

      const pdf = new jsPDF(pdfOrientation === 'landscape' ? 'l' : 'p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      if (pdfFitMode === 'multipage') {
        const imgWidth = pageWidth
        const imgHeight = (dims.h * imgWidth) / dims.w
        let heightLeft = imgHeight
        let position = 0
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
        while (heightLeft > 0) {
          pdf.addPage()
          position = heightLeft - imgHeight
          pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }
      } else {
        const fitContain = pdfFitMode === 'single_contain'
        const scale = fitContain
          ? Math.min(pageWidth / dims.w, pageHeight / dims.h)
          : Math.max(pageWidth / dims.w, pageHeight / dims.h)
        const renderW = dims.w * scale
        const renderH = dims.h * scale
        const x = (pageWidth - renderW) / 2
        const y = (pageHeight - renderH) / 2
        pdf.addImage(dataUrl, 'PNG', x, y, renderW, renderH)
      }

      // Adiciona link clicável do WhatsApp na primeira página (sobreposição)
      try {
        pdf.setTextColor(darkMode ? '#10b981' : '#0f766e')
        pdf.setFontSize(12)
        const label = `WhatsApp: ${waLabel}`
        const textWidth = pdf.getTextWidth(label)
        const textX = (pageWidth - textWidth) / 2
        const textY = pageHeight - 6
        pdf.text(label, textX, textY)
        // Área clicável envolvendo o texto
        pdf.link(textX - 2, textY - 6, textWidth + 4, 8, { url: waUrl })
      } catch (_) {
        // Silencia falhas de anotação sem quebrar geração
      }

      pdf.save('dashboard-relatorio.pdf')
    } catch (err) {
      console.error('Erro ao gerar PDF no cliente', err)
      setError('Erro ao gerar PDF no cliente. Tente novamente.')
    } finally {
      if (pieEl) pieEl.style.display = prevPieDisplay || ''
      if (insightsEl) insightsEl.style.display = prevInsightsDisplay || ''
      controlsEls.forEach((el, idx) => (el.style.display = prevControlsDisplay[idx] || ''))
      setDownloadingClientPdf(false)
    }
  }

  const generateInsights = (dasData: DASData) => {
    const aliquota = dasData.calculos?.aliquotaEfetiva || 0
    const margem = dasData.calculos?.margemLiquida || 0
    const totalTributos = dasData.tributos.Total || 0
    const inss = dasData.tributos.INSS_CPP || 0
    const rbt12 = dasData.receitas.rbt12 || 0
    const iss = dasData.tributos.ISS || 0
    const icms = dasData.tributos.ICMS || 0
    const cenario = dasData.cenario || "misto"

    let comparativoSetorial = ""
    const pontosAtencao: string[] = []
    const oportunidades: string[] = []
    const recomendacoes: string[] = []

    // Heurísticas adicionais por caso: tendências de receita e composição
    const receitaLineVals = dasData.graficos?.receitaLine?.values || []
    const meVals = dasData.graficos?.receitaLineExterno?.values || []
    const lastReceita = receitaLineVals.length > 0 ? receitaLineVals[receitaLineVals.length - 1] : 0
    const last3Avg = receitaLineVals.length >= 3
      ? (receitaLineVals.slice(-3).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) / 3)
      : (receitaLineVals.length > 0 ? (receitaLineVals.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) / receitaLineVals.length) : 0)
    const variacaoUltimo = last3Avg > 0 ? ((lastReceita - last3Avg) / last3Avg) * 100 : 0
    const meTotalPositivo = (meVals || []).some(v => (Number.isFinite(v) ? v : 0) > 0)

    switch (cenario) {
      case "servicos":
        comparativoSetorial = `Operação de serviços com alíquota efetiva de ${aliquota.toFixed(5)}% e margem líquida de ${margem.toFixed(1)}%. ${aliquota > 8 ? "Acima" : "Dentro"} da média do setor (6-8%). ${iss > totalTributos * 0.15 ? "ISS tem peso relevante na carga tributária." : ""}`

        if (iss > totalTributos * 0.15)
          pontosAtencao.push("ISS representa mais de 15% do total - avaliar benefícios municipais")
        if (inss > totalTributos * 0.35)
          pontosAtencao.push("INSS/CPP elevado - revisar distribuição pró-labore vs lucros")

        oportunidades.push("Avaliar benefícios fiscais municipais para redução de ISS")
        oportunidades.push("Verificar enquadramento no Anexo III ou possibilidade de migração")

        recomendacoes.push("Manter documentação de serviços prestados organizada")
        recomendacoes.push("Avaliar possibilidade de retenções na fonte")
        break

      case "mercadorias":
        comparativoSetorial = `Operação de comércio com alíquota efetiva de ${aliquota.toFixed(5)}% e margem líquida de ${margem.toFixed(1)}%. ${aliquota > 7 ? "Acima" : "Dentro"} da média do setor (5-7%). ${icms > totalTributos * 0.12 ? "ICMS tem peso relevante na carga tributária." : ""}`

        if (icms > totalTributos * 0.12)
          pontosAtencao.push("ICMS representa mais de 12% do total - avaliar créditos fiscais")
        if (aliquota > 7) pontosAtencao.push("Alíquota acima da média do setor - revisar enquadramento")

        oportunidades.push("Aproveitar créditos de ICMS nas compras")
        oportunidades.push("Avaliar substituição tributária para reduzir carga")

        recomendacoes.push("Manter controle rigoroso de estoque e notas fiscais")
        recomendacoes.push("Verificar possibilidade de benefícios estaduais")
        break

      case "misto":
        comparativoSetorial = `Operação mista com alíquota efetiva de ${aliquota.toFixed(5)}% e margem líquida de ${margem.toFixed(1)}%. ${iss > 0 && icms > 0 ? "Diversificação entre serviços e mercadorias detectada." : ""}`

        // Removido: alerta de desbalanceamento e sugestão de otimizar divisão.
        // Mantém apenas oportunidades gerais aplicáveis ao cenário misto.
        oportunidades.push("Aproveitar benefícios fiscais de ambas as atividades")

        recomendacoes.push("Segregar corretamente receitas de serviços e mercadorias")
        recomendacoes.push("Avaliar qual atividade tem melhor margem para foco estratégico")
        break
    }

    if (aliquota > 10) pontosAtencao.push("Alíquota efetiva elevada - revisar enquadramento no Simples")
    if (margem < 10) pontosAtencao.push("Margem líquida abaixo de 10% - atenção à rentabilidade")

    // Tendência do último mês vs média recente
    if (variacaoUltimo <= -20) {
      pontosAtencao.push("Queda acentuada de receita em relação à média recente (≥20%)")
      recomendacoes.push("Investigar causas da queda e ajustar precificação/marketing")
    } else if (variacaoUltimo >= 20) {
      oportunidades.push("Crescimento recente de receita (≥20%) — explorar expansão controlada")
      recomendacoes.push("Planejar capacidade/estoque para sustentar crescimento")
    }

    // Mercado externo presente
    if (meTotalPositivo) {
      oportunidades.push("Explorar benefícios de exportação e regimes especiais aplicáveis")
      recomendacoes.push("Verificar obrigações e incentivos específicos para operações externas")
    }

    oportunidades.push("Receita anual permite permanência no Simples Nacional")
    if (aliquota > 8) oportunidades.push("Possível redução de carga através de planejamento tributário")

    recomendacoes.push("Manter controle rigoroso do faturamento para não ultrapassar o limite do Simples")
    if (margem < 15) recomendacoes.push("Avaliar estrutura de custos e precificação para melhorar margem")

    return {
      // Usa o comparativo setorial detalhado por cenário (com números do caso)
      comparativoSetorial,
      // Usa os pontos de atenção calculados acima
      pontosAtencao,
      // Consolida oportunidades específicas do cenário com oportunidades gerais
      oportunidades: [
        ...oportunidades,
        ...(rbt12 < 4800000 ? ["Receita anual permite permanência no Simples Nacional"] : []),
        ...(aliquota > 8 ? ["Possível redução de carga através de planejamento tributário"] : []),
        ...(iss > 0 ? ["Avaliar benefícios fiscais municipais para ISS"] : []),
      ],
      // Consolida recomendações específicas com recomendações gerais
      recomendacoes: [
        ...recomendacoes,
        "Manter controle rigoroso do faturamento para não ultrapassar o limite do Simples",
        ...(aliquota > 8 ? ["Consultar contador sobre possibilidade de mudança de anexo"] : []),
        "Revisar distribuição de lucros vs. pró-labore para otimização tributária",
        ...(margem < 15 ? ["Avaliar estrutura de custos e precificação para melhorar margem"] : []),
      ],
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Parsing robusto para strings com vírgula/ponto (ex: "4.203,16")
  const parseNumber = (v: any): number => {
    if (typeof v === "number") return v
    if (typeof v === "string") {
      const s = v.trim()
      if (!s) return 0
      if (s.includes(",")) {
        const cleaned = s.replace(/\./g, "").replace(/,/g, ".")
        const n = Number(cleaned)
        return isFinite(n) ? n : 0
      }
      const n = Number(s)
      return isFinite(n) ? n : 0
    }
    return Number(v) || 0
  }

  // Formatação compacta para valores em mini-gráficos (k/M)
  const formatMiniValue = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(0)}M`
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`
    return Math.round(val).toString()
  }
  
  // Tick formatter padronizado em BRL para YAxis (suprime ticks muito baixos no eixo log)
  const formatYAxisTickBRL = (value: number, minDomain?: number) => {
    // Oculta rótulos muito próximos do limite inferior (epsilon) do eixo log
    const threshold = typeof minDomain === 'number' ? minDomain * 1.2 : 0
    if (value <= threshold) return ""
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value))
  }

  // Mercado Externo: exatamente 4 casas quando houver valor positivo
  const formatMiniValueExternal4d = (val: number, str?: string) => {
    if (!isFinite(val) || val <= 0) return ""
    return str && str.length > 0 ? str : val.toFixed(4)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile)
        setError(null)
      } else {
        setError("Por favor, envie apenas arquivos PDF")
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile)
        setError(null)
      } else {
        setError("Por favor, envie apenas arquivos PDF")
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const url = processViaN8n ? "/api/process-pdf?via=n8n" : "/api/process-pdf"

      // Enviar para API que processa localmente ou encaminha ao n8n
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      })

      

      if (!response.ok) {
        throw new Error(`Erro ao processar: ${response.statusText}`)
      }

      const contentType = response.headers.get("content-type")
      const responseText = await response.text()

      

      if (!responseText || responseText.trim() === "") {
        throw new Error("O webhook retornou uma resposta vazia")
      }

      if (!contentType?.includes("application/json")) {
        throw new Error(`A API retornou um tipo de conteúdo inesperado: ${contentType}`)
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        throw new Error("A API retornou dados em formato inválido")
      }

      

      // Normalizar formato: a API retorna { dados, graficos, debug, metadata }
      const container = (result && typeof result === 'object' && 'dados' in result)
        ? (result as any)
        : { dados: result }

      const rawData = (container as any).dados || {}

      // Extrair tributos com tolerância a diferentes formatos
      let tributos: any = undefined
      if (rawData?.atividades?.totalEstabelecimento) {
        tributos = rawData.atividades.totalEstabelecimento
      } else if (rawData?.atividades?.somaAtividades) {
        tributos = rawData.atividades.somaAtividades
      } else if (rawData?.tributos) {
        tributos = rawData.tributos
      }

      if (!tributos) {
        tributos = { IRPJ: 0, CSLL: 0, COFINS: 0, PIS_Pasep: 0, INSS_CPP: 0, ICMS: 0, IPI: 0, ISS: 0, Total: 0 }
      }

      const tributosNormalizados = {
        IRPJ: tributos.IRPJ || 0,
        CSLL: tributos.CSLL || 0,
        COFINS: tributos.COFINS || 0,
        PIS_Pasep: tributos.PIS_Pasep || tributos["PIS/Pasep"] || 0,
        INSS_CPP: tributos.INSS_CPP || tributos["INSS/CPP"] || 0,
        ICMS: tributos.ICMS || 0,
        IPI: tributos.IPI || 0,
        ISS: tributos.ISS || 0,
        Total: tributos.Total || 0,
      }

      const dasData: DASData = {
        identificacao: rawData.identificacao || {},
        receitas: rawData.receitas || {},
        tributos: tributosNormalizados,
        atividades: rawData.atividades
          ? {
              atividade1: rawData.atividades.atividade1,
              atividade2: rawData.atividades.atividade2,
            }
          : undefined,
        graficos: (container as any).graficos || rawData.graficos,
        // Propaga dados de debug quando presentes na resposta da API
        debug: (container as any).debug || rawData.debug,
        calculos: rawData.calculos,
      }

      

      if (dasData.calculos) {
        // Removida a lógica problemática que sobrescrevia aliquotaEfetiva com aliquotaEfetivaPercent
        // pois aliquotaEfetivaPercent pode conter valor arredondado para menos casas decimais
        if (dasData.calculos.margemLiquidaPercent && !dasData.calculos.margemLiquida) {
          dasData.calculos.margemLiquida = dasData.calculos.margemLiquidaPercent
        }
      }

      // Sempre recalcula e padroniza a Alíquota Efetiva com 5 casas decimais (sem "%")
      {
        const receitaPA = dasData.receitas.receitaPA || 0
        const totalDAS = dasData.tributos.Total || 0

        const truncateDecimals = (value: number, decimals: number = 5): number => {
          if (!isFinite(value)) return 0
          const factor = Math.pow(10, decimals)
          return Math.trunc(value * factor) / factor
        }

        const formatBrazilianDecimalNoRound = (value: number, decimals: number = 5): string => {
          const truncated = truncateDecimals(value, decimals)
          return truncated.toFixed(decimals).replace('.', ',')
        }

        const aliquotaEfetivaValue = (totalDAS > 0 && receitaPA > 0) ? (totalDAS / receitaPA) * 100 : 0

        if (!dasData.calculos) dasData.calculos = {}
        dasData.calculos.aliquotaEfetiva = truncateDecimals(aliquotaEfetivaValue, 5)
        dasData.calculos.aliquotaEfetivaFormatada = formatBrazilianDecimalNoRound(aliquotaEfetivaValue, 5)
        // Mantém margem existente se houver; caso contrário calcula
        if (dasData.calculos.margemLiquida === undefined || dasData.calculos.margemLiquida === null) {
          dasData.calculos.margemLiquida = receitaPA > 0 ? ((receitaPA - totalDAS) / receitaPA) * 100 : 0
        }
      }

      if (dasData.graficos) {
        if (dasData.graficos.totalTributos && !dasData.graficos.tributosBar) {
          dasData.graficos.tributosBar = dasData.graficos.totalTributos
        }
        if (dasData.graficos.receitaMensal && !dasData.graficos.receitaLine) {
          dasData.graficos.receitaLine = dasData.graficos.receitaMensal
        }
        if (!dasData.graficos.dasPie && dasData.graficos.totalTributos) {
          dasData.graficos.dasPie = dasData.graficos.totalTributos
        }

        // Sanitização dos dados do gráfico de receita mensal para evitar quebras
        if (dasData.graficos.receitaLine) {
          const labels = Array.isArray(dasData.graficos.receitaLine.labels)
            ? dasData.graficos.receitaLine.labels
            : []
          const valuesRaw = Array.isArray(dasData.graficos.receitaLine.values)
            ? dasData.graficos.receitaLine.values
            : []
          const values = labels.map((_, idx) => {
            const v: any = valuesRaw[idx]
            const num = Number(v)
            return Number.isFinite(num) ? num : 0
          })
          dasData.graficos.receitaLine = { labels, values }
        }

        // Fallback: se não houver série mensal, plota o mês do PA com RPA
        if (!dasData.graficos.receitaLine || (dasData.graficos.receitaLine.values?.length || 0) === 0) {
          const periodo = dasData.identificacao?.periodoApuracao || ''
          const fimMatch = periodo.match(/(\d{2}\/\d{4})\s*$/)
          const fim = fimMatch ? fimMatch[1] : 'PA'
          const rpaTotal = dasData.receitas?.receitaPA || 0
          const rpaME = dasData.receitas?.mercadoExterno?.rpa || 0
          const rpaMI = Math.max(rpaTotal - rpaME, 0)
          dasData.graficos.receitaLine = { labels: [fim], values: [rpaMI] }
          // adiciona série externa se houver
          if (rpaME > 0) {
            dasData.graficos.receitaLineExterno = {
              labels: [fim],
              values: [Number(rpaME.toFixed(4))],
              valuesFormatados: [rpaME.toFixed(4).replace('.', ',')]
            }
          }
        }
      }

      // Tenta gerar insights via IA (fallback para heurística local)
      try {
        const iaResp = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dasData }),
        })
        if (iaResp.ok) {
          const iaJson = await iaResp.json()
          const insightsFromIa = iaJson?.insights
          if (insightsFromIa && typeof insightsFromIa === 'object') {
            setData({ ...dasData, insights: sanitizeInsights(insightsFromIa as any) })
          } else {
            const insights = generateInsights(dasData)
            setData({ ...dasData, insights: sanitizeInsights(insights) })
          }
        } else {
          const insights = generateInsights(dasData)
          setData({ ...dasData, insights: sanitizeInsights(insights) })
        }
      } catch {
        const insights = generateInsights(dasData)
        setData({ ...dasData, insights: sanitizeInsights(insights) })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar o arquivo")
    } finally {
      setLoading(false)
    }
  }

  const [darkMode, setDarkMode] = useState(false)
  const { theme, setTheme } = useTheme()
  useEffect(() => {
    setDarkMode(theme === 'dark')
  }, [theme])

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    setTheme(next ? 'dark' : 'light')
  }

  return (
    <div className={`min-h-screen p-4 sm:p-6 ${darkMode ? 'bg-slate-900 text-white' : 'bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100'}`}>
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <img
              src="/integra-logo.svg"
              alt="Integra Soluções Empresariais"
              className="h-10 sm:h-12 object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-logo.png' }}
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            className={`rounded-full ${darkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
            onClick={toggleDarkMode}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>

        {!data && (
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'border-2 border-dashed border-slate-300 bg-white/50'} backdrop-blur-sm`}>
            <CardContent className="pt-6">
              <div
                className={`relative flex flex-col items-center justify-center rounded-lg p-8 sm:p-12 transition-all ${
                  dragActive 
                    ? `${darkMode ? 'bg-slate-700 border-2 border-blue-500' : 'bg-blue-50 border-2 border-blue-400'}` 
                    : `${darkMode ? 'bg-slate-900 border-2 border-slate-700' : 'bg-slate-50 border-2 border-slate-200'}`
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload
                  className={`h-12 w-12 sm:h-16 sm:w-16 mb-4 ${dragActive ? (darkMode ? 'text-blue-300' : 'text-blue-600') : darkMode ? 'text-slate-300' : 'text-slate-400'}`}
                />
                <h3 className={`text-lg sm:text-xl font-semibold mb-2 text-center break-words max-w-full ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {file ? file.name : "Arraste seu PDF aqui"}
                </h3>
                <p className={`${darkMode ? 'text-slate-300' : 'text-slate-500'} mb-4 text-sm sm:text-base`}>ou clique para selecionar</p>

                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id="file-upload" />
                <label htmlFor="file-upload">
                  <Button variant={darkMode ? "secondary" : "outline"} className="cursor-pointer" asChild>
                    <span>Selecionar Arquivo</span>
                  </Button>
                </label>

                {file && (
                  <Button
                    onClick={handleUpload}
                    disabled={loading}
                    className={`mt-4 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      "Processar PDF"
                    )}
                  </Button>
                )}
                {/* Opção n8n removida a pedido */}
              </div>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {data && (
          <div 
            id="relatorio-pgdasd" 
            ref={contentRef}
            className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative"
            style={{
              backgroundImage: darkMode ? 'none' : 'url(/integra-watermark.svg)',
              backgroundRepeat: darkMode ? 'initial' : 'repeat',
              backgroundSize: darkMode ? 'initial' : '300px 90px',
              backgroundPosition: darkMode ? 'initial' : 'center',
              backgroundAttachment: darkMode ? 'initial' : 'fixed'
            }}
          >

            

            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-xl py-2">
              <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                <div>
                  <p className="text-slate-400 text-xs sm:text-sm">CNPJ</p>
                  <p className="text-base sm:text-lg font-semibold break-words">{data.identificacao.cnpj}</p>
                </div>
                <div className="sm:col-span-2 md:col-span-1">
                  <p className="text-slate-400 text-xs sm:text-sm">Razão Social</p>
                  <p className="text-base sm:text-lg font-semibold break-words">{data.identificacao.razaoSocial}</p>
                </div>
                <div className="sm:col-span-2 md:col-span-1">
                  <p className="text-slate-400 text-xs sm:text-sm">Período</p>
                  <p className="text-base sm:text-lg font-semibold break-words">{data.identificacao.periodoApuracao}</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2">
              {/* Receita Bruta PA - Azul escuro */}
              <Card className="bg-gradient-to-br from-slate-700 to-slate-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 py-2">
                <CardHeader className="pb-1 p-2 sm:p-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs sm:text-sm font-bold">Receita Bruta PA</CardTitle>
                  <DollarSign className="h-4 w-4" />
                </CardHeader>
                <CardContent className="p-2 sm:p-3 pt-0">
                  <p className="text-lg sm:text-2xl font-bold break-words">{formatCurrency(data.receitas.receitaPA)}</p>
                  <p className="text-[10px] sm:text-xs opacity-75 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Período de apuração
                  </p>
                </CardContent>
              </Card>

              {/* Total DAS - Azul médio */}
              <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardHeader className="pb-1 p-2 sm:p-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs sm:text-sm font-bold">Total DAS</CardTitle>
                  <FileText className="h-4 w-4" />
                </CardHeader>
                <CardContent className="p-2 sm:p-3 pt-0">
                  {(() => {
                    // Exibe origem do DAS com a MESMA regra de bucket usada na tabela detalhada
                    const atividadesDbgRaw = (data as any)?.debug?.atividades
                    const atividadesDbgList = Array.isArray(atividadesDbgRaw)
                      ? atividadesDbgRaw
                      : (atividadesDbgRaw && typeof atividadesDbgRaw === 'object' ? Object.values(atividadesDbgRaw) : [])

                    const init = () => ({ IRPJ: 0, CSLL: 0, COFINS: 0, PIS_Pasep: 0, INSS_CPP: 0, ICMS: 0, IPI: 0, ISS: 0 })
                    const sumMercadoriasInterno = init()
                    const sumMercadoriasExterior = init()
                    const sumServicosInterno = init()
                    const sumServicosExterior = init()

                    if (Array.isArray(atividadesDbgList) && atividadesDbgList.length > 0) {
                      for (const atv of atividadesDbgList) {
                        const nomeRaw = String(atv?.name || atv?.nome || "")
                        const trib: any = atv?.tributos || {}
                        const cls = classifyAtividade(nomeRaw)
                        const issVal = parseNumber(trib.iss ?? trib.ISS ?? 0)
                        const icmsVal = parseNumber(trib.icms ?? trib.ICMS ?? 0)
                        const mercado = cls.mercado === 'externo' ? 'externo' : 'interno'
                        const target = ((): typeof sumMercadoriasInterno => {
                          if (issVal > 0 && icmsVal === 0) {
                            return mercado === 'externo' ? sumServicosExterior : sumServicosInterno
                          }
                          if (icmsVal > 0 && issVal === 0) {
                            return mercado === 'externo' ? sumMercadoriasExterior : sumMercadoriasInterno
                          }
                          return cls.tipo === 'servicos'
                            ? (mercado === 'externo' ? sumServicosExterior : sumServicosInterno)
                            : (mercado === 'externo' ? sumMercadoriasExterior : sumMercadoriasInterno)
                        })()

                        target.IRPJ += parseNumber(trib.irpj ?? trib.IRPJ ?? 0)
                        target.CSLL += parseNumber(trib.csll ?? trib.CSLL ?? 0)
                        target.COFINS += parseNumber(trib.cofins ?? trib.COFINS ?? 0)
                        target.PIS_Pasep += parseNumber(trib.pis ?? trib.PIS ?? trib.pis_pasep ?? trib.PIS_PASEP ?? trib["PIS/PASEP"] ?? trib.PIS_Pasep ?? 0)
                        target.INSS_CPP += parseNumber(trib.inss_cpp ?? trib.INSS_CPP ?? trib["INSS/CPP"] ?? 0)
                        target.ICMS += parseNumber(trib.icms ?? trib.ICMS ?? 0)
                        target.IPI += parseNumber(trib.ipi ?? trib.IPI ?? 0)
                        target.ISS += parseNumber(trib.iss ?? trib.ISS ?? 0)
                      }
                    }

                    // Totais por origem agregando interno + externo
                    const sumBucket = (b: ReturnType<typeof init>) => b.IRPJ + b.CSLL + b.COFINS + b.PIS_Pasep + b.INSS_CPP + b.ICMS + b.IPI + b.ISS
                    const mercadoriasDbg = sumBucket(sumMercadoriasInterno) + sumBucket(sumMercadoriasExterior)
                    const servicosDbg = sumBucket(sumServicosInterno) + sumBucket(sumServicosExterior)

                    const mercadoriasAt = Number(data.atividades?.atividade1?.Total || 0)
                    const servicosAt = Number(data.atividades?.atividade2?.Total || 0)
                    // Preferimos os buckets calculados do debug quando existem; senão caímos para atividadeX.Total
                    const mercadoriasTotal = mercadoriasDbg > 0 ? mercadoriasDbg : mercadoriasAt
                    const servicosTotal = servicosDbg > 0 ? servicosDbg : servicosAt

                    const anyBadge = (mercadoriasTotal > 0 || servicosTotal > 0)
                    if (!anyBadge) return null
                    return (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {servicosTotal > 0 && (
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-white/20 text-white border border-white/30">
                            Serviços: {formatCurrency(servicosTotal)}
                          </span>
                        )}
                        {mercadoriasTotal > 0 && (
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-white/20 text-white border border-white/30">
                            Mercadorias: {formatCurrency(mercadoriasTotal)}
                          </span>
                        )}
                      </div>
                    )
                  })()}
                  <p className="text-lg sm:text-2xl font-bold font-sans break-words">{formatCurrency(data.tributos.Total)}</p>
                  <p className="text-[10px] sm:text-xs opacity-75 mt-1">Valor a pagar</p>
                </CardContent>
              </Card>

              {/* Alíquota Efetiva - Verde */}
              <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardHeader className="pb-1 p-2 sm:p-3">
                  <CardTitle className="text-xs sm:text-sm font-bold">Alíquota Efetiva</CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-3 pt-0">
                  <p className="text-lg sm:text-2xl font-bold font-sans">
                    {(() => {
                      const formatted = data.calculos?.aliquotaEfetivaFormatada ??
                        (data.calculos?.aliquotaEfetiva !== undefined
                          ? (data.calculos.aliquotaEfetiva).toFixed(5).replace('.', ',')
                          : "0,00000")
                      return formatted.includes('%') ? formatted : `${formatted}%`
                    })()}
                  </p>
                  <p className="text-[10px] sm:text-xs opacity-75 mt-1">DAS / Receita PA</p>
                </CardContent>
              </Card>

              {/* Margem Líquida - Roxo */}
              <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 py-2">
                <CardHeader className="pb-1 p-2 sm:p-3">
                  <CardTitle className="text-xs sm:text-sm font-bold">Margem Líquida</CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-3 pt-0">
                  <p className="text-lg sm:text-2xl font-bold font-sans">{(data.calculos?.margemLiquida || data.calculos?.margemLiquidaPercent || 0).toFixed(3)}%</p>
                  <p className="text-[10px] sm:text-xs opacity-75 mt-1">Receita após impostos</p>
                </CardContent>
              </Card>
            </div>

            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-800'} shadow-lg`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 text-base sm:text-lg ${darkMode ? 'text-white' : ''}`}>
                  <DollarSign className={`h-4 w-4 sm:h-5 sm:w-5 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  Discriminativo de Receitas
                </CardTitle>
                <CardDescription className={`text-xs sm:text-sm ${darkMode ? 'text-slate-300' : ''}`}>
                  Detalhamento completo das receitas conforme PGDASD
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Preferir valores do debug (secao21) quando presentes; fallback para dados já normalizados
                  const pickRow = (totalRaw: number | undefined, meRaw: number | undefined, dbg?: { mi?: number; me?: number; total?: number }) => {
                    const dTotal = Number(dbg?.total) || 0
                    const dMi = Number(dbg?.mi) || 0
                    const dMe = Number(dbg?.me) || 0
                    const tCandidate = Number(totalRaw) || 0
                    const t = dTotal > 0 ? dTotal : tCandidate
                    let me = dMe > 0 ? dMe : (Number(meRaw) || 0)
                    if (!isFinite(me) || me < 0 || me > t) me = 0
                    const mi = dMi > 0 ? dMi : Math.max(t - me, 0)
                    return { mi, me, total: t }
                  }

                  const rpa = pickRow(
                    data.receitas.receitaPA,
                    data.receitas.mercadoExterno?.rpa,
                    data.debug?.secao21?.rpaRow
                  )
                  const rbt12 = pickRow(
                    data.receitas.rbt12,
                    data.receitas.mercadoExterno?.rbt12,
                    data.debug?.secao21?.rbt12Row
                  )
                  const rba = pickRow(
                    data.receitas.rba,
                    data.receitas.mercadoExterno?.rba,
                    data.debug?.secao21?.rbaRow
                  )
                  const rbaa = pickRow(
                    data.receitas.rbaa,
                    data.receitas.mercadoExterno?.rbaa,
                    data.debug?.secao21?.rbaaRow
                  )
                  const rbt12p = pickRow(
                    (data as any)?.receitas?.rbt12p,
                    (data as any)?.receitas?.mercadoExterno?.rbt12p,
                    (data as any)?.debug?.secao21?.rbt12pRow
                  )
                  ;(data as any).__rows = { rpa, rbt12, rbt12p, rba, rbaa }
                  return null
                })()}
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className={`${darkMode ? 'border-b-2 border-slate-700' : 'border-b-2 border-slate-200'}`}>
                          <th className={`text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                            Local de Receitas (R$)
                          </th>
                          <th className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                            Mercado Interno
                          </th>
                          {/* Exibir coluna Mercado Externo apenas se houver valores */}
                          {(((data as any).__rows?.rpa.me || 0) > 0
                            || ((data as any).__rows?.rbt12.me || 0) > 0
                            || ((data as any).__rows?.rbt12p?.me || 0) > 0
                            || ((data as any).__rows?.rba.me || 0) > 0
                            || ((data as any).__rows?.rbaa.me || 0) > 0) && (
                            <th className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                              Mercado Externo
                            </th>
                          )}
                          <th className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold ${darkMode ? 'text-slate-200 bg-slate-800' : 'text-slate-700 bg-slate-50'}`}>
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className={`${darkMode ? 'border-b border-slate-700 hover:bg-slate-800' : 'border-b border-slate-100 hover:bg-slate-50'} transition-colors`}>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">
                            Receita Bruta do PA (RPA) - Competência
                          </td>
                          <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                            {formatCurrency(((data as any).__rows?.rpa.mi) || 0)}
                          </td>
                          {(((data as any).__rows?.rpa.me || 0) > 0) && (
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                              {formatCurrency(((data as any).__rows?.rpa.me) || 0)}
                            </td>
                          )}
                          <td className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold whitespace-nowrap ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
                            {formatCurrency(((data as any).__rows?.rpa.total) || 0)}
                          </td>
                        </tr>
                        <tr className={`${darkMode ? 'border-b border-slate-700 hover:bg-slate-800' : 'border-b border-slate-100 hover:bg-slate-50'} transition-colors`}>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">
                            Receita bruta acumulada nos doze meses anteriores ao PA (RBT12)
                          </td>
                          <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                            {formatCurrency(((data as any).__rows?.rbt12.mi) || 0)}
                          </td>
                          {(((data as any).__rows?.rbt12.me || 0) > 0) && (
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                              {formatCurrency(((data as any).__rows?.rbt12.me) || 0)}
                            </td>
                          )}
                          <td className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold whitespace-nowrap ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
                            {formatCurrency(((data as any).__rows?.rbt12.total) || 0)}
                          </td>
                        </tr>
                        {(((data as any).__rows?.rbt12p?.total || 0) > 0) && (
                          <tr className={`${darkMode ? 'border-b border-slate-700 hover:bg-slate-800' : 'border-b border-slate-100 hover:bg-slate-50'} transition-colors`}>
                            <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">
                              Receita bruta acumulada nos doze meses anteriores ao PA proporcionalizada (RBT12p)
                            </td>
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                              {formatCurrency(((data as any).__rows?.rbt12p.mi) || 0)}
                            </td>
                            {(((data as any).__rows?.rbt12p.me || 0) > 0) && (
                              <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                                {formatCurrency(((data as any).__rows?.rbt12p.me) || 0)}
                              </td>
                            )}
                            <td className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold whitespace-nowrap ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
                              {formatCurrency(((data as any).__rows?.rbt12p.total) || 0)}
                            </td>
                          </tr>
                        )}
                        <tr className={`${darkMode ? 'border-b border-slate-700 hover:bg-slate-800' : 'border-b border-slate-100 hover:bg-slate-50'} transition-colors`}>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">
                            Receita bruta acumulada no ano-calendário corrente (RBA)
                          </td>
                          <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                            {formatCurrency(((data as any).__rows?.rba.mi) || 0)}
                          </td>
                          {(((data as any).__rows?.rba.me || 0) > 0) && (
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                              {formatCurrency(((data as any).__rows?.rba.me) || 0)}
                            </td>
                          )}
                          <td className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold whitespace-nowrap ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
                            {formatCurrency(((data as any).__rows?.rba.total) || 0)}
                          </td>
                        </tr>
                        <tr className={`${darkMode ? 'border-b border-slate-700 hover:bg-slate-800' : 'border-b border-slate-100 hover:bg-slate-50'} transition-colors`}>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">
                            Receita bruta acumulada no ano-calendário anterior (RBAA)
                          </td>
                          <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                            {formatCurrency(((data as any).__rows?.rbaa.mi) || 0)}
                          </td>
                          {(((data as any).__rows?.rbaa.me || 0) > 0) && (
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                              {formatCurrency(((data as any).__rows?.rbaa.me) || 0)}
                            </td>
                          )}
                          <td className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold whitespace-nowrap ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
                            {formatCurrency(((data as any).__rows?.rbaa.total) || 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-2 sm:mt-3 grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-2 pt-2 border-t border-slate-200">
                  <div className="bg-blue-50 rounded-lg p-2 sm:p-3">
                <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>Utilização do Limite</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900">
                      {((data.receitas.rba / (data.receitas.limite || 4800000)) * 100).toFixed(1)}%
                    </p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>RBA / Limite</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2 sm:p-3">
                    <p className="text-xs text-emerald-600 font-medium mb-1">Comparativo de Crescimento</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-900">
                      {(() => {
                        const serieBase = (data.graficos?.receitaLine?.values
                          || data.graficos?.receitaMensal?.values
                          || []) as any[]
                        const valores = Array.isArray(serieBase) ? serieBase.map((v: any) => Number(v) || 0) : []
                        const n = valores.length
                        let pct = 0
                        if (n >= 6) {
                          const first3 = valores.slice(0, 3).reduce((a, b) => a + b, 0)
                          const last3 = valores.slice(n - 3).reduce((a, b) => a + b, 0)
                          pct = first3 > 0 ? ((last3 - first3) / first3) * 100 : 0
                        } else if (n >= 2) {
                          const mid = Math.floor(n / 2)
                          const first = valores.slice(0, mid).reduce((a, b) => a + b, 0)
                          const last = valores.slice(mid).reduce((a, b) => a + b, 0)
                          pct = first > 0 ? ((last - first) / first) * 100 : 0
                        } else {
                          pct = data.receitas.rbaa > 0
                            ? ((data.receitas.rba - data.receitas.rbaa) / data.receitas.rbaa) * 100
                            : 0
                        }
                        return pct.toFixed(1)
                      })()}
                      %
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">3 últimos vs 3 primeiros</p>
                  </div>
                  {/* Último mês vs média dos últimos 3 meses */}
                  <div className="bg-indigo-50 rounded-lg p-2 sm:p-3">
                <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>Último mês vs média trimestral</p>
                    <p className="text-xl sm:text-2xl font-bold text-indigo-900">
                      {(() => {
                        const serieBase = (data.graficos?.receitaLine?.values
                          || data.graficos?.receitaMensal?.values
                          || []) as any[]
                        const valores = Array.isArray(serieBase) ? serieBase.map((v: any) => Number(v) || 0) : []
                        const n = valores.length
                        if (n === 0) return '0.0'
                        const last = valores[n - 1]
                        const last3 = valores.slice(Math.max(0, n - 3))
                        const avg3 = last3.length > 0 ? last3.reduce((a, b) => a + b, 0) / last3.length : 0
                        const pct = avg3 > 0 ? ((last - avg3) / avg3) * 100 : 0
                        return pct.toFixed(1)
                      })()}
                      %
                    </p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>Variação do último mês vs média 3 meses</p>
                  </div>
                  {/* Consistência: coeficiente de variação últimos 6 meses */}
                  <div
                    className="bg-amber-50 rounded-lg p-2 sm:p-3 cursor-pointer hover:bg-amber-100 transition"
                    role="button"
                    onClick={() => setShowConsistencyDetails(v => !v)}
                    aria-label="Abrir detalhamento de consistência"
                  >
                    <p className="text-xs text-amber-600 font-medium mb-1">Consistência</p>
                    <p className="text-xl sm:text-2xl font-bold text-amber-900">
                      {(() => {
                        const serieBase = (data.graficos?.receitaLine?.values
                          || data.graficos?.receitaMensal?.values
                          || []) as any[]
                        const valores = Array.isArray(serieBase) ? serieBase.map((v: any) => Number(v) || 0) : []
                        const n = valores.length
                        const last6 = valores.slice(Math.max(0, n - 6))
                        if (last6.length < 2) return '0.0'
                        const mean = last6.reduce((a, b) => a + b, 0) / last6.length
                        const variance = last6.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / last6.length
                        const sd = Math.sqrt(variance)
                        const cv = mean > 0 ? (sd / mean) * 100 : 0
                        return cv.toFixed(1)
                      })()}
                      %
                    </p>
                    <p className="text-xs text-amber-600 mt-1">CV últimos 6 meses (↓ estável)</p>
                  </div>
                  
                </div>

                {showConsistencyDetails && (
                  <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg mt-3 sm:mt-4 p-3 sm:p-4`}> 
                    {(() => {
                      const base = (data.graficos?.receitaLine || data.graficos?.receitaMensal)
                      const labels = base?.labels || []
                      const values = base?.values || []
                      const n = values.length
                      const last6IdxStart = Math.max(0, n - 6)
                      const rows = labels.slice(last6IdxStart).map((label, i) => {
                        const v = Number(values[last6IdxStart + i] || 0)
                        return { mes: label, valor: v }
                      })
                      const mean = rows.length > 0 ? rows.reduce((a, b) => a + b.valor, 0) / rows.length : 0
                      const variance = rows.length > 0 ? rows.reduce((acc, r) => acc + Math.pow(r.valor - mean, 2), 0) / rows.length : 0
                      const sd = Math.sqrt(variance)
                      return (
                        <div className="space-y-3">
                          <div className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            CV = desvio padrão / média × 100. Valores menores indicam maior estabilidade.
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr>
                                  <th className={`text-left py-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Mês</th>
                                  <th className={`text-right py-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((r, idx) => (
                                  <tr key={`cv-row-${idx}`} className={`${darkMode ? 'border-slate-700' : 'border-slate-200'} border-t`}>
                                    <td className={`py-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{r.mes}</td>
                                    <td className={`py-2 text-right font-medium ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(r.valor)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className={`${darkMode ? 'bg-slate-700' : 'bg-slate-100'} rounded-md p-2`}>
                              <div className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Média</div>
                              <div className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(mean)}</div>
                            </div>
                            <div className={`${darkMode ? 'bg-slate-700' : 'bg-slate-100'} rounded-md p-2`}>
                              <div className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Desvio-padrão</div>
                              <div className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(sd)}</div>
                            </div>
                            <div className={`${darkMode ? 'bg-slate-700' : 'bg-slate-100'} rounded-md p-2`}>
                              <div className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>CV (%)</div>
                              <div className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{(() => { const cv = mean > 0 ? (sd/mean)*100 : 0; return cv.toFixed(1) })()}%</div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bloco "Operação Mista" removido conforme solicitação */}

            {data.graficos && (data.graficos.tributosBar || data.graficos.totalTributos) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 print:contents">

                

                {(data.graficos.receitaLine || data.graficos.receitaMensal) && (
                  <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border border-slate-200'} shadow-lg hover:shadow-xl transition-all duration-200 md:col-span-2 print:inline-block print:w-1/3 print:align-top print:break-inside-avoid`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div>
                        <CardTitle className={`text-base sm:text-lg flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          <TrendingUp className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                          Receita Mensal (R$)
                        </CardTitle>
                        <CardDescription className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Evolução de Receitas - Histórico mensal simplificado
                        </CardDescription>
                      </div>
                      {/* Botão de exportação movido para o final do relatório */}
                    </CardHeader>
                    <CardContent>
                      <div id="chart-receita-mensal" className="relative">
                        {/* Overlay sombreado cobrindo toda a área do gráfico (mais claro) */}
                        <div className={`absolute inset-0 rounded-xl ${darkMode ? 'bg-slate-700/15' : 'bg-slate-100/30'} pointer-events-none`} />
                        <div className="h-[350px] print:h-[260px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                        {(() => {
                          const base = (data.graficos!.receitaLine || data.graficos!.receitaMensal)!
                          const me = data.graficos!.receitaLineExterno
                          const miLabels = base.labels || []
                          const miValues = base.values || []
                          const meMap = new Map<string, { v: number; s?: string }>()
                          if (me && Array.isArray(me.labels)) {
                            me.labels.forEach((l: string, i: number) => {
                              meMap.set(String(l), { v: Number(me.values?.[i] || 0), s: me.valuesFormatados?.[i] })
                            })
                          }
                          // Escala comum: calcular limites iguais para MI e ME
                          const miValuesNumeric = miValues.map((v: any) => Number(v) || 0)
                          const meValuesAligned = miLabels.map((l: string) => (meMap.get(String(l))?.v ?? 0))
                          const miMax = Math.max(0, ...miValuesNumeric)
                          const meMax = Math.max(0, ...meValuesAligned)
                          const miMin = Math.min(...miValuesNumeric, miMax)
                          const meMin = Math.min(...meValuesAligned, meMax)
                          const rawMin = Math.min(miMin, meMin)
                          const rawMax = Math.max(miMax, meMax)
                          const range = Math.max(1, rawMax - rawMin)
                          const pad = Math.max(range * 0.35, rawMax * 0.08)
                          const domainMin = Math.max(0, rawMin - pad)
                          const domainMax = rawMax + pad
                          const leftDomain = [domainMin, domainMax]
                          const rightDomain = [domainMin, domainMax]

                          // Mapeamento usando valores arredondados a 2 casas para evitar rótulos "0,00"
                          const round2 = (n: number) => Math.round(Number(n || 0) * 100) / 100
                          const chartData = miLabels.map((label: string, idx: number) => {
                            const mi = Number(miValues[idx] || 0)
                            const meItem = meMap.get(String(label))
                            const meV = meItem?.v || 0
                            const miR = round2(mi)
                            const meR = round2(meV)
                            const miFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(miR)
                            const meFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(meR)
                            // Exibir rótulos apenas quando valor arredondado > 0 (seta será desenhada via SVG)
                            const miLabel = miR > 0 ? miFmt : ""
                            const meLabel = meR > 0 ? meFmt : ""
                            return { mes: label, mi: miR, me: meR, miLabel, meLabel }
                          })
                          
                          // Utilitários para evitar sobreposição de rótulos
                          const placedBounds: { x1: number; x2: number; y1: number; y2: number }[] = []
                          const estimateTextWidth = (s: string, fontSize: number) => s.length * (fontSize * 0.6)
                          const overlaps = (a: { x1: number; x2: number; y1: number; y2: number }, b: { x1: number; x2: number; y1: number; y2: number }) => {
                            return !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2)
                          }

                          // Renderer customizado: seta pequena saindo do ponto até o texto
                          const makeArrowLabel = (strokeColor: string, textColor: string) => (props: any) => {
                            const { x, y, value, index } = props
                            const valueStr = String(value ?? "").trim()
                            if (!valueStr || valueStr === "" || valueStr === "0,00" || valueStr === "R$ 0,00" || valueStr === "R$\u00a00,00") return <g key={index} />
                            let spacing = 7
                            const fontSize = 8
                            const pointX = props?.cx ?? x
                            // desloca o texto um pouco menos para a direita (-1px)
                            const textShiftRight = 17
                            let textX = pointX + textShiftRight
                            let labelY = y - spacing
                            const textW = estimateTextWidth(valueStr, fontSize)
                            let bbox = { x1: textX - textW / 2, x2: textX + textW / 2, y1: labelY - fontSize, y2: labelY }
                            
                            // Se a posição acima sair do topo, inverte para baixo mantendo setas dentro da área
                            let arrowUp = true
                            const topClamp = 16
                            if (labelY < topClamp) {
                              labelY = y + spacing
                              arrowUp = false
                              bbox = { x1: textX - textW / 2, x2: textX + textW / 2, y1: labelY - fontSize, y2: labelY }
                            }
                            let tries = 0
                            const hStep = 4
                            // Elevar o rótulo e ajustar horizontalmente enquanto houver sobreposição
                            while (placedBounds.some(b => overlaps(b, bbox)) && tries < 10) {
                              spacing += 7
                              // alterna pequenos deslocamentos horizontais para espalhar rótulos próximos
                              textX += (tries % 2 === 0 ? hStep : -hStep)
                              labelY = arrowUp ? (y - spacing) : (y + spacing)
                              bbox = { x1: textX - textW / 2, x2: textX + textW / 2, y1: labelY - fontSize, y2: labelY }
                              tries++
                            }
                            placedBounds.push(bbox)
                            const endX = textX
                            const endY = arrowUp ? (labelY + 1) : (labelY - 1)
                            return (
                              <g key={index}
                              >
                                {/* haste da seta pequena saindo do ponto */}
                                <line x1={pointX} y1={y} x2={endX} y2={endY} stroke={strokeColor} strokeWidth={1} />
                                {/* cabeça da seta pequena apontando para o texto (reduzida 1px) */}
                                <polyline points={arrowUp ? `${endX-1},${endY+1} ${endX},${endY} ${endX+1},${endY+1}` : `${endX-1},${endY-1} ${endX},${endY} ${endX+1},${endY-1}`} fill="none" stroke={strokeColor} strokeWidth={1} />
                                {/* texto do valor próximo à ponta da seta */}
                                <text x={textX} y={labelY} dy={arrowUp ? -1 : 6} textAnchor="middle" fontSize={fontSize} fill={textColor} style={{ pointerEvents: 'none', paintOrder: 'stroke' }}>{String(valueStr)}</text>
                              </g>
                            )
                          }
                          // Dot condicional: sempre retorna um elemento válido para satisfazer o tipo do Recharts
                          const conditionalDot = (color: string) => (props: any) => {
                            const v = Number(props?.value || 0)
                            const vr = Math.round(v * 100) / 100
                            const key = props?.index ?? `${props?.cx}-${props?.cy}-${color}`
                            if (vr === 0) {
                              // elemento "invisível" quando o valor é zero, evitando retorno null
                              return <circle key={key} cx={props.cx} cy={props.cy} r={0} stroke="transparent" fill="transparent" />
                            }
                            return <circle key={key} cx={props.cx} cy={props.cy} r={3} stroke="#0891b2" strokeWidth={1} fill={color} />
                          }
                          return (
                            <LineChart data={chartData} margin={{ top: 60, right: 60, left: 72, bottom: 28 }}>
                          {/* Grid com linhas horizontais sutis */}
                          <CartesianGrid 
                            strokeDasharray="1 1" 
                            opacity={0.2}
                            horizontal={true}
                            vertical={false}
                            stroke={darkMode ? "#475569" : "#e2e8f0"}
                          />
                          
                          {/* Eixo X com estilo da imagem de referência */}
                          <XAxis 
                            dataKey="mes" 
                            tick={{ 
                              fontSize: 12, 
                              fontWeight: 500,
                              fill: darkMode ? "#94a3b8" : "#64748b"
                            }}
                            tickLine={false}
                            axisLine={{ 
                              stroke: darkMode ? "#475569" : "#cbd5e1", 
                              strokeWidth: 1 
                            }}
                            tickMargin={10}
                          />
                          
                          {/* Eixo Y esquerdo (MI) - domínio comum */}
                          <YAxis 
                            yAxisId="left"
                            tick={{ 
                              fontSize: 12, 
                              fontWeight: 500,
                              fill: darkMode ? "#94a3b8" : "#64748b"
                            }}
                            tickLine={false}
                            axisLine={{ 
                              stroke: darkMode ? "#475569" : "#cbd5e1", 
                              strokeWidth: 1 
                            }}
                            tickMargin={10}
                            domain={leftDomain}
                            tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))}
                          />
                          {/* Eixo Y direito (ME) oculto para liberar espaço visual */}
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            hide
                            domain={rightDomain}
                            allowDataOverflow={false}
                          />
                          
                          {/* Tooltip aprimorado */}
                          <Tooltip 
                            formatter={(value, name, item: any) => {
                              const labelName = String(name)
                              // Garantir que tooltip mostre o valor real (não o epsilon) para ME
                              const vReal = labelName.includes('Externo') ? Number(item?.payload?.me ?? 0) : Number(item?.payload?.mi ?? 0)
                              return [formatCurrency(vReal), labelName]
                            }}
                            labelFormatter={(label) => `Mês: ${label}`}
                            contentStyle={{ 
                              borderRadius: "12px", 
                              backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                              border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                              fontSize: "13px",
                              fontWeight: "500"
                            }}
                            labelStyle={{ 
                              fontWeight: "600",
                              color: darkMode ? "#f1f5f9" : "#1e293b"
                            }}
                          />
                          <Legend />
                          {/* Linhas visíveis sem LabelList para permitir rótulos sobrepostos acima */}
                          <Line yAxisId="left" type="monotone" dataKey="mi" stroke="#2563eb" strokeWidth={3} dot={conditionalDot('#06b6d4')} activeDot={{ r: 5 }} name="Mercado Interno (MI)" />
                          <Line yAxisId="right" type="monotone" dataKey="me" stroke="#06b6d4" strokeWidth={3.5} dot={conditionalDot('#06b6d4')} activeDot={{ r: 5 }} name="Mercado Externo (ME)" />

                          {/* Camada de rótulos ao topo: Lines transparentes apenas para LabelList */}
                          <Line yAxisId="left" type="monotone" dataKey="mi" stroke="transparent" strokeWidth={0} dot={false} activeDot={false} name="MI Labels">
                            <LabelList
                              dataKey="miLabel"
                              content={makeArrowLabel(darkMode ? '#60a5fa' : '#1e40af', darkMode ? '#93c5fd' : '#1e40af')}
                            />
                          </Line>
                          <Line yAxisId="right" type="monotone" dataKey="me" stroke="transparent" strokeWidth={0} dot={false} activeDot={false} name="ME Labels">
                            <LabelList
                              dataKey="meLabel"
                              content={makeArrowLabel(darkMode ? '#22d3ee' : '#0284c7', darkMode ? '#22d3ee' : '#0284c7')}
                            />
                          </Line>
                          {/* Mantém os overlays customizados abaixo */}
                          </LineChart>
                          )
                        })()}
                        
                          </ResponsiveContainer>
                        </div>
                        </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Relatório de Debug (n8n / Parsing) removido */}

            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border border-slate-200'} shadow-lg hover:shadow-xl transition-all duration-200`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className={`text-base sm:text-lg flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    <TrendingUp className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    Detalhamento dos Tributos
                  </CardTitle>
                  <CardDescription className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Composição do DAS por categoria e tributo
                  </CardDescription>
                </div>
                {/* Botão de exportação removido conforme solicitado */}
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      {(() => {
                        // Cabeçalho deve seguir a mesma regra das linhas:
                        // - Não mostrar coluna se tudo for 0
                        // - Mostrar a coluna inteira se qualquer imposto tiver valor
                        const tribKeys = [
                          { key: "IRPJ", label: "IRPJ" },
                          { key: "CSLL", label: "CSLL" },
                          { key: "COFINS", label: "COFINS" },
                          { key: "PIS_Pasep", label: "PIS/PASEP" },
                          { key: "INSS_CPP", label: "INSS/CPP" },
                          { key: "ICMS", label: "ICMS" },
                          { key: "IPI", label: "IPI" },
                          { key: "ISS", label: "ISS" },
                        ] as const

                        const init = () => ({ IRPJ: 0, CSLL: 0, COFINS: 0, PIS_Pasep: 0, INSS_CPP: 0, ICMS: 0, IPI: 0, ISS: 0 })
                        const sumMercadoriasInterno = init()
                        const sumMercadoriasExterior = init()
                        const sumServicosInterno = init()
                        const sumServicosExterior = init()

                        const atividadesDbgRaw = (data as any)?.debug?.atividades
                        const atividadesDbgList = Array.isArray(atividadesDbgRaw)
                          ? atividadesDbgRaw
                          : (atividadesDbgRaw && typeof atividadesDbgRaw === 'object' ? Object.values(atividadesDbgRaw) : [])

                        if (Array.isArray(atividadesDbgList) && atividadesDbgList.length > 0) {
                          for (const atv of atividadesDbgList) {
                            const nomeRaw = String(atv?.name || atv?.nome || '')
                            const trib: any = atv?.tributos || {}
                            const sum = [trib.irpj, trib.csll, trib.cofins, trib.pis, trib.pis_pasep, trib.inss_cpp, trib.icms, trib.ipi, trib.iss]
                              .map((v) => Number(v || 0))
                              .reduce((a, b) => a + b, 0)
                            if (sum > 0) {
                              const cls = classifyAtividade(nomeRaw)
                              const issVal = Number(trib.iss ?? trib.ISS ?? 0)
                              const icmsVal = Number(trib.icms ?? trib.ICMS ?? 0)
                              const mercado = cls.mercado === 'externo' ? 'externo' : 'interno'
                              const target = ((): typeof sumMercadoriasInterno => {
                                if (issVal > 0 && icmsVal === 0) {
                                  return mercado === 'externo' ? sumServicosExterior : sumServicosInterno
                                }
                                if (icmsVal > 0 && issVal === 0) {
                                  return mercado === 'externo' ? sumMercadoriasExterior : sumMercadoriasInterno
                                }
                                return cls.tipo === 'servicos'
                                  ? (mercado === 'externo' ? sumServicosExterior : sumServicosInterno)
                                  : (mercado === 'externo' ? sumMercadoriasExterior : sumMercadoriasInterno)
                              })()
                              target.IRPJ += Number(trib.irpj || 0)
                              target.CSLL += Number(trib.csll || 0)
                              target.COFINS += Number(trib.cofins || 0)
                              target.PIS_Pasep += Number(trib.pis ?? trib.pis_pasep ?? 0)
                              target.INSS_CPP += Number(trib.inss_cpp || 0)
                              target.ICMS += Number(trib.icms || 0)
                              target.IPI += Number(trib.ipi || 0)
                              target.ISS += Number(trib.iss || 0)
                            }
                          }
                        } else {
                          // Fallback: sem atividades, aloca tudo conforme cenário
                          const cenario = String((data as any)?.cenario || '').toLowerCase()
                          const assignToServicos = cenario.includes('serv')
                          const src = (data as any)?.tributos || {}
                          const target = assignToServicos ? sumServicosInterno : sumMercadoriasInterno
                          target.IRPJ = Number(src.IRPJ || 0)
                          target.CSLL = Number(src.CSLL || 0)
                          target.COFINS = Number(src.COFINS || 0)
                          target.PIS_Pasep = Number(src.PIS_Pasep || 0)
                          target.INSS_CPP = Number(src.INSS_CPP || 0)
                          target.ICMS = Number(src.ICMS || 0)
                          target.IPI = Number(src.IPI || 0)
                          target.ISS = Number(src.ISS || 0)
                        }

                        const colMercadoriasInternoVisible = tribKeys.some(k => (sumMercadoriasInterno as any)[k.key] > 0)
                        const colMercadoriasExteriorVisible = tribKeys.some(k => (sumMercadoriasExterior as any)[k.key] > 0)
                        const colServicosInternoVisible = tribKeys.some(k => (sumServicosInterno as any)[k.key] > 0)
                        const colServicosExteriorVisible = tribKeys.some(k => (sumServicosExterior as any)[k.key] > 0)

                        return (
                          <tr className="border-b border-slate-200">
                            <th className={`text-left py-3 px-2 font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Tributo</th>
                            {colMercadoriasInternoVisible && (
                          <th className={`text-center py-3 px-2 font-semibold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>Mercadorias (interno)</th>
                            )}
                            {colMercadoriasExteriorVisible && (
                          <th className={`text-center py-3 px-2 font-semibold ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>Mercadorias (externo)</th>
                            )}
                            {colServicosInternoVisible && (
                              <th className={`text-center py-3 px-2 font-semibold text-emerald-600`}>Serviços (interno)</th>
                            )}
                            {colServicosExteriorVisible && (
                              <th className={`text-center py-3 px-2 font-semibold text-teal-600`}>Serviços (externo)</th>
                            )}
                            <th className={`text-center py-3 px-2 font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Total</th>
                          </tr>
                        )
                      })()}
                    </thead>
                    <tbody>
                      {(() => {
                        const tribKeys = [
                          { key: "IRPJ", label: "IRPJ" },
                          { key: "CSLL", label: "CSLL" },
                          { key: "COFINS", label: "COFINS" },
                          { key: "PIS_Pasep", label: "PIS/PASEP" },
                          { key: "INSS_CPP", label: "INSS/CPP" },
                          { key: "ICMS", label: "ICMS" },
                          { key: "IPI", label: "IPI" },
                          { key: "ISS", label: "ISS" },
                        ] as const

                        const init = () => ({ IRPJ: 0, CSLL: 0, COFINS: 0, PIS_Pasep: 0, INSS_CPP: 0, ICMS: 0, IPI: 0, ISS: 0 })
                        const sumMercadoriasInterno = init()
                        const sumMercadoriasExterior = init()
                        const sumServicosInterno = init()
                        const sumServicosExterior = init()

                        const parcelasTotaisDeclaradoRaw = (data as any)?.debug?.parcelas?.totais?.declarado
                        const totalDeclarado = parseNumber(parcelasTotaisDeclaradoRaw?.total ?? parcelasTotaisDeclaradoRaw?.Total ?? 0)
                        // Totais declarados das parcelas (fallback para coluna Total)
                        const totDeclarado = parcelasTotaisDeclaradoRaw ? {
                          IRPJ: parseNumber(parcelasTotaisDeclaradoRaw.irpj ?? parcelasTotaisDeclaradoRaw.IRPJ ?? 0),
                          CSLL: parseNumber(parcelasTotaisDeclaradoRaw.csll ?? parcelasTotaisDeclaradoRaw.CSLL ?? 0),
                          COFINS: parseNumber(parcelasTotaisDeclaradoRaw.cofins ?? parcelasTotaisDeclaradoRaw.COFINS ?? 0),
                          PIS_Pasep: parseNumber(parcelasTotaisDeclaradoRaw.pis ?? parcelasTotaisDeclaradoRaw.PIS ?? parcelasTotaisDeclaradoRaw.pis_pasep ?? parcelasTotaisDeclaradoRaw.PIS_PASEP ?? parcelasTotaisDeclaradoRaw['PIS/PASEP'] ?? 0),
                          INSS_CPP: parseNumber(parcelasTotaisDeclaradoRaw.inss_cpp ?? parcelasTotaisDeclaradoRaw.INSS_CPP ?? parcelasTotaisDeclaradoRaw['INSS/CPP'] ?? 0),
                          ICMS: parseNumber(parcelasTotaisDeclaradoRaw.icms ?? parcelasTotaisDeclaradoRaw.ICMS ?? 0),
                          IPI: parseNumber(parcelasTotaisDeclaradoRaw.ipi ?? parcelasTotaisDeclaradoRaw.IPI ?? 0),
                          ISS: parseNumber(parcelasTotaisDeclaradoRaw.iss ?? parcelasTotaisDeclaradoRaw.ISS ?? 0),
                          Total: parseNumber(parcelasTotaisDeclaradoRaw.total ?? parcelasTotaisDeclaradoRaw.Total ?? 0)
                        } : undefined

                        const atividadesDbgRaw = (data as any)?.debug?.atividades
                        const atividadesDbgList = Array.isArray(atividadesDbgRaw)
                          ? atividadesDbgRaw
                          : (atividadesDbgRaw && typeof atividadesDbgRaw === 'object' ? Object.values(atividadesDbgRaw) : [])

                        if (Array.isArray(atividadesDbgList) && atividadesDbgList.length > 0) {
                          for (const atv of atividadesDbgList) {
                            const nomeRaw = String(atv?.name || atv?.nome || "")
                            const trib: any = atv?.tributos || {}
                            const cls = classifyAtividade(nomeRaw)
                            const issVal = parseNumber(trib.iss ?? trib.ISS ?? 0)
                            const icmsVal = parseNumber(trib.icms ?? trib.ICMS ?? 0)
                            const mercado = cls.mercado === 'externo' ? 'externo' : 'interno'
                            const target = ((): typeof sumMercadoriasInterno => {
                              if (issVal > 0 && icmsVal === 0) {
                                return mercado === 'externo' ? sumServicosExterior : sumServicosInterno
                              }
                              if (icmsVal > 0 && issVal === 0) {
                                return mercado === 'externo' ? sumMercadoriasExterior : sumMercadoriasInterno
                              }
                              return cls.tipo === 'servicos'
                                ? (mercado === 'externo' ? sumServicosExterior : sumServicosInterno)
                                : (mercado === 'externo' ? sumMercadoriasExterior : sumMercadoriasInterno)
                            })()

                            target.IRPJ += parseNumber(trib.irpj ?? trib.IRPJ ?? 0)
                            target.CSLL += parseNumber(trib.csll ?? trib.CSLL ?? 0)
                            target.COFINS += parseNumber(trib.cofins ?? trib.COFINS ?? 0)
                            target.PIS_Pasep += parseNumber(trib.pis ?? trib.PIS ?? trib.pis_pasep ?? trib.PIS_PASEP ?? trib["PIS/PASEP"] ?? trib.PIS_Pasep ?? 0)
                            target.INSS_CPP += parseNumber(trib.inss_cpp ?? trib.INSS_CPP ?? trib["INSS/CPP"] ?? 0)
                            target.ICMS += parseNumber(trib.icms ?? trib.ICMS ?? 0)
                            target.IPI += parseNumber(trib.ipi ?? trib.IPI ?? 0)
                            target.ISS += parseNumber(trib.iss ?? trib.ISS ?? 0)
                          }
                        } else {
                          // Fallback: se não houver atividades, usa cenário para alocar tudo em uma coluna
                          const cenario = String(data.cenario || "").toLowerCase()
                          const assignToServicos = cenario.includes("serv")
                          const src = data.tributos
                          const target = assignToServicos ? sumServicosInterno : sumMercadoriasInterno
                          target.IRPJ = src.IRPJ || 0
                          target.CSLL = src.CSLL || 0
                          target.COFINS = src.COFINS || 0
                          target.PIS_Pasep = src.PIS_Pasep || 0
                          target.INSS_CPP = src.INSS_CPP || 0
                          target.ICMS = src.ICMS || 0
                          target.IPI = src.IPI || 0
                          target.ISS = src.ISS || 0
                        }

                        const rows = tribKeys.map(({ key, label }) => {
                          const mercadoriasInterno = (sumMercadoriasInterno as any)[key] || 0
                          const mercadoriasExterior = (sumMercadoriasExterior as any)[key] || 0
                          const servicosInterno = (sumServicosInterno as any)[key] || 0
                          const servicosExterior = (sumServicosExterior as any)[key] || 0
                          const totalDbg = mercadoriasInterno + mercadoriasExterior + servicosInterno + servicosExterior
                          const totalNorm = (data.tributos as any)[key] || 0
                          const totalDecl = totDeclarado ? (totDeclarado as any)[key === 'PIS_Pasep' ? 'PIS_Pasep' : key] || 0 : 0
                          const total = totalDecl > 0 ? totalDecl : (totalDbg > 0 ? totalDbg : totalNorm)
                          return { key, label, mercadoriasInterno, mercadoriasExterior, servicosInterno, servicosExterior, total }
                        }).filter(r => r.total > 0 || r.mercadoriasInterno > 0 || r.mercadoriasExterior > 0 || r.servicosInterno > 0 || r.servicosExterior > 0)
                        const colMercadoriasInternoVisible = tribKeys.some(k => (sumMercadoriasInterno as any)[k.key] > 0)
                        const colMercadoriasExteriorVisible = tribKeys.some(k => (sumMercadoriasExterior as any)[k.key] > 0)
                        const colServicosInternoVisible = tribKeys.some(k => (sumServicosInterno as any)[k.key] > 0)
                        const colServicosExteriorVisible = tribKeys.some(k => (sumServicosExterior as any)[k.key] > 0)

                        if (rows.length === 0) {
                          const colSpan = 1 + (colMercadoriasInternoVisible ? 1 : 0) + (colMercadoriasExteriorVisible ? 1 : 0) + (colServicosInternoVisible ? 1 : 0) + (colServicosExteriorVisible ? 1 : 0) + 1
                          return [
                            (
                              <tr key="none" className="border-b border-slate-100">
                                <td colSpan={colSpan} className={`py-2 px-2 text-center ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Nenhum tributo aplicável</td>
                              </tr>
                            )
                          ]
                        }

                        return rows.map(({ key, label, mercadoriasInterno, mercadoriasExterior, servicosInterno, servicosExterior, total }) => (
                          <tr key={key} className="border-b border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800">
                            <td className={`py-2 px-2 font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{label}</td>
                            {colMercadoriasInternoVisible && (
                          <td className={`py-2 px-2 text-center font-medium ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{mercadoriasInterno > 0 ? formatCurrency(mercadoriasInterno) : ""}</td>
                            )}
                            {colMercadoriasExteriorVisible && (
                          <td className={`py-2 px-2 text-center font-medium ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{mercadoriasExterior > 0 ? formatCurrency(mercadoriasExterior) : ""}</td>
                            )}
                            {colServicosInternoVisible && (
                              <td className="py-2 px-2 text-center text-emerald-600 font-medium">{servicosInterno > 0 ? formatCurrency(servicosInterno) : ""}</td>
                            )}
                            {colServicosExteriorVisible && (
                              <td className="py-2 px-2 text-center text-teal-600 font-medium">{servicosExterior > 0 ? formatCurrency(servicosExterior) : ""}</td>
                            )}
                            <td className={`py-2 px-2 text-center font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{formatCurrency(total)}</td>
                          </tr>
                        ))
                      })()}
                      {(() => {
                        // Recalcula totais a partir das linhas já construídas (usando debug quando possível)
                        const tribKeys = ["IRPJ","CSLL","COFINS","PIS_Pasep","INSS_CPP","ICMS","IPI","ISS"] as const

                        const init = () => ({ IRPJ: 0, CSLL: 0, COFINS: 0, PIS_Pasep: 0, INSS_CPP: 0, ICMS: 0, IPI: 0, ISS: 0 })
                        const sumMercadoriasInterno = init()
                        const sumMercadoriasExterior = init()
                        const sumServicosInterno = init()
                        const sumServicosExterior = init()

                        const atividadesDbgRaw = (data as any)?.debug?.atividades
                        const atividadesDbgList = Array.isArray(atividadesDbgRaw)
                          ? atividadesDbgRaw
                          : (atividadesDbgRaw && typeof atividadesDbgRaw === 'object' ? Object.values(atividadesDbgRaw) : [])
                        if (Array.isArray(atividadesDbgList) && atividadesDbgList.length > 0) {
                          for (const atv of atividadesDbgList) {
                            const nomeRaw = String(atv?.name || atv?.nome || "")
                            const trib: any = atv?.tributos || {}
                            const cls = classifyAtividade(nomeRaw)
                            const issVal = parseNumber(trib.iss ?? trib.ISS ?? 0)
                            const icmsVal = parseNumber(trib.icms ?? trib.ICMS ?? 0)
                            const mercado = cls.mercado === 'externo' ? 'externo' : 'interno'
                            const target = ((): typeof sumMercadoriasInterno => {
                              if (issVal > 0 && icmsVal === 0) {
                                return mercado === 'externo' ? sumServicosExterior : sumServicosInterno
                              }
                              if (icmsVal > 0 && issVal === 0) {
                                return mercado === 'externo' ? sumMercadoriasExterior : sumMercadoriasInterno
                              }
                              return cls.tipo === 'servicos'
                                ? (mercado === 'externo' ? sumServicosExterior : sumServicosInterno)
                                : (mercado === 'externo' ? sumMercadoriasExterior : sumMercadoriasInterno)
                            })()
                            target.IRPJ += parseNumber(trib.irpj ?? trib.IRPJ ?? 0)
                            target.CSLL += parseNumber(trib.csll ?? trib.CSLL ?? 0)
                            target.COFINS += parseNumber(trib.cofins ?? trib.COFINS ?? 0)
                            target.PIS_Pasep += parseNumber(trib.pis ?? trib.PIS ?? trib.pis_pasep ?? trib.PIS_PASEP ?? trib["PIS/PASEP"] ?? trib.PIS_Pasep ?? 0)
                            target.INSS_CPP += parseNumber(trib.inss_cpp ?? trib.INSS_CPP ?? trib["INSS/CPP"] ?? 0)
                            target.ICMS += parseNumber(trib.icms ?? trib.ICMS ?? 0)
                            target.IPI += parseNumber(trib.ipi ?? trib.IPI ?? 0)
                            target.ISS += parseNumber(trib.iss ?? trib.ISS ?? 0)
                          }
                        } else {
                          const cenario = String(data.cenario || "").toLowerCase()
                          const assignToServicos = cenario.includes("serv")
                          const src = data.tributos
                          const target = assignToServicos ? sumServicosInterno : sumMercadoriasInterno
                          target.IRPJ = src.IRPJ || 0
                          target.CSLL = src.CSLL || 0
                          target.COFINS = src.COFINS || 0
                          target.PIS_Pasep = src.PIS_Pasep || 0
                          target.INSS_CPP = src.INSS_CPP || 0
                          target.ICMS = src.ICMS || 0
                          target.IPI = src.IPI || 0
                          target.ISS = src.ISS || 0
                        }

                        const totalMercadoriasInterno = tribKeys.reduce((sum, k) => sum + (sumMercadoriasInterno as any)[k], 0)
                        const totalMercadoriasExterior = tribKeys.reduce((sum, k) => sum + (sumMercadoriasExterior as any)[k], 0)
                        const totalServicosInterno = tribKeys.reduce((sum, k) => sum + (sumServicosInterno as any)[k], 0)
                        const totalServicosExterior = tribKeys.reduce((sum, k) => sum + (sumServicosExterior as any)[k], 0)
                        const grandTotalDbg = totalMercadoriasInterno + totalMercadoriasExterior + totalServicosInterno + totalServicosExterior
                        const parcelasTotaisDeclFooter = (data as any)?.debug?.parcelas?.totais?.declarado
                        const totalDeclaradoFooter = parseNumber(parcelasTotaisDeclFooter?.total ?? parcelasTotaisDeclFooter?.Total ?? 0)
                        const grandTotal = (totalDeclaradoFooter && totalDeclaradoFooter > 0) ? totalDeclaradoFooter : (grandTotalDbg > 0 ? grandTotalDbg : (data.tributos?.Total || 0))
                        const colMercadoriasInternoVisible = totalMercadoriasInterno > 0
                        const colMercadoriasExteriorVisible = totalMercadoriasExterior > 0
                        const colServicosInternoVisible = totalServicosInterno > 0
                        const colServicosExteriorVisible = totalServicosExterior > 0

                        return (
                          <tr className={`${darkMode ? 'border-t-2 border-slate-700 bg-slate-800' : 'border-t-2 border-slate-300 bg-slate-50'}`}>
                            <td className={`py-2 px-2 font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Total</td>
                            {colMercadoriasInternoVisible && (
                          <td className={`py-2 px-2 text-center font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{formatCurrency(totalMercadoriasInterno)}</td>
                            )}
                            {colMercadoriasExteriorVisible && (
                          <td className={`py-2 px-2 text-center font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>{formatCurrency(totalMercadoriasExterior)}</td>
                            )}
                            {colServicosInternoVisible && (
                              <td className="py-2 px-2 text-center font-bold text-emerald-600">{formatCurrency(totalServicosInterno)}</td>
                            )}
                            {colServicosExteriorVisible && (
                              <td className="py-2 px-2 text-center font-bold text-teal-600">{formatCurrency(totalServicosExterior)}</td>
                            )}
                            <td className={`py-2 px-2 text-center font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{formatCurrency(grandTotal)}</td>
                          </tr>
                        )
                      })()}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Gráficos de Pizza - Composição dos Tributos */}
            {data.graficos && (data.graficos.dasPie || data.graficos.totalTributos) && (
              <div className="grid grid-cols-1 gap-4 sm:gap-6 print:contents">
                {/* Gráfico de Pizza - Distribuição do DAS */}
                <Card id="print-pie" className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border border-slate-200'} shadow-lg hover:shadow-xl transition-all duration-200 print:inline-block print:w-1/3 print:align-top print:break-inside-avoid`}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className={`text-base sm:text-lg flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        <TrendingUp className={`h-5 w-5 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} />
                        Distribuição do DAS
                      </CardTitle>
                      <CardDescription className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Composição percentual dos tributos
                      </CardDescription>
                    </div>
                  {/* Botão de exportação removido conforme solicitado */}
                </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Valores numéricos à esquerda */}
                      <div className="space-y-0.5 print:hidden">
                        <h4 className={`font-semibold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'} mb-4`}>
                          Valores por Tributo
                        </h4>
                        {[
                          { key: "IRPJ", label: "IRPJ", color: CHART_COLORS[0] },
                          { key: "CSLL", label: "CSLL", color: CHART_COLORS[1] },
                          { key: "COFINS", label: "COFINS", color: CHART_COLORS[2] },
                          { key: "PIS_Pasep", label: "PIS/PASEP", color: CHART_COLORS[3] },
                          { key: "INSS_CPP", label: "INSS/CPP", color: CHART_COLORS[4] },
                          { key: "ICMS", label: "ICMS", color: CHART_COLORS[5] },
                          { key: "IPI", label: "IPI", color: CHART_COLORS[6] },
                          { key: "ISS", label: "ISS", color: CHART_COLORS[7] },
                        ].filter(item => {
                          const value = (data.tributos[item.key as keyof typeof data.tributos] as number) || 0;
                          return value > 0;
                        }).map(({ key, label, color }) => {
                          const value = (data.tributos[key as keyof typeof data.tributos] as number) || 0;
                          const percentage = data.tributos.Total > 0 ? (value / data.tributos.Total) * 100 : 0;
                          
                          return (
                          <div key={key} className={`flex items-center justify-between p-2 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'} hover:shadow-md transition-all duration-200`}>
                          <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm" 
                                  style={{ backgroundColor: color }}
                                />
                                <div>
                                  <div className={`font-medium text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                    {label}
                                  </div>
                                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {percentage.toFixed(5)}%
                                  </div>
                                </div>
                              </div>
                              <div className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                                {formatCurrency(value)}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Total */}
                        <div className={`flex items-center justify-between p-2 rounded-lg border-2 ${darkMode ? 'bg-slate-600 border-slate-500' : 'bg-slate-100 border-slate-300'} font-bold`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${darkMode ? 'bg-slate-300' : 'bg-slate-600'}`} />
                            <div>
                              <div className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                                TOTAL DAS
                              </div>
                              <div className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                100.00000%
                              </div>
                            </div>
                          </div>
                          <div className={`font-bold text-lg ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            {formatCurrency(data.tributos.Total)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Gráfico de Pizza à direita */}
                      <div className="flex flex-col">
                        <h4 className={`font-semibold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'} mb-4`}>
                          Visualização Gráfica
                        </h4>
                        <div id="chart-das-pie" className="flex-1 flex items-center justify-center">
                          <div className="h-[270px] print:h-[260px] w-full overflow-visible">
                            <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 14, bottom: 8, left: 8, right: 8 }}>
                              <Pie
                                data={[
                                  { name: "IRPJ", value: data.tributos.IRPJ, color: CHART_COLORS[0] },
                                  { name: "CSLL", value: data.tributos.CSLL, color: CHART_COLORS[1] },
                                  { name: "COFINS", value: data.tributos.COFINS, color: CHART_COLORS[2] },
                                  { name: "PIS/PASEP", value: data.tributos.PIS_Pasep, color: CHART_COLORS[3] },
                                  { name: "INSS/CPP", value: data.tributos.INSS_CPP, color: CHART_COLORS[4] },
                                  { name: "ICMS", value: data.tributos.ICMS, color: CHART_COLORS[5] },
                                  { name: "IPI", value: data.tributos.IPI, color: CHART_COLORS[6] },
                                  { name: "ISS", value: data.tributos.ISS, color: CHART_COLORS[7] },
                                ].filter(item => item.value > 0)}
                                cx="50%"
                                cy="52%"
                                innerRadius={60}
                                outerRadius={116}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {[
                                  { name: "IRPJ", value: data.tributos.IRPJ, color: CHART_COLORS[0] },
                                  { name: "CSLL", value: data.tributos.CSLL, color: CHART_COLORS[1] },
                                  { name: "COFINS", value: data.tributos.COFINS, color: CHART_COLORS[2] },
                                  { name: "PIS/PASEP", value: data.tributos.PIS_Pasep, color: CHART_COLORS[3] },
                                  { name: "INSS/CPP", value: data.tributos.INSS_CPP, color: CHART_COLORS[4] },
                                  { name: "ICMS", value: data.tributos.ICMS, color: CHART_COLORS[5] },
                                  { name: "IPI", value: data.tributos.IPI, color: CHART_COLORS[6] },
                                  { name: "ISS", value: data.tributos.ISS, color: CHART_COLORS[7] },
                                ].filter(item => item.value > 0).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} stroke={darkMode ? "#0f172a" : "#e2e8f0"} strokeWidth={3} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value, name) => [
                                  formatCurrency(Number(value)), 
                                  name,
                                  `${((Number(value) / data.tributos.Total) * 100).toFixed(5)}%`
                                ]}
                                contentStyle={{ 
                                  borderRadius: "12px", 
                                  backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                                  color: darkMode ? "#f8fafc" : "#1e293b",
                                  border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                                  fontSize: "12px",
                                  fontWeight: "500"
                                }}
                                labelStyle={{ fontWeight: "600" }}
                              />
                              {/* Legenda removida conforme solicitado */}
                            </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
              </Card>


              </div>
            )}

            

            {/* Comparativo por Atividade (Mercadorias vs Serviços) */}
            {(() => {
              const mercadorias = Number(data.atividades?.atividade1?.Total || 0)
              const servicos = Number(data.atividades?.atividade2?.Total || 0)
              const hasData = mercadorias > 0 || servicos > 0
              if (!hasData) return null
              const chartData = [
                ...(mercadorias > 0 ? [{ name: 'Mercadorias', value: mercadorias, color: ATIVIDADES_COLORS?.mercadorias || '#3b82f6' }] : []),
                ...(servicos > 0 ? [{ name: 'Serviços', value: servicos, color: ATIVIDADES_COLORS?.servicos || '#10b981' }] : []),
              ]
              const total = mercadorias + servicos
              return (
                <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border border-slate-200'} shadow-lg hover:shadow-xl transition-all duration-200 print:inline-block print:w-1/3 print:align-top print:break-inside-avoid`}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className={`text-base sm:text-lg flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        <BarChart className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        Comparativo por Atividade (DAS)
                      </CardTitle>
                      <CardDescription className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        Distribuição do DAS entre Mercadorias e Serviços
                      </CardDescription>
                    </div>
                    <div className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      Total: {formatCurrency(total)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Tabela rápida à esquerda */}
                    <div className="space-y-0.5 print:hidden">
                        {[{ key: 'mercadorias', label: 'Mercadorias', value: mercadorias, color: ATIVIDADES_COLORS?.mercadorias || '#3b82f6' }, { key: 'servicos', label: 'Serviços', value: servicos, color: ATIVIDADES_COLORS?.servicos || '#10b981' }]
                          .filter(item => item.value > 0)
                          .map(({ key, label, value, color }) => {
                            const pct = total > 0 ? (value / total) * 100 : 0
                            return (
                      <div key={key} className={`flex items-center justify-between p-2 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'} hover:shadow-md transition-all duration-200`}>
                        <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                                  <div>
                                    <div className={`font-medium text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{label}</div>
                                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{pct.toFixed(5)}%</div>
                                  </div>
                                </div>
                                <div className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(value)}</div>
                              </div>
                            )
                          })}
                    <div className={`flex items-center justify-between p-2 rounded-lg border-2 ${darkMode ? 'bg-slate-600 border-slate-500' : 'bg-slate-100 border-slate-300'} font-bold`}>
                      <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${darkMode ? 'bg-slate-300' : 'bg-slate-600'}`} />
                            <div>
                              <div className={`font-bold text-sm ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>TOTAL DAS (Atividades)</div>
                              <div className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>100.00000%</div>
                            </div>
                          </div>
                          <div className={`font-bold text-lg ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{formatCurrency(total)}</div>
                        </div>
                      </div>

                      {/* Gráfico de barras à direita */}
                      <div className="flex flex-col">
                        <h4 className={`font-semibold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'} mb-4`}>Visualização Gráfica</h4>
                        <div id="chart-atividades-bar" className="flex-1 flex items-center justify-center">
                          <div className="h-[300px] print:h-[260px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="1 1" opacity={0.2} vertical={false} stroke={darkMode ? '#475569' : '#e2e8f0'} />
                              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 500, fill: darkMode ? '#94a3b8' : '#64748b' }} tickLine={false} axisLine={{ stroke: darkMode ? '#475569' : '#cbd5e1', strokeWidth: 1 }} />
                              <YAxis tick={{ fontSize: 12, fontWeight: 500, fill: darkMode ? '#94a3b8' : '#64748b' }} tickLine={false} axisLine={{ stroke: darkMode ? '#475569' : '#cbd5e1', strokeWidth: 1 }} tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v))} />
                              <Tooltip formatter={(value, name) => [formatCurrency(Number(value)), name]} contentStyle={{ borderRadius: '12px', backgroundColor: darkMode ? '#1e293b' : '#ffffff', border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: '500' }} labelStyle={{ fontWeight: '600' }} />
                              <Legend />
                              <Bar dataKey="value" name="DAS" barSize={40}>
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} stroke={darkMode ? '#1e293b' : '#ffffff'} strokeWidth={2} />
                                ))}
                                <LabelList dataKey={(d: any) => formatCurrency(d.value)} position="top" fill={darkMode ? '#e2e8f0' : '#1f2937'} fontSize={11} />
                              </Bar>
                            </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })()}

            {data.insights && (
              <div className="space-y-4">
                {/* Título e ícone de Insights removidos conforme solicitado */}
                <Card id="print-insights" className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border border-slate-200'} shadow`}>
                  <CardContent className="pt-4 sm:pt-6 space-y-3">
                    {data.insights.comparativoSetorial && (
                      <div className="flex items-start gap-2">
                        <TrendingUp className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'} mt-0.5 flex-shrink-0`} />
                        <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-800'}`}>
                          {data.insights.comparativoSetorial}
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {data.insights.pontosAtencao.slice(0, 2).map((ponto, idx) => (
                        <div key={`atencao-${idx}`} className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {ponto}
                          </p>
                        </div>
                      ))}
                      {data.insights.oportunidades.slice(0, 2).map((oportunidade, idx) => (
                        <div key={`oportunidade-${idx}`} className="flex items-start gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {oportunidade}
                          </p>
                        </div>
                      ))}
                      {(data.insights.economiaImpostos || []).slice(0, 3).map((eco, idx) => (
                        <div key={`eco-${idx}`} className="flex items-start gap-2">
                          <DollarSign className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} text-sm`}>{eco}</p>
                        </div>
                      ))}
                      {data.insights.regimeTributario && (
                        <div className="flex items-start gap-2">
                          <Shield className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                          <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} text-sm`}>
                            {data.insights.regimeTributario.adequado ? 'Regime atual adequado: ' : 'Sugestão de regime: '}
                            {data.insights.regimeTributario.sugestao || (data.insights.regimeTributario.adequado ? 'Simples Nacional' : '')}
                            {data.insights.regimeTributario.justificativa ? ` — ${data.insights.regimeTributario.justificativa}` : ''}
                          </p>
                        </div>
                      )}
                      {(data.insights.dasObservacoes || []).slice(0, 2).map((obs, idx) => (
                        <div key={`das-${idx}`} className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-sky-500 mt-0.5 flex-shrink-0" />
                          <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} text-sm`}>{obs}</p>
                        </div>
                      ))}
                      {(data.insights.receitaMensal || []).slice(0, 2).map((rm, idx) => (
                        <div key={`rm-${idx}`} className="flex items-start gap-2">
                          <TrendingUp className="h-4 w-4 text-teal-500 mt-0.5 flex-shrink-0" />
                          <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} text-sm`}>{rm}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Contato final conforme imagem 3 */}
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-200'} shadow mt-6`}>
              <CardHeader>
                <CardTitle className={`${darkMode ? 'text-slate-100' : 'text-slate-900'} text-base sm:text-lg`}>
                  Caso queira uma análise mais completa e personalizada, mostrando:
                </CardTitle>
                <CardDescription className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} text-xs sm:text-sm`}>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Cenários comparativos entre regimes tributários (Simples, Presumido e Real)</li>
                    <li>Simulações de economia fiscal</li>
                    <li>Recomendações exclusivas para o seu ramo</li>
                  </ul>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`${darkMode ? 'bg-slate-900/40 border-slate-700' : 'bg-white/60 border-blue-200'} border rounded-md p-3`}>
                  <p className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} font-medium mb-1`}>Fale com a Integra:</p>
                  <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    WhatsApp: <a
                      href="https://wa.me/559481264638?text=Ol%C3%A1%20quero%20uma%20an%C3%A1lise%20mais%20completa%20do%20meu%20DAS"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${darkMode ? 'text-green-300' : 'text-green-700'} underline hover:opacity-80`}
                    >
                      94 8126-4638
                    </a>
                  </p>
                  <p className={`${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    E-mail: <a
                      href="mailto:atendimento@integratecnologia.inf.br"
                      className={`${darkMode ? 'text-blue-300' : 'text-blue-700'} underline hover:opacity-80`}
                    >
                      atendimento@integratecnologia.inf.br
                    </a>
                  </p>
                  <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-xs mt-2`}>Integra Soluções Empresariais</p>
                </div>
              </CardContent>
            </Card>
            {/* Controles de exportação de PDF (visíveis no dashboard, ocultos no PDF) */}

            <div id="print-controls" className="flex flex-col sm:flex-row justify-center gap-3 pt-2 print:hidden" data-hide-for-client-pdf>
              <Button
                onClick={() => {
                  setData(null)
                  setFile(null)
                  setError(null)
                }}
                variant={darkMode ? "secondary" : "outline"}
                size="lg"
                className={`w-full sm:w-auto ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' : ''}`}
              >
                Processar Novo PDF
              </Button>
              <Button
                type="button"
                onClick={generateImage}
                disabled={isGeneratingImage}
                variant={darkMode ? 'secondary' : 'default'}
                size="lg"
                className={`w-full sm:w-auto ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' : ''} flex items-center gap-2`}
              >
                {isGeneratingImage ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                <span>{isGeneratingImage ? 'Gerando...' : 'Gerar Imagem (PNG)'}</span>
              </Button>
              <div className="flex w-full sm:w-auto gap-2">
                <Button
                  type="button"
                  onClick={() => handleServerDownloadPDF(4, undefined, 'portrait', 6000)}
                  disabled={downloadingServerPdf}
                  variant={darkMode ? 'secondary' : 'default'}
                  size="lg"
                  className={`flex-1 sm:flex-none ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' : ''} flex items-center gap-2`}
                >
                  {downloadingServerPdf ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                  <span>{downloadingServerPdf ? 'Gerando...' : 'Baixar PDF'}</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PGDASDProcessorIA
