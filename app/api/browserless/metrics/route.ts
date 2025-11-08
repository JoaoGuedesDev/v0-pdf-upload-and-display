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

function getMetricsUrl(ws: string | undefined, token: string) {
  try {
    if (ws) {
      const replaced = ws.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:')
      const url = new URL(replaced)
      const metricsHost = url.host
      const metricsUrl = `https://${metricsHost}/metrics?token=${encodeURIComponent(token)}`
      return { metricsUrl, metricsHost }
    }
  } catch {}
  const metricsHost = 'production-sfo.browserless.io'
  const metricsUrl = `https://${metricsHost}/metrics?token=${encodeURIComponent(token)}`
  return { metricsUrl, metricsHost }
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

  const { metricsUrl, metricsHost } = getMetricsUrl(ws, token)
  try {
    const res = await fetch(metricsUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (res.status === 200) {
      const data = await res.json().catch(() => null)
      return Response.json({ ok: true, status: 200, endpointMasked, metricsHost, data }, { status: 200 })
    }

    if (res.status === 401) {
      const body = await res.text()
      return Response.json(
        { ok: false, status: 401, code: 'UNAUTHORIZED', endpointMasked, metricsHost, body },
        { status: 401 }
      )
    }

    if (res.status === 403) {
      const body = await res.text()
      const legacyHint = body?.toLowerCase().includes('legacy endpoint')
      const recommended = 'wss://production-sfo.browserless.io?token=SEU_TOKEN'
      return Response.json(
        {
          ok: false,
          status: 403,
          code: 'FORBIDDEN',
          endpointMasked,
          metricsHost,
          body,
          ...(legacyHint
            ? {
                hint:
                  'Endpoint legado detectado. Atualize BROWSER_WS_ENDPOINT para wss://production-sfo.browserless.io?token=SEU_TOKEN.',
                recommended,
              }
            : {}),
        },
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
        metricsHost,
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
        metricsHost,
      },
      { status: 500 }
    )
  }
}