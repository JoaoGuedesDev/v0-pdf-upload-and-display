"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ConfiguracaoProcessamento } from "@/components/dashboard/ConfiguracaoProcessamento"
import { ArrowLeft, FileText, Calendar, ExternalLink, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/mode-toggle"
import { HeaderLogo } from '@/components/header-logo'
import { LoadingScreen } from "@/components/loading-screen"
import { FileCorrectionWizard } from "@/components/dashboard/FileCorrectionWizard"

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
  const [step, setStep] = useState<'selection' | 'upload'>('selection')
  const [selectedMode, setSelectedMode] = useState<'monthly' | 'annual'>('monthly')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Correction Mode State
  const [correctionMode, setCorrectionMode] = useState(false)
  const [filesToCorrect, setFilesToCorrect] = useState<File[]>([])
  const [validationDetails, setValidationDetails] = useState<any>(null)

  const handleSelection = (mode: 'monthly' | 'annual') => {
    setSelectedMode(mode)
    setStep('upload')
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
    setCorrectionMode(false)

    if (isAnnual) {
      setResults([{ filename: `Processando Dashboard Anual (${files.length} arquivos)...`, status: 'pending' }])
      try {
        const form = new FormData()
        files.forEach(f => form.append("file", f))
        
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
            
            // Open in preview mode instead of redirecting
            setPreviewUrl(target)
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
        setPreviewUrl(res.url)
        return
      }
      setResults([{ filename: files[0].name, status: 'error', error: res.error }])
      setLoading(false)
      return
    }

    // Múltiplos arquivos mensais (caso suportado no futuro)
    const newResults: ProcessResult[] = []
    for (const file of files) {
        newResults.push({ filename: file.name, status: 'pending', file })
    }
    setResults([...newResults])

    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const res = await processFile(file)
        
        setResults(prev => {
            const next = [...prev]
            next[i] = { 
                ...next[i], 
                status: res.url ? 'success' : 'error',
                url: res.url,
                error: res.error 
            }
            return next
        })
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
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      {correctionMode && (
          <FileCorrectionWizard 
              files={filesToCorrect}
              validationDetails={validationDetails}
              onUpdateFiles={setFilesToCorrect}
              onRetry={() => onProcess(filesToCorrect, true)}
              onCancel={() => setCorrectionMode(false)}
          />
      )}
      
      <main className="container mx-auto p-6 space-y-8">
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Processamento de PGDAS-D
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Selecione o tipo de processamento desejado para iniciar a organização e análise dos documentos.
          </p>
        </div>

        {results.length === 0 ? (
          step === 'selection' ? (
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card 
                className={cn(
                  "p-8 cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 group relative overflow-hidden",
                  selectedMode === 'monthly' && "ring-2 ring-blue-600 border-transparent"
                )}
                onClick={() => handleSelection('monthly')}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-600/0 group-hover:bg-blue-600 transition-colors" />
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">Processo Mensal</h3>
                    <p className="text-slate-500">
                      Análise individual de uma competência específica.
                    </p>
                  </div>
                </div>
              </Card>

              <Card 
                className={cn(
                  "p-8 cursor-pointer transition-all hover:shadow-lg hover:border-purple-300 group relative overflow-hidden",
                  selectedMode === 'annual' && "ring-2 ring-purple-600 border-transparent"
                )}
                onClick={() => handleSelection('annual')}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-purple-600/0 group-hover:bg-purple-600 transition-colors" />
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <FileText className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900">Relatório Anual</h3>
                    <p className="text-slate-500">
                      Consolidação estratégica de 12 meses (Janeiro a Dezembro).
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
             <div className="max-w-2xl mx-auto space-y-4">
               <Button 
                 variant="ghost" 
                 onClick={() => setStep('selection')}
                 className="text-slate-500 hover:text-slate-900 -ml-2"
               >
                 <ArrowLeft className="w-4 h-4 mr-2" />
                 Voltar para seleção
               </Button>
               <ConfiguracaoProcessamento 
                 onProcess={onProcess} 
                 loading={loading} 
                 className="min-h-[200px]"
                 initialIsAnnual={selectedMode === 'annual'}
               />
             </div>
          )
        ) : (
            <div className="max-w-4xl mx-auto space-y-6">
                 {loading && <LoadingScreen />}

                 {!loading && (
                     <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">Resultados do Processamento</h3>
                            <Button variant="outline" onClick={() => setResults([])}>Novo Processamento</Button>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {results.map((res, idx) => (
                                <div key={idx} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {res.status === 'success' ? (
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        ) : res.status === 'error' ? (
                                            <XCircle className="w-5 h-5 text-red-600" />
                                        ) : (
                                            <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                                        )}
                                        <div>
                                            <p className="font-medium text-slate-900">{res.filename}</p>
                                            {res.error && <p className="text-sm text-red-600">{res.error}</p>}
                                        </div>
                                    </div>
                                    {res.url && (
                                        <a 
                                            href={res.url} 
                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
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
