// Import opcional de '@vercel/kv' para evitar erro de build quando o pacote não está instalado
let kvClient: any | undefined
async function getKv() {
  if (kvClient) return kvClient
  // Tenta cliente do Vercel KV (SDK)
  try {
    const mod: any = await import('@vercel/kv')
    kvClient = mod.kv
    return kvClient
  } catch {}
  // Fallback: Vercel KV via REST (mesmos endpoints do Upstash)
  try {
    const urlKv = process.env.KV_REST_API_URL
    const tokenKv = process.env.KV_REST_API_TOKEN
    if (urlKv && tokenKv) {
      const { Redis }: any = await import('@upstash/redis')
      const redis = new Redis({ url: urlKv, token: tokenKv })
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
  // Fallback: derivar de KV_URL (rediss://default:<token>@<host>:<port>)
  try {
    const kvUrl = process.env.KV_URL
    if (kvUrl && kvUrl.startsWith('rediss://')) {
      const match = kvUrl.match(/^rediss:\/\/default:([^@]+)@([^:/]+)(?::\d+)?/)
      const token = match?.[1]
      const host = match?.[2]
      if (token && host) {
        const baseUrl = `https://${host}`
        const { Redis }: any = await import('@upstash/redis')
        const redis = new Redis({ url: baseUrl, token })
        kvClient = {
          async get(key: string) { return await redis.get(key) },
          async set(key: string, value: any, opts?: { ex?: number }) {
            if (opts?.ex) return await redis.set(key, value, { ex: opts.ex })
            return await redis.set(key, value)
          },
        }
        return kvClient
      }
    }
  } catch {}
  // Fallback: Upstash Redis via REST (variáveis UPSTASH_*)
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN
    if (url && token) {
      const { Redis }: any = await import('@upstash/redis')
      const redis = new Redis({ url, token })
      kvClient = {
        async get(key: string) { return await redis.get(key) },
        async set(key: string, value: any, opts?: { ex?: number }) {
          // Upstash aceita { ex } em segundos
          if (opts?.ex) return await redis.set(key, value, { ex: opts.ex })
          return await redis.set(key, value)
        },
      }
      return kvClient
    }
  } catch {}
  return undefined
}
import crypto from 'node:crypto'
import { saveDashboard as saveLocal, getDashboard as getLocal } from './storage'

export type DashboardData = any

function kvReady(): boolean {
  const hasVercelRest = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN
  const hasVercelUrl = !!process.env.KV_URL
  const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL) && !!(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN)
  return hasVercelRest || hasVercelUrl || hasUpstash
}

export async function saveDashboard(data: DashboardData, ttlDays = 30): Promise<string> {
  if (kvReady()) {
    const id = crypto.randomUUID().slice(0, 8) // slug curto
    const key = `pgdas:${id}`
    const kv = await getKv()
    if (kv) {
      await kv.set(key, data, { ex: ttlDays * 24 * 60 * 60 })
      return id
    }
  }
  const saved = await saveLocal(data)
  return saved.id
}

export async function getDashboard(id: string): Promise<DashboardData | null> {
  if (kvReady()) {
    // Tenta primeiro o prefixo novo
    const keyNew = `pgdas:${id}`
    const kv = await getKv()
    if (kv) {
      const fromKv = await kv.get(keyNew)
      if (fromKv) return fromKv as DashboardData
    }
    // Compatibilidade: tentar prefixo legado
    const keyLegacy = `dash:${id}`
    if (kv) {
      const legacy = await kv.get(keyLegacy)
      if (legacy) return legacy as DashboardData
    }
    // Fallback: tentar arquivo local quando não houver no KV
    const fromLocal = await getLocal(id)
    if (fromLocal) return fromLocal
    return null
  }
  return (await getLocal(id)) || null
}