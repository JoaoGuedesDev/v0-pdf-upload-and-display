export interface Identificacao {
  cnpj: string;
  razaoSocial: string;
  periodoApuracao: string;
  abertura?: string;
  municipio: string;
  uf: string;
}

export interface Receitas {
  receitaPA: number;
  rbt12: number;
  rba: number;
  rbaa: number;
  limite?: number;
  receitaPAFormatada?: string;
  mercadoExterno?: {
    rpa: number;
    rbt12: number;
    rba: number;
    rbaa: number;
    limite?: number;
  };
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

export interface Atividade {
  descricao: string;
  Total: number;
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
  atividades?: {
    [key: string]: Atividade | undefined;
  };
  calculos?: {
    aliquotaEfetiva?: number;
    margemLiquida?: number;
    totalDAS?: number;
    totalDASFormatado?: string;
    aliquotaEfetivaFormatada?: string;
    aliquotaEfetivaAtualPercent?: number;
    analise_aliquota?: any;
    [key: string]: any;
  };
  graficos?: {
    tributosBar?: {
      labels: string[];
      values: number[];
    };
    totalTributos?: {
      labels: string[];
      values: number[];
    };
    dasPie?: {
      labels: string[];
      values: number[];
    };
    receitaLine?: {
      labels: string[];
      values: number[];
    };
    receitaMensal?: {
      labels: string[];
      values: number[];
    };
    receitaLineExterno?: {
      labels: string[];
      values: number[];
    };
    atividadesComparativo?: any;
    [key: string]: any;
  };
  insights?: any;
  debug?: any;
}

// Alias for compatibility if needed
export type DASData = DashboardData;

export interface MonthlyFile {
  filename: string;
  data: DashboardData;
}
