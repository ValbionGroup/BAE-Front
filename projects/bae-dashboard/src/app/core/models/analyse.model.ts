export interface AnalyseKpi {
  readonly label: string;
  readonly value: string;
  readonly delta: string;
  readonly deltaClass: string;
}

export interface AnalyseChartCol {
  readonly d: string;
  readonly cmd: number;
  readonly pred: boolean;
}

export interface AnalyseSoiree {
  readonly n: string;
  readonly d: string;
  readonly rev: string;
  readonly cmd: number | string;
  readonly pred: boolean;
}

export interface AnalysePrediction {
  readonly label: string;
  readonly description: string;
  readonly expectedOrders: number;
  readonly range: number;
  readonly estimatedRevenue: string;
  readonly prereg: number;
}

export interface AnalyseSummary {
  readonly kpis: readonly AnalyseKpi[];
  readonly chart: readonly AnalyseChartCol[];
  readonly soirees: readonly AnalyseSoiree[];
  readonly prediction: AnalysePrediction | null;
}
