"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ConfiguracaoProcessamento } from "@/components/dashboard/ConfiguracaoProcessamento"
import { ExternalLink, CheckCircle, XCircle, Clock, Trash2, LayoutDashboard, ArrowLeft, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"
import { HeaderLogo } from '@/components/header-logo'
import { LoadingScreen } from "@/components/loading-screen"
import { FileCorrectionWizard } from "@/components/dashboard/FileCorrectionWizard"
import { RejectedFilesPopup } from "@/components/rejected-files-popup"

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

  // Rejected Files Popup State
  const [showRejectedPopup, setShowRejectedPopup] = useState(false)
  const [rejectedList, setRejectedList] = useState<{ name: string; reason: string }[]>([])

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

    // 1. Validate files locally (Name pattern & Duplicates)
    const validFiles: File[] = []
    const rejectedFiles: { name: string; reason: string }[] = []
    const uniqueMap = new Map<string, string>() // coreId -> filename

    for (const file of files) {
      const name = file.name
      const upperName = name.toUpperCase()

      // 1. Check for "PGDASD-DECLARACAO"
      if (!upperName.includes("PGDASD-DECLARACAO")) {
        rejectedFiles.push({ name, reason: 'Nome inválido (não contém "PGDASD-DECLARACAO")' })
        continue
      }

      // 2. Check for duplicates using regex
      // Matches PGDASD-DECLARACAO- followed by digits (CNPJ + Date)
      const match = upperName.match(/(PGDASD-DECLARACAO-\d+)/)
      
      if (match) {
          const coreId = match[1]
          if (uniqueMap.has(coreId)) {
              rejectedFiles.push({ name, reason: `Duplicata de ${uniqueMap.get(coreId)}` })
          } else {
              uniqueMap.set(coreId, name)
              validFiles.push(file)
          }
      } else {
          rejectedFiles.push({ name, reason: 'Padrão de identificação não encontrado' })
      }
    }

    // Show rejected files immediately
    if (rejectedFiles.length > 0) {
      setRejectedList(rejectedFiles)
      setShowRejectedPopup(true)

      setResults(prev => [
          ...rejectedFiles.map(r => ({ 
              filename: r.name, 
              status: 'error' as const, 
              error: r.reason 
          })),
          ...prev
      ])
    }

    if (validFiles.length === 0) {
      setLoading(false)
      return // Stop if no valid files
    }

    // 2. Process valid files sequentially (Parse Stage)
    const processedData: any[] = []
    const failedFiles: string[] = []
    const parseErrors: { name: string; reason: string }[] = []

    setResults(prev => [{ filename: `Iniciando processamento sequencial de ${validFiles.length} arquivos...`, status: 'pending' }, ...prev])

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i]
      
      // Update progress
      setResults(prev => [
          { filename: `Analisando arquivo ${i + 1}/${validFiles.length}: ${file.name}...`, status: 'pending' },
          ...prev
      ])

      const form = new FormData()
      form.append("file", file)
      
      try {
          const res = await fetch("/api/parse-files", { method: "POST", body: form })
          if (res.ok) {
              const json = await res.json()
              if (json.files && Array.isArray(json.files)) {
                  processedData.push(...json.files)
              }
              if (json.invalidFiles && Array.isArray(json.invalidFiles)) {
                  console.warn(`Files failed to parse: ${json.invalidFiles.join(', ')}`)
                  json.invalidFiles.forEach((name: string) => {
                    parseErrors.push({ name, reason: 'Falha na leitura do PDF (conteúdo ilegível ou formato inválido)' })
                  })
              }
          } else {
              console.error(`Failed to parse ${file.name}: ${res.status}`)
              failedFiles.push(file.name)
              parseErrors.push({ name: file.name, reason: `Erro no servidor ao ler arquivo (${res.status})` })
          }
      } catch (e) {
          console.error(`Network error parsing ${file.name}`, e)
          failedFiles.push(file.name)
          parseErrors.push({ name: file.name, reason: `Erro de rede ao enviar arquivo` })
      }
    }

    // Show parsing errors in popup
    if (parseErrors.length > 0) {
      setRejectedList(prev => [...prev, ...parseErrors])
      setShowRejectedPopup(true)
      
      setResults(prev => [
        ...parseErrors.map(e => ({
          filename: e.name,
          status: 'error' as const,
          error: e.reason
        })),
        ...prev
      ])
    }

    if (processedData.length === 0) {
      setResults(prev => [{ filename: `Nenhum dado extraído dos arquivos.`, status: 'error' }, ...prev])
      setLoading(false)
      return
    }

    // 3. Generate Dashboard (Aggregation Stage)
    setResults(prev => [{ filename: `Gerando dashboard consolidado...`, status: 'pending' }, ...prev])

    try {
      const payload = {
        files: processedData,
        force: force
      }

      const res = await fetch("/api/process-annual-pdf", { 
        method: "POST", 
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload) 
      })

      if (!res.ok) {
        let errData: any = {}
        try {
            errData = await res.json()
        } catch (e) {
            throw new Error(`Erro de comunicação com o servidor: ${res.status} ${res.statusText}`)
        }

        // Check for 422 Validation Error
        if (res.status === 422 && errData.code === 'VALIDATION_ERROR') {
          setValidationDetails(errData)
          
          // Show popup for rejected files from backend if any
          if (errData.details?.files) {
            const backendRejects = errData.details.files
                .filter((f: any) => f.status === 'invalid')
                .map((f: any) => ({ name: f.filename, reason: f.reason }))
            
            if (backendRejects.length > 0) {
                setRejectedList(prev => {
                  const newRejects = backendRejects.filter((br: any) => !prev.some(pr => pr.name === br.name))
                  return [...prev, ...newRejects]
                })
                setShowRejectedPopup(true)
            }
          }

          setFilesToCorrect(validFiles)
          setCorrectionMode(true)
          setLoading(false)
          return // Stop here to show wizard
        }

        throw new Error(errData.error || errData.message || `Erro ao processar arquivos: ${res.status}`)
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
        const previewTarget = new URL(target, window.location.origin)
        previewTarget.searchParams.set('embedded', 'true')
        setPreviewUrl(previewTarget.toString())
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
              <Button variant="outline" onClick={() => setPreviewUrl(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div className="h-6 w-px bg-border" />
              <HeaderLogo className="h-10" />
              <div className="h-6 w-px bg-border" />
              <h1 className="font-semibold text-foreground">Visualização do Dashboard</h1>
            </div>

            <div className="flex items-center gap-2">
              <ModeToggle />
              <Button onClick={() => {
                 const iframe = document.querySelector('iframe')
                 if (iframe && iframe.contentWindow) {
                   iframe.contentWindow.postMessage({ type: 'EXPORT_PDF' }, '*')
                 }
               }}>
                 <Download className="w-4 h-4 mr-2" />
                 Exportar Relatório PDF
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

      <RejectedFilesPopup 
        isOpen={showRejectedPopup} 
        onClose={() => setShowRejectedPopup(false)} 
        rejectedFiles={rejectedList} 
      />

      {correctionMode && (
        <FileCorrectionWizard
          files={filesToCorrect}
          validationDetails={validationDetails}
          onUpdateFiles={setFilesToCorrect}
          onRetry={() => onProcess(filesToCorrect, true)}
          onCancel={() => setCorrectionMode(false)}
          onForceProcess={(files) => onProcess(files, true, true)} // Fixed force process call
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