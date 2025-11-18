jest.mock('next/server', () => {
  class SimpleResponse {
    status: number
    headers: Map<string, string>
    constructor(_body?: any, init?: any) {
      this.status = init?.status || 200
      this.headers = new Map<string, string>()
      const hdrs = init?.headers || {}
      Object.keys(hdrs).forEach(k => this.headers.set(k, hdrs[k]))
    }
  }
  const json = (body: any, init?: any) => new SimpleResponse(JSON.stringify(body), init)
  const redirect = (url: any, init?: any) => new SimpleResponse(null, {
    status: init?.status || 302,
    headers: { Location: typeof url === 'string' ? url : url.toString() },
  })
  return { NextResponse: { json, redirect }, NextRequest: class {} }
})

;(global as any).URL = require('url').URL

const { POST } = require('@/app/api/upload/route')

jest.mock('pdf-parse/lib/pdf-parse.js', () => {
  return () => Promise.resolve({ text: 'conteudo' })
})

jest.mock('@/lib/store', () => {
  return {
    saveDashboard: jest.fn(async () => 'mockid')
  }
})

function makeReqWithFile(file?: File): any {
  return {
    url: 'http://localhost/api/upload',
    async formData() {
      const fd = new FormData()
      if (file) fd.append('pdf', file as any)
      return fd
    },
  }
}

describe('API upload validações', () => {
  test('retorna 400 quando não envia arquivo', async () => {
    const req = makeReqWithFile(undefined)
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  test('retorna 415 para MIME inválido', async () => {
    const f = new File([new Uint8Array([1, 2, 3])], 'x.txt', { type: 'text/plain' })
    const req = makeReqWithFile(f)
    const res = await POST(req)
    expect(res.status).toBe(415)
  })

  test('retorna 413 quando excede tamanho máximo', async () => {
    ;(process as any).env.UPLOAD_MAX_BYTES = '100'
    const f = new File([new Uint8Array(200)], 'big.pdf', { type: 'application/pdf' })
    const req = makeReqWithFile(f)
    const res = await POST(req)
    expect(res.status).toBe(413)
  })

  test('retorna 400 quando assinatura não é PDF', async () => {
    const content = Buffer.from('not a pdf')
    const f = new File([new Uint8Array(content)], 'a.pdf', { type: 'application/pdf' })
    ;(f as any).slice = (start: number, end: number) => ({ arrayBuffer: async () => content.subarray(start, end) })
    ;(f as any).arrayBuffer = async () => content
    Object.defineProperty(f, 'size', { value: content.length })
    const req = makeReqWithFile(f)
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  test('redireciona 303 para PDF válido', async () => {
    const content = Buffer.from('%PDF-1.4\nbody')
    const f = new File([new Uint8Array(content)], 'ok.pdf', { type: 'application/pdf' })
    ;(f as any).slice = (start: number, end: number) => ({ arrayBuffer: async () => content.subarray(start, end) })
    ;(f as any).arrayBuffer = async () => content
    Object.defineProperty(f, 'size', { value: content.length })
    const req = makeReqWithFile(f)
    const res = await POST(req)
    expect(res.status).toBe(303)
    expect(res.headers.get('Location')).toContain('/d/mockid')
  })
})
