import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnFiltersState,
  VisibilityState,
  flexRender,
} from "@tanstack/react-table";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Eye, 
  Download, 
  Trash2, 
  SlidersHorizontal,
  FileSpreadsheet,
  FileText,
  FilterX,
  BarChart2,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { SpreadsheetRow, ColumnMetric } from "../types";

interface AdvancedTableProps {
  data: SpreadsheetRow[];
  columns: ColumnMetric[];
}

export default function AdvancedTable({ data, columns }: AdvancedTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [sorting, setSorting] = useState<any[]>([]);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [showFilterDefaults, setShowFilterDefaults] = useState(false);

  // Auto-generate columns from Spreadsheet Metadata
  const tableColumns = useMemo(() => {
    return columns.map((col) => ({
      id: col.key,
      accessorKey: col.key,
      header: col.label,
      cell: (info: any) => {
        const value = info.getValue();
        if (value === undefined || value === null || value === "") {
          return <span className="text-slate-300 dark:text-slate-700 italic">-</span>;
        }
        if (typeof value === "number") {
          return <span className="font-mono text-xs text-slate-800 dark:text-slate-200">{value.toLocaleString()}</span>;
        }
        return <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{String(value)}</span>;
      },
    }));
  }, [columns]);

  // Pagination states
  const [{ pageIndex, pageSize }, setPagination] = useState({
    pageIndex: 0,
    pageSize: 15,
  });

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize]
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const filteredRows = useMemo(() => {
    return table.getFilteredRowModel().rows.map(row => row.original);
  }, [table, sorting, globalFilter, columnFilters]);

  // Dynamic visual states and grouping computations based on filtered rows
  const textColumns = useMemo(() => columns.filter(col => col.type === 'string'), [columns]);
  const numericColumns = useMemo(() => columns.filter(col => col.type === 'number'), [columns]);

  const [chartXKey, setChartXKey] = useState<string>(textColumns[0]?.key || columns[0]?.key || "");
  const [chartYKey, setChartYKey] = useState<string>(numericColumns[0]?.key || columns[1]?.key || "");
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [showQuickChart, setShowQuickChart] = useState(false);

  const tableQuickChartData = useMemo(() => {
    if (!chartXKey || !chartYKey || filteredRows.length === 0) return [];

    const groups: Record<string, { x: string; sum: number; count: number }> = {};

    filteredRows.forEach(row => {
      const rawX = row[chartXKey];
      const xVal = rawX === undefined || rawX === "" ? "(Vacío)" : String(rawX);
      const yVal = Number(row[chartYKey]);
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
      .sort((a, b) => b.Valor - a.Valor)
      .slice(0, 15);
  }, [filteredRows, chartXKey, chartYKey]);

  const COLORS = [
    "#2563eb", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // rose
    "#8b5cf6", // violet
    "#06b6d4", // cyan
    "#ec4899", // pink
    "#64748b", // slate
  ];

  // Export functions
  const handleExportCSV = () => {
    if (filteredRows.length === 0) return;

    const visibleHeaders = columns
      .filter(col => columnVisibility[col.key] !== false)
      .map(col => col.key);

    let csvContent = "\ufeff"; // BOM for Excel UTF-8 compliance
    csvContent += visibleHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

    filteredRows.forEach((row) => {
      const line = visibleHeaders.map((h) => {
        const val = row[h] === undefined || row[h] === null ? "" : String(row[h]);
        return `"${val.replace(/"/g, '""')}"`;
      }).join(",");
      csvContent += line + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `datos_filtrados_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (filteredRows.length === 0) return;

    const visibleHeaders = columns
      .filter(col => columnVisibility[col.key] !== false)
      .map(col => col.key);

    // Creating HTML spreadsheet representation for pristine Excel import including styling
    let excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          table { border-collapse: collapse; }
          th { background-color: #2563eb; color: #ffffff; font-weight: bold; padding: 6px; border: 1px solid #cbd5e1; }
          td { border: 1px solid #cbd5e1; padding: 6px; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${visibleHeaders.map(h => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${filteredRows.map(row => `
              <tr>
                ${visibleHeaders.map(h => `<td>${row[h] !== undefined ? String(row[h]) : ""}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `datos_excel_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFilters = () => {
    setGlobalFilter("");
    setColumnFilters([]);
  };

  const filteredCount = filteredRows.length;

  return (
    <div className="space-y-4" id="advanced-table-panel">
      
      {/* TOOLBAR FOR CONTROLS */}
      <div className="bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Buscar en todos los campos..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 dark:text-slate-200 transition-all font-semibold"
          />
        </div>

        {/* Custom filters toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFilterDefaults(!showFilterDefaults)}
            className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              showFilterDefaults || columnFilters.length > 0
                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros Avanzados {columnFilters.length > 0 ? `(${columnFilters.length})` : ""}
          </button>

          <button
            onClick={() => setShowQuickChart(!showQuickChart)}
            className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              showQuickChart
                ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Analizador Gráfico {showQuickChart ? "Activo" : "Cerrado"}
          </button>

          {/* Show/Hide Columns Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => {
                setShowColumnDropdown(!showColumnDropdown);
              }}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400 font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <Eye className="h-3.5 w-3.5" />
              Columnas Visibles
            </button>

            {showColumnDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl shadow-xl z-20 max-h-72 overflow-y-auto">
                <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1.5 border-b border-slate-50 dark:border-slate-800 pb-1.5">
                  Alternar Columnas
                </p>
                <div className="space-y-1">
                  {columns.map((col) => {
                    const isVisible = columnVisibility[col.key] !== false;
                    return (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 p-1.5 rounded-lg cursor-pointer font-semibold"
                      >
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={(e) => {
                            setColumnVisibility({
                              ...columnVisibility,
                              [col.key]: e.target.checked,
                            });
                          }}
                          className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Cleaner filter triggers */}
          {(globalFilter || columnFilters.length > 0) && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <FilterX className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}

          {/* Export tools */}
          <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5 transition-all"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs hover:bg-emerald-700 font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-500/10 hover:shadow-md transition-all"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </button>
        </div>
      </div>

      {/* REAL-TIME COLLAPSIBLE CHARTS PANEL (BASED ON ACTIVE FILTERED TABLE DATA) */}
      <AnimatePresence>
        {showQuickChart && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            key="quick-chart-panel"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4 overflow-hidden"
            id="quick-selection-chart-panel"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded-lg">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-850 dark:text-slate-100">Analizador Visual de Selección Activa</h4>
                  <p className="text-[10px] text-slate-400">Esta gráfica se adapta en tiempo real a sus filtros y búsquedas ({tableQuickChartData.length} grupos graficados)</p>
                </div>
              </div>

              {/* Quick selectors inside */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600 dark:text-slate-350">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Dimensión (X):</span>
                  <select
                    value={chartXKey}
                    onChange={(e) => setChartXKey(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-lg text-slate-650 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[10px]"
                  >
                    {textColumns.map(col => (
                      <option key={col.key} value={col.key}>{col.label}</option>
                    ))}
                    {/* Fallback to all columns if no strings */}
                    {textColumns.length === 0 && columns.map(col => (
                      <option key={col.key} value={col.key}>{col.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Métrica (Y):</span>
                  <select
                    value={chartYKey}
                    onChange={(e) => setChartYKey(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-lg text-slate-650 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[10px]"
                  >
                    {numericColumns.map(col => (
                      <option key={col.key} value={col.key}>{col.label}</option>
                    ))}
                    {/* Fallback if no numeric */}
                    {numericColumns.length === 0 && columns.map(col => (
                      <option key={col.key} value={col.key}>{col.label}</option>
                    ))}
                  </select>
                </div>

                {/* Chart type buttons */}
                <div className="flex gap-1 bg-slate-50 dark:bg-slate-950/20 p-1 rounded-lg border border-slate-150 dark:border-slate-800">
                  <button
                    onClick={() => setChartType('bar')}
                    title="Barras"
                    className={`p-1 rounded-md hover:bg-slate-150 dark:hover:bg-slate-800 ${chartType === 'bar' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400'}`}
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setChartType('line')}
                    title="Líneas"
                    className={`p-1 rounded-md hover:bg-slate-150 dark:hover:bg-slate-800 ${chartType === 'line' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400'}`}
                  >
                    <LineChartIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setChartType('area')}
                    title="Área"
                    className={`p-1 rounded-md hover:bg-slate-150 dark:hover:bg-slate-800 ${chartType === 'area' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400'}`}
                  >
                    <AreaChartIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="h-64 w-full relative">
              {tableQuickChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={tableQuickChartData} margin={{ bottom: 25, left: -15, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} angle={-20} textAnchor="end" height={45} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                      <ChartTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white p-2.5 rounded-lg border border-slate-700/50 shadow-md text-xxs font-mono">
                                <p className="font-bold border-b border-slate-700 pb-1 mb-1">{label}</p>
                                <p className="text-blue-400 font-semibold">Total {chartYKey}: <strong>{payload[0].value?.toLocaleString()}</strong></p>
                                <p className="text-slate-400">Registros agregados: {payload[0].payload.Frecuencia}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="Valor" fill="#2563eb" radius={[4, 4, 0, 0]}>
                        {tableQuickChartData.map((e, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : chartType === 'line' ? (
                    <LineChart data={tableQuickChartData} margin={{ bottom: 25, left: -15, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} angle={-20} textAnchor="end" height={45} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                      <ChartTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white p-2.5 rounded-lg border border-slate-700/50 shadow-md text-xxs font-mono">
                                <p className="font-bold border-b border-slate-700 pb-1 mb-1">{label}</p>
                                <p className="text-blue-400 font-semibold">Total {chartYKey}: <strong>{payload[0].value?.toLocaleString()}</strong></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line type="monotone" dataKey="Valor" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  ) : (
                    <AreaChart data={tableQuickChartData} margin={{ bottom: 25, left: -15, right: 10 }}>
                      <defs>
                        <linearGradient id="colorTableDynArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:hidden" />
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} angle={-20} textAnchor="end" height={45} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                      <ChartTooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white p-2.5 rounded-lg border border-slate-700/50 shadow-md text-xxs font-mono">
                                <p className="font-bold border-b border-slate-700 pb-1 mb-1">{label}</p>
                                <p className="text-blue-400 font-semibold">Total {chartYKey}: <strong>{payload[0].value?.toLocaleString()}</strong></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="Valor" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorTableDynArea)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs italic gap-2 bg-slate-50/50 dark:bg-slate-905 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Sparkles className="h-4 w-4 text-slate-300 animate-pulse" />
                  Ningún registro coincide con los filtros especificados para trazar variables
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INDIVIDUAL COLUMN ADVANCED FILTER DRAWER (Collapsible) */}
      {showFilterDefaults && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80 p-4 rounded-2xl"
          id="advanced-filters-compartment"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Filtros individuales por columna
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="filters-controls-grid">
            {columns.map((col) => {
              // Get current filter value
              const currentFilter = (columnFilters.find((f) => f.id === col.key)?.value as string) || "";
              return (
                <div key={col.key} className="space-y-1">
                  <span className="text-xxs font-bold text-slate-500 truncate block">
                    {col.label}
                  </span>
                  <input
                    type="text"
                    value={currentFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setColumnFilters(prev => prev.filter(f => f.id !== col.key));
                      } else {
                        setColumnFilters(prev => {
                          const existing = prev.find(f => f.id === col.key);
                          if (existing) {
                            return prev.map(f => f.id === col.key ? { id: col.key, value: val } : f);
                          }
                          return [...prev, { id: col.key, value: val }];
                        });
                      }
                    }}
                    placeholder={`Filtrar ${col.label.toLowerCase()}...`}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                  />
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* DATA COUNTER AND RESULTS METRICS */}
      <div className="flex items-center justify-between px-1.5" id="records-counter-bar">
        <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
          Mostrando <strong className="text-slate-800 dark:text-slate-100">{filteredCount}</strong> de {data.length} registros
          {columnFilters.length > 0 || globalFilter ? (
            <span className="ml-1 text-blue-500 dark:text-blue-405 font-bold animate-pulse">(Filtrado activo)</span>
          ) : null}
        </span>
      </div>

      {/* GRID CONTAINER FOR TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden" id="table-scroll-boundary">
        <div className="overflow-x-auto w-full max-h-[600px] overflow-y-auto relative scrollbar-thin">
          <table className="w-full text-left border-collapse" id="advanced-data-table">
            
            {/* FIXED STICKY TABLE HEADER */}
            <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 border-b border-slate-100 dark:border-slate-800 backdrop-blur-md z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sortDirection = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        className="px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400/90 tracking-wider font-mono cursor-pointer select-none whitespace-nowrap group hover:bg-slate-100/40 dark:hover:bg-slate-800/30 transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
                            {sortDirection === "asc" ? (
                              <ArrowUp className="h-3 w-3 inline text-blue-500 dark:text-blue-400" />
                            ) : sortDirection === "desc" ? (
                              <ArrowDown className="h-3 w-3 inline text-blue-500 dark:text-blue-400" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-20 group-hover:opacity-100 inline" />
                            )}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            {/* TABLE BODY */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-5 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-5 py-12 text-center text-slate-400 italic bg-slate-50/10 dark:bg-slate-900/10 text-sm"
                  >
                    Ningún registro coincide con los criterios de búsqueda o filtros indicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-500">Filas por página:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-2 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none font-sans"
            >
              {[10, 15, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 font-semibold">
            <span className="text-xs text-slate-500 mr-2">
              Pág. <strong className="text-slate-700 dark:text-slate-300">{pageIndex + 1}</strong> de {table.getPageCount() || 1}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 disabled:opacity-30 disabled:pointer-events-none hover:bg-white dark:hover:bg-slate-800/50 transition-colors"
                title="Primera página"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 disabled:opacity-30 disabled:pointer-events-none hover:bg-white dark:hover:bg-slate-800/50 transition-colors"
                title="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 disabled:opacity-30 disabled:pointer-events-none hover:bg-white dark:hover:bg-slate-800/50 transition-colors"
                title="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 disabled:opacity-30 disabled:pointer-events-none hover:bg-white dark:hover:bg-slate-800/50 transition-colors"
                title="Última página"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
