"use client"

import type React from "react"
import { useState, useRef } from "react"
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
import { PdfGenerator } from "./pdf-generator"
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
  }
  debug?: any
}

const CHART_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0891b2"]

const ATIVIDADES_COLORS = {
  servicos: "#10b981", // verde
  mercadorias: "#3b82f6", // azul
}

export function PGDASDProcessorIA() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DASData | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [processViaN8n, setProcessViaN8n] = useState(false)

  const generatePDF = async () => {
    if (!contentRef.current || !data) return

    setGeneratingPDF(true)

    try {
      const html2canvas = (await import("html2canvas")).default
      const jsPDF = (await import("jspdf")).default

      const element = contentRef.current

      const clone = element.cloneNode(true) as HTMLElement
      clone.style.position = "absolute"
      clone.style.left = "-9999px"
      clone.style.top = "0"
      document.body.appendChild(clone)

      // Aguardar o navegador computar os estilos
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Percorrer todos os elementos e aplicar estilos computados como inline
      const applyComputedStyles = (el: HTMLElement) => {
        const computed = window.getComputedStyle(el)

        // Propriedades de cor que precisam ser convertidas
        const colorProps = [
          "color",
          "backgroundColor",
          "borderColor",
          "borderTopColor",
          "borderRightColor",
          "borderBottomColor",
          "borderLeftColor",
        ]

        colorProps.forEach((prop) => {
          const value = computed.getPropertyValue(prop)
          if (value && value !== "rgba(0, 0, 0, 0)" && value !== "transparent") {
            el.style.setProperty(prop, value, "important")
          }
        })

        // Processar filhos recursivamente
        Array.from(el.children).forEach((child) => {
          if (child instanceof HTMLElement) {
            applyComputedStyles(child)
          }
        })
      }

      applyComputedStyles(clone)

      // Gerar PDF a partir do clone
      const canvas = await html2canvas(clone, {
        scale: 3.125,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: clone.scrollWidth,
        height: clone.scrollHeight,
      })

      // Remover clone
      document.body.removeChild(clone)

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      // Calcular dimensões para ocupar toda a página A4
      const imgWidth = pdfWidth - 20 // margem de 10mm de cada lado
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const pageHeight = pdfHeight - 20 // margem de 10mm em cima e embaixo

      let heightLeft = imgHeight
      let position = 10

      // Adicionar marca d'água
      const logoUrl =
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/integra%20oficial--Z07XEJjpSekUh1Wy1mRTb98rnuPQAq.png"

      try {
        const logoImg = new Image()
        logoImg.crossOrigin = "anonymous"
        logoImg.src = logoUrl

        await new Promise((resolve, reject) => {
          logoImg.onload = resolve
          logoImg.onerror = reject
        })

        const logoWidth = 100
        const logoHeight = 35
        const logoX = (pdfWidth - logoWidth) / 2
        const logoY = (pdfHeight - logoHeight) / 2

        pdf.setGState(new (pdf as any).GState({ opacity: 0.08 }))
        pdf.addImage(logoImg, "PNG", logoX, logoY, logoWidth, logoHeight)
        pdf.setGState(new (pdf as any).GState({ opacity: 1 }))
      } catch (logoError) {
        console.warn("[v0] Não foi possível adicionar a marca d'água:", logoError)
      }

      // Adicionar imagem em múltiplas páginas se necessário
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10
        pdf.addPage()

        // Adicionar marca d'água em cada página
        try {
          const logoImg = new Image()
          logoImg.crossOrigin = "anonymous"
          logoImg.src = logoUrl
          await new Promise((resolve) => {
            logoImg.onload = resolve
          })
          const logoWidth = 100
          const logoHeight = 35
          const logoX = (pdfWidth - logoWidth) / 2
          const logoY = (pdfHeight - logoHeight) / 2
          pdf.setGState(new (pdf as any).GState({ opacity: 0.08 }))
          pdf.addImage(logoImg, "PNG", logoX, logoY, logoWidth, logoHeight)
          pdf.setGState(new (pdf as any).GState({ opacity: 1 }))
        } catch {}

        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const fileName = `DAS_${data.identificacao.cnpj.replace(/[^\d]/g, "")}_${new Date().toISOString().split("T")[0]}.pdf`
      pdf.save(fileName)
    } catch (error) {
      console.error("[v0] Erro ao gerar PDF:", error)
      setError("Erro ao gerar PDF. Tente novamente.")
    } finally {
      setGeneratingPDF(false)
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

    switch (cenario) {
      case "servicos":
        comparativoSetorial = `Sua alíquota efetiva de ${aliquota.toFixed(5)}% está ${aliquota > 8 ? "acima" : "dentro"} da média para prestadores de serviços (6-8%). ${iss > totalTributos * 0.15 ? "ISS representa parcela significativa dos tributos." : ""}`

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
        comparativoSetorial = `Sua alíquota efetiva de ${aliquota.toFixed(5)}% está ${aliquota > 7 ? "acima" : "dentro"} da média para comércio (5-7%). ${icms > totalTributos * 0.12 ? "ICMS tem peso relevante na carga tributária." : ""}`

        if (icms > totalTributos * 0.12)
          pontosAtencao.push("ICMS representa mais de 12% do total - avaliar créditos fiscais")
        if (aliquota > 7) pontosAtencao.push("Alíquota acima da média do setor - revisar enquadramento")

        oportunidades.push("Aproveitar créditos de ICMS nas compras")
        oportunidades.push("Avaliar substituição tributária para reduzir carga")

        recomendacoes.push("Manter controle rigoroso de estoque e notas fiscais")
        recomendacoes.push("Verificar possibilidade de benefícios estaduais")
        break

      case "misto":
        comparativoSetorial = `Operação mista com alíquota efetiva de ${aliquota.toFixed(5)}%. ${iss > 0 && icms > 0 ? "Boa diversificação entre serviços e mercadorias." : ""}`

        if (Math.abs(iss - icms) > totalTributos * 0.2) {
          pontosAtencao.push("Desbalanceamento entre serviços e mercadorias - avaliar otimização")
        }

        oportunidades.push("Otimizar divisão entre serviços e mercadorias para reduzir carga")
        oportunidades.push("Aproveitar benefícios fiscais de ambas as atividades")

        recomendacoes.push("Segregar corretamente receitas de serviços e mercadorias")
        recomendacoes.push("Avaliar qual atividade tem melhor margem para foco estratégico")
        break
    }

    if (aliquota > 10) pontosAtencao.push("Alíquota efetiva elevada - revisar enquadramento no Simples")
    if (margem < 10) pontosAtencao.push("Margem líquida abaixo de 10% - atenção à rentabilidade")

    oportunidades.push("Receita anual permite permanência no Simples Nacional")
    if (aliquota > 8) oportunidades.push("Possível redução de carga através de planejamento tributário")

    recomendacoes.push("Manter controle rigoroso do faturamento para não ultrapassar o limite do Simples")
    if (margem < 15) recomendacoes.push("Avaliar estrutura de custos e precificação para melhorar margem")

    return {
      comparativoSetorial:
        aliquota > 8
          ? "Sua alíquota efetiva está acima da média setorial (6-8%). Há oportunidades de otimização."
          : "Sua alíquota efetiva está dentro da média setorial. Boa gestão tributária!",
      pontosAtencao: [],
      oportunidades: [
        rbt12 < 4800000 && "Receita anual permite permanência no Simples Nacional",
        aliquota > 8 && "Possível redução de carga através de planejamento tributário",
        iss > 0 && "Avaliar benefícios fiscais municipais para ISS",
      ].filter(Boolean) as string[],
      recomendacoes: [
        "Manter controle rigoroso do faturamento para não ultrapassar o limite do Simples",
        aliquota > 8 && "Consultar contador sobre possibilidade de mudança de anexo",
        "Revisar distribuição de lucros vs. pró-labore para otimização tributária",
        margem < 15 && "Avaliar estrutura de custos e precificação para melhorar margem",
      ].filter(Boolean) as string[],
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
      console.log("[v0] Enviando arquivo:", file.name, "via:", processViaN8n ? "n8n" : "local")

      // Enviar para API que processa localmente ou encaminha ao n8n
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      })

      console.log("[v0] Status da resposta:", response.status)
      console.log("[v0] Content-Type:", response.headers.get("content-type"))

      if (!response.ok) {
        throw new Error(`Erro ao processar: ${response.statusText}`)
      }

      const contentType = response.headers.get("content-type")
      const responseText = await response.text()

      console.log("[v0] Resposta recebida (primeiros 500 chars):", responseText.substring(0, 500))

      if (!responseText || responseText.trim() === "") {
        throw new Error("O webhook retornou uma resposta vazia")
      }

      if (!contentType?.includes("application/json")) {
        console.log("[v0] Resposta completa:", responseText)
        throw new Error(`A API retornou um tipo de conteúdo inesperado: ${contentType}`)
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error("[v0] Erro ao fazer parse do JSON:", parseError)
        console.log("[v0] Texto que causou erro:", responseText)
        throw new Error("A API retornou dados em formato inválido")
      }

      console.log("[v0] Estrutura completa da resposta (local API):", JSON.stringify(result, null, 2))

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
        console.warn("[v0] Tributos não encontrados na resposta; aplicando zeros por padrão")
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

      console.log("[v0] Dados normalizados:", dasData)

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

      const insights = generateInsights(dasData)
      setData({ ...dasData, insights })
    } catch (err) {
      console.error("[v0] Erro no processamento:", err)
      setError(err instanceof Error ? err.message : "Erro ao processar o arquivo")
    } finally {
      setLoading(false)
    }
  }

  const [darkMode, setDarkMode] = useState(false)

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
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
                  className={`h-12 w-12 sm:h-16 sm:w-16 mb-4 ${dragActive ? "text-blue-500" : darkMode ? "text-slate-300" : "text-slate-400"}`}
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
                <div className={`mt-4 flex items-center justify-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  <input
                    id="toggle-n8n"
                    type="checkbox"
                    checked={processViaN8n}
                    onChange={(e) => setProcessViaN8n(e.target.checked)}
                  />
                  <label htmlFor="toggle-n8n" className="text-sm">
                    Processar via n8n (encaminha para webhook configurado)
                  </label>
                </div>
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
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative"
            style={{
              backgroundImage: 'url(/integra-watermark.svg)',
              backgroundRepeat: 'repeat',
              backgroundSize: '300px 90px',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed'
            }}
          >

            

            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <CardTitle className="text-base sm:text-lg">Identificação da Empresa</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* Receita Bruta PA - Azul escuro */}
              <Card className="bg-gradient-to-br from-slate-700 to-slate-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardHeader className="pb-2 p-4 sm:p-6 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs sm:text-sm font-bold">Receita Bruta PA</CardTitle>
                  <DollarSign className="h-4 w-4" />
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-lg sm:text-2xl font-bold break-words">{formatCurrency(data.receitas.receitaPA)}</p>
                  <p className="text-[10px] sm:text-xs opacity-75 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Período de apuração
                  </p>
                </CardContent>
              </Card>

              {/* Total DAS - Azul médio */}
              <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardHeader className="pb-2 p-4 sm:p-6 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs sm:text-sm font-bold">Total DAS</CardTitle>
                  <FileText className="h-4 w-4" />
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {Boolean(data.atividades?.atividade2?.Total) && (
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-white/20 text-white border border-white/30">
                        Serviços: {formatCurrency(data.atividades!.atividade2!.Total)}
                      </span>
                    )}
                    {Boolean(data.atividades?.atividade1?.Total) && (
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-white/20 text-white border border-white/30">
                        Mercadorias: {formatCurrency(data.atividades!.atividade1!.Total)}
                      </span>
                    )}
                  </div>
                  <p className="text-lg sm:text-2xl font-bold font-sans break-words">{formatCurrency(data.tributos.Total)}</p>
                  <p className="text-[10px] sm:text-xs opacity-75 mt-1">Valor a pagar</p>
                </CardContent>
              </Card>

              {/* Alíquota Efetiva - Verde */}
              <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardHeader className="pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-bold">Alíquota Efetiva</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
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
              <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
                <CardHeader className="pb-2 p-4 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-bold">Margem Líquida</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-lg sm:text-2xl font-bold font-sans">{(data.calculos?.margemLiquida || data.calculos?.margemLiquidaPercent || 0).toFixed(3)}%</p>
                  <p className="text-[10px] sm:text-xs opacity-75 mt-1">Receita após impostos</p>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                  Discriminativo de Receitas
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
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
                  ;(data as any).__rows = { rpa, rbt12, rba, rbaa }
                  return null
                })()}
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b-2 border-slate-200">
                          <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-slate-700">
                            Local de Receitas (R$)
                          </th>
                          <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-slate-700">
                            Mercado Interno
                          </th>
                          {/* Exibir coluna Mercado Externo apenas se houver valores */}
                          {(((data as any).__rows?.rpa.me || 0) > 0
                            || ((data as any).__rows?.rbt12.me || 0) > 0
                            || ((data as any).__rows?.rba.me || 0) > 0
                            || ((data as any).__rows?.rbaa.me || 0) > 0) && (
                            <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-slate-700">
                              Mercado Externo
                            </th>
                          )}
                          <th className="text-right py-2 sm:py-3 px-2 sm:px-4 font-semibold text-slate-700 bg-slate-50">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
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
                          <td className="text-right py-2 sm:py-3 px-2 sm:px-4 bg-slate-50 font-semibold whitespace-nowrap">
                            {formatCurrency(((data as any).__rows?.rpa.total) || 0)}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
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
                          <td className="text-right py-2 sm:py-3 px-2 sm:px-4 bg-slate-50 font-semibold whitespace-nowrap">
                            {formatCurrency(((data as any).__rows?.rbt12.total) || 0)}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">
                            Receita bruta acumulada nos doze meses anteriores ao PA proporcionalizada (RBT12p)
                          </td>
                          <td className="text-right py-2 sm:py-3 px-2 sm:px-4 text-slate-400">-</td>
                          {(((data.receitas.mercadoExterno?.rpa || 0) > 0)
                            || ((data.receitas.mercadoExterno?.rbt12 || 0) > 0)
                            || ((data.receitas.mercadoExterno?.rba || 0) > 0)
                            || ((data.receitas.mercadoExterno?.rbaa || 0) > 0)) && (
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 text-slate-400">-</td>
                          )}
                          <td className="text-right py-2 sm:py-3 px-2 sm:px-4 bg-slate-50 text-slate-400">-</td>
                        </tr>
                        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
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
                          <td className="text-right py-2 sm:py-3 px-2 sm:px-4 bg-slate-50 font-semibold whitespace-nowrap">
                            {formatCurrency(((data as any).__rows?.rba.total) || 0)}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
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
                          <td className="text-right py-2 sm:py-3 px-2 sm:px-4 bg-slate-50 font-semibold whitespace-nowrap">
                            {formatCurrency(((data as any).__rows?.rbaa.total) || 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-slate-200">
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs text-blue-600 font-medium mb-1">Utilização do Limite</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900">
                      {((data.receitas.rba / (data.receitas.limite || 4800000)) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-blue-600 mt-1">RBA / Limite</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs text-emerald-600 font-medium mb-1">Crescimento Anual</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-900">
                      {data.receitas.rbaa > 0
                        ? (((data.receitas.rba - data.receitas.rbaa) / data.receitas.rbaa) * 100).toFixed(1)
                        : "0.0"}
                      %
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">RBA vs RBAA</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs text-amber-600 font-medium mb-1">Margem até Limite</p>
                    <p className="text-xl sm:text-2xl font-bold text-amber-900 break-words">
                      -91.7%
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Margem disponível
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bloco "Operação Mista" removido conforme solicitação */}

            {data.graficos && (data.graficos.tributosBar || data.graficos.totalTributos) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

                

                {(data.graficos.receitaLine || data.graficos.receitaMensal) && (
                  <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border border-slate-200'} shadow-lg hover:shadow-xl transition-all duration-200 md:col-span-2`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div>
                        <CardTitle className={`text-base sm:text-lg flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          <LineChart className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-500'}`} />
                          Receita Mensal (R$)
                        </CardTitle>
                        <CardDescription className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Evolução de Receitas - Histórico mensal simplificado
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" className={`${darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900'}`}>
                        <Download className="h-4 w-4 mr-1" /> Exportar
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={350}>
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
                          const commonMax = Math.max(miMax, meMax) * 1.10
                          const leftDomain = [0, commonMax]
                          const rightDomain = [0, commonMax]

                          // Mapeamento simples usando valores reais de MI/ME
                          const chartData = miLabels.map((label: string, idx: number) => {
                            const mi = Number(miValues[idx] || 0)
                            const meItem = meMap.get(String(label))
                            const meV = meItem?.v || 0
                            const miLabel = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(mi)
                            const meLabel = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(meV)
                            return { mes: label, mi, me: meV, miLabel, meLabel }
                          })
                          return (
                            <LineChart data={chartData} margin={{ top: 60, right: 40, left: 40, bottom: 60 }}>
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
                          {/* Eixo Y direito (ME) - domínio comum */}
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
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
                            domain={rightDomain}
                            allowDataOverflow={false}
                            tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v))}
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
                          <Line yAxisId="left" type="monotone" dataKey="mi" stroke="#2563eb" strokeWidth={3} dot={{ r: 3, stroke: '#0891b2', strokeWidth: 1, fill: '#06b6d4' }} activeDot={{ r: 5 }} name="Mercado Interno (MI)">
                            <LabelList dataKey="miLabel" position="top" fill={darkMode ? '#93c5fd' : '#1e40af'} fontSize={11} />
                          </Line>
                          <Line yAxisId="right" type="monotone" dataKey="me" stroke="#06b6d4" strokeWidth={3.5} dot={{ r: 3, stroke: '#0891b2', strokeWidth: 1, fill: '#06b6d4' }} activeDot={{ r: 5 }} name="Mercado Externo (ME)">
                            <LabelList dataKey="meLabel" position="top" fill={darkMode ? '#22d3ee' : '#0284c7'} fontSize={11} />
                          </Line>
                          {/* Mantém os overlays customizados abaixo */}
                          </LineChart>
                          )
                        })()}
                          
                        </ResponsiveContainer>
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
                <Button variant="ghost" size="sm" className={`${darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900'}`}>
                  <Download className="h-4 w-4 mr-1" /> Exportar
                </Button>
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
                        const sumServicos = init()

                        const atividadesDbgRaw = (data as any)?.debug?.atividades
                        const atividadesDbgList = Array.isArray(atividadesDbgRaw)
                          ? atividadesDbgRaw
                          : (atividadesDbgRaw && typeof atividadesDbgRaw === 'object' ? Object.values(atividadesDbgRaw) : [])

                        if (Array.isArray(atividadesDbgList) && atividadesDbgList.length > 0) {
                          for (const atv of atividadesDbgList) {
                            const nome = String(atv?.name || atv?.nome || '').toLowerCase()
                            const trib: any = atv?.tributos || {}
                            const sum = [trib.irpj, trib.csll, trib.cofins, trib.pis, trib.pis_pasep, trib.inss_cpp, trib.icms, trib.ipi, trib.iss]
                              .map((v) => Number(v || 0))
                              .reduce((a, b) => a + b, 0)
                            if (sum > 0) {
                              const isServico = nome.includes('servi')
                              const isExterior = !isServico && (nome.includes('exterior') || nome.includes('extern') || nome.includes('export'))
                              const target = isServico ? sumServicos : (isExterior ? sumMercadoriasExterior : sumMercadoriasInterno)
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
                          const target = assignToServicos ? sumServicos : sumMercadoriasInterno
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
                        const colServicosVisible = tribKeys.some(k => (sumServicos as any)[k.key] > 0)

                        return (
                          <tr className="border-b border-slate-200">
                            <th className={`text-left py-3 px-2 font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Tributo</th>
                            {colMercadoriasInternoVisible && (
                              <th className={`text-center py-3 px-2 font-semibold text-blue-600`}>Revenda (interno)</th>
                            )}
                            {colMercadoriasExteriorVisible && (
                              <th className={`text-center py-3 px-2 font-semibold text-indigo-600`}>Revenda p/ exterior</th>
                            )}
                            {colServicosVisible && (
                              <th className={`text-center py-3 px-2 font-semibold text-emerald-600`}>Serviços</th>
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
                        const sumServicos = init()

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
                            const nome = String(atv?.name || atv?.nome || "").toLowerCase()
                            const trib: any = atv?.tributos || {}
                            const isServico = nome.includes("servi") // cobre "serviço", "servicos"
                            const isExterior = !isServico && (nome.includes("exterior") || nome.includes("extern") || nome.includes("export"))
                            const target = isServico ? sumServicos : (isExterior ? sumMercadoriasExterior : sumMercadoriasInterno)

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
                          const target = assignToServicos ? sumServicos : sumMercadoriasInterno
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
                          const servicos = (sumServicos as any)[key] || 0
                          const totalDbg = mercadoriasInterno + mercadoriasExterior + servicos
                          const totalNorm = (data.tributos as any)[key] || 0
                          const totalDecl = totDeclarado ? (totDeclarado as any)[key === 'PIS_Pasep' ? 'PIS_Pasep' : key] || 0 : 0
                          const total = totalDecl > 0 ? totalDecl : (totalDbg > 0 ? totalDbg : totalNorm)
                          return { key, label, mercadoriasInterno, mercadoriasExterior, servicos, total }
                        }).filter(r => r.total > 0 || r.mercadoriasInterno > 0 || r.mercadoriasExterior > 0 || r.servicos > 0)
                        const colMercadoriasInternoVisible = tribKeys.some(k => (sumMercadoriasInterno as any)[k.key] > 0)
                        const colMercadoriasExteriorVisible = tribKeys.some(k => (sumMercadoriasExterior as any)[k.key] > 0)
                        const colServicosVisible = tribKeys.some(k => (sumServicos as any)[k.key] > 0)

                        return rows.map(({ key, label, mercadoriasInterno, mercadoriasExterior, servicos, total }) => (
                          <tr key={key} className="border-b border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800">
                            <td className={`py-3 px-2 font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{label}</td>
                            {colMercadoriasInternoVisible && (
                              <td className="py-3 px-2 text-center text-blue-600 font-medium">{formatCurrency(mercadoriasInterno)}</td>
                            )}
                            {colMercadoriasExteriorVisible && (
                              <td className="py-3 px-2 text-center text-indigo-600 font-medium">{formatCurrency(mercadoriasExterior)}</td>
                            )}
                            {colServicosVisible && (
                              <td className="py-3 px-2 text-center text-emerald-600 font-medium">{formatCurrency(servicos)}</td>
                            )}
                            <td className={`py-3 px-2 text-center font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{formatCurrency(total)}</td>
                          </tr>
                        ))
                      })()}
                      {(() => {
                        // Recalcula totais a partir das linhas já construídas (usando debug quando possível)
                        const tribKeys = ["IRPJ","CSLL","COFINS","PIS_Pasep","INSS_CPP","ICMS","IPI","ISS"] as const

                        const init = () => ({ IRPJ: 0, CSLL: 0, COFINS: 0, PIS_Pasep: 0, INSS_CPP: 0, ICMS: 0, IPI: 0, ISS: 0 })
                        const sumMercadoriasInterno = init()
                        const sumMercadoriasExterior = init()
                        const sumServicos = init()

                        const atividadesDbgRaw = (data as any)?.debug?.atividades
                        const atividadesDbgList = Array.isArray(atividadesDbgRaw)
                          ? atividadesDbgRaw
                          : (atividadesDbgRaw && typeof atividadesDbgRaw === 'object' ? Object.values(atividadesDbgRaw) : [])
                        if (Array.isArray(atividadesDbgList) && atividadesDbgList.length > 0) {
                          for (const atv of atividadesDbgList) {
                            const nome = String(atv?.name || atv?.nome || "").toLowerCase()
                            const trib: any = atv?.tributos || {}
                            const isServico = nome.includes("servi")
                            const isExterior = !isServico && (nome.includes("exterior") || nome.includes("extern") || nome.includes("export"))
                            const target = isServico ? sumServicos : (isExterior ? sumMercadoriasExterior : sumMercadoriasInterno)
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
                          const target = assignToServicos ? sumServicos : sumMercadoriasInterno
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
                        const totalServicos = tribKeys.reduce((sum, k) => sum + (sumServicos as any)[k], 0)
                        const grandTotalDbg = totalMercadoriasInterno + totalMercadoriasExterior + totalServicos
                        const parcelasTotaisDeclFooter = (data as any)?.debug?.parcelas?.totais?.declarado
                        const totalDeclaradoFooter = parseNumber(parcelasTotaisDeclFooter?.total ?? parcelasTotaisDeclFooter?.Total ?? 0)
                        const grandTotal = (totalDeclaradoFooter && totalDeclaradoFooter > 0) ? totalDeclaradoFooter : (grandTotalDbg > 0 ? grandTotalDbg : (data.tributos?.Total || 0))
                        const colMercadoriasInternoVisible = totalMercadoriasInterno > 0
                        const colMercadoriasExteriorVisible = totalMercadoriasExterior > 0
                        const colServicosVisible = totalServicos > 0

                        return (
                          <tr className="border-t-2 border-slate-300 bg-slate-50 dark:bg-slate-800">
                            <td className={`py-3 px-2 font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Total</td>
                            {colMercadoriasInternoVisible && (
                              <td className="py-3 px-2 text-center font-bold text-blue-600">{formatCurrency(totalMercadoriasInterno)}</td>
                            )}
                            {colMercadoriasExteriorVisible && (
                              <td className="py-3 px-2 text-center font-bold text-indigo-600">{formatCurrency(totalMercadoriasExterior)}</td>
                            )}
                            {colServicosVisible && (
                              <td className="py-3 px-2 text-center font-bold text-emerald-600">{formatCurrency(totalServicos)}</td>
                            )}
                            <td className={`py-3 px-2 text-center font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{formatCurrency(grandTotal)}</td>
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
              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                {/* Gráfico de Pizza - Distribuição do DAS */}
                <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border border-slate-200'} shadow-lg hover:shadow-xl transition-all duration-200`}>
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
                    <Button variant="ghost" size="sm" className={`${darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900'}`}>
                      <Download className="h-4 w-4 mr-1" /> Exportar
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Valores numéricos à esquerda */}
                      <div className="space-y-3">
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
                            <div key={key} className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'} hover:shadow-md transition-all duration-200`}>
                              <div className="flex items-center gap-3">
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
                        <div className={`flex items-center justify-between p-3 rounded-lg border-2 ${darkMode ? 'bg-slate-600 border-slate-500' : 'bg-slate-100 border-slate-300'} font-bold`}>
                          <div className="flex items-center gap-3">
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
                        <div className="flex-1 flex items-center justify-center">
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
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
                                cy="50%"
                                innerRadius={60}
                                outerRadius={120}
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
                                  <Cell key={`cell-${index}`} fill={entry.color} stroke={darkMode ? "#1e293b" : "#ffffff"} strokeWidth={2} />
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
                              <Legend 
                                verticalAlign="bottom" 
                                height={36}
                                formatter={(value, entry) => (
                                  <span style={{ color: darkMode ? '#e2e8f0' : '#475569', fontSize: '11px', fontWeight: '500' }}>
                                    {value}
                                  </span>
                                )}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>


              </div>
            )}

            {data.insights && (
              <div className="space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                  Insights
                </h2>
                <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border border-slate-200'} shadow`}>
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

            <div className="flex justify-center gap-3 pt-4">
              <Button
                onClick={() => {
                  setData(null)
                  setFile(null)
                  setError(null)
                }}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                Processar Novo PDF
              </Button>
              <PdfGenerator 
                contentId="relatorio-pgdasd" 
                fileName="Relatorio_DAS" 
                isTextWatermark={false}
                watermarkImage="/integra.png"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PGDASDProcessorIA
