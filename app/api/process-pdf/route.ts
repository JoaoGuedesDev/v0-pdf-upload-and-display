import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text) {
      return NextResponse.json({ error: "Nenhum texto foi enviado" }, { status: 400 })
    }

    console.log("[v0] Processando texto extraído do PDF DAS")

    const dasData = processDasData(text)

    console.log("[v0] Dados do DAS processados com sucesso")
    return NextResponse.json(dasData)
  } catch (error) {
    console.error("[v0] Erro ao processar:", error)
    return NextResponse.json(
      {
        error: "Erro ao processar o texto",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

function processDasData(textRaw: string) {
  // Normalizar texto
  const text = String(textRaw)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim()

  // Helpers
  const clean = (s: any) => String(s || "").trim()
  const brToFloat = (s: any): number => {
    if (!s) return 0
    const cleaned = String(s)
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
    return Number.parseFloat(cleaned) || 0
  }
  const moneyBR = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

  // ===== 1) Identificação / Período =====
  const periodo = (text.match(/Per[ií]odo de Apura[cç][aã]o:\s*([0-9/]+\s*a\s*[0-9/]+)/i) || ["", ""])[1]
  const cnpj = (text.match(/CNPJ(?:\s+(?:Matriz|Estabelecimento))?:\s*([\d./-]+)/i) || ["", ""])[1]

  let razaoSocial = ""
  const razaoMatch = text.match(
    /Nome empresarial:\s*([A-ZÀ-Ü][A-ZÀ-Ü\s.&-]+?)(?:\s+Data de abertura|\s+CNPJ|\s+Optante|\s+\d)/i,
  )
  if (razaoMatch) {
    razaoSocial = clean(razaoMatch[1])
  }

  const abertura = (text.match(/Data de abertura no CNPJ:\s*([0-9/]+)/i) || ["", ""])[1]

  // Município/UF
  let municipio = "",
    uf = ""
  const mMatch = text.match(/Munic[ií]pio:\s*([A-ZÀ-ÜÂ-ÔÇÉÍÓÚÃÕà-üâ-ôçéíóúãõ\- ]+)\s*UF:\s*([A-Z]{2})/i)
  if (mMatch) {
    municipio = clean(mMatch[1])
    uf = clean(mMatch[2])
  }

  // ===== 2) Totais de receita (2.1) =====
  let rpa = ""
  
  // Estratégia 1: Procurar "Receita Bruta do PA" seguido de valores
  const rpaMatch = text.match(
    /Receita Bruta do PA[^\n]*?((?:\d{1,3}(?:\.\d{3})*,\d{2})(?:.*?(\d{1,3}(?:\.\d{3})*,\d{2})){0,2})/i,
  )
  if (rpaMatch) {
    const todos = rpaMatch[1].match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || []
    rpa = todos[todos.length - 1] || ""
  }
  
  // Estratégia 2: Procurar padrão mais simples
  if (!rpa) {
    rpa = (text.match(/Receita Bruta do PA.*?(\d{1,3}(?:\.\d{3})*,\d{2})/i) || ["", ""])[1]
  }
  
  // Estratégia 3: Procurar na seção 2.1
  if (!rpa) {
    const secao21 = text.match(/2\.1\)[\s\S]*?(\d{1,3}(?:\.\d{3})*,\d{2})/i)
    if (secao21) rpa = secao21[1]
  }
  
  // Estratégia 4: Procurar "Total da Receita Bruta"
  if (!rpa) {
    rpa = (text.match(/Total da Receita Bruta.*?(\d{1,3}(?:\.\d{3})*,\d{2})/i) || ["", ""])[1]
  }

  const rbt12 = (text.match(/RBT12\)\s*([\d.]+,\d{2})/i) || ["", ""])[1]
  const rba = (text.match(/RBA\)\s*([\d.]+,\d{2})/i) || ["", ""])[1]
  const rbaa = (text.match(/RBAA\)\s*([\d.]+,\d{2})/i) || ["", ""])[1]
  const limite = (text.match(/Limite de receita bruta proporcionalizado\s*([\d.]+,\d{2})/i) || ["", ""])[1]

  let tributos = {
    IRPJ: 0,
    CSLL: 0,
    COFINS: 0,
    PIS_Pasep: 0,
    INSS_CPP: 0,
    ICMS: 0,
    IPI: 0,
    ISS: 0,
    Total: 0,
  }

  // Estratégia 1: Procurar linha após o cabeçalho dos tributos
  const headerRE = /IRPJ\s+CSLL\s+COFINS\s+PIS\/?PASE?P\s+(?:INSS\/CPP|CPP)\s+ICMS\s+IPI\s+ISS\s+Total/i
  const headerMatch = text.match(new RegExp(headerRE.source + "[\\s\\S]{0,100}?\\n([0-9.,\\s]+)", "i"))

  let nums: string[] = []
  if (headerMatch) {
    const tribLine = headerMatch[1]
    nums = tribLine.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || []
  }

  // Estratégia 2: Procurar na seção "Totais do Estabelecimento"
  if (nums.length < 8) {
    const bloco = text.match(/Totais do Estabelecimento[\s\S]{0,300}?\n([0-9.,\s]+)\n/i)
    if (bloco) {
      nums = bloco[1].match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || []
    }
  }

  // Estratégia 3: Procurar na seção 2.8 "Total do Débito"
  if (nums.length < 8) {
    const bloco = text.match(/2\.8\)[\s\S]*?Total do D[eé]bito[\s\S]{0,300}?\n([0-9.,\s]+)\n/i)
    if (bloco) {
      nums = bloco[1].match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || []
    }
  }

  // Estratégia 4: Procurar valores individuais por nome
  if (nums.length < 8) {
    const irpjMatch = text.match(/IRPJ[^\d]+([\d.]+,\d{2})/i)
    const csllMatch = text.match(/CSLL[^\d]+([\d.]+,\d{2})/i)
    const cofinsMatch = text.match(/COFINS[^\d]+([\d.]+,\d{2})/i)
    const pisMatch = text.match(/PIS\/?PASEP[^\d]+([\d.]+,\d{2})/i)
    const inssMatch = text.match(/(?:INSS\/CPP|CPP)[^\d]+([\d.]+,\d{2})/i)
    const icmsMatch = text.match(/ICMS[^\d]+([\d.]+,\d{2})/i)
    const ipiMatch = text.match(/IPI[^\d]+([\d.]+,\d{2})/i)
    const issMatch = text.match(/ISS[^\d]+([\d.]+,\d{2})/i)

    if (irpjMatch) nums.push(irpjMatch[1])
    if (csllMatch) nums.push(csllMatch[1])
    if (cofinsMatch) nums.push(cofinsMatch[1])
    if (pisMatch) nums.push(pisMatch[1])
    if (inssMatch) nums.push(inssMatch[1])
    if (icmsMatch) nums.push(icmsMatch[1])
    if (ipiMatch) nums.push(ipiMatch[1])
    if (issMatch) nums.push(issMatch[1])
  }

  // Atribuir valores aos tributos
  if (nums.length >= 8) {
    tributos = {
      IRPJ: brToFloat(nums[0]),
      CSLL: brToFloat(nums[1]),
      COFINS: brToFloat(nums[2]),
      PIS_Pasep: brToFloat(nums[3]),
      INSS_CPP: brToFloat(nums[4]),
      ICMS: brToFloat(nums[5]),
      IPI: brToFloat(nums[6]),
      ISS: brToFloat(nums[7]),
      Total: nums[8] ? brToFloat(nums[8]) : 0,
    }
  }

  // Se não encontrou o total, calcular
  if (tributos.Total === 0) {
    tributos.Total = Object.entries(tributos)
      .filter(([key]) => key !== "Total")
      .reduce((sum, [, val]) => sum + val, 0)
  }

  // ===== 3) Valor Total do Débito Declarado =====
  let totalDeclarado = ""
  
  // Estratégia 1: Procurar "Valor Total do Débito Declarado"
  totalDeclarado = (text.match(/Valor Total do D[eé]bito Declarado\s*\$\$R\$\$\$\s*\n?([\d.]+,\d{2})/i) || [
    "",
    "",
  ])[1]
  
  // Estratégia 2: Procurar "Total do Débito"
  if (!totalDeclarado) {
    totalDeclarado = (text.match(/Total do D[eé]bito.*?(\d{1,3}(?:\.\d{3})*,\d{2})/i) || ["", ""])[1]
  }
  
  // Estratégia 3: Procurar na seção 2.8
  if (!totalDeclarado) {
    const secao28 = text.match(/2\.8\)[\s\S]*?(\d{1,3}(?:\.\d{3})*,\d{2})/i)
    if (secao28) totalDeclarado = secao28[1]
  }
  const receitaPA = brToFloat(rpa)
  const valorDAS = tributos.Total || brToFloat(totalDeclarado)

  // ===== 4) Série mensal 2.2.1 Mercado Interno =====
  const sliceBetween = (str: string, startRE: RegExp, endRE?: RegExp) => {
    const start = str.search(startRE)
    if (start < 0) return ""
    const sub = str.slice(start)
    const endIdx = endRE ? sub.search(endRE) : -1
    return endIdx > 0 ? sub.slice(0, endIdx) : sub
  }

  const blocoMI = sliceBetween(text, /2\.2\.1\)\s*Mercado Interno/i, /2\.2\.2\)\s*Mercado Externo/i)
  const pares = [...blocoMI.matchAll(/(\d{2}\/\d{4})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/g)].map((m) => ({
    mes: m[1],
    valor: brToFloat(m[2]),
  }))

  // ===== 5) Cálculos =====
  
  // Fórmula corrigida: (valorDAS / receitaPA) * 100 com validação de divisão por zero
  const aliquotaEfetiva = (valorDAS > 0 && receitaPA > 0) ? (valorDAS / receitaPA) * 100 : 0
  const margemLiquida = receitaPA > 0 ? ((receitaPA - valorDAS) / receitaPA) * 100 : 0

  // Função para formatação brasileira com vírgula como separador decimal
  const formatBrazilianDecimal = (value: number, decimals: number = 6): string => {
    return value.toFixed(decimals).replace('.', ',')
  }

  // ===== 6) Saída estruturada =====
  return {
    success: true,
    dados: {
      identificacao: {
        cnpj,
        razaoSocial,
        periodoApuracao: periodo,
        abertura,
        municipio,
        uf,
      },
      receitas: {
        receitaPA: receitaPA,
        rbt12: brToFloat(rbt12),
        rba: brToFloat(rba),
        rbaa: brToFloat(rbaa),
        limite: brToFloat(limite),
        receitaPAFormatada: moneyBR(receitaPA),
      },
      tributos,
      valorTotalDAS: valorDAS,
      valorTotalDASFormatado: moneyBR(valorDAS),
      calculos: {
        aliquotaEfetiva: +aliquotaEfetiva.toFixed(5),
        aliquotaEfetivaFormatada: formatBrazilianDecimal(aliquotaEfetiva, 5),
        margemLiquida: +margemLiquida.toFixed(3),
      },
      historico: {
        mercadoInterno: pares,
      },
    },
    graficos: {
      tributosBar: {
        labels: ["IRPJ", "CSLL", "COFINS", "PIS/Pasep", "INSS/CPP", "ICMS", "IPI", "ISS"],
        values: [
          tributos.IRPJ,
          tributos.CSLL,
          tributos.COFINS,
          tributos.PIS_Pasep,
          tributos.INSS_CPP,
          tributos.ICMS,
          tributos.IPI,
          tributos.ISS,
        ],
      },
      dasPie: {
        labels: ["IRPJ", "CSLL", "COFINS", "PIS/Pasep", "INSS/CPP", "ICMS", "IPI", "ISS"],
        values: [
          tributos.IRPJ,
          tributos.CSLL,
          tributos.COFINS,
          tributos.PIS_Pasep,
          tributos.INSS_CPP,
          tributos.ICMS,
          tributos.IPI,
          tributos.ISS,
        ],
      },
      receitaLine: {
        labels: pares.map((p) => p.mes),
        values: pares.map((p) => p.valor),
      },
    },
    metadata: {
      processadoEm: new Date().toISOString(),
      versao: "1.2",
      fonte: "PGDAS-D PDF",
    },
  }
}
