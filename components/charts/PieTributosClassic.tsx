"use client"

import React from "react"
import { PieChart, Pie, Cell, LabelList, ResponsiveContainer } from "recharts"

type Item = { label: string; value: number }
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

const CHART_COLORS = [
  "#3B82F6", // azul
  "#EF4444", // vermelho
  "#10B981", // verde
  "#F59E0B", // âmbar
  "#8B5CF6", // roxo
  "#06B6D4", // ciano
  "#F97316", // laranja
  "#22C55E", // verde claro
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

function textColorForBg(hex: string, dark = "#0f172a", light = "#ffffff") {
  try {
    const h = hex.replace(/^#/, "")
    const r = parseInt(h.substring(0, 2), 16)
    const g = parseInt(h.substring(2, 4), 16)
    const b = parseInt(h.substring(4, 6), 16)
    // luminância aproximada
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return luma > 160 ? dark : light
  } catch {
    return dark
  }
}

export default function PieTributosClassic({
  tributos,
  data,
  height = 280,
  minPctInside = 0.06,
}: {
  tributos?: Tributos
  data?: Item[]
  height?: number
  minPctInside?: number
}) {
  const items: Item[] = React.useMemo(() => {
    if (Array.isArray(data) && data.length) return data
    const base: Item[] = [
      { label: "IRPJ", value: Number(tributos?.IRPJ || 0) },
      { label: "CSLL", value: Number(tributos?.CSLL || 0) },
      { label: "COFINS", value: Number(tributos?.COFINS || 0) },
      { label: "PIS/PASEP", value: Number(tributos?.PIS_Pasep || 0) },
      { label: "INSS/CPP", value: Number(tributos?.INSS_CPP || 0) },
      { label: "ICMS", value: Number(tributos?.ICMS || 0) },
      { label: "IPI", value: Number(tributos?.IPI || 0) },
      { label: "ISS", value: Number(tributos?.ISS || 0) },
    ].filter((i) => i.value > 0)
    return base
  }, [data, tributos])

  const chartData = items.map((it, idx) => ({
    name: it.label,
    value: it.value,
    color: CHART_COLORS[idx % CHART_COLORS.length],
  }))

  const total = items.reduce((s, i) => s + i.value, 0)

  return (
    <div className="relative w-full overflow-visible" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={0}
            outerRadius={Math.min(120, Math.round(height * 0.42))}
            paddingAngle={1}
            stroke="#ffffff"
            strokeWidth={1}
            labelLine
          >
            {chartData.map((entry, idx) => (
              <Cell key={`cell-classic-${idx}`} fill={entry.color} />
            ))}
            {(() => {
              const renderLabel = (props: any) => {
                const { x, y, name, value, percent, payload, cx } = props || {}
                const lbl = String(payload?.name ?? name ?? "")
                const val = Number(value ?? payload?.value ?? 0)
                if (!lbl) return null
                const pct = total > 0 ? (val / total) : 0
                const pctTxt = `${(pct * 100).toFixed(2)}%`
                const color = textColorForBg(String(payload?.color || "#ffffff"))
                // Para fatias muito pequenas, posicionar fora para evitar sobreposição
                const inside = pct >= minPctInside
                const anchor = !inside ? (Number(x) < Number(cx) ? "end" : "start") : "middle"
                const dx = !inside ? (anchor === "start" ? 10 : -10) : 0
                const dy = inside ? 0 : 0
                const yy = Math.max(12, Math.min(Number(y || 0), height - 12))
                return (
                  <text x={x} y={yy} dy={dy} dx={dx} textAnchor={anchor as any} fill={color} style={{ fontSize: 11 }}>
                    {inside ? (
                      <>
                        <tspan x={x} y={yy} fontWeight={600}>{lbl}</tspan>
                        <tspan x={x} y={yy + 14}>{formatCurrency(val)}</tspan>
                        <tspan x={x} y={yy + 28}>{pctTxt}</tspan>
                      </>
                    ) : (
                      <>
                        <tspan fontWeight={600}>{lbl}</tspan>
                        <tspan dx={6}>{formatCurrency(val)}</tspan>
                        <tspan dx={6}>{`(${pctTxt})`}</tspan>
                      </>
                    )}
                  </text>
                )
              }
              return <LabelList content={renderLabel as any} position="inside" />
            })()}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}