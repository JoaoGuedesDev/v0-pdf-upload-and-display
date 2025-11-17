"use client"

import { useMemo, useRef } from "react"
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { fmtBRL, fmtPct } from "@/utils/format"

type Item = { label: string; value: number }

const COLORS = [
  "#F59E0B",
  "#EF4444",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#F97316",
  "#22C55E",
  "#06B6D4",
]

export function DonutTributos({ data }: { data: Item[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const items = useMemo(() => {
    const ordered = [...data].sort((a, b) => b.value - a.value)
    const top = ordered.slice(0, 6)
    const restVal = ordered.slice(6).reduce((s, i) => s + i.value, 0)
    return restVal > 0 ? [...top, { label: "Outros", value: restVal }] : top
  }, [data])

  const total = items.reduce((a, b) => a + b.value, 0)

  const exportSVG = () => {
    const svg = containerRef.current?.querySelector("svg")
    if (!svg) return
    const serialized = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "donut-tributos.svg"
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div ref={containerRef} className="rounded-2xl p-4 bg-slate-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-slate-100 font-semibold">Distribuição de Tributos</h3>
        <button onClick={exportSVG} className="px-3 py-1 rounded bg-emerald-600 text-white">Exportar SVG</button>
      </div>

      <div className="relative w-full h-[280px]">
        <ResponsiveContainer>
          <PieChart>
          <Pie
            data={items}
            dataKey="value"
            nameKey="label"
            innerRadius={40}
            outerRadius={30}
            stroke="none"
            strokeWidth={0}
            labelLine
            label={(entry: any) => `${entry.label}: ${fmtBRL(Number(entry.value))} (${fmtPct(Number(entry.value), total)})`}
          >
            {items.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
            <Legend verticalAlign="middle" align="right" wrapperStyle={{ color: "#cbd5e1" }} />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "10px solid #334155", color: "#e2e8f0" }}
              formatter={(value: any, name: any) => [
                `${fmtBRL(Number(value))} (${fmtPct(Number(value), total)})`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-slate-300" style={{ fontSize: 10 }}>Total</div>
            <div className="text-slate-50 font-bold" style={{ fontSize: 10 }}>{fmtBRL(total)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}