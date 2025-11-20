import React from "react"
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Cell, LabelList } from "recharts"

export default function ReceitaMensalCard({ graficos, height = 280 }: { graficos: any; height?: number }) {
  const base = (graficos?.receitaLine || graficos?.receitaMensal) || { labels: [], values: [] }
  const labels: string[] = base.labels || []
  const totals: number[] = (base.values || []).map((v: any) => Number(v) || 0)
  const externoSerie = graficos?.receitaLineExterno || null
  const extMap: Record<string, number> = {}
  if (externoSerie && Array.isArray(externoSerie.labels) && Array.isArray(externoSerie.values)) {
    externoSerie.labels.forEach((l: string, i: number) => { extMap[l] = Number(externoSerie.values[i]) || 0 })
  }

  const chartData = labels.map((l) => {
    const total = totals[labels.indexOf(l)] || 0
    const externoRaw = Math.min(extMap[l] || 0, total)
    const internoRaw = Math.max(total - externoRaw, 0)
    const maior = Math.max(internoRaw, externoRaw)
    const menor = Math.min(internoRaw, externoRaw)
    const maiorTipo = internoRaw >= externoRaw ? "interno" : "externo"
    return { name: l, interno: internoRaw, externo: externoRaw, maior, menor, maiorTipo }
  })

  const maxVal = Math.max(...chartData.map((d) => Math.max(d.interno, d.externo)), 0)
  const topDomain = Math.max(0, Math.ceil(maxVal + 50000))
  const yTicks = [0, topDomain * 0.2, topDomain * 0.4, topDomain * 0.6, topDomain * 0.8, topDomain]
  const IN_COLOR = "#3b82f6"
  const EX_COLOR = "#7c3aed"
  const labelColor = "#334155"
  const formatAxisShort = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${n.toFixed(0)}`
  const formatNumberBR = (n: number) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const isZeroish = (n: number) => Math.abs(Number(n) || 0) < 0.005

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    const p = payload[0]?.payload
    if (!p) return null
    const interno = Number(p.interno) || 0
    const externo = Number(p.externo) || 0
    const show = (v: number) => v > 0.01
    return (
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: 8, color: "#334155" }}>
        <div style={{ marginBottom: 6, fontSize: 11 }}>{String(label)}</div>
        {show(interno) && (<div style={{ fontSize: 11 }}>Interno: <span style={{ color: IN_COLOR }}>{formatNumberBR(interno)}</span></div>)}
        {show(externo) && (<div style={{ fontSize: 11 }}>Externo: <span style={{ color: EX_COLOR }}>{formatNumberBR(externo)}</span></div>)}
      </div>
    )
  }

  const renderLabelMaior = (props: any) => {
    const { value, x, y, width } = props || {}
    const val = Number(value) || 0
    if (isZeroish(val)) return null
    const cx = (Number(x) || 0) + (Number(width) || 0) / 2
    return (<text x={cx} y={y} dy={-10} textAnchor="middle" fill={labelColor} fontSize={11}>{formatNumberBR(val)}</text>)
  }
  const renderLabelMenor = (props: any) => {
    const { value, x, y, width } = props || {}
    const val = Number(value) || 0
    if (isZeroish(val)) return null
    const cx = (Number(x) || 0) + (Number(width) || 0) / 2
    return (<text x={cx} y={y} dy={-24} textAnchor="middle" fill={labelColor} fontSize={11}>{formatNumberBR(val)}</text>)
  }

  return (
    <div className={`rounded-xl bg-white border border-slate-200 p-4`}>
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }} barCategoryGap="30%" barGap={-18}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: "#334155", fontSize: 9 }} tickMargin={18} />
            <YAxis tick={{ fill: "#334155", fontSize: 9 }} tickFormatter={formatAxisShort} ticks={yTicks} domain={[0, topDomain]} />
            <Tooltip content={CustomTooltip as any} />
            <Legend align="center" verticalAlign="bottom" wrapperStyle={{ bottom: -10 }} content={() => (
              <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 9, justifyContent: "center", width: "100%" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: IN_COLOR, borderRadius: 2 }} /> Mercado Interno</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, background: EX_COLOR, borderRadius: 2 }} /> Mercado Externo</span>
              </div>
            )} />
            <Bar dataKey="maior" name="Maior" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {chartData.map((entry: any, idx: number) => (<Cell key={`maior-${idx}`} fill={entry.maiorTipo === "interno" ? IN_COLOR : EX_COLOR} />))}
              <LabelList dataKey="maior" content={renderLabelMaior as any} />
            </Bar>
            <Bar dataKey="menor" name="Menor" radius={[6, 6, 0, 0]} stroke={"rgba(51,65,85,0.35)"} strokeWidth={1} isAnimationActive={false}>
              {chartData.map((entry: any, idx: number) => (<Cell key={`menor-${idx}`} fill={entry.maiorTipo === "interno" ? EX_COLOR : IN_COLOR} />))}
              <LabelList dataKey="menor" content={renderLabelMenor as any} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}