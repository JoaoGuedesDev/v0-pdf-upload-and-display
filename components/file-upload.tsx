"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { Upload, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface FileUploadProps {
  onFileSelect: (file: File) => void
  isLoading: boolean
}

export function FileUpload({ onFileSelect, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const pdfFile = files.find((file) => file.type === "application/pdf")

    if (pdfFile) {
      setSelectedFile(pdfFile)
    } else {
      alert("Por favor, selecione um arquivo PDF")
    }
  }, [])

  const handleFileSelectChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      if (files[0].type === "application/pdf") {
        setSelectedFile(files[0])
      } else {
        alert("Por favor, selecione um arquivo PDF")
      }
    }
  }, [])

  const handleUpload = () => {
    if (selectedFile) {
      onFileSelect(selectedFile)
    }
  }

  return (
    <Card className="p-6 md:p-8 border-2">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">PASSO 1: UPLOAD DE ARQUIVO</h2>
          <p className="text-muted-foreground">Faça upload do seu arquivo PDF para processar os dados</p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 md:p-12 text-center transition-colors
            ${isDragging ? "border-primary bg-primary/5" : "border-border"}
            ${selectedFile ? "bg-secondary/50" : ""}
          `}
        >
          {selectedFile ? (
            <div className="flex flex-col items-center gap-4">
              <FileText className="w-16 h-16 text-primary" />
              <div>
                <p className="font-semibold text-foreground">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <Button variant="outline" onClick={() => setSelectedFile(null)} disabled={isLoading}>
                Remover arquivo
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Upload className="w-16 h-16 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold text-foreground mb-1">Arraste e solte seu arquivo PDF aqui</p>
                <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
              </div>
              <label htmlFor="file-input">
                <Button variant="outline" asChild>
                  <span>Selecionar arquivo</span>
                </Button>
              </label>
              <input id="file-input" type="file" accept=".pdf" onChange={handleFileSelectChange} className="hidden" />
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="flex justify-center">
            <Button size="lg" onClick={handleUpload} disabled={isLoading} className="min-w-[200px]">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Processar PDF
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
