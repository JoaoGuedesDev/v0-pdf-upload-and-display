"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ConfiguracaoProcessamento } from "@/components/dashboard/ConfiguracaoProcessamento"
import { ExternalLink, CheckCircle, XCircle } from "lucide-react"

interface ProcessResult {
  filename: string
  status: 'pending' | 'success' | 'error'
  url?: string
  error?: string
  file?: File
}

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ProcessResult[]>([])
  const [previewResultIndex, setPreviewResultIndex] = useState<number | null>(null)

  const togglePreview = (index: number) => {
    setPreviewResultIndex(prev => prev === index ? null : index)
  }

  const processFile = async (file: File): Promise<{ url?: string, error?: string }> => {
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/process-pdf", { method: "POST", body: form })
      if (!res.ok) throw new Error("Falha ao processar PDF")
      const data = await res.json().catch(() => null)
      const url2 = data?.dashboardAdminUrl || data?.dashboardUrl || data?.redirect || data?.url
      
      if (url2) {
        const target = (() => {
          try {
            const u = new URL(url2, window.location.origin)
            const sameOrigin = u.origin === window.location.origin
            return sameOrigin ? u.toString() : `${window.location.origin}${u.pathname}${u.search}${u.hash}`
          } catch {
            return url2
          }
        })()
        return { url: target }
      }
      return { error: "URL não retornada pela API" }
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Erro desconhecido" }
    }
  }

  const onProcess = async (files: File[], isAnnual: boolean) => {
    setLoading(true)
    setResults([])

    if (isAnnual) {
      setResults([{ filename: `Processando Dashboard Anual (${files.length} arquivos)...`, status: 'pending' }])
      try {
        const form = new FormData()
        files.forEach(f => form.append("file", f))
        
        const res = await fetch("/api/process-annual-pdf", { method: "POST", body: form })
        
        if (!res.ok) {
           const errData = await res.json().catch(() => ({}))
           throw new Error(errData.error || "Falha ao processar arquivos anuais")
        }
        
        const data = await res.json().catch(() => null)
        const url = data?.dashboardAdminUrl || data?.dashboardUrl || data?.url
        
        if (url) {
            const target = (() => {
                try {
                  const u = new URL(url, window.location.origin)
                  const sameOrigin = u.origin === window.location.origin
                  return sameOrigin ? u.toString() : `${window.location.origin}${u.pathname}${u.search}${u.hash}`
                } catch {
                  return url
                }
            })()
            
            setResults([{ 
                filename: `Dashboard Anual Consolidado - ${data.cabecalho?.periodo?.apuracao || 'Ano Completo'}`, 
                status: 'success', 
                url: target 
            }])
        } else {
             setResults([{ filename: `Dashboard Anual`, status: 'error', error: data?.error || "URL não retornada" }])
        }
      } catch (e) {
         setResults([{ filename: `Dashboard Anual`, status: 'error', error: e instanceof Error ? e.message : "Erro desconhecido" }])
      }
      setLoading(false)
      return
    }

    // Se for apenas um arquivo, mantém o comportamento de redirecionamento direto se der certo
    if (files.length === 1) {
      const res = await processFile(files[0])
      if (res.url) {
        window.location.assign(res.url)
        return 
      } else {
        setResults([{ filename: files[0].name, status: 'error', error: res.error }])
      }
      setLoading(false)
      return
    }

    // Múltiplos arquivos
    const newResults: ProcessResult[] = files.map(f => ({ filename: f.name, status: 'pending', file: f }))
    setResults(newResults)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const res = await processFile(file)
      
      setResults(prev => prev.map((r, idx) => {
        if (idx === i) {
          return {
            ...r,
            status: res.url ? 'success' : 'error',
            url: res.url,
            error: res.error
          }
        }
        return r
      }))
    }
    setLoading(false)
  }

  return (
    <main className={`min-h-screen p-6 bg-white`}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <img
              src="/shared/integra-logo.png"
              alt="Integra Soluções Empresariais"
              className="h-10 sm:h-12 w-auto object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/integra-logo.svg' }}
            />
          </div>
        </div>

        <div className="mt-2">
          <ConfiguracaoProcessamento onProcess={onProcess} loading={loading} className="min-h-[200px]" />
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">Resultados do Processamento</h2>
            <div className="grid gap-3 relative">
              {results.map((res, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg border flex items-center justify-between relative group transition-colors ${
                    res.status === 'success' ? 'bg-green-50 border-green-200' :
                    res.status === 'error' ? 'bg-red-50 border-red-200' :
                    'bg-slate-50 border-slate-200'
                  } ${res.url ? 'cursor-pointer hover:shadow-md' : ''} ${previewResultIndex === idx ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => res.url && togglePreview(idx)}
                >
                  <div className="flex items-center gap-3">
                    {res.status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {res.status === 'error' && <XCircle className="h-5 w-5 text-red-600" />}
                    {res.status === 'pending' && <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />}
                    
                    <div>
                      <p className="font-medium text-slate-900">{res.filename}</p>
                      {res.error && <p className="text-sm text-red-600">{res.error}</p>}
                    </div>
                  </div>
                  
                  {res.status === 'success' && res.url && (
                    <Button asChild size="sm" variant="outline" className="gap-2 z-10" onClick={(e) => e.stopPropagation()}>
                      <a href={res.url} target="_blank" rel="noopener noreferrer">
                        Abrir Dashboard <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}

                  {previewResultIndex === idx && res.url && (
                    <>
                      <div 
                        className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          togglePreview(idx)
                        }}
                      />
                      <div className="fixed z-[100] right-10 top-1/2 -translate-y-1/2 p-2 bg-white rounded-lg shadow-2xl border-2 border-slate-200 w-[600px] h-[85vh] hidden lg:block" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-r-[12px] border-r-slate-200 border-b-[10px] border-b-transparent drop-shadow-sm"></div>
                        <div className="w-full h-full bg-slate-100 rounded overflow-hidden relative">
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="absolute top-2 right-2 z-10 h-8 w-8 bg-white/80 hover:bg-white shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              togglePreview(idx)
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <iframe 
                            src={res.url}
                            className="w-full h-full"
                            title={`Preview do Dashboard - ${res.filename}`}
                          />
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded pointer-events-none">
                          Dashboard Preview
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
