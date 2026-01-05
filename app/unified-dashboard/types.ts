export interface Identificacao {
  cnpj: string;
  razaoSocial: string;
  periodoApuracao: string;
  abertura: string;
  municipio: string;
  uf: string;
}

export interface Receitas {
  receitaPA: number;
  rbt12: number;
  rba: number;
  rbaa: number;
  limite: number;
  receitaPAFormatada: string;
}

export interface Tributos {
  IRPJ: number;
  CSLL: number;
  COFINS: number;
  PIS_Pasep: number;
  INSS_CPP: number;
  ICMS: number;
  IPI: number;
  ISS: number;
  Total: number;
}

export interface ReceitasAnterioresItem {
  mes: string;
  valor: number;
}

export interface ReceitasAnteriores {
  mercado_interno?: ReceitasAnterioresItem[];
  mercado_externo?: ReceitasAnterioresItem[];
}

export interface DashboardData {
  identificacao: Identificacao;
  receitas: Receitas;
  receitas_anteriores?: ReceitasAnteriores;
  tributos: Tributos;
  tributosMercadoriasInterno?: Tributos;
  tributosMercadoriasExterno?: Tributos;
  tributosServicosInterno?: Tributos;
  tributosServicosExterno?: Tributos;
  cenario?: string;
  valorTotalDAS: number;
  valorTotalDASFormatado: string;
}

export interface MonthlyFile {
  filename: string;
  data: DashboardData;
}
