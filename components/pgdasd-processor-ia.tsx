"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Upload, FileText, TrendingUp, Lightbulb, Target, Loader2, DollarSign, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
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
    atividadesComparativo?: any
  }
  calculos?: {
    aliquotaEfetiva?: number
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
        scale: 2,
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

        pdf.setGState(new pdf.GState({ opacity: 0.08 }))
        pdf.addImage(logoImg, "PNG", logoX, logoY, logoWidth, logoHeight)
        pdf.setGState(new pdf.GState({ opacity: 1 }))
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
          pdf.setGState(new pdf.GState({ opacity: 0.08 }))
          pdf.addImage(logoImg, "PNG", logoX, logoY, logoWidth, logoHeight)
          pdf.setGState(new pdf.GState({ opacity: 1 }))
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
    return `${value.toFixed(2)}%`
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

      console.log("[v0] Enviando arquivo para webhook:", file.name)

      const response = await fetch("https://n8n.jjinnovai.me/webhook/processar-pgdasd", {
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
        throw new Error(`O webhook retornou um tipo de conteúdo inesperado: ${contentType}`)
      }

      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error("[v0] Erro ao fazer parse do JSON:", parseError)
        console.log("[v0] Texto que causou erro:", responseText)
        throw new Error("O webhook retornou dados em formato inválido")
      }

      console.log("[v0] Estrutura completa da resposta:", JSON.stringify(result, null, 2))

      let rawData
      if (Array.isArray(result) && result.length > 0) {
        rawData = result[0]
      } else {
        rawData = result
      }

      let tributos
      if (rawData.atividades?.totalEstabelecimento) {
        tributos = rawData.atividades.totalEstabelecimento
      } else if (rawData.atividades?.somaAtividades) {
        tributos = rawData.atividades.somaAtividades
      } else if (rawData.tributos) {
        tributos = rawData.tributos
      } else {
        throw new Error("Estrutura de dados inválida: tributos não encontrados")
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
        identificacao: rawData.identificacao,
        receitas: rawData.receitas,
        tributos: tributosNormalizados,
        atividades: rawData.atividades
          ? {
              atividade1: rawData.atividades.atividade1,
              atividade2: rawData.atividades.atividade2,
            }
          : undefined,
        graficos: rawData.graficos,
        calculos: rawData.calculos,
      }

      console.log("[v0] Dados normalizados:", dasData)

      if (dasData.calculos) {
        if (dasData.calculos.aliquotaEfetivaPercent && !dasData.calculos.aliquotaEfetiva) {
          dasData.calculos.aliquotaEfetiva = dasData.calculos.aliquotaEfetivaPercent
        }
        if (dasData.calculos.margemLiquidaPercent && !dasData.calculos.margemLiquida) {
          dasData.calculos.margemLiquida = dasData.calculos.margemLiquidaPercent
        }
      }

      if (!dasData.calculos || !dasData.calculos.aliquotaEfetiva) {
        const receitaPA = dasData.receitas.receitaPA || 0
        const totalDAS = dasData.tributos.Total || 0

        dasData.calculos = {
          aliquotaEfetiva: receitaPA > 0 ? (totalDAS / receitaPA) * 100 : 0,
          margemLiquida: receitaPA > 0 ? ((receitaPA - totalDAS) / receitaPA) * 100 : 0,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Processador PGDASD com IA
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Análise inteligente do seu DAS com insights estratégicos
          </p>
        </div>

        {!data && (
          <Card className="border-2 border-dashed border-slate-300 bg-white/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div
                className={`relative flex flex-col items-center justify-center rounded-lg p-8 sm:p-12 transition-all ${
                  dragActive ? "bg-blue-50 border-2 border-blue-400" : "bg-slate-50 border-2 border-slate-200"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload
                  className={`h-12 w-12 sm:h-16 sm:w-16 mb-4 ${dragActive ? "text-blue-500" : "text-slate-400"}`}
                />
                <h3 className="text-lg sm:text-xl font-semibold mb-2 text-center break-words max-w-full">
                  {file ? file.name : "Arraste seu PDF aqui"}
                </h3>
                <p className="text-slate-500 mb-4 text-sm sm:text-base">ou clique para selecionar</p>

                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id="file-upload" />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer bg-transparent" asChild>
                    <span>Selecionar Arquivo</span>
                  </Button>
                </label>

                {file && (
                  <Button
                    onClick={handleUpload}
                    disabled={loading}
                    className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-end">
              <Button
                onClick={generatePDF}
                disabled={generatingPDF}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              >
                {generatingPDF ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Baixar PDF
                  </>
                )}
              </Button>
            </div>

            <div ref={contentRef} className="space-y-6 bg-white p-8 rounded-lg">
              <div className="text-center space-y-4 mb-8">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/integra%20oficial--Z07XEJjpSekUh1Wy1mRTb98rnuPQAq.png"
                  alt="Integra Soluções Empresariais"
                  className="h-16 mx-auto"
                />
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
                  <p className="text-base text-slate-700 leading-relaxed">
                    <strong>Olá!</strong> Segue a <strong>Análise Inteligente do seu DAS</strong>, com um resumo dos
                    principais indicadores e oportunidades identificadas.
                  </p>
                </div>
              </div>

              <div className="flex justify-center mb-4">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/integra%20oficial--Z07XEJjpSekUh1Wy1mRTb98rnuPQAq.png"
                  alt="Integra Soluções Empresariais"
                  className="h-12 opacity-80"
                />
              </div>

              <Card className="bg-gradient-to-br from-slate-800 to-slate-700 text-white border-0 shadow-xl">
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
                    <p className="text-base sm:text-lg font-semibold break-words">
                      {data.identificacao.periodoApuracao}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
                  <CardHeader className="pb-2 p-4 sm:p-6">
                    <CardTitle className="text-xs sm:text-sm font-medium opacity-90">Receita Bruta PA</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <p className="text-xl sm:text-3xl font-bold break-words">
                      {formatCurrency(data.receitas.receitaPA)}
                    </p>
                    <p className="text-[10px] sm:text-xs opacity-75 mt-1">Período de apuração</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white border-0 shadow-lg">
                  <CardHeader className="pb-2 p-4 sm:p-6">
                    <CardTitle className="text-xs sm:text-sm font-medium opacity-90">Total DAS</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    {data.atividades?.atividade1 && data.atividades?.atividade2 ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs opacity-90">
                          <span>Mercadorias:</span>
                          <span>{formatCurrency(data.atividades.atividade1.Total)}</span>
                        </div>
                        <div className="flex justify-between text-xs opacity-90">
                          <span>Serviços:</span>
                          <span>{formatCurrency(data.atividades.atividade2.Total)}</span>
                        </div>
                        <div className="pt-1 mt-1 border-t border-white/30">
                          <p className="text-xl sm:text-2xl font-bold">{formatCurrency(data.tributos.Total)}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xl sm:text-3xl font-bold break-words">
                          {formatCurrency(data.tributos.Total)}
                        </p>
                        <p className="text-[10px] sm:text-xs opacity-75 mt-1">Valor a pagar</p>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                  <CardHeader className="pb-2 p-4 sm:p-6">
                    <CardTitle className="text-xs sm:text-sm font-medium opacity-90">Alíquota Efetiva</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <p className="text-xl sm:text-3xl font-bold">
                      {formatPercent(data.calculos?.aliquotaEfetiva || 0)}
                    </p>
                    <p className="text-[10px] sm:text-xs opacity-75 mt-1">DAS / Receita PA</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg">
                  <CardHeader className="pb-2 p-4 sm:p-6">
                    <CardTitle className="text-xs sm:text-sm font-medium opacity-90">Margem Líquida</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <p className="text-xl sm:text-3xl font-bold">{formatPercent(data.calculos?.margemLiquida || 0)}</p>
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
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <table className="w-full text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b-2 border-slate-200">
                            <th className="text-left py-2 sm:py-3 px-2 sm:px-4 font-semibold text-slate-700">
                              Local de Receitas (R$)
                            </th>
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
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 bg-slate-50 font-semibold whitespace-nowrap">
                              {formatCurrency(data.receitas.receitaPA)}
                            </td>
                          </tr>
                          <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">
                              Receita bruta acumulada nos doze meses anteriores ao PA (RBT12)
                            </td>
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 bg-slate-50 font-semibold whitespace-nowrap">
                              {formatCurrency(data.receitas.rbt12)}
                            </td>
                          </tr>
                          <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">
                              Receita bruta acumulada no ano-calendário corrente (RBA)
                            </td>
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 bg-slate-50 font-semibold whitespace-nowrap">
                              {formatCurrency(data.receitas.rba)}
                            </td>
                          </tr>
                          <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">
                              Receita bruta acumulada no ano-calendário anterior (RBAA)
                            </td>
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 bg-slate-50 font-semibold whitespace-nowrap">
                              {formatCurrency(data.receitas.rbaa)}
                            </td>
                          </tr>
                          <tr className="border-b-2 border-slate-200 hover:bg-slate-50 transition-colors">
                            <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium">
                              Limite de receita bruta proporcionalizado
                            </td>
                            <td className="text-right py-2 sm:py-3 px-2 sm:px-4 bg-slate-50 font-semibold whitespace-nowrap">
                              {formatCurrency(data.receitas.limite || 4800000)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-slate-200">
                    <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                      <p className="text-xs text-blue-600 font-medium mb-1">Utilização do Limite (RBA)</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-900">
                        {((data.receitas.rba / (data.receitas.limite || 4800000)) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-blue-600 mt-1">RBA / Limite Anual</p>
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
                        {formatCurrency((data.receitas.limite || 4800000) - data.receitas.rba)}
                      </p>
                      <p className="text-xs text-amber-600 mt-1">Disponível no ano</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {data.graficos && (data.graficos.tributosBar || data.graficos.totalTributos) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {(data.graficos.tributosBar || data.graficos.totalTributos) && (
                    <Card className="shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-base sm:text-lg">Composição dos Tributos</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Valores por tipo de tributo</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={(data.graficos.tributosBar || data.graficos.totalTributos)!.labels.map(
                              (label, idx) => ({
                                name: label,
                                valor: (data.graficos!.tributosBar || data.graficos!.totalTributos)!.values[idx],
                              }),
                            )}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Bar
                              dataKey="valor"
                              fill="#2563eb"
                              label={{
                                position: "top",
                                fontSize: 10,
                                formatter: (value: number) => formatCurrency(value),
                              }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-base sm:text-lg">Distribuição do DAS</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Composição tributária e por atividade
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {(data.graficos.dasPie || data.graficos.totalTributos) && (
                          <div>
                            <p className="text-xs font-medium text-center mb-2 text-slate-600">Por Tributo</p>
                            <ResponsiveContainer width="100%" height={180}>
                              <PieChart>
                                <Pie
                                  data={(data.graficos.dasPie || data.graficos.totalTributos)!.labels
                                    .map((label, idx) => ({
                                      name: label,
                                      value: (data.graficos!.dasPie || data.graficos!.totalTributos)!.values[idx],
                                    }))
                                    .filter((item) => item.value > 0)}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={50}
                                  fill="#8884d8"
                                  dataKey="value"
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                  labelLine={false}
                                >
                                  {(data.graficos.dasPie || data.graficos.totalTributos)!.labels.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {data.atividades?.atividade1 && data.atividades?.atividade2 && (
                          <div>
                            <p className="text-xs font-medium text-center mb-2 text-slate-600">Por Atividade</p>
                            <ResponsiveContainer width="100%" height={180}>
                              <PieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Mercadorias",
                                      value: data.atividades.atividade1.Total,
                                    },
                                    {
                                      name: "Serviços",
                                      value: data.atividades.atividade2.Total,
                                    },
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={50}
                                  fill="#8884d8"
                                  dataKey="value"
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                  labelLine={false}
                                >
                                  <Cell fill={ATIVIDADES_COLORS.mercadorias} />
                                  <Cell fill={ATIVIDADES_COLORS.servicos} />
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {(data.graficos.receitaLine || data.graficos.receitaMensal) && (
                    <Card className="shadow-lg md:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-base sm:text-lg">Evolução de Receitas - Mercado Interno</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Histórico mensal de receitas</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart
                            data={(data.graficos.receitaLine || data.graficos.receitaMensal)!.labels.map(
                              (label, idx) => ({
                                mes: label,
                                valor: (data.graficos!.receitaLine || data.graficos!.receitaMensal)!.values[idx],
                              }),
                            )}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="mes" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="valor"
                              stroke="#2563eb"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              label={{ fontSize: 9, formatter: (value: number) => formatCurrency(value) }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    Detalhamento dos Tributos
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Composição do DAS por tributo e atividade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.atividades?.atividade1 && data.atividades?.atividade2 ? (
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b-2 border-slate-200">
                            <th className="text-left py-2 px-2 font-semibold text-slate-700">Tributo</th>
                            <th className="text-right py-2 px-2 font-semibold text-blue-700">Mercadorias</th>
                            <th className="text-right py-2 px-2 font-semibold text-emerald-700">Serviços</th>
                            <th className="text-right py-2 px-2 font-semibold text-slate-700 bg-slate-50">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: "IRPJ", label: "IRPJ" },
                            { key: "CSLL", label: "CSLL" },
                            { key: "COFINS", label: "COFINS" },
                            { key: "PIS_Pasep", label: "PIS/PASEP" },
                            { key: "INSS_CPP", label: "INSS/CPP" },
                            { key: "ICMS", label: "ICMS" },
                            { key: "IPI", label: "IPI" },
                            { key: "ISS", label: "ISS" },
                          ].map(({ key, label }) => {
                            const mercadorias =
                              (data.atividades!.atividade1![
                                key as keyof typeof data.atividades.atividade1
                              ] as number) || 0
                            const servicos =
                              (data.atividades!.atividade2![
                                key as keyof typeof data.atividades.atividade2
                              ] as number) || 0
                            const total = (data.tributos[key as keyof typeof data.tributos] as number) || 0

                            return (
                              <tr key={key} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="py-2 px-2 font-medium">{label}</td>
                                <td className="text-right py-2 px-2 text-blue-700 whitespace-nowrap">
                                  {formatCurrency(mercadorias)}
                                </td>
                                <td className="text-right py-2 px-2 text-emerald-700 whitespace-nowrap">
                                  {formatCurrency(servicos)}
                                </td>
                                <td className="text-right py-2 px-2 bg-slate-50 font-semibold whitespace-nowrap">
                                  {formatCurrency(total)}
                                </td>
                              </tr>
                            )
                          })}
                          <tr className="border-t-2 border-slate-200 font-bold">
                            <td className="py-2 px-2">Total</td>
                            <td className="text-right py-2 px-2 text-blue-700 whitespace-nowrap">
                              {formatCurrency(data.atividades.atividade1.Total)}
                            </td>
                            <td className="text-right py-2 px-2 text-emerald-700 whitespace-nowrap">
                              {formatCurrency(data.atividades.atividade2.Total)}
                            </td>
                            <td className="text-right py-2 px-2 bg-slate-50 whitespace-nowrap">
                              {formatCurrency(data.tributos.Total)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {[
                        { key: "IRPJ", label: "IRPJ", color: "bg-blue-500" },
                        { key: "CSLL", label: "CSLL", color: "bg-indigo-500" },
                        { key: "COFINS", label: "COFINS", color: "bg-purple-500" },
                        { key: "PIS_Pasep", label: "PIS/PASEP", color: "bg-pink-500" },
                        { key: "INSS_CPP", label: "INSS/CPP", color: "bg-rose-500" },
                        { key: "ICMS", label: "ICMS", color: "bg-orange-500" },
                        { key: "IPI", label: "IPI", color: "bg-amber-500" },
                        { key: "ISS", label: "ISS", color: "bg-emerald-500" },
                      ].map(({ key, label, color }) => {
                        const value = (data.tributos[key as keyof typeof data.tributos] as number) || 0
                        const percentage = data.tributos.Total > 0 ? (value / data.tributos.Total) * 100 : 0

                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium">{label}</span>
                              <span className="text-slate-600">
                                {formatCurrency(value)} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${color} transition-all duration-500 ease-out`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                      <div className="pt-3 border-t border-slate-200">
                        <div className="flex justify-between text-sm font-bold">
                          <span>Total</span>
                          <span className="text-slate-900">{formatCurrency(data.tributos.Total)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {data.insights && (
                <div className="space-y-4">
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                    Insights de IA
                  </h2>

                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex items-start gap-2 mb-2 sm:mb-3">
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-semibold text-blue-900 mb-1 text-sm sm:text-base">
                            Comparativo Setorial
                          </h3>
                          <p className="text-xs sm:text-sm text-blue-800">{data.insights.comparativoSetorial}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {data.insights.oportunidades.length > 0 && (
                      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                        <CardContent className="pt-4 sm:pt-6">
                          <div className="flex items-center gap-2 mb-2 sm:mb-3">
                            <Target className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600" />
                            <h3 className="font-semibold text-emerald-900 text-xs sm:text-sm">Oportunidades</h3>
                          </div>
                          <ul className="space-y-1 sm:space-y-1.5">
                            {data.insights.oportunidades.map((oportunidade, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-emerald-800"
                              >
                                <span className="text-emerald-500 mt-0.5">✓</span>
                                <span>{oportunidade}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {data.insights.recomendacoes.length > 0 && (
                      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                        <CardContent className="pt-4 sm:pt-6">
                          <div className="flex items-center gap-2 mb-2 sm:mb-3">
                            <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 text-amber-600" />
                            <h3 className="font-semibold text-amber-900 text-xs sm:text-sm">Recomendações</h3>
                          </div>
                          <ul className="space-y-1 sm:space-y-1.5">
                            {data.insights.recomendacoes.map((recomendacao, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-amber-800"
                              >
                                <span className="text-amber-500 mt-0.5">→</span>
                                <span>{recomendacao}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              <Card className="bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-blue-200 mt-8">
                <CardContent className="pt-6">
                  <div className="space-y-4 text-sm text-slate-700">
                    <p className="leading-relaxed">
                      Caso queira uma <strong>análise mais completa e personalizada</strong>, mostrando:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Cenários comparativos entre regimes tributários (Simples, Presumido e Real)</li>
                      <li>Simulações de economia fiscal</li>
                      <li>Recomendações exclusivas para o seu ramo</li>
                    </ul>
                    <p className="leading-relaxed">
                      Entre em contato com o{" "}
                      <strong>Departamento de Sucesso do Cliente da Integra Soluções Empresariais</strong>.
                    </p>
                    <p className="leading-relaxed">
                      Nossa equipe terá prazer em apresentar um diagnóstico mais profundo do seu negócio — e mostrar
                      onde estão as reais oportunidades de crescimento e economia.
                    </p>
                    <div className="bg-white p-4 rounded-lg border border-blue-200 mt-4">
                      <p className="font-semibold text-blue-900 mb-2">Fale com a Integra:</p>
                      <div className="space-y-2">
                        <p>
                          <strong>WhatsApp:</strong>{" "}
                          <a
                            href="https://wa.me/5594981264638"
                            className="text-blue-600 hover:text-blue-800 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            94 8126-4638
                          </a>
                        </p>
                        <p>
                          <strong>E-mail:</strong>{" "}
                          <a
                            href="mailto:atendimento@integratecnologia.inf.br"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            atendimento@integratecnologia.inf.br
                          </a>
                        </p>
                      </div>
                      <p className="text-xs text-slate-600 mt-3 italic">Integra Soluções Empresariais</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center pt-4">
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
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
