import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
// Import opcional de '@vercel/kv' para evitar erro de build quando o pacote não está instalado
let kvClient: any | undefined
async function getKv() {
  if (kvClient) return kvClient
  // Tenta cliente do Vercel KV
  try {
    const mod: any = await import('@vercel/kv')
    kvClient = mod.kv
    return kvClient
  } catch {}
  // Fallback: Upstash Redis via REST
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN
    if (url && token) {
      const { Redis }: any = await import('@upstash/redis')
      const redis = new Redis({ url, token })
      kvClient = {
        async get(key: string) { return await redis.get(key) },
        async set(key: string, value: any, opts?: { ex?: number }) {
          if (opts?.ex) return await redis.set(key, value, { ex: opts.ex })
          return await redis.set(key, value)
        },
      }
      return kvClient
    }
  } catch {}
  return undefined
}

type SaveResult = { id: string; storage: 'kv' | 'file'; path?: string }

function generateId(): string {
  // ID curto e único (12 chars base36)
  const rnd = crypto.randomBytes(8).toString('hex')
  return (Date.now().toString(36) + rnd).slice(0, 12)
}

function kvReady(): boolean {
  // Verifica Vercel KV e também Upstash Redis
  const hasVercelRest = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN
  const hasVercelUrl = !!process.env.KV_URL
  const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL) && !!(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN)
  return hasVercelRest || hasVercelUrl || hasUpstash
}

export async function saveDashboard(payload: any): Promise<SaveResult> {
  const id = generateId()

  // Tenta KV primeiro
  if (kvReady()) {
    try {
      const kv = await getKv()
      if (kv) {
        await kv.set(`dash:${id}`, payload, { ex: 60 * 60 * 24 * 30 }) // 30 dias
        return { id, storage: 'kv' }
      }
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
      const kv = await getKv()
      if (kv) {
        const value = await kv.get(`dash:${id}`)
        if (value) return value as any
      }
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