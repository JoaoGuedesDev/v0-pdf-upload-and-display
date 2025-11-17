import React, { useEffect, useRef, useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { chartColors } from "@/lib/design"

type TributosObj = {
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

type Item = { name: string; value: number; color?: string }

type Props = {
  tributos?: TributosObj | Item[]
  variant: "screen" | "pdf"
  darkMode?: boolean
  width?: number
  height?: number
  cx?: number | string
  cy?: number | string
  innerRadius?: number
  outerRadius?: number
  showCenter?: boolean
}

const COLORS = chartColors.primary
const MIN_LABEL_GAP = 16
const STROKE_WIDTH = 1.25
const LABEL_COL_OFFSET = 70
const NAME_TO_COLOR: Record<string, string> = {
  "IRPJ": COLORS[0],
  "CSLL": COLORS[1],
  "COFINS": COLORS[2],
  "PIS/PASEP": COLORS[3],
  "INSS/CPP": COLORS[4],
  "ICMS": COLORS[5],
  "IPI": COLORS[6],
  "ISS": COLORS[7],
}

export const toRad = (deg: number) => (deg * Math.PI) / 180
export const radialPoint = (cx: number, cy: number, angleDeg: number, radius: number) => {
  const rad = toRad(angleDeg)
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
}
export const computeTooltipPosition = (
  cx: number,
  cy: number,
  angleDeg: number,
  outerR: number,
  dims: { w: number; h: number }
) => {
  const base = radialPoint(cx, cy, angleDeg, outerR + 40)
  const pad = 12
  const x = Math.max(pad, Math.min(base.x, dims.w - pad))
  const y = Math.max(pad, Math.min(base.y, dims.h - pad))
  return { x, y }
}

function normalize(tributos?: TributosObj | Item[]): Item[] {
  if (!tributos) return []
  if (Array.isArray(tributos)) return tributos
  const t = tributos as TributosObj
  return [
    { name: "IRPJ", value: Number(t?.IRPJ || 0), color: NAME_TO_COLOR["IRPJ"] },
    { name: "CSLL", value: Number(t?.CSLL || 0), color: NAME_TO_COLOR["CSLL"] },
    { name: "COFINS", value: Number(t?.COFINS || 0), color: NAME_TO_COLOR["COFINS"] },
    { name: "PIS/PASEP", value: Number(t?.PIS_Pasep || 0), color: NAME_TO_COLOR["PIS/PASEP"] },
    { name: "INSS/CPP", value: Number(t?.INSS_CPP || 0), color: NAME_TO_COLOR["INSS/CPP"] },
    { name: "ICMS", value: Number(t?.ICMS || 0), color: NAME_TO_COLOR["ICMS"] },
    { name: "IPI", value: Number(t?.IPI || 0), color: NAME_TO_COLOR["IPI"] },
    { name: "ISS", value: Number(t?.ISS || 0), color: NAME_TO_COLOR["ISS"] },
  ].filter((i) => i.value > 0)
}

function fmtBRL(n: number) {
  return `R$ ${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function DonutTributos({ tributos, variant, darkMode = false, width = 360, height = 360, cx = 360, cy = 180, innerRadius = 100, outerRadius = 140, showCenter = false }: Props) {
  const data = normalize(tributos)
  if (!data.length) return <div style={{ height }} />
  const total = data.reduce((s, i) => s + i.value, 0)
  let lastYLeft = -Infinity
  let lastYRight = -Infinity

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [ttPos, setTtPos] = useState<{ x: number; y: number } | undefined>(undefined)

  useEffect(() => {
    if (variant !== "screen") return
    const el = wrapRef.current
    const update = () => {
      if (!el) return
      const r = el.getBoundingClientRect()
      setDims({ w: r.width, h: r.height })
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [variant])

  const renderArrowLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius: or, value, index, payload, fill } = props || {}
    const cxNum = Number(cx)
    const cyNum = Number(cy)
    const ang = Number(midAngle)
    const o = Number(or ?? outerRadius ?? 0)
    if (!Number.isFinite(cxNum) || !Number.isFinite(cyNum) || !Number.isFinite(ang) || !Number.isFinite(o)) return null
    const slicePct = total > 0 ? Number(value) / total : 0
    const rad = (ang * Math.PI) / 180
    const bx = cxNum + o * Math.cos(rad)
    const by = cyNum + o * Math.sin(rad)
    const mx = bx + 16 * Math.cos(rad)
    const my = by + 16 * Math.sin(rad)
    const isRight = Math.cos(rad) >= 0
    const canvasDims = variant === "screen" ? dims : { w: width || 360, h: height || 360 }
    const labelBaseX = isRight ? cxNum + o + LABEL_COL_OFFSET : cxNum - o - LABEL_COL_OFFSET
    let labelY = Math.max(24, Math.min(by, (canvasDims.h || height || 360) - 24))
    if (isRight) {
      labelY = Math.max(labelY, lastYRight === -Infinity ? labelY : lastYRight + MIN_LABEL_GAP)
      lastYRight = labelY
    } else {
      labelY = Math.max(labelY, lastYLeft === -Infinity ? labelY : lastYLeft + MIN_LABEL_GAP)
      lastYLeft = labelY
    }
    const labelX = isRight ? Math.min((canvasDims.w || width || 360) - 16, labelBaseX) : Math.max(16, labelBaseX)
    const anchor = isRight ? "start" : "end"
    const color = (fill ?? payload?.fill ?? payload?.color ?? COLORS[(Number(index) || 0) % COLORS.length])
    const textColor = darkMode ? "#1e293b" : "#1e293b"
    const dx = isRight ? 8 : -8
    if (slicePct <= 0) return null
    return (
      <g>
        <line x1={bx} y1={by} x2={mx} y2={my} stroke={color} strokeWidth={STROKE_WIDTH} />
        <line x1={mx} y1={my} x2={labelX - dx} y2={labelY} stroke={color} strokeWidth={STROKE_WIDTH} />
        <text x={labelX} y={labelY} dx={0} textAnchor={anchor as any} fill={textColor} style={{ fontSize: 10, fontWeight: 700 }}>
          {fmtBRL(Number(value))}
        </text>
      </g>
    )
  }

  if (variant === "pdf") {
    return (
      <div style={{ width, height }} className="relative overflow-visible">
        <PieChart width={width} height={height} margin={{ top: 60, bottom: 24 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx={cx}
            cy={cy}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            isAnimationActive={false}
            stroke="none"
            strokeWidth={0}
            label={(p: any) => {
              const v = Number(p?.value || 0)
              const pct = total > 0 ? ((v / total) * 100).toFixed(2) : "0.00"
              const name = String(p?.name || p?.payload?.name || "")
              const x = Number(p?.x ?? 0)
              const y = Number(p?.y ?? 0)
              const anchor: "start" | "end" | "middle" | "inherit" =
                p?.textAnchor === "end" || p?.textAnchor === "middle" || p?.textAnchor === "inherit"
                  ? (p.textAnchor as any)
                  : "start"
              return <text x={x} y={y} textAnchor={anchor} style={{ fontSize: 10 }}>{`${name}: ${fmtBRL(v)} (${pct}%)`}</text>
            }}
            labelLine={(p: any) => {
              const pts = p?.points || []
              const a = pts[0] || { x: 0, y: 0 }
              const b = pts[1] || { x: 0, y: 0 }
              const color = p?.payload?.fill || p?.payload?.color || COLORS[(Number(p?.index) || 0) % COLORS.length]
              return <path d={`M${a.x},${a.y}L${b.x},${b.y}`} stroke={color} fill="none" strokeWidth={1} />
            }}
          >
            {data.map((e, i) => (
              <Cell key={`c-${i}`} fill={e.color || COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          {showCenter && (
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={10}>
              <tspan fill={darkMode ? "#cbd5e1" : "#334155"} x={cx} dy={-4}>Total Tributos</tspan>
              <tspan fill={darkMode ? "#f1f5f9" : "#111827"} x={cx} dy={13} fontWeight={700}>{fmtBRL(total)}</tspan>
            </text>
          )}
        </PieChart>
        
      </div>
    )
  }

  return (
    <div ref={wrapRef} className={`w-full ${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg p-4 relative overflow-visible`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 65, bottom: 60 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={(outerRadius || 60) - 40}
            outerRadius={outerRadius || 80}
            dataKey="value"
            nameKey="name"
            isAnimationActive={false}
            label={(p: any) => {
              const v = Number(p?.value || 0)
              const pct = total > 0 ? ((v / total) * 100).toFixed(2) : "0.00"
              const name = String(p?.name || p?.payload?.name || "")
              const x = Number(p?.x ?? 0)
              const y = Number(p?.y ?? 0)
              const anchor: "start" | "end" | "middle" | "inherit" =
                p?.textAnchor === "end" || p?.textAnchor === "middle" || p?.textAnchor === "inherit"
                  ? (p.textAnchor as any)
                  : "start"
              return <text x={x} y={y} textAnchor={anchor} style={{ fontSize: 11 }}>{`${name}: ${fmtBRL(v)} (${pct}%)`}</text>
            }}
            labelLine={(p: any) => {
              const pts = p?.points || []
              const a = pts[0] || { x: 0, y: 0 }
              const b = pts[1] || { x: 0, y: 0 }
              const color = p?.payload?.fill || p?.payload?.color || COLORS[(Number(p?.index) || 0) % COLORS.length]
              return <path d={`M${a.x},${a.y}L${b.x},${b.y}`} stroke={color} fill="none" strokeWidth={1} />
            }}
            onMouseMove={(d: any) => {
              const info = d || {}
              const cxN = Number(info?.cx)
              const cyN = Number(info?.cy)
              const mid = Number(info?.midAngle)
              const orN = Number(info?.outerRadius || (outerRadius || 80))
              if (Number.isFinite(cxN) && Number.isFinite(cyN) && Number.isFinite(mid) && Number.isFinite(orN)) {
                const pos = computeTooltipPosition(cxN, cyN, mid, orN, dims.w && dims.h ? dims : { w: width || 360, h: height || 360 })
                setTtPos(pos)
              } else {
                setTtPos(undefined)
              }
            }}
            onMouseLeave={() => setTtPos(undefined)}
          >
            {data.map((e, i) => (
              <Cell key={`c-${i}`} fill={e.color || COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          {showCenter && (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize={10}>
              <tspan fill={darkMode ? "#cbd5e1" : "#334155"} x="50%" dy={-4}>Total Tributos</tspan>
              <tspan fill={darkMode ? "#f1f5f9" : "#111827"} x="50%" dy={13} fontWeight={700}>{fmtBRL(total)}</tspan>
            </text>
          )}
          <Tooltip cursor={false} position={ttPos} allowEscapeViewBox={{ x: true, y: true }} offset={8} formatter={(v: number, n: string) => [fmtBRL(Number(v)), String(n)]} labelFormatter={(l: string | number) => `Tributo: ${String(l)}`} contentStyle={{ backgroundColor: darkMode ? "#0f172a" : "#ffffff", border: `1px solid ${darkMode ? "#334155" : "#e2e8f0"}`, borderRadius: 8, color: darkMode ? "#e2e8f0" : "#111827", fontSize: 10 }} itemStyle={{ color: darkMode ? "#e2e8f0" : "#111827" }} />
        </PieChart>
      </ResponsiveContainer>
      
    </div>
  )
}