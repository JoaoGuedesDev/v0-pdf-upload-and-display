import { useState, useRef, memo, useCallback } from "react"
import { Upload, Loader2, X, FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

interface ConfiguracaoProcessamentoProps {
  onProcess: (files: File[], isAnnual: boolean) => Promise<void>
  loading?: boolean
  className?: string
  initialIsAnnual?: boolean
}

type FileItem = {
  id: string
  file: File
  selected: boolean
}

export const ConfiguracaoProcessamento = memo(function ConfiguracaoProcessamento({ 
  onProcess, 
  loading = false, 
  className = "",
  initialIsAnnual = false
}: ConfiguracaoProcessamentoProps) {
  const [items, setItems] = useState<FileItem[]>([])
  const [isAnnual, setIsAnnual] = useState(initialIsAnnual)
  const [dragActive, setDragActive] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ url: string, id: string } | null>(null)
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

  const addFiles = useCallback((newFiles: File[]) => {
    const newItems = newFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      selected: true
    }))
    setItems(prev => [...prev, ...newItems])
    toast({ title: `${newFiles.length} PDF(s) adicionado(s)` })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files)
      const pdfFiles = droppedFiles.filter(f => f.type === "application/pdf")
      
      if (pdfFiles.length > 0) {
        addFiles(pdfFiles)
      }
      
      if (droppedFiles.length !== pdfFiles.length) {
        toast({ 
          title: "Alguns arquivos ignorados", 
          description: "Apenas arquivos PDF são permitidos.", 
          variant: "destructive" 
        })
      }
    }
  }, [addFiles])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      const pdfFiles = selectedFiles.filter(f => f.type === "application/pdf")
      
      if (pdfFiles.length > 0) {
        addFiles(pdfFiles)
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
  }, [addFiles])

  const removeFile = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
    if (previewFile?.id === id) {
      URL.revokeObjectURL(previewFile.url)
      setPreviewFile(null)
    }
  }, [previewFile])

  const toggleSelection = useCallback((id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ))
  }, [])

  const togglePreview = useCallback((file: File, id: string) => {
    if (previewFile?.id === id) {
      URL.revokeObjectURL(previewFile.url)
      setPreviewFile(null)
    } else {
      if (previewFile) {
        URL.revokeObjectURL(previewFile.url)
      }
      const url = URL.createObjectURL(file)
      setPreviewFile({ url, id })
    }
  }, [previewFile])

  const handleProcess = useCallback(async () => {
    const selectedItems = items.filter(item => item.selected)
    if (selectedItems.length === 0) return
    await onProcess(selectedItems.map(item => item.file), isAnnual)
    setItems([])
    setPreviewFile(null)
  }, [items, isAnnual, onProcess])

  const handleSelectFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <Card
      className={`border-2 border-dashed border-border bg-card/50 backdrop-blur-sm ${className}`}
    >
      <CardContent className="p-4 sm:p-6">
        <div
          className={`border-2 border-dashed rounded-lg p-6 sm:p-10 flex flex-col items-center justify-center transition-colors cursor-pointer ${
            dragActive
              ? `bg-[#00C2FF]/10 border-[#007AFF] dark:bg-[#3A3A3A]/50`
              : `bg-muted/30 border-muted-foreground/25 hover:bg-muted/50`
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload
            className={`h-8 w-8 sm:h-10 sm:w-10 mb-2 ${
              dragActive 
                ? "text-[#007AFF] dark:text-[#00C2FF]" 
                : "text-muted-foreground"
            }`}
          />
          <h3
            className={`text-base sm:text-lg font-semibold mb-1 text-center break-words max-w-full text-foreground`}
          >
            {items.length > 0 
              ? `${items.length} arquivo(s) adicionado(s)` 
              : "Arraste seus PDFs aqui"}
          </h3>
          <p className={`text-muted-foreground mb-2 text-sm`}>
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

                {items.length > 0 && (
                  <Button
                    onClick={handleProcess}
                    disabled={loading || items.filter(i => i.selected).length === 0}
                    size="sm"
                    className={`bg-[#007AFF] hover:bg-[#0056B3] text-[#FFFFFF] w-full sm:w-auto transition-colors`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      `Processar ${items.filter(i => i.selected).length} PDF(s)`
                    )}
                  </Button>
                )}
            </div>
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="mt-4 space-y-2 relative">
            {items.map((item) => (
              <div 
                key={item.id} 
                className={`flex items-center justify-between p-2 bg-card rounded-lg border shadow-sm relative group cursor-pointer transition-colors ${
                  previewFile?.id === item.id ? 'ring-2 ring-primary border-transparent' : 'border-border hover:border-primary/50'
                }`}
                onClick={() => togglePreview(item.file, item.id)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={item.selected} 
                      onChange={() => toggleSelection(item.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
                    />
                  </div>
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium truncate text-card-foreground">{item.file.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {(item.file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive z-10"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(item.id)
                  }}
                  disabled={loading}
                >
                  <X className="h-3 w-3" />
                </Button>
                
                {previewFile?.id === item.id && (
                  <>
                    <div 
                      className="fixed inset-0 z-[90] bg-background/80 backdrop-blur-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePreview(item.file, item.id)
                      }}
                    />
                    <div className="fixed z-[100] right-10 top-1/2 -translate-y-1/2 p-2 bg-card rounded-lg shadow-2xl border border-border w-[600px] h-[85vh] hidden lg:block" onClick={(e) => e.stopPropagation()}>
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-r-[12px] border-r-border border-b-[10px] border-b-transparent drop-shadow-sm"></div>
                      <div className="w-full h-full bg-muted rounded overflow-hidden relative">
                        <Button 
                          variant="secondary" 
                          size="icon" 
                          className="absolute top-2 right-2 z-10 h-8 w-8 bg-background/80 hover:bg-background shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            togglePreview(item.file, item.id)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <iframe 
                          src={`${previewFile.url}#toolbar=0&navpanes=0&scrollbar=0`}
                          className="w-full h-full"
                          title={`Preview de ${item.file.name}`}
                        />
                      </div>
                      <div className="absolute bottom-2 right-2 bg-[#3A3A3A]/75 text-white text-xs px-2 py-1 rounded pointer-events-none">
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