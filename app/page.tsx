"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ConfiguracaoProcessamento } from "@/components/dashboard/ConfiguracaoProcessamento"
import { ExternalLink, CheckCircle, XCircle, Clock, Trash2, LayoutDashboard, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"
import { HeaderLogo } from '@/components/header-logo'
import { LoadingScreen } from "@/components/loading-screen"
import { FileCorrectionWizard } from "@/components/dashboard/FileCorrectionWizard"

interface ProcessResult {
  filename: string
  status: 'pending' | 'success' | 'error'
  url?: string
  dashboardCode?: string
  error?: string
  file?: File
}

interface HistoryItem {
  id: string
  filename: string
  url: string
  date: string
  type: 'monthly' | 'annual'
}

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ProcessResult[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Correction Mode State
  const [correctionMode, setCorrectionMode] = useState(false)
  const [filesToCorrect, setFilesToCorrect] = useState<File[]>([])
  const [validationDetails, setValidationDetails] = useState<any>(null)

  useEffect(() => {
    const saved = localStorage.getItem('pgdas_history')
    if (saved) {
      try {
        setHistory(JSON.parse(saved))
      } catch { }
    }
  }, [])

  const addToHistory = (item: Omit<HistoryItem, 'id'>) => {
    setHistory(prev => {
      // Filter out duplicates by URL to avoid clutter
      const filtered = prev.filter(p => p.url !== item.url)
      const newHistory = [{ ...item, id: Date.now().toString() }, ...filtered].slice(0, 10)
      localStorage.setItem('pgdas_history', JSON.stringify(newHistory))
      return newHistory
    })
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('pgdas_history')
  }

  const onProcess = async (files: File[], isAnnual: boolean) => {
    // isAnnual param is ignored, we always use the unified annual/multi-file process
    setLoading(true)
    setResults([])
    setCorrectionMode(false)
    const force = false // Can add UI for force later if needed, or rely on wizard

    setResults([{ filename: `Processando ${files.length} arquivos...`, status: 'pending' }])
    try {
      const form = new FormData()
      files.forEach(f => form.append("file", f))
      if (force) form.append("force", "true")

      const res = await fetch("/api/process-annual-pdf", { method: "POST", body: form })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))

        // Check for 422 Validation Error
        if (res.status === 422 && errData.code === 'VALIDATION_ERROR') {
          setValidationDetails(errData)
          setFilesToCorrect(files)
          setCorrectionMode(true)
          setLoading(false)
          return // Stop here to show wizard
        }

        throw new Error(errData.error || "Falha ao processar arquivos")
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

        const title = `Dashboard Consolidado - ${data.cabecalho?.periodo?.apuracao || 'Multi-Empresas'}`

        setResults([{
          filename: title,
          status: 'success',
          url: target
        }])

        addToHistory({
          filename: title,
          url: target,
          date: new Date().toLocaleString('pt-BR'),
          type: 'annual'
        })

        // Open in preview mode instead of redirecting
        setPreviewUrl(target)
      } else {
        setResults([{ filename: `Processamento`, status: 'error', error: data?.error || "URL não retornada" }])
      }
    } catch (e) {
      setResults([{ filename: `Processamento`, status: 'error', error: e instanceof Error ? e.message : "Erro desconhecido" }])
    }
    setLoading(false)
  }

  if (previewUrl) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col">
        <div className="bg-card border-b border-border sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <HeaderLogo className="h-10" />
              <div className="h-6 w-px bg-border" />
              <h1 className="font-semibold text-foreground">Visualização do Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <ModeToggle />
              <Button variant="outline" onClick={() => setPreviewUrl(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button asChild>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir em nova aba
                </a>
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-muted/30">
          <iframe src={previewUrl} className="w-full h-full border-0" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <HeaderLogo className="h-8" />
            <span className="font-bold hidden sm:inline-block">v0 PDF App</span>
          </div>
          <ModeToggle />
        </div>
      </header>

      {correctionMode && (
        <FileCorrectionWizard
          files={filesToCorrect}
          validationDetails={validationDetails}
          onUpdateFiles={setFilesToCorrect}
          onRetry={() => onProcess(filesToCorrect, true)}
          onCancel={() => setCorrectionMode(false)}
          onForceProcess={(files) => onProcess(files, true)} // Fixed force process call
        />
      )}

      <main className="container mx-auto p-6 space-y-8">
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Dashboard Unificado PGDAS-D
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Faça upload de seus arquivos PDF (Mensal ou Anual) para gerar o dashboard completo.
            Suporte a múltiplas empresas e consolidação automática.
          </p>
        </div>

        {results.length === 0 ? (
          <div className="space-y-12 max-w-4xl mx-auto">
            <div className="max-w-2xl mx-auto space-y-4">
              <ConfiguracaoProcessamento
                onProcess={onProcess}
                loading={loading}
                className="min-h-[200px]"
                initialIsAnnual={true} // Always unified/annual mode
              />
            </div>

            {history.length > 0 && (
              <div className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Últimos Processamentos
                  </h2>
                  <Button variant="ghost" size="sm" onClick={clearHistory} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar Histórico
                  </Button>
                </div>
                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                  <div className="divide-y divide-border">
                    {history.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-muted/50 flex items-center justify-between group transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-[#00C2FF]/20 text-[#00C2FF]"
                          )}>
                            <LayoutDashboard className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{item.filename}</p>
                            <p className="text-xs text-muted-foreground">{item.date}</p>
                          </div>
                        </div>
                        <Button asChild variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            Abrir <ExternalLink className="w-3 h-3 ml-2" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {loading && <LoadingScreen />}

            {!loading && (
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border flex justify-between items-center">
                  <h3 className="font-bold text-foreground">Resultados do Processamento</h3>
                  <Button variant="outline" onClick={() => setResults([])}>Novo Processamento</Button>
                </div>
                <div className="divide-y divide-border">
                  {results.map((res, idx) => (
                    <div key={idx} className="p-4 hover:bg-muted/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {res.status === 'success' ? (
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500" />
                        ) : res.status === 'error' ? (
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-500" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-muted border-t-[#007AFF] rounded-full animate-spin" />
                        )}
                        <div>
                          <p className="font-medium text-foreground">{res.filename}</p>
                          {res.error && <p className="text-sm text-red-600 dark:text-red-400">{res.error}</p>}
                        </div>
                      </div>
                      {res.url && (
                        <a
                          href={res.dashboardCode ? `/unified-dashboard?file=dash-${res.dashboardCode}.json` : res.url}
                          className="text-[#007AFF] dark:text-[#00C2FF] hover:text-[#0056B3] dark:hover:text-[#E0E0E0] font-medium text-sm flex items-center gap-1"
                        >
                          Visualizar Dashboard <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}