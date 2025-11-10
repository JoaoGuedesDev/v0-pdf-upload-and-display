"use client"
import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Upload,
  FileText,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  Loader2,
  DollarSign,
  Sun,
  Moon,
  Download,
  Clock,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"
import { toast } from "@/components/ui/use-toast"
import { DonutTributos } from "@/components/DonutTributos"
import { composeChartsPage } from "@/lib/pdf-utils/charts-to-pdf"

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

// Configuração centralizada de UI para fontes e dimensões
const UI_CONFIG = {
  fonts: {
    titleCls: "text-base sm:text-lg",
    descCls: "text-xs sm:text-[9]",
    axis: 9,
    label: 9,
    legend: 9,
  },
  dims: {
    receitaMensalHeight:300,
    dasPieHeight: 300,
    dasPiePrintHeight: 300,
  },
  pie: {
    outerRadius: 100,
  },
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
    "otimizar divisão entre serviços e mercadorias",
  ]
  const isBanned = (txt: string) => {
    const n = normalizeTextPTBR(txt)
    return banned.some((b) => n.includes(b))
  }

  const toStrings = (arr?: any[]): string[] => {
    if (!Array.isArray(arr)) return []
    return arr
      .map((item) => {
        if (item == null) return ""
        if (typeof item === "string") return item
        // para números ou objetos, converte de forma segura
        if (typeof item === "number") return String(item)
        try {
          return JSON.stringify(item)
        } catch {
          return String(item)
        }
      })
      .filter((s) => s && !isBanned(s))
  }

  // Normaliza comparativoSetorial quando a IA retorna um objeto
  const normalizeComparativo = (comp: any): string => {
    if (!comp) return ""
    if (typeof comp === "string") return comp
    if (typeof comp === "number") return String(comp)
    if (typeof comp === "object") {
      const setor = comp.setor ?? comp.sector ?? comp.setorial ?? undefined
      const media = comp.mediaSetorial ?? comp.media ?? undefined
      const obs = comp.observacao ?? comp.observações ?? comp.obs ?? undefined
      const parts: string[] = []
      if (setor) parts.push(`Setor: ${setor}`)
      if (media != null) parts.push(`Média setorial: ${media}`)
      if (obs) parts.push(String(obs))
      if (parts.length) return parts.join(". ")
      try {
        return JSON.stringify(comp)
      } catch {
        return String(comp)
      }
    }
    return String(comp)
  }

  return {
    comparativoSetorial: normalizeComparativo((insights as any).comparativoSetorial),
    pontosAtencao: toStrings((insights as any).pontosAtencao),
    oportunidades: toStrings((insights as any).oportunidades),
    recomendacoes: toStrings((insights as any).recomendacoes),
    economiaImpostos: toStrings((insights as any).economiaImpostos),
    regimeTributario: (insights as any).regimeTributario,
    dasObservacoes: toStrings((insights as any).dasObservacoes),
    receitaMensal: toStrings((insights as any).receitaMensal),
  }
}

export function PGDASDProcessorIA({ initialData, shareId, hideDownloadButton }: { initialData?: DASData; shareId?: string; hideDownloadButton?: boolean }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DASData | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [processViaN8n, setProcessViaN8n] = useState(false)
  const [showConsistencyDetails, setShowConsistencyDetails] = useState(false)
  const [downloadingClientPdf, setDownloadingClientPdf] = useState(false)
  const [pdfOrientation, setPdfOrientation] = useState<"portrait" | "landscape">("landscape")
  const [pdfFitMode, setPdfFitMode] = useState<"multipage" | "single_contain" | "single_cover">("multipage")
  const [clientPixelRatio, setClientPixelRatio] = useState<number>(4)

  // PieChart: imagem estática unificada para PDF
  const pieRef = useRef<HTMLDivElement>(null)
  const [pieImageUrl, setPieImageUrl] = useState<string | null>(null)

  // Resolve ID para geração de PDF via servidor
  const params = useParams() as any
  const routeId = typeof params?.id === 'string' ? params.id : undefined
  const urlId = typeof window !== 'undefined' ? (window.location.pathname.match(/\/d\/([^/?#]+)/)?.[1] || undefined) : undefined
  const resolvedShareId = shareId || routeId || urlId

  // Sinaliza para a rota de PDF quando o dashboard está pronto para impressão
  useEffect(() => {
    try {
      ;(window as any).__dashReady = !!data
    } catch {}
  }, [data])

  // Fluxo de PDF via servidor removido

  // Hidratação quando dados iniciais são fornecidos via página compartilhada
  useEffect(() => {
    if (!initialData) return
    // Evita sobrescrever se já houver dados do fluxo de upload
    if (data) return
    // Recalcula campos de cálculo se não vierem no payload
    const receitaPA = Number(initialData?.receitas?.receitaPA || 0)
    const totalDAS = Number(initialData?.tributos?.Total || 0)

    // Normaliza campos críticos para evitar exceções em renderizações
    const safeIdentificacao = {
      cnpj: String(initialData?.identificacao?.cnpj || ""),
      razaoSocial: String(initialData?.identificacao?.razaoSocial || ""),
      periodoApuracao: String(initialData?.identificacao?.periodoApuracao || ""),
      abertura: initialData?.identificacao?.abertura,
      municipio: String(initialData?.identificacao?.municipio || ""),
      uf: String(initialData?.identificacao?.uf || ""),
    }
    const safeReceitas = {
      receitaPA: receitaPA,
      rbt12: Number(initialData?.receitas?.rbt12 || 0),
      rba: Number(initialData?.receitas?.rba || 0),
      rbaa: Number(initialData?.receitas?.rbaa || 0),
      limite: initialData?.receitas?.limite,
      receitaPAFormatada: initialData?.receitas?.receitaPAFormatada,
      mercadoExterno: {
        rpa: Number(initialData?.receitas?.mercadoExterno?.rpa || 0),
        rbt12: Number(initialData?.receitas?.mercadoExterno?.rbt12 || 0),
        rba: Number(initialData?.receitas?.mercadoExterno?.rba || 0),
        rbaa: Number(initialData?.receitas?.mercadoExterno?.rbaa || 0),
        limite: initialData?.receitas?.mercadoExterno?.limite,
      },
    }
    const safeTributos = {
      IRPJ: Number(initialData?.tributos?.IRPJ || 0),
      CSLL: Number(initialData?.tributos?.CSLL || 0),
      COFINS: Number(initialData?.tributos?.COFINS || 0),
      PIS_Pasep: Number(initialData?.tributos?.PIS_Pasep || 0),
      INSS_CPP: Number(initialData?.tributos?.INSS_CPP || 0),
      ICMS: Number(initialData?.tributos?.ICMS || 0),
      IPI: Number(initialData?.tributos?.IPI || 0),
      ISS: Number(initialData?.tributos?.ISS || 0),
      Total: Number(initialData?.tributos?.Total || 0),
    }

    const truncateDecimals = (value: number, decimals = 5): number => {
      if (!isFinite(value)) return 0
      const factor = Math.pow(10, decimals)
      return Math.trunc(value * factor) / factor
    }

    const formatBrazilianDecimalNoRound = (value: number, decimals = 5): string => {
      const truncated = truncateDecimals(value, decimals)
      return truncated.toFixed(decimals).replace('.', ',')
    }

    const aliquotaEfetivaValue = totalDAS > 0 && receitaPA > 0 ? (totalDAS / receitaPA) * 100 : 0
    const hydrated: DASData = {
      ...initialData,
      identificacao: safeIdentificacao,
      receitas: safeReceitas as any,
      tributos: safeTributos,
      calculos: {
        ...(initialData.calculos || {}),
        aliquotaEfetiva:
          initialData.calculos?.aliquotaEfetiva !== undefined
            ? initialData.calculos.aliquotaEfetiva
            : truncateDecimals(aliquotaEfetivaValue, 5),
        aliquotaEfetivaFormatada:
          initialData.calculos?.aliquotaEfetivaFormatada !== undefined
            ? initialData.calculos.aliquotaEfetivaFormatada
            : formatBrazilianDecimalNoRound(aliquotaEfetivaValue, 5),
        margemLiquida:
          initialData.calculos?.margemLiquida !== undefined && initialData.calculos?.margemLiquida !== null
            ? initialData.calculos.margemLiquida
            : receitaPA > 0 ? ((receitaPA - totalDAS) / receitaPA) * 100 : 0,
      },
    }

    ;(async () => {
      try {
        const iaResp = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dasData: hydrated }),
        })
        if (iaResp.ok) {
          const iaJson = await iaResp.json()
          const insightsFromIa = iaJson?.insights
          if (insightsFromIa && typeof insightsFromIa === "object") {
            setData({ ...hydrated, insights: sanitizeInsights(insightsFromIa as any) })
          } else {
            const insights = generateInsights(hydrated)
            setData({ ...hydrated, insights: sanitizeInsights(insights) })
          }
        } else {
          const insights = generateInsights(hydrated)
          setData({ ...hydrated, insights: sanitizeInsights(insights) })
        }
      } catch {
        const insights = generateInsights(hydrated)
        setData({ ...hydrated, insights: sanitizeInsights(insights) })
      }
    })()
  }, [initialData])

  const generateImage = async () => {
    if (!contentRef.current || !data) return
    try {
      setIsGeneratingImage(true)
      const node = contentRef.current as HTMLElement
      // Tenta via html-to-image primeiro (melhor com cores modernas lab/oklch)
      try {
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 3,
          backgroundColor: darkMode ? "#0f172a" : "#ffffff",
          // Evita nós problemáticos que podem causar erro de `.trim()` interno
          filter: (n: HTMLElement) => {
            const tag = (n.tagName || "").toLowerCase()
            if (tag === "script" || tag === "style") return false
            return true
          },
        })
        const a = document.createElement("a")
        a.href = dataUrl
        a.download = `DAS_${data.identificacao.cnpj.replace(/[^\d]/g, "")}_${new Date().toISOString().split("T")[0]}.png`
        a.click()
      } catch (primaryErr) {
        console.error("Erro ao gerar imagem via html-to-image", primaryErr)
        // Fallback robusto: usa html2canvas
        try {
          const canvas = await html2canvas(node, {
            backgroundColor: darkMode ? "#0f172a" : "#ffffff",
            scale: 2,
            useCORS: true,
            logging: false,
            allowTaint: true,
          })
          const dataUrl = canvas.toDataURL("image/png")
          const a = document.createElement("a")
          a.href = dataUrl
          a.download = `DAS_${data.identificacao.cnpj.replace(/[^\d]/g, "")}_${new Date().toISOString().split("T")[0]}.png`
          a.click()
          toast({ title: "Imagem gerada (fallback)", description: "Usando html2canvas." })
        } catch (fallbackErr) {
          console.error("Erro ao gerar imagem (fallback)", fallbackErr)
          setError("Erro ao gerar imagem. Tente novamente.")
        }
      }
    } finally {
      setIsGeneratingImage(false)
    }
  }

  // Fluxo de print/servidor removido

  const downloadClientPdf = async () => {
    if (!contentRef.current || !data) return
    const node = contentRef.current as HTMLElement
    // Preparar alternância do gráfico de pizza: usar imagem estática com rótulos
    const chartDasPie = node.querySelector("#chart-das-pie") as HTMLElement | null
    const livePieBlock = chartDasPie?.querySelector("div.block") as HTMLElement | null
    const pieFallbackImg = chartDasPie?.querySelector('img[alt="Gráfico de Pizza DAS"]') as HTMLElement | null
    const prevLivePieDisplay = livePieBlock?.style.display
    const prevFallbackDisplay = pieFallbackImg?.style.display
    const insightsEl = node.querySelector("#print-insights") as HTMLElement | null
    const prevInsightsDisplay = insightsEl?.style.display
    const controlsEls = Array.from(node.querySelectorAll("[data-hide-for-client-pdf]")) as HTMLElement[]
    const prevControlsDisplay = controlsEls.map((el) => el.style.display)
    try {
      setDownloadingClientPdf(true)
      // Alterna para imagem estática do Pie e oculta o gráfico vivo
      if (pieFallbackImg) pieFallbackImg.style.display = "block"
      if (livePieBlock) livePieBlock.style.display = "none"
      if (insightsEl) insightsEl.style.display = "none"
      controlsEls.forEach((el) => (el.style.display = "none"))
      const whatsappAnchor = node.querySelector('a[href^="https://wa.me/"]') as HTMLAnchorElement | null
      const waUrl =
        whatsappAnchor?.href ||
        "https://wa.me/559481264638?text=Ol%C3%A1%20quero%20uma%20an%C3%A1lise%20mais%20completa%20do%20meu%20DAS"
      const waLabelRaw = whatsappAnchor?.textContent
      const waLabel = typeof waLabelRaw === "string" && waLabelRaw.length > 0 ? waLabelRaw.trim() : "94 8126-4638"

      // Usa html-to-image para evitar parsing de cores lab()/oklch do html2canvas
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: clientPixelRatio,
        backgroundColor: darkMode ? "#0f172a" : "#ffffff",
      })

      // Descobre dimensões naturais da imagem
      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
        img.onerror = reject
        img.src = dataUrl
      })

      const pdf = new jsPDF(pdfOrientation === "landscape" ? "l" : "p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 6

      if (pdfFitMode === "multipage") {
        const imgWidth = pageWidth - margin * 2
        const imgHeight = (dims.h * imgWidth) / dims.w
        let heightLeft = imgHeight
        let position = margin
        pdf.addImage(dataUrl, "PNG", margin, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
        while (heightLeft > 0) {
          pdf.addPage()
          position = heightLeft - imgHeight
          pdf.addImage(dataUrl, "PNG", margin, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }
      } else {
        const fitContain = pdfFitMode === "single_contain"
        const scale = fitContain
          ? Math.min((pageWidth - margin * 2) / dims.w, (pageHeight - margin * 2) / dims.h)
          : Math.max((pageWidth - margin * 2) / dims.w, (pageHeight - margin * 2) / dims.h)
        const renderW = dims.w * scale
        const renderH = dims.h * scale
        const x = (pageWidth - renderW) / 2
        const y = (pageHeight - renderH) / 2
        pdf.addImage(dataUrl, "PNG", x, y, renderW, renderH)
      }

      // Página adicional com gráficos (Receita Mensal e Distribuição do DAS)
      try {
        const receitaEl = node.querySelector('#chart-receita-mensal') as HTMLElement | null
        const receitaImgUrl = receitaEl
          ? await toPng(receitaEl, {
              cacheBust: true,
              pixelRatio: Math.max(3, clientPixelRatio),
              backgroundColor: darkMode ? "#0f172a" : "#ffffff",
            })
          : null

        const pieImgUrl = pieImageUrl
        if (receitaImgUrl || pieImgUrl) {
          pdf.addPage()
          const gap = 4
          const availableW = pageWidth - margin * 2
          const colW = (availableW - gap) / 2

          const loadDims = async (url: string) => {
            return await new Promise<{ w: number; h: number }>((resolve, reject) => {
              const img = new Image()
              img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
              img.onerror = reject
              img.src = url
            })
          }

          const leftX = margin
          const rightX = margin + colW + gap
          const yTop = margin

          if (receitaImgUrl) {
            const d = await loadDims(receitaImgUrl)
            const scale = Math.min(colW / d.w, (pageHeight - margin * 2) / d.h)
            const w = d.w * scale
            const h = d.h * scale
            pdf.addImage(receitaImgUrl, 'PNG', leftX, yTop, w, h)
          }
          if (pieImgUrl) {
            const d = await loadDims(pieImgUrl)
            const scale = Math.min(colW / d.w, (pageHeight - margin * 2) / d.h)
            const w = d.w * scale
            const h = d.h * scale
            pdf.addImage(pieImgUrl, 'PNG', rightX, yTop, w, h)
          }
        }
      } catch (err) {
        console.warn('Falha ao compor página adicional de gráficos no PDF', err)
      }

      // Adiciona link clicável do WhatsApp na primeira página (sobreposição)
      try {
        pdf.setTextColor(darkMode ? "#10b981" : "#0f766e")
        pdf.setFontSize(10)
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

      pdf.save("dashboard-relatorio.pdf")
      toast({ title: "PDF gerado (cliente)", description: "Download iniciado." })
    } catch (err) {
      console.error("Erro ao gerar PDF no cliente", err)
      setError("Erro ao gerar PDF no cliente. Tente novamente.")
      // Fallback automático: abre o PDF gerado no servidor quando houver shareId
          try {
            const base = (process.env.NEXT_PUBLIC_BASE_URL as string | undefined) || window.location.origin
            const id = shareId
            if (id && typeof id === 'string' && id.length > 0) {
              window.open(`${base}/api/pdf/${id}`, "_blank", "noopener,noreferrer")
            }
          } catch (_) {}
      toast({
        title: "Erro ao gerar PDF (cliente)",
        description: (err as Error)?.message || "Falha ao gerar PDF no cliente",
        variant: "destructive",
      })
    } finally {
      // Reverte alternâncias aplicadas
      if (pieFallbackImg) pieFallbackImg.style.display = prevFallbackDisplay || ""
      if (livePieBlock) livePieBlock.style.display = prevLivePieDisplay || ""
      if (insightsEl) insightsEl.style.display = prevInsightsDisplay || ""
      controlsEls.forEach((el, idx) => (el.style.display = prevControlsDisplay[idx] || ""))
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
    const last3Avg =
      receitaLineVals.length >= 3
        ? receitaLineVals.slice(-3).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) / 3
        : receitaLineVals.length > 0
          ? receitaLineVals.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) / receitaLineVals.length
          : 0
    const variacaoUltimo = last3Avg > 0 ? ((lastReceita - last3Avg) / last3Avg) * 100 : 0
    const meTotalPositivo = (meVals || []).some((v) => (Number.isFinite(v) ? v : 0) > 0)

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
    const threshold = typeof minDomain === "number" ? minDomain * 1.2 : 0
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
        toast({ title: "PDF carregado", description: droppedFile.name })
      } else {
        setError("Por favor, envie apenas arquivos PDF")
        toast({ title: "Formato inválido", description: "Envie apenas arquivos PDF.", variant: "destructive" })
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile)
        setError(null)
        toast({ title: "PDF carregado", description: selectedFile.name })
      } else {
        setError("Por favor, envie apenas arquivos PDF")
        toast({ title: "Formato inválido", description: "Envie apenas arquivos PDF.", variant: "destructive" })
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

      // Unificar endpoint: /api/process-pdf decide automaticamente encaminhar ao n8n
      // quando N8N_WEBHOOK_URL estiver configurado em produção; caso contrário, processa localmente.
      const url = "/api/process-pdf"

      // Enviar para API que processa localmente ou encaminha ao n8n
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      })

      // Se a API responder com 303, o fetch segue o redirect mas não navega; navegamos manualmente
      if (response.redirected && typeof window !== "undefined") {
        window.location.href = response.url
        return
      }

      if (!response.ok) {
        throw new Error(`Erro ao processar: ${response.statusText}`)
      }

      const contentType = response.headers.get("content-type")
      const responseText = await response.text()

      if (typeof responseText !== "string" || responseText.length === 0 || responseText.trim() === "") {
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
      const container = result && typeof result === "object" && "dados" in result ? (result as any) : { dados: result }

      // Se a API retornou um link de dashboard compartilhável, redireciona imediatamente
      const dashboardUrl: string | undefined = (result as any)?.dashboardUrl || (result as any)?.shareUrl
      if (typeof window !== "undefined" && dashboardUrl && typeof dashboardUrl === "string") {
        window.location.href = dashboardUrl
        return
      }

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

        const truncateDecimals = (value: number, decimals = 5): number => {
          if (!isFinite(value)) return 0
          const factor = Math.pow(10, decimals)
          return Math.trunc(value * factor) / factor
        }

        const formatBrazilianDecimalNoRound = (value: number, decimals = 5): string => {
          const truncated = truncateDecimals(value, decimals)
          return truncated.toFixed(decimals).replace(".", ",")
        }

        const aliquotaEfetivaValue = totalDAS > 0 && receitaPA > 0 ? (totalDAS / receitaPA) * 100 : 0

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
          const labels = Array.isArray(dasData.graficos.receitaLine.labels) ? dasData.graficos.receitaLine.labels : []
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
          const periodo = dasData.identificacao?.periodoApuracao || ""
          const fimMatch = periodo.match(/(\d{2}\/\d{4})\s*$/)
          const fim = fimMatch ? fimMatch[1] : "PA"
          const rpaTotal = dasData.receitas?.receitaPA || 0
          const rpaME = dasData.receitas?.mercadoExterno?.rpa || 0
          const rpaMI = Math.max(rpaTotal - rpaME, 0)
          dasData.graficos.receitaLine = { labels: [fim], values: [rpaMI] }
          // adiciona série externa se houver
          if (rpaME > 0) {
            dasData.graficos.receitaLineExterno = {
              labels: [fim],
              values: [Number(rpaME.toFixed(4))],
              valuesFormatados: [rpaME.toFixed(4).replace(".", ",")],
            }
          }
        }
      }

      // Tenta gerar insights via IA (fallback para heurística local)
      try {
        const iaResp = await fetch("/api/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dasData }),
        })
        if (iaResp.ok) {
          const iaJson = await iaResp.json()
          const insightsFromIa = iaJson?.insights
          if (insightsFromIa && typeof insightsFromIa === "object") {
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
    setDarkMode(theme === "dark")
  }, [theme])

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    setTheme(next ? "dark" : "light")
  }

  // Geração da imagem estática do PieChart somente após o SVG estar renderizado
  useEffect(() => {
    const total = Number((data as any)?.tributos?.Total || 0)
    if (!pieRef.current || pieImageUrl || total <= 0) return

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const tryCapture = () => {
      const root = pieRef.current
      if (!root) return
      const svg = root.querySelector('svg')
      const rect = root.getBoundingClientRect()
      const ready = !!svg && rect.width > 0 && rect.height > 0
      if (!ready) {
        timeoutId = setTimeout(tryCapture, 250)
        return
      }
      toPng(root, {
        pixelRatio: clientPixelRatio,
        cacheBust: true,
        backgroundColor: darkMode ? "#0b1220" : "#ffffff",
      })
        .then((url: string) => setPieImageUrl(url))
        .catch(() => {})
    }

    timeoutId = setTimeout(tryCapture, 150)
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [data, darkMode, clientPixelRatio, pieImageUrl])


  return (
    <div
      className={`min-h-screen p-4 sm:p-6 ${darkMode ? "bg-slate-900 text-white" : "bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100"}`}
    >
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <img
              src="/integra-logo.svg"
              alt="Integra Soluções Empresariais"
              className="h-10 sm:h-12 object-contain"
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).src = "/placeholder-logo.png"
              }}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className={`rounded-full ${darkMode ? "bg-slate-800 text-yellow-400 hover:bg-slate-700" : "bg-white text-slate-700 hover:bg-slate-100"}`}
            onClick={toggleDarkMode}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>

        {!data && !initialData && (
          <Card
            className={`${darkMode ? "bg-slate-800 border-slate-700" : "border-2 border-dashed border-slate-300 bg-white/50"} backdrop-blur-sm`}
          >
            <CardContent className="pt-6">
              <div
                className={`relative flex flex-col items-center justify-center rounded-lg p-8 sm:p-12 transition-all ${
                  dragActive
                    ? `${darkMode ? "bg-slate-700 border-2 border-blue-500" : "bg-blue-50 border-2 border-blue-400"}`
                    : `${darkMode ? "bg-slate-900 border-2 border-slate-700" : "bg-slate-50 border-2 border-slate-200"}`
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload
                  className={`h-12 w-12 sm:h-16 sm:w-16 mb-4 ${dragActive ? (darkMode ? "text-blue-300" : "text-blue-600") : darkMode ? "text-slate-300" : "text-slate-400"}`}
                />
                <h3
                  className={`text-lg sm:text-xl font-semibold mb-2 text-center break-words max-w-full ${darkMode ? "text-white" : "text-slate-800"}`}
                >
                  {file ? file.name : "Arraste seu PDF aqui"}
                </h3>
                <p className={`${darkMode ? "text-slate-300" : "text-slate-500"} mb-4 text-sm sm:text-base`}>
                  ou clique para selecionar
                </p>

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
                    className={`mt-4 ${darkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"}`}
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
                {/* Toggle n8n removido */}
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
        {initialData && !data && (
          <div className="flex items-center justify-center py-8">
            <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Carregando dashboard...</span>
          </div>
        )}

        {data && (
          <div
            id="relatorio-pgdasd"
            ref={contentRef}
            className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative"
            style={{
              backgroundImage: 'none',
              backgroundRepeat: 'initial',
              backgroundSize: 'initial',
              backgroundPosition: 'initial',
              backgroundAttachment: 'initial',
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
              <Card className="bg-gradient-to-br from-slate-700 to-slate-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 py-1">
                <CardHeader className="pb-0.5 p-1 sm:p-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-[11px] sm:text-xs font-bold">Receita Bruta PA</CardTitle>
                  <DollarSign className="h-4 w-4" />
                </CardHeader>
                <CardContent className="p-1 sm:p-2 pt-0">
                  <p className="text-base sm:text-lg font-bold break-words">{formatCurrency(data.receitas.receitaPA)}</p>
                  <p className="text-[10px] sm:text-[11px] opacity-75 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Período de apuração
                  </p>
                </CardContent>
              </Card>

              {/* Total DAS - Azul médio */}
              <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardHeader className="pb-0.5 p-1 sm:p-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-[11px] sm:text-xs font-bold">Total DAS</CardTitle>
                  <FileText className="h-4 w-4" />
                </CardHeader>
                <CardContent className="p-1 sm:p-2 pt-0">
                  {(() => {
                    // Exibe origem do DAS com a MESMA regra de bucket usada na tabela detalhada
                    const atividadesDbgRaw = (data as any)?.debug?.atividades
                    const atividadesDbgList = Array.isArray(atividadesDbgRaw)
                      ? atividadesDbgRaw
                      : atividadesDbgRaw && typeof atividadesDbgRaw === "object"
                        ? Object.values(atividadesDbgRaw)
                        : []

                    const init = () => ({
                      IRPJ: 0,
                      CSLL: 0,
                      COFINS: 0,
                      PIS_Pasep: 0,
                      INSS_CPP: 0,
                      ICMS: 0,
                      IPI: 0,
                      ISS: 0,
                    })
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
                        const mercado = cls.mercado === "externo" ? "externo" : "interno"
                        const target = ((): typeof sumMercadoriasInterno => {
                          if (issVal > 0 && icmsVal === 0) {
                            return mercado === "externo" ? sumServicosExterior : sumServicosInterno
                          }
                          if (icmsVal > 0 && issVal === 0) {
                            return mercado === "externo" ? sumMercadoriasExterior : sumMercadoriasInterno
                          }
                          return cls.tipo === "servicos"
                            ? mercado === "externo"
                              ? sumServicosExterior
                              : sumServicosInterno
                            : mercado === "externo"
                              ? sumMercadoriasExterior
                              : sumMercadoriasInterno
                        })()

                        target.IRPJ += parseNumber(trib.irpj ?? trib.IRPJ ?? 0)
                        target.CSLL += parseNumber(trib.csll ?? trib.CSLL ?? 0)
                        target.COFINS += parseNumber(trib.cofins ?? trib.COFINS ?? 0)
                        target.PIS_Pasep += parseNumber(
                          trib.pis ??
                            trib.PIS ??
                            trib.pis_pasep ??
                            trib.PIS_PASEP ??
                            trib["PIS/PASEP"] ??
                            trib.PIS_Pasep ??
                            0,
                        )
                        target.INSS_CPP += parseNumber(trib.inss_cpp ?? trib.INSS_CPP ?? trib["INSS/CPP"] ?? 0)
                        target.ICMS += parseNumber(trib.icms ?? trib.ICMS ?? 0)
                        target.IPI += parseNumber(trib.ipi ?? trib.IPI ?? 0)
                        target.ISS += parseNumber(trib.iss ?? trib.ISS ?? 0)
                      }
                    }

                    // Totais por origem agregando interno + externo
                    const sumBucket = (b: ReturnType<typeof init>) =>
                      b.IRPJ + b.CSLL + b.COFINS + b.PIS_Pasep + b.INSS_CPP + b.ICMS + b.IPI + b.ISS
                    const mercadoriasDbg = sumBucket(sumMercadoriasInterno) + sumBucket(sumMercadoriasExterior)
                    const servicosDbg = sumBucket(sumServicosInterno) + sumBucket(sumServicosExterior)

                    const mercadoriasAt = Number(data.atividades?.atividade1?.Total || 0)
                    const servicosAt = Number(data.atividades?.atividade2?.Total || 0)
                    // Preferimos os buckets calculados do debug quando existem; senão caímos para atividadeX.Total
                    const mercadoriasTotal = mercadoriasDbg > 0 ? mercadoriasDbg : mercadoriasAt
                    const servicosTotal = servicosDbg > 0 ? servicosDbg : servicosAt

                    const anyBadge = mercadoriasTotal > 0 || servicosTotal > 0
                    if (!anyBadge) return null
                    return (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {servicosTotal > 0 && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-white/20 text-white border border-white/30">
                            Serviços: {formatCurrency(servicosTotal)}
                          </span>
                        )}
                        {mercadoriasTotal > 0 && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-white/20 text-white border border-white/30">
                            Mercadorias: {formatCurrency(mercadoriasTotal)}
                          </span>
                        )}
                      </div>
                    )
                  })()}
                  <p className="text-base sm:text-lg font-bold font-sans break-words">
                    {formatCurrency(Number(data?.tributos?.Total || 0))}
                  </p>
                  <p className="text-[10px] sm:text-[11px] opacity-75 mt-1">Valor a pagar</p>
                </CardContent>
              </Card>

              {/* Alíquota Efetiva - Verde */}
              <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardHeader className="pb-0.5 p-1 sm:p-2">
                  <CardTitle className="text-[11px] sm:text-xs font-bold">Alíquota Efetiva</CardTitle>
                </CardHeader>
                <CardContent className="p-1 sm:p-2 pt-0">
                  <p className="text-base sm:text-lg font-bold font-sans">
                    {(() => {
                      const formatted =
                        data.calculos?.aliquotaEfetivaFormatada ??
                        (data.calculos?.aliquotaEfetiva !== undefined
                          ? data.calculos.aliquotaEfetiva.toFixed(5).replace(".", ",")
                          : "0,00000")
                      return formatted.includes("%") ? formatted : `${formatted}%`
                    })()}
                  </p>
                  <p className="text-[10px] sm:text-[11px] opacity-75 mt-1">DAS / Receita PA</p>
                </CardContent>
              </Card>

              {/* Margem Líquida - Roxo */}
              <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 py-1">
                <CardHeader className="pb-0.5 p-1 sm:p-2">
                  <CardTitle className="text-[11px] sm:text-xs font-bold">Margem Líquida</CardTitle>
                </CardHeader>
                <CardContent className="p-1 sm:p-2 pt-0">
                  <p className="text-base sm:text-lg font-bold font-sans">
                    {(data.calculos?.margemLiquida || data.calculos?.margemLiquidaPercent || 0).toFixed(3)}%
                  </p>
                  <p className="text-[10px] sm:text-[11px] opacity-75 mt-1">Receita após impostos</p>
                </CardContent>
              </Card>
            </div>

            <Card
              className={`${darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border border-slate-200 text-slate-800"} shadow-lg`}
            >
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 text-base sm:text-lg ${darkMode ? "text-white" : ""}`}>
                  <DollarSign
                    className={`h-4 w-4 sm:h-5 sm:w-5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`}
                  />
                  Discriminativo de Receitas
                </CardTitle>
                <CardDescription className={`text-xs sm:text-sm ${darkMode ? "text-slate-300" : ""}`}>
                  Detalhamento completo das receitas conforme PGDASD
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Preferir valores do debug (secao21) quando presentes; fallback para dados já normalizados
                  const pickRow = (
                    totalRaw: number | undefined,
                    meRaw: number | undefined,
                    dbg?: { mi?: number; me?: number; total?: number },
                  ) => {
                    const dTotal = Number(dbg?.total) || 0
                    const dMi = Number(dbg?.mi) || 0
                    const dMe = Number(dbg?.me) || 0
                    const tCandidate = Number(totalRaw) || 0
                    const t = dTotal > 0 ? dTotal : tCandidate
                    let me = dMe > 0 ? dMe : Number(meRaw) || 0
                    if (!isFinite(me) || me < 0 || me > t) me = 0
                    const mi = dMi > 0 ? dMi : Math.max(t - me, 0)
                    return { mi, me, total: t }
                  }

                  const rpa = pickRow(
                    data.receitas.receitaPA,
                    data.receitas.mercadoExterno?.rpa,
                    data.debug?.secao21?.rpaRow,
                  )
                  const rbt12 = pickRow(
                    data.receitas.rbt12,
                    data.receitas.mercadoExterno?.rbt12,
                    data.debug?.secao21?.rbt12Row,
                  )
                  const rba = pickRow(data.receitas.rba, data.receitas.mercadoExterno?.rba, data.debug?.secao21?.rbaRow)
                  const rbaa = pickRow(
                    data.receitas.rbaa,
                    data.receitas.mercadoExterno?.rbaa,
                    data.debug?.secao21?.rbaaRow,
                  )
                  const rbt12p = pickRow(
                    (data as any)?.receitas?.rbt12p,
                    (data as any)?.receitas?.mercadoExterno?.rbt12p,
                    (data as any)?.debug?.secao21?.rbt12pRow,
                  )
                  ;(data as any).__rows = { rpa, rbt12, rbt12p, rba, rbaa }
                  return null
                })()}
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className={`${darkMode ? "border-b-2 border-slate-700" : "border-b-2 border-slate-200"}`}>
                          <th
                            className={`text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold ${darkMode ? "text-slate-200" : "text-slate-700"}`}
                          >
                            Local de Receitas (R$)
                          </th>
                          <th
                            className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold ${darkMode ? "text-slate-200" : "text-slate-700"}`}
                          >
                            Mercado Interno
                          </th>
                          {/* Exibir coluna Mercado Externo apenas se houver valores */}
                          {(((data as any).__rows?.rpa.me || 0) > 0 ||
                            ((data as any).__rows?.rbt12.me || 0) > 0 ||
                            ((data as any).__rows?.rbt12p?.me || 0) > 0 ||
                            ((data as any).__rows?.rba.me || 0) > 0 ||
                            ((data as any).__rows?.rbaa.me || 0) > 0) && (
                            <th
                              className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold ${darkMode ? "text-slate-200" : "text-slate-700"}`}
                            >
                              Mercado Externo
                            </th>
                          )}
                          <th
                            className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold ${darkMode ? "text-slate-200 bg-slate-800" : "text-slate-700 bg-slate-50"}`}
                          >
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          className={`${darkMode ? "border-b border-slate-700 hover:bg-slate-800" : "border-b border-slate-100 hover:bg-slate-50"} transition-colors`}
                        >
                          <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">
                            Receita Bruta do PA (RPA) - Competência
                          </td>
                          <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                            {formatCurrency((data as any).__rows?.rpa.mi || 0)}
                          </td>
                          {((data as any).__rows?.rpa.me || 0) > 0 && (
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                              {formatCurrency((data as any).__rows?.rpa.me || 0)}
                            </td>
                          )}
                          <td
                            className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold whitespace-nowrap ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-50 text-slate-800"}`}
                          >
                            {formatCurrency((data as any).__rows?.rpa.total || 0)}
                          </td>
                        </tr>
                        <tr
                          className={`${darkMode ? "border-b border-slate-700 hover:bg-slate-800" : "border-b border-slate-100 hover:bg-slate-50"} transition-colors`}
                        >
                          <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">
                            Receita bruta acumulada nos doze meses anteriores ao PA (RBT12)
                          </td>
                          <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                            {formatCurrency((data as any).__rows?.rbt12.mi || 0)}
                          </td>
                          {((data as any).__rows?.rbt12.me || 0) > 0 && (
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                              {formatCurrency((data as any).__rows?.rbt12.me || 0)}
                            </td>
                          )}
                          <td
                            className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold whitespace-nowrap ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-50 text-slate-800"}`}
                          >
                            {formatCurrency((data as any).__rows?.rbt12.total || 0)}
                          </td>
                        </tr>
                        {((data as any).__rows?.rbt12p?.total || 0) > 0 && (
                          <tr
                            className={`${darkMode ? "border-b border-slate-700 hover:bg-slate-800" : "border-b border-slate-100 hover:bg-slate-50"} transition-colors`}
                          >
                            <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">
                              Receita bruta acumulada nos doze meses anteriores ao PA proporcionalizada (RBT12p)
                            </td>
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                              {formatCurrency((data as any).__rows?.rbt12p.mi || 0)}
                            </td>
                            {((data as any).__rows?.rbt12p.me || 0) > 0 && (
                              <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                                {formatCurrency((data as any).__rows?.rbt12p.me || 0)}
                              </td>
                            )}
                            <td
                              className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold whitespace-nowrap ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-50 text-slate-800"}`}
                            >
                              {formatCurrency((data as any).__rows?.rbt12p.total || 0)}
                            </td>
                          </tr>
                        )}
                        <tr
                          className={`${darkMode ? "border-b border-slate-700 hover:bg-slate-800" : "border-b border-slate-100 hover:bg-slate-50"} transition-colors`}
                        >
                          <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">
                            Receita bruta acumulada no ano-calendário corrente (RBA)
                          </td>
                          <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                            {formatCurrency((data as any).__rows?.rba.mi || 0)}
                          </td>
                          {((data as any).__rows?.rba.me || 0) > 0 && (
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                              {formatCurrency((data as any).__rows?.rba.me || 0)}
                            </td>
                          )}
                          <td
                            className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold whitespace-nowrap ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-50 text-slate-800"}`}
                          >
                            {formatCurrency((data as any).__rows?.rba.total || 0)}
                          </td>
                        </tr>
                        <tr
                          className={`${darkMode ? "border-b border-slate-700 hover:bg-slate-800" : "border-b border-slate-100 hover:bg-slate-50"} transition-colors`}
                        >
                          <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">
                            Receita bruta acumulada no ano-calendário anterior (RBAA)
                          </td>
                          <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                            {formatCurrency((data as any).__rows?.rbaa.mi || 0)}
                          </td>
                          {((data as any).__rows?.rbaa.me || 0) > 0 && (
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 whitespace-nowrap">
                              {formatCurrency((data as any).__rows?.rbaa.me || 0)}
                            </td>
                          )}
                          <td
                            className={`text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold whitespace-nowrap ${darkMode ? "bg-slate-800 text-slate-200" : "bg-slate-50 text-slate-800"}`}
                          >
                            {formatCurrency((data as any).__rows?.rbaa.total || 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-2 sm:mt-3 grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-2 pt-2 border-t border-slate-200">
                  <div className="bg-blue-50 rounded-lg p-2 sm:p-3">
                    <p className={`text-xs font-medium mb-1 ${darkMode ? "text-blue-300" : "text-blue-600"}`}>
                      Utilização do Limite
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900">
                      {((data.receitas.rba / (data.receitas.limite || 4800000)) * 100).toFixed(1)}%
                    </p>
                    <p className={`text-xs mt-1 ${darkMode ? "text-blue-300" : "text-blue-600"}`}>RBA / Limite</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2 sm:p-3">
                    <p className="text-xs text-emerald-600 font-medium mb-1">Comparativo de Crescimento</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-900">
                      {(() => {
                        const serieBase = (data.graficos?.receitaLine?.values ||
                          data.graficos?.receitaMensal?.values ||
                          []) as any[]
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
                          pct =
                            data.receitas.rbaa > 0
                              ? ((data.receitas.rba - data.receitas.rbaa) / data.receitas.rbaa) * 100
                              : 0
                        }
                        return pct.toFixed(1)
                      })()}%
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">3 últimos vs 3 primeiros</p>
                  </div>
                  {/* Último mês vs média dos últimos 3 meses */}
                  <div className="bg-indigo-50 rounded-lg p-2 sm:p-3">
                    <p className={`text-xs font-medium mb-1 ${darkMode ? "text-indigo-300" : "text-indigo-600"}`}>
                      Último mês vs média trimestral
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-indigo-900">
                      {(() => {
                        const serieBase = (data.graficos?.receitaLine?.values ||
                          data.graficos?.receitaMensal?.values ||
                          []) as any[]
                        const valores = Array.isArray(serieBase) ? serieBase.map((v: any) => Number(v) || 0) : []
                        const n = valores.length
                        if (n === 0) return "0.0"
                        const last = valores[n - 1]
                        const last3 = valores.slice(Math.max(0, n - 3))
                        const avg3 = last3.length > 0 ? last3.reduce((a, b) => a + b, 0) / last3.length : 0
                        const pct = avg3 > 0 ? ((last - avg3) / avg3) * 100 : 0
                        return pct.toFixed(1)
                      })()}%
                    </p>
                    <p className={`text-xs mt-1 ${darkMode ? "text-indigo-300" : "text-indigo-600"}`}>
                      Variação do último mês vs média 3 meses
                    </p>
                  </div>
                  {/* Consistência: coeficiente de variação últimos 6 meses */}
                  <div
                    className="bg-amber-50 rounded-lg p-2 sm:p-3 cursor-pointer hover:bg-amber-100 transition"
                    role="button"
                    onClick={() => setShowConsistencyDetails((v) => !v)}
                    aria-label="Abrir detalhamento de consistência"
                  >
                    <p className="text-xs text-amber-600 font-medium mb-1">Consistência</p>
                    <p className="text-xl sm:text-2xl font-bold text-amber-900">
                      {(() => {
                        const serieBase = (data.graficos?.receitaLine?.values ||
                          data.graficos?.receitaMensal?.values ||
                          []) as any[]
                        const valores = Array.isArray(serieBase) ? serieBase.map((v: any) => Number(v) || 0) : []
                        const n = valores.length
                        const last6 = valores.slice(Math.max(0, n - 6))
                        if (last6.length < 2) return "0.0"
                        const mean = last6.reduce((a, b) => a + b, 0) / last6.length
                        const variance = last6.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / last6.length
                        const sd = Math.sqrt(variance)
                        const cv = mean > 0 ? (sd / mean) * 100 : 0
                        return cv.toFixed(1)
                      })()}%
                    </p>
                    <p className="text-xs text-amber-600 mt-1">CV últimos 6 meses (↓ estável)</p>
                  </div>
                </div>

                {showConsistencyDetails && (
                  <div
                    className={`${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"} border rounded-lg mt-3 sm:mt-4 p-3 sm:p-4`}
                  >
                    {(() => {
                      const base = data.graficos?.receitaLine || data.graficos?.receitaMensal
                      const labels = base?.labels || []
                      const values = base?.values || []
                      const n = values.length
                      const last6IdxStart = Math.max(0, n - 6)
                      const rows = labels.slice(last6IdxStart).map((label, i) => {
                        const v = Number(values[last6IdxStart + i] || 0)
                        return { mes: label, valor: v }
                      })
                      const mean = rows.length > 0 ? rows.reduce((a, b) => a + b.valor, 0) / rows.length : 0
                      const variance =
                        rows.length > 0
                          ? rows.reduce((acc, r) => acc + Math.pow(r.valor - mean, 2), 0) / rows.length
                          : 0
                      const sd = Math.sqrt(variance)
                      return (
                        <div className="space-y-3">
                          <div className={`text-sm ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                            CV = desvio padrão / média × 100. Valores menores indicam maior estabilidade.
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr>
                                  <th className={`text-left py-2 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                                    Mês
                                  </th>
                                  <th className={`text-right py-2 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                                    Valor
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((r, idx) => (
                                  <tr
                                    key={`cv-row-${idx}`}
                                    className={`${darkMode ? "border-slate-700" : "border-slate-200"} border-t`}
                                  >
                                    <td className={`py-2 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                      {r.mes}
                                    </td>
                                    <td
                                      className={`py-2 text-right font-medium ${darkMode ? "text-slate-100" : "text-slate-900"}`}
                                    >
                                      {formatCurrency(r.valor)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className={`${darkMode ? "bg-slate-700" : "bg-slate-100"} rounded-md p-2`}>
                              <div className={`text-xs ${darkMode ? "text-slate-300" : "text-slate-600"}`}>Média</div>
                              <div className={`text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                                {formatCurrency(mean)}
                              </div>
                            </div>
                            <div className={`${darkMode ? "bg-slate-700" : "bg-slate-100"} rounded-md p-2`}>
                              <div className={`text-xs ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                                Desvio-padrão
                              </div>
                              <div className={`text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                                {formatCurrency(sd)}
                              </div>
                            </div>
                            <div className={`${darkMode ? "bg-slate-700" : "bg-slate-100"} rounded-md p-2`}>
                              <div className={`text-xs ${darkMode ? "text-slate-300" : "text-slate-600"}`}>CV (%)</div>
                              <div className={`text-sm font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                                {(() => {
                                  const cv = mean > 0 ? (sd / mean) * 100 : 0
                                  return cv.toFixed(1)
                                })()}%
                              </div>
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
                  <Card
                    className={`${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border border-slate-200"} shadow-lg hover:shadow-xl transition-all duration-200 md:col-span-2 print:inline-block print:w-1/3 print:align-top print:break-inside-avoid`}
                  >
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div>
                        <CardTitle
                          className={`${UI_CONFIG.fonts.titleCls} flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-800"}`}
                        >
                          <TrendingUp className={`h-5 w-5 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                          Receita Mensal (R$)
                        </CardTitle>
                        <CardDescription
                          className={`${UI_CONFIG.fonts.descCls} ${darkMode ? "text-slate-400" : "text-slate-500"}`}
                        >
                          Evolução de Receitas
                        </CardDescription>
                      </div>
                      {/* Botão de exportação movido para o final do relatório */}
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        {/* Overlay sombreado cobrindo toda a área do gráfico (mais claro) */}
                        <div
                          className={`absolute inset-0 rounded-xl ${darkMode ? "bg-slate-700/15" : "bg-slate-100/30"} pointer-events-none`}
                        />
                        <div id="chart-receita-mensal" className="w-full" style={{ height: UI_CONFIG.dims.receitaMensalHeight }}>
                          <ResponsiveContainer width="100%" height="100%">
                            {(() => {
                              const base = (data.graficos!.receitaLine || data.graficos!.receitaMensal)!
                              const labels = base.labels || []
                              const totals = (base.values || []).map((v: any) => Number(v) || 0)
                              const externoSerie = (data.graficos as any)?.receitaLineExterno || null
                              const extMap: Record<string, number> = {}
                              if (externoSerie && Array.isArray(externoSerie.labels) && Array.isArray(externoSerie.values)) {
                                externoSerie.labels.forEach((l: string, i: number) => {
                                  const v = Number(externoSerie.values[i]) || 0
                                  extMap[l] = v
                                })
                              }

                              const chartData = labels.map((l) => {
                                const total = totals[labels.indexOf(l)] || 0
                                const externoRaw = Math.min(extMap[l] || 0, total)
                                const internoRaw = Math.max(total - externoRaw, 0)
                                const maior = Math.max(internoRaw, externoRaw)
                                const menor = Math.min(internoRaw, externoRaw)
                                const maiorTipo = internoRaw >= externoRaw ? "interno" : "externo"
                                return { name: l, interno: internoRaw, externo: externoRaw, maior, menor, maiorTipo }
                              })

                              const maxVal = Math.max(...chartData.map((d) => Math.max(d.interno, d.externo)), 0)
                              const padTop = 50000
                              const topDomain = Math.max(0, Math.ceil(maxVal + padTop))
                              const yTicks = [0, topDomain * 0.2, topDomain * 0.4, topDomain * 0.6, topDomain * 0.8, topDomain]
                              const formatAxisShort = (n: number) =>
                                n >= 1e6
                                  ? `${(n / 1e6).toFixed(1)}M`
                                  : n >= 1e3
                                  ? `${(n / 1e3).toFixed(1)}k`
                                  : `${n.toFixed(0)}`
                              const formatNumberBR = (n: number) =>
                                Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

                              return (
                                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }} barCategoryGap="30%" barGap={-18}>
                                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
                                  <XAxis dataKey="name" tick={{ fill: darkMode ? "#cbd5e1" : "#334155", fontSize: UI_CONFIG.fonts.axis }} tickMargin={18} />
                                  <YAxis
                                    tick={{ fill: darkMode ? "#cbd5e1" : "#334155", fontSize: UI_CONFIG.fonts.axis }}
                                    tickFormatter={formatAxisShort}
                                    ticks={yTicks}
                                     domain={[0, topDomain]}
                                   />
                                   {(() => {
                                     const IN_COLOR = "#3b82f6"
                                     const EX_COLOR = "#7c3aed" // roxo mais intenso para maior contraste
                                     const CustomTooltip = ({ active, payload, label }: any) => {
                                       if (!active || !payload || !payload.length) return null
                                       const p = payload[0]?.payload
                                       if (!p) return null
                                       const interno = Number(p.interno) || 0
                                       const externo = Number(p.externo) || 0
                                       const shouldShow = (v: number) => v > 0.01
                                       return (
                                         <div
                                           style={{
                                             background: darkMode ? "#0f172a" : "#ffffff",
                                             border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`,
                                             borderRadius: 6,
                                             padding: 8,
                                             color: darkMode ? "#cbd5e1" : "#334155",
                                           }}
                                         >
                                           <div style={{ marginBottom: 6, fontSize: UI_CONFIG.fonts.label }}>{String(label)}</div>
                                           {shouldShow(interno) && (
                                             <div style={{ fontSize: UI_CONFIG.fonts.label }}>
                                               Interno: <span style={{ color: IN_COLOR }}>{formatNumberBR(interno)}</span>
                                             </div>
                                           )}
                                           {shouldShow(externo) && (
                                             <div style={{ fontSize: UI_CONFIG.fonts.label }}>
                                               Externo: <span style={{ color: EX_COLOR }}>{formatNumberBR(externo)}</span>
                                             </div>
                                           )}
                                         </div>
                                       )
                                     }
                                     return <Tooltip content={CustomTooltip as any} />
                                   })()}
                                  {(() => {
                                    const IN_COLOR = "#3b82f6"
                                    const EX_COLOR = "#7c3aed" // roxo mais intenso para maior contraste
                                    const labelColor = darkMode ? "#cbd5e1" : "#334155"
                                    const isZeroish = (n: number) => {
                                      const val = Number(n) || 0
                                      return Math.abs(val) < 0.005
                                    }
                                    const renderLabelMaior = (props: any) => {
                                      const { value, x, y, width } = props || {}
                                      const val = Number(value) || 0
                                      if (isZeroish(val)) return null
                                      const cx = (Number(x) || 0) + (Number(width) || 0) / 2
                                      return (
                                        <text x={cx} y={y} dy={-10} textAnchor="middle" fill={labelColor} fontSize={UI_CONFIG.fonts.label}>
                                          {formatNumberBR(val)}
                                        </text>
                                      )
                                    }
                                    const renderLabelMenor = (props: any) => {
                                      const { value, x, y, width } = props || {}
                                      const val = Number(value) || 0
                                      if (isZeroish(val)) return null
                                      const cx = (Number(x) || 0) + (Number(width) || 0) / 2
                                      return (
                                        <text x={cx} y={y} dy={-24} textAnchor="middle" fill={labelColor} fontSize={UI_CONFIG.fonts.label}>
                                          {formatNumberBR(val)}
                                        </text>
                                      )
                                    }
                                    const renderLegend = () => (
                                      <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: UI_CONFIG.fonts.legend, justifyContent: "center", width: "100%" }}>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                          <span style={{ width: 10, height: 10, background: IN_COLOR, borderRadius: 2 }} /> Mercado Interno
                                        </span>
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                          <span style={{ width: 10, height: 10, background: EX_COLOR, borderRadius: 2 }} /> Mercado Externo
                                        </span>
                                      </div>
                                    )
                                    return (
                                      <>
                                        <Legend
                                          align="center"
                                          verticalAlign="bottom"
                                          content={renderLegend as any}
                                          wrapperStyle={{ bottom: -10 }}
                                        />
                                        {/* Barra maior (base) */}
                                        <Bar dataKey="maior" name="Maior" radius={[6, 6, 0, 0]}>
                                          {chartData.map((entry: any, idx: number) => (
                                            <Cell key={`maior-${idx}`} fill={entry.maiorTipo === "interno" ? IN_COLOR : EX_COLOR} />
                                          ))}
                                          <LabelList dataKey="maior" content={renderLabelMaior as any} />
                                        </Bar>
                                        {/* Barra menor (sobreposta dentro da maior) */}
                                        <Bar
                                          dataKey="menor"
                                          name="Menor"
                                          radius={[6, 6, 0, 0]}
                                          stroke={darkMode ? "rgba(255,255,255,0.35)" : "rgba(51,65,85,0.35)"}
                                          strokeWidth={1}
                                        >
                                          {chartData.map((entry: any, idx: number) => (
                                            <Cell key={`menor-${idx}`} fill={entry.maiorTipo === "interno" ? EX_COLOR : IN_COLOR} />
                                          ))}
                                          <LabelList dataKey="menor" content={renderLabelMenor as any} />
                                        </Bar>
                                      </>
                                    )
                                  })()}
                                </BarChart>
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

            <Card
              className={`${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border border-slate-200"} shadow-lg hover:shadow-xl transition-all duration-200 print:inline-block print:w-1/3 print:align-top print:break-inside-avoid`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle
                    className={`${UI_CONFIG.fonts.titleCls} flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-800"}`}
                  >
                    <TrendingUp className={`h-5 w-5 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                    Detalhamento dos Tributos
                  </CardTitle>
                  <CardDescription className={`${UI_CONFIG.fonts.descCls} ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
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

                        const init = () => ({
                          IRPJ: 0,
                          CSLL: 0,
                          COFINS: 0,
                          PIS_Pasep: 0,
                          INSS_CPP: 0,
                          ICMS: 0,
                          IPI: 0,
                          ISS: 0,
                        })
                        const sumMercadoriasInterno = init()
                        const sumMercadoriasExterior = init()
                        const sumServicosInterno = init()
                        const sumServicosExterior = init()

                        const atividadesDbgRaw = (data as any)?.debug?.atividades
                        const atividadesDbgList = Array.isArray(atividadesDbgRaw)
                          ? atividadesDbgRaw
                          : atividadesDbgRaw && typeof atividadesDbgRaw === "object"
                            ? Object.values(atividadesDbgRaw)
                            : []

                        if (Array.isArray(atividadesDbgList) && atividadesDbgList.length > 0) {
                          for (const atv of atividadesDbgList) {
                            const nomeRaw = String(atv?.name || atv?.nome || "")
                            const trib: any = atv?.tributos || {}
                            const cls = classifyAtividade(nomeRaw)
                            const issVal = parseNumber(trib.iss ?? trib.ISS ?? 0)
                            const icmsVal = parseNumber(trib.icms ?? trib.ICMS ?? 0)
                            const mercado = cls.mercado === "externo" ? "externo" : "interno"
                            const target = ((): typeof sumMercadoriasInterno => {
                              if (issVal > 0 && icmsVal === 0) {
                                return mercado === "externo" ? sumServicosExterior : sumServicosInterno
                              }
                              if (icmsVal > 0 && issVal === 0) {
                                return mercado === "externo" ? sumMercadoriasExterior : sumMercadoriasInterno
                              }
                              return cls.tipo === "servicos"
                                ? mercado === "externo"
                                  ? sumServicosExterior
                                  : sumServicosInterno
                                : mercado === "externo"
                                  ? sumMercadoriasExterior
                                  : sumMercadoriasInterno
                            })()
                            target.IRPJ += parseNumber(trib.irpj ?? trib.IRPJ ?? 0)
                            target.CSLL += parseNumber(trib.csll ?? trib.CSLL ?? 0)
                            target.COFINS += parseNumber(trib.cofins ?? trib.COFINS ?? 0)
                            target.PIS_Pasep += parseNumber(
                              trib.pis ??
                                trib.PIS ??
                                trib.pis_pasep ??
                                trib.PIS_PASEP ??
                                trib["PIS/PASEP"] ??
                                trib.PIS_Pasep ??
                                0,
                            )
                            target.INSS_CPP += parseNumber(trib.inss_cpp ?? trib.INSS_CPP ?? trib["INSS/CPP"] ?? 0)
                            target.ICMS += parseNumber(trib.icms ?? trib.ICMS ?? 0)
                            target.IPI += parseNumber(trib.ipi ?? trib.IPI ?? 0)
                            target.ISS += parseNumber(trib.iss ?? trib.ISS ?? 0)
                          }
                        } else {
                          // Fallback: sem atividades, aloca tudo conforme cenário
                          const cenario = String((data as any)?.cenario || "").toLowerCase()
                          const assignToServicos = cenario.includes("serv")
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

                        const colMercadoriasInternoVisible = tribKeys.some(
                          (k) => (sumMercadoriasInterno as any)[k.key] > 0,
                        )
                        const colMercadoriasExteriorVisible = tribKeys.some(
                          (k) => (sumMercadoriasExterior as any)[k.key] > 0,
                        )
                        const colServicosInternoVisible = tribKeys.some((k) => (sumServicosInterno as any)[k.key] > 0)
                        const colServicosExteriorVisible = tribKeys.some((k) => (sumServicosExterior as any)[k.key] > 0)

                        return (
                          <tr className="border-b border-slate-200">
                            <th
                              className={`text-left py-3 px-2 font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}
                            >
                              Tributo
                            </th>
                            {colMercadoriasInternoVisible && (
                              <th
                                className={`text-center py-3 px-2 font-semibold ${darkMode ? "text-blue-300" : "text-blue-600"}`}
                              >
                                Mercadorias (interno)
                              </th>
                            )}
                            {colMercadoriasExteriorVisible && (
                              <th
                                className={`text-center py-3 px-2 font-semibold ${darkMode ? "text-indigo-300" : "text-indigo-600"}`}
                              >
                                Mercadorias (externo)
                              </th>
                            )}
                            {colServicosInternoVisible && (
                              <th className={`text-center py-3 px-2 font-semibold text-emerald-600`}>
                                Serviços (interno)
                              </th>
                            )}
                            {colServicosExteriorVisible && (
                              <th className={`text-center py-3 px-2 font-semibold text-teal-600`}>
                                Serviços (externo)
                              </th>
                            )}
                            <th
                              className={`text-center py-3 px-2 font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}
                            >
                              Total
                            </th>
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

                        const init = () => ({
                          IRPJ: 0,
                          CSLL: 0,
                          COFINS: 0,
                          PIS_Pasep: 0,
                          INSS_CPP: 0,
                          ICMS: 0,
                          IPI: 0,
                          ISS: 0,
                        })
                        const sumMercadoriasInterno = init()
                        const sumMercadoriasExterior = init()
                        const sumServicosInterno = init()
                        const sumServicosExterior = init()

                        const atividadesDbgRaw = (data as any)?.debug?.atividades
                        const atividadesDbgList = Array.isArray(atividadesDbgRaw)
                          ? atividadesDbgRaw
                          : atividadesDbgRaw && typeof atividadesDbgRaw === "object"
                            ? Object.values(atividadesDbgRaw)
                            : []

                        if (Array.isArray(atividadesDbgList) && atividadesDbgList.length > 0) {
                          for (const atv of atividadesDbgList) {
                            const nomeRaw = String(atv?.name || atv?.nome || "")
                            const trib: any = atv?.tributos || {}
                            const cls = classifyAtividade(nomeRaw)
                            const issVal = parseNumber(trib.iss ?? trib.ISS ?? 0)
                            const icmsVal = parseNumber(trib.icms ?? trib.ICMS ?? 0)
                            const mercado = cls.mercado === "externo" ? "externo" : "interno"
                            const target = ((): typeof sumMercadoriasInterno => {
                              if (issVal > 0 && icmsVal === 0) {
                                return mercado === "externo" ? sumServicosExterior : sumServicosInterno
                              }
                              if (icmsVal > 0 && issVal === 0) {
                                return mercado === "externo" ? sumMercadoriasExterior : sumMercadoriasInterno
                              }
                              return cls.tipo === "servicos"
                                ? mercado === "externo"
                                  ? sumServicosExterior
                                  : sumServicosInterno
                                : mercado === "externo"
                                  ? sumMercadoriasExterior
                                  : sumMercadoriasInterno
                            })()
                            target.IRPJ += parseNumber(trib.irpj ?? trib.IRPJ ?? 0)
                            target.CSLL += parseNumber(trib.csll ?? trib.CSLL ?? 0)
                            target.COFINS += parseNumber(trib.cofins ?? trib.COFINS ?? 0)
                            target.PIS_Pasep += parseNumber(
                              trib.pis ??
                                trib.PIS ??
                                trib.pis_pasep ??
                                trib.PIS_PASEP ??
                                trib["PIS/PASEP"] ??
                                trib.PIS_Pasep ??
                                0,
                            )
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

                        const rows = tribKeys
                          .map(({ key, label }) => {
                            const mercadoriasInterno = (sumMercadoriasInterno as any)[key] || 0
                            const mercadoriasExterior = (sumMercadoriasExterior as any)[key] || 0
                            const servicosInterno = (sumServicosInterno as any)[key] || 0
                            const servicosExterior = (sumServicosExterior as any)[key] || 0
                            const totalDbg =
                              mercadoriasInterno + mercadoriasExterior + servicosInterno + servicosExterior
                            const totalNorm = (data.tributos as any)[key] || 0
                            // Use totDeclarado for table values if available, otherwise use debug values, then normalized values
                            const totDeclarado = (data as any)?.debug?.parcelas?.totais?.declarado
                            const totalDecl = totDeclarado
                              ? (totDeclarado as any)[key === "PIS_Pasep" ? "PIS_Pasep" : key] || 0
                              : 0
                            const total = totalDecl > 0 ? totalDecl : totalDbg > 0 ? totalDbg : totalNorm
                            return {
                              key,
                              label,
                              mercadoriasInterno,
                              mercadoriasExterior,
                              servicosInterno,
                              servicosExterior,
                              total,
                            }
                          })
                          .filter(
                            (r) =>
                              r.total > 0 ||
                              r.mercadoriasInterno > 0 ||
                              r.mercadoriasExterior > 0 ||
                              r.servicosInterno > 0 ||
                              r.servicosExterior > 0,
                          )
                        const colMercadoriasInternoVisible = tribKeys.some(
                          (k) => (sumMercadoriasInterno as any)[k.key] > 0,
                        )
                        const colMercadoriasExteriorVisible = tribKeys.some(
                          (k) => (sumMercadoriasExterior as any)[k.key] > 0,
                        )
                        const colServicosInternoVisible = tribKeys.some((k) => (sumServicosInterno as any)[k.key] > 0)
                        const colServicosExteriorVisible = tribKeys.some((k) => (sumServicosExterior as any)[k.key] > 0)

                        if (rows.length === 0) {
                          const colSpan =
                            1 +
                            (colMercadoriasInternoVisible ? 1 : 0) +
                            (colMercadoriasExteriorVisible ? 1 : 0) +
                            (colServicosInternoVisible ? 1 : 0) +
                            (colServicosExteriorVisible ? 1 : 0) +
                            1
                          return [
                            <tr key="none" className="border-b border-slate-100">
                              <td
                                colSpan={colSpan}
                                className={`py-2 px-2 text-center ${darkMode ? "text-slate-300" : "text-slate-500"}`}
                              >
                                Nenhum tributo aplicável
                              </td>
                            </tr>,
                          ]
                        }

                        return rows.map(
                          ({
                            key,
                            label,
                            mercadoriasInterno,
                            mercadoriasExterior,
                            servicosInterno,
                            servicosExterior,
                            total,
                          }) => (
                            <tr
                              key={key}
                              className="border-b border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              <td className={`py-2 px-2 font-medium ${darkMode ? "text-white" : "text-slate-800"}`}>
                                {label}
                              </td>
                              {colMercadoriasInternoVisible && (
                                <td
                                  className={`py-2 px-2 text-center font-medium ${darkMode ? "text-blue-300" : "text-blue-600"}`}
                                >
                                  {mercadoriasInterno > 0 ? formatCurrency(mercadoriasInterno) : ""}
                                </td>
                              )}
                              {colMercadoriasExteriorVisible && (
                                <td
                                  className={`py-2 px-2 text-center font-medium ${darkMode ? "text-indigo-300" : "text-indigo-600"}`}
                                >
                                  {mercadoriasExterior > 0 ? formatCurrency(mercadoriasExterior) : ""}
                                </td>
                              )}
                              {colServicosInternoVisible && (
                                <td className="py-2 px-2 text-center text-emerald-600 font-medium">
                                  {servicosInterno > 0 ? formatCurrency(servicosInterno) : ""}
                                </td>
                              )}
                              {colServicosExteriorVisible && (
                                <td className="py-2 px-2 text-center text-teal-600 font-medium">
                                  {servicosExterior > 0 ? formatCurrency(servicosExterior) : ""}
                                </td>
                              )}
                              <td
                                className={`py-2 px-2 text-center font-semibold ${darkMode ? "text-white" : "text-slate-800"}`}
                              >
                                {formatCurrency(total)}
                              </td>
                            </tr>
                          ),
                        )
                      })()}
                      {(() => {
                        // Recalcula totais a partir das linhas já construídas (usando debug quando possível)
                        const tribKeys = [
                          "IRPJ",
                          "CSLL",
                          "COFINS",
                          "PIS_Pasep",
                          "INSS_CPP",
                          "ICMS",
                          "IPI",
                          "ISS",
                        ] as const

                        const init = () => ({
                          IRPJ: 0,
                          CSLL: 0,
                          COFINS: 0,
                          PIS_Pasep: 0,
                          INSS_CPP: 0,
                          ICMS: 0,
                          IPI: 0,
                          ISS: 0,
                        })
                        const sumMercadoriasInterno = init()
                        const sumMercadoriasExterior = init()
                        const sumServicosInterno = init()
                        const sumServicosExterior = init()

                        const atividadesDbgRaw = (data as any)?.debug?.atividades
                        const atividadesDbgList = Array.isArray(atividadesDbgRaw)
                          ? atividadesDbgRaw
                          : atividadesDbgRaw && typeof atividadesDbgRaw === "object"
                            ? Object.values(atividadesDbgRaw)
                            : []
                        if (Array.isArray(atividadesDbgList) && atividadesDbgList.length > 0) {
                          for (const atv of atividadesDbgList) {
                            const nomeRaw = String(atv?.name || atv?.nome || "")
                            const trib: any = atv?.tributos || {}
                            const cls = classifyAtividade(nomeRaw)
                            const issVal = parseNumber(trib.iss ?? trib.ISS ?? 0)
                            const icmsVal = parseNumber(trib.icms ?? trib.ICMS ?? 0)
                            const mercado = cls.mercado === "externo" ? "externo" : "interno"
                            const target = ((): typeof sumMercadoriasInterno => {
                              if (issVal > 0 && icmsVal === 0) {
                                return mercado === "externo" ? sumServicosExterior : sumServicosInterno
                              }
                              if (icmsVal > 0 && issVal === 0) {
                                return mercado === "externo" ? sumMercadoriasExterior : sumMercadoriasInterno
                              }
                              return cls.tipo === "servicos"
                                ? mercado === "externo"
                                  ? sumServicosExterior
                                  : sumServicosInterno
                                : mercado === "externo"
                                  ? sumMercadoriasExterior
                                  : sumMercadoriasInterno
                            })()
                            target.IRPJ += parseNumber(trib.irpj ?? trib.IRPJ ?? 0)
                            target.CSLL += parseNumber(trib.csll ?? trib.CSLL ?? 0)
                            target.COFINS += parseNumber(trib.cofins ?? trib.COFINS ?? 0)
                            target.PIS_Pasep += parseNumber(
                              trib.pis ??
                                trib.PIS ??
                                trib.pis_pasep ??
                                trib.PIS_PASEP ??
                                trib["PIS/PASEP"] ??
                                trib.PIS_Pasep ??
                                0,
                            )
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

                        const totalMercadoriasInterno = tribKeys.reduce(
                          (sum, k) => sum + (sumMercadoriasInterno as any)[k],
                          0,
                        )
                        const totalMercadoriasExterior = tribKeys.reduce(
                          (sum, k) => sum + (sumMercadoriasExterior as any)[k],
                          0,
                        )
                        const totalServicosInterno = tribKeys.reduce(
                          (sum, k) => sum + (sumServicosInterno as any)[k],
                          0,
                        )
                        const totalServicosExterior = tribKeys.reduce(
                          (sum, k) => sum + (sumServicosExterior as any)[k],
                          0,
                        )
                        const grandTotalDbg =
                          totalMercadoriasInterno +
                          totalMercadoriasExterior +
                          totalServicosInterno +
                          totalServicosExterior
                        // Use totDeclarado for the footer total if available
                        const totDeclarado = (data as any)?.debug?.parcelas?.totais?.declarado
                        const totalDeclaradoFooter = parseNumber(totDeclarado?.total ?? totDeclarado?.Total ?? 0)
                        const grandTotal =
                          totalDeclaradoFooter && totalDeclaradoFooter > 0
                            ? totalDeclaradoFooter
                            : grandTotalDbg > 0
                              ? grandTotalDbg
                              : data.tributos?.Total || 0
                        const colMercadoriasInternoVisible = totalMercadoriasInterno > 0
                        const colMercadoriasExteriorVisible = totalMercadoriasExterior > 0
                        const colServicosInternoVisible = totalServicosInterno > 0
                        const colServicosExteriorVisible = totalServicosExterior > 0

                        return (
                          <tr
                            className={`${darkMode ? "border-t-2 border-slate-700 bg-slate-800" : "border-t-2 border-slate-300 bg-slate-50"}`}
                          >
                            <td className={`py-2 px-2 font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
                              Total
                            </td>
                            {colMercadoriasInternoVisible && (
                              <td
                                className={`py-2 px-2 text-center font-bold ${darkMode ? "text-blue-300" : "text-blue-600"}`}
                              >
                                {formatCurrency(totalMercadoriasInterno)}
                              </td>
                            )}
                            {colMercadoriasExteriorVisible && (
                              <td
                                className={`py-2 px-2 text-center font-bold ${darkMode ? "text-indigo-300" : "text-indigo-600"}`}
                              >
                                {formatCurrency(totalMercadoriasExterior)}
                              </td>
                            )}
                            {colServicosInternoVisible && (
                              <td className="py-2 px-2 text-center font-bold text-emerald-600">
                                {formatCurrency(totalServicosInterno)}
                              </td>
                            )}
                            {colServicosExteriorVisible && (
                              <td className="py-2 px-2 text-center font-bold text-teal-600">
                                {formatCurrency(totalServicosExterior)}
                              </td>
                            )}
                            <td
                              className={`py-2 px-2 text-center font-bold ${darkMode ? "text-white" : "text-slate-800"}`}
                            >
                              {formatCurrency(grandTotal)}
                            </td>
                          </tr>
                        )
                      })()}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Gráficos de Pizza - Composição dos Tributos */}
            {data?.graficos && (data.graficos.dasPie || data.graficos.totalTributos) && data?.tributos && typeof data.tributos === "object" && (
              <div className="grid grid-cols-1 gap-4 sm:gap-6 print:contents">
                {/* Gráfico de Pizza - Distribuição do DAS */}
                <Card
                  id="print-pie"
                  className={`${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border border-slate-200"} shadow-lg hover:shadow-xl transition-all duration-200 print:inline-block print:w-1/3 print:align-top print:break-inside-avoid`}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle
                        className={`${UI_CONFIG.fonts.titleCls} flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-800"}`}
                      >
                        <TrendingUp className={`h-5 w-5 ${darkMode ? "text-purple-400" : "text-purple-500"}`} />
                        Distribuição do DAS
                      </CardTitle>
                      <CardDescription
                        className={`${UI_CONFIG.fonts.descCls} ${darkMode ? "text-slate-400" : "text-slate-500"}`}
                      >
                        Composição percentual dos tributos
                      </CardDescription>
                    </div>
                    {/* Botão de exportação removido conforme solicitado */}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Valores numéricos à esquerda (mostrar também no PDF) */}
                      <div className="space-y-0.5 print:block">
                        <h4 className={`font-semibold text-[9]${darkMode ? "text-slate-200" : "text-slate-700"} mb-4`}>
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
                        ]
                          .filter((item) => {
                            const value = (((data?.tributos as any) ?? {})[item.key] as number) || 0
                            return value > 0
                          })
                          .map(({ key, label, color }) => {
                            const value = (((data?.tributos as any) ?? {})[key] as number) || 0
                            const total = Number(data?.tributos?.Total || 0)
                            const percentage = total > 0 ? (value / total) * 100 : 0

                            return (
                              <div
                                key={key}
                                className={`flex items-center justify-between p-2 rounded-lg ${darkMode ? "bg-slate-700/50" : "bg-slate-50"} hover:shadow-md transition-all duration-200`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                                    style={{ backgroundColor: color }}
                                  />
                                  <div>
                                    <div
                                      className={`font-medium text-[9] ${darkMode ? "text-slate-200" : "text-slate-800"}`}
                                    >
                                      {label}
                                    </div>
                                    <div className={`text- [9] ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                      {percentage.toFixed(5)}%
                                    </div>
                                  </div>
                                </div>
                                <div className={`font-bold text-[9] ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                                  {formatCurrency(value)}
                                </div>
                              </div>
                            )
                          })}

                        {/* Total */}
                        <div
                          className={`flex items-center justify-between p-2 rounded-lg border-2 ${darkMode ? "bg-slate-600 border-slate-500" : "bg-slate-100 border-slate-300"} font-bold`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${darkMode ? "bg-slate-300" : "bg-slate-600"}`} />
                            <div>
                              <div className={`font-bold text-[9] ${darkMode ? "text-slate-100" : "text-slate-800"}`}>
                                TOTAL DAS
                              </div>
                              <div className={`text-xs ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                                100.00000%
                              </div>
                            </div>
                          </div>
                          <div className={`font-bold text-lg ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                            {formatCurrency(Number(data?.tributos?.Total || 0))}
                          </div>
                        </div>
                      </div>

                      {/* Gráfico de Pizza à direita */}
                      <div className="flex flex-col">
                        <h4 className={`font-semibold text-[9] ${darkMode ? "text-slate-200" : "text-slate-700"} mb-4`}>
                          Visualização Gráfica
                        </h4>
                        
                        <div id="chart-das-pie" className="flex-1 flex items-center justify-center">
                          <div ref={pieRef} className="w-full overflow-visible print:h-[200px]" style={{ height: UI_CONFIG.dims.dasPieHeight }}>
                            {/* Mostrar sempre o gráfico; usar imagem apenas na impressão */}
                            <div className="block print:hidden w-full" style={{ height: UI_CONFIG.dims.dasPieHeight }}>
                              <ResponsiveContainer width="100%" height="100%">
                                {(() => {
                                  const items = [
                                    { label: "IRPJ", value: Number(data?.tributos?.IRPJ || 0) },
                                    { label: "CSLL", value: Number(data?.tributos?.CSLL || 0) },
                                    { label: "COFINS", value: Number(data?.tributos?.COFINS || 0) },
                                    { label: "PIS/PASEP", value: Number(data?.tributos?.PIS_Pasep || 0) },
                                    { label: "INSS/CPP", value: Number(data?.tributos?.INSS_CPP || 0) },
                                    { label: "ICMS", value: Number(data?.tributos?.ICMS || 0) },
                                    { label: "IPI", value: Number(data?.tributos?.IPI || 0) },
                                    { label: "ISS", value: Number(data?.tributos?.ISS || 0) },
                                  ].filter((i) => i.value > 0)
                                  const chartData = items.map((it, idx) => ({
                                    name: it.label,
                                    value: it.value,
                                    color: CHART_COLORS[idx % CHART_COLORS.length],
                                  }))
                                  return (
                                    <PieChart>
                                      <Pie
                                        data={chartData}
                                        dataKey="value"
                                        nameKey="name"
                                        outerRadius={UI_CONFIG.pie.outerRadius}
                                        labelLine
                                        label={(entry: any) => `${entry.name}: ${formatCurrency(Number(entry.value))}`}
                                      >
                                        {chartData.map((entry, idx) => (
                                          <Cell key={`cell-${idx}`} fill={entry.color} />
                                        ))}
                                      </Pie>
                                      <Tooltip
                                        formatter={(value: number | string, name: string) => [formatCurrency(Number(value)), String(name)]}
                                        contentStyle={{
                                          background: darkMode ? "#0f172a" : "#ffffff",
                                          borderColor: darkMode ? "#334155" : "#e2e8f0",
                                        }}
                                      />
                                    </PieChart>
                                  )
                                })()}
                              </ResponsiveContainer>
                            </div>
                            {pieImageUrl && (
                              <img src={pieImageUrl} alt="Gráfico de Pizza DAS" className="hidden print:block w-full object-contain" style={{ height: UI_CONFIG.dims.dasPiePrintHeight }} />
                            )}
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
                ...(mercadorias > 0
                  ? [{ name: "Mercadorias", value: mercadorias, color: ATIVIDADES_COLORS?.mercadorias || "#3b82f6" }]
                  : []),
                ...(servicos > 0
                  ? [{ name: "Serviços", value: servicos, color: ATIVIDADES_COLORS?.servicos || "#10b981" }]
                  : []),
              ]
              const total = mercadorias + servicos
              return (
                <Card
                  className={`${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border border-slate-200"} shadow-lg hover:shadow-xl transition-all duration-200 print:inline-block print:w-1/3 print:align-top print:break-inside-avoid`}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle
                        className={`text-base sm:text-[9] flex items-center gap-2 ${darkMode ? "text-white" : "text-slate-800"}`}
                      >
                        <BarChart className={`h-5 w-5 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                        Comparativo por Atividade (DAS)
                      </CardTitle>
                      <CardDescription
                        className={`text-xs sm:text-[9] ${darkMode ? "text-slate-400" : "text-slate-500"}`}
                      >
                        Distribuição do DAS entre Mercadorias e Serviços
                      </CardDescription>
                    </div>
                    <div className={`text-[9] font-semibold ${darkMode ? "text-slate-200" : "text-slate-700"}`}>
                      Total: {formatCurrency(total)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Tabela rápida à esquerda (mostrar também no PDF) */}
                      <div className="space-y-0.5 print:block">
                        {[
                          {
                            key: "mercadorias",
                            label: "Mercadorias",
                            value: mercadorias,
                            color: ATIVIDADES_COLORS?.mercadorias || "#3b82f6",
                          },
                          {
                            key: "servicos",
                            label: "Serviços",
                            value: servicos,
                            color: ATIVIDADES_COLORS?.servicos || "#10b981",
                          },
                        ]
                          .filter((item) => item.value > 0)
                          .map(({ key, label, value, color }) => {
                            const pct = total > 0 ? (value / total) * 100 : 0
                            return (
                              <div
                                key={key}
                                className={`flex items-center justify-between p-2 rounded-lg ${darkMode ? "bg-slate-700/50" : "bg-slate-50"} hover:shadow-md transition-all duration-200`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                                    style={{ backgroundColor: color }}
                                  />
                                  <div>
                                    <div
                                      className={`font-medium text-sm ${darkMode ? "text-slate-200" : "text-slate-800"}`}
                                    >
                                      {label}
                                    </div>
                                    <div className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                                      {pct.toFixed(5)}%
                                    </div>
                                  </div>
                                </div>
                                <div className={`font-bold text-sm ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                                  {formatCurrency(value)}
                                </div>
                              </div>
                            )
                          })}
                        <div
                          className={`flex items-center justify-between p-2 rounded-lg border-2 ${darkMode ? "bg-slate-600 border-slate-500" : "bg-slate-100 border-slate-300"} font-bold`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${darkMode ? "bg-slate-300" : "bg-slate-600"}`} />
                            <div>
                              <div className={`font-bold text-sm ${darkMode ? "text-slate-100" : "text-slate-800"}`}>
                                TOTAL DAS (Atividades)
                              </div>
                              <div className={`text-xs ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                                100.00000%
                              </div>
                            </div>
                          </div>
                          <div className={`font-bold text-lg ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                            {formatCurrency(total)}
                          </div>
                        </div>
                      </div>

                      {/* Gráfico de barras à direita */}
                      <div className="flex flex-col">
                        <h4 className={`font-semibold text-[10] ${darkMode ? "text-slate-200" : "text-slate-700"} mb-4`}>
                          Visualização Gráfica
                        </h4>
                        <div id="chart-atividades-bar" className="flex-1 flex items-center justify-center">
                          <div className="h-[260px] print:h-[230px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                                <CartesianGrid
                                  strokeDasharray="1 1"
                                  opacity={0.2}
                                  vertical={false}
                                  stroke={darkMode ? "#475569" : "#e2e8f0"}
                                />
                                <XAxis
                                  dataKey="name"
                                  tick={{ fontSize: 7, fontWeight: 400, fill: darkMode ? "#94a3b8" : "#64748b" }}
                                  tickLine={false}
                                  axisLine={{ stroke: darkMode ? "#475569" : "#cbd5e1", strokeWidth: 1 }}
                                />
                                <YAxis
                                  tick={{ fontSize: 7, fontWeight: 400, fill: darkMode ? "#94a3b8" : "#64748b" }}
                                  tickLine={false}
                                  axisLine={{ stroke: darkMode ? "#475569" : "#cbd5e1", strokeWidth: 1 }}
                                  tickFormatter={(v: number) =>
                                    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                      Number(v),
                                    )
                                  }
                                />
                                <Tooltip
                                  formatter={(value: number | string, name: string) => [formatCurrency(Number(value)), String(name)]}
                                  contentStyle={{
                                    borderRadius: "10px",
                                    backgroundColor: darkMode ? "#1e293b" : "#ffffff",
                                    border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
                                    boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                  }}
                                  labelStyle={{ fontWeight: "600" }}
                                />
                                <Legend />
                                <Bar dataKey="value" name="DAS" barSize={40}>
                                  {chartData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={entry.color}
                                      stroke={darkMode ? "#1e293b" : "#ffffff"}
                                      strokeWidth={2}
                                    />
                                  ))}
                                  <LabelList
                                    content={(props: any) => {
                                      const { x = 0, y = 0, width = 0, value = 0 } = props || {}
                                      const lx = Number(x) + Number(width) / 2
                                      const ly = Number(y) - 6
                                      return (
                                        <text x={lx} y={ly} fill={darkMode ? "#e2e8f0" : "#1f2937"} fontSize={10} textAnchor="middle">
                                          {formatCurrency(Number(value))}
                                        </text>
                                      )
                                    }}
                                  />
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
                <Card
                  id="print-insights"
                  className={`${darkMode ? "bg-slate-800 border-slate-700" : "bg-white border border-slate-200"} shadow`}
                >
                  <CardContent className="pt-3 sm:pt-4 space-y-2">
                    {data.insights.comparativoSetorial && (
                      <div className="flex items-start gap-2">
                        <TrendingUp className={`h-4 w-4 ${darkMode ? "text-blue-400" : "text-blue-600"} mt-0.5 flex-shrink-0`} />
                        <p className={`text-xs ${darkMode ? "text-slate-300" : "text-slate-800"}`}>{data.insights.comparativoSetorial}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      {(() => {
                        const items: { type: "atencao" | "oportunidade" | "economia" | "regime" | "obs" | "receita"; text: string }[] = []
                        for (const ponto of (data.insights.pontosAtencao || [])) items.push({ type: "atencao", text: ponto })
                        for (const op of (data.insights.oportunidades || [])) items.push({ type: "oportunidade", text: op })
                        for (const eco of (data.insights.economiaImpostos || [])) items.push({ type: "economia", text: eco })
                        if (data.insights.regimeTributario) {
                          const rt = data.insights.regimeTributario
                          const base = rt.adequado ? "Regime atual adequado: " : "Sugestão de regime: "
                          const texto = `${base}${rt.sugestao || (rt.adequado ? "Simples Nacional" : "")}${rt.justificativa ? ` — ${rt.justificativa}` : ""}`
                          items.push({ type: "regime", text: texto })
                        }
                        for (const obs of (data.insights.dasObservacoes || [])) items.push({ type: "obs", text: obs })
                        for (const rm of (data.insights.receitaMensal || [])) items.push({ type: "receita", text: rm })
                        return items.slice(0, 4).map((it, idx) => (
                          <div key={`ins-${idx}`} className="flex items-start gap-2">
                            {it.type === "atencao" && (<AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />)}
                            {it.type === "oportunidade" && (<TrendingUp className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />)}
                            {it.type === "economia" && (<DollarSign className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />)}
                            {it.type === "regime" && (<Shield className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />)}
                            {it.type === "obs" && (<FileText className="h-4 w-4 text-sky-500 mt-0.5 flex-shrink-0" />)}
                            {it.type === "receita" && (<TrendingUp className="h-4 w-4 text-teal-500 mt-0.5 flex-shrink-0" />)}
                            <p className={`${darkMode ? "text-slate-300" : "text-slate-700"} text-xs`}>{it.text}</p>
                          </div>
                        ))
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Contato final conforme imagem 3 */}
            <Card
              className={`${darkMode ? "bg-slate-800 border-slate-700" : "bg-blue-50 border-blue-200"} shadow mt-6`}
            >
              <CardHeader>
                <CardTitle className={`${darkMode ? "text-slate-100" : "text-slate-900"} text-base sm:text-lg`}>
                  Caso queira uma análise mais completa e personalizada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 items-start">
                  {/* Coluna esquerda: frases descritivas */}
                  <div>
                    <CardDescription className={`${darkMode ? "text-slate-300" : "text-slate-700"} text-xs sm:text-[10]`}>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Cenários comparativos entre regimes tributários (Simples, Presumido e Real)</li>
                        <li>Simulações de economia fiscal</li>
                        <li>Recomendações exclusivas para o seu ramo</li>
                      </ul>
                    </CardDescription>
                  </div>
                  {/* Coluna direita: bloco de contato */}
                  <div
                    className={`${darkMode ? "bg-slate-900/40 border-slate-700" : "bg-white/60 border-blue-200"} border rounded-md p-3`}
                  >
                    <p className={`${darkMode ? "text-slate-200" : "text-slate-800"} font-medium mb-1 text-xs sm:text-[10]`}>
                      Fale com a Integra:
                    </p>
                    <div className="flex flex-col gap-1">
                      <p className={`${darkMode ? "text-slate-300" : "text-slate-700"} text-xs sm:text-[10]`}> 
                        WhatsApp:{" "}
                        <a
                          href="https://wa.me/559481264638?text=Ol%C3%A1%20quero%20uma%20an%C3%A1lise%20mais%20completa%20do%20meu%20DAS"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${darkMode ? "text-green-300" : "text-green-700"} underline hover:opacity-80`}
                        >
                          94 8126-4638
                        </a>
                      </p>
                      <p className={`${darkMode ? "text-slate-300" : "text-slate-700"} text-xs sm:text-sm`}> 
                        E-mail:{" "}
                        <a
                          href="mailto:atendimento@integratecnologia.inf.br"
                          className={`${darkMode ? "text-blue-300" : "text-blue-700"} underline hover:opacity-80`}
                        >
                          atendimento@integratecnologia.inf.br
                        </a>
                      </p>
                    </div>
                    <p className={`${darkMode ? "text-slate-400" : "text-slate-500"} text-[14] mt-2`}>
                      Integra Soluções Empresariais
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Controles de exportação de PDF (visíveis no dashboard, ocultos no PDF) */}

            <div
              id="print-controls"
              className="flex flex-col sm:flex-row justify-center gap-3 pt-2 print:hidden"
              data-hide-for-client-pdf
            >
              <Button
                onClick={() => {
                  router.push('/')
                }}
                variant={darkMode ? "secondary" : "outline"}
                size="lg"
                className={`w-full sm:w-auto ${darkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600" : ""}`}
              >
                Processar Novo PDF
              </Button>
              <Button
                type="button"
                onClick={generateImage}
                disabled={isGeneratingImage}
                variant={darkMode ? "secondary" : "default"}
                size="lg"
                className={`w-full sm:w-auto ${darkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600" : ""} flex items-center gap-2`}
              >
                {isGeneratingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                <span>{isGeneratingImage ? "Gerando..." : "Gerar Imagem (PNG)"}</span>
              </Button>
              {!hideDownloadButton && (
                <div className="flex w-full sm:w-auto gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      const idToUse = resolvedShareId
                      if (idToUse) {
                        const base = (process.env.NEXT_PUBLIC_BASE_URL as string | undefined) || window.location.origin
                        const url = `${base}/api/pdf/${idToUse}`
                        window.open(url, '_blank', 'noopener')
                        return
                      }
                      // Em produção, evitamos gerador de PDF do cliente que pode falhar
                      if (process.env.NODE_ENV === 'production') {
                        toast({ title: 'Baixar PDF', description: 'Crie um link compartilhado antes de baixar o PDF.', })
                        return
                      }
                      downloadClientPdf()
                    }}
                    disabled={downloadingClientPdf && !resolvedShareId}
                    variant={darkMode ? 'secondary' : 'default'}
                    size="lg"
                    className={`flex-1 sm:flex-none ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600' : ''} flex items-center gap-2`}
                  >
                    {downloadingClientPdf ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Download className="h-5 w-5" />
                    )}
                    <span>{downloadingClientPdf && !resolvedShareId ? 'Gerando...' : 'Baixar PDF'}</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PGDASDProcessorIA
