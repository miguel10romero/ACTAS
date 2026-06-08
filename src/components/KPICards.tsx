import { motion } from "motion/react";
import { 
  Database, 
  Tv, 
  Award, 
  Clock, 
  Activity, 
  Layers, 
  TrendingUp, 
  Sigma 
} from "lucide-react";
import { SpreadsheetRow, ColumnMetric } from "../types";
import { computeDashboardMetrics } from "../utils/statistics";

interface KPICardsProps {
  data: SpreadsheetRow[];
  columns: ColumnMetric[];
}

export default function KPICards({ data, columns }: KPICardsProps) {
  const metrics = computeDashboardMetrics(data);
  const numericColumns = columns.filter(col => col.type === 'number');

  // Specific sports stats checks
  const totalGoals = metrics.numericStats["Goles Anotados"]?.sum ?? null;
  const totalMinutes = metrics.numericStats["Minutos Jugados"]?.sum ?? null;
  const totalAmarillas = metrics.numericStats["Tarjeta Amarilla"]?.sum ?? 0;
  const totalRojas = metrics.numericStats["Tarjeta Roja"]?.sum ?? 0;
  const totalDobles = metrics.numericStats["Doble Amarilla"]?.sum ?? 0;
  const totalCards = totalAmarillas + totalRojas + totalDobles;

  // Let's gather the KPI list
  const kpis = [];

  // Always add total records
  kpis.push({
    id: "total_records",
    label: "Total Registros",
    value: metrics.totalRecords.toLocaleString(),
    subText: "Filas de datos cargadas",
    icon: Database,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  });

  if (totalGoals !== null) {
    kpis.push({
      id: "total_goals",
      label: "Goles Anotados",
      value: totalGoals.toLocaleString(),
      subText: `Promedio de ${(metrics.numericStats["Goles Anotados"]?.avg ?? 0).toFixed(2)} por fila`,
      icon: Award,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    });
  }

  if (totalMinutes !== null) {
    kpis.push({
      id: "total_minutes",
      label: "Minutos Jugados",
      value: totalMinutes.toLocaleString(),
      subText: `Max: ${metrics.numericStats["Minutos Jugados"]?.max ?? 0} | Min: ${metrics.numericStats["Minutos Jugados"]?.min ?? 0}`,
      icon: Clock,
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    });
  }

  if (totalCards > 0) {
    kpis.push({
      id: "total_cards",
      label: "Sanciones Totales",
      value: totalCards.toString(),
      subText: `⚠️ ${totalAmarillas} Amarillas / ${totalRojas} Rojas`,
      icon: Activity,
      color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    });
  }

  // If there are less than 4 KPIs, append generic columns analytics
  if (kpis.length < 4) {
    numericColumns.forEach(col => {
      // Don't duplicate if already added
      if (["Goles Anotados", "Minutos Jugados", "Tarjeta Amarilla", "Tarjeta Roja", "Doble Amarilla"].includes(col.key)) {
        return;
      }
      
      const stat = metrics.numericStats[col.key];
      if (stat && kpis.length < 4) {
        kpis.push({
          id: `generic_${col.key}`,
          label: `Total ${col.label}`,
          value: stat.sum.toLocaleString(),
          subText: `Promedio: ${stat.avg.toLocaleString()} (Min: ${stat.min} | Max: ${stat.max})`,
          icon: Sigma,
          color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        });
      }
    });
  }

  // Fallback for subtext if still short
  if (kpis.length < 2 && columns.length > 0) {
    kpis.push({
      id: "columns_count",
      label: "Columnas Detectadas",
      value: columns.length.toString(),
      subText: `${columns.filter(c => c.type === 'number').length} Numéricas | ${columns.filter(c => c.type === 'date').length} Fechas`,
      icon: Layers,
      color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    });
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8"
      id="kpi-dashboard-grid"
    >
      {kpis.map((kpi) => {
        const IconComponent = kpi.icon;
        return (
          <motion.div
            key={kpi.id}
            variants={itemVariants}
            className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md flex items-center gap-4"
            id={`kpi-card-${kpi.id}`}
          >
            <div className={`p-3.5 rounded-xl border ${kpi.color} shrink-0`}>
              <IconComponent className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                {kpi.label}
              </span>
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight block my-0.5">
                {kpi.value}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
                {kpi.subText}
              </span>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
