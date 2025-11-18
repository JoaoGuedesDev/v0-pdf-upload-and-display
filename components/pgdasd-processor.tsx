"use client"
import { useState, useEffect, memo, useMemo, useCallback } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { ConfiguracaoProcessamento } from "@/components/dashboard/ConfiguracaoProcessamento"
import { IndicadoresReceita } from "@/components/dashboard/IndicadoresReceita"
import { ResumoTributos } from "@/components/dashboard/ResumoTributos"
import { GraficoReceitaMensal } from "@/components/dashboard/GraficoReceitaMensal"
import { DistribuicaoDAS } from "@/components/dashboard/DistribuicaoDAS"
import { ComparacaoAtividades } from "@/components/dashboard/ComparacaoAtividades"

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
  }
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
  const { theme } = useTheme()
  const darkMode = theme === "dark"
  const [data, setData] = useState<DASData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hydrate initial data if provided
  useEffect(() => {
    if (initialData && !data) {
      const hydratedData = {
        ...initialData,
        calculos: {
          ...initialData.calculos,
          aliquotaEfetiva: initialData.calculos?.aliquotaEfetiva || 0,
          margemLiquida: initialData.calculos?.margemLiquida || 0,
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
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      // Calculate additional fields
      const receitaPA = Number(result.data?.receitas?.receitaPA || 0)
      const totalDAS = Number(result.data?.tributos?.Total || 0)
      const aliquotaEfetiva = totalDAS > 0 && receitaPA > 0 ? (totalDAS / receitaPA) * 100 : 0
      const margemLiquida = receitaPA > 0 ? ((receitaPA - totalDAS) / receitaPA) * 100 : 0
      
      const processedData: DASData = {
        ...result.data,
        calculos: {
          aliquotaEfetiva,
          margemLiquida,
          aliquotaEfetivaFormatada: aliquotaEfetiva.toFixed(5).replace(".", ","),
        }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <ConfiguracaoProcessamento 
              darkMode={darkMode}
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
              Analisador de PGDAS-D
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Faça upload do seu arquivo PGDAS-D para análise detalhada
            </p>
          </div>
          <ConfiguracaoProcessamento 
            darkMode={darkMode}
            onProcess={handleProcessPDF}
            loading={loading}
          />
        </div>
      </div>
    )
  }

  if (!data || !data.identificacao) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-300">Carregando dados...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
              Análise PGDAS-D
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              {data?.identificacao?.razaoSocial} - {data?.identificacao?.cnpj}
            </p>
          </div>
          <div className="flex gap-2">
            {!hideDownloadButton && (
              <Button variant="outline" size="sm">
                Exportar
              </Button>
            )}
          </div>
        </div>

        {/* Revenue Indicators */}
        <IndicadoresReceita 
          receitas={data?.receitas}
          calculos={data?.calculos}
          darkMode={darkMode}
        />

        {/* Tax Summary */}
        <ResumoTributos 
          tributos={data?.tributos}
          darkMode={darkMode}
        />

        {/* Monthly Revenue Chart */}
        {data?.graficos?.receitaMensal && (
          <GraficoReceitaMensal 
            data={data.graficos.receitaMensal}
            darkMode={darkMode}
          />
        )}

        {/* DAS Distribution */}
        <DistribuicaoDAS 
          tributos={data?.tributos}
          darkMode={darkMode}
        />

        {/* Activity Comparison */}
        <ComparacaoAtividades 
          atividades={data?.atividades}
          darkMode={darkMode}
        />

        {/* Insights */}
        {data?.insights && (
          <Card className={darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}>
            <CardHeader>
              <CardTitle className={darkMode ? "text-white" : "text-slate-800"}>
                Insights e Recomendações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data?.insights?.comparativoSetorial && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {data.insights.comparativoSetorial}
                  </p>
                </div>
              )}
              
              {data?.insights?.pontosAtencao?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">
                    Pontos de Atenção
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {data.insights.pontosAtencao.map((ponto, index) => (
                      <li key={index} className="text-sm text-orange-700 dark:text-orange-300">
                        {ponto}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {data?.insights?.oportunidades?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                    Oportunidades
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {data.insights.oportunidades.map((oportunidade, index) => (
                      <li key={index} className="text-sm text-emerald-700 dark:text-emerald-300">
                        {oportunidade}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {data?.insights?.recomendacoes?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-purple-600 dark:text-purple-400 mb-2">
                    Recomendações
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {data.insights.recomendacoes.map((recomendacao, index) => (
                      <li key={index} className="text-sm text-purple-700 dark:text-purple-300">
                        {recomendacao}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
})