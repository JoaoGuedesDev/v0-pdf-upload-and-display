import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MessageCircle, Mail } from "lucide-react"

export function DashboardFooter() {
  return (
    <Card className="bg-card border-border rounded-2xl" style={{ breakInside: 'avoid' }}>
      <CardHeader className="py-2">
        <CardTitle className="text-card-foreground tracking-tight">Contato e Ações</CardTitle>
        <CardDescription className="leading-relaxed">Caso queira uma análise mais completa e personalizada</CardDescription>
      </CardHeader>
      <CardContent className="py-2">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="rounded-xl p-3 bg-muted/50 dark:bg-[#3A3A3A]/50">
              <ul className="space-y-2 text-[#007AFF] dark:text-[#00C2FF]">
                <li className="flex items-start gap-2"><span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-[#007AFF]" />Cenários comparativos entre regimes tributários</li>
                <li className="flex items-start gap-2"><span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-[#007AFF]" />Simulações de economia fiscal</li>
                <li className="flex items-start gap-2"><span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-[#007AFF]" />Recomendações exclusivas para o seu ramo</li>
              </ul>
            </div>
          </div>
          <div>
            <div className={`rounded-xl p-4 bg-muted/70 dark:bg-[#3A3A3A]/70 text-[#3A3A3A] dark:text-[#FFFFFF] border border-border dark:border-[#007AFF]/30`}>
              <p className="font-semibold text-[#3A3A3A] dark:text-[#FFFFFF] mb-2">Fale com a Integra</p>
              <div className="space-y-2">
                <a className="flex items-center gap-2 hover:text-[#007AFF] dark:hover:text-[#00C2FF]" href="https://wa.me/559481264638" target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 text-[#007AFF]" />WhatsApp: 94 8126-4638</a>
                <a className="flex items-center gap-2 hover:text-[#007AFF] dark:hover:text-[#00C2FF]" href="mailto:atendimento@integratecnologia.inf.br"><Mail className="h-4 w-4 text-[#007AFF]" />E-mail: atendimento@integratecnologia.inf.br</a>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
