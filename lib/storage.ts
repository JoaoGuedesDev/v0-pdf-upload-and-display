import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { kv } from '@vercel/kv'

type SaveResult = { id: string; storage: 'kv' | 'file'; path?: string }

function generateId(): string {
  // ID curto e único (12 chars base36)
  const rnd = crypto.randomBytes(8).toString('hex')
  return (Date.now().toString(36) + rnd).slice(0, 12)
}

function kvReady(): boolean {
  // Verifica envs mínimas do KV REST; o cliente também funciona com KV_URL
  const hasRest = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN
  const hasUrl = !!process.env.KV_URL
  return hasRest || hasUrl
}

export async function saveDashboard(payload: any): Promise<SaveResult> {
  const id = generateId()

  // Tenta KV primeiro
  if (kvReady()) {
    try {
      await kv.set(`dash:${id}`, payload, { ex: 60 * 60 * 24 * 30 }) // 30 dias
      return { id, storage: 'kv' }
    } catch (e) {
      console.error('[storage] KV set falhou, usando fallback em arquivo:', e)
    }
  }

  // Fallback: salvar em public/shared/dash-<id>.json
  const baseDir = path.resolve('public', 'shared')
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true })
  const filePath = path.join(baseDir, `dash-${id}.json`)
  await fsp.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8')
  return { id, storage: 'file', path: filePath }
}

export async function getDashboard(id: string): Promise<any | null> {
  // Tenta KV
  if (kvReady()) {
    try {
      const value = await kv.get<any>(`dash:${id}`)
      if (value) return value
    } catch (e) {
      console.error('[storage] KV get falhou, tentando arquivo:', e)
    }
  }

  // Fallback arquivo
  const baseDir = path.resolve('public', 'shared')
  // aceita "id" puro (ex.: 2331) ou com prefixo dash-
  const name = id.startsWith('dash-') ? id : `dash-${id}`
  const filePath = path.join(baseDir, `${name}.json`)
  if (!fs.existsSync(filePath)) return null
  const json = await fsp.readFile(filePath, 'utf-8')
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}