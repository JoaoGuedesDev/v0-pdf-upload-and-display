"use client"

import { useMemo, useRef } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts"
import { fmtBRL } from "@/utils/format"

export function BarrasReceita({
  labels,
  values,
}: {
  labels: string[]
  values: number[]
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const data = useMemo(() => labels.map((l, i) => ({ label: l, value: values[i] ?? 0 })), [labels, values])

  const exportSVG = () => {
    const svg = containerRef.current?.querySelector("svg")
    if (!svg) return
    const serialized = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "barras-receita.svg"
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div ref={containerRef} className="rounded-2xl p-4 bg-slate-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-slate-100 font-semibold">Receita Mensal</h3>
        <button onClick={exportSVG} className="px-3 py-1 rounded bg-emerald-600 text-white">Exportar SVG</button>
      </div>
      <div className="w-full h-[300px]">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
            <XAxis dataKey="label" tick={{ fill: "#cbd5e1", fontSize: 10 }} interval={0} angle={0} height={30} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v: number | string) => fmtBRL(Number(v))} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0" }} formatter={(v: number | string) => fmtBRL(Number(v))} />
            <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              <LabelList dataKey="value" position="top" formatter={(v: number | string) => fmtBRL(Number(v))} fill="#e2e8f0" fontSize={10} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}