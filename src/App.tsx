import { useState, useEffect, useMemo, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  TableProperties, 
  BarChart4, 
  RefreshCw, 
  Sun, 
  Moon, 
  Database, 
  AlertCircle, 
  FileSpreadsheet, 
  ExternalLink, 
  Calendar,
  X,
  Menu,
  User,
  Info
} from "lucide-react";
import { SpreadsheetRow, ColumnMetric } from "./types";
import { fetchSpreadsheetData, extractSpreadsheetInfo } from "./utils/googleSheets";
import { analyzeColumns } from "./utils/statistics";
import KPICards from "./components/KPICards";
import ChartsDashboard from "./components/ChartsDashboard";
import AdvancedTable from "./components/AdvancedTable";

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1ud5Fg1lMRX0stTjOtkRh2gdj8C1silhTMJTFWBe5Jtw/edit?gid=0#gid=0";
const OLD_SHEET_URL = "https://docs.google.com/spreadsheets/d/1KRnOhcR1-5STvHMnDtm9Hmafm9egkMv1yHYoa9qjn6A/edit?gid=192673282#gid=192673282";

export default function App() {
  const [sheetUrl, setSheetUrl] = useState(() => {
    const stored = localStorage.getItem("g_sheet_url");
    if (!stored || stored === OLD_SHEET_URL) {
      return DEFAULT_SHEET_URL;
    }
    return stored;
  });
  const [currentUrlInput, setCurrentUrlInput] = useState(sheetUrl);
  const [activeTab, setActiveTab] = useState<"tabla" | "dashboard">("tabla");
  const [rawData, setRawData] = useState<SpreadsheetRow[]>([]);
  const [columns, setColumns] = useState<ColumnMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Mobile UI controls
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Theme states
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark" || 
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  // Toggle theme class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Load spreadsheet data
  const loadData = async (targetUrl: string, force = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSpreadsheetData(targetUrl);
      if (data.length === 0) {
        throw new Error("La hoja de cálculo regresó un conjunto de datos vacío. Verifique que tenga filas válidas.");
      }
      setRawData(data);
      
      const analyzed = analyzeColumns(data);
      setColumns(analyzed);
      
      localStorage.setItem("g_sheet_url", targetUrl);
      setSheetUrl(targetUrl);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || 
        "No se pudo cargar la hoja de cálculo. Asegúrese de que el documento esté compartido como 'Cualquier persona con el enlace puede ver' y que la URL o ID sean válidos."
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData(sheetUrl);
  }, []);

  // Find dynamic date column
  const dateColumnKey = useMemo(() => {
    const dateCol = columns.find(col => col.type === 'date');
    return dateCol ? dateCol.key : null;
  }, [columns]);

  // Date range state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Extracted min/max dates from data for bounds
  const dateBounds = useMemo(() => {
    if (!dateColumnKey || rawData.length === 0) return { min: "", max: "" };
    const dates = rawData
      .map(r => r[dateColumnKey])
      .filter(d => d && !isNaN(new Date(d).getTime()))
      .map(d => new Date(d).toISOString().slice(0, 10));

    if (dates.length === 0) return { min: "", max: "" };
    
    dates.sort();
    return {
      min: dates[0],
      max: dates[dates.length - 1]
    };
  }, [rawData, dateColumnKey]);

  // Reset range if datasets change
  useEffect(() => {
    if (dateBounds.min && dateBounds.max) {
      setStartDate(dateBounds.min);
      setEndDate(dateBounds.max);
    } else {
      setStartDate("");
      setEndDate("");
    }
  }, [dateBounds]);

  // Advanced Filtration Pipeline (combining date ranges)
  const filteredData = useMemo(() => {
    if (!dateColumnKey || (!startDate && !endDate)) {
      return rawData;
    }

    return rawData.filter(row => {
      const rawDateVal = row[dateColumnKey];
      if (rawDateVal === undefined || rawDateVal === null || rawDateVal === "") {
        return false;
      }
      
      const rowTime = new Date(rawDateVal).getTime();
      if (isNaN(rowTime)) return true; // Keep values that aren't parseable as bounds, or skip

      if (startDate) {
        const startTime = new Date(startDate).getTime();
        if (!isNaN(startTime) && rowTime < startTime) return false;
      }

      if (endDate) {
        const endTime = new Date(endDate).getTime();
        if (!isNaN(endTime) && rowTime > endTime) return false;
      }

      return true;
    });
  }, [rawData, dateColumnKey, startDate, endDate]);

  const handleUrlSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUrlInput.trim()) return;
    loadData(currentUrlInput.trim());
    setShowConfigModal(false);
  };

  const handleResetToDefault = () => {
    setCurrentUrlInput(DEFAULT_SHEET_URL);
    loadData(DEFAULT_SHEET_URL);
    setShowConfigModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 flex flex-col md:flex-row transition-colors duration-300">      {/* SIDEBAR FOR NAVIGATION */}
      <aside 
        className={`fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/90 w-72 z-30 transform md:transform-none md:sticky transition-transform duration-300 md:flex flex-col ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        id="application-sidebar"
      >
        {/* Sidebar Header */}
        <div className="h-16 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between px-6 shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/10 shrink-0">
              <FileSpreadsheet className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 dark:text-slate-50 tracking-tight text-sm leading-tight">
                TableroSector
              </h1>
              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">
                SheetSync AI
              </span>
            </div>
          </div>

          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-7">
          
          {/* Main sections */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2 block mb-2">
              Vistas Disponibles
            </span>
            <button
              onClick={() => {
                setActiveTab("tabla");
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all border-r-3 ${
                activeTab === "tabla"
                  ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 font-bold shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 border-transparent"
              }`}
            >
              <TableProperties className="h-4 w-4" />
              <span>Vista Tabla</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("dashboard");
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-all border-r-3 ${
                activeTab === "dashboard"
                  ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 font-bold shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 border-transparent"
              }`}
            >
              <BarChart4 className="h-4 w-4" />
              <span>Vista Dashboard</span>
            </button>
          </div>

          {/* Source Control */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-2 block">
              Origen de Datos
            </span>
            
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 border border-slate-200/80 dark:border-slate-800/50 rounded-xl space-y-2.5">
              <span className="text-[11px] text-slate-505 dark:text-slate-400 block font-semibold truncate" title={sheetUrl}>
                📁 ID: {extractSpreadsheetInfo(sheetUrl).id.slice(0, 15)}...
                <br />
                📄 GID: {extractSpreadsheetInfo(sheetUrl).gid}
              </span>
              <button
                onClick={() => setShowConfigModal(true)}
                className="w-full text-center px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 rounded-lg shadow-sm transition-colors"
              >
                Conectar Otra Hoja
              </button>
            </div>
          </div>

          {/* Instructions checklist */}
          <div className="bg-blue-50/50 dark:bg-slate-950/20 border border-blue-100/10 dark:border-slate-800/80 p-4 rounded-xl text-xs space-y-2">
            <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              ¿Como cambiar la hoja?
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              En Google Sheets, haga clic en <strong>Archivo &gt; Compartir &gt; Publicar en la Web</strong>, o comparta el documento como <strong>Cualquier persona con el enlace puede ver</strong>, y pegue el link aquí.
            </p>
          </div>

        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-250 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30 space-y-3 shrink-0">
          
          {/* User Email Indicator */}
          <div className="flex items-center gap-2.5 px-2.5 py-1 text-slate-500 dark:text-slate-400">
            <User className="h-4 w-4 text-slate-400" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider leading-none">Observador</span>
              <span className="text-[11px] font-semibold truncate block leading-tight">miguel10romero@gmail.com</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800/60 pt-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 transition-colors"
              title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              id="theme-toggler"
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => loadData(sheetUrl)}
              disabled={loading}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-30 flex items-center gap-1.5 text-xs font-bold"
              id="manual-refresh-trigger"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-500" : ""}`} />
              Recargar
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER BAR */}
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 px-6 flex items-center justify-between md:hidden shrink-0 z-20">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-300"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="p-1.5 bg-blue-600 text-white rounded-md shadow-sm shadow-blue-600/10">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-950 dark:text-white">TableroSector</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500"
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => loadData(sheetUrl)}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>
      </header>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/40 opacity-100 z-20 transition-opacity md:hidden"
        />
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0" id="main-content-window">
        
        {/* UPPER SPACIOUS BANNER */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-6 sm:px-8 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xxs font-mono text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">
                <Database className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Base de Datos de Preferente</span>
                <span className="h-1 w-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                <span>Grupo 1</span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-105 tracking-tight leading-none mb-2">
                {activeTab === "tabla" ? "Planilla y Registros de Jugadores" : "Estadísticas y Análisis de Rendimiento"}
              </h2>
              {lastUpdated && (
                <p className="text-xs text-slate-405">
                  Sincronizado por última vez: <strong className="text-slate-600 dark:text-slate-300 font-semibold">{lastUpdated.toLocaleTimeString()}</strong>
                </p>
              )}
            </div>

            {/* AUTOMATIC DATE FILTER BAR IF DATE DETECTED */}
            {dateColumnKey && rawData.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/80 p-3 rounded-2xl flex flex-col sm:flex-row items-center gap-3.5 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="font-bold text-slate-600 dark:text-slate-400">Rango de fechas ({dateColumnKey}):</span>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="date"
                    value={startDate}
                    min={dateBounds.min}
                    max={dateBounds.max}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 px-2.5 py-1.5 rounded-xl font-bold font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
                  <span>al</span>
                  <input
                    type="date"
                    value={endDate}
                    min={dateBounds.min}
                    max={dateBounds.max}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 px-2.5 py-1.5 rounded-xl font-bold font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                  />
                </div>

                {(startDate !== dateBounds.min || endDate !== dateBounds.max) && (
                  <button
                    onClick={() => {
                      setStartDate(dateBounds.min);
                      setEndDate(dateBounds.max);
                    }}
                    className="text-xxs font-bold text-rose-500 hover:text-rose-600 hover:underline border border-rose-500/15 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg"
                  >
                    Restablecer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* WORK WINDOW & VIEWS CONTAINER */}
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          
          <AnimatePresence mode="wait">
            
            {/* 1. LOADING SCREEN */}
            {loading ? (
              <motion.div
                key="loading-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[400px] flex flex-col items-center justify-center text-center space-y-4"
                id="loading-spinner-state"
              >
                <div className="relative">
                  <div className="h-14 w-14 border-4 border-slate-100 dark:border-slate-850 rounded-full" />
                  <div className="h-14 w-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
                  <FileSpreadsheet className="h-6 w-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-250">Descargando registros...</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Accediendo a la API compartida de Google Sheets
                  </p>
                </div>
              </motion.div>
            )

            // 2. ERROR SCREEN
            : error ? (
              <motion.div
                key="error-screen"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-8 max-w-xl mx-auto shadow-sm mt-8 space-y-6"
                id="error-diagnostics-card"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-500/15 text-rose-600 dark:text-rose-450 border border-rose-500/10 rounded-xl shrink-0">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-red-600 dark:text-red-450">Fallo de Comunicación con Google Sheets</h3>
                    <p className="text-sm text-slate-650 dark:text-slate-400 leading-relaxed font-semibold">
                      {error}
                    </p>
                  </div>
                </div>

                {/* Checklist troubleshooting */}
                <div className="space-y-3 pt-2 text-xs border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">Por favor, compruebe lo siguiente:</h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-500 dark:text-slate-400">
                    <li>Asegúrese de que la hoja de cálculo sea <strong>Pública</strong> (Compartir &gt; Cualquier persona con el enlace puede ver).</li>
                    <li>Verifique si ha copiado la dirección web completa del navegador correctamente.</li>
                    <li>Confirme que tiene una conexión a internet estable.</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    onClick={() => loadData(sheetUrl)}
                    className="flex-1 text-center py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                  >
                    Reintentar Conexión
                  </button>
                  <button
                    onClick={() => {
                      setSheetUrl(DEFAULT_SHEET_URL);
                      loadData(DEFAULT_SHEET_URL);
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
                  >
                    Cargar Predeterminada
                  </button>
                </div>
              </motion.div>
            )

            // 3. MAIN TAB VIEWS
            : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
                id="loaded-views-compartment"
              >
                
                {/* Visual statistics on tab active */}
                {activeTab === "tabla" ? (
                  <AdvancedTable data={filteredData} columns={columns} />
                ) : (
                  <>
                    <KPICards data={filteredData} columns={columns} />
                    <ChartsDashboard data={filteredData} columns={columns} />
                  </>
                )}

              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </main>

      {/* FIXED FLOATING CONNECTION STATUS BADGE */}
      {!loading && !error && (
        <div className="fixed bottom-4 right-8 bg-slate-900 dark:bg-slate-950 border border-slate-800 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 z-40 bg-opacity-95 backdrop-blur-sm animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-slate-200">
            Sheet Connected: Spreadsheet-{extractSpreadsheetInfo(sheetUrl).id ? extractSpreadsheetInfo(sheetUrl).id.slice(0, 8) : "Active"}
          </span>
        </div>
      )}

      {/* RE-CONFIGURATION SHEET URL DIALOG MODAL */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop blur click handler */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfigModal(false)}
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative z-10"
              id="sheet-reconfigurator-modal"
            >
              <button 
                onClick={() => setShowConfigModal(false)}
                className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                <FileSpreadsheet className="h-5.5 w-5.5 text-blue-600 dark:text-blue-450" />
                <h3 className="font-bold text-slate-900 dark:text-slate-50">Conectar Nueva Hoja de Cálculo</h3>
              </div>

              <form onSubmit={handleUrlSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xxs font-bold text-slate-500 uppercase tracking-widest block">
                    URL completa de Google Sheets o ID del Documento
                  </label>
                  <input
                    type="text"
                    value={currentUrlInput}
                    onChange={(e) => setCurrentUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                    Admite filtros directos para hojas compartidas
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl text-xxs leading-relaxed text-slate-500 space-y-1">
                  <strong className="text-slate-600 dark:text-slate-400 block mb-1">Pasos para publicar:</strong>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Abra su archivo en Google Sheets.</li>
                    <li>Haga clic en <strong>Compartir</strong> (botón azul arriba a la derecha).</li>
                    <li>Seleccione <strong>Cualquier persona con el enlace puede ver</strong> como lector.</li>
                    <li>Copie el enlace de su navegador y péguelo en el campo superior.</li>
                  </ol>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-750 text-xs text-slate-650 dark:text-slate-300 font-bold rounded-xl transition-colors"
                  >
                    Hoja Predeterminada
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                  >
                    Cargar Hoja
                  </button>
                </div>
              </form>
            </motion.div>

          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
