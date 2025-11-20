/**
 * Hook para processar dados de receita mensal
 * Centraliza lógica de cálculo e formatação
 */

import { useMemo } from 'react';

interface ReceitaMensalData {
  labels: string[];
  values: number[];
  externo?: {
    labels: string[];
    values: number[];
  };
}

interface ProcessedReceitaData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: (number | null)[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  }>;
  hasExternalData: boolean;
  totalPeriodo: number;
  mediaPeriodo: number;
}

export function useReceitaMensalData(
  data: ReceitaMensalData | null | undefined
): ProcessedReceitaData {
  return useMemo(() => {
    if (!data || !data.labels || !data.values) {
      return {
        labels: [],
        datasets: [],
        hasExternalData: false,
        totalPeriodo: 0,
        mediaPeriodo: 0,
      };
    }

    const baseValues = data.values.map(v => Number(v) || 0);
    const externoValues = data.externo?.values?.map(v => Number(v) || 0) || [];
    const hasExternalData = externoValues.length > 0;

    // Filtrar valores zero para manter consistência
    const filteredLabels = data.labels.filter((_, i) => {
      const baseValue = baseValues[i] || 0;
      const externoValue = externoValues[i] || 0;
      return baseValue > 0 || externoValue > 0;
    });

    const filteredBaseValues = baseValues.filter((_, i) => {
      const baseValue = baseValues[i] || 0;
      const externoValue = externoValues[i] || 0;
      return baseValue > 0 || externoValue > 0;
    });

    const filteredExternoValues = externoValues.filter((_, i) => {
      const baseValue = baseValues[i] || 0;
      const externoValue = externoValues[i] || 0;
      return baseValue > 0 || externoValue > 0;
    });

    const datasets: ProcessedReceitaData['datasets'] = [
      {
        label: 'Receita Interna',
        data: filteredBaseValues.map(v => v === 0 ? null : v),
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        borderWidth: 2,
      },
    ];

    if (hasExternalData) {
      datasets.push({
        label: 'Receita Externa',
        data: filteredExternoValues.map(v => v === 0 ? null : v),
        backgroundColor: '#10b981',
        borderColor: '#059669',
        borderWidth: 2,
      });
    }

    const totalPeriodo = filteredBaseValues.reduce((sum, v) => sum + v, 0) +
                          filteredExternoValues.reduce((sum, v) => sum + v, 0);
    const mediaPeriodo = totalPeriodo / (filteredLabels.length || 1);

    return {
      labels: filteredLabels,
      datasets,
      hasExternalData,
      totalPeriodo,
      mediaPeriodo,
    };
  }, [data]);
}

/**
 * Hook para calcular indicadores de consistência
 */
export function useConsistenciaData(values: number[]) {
  return useMemo(() => {
    const validValues = values.filter(v => typeof v === 'number' && !isNaN(v));
    const n = validValues.length;
    
    if (n === 0) {
      return { mean: 0, sd: 0, cv: 0 };
    }

    const mean = validValues.reduce((sum, v) => sum + v, 0) / n;
    const variance = validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const sd = Math.sqrt(variance);
    const cv = mean > 0 ? (sd / mean) * 100 : 0;

    return { mean, sd, cv };
  }, [values]);
}

/**
 * Hook para processar dados de tributos
 */
export function useTributosData(tributos: Record<string, number> | undefined) {
  return useMemo(() => {
    if (!tributos) {
      return { items: [], total: 0 };
    }

    const items = [
      { key: 'IRPJ', label: 'IRPJ' },
      { key: 'CSLL', label: 'CSLL' },
      { key: 'COFINS', label: 'COFINS' },
      { key: 'PIS_Pasep', label: 'PIS/PASEP' },
      { key: 'INSS_CPP', label: 'INSS/CPP' },
      { key: 'ICMS', label: 'ICMS' },
      { key: 'IPI', label: 'IPI' },
      { key: 'ISS', label: 'ISS' },
    ]
      .map(item => ({
        ...item,
        value: Number(tributos[item.key]) || 0,
      }))
      .filter(item => item.value > 0);

    const total = items.reduce((sum, item) => sum + item.value, 0);

    return { items, total };
  }, [tributos]);
}