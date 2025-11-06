import { kv } from '@vercel/kv'
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
    await kv.set(key, data, { ex: ttlDays * 24 * 60 * 60 })
    return id
  }
  const saved = await saveLocal(data)
  return saved.id
}

export async function getDashboard(id: string): Promise<DashboardData | null> {
  if (kvReady()) {
    // Tenta primeiro o prefixo novo
    const keyNew = `pgdas:${id}`
    const fromKv = await kv.get<DashboardData>(keyNew)
    if (fromKv) return fromKv
    // Compatibilidade: tentar prefixo legado
    const keyLegacy = `dash:${id}`
    const legacy = await kv.get<DashboardData>(keyLegacy)
    if (legacy) return legacy
    // Fallback: tentar arquivo local quando não houver no KV
    const fromLocal = await getLocal(id)
    if (fromLocal) return fromLocal
    return null
  }
  return (await getLocal(id)) || null
}