import React from "react"

export default function ResumoExecutivoCard({ data }: { data: any }) {
  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n || 0))
  const trib = data?.tributos || {}
  const receitas = data?.receitas || {}
  const total = Number(trib?.Total || 0)
  const pa = Number(receitas?.receitaPA || 0)
  const rbt12 = Number(receitas?.rbt12 || 0)

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-lg`}> 
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-slate-800 font-semibold`}>Resumo Executivo</div>
          <div className={`text-slate-500 text-sm`}>Indicadores principais do período</div>
        </div>
        <div className="text-right">
          <div className={`text-slate-900 text-lg font-bold`}>{fmt(total)}</div>
          <div className={`text-slate-500 text-xs`}>Total de Tributos</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className={`bg-slate-50 rounded-md p-3`}>
          <div className={`text-slate-600 text-xs`}>Receita do PA</div>
          <div className={`text-slate-900 font-bold`}>{fmt(pa)}</div>
        </div>
        <div className={`bg-slate-50 rounded-md p-3`}>
          <div className={`text-slate-600 text-xs`}>RBT12</div>
          <div className={`text-slate-900 font-bold`}>{fmt(rbt12)}</div>
        </div>
        <div className={`bg-slate-50 rounded-md p-3`}>
          <div className={`text-slate-600 text-xs`}>Impostos</div>
          <div className={`text-slate-900 font-bold`}>{Object.keys(trib).filter(k => k !== 'Total' && Number(trib[k]||0)>0).length}</div>
        </div>
      </div>
    </div>
  )
}