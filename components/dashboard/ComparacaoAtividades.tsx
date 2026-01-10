import { memo, useMemo } from "react"
import { BarChartHorizontal } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UI_CONFIG, ATIVIDADES_COLORS } from "@/lib/constants"
import { formatCurrency } from '@/lib/utils';
import { useTheme } from "next-themes";

interface ComparacaoAtividadesProps {
  atividades?: any
  className?: string
}

export const ComparacaoAtividades = memo(function ComparacaoAtividades({ atividades, className = "" }: ComparacaoAtividadesProps) {
  const listInput: any[] = Array.isArray(atividades) ? atividades : Object.values(atividades || {})
  const collectNodesWithTotais = (nodes: any[]): any[] => {
    const out: any[] = []
    const pushIf = (o: any) => {
      const t = o?.totais
      const ex = t && (t.exigivel || t.exigível)
      if (ex && typeof ex === 'object') out.push(o)
    }
    const walk = (o: any) => {
      if (!o || typeof o !== 'object') return
      pushIf(o)
      for (const v of Object.values(o)) {
        if (Array.isArray(v)) v.forEach(walk)
        else if (v && typeof v === 'object') walk(v)
      }
    }
    nodes.forEach(walk)
    return out
  }
  const list: any[] = collectNodesWithTotais(listInput)
  const parseNumber = (v: any): number => {
    if (typeof v === 'number') return v
    const n = Number(String(v || '').replace(/\./g, '').replace(',', '.'))
    return isFinite(n) ? n : 0
  }
  const rows = useMemo(() => {
    return list.map((a: any, idx: number) => {
      const rawNome = String(a?.nome || a?.descricao || a?.name || `Atividade ${idx + 1}`)
      const alvo = 'Revenda de mercadorias para o exterior'
      const nome = rawNome.toLowerCase().includes(alvo.toLowerCase()) ? alvo : rawNome
      const exig = (a?.totais && (a?.totais.exigivel || a?.totais.exigível)) || {}
      const exigTotal = parseNumber(exig?.total)
      const exigSum = [exig?.irpj, exig?.csll, exig?.cofins, exig?.pis, exig?.inss_cpp, exig?.icms, exig?.ipi, exig?.iss]
        .reduce((acc, v) => acc + parseNumber(v), 0)
      const trib = a?.tributos || {}
      const tribTotal = parseNumber(trib?.total)
      const tribSum = [trib?.irpj, trib?.csll, trib?.cofins, trib?.pis, trib?.inss_cpp, trib?.icms, trib?.ipi, trib?.iss]
        .reduce((acc, v) => acc + parseNumber(v), 0)
      const valor = [exigTotal, exigSum, tribTotal, tribSum].find(v => Number(v || 0) > 0) || 0
      return { nome, valor }
    }).filter(r => Number(r.valor || 0) > 0)
  }, [list])

  const total = useMemo(() => rows.reduce((acc, r) => acc + Number(r.valor || 0), 0), [rows])

  const hasData = rows.length > 0
  if (!hasData) return null

  return (
    <Card
      className={`bg-[#3A3A3A] border border-[#00C2FF] shadow-lg hover:shadow-xl transition-all duration-200 print:inline-block print:w-1/3 print:align-top print:break-inside-avoid ${className}`}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <div>
          <CardTitle
            className={`text-base sm:text-[9px] flex items-center gap-2 text-white`}
          >
            <BarChartHorizontal className={`h-5 w-5 text-[#00C2FF]`} />
            Tributos por Atividade (exigível)
          </CardTitle>
          <CardDescription
            className={`text-xs sm:text-[9px] text-gray-400`}
          >
            Distribuição do DAS entre Mercadorias e Serviços
          </CardDescription>
        </div>
        <div className={`text-[9px] font-semibold text-gray-400`}>
          Total: {formatCurrency(total)}
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <div className="space-y-0.5 print:block">
            {rows.map((row, i) => {
              const pct = total > 0 ? (Number(row.valor || 0) / total) * 100 : 0
              return (
                <div
                  key={`atv-${i}`}
                  className={`flex items-center justify-between p-2 rounded-lg bg-[#007AFF]/10 hover:shadow-md transition-all duration-200`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: ATIVIDADES_COLORS?.mercadorias || "#007AFF" }} />
                    <div>
                      <div className={`font-medium text-sm text-white`}>{row.nome}</div>
                      <div className={`text-xs text-gray-400`}>{pct.toFixed(5)}%</div>
                    </div>
                  </div>
                  <div className={`font-bold text-sm text-white`}>{formatCurrency(Number(row.valor || 0))}</div>
                </div>
              )
            })}
            <div
              className={`flex items-center justify-between p-2 rounded-lg border-2 bg-[#007AFF]/5 border-[#00C2FF] font-bold`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded-full bg-[#00C2FF]`}
                />
                <div>
                  <div
                    className={`font-bold text-sm text-[#00C2FF]`}
                  >
                    TOTAL DAS (Atividades)
                  </div>
                  <div className={`text-xs text-[#007AFF]`}>
                    100.00000%
                  </div>
                </div>
              </div>
                  <div className={`font-bold text-lg text-white`}>{formatCurrency(total)}</div>
              </div>
            </div>
          </div>
      </CardContent>
    </Card>
  )
})
