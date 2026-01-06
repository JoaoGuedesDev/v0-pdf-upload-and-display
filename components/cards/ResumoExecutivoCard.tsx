import React from "react"

export default function ResumoExecutivoCard({ data }: { data: any }) {
  const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n || 0))
  const trib = data?.tributos || {}
  const receitas = data?.receitas || {}
  const total = Number(trib?.Total || 0)
  const pa = Number(receitas?.receitaPA || 0)
  const rbt12 = Number(receitas?.rbt12 || 0)

  return (
    <div className={`bg-card border border-border rounded-2xl p-5 shadow-xl`}> 
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-foreground font-semibold tracking-tight text-lg`}>Resumo Executivo</div>
          <div className={`text-muted-foreground text-sm`}>Indicadores principais do período</div>
        </div>
        <div className="text-right">
          <div className={`text-foreground text-xl font-bold tracking-tight`}>{fmt(total)}</div>
          <div className={`text-muted-foreground text-xs`}>Total de Tributos</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className={`bg-muted/50 rounded-xl p-3`}>
          <div className={`text-muted-foreground text-xs`}>Receita do PA</div>
          <div className={`text-foreground font-bold tracking-tight text-lg`}>{fmt(pa)}</div>
        </div>
        <div className={`bg-muted/50 rounded-xl p-3`}>
          <div className={`text-muted-foreground text-xs`}>RBT12</div>
          <div className={`text-foreground font-bold tracking-tight text-lg`}>{fmt(rbt12)}</div>
        </div>
        <div className={`bg-muted/50 rounded-xl p-3`}>
          <div className={`text-muted-foreground text-xs`}>Impostos</div>
          <div className={`text-foreground font-bold tracking-tight text-lg`}>{Object.keys(trib).filter(k => k !== 'Total' && Number(trib[k]||0)>0).length}</div>
        </div>
      </div>
    </div>
  )
}
