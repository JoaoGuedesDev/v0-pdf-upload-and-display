import { memo, useMemo } from "react"
import { TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import PieTributosClassic from "@/components/charts/PieTributosClassic"
import { UI_CONFIG, CHART_COLORS } from "@/lib/constants"
import { formatCurrency } from "@/lib/utils"

interface TributosData {
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

interface DistribuicaoDASProps {
  tributos?: TributosData
  className?: string
}

export const DistribuicaoDAS = memo(function DistribuicaoDAS({ tributos, className = "" }: DistribuicaoDASProps) {
  const tributosList = useMemo(() => [
    { key: "IRPJ", label: "IRPJ" },
    { key: "CSLL", label: "CSLL" },
    { key: "COFINS", label: "COFINS" },
    { key: "PIS_Pasep", label: "PIS/PASEP" },
    { key: "INSS_CPP", label: "INSS/CPP" },
    { key: "ICMS", label: "ICMS" },
    { key: "IPI", label: "IPI" },
    { key: "ISS", label: "ISS" },
  ], [])

  const tableData = useMemo(() => {
    const src: any = tributos || {}
    return tributosList
      .map(({ key, label }, index) => ({
        key,
        label,
        value: Number(src[key]) || 0,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .filter((item) => item.value > 0)
  }, [tributosList, tributos])

  const pieData = useMemo(() => tableData.map((item) => ({
    label: item.label,
    value: item.value,
    color: item.color,
  })), [tableData])

  const hasData = tributos && typeof tributos === "object" && tributos.Total > 0
  if (!hasData) return null

  return (
    <Card
      id="print-pie"
      className={`bg-white border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-200 ${className}`}
      style={{ breakInside: 'avoid' }}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle
            className={`${UI_CONFIG.fonts.titleCls} flex items-center gap-2 text-slate-800`}
          >
            <TrendingUp className={`h-5 w-5 text-purple-500`} />
            Distribuição do DAS
          </CardTitle>
          <CardDescription
            className={`${UI_CONFIG.fonts.descCls} text-slate-500`}
          >
            Composição percentual dos tributos
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <div className="grid grid-cols-12 gap-6">
          {/* Valores numéricos à esquerda (mostrar também no PDF) */}
          <div className="space-y-0.5 print:block lg:col-span-5">
            <h4
              className={`font-semibold text-xs text-slate-700 mb-3`}
            >
              Valores por Tributo
            </h4>
            {tableData.map(({ key, label, value, color }) => {
              const percentage = tributos.Total > 0 ? (value / tributos.Total) * 100 : 0
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
                        className={`font-medium text-xs text-slate-800`}
                      >
                        {label}
                      </div>
                      <div className={`text-[11px] text-slate-500`}>
                        {percentage.toFixed(5)}%
                      </div>
                    </div>
                  </div>
                  <div
                    className={`font-bold text-xs text-slate-900`}
                  >
                    {formatCurrency(value)}
                  </div>
                </div>
              )
            })}
            {/* Total */}
            <div
              className={`flex items-center justify-between p-2 rounded-lg border-2 bg-slate-100 border-slate-300 font-bold`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full bg-slate-600`}
                />
                <div>
                  <div
                    className={`font-bold text-[9px] text-slate-800`}
                  >
                    TOTAL DAS
                  </div>
                  <div className={`text-xs text-slate-600`}>
                    100.00000%
                  </div>
                </div>
              </div>
              <div
                className={`font-bold text-base text-slate-900`}
              >
                {formatCurrency(tributos.Total)}
              </div>
            </div>
          </div>
          {/* Gráfico de Pizza à direita */}
          <div className="flex flex-col lg:col-span-7">
            <h4
              className={`font-semibold text-xs text-slate-700 mb-3`}
            >
              Visualização Gráfica
            </h4>
            <div id="chart-das-pie" className="flex-1 flex items-center justify-center">
              <div className="w-full overflow-hidden h-[300px] md:h-[360px] print:h-[260px] rounded-xl">
                <div className="block print:hidden w-full h-full">
                  <div className="w-full h-full">
                    {typeof window !== "undefined" && (window as any).ResizeObserver ? (
                      <PieTributosClassic data={pieData} height={300} />
                    ) : (
                      <div className={`text-slate-500 text-xs text-center p-4`}>
                        Visualização gráfica indisponível no ambiente de teste
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})