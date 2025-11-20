import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

type SaveResult = { id: string; storage: 'file'; path: string }

function generateId(): string {
  // ID curto e único (12 chars base36)
  const rnd = crypto.randomBytes(8).toString('hex')
  return (Date.now().toString(36) + rnd).slice(0, 12)
}

export async function saveDashboard(payload: any): Promise<SaveResult> {
  const id = generateId()
  const baseDir = path.resolve('public', 'shared')
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true })
  const filePath = path.join(baseDir, `dash-${id}.json`)
  await fsp.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8')
  return { id, storage: 'file', path: filePath }
}

export async function getDashboard(id: string): Promise<any | null> {
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