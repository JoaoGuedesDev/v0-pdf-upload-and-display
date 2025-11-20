import { memo, useMemo } from "react"
import { BarChartHorizontal } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarrasReceita } from "@/components/BarrasReceita"
import { UI_CONFIG, ATIVIDADES_COLORS } from "@/lib/constants"
import { formatCurrency } from "@/lib/utils"

interface AtividadeData {
  atividade1?: {
    descricao: string
    Total: number
  }
  atividade2?: {
    descricao: string
    Total: number
  }
}

interface ComparacaoAtividadesProps {
  atividades?: AtividadeData
  className?: string
}

export const ComparacaoAtividades = memo(function ComparacaoAtividades({ atividades, className = "" }: ComparacaoAtividadesProps) {
  const mercadorias = Number(atividades?.atividade1?.Total || 0)
  const servicos = Number(atividades?.atividade2?.Total || 0)

  const total = useMemo(() => mercadorias + servicos, [mercadorias, servicos])
  
  const chartData = useMemo(() => [
    ...(mercadorias > 0
      ? [{ name: "Mercadorias", value: mercadorias, color: ATIVIDADES_COLORS?.mercadorias || "#3b82f6" }]
      : []),
    ...(servicos > 0
      ? [{ name: "Serviços", value: servicos, color: ATIVIDADES_COLORS?.servicos || "#10b981" }]
      : []),
  ], [mercadorias, servicos])

  const tableData = useMemo(() => [
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
  ].filter((item) => item.value > 0), [mercadorias, servicos])

  const hasData = mercadorias > 0 || servicos > 0
  if (!hasData) return null

  return (
    <Card
      className={`bg-white border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-200 print:inline-block print:w-1/3 print:align-top print:break-inside-avoid ${className}`}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle
            className={`text-base sm:text-[9px] flex items-center gap-2 text-slate-800`}
          >
            <BarChartHorizontal className={`h-5 w-5 text-blue-600`} />
            Comparativo por Atividade (DAS)
          </CardTitle>
          <CardDescription
            className={`text-xs sm:text-[9px] text-slate-500`}
          >
            Distribuição do DAS entre Mercadorias e Serviços
          </CardDescription>
        </div>
        <div className={`text-[9px] font-semibold text-slate-700`}>
          Total: {formatCurrency(total)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tabela rápida à esquerda (mostrar também no PDF) */}
          <div className="space-y-0.5 print:block">
            {tableData.map(({ key, label, value, color }) => {
              const pct = total > 0 ? (value / total) * 100 : 0
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:shadow-md transition-all duration-200`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                    <div>
                      <div
                        className={`font-medium text-sm text-slate-800`}
                      >
                        {label}
                      </div>
                      <div className={`text-xs text-slate-500`}>
                        {pct.toFixed(5)}%
                      </div>
                    </div>
                  </div>
                  <div
                    className={`font-bold text-sm text-slate-900`}
                  >
                    {formatCurrency(value)}
                  </div>
                </div>
              )
            })}
            <div
              className={`flex items-center justify-between p-2 rounded-lg border-2 bg-slate-100 border-slate-300 font-bold`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full bg-slate-600`}
                />
                <div>
                  <div
                    className={`font-bold text-sm text-slate-800`}
                  >
                    TOTAL DAS (Atividades)
                  </div>
                  <div className={`text-xs text-slate-600`}>
                    100.00000%
                  </div>
                </div>
              </div>
              <div
                className={`font-bold text-lg text-slate-900`}
              >
                {formatCurrency(total)}
              </div>
            </div>
          </div>
          {/* Gráfico de barras à direita */}
          <div className="flex flex-col">
            <h4
              className={`font-semibold text-[10px] text-slate-700 mb-4`}
            >
              Visualização Gráfica
            </h4>
            <div id="chart-atividades-bar" className="flex-1 flex items-center justify-center">
              <div className="h-[260px] print:h-[230px] w-full overflow-visible rounded-xl">
                {typeof window !== "undefined" && (window as any).ResizeObserver ? (
                  <BarrasReceita
                    labels={chartData.map((d) => d.name)}
                    values={chartData.map((d) => d.value)}
                  />
                ) : (
                  <div className={`text-slate-500 text-xs text-center p-4`}>
                    Visualização gráfica indisponível no ambiente de teste
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})