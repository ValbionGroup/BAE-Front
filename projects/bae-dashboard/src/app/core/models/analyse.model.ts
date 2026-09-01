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
  readonly id: number;
  readonly n: string;
  readonly d: string;
  readonly rev: string;
  readonly cmd: number | string;
  readonly pred: boolean;
  /** Une soirée à venir n'a pas de bilan : sa ligne n'ouvre rien. */
  readonly clickable: boolean;
  /**
   * Chiffres bruts, pour l'export CSV : une colonne de tableur veut un nombre,
   * pas la chaîne déjà formatée que l'écran affiche. `cashedCents` en centimes.
   */
  readonly cashedCents: number;
  readonly presentCount: number;
  readonly respondentCount: number;
}

export interface AnalysePrediction {
  readonly label: string;
  readonly description: string;
  readonly expectedOrders: number;
  readonly range: number;
  readonly estimatedRevenue: string;
  readonly prereg: number;
}
