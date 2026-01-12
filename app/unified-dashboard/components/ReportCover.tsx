
import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HeaderLogo } from "@/components/header-logo"
import { MonthlyFile } from '../types'
import { formatCurrency, formatPeriod, computeTotalDAS, cn } from "@/lib/utils"
import { Brain, TrendingUp, PieChart, FileText, ArrowRight, BarChart3, Percent, Lightbulb, AlertTriangle, CheckCircle2, Target } from 'lucide-react'

interface ReportCoverProps {
    files: MonthlyFile[]
    companyName: string
    cnpj: string
    isDark?: boolean
}

export function ReportCover({ files, companyName, cnpj, isDark = false }: ReportCoverProps) {
    
    const summary = useMemo(() => {
        if (!files || files.length === 0) return null

        // Sort files by date
        const sortedFiles = [...files].sort((a, b) => {
            const dateA = new Date(a.data.identificacao.periodoApuracao.split('/').reverse().join('-'))
            const dateB = new Date(b.data.identificacao.periodoApuracao.split('/').reverse().join('-'))
            return dateA.getTime() - dateB.getTime()
        })

        const startDate = sortedFiles[0].data.identificacao.periodoApuracao
        const endDate = sortedFiles[sortedFiles.length - 1].data.identificacao.periodoApuracao
        
        let totalRevenue = 0
        let totalTax = 0
        let maxRevenue = { amount: 0, period: '' }
        let minRevenue = { amount: Infinity, period: '' }
        let activityBreakdown = { mercadorias: 0, servicos: 0, industria: 0 }
        
        // Detailed Tax Breakdown
        const taxesBreakdown = {
            IRPJ: 0, CSLL: 0, COFINS: 0, PIS_Pasep: 0, 
            INSS_CPP: 0, ICMS: 0, IPI: 0, ISS: 0, Total: 0
        }

        // Market Breakdown
        const marketBreakdown = {
            interno: 0,
            externo: 0
        }

        // Quarter tracking
        const quarters: Record<string, number> = {}

        sortedFiles.forEach(file => {
            const dados = file.data as any
            let revenue = Number(dados.receitas?.receitaPA) || 0
            const tax = computeTotalDAS(file.data)
            
            // Activity breakdown logic
            let servicos = 0
            let mercadorias = 0
            let industria = 0

            // 1. Try Analise Aliquota (Most Accurate)
            let detalhe = dados.calculos?.analise_aliquota?.detalhe || dados.calculos?.analiseAliquota?.detalhe || []
            if (Array.isArray(detalhe) && detalhe.length > 0) {
                detalhe.forEach((d: any) => {
                    const anexo = Number(d.anexo)
                    const valor = d.parcelas_ajuste?.reduce((acc: number, p: any) => acc + (Number(p.valor) || 0), 0) || Number(d.receita_bruta) || 0
                    
                    if ([1].includes(anexo)) {
                        mercadorias += valor
                    } else if ([2].includes(anexo)) {
                        industria += valor
                    } else if ([3, 4, 5].includes(anexo)) {
                        servicos += valor
                    }
                })
            } else {
                // 2. Fallback to Activities text analysis
                const at = dados.atividades
                if (at && typeof at === 'object') {
                    const items = Object.values(at).filter((x: any) => x && typeof x === 'object')
                    if (items.length > 0) {
                        items.forEach((i: any) => {
                            const nome = String(i?.descricao || '').toLowerCase()
                            const val = Number(i?.Total || 0)
                            if (nome.includes('servi')) servicos += val
                            else mercadorias += val
                        })
                    } else {
                         // 3. Fallback to Tributos Ratios
                        const rpa = revenue
                        const tServ = (dados.tributosServicosInterno?.Total || 0) + (dados.tributosServicosExterno?.Total || 0)
                        const tMerc = (dados.tributosMercadoriasInterno?.Total || 0) + (dados.tributosMercadoriasExterno?.Total || 0)
                        const tInd = (dados.tributosIndustriaInterno?.Total || 0) + (dados.tributosIndustriaExterno?.Total || 0)
                        const totalT = tServ + tMerc + tInd
                        
                        if (totalT > 0) {
                            servicos = rpa * (tServ / totalT)
                            mercadorias = rpa * (tMerc / totalT)
                            industria = rpa * (tInd / totalT)
                        } else {
                            servicos = rpa 
                        }
                    }
                }
            }

            // Consistency Check: If revenue is 0 but breakdown exists, use breakdown sum
            const breakdownSum = mercadorias + servicos + industria
            if (revenue === 0 && breakdownSum > 0) {
                revenue = breakdownSum
            }

            totalRevenue += revenue
            totalTax += tax

            // Robust Tax Aggregation
            // We sum from all available sub-categories to ensure we capture the breakdown
            const taxSources = [
                dados.tributos,
                dados.tributosMercadoriasInterno,
                dados.tributosMercadoriasExterno,
                dados.tributosIndustriaInterno,
                dados.tributosIndustriaExterno,
                dados.tributosServicosInterno,
                dados.tributosServicosExterno
            ].filter(t => t && typeof t === 'object');

            // If we have specific breakdowns (more than just the main 'tributos' or if main is empty/summary)
            // We prefer summing up specifics if they exist. 
            // However, sometimes 'tributos' is the ONLY one populated.
            // Strategy: Use specific categories if at least one exists. Else fallback to 'tributos'.
            const specificSources = [
                dados.tributosMercadoriasInterno,
                dados.tributosMercadoriasExterno,
                dados.tributosIndustriaInterno,
                dados.tributosIndustriaExterno,
                dados.tributosServicosInterno,
                dados.tributosServicosExterno
            ].filter(t => t && typeof t === 'object' && (t.Total > 0 || t.IRPJ > 0));

            const sourcesToUse = specificSources.length > 0 ? specificSources : (dados.tributos ? [dados.tributos] : []);

            sourcesToUse.forEach(t => {
                taxesBreakdown.IRPJ += Number(t.IRPJ) || 0
                taxesBreakdown.CSLL += Number(t.CSLL) || 0
                taxesBreakdown.COFINS += Number(t.COFINS) || 0
                taxesBreakdown.PIS_Pasep += Number(t.PIS_Pasep) || 0
                taxesBreakdown.INSS_CPP += Number(t.INSS_CPP) || 0
                taxesBreakdown.ICMS += Number(t.ICMS) || 0
                taxesBreakdown.IPI += Number(t.IPI) || 0
                taxesBreakdown.ISS += Number(t.ISS) || 0
                // We don't sum 'Total' here to avoid double counting, we calculate it at the end or trust the main totalTax
            });
            
            // If taxesBreakdown is still zero but totalTax > 0, it means we failed to parse breakdown.
            // We can't invent data, but we can avoid showing a zero-filled table later.

            // Aggregate Market Breakdown (Revenue based)
            const rpaExterno = dados.receitas?.mercadoExterno?.rpa || 0
            marketBreakdown.externo += rpaExterno
            marketBreakdown.interno += (revenue - rpaExterno)

            // Track Quarter
            const parts = file.data.identificacao.periodoApuracao.split('/')
            if (parts.length >= 2) {
                const month = parseInt(parts.length === 3 ? parts[1] : parts[0])
                const year = parts.length === 3 ? parts[2] : parts[1]
                const quarter = Math.ceil(month / 3)
                const qKey = `${quarter}º Trimestre/${year}`
                quarters[qKey] = (quarters[qKey] || 0) + revenue
            }

            if (revenue > maxRevenue.amount) {
                maxRevenue = { amount: revenue, period: file.data.identificacao.periodoApuracao }
            }
            if (revenue < minRevenue.amount && revenue > 0) {
                minRevenue = { amount: revenue, period: file.data.identificacao.periodoApuracao }
            }

            // Activity breakdown logic - values calculated above
            
            activityBreakdown.mercadorias += mercadorias
            activityBreakdown.servicos += servicos
            activityBreakdown.industria += industria
        })

        if (minRevenue.amount === Infinity) minRevenue = { amount: 0, period: '-' }

        const effectiveRate = totalRevenue > 0 ? (totalTax / totalRevenue) * 100 : 0
        const averageRevenue = totalRevenue / files.length
        const averageTax = totalTax / files.length
        
        // Find best quarter
        let bestQuarter = { name: '-', amount: 0 }
        Object.entries(quarters).forEach(([key, val]) => {
            if (val > bestQuarter.amount) {
                bestQuarter = { name: key, amount: val }
            }
        })
        
        // Determine main activity
        let mainActivity = 'Mercadorias'
        let maxActivityVal = activityBreakdown.mercadorias
        if (activityBreakdown.servicos > maxActivityVal) {
            mainActivity = 'Serviços'
            maxActivityVal = activityBreakdown.servicos
        }
        if (activityBreakdown.industria > maxActivityVal) {
            mainActivity = 'Indústria'
            maxActivityVal = activityBreakdown.industria
        }

        // Comparison Data (Last File)
        const lastFile = sortedFiles[sortedFiles.length - 1]
        const accumulatedRevenueCurrentYear = lastFile.data.receitas.rba || 0
        const accumulatedRevenuePreviousYear = lastFile.data.receitas.rbaa || 0 

        // Extract Anexo info from last file for "Alíquotas por Anexo" section
        const lastMonthAnexos = []
        const lastMonthDetalhe = lastFile.data.calculos?.analise_aliquota?.detalhe || []
        if (Array.isArray(lastMonthDetalhe)) {
            lastMonthDetalhe.forEach((d: any) => {
                 // Fix: Aggregate from parcelas_ajuste as detalhe structure is grouped by Anexo
                 const receitaAnexo = d.parcelas_ajuste?.reduce((acc: number, p: any) => acc + (Number(p.valor) || 0), 0) || 0
                 
                 let weightedRate = 0
                 if (receitaAnexo > 0 && Array.isArray(d.parcelas_ajuste)) {
                     const totalWeighted = d.parcelas_ajuste.reduce((acc: number, p: any) => {
                         const aliq = Number(p.aliquota_efetiva_atual_ajustada_percent) || Number(p.aliquota_efetiva_atual_percent) || 0
                         return acc + (aliq * (Number(p.valor) || 0))
                     }, 0)
                     weightedRate = totalWeighted / receitaAnexo
                 }

                 if (receitaAnexo > 0) {
                     lastMonthAnexos.push({
                         anexo: d.anexo,
                         aliquota: weightedRate,
                         receita: receitaAnexo
                     })
                 }
            })
        }

        // Generate Smart Insights
        const insights = []

        // 1. Revenue Growth/Decline
        if (accumulatedRevenuePreviousYear > 0) {
            const growth = ((accumulatedRevenueCurrentYear - accumulatedRevenuePreviousYear) / accumulatedRevenuePreviousYear) * 100
            if (growth > 0) {
                insights.push({
                    type: 'success',
                    icon: TrendingUp,
                    title: 'Crescimento de Receita',
                    description: `Sua empresa cresceu ${growth.toFixed(1)}% em relação ao acumulado do ano anterior. Mantenha o foco nos produtos/serviços de maior margem.`
                })
            } else {
                insights.push({
                    type: 'warning',
                    icon: AlertTriangle,
                    title: 'Retração de Receita',
                    description: `Houve uma queda de ${Math.abs(growth).toFixed(1)}% na receita acumulada. Considere rever precificação ou expandir canais de venda.`
                })
            }
        }

        // 2. Effective Rate Analysis
        if (effectiveRate > 10 && mainActivity === 'Serviços') {
             insights.push({
                type: 'info',
                icon: Lightbulb,
                title: 'Otimização Tributária (Fator R)',
                description: 'Sua alíquota efetiva está acima de 10%. Para empresas de serviços, verifique se o Fator R (folha de pagamento) está sendo utilizado para enquadramento no Anexo III (alíquotas menores).'
            })
        } else if (effectiveRate > 12) {
             insights.push({
                type: 'info',
                icon: Lightbulb,
                title: 'Alíquota Elevada',
                description: `Sua alíquota média de ${effectiveRate.toFixed(2)}% indica que a empresa está em faixas superiores do Simples. Planejamento tributário para o próximo exercício é recomendado.`
            })
        }

        // 3. Monofasic Products Opportunity (Commerce)
        if (mainActivity === 'Mercadorias' && taxesBreakdown.PIS_Pasep > 0) {
             insights.push({
                type: 'opportunity',
                icon: Target,
                title: 'Recuperação de Créditos (Monofásicos)',
                description: 'Identificamos pagamento de PIS/COFINS. Se você revende autopeças, bebidas, perfumaria ou farmácia, pode ter direito à redução de impostos (produtos monofásicos).'
            })
        }

        // 4. Seasonality
        if (bestQuarter.amount > (totalRevenue / 4) * 1.3) { // If best quarter is 30% better than average
            insights.push({
                type: 'info',
                icon: BarChart3,
                title: 'Sazonalidade Identificada',
                description: `O ${bestQuarter.name} representa uma fatia significativa do seu faturamento. Prepare seu fluxo de caixa para os períodos de menor movimento.`
            })
        }

        // 5. Default Regularity Message
        if (insights.length < 4) {
             insights.push({
                type: 'success',
                icon: CheckCircle2,
                title: 'Regularidade Fiscal',
                description: 'Manter o pagamento do DAS em dia é crucial para evitar a exclusão do Simples Nacional e multas de até 20%.'
            })
        }

        // RBT12 Oscillation Logic (Simples Nacional Tier Fluctuation Risk)
        let rbt12Oscillation = { status: 'stable', message: '' }
        let currentFaixa = '1ª Faixa'
        let nextFaixaLimit = 180000
        let rbt12 = 0

        if (files.length >= 1) {
            rbt12 = Number(files[files.length - 1].data.receitas.rbt12) || 0
            
            // Determine Faixa (2024 Limits)
            if (rbt12 <= 180000) { currentFaixa = '1ª Faixa'; nextFaixaLimit = 180000 }
            else if (rbt12 <= 360000) { currentFaixa = '2ª Faixa'; nextFaixaLimit = 360000 }
            else if (rbt12 <= 720000) { currentFaixa = '3ª Faixa'; nextFaixaLimit = 720000 }
            else if (rbt12 <= 1800000) { currentFaixa = '4ª Faixa'; nextFaixaLimit = 1800000 }
            else if (rbt12 <= 3600000) { currentFaixa = '5ª Faixa'; nextFaixaLimit = 3600000 }
            else { currentFaixa = '6ª Faixa'; nextFaixaLimit = 4800000 }

            if (files.length >= 2) {
                const firstRBT12 = Number(files[0].data.receitas.rbt12) || 0
                if (firstRBT12 > 0 && rbt12 > 0) {
                    const diff = rbt12 - firstRBT12
                    const percentDiff = (diff / firstRBT12) * 100
                    if (Math.abs(percentDiff) > 5) { // More sensitive threshold (was 10)
                        rbt12Oscillation = {
                            status: percentDiff > 0 ? 'increasing' : 'decreasing',
                            message: `O RBT12 (Faturamento 12 meses) variou ${Math.abs(percentDiff).toFixed(1)}% no período, impactando diretamente a alíquota nominal.`
                        }
                    }
                }
            }
        }

        // Short-term Trend (Last 3 months vs Average)
        let recentTrend = 'stable'
        if (files.length >= 3) {
            const last3Files = sortedFiles.slice(-3)
            const last3Avg = last3Files.reduce((acc, f) => acc + (parseFloat(f.data.receitaBrutaTotal) || 0), 0) / 3
            if (last3Avg > averageRevenue * 1.1) recentTrend = 'up'
            else if (last3Avg < averageRevenue * 0.9) recentTrend = 'down'
        }

        return {
            period: `${formatPeriod(startDate)} a ${formatPeriod(endDate)}`,
            totalRevenue,
            totalTax,
            taxesBreakdown,
            effectiveRate,
            averageRevenue,
            averageTax,
            maxRevenue,
            minRevenue,
            bestQuarter,
            mainActivity,
            fileCount: files.length,
            activityBreakdown,
            marketBreakdown,
            accumulatedRevenueCurrentYear,
            accumulatedRevenuePreviousYear,
            lastMonthAnexos,
            sortedFiles,
            insights,
            rbt12Oscillation,
            currentFaixa,
            nextFaixaLimit,
            rbt12,
            recentTrend
        }
    }, [files])

    if (!summary) return null

    // Helper for conditional classes
    const textPrimary = isDark ? "text-slate-100" : "text-slate-900"
    const textSecondary = isDark ? "text-slate-300" : "text-slate-700"
    const textMuted = isDark ? "text-slate-400" : "text-slate-500"
    const bgBadge = isDark ? "bg-blue-600 text-white" : "bg-slate-900 text-white"
    
    return (
        <div className={cn(
            "w-full min-h-[800px] flex flex-col items-center p-12 print:break-after-page relative overflow-hidden mb-8 border rounded-xl print:border-none shadow-sm print:shadow-none font-serif transition-colors duration-200",
            isDark ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"
        )}>
            
            {/* Minimal Header */}
            <div className={cn("w-full max-w-4xl border-b-2 pb-6 mb-10 flex justify-between items-end", isDark ? "border-slate-800" : "border-slate-800")}>
                <div>
                    <h1 className={cn("text-4xl font-bold tracking-tight mb-2", textPrimary)}>
                        Relatório Executivo
                    </h1>
                    <p className={cn("text-lg italic", isDark ? "text-slate-400" : "text-slate-600")}>
                        Análise de Performance e Inteligência Tributária
                    </p>
                </div>
                <div className="text-right">
                    <p className={cn("text-sm font-bold uppercase tracking-widest", textMuted)}>{companyName}</p>
                    <p className="text-xs text-slate-400 font-mono">{cnpj}</p>
                </div>
            </div>

            <div className="w-full max-w-4xl space-y-10">
                
                {/* 1. Visão Geral */}
                <section>
                    <h2 className={cn("text-xl font-bold uppercase tracking-wide mb-3 flex items-center gap-2", textPrimary)}>
                        <span className={cn("w-6 h-6 rounded flex items-center justify-center text-xs", bgBadge)}>1</span>
                        Visão Geral
                    </h2>
                    <p className={cn("text-justify leading-relaxed", textSecondary)}>
                        No período de <strong>{summary.period}</strong>, a empresa registrou uma Receita Bruta Total de <strong>{formatCurrency(summary.totalRevenue)}</strong>. 
                        A carga tributária total (DAS) foi de <strong>{formatCurrency(summary.totalTax)}</strong>, representando uma alíquota efetiva média de <strong>{summary.effectiveRate.toFixed(2)}%</strong> sobre o faturamento.
                        {summary.rbt12Oscillation.message && ` ${summary.rbt12Oscillation.message}`}
                        {summary.accumulatedRevenuePreviousYear > 0 && (
                            <> Comparado ao acumulado do ano anterior, observamos uma {summary.accumulatedRevenueCurrentYear > summary.accumulatedRevenuePreviousYear ? 'evolução' : 'retração'} de {Math.abs(((summary.accumulatedRevenueCurrentYear - summary.accumulatedRevenuePreviousYear) / summary.accumulatedRevenuePreviousYear) * 100).toFixed(1)}%.</>
                        )}
                    </p>
                </section>

                {/* 2. Estrutura do Faturamento */}
                <section>
                    <h2 className={cn("text-xl font-bold uppercase tracking-wide mb-3 flex items-center gap-2", textPrimary)}>
                        <span className={cn("w-6 h-6 rounded flex items-center justify-center text-xs", bgBadge)}>2</span>
                        Estrutura do Faturamento
                    </h2>
                    <p className={cn("text-justify leading-relaxed", textSecondary)}>
                        A composição da receita demonstra uma predominância de <strong>{summary.mainActivity}</strong>. 
                        Do total faturado, <strong>{formatCurrency(summary.activityBreakdown.servicos)}</strong> provêm de Serviços, 
                        <strong> {formatCurrency(summary.activityBreakdown.mercadorias)}</strong> de Comércio e 
                        <strong> {formatCurrency(summary.activityBreakdown.industria)}</strong> de Indústria.
                        {summary.marketBreakdown.externo > 0 && ` A atuação no mercado externo representou ${formatCurrency(summary.marketBreakdown.externo)} do total.`}
                    </p>
                </section>

                {/* 3. Evolução da Receita */}
                <section>
                    <h2 className={cn("text-xl font-bold uppercase tracking-wide mb-3 flex items-center gap-2", textPrimary)}>
                        <span className={cn("w-6 h-6 rounded flex items-center justify-center text-xs", bgBadge)}>3</span>
                        Evolução da Receita
                    </h2>
                    <p className={cn("text-justify leading-relaxed", textSecondary)}>
                        O faturamento médio mensal situou-se em <strong>{formatCurrency(summary.averageRevenue)}</strong>. 
                        Destaca-se o período de <strong>{summary.bestQuarter.name}</strong> como o de melhor performance, somando <strong>{formatCurrency(summary.bestQuarter.amount)}</strong>.
                        {summary.recentTrend !== 'stable' && (
                            <> A tendência de curto prazo (últimos 3 meses) aponta para um <strong>{summary.recentTrend === 'up' ? 'aquecimento' : 'desaquecimento'}</strong> das atividades em relação à média do período.</>
                        )}
                        {summary.minRevenue.amount > 0 && ` Em contrapartida, o mês de menor movimento registrou ${formatCurrency(summary.minRevenue.amount)}, indicando a volatilidade que requer atenção no fluxo de caixa.`}
                    </p>
                </section>

                {/* 4. Distribuição da Carga Tributária */}
                <section>
                    <h2 className={cn("text-xl font-bold uppercase tracking-wide mb-3 flex items-center gap-2", textPrimary)}>
                        <span className={cn("w-6 h-6 rounded flex items-center justify-center text-xs", bgBadge)}>4</span>
                        Distribuição da Carga Tributária
                    </h2>
                    <p className={cn("text-justify leading-relaxed mb-2", textSecondary)}>
                        O pagamento de impostos é composto por diversos tributos federais, estaduais e municipais. A maior fatia corresponde ao 
                        <strong> {Object.entries(summary.taxesBreakdown).sort(([,a], [,b]) => b - a)[0][0]}</strong>. Abaixo o detalhamento:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        {Object.entries(summary.taxesBreakdown).filter(([k, v]) => v > 0 && k !== 'Total').map(([key, value]) => {
                            const percentage = summary.totalTax > 0 ? (value / summary.totalTax) * 100 : 0
                            return (
                                <div key={key} className={cn("border-l-2 pl-3", isDark ? "border-slate-700" : "border-slate-300")}>
                                    <span className={cn("text-xs font-bold uppercase block", textMuted)}>{key}</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className={cn("text-sm font-mono font-medium", textPrimary)}>{formatCurrency(value)}</span>
                                        <span className={cn("text-xs", textMuted)}>({percentage.toFixed(1)}%)</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* 5. Análise de Alíquota Efetiva */}
                <section>
                    <h2 className={cn("text-xl font-bold uppercase tracking-wide mb-3 flex items-center gap-2", textPrimary)}>
                        <span className={cn("w-6 h-6 rounded flex items-center justify-center text-xs", bgBadge)}>5</span>
                        Análise de Alíquota e Enquadramento
                    </h2>
                    <p className={cn("text-justify leading-relaxed", textSecondary)}>
                        A alíquota efetiva de <strong>{summary.effectiveRate.toFixed(2)}%</strong> reflete o peso real dos impostos sobre o faturamento.
                        Com base na Receita Bruta dos últimos 12 meses (RBT12) de <strong>{formatCurrency(summary.rbt12)}</strong>, a empresa encontra-se na <strong>{summary.currentFaixa}</strong> do Simples Nacional.
                        {summary.rbt12 < summary.nextFaixaLimit && summary.nextFaixaLimit < 4800000 && (
                            <> Restam aproximadamente <strong>{formatCurrency(summary.nextFaixaLimit - summary.rbt12)}</strong> de faturamento acumulado antes de uma possível mudança de faixa.</>
                        )}
                        {summary.lastMonthAnexos.length > 0 && (
                            <>
                                <br/>
                                No último mês apurado, a tributação foi segregada nos seguintes Anexos:
                                <ul className="list-disc list-inside mt-2 ml-4">
                                    {summary.lastMonthAnexos.map((a, idx) => (
                                        <li key={idx}>Anexo {a.anexo}: Alíquota de {a.aliquota.toFixed(2)}% sobre {formatCurrency(a.receita)}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 6. Oportunidades */}
                    <section>
                        <h2 className={cn("text-xl font-bold uppercase tracking-wide mb-3 flex items-center gap-2", isDark ? "text-emerald-400" : "text-emerald-700")}>
                            <span className={cn("w-6 h-6 rounded flex items-center justify-center text-xs", isDark ? "bg-emerald-900 text-emerald-100" : "bg-emerald-700 text-white")}>6</span>
                            Oportunidades
                        </h2>
                        <ul className="space-y-3">
                            {summary.insights.filter(i => i.type === 'opportunity' || i.type === 'success').map((insight, idx) => (
                                <li key={idx} className={cn("flex gap-2 items-start text-sm", textSecondary)}>
                                    <CheckCircle2 className={cn("w-4 h-4 mt-0.5 shrink-0", isDark ? "text-emerald-400" : "text-emerald-600")} />
                                    <span><strong>{insight.title}:</strong> {insight.description}</span>
                                </li>
                            ))}
                            {summary.insights.filter(i => i.type === 'opportunity' || i.type === 'success').length === 0 && (
                                <li className="text-sm text-slate-500 italic">Nenhuma oportunidade crítica identificada neste período. Continue monitorando a segregação de receitas.</li>
                            )}
                        </ul>
                    </section>

                    {/* 7. Alertas */}
                    <section>
                        <h2 className={cn("text-xl font-bold uppercase tracking-wide mb-3 flex items-center gap-2", isDark ? "text-amber-400" : "text-amber-700")}>
                            <span className={cn("w-6 h-6 rounded flex items-center justify-center text-xs", isDark ? "bg-amber-900 text-amber-100" : "bg-amber-700 text-white")}>7</span>
                            Alertas
                        </h2>
                        <ul className="space-y-3">
                            {summary.insights.filter(i => i.type === 'warning' || i.type === 'info').map((insight, idx) => (
                                <li key={idx} className={cn("flex gap-2 items-start text-sm", textSecondary)}>
                                    <AlertTriangle className={cn("w-4 h-4 mt-0.5 shrink-0", isDark ? "text-amber-400" : "text-amber-600")} />
                                    <span><strong>{insight.title}:</strong> {insight.description}</span>
                                </li>
                            ))}
                            {summary.insights.filter(i => i.type === 'warning' || i.type === 'info').length === 0 && (
                                <li className="text-sm text-slate-500 italic">Nenhum alerta crítico para o período. A operação aparenta regularidade.</li>
                            )}
                        </ul>
                    </section>
                </div>

                {/* 8. Conclusão */}
                <section className={cn("p-6 rounded-lg border", isDark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200")}>
                    <h2 className={cn("text-xl font-bold uppercase tracking-wide mb-3 flex items-center gap-2", textPrimary)}>
                        <span className={cn("w-6 h-6 rounded flex items-center justify-center text-xs", bgBadge)}>8</span>
                        Conclusão
                    </h2>
                    <p className={cn("text-justify leading-relaxed", textSecondary)}>
                        A análise do período indica uma empresa {summary.totalRevenue > 0 ? 'operacionalmente ativa' : 'com pouca movimentação'}, atualmente enquadrada na <strong>{summary.currentFaixa}</strong>.
                        {summary.recentTrend !== 'stable' && ` Observa-se um momento de ${summary.recentTrend === 'up' ? 'crescimento recente' : 'desaceleração'} nas operações.`} 
                        Recomenda-se {summary.mainActivity === 'Mercadorias' ? 'atenção especial à segregação de produtos monofásicos para redução legal de impostos' : 'monitoramento do Fator R para garantir a melhor alíquota nos serviços'}.
                        A gestão fiscal proativa será determinante para a manutenção da saúde financeira e competitividade nos próximos ciclos.
                    </p>
                </section>

                <div className="pt-12 text-center">
                    <p className="text-xs text-slate-400">Relatório gerado automaticamente por Inteligência Artificial - V0 PGDAS</p>
                </div>

            </div>

        </div>
    )
}
