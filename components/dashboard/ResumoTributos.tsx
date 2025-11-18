/**
 * Componente de resumo de tributos
 * Exibe valores de tributos com formatação e cores
 */

import { memo, useMemo } from 'react';
import { CHART_COLORS } from '@/lib/constants';

interface TributoItem {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface ResumoTributosProps {
  tributos: Record<string, number> | undefined;
  darkMode?: boolean;
}

export const ResumoTributos = memo(function ResumoTributos({ tributos, darkMode = false }: ResumoTributosProps) {
  const total = useMemo(() => tributos ? Object.values(tributos).reduce((sum, value) => sum + (Number(value) || 0), 0) : 0, [tributos]);
  
  if (!tributos || total === 0) {
    return (
      <div className={`text-center py-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        Nenhum tributo a ser exibido
      </div>
    );
  }

  const items: TributoItem[] = useMemo(() => [
    { key: 'IRPJ', label: 'IRPJ', value: Number(tributos.IRPJ) || 0, color: CHART_COLORS[0] },
    { key: 'CSLL', label: 'CSLL', value: Number(tributos.CSLL) || 0, color: CHART_COLORS[1] },
    { key: 'COFINS', label: 'COFINS', value: Number(tributos.COFINS) || 0, color: CHART_COLORS[2] },
    { key: 'PIS_Pasep', label: 'PIS/PASEP', value: Number(tributos.PIS_Pasep) || 0, color: CHART_COLORS[3] },
    { key: 'INSS_CPP', label: 'INSS/CPP', value: Number(tributos.INSS_CPP) || 0, color: CHART_COLORS[4] },
    { key: 'ICMS', label: 'ICMS', value: Number(tributos.ICMS) || 0, color: CHART_COLORS[5] },
    { key: 'IPI', label: 'IPI', value: Number(tributos.IPI) || 0, color: CHART_COLORS[6] },
    { key: 'ISS', label: 'ISS', value: Number(tributos.ISS) || 0, color: CHART_COLORS[7] },
  ].filter(item => item.value > 0), [tributos]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-0.5">
      <h4 className={`font-semibold text-xs ${darkMode ? 'text-slate-200' : 'text-slate-700'} mb-3`}>
        Valores por Tributo
      </h4>
      {items.map(({ key, label, value, color }) => {
        const percentage = total > 0 ? (value / total) * 100 : 0;
        
        return (
          <div
            key={key}
            className={`flex items-center justify-between p-2 rounded-lg ${
              darkMode ? 'bg-slate-700/50' : 'bg-slate-50'
            } hover:shadow-md transition-all duration-200`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                style={{ backgroundColor: color }}
              />
              <div>
                <div className={`text-xs font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  {label}
                </div>
                <div className={`text-[10px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {percentage.toFixed(1)}% do total
                </div>
              </div>
            </div>
            <div className={`text-xs font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {formatCurrency(value)}
            </div>
          </div>
        );
      })}
    </div>
  );
})