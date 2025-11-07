import { Redis } from '@upstash/redis'

function deriveFromKvUrl(kvUrl?: string): { url?: string; token?: string } {
  if (!kvUrl || !kvUrl.startsWith('rediss://')) return {}
  const match = kvUrl.match(/^rediss:\/\/default:([^@]+)@([^:/]+)(?::\d+)?/)
  const token = match?.[1]
  const host = match?.[2]
  const url = host ? `https://${host}` : undefined
  return { url, token }
}

const urlFromKvRest = process.env.KV_REST_API_URL
const tokenFromKvRest = process.env.KV_REST_API_TOKEN

const { url: urlFromKvUrl, token: tokenFromKvUrl } = deriveFromKvUrl(process.env.KV_URL)

const urlFromUpstash = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL
const tokenFromUpstash = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN

const url = urlFromKvRest || urlFromKvUrl || urlFromUpstash
const token = tokenFromKvRest || tokenFromKvUrl || tokenFromUpstash

if (!url || !token) {
  throw new Error('Redis REST não configurado: defina KV_REST_API_URL + KV_REST_API_TOKEN, ou KV_URL, ou UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN')
}

export const redis = new Redis({ url, token })