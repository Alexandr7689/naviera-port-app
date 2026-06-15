"use client";
import { useState, useEffect } from "react";
import { Ship, Droplets, Box, Car, Users, LayoutList, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { calculatePortCallCosts } from "../domain/calculator";
import { savePortCallRecord } from "../actions/portCallActions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as xlsx from "xlsx";

export default function PortCalculator() {
  const [vesselType, setVesselType] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const initialFormState = {
    vesselName: "", trb: "", eslora: "", arrivalDate: "", arrivalTime: "",
    isSimultaneous: false, 
    importedQty: "", exportedQty: "", 
    emptyImportedQty: "", emptyExportedQty: "",
    dischargeRate: "", loadingRate: "",
    originType: "internacional", destinationType: "internacional",
    passengerStayHours: "", passengerDockHours: ""
  };

  const [formData, setFormData] = useState(initialFormState);
  const [results, setResults] = useState<any>(null);

  // Efecto para escuchar la duplicación desde el historial
  useEffect(() => {
    const duplicateData = localStorage.getItem("duplicateRecord");
    if (duplicateData) {
      const record = JSON.parse(duplicateData);
      setVesselType(record.vesselType);
      
      const dateObj = new Date(record.arrivalDate);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');

      setFormData({
        vesselName: `${record.vesselName} (Copia)`,
        trb: String(record.trb),
        eslora: String(record.eslora),
        arrivalDate: `${yyyy}-${mm}-${dd}`,
        arrivalTime: `${hh}:${min}`,
        isSimultaneous: record.isSimultaneous,
        importedQty: String(record.importedQty),
        exportedQty: String(record.exportedQty),
        emptyImportedQty: String(record.emptyImportedQty || ""),
        emptyExportedQty: String(record.emptyExportedQty || ""),
        dischargeRate: String(record.dischargeRate),
        loadingRate: String(record.loadingRate),
        originType: record.originPort,
        destinationType: record.destinationPort,
        passengerStayHours: record.vesselType === 'passenger' ? String(record.operativeHours) : "",
        passengerDockHours: "",
      });
      localStorage.removeItem("duplicateRecord");
    }
  }, []);

  const handleNewPortCall = () => {
    setVesselType(null);
    setFormData(initialFormState);
    setResults(null);
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vesselType || !formData.arrivalDate || !formData.arrivalTime) return alert("Faltan datos requeridos");

    const combinedDate = new Date(`${formData.arrivalDate}T${formData.arrivalTime}`);

    const inputParam = {
      vesselType: vesselType,
      trb: parseFloat(formData.trb) || 0,
      eslora: parseFloat(formData.eslora) || 0,
      arrivalDate: combinedDate,
      isSimultaneous: formData.isSimultaneous,
      importedQty: parseFloat(formData.importedQty) || 0,
      exportedQty: parseFloat(formData.exportedQty) || 0,
      emptyImportedQty: parseFloat(formData.emptyImportedQty) || 0,
      emptyExportedQty: parseFloat(formData.emptyExportedQty) || 0,
      dischargeRate: parseFloat(formData.dischargeRate) || 0,
      loadingRate: parseFloat(formData.loadingRate) || 0,
      originType: formData.originType as 'nacional' | 'internacional',
      destinationType: formData.destinationType as 'nacional' | 'internacional',
      passengerStayHours: parseFloat(formData.passengerStayHours) || 0,
      passengerDockHours: parseFloat(formData.passengerDockHours) || 0,
      rates: { dockStayPerMeter: 1.15, normalDispatch: 0, specialMultiplier: 0 },
      holidays: []
    };

    const calculationResults = calculatePortCallCosts(inputParam);
    setResults(calculationResults);
  };

  const handleExportPDF = () => {
    if (!results) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Proforma Oficial de Recalada Portuaria", 14, 20);
    doc.setFontSize(11);
    doc.text(`Buque: ${formData.vesselName || 'No especificado'}`, 14, 30);
    doc.text(`TRB: ${formData.trb} | Eslora: ${formData.eslora}m`, 14, 36);
    doc.text(`Llegada: ${format(results.dates.arrival, "dd MMM yyyy - HH:mm", { locale: es })}`, 14, 42);

    autoTable(doc, {
      startY: 50,
      head: [['Concepto', 'Valor (USD)']],
      body: [
        ['INOCAR', `$${results.costs.inocar.toFixed(2)}`],
        ['Capitanía del Puerto', `$${results.costs.capitania.toFixed(2)}`],
        ['Servicio de Migración', `$${results.costs.migracion.toFixed(2)}`],
        ['Remolcadores', `$${results.costs.remolcadores.toFixed(2)}`],
        ['Practicaje', `$${results.costs.practicaje.toFixed(2)}`],
        ['Servicios de Puerto', `$${results.costs.serviciosPuerto.toFixed(2)}`],
        ...(results.costs.tasaMunicipal > 0 ? [['Tasa Municipal', `$${results.costs.tasaMunicipal.toFixed(2)}`]] : []),
        ['TOTAL GENERAL', `$${results.costs.totalGeneral.toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });
    doc.save(`Proforma_${formData.vesselName || 'Buque'}.pdf`);
  };

  const handleExportExcel = () => {
    if (!results) return;
    const data = [
      { Concepto: 'Buque', Valor: formData.vesselName },
      { Concepto: 'TRB', Valor: formData.trb },
      { Concepto: 'Eslora (m)', Valor: formData.eslora },
      { Concepto: 'Zarpe Proyectado', Valor: format(results.dates.departure, "dd/MM/yyyy HH:mm") },
      { Concepto: '', Valor: '' },
      { Concepto: 'INOCAR', Valor: results.costs.inocar },
      { Concepto: 'Capitanía', Valor: results.costs.capitania },
      { Concepto: 'Migración', Valor: results.costs.migracion },
      { Concepto: 'Remolcadores', Valor: results.costs.remolcadores },
      { Concepto: 'Practicaje', Valor: results.costs.practicaje },
      { Concepto: 'Servicios de Puerto', Valor: results.costs.serviciosPuerto },
      { Concepto: 'Tasa Municipal', Valor: results.costs.tasaMunicipal },
      { Concepto: 'Total General', Valor: results.costs.totalGeneral }
    ];
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Proforma");
    xlsx.writeFile(wb, `Proforma_${formData.vesselName || 'Buque'}.xlsx`);
  };

  const handleSave = async () => {
    if (!results) return;
    setIsSaving(true);
    try {
      const recordData = {
        vesselName: formData.vesselName || 'Sin Nombre',
        vesselType: vesselType || 'Desconocido',
        trb: parseFloat(formData.trb) || 0,
        eslora: parseFloat(formData.eslora) || 0,
        originPort: formData.originType,
        destinationPort: formData.destinationType,
        arrivalDate: results.dates.arrival.toISOString(), // Fechas como String ISO evitan fallos de red Next.js
        isSimultaneous: formData.isSimultaneous,
        importedQty: parseFloat(formData.importedQty) || 0,
        exportedQty: parseFloat(formData.exportedQty) || 0,
        dischargeRate: parseFloat(formData.dischargeRate) || 0,
        loadingRate: parseFloat(formData.loadingRate) || 0,
        operativeHours: results.times.totalOperativeHours,
        departureDate: results.dates.departure.toISOString(),
        normalHours: 0,
        specialHours: 0,
        dockStayCost: results.costs.dockStayCost,
        dispatchCost: 0,
        totalCost: results.costs.totalGeneral
      };
      await savePortCallRecord(recordData);
      alert('¡Proforma guardada exitosamente en el historial!');
    } catch (error) {
      console.error(error);
      alert('Hubo un error al intentar guardar en la base de datos.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center border-b pb-4 border-slate-200">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Cálculo de Recalada Portuaria</h1>
            <p className="text-slate-500">Agencia Naviera - Operaciones y Proformas</p>
          </div>
          <button type="button" onClick={handleNewPortCall} className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-semibold text-sm transition-colors">
            <RefreshCw size={16} />
            Nueva Recalada
          </button>
        </header>

        <form onSubmit={handleCalculate} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="col-span-2 space-y-6">
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h2 className="text-xl font-semibold mb-4 text-slate-700">1. Tipo de Buque</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { id: 'liquid', label: 'Granel Líquido', icon: Droplets },
                  { id: 'solid', label: 'Granel Sólido', icon: LayoutList },
                  { id: 'container', label: 'Containero', icon: Box },
                  { id: 'carcarrier', label: 'Car Carrier', icon: Car },
                  { id: 'passenger', label: 'Pasajero', icon: Users },
                ].map((type) => (
                  <button
                    key={type.id} type="button" onClick={() => setVesselType(type.id)}
                    className={`p-4 rounded-lg flex flex-col items-center justify-center gap-2 border-2 transition-all ${
                      vesselType === type.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-blue-300 text-slate-600'
                    }`}
                  >
                    <type.icon size={24} />
                    <span className="font-medium text-xs text-center">{type.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {vesselType && (
              <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                 <h2 className="text-xl font-semibold mb-4 text-slate-700">2. Datos del Buque y Carga</h2>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <input type="text" placeholder="Nombre del buque" value={formData.vesselName} onChange={e => setFormData({...formData, vesselName: e.target.value})} className="p-2 border rounded-md" />
                    <input type="number" placeholder="TRB (Toneladas)" value={formData.trb} onChange={e => setFormData({...formData, trb: e.target.value})} className="p-2 border rounded-md" />
                    <input type="number" placeholder="Eslora (m)" value={formData.eslora} onChange={e => setFormData({...formData, eslora: e.target.value})} className="p-2 border rounded-md" />
                    <input type="date" value={formData.arrivalDate} onChange={e => setFormData({...formData, arrivalDate: e.target.value})} className="p-2 border rounded-md" />
                    <input type="time" value={formData.arrivalTime} onChange={e => setFormData({...formData, arrivalTime: e.target.value})} className="p-2 border rounded-md" />
                 </div>

                 <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-500 font-bold">Puerto de Origen</label>
                      <select value={formData.originType} onChange={e => setFormData({...formData, originType: e.target.value})} className="p-2 border rounded-md bg-slate-50">
                        <option value="internacional">Internacional</option>
                        <option value="nacional">Nacional</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-slate-500 font-bold">Puerto de Destino</label>
                      <select value={formData.destinationType} onChange={e => setFormData({...formData, destinationType: e.target.value})} className="p-2 border rounded-md bg-slate-50">
                        <option value="internacional">Internacional</option>
                        <option value="nacional">Nacional</option>
                      </select>
                    </div>
                 </div>

                 {vesselType !== 'passenger' && (
                   <div className="mt-6 border-t pt-4">
                     <h3 className="font-medium mb-3">Modalidad Operativa</h3>
                     <div className="flex gap-4 mb-4">
                       <label className="flex items-center gap-2">
                         <input type="radio" checked={!formData.isSimultaneous} onChange={() => setFormData({...formData, isSimultaneous: false})} /> No simultánea
                       </label>
                       <label className="flex items-center gap-2">
                         <input type="radio" checked={formData.isSimultaneous} onChange={() => setFormData({...formData, isSimultaneous: true})} /> Simultánea
                       </label>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                       <input type="number" placeholder={vesselType === 'container' ? "Cant. Importada (Llenos)" : "Cantidad Importada"} value={formData.importedQty} onChange={e => setFormData({...formData, importedQty: e.target.value})} className="p-2 border rounded-md" />
                       <input type="number" placeholder={vesselType === 'container' ? "Cant. Exportada (Llenos)" : "Cantidad Exportada"} value={formData.exportedQty} onChange={e => setFormData({...formData, exportedQty: e.target.value})} className="p-2 border rounded-md" />
                       
                       {vesselType === 'container' && (
                         <>
                           <input type="number" placeholder="Contenedores Vacíos (Importación)" value={formData.emptyImportedQty} onChange={e => setFormData({...formData, emptyImportedQty: e.target.value})} className="p-2 border border-orange-300 bg-orange-50 rounded-md" />
                           <input type="number" placeholder="Contenedores Vacíos (Exportación)" value={formData.emptyExportedQty} onChange={e => setFormData({...formData, emptyExportedQty: e.target.value})} className="p-2 border border-orange-300 bg-orange-50 rounded-md" />
                         </>
                       )}

                       <input type="number" placeholder="Rata de Descarga/h" value={formData.dischargeRate} onChange={e => setFormData({...formData, dischargeRate: e.target.value})} className="p-2 border rounded-md" />
                       <input type="number" placeholder="Rata de Embarque/h" value={formData.loadingRate} onChange={e => setFormData({...formData, loadingRate: e.target.value})} className="p-2 border rounded-md" />
                     </div>
                   </div>
                 )}

                 {vesselType === 'passenger' && (
                    <div className="mt-6 border-t pt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                       <input type="number" placeholder="Total Pasajeros" value={formData.importedQty} onChange={e => setFormData({...formData, importedQty: e.target.value})} className="p-2 border rounded-md" />
                       <input type="number" placeholder="Uso Terminal" value={formData.exportedQty} onChange={e => setFormData({...formData, exportedQty: e.target.value})} className="p-2 border rounded-md" />
                       <div className="flex flex-col">
                          <input type="number" placeholder="Estadía (Ej. 72)" value={formData.passengerStayHours} onChange={e => setFormData({...formData, passengerStayHours: e.target.value})} className="p-2 border border-blue-300 bg-blue-50 rounded-md" />
                          <span className="text-[10px] text-slate-500 mt-1">Horas totales en puerto</span>
                       </div>
                       <div className="flex flex-col">
                          <input type="number" placeholder="Muelle (Ej. 24)" value={formData.passengerDockHours} onChange={e => setFormData({...formData, passengerDockHours: e.target.value})} className="p-2 border border-purple-300 bg-purple-50 rounded-md" />
                          <span className="text-[10px] text-slate-500 mt-1">Horas cobradas en muelle</span>
                       </div>
                    </div>
                 )}
                 
                 <button type="submit" className="mt-6 w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow-md">
                   Procesar Proforma
                 </button>
              </section>
            )}
          </div>

          <div className="col-span-1">
             <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg sticky top-8 border border-slate-700">
               <h2 className="text-xl font-semibold mb-2 text-blue-400">Proforma de Costos</h2>
               <p className="text-xs text-slate-400 mb-6 border-b border-slate-700 pb-4">Desglose exacto oficial de Naviera</p>
               
               {results ? (
                 <div className="space-y-3 text-sm">
                   <div className="flex justify-between text-yellow-400 font-medium pb-2">
                     <span>Horas Totales (Aprox):</span>
                     <span>{results.times.totalOperativeHours} hrs</span>
                   </div>
                   <div className="flex justify-between text-yellow-400 font-medium pb-4 border-b border-slate-700">
                     <span>Zarpe Proyectado:</span>
                     <span>{format(results.dates.departure, "dd MMM yyyy - HH:mm", { locale: es })}</span>
                   </div>

                   <div className="flex justify-between mt-4">
                     <span className="text-slate-400">INOCAR:</span> 
                     <span>${results.costs.inocar.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-400">Capitanía del Puerto:</span> 
                     <span>${results.costs.capitania.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-400">Servicio de Migración:</span> 
                     <span>${results.costs.migracion.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-400">Remolcadores:</span> 
                     <span>${results.costs.remolcadores.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-400">Practicaje:</span> 
                     <span>${results.costs.practicaje.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-slate-400">Servicios de Puerto:</span> 
                     <span>${results.costs.serviciosPuerto.toFixed(2)}</span>
                   </div>
                   
                   {results.costs.tasaMunicipal > 0 && (
                     <div className="flex justify-between text-orange-300">
                       <span>Tasa Municipal:</span> 
                       <span>${results.costs.tasaMunicipal.toFixed(2)}</span>
                     </div>
                   )}

                   <div className="mt-6 pt-4 border-t border-slate-700">
                     <span className="block text-slate-400 mb-1">Costo Total de Recalada</span>
                     <span className="text-4xl font-bold text-emerald-400">
                       ${results.costs.totalGeneral.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                     </span>
                   </div>

                   <div className="grid grid-cols-2 gap-2 mt-8">
                     <button type="button" onClick={handleExportPDF} className="bg-red-600 hover:bg-red-500 py-2.5 rounded-lg text-xs font-semibold text-center transition-colors shadow-sm">
                       Exportar PDF
                     </button>
                     <button type="button" onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-lg text-xs font-semibold text-center transition-colors shadow-sm">
                       Exportar Excel
                     </button>
                     <button type="button" onClick={handleSave} disabled={isSaving} className="col-span-2 bg-blue-600 hover:bg-blue-500 py-3 rounded-lg text-sm font-bold text-center mt-2 transition-colors disabled:bg-blue-800 shadow-sm">
                       {isSaving ? "Guardando..." : "Guardar Cálculo en Historial"}
                     </button>
                   </div>
                 </div>
               ) : (
                 <div className="text-center text-slate-500 py-12">
                   Llene los datos y presione "Procesar Proforma" para visualizar los costos de recalada.
                 </div>
               )}
             </div>
          </div>
        </form>
      </div>
    </div>
  );
}
