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
              const aliqOrig = round4(item?.aliquota_efetiva_original_percent)
              const aliqAtual = round4(item?.aliquota_efetiva_atual_percent)
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
              const atividadeFromNome = (() => {
                for (const p of comunicParts) {
                  const n = norm(p?.atividade_nome)
                  for (const canon of canonicalActivities) {
                    if (n.includes(norm(canon))) return canon
                  }
                }
                const first = comunicParts[0]
                return (first?.descricao ?? first?.atividade_nome ?? 'Serviços de comunicação')
              })()
              return (
                <div key={idx} className="border rounded-lg p-3 w-full">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-800">{titulo}</div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 rounded p-2">
                    <div className="text-[11px] text-slate-600 mt-2">Faixa original</div>
                      {typeof fxO?.faixa !== 'undefined' && (
                        <div className="text-xs text-slate-700">Faixa: {fxO?.faixa}</div>
                      )}
                      <div className="text-xs font-semibold text-slate-900 mt-1">Alíquota efetiva: {fmtPct4(aliqOrig)}</div>
                    </div>
                    <div className="bg-slate-50 rounded p-2">
                    <div className="text-[11px] text-slate-600 mt-2">Faixa atual</div>
                      {typeof fxA?.faixa !== 'undefined' && (
                        <div className="text-xs text-slate-700">Faixa: {fxA?.faixa}</div>
                      )}
                      <div className="text-xs font-semibold text-slate-900 mt-1">Alíquota efetiva: {fmtPct4(aliqAtual)}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-slate-700 mb-2">Ajustes por Parcelas (ST / Monofásico / Serviços de comunicação)</div>
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
                          {/* Linha resumo para serviços de comunicação */}
                          {hasComunic && (() => {
                            const first = comunicParts[0]
                            const totalVal = comunicParts.reduce((acc, p) => acc + Number(p?.valor || 0), 0)
                            const tipo = 'servicos_comunicacao'
                            const badgeClass = "bg-purple-600 text-white"
                            const badgeText = "Serviços de comunicação"
                            const aOrig = round4(first?.aliquota_efetiva_original_percent)
                            const aAtual = round4(first?.aliquota_efetiva_atual_percent)
                            const semIssOrig = round4(first?.aliquota_efetiva_original_sem_iss_percent)
                            const icmsOrig = round4(first?.aliquota_efetiva_original_icms_anexo1_percent)
                            const semIssAtual = round4(first?.aliquota_efetiva_atual_sem_iss_percent)
                            const icmsAtual = round4(first?.aliquota_efetiva_atual_icms_anexo1_percent)
                            const sumSafe = (...vals: number[]) => {
                              const nums = vals.filter(v => Number.isFinite(v))
                              if (!nums.length) return NaN
                              const s = nums.reduce((a,b)=>a+b,0)
                              return Number(s.toFixed(4))
                            }
                            const aOrigAdj = sumSafe(semIssOrig, icmsOrig)
                            const aAtualAdj = sumSafe(semIssAtual, icmsAtual)
                            return (
                              <tr className="border-t">
                                <td className="px-2 py-1 whitespace-nowrap">{formatCurrency(totalVal)}</td>
                                <td className="px-2 py-1">{atividadeFromNome}</td>
                                <td className="px-2 py-1 whitespace-nowrap">{Number.isFinite(aOrigAdj) ? fmtPct4(aOrigAdj) : "-"}</td>
                                <td className="px-2 py-1 whitespace-nowrap">{Number.isFinite(aAtualAdj) ? fmtPct4(aAtualAdj) : "-"}</td>
                              </tr>
                            )
                          })()}
                          {/* Outras parcelas (exceto serviços de comunicação) */}
                          {otherParts.map((p: any, i: number) => {
                            const tipo = String(p?.tipo_regra || "").toLowerCase()
                            const actName = (() => {
                              const base = p?.descricao ?? p?.atividade_nome ?? "-"
                              if (tipo === "geral") {
                                const candidates = [
                                  "Prestação de Serviços",
                                  "Revenda de mercadorias",
                                  "Venda de mercadorias industrializadas",
                                ]
                                const norm = (s: any) => String(s || "").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
                                const src = norm(p?.atividade_nome)
                                for (const c of candidates) { if (src.includes(norm(c))) return c }
                              }
                              return base
                            })()
                            const val = Number(p?.valor || 0)
                            const aOrigAdj = round4(p?.aliquota_efetiva_original_ajustada_percent)
                            const aAtualAdj = round4(p?.aliquota_efetiva_atual_ajustada_percent)
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
