import { memo, useMemo } from "react"
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
}

interface IndicadoresReceitaProps {
  receitas?: ReceitasData
  calculos?: CalculosData
  className?: string
  servicosTotal?: number
  mercadoriasTotal?: number
  servicosBrutoPA?: number
  mercadoriasBrutoPA?: number
}

export const IndicadoresReceita = memo(function IndicadoresReceita({ receitas, calculos, className = "", servicosTotal = 0, mercadoriasTotal = 0, servicosBrutoPA = 0, mercadoriasBrutoPA = 0 }: IndicadoresReceitaProps) {
  const receitaPA = useMemo(() => (receitas?.receitaPA || 0), [receitas])
  const totalDAS = useMemo(() => {
    const explicit = calculos?.totalDAS
    if (explicit != null && Number.isFinite(Number(explicit))) return Number(explicit)
    const aliq = calculos?.aliquotaEfetiva || 0
    return aliq ? (aliq / 100) * receitaPA : 0
  }, [calculos, receitaPA])
  const margemLiquida = useMemo(() => (calculos?.margemLiquida || calculos?.margemLiquidaPercent || 0), [calculos])
  const aliquotaEfetiva = useMemo(() => (calculos?.aliquotaEfetiva || 0), [calculos])

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

      {/* Alíquota Efetiva - Laranja */}
      <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 py-1">
        <CardHeader className="pb-0.5 p-1 sm:p-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-[11px] sm:text-xs font-bold">Alíquota Efetiva</CardTitle>
          <TrendingUp className="h-4 w-4" />
        </CardHeader>
        <CardContent className="p-1 sm:p-2 pt-0">
          <p className="text-base sm:text-lg font-bold font-sans">
            {(calculos.aliquotaEfetivaFormatada || aliquotaEfetiva.toFixed(5).replace(".", ",")).replace("%", "")}%
          </p>
          <p className="text-[10px] sm:text-[11px] opacity-75 mt-1">DAS / Receita PA</p>
        </CardContent>
      </Card>

      {/* Margem Líquida - Roxo */}
      <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 py-1">
        <CardHeader className="pb-0.5 p-1 sm:p-2">
          <CardTitle className="text-[11px] sm:text-xs font-bold">Margem Líquida</CardTitle>
        </CardHeader>
        <CardContent className="p-1 sm:p-2 pt-0">
          <p className="text-base sm:text-lg font-bold font-sans">{margemLiquida.toFixed(3).replace('.', ',')}%</p>
          <p className="text-[10px] sm:text-[11px] opacity-75 mt-1">Receita após impostos</p>
        </CardContent>
      </Card>
    </div>
  )
})