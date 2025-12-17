export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { processDasData } from "@/lib/das-parse"
import { createRequire } from "module"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { saveDashboard, computeOwnerSecret } from "@/lib/store"

// Reusing helper functions from process-pdf/route.ts logic
function getOrigin(req: NextRequest): string {
  try {
    const hs = req.headers
    const host = hs.get('host') || process.env.VERCEL_URL || 'localhost:3000'
    const proto = hs.get('x-forwarded-proto') || 'https'
    const origin = host.includes('http') ? host : `${proto}://${host}`
    return origin
  } catch {
    return typeof process !== 'undefined' && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
  }
}

function ensureAnaliseAliquota(payload: any): any {
  try {
    const p = JSON.parse(JSON.stringify(payload ?? {}))
    const root = p?.dados || p
    if (!root || typeof root !== 'object') return payload
    const calc = root.calculos || (root.calculos = {})
    const aa = root.analise_aliquota || calc.analise_aliquota
    if (aa && typeof aa === 'object') {
      calc.analise_aliquota = aa
    }
    const protocolo = (root as any)?.protocolo ?? (p as any)?.protocolo ?? (p as any)?.dados?.protocolo
    if (protocolo) {
      const meta = root.metadata || (root.metadata = {})
      ;(meta as any).protocolo = protocolo
      ;(root as any).protocolo = protocolo
    }
    return p
  } catch {
    return payload
  }
}

function sanitizePayload(payload: any): any {
  try {
    const p = JSON.parse(JSON.stringify(payload ?? {}))
    // Basic sanitization if needed, similar to original route
    return p
  } catch {
    return payload
  }
}

async function persistShare(payload: any): Promise<{ code: string; url: string; adminUrl: string; filePath: string }> {
  try {
    const id = await saveDashboard(sanitizePayload(ensureAnaliseAliquota(payload)))
    const url = `/d/${id}`
    const adminUrl = `/d/${id}?admin=${computeOwnerSecret(id)}`
    return { code: id, url, adminUrl, filePath: "" }
  } catch (e) {
    console.error("[share] Falha ao persistir resultado:", e)
    const code = String(Math.floor(1000 + Math.random() * 9000))
    const adminUrl = `/d/${code}?admin=${computeOwnerSecret(code)}`
    return { code, url: `/d/${code}`, adminUrl, filePath: "" }
  }
}

function mergeAnnualData(results: any[]) {
  if (!results.length) return null

  // Base structure from the first file (usually January or December)
  // We'll use it as a template and overwrite values
  const base = JSON.parse(JSON.stringify(results[0]))
  const dados = base.dados || base

  // Initialize accumulators
  let totalRpa = 0
  let totalTributos = {
    irpj: 0, csll: 0, cofins: 0, pis: 0, inss_cpp: 0, icms: 0, ipi: 0, iss: 0, total: 0
  }
  
  // Track unique years found
  const years = new Set<string>()

  // Helper to parse numeric values safely
  const val = (v: any) => typeof v === 'number' ? v : (Number(v) || 0)

  // Iterate all results
  for (const res of results) {
    const d = res.dados || res
    
    // Sum Revenue (RPA)
    const rpa = d.discriminativo_receitas?.rpa?.total || 0
    totalRpa += val(rpa)

    // Sum Taxes
    // Need to traverse establishments/activities to sum taxes correctly if available
    // Or use the 'totais' field if reliable
    const totais = d.estabelecimentos?.[0]?.totais?.declarado || {} // Assuming single establishment for now
    if (totais) {
       totalTributos.irpj += val(totais.irpj)
       totalTributos.csll += val(totais.csll)
       totalTributos.cofins += val(totais.cofins)
       totalTributos.pis += val(totais.pis)
       totalTributos.inss_cpp += val(totais.inss_cpp)
       totalTributos.icms += val(totais.icms)
       totalTributos.ipi += val(totais.ipi)
       totalTributos.iss += val(totais.iss)
       totalTributos.total += val(totais.total || (val(totais.irpj) + val(totais.csll) + val(totais.cofins) + val(totais.pis) + val(totais.inss_cpp) + val(totais.icms) + val(totais.ipi) + val(totais.iss)))
    }

    // Extract year
    const periodo = d.cabecalho?.periodo?.apuracao || d.cabecalho?.periodo?.fim
    if (periodo) {
      const year = periodo.split('/')[1]
      if (year) years.add(year)
    }
  }

  // Update base object
  if (dados.discriminativo_receitas?.rpa) {
    dados.discriminativo_receitas.rpa.total = totalRpa
    // Clear monthly breakdown or set to average? Let's leave breakdown as is (likely incorrect) or clear it.
    // Ideally, we would sum MI and ME too.
    // For simplicity, we just update the total RPA which is the most important metric.
  }

  // Update header
  if (dados.cabecalho?.periodo) {
    const yearList = Array.from(years).sort().join(', ')
    dados.cabecalho.periodo.apuracao = `Ano ${yearList}`
    dados.cabecalho.periodo.inicio = `01/${Array.from(years)[0]}`
    dados.cabecalho.periodo.fim = `12/${Array.from(years)[years.size - 1]}`
  }

  // Update totals
  if (dados.estabelecimentos?.[0]?.totais?.declarado) {
    const t = dados.estabelecimentos[0].totais.declarado
    t.irpj = totalTributos.irpj
    t.csll = totalTributos.csll
    t.cofins = totalTributos.cofins
    t.pis = totalTributos.pis
    t.inss_cpp = totalTributos.inss_cpp
    t.icms = totalTributos.icms
    t.ipi = totalTributos.ipi
    t.iss = totalTributos.iss
    t.total = totalTributos.total
  }

  // Update Effective Rate (Calculated)
  if (totalRpa > 0) {
    const effectiveRate = (totalTributos.total / totalRpa) * 100
    if (!dados.calculos) dados.calculos = {}
    dados.calculos.aliquotaEfetiva = effectiveRate
    dados.calculos.aliquotaEfetivaFormatada = effectiveRate.toFixed(2) + '%'
  }

  // Add a flag to indicate this is an annual summary
  dados.isAnnual = true
  dados.processedFilesCount = results.length

  return base
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Content-type must be multipart/form-data" }, { status: 400 })
    }

    const formData = await request.formData()
    const files = formData.getAll("file") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    const processedResults = []

    // Process files sequentially to avoid memory spikes, or parallel if lightweight
    // Local processing is fast, so sequential is fine.
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const require = createRequire(import.meta.url)
        const pdfParse = require("pdf-parse/lib/pdf-parse.js")
        const result = await pdfParse(buffer)
        const text = (result?.text || "") as string
        
        if (text.trim().length > 0) {
          const parsed = processDasData(text)
          processedResults.push(parsed)
        }
      } catch (e) {
        console.error(`Erro ao processar arquivo ${file.name}:`, e)
      }
    }

    if (processedResults.length === 0) {
      return NextResponse.json({ error: "Falha ao processar todos os arquivos" }, { status: 500 })
    }

    const mergedData = mergeAnnualData(processedResults)
    const share = await persistShare(mergedData)
    const origin = getOrigin(request)
    const pdfUrl = `${origin}/api/pdf?path=${encodeURIComponent(share.url)}&type=print&w=1280&scale=1`

    return NextResponse.json({
      ...mergedData,
      dashboardUrl: share.url,
      dashboardAdminUrl: share.adminUrl,
      dashboardCode: share.code,
      pdfUrl,
      message: `Processado ${processedResults.length} arquivos com sucesso.`
    })

  } catch (error) {
    console.error("[annual-process] Erro:", error)
    return NextResponse.json({ error: "Erro interno no processamento anual" }, { status: 500 })
  }
}
