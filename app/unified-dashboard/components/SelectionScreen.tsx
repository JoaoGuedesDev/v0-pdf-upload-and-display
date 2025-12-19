'use client'

import { MonthlyFile } from '../types'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar, FileText, BarChart3, ArrowRight } from "lucide-react"

interface SelectionScreenProps {
  files: MonthlyFile[]
  onSelectMonth: (index: number) => void
  onConsolidate: () => void
}

export function SelectionScreen({ files, onSelectMonth, onConsolidate }: SelectionScreenProps) {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Dashboard Unificado</h1>
        <p className="text-muted-foreground text-lg">
          Gerenciamento e consolidação de dados fiscais mensais
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Monthly Selection Card */}
        <Card className="h-full hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              Dados Mensais
            </CardTitle>
            <CardDescription>
              Visualize os detalhes de apuração de cada mês individualmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {files.map((file, index) => (
                <Button
                  key={file.filename}
                  variant="outline"
                  className="w-full justify-between group"
                  onClick={() => onSelectMonth(index)}
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {file.data.identificacao.periodoApuracao}
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              ))}
              {files.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum arquivo encontrado.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Annual Consolidation Card */}
        <Card className="h-full hover:shadow-lg transition-shadow border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Relatório Anual
            </CardTitle>
            <CardDescription>
              Consolide todos os dados mensais em uma visão estratégica anual
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-center h-[300px] space-y-6">
            <div className="text-center space-y-2">
              <div className="text-5xl font-bold text-primary">
                {files.length}
              </div>
              <p className="text-muted-foreground">Meses disponíveis para processamento</p>
            </div>
            <Button 
              size="lg" 
              className="w-full text-lg h-12" 
              onClick={onConsolidate}
              disabled={files.length === 0}
            >
              Gerar Relatório Anual Consolidado
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
