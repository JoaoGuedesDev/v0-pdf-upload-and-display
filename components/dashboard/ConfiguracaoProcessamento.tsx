import { useState, useRef, memo, useCallback } from "react"
import { Upload, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

interface ConfiguracaoProcessamentoProps {
  onProcess: (file: File) => Promise<void>
  loading?: boolean
  className?: string
}

export const ConfiguracaoProcessamento = memo(function ConfiguracaoProcessamento({ 
  onProcess, 
  loading = false, 
  className = "" 
}: ConfiguracaoProcessamentoProps) {
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile)
        toast({ title: "PDF carregado", description: droppedFile.name })
      } else {
        toast({ 
          title: "Formato inválido", 
          description: "Envie apenas arquivos PDF.", 
          variant: "destructive" 
        })
      }
    }
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile)
        toast({ title: "PDF carregado", description: selectedFile.name })
      } else {
        toast({ 
          title: "Formato inválido", 
          description: "Envie apenas arquivos PDF.", 
          variant: "destructive" 
        })
      }
    }
  }, [])

  const handleProcess = useCallback(async () => {
    if (!file) return
    await onProcess(file)
  }, [file, onProcess])

  const handleSelectFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <Card
      className={`border-2 border-dashed border-slate-300 bg-white/50 backdrop-blur-sm ${className}`}
    >
      <CardContent className="pt-6">
        <div
          className={`relative flex flex-col items-center justify-center rounded-lg p-8 sm:p-12 transition-all ${
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
            className={`h-12 w-12 sm:h-16 sm:w-16 mb-4 ${
              dragActive 
                ? "text-blue-600" 
                : "text-slate-400"
            }`}
          />
          <h3
            className={`text-lg sm:text-xl font-semibold mb-2 text-center break-words max-w-full text-slate-800`}
          >
            {file ? file.name : "Arraste seu PDF aqui"}
          </h3>
          <p className={`text-slate-500 mb-4 text-sm sm:text-base`}>
            ou clique para selecionar
          </p>
          
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".pdf" 
            onChange={handleFileChange} 
            className="hidden" 
            id="file-upload-config" 
            aria-label="Selecionar arquivo PDF"
          />
          <label htmlFor="file-upload-config" className="sr-only">Selecionar arquivo PDF</label>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              className="cursor-pointer" 
              onClick={handleSelectFile}
              disabled={loading}
            >
              Selecionar Arquivo
            </Button>
            
            {file && (
              <Button
                onClick={handleProcess}
                disabled={loading}
                className={`bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700`}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Processar PDF"
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})