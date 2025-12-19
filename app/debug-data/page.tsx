
import { getMonthlyFiles } from '../unified-dashboard/actions'

export const dynamic = 'force-dynamic'

export default async function DebugDataPage() {
  const files = await getMonthlyFiles()
  
  const summary = files.map(f => ({
    filename: f.filename,
    periodo: f.data?.identificacao?.periodoApuracao,
    receitaPA: f.data?.receitas?.receitaPA,
    typeOfReceita: typeof f.data?.receitas?.receitaPA,
    tributosTotal: f.data?.tributos?.Total
  }))

  const totalRevenue = files.reduce((acc, f) => acc + (f.data?.receitas?.receitaPA || 0), 0)

  return (
    <div className="p-8 font-mono text-sm space-y-4">
      <h1 className="text-xl font-bold">Debug Data Check</h1>
      <div className="bg-slate-100 p-4 rounded">
        <p>Total Files: {files.length}</p>
        <p>Total Revenue (Calculated Here): {totalRevenue}</p>
      </div>
      
      <h2 className="text-lg font-bold mt-4">File Details</h2>
      <div className="overflow-auto max-h-[600px] border rounded">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-200">
                    <th className="p-2 border">Filename</th>
                    <th className="p-2 border">Periodo</th>
                    <th className="p-2 border">ReceitaPA</th>
                    <th className="p-2 border">Type</th>
                    <th className="p-2 border">Tributos Total</th>
                </tr>
            </thead>
            <tbody>
                {summary.map(f => (
                    <tr key={f.filename} className="border-b">
                        <td className="p-2 border">{f.filename}</td>
                        <td className="p-2 border">{f.periodo}</td>
                        <td className="p-2 border">{f.receitaPA}</td>
                        <td className="p-2 border">{f.typeOfReceita}</td>
                        <td className="p-2 border">{f.tributosTotal}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  )
}
