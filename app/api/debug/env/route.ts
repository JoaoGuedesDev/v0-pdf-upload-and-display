export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function mask(ws: string) {
  try {
    const replaced = ws.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:')
    const u = new URL(replaced)
    if (u.searchParams.has('token')) u.searchParams.set('token', '***')
    return u.toString()
  } catch {
    return ws ? 'ws://***' : ''
  }
}

export async function GET() {
  const ws = process.env.BROWSER_WS_ENDPOINT || ''
  const bl = process.env.BROWSERLESS_URL || ''
  const base = process.env.NEXT_PUBLIC_BASE_URL || ''
  return Response.json({
    ok: true,
    has_BROWSER_WS_ENDPOINT: !!ws,
    has_BROWSERLESS_URL: !!bl,
    has_NEXT_PUBLIC_BASE_URL: !!base,
    BROWSER_WS_ENDPOINT_masked: mask(ws),
    BROWSERLESS_URL_masked: mask(bl),
    NEXT_PUBLIC_BASE_URL: base,
  })
}