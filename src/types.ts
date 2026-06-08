export interface SpreadsheetRow {
  [key: string]: any;
}

export interface ColumnMetric {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  uniqueValuesCount: number;
  avg?: number;
  sum?: number;
  min?: number | string;
  max?: number | string;
}

export interface DashboardMetrics {
  totalRecords: number;
  numericStats: {
    [key: string]: {
      sum: number;
      avg: number;
      min: number;
      max: number;
    };
  };
  cardsDistribution: {
    yellow: number;
    doubleYellow: number;
    red: number;
  };
  topScorers: { name: string; goals: number; equipo?: string }[];
  topMinutes: { name: string; minutes: number; equipo?: string }[];
  matchHistory: { match: string; date: string; goalsLocal: number; goalsVisitante: number }[];
  teamComparison?: {
    equipo: string;
    goles: number;
    tarjetasAmarillas: number;
    tarjetasRojas: number;
    doblesAmarillas: number;
    minutos: number;
    jugadores: number;
  }[];
}
