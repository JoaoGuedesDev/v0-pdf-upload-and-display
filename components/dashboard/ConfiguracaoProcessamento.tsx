import { useState, useRef, memo, useCallback } from "react"
import { Upload, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

interface ConfiguracaoProcessamentoProps {
  darkMode?: boolean
  onProcess: (file: File) => Promise<void>
  loading?: boolean
  className?: string
}

export const ConfiguracaoProcessamento = memo(function ConfiguracaoProcessamento({ 
  darkMode = false, 
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
      className={`${
        darkMode ? "bg-slate-800 border-slate-700" : "border-2 border-dashed border-slate-300 bg-white/50"
      } backdrop-blur-sm ${className}`}
    >
      <CardContent className="pt-6">
        <div
          className={`relative flex flex-col items-center justify-center rounded-lg p-8 sm:p-12 transition-all ${
            dragActive
              ? `${darkMode ? "bg-slate-700 border-2 border-blue-500" : "bg-blue-50 border-2 border-blue-400"}`
              : `${darkMode ? "bg-slate-900 border-2 border-slate-700" : "bg-slate-50 border-2 border-slate-200"}`
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload
            className={`h-12 w-12 sm:h-16 sm:w-16 mb-4 ${
              dragActive 
                ? (darkMode ? "text-blue-300" : "text-blue-600") 
                : (darkMode ? "text-slate-300" : "text-slate-400")
            }`}
          />
          <h3
            className={`text-lg sm:text-xl font-semibold mb-2 text-center break-words max-w-full ${
              darkMode ? "text-white" : "text-slate-800"
            }`}
          >
            {file ? file.name : "Arraste seu PDF aqui"}
          </h3>
          <p className={`${darkMode ? "text-slate-300" : "text-slate-500"} mb-4 text-sm sm:text-base`}>
            ou clique para selecionar
          </p>
          
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".pdf" 
            onChange={handleFileChange} 
            className="hidden" 
            id="file-upload-config" 
          />
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant={darkMode ? "secondary" : "outline"} 
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
                className={`${
                  darkMode 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                }`}
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