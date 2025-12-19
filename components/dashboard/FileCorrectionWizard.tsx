"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle, Trash2, RefreshCw, FileText, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileCorrectionWizardProps {
  files: File[]
  validationDetails: any
  onUpdateFiles: (newFiles: File[]) => void
  onRetry: () => void
  onCancel: () => void
}

export function FileCorrectionWizard({ 
  files, 
  validationDetails, 
  onUpdateFiles, 
  onRetry, 
  onCancel 
}: FileCorrectionWizardProps) {
  const [localFiles, setLocalFiles] = useState<File[]>([...files])
  
  // Helper to find status of a file
  const getFileStatus = (file: File) => {
    const detail = validationDetails.details?.files?.find((f: any) => f.filename === file.name)
    if (!detail) return { status: 'unknown', reason: '' }
    return { status: detail.status, reason: detail.reason, period: detail.period, company: detail.company }
  }

  const handleRemoveFile = (index: number) => {
    const newFiles = [...localFiles]
    newFiles.splice(index, 1)
    setLocalFiles(newFiles)
    onUpdateFiles(newFiles)
  }

  const handleReplaceFile = (index: number, newFile: File) => {
    const newFiles = [...localFiles]
    newFiles[index] = newFile
    setLocalFiles(newFiles)
    onUpdateFiles(newFiles)
  }

  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = [...localFiles, ...Array.from(e.target.files)]
      setLocalFiles(newFiles)
      onUpdateFiles(newFiles)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300 border-red-200 dark:border-red-900">
        <CardHeader className="bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-red-700 dark:text-red-400">Correção de Arquivos Necessária</CardTitle>
                <CardDescription className="text-red-600/80 dark:text-red-400/80">
                   Encontramos inconsistências nos arquivos enviados. Por favor, revise e corrija abaixo.
                </CardDescription>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
                <div className="font-medium">Empresa Esperada:</div>
                <div>{validationDetails.details?.targetCompanyName || 'Não Identificada'}</div>
                <div className="text-xs">{validationDetails.details?.targetCnpj}</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Global Errors */}
          {validationDetails.summary && validationDetails.summary.length > 0 && (
             <Alert variant="destructive">
                <AlertTitle>Erros Encontrados:</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        {validationDetails.summary.map((err: string, i: number) => (
                            <li key={i}>{err}</li>
                        ))}
                        {validationDetails.details?.sequenceErrors?.map((err: string, i: number) => (
                            <li key={`seq-${i}`}>{err}</li>
                        ))}
                    </ul>
                </AlertDescription>
             </Alert>
          )}

          {/* File List */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
             <div className="flex justify-between items-center pb-2 border-b">
                <h3 className="font-semibold">Arquivos Selecionados ({localFiles.length}/12)</h3>
                <div className="relative">
                    <input 
                        type="file" 
                        id="add-more-files" 
                        multiple 
                        className="hidden" 
                        accept=".pdf"
                        onChange={handleAddFiles}
                    />
                    <label 
                        htmlFor="add-more-files"
                        className="text-xs flex items-center gap-1 cursor-pointer bg-blue-50 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-100 transition-colors"
                    >
                        <Upload className="w-3 h-3" /> Adicionar Arquivos
                    </label>
                </div>
             </div>

             {localFiles.map((file, index) => {
                 const info = getFileStatus(file)
                 const isValid = info.status === 'valid'
                 const isInvalid = info.status === 'invalid'
                 // New files won't have status yet, assume pending/neutral
                 const isNew = info.status === 'unknown'

                 return (
                     <div 
                        key={`${file.name}-${index}`} 
                        className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-all",
                            isValid ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30" : 
                            isInvalid ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30" :
                            "bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700"
                        )}
                     >
                        <div className="flex items-center gap-3 overflow-hidden">
                            {isValid ? (
                                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                            ) : isInvalid ? (
                                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                            ) : (
                                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                            )}
                            
                            <div className="min-w-0">
                                <div className="font-medium text-sm truncate max-w-[300px]" title={file.name}>
                                    {file.name} {isNew && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded ml-2">Novo</span>}
                                </div>
                                <div className="text-xs text-muted-foreground flex gap-2">
                                    {info.period && <span>{info.period}</span>}
                                    {info.company && <span>• {info.company}</span>}
                                    {info.reason && <span className="text-red-600 font-medium">• {info.reason}</span>}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <div className="relative">
                                <input 
                                    type="file" 
                                    id={`replace-${index}`} 
                                    className="hidden" 
                                    accept=".pdf"
                                    onChange={(e) => {
                                        if(e.target.files?.[0]) handleReplaceFile(index, e.target.files[0])
                                    }}
                                />
                                <label 
                                    htmlFor={`replace-${index}`}
                                    className="text-xs cursor-pointer text-blue-600 hover:text-blue-800 hover:underline px-2 py-1"
                                >
                                    Substituir
                                </label>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                onClick={() => handleRemoveFile(index)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                     </div>
                 )
             })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={onCancel}>
                Cancelar
            </Button>
            <Button 
                onClick={onRetry} 
                className="bg-primary hover:bg-primary/90"
                disabled={localFiles.length === 0}
            >
                <RefreshCw className="w-4 h-4 mr-2" />
                Validar e Processar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
