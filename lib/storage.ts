import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

async function kvSet(key: string, value: string): Promise<boolean> {
  try {
    const url = process.env.KV_REST_API_URL || ''
    const token = process.env.KV_REST_API_TOKEN || ''
    if (url && token) {
      const res = await fetch(`${url.replace(/\/$/, '')}/set/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })
      return res.ok
    }
  } catch {}
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL || ''
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN || ''
    if (url && token) {
      const res = await fetch(`${url.replace(/\/$/, '')}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      return res.ok
    }
  } catch {}
  return false
}

async function kvGet(key: string): Promise<string | null> {
  try {
    const url = process.env.KV_REST_API_URL || ''
    const token = process.env.KV_REST_API_TOKEN || ''
    if (url && token) {
      const res = await fetch(`${url.replace(/\/$/, '')}/get/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) return null
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const j = await res.json().catch(() => null)
        const v = j?.value ?? j?.result ?? null
        return typeof v === 'string' ? v : (v ? JSON.stringify(v) : null)
      }
      return await res.text()
    }
  } catch {}
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL || ''
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN || ''
    if (url && token) {
      const res = await fetch(`${url.replace(/\/$/, '')}/get/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) return null
      const txt = await res.text().catch(() => '')
      if (!txt) return null
      try {
        const j = JSON.parse(txt)
        const v = j?.result ?? j?.value ?? null
        return typeof v === 'string' ? v : (v ? JSON.stringify(v) : null)
      } catch {
        return txt
      }
    }
  } catch {}
  return null
}

type SaveResult = { id: string; storage: 'file'; path: string }

function generateId(): string {
  // ID curto e único (12 chars base36)
  const rnd = crypto.randomBytes(8).toString('hex')
  return (Date.now().toString(36) + rnd).slice(0, 12)
}

export async function saveDashboard(payload: any): Promise<SaveResult> {
  const id = generateId()
  const key = `dash:${id}`
  const value = JSON.stringify(payload, null, 2)
  const ok = await kvSet(key, value)
  if (ok) return { id, storage: 'file', path: key }
  const baseDir = path.resolve('public', 'shared')
  try { if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true }) } catch {}
  const filePath = path.join(baseDir, `dash-${id}.json`)
  await fsp.writeFile(filePath, value, 'utf-8')
  return { id, storage: 'file', path: filePath }
}

export async function getDashboard(id: string): Promise<any | null> {
  const key = `dash:${id.replace(/^dash-/, '')}`
  const v = await kvGet(key)
  if (v) {
    try { return JSON.parse(v) } catch { return null }
  }
  const baseDir = path.resolve('public', 'shared')
  const name = id.startsWith('dash-') ? id : `dash-${id}`
  const filePath = path.join(baseDir, `${name}.json`)
  if (fs.existsSync(filePath)) {
    const json = await fsp.readFile(filePath, 'utf-8')
    try { return JSON.parse(json) } catch { return null }
  }
  return null
}