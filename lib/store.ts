import { saveDashboard as saveLocal, getDashboard as getLocal } from './storage'
import crypto from 'node:crypto'

export type DashboardData = any

export async function saveDashboard(data: DashboardData, _ttlDays = 7): Promise<string> {
  const saved = await saveLocal(data, _ttlDays)
  return saved.id
}

export async function getDashboard(id: string): Promise<DashboardData | null> {
  return (await getLocal(id)) || null
}

export function computeOwnerSecret(id: string): string {
  const key = process.env.SHARE_SECRET || process.env.NEXT_PUBLIC_SHARE_SECRET || 'dev-secret'
  const h = crypto.createHmac('sha256', key).update(String(id)).digest('hex')
  return h.slice(0, 16)
}
