import { saveDashboard as saveLocal, getDashboard as getLocal } from './storage'

export type DashboardData = any

export async function saveDashboard(data: DashboardData, _ttlDays = 30): Promise<string> {
  const saved = await saveLocal(data)
  return saved.id
}

export async function getDashboard(id: string): Promise<DashboardData | null> {
  return (await getLocal(id)) || null
}