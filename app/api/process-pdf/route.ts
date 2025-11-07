export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { processDasData } from "@/lib/das-parse"
import { createRequire } from "module"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { saveDashboard } from "@/lib/store"

// Configuração opcional para encaminhar ao n8n
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || ""
const N8N_WEBHOOK_TOKEN = process.env.N8N_WEBHOOK_TOKEN || ""
const N8N_BASIC_USER = process.env.N8N_BASIC_USER || ""
const N8N_BASIC_PASS = process.env.N8N_BASIC_PASS || ""
const N8N_TIMEOUT_MS = Number(process.env.N8N_TIMEOUT_MS || 15000)

function buildAuthHeader(): Record<string, string> {
  // Prioridade: Basic Auth se definido; caso contrário, Bearer
  if (N8N_BASIC_USER && N8N_BASIC_PASS) {
    const creds = Buffer.from(`${N8N_BASIC_USER}:${N8N_BASIC_PASS}`).toString("base64")
    return { Authorization: `Basic ${creds}` }
  }
  if (N8N_WEBHOOK_TOKEN) {
    return { Authorization: `Bearer ${N8N_WEBHOOK_TOKEN}` }
  }
  return {}
}

// Garantir runtime Node para acessar Buffer/bibliotecas do servidor

export async function POST(request: NextRequest) {
  try {
    const via = request.nextUrl.searchParams.get("via") || ""
    const hasN8N = !!N8N_WEBHOOK_URL
    // Encaminha ao n8n por padrão quando configurado, exceto se via=local|direct
    const viaParam = via.toLowerCase()
    const useN8N = hasN8N ? (viaParam !== "local" && viaParam !== "direct") : (viaParam === "n8n" && hasN8N)
    const contentType = request.headers.get("content-type") || ""

    // Caso 1: multipart/form-data com arquivo PDF
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("file") as File | null

      if (!file) {
        return NextResponse.json({ error: "Nenhum arquivo foi enviado" }, { status: 400 })
      }

      // Encaminhar diretamente ao n8n se habilitado
      if (useN8N) {
        try {
          const forwardForm = new FormData()
          // Enviar com nome explícito para compatibilidade com parsers de multipart
          forwardForm.append("file", file, (file as File).name || "upload.pdf")
          const headers: Record<string, string> = { ...buildAuthHeader() }
          const controller = new AbortController()
          const to = setTimeout(() => controller.abort(new Error(`timeout ${N8N_TIMEOUT_MS}ms`)), N8N_TIMEOUT_MS)
          const res = await fetch(N8N_WEBHOOK_URL, { method: "POST", body: forwardForm, headers, signal: controller.signal })
          clearTimeout(to)
          const ct = res.headers.get("content-type") || ""
          const bodyText = await res.text()
          if (!res.ok) {
            console.error("[v0-n8n] Erro do n8n:", bodyText.slice(0, 300))
            // Fallback: tenta processamento local
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            const require = createRequire(import.meta.url)
            const pdfParse = require("pdf-parse/lib/pdf-parse.js")
            try {
              const result = await pdfParse(buffer)
              const textLocal = (result?.text || "") as string
              if (!textLocal || textLocal.trim().length === 0) {
                return NextResponse.json({ error: "Falha no n8n e texto vazio ao ler PDF" }, { status: res.status || 502 })
              }
              const parsedLocal = processDasData(textLocal)
              const shareLocal = await persistShare(parsedLocal)
              return NextResponse.json({ ...parsedLocal, dashboardUrl: shareLocal.url, dashboardCode: shareLocal.code })
            } catch (e) {
              return NextResponse.json({ error: "Falha no n8n e erro ao processar localmente", details: e instanceof Error ? e.message : String(e) }, { status: res.status || 502 })
            }
          }
          if (ct.includes("application/json")) {
            try {
              const json = JSON.parse(bodyText)
              // Normalizar sempre para o formato esperado pela UI
              // Se já estiver normalizado (tem 'success'/'dados'), retornamos como está; caso contrário, convertemos.
              const isNormalized = json && typeof json === 'object' && ('success' in json) && ('dados' in json)
              if (isNormalized) {
                return NextResponse.json(json)
              }
              const normalized = processDasData(JSON.stringify(json))
              return NextResponse.json(normalized)
            } catch (e) {
            }
          }
          // Fallback: tentar processar texto bruto como DAS
          const parsed = processDasData(bodyText)
          return NextResponse.json(parsed)
        } catch (e) {
          console.error("[v0-n8n] Erro ao encaminhar ao n8n:", e)
          // Fallback: processamento local quando não foi possível contatar o n8n
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          try {
            const require = createRequire(import.meta.url)
            const pdfParse = require("pdf-parse/lib/pdf-parse.js")
            const result = await pdfParse(buffer)
            const textLocal = (result?.text || "") as string
            if (!textLocal || textLocal.trim().length === 0) {
              return NextResponse.json({ error: "Erro ao contatar n8n e texto do PDF vazio" }, { status: 502 })
            }
            const parsedLocal = processDasData(textLocal)
            const shareLocal = await persistShare(parsedLocal)
            return NextResponse.json({ ...parsedLocal, dashboardUrl: shareLocal.url, dashboardCode: shareLocal.code })
          } catch (err) {
            return NextResponse.json({ error: "Erro ao contatar n8n e falha ao processar localmente", details: err instanceof Error ? err.message : String(err) }, { status: 502 })
          }
        }
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Extrair texto do PDF usando pdf-parse@1.1.1 (CJS, compatível com Node)
      let text: string
      try {
        const require = createRequire(import.meta.url)
        const pdfParse = require("pdf-parse/lib/pdf-parse.js")
        const result = await pdfParse(buffer)
        text = (result?.text || "") as string
      } catch (e) {
        console.error("[v0-debug] Erro ao processar PDF com pdf-parse:", e)
        return NextResponse.json({ error: "Falha ao ler o arquivo PDF." }, { status: 500 })
      }

      if (!text || text.trim().length === 0) {
        return NextResponse.json({ error: "Texto do PDF está vazio" }, { status: 400 })
      }

      const dasData = processDasData(text)
      const share = await persistShare(dasData)
      return NextResponse.json({ ...dasData, dashboardUrl: share.url, dashboardCode: share.code })
    }

    // Caso 2: JSON com campo { text }
    const body = await request.json().catch(() => null)
    const text = body?.text as string | undefined

    if (!text) {
      return NextResponse.json({ error: "Nenhum texto foi enviado" }, { status: 400 })
    }

    if (useN8N) {
      try {
        const headers: Record<string, string> = { "content-type": "application/json", ...buildAuthHeader() }
        const controller = new AbortController()
        const to = setTimeout(() => controller.abort(new Error(`timeout ${N8N_TIMEOUT_MS}ms`)), N8N_TIMEOUT_MS)
        const res = await fetch(N8N_WEBHOOK_URL, { method: "POST", headers, body: JSON.stringify({ text }), signal: controller.signal })
        clearTimeout(to)
        const ct = res.headers.get("content-type") || ""
        const bodyText = await res.text()
        if (!res.ok) {
          console.error("[v0-n8n] Erro do n8n:", bodyText.slice(0, 300))
          // Fallback: processar localmente
          const parsedLocal = processDasData(text)
          const shareLocal = await persistShare(parsedLocal)
          return NextResponse.json({ ...parsedLocal, dashboardUrl: shareLocal.url, dashboardCode: shareLocal.code })
        }
        if (ct.includes("application/json")) {
          try {
            const json = JSON.parse(bodyText)
            const isNormalized = json && typeof json === 'object' && ('success' in json) && ('dados' in json)
            if (isNormalized) {
              return NextResponse.json(json)
            }
            const normalized = processDasData(JSON.stringify(json))
            return NextResponse.json(normalized)
          } catch (e) {
          }
        }
        const parsed = processDasData(bodyText)
        return NextResponse.json(parsed)
      } catch (e) {
        console.error("[v0-n8n] Erro ao encaminhar ao n8n:", e)
        // Fallback: processamento local
        const parsedLocal = processDasData(text)
        const shareLocal = await persistShare(parsedLocal)
        return NextResponse.json({ ...parsedLocal, dashboardUrl: shareLocal.url, dashboardCode: shareLocal.code })
      }
    }
    const dasData = processDasData(text)
    const share = await persistShare(dasData)
    return NextResponse.json({ ...dasData, dashboardUrl: share.url, dashboardCode: share.code })
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

// (mantido no topo) runtime já definido como 'nodejs'

async function persistShare(payload: any): Promise<{ code: string; url: string; filePath: string }> {
  try {
    const id = await saveDashboard(payload)
    const url = `/d/${id}`
    return { code: id, url, filePath: "" }
  } catch (e) {
    console.error("[share] Falha ao persistir resultado:", e)
    // Fallback: gerar ID simples mesmo sem storage
    const code = String(Math.floor(1000 + Math.random() * 9000))
    return { code, url: `/d/${code}`, filePath: "" }
  }
}
