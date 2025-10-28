"use client"

import type React from "react"

import { useState } from "react"
import { FileText, Loader2, LinkIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface GoogleDriveInputProps {
  onProcess: (driveId: string) => void
  isLoading: boolean
}

export function GoogleDriveInput({ onProcess, isLoading }: GoogleDriveInputProps) {
  const [driveId, setDriveId] = useState("")

  const handleProcess = () => {
    if (driveId.trim()) {
      onProcess(driveId.trim())
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && driveId.trim() && !isLoading) {
      handleProcess()
    }
  }

  return (
    <Card className="p-6 md:p-8 border-2">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">PASSO 1: ID DO GOOGLE DRIVE</h2>
          <p className="text-muted-foreground">Insira o ID do arquivo PDF do DAS armazenado no Google Drive</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="drive-id" className="text-base font-medium">
              ID do Arquivo no Google Drive
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="drive-id"
                  type="text"
                  placeholder="Ex: 1a2b3c4d5e6f7g8h9i0j"
                  value={driveId}
                  onChange={(e) => setDriveId(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button
                size="lg"
                onClick={handleProcess}
                disabled={!driveId.trim() || isLoading}
                className="min-w-[140px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Processar
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              O ID é a sequência de caracteres após "/d/" na URL do arquivo do Google Drive
            </p>
          </div>

          <div className="bg-secondary/50 p-4 rounded-lg border border-border">
            <p className="text-sm font-medium text-foreground mb-2">Como encontrar o ID:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Abra o arquivo no Google Drive</li>
              <li>Copie a URL do navegador</li>
              <li>
                O ID está entre <code className="bg-background px-1 rounded">/d/</code> e{" "}
                <code className="bg-background px-1 rounded">/view</code>
              </li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              Exemplo: https://drive.google.com/file/d/
              <span className="font-semibold text-foreground">1a2b3c4d5e6f7g8h9i0j</span>/view
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
