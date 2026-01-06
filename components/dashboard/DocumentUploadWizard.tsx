
'use client'

import { useState, useCallback, useRef } from "react"
import { Upload, FileText, CheckCircle2, AlertTriangle, X, ShieldCheck, ArrowRight, Loader2, Calendar, FileType } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"

interface DocumentUploadWizardProps {
  onComplete: (files: File[], isAnnual: boolean) => Promise<void>
}

type Step = 'selection' | 'upload' | 'validation' | 'ready'

export function DocumentUploadWizard({ onComplete }: DocumentUploadWizardProps) {
  const [step, setStep] = useState<Step>('selection')
  const [mode, setMode] = useState<'monthly' | 'annual' | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    details: any[];
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleModeSelect = (selectedMode: 'monthly' | 'annual') => {
    setMode(selectedMode)
    setStep('upload')
    setFiles([])
    setValidationResult(null)
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files)
      const pdfFiles = droppedFiles.filter(f => f.type === "application/pdf")
      
      if (pdfFiles.length > 0) {
        setFiles(prev => {
            const newFiles = [...prev, ...pdfFiles]
            // Limit for monthly
            if (mode === 'monthly') return newFiles.slice(0, 1) 
            return newFiles
        })
      }
    }
  }, [mode])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      const pdfFiles = selectedFiles.filter(f => f.type === "application/pdf")
      
      if (pdfFiles.length > 0) {
        setFiles(prev => {
            const newFiles = [...prev, ...pdfFiles]
            if (mode === 'monthly') return newFiles.slice(0, 1)
            return newFiles
        })
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [mode])

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setValidationResult(null) // Reset validation on change
  }

  const validateFiles = async () => {
    if (files.length === 0) return

    setIsValidating(true)
    setStep('validation')

    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    formData.append('type', mode || 'monthly')

    try {
      const response = await fetch('/api/validate-files', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      setValidationResult(data)
      
      if (data.valid) {
        setTimeout(() => setStep('ready'), 1000)
      }
    } catch (error) {
      console.error("Validation failed", error)
      toast({
        title: "Erro na validação",
        description: "Não foi possível validar os arquivos. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleFinalize = async () => {
    if (!mode || files.length === 0) return
    await onComplete(files, mode === 'annual')
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Stepper Header */}
      <div className="flex items-center justify-between mb-8">
        {['Tipo de Processo', 'Upload de Arquivos', 'Validação', 'Confirmação'].map((label, idx) => {
            const currentIdx = ['selection', 'upload', 'validation', 'ready'].indexOf(step)
            const isActive = idx === currentIdx
            const isCompleted = idx < currentIdx
            
            return (
                <div key={label} className="flex flex-col items-center flex-1 relative">
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 transition-colors",
                        isCompleted ? "bg-green-600 text-white" : isActive ? "bg-violet-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    )}>
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>
                    <div className={cn(
                        "text-xs mt-2 font-medium",
                        isActive ? "text-violet-700 dark:text-violet-400" : "text-slate-500 dark:text-slate-400"
                    )}>{label}</div>
                    {idx !== 3 && (
                        <div className={cn(
                            "absolute top-4 left-1/2 w-full h-0.5 -z-0",
                            isCompleted ? "bg-green-600" : "bg-slate-200 dark:bg-slate-800"
                        )} />
                    )}
                </div>
            )
        })}
      </div>

      <Card className="border-border shadow-lg min-h-[400px] bg-card">
        {step === 'selection' && (
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <button 
                        onClick={() => handleModeSelect('monthly')}
                        className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all group text-center space-y-4"
                    >
                        <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Calendar className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-foreground">Declaração Mensal</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-[200px] mx-auto">
                                Processar um único PDF de declaração (PGDAS)
                            </p>
                        </div>
                    </button>

                    <button 
                        onClick={() => handleModeSelect('annual')}
                        className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all group text-center space-y-4"
                    >
                        <div className="w-16 h-16 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FileType className="w-8 h-8 text-fuchsia-600 dark:text-fuchsia-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-foreground">Análise Anual</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-[200px] mx-auto">
                                Consolidar múltiplos PDFs (Jan-Dez) para visão anual
                            </p>
                        </div>
                    </button>
                </div>
            </CardContent>
        )}

        {step === 'upload' && (
            <CardContent className="pt-6 space-y-6">
                <div
                    className={cn(
                        "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer",
                        dragActive
                            ? "bg-violet-50/50 border-violet-400 dark:bg-violet-950/20"
                            : "bg-muted/30 border-muted-foreground/25 hover:bg-muted/50"
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className={cn("w-12 h-12 mb-4", dragActive ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground")} />
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                        {mode === 'monthly' ? "Upload do PGDAS Mensal" : "Upload dos Arquivos Mensais"}
                    </h3>
                    <p className="text-muted-foreground text-sm text-center max-w-sm mb-4">
                        {mode === 'monthly' 
                            ? "Arraste o PDF da declaração ou clique para selecionar." 
                            : "Arraste todos os PDFs de Jan a Dez (ou parciais) para consolidar."}
                    </p>
                    <Button variant="secondary" size="sm" className="pointer-events-none">
                        Selecionar Arquivos
                    </Button>
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        accept=".pdf" 
                        multiple={mode === 'annual'}
                        onChange={handleFileChange} 
                        className="hidden" 
                    />
                </div>

                {files.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">Arquivos Selecionados ({files.length})</span>
                            <button onClick={() => setFiles([])} className="text-muted-foreground hover:text-destructive text-xs">
                                Limpar tudo
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {files.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg group hover:border-primary/50 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                                        <span className="text-sm text-card-foreground truncate" title={file.name}>{file.name}</span>
                                    </div>
                                    <button onClick={() => removeFile(idx)} className="text-xs text-muted-foreground hover:text-destructive">Remover</button>
                                </div>
                            ))}
                        </div>
                <div className="flex justify-end pt-4">
                    <Button 
                        onClick={validateFiles} 
                        disabled={files.length === 0}
                        className="gap-2"
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Validar Documentos
                    </Button>
                </div>
                    </div>
                )}
            </CardContent>
        )}

        {(step === 'validation' || (step === 'ready' && validationResult)) && (
            <CardContent className="pt-6">
                 {isValidating ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                        <h3 className="text-lg font-medium text-foreground">Analisando documentos...</h3>
                        <p className="text-muted-foreground">Verificando integridade, CNPJ e competências.</p>
                    </div>
                ) : validationResult ? (
                    <div className="space-y-6">
                        <div className={cn(
                            "p-6 rounded-xl border flex items-start gap-4",
                            validationResult.valid 
                                ? "bg-green-500/10 border-green-200 dark:border-green-900" 
                                : "bg-red-500/10 border-red-200 dark:border-red-900"
                        )}>
                            {validationResult.valid ? (
                                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400 flex-shrink-0" />
                            ) : (
                                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400 flex-shrink-0" />
                            )}
                            <div>
                                <h3 className={cn(
                                    "text-lg font-bold",
                                    validationResult.valid ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                                )}>
                                    {validationResult.valid ? "Validação Concluída com Sucesso" : "Atenção: Inconsistências Detectadas"}
                                </h3>
                                {(validationResult as any).clientName && (
                                    <p className="text-sm font-semibold text-foreground mt-1">
                                        Cliente Identificado: <span className="text-muted-foreground">{(validationResult as any).clientName}</span>
                                    </p>
                                )}
                                <div className="mt-2 space-y-1">
                                    {validationResult.errors.map((err, i) => (
                                        <p key={i} className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                                            • {err}
                                        </p>
                                    ))}
                                    {validationResult.valid && (
                                        <p className="text-sm text-green-600 dark:text-green-400">
                                            Todos os arquivos pertencem ao mesmo CNPJ e formam uma sequência válida.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Validation Details Table */}
                        <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-muted-foreground">
                                    <tr>
                                        <th className="p-3 text-left font-medium">Arquivo</th>
                                        <th className="p-3 text-left font-medium">CNPJ Detectado</th>
                                        <th className="p-3 text-left font-medium">Competência</th>
                                        <th className="p-3 text-right font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {validationResult.details.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-muted/50 transition-colors">
                                            <td className="p-3 text-foreground max-w-[200px] truncate" title={item.name}>{item.name}</td>
                                            <td className="p-3 text-muted-foreground">{item.cnpj || '-'}</td>
                                            <td className="p-3 text-muted-foreground">{item.period || '-'}</td>
                                            <td className="p-3 text-right">
                                                {item.valid ? (
                                                    <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25 border-green-200 dark:border-green-900">Ok</Badge>
                                                ) : (
                                                    <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 hover:bg-red-500/25 border-red-200 dark:border-red-900">Erro</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button variant="outline" onClick={() => setStep('upload')}>
                                Corrigir Arquivos
                            </Button>
                            <Button 
                                onClick={handleFinalize} 
                                disabled={!validationResult.valid}
                                className={cn(
                                    "gap-2",
                                    validationResult.valid ? "bg-green-600 hover:bg-green-700 text-white" : ""
                                )}
                            >
                                Confirmar e Processar
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ) : null}
            </CardContent>
        )}
      </Card>
    </div>
  )
}
