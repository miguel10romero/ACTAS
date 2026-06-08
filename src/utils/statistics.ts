import { SpreadsheetRow, DashboardMetrics, ColumnMetric } from "../types";

/**
 * Automatically analyses columns in any spreadsheet to extract metadata and numeric metrics.
 */
export function analyzeColumns(data: SpreadsheetRow[]): ColumnMetric[] {
  if (data.length === 0) return [];

  const headers = Object.keys(data[0]);
  const metrics: ColumnMetric[] = [];

  headers.forEach((key) => {
    // Collect all non-empty values
    const values = data.map((row) => row[key]).filter((v) => v !== undefined && v !== "");
    const uniqueValues = new Set(values);

    // Determine type
    let type: 'string' | 'number' | 'date' | 'boolean' = 'string';
    let numericValues: number[] = [];

    // Analyze values to check for numbers
    values.forEach((val) => {
      if (typeof val === "number") {
        numericValues.push(val);
      } else if (!isNaN(Number(val)) && val !== "") {
        numericValues.push(Number(val));
      }
    });

    if (numericValues.length > values.length * 0.70 && values.length > 0) {
      // If 70%+ values are numeric, classify as number
      type = 'number';
    } else {
      // Check for date
      const dateSample = values.slice(0, 5).filter(v => typeof v === 'string' && (v.includes("-") || v.includes("/")));
      const isValidDate = dateSample.some(v => !isNaN(Date.parse(v as string)));
      if (isValidDate) {
        type = 'date';
      }
    }

    const metric: ColumnMetric = {
      key,
      label: key,
      type,
      uniqueValuesCount: uniqueValues.size,
    };

    if (type === 'number' && numericValues.length > 0) {
      const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
      metric.sum = sum;
      metric.avg = parseFloat((sum / numericValues.length).toFixed(2));
      metric.min = Math.min(...numericValues);
      metric.max = Math.max(...numericValues);
    } else if (values.length > 0) {
      metric.min = values[0];
      metric.max = values[values.length - 1];
    }

    metrics.push(metric);
  });

  return metrics;
}

/**
 * Computes complex metrics for dashboards, offering fallback for generic data.
 */
export function computeDashboardMetrics(data: SpreadsheetRow[]): DashboardMetrics {
  const totalRecords = data.length;
  const metrics: DashboardMetrics = {
    totalRecords,
    numericStats: {},
    cardsDistribution: { yellow: 0, doubleYellow: 0, red: 0 },
    topScorers: [],
    topMinutes: [],
    matchHistory: [],
  };

  if (totalRecords === 0) return metrics;

  // 1. Compute generic numeric stats
  const keys = Object.keys(data[0]);
  keys.forEach((key) => {
    const validNums = data
      .map(r => r[key])
      .filter((v) => v !== "" && v !== null && v !== undefined && !isNaN(Number(v)));
    
    if (validNums.length > 0) {
      const numberValues = validNums.map(Number);
      const sum = numberValues.reduce((a, b) => a + b, 0);
      metrics.numericStats[key] = {
        sum,
        avg: parseFloat((sum / numberValues.length).toFixed(2)),
        min: Math.min(...numberValues),
        max: Math.max(...numberValues),
      };
    }
  });

  // 2. Compute sports-specific aggregates if columns are detected
  // Check for 'Tarjeta Amarilla', 'Tarjeta Roja', 'Doble Amarilla' or 'Goles Anotados'
  let yellowKey = keys.find(k => k.toLowerCase().includes("amarilla") && !k.toLowerCase().includes("doble"));
  let doubleYellowKey = keys.find(k => k.toLowerCase().includes("doble"));
  let redKey = keys.find(k => k.toLowerCase().includes("roja"));
  let goalsKey = keys.find(k => k.toLowerCase().includes("goles anotados") || k.toLowerCase().includes("goles_anotados"));
  let minutesKey = keys.find(k => k.toLowerCase().includes("minutos jugados") || k.toLowerCase().includes("minutos_jugados"));
  let playerKey = keys.find(k => k.toLowerCase().includes("jugador") || k.toLowerCase().includes("nombre"));
  let dateKey = keys.find(k => k.toLowerCase().includes("fecha") || k.toLowerCase().includes("date"));
  let matchKey = keys.find(k => k.toLowerCase() === "partido");
  let goalsLocalKey = keys.find(k => k.toLowerCase().includes("goles local") || k.toLowerCase().includes("goles_local"));
  let goalsVisitanteKey = keys.find(k => k.toLowerCase().includes("goles visitante") || k.toLowerCase().includes("goles_visitante"));
  let equipoKey = keys.find(k => k.toLowerCase() === "equipo");

  // Accumulate cards
  data.forEach((row) => {
    if (yellowKey) metrics.cardsDistribution.yellow += Number(row[yellowKey]) || 0;
    if (doubleYellowKey) metrics.cardsDistribution.doubleYellow += Number(row[doubleYellowKey]) || 0;
    if (redKey) metrics.cardsDistribution.red += Number(row[redKey]) || 0;
  });

  // Player stats grouping (Scorers and Minutes)
  if (playerKey) {
    const playerStats: Record<string, { goals: number; minutes: number; equipo: string }> = {};
    data.forEach((row) => {
      const player = String(row[playerKey]);
      if (!player) return;
      if (!playerStats[player]) {
        playerStats[player] = { 
          goals: 0, 
          minutes: 0, 
          equipo: equipoKey ? String(row[equipoKey] || "").trim() : "" 
        };
      }
      if (goalsKey) playerStats[player].goals += Number(row[goalsKey]) || 0;
      if (minutesKey) playerStats[player].minutes += Number(row[minutesKey]) || 0;
    });

    metrics.topScorers = Object.entries(playerStats)
      .map(([name, stats]) => ({ name, goals: stats.goals, equipo: stats.equipo }))
      .filter((p) => p.goals > 0)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10);

    metrics.topMinutes = Object.entries(playerStats)
      .map(([name, stats]) => ({ name, minutes: stats.minutes, equipo: stats.equipo }))
      .filter((p) => p.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 10);
  }

  // Team comparison grouping
  if (equipoKey) {
    const teamsMap: Record<string, {
      equipo: string;
      goles: number;
      tarjetasAmarillas: number;
      tarjetasRojas: number;
      doblesAmarillas: number;
      minutos: number;
      jugadoresSets: Set<string>;
    }> = {};

    data.forEach((row) => {
      const eq = String(row[equipoKey!] || "").trim();
      if (!eq) return;
      if (!teamsMap[eq]) {
        teamsMap[eq] = {
          equipo: eq,
          goles: 0,
          tarjetasAmarillas: 0,
          tarjetasRojas: 0,
          doblesAmarillas: 0,
          minutos: 0,
          jugadoresSets: new Set<string>()
        };
      }

      const pName = playerKey ? String(row[playerKey] || "").trim() : "";
      if (pName) {
        teamsMap[eq].jugadoresSets.add(pName);
      }

      if (goalsKey) teamsMap[eq].goles += Number(row[goalsKey]) || 0;
      if (yellowKey) teamsMap[eq].tarjetasAmarillas += Number(row[yellowKey]) || 0;
      if (redKey) teamsMap[eq].tarjetasRojas += Number(row[redKey]) || 0;
      if (doubleYellowKey) teamsMap[eq].doblesAmarillas += Number(row[doubleYellowKey]) || 0;
      if (minutesKey) teamsMap[eq].minutos += Number(row[minutesKey]) || 0;
    });

    metrics.teamComparison = Object.values(teamsMap).map((t) => ({
      equipo: t.equipo,
      goles: t.goles,
      tarjetasAmarillas: t.tarjetasAmarillas,
      tarjetasRojas: t.tarjetasRojas,
      doblesAmarillas: t.doblesAmarillas,
      minutos: t.minutos,
      jugadores: t.jugadoresSets.size
    }));
  }

  // Match history
  if (matchKey) {
    const matchesMap = new Map<string, { match: string; date: string; goalsLocal: number; goalsVisitante: number }>();
    data.forEach((row) => {
      const matchName = String(row[matchKey]);
      if (!matchName) return;
      if (!matchesMap.has(matchName)) {
        matchesMap.set(matchName, {
          match: matchName,
          date: dateKey ? String(row[dateKey]) : "",
          goalsLocal: goalsLocalKey ? Number(row[goalsLocalKey]) || 0 : 0,
          goalsVisitante: goalsVisitanteKey ? Number(row[goalsVisitanteKey]) || 0 : 0,
        });
      }
    });

    metrics.matchHistory = Array.from(matchesMap.values())
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  }

  return metrics;
}
