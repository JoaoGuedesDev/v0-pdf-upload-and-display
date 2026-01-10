"use client"

import { X, AlertTriangle, FileWarning } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RejectedFile {
  name: string
  reason: string
}

interface RejectedFilesPopupProps {
  isOpen: boolean
  onClose: () => void
  rejectedFiles: RejectedFile[]
}

export function RejectedFilesPopup({ isOpen, onClose, rejectedFiles }: RejectedFilesPopupProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background border border-border rounded-xl shadow-2xl max-w-lg w-full m-4 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-border flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Arquivos Rejeitados</h2>
              <p className="text-sm text-muted-foreground">
                {rejectedFiles.length} {rejectedFiles.length === 1 ? 'arquivo não será processado' : 'arquivos não serão processados'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="-mt-2 -mr-2">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {rejectedFiles.map((file, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <FileWarning className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-foreground break-all">
                  {file.name}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {file.reason}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/30 border-t border-border flex justify-end">
          <Button onClick={onClose} className="min-w-[100px]">
            Entendi
          </Button>
        </div>
      </div>
    </div>
  )
}
