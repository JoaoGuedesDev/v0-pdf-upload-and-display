import { useState, useRef, memo, useCallback } from "react"
import { Upload, Loader2, X, FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

interface ConfiguracaoProcessamentoProps {
  onProcess: (files: File[], isAnnual: boolean) => Promise<void>
  loading?: boolean
  className?: string
}

export const ConfiguracaoProcessamento = memo(function ConfiguracaoProcessamento({ 
  onProcess, 
  loading = false, 
  className = "" 
}: ConfiguracaoProcessamentoProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isAnnual, setIsAnnual] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ url: string, index: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        setFiles(prev => [...prev, ...pdfFiles])
        toast({ title: `${pdfFiles.length} PDF(s) adicionado(s)` })
      }
      
      if (droppedFiles.length !== pdfFiles.length) {
        toast({ 
          title: "Alguns arquivos ignorados", 
          description: "Apenas arquivos PDF são permitidos.", 
          variant: "destructive" 
        })
      }
    }
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      const pdfFiles = selectedFiles.filter(f => f.type === "application/pdf")
      
      if (pdfFiles.length > 0) {
        setFiles(prev => [...prev, ...pdfFiles])
        toast({ title: `${pdfFiles.length} PDF(s) adicionado(s)` })
      }

      if (selectedFiles.length !== pdfFiles.length) {
        toast({ 
          title: "Alguns arquivos ignorados", 
          description: "Apenas arquivos PDF são permitidos.", 
          variant: "destructive" 
        })
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    if (previewFile?.index === index) {
      URL.revokeObjectURL(previewFile.url)
      setPreviewFile(null)
    }
  }, [previewFile])

  const togglePreview = useCallback((file: File, index: number) => {
    if (previewFile?.index === index) {
      URL.revokeObjectURL(previewFile.url)
      setPreviewFile(null)
    } else {
      if (previewFile) {
        URL.revokeObjectURL(previewFile.url)
      }
      const url = URL.createObjectURL(file)
      setPreviewFile({ url, index })
    }
  }, [previewFile])

  const handleProcess = useCallback(async () => {
    if (files.length === 0) return
    await onProcess(files, isAnnual)
    setFiles([])
  }, [files, isAnnual, onProcess])

  const handleSelectFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <Card
      className={`border-2 border-dashed border-slate-300 bg-white/50 backdrop-blur-sm ${className}`}
    >
      <CardContent className="pt-6">
        <div
          className={`relative flex flex-col items-center justify-center rounded-lg p-6 sm:p-8 transition-all ${
            dragActive
              ? `bg-blue-50 border-2 border-blue-400`
              : `bg-slate-50 border-2 border-slate-200`
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload
            className={`h-8 w-8 sm:h-10 sm:w-10 mb-2 ${
              dragActive 
                ? "text-blue-600" 
                : "text-slate-400"
            }`}
          />
          <h3
            className={`text-base sm:text-lg font-semibold mb-1 text-center break-words max-w-full text-slate-800`}
          >
            {files.length > 0 
              ? `${files.length} arquivo(s) selecionado(s)` 
              : "Arraste seus PDFs aqui"}
          </h3>
          <p className={`text-slate-500 mb-2 text-sm`}>
            ou clique para selecionar (múltiplos permitidos)
          </p>
          
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".pdf" 
            onChange={handleFileChange} 
            className="hidden" 
            id="file-upload-config" 
            aria-label="Selecionar arquivos PDF"
            multiple
          />
          <label htmlFor="file-upload-config" className="sr-only">Selecionar arquivos PDF</label>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  className="cursor-pointer" 
                  onClick={handleSelectFile}
                  disabled={loading}
                  size="sm"
                >
                  Adicionar Arquivos
                </Button>

                {files.length > 0 && (
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none bg-slate-50 px-3 py-2 rounded-lg border hover:bg-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={isAnnual} 
                      onChange={(e) => setIsAnnual(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Modo Anual (Juntar arquivos)</span>
                  </label>
                )}
              </div>
              
              {files.length > 0 && (
                <Button
                  onClick={handleProcess}
                  disabled={loading || (isAnnual && files.length < 2)}
                  size="sm"
                  className={`bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 w-full sm:w-auto`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    isAnnual ? `Processar Anual (${files.length})` : `Processar ${files.length} PDF(s)`
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2 relative">
            {files.map((file, index) => (
              <div 
                key={index} 
                className={`flex items-center justify-between p-2 bg-white rounded-lg border shadow-sm relative group cursor-pointer transition-colors ${
                  previewFile?.index === index ? 'ring-2 ring-blue-500 border-transparent' : 'hover:border-blue-300'
                }`}
                onClick={() => togglePreview(file, index)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{file.name}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-red-500 z-10"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                  disabled={loading}
                >
                  <X className="h-3 w-3" />
                </Button>
                
                {previewFile?.index === index && (
                  <>
                    <div 
                      className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePreview(file, index)
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
                            togglePreview(file, index)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <iframe 
                          src={`${previewFile.url}#toolbar=0&navpanes=0&scrollbar=0`}
                          className="w-full h-full"
                          title={`Preview de ${file.name}`}
                        />
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded pointer-events-none">
                        Preview
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
})