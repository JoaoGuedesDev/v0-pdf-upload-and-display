import { NextResponse } from 'next/server'

// Estrutura de entrada esperada (parcial de DASData)
type InputDAS = {
  identificacao?: any
  receitas?: any
  tributos: {
    IRPJ: number
    CSLL: number
    COFINS: number
    PIS_Pasep: number
    INSS_CPP: number
    ICMS: number
    IPI: number
    ISS: number
    Total: number
  }
  cenario?: string
  graficos?: {
    receitaLine?: { labels: string[]; values: number[] }
    receitaLineExterno?: { labels: string[]; values: number[] }
  }
  calculos?: { aliquotaEfetiva?: number; margemLiquida?: number }
}

// Heurística simples de fallback quando não há chave de IA
function heuristicaInsights(das: InputDAS) {
  const toNum = (v: any) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  const aliquota = toNum(das.calculos?.aliquotaEfetiva)
  const margem = toNum(das.calculos?.margemLiquida)
  const total = toNum(das.tributos?.Total)
  const iss = toNum(das.tributos?.ISS)
  const icms = toNum(das.tributos?.ICMS)
  const inss = toNum(das.tributos?.INSS_CPP)
  const rbt12 = toNum((das as any)?.receitas?.rbt12)
  const cenario = das.cenario || 'misto'

  let comparativo = ''
  const pa: string[] = []
  const ops: string[] = []
  const recs: string[] = []
  const economia: string[] = []
  const dasObs: string[] = []
  const receitaMensal: string[] = []

  switch (cenario) {
    case 'servicos':
      comparativo = `Serviços com alíquota de ${aliquota.toFixed(2)}% e margem ${margem.toFixed(1)}%.`
      if (iss > total * 0.15) pa.push('ISS acima de 15% do total')
      if (inss > total * 0.35) pa.push('INSS/CPP com peso elevado')
      ops.push('Buscar benefícios municipais para ISS')
      recs.push('Organizar documentação de serviços')
      break
    case 'mercadorias':
      comparativo = `Comércio com alíquota de ${aliquota.toFixed(2)}% e margem ${margem.toFixed(1)}%.`
      if (icms > total * 0.12) pa.push('ICMS acima de 12% do total')
      ops.push('Aproveitar créditos de ICMS nas compras')
      recs.push('Controle de estoque e notas fiscais')
      break
    default:
      comparativo = `Operação mista com alíquota de ${aliquota.toFixed(2)}% e margem ${margem.toFixed(1)}%.`
      // Removido: alerta de desbalanceamento e sugestão de otimizar divisão
      recs.push('Segregar corretamente receitas por atividade')
  }

  if (aliquota > 10) pa.push('Alíquota efetiva elevada')
  if (margem < 10) pa.push('Margem líquida baixa')
  // Economia potencial heurística
  if (icms > total * 0.12) economia.push('Aproveitar créditos de ICMS nas compras — potencial de 3% a 7% da carga')
  if (iss > total * 0.15) economia.push('Benefícios municipais (ISS) — potencial de 2% a 5% da carga')
  if (inss > total * 0.35) economia.push('Revisão de pró-labore/folha — potencial de 2% a 4% da carga')

  // Avaliação de regime tributário
  const cargaEfetiva = rbt12 > 0 ? (total / rbt12) * 100 : aliquota
  let regimeAdequado = true
  let regimeSugestao = 'Simples Nacional'
  let regimeJust = 'Carga efetiva compatível com o Simples e limite de receita atendido.'
  if (rbt12 > 4800000) {
    regimeAdequado = false
    regimeSugestao = 'Lucro Presumido'
    regimeJust = 'Receita anual acima do limite do Simples Nacional.'
    pa.push('Receita anual ultrapassa o limite do Simples (R$ 4,8 mi)')
  } else if (cargaEfetiva > 13) {
    regimeAdequado = false
    regimeSugestao = 'Lucro Presumido ou Lucro Real'
    regimeJust = 'Carga efetiva elevada; avaliar cenários comparativos fora do Simples.'
  }

  // Observações do DAS (composição)
  const pct = (v: number) => total > 0 ? ((v / total) * 100).toFixed(1) + '%' : '0%'
  dasObs.push(`Composição de tributos: ISS=${pct(iss)}, ICMS=${pct(icms)}, INSS/CPP=${pct(inss)}.`)

  // Receita mensal (tendência simples)
  const vals = (das.graficos?.receitaLine?.values || []).map(toNum)
  if (vals.length >= 3) {
    const last = vals[vals.length - 1] || 0
    const avg3 = (vals.slice(-3).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) / 3)
    const varPct = avg3 > 0 ? ((last - avg3) / avg3) * 100 : 0
    if (varPct >= 15) receitaMensal.push('Crescimento recente de receita (≥15%) em relação à média dos 3 últimos meses')
    else if (varPct <= -15) receitaMensal.push('Queda recente de receita (≤-15%) em relação à média dos 3 últimos meses')
  }

  return {
    comparativoSetorial: comparativo,
    pontosAtencao: pa,
    oportunidades: ops,
    recomendacoes: recs,
    economiaImpostos: economia,
    regimeTributario: { adequado: regimeAdequado, sugestao: regimeSugestao, justificativa: regimeJust },
    dasObservacoes: dasObs,
    receitaMensal,
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const das = body?.dasData as InputDAS
    if (!das || !das.tributos) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_V0 || process.env.OPENAI_API_KEY_VERCEL || ''
    if (!apiKey) {
      const insights = heuristicaInsights(das)
      return NextResponse.json({ provider: 'heuristica', insights })
    }

    // Prompt orientado a economia de impostos, regime, DAS e receita
    const prompt = `Você é um analista tributário. Gere insights claros e práticos focados em:
economiaImpostos (até 5 bullets), regimeTributario (adequado: boolean, sugestao: string, justificativa: string), dasObservacoes (até 5), receitaMensal (até 5), além de comparativoSetorial, pontosAtencao (até 5), oportunidades (até 5), recomendacoes (até 5).
Responda SOMENTE com JSON válido usando estas chaves.
Dados:
AliquotaEfetiva: ${das.calculos?.aliquotaEfetiva ?? 0}%
MargemLiquida: ${das.calculos?.margemLiquida ?? 0}%
Cenario: ${das.cenario}
Tributos: ISS=${das.tributos?.ISS}, ICMS=${das.tributos?.ICMS}, INSS_CPP=${das.tributos?.INSS_CPP}, Total=${das.tributos?.Total}
 Receita Anual (RBT12): ${(das as any)?.receitas?.rbt12 ?? 0}
Receita MI última: ${(das.graficos?.receitaLine?.values || []).slice(-1)[0] ?? 0}
Receita ME última: ${(das.graficos?.receitaLineExterno?.values || []).slice(-1)[0] ?? 0}
Responda apenas com JSON.`

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você gera análises tributárias e responde somente em JSON válido.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })

    if (!resp.ok) {
      const insights = heuristicaInsights(das)
      return NextResponse.json({ provider: 'heuristica', insights, error: `IA HTTP ${resp.status}` }, { status: 200 })
    }
    const data = await resp.json()
    const content = data?.choices?.[0]?.message?.content || '{}'
    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch {
      const insights = heuristicaInsights(das)
      return NextResponse.json({ provider: 'heuristica', insights, error: 'JSON inválido da IA' }, { status: 200 })
    }
    return NextResponse.json({ provider: 'openai', insights: parsed })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erro desconhecido' }, { status: 500 })
  }
}