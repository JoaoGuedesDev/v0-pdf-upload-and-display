import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function computeTotalDAS(input: any): number {
  const safeNum = (v: any) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  const t = (input?.tributos || {}) as Record<string, any>
  const explicit = safeNum(input?.valorTotalDAS)
  if (explicit > 0) return explicit
  const totalField = safeNum(t?.Total)
  if (totalField > 0) return totalField
  const sumDecl = [
    t?.IRPJ,
    t?.CSLL,
    t?.COFINS,
    t?.PIS_Pasep,
    t?.INSS_CPP,
    t?.ICMS,
    t?.IPI,
    t?.ISS,
  ].reduce((a, v) => a + safeNum(v), 0)
  if (sumDecl > 0) return sumDecl
  const dbg = input?.debug || {}
  const declarado = dbg?.parcelas?.totais?.declarado || {}
  const totalDeclarado = safeNum(declarado?.total)
  if (totalDeclarado > 0) return totalDeclarado
  const atividades = Array.isArray(dbg?.atividades) ? dbg.atividades : []
  const sumAtv = atividades.reduce((acc: number, a: any) => acc + safeNum(a?.tributos?.total), 0)
  if (sumAtv > 0) return sumAtv
  return 0
}