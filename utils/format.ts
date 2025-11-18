export function fmtBRL(value: number): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return ""
  if (n === 0) return ""
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function fmtPct(value: number, total: number): string {
  const v = Number(value)
  const t = Number(total)
  if (!Number.isFinite(v) || !Number.isFinite(t) || t <= 0) return "—"
  const p = (v / t) * 100
  const digits = p < 1 ? 2 : p < 10 ? 1 : 0
  return `${p.toFixed(digits)}%`
}

// Pequeno auxílio para labels compactos em eixos, se necessário
export function fmtBRLCompact(value: number): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return "R$ 0"
  // Usa notação compacta (K, M) mantendo estilo BR
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n)
}