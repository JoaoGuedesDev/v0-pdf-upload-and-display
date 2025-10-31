"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Building2, FileText, DollarSign, TrendingUp, Receipt, Percent } from "lucide-react"

import { PdfGenerator } from "./pdf-generator"

interface DasDataDisplayProps {
  data: any
}

export function DasDataDisplay({ data }: DasDataDisplayProps) {
  const dados = data.dados || {}
  const identificacao = dados.identificacao || {}
  const receitas = dados.receitas || {}
  const tributos = dados.tributos || {}
  const calculos = dados.calculos || {}

  // Função para formatação brasileira com vírgula como separador decimal
  const formatBrazilianDecimal = (value: number, decimals: number = 6): string => {
    return value.toFixed(decimals).replace('.', ',')
  }
  const historico = dados.historico || {}
  const graficos = data.graficos || {}
  
  // Nome do arquivo PDF baseado nos dados de identificação
  const pdfFileName = `PGDAS-${identificacao.cnpj || 'empresa'}-${identificacao.periodo || 'relatorio'}.pdf`
  
  // Texto/Imagem de marca d'água desativada para evitar logos duplicadas
  const watermarkText = ""

  // Preparar dados para gráfico de tributos
  const tributosData =
    graficos.tributosBar?.labels?.map((label: string, index: number) => ({
      name: label,
      valor: graficos.tributosBar.values[index] || 0,
    })) || []

  // Preparar dados para gráfico de pizza (cores seguras em hex)
  const COLORS = [
    "#6366F1", // Roxo/Indigo
    "#F59E0B", // Laranja/Amber
    "#22C55E", // Verde
    "#60A5FA", // Azul claro
    "#F472B6", // Rosa
    "#F59E0B", // Amarelo/Amber
    "#EF4444", // Vermelho
    "#06B6D4", // Ciano
  ]

  const pieData =
    graficos.dasPie?.labels
      ?.map((label: string, index: number) => ({
        name: label,
        value: graficos.dasPie.values[index] || 0,
      }))
      .filter((item: any) => item.value > 0) || []

  // Preparar dados para gráfico de linha de receitas
  const receitasLineData =
    graficos.receitaLine?.labels?.map((label: string, index: number) => ({
      mes: label,
      valor: graficos.receitaLine.values[index] || 0,
    })) || []

  return (
    <div id="pdf-content" className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">PASSO 2: DADOS DO DAS PROCESSADOS</h2>
          <p className="text-muted-foreground">Visualize os resultados da análise do documento DAS</p>
        </div>
      </div>

      {/* Seção de Identificação */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Building2 className="w-5 h-5" />
            Identificação da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">CNPJ</p>
              <p className="text-lg font-semibold text-foreground">{identificacao.cnpj || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Razão Social</p>
              <p className="text-lg font-semibold text-foreground">{identificacao.razaoSocial || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Período de Apuração</p>
              <p className="text-lg font-semibold text-foreground">{identificacao.periodoApuracao || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Município/UF</p>
              <p className="text-lg font-semibold text-foreground">
                {identificacao.municipio && identificacao.uf ? `${identificacao.municipio}/${identificacao.uf}` : "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Receitas e Impostos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Bruta PA</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{receitas.receitaPAFormatada || "R$ 0,00"}</div>
            <p className="text-xs text-muted-foreground mt-1">Período de apuração</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">RBT12</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(receitas.rbt12 || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Receita 12 meses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor do DAS</CardTitle>
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{dados.valorTotalDASFormatado || "R$ 0,00"}</div>
            <p className="text-xs text-muted-foreground mt-1">Total a pagar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alíquota Efetiva</CardTitle>
            <Percent className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{calculos.aliquotaEfetivaFormatada || formatBrazilianDecimal(calculos.aliquotaEfetiva || calculos.aliquotaEfetivaPercent || 0, 6)}%</div>
            <p className="text-xs text-muted-foreground mt-1">DAS / Receita PA</p>
          </CardContent>
        </Card>
      </div>

      {/* Card de Tributos Detalhados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="w-5 h-5" />
            Tributos Detalhados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(tributos).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <p className="text-sm text-muted-foreground">{key}</p>
                <p className="text-lg font-semibold text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value as number)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Linha - Receitas Mensais (primeiro, ocupando largura total) */}
        {receitasLineData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-foreground">Evolução de Receitas - Mercado Interno</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={receitasLineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mes" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(value: any) => [
                      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value),
                      "Receita",
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ fill: "#2563eb", r: 6 }}
                    name="Receita Mensal"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Gráfico de Pizza - Composição do DAS (abaixo da evolução de receitas) */}
        {pieData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-foreground">Composição do DAS</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => {
                      const { name, percent } = props;
                      return `${name}: ${(percent * 100).toFixed(1)}%`;
                    }}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [
                      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value),
                      "Valor",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Card de Cálculos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Indicadores Calculados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Alíquota Efetiva</p>
              <p className="text-2xl font-bold text-foreground">{calculos.aliquotaEfetivaFormatada || formatBrazilianDecimal(calculos.aliquotaEfetiva || calculos.aliquotaEfetivaPercent || 0, 6)}%</p>
              <p className="text-xs text-muted-foreground mt-1">Percentual do DAS sobre a receita</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Margem Líquida</p>
              <p className="text-2xl font-bold text-foreground">{(calculos.margemLiquida || calculos.margemLiquidaPercent || 0).toFixed(3)}%</p>
              <p className="text-xs text-muted-foreground mt-1">Receita após impostos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados Brutos (para debug) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Dados Completos (JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-secondary p-4 rounded-lg overflow-auto text-xs max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Botões no rodapé: Gerar PDF ao lado do outro botão */}
      <div className="flex justify-end gap-3 pt-2">
        <PdfGenerator 
          contentId="pdf-content" 
          fileName={pdfFileName}
          isTextWatermark={false}
        />
      </div>
    </div>
  )
}
