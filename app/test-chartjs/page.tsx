import { PieChartJS } from "@/components/PieChartJS"
import { BarChartJS } from "@/components/BarChartJS"

export default function TestChartJS() {
  const pieData = [
    { label: "IRPJ", value: 1000 },
    { label: "CSLL", value: 800 },
    { label: "COFINS", value: 1200 },
    { label: "PIS/PASEP", value: 300 },
  ]

  const barLabels = ["Jan", "Fev", "Mar"]
  const barValues = [
    [5000, 3000], // interno, externo for Jan
    [4000, 4500], // interno, externo for Fev  
    [6000, 2000], // interno, externo for Mar
  ]

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">Test Chart.js Components</h1>
        <p className="text-gray-600 mb-8">Testing Chart.js components for PDF rendering</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Pie Chart Test</h2>
          <PieChartJS
            data={pieData}
            title="Distribuição dos Tributos"
            showLegend={true}
            showTotal={true}
            exportTitle="test-pie-chart"
          />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Bar Chart Test</h2>
          <BarChartJS
            labels={barLabels}
            values={barValues}
            title="Receita Mensal"
            stacked={true}
            showLegend={true}
            exportTitle="test-bar-chart"
          />
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-900">PDF Generation Test</h3>
        <p className="text-blue-700">These Chart.js components should render better in PDFs compared to Recharts SVG components.</p>
      </div>
    </div>
  )
}