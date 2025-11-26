"use client"
import { useState, useEffect, memo, useMemo, useCallback } from "react"
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

ChartJS.register(ArcElement, Tooltip, Legend, Title, ChartDataLabels)
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
}

export const PGDASDProcessor = memo(function PGDASDProcessor({ initialData, shareId, hideDownloadButton }: PGDASDProcessorProps) {
  const [data, setData] = useState<DASData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareCode, setShareCode] = useState<string | null>(null)

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
    const path = code ? `/d/${code}` : `/dashboard-das`
    const w = typeof window !== 'undefined' ? window.innerWidth : 1280
    const url = `${origin}/api/pdf?path=${encodeURIComponent(path)}&type=screen&w=${w}&scale=1`
    try {
      window.open(url, '_blank')
    } catch {
      window.location.assign(url)
    }
  }, [shareId, shareCode])

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
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <img
              src="/shared/integra-logo.png"
              alt="Integra Soluções Empresariais"
              className="h-10 sm:h-12 w-auto object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/integra-logo.svg' }}
            />
          </div>
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
                const limit = Number(r?.limite || 0)
                const rbt12 = Number(r?.rbt12 || 0)
                const utilizacaoLimite = limit > 0 ? (rbt12 / limit) * 100 : 0

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
                const toKey = (mes: string): number | null => {
                  const m = mes.match(/(\d{2})\/(\d{4})/)
                  if (m) { return Number(m[2]) * 100 + Number(m[1]) }
                  return null
                }
                const map: Record<number, number> = {}
                for (const p of histMI) {
                  const k = toKey(String(p.mes || ''))
                  if (k != null) map[k] = parseNumber(p.valor)
                }
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
                const consistency = (() => {
                  const last6: number[] = []
                  for (let i = 0; i < 6; i++) last6.push(getVal(curYY, curMM - i))
                  const m = last6.length ? last6.reduce((a,b)=>a+b,0) / last6.length : 0
                  if (m <= 0) return 0
                  const variance = last6.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / last6.length
                  const std = Math.sqrt(variance)
                  return (std / m) * 100
                })()
                const pct = (n: number) => `${(n || 0).toFixed(1).replace('.', ',')}%`
                const mediaTri = getVal(curYY, curMM - 1) + getVal(curYY, curMM - 2) + getVal(curYY, curMM - 3)
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
                          <p className="text-[11px] text-blue-700/80">RPA + 2 meses anteriores vs ano anterior</p>
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
                    {consistency > 0 && (
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
            const somaTrib = (t: any) => ['irpj','csll','cofins','pis','inss_cpp','icms','ipi','iss','total'].reduce((a,k)=>a+Number(t?.[k]||0),0)
            for (const a of atividades) {
              const nome = norm(a?.nome || a?.descricao || '')
              const isServ = /servi/.test(nome)
              const v = somaTrib(a?.tributos || {})
              if (isServ) servicosTotal += v
              else mercadoriasTotal += v
            }
          }
          const acts = ((data as any)?.debug?.atividades || (data as any)?.atividades || []) as any[]
          const parseNum = (v: any) => Number(v || 0)
          const servicosBrutoPA = acts.filter(a => /servi/i.test(String(a?.nome || a?.descricao || ''))).reduce((acc, a) => acc + parseNum(a?.receita_bruta_informada), 0)
          const mercadoriasBrutoPA = acts.filter(a => !/servi/i.test(String(a?.nome || a?.descricao || ''))).reduce((acc, a) => acc + parseNum(a?.receita_bruta_informada), 0)
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
                Array.isArray((data as any)?.calculos?.analise_aliquota?.detalhe) ? (data as any).calculos.analise_aliquota.detalhe : undefined
              }
            />
          )
        })()}

        
        <AnaliseAliquotaParcelas dadosPgdas={{ analise_aliquota: (data?.calculos as any)?.analise_aliquota, identificacao: (data as any)?.identificacao }} />
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
                    ;(arr || []).forEach((p) => { m[p.mes] = parseNumber(p.valor) })
                    return m
                  }
                  const miMap = toMap(historicoMI)
                  const meMap = toMap(historicoME)
                  const rawLabels = Array.from(new Set<string>([...Object.keys(miMap), ...Object.keys(meMap)]))
                  const monthIdx = (m: string) => {
                    const map: Record<string, number> = { jan:1, fev:2, mar:3, abr:4, mai:5, jun:6, jul:7, ago:8, set:9, out:10, nov:11, dez:12 }
                    const k = String(m||'').trim().slice(0,3).toLowerCase()
                    return map[k] || 0
                  }
                  const toKey = (s: string, i: number) => {
                    const mmYYYY = s.match(/^(\d{1,2})\/(\d{4})$/)
                    if (mmYYYY) { const mm = Number(mmYYYY[1]); const yy = Number(mmYYYY[2]); return yy*100 + mm }
                    const yDashM = s.match(/^(\d{4})-(\d{1,2})$/)
                    if (yDashM) { const yy = Number(yDashM[1]); const mm = Number(yDashM[2]); return yy*100 + mm }
                    const monYear = s.match(/^([A-Za-zÀ-ÿ]{3,})\s*\/?\s*(\d{4})$/)
                    if (monYear) { const mm = monthIdx(monYear[1]); const yy = Number(monYear[2]); return yy*100 + mm }
                    const mm = monthIdx(s); if (mm>0) return 2000*100 + mm
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
                    const map: Record<string, number> = { jan:1, fev:2, mar:3, abr:4, mai:5, jun:6, jul:7, ago:8, set:9, out:10, nov:11, dez:12 }
                    const k = String(m||'').trim().slice(0,3).toLowerCase()
                    return map[k] || 0
                  }
                  const toKey2 = (s: string, i: number) => {
                    const mmYYYY = s.match(/^(\d{1,2})\/(\d{4})$/)
                    if (mmYYYY) { const mm = Number(mmYYYY[1]); const yy = Number(mmYYYY[2]); return yy*100 + mm }
                    const yDashM = s.match(/^(\d{4})-(\d{1,2})$/)
                    if (yDashM) { const yy = Number(yDashM[1]); const mm = Number(yDashM[2]); return yy*100 + mm }
                    const monYear = s.match(/^([A-Za-zÀ-ÿ]{3,})\s*\/?\s*(\d{4})$/)
                    if (monYear) { const mm = monthIdx2(monYear[1]); const yy = Number(monYear[2]); return yy*100 + mm }
                    const mm = monthIdx2(s); if (mm>0) return 2000*100 + mm
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
                  const base = label
                  const tests = [
                    base,
                    base.replace(/\//g, '_'),
                    base.toUpperCase(),
                    base.toUpperCase().replace(/\//g, '_'),
                    base.replace('PIS/PASEP', 'PIS_PASEP'),
                    base.replace('INSS/CPP', 'INSS_CPP'),
                    base.replace(/\s+/g, ''),
                    base.replace(/\s+/g, '_'),
                  ]
                  for (const k of tests) {
                    const v = (o as any)[k]
                    if (typeof v !== 'undefined') return Number(v || 0)
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
                const totalGet = (lbl: string) => {
                  const sum = visible.reduce((acc, c) => acc + Number(c.get(lbl) || 0), 0)
                  if (sum > 0) return sum
                  return Number(getVal(t, lbl) || 0)
                }
                const totalSum = Number(totMercInt + totMercExt + totServInt + totServExt)
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
                              const cv = Number(c.get(label) || 0)
                              const isTotal = c.label === 'Total'
                              const show = isTotal ? (Number(totalGet(label) || 0) > 0 || globalVal > 0) : cv > 0
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
            const base = label
            const tests = [
              base,
              base.replace(/\//g, '_'),
              base.toUpperCase(),
              base.toUpperCase().replace(/\//g, '_'),
              base.replace('PIS/PASEP', 'PIS_PASEP'),
              base.replace('INSS/CPP', 'INSS_CPP'),
              base.replace(/\s+/g, ''),
              base.replace(/\s+/g, '_'),
            ]
            for (const k of tests) {
              const v = (o as any)[k]
              if (typeof v !== 'undefined') return Number(v || 0)
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
          ].map(it => {
            const global = Number((trib as any)?.[it.key] || 0)
            const cats = Number(getVal(sI, it.label) || 0) + Number(getVal(sE, it.label) || 0) + Number(getVal(mI, it.label) || 0) + Number(getVal(mE, it.label) || 0)
            const value = global > 0 ? global : cats
            return { ...it, value }
          })
            .filter(it => it.value > 0)
            .sort((a, b) => b.value - a.value)
          if (!items.length || totalDAS <= 0) return null
          const dataChart = {
            labels: items.map(i => i.label),
            datasets: [{
              data: items.map(i => i.value),
              backgroundColor: items.map(i => i.color),
              borderColor: undefined,
              borderWidth: 0,
              cutout: '65%',
              radius: '85%',
            }]
          }
          const options = {
            ...CHART_CONFIG,
            layout: { padding: { top: 8, bottom: 0, left: 0, right: 0 } },
            animation: false,
            plugins: {
              ...CHART_CONFIG.plugins,
              datalabels: { display: false },
              legend: { display: false },
              tooltip: { enabled: true },
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
              ctx.font = '700 10px system-ui'
              ctx.fillText('Total Tributos', cx, cy -7)
              ctx.font = '700 10px system-ui'
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
                const p = el && el.getProps ? el.getProps(['startAngle','endAngle','outerRadius'], true) : el
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
                const gap = 16
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
                ctx.lineWidth = 1
                ctx.beginPath()
                ctx.moveTo(n.ax, n.ay)
                ctx.lineTo(n.ex, n.ey)
                ctx.lineTo(n.lx, n.ly)
                ctx.stroke()
                ctx.textAlign = n.right ? 'left' : 'right'
                ctx.fillStyle = String(n.color || '#111827')
                ctx.font = '500 11px system-ui'
                const txt = `${n.label}: ${formatCurrency(Number(n.value || 0))} (${n.pct.toFixed(2)}%)`
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
                  <div className="md:col-span-3 lg:col-span-3 space-y-3">
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
                        const somaTrib = (t: any) => ['irpj','csll','cofins','pis','inss_cpp','icms','ipi','iss','total'].reduce((a,k)=>a+Number(t?.[k]||0),0)
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
                    <Doughnut data={dataChart} options={options} plugins={[centerText, labelLeaders]} style={{ backgroundColor: 'transparent' }} />
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

        <Card className="bg-white border-slate-200" style={{ breakInside: 'avoid' }}>
          <CardHeader className="py-2">
            <CardTitle className="text-slate-800">Contato e Ações</CardTitle>
            <CardDescription>Caso queira uma análise mais completa e personalizada</CardDescription>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <ul className="text-slate-700">
                  <li>• Cenários comparativos entre regimes tributários</li>
                  <li>• Simulações de economia fiscal</li>
                  <li>• Recomendações exclusivas para o seu ramo</li>
                </ul>
              </div>
              <div>
                <div className={`rounded-lg p-3 bg-slate-50 text-slate-800`}>
                  <p>Fale com a Integra:</p>
                  <p><a className="underline" href="https://wa.me/559481264638" target="_blank" rel="noreferrer">WhatsApp: 94 8126-4638</a></p>
                  <p><a className="underline" href="mailto:atendimento@integratecnologia.inf.br">E-mail: atendimento@integratecnologia.inf.br</a></p>
                  <p>Integra Soluções Empresariais</p>
                </div>
              </div>
            </div>
            {!hideDownloadButton && (
              <div className="flex flex-wrap gap-2 justify-center mt-4 print:hidden">
                <Button variant="secondary" onClick={() => window.location.assign('/')}>Processar Novo PDF</Button>
                <Button onClick={handleDownloadPDF}>Baixar PDF</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
})
