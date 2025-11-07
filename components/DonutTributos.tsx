"use client"

import { useRef, useMemo } from "react"
import { Chart, ArcElement, Tooltip, Legend } from "chart.js"
import ChartDataLabels from "chartjs-plugin-datalabels"
import { Doughnut } from "react-chartjs-2"
import { fmtBRL, fmtPct } from "@/utils/format"

Chart.register(ArcElement, Tooltip, Legend, ChartDataLabels)

type Item = { label: string; value: number }

export function DonutTributos({ data }: { data: Item[] }) {
  const ref = useRef<any>(null)

  // Ordena desc e agrupa em "Outros" se tiver muita fatia
  const { labels, values } = useMemo(() => {
    const ordered = [...data].sort((a, b) => b.value - a.value)
    const top = ordered.slice(0, 6)
    const rest = ordered.slice(6)
    const outros = rest.reduce((s, i) => s + i.value, 0)
    const L = [...top.map(t => t.label), ...(outros > 0 ? ["Outros"] : [])]
    const V = [...top.map(t => t.value), ...(outros > 0 ? [outros] : [])]
    return { labels: L, values: V }
  }, [data])

  const total = values.reduce((a, b) => a + b, 0)

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        // deixe Chart.js escolher as cores padrão ou defina as suas paletas
      },
    ],
  }

  const options: any = {
    responsive: true,
    cutout: "60%", // donut
    plugins: {
      legend: {
        position: "right",
        labels: { color: "#cbd5e1" }, // bom para tema escuro
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const v = ctx.raw as number
            return `${fmtBRL(v)} (${fmtPct(v, total)})`
          },
        },
      },
      datalabels: {
        color: "#fff",
        font: { weight: "600" },
        formatter: (v: number) => fmtBRL(v),
        // exibir sempre os valores em R$
        display: true,
      },
    },
  }

  const exportPng = () => {
    const url = ref.current?.toBase64Image?.()
    if (!url) return
    const a = document.createElement("a")
    a.href = url
    a.download = "donut-tributos.png"
    a.click()
  }

  return (
    <div className="rounded-2xl p-4 bg-slate-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-slate-100 font-semibold">Distribuição de Tributos</h3>
        <button onClick={exportPng} className="px-3 py-1 rounded bg-emerald-600 text-white">Exportar PNG</button>
      </div>

      {/* total ao centro, via overlay simples */}
      <div className="relative">
        <Doughnut ref={ref} data={chartData} options={options} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-slate-300 text-xs uppercase">Total</div>
            <div className="text-slate-100 text-lg font-bold">{fmtBRL(total)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}