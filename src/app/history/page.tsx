"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getHistoryRecords } from "../../actions/portCallActions";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Shield, TrendingUp, Anchor, Copy, Filter, 
  BarChart3, DollarSign, Clock, ArrowLeft, Layers 
} from "lucide-react";

export default function DashboardHistory() {
  const router = useRouter();
  const [records, setRecords] = useState<any[]>([]);
  
  // Estados de Filtros
  const [selectedVessel, setSelectedVessel] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Diccionarios de diseño para temáticas
  const typeLabels: any = { 
    liquid: "Granel Líquido", 
    solid: "Granel Sólido", 
    container: "Containero", 
    carcarrier: "Car Carrier", 
    passenger: "Pasajero" 
  };

  const typeColors: any = {
    liquid: "bg-blue-500",
    solid: "bg-amber-500",
    container: "bg-purple-500",
    carcarrier: "bg-orange-500",
    passenger: "bg-pink-500"
  };

  useEffect(() => {
    async function loadData() {
      const data = await getHistoryRecords();
      setRecords(data);
    }
    loadData();
  }, []);

  // 1. OBTENER OPCIONES DE FILTROS DINÁMICOS
  const uniqueVessels = Array.from(new Set(records.map((r: any) => r.vesselName))).sort();
  const uniqueTypes = Array.from(new Set(records.map((r: any) => r.vesselType)));

  // 2. APLICAR FILTROS EN TIEMPO REAL
  const filteredRecords = records.filter((record) => {
    const matchVessel = selectedVessel === "all" || record.vesselName === selectedVessel;
    const matchType = selectedType === "all" || record.vesselType === selectedType;
    return matchVessel && matchType;
  });

  // 3. PROCESAR MÉTRICAS BASADAS EN LOS FILTROS ACTIVOS
  const totalCount = filteredRecords.length;
  const totalRevenue = filteredRecords.reduce((sum, r) => sum + r.totalCost, 0);
  const averageCost = totalCount > 0 ? totalRevenue / totalCount : 0;
  const maxCost = filteredRecords.length > 0 ? Math.max(...filteredRecords.map(r => r.totalCost)) : 0;

  // 4. GENERAR DATOS PARA LAS GRÁFICAS (AGRUPADOS POR TEMÁTICA)
  const statsByTheme = Object.keys(typeLabels).map((type) => {
    // Filtrar registros de esta temática que pasen el filtro de nombre de buque actual
    const themeRecords = records.filter(r => r.vesselType === type && (selectedVessel === "all" || r.vesselName === selectedVessel));
    const count = themeRecords.length;
    const revenue = themeRecords.reduce((sum, r) => sum + r.totalCost, 0);
    return { type, label: typeLabels[type], count, revenue };
  });

  const maxThemeCount = Math.max(...statsByTheme.map(s => s.count), 1);
  const maxThemeRevenue = Math.max(...statsByTheme.map(s => s.revenue), 1);

  const handleDuplicate = (record: any) => {
    localStorage.setItem("duplicateRecord", JSON.stringify(record));
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 space-y-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Cabecera de Navegación */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-5 border-slate-200">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard de Análisis Comercial</h1>
            <p className="text-slate-500">Métricas analíticas y auditoría de recaladas portuarias</p>
          </div>
          <button 
            type="button" 
            onClick={() => router.push("/")} 
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm self-start"
          >
            <ArrowLeft size={16} />
            Volver al Calculador
          </button>
        </div>

        {/* PANEL DE FILTROS DINÁMICOS */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Filter size={13} /> Filtrar por Nombre de Buque
            </label>
            <select 
              value={selectedVessel} 
              onChange={(e) => setSelectedVessel(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-slate-50 text-slate-700 font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">🚢 Todos los buques disponibles</option>
              {uniqueVessels.map(name => (
                <option key={name} value={name as string}>{name as string}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Layers size={13} /> Filtrar por Temática/Tráfico
            </label>
            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-slate-50 text-slate-700 font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">📦 Todas las temáticas de carga</option>
              {uniqueTypes.map(type => (
                <option key={type as string} value={type as string}>{typeLabels[type as string] || type as string}</option>
              ))}
            </select>
          </div>

          <button 
            type="button" 
            onClick={() => { setSelectedVessel("all"); setSelectedType("all"); }}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-lg text-sm transition-colors border border-slate-200"
          >
            Restablecer Filtros
          </button>
        </div>

        {/* TARJETAS DE MÉTRICAS DINÁMICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Anchor size={22} /></div>
            <div>
              <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">Recaladas Filtradas</span>
              <span className="text-2xl font-bold text-slate-800">{totalCount} naves</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={22} /></div>
            <div>
              <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">Ingreso Filtrado</span>
              <span className="text-2xl font-bold text-slate-800">${totalRevenue.toLocaleString('en-US', {maximumFractionDigits:2})}</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><DollarSign size={22} /></div>
            <div>
              <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">Costo Promedio</span>
              <span className="text-2xl font-bold text-slate-800">${averageCost.toLocaleString('en-US', {maximumFractionDigits:2})}</span>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Clock size={22} /></div>
            <div>
              <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">Facturación Máxima</span>
              <span className="text-2xl font-bold text-slate-800">${maxCost.toLocaleString('en-US', {maximumFractionDigits:2})}</span>
            </div>
          </div>
        </div>

        {/* SECCIÓN DE GRÁFICAS ANALÍTICAS (DISTRIBUCIÓN E INGRESOS) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Gráfica 1: Frecuencia de Tráfico */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 border-b pb-3 border-slate-100">
              <BarChart3 className="text-slate-500" size={18} />
              <h3 className="font-bold text-slate-700 text-base">Volumen de Tráfico Marítimo por Temática</h3>
            </div>
            <div className="space-y-4">
              {statsByTheme.map((item) => {
                const percentage = (item.count / maxThemeCount) * 100;
                return (
                  <div key={item.type} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>{item.label}</span>
                      <span className="font-bold text-slate-800">{item.count} recaladas</span>
                    </div>
                    <div className="w-full bg-slate-100 h-6 rounded-md overflow-hidden relative flex items-center">
                      <div 
                        className={`h-full ${typeColors[item.type] || 'bg-slate-400'} transition-all duration-500`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gráfica 2: Rendimiento Financiero */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 border-b pb-3 border-slate-100">
              <TrendingUp className="text-slate-500" size={18} />
              <h3 className="font-bold text-slate-700 text-base">Aportación de Ingresos por Temática (USD)</h3>
            </div>
            <div className="space-y-4">
              {statsByTheme.map((item) => {
                const percentage = (item.revenue / maxThemeRevenue) * 100;
                return (
                  <div key={item.type} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>{item.label}</span>
                      <span className="font-bold text-slate-800">${item.revenue.toLocaleString('en-US', {maximumFractionDigits:0})}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-6 rounded-md overflow-hidden relative flex items-center">
                      <div 
                        className={`h-full bg-emerald-500 transition-all duration-500`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* TABLA DE HISTORIAL FILTRADA */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
            <h2 className="font-semibold text-lg">Registros Guardados ({filteredRecords.length})</h2>
            <span className="text-xs text-slate-400 font-medium">Mostrando datos según filtros aplicados</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs uppercase font-bold border-b border-slate-100">
                  <th className="p-4">Fecha Llegada</th>
                  <th className="p-4">Nombre Buque</th>
                  <th className="p-4">Temática</th>
                  <th className="p-4">TRB</th>
                  <th className="p-4">Estadía</th>
                  <th className="p-4">Total Proforma</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-600 divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-12 text-slate-400 font-medium">
                      Ningún registro coincide con los criterios de búsqueda seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-medium">{format(new Date(record.arrivalDate), "dd MMM yyyy", { locale: es })}</td>
                      <td className="p-4 font-bold text-slate-800">{record.vesselName}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold text-white ${typeColors[record.vesselType] || 'bg-slate-400'}`}>
                          {typeLabels[record.vesselType] || record.vesselType}
                        </span>
                      </td>
                      <td className="p-4 font-mono">{record.trb.toLocaleString()} T</td>
                      <td className="p-4 text-slate-500 font-medium">{record.operativeHours} hrs</td>
                      <td className="p-4 font-bold text-slate-900">${record.totalCost.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                      <td className="p-4 text-center">
                        <button 
                          type="button" 
                          onClick={() => handleDuplicate(record)} 
                          className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-md text-xs font-bold transition-colors shadow-2xs"
                        >
                          <Copy size={13} />
                          Duplicar para Proforma
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
