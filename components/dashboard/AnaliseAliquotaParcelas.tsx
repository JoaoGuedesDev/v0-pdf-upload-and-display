"use client"
import { memo, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { useTheme } from "next-themes"

interface Props {
  dadosPgdas: any
  className?: string
}

const parsePercent = (v: any): number => {
  if (typeof v === "number") return v
  const s = String(v ?? "").trim()
  if (!s) return NaN
  let cleaned = s.replace("%", "").trim()
  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".")
  }
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : NaN
}

const round4 = (n: any): number => {
  const x = parsePercent(n)
  if (!Number.isFinite(x)) return NaN
  return Number(Number(x).toFixed(4))
}

const fmtPct4 = (n: any): string => {
  const x = parsePercent(n)
  if (!Number.isFinite(x)) return "-"
  return `${x.toFixed(4).replace(".", ",")}%`
}

export const AnaliseAliquotaParcelas = memo(function AnaliseAliquotaParcelas({ dadosPgdas, className = "" }: Props) {
  const analise = useMemo(() => (dadosPgdas?.analise_aliquota || {}), [dadosPgdas])
  const detalhe: any[] = useMemo(() => (Array.isArray(analise?.detalhe) ? analise.detalhe : []), [analise])
  const periodoApuracao: string = useMemo(() => {
    const p = dadosPgdas?.identificacao?.periodoApuracao || dadosPgdas?.periodoApuracao || ""
    return String(p || "").trim()
  }, [dadosPgdas])

  const docPeriodoLabel = useMemo(() => {
    const s = periodoApuracao
    const mmYYYY = s.match(/(\d{2})\/(\d{4})/)
    if (mmYYYY) return `${mmYYYY[1]}/${mmYYYY[2]}`
    const yDashM = s.match(/(\d{4})-(\d{1,2})/)
    if (yDashM) { const yy = Number(yDashM[1]); const mm = String(Number(yDashM[2])).padStart(2, '0'); return `${mm}/${yy}` }
    const meses = { jan:1, fev:2, mar:3, abr:4, mai:5, jun:6, jul:7, ago:8, set:9, out:10, nov:11, dez:12 }
    const monYear = s.match(/([A-Za-zÀ-ÿ]{3,})\s*\/?\s*(\d{4})/)
    if (monYear) { const mm = meses[monYear[1].toLowerCase().slice(0,3) as keyof typeof meses] || 0; const yy = Number(monYear[2]); if (mm>0) return `${String(mm).padStart(2,'0')}/${yy}` }
    return ""
  }, [periodoApuracao])

  const nextPeriodoLabel = useMemo(() => {
    const s = docPeriodoLabel
    const mmYYYY = s.match(/(\d{2})\/(\d{4})/)
    if (mmYYYY) {
      let mm = Number(mmYYYY[1])
      let yy = Number(mmYYYY[2])
      mm += 1
      if (mm > 12) { mm = 1; yy += 1 }
      return `${String(mm).padStart(2,'0')}/${yy}`
    }
    return ""
  }, [docPeriodoLabel])

  if (!detalhe.length) return null

  return (
    <div className={`grid gap-3 ${className}`}>
      <Card className="bg-card border-border" style={{ breakInside: 'avoid' }}>
        <CardHeader className="py-2">
          <CardTitle className="text-card-foreground">Análise de Alíquota</CardTitle>
          <CardDescription className="text-muted-foreground">Detalhamento por Anexo e Faixa</CardDescription>
        </CardHeader>
        <CardContent className="py-2">
          <div className="grid grid-cols-1 gap-3">
            {detalhe.map((item: any, idx: number) => {
              const anexo = item?.anexo ?? item?.anexo_numero
              const titulo = `Anexo ${anexo}`
              const fxO = item?.faixa_original
              const fxA = item?.faixa_atual
              const rbt12Orig = Number(item?.rbt12_original ?? item?.rbt12 ?? NaN)
              const rbt12Atual = Number(item?.rbt12_atual ?? NaN)
              const parcelas: any[] = Array.isArray(item?.parcelas_ajuste) ? item.parcelas_ajuste : []
              const hasComunic = parcelas.some(p => String(p?.tipo_regra || "").toLowerCase() === "servicos_comunicacao")
              const comunicParts = parcelas.filter(p => String(p?.tipo_regra || "").toLowerCase() === "servicos_comunicacao")
              const otherParts = parcelas.filter(p => String(p?.tipo_regra || "").toLowerCase() !== "servicos_comunicacao")
              const norm = (s: any) => String(s || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
              const canonicalActivities = [
                'Comunicação sem substituição tributária de ICMS',
                'Comunicação com substituição tributária de ICMS',
                'Transporte sem substituição tributária de ICMS',
                'Transporte com substituição tributária de ICMS',
              ]
              const matchCanonical = (p: any): string | null => {
                const targets = [p?.nome, p?.atividade_nome, p?.descricao]
                for (const t of targets) {
                  const n = norm(t)
                  if (!n) continue
                  for (const canon of canonicalActivities) {
                    if (n.includes(norm(canon))) return canon
                  }
                }
                return null
              }
              const atividadeFromNome = (() => {
                const simplifyRevenda = (s: string): string => {
                  const n = norm(s)
                  const isExterior = n.includes(norm('revenda de mercadorias para o exterior'))
                  if (isExterior) return 'Revenda de Mercadorias para o exterior'
                  if (n.includes('revenda de mercadorias')) return 'Revenda de Mercadorias'
                  return s
                }
                for (const p of comunicParts) {
                  const mc = matchCanonical(p)
                  if (mc) return mc
                }
                const alvo = 'Revenda de mercadorias para o exterior'
                const hasAlvo = [...comunicParts, ...otherParts].some((p) => {
                  const t = [p?.nome, p?.atividade_nome, p?.descricao].filter(Boolean).map(String).join(' ')
                  return norm(t).includes(norm(alvo))
                })
                if (hasAlvo) return alvo
                const first = comunicParts[0]
                const d = String(first?.descricao ?? '').trim()
                const a = String(first?.atividade_nome ?? '').trim()
                const base = d ? d : (a ? a : 'Serviços de comunicação')
                const trunc = simplifyRevenda(String(base).split(',')[0].trim())
                const text = [first?.nome, first?.atividade_nome, first?.descricao].filter(Boolean).map(String).join(' ')
                const n = norm(text)
                const rs = (() => {
                  if (n.includes('sem retencao') || n.includes('sem reten')) return 'sem retenção'
                  if (n.includes('com retencao') || n.includes('com reten') || n.includes('substituicao tributaria de iss')) return 'com retenção'
                  return ''
                })()
                const withIss = trunc.includes('Prestação de Serviços') && rs
                return rs ? `${trunc} — ${rs}${withIss ? ' ISS' : ''}` : trunc
              })()
              const computeAct = (p: any): string => {
                const tipo = String(p?.tipo_regra || "").toLowerCase()
                const mc = matchCanonical(p)
                if (mc) return mc
                const desc = String(p?.descricao ?? '').trim()
                const nome = String(p?.atividade_nome ?? '').trim()
                const simplifyRevenda = (s: string): string => {
                  const n = norm(s)
                  const isExterior = n.includes(norm('revenda de mercadorias para o exterior'))
                  if (isExterior) return 'Revenda de mercadorias para o exterior'
                  if (n.includes('revenda de mercadorias')) return 'Revenda de mercadorias'
                  return s
                }
                let trunc = simplifyRevenda(String(desc ? desc : (nome ? nome : "-")).split(',')[0].trim())
                if (tipo === "geral") {
                  const candidates = [
                    "Prestação de Serviços",
                    "Revenda de mercadorias",
                    "Venda de mercadorias industrializadas",
                    "Revenda de mercadorias para o exterior",
                  ]
                  const norm2 = (s: any) => String(s || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
                  const src = norm2(p?.atividade_nome)
                  for (const c of candidates) {
                    if (src.includes(norm2(c))) { trunc = c; break }
                  }
                }
                const text = [p?.nome, p?.atividade_nome, p?.descricao].filter(Boolean).map(String).join(' ')
                const n2 = norm(text)
                const rs2 = (() => {
                  if (n2.includes('sem retencao') || n2.includes('sem reten')) return 'sem retenção'
                  if (n2.includes('com retencao') || n2.includes('com reten') || n2.includes('substituicao tributaria de iss')) return 'com retenção'
                  return ''
                })()
                const withIss2 = trunc.includes('Prestação de Serviços') && rs2
                return rs2 ? `${trunc} — ${rs2}${withIss2 ? ' ISS' : ''}` : trunc
              }
              const headerActivity = (() => {
                const cand = [
                  'Revenda de Mercadorias para o exterior',
                  'Revenda de Mercadorias',
                  'Venda de mercadorias industrializadas',
                  'Prestação de Serviços',
                ]
                const score = new Map<string, number>()
                for (const p of otherParts) {
                  const text = [p?.atividade_nome, p?.descricao, p?.nome].filter(Boolean).map(String).join(' ')
                  const n = norm(text)
                  const v = Number(p?.valor || 0)
                  for (const c of cand) {
                    if (n.includes(norm(c))) score.set(c, (score.get(c) || 0) + v)
                  }
                }
                const pick = (() => {
                  const order = [
                    'Revenda de Mercadorias para o exterior',
                    'Revenda de Mercadorias',
                    'Venda de mercadorias industrializadas',
                    'Prestação de Serviços',
                  ]
                  for (const c of order) {
                    const s = score.get(c)
                    if ((s || 0) > 0) return c
                  }
                  return ''
                })()
                if (pick) return pick
                if (hasComunic) {
                  const sums: Record<string, number> = {}
                  for (const p of comunicParts) {
                    const mc = matchCanonical(p)
                    const v = Number(p?.valor || 0)
                    if (mc) sums[mc] = (sums[mc] || 0) + v
                  }
                  const keys = Object.keys(sums)
                  if (keys.length) {
                    keys.sort((a,b)=> (sums[b]||0) - (sums[a]||0))
                    return keys[0]
                  }
                }
                return atividadeFromNome
              })()
              return (
                <div key={idx} className="border border-border rounded-lg p-3 w-full">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-card-foreground">{`${titulo} - ${headerActivity}`}</div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 rounded p-2">
                    <div className="text-[11px] text-muted-foreground mt-2">{`Faixa ${docPeriodoLabel || ''}`.trim()}</div>
                      {typeof fxO?.faixa !== 'undefined' && (
                        <div className="text-xs text-card-foreground">Faixa: {fxO?.faixa}</div>
                      )}
                      <div className="text-xs font-semibold text-card-foreground mt-1">{`RBT12 ${docPeriodoLabel || ''}`.trim()}: {Number.isFinite(rbt12Orig) ? formatCurrency(rbt12Orig) : '-'}</div>
                    </div>
                    <div className="bg-[#007AFF]/5 dark:bg-[#007AFF]/10 rounded p-2">
                    <div className="text-[11px] text-muted-foreground mt-2">{`Faixa ${nextPeriodoLabel || ''}`.trim()}</div>
                      {typeof fxA?.faixa !== 'undefined' && (
                        <div className="text-xs text-card-foreground">Faixa: {fxA?.faixa}</div>
                      )}
                      <div className="text-xs font-semibold text-card-foreground mt-1">{`RBT12 ${nextPeriodoLabel || ''}`.trim()}: {Number.isFinite(rbt12Atual) ? formatCurrency(rbt12Atual) : '-'}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-[11px]">
                        <thead>
                          <tr className="text-muted-foreground border-b border-border">
                            <th className="text-left font-medium px-2 py-1">Receita</th>
                            <th className="text-left font-medium px-2 py-1">Atividade</th>
                            <th className="text-left font-medium px-2 py-1">{`Alíquota ${docPeriodoLabel || ''} ajustada`.trim()}</th>
                            <th className="text-left font-medium px-2 py-1">{`Alíquota ${nextPeriodoLabel || ''} ajustada`.trim()}</th>
                          </tr>
                        </thead>
                        <tbody className="text-card-foreground">
                          {/* Linhas separadas para serviços de comunicação: Comunicação e Transporte (sem ST e com ST) */}
                          {hasComunic && (() => {
                            const transpSem = comunicParts.filter(p => matchCanonical(p) === 'Transporte sem substituição tributária de ICMS')
                            const transpCom = comunicParts.filter(p => matchCanonical(p) === 'Transporte com substituição tributária de ICMS')
                            const comunSem = comunicParts.filter(p => matchCanonical(p) === 'Comunicação sem substituição tributária de ICMS')
                            const comunCom = comunicParts.filter(p => matchCanonical(p) === 'Comunicação com substituição tributária de ICMS')
                            const sumVals = (arr: any[]) => arr.reduce((acc, p) => acc + Number(p?.valor || 0), 0)
                            const totalTS = sumVals(transpSem)
                            const totalTC = sumVals(transpCom)
                            const totalCS = sumVals(comunSem)
                            const totalCC = sumVals(comunCom)
                            const firstTS = transpSem[0]
                            const firstTC = transpCom[0]
                            const firstCS = comunSem[0]
                            const firstCC = comunCom[0]
                            const sumSafe = (...vals: number[]) => {
                              const nums = vals.filter(v => Number.isFinite(v))
                              if (!nums.length) return NaN
                              const s = nums.reduce((a,b)=>a+b,0)
                              return Number(s.toFixed(4))
                            }
                            const rows: { v: number; act: string; aO: number; aA: number }[] = []
                            if (totalCS > 0) {
                              const semIssOrig = round4(firstCS?.aliquota_efetiva_original_sem_iss_percent)
                              const icmsOrig = round4(firstCS?.aliquota_efetiva_original_icms_anexo1_percent)
                              const semIssAtual = round4(firstCS?.aliquota_efetiva_atual_sem_iss_percent)
                              const icmsAtual = round4(firstCS?.aliquota_efetiva_atual_icms_anexo1_percent)
                              rows.push({
                                v: totalCS,
                                act: String(firstCS?.descricao ?? 'Comunicação sem substituição tributária de ICMS'),
                                aO: sumSafe(semIssOrig, icmsOrig),
                                aA: sumSafe(semIssAtual, icmsAtual),
                              })
                            }
                            if (totalCC > 0) {
                              const aOrig = round4(firstCC?.aliquota_efetiva_original_sem_iss_percent)
                              const aAtual = round4(firstCC?.aliquota_efetiva_atual_sem_iss_percent)
                              rows.push({
                                v: totalCC,
                                act: String(firstCC?.descricao ?? 'Comunicação com substituição tributária de ICMS'),
                                aO: aOrig,
                                aA: aAtual,
                              })
                            }
                            if (totalTS > 0) {
                              const semIssOrig = round4(firstTS?.aliquota_efetiva_original_sem_iss_percent)
                              const icmsOrig = round4(firstTS?.aliquota_efetiva_original_icms_anexo1_percent)
                              const semIssAtual = round4(firstTS?.aliquota_efetiva_atual_sem_iss_percent)
                              const icmsAtual = round4(firstTS?.aliquota_efetiva_atual_icms_anexo1_percent)
                              rows.push({
                                v: totalTS,
                                act: String(firstTS?.descricao ?? 'Transporte sem substituição tributária de ICMS'),
                                aO: sumSafe(semIssOrig, icmsOrig),
                                aA: sumSafe(semIssAtual, icmsAtual),
                              })
                            }
                            if (totalTC > 0) {
                              const aOrig = round4(firstTC?.aliquota_efetiva_original_sem_iss_percent)
                              const aAtual = round4(firstTC?.aliquota_efetiva_atual_sem_iss_percent)
                              rows.push({
                                v: totalTC,
                                act: String(firstTC?.descricao ?? 'Transporte com substituição tributária de ICMS'),
                                aO: aOrig,
                                aA: aAtual,
                              })
                            }
                            const grouped = (() => {
                              const m = new Map<string, { v: number; act: string; aO: number; aA: number }>()
                              for (const r of rows) {
                                const k = `${r.act}|${Number.isFinite(r.aO) ? r.aO.toFixed(4) : 'null'}|${Number.isFinite(r.aA) ? r.aA.toFixed(4) : 'null'}`
                                const prev = m.get(k)
                                if (prev) prev.v += r.v
                                else m.set(k, { ...r })
                              }
                              return Array.from(m.values())
                            })()
                            return grouped.map((r, i) => {
                              return (
                                <tr key={`comunic-${i}`} className="border-t border-border">
                                  <td className="px-2 py-1 whitespace-nowrap">{formatCurrency(r.v)}</td>
                                  <td className="px-2 py-1">{r.act}</td>
                                  <td className="px-2 py-1 whitespace-nowrap">{Number.isFinite(r.aO) ? fmtPct4(r.aO) : "-"}</td>
                                  <td className="px-2 py-1 whitespace-nowrap">{Number.isFinite(r.aA) ? fmtPct4(r.aA) : "-"}</td>
                                </tr>
                              )
                            })
                          })()}
                          {/* Outras parcelas (exceto serviços de comunicação) */}
                          {(() => {
                            const rows: { v: number; act: string; aO: number; aA: number }[] = []
                            for (const p of otherParts) {
                              const tipo = String(p?.tipo_regra || "").toLowerCase()
                              const actName = (() => {
                                const desc = String(p?.descricao ?? '').trim()
                                if (desc) return desc
                                const mc = matchCanonical(p)
                                if (mc) return mc
                                
                                const nome = String(p?.atividade_nome ?? '').trim()
                                let trunc = String(desc ? desc : (nome ? nome : "-")).split(',')[0].trim()
                                if (tipo === "geral") {
                                  const candidates = [
                                    "Prestação de Serviços",
                                    "Revenda de mercadorias",
                                    "Venda de mercadorias industrializadas",
                                    "Revenda de mercadorias para o exterior",
                                  ]
                                  const norm2 = (s: any) => String(s || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
                                  const src = norm2(p?.atividade_nome)
                                  for (const c of candidates) {
                                    if (src.includes(norm2(c))) { trunc = c; break }
                                  }
                                }
                                const text = [p?.nome, p?.atividade_nome, p?.descricao].filter(Boolean).map(String).join(' ')
                                const n = norm(text)
                                const rs = (() => {
                                  if (n.includes('sem retencao') || n.includes('sem reten')) return 'sem retenção'
                                  if (n.includes('com retencao') || n.includes('com reten') || n.includes('substituicao tributaria de iss')) return 'com retenção'
                                  return ''
                                })()
                                const withIss = trunc.includes('Prestação de Serviços') && rs
                                let base = rs ? `${trunc} — ${rs}${withIss ? ' ISS' : ''}` : trunc
                                const isRevenda = base.includes('Revenda de mercadorias') || base.includes('Venda de mercadorias industrializadas') || base.includes('Revenda de mercadorias para o exterior')
                                if (isRevenda) {
                                  const descText = String(p?.descricao ?? '').trim()
                                  const nd = norm(descText)
                                  const extras: string[] = []
                                  if (nd.includes('substituicao tributaria de icms')) extras.push('Substituição tributária de: ICMS.')
                                  if (nd.includes('monofasica') || nd.includes('monofásica')) {
                                    const tribs = [nd.includes('cofins') ? 'COFINS' : null, nd.includes('pis') ? 'PIS' : null].filter(Boolean).join(', ')
                                    if (tribs) extras.push(`Tributação monofásica de: ${tribs}.`)
                                  }
                                  if (extras.length) base = `${extras.join(' ')} ${base}`
                                }
                                return base
                              })()
                              const val = Number(p?.valor || 0)
                              let aOrigAdj = round4(p?.aliquota_efetiva_original_ajustada_percent)
                              let aAtualAdj = round4(p?.aliquota_efetiva_atual_ajustada_percent)
                              const canonical = matchCanonical(p)
                              if (canonical === 'Transporte com substituição tributária de ICMS') {
                                aOrigAdj = round4(p?.aliquota_efetiva_original_sem_iss_percent)
                                aAtualAdj = round4(p?.aliquota_efetiva_atual_sem_iss_percent)
                              }
                              if (actName.includes('Prestação de Serviços') && actName.includes('com retenção')) {
                                const o = round4(p?.aliquota_efetiva_original_sem_iss_percent)
                                const a = round4(p?.aliquota_efetiva_atual_sem_iss_percent)
                                if (Number.isFinite(o)) aOrigAdj = o
                                if (Number.isFinite(a)) aAtualAdj = a
                              }
                              rows.push({ v: val, act: actName, aO: aOrigAdj, aA: aAtualAdj })
                            }
                            const grouped = (() => {
                              const m = new Map<string, { v: number; act: string; aO: number; aA: number }>()
                              for (const r of rows) {
                                const k = `${r.act}|${Number.isFinite(r.aO) ? r.aO.toFixed(4) : 'null'}|${Number.isFinite(r.aA) ? r.aA.toFixed(4) : 'null'}`
                                const prev = m.get(k)
                                if (prev) prev.v += r.v
                                else m.set(k, { ...r })
                              }
                              return Array.from(m.values())
                            })()
                            return grouped.map((r, i) => {
                              return (
                                <tr key={`other-${i}`} className="border-t border-border">
                                  <td className="px-2 py-1 whitespace-nowrap">{formatCurrency(r.v)}</td>
                                  <td className="px-2 py-1">{r.act}</td>
                                  <td className="px-2 py-1 whitespace-nowrap">{Number.isFinite(r.aO) ? fmtPct4(r.aO) : "-"}</td>
                                  <td className="px-2 py-1 whitespace-nowrap">{Number.isFinite(r.aA) ? fmtPct4(r.aA) : "-"}</td>
                                </tr>
                              )
                            })
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

export default AnaliseAliquotaParcelas
