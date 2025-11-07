"use client"

import { useRef } from "react"
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js"
import ChartDataLabels from "chartjs-plugin-datalabels"
import { Bar } from "react-chartjs-2"
import { fmtBRL } from "@/utils/format"

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels)

export function BarrasReceita({
  labels,
  values,
}: {
  labels: string[]
  values: number[]
}) {
  const ref = useRef<any>(null)

  const data = {
    labels,
    datasets: [
      {
        label: "Receita (R$)",
        data: values,
        borderWidth: 0,
        // deixe cores padrão ou defina uma única cor que combine com seu tema
      },
    ],
  }

  const options: any = {
    responsive: true,
    scales: {
      x: {
        ticks: { color: "#cbd5e1", maxRotation: 0, autoSkip: true },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: "#94a3b8",
          callback: (v: any) => fmtBRL(Number(v)),
        },
        grid: { color: "rgba(148,163,184,0.15)" },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx: any) => fmtBRL(ctx.raw) },
      },
      datalabels: {
        anchor: "end",
        align: "end",
        offset: -2,
        color: "#fff",
        formatter: (v: number) => fmtBRL(v),
        clip: false,
      },
    },
  }

  const exportPng = () => {
    const url = ref.current?.toBase64Image?.()
    if (!url) return
    const a = document.createElement("a")
    a.href = url
    a.download = "barras-receita.png"
    a.click()
  }

  return (
    <div className="rounded-2xl p-4 bg-slate-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-slate-100 font-semibold">Receita Mensal</h3>
        <button onClick={exportPng} className="px-3 py-1 rounded bg-emerald-600 text-white">Exportar PNG</button>
      </div>
      <Bar ref={ref} data={data} options={options} />
    </div>
  )
}