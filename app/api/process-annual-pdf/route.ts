export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { processDasData } from "@/lib/das-parse"
import { createRequire } from "module"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { saveDashboard, computeOwnerSecret } from "@/lib/store"
import { saveUploadedFile } from "@/lib/file-storage"

// Configuração para encaminhar ao n8n
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "https://valere-tech.up.railway.app/webhook/processar-pgdasd"
const N8N_WEBHOOK_TOKEN = process.env.N8N_WEBHOOK_TOKEN || ""
const N8N_BASIC_USER = process.env.N8N_BASIC_USER || ""
const N8N_BASIC_PASS = process.env.N8N_BASIC_PASS || ""
const N8N_TIMEOUT_MS = Number(process.env.N8N_TIMEOUT_MS || 45000)
const N8N_FALLBACK_WEBHOOK_URL = process.env.N8N_FALLBACK_WEBHOOK_URL || "https://valere-tech.up.railway.app/webhook/processar-pgdasd"

function buildAuthHeader(): Record<string, string> {
  if (N8N_BASIC_USER && N8N_BASIC_PASS) {
    const creds = Buffer.from(`${N8N_BASIC_USER}:${N8N_BASIC_PASS}`).toString("base64")
    return { Authorization: `Basic ${creds}` }
  }
  if (N8N_WEBHOOK_TOKEN) {
    return { Authorization: `Bearer ${N8N_WEBHOOK_TOKEN}` }
  }
  return {}
}

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

    // Process files sequentially to send to n8n one by one
    for (const file of files) {
      try {
        let parsed: any = null
        
        // Tentar enviar para n8n se configurado
        if (N8N_WEBHOOK_URL) {
            try {
                const forwardForm = new FormData()
                // Criar Blob a partir do arquivo para enviar
                const arrayBuffer = await file.arrayBuffer()
                const blob = new Blob([arrayBuffer], { type: file.type || 'application/pdf' })
                forwardForm.append("file", blob, file.name)
                forwardForm.append("binary", blob, file.name)
                forwardForm.append("filename", file.name)
                
                const headers: Record<string, string> = { ...buildAuthHeader() }
                headers['X-Source'] = 'vercel-annual'
                headers['User-Agent'] = 'pgdasd-dashboard/1.0'
                
                // Timeout controller
                const controller = new AbortController()
                const to = setTimeout(() => controller.abort(new Error(`timeout ${N8N_TIMEOUT_MS}ms`)), N8N_TIMEOUT_MS)
                
                const res = await fetch(N8N_WEBHOOK_URL, {
                    method: "POST",
                    body: forwardForm,
                    headers,
                    signal: controller.signal,
                    cache: 'no-store'
                })
                clearTimeout(to)
                
                if (res.ok) {
                    const bodyText = await res.text()
                    const ct = res.headers.get("content-type") || ""
                    
                    if (ct.includes("application/json")) {
                         try {
                            const json = JSON.parse(bodyText)
                            // Se o n8n retornar o objeto normalizado (tem 'dados')
                            if (json && typeof json === 'object' && ('dados' in json)) {
                                parsed = json
                            } else {
                                // Se retornar JSON mas não normalizado, processar como se fosse o texto do PDF envelopado ou similar
                                parsed = processDasData(JSON.stringify(json))
                            }
                         } catch {}
                    }
                    
                    if (!parsed) {
                        // Tentar processar como texto (n8n retornou texto do PDF)
                        parsed = processDasData(bodyText)
                    }
                } else {
                    console.warn(`[annual] N8N retornou erro ${res.status} para ${file.name}`)
                }
            } catch (e) {
                console.error(`[annual] Falha ao enviar para n8n (${file.name}):`, e)
            }
        }
        
        // Fallback: processamento local se n8n falhou ou não retornou dados
        if (!parsed || !parsed.dados) {
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            const require = createRequire(import.meta.url)
            const pdfParse = require("pdf-parse/lib/pdf-parse.js")
            const result = await pdfParse(buffer)
            const text = (result?.text || "") as string
            
            if (text.trim().length > 0) {
              parsed = processDasData(text)
            }
        }
        
        if (!parsed || !parsed.dados) {
            console.warn(`Arquivo ${file.name} não contém dados estruturados válidos.`)
            continue
        }

        // Store in format compatible with AnnualDashboard (MonthlyFile[])
        processedResults.push({
             filename: file.name,
             data: parsed.dados // Unwrap 'dados' to match MonthlyFile type
        })

        // Save file to organized storage
        const cnpj = parsed.dados.identificacao?.cnpj || 'unknown'
        const period = parsed.dados.identificacao?.periodoApuracao || parsed.dados.identificacao?.periodo?.fim || 'unknown'
        await saveUploadedFile(file, 'annual', cnpj, period)
      } catch (e) {
        console.error(`Erro ao processar arquivo ${file.name}:`, e)
      }
    }

    if (processedResults.length === 0) {
      return NextResponse.json({ error: "Nenhum dado pôde ser extraído dos arquivos" }, { status: 400 })
    }

    // --- Validation Safeguards (Travas de Segurança) ---
    
    const parseDate = (d: string) => {
        if (!d) return 0
        const parts = d.split(' ')[0].split('/') // "MM/YYYY" or "DD/MM/YYYY"
        if (parts.length === 2) return parseInt(parts[1]) * 12 + parseInt(parts[0]) // MM/YYYY
        if (parts.length === 3) return parseInt(parts[2]) * 12 + parseInt(parts[1]) // DD/MM/YYYY
        return 0
    }

    // Determine the most common CNPJ (Majority Vote)
    const cnpjCounts: Record<string, number> = {}
    processedResults.forEach(f => {
        const c = f.data.identificacao?.cnpj
        if (c) cnpjCounts[c] = (cnpjCounts[c] || 0) + 1
    })
    
    let targetCnpj = ''
    let maxCount = 0
    for (const [c, count] of Object.entries(cnpjCounts)) {
        if (count > maxCount) {
            maxCount = count
            targetCnpj = c
        }
    }
    
    const targetCompanyName = processedResults.find(f => f.data.identificacao?.cnpj === targetCnpj)?.data.identificacao?.razaoSocial || 'Empresa Desconhecida'

    // Validate each file
    const validationResults = processedResults.map(f => {
        const issues: string[] = []
        const fCnpj = f.data.identificacao?.cnpj
        const fPeriod = f.data.identificacao?.periodoApuracao
        const dateVal = parseDate(fPeriod)

        if (fCnpj !== targetCnpj) {
            issues.push(`CNPJ incorreto: ${fCnpj} (Esperado: ${targetCnpj} - ${targetCompanyName})`)
        }
        
        return {
            filename: f.filename,
            period: fPeriod,
            dateVal,
            cnpj: fCnpj,
            companyName: f.data.identificacao?.razaoSocial,
            isValid: issues.length === 0,
            issues
        }
    })

    const hasCnpjErrors = validationResults.some(r => !r.isValid)
    const validFiles = validationResults.filter(r => r.isValid)
    
    // Sort valid files to check sequence
    validFiles.sort((a, b) => a.dateVal - b.dateVal)

    const sequenceErrors: string[] = []
    if (validFiles.length > 0) {
        for (let i = 0; i < validFiles.length - 1; i++) {
            const curr = validFiles[i]
            const next = validFiles[i+1]
            if (next.dateVal - curr.dateVal !== 1) {
                sequenceErrors.push(`Salto temporal detectado entre ${curr.period} e ${next.period}`)
            }
        }
    }

    // Global Checks
    const errors: string[] = []
    
    if (processedResults.length !== 12) {
        errors.push(`Quantidade incorreta de arquivos: ${processedResults.length} (Exigido: 12)`)
    }
    
    if (hasCnpjErrors) {
        errors.push("Arquivos de empresas diferentes detectados.")
    }
    
    if (sequenceErrors.length > 0) {
        errors.push("Sequência de meses descontínua.")
    }

    // If any error exists, return detailed 422
    if (errors.length > 0) {
        return NextResponse.json({
            error: "Erros de validação encontrados",
            code: "VALIDATION_ERROR",
            summary: errors,
            details: {
                expectedCount: 12,
                processedCount: processedResults.length,
                targetCnpj,
                targetCompanyName,
                files: validationResults.map(r => ({
                    filename: r.filename,
                    status: r.isValid ? 'valid' : 'invalid',
                    reason: r.issues.join(', '),
                    period: r.period,
                    cnpj: r.cnpj,
                    company: r.companyName
                })),
                sequenceErrors
            }
        }, { status: 422 })
    }

    // If passed validation, sort original results by date
    processedResults.sort((a, b) => {
        const da = parseDate(a.data.identificacao?.periodoApuracao || '')
        const db = parseDate(b.data.identificacao?.periodoApuracao || '')
        return da - db
    })

    // ---------------------------------------------------

    // Save as annual collection instead of merging
    const finalData = {
        isAnnual: true,
        files: processedResults,
        createdAt: new Date().toISOString()
    }
    
    const { code, url, adminUrl } = await persistShare(finalData)
    const origin = getOrigin(request)
    const pdfUrl = `${origin}/api/pdf?path=${encodeURIComponent(url)}&type=print&w=1280&scale=1`

    return NextResponse.json({
      ...finalData,
      dashboardUrl: url,
      dashboardAdminUrl: adminUrl,
      dashboardCode: code,
      pdfUrl,
      message: `Processado ${processedResults.length} arquivos com sucesso.`
    })

  } catch (error) {
    console.error("[annual-process] Erro:", error)
    return NextResponse.json({ error: "Erro interno no processamento anual" }, { status: 500 })
  }
}
