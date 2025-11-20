import React from "react"
import DonutTributos from "@/components/charts/DonutTributos"
import { chartColors, spacing } from "@/lib/design"

type Tributos = {
  IRPJ?: number
  CSLL?: number
  COFINS?: number
  PIS_Pasep?: number
  INSS_CPP?: number
  ICMS?: number
  IPI?: number
  ISS?: number
  Total?: number
}

type Config = {
  gridGap?: number
  pieOuterRadius?: number
  pieHeight?: number
}

export default function DistribuicaoDASCard({ tributos, config }: { tributos: Tributos | undefined; config?: Config }) {
  const CHART_COLORS = chartColors.primary
  const total = Number(tributos?.Total || 0)
  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n)
  const keys: { key: keyof Tributos; label: string }[] = [
    { key: "IRPJ", label: "IRPJ" },
    { key: "CSLL", label: "CSLL" },
    { key: "COFINS", label: "COFINS" },
    { key: "PIS_Pasep", label: "PIS/PASEP" },
    { key: "INSS_CPP", label: "INSS/CPP" },
    { key: "ICMS", label: "ICMS" },
    { key: "IPI", label: "IPI" },
    { key: "ISS", label: "ISS" },
  ]

  const pieHeight = config?.pieHeight ?? 260
  const outerRadius = config?.pieOuterRadius ?? 120
  const gap = config?.gridGap ?? spacing.card.gap

  return (
    <div className={`bg-white border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl p-4 print:break-inside-avoid`}>
      <h3 className={`text-lg font-semibold text-slate-800 mb-4`}>Distribuição de Tributos (DAS)</h3>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.8fr]" style={{ gap }}>
        <div className="space-y-1">
          {keys
            .map((it, idx) => {
              const value = Number((tributos as any)?.[it.key] || 0)
              if (!value) return null
              const pct = total > 0 ? (value / total) * 100 : 0
              const color = CHART_COLORS[idx % CHART_COLORS.length]
              return (
                <div key={it.key} className={`flex items-center justify-between p-1 rounded-lg bg-slate-50`}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <div>
                      <div className={`font-small text-[10px] text-slate-800`}>{it.label}</div>
                      <div className={`text-[10px] text-slate-500`}>{fmt(value)} ({pct.toFixed(2)}%)</div>
                    </div>
                  </div>
                </div>
              )
            })}
          <div className={`flex items-center justify-between p-2 rounded-lg border-2 bg-slate-100 border-slate-300 font-bold`}>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full bg-slate-600`} />
              <div>
                <div className={`font-bold text-[10px] text-slate-800`}>TOTAL DAS</div>
                <div className={`text-[10px] text-slate-600`}>100%</div>
              </div>
            </div>
            <div className={`font-bold text-[10px] text-slate-900`}>{fmt(total)}</div>
          </div>
          
        </div>
        <div className="flex flex-col items-center justify-center">
          <div className="flex justify-center items-center w-full overflow-visible" style={{ height: pieHeight }}>
            <div className="block print:hidden w-full" style={{ height: pieHeight }}>
              <DonutTributos tributos={tributos} variant="screen" height={pieHeight} outerRadius={outerRadius} cx="50%" cy="50%" showCenter />
            </div>
            <div className="hidden print:flex w-full justify-center items-center" style={{ height: pieHeight }}>
              <DonutTributos tributos={tributos} variant="pdf" width={620} height={pieHeight} cx="50%" cy="50%" innerRadius={outerRadius-60} outerRadius={outerRadius-20} showCenter />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}