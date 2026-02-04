
import React, { useState, useMemo } from 'react';
import { AppData, Material, Cotizacion, CotizacionItem } from '../types';
import { Search, Save, Package, DollarSign, ShoppingBag, X, Edit3, AlertCircle, FileText, ChevronRight, Calculator } from 'lucide-react';

interface ComprasManagerProps {
  data: AppData;
  onDataUpdate: (newMaterials: Material[], newQuotes?: Cotizacion[]) => void;
}

export const ComprasManager: React.FC<ComprasManagerProps> = ({ data, onDataUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'materiales' | 'cotizaciones'>('materiales');
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editStock, setEditStock] = useState<string>('');
  
  // Detailed Quote View state
  const [selectedQuote, setSelectedQuote] = useState<Cotizacion | null>(null);

  // Calculate demand from all active/draft quotations
  const materialDemand = useMemo(() => {
    const demand: Record<string, number> = {};
    data.COTIZACIONES.forEach(quote => {
      quote.ITEMS.forEach(item => {
        demand[item.CODIGO] = (demand[item.CODIGO] || 0) + item.CANTIDAD;
      });
    });
    return demand;
  }, [data.COTIZACIONES]);

  const filteredMaterials = useMemo(() => {
    return data.MATERIALES.filter(m => 
      m.CODIGO.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.DESCRIPCION.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data.MATERIALES, searchTerm]);

  const handleEditMaterial = (m: Material) => {
    setEditingMaterial(m);
    setEditPrice(m.PRECIO_UN.toString());
    setEditStock(m.EN_STOCK.toString());
  };

  const handleSaveMaterial = () => {
    if (!editingMaterial) return;
    
    // Update global materials
    const updatedMaterials = data.MATERIALES.map(m => 
      m.CODIGO === editingMaterial.CODIGO ? {
        ...m,
        PRECIO_UN: parseFloat(editPrice) || 0,
        EN_STOCK: parseInt(editStock) || 0
      } : m
    );

    // CRITICAL: We NO LONGER update updatedQuotes here automatically.
    // Quotations keep their original price until manually updated in Automation/Project.
    
    onDataUpdate(updatedMaterials);
    setEditingMaterial(null);
  };

  const handleUpdateQuoteItemPrice = (itemIndex: number, newPrice: number) => {
    if (!selectedQuote) return;
    
    const newItems = [...selectedQuote.ITEMS];
    const item = { ...newItems[itemIndex], PRECIO_UNIT: newPrice, SUBTOTAL: newItems[itemIndex].CANTIDAD * newPrice };
    newItems[itemIndex] = item;

    const subtotalNeto = newItems.reduce((sum, i) => sum + i.SUBTOTAL, 0);
    const total = subtotalNeto * (1 + selectedQuote.IMPREVISTOS / 100);
    
    const updatedQuote = { ...selectedQuote, ITEMS: newItems, SUBTOTAL_NETO: subtotalNeto, TOTAL: total };
    setSelectedQuote(updatedQuote);
  };

  const handleSaveQuoteChanges = () => {
    if (!selectedQuote) return;

    // 1. Update this quote in the master list
    const updatedQuotes = data.COTIZACIONES.map(q => q.ID === selectedQuote.ID ? selectedQuote : q);

    // 2. Sync updated item prices back to the Material database (Compras is allowed to sync back to DB)
    const updatedMaterials = [...data.MATERIALES];
    selectedQuote.ITEMS.forEach(item => {
      const matIdx = updatedMaterials.findIndex(m => m.CODIGO === item.CODIGO);
      if (matIdx >= 0) {
        updatedMaterials[matIdx] = { ...updatedMaterials[matIdx], PRECIO_UN: item.PRECIO_UNIT };
      }
    });

    onDataUpdate(updatedMaterials, updatedQuotes);
    setSelectedQuote(null);
  };

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-fit">
        <button 
          onClick={() => setViewMode('materiales')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'materiales' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Package size={16} /> Stock y Precios
        </button>
        <button 
          onClick={() => setViewMode('cotizaciones')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'cotizaciones' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <FileText size={16} /> Ver Cotizaciones
        </button>
      </div>

      {viewMode === 'materiales' ? (
        <>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar material por código o nombre..." 
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Almacén</span>
              <span className="text-lg font-black text-slate-800">${data.MATERIALES.reduce((s, m) => s + (m.PRECIO_UN * m.EN_STOCK), 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-5">Material</th>
                  <th className="px-8 py-5">Stock / Demanda</th>
                  <th className="px-8 py-5">Precio Unit. (Base)</th>
                  <th className="px-8 py-5">Valor</th>
                  <th className="px-8 py-5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map(m => {
                  const demand = materialDemand[m.CODIGO] || 0;
                  return (
                    <tr key={m.CODIGO} className="hover:bg-slate-50/50">
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-blue-500 font-mono">{m.CODIGO}</span>
                          <span className="text-sm font-bold text-slate-700">{m.DESCRIPCION}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-black ${m.EN_STOCK < demand ? 'text-red-500' : 'text-slate-800'}`}>{m.EN_STOCK}</span>
                          {demand > 0 && <span className="text-[10px] font-black text-slate-300 uppercase">En Cotizaciones: {demand}</span>}
                          {m.EN_STOCK < demand && <AlertCircle size={14} className="text-red-400" />}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm font-black text-slate-600">${m.PRECIO_UN.toLocaleString()}</td>
                      <td className="px-8 py-5 text-sm font-black text-slate-900">${(m.PRECIO_UN * m.EN_STOCK).toLocaleString()}</td>
                      <td className="px-8 py-5 text-right">
                        <button onClick={() => handleEditMaterial(m)} className="p-2 text-slate-300 hover:text-blue-600 transition" title="Editar Stock/Precio"><Edit3 size={18} /></button>
                      </td>
                    </tr>
                  );
                })}
                {filteredMaterials.length === 0 && (
                  <tr><td colSpan={5} className="px-8 py-10 text-center text-slate-400 italic">No se encontraron materiales.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {data.COTIZACIONES.map(q => (
            <div key={q.ID} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group cursor-pointer" onClick={() => setSelectedQuote(q)}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-slate-800 uppercase text-xs tracking-tight">{q.ID}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{q.FECHA}</p>
                </div>
                <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase">{q.ITEMS.length} Items</span>
              </div>
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold">Cliente:</span>
                  <span className="text-slate-700 font-black truncate max-w-[150px]">{q.CLIENTE}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold">OT:</span>
                  <span className="text-blue-500 font-black">{q.OT}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                <span className="text-xl font-black text-slate-900">${q.TOTAL.toLocaleString()}</span>
                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1 group-hover:text-blue-500 transition-colors">
                  Ajustar Precios <ChevronRight size={12} />
                </div>
              </div>
            </div>
          ))}
          {data.COTIZACIONES.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold italic">
              No hay cotizaciones para visualizar.
            </div>
          )}
        </div>
      )}

      {/* Edit Material Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
              <h3 className="font-black text-blue-900 uppercase text-sm tracking-tight">Actualizar Stock y Precio (Base)</h3>
              <button onClick={() => setEditingMaterial(null)}><X size={20} className="text-blue-400" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{editingMaterial.CODIGO}</p>
                <p className="text-sm font-bold text-slate-700">{editingMaterial.DESCRIPCION}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Precio Unitario</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-3.5 text-slate-300" />
                    <input type="number" className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-slate-700 bg-white" value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock Actual</label>
                  <div className="relative">
                    <Package size={16} className="absolute left-3 top-3.5 text-slate-300" />
                    <input type="number" className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-black text-slate-700 bg-white" value={editStock} onChange={e => setEditStock(e.target.value)} />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">Nota: El cambio de precio base solo afectará a nuevas cotizaciones o a las que se sincronicen manualmente.</p>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button onClick={() => setEditingMaterial(null)} className="flex-1 font-bold text-slate-400 py-3">Cancelar</button>
              <button onClick={handleSaveMaterial} className="flex-1 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest py-3 shadow-lg shadow-blue-200 active:scale-95 transition-all">Actualizar Material</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Quote Details / Sync Prices Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[85vh]">
            <div className="p-8 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600">
                  <Calculator size={24} />
                </div>
                <div>
                  <h3 className="font-black text-blue-900 uppercase text-lg tracking-tight">Actualizar Precios en Cotización</h3>
                  <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">{selectedQuote.ID} • {selectedQuote.CLIENTE} • {selectedQuote.OT}</p>
                </div>
              </div>
              <button onClick={() => setSelectedQuote(null)} className="p-2 text-blue-400 hover:bg-blue-100 rounded-full transition"><X size={28} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-white">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Ref.</th>
                      <th className="px-6 py-4">Descripción</th>
                      <th className="px-6 py-4 w-20">Cant.</th>
                      <th className="px-6 py-4 w-48">Precio Unitario ($)</th>
                      <th className="px-6 py-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedQuote.ITEMS.map((item, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                        <td className="px-6 py-5 font-mono text-xs font-bold text-blue-500">{item.CODIGO}</td>
                        <td className="px-6 py-5 text-sm font-bold text-slate-700">{item.DESCRIPCION}</td>
                        <td className="px-6 py-5 text-sm font-black text-slate-400">{item.CANTIDAD}</td>
                        <td className="px-6 py-5">
                          <div className="relative group">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500" size={14} />
                            <input 
                              type="number" 
                              className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-black text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                              value={item.PRECIO_UNIT}
                              onChange={(e) => handleUpdateQuoteItemPrice(idx, parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right font-black text-slate-800 text-sm">
                          ${item.SUBTOTAL.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary in Detail View */}
              <div className="mt-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                 <div className="flex gap-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal Neto</span>
                      <span className="text-xl font-bold text-slate-700">${selectedQuote.SUBTOTAL_NETO.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margen ({selectedQuote.IMPREVISTOS}%)</span>
                      <span className="text-xl font-bold text-orange-600">+${(selectedQuote.TOTAL - selectedQuote.SUBTOTAL_NETO).toLocaleString()}</span>
                    </div>
                 </div>
                 <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Actualizado</span>
                    <p className="text-4xl font-black text-slate-900 leading-none">${selectedQuote.TOTAL.toLocaleString()}</p>
                 </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-4">
               <div className="flex items-center gap-2 text-blue-500 bg-blue-50 px-4 py-2 rounded-xl mr-auto">
                 <AlertCircle size={16} />
                 <span className="text-[10px] font-black uppercase tracking-tight">Actualizar aquí sincronizará los precios con la Base de Datos de Materiales</span>
               </div>
               <button 
                 onClick={() => setSelectedQuote(null)} 
                 className="px-6 py-3 text-slate-400 font-bold hover:text-slate-600 transition"
               >
                 Descartar Cambios
               </button>
               <button 
                 onClick={handleSaveQuoteChanges}
                 className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
               >
                 <Save size={20} />
                 Sincronizar Todo
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
