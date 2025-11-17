/**
 * Formatadores utilitários para valores monetários e porcentagens
 */

/**
 * Formata um valor numérico para moeda brasileira
 * @param value - Valor numérico a ser formatado
 * @param showZeros - Se deve mostrar valores zerados ou retornar string vazia
 * @returns Valor formatado em reais ou string vazia
 */
export const formatCurrency = (value: number, showZeros: boolean = true): string => {
  if (!showZeros && value === 0) return '';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Formata um valor para porcentagem
 * @param value - Valor numérico a ser formatado
 * @param decimals - Número de casas decimais
 * @returns Valor formatado como porcentagem
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Calcula a porcentagem de um valor em relação ao total
 * @param value - Valor parcial
 * @param total - Valor total
 * @returns Porcentagem calculada
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return (value / total) * 100;
};