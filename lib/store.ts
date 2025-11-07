// Import opcional de '@vercel/kv' para evitar erro de build quando o pacote não está instalado
// Suporte a múltiplos clientes KV/Redis para fallback robusto
type KvClient = { name: string; get: (key: string) => Promise<any>; set: (key: string, value: any, opts?: { ex?: number }) => Promise<any> }
let kvClients: KvClient[] | undefined

async function buildClients(): Promise<KvClient[]> {
  const clients: KvClient[] = []
  // 1) Upstash Redis via REST (variáveis UPSTASH_*). Em geral é a mais confiável
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN
    if (url && token) {
      const { Redis }: any = await import('@upstash/redis')
      const redis = new Redis({ url, token })
      clients.push({ name: 'upstash-rest',
        async get(key: string) { return await redis.get(key) },
        async set(key: string, value: any, opts?: { ex?: number }) {
          if (opts?.ex) return await redis.set(key, value, { ex: opts.ex })
          return await redis.set(key, value)
        },
      })
    }
  } catch {}
  // 2) Vercel KV via REST
  try {
    const urlKv = process.env.KV_REST_API_URL
    const tokenKv = process.env.KV_REST_API_TOKEN
    if (urlKv && tokenKv) {
      const { Redis }: any = await import('@upstash/redis')
      const redis = new Redis({ url: urlKv, token: tokenKv })
      clients.push({ name: 'vercel-kv-rest',
        async get(key: string) { return await redis.get(key) },
        async set(key: string, value: any, opts?: { ex?: number }) {
          if (opts?.ex) return await redis.set(key, value, { ex: opts.ex })
          return await redis.set(key, value)
        },
      })
    }
  } catch {}
  // 3) Derivado de KV_URL (rediss://default:<token>@<host>)
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
        clients.push({ name: 'kv-url-derived',
          async get(key: string) { return await redis.get(key) },
          async set(key: string, value: any, opts?: { ex?: number }) {
            if (opts?.ex) return await redis.set(key, value, { ex: opts.ex })
            return await redis.set(key, value)
          },
        })
      }
    }
  } catch {}
  // 4) SDK '@vercel/kv' (opcional)
  try {
    const mod: any = await import('@vercel/kv')
    const kv = mod.kv
    clients.push({ name: '@vercel/kv-sdk', get: kv.get.bind(kv), set: kv.set.bind(kv) })
  } catch {}
  return clients
}

async function getKvClients(): Promise<KvClient[]> {
  if (!kvClients) kvClients = await buildClients()
  return kvClients
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
    const id = crypto.randomUUID().slice(0, 8)
    const key = `pgdas:${id}`
    const clients = await getKvClients()
    for (const c of clients) {
      try {
        console.log(`[store] set via ${c.name} key=${key}`)
        await c.set(key, data, { ex: ttlDays * 24 * 60 * 60 })
        console.log(`[store] set OK via ${c.name} key=${key}`)
        return id
      } catch (e) {
        try { console.error(`[store] set FAIL via ${c.name}:`, (e as any)?.message) } catch {}
        continue
      }
    }
  }
  const saved = await saveLocal(data)
  return saved.id
}

export async function getDashboard(id: string): Promise<DashboardData | null> {
  if (kvReady()) {
    const clients = await getKvClients()
    const keys = [`pgdas:${id}`, `dash:${id}`]
    for (const c of clients) {
      for (const key of keys) {
        try {
          console.log(`[store] get via ${c.name} key=${key}`)
          const val = await c.get(key)
          if (val) return val as DashboardData
        } catch (e) {
          try { console.error(`[store] get FAIL via ${c.name}:`, (e as any)?.message) } catch {}
          continue
        }
      }
    }
    const fromLocal = await getLocal(id)
    if (fromLocal) return fromLocal
    return null
  }
  return (await getLocal(id)) || null
}