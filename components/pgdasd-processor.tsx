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
import { formatCurrency, computeTotalDAS } from "@/lib/utils"
            <Image src="/integra-logo.svg" alt="Integra" width={160} height={48} className="h-10 sm:h-12 w-auto object-contain" />
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
          aliquotaEfetiva: aliquota0,
          margemLiquida: margem0,
          aliquotaEfetivaFormatada: (aliquota0 || 0).toFixed(5).replace('.', ','),
          totalDAS: totalDAS0,
          totalDASFormatado: formatCurrency(totalDAS0),
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
          aliquotaEfetiva,
          margemLiquida,
          aliquotaEfetivaFormatada: aliquotaEfetiva.toFixed(5).replace(".", ","),
          totalDAS,
          totalDASFormatado: formatCurrency(totalDAS),
        }
        ,
        tributosMercadoriasInterno: dados?.tributosMercadoriasInterno,
        tributosMercadoriasExterno: dados?.tributosMercadoriasExterno,
        tributosServicosInterno: dados?.tributosServicosInterno,
        tributosServicosExterno: dados?.tributosServicosExterno,
      }
      
      setData(processedData)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            
          </div>
          <div className="flex items-center gap-2">
            {!hideDownloadButton && data && (
              <Button variant="outline" size="sm" onClick={() => {
                const url = `/api/pdf?path=${encodeURIComponent('/dashboard-das')}`
                window.open(url, '_blank')
              }}>
                Exportar
              </Button>
            )}
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
            <CardHeader>
              <CardTitle className="text-slate-800">Discriminativo de Receitas</CardTitle>
              <CardDescription>Detalhamento completo das receitas conforme PGDASD</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const r = data?.receitas || ({} as any)
                const me = r?.mercadoExterno || ({} as any)
                const miRpa = Number(r?.receitaPA || 0) - Number(me?.rpa || 0)
                const miRbt12 = Number(r?.rbt12 || 0) - Number(me?.rbt12 || 0)
                const miRba = Number(r?.rba || 0) - Number(me?.rba || 0)
                const miRbaa = Number(r?.rbaa || 0) - Number(me?.rbaa || 0)
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-700">
                          <th className="text-left py-2 px-3">Local de Receitas (R$)</th>
                          <th className="text-right py-2 px-3">Mercado Interno</th>
                          <th className="text-right py-2 px-3">Mercado Externo</th>
                          <th className="text-right py-2 px-3">Total</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-900">
                        <tr className="border-slate-200">
                          <td className="py-2 px-3">Receita Bruta do PA (RPA) - Competência</td>
                          <td className="text-right py-2 px-3">{formatCurrency(miRpa)}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(Number(me?.rpa || 0))}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(Number(r?.receitaPA || 0))}</td>
                        </tr>
                        <tr className="border-slate-200">
                          <td className="py-2 px-3">Receita bruta acumulada dos 12 meses anteriores ao PA (RBT12)</td>
                          <td className="text-right py-2 px-3">{formatCurrency(miRbt12)}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(Number(me?.rbt12 || 0))}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(Number(r?.rbt12 || 0))}</td>
                        </tr>
                        <tr className="border-slate-200">
                          <td className="py-2 px-3">Receita bruta acumulada no ano-calendário corrente (RBA)</td>
                          <td className="text-right py-2 px-3">{formatCurrency(miRba)}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(Number(me?.rba || 0))}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(Number(r?.rba || 0))}</td>
                        </tr>
                        <tr className="border-slate-200">
                          <td className="py-2 px-3">Receita bruta acumulada no ano-calendário anterior (RBAA)</td>
                          <td className="text-right py-2 px-3">{formatCurrency(miRbaa)}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(Number(me?.rbaa || 0))}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(Number(r?.rbaa || 0))}</td>
                        </tr>
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
                const miSeries = (data?.graficos?.receitaLine?.values || []) as any[]
                const parse = (v: any) => {
                  if (typeof v === 'number') return v
                  const s = String(v || '').trim().replace(/\./g, '').replace(',', '.')
                  const n = Number(s)
                  return isFinite(n) ? n : 0
                }
                const vals = miSeries.map(parse)
                const first3 = vals.slice(0, 3)
                const last3 = vals.slice(-3)
                const avgFirst = first3.length ? first3.reduce((a, b) => a + b, 0) / first3.length : 0
                const avgLast = last3.length ? last3.reduce((a, b) => a + b, 0) / last3.length : 0
                const growth = (avgFirst > 0) ? ((avgLast - avgFirst) / avgFirst) * 100 : 0
                const consistency = (() => {
                  const take = vals.slice(-6)
                  const m = take.length ? take.reduce((a, b) => a + b, 0) / take.length : 0
                  if (m <= 0) return 0
                  const variance = take.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / take.length
                  const std = Math.sqrt(variance)
                  return (std / m) * 100
                })()
                const pct = (n: number) => `${(n || 0).toFixed(1).replace('.', ',')}%`
                return (
                  <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="bg-emerald-50 border-0">
                      <CardContent className="p-4">
                        <p className="text-xs text-emerald-700">Utilização do Limite</p>
                        <p className="text-lg font-semibold text-emerald-800">{pct(utilizacaoLimite)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-0">
                      <CardContent className="p-4">
                        <p className="text-xs text-blue-700">Comparativo de Crescimento</p>
                        <p className="text-lg font-semibold text-blue-800">{pct(growth)}</p>
                        <p className="text-[11px] text-blue-700/80">3 últimos vs 3 primeiros</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-violet-50 border-0">
                      <CardContent className="p-4">
                        <p className="text-xs text-violet-700">Média no último trimestre</p>
                        <p className="text-lg font-semibold text-violet-800">{formatCurrency(avgLast)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-orange-50 border-0">
                      <CardContent className="p-4">
                        <p className="text-xs text-orange-700">Consistência</p>
                        <p className="text-lg font-semibold text-orange-800">{pct(consistency)}</p>
                      </CardContent>
                    </Card>
                  </div>
                )
              })()}
          </CardContent>
          </Card>
        )}

        {data?.receitas && (
          <IndicadoresReceita 
            receitas={data.receitas}
            calculos={data?.calculos}
          />
        )}
        {((data?.graficos?.receitaMensal) || (data?.graficos?.receitaLine) || (data as any)?.historico) && (
          <Card className="bg-white border-slate-200" style={{ breakInside: 'avoid' }}>
            <CardHeader>
              <CardTitle className="text-slate-800">Receita Mensal (R$)</CardTitle>
              <CardDescription>Mercado Interno e Externo</CardDescription>
            </CardHeader>
            <CardContent>
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
                  const labels = Array.from(new Set<string>([...Object.keys(miMap), ...Object.keys(meMap)])).sort()
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
                  const labels = Array.from(new Set<string>([...miLabels, ...meLabels])).sort()
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
        )}
        

        

        {/* Activity Comparison */}
        <ComparacaoAtividades 
          atividades={data?.atividades}
        />

        {/* Insights */}
        {data?.insights && (
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-800">
                Insights e Recomendações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
          <CardHeader>
            <CardTitle className="text-slate-800">Contato e Ações</CardTitle>
            <CardDescription>Caso queira uma análise mais completa e personalizada</CardDescription>
          </CardHeader>
          <CardContent>
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
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <Button variant="secondary" onClick={() => window.location.assign('/')}>Processar Novo PDF</Button>
              <Button onClick={() => alert('Geração de imagem desativada')}>Gerar Imagem (PNG)</Button>
              <Button onClick={() => alert('Geração de PDF desativada')}>Baixar PDF</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
})
import Image from "next/image"