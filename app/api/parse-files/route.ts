export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { processDasData } from "@/lib/das-parse"
import { createRequire } from "module"

// Configuração para encaminhar ao n8n
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "https://valere-tech.up.railway.app/webhook/processar-pgdasd"
const N8N_WEBHOOK_TOKEN = process.env.N8N_WEBHOOK_TOKEN || ""
const N8N_BASIC_USER = process.env.N8N_BASIC_USER || ""
const N8N_BASIC_PASS = process.env.N8N_BASIC_PASS || ""
const N8N_TIMEOUT_MS = Number(process.env.N8N_TIMEOUT_MS || 45000)

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

    for (const file of files) {
      try {
        let parsed: any = null
        
        // Tentar enviar para n8n se configurado
        if (N8N_WEBHOOK_URL) {
            try {
                const forwardForm = new FormData()
                const arrayBuffer = await file.arrayBuffer()
                const blob = new Blob([arrayBuffer], { type: file.type || 'application/pdf' })
                forwardForm.append("file", blob, file.name)
                forwardForm.append("binary", blob, file.name)
                forwardForm.append("filename", file.name)
                
                const headers: Record<string, string> = { ...buildAuthHeader() }
                headers['X-Source'] = 'vercel-annual-parser'
                
                const controller = new AbortController()
                const to = setTimeout(() => controller.abort(new Error(`timeout`)), N8N_TIMEOUT_MS)
                
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
                            if (json && typeof json === 'object' && ('dados' in json)) {
                                parsed = json
                            } else {
                                parsed = processDasData(JSON.stringify(json))
                            }
                         } catch {}
                    }
                    if (!parsed) parsed = processDasData(bodyText)
                }
            } catch (e) {
                console.error(`[parser] Falha ao enviar para n8n (${file.name}):`, e)
            }
        }
        
        // Fallback local
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
        
        if (parsed && parsed.dados) {
            processedResults.push({
                filename: file.name,
                data: parsed.dados
            })
        }
      } catch (e) {
        console.error(`Erro ao processar arquivo ${file.name}:`, e)
      }
    }

    return NextResponse.json({ files: processedResults })

  } catch (error) {
    console.error("[parser] Erro:", error)
    return NextResponse.json({ error: "Erro interno no processamento" }, { status: 500 })
  }
}
