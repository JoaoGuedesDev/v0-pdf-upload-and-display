"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Building2, FileText, DollarSign, TrendingUp, Receipt, Percent } from "lucide-react"

interface DasDataDisplayProps {
  data: any
}

export function DasDataDisplay({ data }: DasDataDisplayProps) {
  const dados = data.dados || {}
  const identificacao = dados.identificacao || {}
  const receitas = dados.receitas || {}
  const tributos = dados.tributos || {}
  const calculos = dados.calculos || {}
  const historico = dados.historico || {}
  const graficos = data.graficos || {}

  // Preparar dados para gráfico de tributos
  const tributosData =
    graficos.tributosBar?.labels?.map((label: string, index: number) => ({
      name: label,
      valor: graficos.tributosBar.values[index] || 0,
    })) || []

  // Preparar dados para gráfico de pizza
  const COLORS = [
    "oklch(0.42 0.19 264)", // Roxo
    "oklch(0.68 0.21 25)", // Laranja
    "oklch(0.55 0.15 150)", // Verde
    "oklch(0.65 0.18 200)", // Azul claro
    "oklch(0.50 0.20 300)", // Rosa
    "oklch(0.60 0.16 100)", // Amarelo
    "oklch(0.45 0.18 350)", // Vermelho
    "oklch(0.70 0.12 180)", // Ciano
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">PASSO 2: DADOS DO DAS PROCESSADOS</h2>
        <p className="text-muted-foreground">Visualize os resultados da análise do documento DAS</p>
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
            <div className="text-2xl font-bold text-foreground">{calculos.aliquotaEfetiva?.toFixed(2) || "0.00"}%</div>
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
        {/* Gráfico de Barras - Tributos */}
        {tributosData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Distribuição de Tributos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tributosData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 264)" />
                  <XAxis dataKey="name" stroke="oklch(0.55 0.01 264)" angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="oklch(0.55 0.01 264)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(1 0 0)",
                      border: "1px solid oklch(0.92 0.01 264)",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(value: any) => [
                      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value),
                      "Valor",
                    ]}
                  />
                  <Bar dataKey="valor" fill="oklch(0.42 0.19 264)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Gráfico de Pizza - Composição do DAS */}
        {pieData.length > 0 && (
          <Card>
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
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={80}
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

        {/* Gráfico de Linha - Receitas Mensais */}
        {receitasLineData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-foreground">Evolução de Receitas - Mercado Interno</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={receitasLineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 264)" />
                  <XAxis dataKey="mes" stroke="oklch(0.55 0.01 264)" />
                  <YAxis stroke="oklch(0.55 0.01 264)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(1 0 0)",
                      border: "1px solid oklch(0.92 0.01 264)",
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
                    stroke="oklch(0.42 0.19 264)"
                    strokeWidth={3}
                    dot={{ fill: "oklch(0.42 0.19 264)", r: 6 }}
                    name="Receita Mensal"
                  />
                </LineChart>
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
              <p className="text-2xl font-bold text-foreground">{calculos.aliquotaEfetiva?.toFixed(2) || "0.00"}%</p>
              <p className="text-xs text-muted-foreground mt-1">Percentual do DAS sobre a receita</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Margem Líquida</p>
              <p className="text-2xl font-bold text-foreground">{calculos.margemLiquida?.toFixed(2) || "0.00"}%</p>
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
    </div>
  )
}
