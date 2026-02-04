
import React, { useState, useMemo } from 'react';
import { AppData, Material, Cotizacion, CotizacionItem } from '../types';
import { 
  Search, FileText, ChevronRight, X, Calculator, 
  Save, RefreshCw, DollarSign, AlertCircle, Sparkles,
  ClipboardList, CheckCircle2, TrendingUp
} from 'lucide-react';

interface ProyectoManagerProps {
  data: AppData;
  onDataUpdate: (newMaterials: Material[], newQuotes: Cotizacion[]) => void;
}

export const ProyectoManager: React.FC<ProyectoManagerProps> = ({ data, onDataUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<Cotizacion | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const filteredQuotes = useMemo(() => {
    return data.COTIZACIONES.filter(q => 
      q.ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.CLIENTE.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.OT.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data.COTIZACIONES, searchTerm]);

  const handleSyncWithMaterials = () => {
    if (!selectedQuote) return;
    
    const materialMap = new Map(data.MATERIALES.map(m => [m.CODIGO, m.PRECIO_UN]));

    const updatedItems = selectedQuote.ITEMS.map(item => {
      const dbPrice = materialMap.get(item.CODIGO);
      if (dbPrice !== undefined) {
        return {
          ...item,
          PRECIO_UNIT: dbPrice,
          SUBTOTAL: item.CANTIDAD * dbPrice
        };
      }
      return item;
    });

    const subtotalNeto = updatedItems.reduce((sum, i) => sum + i.SUBTOTAL, 0);
    const total = subtotalNeto * (1 + selectedQuote.IMPREVISTOS / 100);

    const totalProyecto = updatedItems.reduce((sum, item) => {
      const p = item.PRECIO_PROYECTO !== undefined ? item.PRECIO_PROYECTO : item.PRECIO_UNIT;
      return sum + (p * item.CANTIDAD);
    }, 0) * (1 + selectedQuote.IMPREVISTOS / 100);

    setSelectedQuote({
      ...selectedQuote,
      ITEMS: updatedItems,
      SUBTOTAL_NETO: subtotalNeto,
      TOTAL: total,
      TOTAL_PROYECTO: totalProyecto
    });

    setSyncStatus('Precios actualizados desde Base de Datos');
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleUpdateProjectPrice = (index: number, price: number) => {
    if (!selectedQuote) return;
    const updatedItems = [...selectedQuote.ITEMS];
    updatedItems[index] = {
      ...updatedItems[index],
      PRECIO_PROYECTO: price
    };

    const totalProyecto = updatedItems.reduce((sum, item) => {
      const p = item.PRECIO_PROYECTO !== undefined ? item.PRECIO_PROYECTO : item.PRECIO_UNIT;
      return sum + (p * item.CANTIDAD);
    }, 0) * (1 + selectedQuote.IMPREVISTOS / 100);

    setSelectedQuote({
      ...selectedQuote,
      ITEMS: updatedItems,
      TOTAL_PROYECTO: totalProyecto
    });
  };

  const handleSaveRevision = () => {
    if (!selectedQuote) return;

    const updatedQuotes = data.COTIZACIONES.map(q => 
      q.ID === selectedQuote.ID ? { 
        ...selectedQuote, 
        ESTADO: 'Modificada por Proyecto' as any 
      } : q
    );

    onDataUpdate(data.MATERIALES, updatedQuotes);
    setSelectedQuote(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por ID, OT o Cliente..." 
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="bg-purple-50 px-4 py-2 rounded-xl flex items-center gap-2 border border-purple-100 shadow-sm">
           <TrendingUp className="text-purple-600" size={18} />
           <span className="text-[10px] font-black text-purple-900 uppercase tracking-widest">Recotización de Proyectos</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
        {filteredQuotes.map(q => {
          // Check stock status for this quote
          const isMissing = q.ITEMS.some(item => {
            const mat = data.MATERIALES.find(m => m.CODIGO === item.CODIGO);
            return (mat?.EN_STOCK || 0) < item.CANTIDAD;
          });

          return (
            <div 
              key={q.ID} 
              className={`bg-white p-6 rounded-[2rem] border transition-all group cursor-pointer hover:shadow-xl ${q.ESTADO === 'Modificada por Proyecto' ? 'border-purple-300 bg-purple-50/30 ring-1 ring-purple-100' : 'border-slate-200 shadow-sm hover:border-blue-300'}`}
              onClick={() => setSelectedQuote(q)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-slate-800 uppercase text-xs tracking-tight flex items-center gap-2">
                    {q.ID}
                    {q.ESTADO === 'Modificada por Proyecto' && <Sparkles size={14} className="text-purple-500 animate-pulse" />}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{q.FECHA}</p>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${isMissing ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {isMissing ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                  {isMissing ? 'Faltante Stock' : 'Stock OK'}
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cliente</p>
                  <p className="text-sm font-black text-slate-700 truncate">{q.CLIENTE}</p>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">OT</p>
                    <p className="text-xs font-black text-blue-600">{q.OT}</p>
                  </div>
                  <div className="flex-1 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Items</p>
                    <p className="text-xs font-black text-slate-700">{q.ITEMS.length}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 flex justify-between items-end">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Monto Base</p>
                  <span className="text-lg font-black text-slate-400 line-through decoration-slate-300">${q.TOTAL.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-purple-500 uppercase mb-1">Revisado</p>
                  <span className="text-2xl font-black text-purple-700 tracking-tighter">${(q.TOTAL_PROYECTO || q.TOTAL).toLocaleString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedQuote && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col h-[92vh] animate-in slide-in-from-bottom-8">
            <div className="p-8 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-purple-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-purple-900/20">
                  <FileText size={28} />
                </div>
                <div>
                  <h3 className="font-black text-2xl uppercase tracking-tighter leading-none">Módulo de Recotización</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {selectedQuote.ID} • {selectedQuote.CLIENTE} • <span className="text-blue-400">OT {selectedQuote.OT}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {syncStatus && (
                   <span className="text-[10px] font-black text-green-400 uppercase animate-bounce">{syncStatus}</span>
                )}
                <button 
                  onClick={handleSyncWithMaterials}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-all active:scale-95"
                >
                  <RefreshCw size={16} /> Sincronizar Precios DB
                </button>
                <button onClick={() => setSelectedQuote(null)} className="p-3 text-slate-500 hover:bg-white/10 hover:text-white rounded-2xl transition-all ml-2">
                  <X size={28} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden mb-10">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-8 py-5">Identificación Item</th>
                      <th className="px-8 py-5 text-center">Cant / Stock</th>
                      <th className="px-8 py-5">Precio Aut. ($)</th>
                      <th className="px-8 py-5 w-72">Precio Proyecto (Ajuste)</th>
                      <th className="px-8 py-5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedQuote.ITEMS.map((item, idx) => {
                      const mat = data.MATERIALES.find(m => m.CODIGO === item.CODIGO);
                      const available = mat ? mat.EN_STOCK : 0;
                      const isMissing = item.CANTIDAD > available;
                      const currentPrice = item.PRECIO_PROYECTO !== undefined ? item.PRECIO_PROYECTO : item.PRECIO_UNIT;
                      const subtotalItem = currentPrice * item.CANTIDAD;
                      
                      return (
                        <tr key={idx} className={`hover:bg-purple-50/10 transition-colors ${isMissing ? 'bg-red-50/20' : ''}`}>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-blue-500 font-mono mb-1">{item.CODIGO}</span>
                              <span className="text-sm font-bold text-slate-800 leading-tight">{item.DESCRIPCION}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <div className="flex flex-col items-center">
                              <span className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-sm font-black text-slate-500">
                                {item.CANTIDAD}
                              </span>
                              <span className={`text-[8px] font-black uppercase mt-1 ${isMissing ? 'text-red-500' : 'text-slate-400'}`}>
                                Almacén: {available}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-sm font-black text-slate-400">
                            ${item.PRECIO_UNIT.toLocaleString()}
                          </td>
                          <td className="px-8 py-6">
                            <div className="relative group">
                              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-purple-500" size={16} />
                              <input 
                                type="number" 
                                className="w-full pl-10 pr-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black text-purple-700 focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none bg-white transition-all shadow-inner"
                                value={item.PRECIO_PROYECTO || ''}
                                placeholder={item.PRECIO_UNIT.toString()}
                                onChange={(e) => handleUpdateProjectPrice(idx, parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                             <span className="text-sm font-black text-slate-900">${subtotalItem.toLocaleString()}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-center">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Presupuesto Original</p>
                   <p className="text-3xl font-black text-slate-400 tracking-tighter line-through decoration-2 decoration-slate-200">
                      ${selectedQuote.TOTAL.toLocaleString()}
                   </p>
                </div>
                
                <div className="lg:col-span-2 bg-purple-700 p-10 rounded-[3rem] shadow-2xl shadow-purple-900/20 text-white flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none" />
                   
                   <div className="relative z-10 text-center md:text-left">
                     <p className="text-[11px] font-black text-purple-200 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Sparkles size={16} /> Nueva Recotización Proyecto
                     </p>
                     <p className="text-6xl font-black tracking-tighter leading-none">
                       ${(selectedQuote.TOTAL_PROYECTO || selectedQuote.TOTAL).toLocaleString()}
                     </p>
                   </div>

                   <div className="mt-6 md:mt-0 relative z-10 bg-white/10 backdrop-blur-md px-8 py-5 rounded-[2rem] border border-white/20 text-center md:text-right">
                     <p className="text-[10px] font-black text-purple-100 uppercase tracking-widest mb-1">Impacto del Margen</p>
                     <p className="text-2xl font-black tracking-tight">{selectedQuote.IMPREVISTOS}% <span className="text-xs font-medium text-purple-300">Margen</span></p>
                   </div>
                </div>
              </div>
            </div>

            <div className="p-10 bg-white border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="flex items-center gap-4 text-slate-400 max-w-lg">
                 <div className={`p-3 rounded-2xl ${selectedQuote.ITEMS.some(i => (data.MATERIALES.find(m => m.CODIGO === i.CODIGO)?.EN_STOCK || 0) < i.CANTIDAD) ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                   {selectedQuote.ITEMS.some(i => (data.MATERIALES.find(m => m.CODIGO === i.CODIGO)?.EN_STOCK || 0) < i.CANTIDAD) ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
                 </div>
                 <p className="text-[10px] font-bold uppercase leading-relaxed tracking-wide">
                   {selectedQuote.ITEMS.some(i => (data.MATERIALES.find(m => m.CODIGO === i.CODIGO)?.EN_STOCK || 0) < i.CANTIDAD) 
                     ? "ATENCIÓN: Existen ítems con stock insuficiente para cumplir esta cotización. Verifique el detalle en rojo."
                     : "Todos los materiales de esta cotización se encuentran disponibles en almacén según el stock actual."}
                 </p>
               </div>
               
               <div className="flex items-center gap-4 w-full md:w-auto">
                 <button onClick={() => setSelectedQuote(null)} className="flex-1 md:flex-none px-8 py-4 text-slate-500 font-black uppercase text-xs hover:text-slate-800 transition-colors">Descartar</button>
                 <button onClick={handleSaveRevision} className="flex-1 md:flex-none px-12 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-sm tracking-[0.15em] shadow-2xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3">
                   <Save size={20} /> Confirmar Revisión
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
