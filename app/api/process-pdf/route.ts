export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { processDasData } from "@/lib/das-parse"
import { createRequire } from "module"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { saveDashboard, computeOwnerSecret } from "@/lib/store"

// Configuração para encaminhar ao n8n (default apontando para seu endpoint)
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "https://valere-tech.up.railway.app/webhook/processar-pgdasd"
const N8N_WEBHOOK_TOKEN = process.env.N8N_WEBHOOK_TOKEN || ""
const N8N_BASIC_USER = process.env.N8N_BASIC_USER || ""
const N8N_BASIC_PASS = process.env.N8N_BASIC_PASS || ""
const N8N_TIMEOUT_MS = Number(process.env.N8N_TIMEOUT_MS || 45000)

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
    const hasN8N = !!N8N_WEBHOOK_URL
    const useN8N = hasN8N
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
          // Compatível com environments serverless: usa Blob com nome
          const arrayBuffer = await file.arrayBuffer()
          const blob = new Blob([arrayBuffer], { type: (file as File).type || 'application/pdf' })
          const fname = (file as File).name || 'upload.pdf'
          forwardForm.append("file", blob, fname)
          forwardForm.append("binary", blob, fname)
          forwardForm.append("filename", fname)
          const headers: Record<string, string> = { ...buildAuthHeader() }
          headers['X-Source'] = 'vercel'
          headers['User-Agent'] = 'pgdasd-dashboard/1.0'
          headers['X-Request-ID'] = crypto.randomUUID?.() || Math.random().toString(36).slice(2)
          // Tentativa 0: probe
          let probeOk = false
          try {
            const controllerProbe = new AbortController()
            const toProbe = setTimeout(() => controllerProbe.abort(new Error(`timeout ${Math.min(N8N_TIMEOUT_MS, 5000)}ms`)), Math.min(N8N_TIMEOUT_MS, 5000))
            const probe = await fetch(N8N_WEBHOOK_URL, { method: "GET", headers: { ...headers, 'X-Health-Check': '1' }, signal: controllerProbe.signal })
            clearTimeout(toProbe)
            probeOk = probe.ok || probe.status < 500
          } catch {}
          // Tentativa 1: multipart/form-data
          let controller = new AbortController()
          let to = setTimeout(() => controller.abort(new Error(`timeout ${N8N_TIMEOUT_MS}ms`)), N8N_TIMEOUT_MS)
          let res = await fetch(N8N_WEBHOOK_URL, { method: "POST", body: forwardForm, headers, signal: controller.signal, cache: 'no-store' as any })
          clearTimeout(to)
          if (!res.ok) {
            // Tentativa 2: binário puro
            controller = new AbortController()
            to = setTimeout(() => controller.abort(new Error(`timeout ${N8N_TIMEOUT_MS}ms`)), N8N_TIMEOUT_MS)
            res = await fetch(N8N_WEBHOOK_URL, {
              method: "POST",
              body: Buffer.from(arrayBuffer),
              headers: { ...headers, 'Content-Type': 'application/pdf', 'X-Filename': fname },
              signal: controller.signal,
            } as any)
            clearTimeout(to)
          }
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
                return NextResponse.json({ error: "Falha no n8n e texto vazio ao ler PDF", n8nReachable: probeOk, n8nStatus: res.status, n8nBody: bodyText.slice(0, 200) }, { status: res.status || 502 })
              }
              const parsedLocal = processDasData(textLocal)
              const shareLocal = await persistShare(parsedLocal)
              const origin = getOrigin(request)
              const pdfUrl = `${origin}/api/pdf?path=${encodeURIComponent(shareLocal.url)}&type=print&w=1280&scale=1`
              return NextResponse.json({ ...parsedLocal, dashboardUrl: shareLocal.url, dashboardAdminUrl: shareLocal.adminUrl, dashboardCode: shareLocal.code, pdfUrl, n8nReachable: probeOk, n8nStatus: res.status, n8nBody: bodyText.slice(0, 200) })
            } catch (e) {
              return NextResponse.json({ error: "Falha no n8n e erro ao processar localmente", details: e instanceof Error ? e.message : String(e), n8nReachable: probeOk, n8nStatus: res.status, n8nBody: bodyText.slice(0, 200) }, { status: res.status || 502 })
            }
          }
          if (ct.includes("application/json")) {
            try {
              const parsed = JSON.parse(bodyText)
              const unwrap = (x: any): any => {
                if (!x) return x
                if (Array.isArray(x)) {
                  const first = x[0]
                  return unwrap(first)
                }
                if (typeof x === 'object') {
                  if ('json' in x) return unwrap((x as any).json)
                  if ('data' in x) return unwrap((x as any).data)
                }
                return x
              }
              const json = unwrap(parsed)
              const isNormalized = json && typeof json === 'object' && ('success' in json) && ('dados' in json)
              if (isNormalized) {
                const share = await persistShare(json)
                const origin = getOrigin(request)
                const pdfUrl = `${origin}/api/pdf?path=${encodeURIComponent(share.url)}&type=print&w=1280&scale=1`
                return NextResponse.json({ ...json, dashboardUrl: share.url, dashboardAdminUrl: share.adminUrl, dashboardCode: share.code, pdfUrl })
              }
              const normalized = processDasData(JSON.stringify(json))
              try {
                const src: any = json || {}
                const root = (normalized as any)?.dados || normalized
                if (root && typeof root === 'object') {
                  const calc = root.calculos || (root.calculos = {})
                  const aa = src?.analise_aliquota || src?.calculos?.analise_aliquota
                  if (aa && typeof aa === 'object') calc.analise_aliquota = aa
                  const protocolo = src?.protocolo
                  if (protocolo) {
                    const meta = root.metadata || (root.metadata = {})
                    ;(meta as any).protocolo = protocolo
                    ;(root as any).protocolo = protocolo
                  }
                }
              } catch {}
              const share = await persistShare(normalized)
              const origin = getOrigin(request)
              const pdfUrl = `${origin}/api/pdf?path=${encodeURIComponent(share.url)}&type=print&w=1280&scale=1`
              return NextResponse.json({ ...normalized, dashboardUrl: share.url, dashboardAdminUrl: share.adminUrl, dashboardCode: share.code, pdfUrl })
            } catch (e) {
            }
          }
          // Fallback: tentar processar texto bruto como DAS
          const parsed = processDasData(bodyText)
          const share = await persistShare(parsed)
          const origin = getOrigin(request)
          const pdfUrl = `${origin}/api/pdf?path=${encodeURIComponent(share.url)}&type=print&w=1280&scale=1`
          return NextResponse.json({ ...parsed, dashboardUrl: share.url, dashboardAdminUrl: share.adminUrl, dashboardCode: share.code, pdfUrl })
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
              const origin = getOrigin(request)
              const pdfUrl = `${origin}/api/pdf?path=${encodeURIComponent(shareLocal.url)}&type=print&w=1280&scale=1`
              return NextResponse.json({ ...parsedLocal, dashboardUrl: shareLocal.url, dashboardAdminUrl: shareLocal.adminUrl, dashboardCode: shareLocal.code, pdfUrl })
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
      const origin = getOrigin(request)
      const pdfUrl = `${origin}/api/pdf?path=${encodeURIComponent(share.url)}&type=print&w=1280&scale=1`
      return NextResponse.json({ ...dasData, dashboardUrl: share.url, dashboardCode: share.code, pdfUrl })
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
          const origin = getOrigin(request)
          const pdfUrl = `${origin}/api/pdf?path=${encodeURIComponent(shareLocal.url)}&type=print&w=1280&scale=1`
          return NextResponse.json({ ...parsedLocal, dashboardUrl: shareLocal.url, dashboardAdminUrl: shareLocal.adminUrl, dashboardCode: shareLocal.code, pdfUrl })
        }
        if (ct.includes("application/json")) {
          try {
            const json = JSON.parse(bodyText)
            const isNormalized = json && typeof json === 'object' && ('success' in json) && ('dados' in json)
            if (isNormalized) {
              const share = await persistShare(json)
              const origin = getOrigin(request)
              const pdfUrl = `${origin}/api/pdf?path=${encodeURIComponent(share.url)}&type=print&w=1280&scale=1`
              return NextResponse.json({ ...json, dashboardUrl: share.url, dashboardAdminUrl: share.adminUrl, dashboardCode: share.code, pdfUrl })
            }
            const normalized = processDasData(JSON.stringify(json))
            try {
              const src: any = json || {}
              const root = (normalized as any)?.dados || normalized
              if (root && typeof root === 'object') {
                const calc = root.calculos || (root.calculos = {})
                const aa = src?.analise_aliquota || src?.calculos?.analise_aliquota
                if (aa && typeof aa === 'object') calc.analise_aliquota = aa
                const protocolo = src?.protocolo
                if (protocolo) {
                  const meta = root.metadata || (root.metadata = {})
                  ;(meta as any).protocolo = protocolo
                  ;(root as any).protocolo = protocolo
                }
              }
            } catch {}
            const share = await persistShare(normalized)
            const origin = getOrigin(request)
            const pdfUrl = `${origin}/api/pdf?path=${encodeURIComponent(share.url)}&type=print&w=1280&scale=1`
            return NextResponse.json({ ...normalized, dashboardUrl: share.url, dashboardAdminUrl: share.adminUrl, dashboardCode: share.code, pdfUrl })
          } catch (e) {
          }
        }
        const parsed = processDasData(bodyText)
        const share = await persistShare(parsed)
        const origin = getOrigin(request)
        const pdfUrl = `${origin}/api/pdf?path=${encodeURIComponent(share.url)}&type=print&w=1280&scale=1`
        return NextResponse.json({ ...parsed, dashboardUrl: share.url, dashboardAdminUrl: share.adminUrl, dashboardCode: share.code, pdfUrl })
      } catch (e) {
        console.error("[v0-n8n] Erro ao encaminhar ao n8n:", e)
        // Fallback: processamento local
        const parsedLocal = processDasData(text)
        const shareLocal = await persistShare(parsedLocal)
        return NextResponse.json({ ...parsedLocal, dashboardUrl: shareLocal.url, dashboardAdminUrl: shareLocal.adminUrl, dashboardCode: shareLocal.code })
      }
    }
    const dasData = processDasData(text)
    const share = await persistShare(dasData)
    const origin = getOrigin(request)
    const pdfUrl = `${origin}/api/pdf?path=${encodeURIComponent(share.url)}&type=print&w=1280&scale=1`
    return NextResponse.json({ ...dasData, dashboardUrl: share.url, dashboardAdminUrl: share.adminUrl, dashboardCode: share.code, pdfUrl })
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

async function persistShare(payload: any): Promise<{ code: string; url: string; adminUrl: string; filePath: string }> {
  try {
    const id = await saveDashboard(sanitizePayload(ensureAnaliseAliquota(payload)))
    const url = `/d/${id}`
    const adminUrl = `/d/${id}?admin=${computeOwnerSecret(id)}`
    return { code: id, url, adminUrl, filePath: "" }
  } catch (e) {
    console.error("[share] Falha ao persistir resultado:", e)
    try {
      const code = String(Math.floor(1000 + Math.random() * 9000))
      const baseDir = path.resolve('public', 'shared')
      try { fs.mkdirSync(baseDir, { recursive: true }) } catch {}
      const filePath = path.join(baseDir, `dash-${code}.json`)
      try {
        fs.writeFileSync(filePath, JSON.stringify(sanitizePayload(ensureAnaliseAliquota(payload)) ?? {}, null, 2), 'utf-8')
        const adminUrl = `/d/${code}?admin=${computeOwnerSecret(code)}`
        return { code, url: `/d/${code}`, adminUrl, filePath }
      } catch (err) {
        console.error('[share] Fallback write failed:', err)
        const adminUrl = `/d/${code}?admin=${computeOwnerSecret(code)}`
        return { code, url: `/d/${code}`, adminUrl, filePath: '' }
      }
    } catch {
      const code = String(Math.floor(1000 + Math.random() * 9000))
      const adminUrl = `/d/${code}?admin=${computeOwnerSecret(code)}`
      return { code, url: `/d/${code}`, adminUrl, filePath: "" }
    }
  }
}

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
    const paths: string[][] = [
      ['dados','calculos','aliquotaEfetiva'],
      ['dados','calculos','aliquotaEfetivaFormatada'],
      ['dados','calculos','margemLiquida'],
      ['calculos','aliquotaEfetiva'],
      ['calculos','aliquotaEfetivaFormatada'],
      ['calculos','margemLiquida'],
    ]
    for (const path of paths) {
      let obj: any = p
      for (let i = 0; i < path.length - 1; i++) {
        obj = obj?.[path[i]]
        if (!obj) break
      }
      const key = path[path.length - 1]
      if (obj && typeof obj === 'object' && key in obj) {
        delete obj[key]
      }
    }
    return p
  } catch {
    return payload
  }
}
