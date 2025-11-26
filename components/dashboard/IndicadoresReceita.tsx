import { memo, useMemo, useState } from "react"
import { DollarSign, FileText, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

interface ReceitasData {
  receitaPA: number
  rbt12: number
  rba: number
  rbaa: number
  limite?: number
  receitaPAFormatada?: string
  mercadoExterno?: {
    rpa: number
    rbt12: number
    rba: number
    rbaa: number
    limite?: number
  }
}

interface CalculosData {
  aliquotaEfetiva?: number
  margemLiquida?: number
  margemLiquidaPercent?: number
  aliquotaEfetivaFormatada?: string
  totalDAS?: number
  totalDASFormatado?: string
  aliquotaEfetivaAtualPercent?: number
  aliquotaEfetivaOriginalPercent?: number
}

interface IndicadoresReceitaProps {
  receitas?: ReceitasData
  calculos?: CalculosData
  className?: string
  servicosTotal?: number
  mercadoriasTotal?: number
  servicosBrutoPA?: number
  mercadoriasBrutoPA?: number
  receitas12Meses?: number[]
  periodoApuracao?: string
  porAnexoItems?: any[]
}

export const IndicadoresReceita = memo(function IndicadoresReceita({ receitas, calculos, className = "", servicosTotal = 0, mercadoriasTotal = 0, servicosBrutoPA = 0, mercadoriasBrutoPA = 0, receitas12Meses, periodoApuracao, porAnexoItems }: IndicadoresReceitaProps) {
  const receitaPA = useMemo(() => (receitas?.receitaPA || 0), [receitas])
  const totalDAS = useMemo(() => {
    const explicit = calculos?.totalDAS
    return explicit != null && Number.isFinite(Number(explicit)) ? Number(explicit) : 0
  }, [calculos])
  const margemLiquida = useMemo(() => (calculos?.margemLiquida || calculos?.margemLiquidaPercent || 0), [calculos])

  

  const aliquotaItems = useMemo(() => {
    const c: any = calculos || {}
    const arr: any[] = (
      Array.isArray(c?.analise_aliquota?.detalhe) ? c.analise_aliquota.detalhe :
      []
    )
    return arr
  }, [calculos])

  const parsePercent = (v: any): number => {
    if (typeof v === 'number') return v
    const s = String(v ?? '').trim()
    if (!s) return NaN
    let cleaned = s.replace('%', '').trim()
    if (cleaned.includes(',')) cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : NaN
  }

  

  // Removido cálculo: os cards usam os valores exatamente como vierem do n8n

  const rowsOriginal = useMemo(() => {
    const labelForItem = (it: any): string => {
      const an = it?.anexo ?? it?.anexo_numero
      const tRaw = String(it?.tipo || '').toLowerCase()
      const n = Number(an)
      const tipo = (() => {
        if (tRaw) return tRaw
        if (Number.isFinite(n)) {
          if (n === 1 || n === 2) return 'mercadorias'
          if (n === 3 || n === 4 || n === 5) return 'servicos'
        }
        return ''
      })()
      if (tipo === 'servicos') return 'Prestação de Serviços'
      if (tipo === 'mercadorias') return 'Mercadorias'
      return 'Item'
    }
    const base = (aliquotaItems || []).map((it: any) => ({
      label: labelForItem(it),
      value: it?.aliquota_efetiva_original_percent
    })).filter((r: any) => r.value != null)
    const norm = (s: any) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const canonicalComunic = [
      'Comunicação sem substituição tributária de ICMS',
      'Comunicação com substituição tributária de ICMS',
      'Transporte sem substituição tributária de ICMS',
      'Transporte com substituição tributária de ICMS',
    ]
    const extrasMap: Record<string, { orig: number; atual: number }> = {}
    ;(aliquotaItems || []).forEach((it: any) => {
      const ps: any[] = Array.isArray(it?.parcelas_ajuste) ? it.parcelas_ajuste : []
      ps.filter(p => String(p?.tipo_regra || '').toLowerCase() !== 'geral').forEach((p: any) => {
        const src = norm(p?.atividade_nome)
        let label = p?.descricao ?? p?.atividade_nome ?? 'Atividade'
        for (const c of canonicalComunic) { if (src.includes(norm(c))) { label = c; break } }
        const semIssOrig = parsePercent(p?.aliquota_efetiva_original_sem_iss_percent)
        const icmsOrig = parsePercent(p?.aliquota_efetiva_original_icms_anexo1_percent)
        const semIssAtual = parsePercent(p?.aliquota_efetiva_atual_sem_iss_percent)
        const icmsAtual = parsePercent(p?.aliquota_efetiva_atual_icms_anexo1_percent)
        const calcAdjOrig = (Number.isFinite(semIssOrig) ? semIssOrig : NaN) + (Number.isFinite(icmsOrig) ? icmsOrig : 0)
        const calcAdjAtual = (Number.isFinite(semIssAtual) ? semIssAtual : NaN) + (Number.isFinite(icmsAtual) ? icmsAtual : 0)
        const adjOrigFallback = parsePercent(p?.aliquota_efetiva_original_ajustada_percent)
        const adjAtualFallback = parsePercent(p?.aliquota_efetiva_atual_ajustada_percent)
        const adjOrig = Number.isFinite(calcAdjOrig) ? calcAdjOrig : adjOrigFallback
        const adjAtual = Number.isFinite(calcAdjAtual) ? calcAdjAtual : adjAtualFallback
        const cur = extrasMap[label] || { orig: 0, atual: 0 }
        extrasMap[label] = { orig: cur.orig + (Number.isFinite(adjOrig) ? adjOrig : 0), atual: cur.atual + (Number.isFinite(adjAtual) ? adjAtual : 0) }
      })
    })
    const extras = Object.entries(extrasMap).map(([label, vals]) => ({ label, value: vals.orig }))
    return [...base, ...extras]
  }, [aliquotaItems])

  
  const tipoServPresent = useMemo(() => {
    return aliquotaItems.some((it: any) => {
      const t = String(it?.tipo || '').toLowerCase()
      const an = Number(it?.anexo ?? it?.anexo_numero)
      return t === 'servicos' || an === 3 || an === 4
    })
  }, [aliquotaItems])
  const tipoMercPresent = useMemo(() => {
    return aliquotaItems.some((it: any) => {
      const t = String(it?.tipo || '').toLowerCase()
      const an = Number(it?.anexo ?? it?.anexo_numero)
      return t === 'mercadorias' || an === 1 || an === 2
    })
  }, [aliquotaItems])
  const showFlags = useMemo(() => {
    return { serv: tipoServPresent, merc: tipoMercPresent }
  }, [tipoServPresent, tipoMercPresent])
  const showServ = showFlags.serv
  const showMerc = showFlags.merc

  const rowsAtual = useMemo(() => {
    const labelForItem = (it: any): string => {
      const an = it?.anexo ?? it?.anexo_numero
      const tRaw = String(it?.tipo || '').toLowerCase()
      const n = Number(an)
      const tipo = (() => {
        if (tRaw) return tRaw
        if (Number.isFinite(n)) {
          if (n === 1 || n === 2) return 'mercadorias'
          if (n === 3 || n === 4 || n === 5) return 'servicos'
        }
        return ''
      })()
      if (tipo === 'servicos') return 'Prestação de Serviços'
      if (tipo === 'mercadorias') return 'Mercadorias'
      return 'Item'
    }
    const base = (aliquotaItems || []).map((it: any) => {
      const label = labelForItem(it)
      const value = it?.aliquota_efetiva_atual_percent
      return { label, value }
    }).filter((r: any) => r.value != null)
    const norm = (s: any) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const canonicalComunic = [
      'Comunicação sem substituição tributária de ICMS',
      'Comunicação com substituição tributária de ICMS',
      'Transporte sem substituição tributária de ICMS',
      'Transporte com substituição tributária de ICMS',
    ]
    const extras: { label: string; value: number }[] = []
    ;(aliquotaItems || []).forEach((it: any) => {
      const ps: any[] = Array.isArray(it?.parcelas_ajuste) ? it.parcelas_ajuste : []
      const acc: Record<string, number> = {}
      ps.filter(p => String(p?.tipo_regra || '').toLowerCase() !== 'geral').forEach((p: any) => {
        const src = norm(p?.atividade_nome)
        let label = p?.descricao ?? p?.atividade_nome ?? 'Atividade'
        for (const c of canonicalComunic) { if (src.includes(norm(c))) { label = c; break } }
        const semIssAtual = parsePercent(p?.aliquota_efetiva_atual_sem_iss_percent)
        const icmsAtual = parsePercent(p?.aliquota_efetiva_atual_icms_anexo1_percent)
        const calcAdjAtual = (Number.isFinite(semIssAtual) ? semIssAtual : NaN) + (Number.isFinite(icmsAtual) ? icmsAtual : 0)
        const adjAtualFallback = parsePercent(p?.aliquota_efetiva_atual_ajustada_percent)
        const adjAtual = Number.isFinite(calcAdjAtual) ? calcAdjAtual : adjAtualFallback
        acc[label] = (acc[label] || 0) + (Number.isFinite(adjAtual) ? adjAtual : 0)
      })
      Object.entries(acc).forEach(([label, value]) => extras.push({ label, value }))
    })
    return [...base, ...extras]
  }, [aliquotaItems])

  const norm = (s: any) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const comunicCanon = [
    'Comunicação sem substituição tributária de ICMS',
    'Comunicação com substituição tributária de ICMS',
    'Transporte sem substituição tributária de ICMS',
    'Transporte com substituição tributária de ICMS',
  ]
  const geralCanon = [
    'Prestação de Serviços',
    'Revenda de mercadorias',
    'Venda de mercadorias industrializadas',
  ]

  const sumSafe = (...vals: number[]): number => {
    const nums = vals.filter(v => Number.isFinite(v))
    if (!nums.length) return NaN
    const s = nums.reduce((a,b)=>a+b,0)
    return Number(s.toFixed(4))
  }

  const buildRowsAjustadoDoc = (items: any[]): { label: string; value: number }[] => {
    const out: { label: string; value: number }[] = [];
    (items || []).forEach((it: any) => {
      const parcelas: any[] = Array.isArray(it?.parcelas_ajuste) ? it.parcelas_ajuste : []
      const comunicParts = parcelas.filter(p => String(p?.tipo_regra || '').toLowerCase() === 'servicos_comunicacao')
      if (comunicParts.length) {
        const first = comunicParts[0]
        const src = norm(first?.atividade_nome)
        let label = first?.descricao ?? first?.atividade_nome ?? 'Serviços de comunicação'
        for (const c of comunicCanon) { if (src.includes(norm(c))) { label = c; break } }
        const semIssOrig = parsePercent(first?.aliquota_efetiva_original_sem_iss_percent)
        const icmsOrig = parsePercent(first?.aliquota_efetiva_original_icms_anexo1_percent)
        const val = sumSafe(semIssOrig, icmsOrig)
        out.push({ label, value: val })
      }
      const geralParts = parcelas.filter(p => String(p?.tipo_regra || '').toLowerCase() === 'geral')
      if (geralParts.length || !parcelas.length) {
        const src = norm((geralParts[0]?.atividade_nome) || it?.tipo || '')
        let label = (geralParts[0]?.descricao ?? geralParts[0]?.atividade_nome) || 'Prestação de Serviços'
        for (const c of geralCanon) { if (src.includes(norm(c))) { label = c; break } }
        let val = parsePercent(geralParts[0]?.aliquota_efetiva_original_ajustada_percent)
        if (!Number.isFinite(val)) val = parsePercent(it?.aliquota_efetiva_original_percent)
        out.push({ label, value: val })
      }
    })
    const allowed = ['Comunicação sem substituição tributária de ICMS', 'Prestação de Serviços']
    return out.filter(r => Number.isFinite(r.value) && allowed.includes(r.label))
  }
  const rowsAjustadoDoc = buildRowsAjustadoDoc(aliquotaItems || [])

  const buildRowsAjustadoNext = (items: any[]): { label: string; value: number }[] => {
    const out: { label: string; value: number }[] = [];
    (items || []).forEach((it: any) => {
      const parcelas: any[] = Array.isArray(it?.parcelas_ajuste) ? it.parcelas_ajuste : []
      const comunicParts = parcelas.filter(p => String(p?.tipo_regra || '').toLowerCase() === 'servicos_comunicacao')
      if (comunicParts.length) {
        const first = comunicParts[0]
        const src = norm(first?.atividade_nome)
        let label = first?.descricao ?? first?.atividade_nome ?? 'Serviços de comunicação'
        for (const c of comunicCanon) { if (src.includes(norm(c))) { label = c; break } }
        const semIssAtual = parsePercent(first?.aliquota_efetiva_atual_sem_iss_percent)
        const icmsAtual = parsePercent(first?.aliquota_efetiva_atual_icms_anexo1_percent)
        const val = sumSafe(semIssAtual, icmsAtual)
        out.push({ label, value: val })
      }
      const geralParts = parcelas.filter(p => String(p?.tipo_regra || '').toLowerCase() === 'geral')
      if (geralParts.length || !parcelas.length) {
        const src = norm((geralParts[0]?.atividade_nome) || it?.tipo || '')
        let label = (geralParts[0]?.descricao ?? geralParts[0]?.atividade_nome) || 'Prestação de Serviços'
        for (const c of geralCanon) { if (src.includes(norm(c))) { label = c; break } }
        let val = parsePercent(geralParts[0]?.aliquota_efetiva_atual_ajustada_percent)
        if (!Number.isFinite(val)) val = parsePercent(it?.aliquota_efetiva_atual_percent)
        out.push({ label, value: val })
      }
    })
    const allowed = ['Comunicação sem substituição tributária de ICMS', 'Prestação de Serviços']
    return out.filter(r => Number.isFinite(r.value) && allowed.includes(r.label))
  }
  const rowsAjustadoNext = buildRowsAjustadoNext(aliquotaItems || [])

  const nextPeriodoLabel = useMemo(() => {
    const s = String(periodoApuracao || '').trim()
    const mmYYYY = s.match(/(\d{2})\/(\d{4})/)
    if (mmYYYY) {
      let mm = Number(mmYYYY[1])
      let yy = Number(mmYYYY[2])
      mm += 1
      if (mm > 12) { mm = 1; yy += 1 }
      const mmStr = String(mm).padStart(2, '0')
      return `${mmStr}/${yy}`
    }
    const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    const mNome = s.match(/([A-Za-zÀ-ÿ]+)/)
    const ano = s.match(/(\d{4})/)
    if (mNome && ano) {
      const k = mNome[1].toLowerCase().slice(0,3)
      let idx = meses.indexOf(k)
      let yy = Number(ano[1])
      if (idx >= 0) {
        idx += 1
        if (idx > 11) { idx = 0; yy += 1 }
        const mmStr = String(idx + 1).padStart(2, '0')
        return `${mmStr}/${yy}`
      }
    }
    return ''
  }, [periodoApuracao])

  const currentPeriodoLabel = useMemo(() => {
    const s = String(periodoApuracao || '').trim()
    const mmYYYY = s.match(/(\d{2})\/(\d{4})/)
    if (mmYYYY) return `${mmYYYY[1]}/${mmYYYY[2]}`
    return ''
  }, [periodoApuracao])

  const aliquotaDasSobreRpa = useMemo(() => {
    const rpa = Number(receitaPA || 0)
    const das = Number(totalDAS || 0)
    if (rpa > 0) return (das / rpa) * 100
    return 0
  }, [receitaPA, totalDAS])

  if (!receitas || !calculos) return null

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2 ${className}`}>
      {/* Receita Bruta PA - Azul escuro */}
      <Card className="bg-gradient-to-br from-slate-700 to-slate-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 py-1">
        <CardHeader className="pb-0.5 p-1 sm:p-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-[11px] sm:text-xs font-bold">Receita Bruta PA</CardTitle>
          <DollarSign className="h-4 w-4" />
        </CardHeader>
        <CardContent className="p-1 sm:p-2 pt-0">
          <div className="flex flex-col gap-1 mb-1">
            {servicosBrutoPA > 0 && (
              <span className="inline-flex items-center rounded-full bg-white/10 text-white px-2 py-0.5 text-[10px] font-semibold">
                Serviços: {formatCurrency(servicosBrutoPA)}
              </span>
            )}
            {mercadoriasBrutoPA > 0 && (
              <span className="inline-flex items-center rounded-full bg-white/10 text-white px-2 py-0.5 text-[10px] font-semibold">
                Mercadorias: {formatCurrency(mercadoriasBrutoPA)}
              </span>
            )}
          </div>
          <p className="text-base sm:text-lg font-bold break-words">{formatCurrency(receitaPA)}</p>
          <p className="text-[10px] sm:text-[11px] opacity-75 mt-1 flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-slate-400" /> Período de apuração
          </p>
        </CardContent>
      </Card>

      {/* Total DAS - Azul médio */}
      <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200">
        <CardHeader className="pb-0.5 p-1 sm:p-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-[11px] sm:text-xs font-bold">Total DAS</CardTitle>
          <FileText className="h-4 w-4" />
        </CardHeader>
        <CardContent className="p-1 sm:p-2 pt-0">
          <div className="flex flex-col gap-1 mb-1">
            {servicosTotal > 0 && (
              <span className="inline-flex items-center rounded-full bg-white/15 text-white px-2 py-0.5 text-[10px] font-semibold">
                Serviços: {formatCurrency(servicosTotal)}
              </span>
            )}
            {mercadoriasTotal > 0 && (
              <span className="inline-flex items-center rounded-full bg-white/15 text-white px-2 py-0.5 text-[10px] font-semibold">
                Mercadorias: {formatCurrency(mercadoriasTotal)}
              </span>
            )}
          </div>
          <p className="text-base sm:text-lg font-bold break-words">{formatCurrency(totalDAS)}</p>
          <p className="text-[10px] sm:text-[11px] opacity-75 mt-1">Total de tributos pagos</p>
        </CardContent>
      </Card>

      {/* Alíquota do Período Atual - Laranja */}
      <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 py-1">
        <CardHeader className="pb-0.5 p-1 sm:p-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-[11px] sm:text-xs font-bold">Alíquota {currentPeriodoLabel}</CardTitle>
          <TrendingUp className="h-4 w-4" />
        </CardHeader>
        <CardContent className="p-1 sm:p-2 pt-0">
          <div className="mt-1 space-y-1">
            {rowsAjustadoDoc.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] opacity-90">{r.label}</span>
                <span className="text-base sm:text-lg font-bold font-sans">{fmtPct4(r.value)}</span>
                </div>
              ))}
          </div>
          <div className="mt-2 border-t border-white/25 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] opacity-75">Alíquota efetiva</span>
              <span className="text-[12px] sm:text-sm font-semibold">{`${aliquotaDasSobreRpa.toFixed(4).replace('.', ',')}%`}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alíquota do Próximo Mês - Roxo */}
      <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 py-1">
        <CardHeader className="pb-0.5 p-1 sm:p-2 flex flex-row items-center justify-between">
          <CardTitle className="text-[11px] sm:text-xs font-bold">Alíquota {nextPeriodoLabel}</CardTitle>
        </CardHeader>
        <CardContent className="p-1 sm:p-2 pt-0">
          <div className="mt-1 space-y-1">
            {rowsAjustadoNext.map((r: any, i: number) => (
              <div key={i} className="relative flex items-center justify-between pr-5">
                <span className="text-[10px] sm:text-[11px] opacity-90">{r.label}</span>
                <span className="text-base sm:text-lg font-bold font-sans">{fmtPct4(r.value)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
})
  const fmtPct4 = (v: any): string => {
    const num = ((): number | null => {
      if (typeof v === 'number') return v
      const s = String(v ?? '').replace(',', '.')
      const n = Number(s)
      return Number.isFinite(n) ? n : null
    })()
    if (num != null) return `${num.toFixed(4).replace('.', ',')}%`
    const s = String(v ?? '')
    return s.includes('%') ? s : `${s}%`
  }
