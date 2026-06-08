import { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  AreaChart as AreaChartIcon,
  Settings,
  Flame,
  User,
  Activity,
  Award
} from "lucide-react";
import { SpreadsheetRow, ColumnMetric } from "../types";
import { computeDashboardMetrics } from "../utils/statistics";

interface ChartsDashboardProps {
  data: SpreadsheetRow[];
  columns: ColumnMetric[];
}

const TEAM_COLOR_MAP: Record<string, string> = {
  "UGERAGA A": "#2563eb", // blue
  "GATIKA": "#10b981",    // emerald
};

export function getTeamColor(teamName?: string): string {
  if (!teamName) return "#64748b";
  const norm = teamName.toUpperCase().trim();
  if (TEAM_COLOR_MAP[norm]) return TEAM_COLOR_MAP[norm];
  if (norm.includes("UGERAGA")) return "#2563eb";
  if (norm.includes("GATIKA")) return "#10b981";
  
  const colors = ["#2563eb", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Custom Tooltip component for a premium slick style
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const playerTeam = payload[0]?.payload?.equipo;
    return (
      <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white p-3.5 rounded-xl border border-slate-700/50 shadow-xl backdrop-blur-md text-xs font-mono">
        <p className="font-semibold text-slate-300 border-b border-slate-700/50 pb-1 mb-1">{label}</p>
        {playerTeam && (
          <p className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-wider">Equipo: {playerTeam}</p>
        )}
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color || entry.stroke || '#fff' }} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ backgroundColor: entry.fill || entry.color || entry.stroke }} />
            <span>{entry.name}:</span>
            <span className="font-bold ml-auto">{entry.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ChartsDashboard({ data, columns }: ChartsDashboardProps) {
  const metrics = useMemo(() => computeDashboardMetrics(data), [data]);
  const numericColumns = useMemo(() => columns.filter(col => col.type === 'number'), [columns]);
  const textColumns = useMemo(() => columns.filter(col => col.type === 'string'), [columns]);

  // Check if our specific sports metrics columns are present
  const isFootballDataset = useMemo(() => {
    const keys = columns.map(c => c.key.toLowerCase());
    return keys.includes("jugador") && (keys.includes("goles anotados") || keys.includes("minutos jugados"));
  }, [columns]);

  // Chart configuration for dynamic modes
  const [xAxisKey, setXAxisKey] = useState<string>(textColumns[0]?.key || columns[0]?.key || "");
  const [yAxisKey, setYAxisKey] = useState<string>(numericColumns[0]?.key || columns[1]?.key || "");
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area'>('bar');

  // Colors for charts
  const COLORS = [
    "#10b981", // emerald
    "#ef4444", // rose
    "#f59e0b", // amber
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#64748b", // slate
  ];

  // Colors for card distribution
  const CARD_COLORS = {
    yellow: "#eab308",       // Amber-500
    doubleYellow: "#f97316", // Orange-500
    red: "#ef4444"           // Red-500
  };

  // Convert cards count to standard pie slice data
  const cardsPieData = useMemo(() => {
    return [
      { name: "Tarjetas Amarillas", value: metrics.cardsDistribution.yellow, color: CARD_COLORS.yellow },
      { name: "Dobles Amarillas", value: metrics.cardsDistribution.doubleYellow, color: CARD_COLORS.doubleYellow },
      { name: "Tarjetas Rojas", value: metrics.cardsDistribution.red, color: CARD_COLORS.red }
    ].filter(slice => slice.value > 0);
  }, [metrics]);

  // Dynamic custom data group for generic graphs
  const dynamicChartData = useMemo(() => {
    if (!xAxisKey || !yAxisKey || data.length === 0) return [];
    
    // Group and aggregate by X Axis
    const groups: Record<string, { x: string; sum: number; count: number }> = {};
    
    data.forEach(row => {
      const rawX = row[xAxisKey];
      const xVal = rawX === undefined || rawX === "" ? "(Vacío)" : String(rawX);
      const yVal = Number(row[yAxisKey]);
      const validY = isNaN(yVal) ? 0 : yVal;

      if (!groups[xVal]) {
        groups[xVal] = { x: xVal, sum: 0, count: 0 };
      }
      groups[xVal].sum += validY;
      groups[xVal].count += 1;
    });

    return Object.values(groups)
      .map(g => ({
        name: g.x,
        Valor: parseFloat(g.sum.toFixed(2)),
        Promedio: parseFloat((g.sum / g.count).toFixed(2)),
        Frecuencia: g.count
      }))
      // Sort to make chart beautiful, limit to top 15 items for legibility
      .sort((a, b) => b.Valor - a.Valor)
      .slice(0, 15);
  }, [data, xAxisKey, yAxisKey]);

  // Statistical summary section
  const datasetStatsSummary = useMemo(() => {
    if (data.length === 0) return null;
    return numericColumns.map(col => {
      const values = data.map(r => Number(r[col.key])).filter(v => !isNaN(v));
      if (values.length === 0) return null;
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      return {
        key: col.key,
        label: col.label,
        sum,
        avg: avg.toFixed(2),
        min: Math.min(...values),
        max: Math.max(...values)
      };
    }).filter(s => s !== null);
  }, [data, numericColumns]);

  return (
    <div className="space-y-8" id="dashboard-tab-view">
      
      {/* COMPARATIVA SÓLIDA DE AMBOS EQUIPOS */}
      {isFootballDataset && metrics.teamComparison && metrics.teamComparison.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm mb-8"
          id="team-comparison-dashboard"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Comparativa Global: Ugeraga A vs Gatika</h3>
                <p className="text-xs text-slate-400">Análisis y cruce de desempeño de ambos planteles en tiempo real</p>
              </div>
            </div>
            
            {/* Legend indicators */}
            <div className="flex items-center gap-4 text-xs font-mono font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600" />
                <span className="text-slate-700 dark:text-slate-350">Ugeraga A</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-700 dark:text-slate-350">Gatika</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart: Goles Totales por Equipo */}
            <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl bg-slate-50/35 dark:bg-slate-950/20">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-3 uppercase tracking-wider">⚽ Goles de Jugadores</span>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.teamComparison} margin={{ left: -15, right: 10 }}>
                    <XAxis dataKey="equipo" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="goles" name="Goles Totales">
                      {metrics.teamComparison.map((ent, i) => (
                        <Cell key={i} fill={getTeamColor(ent.equipo)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart: Tarjetas por Equipo */}
            <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl bg-slate-50/35 dark:bg-slate-950/20">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-3 uppercase tracking-wider">🟨 Amonestaciones</span>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.teamComparison} margin={{ left: -15, right: 10 }}>
                    <XAxis dataKey="equipo" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="tarjetasAmarillas" name="Amarillas" fill="#eab308" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tarjetasRojas" name="Rojas Directas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Balance Card stats */}
            <div className="flex flex-col justify-between border border-slate-100 dark:border-slate-800 p-4 rounded-xl bg-slate-50/35 dark:bg-slate-950/20">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-3 uppercase tracking-wider">📊 Balance Registrado</span>
              
              <div className="space-y-3.5 text-xs">
                {metrics.teamComparison.map((team, idx) => (
                  <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getTeamColor(team.equipo) }} />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{team.equipo}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{team.jugadores} Jugadores</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-slate-600 dark:text-slate-405">
                      <div>Goles: <span className="font-semibold text-slate-850 dark:text-slate-100">{team.goles}</span></div>
                      <div>Minutos: <span className="font-semibold text-slate-850 dark:text-slate-100">{team.minutos.toLocaleString()}</span></div>
                      <div>Amarillas: <span className="font-semibold text-slate-850 dark:text-slate-100">{team.tarjetasAmarillas}</span></div>
                      <div>Rojas: <span className="font-semibold text-rose-500">{team.tarjetasRojas}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 
        IF IT IS FOOTBALL DATASET, SHOW HIGHLY CUSTOMIZED METRICS SIDE-BY-SIDE WITH GLOBAL METRICS
      */}
      {isFootballDataset ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="sports-charts-grid">
          
          {/* BAR CHART: TOP GOLEADORES */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm"
            id="chart-top-scorers"
          >
            <div className="flex items-center justify-between gap-2 mb-4 border-b border-slate-50 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Máximos Goleadores</h3>
                  <p className="text-xs text-slate-400">Top 10 jugadores con más goles anotados</p>
                </div>
              </div>
              {/* Little team color key */}
              <div className="flex items-center gap-2 text-[10px] font-bold font-mono">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-600"/> UGERAGA A</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"/> GATIKA</span>
              </div>
            </div>
            
            <div className="h-80 w-full relative">
              {metrics.topScorers.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.topScorers} margin={{ bottom: 25, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      angle={-25}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="goals" name="Goles" fill="#10b981" radius={[6, 6, 0, 0]}>
                      {metrics.topScorers.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getTeamColor(entry.equipo)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                  Sin registro de goles anotados
                </div>
              )}
            </div>
          </motion.div>

          {/* AREA CHART: MINUTOS JUGADOS */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm"
            id="chart-top-minutes"
          >
            <div className="flex items-center justify-between gap-2 mb-4 border-b border-slate-50 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Presencia en el Campo</h3>
                  <p className="text-xs text-slate-400">Jugadores con mayores minutos sumados</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold font-mono">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-600"/> UGERAGA A</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"/> GATIKA</span>
              </div>
            </div>
            
            <div className="h-80 w-full relative">
              {metrics.topMinutes.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.topMinutes} margin={{ bottom: 25, left: -10 }}>
                    <defs>
                      <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      angle={-25}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="minutes" name="Minutos" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMinutes)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                  Sin registro de minutos jugados
                </div>
              )}
            </div>
          </motion.div>

          {/* LINE CHART: HISTÓRICO GOLES */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm"
            id="chart-history-goals"
          >
            <div className="flex items-center gap-2 mb-4 border-b border-slate-50 dark:border-slate-800 pb-3">
              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Rendimiento de Goles por Partido</h3>
                <p className="text-xs text-slate-400">Relación de goles del Equipo Local vs Visitante</p>
              </div>
            </div>
            
            <div className="h-80 w-full relative">
              {metrics.matchHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.matchHistory} margin={{ bottom: 25, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                    <XAxis 
                      dataKey="match" 
                      tick={{ fill: '#64748b', fontSize: 9 }}
                      angle={-30}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="goalsLocal" name="Goles Local" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="goalsVisitante" name="Goles Visitante" stroke="#ec4899" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                  Sin registro cronológico de partidos
                </div>
              )}
            </div>
          </motion.div>

          {/* PIE CHART: TARJETAS */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm"
            id="chart-sports-cards"
          >
            <div className="flex items-center gap-2 mb-4 border-b border-slate-50 dark:border-slate-800 pb-3">
              <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg">
                <PieChartIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Distribución de Amonestaciones</h3>
                <p className="text-xs text-slate-400">Proporción de tarjetas del campeonato</p>
              </div>
            </div>
            
            <div className="h-80 w-full relative flex flex-col md:flex-row items-center justify-center">
              {cardsPieData.length > 0 ? (
                <>
                  <div className="h-64 w-full md:w-3/5 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={cardsPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {cardsPieData.map((slice, index) => (
                            <Cell key={`cell-${index}`} fill={slice.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6 w-full md:w-2/5 font-mono text-xs">
                    {cardsPieData.map((dataSlice, key) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded" style={{ backgroundColor: dataSlice.color }} />
                        <span className="text-slate-600 dark:text-slate-400">{dataSlice.name}:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{dataSlice.value}</span>
                      </div>
                    ))}
                    <div className="border-t border-dashed border-slate-100 dark:border-slate-800 pt-2 mt-1">
                      <span className="text-slate-400">Total Tarjetas:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 ml-2">
                        {cardsPieData.reduce((acc, curr) => acc + curr.value, 0)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                  Sin amonestaciones registradas en el periodo actual
                </div>
              )}
            </div>
          </motion.div>

        </div>
      ) : null}

      {/* 
        DYNAMIC CUSTOM CHART CREATOR (FOR ANY SHEET / GENERAL METRICS PLOTTING!)
      */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm"
        id="dynamic-chart-builder"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 dark:border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">
                {isFootballDataset ? "Generador de Gráficas Customizado" : "Explorador Dinámico de Gráficas"}
              </h3>
              <p className="text-xs text-slate-400">Construye tus propios gráficos cruzando cualesquiera variables de la hoja</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Eje X:</span>
              <select 
                value={xAxisKey} 
                onChange={(e) => setXAxisKey(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {columns.map(col => (
                  <option key={col.key} value={col.key}>{col.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Eje Y (Valores):</span>
              <select 
                value={yAxisKey} 
                onChange={(e) => setYAxisKey(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {numericColumns.length > 0 ? (
                  numericColumns.map(col => (
                    <option key={col.key} value={col.key}>{col.label}</option>
                  ))
                ) : (
                  columns.map(col => (
                    <option key={col.key} value={col.key}>{col.label}</option>
                  ))
                )}
              </select>
            </div>

            <div className="flex gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
              <button 
                onClick={() => setChartType('bar')} 
                title="Barras"
                className={`p-1.5 rounded-lg hover:bg-slate-150 dark:hover:bg-slate-800 ${chartType === 'bar' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm font-bold' : 'text-slate-400'}`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setChartType('line')} 
                title="Líneas"
                className={`p-1.5 rounded-lg hover:bg-slate-150 dark:hover:bg-slate-800 ${chartType === 'line' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm font-bold' : 'text-slate-400'}`}
              >
                <LineChartIcon className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setChartType('area')} 
                title="Área"
                className={`p-1.5 rounded-lg hover:bg-slate-150 dark:hover:bg-slate-800 ${chartType === 'area' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm font-bold' : 'text-slate-400'}`}
              >
                <AreaChartIcon className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setChartType('pie')} 
                title="Circular"
                className={`p-1.5 rounded-lg hover:bg-slate-150 dark:hover:bg-slate-800 ${chartType === 'pie' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm font-bold' : 'text-slate-400'}`}
              >
                <PieChartIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="h-96 w-full relative mb-4">
          {dynamicChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={dynamicChartData} margin={{ bottom: 40, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Valor" name={`Total ${yAxisKey}`} fill="#2563eb" radius={[4, 4, 0, 0]}>
                    {dynamicChartData.map((e, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={dynamicChartData} margin={{ bottom: 40, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Valor" name={`Total ${yAxisKey}`} stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={dynamicChartData} margin={{ bottom: 40, left: -10 }}>
                  <defs>
                    <linearGradient id="colorDynArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Valor" name={`Total ${yAxisKey}`} stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDynArea)" />
                </AreaChart>
              ) : (
                <div className="flex flex-col md:flex-row items-center justify-center h-full">
                  <div className="h-72 w-full md:w-3/5 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dynamicChartData.slice(0, 8)} // Pie chart performs worst with > 8 slices
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={90}
                          dataKey="Valor"
                          nameKey="name"
                        >
                          {dynamicChartData.slice(0, 8).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 md:border-l border-slate-100 dark:border-slate-800 md:pl-6 p-4 w-full md:w-2/5 font-mono text-xxs">
                    {dynamicChartData.slice(0, 8).map((slice, index) => (
                      <div key={index} className="flex items-center gap-1.5 truncate">
                        <span className="h-2.5 w-2.5 rounded shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{slice.name}:</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{slice.Valor.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
              Indique variables para generar gráficos dinamizados
            </div>
          )}
        </div>
      </motion.div>

      {/* STATISTICAL SUMMARY ENGINE */}
      {datasetStatsSummary && datasetStatsSummary.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm"
          id="statistical-analysis-panel"
        >
          <div className="flex items-center gap-2 mb-4 border-b border-slate-50 dark:border-slate-800 pb-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-100">Resumen Estadístico Automático</h4>
            <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xxs font-mono px-2 py-0.5 rounded-full border border-blue-500/10 ml-auto">
              Cálculo Dinámico
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="stats-summary-grid">
            {datasetStatsSummary.map((stat, key) => (
              <div key={key} className="p-4 rounded-xl border border-slate-50 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2 truncate">
                  {stat.label}
                </span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 font-mono text-xs">
                  <div className="flex justify-between border-b border-slate-100/50 dark:border-slate-800/50 pb-1">
                    <span className="text-slate-400">Total Sumado:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{Number(stat.sum).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100/50 dark:border-slate-800/50 pb-1">
                    <span className="text-slate-400">Promedio:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{stat.avg}</span>
                  </div>
                  <div className="flex justify-between pt-0.5">
                    <span className="text-slate-400">Mínimo:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{stat.min}</span>
                  </div>
                  <div className="flex justify-between pt-0.5">
                    <span className="text-slate-400">Máximo:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{stat.max}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

    </div>
  );
}
