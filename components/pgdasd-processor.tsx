"use client"
import { useState, useEffect, useRef, memo, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { ConfiguracaoProcessamento } from "@/components/dashboard/ConfiguracaoProcessamento"
import { IndicadoresReceita } from "@/components/dashboard/IndicadoresReceita"
import { GraficoReceitaMensal } from "@/components/dashboard/GraficoReceitaMensal"
import { ComparacaoAtividades } from "@/components/dashboard/ComparacaoAtividades"
import { AnaliseAliquotaParcelas } from "@/components/dashboard/AnaliseAliquotaParcelas"
import { formatCurrency, computeTotalDAS } from "@/lib/utils"
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { CHART_CONFIG } from '@/lib/constants'
import { MessageCircle, Mail } from 'lucide-react'

ChartJS.register(ArcElement, Tooltip, Legend, Title, ChartDataLabels)
export interface DASData {
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
    receitaLineExterno?: {
      labels: string[]
      values: number[]
    }
    atividadesComparativo?: any
  }
  calculos?: {
    aliquotaEfetiva?: number
    margemLiquida?: number
    aliquotaEfetivaFormatada?: string
    totalDAS?: number
    totalDASFormatado?: string
    aliquotaEfetivaAtualPercent?: number
    aliquotaEfetivaOriginalPercent?: number
    analiseAliquota?: any[]
    analiseAliquotaItems?: any[]
    analiseAliquotaMeta?: any
  }
  tributosMercadoriasInterno?: Record<string, number>
  tributosMercadoriasExterno?: Record<string, number>
  tributosServicosInterno?: Record<string, number>
  tributosServicosExterno?: Record<string, number>
  insights?: {
    comparativoSetorial: string
    pontosAtencao: string[]
    oportunidades: string[]
    recomendacoes: string[]
  }
  debug?: any
}

interface PGDASDProcessorProps {
  initialData?: DASData
  shareId?: string
  hideDownloadButton?: boolean
  isOwner?: boolean
  isPdfGen?: boolean
}

export const PGDASDProcessor = memo(function PGDASDProcessor({ initialData, shareId, hideDownloadButton, isOwner, isPdfGen }: PGDASDProcessorProps) {
  const [owner, setOwner] = useState<boolean>(!!isOwner)
  const chartRef = useRef<any>(null)
  useEffect(() => {
    try {
      if (owner) return
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
      if (params.has('admin')) setOwner(true)
    } catch { }
  }, [owner])
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const u = new URL(window.location.href)
      if (u.searchParams.has('admin')) {
        u.searchParams.delete('admin')
        const q = u.searchParams.toString()
        const next = `${u.pathname}${q ? `?${q}` : ''}${u.hash}`
        window.history.replaceState(null, '', next)
      }
    } catch { }
  }, [owner, shareId])
  const hideDownloadEffective = owner ? false : !!hideDownloadButton
  const [data, setData] = useState<DASData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareCode, setShareCode] = useState<string | null>(null)

  const [scale, setScale] = useState(1)

  useEffect(() => {
    const handleResize = () => {
      // Usa clientWidth para descontar a barra de rolagem vertical e evitar cortes laterais
      const width = document.documentElement.clientWidth || window.innerWidth
      // Ajustado para 1600px conforme solicitado
      const baseWidth = 1600
      // Mantém escala 1 em telas maiores para deixar espaços laterais, reduz apenas se for menor
      const newScale = width < baseWidth ? width / baseWidth : 1
      setScale(newScale)
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Hydrate initial data if provided
  useEffect(() => {
    if (initialData && !data) {
      const receitaPA0 = Number(initialData?.receitas?.receitaPA || 0)
      const totalDAS0 = computeTotalDAS({
        tributos: initialData?.tributos,
        valorTotalDAS: (initialData as any)?.valorTotalDAS,
        debug: (initialData as any)?.debug,
      })
      const aliquota0 = (totalDAS0 > 0 && receitaPA0 > 0)
        ? (totalDAS0 / receitaPA0) * 100
        : Number(initialData?.calculos?.aliquotaEfetiva || 0)
      const margem0 = (receitaPA0 > 0)
        ? ((receitaPA0 - totalDAS0) / receitaPA0) * 100
        : Number(initialData?.calculos?.margemLiquida || 0)
      const hydratedData = {
        ...initialData,
        calculos: {
          ...initialData.calculos,
          aliquotaEfetiva: (() => {
            const src: any = (initialData as any)?.calculos || (initialData as any)
            const v = src?.aliquotaEfetivaOriginalPercent ?? src?.aliquota_efetiva_original_percent ?? src?.aliquota_efetiva
            const n = Number(v)
            return isFinite(n) ? n : aliquota0
          })(),
          margemLiquida: margem0,
          aliquotaEfetivaFormatada: (() => {
            const v = (initialData as any)?.calculos?.aliquotaEfetivaOriginalPercent ?? (initialData as any)?.calculos?.aliquota_efetiva_original_percent
            const n = Number(v)
            const base = isFinite(n) ? n : aliquota0
            return base.toFixed(5).replace('.', ',')
          })(),
          totalDAS: totalDAS0,
          totalDASFormatado: formatCurrency(totalDAS0),
          aliquotaEfetivaAtualPercent: (() => {
            const src: any = (initialData as any)?.calculos || (initialData as any)
            const v = src?.aliquotaEfetivaAtualPercent ?? src?.aliquota_efetiva_atual_percent ?? src?.aliquota_efetiva_atual
            const n = Number(v)
            return isFinite(n) ? n : aliquota0
          })(),
          aliquotaEfetivaOriginalPercent: (() => {
            const src: any = (initialData as any)?.calculos || (initialData as any)
            const v = src?.aliquotaEfetivaOriginalPercent ?? src?.aliquota_efetiva_original_percent
            const n = Number(v)
            return isFinite(n) ? n : undefined
          })(),
          analiseAliquota: (() => {
            const src: any = (initialData as any)
            return src?.calculos?.analiseAliquota || src?.analiseAliquota || src?.calculos?.analise_aliquota || src?.analise_aliquota || undefined
          })(),
          analiseAliquotaItems: (() => {
            const a: any = (initialData as any)?.calculos?.analiseAliquota || (initialData as any)?.analiseAliquota || (initialData as any)?.calculos?.analise_aliquota || (initialData as any)?.analise_aliquota
            if (!a) return undefined
            if (Array.isArray(a)) return a
            if (Array.isArray(a?.por_anexo)) return a.por_anexo
            return undefined
          })(),
          analiseAliquotaMeta: (() => {
            const a: any = (initialData as any)?.calculos?.analiseAliquota || (initialData as any)?.analiseAliquota || (initialData as any)?.calculos?.analise_aliquota || (initialData as any)?.analise_aliquota
            if (!a || Array.isArray(a)) return undefined
            const meta: any = {}
            meta.anexo_principal = a?.anexo_principal
            meta.anexos_detectados = a?.anexos_detectados
            meta.rpa_atual = a?.rpa_atual
            meta.rbt12_original = a?.rbt12_original
            meta.rbt12_atual = a?.rbt12_atual
            meta.rpa_mes_ano_anterior = a?.rpa_mes_ano_anterior
            return meta
          })(),
        }
      }
      setData(hydratedData)
    }
  }, [initialData, data])

  const handleProcessPDF = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Erro ao processar PDF")
      }

      const result = await response.json()
      if (result.error) throw new Error(result.error)

      const dados = (result?.dados || result?.data || {}) as any
      const graficos = (result?.graficos || dados?.graficos || undefined) as any

      // Calculate additional fields
      const receitaPA = Number(dados?.receitas?.receitaPA || 0)
      const totalDAS = computeTotalDAS({
        tributos: dados?.tributos,
        valorTotalDAS: (result?.valorTotalDAS || (dados as any)?.valorTotalDAS),
        debug: (dados as any)?.debug,
      })
      const aliquotaEfetiva = (totalDAS > 0 && receitaPA > 0)
        ? (totalDAS / receitaPA) * 100
        : Number((dados?.calculos as any)?.aliquotaEfetiva || 0)
      const margemLiquida = (receitaPA > 0)
        ? ((receitaPA - totalDAS) / receitaPA) * 100
        : Number((dados?.calculos as any)?.margemLiquida || 0)

      const processedData: DASData = {
        identificacao: dados?.identificacao || {},
        receitas: dados?.receitas || {},
        tributos: dados?.tributos || {},
        cenario: dados?.cenario,
        graficos: graficos,
        calculos: {
          aliquotaEfetiva: (() => {
            const src: any = (result as any)?.calculos || (dados as any)?.calculos || {}
            const v = src?.aliquotaEfetivaOriginalPercent ?? src?.aliquota_efetiva_original_percent ?? src?.aliquota_efetiva
            const n = Number(v)
            return isFinite(n) ? n : aliquotaEfetiva
          })(),
          margemLiquida,
          aliquotaEfetivaFormatada: (() => {
            const src: any = (result as any)?.calculos || (dados as any)?.calculos || {}
            const v = src?.aliquotaEfetivaOriginalPercent ?? src?.aliquota_efetiva_original_percent
            const n = Number(v)
            const base = isFinite(n) ? n : aliquotaEfetiva
            return base.toFixed(5).replace('.', ',')
          })(),
          totalDAS,
          totalDASFormatado: formatCurrency(totalDAS),
          aliquotaEfetivaAtualPercent: (() => {
            const src: any = (dados as any)?.calculos || (graficos as any) || (result as any) || {}
            const v = src?.aliquotaEfetivaAtualPercent ?? src?.aliquota_efetiva_atual_percent ?? src?.aliquota_efetiva_atual
            const n = Number(v)
            if (isFinite(n)) return n
            return (receitaPA > 0 ? (totalDAS / receitaPA) * 100 : aliquotaEfetiva)
          })(),
          aliquotaEfetivaOriginalPercent: (() => {
            const src: any = (result as any)?.calculos || (dados as any)?.calculos || {}
            const v = src?.aliquotaEfetivaOriginalPercent ?? src?.aliquota_efetiva_original_percent
            const n = Number(v)
            return isFinite(n) ? n : undefined
          })(),
          analiseAliquota: (() => {
            const srcR: any = (result as any)
            const srcD: any = (dados as any)
            return srcD?.calculos?.analiseAliquota || srcR?.calculos?.analiseAliquota || srcD?.analiseAliquota || srcR?.analiseAliquota || srcD?.calculos?.analise_aliquota || srcR?.calculos?.analise_aliquota || srcD?.analise_aliquota || srcR?.analise_aliquota || undefined
          })(),
          analiseAliquotaItems: (() => {
            const a: any = (dados as any)?.calculos?.analiseAliquota || (result as any)?.calculos?.analiseAliquota || (dados as any)?.analiseAliquota || (result as any)?.analiseAliquota || (dados as any)?.calculos?.analise_aliquota || (result as any)?.calculos?.analise_aliquota || (dados as any)?.analise_aliquota || (result as any)?.analise_aliquota
            if (!a) return undefined
            if (Array.isArray(a)) return a
            if (Array.isArray(a?.por_anexo)) return a.por_anexo
            return undefined
          })(),
          analiseAliquotaMeta: (() => {
            const a: any = (dados as any)?.calculos?.analiseAliquota || (result as any)?.calculos?.analiseAliquota || (dados as any)?.analiseAliquota || (result as any)?.analiseAliquota || (dados as any)?.calculos?.analise_aliquota || (result as any)?.calculos?.analise_aliquota || (dados as any)?.analise_aliquota || (result as any)?.analise_aliquota
            if (!a || Array.isArray(a)) return undefined
            const meta: any = {}
            meta.anexo_principal = a?.anexo_principal
            meta.anexos_detectados = a?.anexos_detectados
            meta.rpa_atual = a?.rpa_atual
            meta.rbt12_original = a?.rbt12_original
            meta.rbt12_atual = a?.rbt12_atual
            meta.rpa_mes_ano_anterior = a?.rpa_mes_ano_anterior
            return meta
          })(),
        }
        ,
        tributosMercadoriasInterno: dados?.tributosMercadoriasInterno,
        tributosMercadoriasExterno: dados?.tributosMercadoriasExterno,
        tributosServicosInterno: dados?.tributosServicosInterno,
        tributosServicosExterno: dados?.tributosServicosExterno,
      }

      setData(processedData)
      const code = (result?.dashboardCode || result?.code || null) as string | null
      if (code) setShareCode(code)
      toast({
        title: "PDF processado com sucesso!",
        description: "Dados carregados e prontos para análise."
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      setError(errorMessage)
      toast({
        title: "Erro ao processar PDF",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDownloadPDF = useCallback(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const code = shareId || shareCode || ''
    let path = code ? `/d/${code}` : `/dashboard-das`
    const sep = path.includes('?') ? '&' : '?'
    path = `${path}${sep}pdf_gen=true`
    // Fixa a largura em 1600px para garantir alta resolução no PDF, independente da janela do usuário
    const w = 1600
    
    let filename = 'dashboard.pdf'
    if (data?.identificacao) {
      const rs = data.identificacao.razaoSocial || 'Empresa'
      const pa = data.identificacao.periodoApuracao || 'Periodo'
      filename = `${rs} - ${pa}.pdf`.replace(/[^a-z0-9à-ú .-]/gi, '_')
    }

    const url = `${origin}/api/pdf?path=${encodeURIComponent(path)}&type=screen&w=${w}&scale=1&download=true&filename=${encodeURIComponent(filename)}`
    try {
      window.open(url, '_blank')
    } catch {
      window.location.assign(url)
    }
  }, [shareId, shareCode, data])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <ConfiguracaoProcessamento
              onProcess={handleProcessPDF}
              loading={loading}
            />
          </div>
        </div>
      </div>
    )
  }

  if (!data && !initialData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Analisador de PGDAS-D
            </h1>
            <p className="text-slate-600">
              Faça upload do seu arquivo PGDAS-D para análise detalhada
            </p>
          </div>
          <ConfiguracaoProcessamento
            onProcess={handleProcessPDF}
            loading={loading}
          />
        </div>
      </div>
    )
  }

  if (!data || !data.identificacao) {
    if (initialData) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Carregando dados...</p>
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              Analisador de PGDAS-D
            </h1>
            <p className="text-slate-600">
              Faça upload do seu arquivo PGDAS-D para análise detalhada
            </p>
          </div>
          <ConfiguracaoProcessamento
            onProcess={handleProcessPDF}
            loading={loading}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white w-full overflow-x-hidden flex justify-center items-start">
      <div
        className="bg-white min-h-screen p-4 origin-top"
        style={{
          width: '1600px',
          ['zoom' as any]: scale,
        }}
      >
        <div className="w-full space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
          </div>
          {!isPdfGen && (
            <div className="print:hidden">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-white/70 text-slate-700 hover:bg-white border-slate-200"
                onClick={() => window.location.assign('/')}
              >
                Processar Novo PDF
              </Button>
            </div>
          )}
        </div>



        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-xl py-2">
          <CardContent className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            <div>
              <p className="text-slate-400 text-xs sm:text-sm">CNPJ</p>
              <p className="text-base sm:text-lg font-semibold break-words">{data?.identificacao?.cnpj}</p>
            </div>
            <div className="sm:col-span-2 md:col-span-1">
              <p className="text-slate-400 text-xs sm:text-sm">Razão Social</p>
              <p className="text-base sm:text-lg font-semibold break-words">{data?.identificacao?.razaoSocial}</p>
            </div>
            <div className="sm:col-span-2 md:col-span-1">
              <p className="text-slate-400 text-xs sm:text-sm">Período</p>
              <p className="text-base sm:text-lg font-semibold break-words">{data?.identificacao?.periodoApuracao}</p>
            </div>
          </CardContent>
        </Card>

        {data?.receitas && (
          <Card className="bg-white border-slate-200">
            <CardHeader className="py-2">
              <CardTitle className="text-slate-800">Discriminativo de Receitas</CardTitle>
              <CardDescription>Detalhamento completo das receitas conforme PGDASD</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 py-2">
              {(() => {
                const r = data?.receitas || ({} as any)
                const me = r?.mercadoExterno || ({} as any)
                const getNum = (v: any) => Number(v || 0)
                const getFirst = (...vals: any[]) => {
                  for (const v of vals) { const n = Number(v); if (isFinite(n) && n !== 0) return n }
                  const z = Number(vals[0]); return isFinite(z) ? z : 0
                }
                const rpaTot = getNum(r?.receitaPA)
                const rbt12Tot = getNum(r?.rbt12)
                const rbaTot = getNum(r?.rba)
                const rbaaTot = getNum(r?.rbaa)
                const rbt12pTot = getFirst((r as any)?.rbt12p, (r as any)?.rbt12_parcial, (r as any)?.RBT12p)
                const miRpa = rpaTot - getNum(me?.rpa)
                const miRbt12 = rbt12Tot - getNum(me?.rbt12)
                const miRba = rbaTot - getNum(me?.rba)
                const miRbaa = rbaaTot - getNum(me?.rbaa)
                const miRbt12p = rbt12pTot - getNum((me as any)?.rbt12p ?? (me as any)?.rbt12_parcial)
                const extVals = [getNum(me?.rpa), getNum(me?.rbt12), getNum(me?.rba), getNum(me?.rbaa), getNum((me as any)?.rbt12p ?? (me as any)?.rbt12_parcial)]
                const showExternal = extVals.some(v => v > 0)
                const rows: { label: string; mi: number; me?: number; total: number }[] = []
                const addRow = (label: string, mi: number, me: number, total: number) => {
                  if (total > 0) rows.push({ label, mi, me, total })
                }
                addRow('Receita Bruta do PA (RPA) - Competência', miRpa, getNum(me?.rpa), rpaTot)
                addRow('Receita bruta acumulada dos 12 meses anteriores ao PA (RBT12)', miRbt12, getNum(me?.rbt12), rbt12Tot)
                addRow('Receita bruta acumulada parcial (RBT12p)', miRbt12p, getNum((me as any)?.rbt12p ?? (me as any)?.rbt12_parcial), rbt12pTot)
                addRow('Receita bruta acumulada no ano-calendário corrente (RBA)', miRba, getNum(me?.rba), rbaTot)
                addRow('Receita bruta acumulada no ano-calendário anterior (RBAA)', miRbaa, getNum(me?.rbaa), rbaaTot)
                if (!rows.length) return null
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-700">
                          <th className="text-left py-2 px-3">Local de Receitas (R$)</th>
                          <th className="text-right py-2 px-3">Mercado Interno</th>
                          {showExternal && (
                            <th className="text-right py-2 px-3">Mercado Externo</th>
                          )}
                          <th className="text-right py-2 px-3">Total</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-900">
                        {rows.map((row, i) => (
                          <tr key={`rec-${i}`} className="border-slate-200">
                            <td className="py-2 px-3">{row.label}</td>
                            <td className="text-right py-2 px-3">{formatCurrency(row.mi)}</td>
                            {showExternal && (
                              <td className="text-right py-2 px-3">{formatCurrency(getNum(row.me))}</td>
                            )}
                            <td className="text-right py-2 px-3">{formatCurrency(row.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
              {(() => {
                const r = data?.receitas || ({} as any)
                const rba = Number(r?.rba || 0)
                const utilizacaoLimite = rba > 0 ? (rba / 4800000) * 100 : 0

                const parseNumber = (v: any): number => {
                  if (typeof v === 'number') return v
                  const s = String(v || '').trim().replace(/\./g, '').replace(',', '.')
                  const n = Number(s)
                  return isFinite(n) ? n : 0
                }
                const periodo = String((data as any)?.identificacao?.periodoApuracao || '')
                const mmYYYY = periodo.match(/(\d{2})\/(\d{4})/)
                const curMM = mmYYYY ? Number(mmYYYY[1]) : 0
                const curYY = mmYYYY ? Number(mmYYYY[2]) : 0
                const histMI = (((data as any)?.historico?.mercadoInterno) || []) as { mes: string; valor: any }[]
                const histME = (((data as any)?.historico?.mercadoExterno) || []) as { mes: string; valor: any }[]
                const toKey = (mes: string): number | null => {
                  const m = mes.match(/(\d{2})\/(\d{4})/)
                  if (m) { return Number(m[2]) * 100 + Number(m[1]) }
                  return null
                }
                const map: Record<number, number> = {}
                const pushAll = (arr: { mes: string; valor: any }[] = []) => {
                  for (const p of arr) {
                    const k = toKey(String(p.mes || ''))
                    if (k != null) {
                      const val = parseNumber(p.valor)
                      map[k] = (map[k] || 0) + val
                    }
                  }
                }
                pushAll(histMI)
                pushAll(histME)
                const getVal = (yy: number, mm: number): number => {
                  if (mm <= 0) { yy -= Math.ceil(Math.abs(mm) / 12); mm = ((mm % 12) + 12) % 12; if (mm === 0) mm = 12 }
                  if (mm > 12) { yy += Math.floor((mm - 1) / 12); mm = ((mm - 1) % 12) + 1 }
                  const k = yy * 100 + mm
                  return Number(map[k] || 0)
                }
                const receitaPA = Number(r?.receitaPA || 0)
                const curSum = Number(receitaPA) + getVal(curYY, curMM - 1) + getVal(curYY, curMM - 2)
                const prevSum = getVal(curYY - 1, curMM) + getVal(curYY - 1, curMM - 1) + getVal(curYY - 1, curMM - 2)
                const growth = prevSum > 0 ? ((curSum - prevSum) / prevSum) * 100 : 0
                const media3 = getVal(curYY, curMM - 1) + getVal(curYY, curMM - 2) + getVal(curYY, curMM - 3)
                const mediaTri = media3 / 3
                const consistency = mediaTri > 0 ? ((Number(receitaPA) / mediaTri) * 100) - 100 : 0
                const pct = (n: number) => `${(n || 0).toFixed(2).replace('.', ',')}%`
                return (
                  <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {utilizacaoLimite > 0 && (
                      <Card className="bg-emerald-50 border-0">
                        <CardContent className="p-3">
                          <p className="text-xs text-emerald-700">Utilização do Limite</p>
                          <p className="text-lg font-semibold text-emerald-800">{pct(utilizacaoLimite)}</p>
                        </CardContent>
                      </Card>
                    )}
                    {Math.abs(growth) > 0 && (
                      <Card className="bg-blue-50 border-0">
                        <CardContent className="p-3">
                          <p className="text-xs text-blue-700">Comparativo de Crescimento</p>
                          <p className="text-lg font-semibold text-blue-800">{pct(growth)}</p>
                        </CardContent>
                      </Card>
                    )}
                    {mediaTri > 0 && (
                      <Card className="bg-violet-50 border-0">
                        <CardContent className="p-3">
                          <p className="text-xs text-violet-700">Média no último trimestre</p>
                          <p className="text-lg font-semibold text-violet-800">{formatCurrency(mediaTri)}</p>
                        </CardContent>
                      </Card>
                    )}
                    {consistency !== 0 && (
                      <Card className="bg-orange-50 border-0">
                        <CardContent className="p-3">
                          <p className="text-xs text-orange-700">Consistência</p>
                          <p className="text-lg font-semibold text-orange-800">{pct(consistency)}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        )}



        {data?.receitas && (() => {
          const sI = (data as any)?.tributosServicosInterno || {}
          const sE = (data as any)?.tributosServicosExterno || {}
          const mI = (data as any)?.tributosMercadoriasInterno || {}
          const mE = (data as any)?.tributosMercadoriasExterno || {}
          const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + Number(b || 0), 0)
          let servicosTotal = sum(sI) + sum(sE)
          let mercadoriasTotal = sum(mI) + sum(mE)
          if (servicosTotal <= 0 && mercadoriasTotal <= 0) {
            const atividades = (data as any)?.atividades || []
            const norm = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
            const somaTrib = (t: any) => ['irpj', 'csll', 'cofins', 'pis', 'inss_cpp', 'icms', 'ipi', 'iss', 'total'].reduce((a, k) => a + Number(t?.[k] || 0), 0)
            for (const a of atividades) {
              const nome = norm(a?.nome || a?.descricao || '')
              const isServ = /servi/.test(nome)
              const v = somaTrib(a?.tributos || {})
              if (isServ) servicosTotal += v
              else mercadoriasTotal += v
            }
          }
          const acts = ((data as any)?.debug?.atividades || (data as any)?.atividades || []) as any[]
          const parseNumRobust = (v: any): number => {
            if (typeof v === 'number') return v
            const s = String(v || '').trim()
            if (!s) return 0
            // Se tiver vírgula e ponto, assume que ponto é milhar e vírgula é decimal (pt-BR)
            // ou vice-versa, mas geralmente PDF brasileiro é pt-BR.
            // Estratégia simples: remover tudo que não é dígito ou vírgula, depois trocar vírgula por ponto
            // Mas cuidado com 1.000.000,00 -> se remover ponto fica 1000000,00 -> ok
            // E se for 1,000.00 (EN)? O sistema parece ser PT-BR.
            
            // Tentativa de deteção simples:
            if (s.includes(',') && s.includes('.')) {
               // Verifica qual aparece por último
               const lastDot = s.lastIndexOf('.')
               const lastComma = s.lastIndexOf(',')
               if (lastComma > lastDot) {
                 // Formato 1.234,56
                 return Number(s.replace(/\./g, '').replace(',', '.'))
               } else {
                 // Formato 1,234.56
                 return Number(s.replace(/,/g, ''))
               }
            }
            if (s.includes(',')) return Number(s.replace(',', '.'))
            return Number(s)
          }
          
          const servicosBrutoPA = acts.filter(a => /servi/i.test(String(a?.nome || a?.descricao || ''))).reduce((acc, a) => acc + parseNumRobust(a?.receita_bruta_informada), 0)
          const mercadoriasBrutoPA = acts.filter(a => !/servi/i.test(String(a?.nome || a?.descricao || ''))).reduce((acc, a) => acc + parseNumRobust(a?.receita_bruta_informada), 0)
          const historicoMI = (data as any)?.historico?.mercadoInterno as { mes: string; valor: any }[] | undefined
          const parseNumber = (v: any): number => {
            if (typeof v === "number") return v
            if (typeof v === "string") {
              const s = v.trim()
              if (!s) return 0
              const hasComma = s.includes(",")
              const hasDot = s.includes(".")
              let cleaned = s
              if (hasComma && hasDot) {
                const lastDot = s.lastIndexOf('.')
                const lastComma = s.lastIndexOf(',')
                if (lastComma > lastDot) cleaned = s.replace(/\./g, "").replace(",", ".")
                else cleaned = s.replace(/,/g, "")
              } else if (hasComma) cleaned = s.replace(",", ".")
              const n = Number(cleaned)
              return isFinite(n) ? n : 0
            }
            const n = Number(v)
            return isFinite(n) ? n : 0
          }
          const receitas12Meses = (() => {
            const values = (historicoMI || []).map(p => parseNumber(p.valor))
            if (values.length >= 12) return values.slice(values.length - 12)
            return undefined
          })()
          return (
            <IndicadoresReceita
              receitas={data.receitas}
              calculos={data?.calculos}
              servicosTotal={servicosTotal}
              mercadoriasTotal={mercadoriasTotal}
              servicosBrutoPA={servicosBrutoPA}
              mercadoriasBrutoPA={mercadoriasBrutoPA}
              receitas12Meses={receitas12Meses}
              periodoApuracao={data?.identificacao?.periodoApuracao}
              porAnexoItems={
                Array.isArray((data as any)?.calculos?.analise_aliquota?.detalhe) ? (data as any).calculos.analise_aliquota.detalhe :
                Array.isArray((data as any)?.calculos?.analiseAliquota?.detalhe) ? (data as any).calculos.analiseAliquota.detalhe : undefined
              }
            />
          )
        })()}

        <Card className="bg-white border-slate-200 mt-6" style={{ breakInside: 'avoid' }}>
          <CardHeader className="py-2">
            <CardTitle className="text-slate-800">Quadro de Distribuição de Resultados</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const rawPeriod = String(data?.identificacao?.periodoApuracao || '')
              const p0 = rawPeriod.split(' ')[0].split('/')
              const periodoDisplay = p0.length === 3 ? `${p0[1]}/${p0[2]}` : rawPeriod
              const rpa = Number(data?.receitas?.receitaPA || 0)
              
              let servicos = 0
              let mercadorias = 0
              let industria = 0 // Keeping it for completeness although we focus on Merc/Serv

              // Priority 1: Use Analise Aliquota (Most Accurate - same as Annual Dashboard)
              const detalhe = (data as any)?.calculos?.analise_aliquota?.detalhe || (data as any)?.calculos?.analiseAliquota?.detalhe || []
              if (Array.isArray(detalhe) && detalhe.length > 0) {
                 detalhe.forEach((d: any) => {
                    const anexo = Number(d.anexo)
                    // Some parsers might put value directly or in parcelas_ajuste
                    const valor = d.parcelas_ajuste?.reduce((acc: number, p: any) => acc + (Number(p.valor) || 0), 0) || Number(d.receita_bruta) || 0
                    
                    if ([1].includes(anexo)) {
                        mercadorias += valor
                    } else if ([2].includes(anexo)) {
                        industria += valor // Treat as separate or fold into Mercadorias if requested? 
                                           // User asked for Mercadorias vs Servicos. Usually Industry is its own thing or grouped with Merc.
                                           // For now, let's keep it separate in var but maybe display logic handles it?
                                           // The AnnualDashboard displays it as 'Indústria'.
                                           // But the table below expects Merc/Serv breakdown.
                                           // Let's add Industry to Mercadorias for the purpose of this specific table if the table only has 2 columns?
                                           // The table has specific Merc/Serv rows.
                                           // If I look at AnnualDashboard table (L1278), it only shows Merc and Serv rows in the breakdown loop.
                                           // And L1311: const totalRevenue = breakdown.mercadorias + breakdown.servicos + breakdown.industria
                                           // But the rows L1319 only show Merc and Serv.
                                           // So if there is Industry, it might be hidden in that table?
                                           // Wait, looking at AnnualDashboard L1302:
                                           // const baseMerc = breakdown.mercadorias * 0.08
                                           // const baseServ = breakdown.servicos * 0.32
                                           // It seems Industry is ignored in that specific "Quadro de Distribuição" in AnnualDashboard too?
                                           // Or maybe "Mercadorias" there implies Comércio + Indústria?
                                           // The prompt said "8% Mercadorias / 32% Serviços". 
                                           // Anexo I is 4% nominal... wait. Presumed Profit is 8% for Commerce/Industry and 32% for Services.
                                           // So yes, Industry (Anexo II) usually has 8% presunção IRPJ too.
                                           // So I should add Industria to Mercadorias for the calculation base.
                         mercadorias += valor
                    } else if ([3, 4, 5].includes(anexo)) {
                        servicos += valor
                    }
                 })
              } else {
                  // Priority 2: Fallback to Activities (Text analysis)
                  const at = (data as any)?.atividades
                  if (at && typeof at === 'object') {
                    const items = Object.values(at).filter((x: any) => x && typeof x === 'object')
                    if (items.length) {
                      items.forEach((i: any) => {
                        const nome = String(i?.descricao || '').toLowerCase()
                        const val = Number(i?.Total || 0)
                        if (nome.includes('servi')) servicos += val
                        else mercadorias += val
                      })
                      const sum = servicos + mercadorias
                      if (sum > 0 && rpa > 0) {
                        servicos = rpa * (servicos / sum)
                        mercadorias = rpa * (mercadorias / sum)
                      } else {
                        servicos = rpa
                      }
                    } else {
                      // Priority 3: Tributos Ratios
                      const tServ = (data?.tributosServicosInterno?.Total || 0) + (data?.tributosServicosExterno?.Total || 0)
                      const tMerc = (data?.tributosMercadoriasInterno?.Total || 0) + (data?.tributosMercadoriasExterno?.Total || 0)
                      if (tServ + tMerc > 0) {
                        servicos = rpa * (tServ / (tServ + tMerc))
                        mercadorias = rpa * (tMerc / (tServ + tMerc))
                      } else {
                        servicos = rpa
                      }
                    }
                  } else {
                     // Priority 3 again (redundant fallback)
                     const tServ = (data?.tributosServicosInterno?.Total || 0) + (data?.tributosServicosExterno?.Total || 0)
                     const tMerc = (data?.tributosMercadoriasInterno?.Total || 0) + (data?.tributosMercadoriasExterno?.Total || 0)
                     if (tServ + tMerc > 0) {
                       servicos = rpa * (tServ / (tServ + tMerc))
                       mercadorias = rpa * (tMerc / (tServ + tMerc))
                     } else {
                       servicos = rpa
                     }
                  }
              }

              const irpjTotal = Number(data?.tributos?.IRPJ || 0)
              const baseMerc = mercadorias * 0.08
              const baseServ = servicos * 0.32
              const totalBase = baseMerc + baseServ
              const irpjMerc = totalBase > 0 ? (irpjTotal * (baseMerc / totalBase)) : 0
              const irpjServ = totalBase > 0 ? (irpjTotal * (baseServ / totalBase)) : 0
              const distMerc = baseMerc - irpjMerc
              const distServ = baseServ - irpjServ
              return (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left w-[160px]">Período</th>
                        <th className="px-3 py-2 text-left">Receita Bruta</th>
                        <th className="px-3 py-2 text-left">IRPJ</th>
                        <th className="px-3 py-2 text-left">Alíquota</th>
                        <th className="px-3 py-2 text-left">Distribuição</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="align-top">
                        <td className="px-3 py-2 font-medium">{periodoDisplay}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-semibold uppercase text-muted-foreground">Mercadorias</span>
                              <span className="font-medium">{mercadorias.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-semibold uppercase text-muted-foreground">Serviços</span>
                              <span className="font-medium">{servicos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-col">
                              <span className="text-[11px] text-muted-foreground">Mercadorias</span>
                              <span className="font-medium">{irpjMerc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] text-muted-foreground">Serviços</span>
                              <span className="font-medium">{irpjServ.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <div className="text-sm font-medium">Mercadorias: <span className="font-bold">8%</span></div>
                            <div className="text-sm font-medium">Serviços: <span className="font-bold">32%</span></div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-col">
                              <span className="text-[11px] text-muted-foreground">Mercadorias</span>
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {distMerc.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] text-muted-foreground">Serviços</span>
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {distServ.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </CardContent>
        </Card>


        <AnaliseAliquotaParcelas dadosPgdas={{ analise_aliquota: (data?.calculos as any)?.analiseAliquota || (data?.calculos as any)?.analise_aliquota, identificacao: (data as any)?.identificacao }} />
        {(() => {
          const serieA = data?.graficos?.receitaMensal
          const serieMI = data?.graficos?.receitaLine
          const serieME = (data?.graficos as any)?.receitaLineExterno
          const historicoMI = (data as any)?.historico?.mercadoInterno as { mes: string; valor: any }[] | undefined
          const historicoME = (data as any)?.historico?.mercadoExterno as { mes: string; valor: any }[] | undefined
          const parseNumber = (v: any): number => {
            if (typeof v === 'number') return v
            const s = String(v || '').trim().replace(/\./g, '').replace(',', '.')
            const n = Number(s)
            return isFinite(n) ? n : 0
          }
          const hasHistData = (arr?: { mes: string; valor: any }[]) => Array.isArray(arr) && arr.some(p => parseNumber(p?.valor) > 0)
          const hasSeriesData = (s?: { labels?: any[]; values?: any[] }) => !!(s && Array.isArray(s.values) && s.values.some(v => parseNumber(v) > 0))
          const hasData = hasHistData(historicoMI) || hasHistData(historicoME) || hasSeriesData(serieA) || hasSeriesData(serieMI) || hasSeriesData(serieME)
          if (!hasData) return null
          return (
            <Card className="bg-white border-slate-200 py-1 gap-1" style={{ breakInside: 'avoid' }}>
              <CardHeader className="pt-1 pb-0">
                <CardTitle className="text-slate-800">Receita Mensal (R$)</CardTitle>
                <CardDescription>Mercado Interno e Externo</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 pb-0">
                {(() => {
                  const serieA = data.graficos?.receitaMensal
                  const serieMI = data.graficos?.receitaLine
                  const serieME = (data.graficos as any)?.receitaLineExterno
                  const parseNumber = (v: any): number => {
                    if (typeof v === "number") return v
                    if (typeof v === "string") {
                      const s = v.trim()
                      if (!s) return 0
                      const hasComma = s.includes(",")
                      const hasDot = s.includes(".")
                      let cleaned = s
                      if (hasComma && hasDot) {
                        const lastDot = s.lastIndexOf('.')
                        const lastComma = s.lastIndexOf(',')
                        if (lastComma > lastDot) {
                          cleaned = s.replace(/\./g, "").replace(",", ".")
                        } else {
                          cleaned = s.replace(/,/g, "")
                        }
                      } else if (hasComma) {
                        cleaned = s.replace(",", ".")
                      }
                      const n = Number(cleaned)
                      return isFinite(n) ? n : 0
                    }
                    const n = Number(v)
                    return isFinite(n) ? n : 0
                  }
                  const historicoMI = (data as any)?.historico?.mercadoInterno as { mes: string; valor: any }[] | undefined
                  const historicoME = (data as any)?.historico?.mercadoExterno as { mes: string; valor: any }[] | undefined
                  if (Array.isArray(historicoMI) || Array.isArray(historicoME)) {
                    const toMap = (arr?: { mes: string; valor: any }[]) => {
                      const m: Record<string, number> = {}
                        ; (arr || []).forEach((p) => { m[p.mes] = parseNumber(p.valor) })
                      return m
                    }
                    const miMap = toMap(historicoMI)
                    const meMap = toMap(historicoME)
                    const rawLabels = Array.from(new Set<string>([...Object.keys(miMap), ...Object.keys(meMap)]))
                    const monthIdx = (m: string) => {
                      const map: Record<string, number> = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 }
                      const k = String(m || '').trim().slice(0, 3).toLowerCase()
                      return map[k] || 0
                    }
                    const toKey = (s: string, i: number) => {
                      const mmYYYY = s.match(/^(\d{1,2})\/(\d{4})$/)
                      if (mmYYYY) { const mm = Number(mmYYYY[1]); const yy = Number(mmYYYY[2]); return yy * 100 + mm }
                      const yDashM = s.match(/^(\d{4})-(\d{1,2})$/)
                      if (yDashM) { const yy = Number(yDashM[1]); const mm = Number(yDashM[2]); return yy * 100 + mm }
                      const monYear = s.match(/^([A-Za-zÀ-ÿ]{3,})\s*\/?\s*(\d{4})$/)
                      if (monYear) { const mm = monthIdx(monYear[1]); const yy = Number(monYear[2]); return yy * 100 + mm }
                      const mm = monthIdx(s); if (mm > 0) return 2000 * 100 + mm
                      return i
                    }
                    const labels = rawLabels.sort((a, b) => toKey(a, rawLabels.indexOf(a)) - toKey(b, rawLabels.indexOf(b)))
                    const values = labels.map((l) => (miMap[l] || 0))
                    const externo = { labels, values: labels.map((l) => meMap[l] || 0) }
                    const merged = { labels, values, externo }
                    return (
                      <GraficoReceitaMensal
                        data={merged}
                      />
                    )
                  }
                  if (serieMI || serieME) {
                    const miVals = (serieMI?.values || []).map(parseNumber)
                    const miLabels = (serieMI?.labels || []) as string[]
                    const meVals = (serieME?.values || []).map(parseNumber)
                    const meLabels = (serieME?.labels || []) as string[]
                    const rawLabels2 = Array.from(new Set<string>([...miLabels, ...meLabels]))
                    const monthIdx2 = (m: string) => {
                      const map: Record<string, number> = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 }
                      const k = String(m || '').trim().slice(0, 3).toLowerCase()
                      return map[k] || 0
                    }
                    const toKey2 = (s: string, i: number) => {
                      const mmYYYY = s.match(/^(\d{1,2})\/(\d{4})$/)
                      if (mmYYYY) { const mm = Number(mmYYYY[1]); const yy = Number(mmYYYY[2]); return yy * 100 + mm }
                      const yDashM = s.match(/^(\d{4})-(\d{1,2})$/)
                      if (yDashM) { const yy = Number(yDashM[1]); const mm = Number(yDashM[2]); return yy * 100 + mm }
                      const monYear = s.match(/^([A-Za-zÀ-ÿ]{3,})\s*\/?\s*(\d{4})$/)
                      if (monYear) { const mm = monthIdx2(monYear[1]); const yy = Number(monYear[2]); return yy * 100 + mm }
                      const mm = monthIdx2(s); if (mm > 0) return 2000 * 100 + mm
                      return i
                    }
                    const labels = rawLabels2.sort((a, b) => toKey2(a, rawLabels2.indexOf(a)) - toKey2(b, rawLabels2.indexOf(b)))
                    const miMap: Record<string, number> = {}
                    const meMap: Record<string, number> = {}
                    miLabels.forEach((l, i) => { miMap[l] = miVals[i] || 0 })
                    meLabels.forEach((l, i) => { meMap[l] = meVals[i] || 0 })
                    const values = labels.map((l) => miMap[l] || 0)
                    const externo = { labels, values: labels.map((l) => meMap[l] || 0) }
                    return (
                      <GraficoReceitaMensal
                        data={{ labels, values, externo }}
                      />
                    )
                  }
                  if (serieA) {
                    return <GraficoReceitaMensal data={serieA} />
                  }
                  if (serieMI) {
                    return <GraficoReceitaMensal data={serieMI} />
                  }
                  return null
                })()}
              </CardContent>
            </Card>
          )
        })()}
        {data?.tributos && (
          <Card className="bg-white border-slate-200" style={{ breakInside: 'avoid' }}>
            <CardHeader className="py-2">
              <CardTitle className="text-slate-800">Detalhamento dos Tributos</CardTitle>
              <CardDescription>Composição do DAS por categoria e tributo</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto py-2">
              {(() => {
                const t = (data?.tributos || {}) as Record<string, number>
                const tmI = ((data as any)?.tributosMercadoriasInterno || {}) as Record<string, number>
                const tmE = ((data as any)?.tributosMercadoriasExterno || {}) as Record<string, number>
                const tsI = ((data as any)?.tributosServicosInterno || {}) as Record<string, number>
                const tsE = ((data as any)?.tributosServicosExterno || {}) as Record<string, number>
                const rows = [
                  ['IRPJ', t.IRPJ],
                  ['CSLL', t.CSLL],
                  ['COFINS', t.COFINS],
                  ['PIS/PASEP', t.PIS_Pasep],
                  ['INSS/CPP', t.INSS_CPP],
                  ['ICMS', t.ICMS],
                  ['IPI', t.IPI],
                  ['ISS', t.ISS],
                ] as [string, number][]
                const getVal = (o: Record<string, number>, label: string) => {
                  const norm = (s: string) => s
                    .replace(/\s+/g, '')
                    .replace(/\//g, '_')
                    .toUpperCase()
                  const target = norm(label)
                  for (const [k, v] of Object.entries(o || {})) {
                    if (norm(k) === target) return Number(v || 0)
                  }
                  // casos especiais
                  const aliases: Record<string, string[]> = {
                    'PIS_PASEP': ['PIS_Pasep', 'pis_pasep', 'PIS'],
                    'INSS_CPP': ['INSS', 'CPP', 'inss_cpp'],
                  }
                  for (const [t, arr] of Object.entries(aliases)) {
                    if (target === t) {
                      for (const ak of arr) {
                        const v = (o as any)[ak]
                        if (typeof v !== 'undefined') return Number(v || 0)
                      }
                    }
                  }
                  return 0
                }
                const totMercInt = rows.reduce((acc, [lbl]) => acc + getVal(tmI, lbl), 0)
                const totMercExt = rows.reduce((acc, [lbl]) => acc + getVal(tmE, lbl), 0)
                const totServInt = rows.reduce((acc, [lbl]) => acc + getVal(tsI, lbl), 0)
                const totServExt = rows.reduce((acc, [lbl]) => acc + getVal(tsE, lbl), 0)
                const catCols = [
                  { label: 'Mercadorias (interno)', get: (lbl: string) => getVal(tmI, lbl), total: totMercInt, cls: 'text-blue-600' },
                  { label: 'Mercadorias (externo)', get: (lbl: string) => getVal(tmE, lbl), total: totMercExt, cls: 'text-blue-600' },
                  { label: 'Serviços (interno)', get: (lbl: string) => getVal(tsI, lbl), total: totServInt, cls: 'text-indigo-600' },
                  { label: 'Serviços (externo)', get: (lbl: string) => getVal(tsE, lbl), total: totServExt, cls: 'text-indigo-600' },
                ]
                const visible = catCols.filter(c => Number(c.total || 0) > 0)
                const totalGet = (lbl: string) => Number(getVal(t, lbl) || 0)
                const totalSum = rows.reduce((acc, [lbl]) => acc + Number(getVal(t, lbl) || 0), 0)
                const cols = [...visible, { label: 'Total', get: totalGet, total: totalSum, cls: 'text-slate-900 font-semibold' }]
                return (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-700">
                        <th className="text-left py-1 px-2">Tributo</th>
                        {cols.map((h, i) => (
                          <th key={i} className="text-right py-1 px-2">{h.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-slate-900">
                      {rows.map(([label], idx) => {
                        const rowTotal = Number(totalGet(label) || 0)
                        const globalVal = Number(getVal(t, label) || 0)
                        if (rowTotal <= 0 && globalVal <= 0) return null
                        return (
                          <tr key={idx} className="border-slate-200">
                            <td className="py-1 px-2">{label}</td>
                            {cols.map((c, ci) => {
                              const isTotal = c.label === 'Total'
                              const cv = isTotal ? Number(totalGet(label) || 0) : Number(c.get(label) || 0)
                              const show = isTotal ? (cv > 0 || globalVal > 0) : cv > 0
                              return <td key={ci} className={`text-right py-1 px-2 ${c.cls}`}>{show ? formatCurrency(cv) : ''}</td>
                            })}
                          </tr>
                        )
                      })}
                      <tr className="border-slate-200 font-semibold">
                        <td className="py-1 px-2">Total</td>
                        {cols.map((c, ci) => {
                          const tv = Number(c.total || 0)
                          const isTotal = c.label === 'Total'
                          const show = isTotal ? true : tv > 0
                          return <td key={ci} className={`text-right py-1 px-2 text-blue-600 font-semibold`}>{show ? formatCurrency(tv) : ''}</td>
                        })}
                      </tr>
                    </tbody>
                  </table>
                )
              })()}
            </CardContent>
          </Card>
        )}
        {data?.tributos && (() => {
          const trib = data?.tributos || ({} as any)
          const totalDAS = Number(data?.calculos?.totalDAS || trib?.Total || 0)
          const sI = (data as any)?.tributosServicosInterno || {}
          const sE = (data as any)?.tributosServicosExterno || {}
          const mI = (data as any)?.tributosMercadoriasInterno || {}
          const mE = (data as any)?.tributosMercadoriasExterno || {}
          const getVal = (o: Record<string, number>, label: string) => {
            const norm = (s: string) => s
              .replace(/\s+/g, '')
              .replace(/\//g, '_')
              .toUpperCase()
            const target = norm(label)
            for (const [k, v] of Object.entries(o || {})) {
              if (norm(k) === target) return Number(v || 0)
            }
            const aliases: Record<string, string[]> = {
              'PIS_PASEP': ['PIS_Pasep', 'pis_pasep', 'PIS'],
              'INSS_CPP': ['INSS', 'CPP', 'inss_cpp'],
            }
            for (const [t, arr] of Object.entries(aliases)) {
              if (target === t) {
                for (const ak of arr) {
                  const v = (o as any)[ak]
                  if (typeof v !== 'undefined') return Number(v || 0)
                }
              }
            }
            return 0
          }
          const items = [
            { key: 'IRPJ', label: 'IRPJ', color: '#3b82f6' },
            { key: 'CSLL', label: 'CSLL', color: '#8b5cf6' },
            { key: 'COFINS', label: 'COFINS', color: '#ec4899' },
            { key: 'PIS_Pasep', label: 'PIS/PASEP', color: '#f59e0b' },
            { key: 'INSS_CPP', label: 'INSS/CPP', color: '#10b981' },
            { key: 'ICMS', label: 'ICMS', color: '#06b6d4' },
            { key: 'IPI', label: 'IPI', color: '#ef4444' },
            { key: 'ISS', label: 'ISS', color: '#94a3b8' },
          ].map(it => ({
            ...it,
            value: Number((trib as any)?.[it.key] || 0)
          }))
            .filter(it => it.value > 0)
            .sort((a, b) => b.value - a.value)
          if (!items.length || totalDAS <= 0) return null
          const dataChart = {
            labels: items.map(i => i.label),
            datasets: [{
              data: items.map(i => i.value),
              backgroundColor: items.map(i => i.color),
              borderColor: '#ffffff',
              borderWidth: 1,
              cutout: '68%',
              radius: '95%',
            }]
          }
          const options = {
            ...CHART_CONFIG,
            responsive: true,
            maintainAspectRatio: false,
            devicePixelRatio: 2,
            layout: { padding: { top: 30, bottom: 10, left: 0, right: 0 } },
            animation: false,
            interaction: { mode: null as any },
            plugins: {
              ...CHART_CONFIG.plugins,
              datalabels: { display: false },
              legend: { display: false },
              tooltip: { enabled: false },
            },
            scales: {},
          } as any
          const centerText = {
            id: 'centerText',
            beforeDraw: (chart: any) => {
              const { ctx, chartArea } = chart
              if (!ctx || !chartArea) return
              const cx = (chartArea.left + chartArea.right) / 2
              const cy = (chartArea.top + chartArea.bottom) / 2
              ctx.save()
              ctx.textAlign = 'center'
              ctx.fillStyle = '#111827'
              ctx.font = '600 14px Inter, system-ui, -apple-system, Segoe UI'
              ctx.fillText('Total de Tributos', cx, cy - 10)
              ctx.font = '700 14px Inter, system-ui, -apple-system, Segoe UI'
              ctx.fillText(formatCurrency(totalDAS), cx, cy + 14)
              ctx.restore()
            }
          }
          const labelLeaders = {
            id: 'labelLeaders',
            afterDatasetsDraw: (chart: any) => {
              const meta = chart.getDatasetMeta(0)
              const arcs = meta?.data || []
              const labels: string[] = chart?.data?.labels || []
              const ds = chart?.data?.datasets?.[0] || {}
              const values: number[] = ds?.data || []
              const colors: string[] = ds?.backgroundColor || []
              const area = chart.chartArea
              const cx = (area.left + area.right) / 2
              const cy = (area.top + area.bottom) / 2
              const ctx = chart.ctx
              const nodes: any[] = []
              for (let i = 0; i < arcs.length; i++) {
                const v = Number(values[i] || 0)
                if (!(v > 0)) continue
                const el = arcs[i]
                const p = el && el.getProps ? el.getProps(['startAngle', 'endAngle', 'outerRadius'], true) : el
                const start = Number(p.startAngle || 0)
                const end = Number(p.endAngle || 0)
                const r = Number(p.outerRadius || 0)
                const ang = start + (end - start) / 2
                const ax = cx + Math.cos(ang) * r
                const ay = cy + Math.sin(ang) * r
                const ex = cx + Math.cos(ang) * (r + 14)
                const ey = cy + Math.sin(ang) * (r + 14)
                const right = Math.cos(ang) >= 0
                const lx = right ? ex + 56 : ex - 56
                const ly = ey
                const pct = totalDAS > 0 ? (v / totalDAS) * 100 : 0
                nodes.push({ i, label: labels[i], value: v, color: colors[i], ax, ay, ex, ey, lx, ly, right, pct })
              }
              const resolveSide = (side: 'left' | 'right') => {
                const arr = nodes.filter(n => (side === 'right' ? n.right : !n.right)).sort((a, b) => a.ly - b.ly)
                const gap = 18
                for (let i = 1; i < arr.length; i++) {
                  const prev = arr[i - 1]
                  const cur = arr[i]
                  if (cur.ly - prev.ly < gap) arr[i].ly = prev.ly + gap
                }
              }
              resolveSide('left')
              resolveSide('right')
              ctx.save()
              for (const n of nodes) {
                ctx.strokeStyle = String(n.color || '#475569')
                ctx.lineWidth = 1.25
                ctx.beginPath()
                ctx.moveTo(n.ax, n.ay)
                ctx.lineTo(n.ex, n.ey)
                ctx.lineTo(n.lx, n.ly)
                ctx.stroke()
                ctx.textAlign = n.right ? 'left' : 'right'
                ctx.fillStyle = String(n.color || '#111827')
                ctx.font = '600 14px Inter, system-ui, -apple-system, Segoe UI'
                const txt = `${n.label}: ${formatCurrency(Number(n.value || 0))} (${n.pct.toFixed(1)}%)`
                ctx.fillText(txt, n.lx, n.ly - 2)
              }
              ctx.restore()
            }
          }
          return (
            <Card className="bg-white border-slate-200" style={{ breakInside: 'avoid' }}>
              <CardHeader className="py-2">
                <CardTitle className="text-slate-800">Distribuição de Tributos (DAS)</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-3 lg:col-span-3 space-y-3 print:hidden">
                    {items.map((it, i) => {
                      const pct = totalDAS > 0 ? ((it.value / totalDAS) * 100) : 0
                      return (
                        <div key={i} className="flex items-center justify-between rounded-lg px-2 py-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: it.color }} />
                            <div className="text-slate-600 text-xs font-medium">{it.label}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-slate-500 text-[10px]">{pct.toFixed(2)}%</div>
                            <span className="rounded-full text-white text-[11px] px-2 py-0.5" style={{ backgroundColor: it.color }}>
                              {formatCurrency(it.value)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    {(() => {
                      const sI = (data as any)?.tributosServicosInterno || {}
                      const sE = (data as any)?.tributosServicosExterno || {}
                      const mI = (data as any)?.tributosMercadoriasInterno || {}
                      const mE = (data as any)?.tributosMercadoriasExterno || {}
                      const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + Number(b || 0), 0)
                      let servicosTotal = sum(sI) + sum(sE)
                      let mercadoriasTotal = sum(mI) + sum(mE)
                      if (servicosTotal <= 0 && mercadoriasTotal <= 0) {
                        const atividades = (data as any)?.atividades || []
                        const norm = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
                        const somaTrib = (t: any) => ['irpj', 'csll', 'cofins', 'pis', 'inss_cpp', 'icms', 'ipi', 'iss', 'total'].reduce((a, k) => a + Number(t?.[k] || 0), 0)
                        for (const a of atividades) {
                          const nome = norm(a?.nome || a?.descricao || '')
                          const isServ = /servi/.test(nome)
                          const v = somaTrib(a?.tributos || {})
                          if (isServ) servicosTotal += v
                          else mercadoriasTotal += v
                        }
                      }
                      const norm = (s: string) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
                      const anal = (data as any)?.calculos?.analise_aliquota || (data as any)?.analise_aliquota || (data as any)?.analiseAliquota || {}
                      const detalhe: any[] = Array.isArray((anal as any)?.detalhe) ? (anal as any).detalhe : []
                      let transSem = 0
                      let transCom = 0
                      for (const it of detalhe) {
                        const ps: any[] = Array.isArray(it?.parcelas_ajuste) ? it.parcelas_ajuste : []
                        for (const p of ps) {
                          const text = [p?.atividade_nome, p?.descricao, p?.nome].filter(Boolean).map(String).join(' ')
                          const n = norm(text)
                          const v = Number(p?.valor || 0)
                          if (!(v > 0)) continue
                          if (n.includes(norm('Transporte sem substituição tributária de ICMS'))) transSem += v
                          else if (n.includes(norm('Transporte com substituição tributária de ICMS'))) transCom += v
                        }
                      }
                      const showServ = servicosTotal > 0
                      const showMerc = mercadoriasTotal > 0
                      return (
                        <div className="flex items-center justify-between bg-slate-200 rounded-lg px-2 py-2 border border-slate-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-3 h-2 rounded-full bg-slate-600" />
                              <div className="text-slate-700 text-xs font-semibold">TOTAL DAS</div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {showServ && (
                                <span className="inline-flex items-center rounded-full bg-indigo-600/15 text-indigo-700 px-2 py-1 text-[11px] font-semibold">
                                  Serviços: {formatCurrency(servicosTotal)}
                                </span>
                              )}
                              {showMerc && (
                                <span className="inline-flex items-center rounded-full bg-blue-600/15 text-blue-700 px-2 py-1 text-[11px] font-semibold">
                                  Mercadorias: {formatCurrency(mercadoriasTotal)}
                                </span>
                              )}
                              {transSem > 0 && (
                                <span className="inline-flex items-center rounded-full bg-purple-600/15 text-purple-700 px-2 py-1 text-[11px] font-semibold">
                                  Transporte — sem ST: {formatCurrency(transSem)}
                                </span>
                              )}
                              {transCom > 0 && (
                                <span className="inline-flex items-center rounded-full bg-fuchsia-600/15 text-fuchsia-700 px-2 py-1 text-[11px] font-semibold">
                                  Transporte — com ST: {formatCurrency(transCom)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-slate-900 text-xs font-semibold">
                            <div>100%</div>
                            <div>{formatCurrency(totalDAS)}</div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  <div className="md:col-span-9 lg:col-span-9 min-h-[300px] flex items-center justify-center w-full">
                    <Doughnut ref={chartRef} data={dataChart} options={options} plugins={[centerText, labelLeaders]} style={{ backgroundColor: 'transparent' }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}




        {/* Activity Comparison */}
        <ComparacaoAtividades
          atividades={data?.atividades}
        />

        {/* Insights */}
        {data?.insights && (
          <Card className="bg-white border-slate-200">
            <CardHeader className="py-2">
              <CardTitle className="text-slate-800">
                Insights e Recomendações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3">
              {data?.insights?.comparativoSetorial && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    {data.insights.comparativoSetorial}
                  </p>
                </div>
              )}

              {data?.insights?.pontosAtencao?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-orange-600 mb-2">
                    Pontos de Atenção
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {data.insights.pontosAtencao.map((ponto, index) => (
                      <li key={index} className="text-sm text-orange-700">
                        {ponto}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data?.insights?.oportunidades?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-emerald-600 mb-2">
                    Oportunidades
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {data.insights.oportunidades.map((oportunidade, index) => (
                      <li key={index} className="text-sm text-emerald-700">
                        {oportunidade}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data?.insights?.recomendacoes?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-purple-600 mb-2">
                    Recomendações
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {data.insights.recomendacoes.map((recomendacao, index) => (
                      <li key={index} className="text-sm text-purple-700">
                        {recomendacao}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="bg-white border-slate-200 rounded-2xl" style={{ breakInside: 'avoid' }}>
          <CardHeader className="py-2">
            <CardTitle className="text-slate-800 tracking-tight">Contato e Ações</CardTitle>
            <CardDescription className="leading-relaxed">Caso queira uma análise mais completa e personalizada</CardDescription>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="rounded-xl p-3 bg-slate-50">
                  <ul className="space-y-2 text-slate-700">
                    <li className="flex items-start gap-2"><span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-blue-600" />Cenários comparativos entre regimes tributários</li>
                    <li className="flex items-start gap-2"><span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-indigo-600" />Simulações de economia fiscal</li>
                    <li className="flex items-start gap-2"><span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-600" />Recomendações exclusivas para o seu ramo</li>
                  </ul>
                </div>
              </div>
              <div>
                <div className={`rounded-xl p-4 bg-slate-100/70 text-slate-800 border border-slate-200`}>
                  <p className="font-semibold text-slate-900 mb-2">Fale com a Integra</p>
                  <div className="space-y-2">
                    <a className="flex items-center gap-2 hover:text-emerald-700" href="https://wa.me/559481264638" target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 text-emerald-600" />WhatsApp: 94 8126-4638</a>
                    <a className="flex items-center gap-2 hover:text-blue-700" href="mailto:atendimento@integratecnologia.inf.br"><Mail className="h-4 w-4 text-blue-600" />E-mail: atendimento@integratecnologia.inf.br</a>
                  </div>
                </div>
              </div>
            </div>
            {!hideDownloadEffective && !isPdfGen && (
              <div className="flex justify-end mt-4 print:hidden">
                <Button onClick={handleDownloadPDF}>Baixar PDF</Button>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
})
