"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, TrendingUp, AlertCircle, Lightbulb, Target, Loader2, DollarSign } from "lucide-react"
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
    PIS_Basep: number
    INSS_CPP: number
    ICMS: number
    IPI: number
    ISS: number
    Total: number
  }
  graficos?: {
    tributosBar: {
      labels: string[]
      values: number[]
    }
    dasPie: {
      labels: string[]
      values: number[]
    }
    receitaLine: {
      labels: string[]
      values: number[]
    }
  }
  calculos?: {
    aliquotaEfetiva: number
    margemLiquida: number
  }
  insights?: {
    comparativoSetorial: string
    pontosAtencao: string[]
    oportunidades: string[]
    recomendacoes: string[]
  }
}

const CHART_COLORS = [
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#f59e0b", // amber
  "#10b981", // emerald
]

export function PGDASDProcessorIA() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DASData | null>(null)
  const [dragActive, setDragActive] = useState(false)

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

      let dasData: DASData
      let graficos

      if (Array.isArray(result) && result.length > 0) {
        const firstItem = result[0]
        if (firstItem.success && firstItem.dados) {
          dasData = firstItem.dados
          graficos = firstItem.graficos // Capturando dados dos gráficos
        } else {
          throw new Error("Estrutura de dados inesperada no array")
        }
      } else if (result.dados) {
        dasData = result.dados
        graficos = result.graficos
      } else {
        dasData = result
      }

      if (graficos) {
        dasData.graficos = graficos
      }

      if (!dasData.calculos) {
        const receitaPA = dasData.receitas.receitaPA || 0
        const totalDAS = dasData.tributos.Total || 0 // Usando 'Total' com maiúscula

        dasData.calculos = {
          aliquotaEfetiva: receitaPA > 0 ? (totalDAS / receitaPA) * 100 : 0,
          margemLiquida: receitaPA > 0 ? ((receitaPA - totalDAS) / receitaPA) * 100 : 0,
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

  const generateInsights = (dasData: DASData) => {
    const aliquota = dasData.calculos?.aliquotaEfetiva || 0
    const margem = dasData.calculos?.margemLiquida || 0
    const totalTributos = dasData.tributos.Total || 0 // Usando 'Total' com maiúscula
    const inss = dasData.tributos.INSS_CPP || 0
    const rbt12 = dasData.receitas.rbt12 || 0
    const iss = dasData.tributos.ISS || 0

    return {
      comparativoSetorial:
        aliquota > 8
          ? "Sua alíquota efetiva está acima da média setorial (6-8%). Há oportunidades de otimização."
          : "Sua alíquota efetiva está dentro da média setorial. Boa gestão tributária!",
      pontosAtencao: [
        aliquota > 10 && "Alíquota efetiva elevada - revisar enquadramento",
        totalTributos > 0 && inss > totalTributos * 0.4 && "INSS representa mais de 40% do total - avaliar pró-labore",
        margem < 10 && "Margem líquida abaixo de 10% - atenção à rentabilidade",
      ].filter(Boolean) as string[],
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Processador PGDASD com IA
          </h1>
          <p className="text-slate-600">Análise inteligente do seu DAS com insights estratégicos</p>
        </div>

        {/* Upload Area */}
        {!data && (
          <Card className="border-2 border-dashed border-slate-300 bg-white/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div
                className={`relative flex flex-col items-center justify-center rounded-lg p-12 transition-all ${
                  dragActive ? "bg-blue-50 border-2 border-blue-400" : "bg-slate-50 border-2 border-slate-200"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className={`h-16 w-16 mb-4 ${dragActive ? "text-blue-500" : "text-slate-400"}`} />
                <h3 className="text-xl font-semibold mb-2">{file ? file.name : "Arraste seu PDF aqui"}</h3>
                <p className="text-slate-500 mb-4">ou clique para selecionar</p>

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

        {/* Results */}
        {data && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Company Info */}
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-xl">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <CardTitle>Identificação da Empresa</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-slate-400 text-sm">CNPJ</p>
                  <p className="text-lg font-semibold">{data.identificacao.cnpj}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Razão Social</p>
                  <p className="text-lg font-semibold">{data.identificacao.razaoSocial}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Período</p>
                  <p className="text-lg font-semibold">{data.identificacao.periodoApuracao}</p>
                </div>
              </CardContent>
            </Card>

            {/* Main Metrics */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Receita Bruta PA</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{formatCurrency(data.receitas.receitaPA)}</p>
                  <p className="text-xs opacity-75 mt-1">Período de apuração</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Total DAS</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{formatCurrency(data.tributos.Total)}</p>
                  <p className="text-xs opacity-75 mt-1">Valor a pagar</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Alíquota Efetiva</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{formatPercent(data.calculos?.aliquotaEfetiva || 0)}</p>
                  <p className="text-xs opacity-75 mt-1">DAS / Receita PA</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium opacity-90">Margem Líquida</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{formatPercent(data.calculos?.margemLiquida || 0)}</p>
                  <p className="text-xs opacity-75 mt-1">Receita após impostos</p>
                </CardContent>
              </Card>
            </div>

            {/* Discriminativo de Receitas */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  Discriminativo de Receitas
                </CardTitle>
                <CardDescription>Detalhamento completo das receitas conforme PGDASD</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Local de Receitas (R$)</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Mercado Interno</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Mercado Externo</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-700 bg-slate-50">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-medium">Receita Bruta do PA (RPA) - Competência</td>
                        <td className="text-right py-3 px-4">{formatCurrency(data.receitas.receitaPA)}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(0)}</td>
                        <td className="text-right py-3 px-4 bg-slate-50 font-semibold">
                          {formatCurrency(data.receitas.receitaPA)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-medium">
                          Receita bruta acumulada nos doze meses anteriores ao PA (RBT12)
                        </td>
                        <td className="text-right py-3 px-4">{formatCurrency(data.receitas.rbt12)}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(0)}</td>
                        <td className="text-right py-3 px-4 bg-slate-50 font-semibold">
                          {formatCurrency(data.receitas.rbt12)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-medium">
                          Receita bruta acumulada nos doze meses anteriores ao PA proporcionalizada (RBT12p)
                        </td>
                        <td className="text-right py-3 px-4 text-slate-400">-</td>
                        <td className="text-right py-3 px-4 text-slate-400">-</td>
                        <td className="text-right py-3 px-4 bg-slate-50 text-slate-400">-</td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-medium">
                          Receita bruta acumulada no ano-calendário corrente (RBA)
                        </td>
                        <td className="text-right py-3 px-4">{formatCurrency(data.receitas.rba)}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(0)}</td>
                        <td className="text-right py-3 px-4 bg-slate-50 font-semibold">
                          {formatCurrency(data.receitas.rba)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-medium">
                          Receita bruta acumulada no ano-calendário anterior (RBAA)
                        </td>
                        <td className="text-right py-3 px-4">{formatCurrency(data.receitas.rbaa)}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(0)}</td>
                        <td className="text-right py-3 px-4 bg-slate-50 font-semibold">
                          {formatCurrency(data.receitas.rbaa)}
                        </td>
                      </tr>
                      <tr className="border-b-2 border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-medium">Limite de receita bruta proporcionalizado</td>
                        <td className="text-right py-3 px-4">{formatCurrency(data.receitas.limite || 4800000)}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(data.receitas.limite || 4800000)}</td>
                        <td className="text-right py-3 px-4 bg-slate-50 text-slate-400">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Indicadores adicionais */}
                <div className="mt-6 grid md:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-xs text-blue-600 font-medium mb-1">Utilização do Limite</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {((data.receitas.rbt12 / (data.receitas.limite || 4800000)) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-blue-600 mt-1">RBT12 / Limite</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <p className="text-xs text-emerald-600 font-medium mb-1">Crescimento Anual</p>
                    <p className="text-2xl font-bold text-emerald-900">
                      {data.receitas.rbaa > 0
                        ? (((data.receitas.rba - data.receitas.rbaa) / data.receitas.rbaa) * 100).toFixed(1)
                        : "0.0"}
                      %
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">RBA vs RBAA</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4">
                    <p className="text-xs text-amber-600 font-medium mb-1">Margem até Limite</p>
                    <p className="text-2xl font-bold text-amber-900">
                      {formatCurrency((data.receitas.limite || 4800000) - data.receitas.rbt12)}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">Disponível no ano</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {data.graficos && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Gráfico de Barras - Tributos */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">Composição dos Tributos</CardTitle>
                    <CardDescription>Valores por tipo de tributo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={data.graficos.tributosBar.labels.map((label, idx) => ({
                          name: label,
                          valor: data.graficos!.tributosBar.values[idx],
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Bar dataKey="valor" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Gráfico de Pizza - Distribuição DAS */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">Distribuição do DAS</CardTitle>
                    <CardDescription>Percentual por tributo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.graficos.dasPie.labels
                            .map((label, idx) => ({
                              name: label,
                              value: data.graficos!.dasPie.values[idx],
                            }))
                            .filter((item) => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {data.graficos.dasPie.labels.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Gráfico de Linha - Evolução de Receitas */}
                <Card className="shadow-lg md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Evolução de Receitas - Mercado Interno</CardTitle>
                    <CardDescription>Histórico mensal de receitas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={data.graficos.receitaLine.labels.map((label, idx) => ({
                          mes: label,
                          valor: data.graficos!.receitaLine.values[idx],
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Line type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tributos Detalhados */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Detalhamento dos Tributos
                </CardTitle>
                <CardDescription>Composição do DAS por tributo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { key: "IRPJ", label: "IRPJ", color: "bg-blue-500" },
                    { key: "CSLL", label: "CSLL", color: "bg-indigo-500" },
                    { key: "COFINS", label: "COFINS", color: "bg-purple-500" },
                    { key: "PIS_Basep", label: "PIS/PASEP", color: "bg-pink-500" },
                    { key: "INSS_CPP", label: "INSS/CPP", color: "bg-rose-500" },
                    { key: "ICMS", label: "ICMS", color: "bg-orange-500" },
                    { key: "IPI", label: "IPI", color: "bg-amber-500" },
                    { key: "ISS", label: "ISS", color: "bg-emerald-500" },
                  ].map(({ key, label, color }) => {
                    const value = (data.tributos[key as keyof typeof data.tributos] as number) || 0
                    const percentage = data.tributos.Total > 0 ? (value / data.tributos.Total) * 100 : 0 // Usando 'Total' com maiúscula

                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{label}</span>
                          <span className="text-slate-600">
                            {formatCurrency(value)} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${color} transition-all duration-500 ease-out`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex justify-between text-base font-bold">
                      <span>Total</span>
                      <span className="text-slate-900">{formatCurrency(data.tributos.Total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {data.insights && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Lightbulb className="h-6 w-6 text-yellow-500" />
                  Insights de IA
                </h2>

                {/* Comparativo Setorial */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-blue-900 mb-1">Comparativo Setorial</h3>
                        <p className="text-sm text-blue-800">{data.insights.comparativoSetorial}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Grid compacto para os outros insights */}
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Pontos de Atenção */}
                  {data.insights.pontosAtencao.length > 0 && (
                    <Card className="bg-gradient-to-br from-rose-50 to-red-50 border-rose-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="h-4 w-4 text-rose-600" />
                          <h3 className="font-semibold text-rose-900 text-sm">Pontos de Atenção</h3>
                        </div>
                        <ul className="space-y-1.5">
                          {data.insights.pontosAtencao.map((ponto, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-xs text-rose-800">
                              <span className="text-rose-500 mt-0.5">•</span>
                              <span>{ponto}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Oportunidades */}
                  {data.insights.oportunidades.length > 0 && (
                    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="h-4 w-4 text-emerald-600" />
                          <h3 className="font-semibold text-emerald-900 text-sm">Oportunidades</h3>
                        </div>
                        <ul className="space-y-1.5">
                          {data.insights.oportunidades.map((oportunidade, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-xs text-emerald-800">
                              <span className="text-emerald-500 mt-0.5">✓</span>
                              <span>{oportunidade}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recomendações */}
                  {data.insights.recomendacoes.length > 0 && (
                    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="h-4 w-4 text-amber-600" />
                          <h3 className="font-semibold text-amber-900 text-sm">Recomendações</h3>
                        </div>
                        <ul className="space-y-1.5">
                          {data.insights.recomendacoes.map((recomendacao, idx) => (
                            <li key={idx} className="flex items-start gap-1.5 text-xs text-amber-800">
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

            {/* Botão para novo processamento */}
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  setData(null)
                  setFile(null)
                  setError(null)
                }}
                variant="outline"
                size="lg"
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
