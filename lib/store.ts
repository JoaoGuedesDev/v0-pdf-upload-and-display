// Import opcional de '@vercel/kv' para evitar erro de build quando o pacote não está instalado
let kvClient: any | undefined
async function getKv() {
  if (kvClient) return kvClient
  try {
    const mod: any = await import('@vercel/kv')
    kvClient = mod.kv
    return kvClient
  } catch {
    return undefined
  }
}
import crypto from 'node:crypto'
import { saveDashboard as saveLocal, getDashboard as getLocal } from './storage'

export type DashboardData = any

function kvReady(): boolean {
  const hasRest = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN
  const hasUrl = !!process.env.KV_URL
  return hasRest || hasUrl
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