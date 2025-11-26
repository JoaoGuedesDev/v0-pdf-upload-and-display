"use client"
import { memo, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

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
      <Card className="bg-white border-slate-200" style={{ breakInside: 'avoid' }}>
        <CardHeader className="py-2">
          <CardTitle className="text-slate-800">Análise de Alíquota</CardTitle>
          <CardDescription>Detalhamento por Anexo e Faixa</CardDescription>
        </CardHeader>
        <CardContent className="py-2">
          <div className="grid grid-cols-1 gap-3">
            {detalhe.map((item: any, idx: number) => {
              const anexo = item?.anexo ?? item?.anexo_numero
              const titulo = `Anexo ${anexo} - Serviços`
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
                for (const p of comunicParts) {
                  const mc = matchCanonical(p)
                  if (mc) return mc
                }
                const first = comunicParts[0]
                const d = String(first?.descricao ?? '').trim()
                const a = String(first?.atividade_nome ?? '').trim()
                const base = d ? d : (a ? a : 'Serviços de comunicação')
                const trunc = String(base).split(',')[0].trim()
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
              return (
                <div key={idx} className="border rounded-lg p-3 w-full">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-800">{titulo}</div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded p-2">
                    <div className="text-[11px] text-slate-600 mt-2">{`Faixa ${docPeriodoLabel || ''}`.trim()}</div>
                      {typeof fxO?.faixa !== 'undefined' && (
                        <div className="text-xs text-slate-700">Faixa: {fxO?.faixa}</div>
                      )}
                      <div className="text-xs font-semibold text-slate-900 mt-1">{`RBT12 ${docPeriodoLabel || ''}`.trim()}: {Number.isFinite(rbt12Orig) ? formatCurrency(rbt12Orig) : '-'}</div>
                    </div>
                    <div className="bg-slate-50 rounded p-2">
                    <div className="text-[11px] text-slate-600 mt-2">{`Faixa ${nextPeriodoLabel || ''}`.trim()}</div>
                      {typeof fxA?.faixa !== 'undefined' && (
                        <div className="text-xs text-slate-700">Faixa: {fxA?.faixa}</div>
                      )}
                      <div className="text-xs font-semibold text-slate-900 mt-1">{`RBT12 ${nextPeriodoLabel || ''}`.trim()}: {Number.isFinite(rbt12Atual) ? formatCurrency(rbt12Atual) : '-'}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-[11px]">
                        <thead>
                          <tr className="text-slate-600">
                            <th className="text-left font-medium px-2 py-1">Receita</th>
                            <th className="text-left font-medium px-2 py-1">Atividade</th>
                            <th className="text-left font-medium px-2 py-1">{`Alíquota ${docPeriodoLabel || ''} ajustada`.trim()}</th>
                            <th className="text-left font-medium px-2 py-1">{`Alíquota ${nextPeriodoLabel || ''} ajustada`.trim()}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Linhas separadas para serviços de comunicação: Transporte sem ST e com ST */}
                          {hasComunic && (() => {
                            const partsSem = comunicParts.filter(p => matchCanonical(p) === 'Transporte sem substituição tributária de ICMS')
                            const partsCom = comunicParts.filter(p => matchCanonical(p) === 'Transporte com substituição tributária de ICMS')
                            const sumVals = (arr: any[]) => arr.reduce((acc, p) => acc + Number(p?.valor || 0), 0)
                            const totalSem = sumVals(partsSem)
                            const totalCom = sumVals(partsCom)
                            const firstSem = partsSem[0]
                            const firstCom = partsCom[0]
                            const sumSafe = (...vals: number[]) => {
                              const nums = vals.filter(v => Number.isFinite(v))
                              if (!nums.length) return NaN
                              const s = nums.reduce((a,b)=>a+b,0)
                              return Number(s.toFixed(4))
                            }
                            const rows: { v: number; act: string; aO: number; aA: number }[] = []
                            if (totalSem > 0) {
                              const semIssOrig = round4(firstSem?.aliquota_efetiva_original_sem_iss_percent)
                              const icmsOrig = round4(firstSem?.aliquota_efetiva_original_icms_anexo1_percent)
                              const semIssAtual = round4(firstSem?.aliquota_efetiva_atual_sem_iss_percent)
                              const icmsAtual = round4(firstSem?.aliquota_efetiva_atual_icms_anexo1_percent)
                              rows.push({
                                v: totalSem,
                                act: 'Transporte sem substituição tributária de ICMS',
                                aO: sumSafe(semIssOrig, icmsOrig),
                                aA: sumSafe(semIssAtual, icmsAtual),
                              })
                            }
                            if (totalCom > 0) {
                              const aOrig = round4(firstCom?.aliquota_efetiva_original_sem_iss_percent)
                              const aAtual = round4(firstCom?.aliquota_efetiva_atual_sem_iss_percent)
                              rows.push({
                                v: totalCom,
                                act: 'Transporte com substituição tributária de ICMS',
                                aO: aOrig,
                                aA: aAtual,
                              })
                            }
                            return rows.map((r, i) => (
                              <tr key={`comunic-${i}`} className="border-t">
                                <td className="px-2 py-1 whitespace-nowrap">{formatCurrency(r.v)}</td>
                                <td className="px-2 py-1">{r.act}</td>
                                <td className="px-2 py-1 whitespace-nowrap">{Number.isFinite(r.aO) ? fmtPct4(r.aO) : "-"}</td>
                                <td className="px-2 py-1 whitespace-nowrap">{Number.isFinite(r.aA) ? fmtPct4(r.aA) : "-"}</td>
                              </tr>
                            ))
                          })()}
                          {/* Outras parcelas (exceto serviços de comunicação) */}
                          {otherParts.map((p: any, i: number) => {
                            const tipo = String(p?.tipo_regra || "").toLowerCase()
                            const actName = (() => {
                              const mc = matchCanonical(p)
                              if (mc) return mc
                              const desc = String(p?.descricao ?? '').trim()
                              const nome = String(p?.atividade_nome ?? '').trim()
                              let trunc = String(desc ? desc : (nome ? nome : "-")).split(',')[0].trim()
                              if (tipo === "geral") {
                                const candidates = [
                                  "Prestação de Serviços",
                                  "Revenda de mercadorias",
                                  "Venda de mercadorias industrializadas",
                                ]
                                const norm = (s: any) => String(s || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
                                const src = norm(p?.atividade_nome)
                                for (const c of candidates) {
                                  if (src.includes(norm(c))) { trunc = c; break }
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
                        return rs ? `${trunc} — ${rs}${withIss ? ' ISS' : ''}` : trunc
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
                            return (
                               <tr key={i} className="border-t">
                                 <td className="px-2 py-1 whitespace-nowrap">{formatCurrency(val)}</td>
                                 <td className="px-2 py-1">{actName}</td>
                                 <td className="px-2 py-1 whitespace-nowrap">{Number.isFinite(aOrigAdj) ? fmtPct4(aOrigAdj) : "-"}</td>
                                 <td className="px-2 py-1 whitespace-nowrap">{Number.isFinite(aAtualAdj) ? fmtPct4(aAtualAdj) : "-"}</td>
                               </tr>
                            )
                          })}
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
