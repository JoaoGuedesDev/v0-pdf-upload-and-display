export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function maskWs(ws?: string, keepTail: number = 8) {
  if (!ws) return 'ws://<no-endpoint>'
  try {
    const replaced = ws.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:')
    const url = new URL(replaced)
    const token = url.searchParams.get('token') || ''
    const maskedToken = token
      ? `${token.slice(0, 4)}...${token.slice(-keepTail)}`
      : '<no-token>'
    url.searchParams.set('token', maskedToken)
    return url.toString().replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')
  } catch {
    return '<invalid-ws-endpoint>'
  }
}

function extractTokenFromWs(ws?: string): string | null {
  if (!ws) return null
  try {
    const replaced = ws.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:')
    const url = new URL(replaced)
    return url.searchParams.get('token')
  } catch {
    return null
  }
}

export async function GET() {
  const ws = process.env.BROWSER_WS_ENDPOINT
  const token = extractTokenFromWs(ws || '')

  const endpointMasked = maskWs(ws || '')
  console.log('[api/browserless/metrics] Validando token via metrics:', endpointMasked)

  if (!token) {
    return Response.json(
      {
        ok: false,
        status: 400,
        message:
          'BROWSER_WS_ENDPOINT ausente ou sem token. Configure wss://chrome.browserless.io?token=SEU_TOKEN.',
        endpointMasked,
      },
      { status: 400 }
    )
  }

  const url = `https://chrome.browserless.io/metrics?token=${encodeURIComponent(token)}`
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (res.status === 200) {
      const data = await res.json().catch(() => null)
      return Response.json({ ok: true, status: 200, endpointMasked, data }, { status: 200 })
    }

    if (res.status === 401) {
      const body = await res.text()
      return Response.json(
        { ok: false, status: 401, code: 'UNAUTHORIZED', endpointMasked, body },
        { status: 401 }
      )
    }

    if (res.status === 403) {
      const body = await res.text()
      return Response.json(
        { ok: false, status: 403, code: 'FORBIDDEN', endpointMasked, body },
        { status: 403 }
      )
    }

    const body = await res.text()
    return Response.json(
      {
        ok: false,
        status: res.status,
        message: 'Erro ao consultar metrics no Browserless',
        endpointMasked,
        body,
      },
      { status: 502 }
    )
  } catch (err: any) {
    const message = err?.message || 'Erro desconhecido ao consultar metrics'
    return Response.json(
      {
        ok: false,
        status: 500,
        message,
        endpointMasked,
      },
      { status: 500 }
    )
  }
}