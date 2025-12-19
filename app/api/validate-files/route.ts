export const runtime = 'nodejs'

import { NextRequest, NextResponse } from "next/server"
import { createRequire } from "module"
import { processDasData } from "@/lib/das-parse"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]
    const expectedType = formData.get("type") as string // 'monthly' | 'annual'

    if (!files || files.length === 0) {
      return NextResponse.json({ valid: false, errors: ["Nenhum arquivo enviado."] }, { status: 400 })
    }

    const results = []
    const cnpjs = new Set<string>()
    const names = new Set<string>()
    const periods = new Set<string>()
    const periodValues: { date: number, raw: string }[] = []

    const require = createRequire(import.meta.url)
    const pdf = require("pdf-parse/lib/pdf-parse.js")

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const data = await pdf(buffer)
        const text = data.text

        // Use robust parser
        const parsed = processDasData(text)
        
        const cnpj = parsed.dados?.identificacao?.cnpj
        const name = parsed.dados?.identificacao?.razaoSocial
        const rawPeriod = parsed.dados?.identificacao?.periodoApuracao

        // Parse period to MM/YYYY
        let period = null
        if (rawPeriod) {
            // Usually "01/2024 a 31/01/2024" or just "01/2024"
            const match = rawPeriod.match(/(\d{2}\/\d{4})/)
            if (match) period = match[1]
        }

        if (cnpj) cnpjs.add(cnpj)
        if (name) names.add(name)
        if (period) {
            periods.add(period)
            const [m, y] = period.split('/').map(Number)
            periodValues.push({ date: y * 12 + m, raw: period })
        }

        results.push({
            name: file.name,
            cnpj,
            companyName: name,
            period,
            valid: parsed.success && !!cnpj && !!period
        })
      } catch (e) {
        results.push({
            name: file.name,
            valid: false,
            error: "Falha ao ler PDF"
        })
      }
    }

    const errors: string[] = []

    // 1. Check Consistency - CNPJ & Name
    if (cnpjs.size > 1) {
      errors.push(`Conflito de clientes detectado: Foram encontrados documentos de ${cnpjs.size} CNPJs diferentes (${Array.from(cnpjs).join(", ")}). Por favor, envie apenas arquivos do mesmo cliente.`)
    }
    if (names.size > 1) {
        // Warning or error? If CNPJs match but names differ slightly, maybe just warning. 
        // But usually name change implies formal change. Let's stick to CNPJ as hard error.
    }
    if (cnpjs.size === 0) {
      errors.push("Não foi possível identificar o CNPJ nos arquivos. Verifique se são documentos PGDAS válidos.")
    }

    // 2. Check Count vs Type
    if (expectedType === 'annual') {
        if (files.length !== 12) {
            errors.push(`Para o relatório anual, é obrigatório enviar exatamente 12 arquivos (recebido: ${files.length}).`)
        }
    } else if (expectedType === 'monthly') {
        if (files.length > 1) {
            errors.push("Para o processo mensal, envie apenas 1 arquivo.")
        }
    }

    // 3. Check for Duplicate Periods
    if (periods.size !== files.length && expectedType === 'annual') {
         errors.push("Períodos duplicados detectados. Verifique se enviou o mesmo mês duas vezes.")
    }

    // 4. Check Sequential Months (Annual Only)
    if (expectedType === 'annual' && periodValues.length > 0) {
        periodValues.sort((a, b) => a.date - b.date)
        
        let gaps = []
        for (let i = 1; i < periodValues.length; i++) {
            const diff = periodValues[i].date - periodValues[i-1].date
            if (diff !== 1) {
                gaps.push(`${periodValues[i-1].raw} -> ${periodValues[i].raw}`)
            }
        }
        
        if (gaps.length > 0) {
            errors.push(`Os arquivos não estão em sequência mensal consecutiva. Falhas detectadas entre: ${gaps.join(', ')}. O relatório anual requer 12 meses consecutivos.`)
        }
    }

    return NextResponse.json({
      valid: errors.length === 0,
      errors,
      details: results,
      clientName: results.find(r => r.companyName)?.companyName || Array.from(names)[0]
    })

  } catch (error) {
    console.error("Validation error:", error)
    return NextResponse.json({ valid: false, errors: ["Erro interno na validação."] }, { status: 500 })
  }
}
