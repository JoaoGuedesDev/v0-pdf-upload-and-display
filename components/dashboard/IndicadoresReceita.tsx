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

  const [editOrigLabel, setEditOrigLabel] = useState<string | null>(null)
  const [editAtualLabel, setEditAtualLabel] = useState<string | null>(null)
  const [overrideOrig, setOverrideOrig] = useState<Record<string, number>>({})
  const [overrideAtual, setOverrideAtual] = useState<Record<string, number>>({})
  const [manualItems, setManualItems] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newAnexo, setNewAnexo] = useState<string>("")
  const [newTipo, setNewTipo] = useState<string>("Serviços")
  const [newOrig, setNewOrig] = useState<string>("")
  const [newAtual, setNewAtual] = useState<string>("")

  const aliquotaItems = useMemo(() => {
    const c: any = calculos || {}
    const arr: any[] = (
      Array.isArray(c?.analise_aliquota?.detalhe) ? c.analise_aliquota.detalhe :
      []
    )
    return arr
  }, [calculos])

  const combinedItems = useMemo(() => {
    return [ ...(aliquotaItems || []), ...(manualItems || []) ]
  }, [aliquotaItems, manualItems])

  // Removido cálculo: os cards usam os valores exatamente como vierem do n8n

  const rowsOriginal = useMemo(() => {
    const labelForItem = (it: any): string => {
      const an = it?.anexo ?? it?.anexo_numero
      const tRaw = String(it?.tipo || '').toLowerCase()
      const tInf = (() => {
        if (tRaw) return tRaw.charAt(0).toUpperCase() + tRaw.slice(1)
        const n = Number(an)
        if (Number.isFinite(n)) {
          if (n === 1 || n === 2) return 'Mercadorias'
          if (n === 3 || n === 4 || n === 5) return 'Serviços'
        }
        return ''
      })()
      if (an != null) return `Anexo ${an}${tInf ? ' — ' + tInf : ''}`
      return tInf || 'Item'
    }
    return (combinedItems || []).map((it: any) => ({
      label: labelForItem(it),
      value: it?.aliquota_efetiva_original_percent
    })).filter((r: any) => r.value != null)
  }, [combinedItems])

  
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
      const tInf = (() => {
        if (tRaw) return tRaw.charAt(0).toUpperCase() + tRaw.slice(1)
        const n = Number(an)
        if (Number.isFinite(n)) {
          if (n === 1 || n === 2) return 'Mercadorias'
          if (n === 3 || n === 4 || n === 5) return 'Serviços'
        }
        return ''
      })()
      if (an != null) return `Anexo ${an}${tInf ? ' — ' + tInf : ''}`
      return tInf || 'Item'
    }
    return (combinedItems || []).map((it: any) => {
      const label = labelForItem(it)
      const value = it?.aliquota_efetiva_atual_percent
      const isManual = !!it?.__manual
      let manualIndex = -1
      if (isManual) {
        const id = it?.__id
        manualIndex = manualItems.findIndex((mi: any) => mi?.__id === id)
      }
      return { label, value, manualIndex }
    }).filter((r: any) => r.value != null)
  }, [combinedItems, manualItems])

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
            {rowsOriginal.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] opacity-90">{r.label}</span>
                <span className="text-base sm:text-lg font-bold font-sans">{String(r.value)}%</span>
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
          <span
            role="button"
            aria-label="Adicionar anexo"
            className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white/80 text-[12px] hover:bg-white/15 hover:text-white/100"
            onClick={() => setShowAdd(true)}
          >+</span>
        </CardHeader>
        <CardContent className="p-1 sm:p-2 pt-0">
          {showAdd && (
            <div className="flex flex-wrap items-center gap-2 w-full mb-2">
                <input type="number" placeholder="Anexo" className="text-black text-xs px-2 py-1 rounded w-16" value={newAnexo} onChange={(e) => setNewAnexo(e.target.value)} />
                <select className="text-black text-xs px-2 py-1 rounded" value={newTipo} onChange={(e) => setNewTipo(e.target.value)}>
                  <option>Serviços</option>
                  <option>Mercadorias</option>
                </select>
                <input type="number" step="0.00001" placeholder="Alíquota atual (%)" className="text-black text-xs px-2 py-1 rounded w-32" value={newOrig} onChange={(e) => setNewOrig(e.target.value)} />
                <input type="number" step="0.00001" placeholder="Alíquota próxima (%)" className="text-black text-xs px-2 py-1 rounded w-36" value={newAtual} onChange={(e) => setNewAtual(e.target.value)} />
                <button className="text-[10px] bg-white/15 px-2 py-0.5 rounded" onClick={() => {
                  const an = newAnexo ? Number(newAnexo) : undefined
                  const it: any = {
                    __manual: true,
                    __id: String(Date.now()) + Math.random().toString(36).slice(2),
                    anexo: an,
                    tipo: newTipo.toLowerCase(),
                    aliquota_efetiva_original_percent: newOrig ? Number(newOrig) : undefined,
                    aliquota_efetiva_atual_percent: newAtual ? Number(newAtual) : undefined,
                  }
                  setManualItems([...manualItems, it])
                  setNewAnexo(""); setNewTipo("Serviços"); setNewOrig(""); setNewAtual(""); setShowAdd(false)
                }}>Adicionar</button>
                <button className="text-[10px] bg-white/15 px-2 py-0.5 rounded" onClick={() => { setShowAdd(false); }}>Cancelar</button>
            </div>
          )}
          <div className="mt-1 space-y-1">
            {rowsAtual.map((r: any, i: number) => (
              <div key={i} className="relative flex items-center justify-between pr-5">
                <span className="text-[10px] sm:text-[11px] opacity-90">{r.label}</span>
                <span className="text-base sm:text-lg font-bold font-sans">{String(r.value)}%</span>
                {r.manualIndex >= 0 && (
                  <span
                    role="button"
                    aria-label="Apagar"
                    className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 text-white/70 text-[10px] hover:bg-white/15 hover:text-white/100"
                    onClick={() => {
                      const next = manualItems.filter((_, idx) => idx !== r.manualIndex)
                      setManualItems(next)
                    }}
                  >×</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
})