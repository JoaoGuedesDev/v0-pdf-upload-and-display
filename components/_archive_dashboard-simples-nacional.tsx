"use client"

import { useState } from "react"
import {
  Calendar,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Target,
  DollarSign,
  PieChart,
  BarChart,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Info,
  Download,
  Clock,
  Shield,
  HelpCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Tipos para componentes de gráficos
type ChartComponentProps = React.HTMLAttributes<HTMLDivElement>;

// Mock dos componentes de gráficos para evitar erros de importação
const RechartsBarChart = (props: ChartComponentProps) => <div {...props} />
const Bar = (props: ChartComponentProps) => <div {...props} />
const RechartsPieChart = (props: ChartComponentProps) => <div {...props} />
const Pie = (props: ChartComponentProps) => <div {...props} />
const LineChart = (props: ChartComponentProps) => <div {...props} />
const Line = (props: ChartComponentProps) => <div {...props} />
const XAxis = (props: ChartComponentProps) => <div {...props} />
const YAxis = (props: ChartComponentProps) => <div {...props} />
const CartesianGrid = (props: ChartComponentProps) => <div {...props} />
const Tooltip = (props: ChartComponentProps) => <div {...props} />
const Legend = (props: ChartComponentProps) => <div {...props} />
const ResponsiveContainer = (props: ChartComponentProps) => <div {...props} />
const Cell = (props: ChartComponentProps) => <div {...props} />

// Interfaces para tipagem dos dados
interface Identificacao {
  cnpj: string;
  razaoSocial: string;
  periodoApuracao: string;
  municipio: string;
  uf: string;
}

interface Receita {
  receitaPA: number;
  rbt12: number;
  limite: number;
  percentualLimite: number;
  historicoReceitas: Array<{ mes: string; valor: number }>;
}

interface Tributo {
  IRPJ: number;
  CSLL: number;
  COFINS: number;
  PIS_PASEP: number;
  INSS_CPP: number;
  ICMS: number;
  ISS: number;
  Total: number;
}

interface Insight {
  tipo: string;
  icone: string;
  titulo: string;
  descricao: string;
}

interface DadosMock {
  identificacao: Identificacao;
  receitas: Receita;
  tributos: Tributo;
  insights: Insight[];
}

// Dados mockados para a dashboard
const mockData: DadosMock = {
  identificacao: {
    cnpj: "12.345.678/0001-90",
    razaoSocial: "Empresa Exemplo Ltda",
    periodoApuracao: "Abril/2023",
    municipio: "São Paulo",
    uf: "SP"
  },
  receitas: {
    receitaPA: 45000,
    rbt12: 480000,
    limite: 4800000,
    percentualLimite: 11.2,
    historicoReceitas: [
      { mes: "Jan", valor: 38000 },
      { mes: "Fev", valor: 42000 },
      { mes: "Mar", valor: 39500 },
      { mes: "Abr", valor: 45000 },
      { mes: "Mai", valor: 41200 },
      { mes: "Jun", valor: 43800 }
    ]
  },
  tributos: {
    IRPJ: 1350,
    CSLL: 900,
    COFINS: 1620,
    PIS_PASEP: 351,
    INSS_CPP: 1980,
    ICMS: 810,
    ISS: 1125,
    Total: 8136
  },
  insights: [
    { tipo: "positivo", icone: "✅", titulo: "Faturamento crescente", descricao: "Aumento de 12% em relação ao mês anterior" },
    { tipo: "oportunidade", icone: "🔍", titulo: "Economia tributária", descricao: "Possível redução de 8% nos impostos com planejamento" },
    { tipo: "evolucao", icone: "📈", titulo: "Margem de lucro", descricao: "Margem atual de 18% está acima da média do setor (15%)" }
  ]
}

// Cores para os gráficos
const CHART_COLORS = {
  IRPJ: "#3B82F6",     // Azul
  CSLL: "#6366F1",     // Azul-roxo
  COFINS: "#8B5CF6",   // Roxo
  PIS_PASEP: "#EC4899", // Rosa
  INSS_CPP: "#F43F5E", // Vermelho
  ICMS: "#F97316",     // Laranja
  ISS: "#F59E0B",      // Amarelo
  positivo: "#10B981", // Verde
  alerta: "#F59E0B",   // Amarelo
  critico: "#EF4444",  // Vermelho
  secundario: "#6B7280" // Cinza
}

export function DashboardSimplesNacional() {
  const [darkMode, setDarkMode] = useState(false)
  const [viewMode, setViewMode] = useState<"simple" | "detailed">("simple")
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    detalhes: false,
    historico: false,
    comparativo: false
  })

  // Preparar dados para gráficos
  const tributosData = Object.entries(mockData.tributos)
    .filter(([key]) => key !== "Total")
    .map(([key, value]) => ({
      name: key === "PIS_PASEP" ? "PIS" : key === "INSS_CPP" ? "INSS" : key,
      value,
      color: CHART_COLORS[key as keyof typeof CHART_COLORS] || "#6B7280"
    }))

  // Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Função para alternar seções expandidas
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Determinar cor para o medidor de limite
  const getLimitColor = (percent: number) => {
    if (percent <= 60) return CHART_COLORS.positivo
    if (percent <= 80) return CHART_COLORS.alerta
    return CHART_COLORS.critico
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-[#F8FAFC] text-gray-900'}`}>
      {/* Cabeçalho */}
      <header className="p-6 md:p-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{mockData.identificacao.razaoSocial}</h1>
            <div className="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4 mr-1" />
              <span>CNPJ: {mockData.identificacao.cnpj}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="rounded-full"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === "simple" ? "detailed" : "simple")}
              className="hidden md:flex"
            >
              {viewMode === "simple" ? "Visão Detalhada" : "Visão Simplificada"}
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Mês de Referência
              </CardTitle>
              <CardDescription>
                {mockData.identificacao.periodoApuracao}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{mockData.identificacao.municipio} - {mockData.identificacao.uf}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-blue-700 dark:text-blue-300 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Guia de Impostos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(mockData.tributos.Total)}
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                Vencimento: 20/05/2023
              </p>
            </CardContent>
          </Card>
        </div>
      </header>

      <main className="p-6 md:p-8 grid gap-6">
        {/* Resumo Tributário */}
        <section>
          <h2 className="text-xl font-bold mb-4">Para Onde Vai Seu Dinheiro</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Composição Tributária</CardTitle>
                <CardDescription>Distribuição dos impostos</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={tributosData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {tributosData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Detalhamento por Tributo</CardTitle>
                <CardDescription>Valores individuais</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {tributosData.map((item) => (
                    <div key={item.name} className="flex items-center">
                      <div className="w-24 font-medium">{item.name}</div>
                      <div className="flex-1 mx-2">
                        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              width: `${(item.value / mockData.tributos.Total) * 100}%`,
                              backgroundColor: item.color 
                            }} 
                          />
                        </div>
                      </div>
                      <div className="w-24 text-right">{formatCurrency(item.value)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Evolução de Receitas e Situação do Limite */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolução de Receitas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Evolução de Faturamento
              </CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={mockData.receitas.historicoReceitas}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="mes" />
                    <YAxis 
                      tickFormatter={(value) => `R$ ${value / 1000}k`}
                      width={60}
                    />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar 
                      dataKey="valor" 
                      fill="#3B82F6" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="valor" 
                      stroke="#10B981" 
                      strokeWidth={2} 
                      dot={false}
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Situação do Limite */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Limite do Simples
              </CardTitle>
              <CardDescription>Faturamento acumulado 12 meses</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col items-center">
              <div className="relative h-48 w-48 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Círculo de fundo */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={darkMode ? "#374151" : "#E5E7EB"}
                    strokeWidth="8"
                  />
                  {/* Círculo de progresso */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none" as any
                    stroke={getLimitColor(mockData.receitas.percentualLimite)}
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - mockData.receitas.percentualLimite / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                  <text
                    x="50"
                    y="45"
                    textAnchor="middle"
                    fontSize="16"
                    fontWeight="bold"
                    fill={darkMode ? "white" : "black"}
                  >
                    {mockData.receitas.percentualLimite}%
                  </text>
                  <text
                    x="50"
                    y="60"
                    textAnchor="middle"
                    fontSize="8"
                    fill={darkMode ? "#D1D5DB" : "#6B7280"}
                  >
                    utilizado
                  </text>
                </svg>
              </div>
              <div className="text-center mt-4">
                <p className="text-lg font-medium">
                  {formatCurrency(mockData.receitas.rbt12)} / {formatCurrency(mockData.receitas.limite)}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  R$ 4,2 mi disponíveis
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights Inteligentes */}
        <section>
          <h2 className="text-xl font-bold mb-4">Insights Inteligentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockData.insights.map((insight, index) => (
              <Card key={index} className="overflow-hidden">
                <div 
                  className={`h-1 w-full ${
                    insight.tipo === "positivo" ? "bg-green-500" :
                    insight.tipo === "oportunidade" ? "bg-amber-500" : "bg-blue-500"
                  }`}
                />
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <span className="mr-2">{insight.icone}</span>
                    {insight.titulo}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{insight.descricao}</p>
                  <Button variant="link" className="p-0 h-auto mt-2">
                    Como melhorar?
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Seções Colapsáveis */}
        <section className="space-y-4">
          {/* Detalhes Tributários */}
          <Card>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("detalhes")}>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Detalhes Tributários</span>
                {expandedSections.detalhes ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
            {expandedSections.detalhes && (
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Percentual de Impostos:</span>
                    <span className="font-medium">{((mockData.tributos.Total / mockData.receitas.receitaPA) * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Faixa do Simples:</span>
                    <span className="font-medium">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Anexo:</span>
                    <span className="font-medium">III</span>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Histórico Completo */}
          <Card>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("historico")}>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Histórico Completo</span>
                {expandedSections.historico ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
            {expandedSections.historico && (
              <CardContent>
                <div className="space-y-2">
                  <p>Histórico de faturamento e impostos dos últimos 12 meses.</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Relatório Completo
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Comparativo com Média */}
          <Card>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleSection("comparativo")}>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Comparativo com Média</span>
                {expandedSections.comparativo ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </CardTitle>
            </CardHeader>
            {expandedSections.comparativo && (
              <CardContent>
                <div className="space-y-2">
                  <p>Seu percentual de impostos está 2.3% abaixo da média do seu setor.</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Agendar Análise Personalizada
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </section>

        {/* Elementos de Confiança */}
        <footer className="mt-8 border-t pt-6 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-1" />
              <span>Dados Oficiais Receita Federal</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>Atualizado em: 05/05/2023 às 10:32</span>
            </div>
            <div className="flex items-center">
              <HelpCircle className="h-4 w-4 mr-1" />
              <a href="#" className="hover:underline">Dúvidas Frequentes</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}