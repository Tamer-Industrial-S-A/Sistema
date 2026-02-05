
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppData, Cotizacion, CotizacionItem, OrdTrabajo, Material, OrdFabricacion, Cliente } from '../types';
import { Plus, Trash2, Edit3, Save, Search, X, Calculator, ShoppingCart, Percent, Sparkles, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CotizacionesManagerProps {
  data: AppData;
  onDataUpdate: (newData: Cotizacion[]) => void;
}

export const CotizacionesManager: React.FC<CotizacionesManagerProps> = ({ data, onDataUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingQuote, setEditingQuote] = useState<Partial<Cotizacion> | null>(null);

  // Filters for selections
  const [otFilter, setOtFilter] = useState('');
  const [matFilter, setMatFilter] = useState('');
  const [isMatDropdownOpen, setIsMatDropdownOpen] = useState(false);
  const [isOtDropdownOpen, setIsOtDropdownOpen] = useState(false);
  
  const matDropdownRef = useRef<HTMLDivElement>(null);
  const otDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (matDropdownRef.current && !matDropdownRef.current.contains(event.target as Node)) setIsMatDropdownOpen(false);
      if (otDropdownRef.current && !otDropdownRef.current.contains(event.target as Node)) setIsOtDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStockStatus = (items: CotizacionItem[]) => {
    const missing: string[] = [];
    items.forEach(item => {
      const mat = data.MATERIALES.find(m => m.CODIGO === item.CODIGO);
      const available = mat ? mat.EN_STOCK : 0;
      if (item.CANTIDAD > available) {
        missing.push(item.DESCRIPCION);
      }
    });
    return { allOk: missing.length === 0, missing };
  };

  const filteredQuotes = useMemo(() => {
    return data.COTIZACIONES.filter(q => 
      q.ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.CLIENTE.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.OT.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data.COTIZACIONES, searchTerm]);

  const filteredOTs = useMemo(() => {
    const search = otFilter.toLowerCase();
    return data.ORD_TRABAJOS.filter(ot => 
      ot.OT.toLowerCase().includes(search) || 
      ot.DESCRIPCION_OT.toLowerCase().includes(search)
    );
  }, [data.ORD_TRABAJOS, otFilter]);

  const filteredMaterials = useMemo(() => {
    const search = matFilter.toLowerCase();
    return data.MATERIALES.filter(m => 
      m.CODIGO.toLowerCase().includes(search) || 
      m.DESCRIPCION.toLowerCase().includes(search)
    );
  }, [data.MATERIALES, matFilter]);

  const calculateTotals = (items: CotizacionItem[], imprevistos: number) => {
    const subtotalNeto = items.reduce((sum, item) => sum + (item.SUBTOTAL || 0), 0);
    // Fix: Explicitly ensure imprevistos is treated as a number in arithmetic operation
    const total = subtotalNeto * (1 + (Number(imprevistos) || 0) / 100);

    const subtotalProyecto = items.reduce((sum, item) => {
      const p = item.PRECIO_PROYECTO !== undefined ? item.PRECIO_PROYECTO : item.PRECIO_UNIT;
      return sum + (p * item.CANTIDAD);
    }, 0);
    // Fix: Explicitly ensure imprevistos is treated as a number in arithmetic operation
    const totalProyecto = subtotalProyecto * (1 + (Number(imprevistos) || 0) / 100);

    return { subtotalNeto, total, totalProyecto };
  };

  const handleStartNew = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const datePrefix = `COT-${day}-${month}-${year}-`;

    const quotesToday = data.COTIZACIONES.filter(q => q.ID.startsWith(datePrefix));
    let nextNum = 1;
    if (quotesToday.length > 0) {
      const nums = quotesToday.map(q => {
        const parts = q.ID.split('-');
        const lastPart = parts[parts.length - 1];
        return parseInt(lastPart, 10) || 0;
      });
      nextNum = Math.max(...nums) + 1;
    }
    
    const newId = `${datePrefix}${String(nextNum).padStart(3, '0')}`;

    setEditingQuote({
      ID: newId,
      FECHA: now.toISOString().split('T')[0],
      OT: '',
      OF: '',
      CLIENTE: '',
      ITEMS: [],
      SUBTOTAL_NETO: 0,
      IMPREVISTOS: 0,
      TOTAL: 0,
      ESTADO: 'Borrador'
    });
    setOtFilter('');
    setMatFilter('');
  };

  const handleEditExisting = (quote: Cotizacion) => {
    setEditingQuote({ ...quote });
    setOtFilter(quote.OT);
  };

  const handleDeleteQuote = (id: string) => {
    if (confirm('¿Confirma la eliminación de esta cotización? Esta acción no se puede deshacer.')) {
      const newList = data.COTIZACIONES.filter(q => q.ID !== id);
      onDataUpdate(newList);
    }
  };

  const handleSyncWithDB = () => {
    if (!editingQuote || !editingQuote.ITEMS) return;
    const matPrices = new Map(data.MATERIALES.map(m => [m.CODIGO, m.PRECIO_UN]));
    const updatedItems = editingQuote.ITEMS.map(item => {
      const dbPrice = matPrices.get(item.CODIGO);
      if (dbPrice !== undefined) {
        return {
          ...item,
          PRECIO_UNIT: dbPrice,
          SUBTOTAL: item.CANTIDAD * dbPrice
        };
      }
      return item;
    });
    // Fix: Ensure imprevistos value is retrieved correctly for calculation
    const currentImprevistos = editingQuote.IMPREVISTOS || 0;
    const { subtotalNeto, total, totalProyecto } = calculateTotals(updatedItems, currentImprevistos);
    setEditingQuote(prev => ({ 
      ...prev, 
      ITEMS: updatedItems, 
      SUBTOTAL_NETO: subtotalNeto, 
      TOTAL: total,
      TOTAL_PROYECTO: prev?.ESTADO === 'Modificada por Proyecto' ? totalProyecto : undefined
    }));
  };

  const handleOTSelect = (ot: OrdTrabajo) => {
    const of = data.ORD_FABRICACIONES.find(f => f.OF === ot.OFABRICACION);
    const cliente = of ? data.CLIENTES.find(c => c.COD_CLIENTE === of.COD_CLIENTE) : null;
    setEditingQuote(prev => ({
      ...prev,
      OT: ot.OT,
      OF: ot.OFABRICACION,
      CLIENTE: cliente ? cliente.RAZON_SOCIAL : 'Cliente no encontrado'
    }));
    setOtFilter(ot.OT);
    setIsOtDropdownOpen(false);
  };

  const updateImprevistos = (value: number) => {
    if (!editingQuote) return;
    const items = editingQuote.ITEMS || [];
    const { subtotalNeto, total, totalProyecto } = calculateTotals(items, value);
    setEditingQuote(prev => ({ 
      ...prev, 
      IMPREVISTOS: value, 
      SUBTOTAL_NETO: subtotalNeto, 
      TOTAL: total,
      TOTAL_PROYECTO: prev?.ESTADO === 'Modificada por Proyecto' ? totalProyecto : undefined
    }));
  };

  const addItem = (material: Material) => {
    if (!editingQuote) return;
    const items = editingQuote.ITEMS || [];
    const existingIdx = items.findIndex(i => i.CODIGO === material.CODIGO);
    let newItems = [...items];
    if (existingIdx >= 0) {
      const item = { ...newItems[existingIdx] };
      item.CANTIDAD += 1;
      item.SUBTOTAL = item.CANTIDAD * item.PRECIO_UNIT;
      newItems[existingIdx] = item;
    } else {
      newItems.push({
        CODIGO: material.CODIGO,
        DESCRIPCION: material.DESCRIPCION,
        CANTIDAD: 1,
        PRECIO_UNIT: material.PRECIO_UN,
        SUBTOTAL: material.PRECIO_UN
      });
    }
    const { subtotalNeto, total, totalProyecto } = calculateTotals(newItems, editingQuote.IMPREVISTOS || 0);
    setEditingQuote(prev => ({ 
      ...prev, 
      ITEMS: newItems, 
      SUBTOTAL_NETO: subtotalNeto, 
      TOTAL: total,
      TOTAL_PROYECTO: prev?.ESTADO === 'Modificada por Proyecto' ? totalProyecto : undefined
    }));
    setIsMatDropdownOpen(false);
  };

  const updateItemQty = (index: number, qty: number) => {
    if (!editingQuote || !editingQuote.ITEMS) return;
    const newItems = [...editingQuote.ITEMS];
    const item = { ...newItems[index] };
    item.CANTIDAD = Math.max(0, qty);
    item.SUBTOTAL = item.CANTIDAD * item.PRECIO_UNIT;
    newItems[index] = item;
    const { subtotalNeto, total, totalProyecto } = calculateTotals(newItems, editingQuote.IMPREVISTOS || 0);
    setEditingQuote(prev => ({ 
      ...prev, 
      ITEMS: newItems, 
      SUBTOTAL_NETO: subtotalNeto, 
      TOTAL: total,
      TOTAL_PROYECTO: prev?.ESTADO === 'Modificada por Proyecto' ? totalProyecto : undefined
    }));
  };

  const removeItem = (index: number) => {
    if (!editingQuote || !editingQuote.ITEMS) return;
    const newItems = [...editingQuote.ITEMS];
    newItems.splice(index, 1);
    const { subtotalNeto, total, totalProyecto } = calculateTotals(newItems, editingQuote.IMPREVISTOS || 0);
    setEditingQuote(prev => ({ 
      ...prev, 
      ITEMS: newItems, 
      SUBTOTAL_NETO: subtotalNeto, 
      TOTAL: total,
      TOTAL_PROYECTO: prev?.ESTADO === 'Modificada por Proyecto' ? totalProyecto : undefined
    }));
  };

  const saveQuote = () => {
    if (!editingQuote?.OT || (editingQuote.ITEMS?.length || 0) === 0) {
      alert("Error: Complete la OT y añada materiales para guardar.");
      return;
    }
    const newList = [...data.COTIZACIONES];
    const index = newList.findIndex(q => q.ID === editingQuote.ID);
    if (index >= 0) {
      newList[index] = editingQuote as Cotizacion;
    } else {
      newList.push(editingQuote as Cotizacion);
    }
    onDataUpdate(newList);
    setEditingQuote(null);
  };

  return (
    <div className="space-y-6">
      {editingQuote === null ? (
        <>
          <div className="flex justify-between items-center gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por ID, Cliente u OT..." 
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={handleStartNew}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95"
            >
              <Plus size={20} />
              Nueva Cotización
            </button>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-5">Identificador</th>
                  <th className="px-8 py-5">Cliente / OT</th>
                  <th className="px-8 py-5">Suministro</th>
                  <th className="px-8 py-5">Monto Total</th>
                  <th className="px-8 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.map(q => {
                  const stock = getStockStatus(q.ITEMS);
                  return (
                    <tr key={q.ID} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-blue-600 font-mono">{q.ID}</span>
                          {q.ESTADO === 'Modificada por Proyecto' && (
                            <span title="Revisada por Proyecto">
                              <Sparkles size={14} className="text-purple-500" />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{q.FECHA}</p>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-slate-800 truncate max-w-[200px]">{q.CLIENTE}</p>
                        <p className="text-[10px] text-slate-500 font-bold">OT: {q.OT}</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${stock.allOk ? 'text-green-500' : 'text-red-500'}`}>
                          {stock.allOk ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                          {stock.allOk ? 'Stock OK' : 'Faltante'}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-sm font-black ${q.TOTAL_PROYECTO ? 'text-purple-700' : 'text-slate-900'}`}>
                          ${(q.TOTAL_PROYECTO || q.TOTAL).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleEditExisting(q)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Editar">
                            <Edit3 size={18} />
                          </button>
                          <button onClick={() => handleDeleteQuote(q.ID)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Eliminar">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-blue-50 p-8 border-b border-blue-100 flex justify-between items-center">
            <div className="flex items-center gap-5">
              <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-blue-100 text-blue-600">
                <Calculator size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-blue-900 tracking-tight uppercase">Editor de Cotización</h2>
                <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mt-1">{editingQuote.ID} • {editingQuote.FECHA}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleSyncWithDB}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-md"
              >
                <RefreshCw size={14} /> Sincronizar con DB
              </button>
              <button onClick={() => setEditingQuote(null)} className="p-2 text-blue-400 hover:bg-blue-100 rounded-full transition-all">
                <X size={32} />
              </button>
            </div>
          </div>

          <div className="p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-8">
                <div className="relative" ref={otDropdownRef}>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Selección de OT</label>
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar OT..."
                      className="w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50:border-blue-500 bg-white text-slate-700 font-black transition-all"
                      value={otFilter}
                      onFocus={() => setIsOtDropdownOpen(true)}
                      onChange={(e) => {
                        setOtFilter(e.target.value);
                        setIsOtDropdownOpen(true);
                      }}
                    />
                  </div>
                  {isOtDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-3 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl divide-y divide-slate-50">
                      {filteredOTs.map(ot => (
                        <button 
                          key={ot.OT} 
                          onClick={() => handleOTSelect(ot)}
                          className="w-full text-left px-5 py-4 hover:bg-blue-50 transition-colors flex flex-col gap-1"
                        >
                          <span className="text-sm font-black text-slate-700">{ot.OT}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate">{ot.DESCRIPCION_OT}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente Vinculado</span>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 font-black text-sm text-blue-700 truncate">
                      {editingQuote.CLIENTE || 'Pendiente...'}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Percent size={14} className="text-orange-500" />
                    Margen de Ganancia
                  </label>
                  <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border-2 border-slate-100 focus-within:border-orange-200 transition-all shadow-inner">
                    <input 
                      type="number" min="0" max="100"
                      className="w-full text-lg font-black text-orange-600 outline-none bg-white"
                      value={editingQuote.IMPREVISTOS}
                      onChange={(e) => updateImprevistos(parseInt(e.target.value) || 0)}
                    />
                    <span className="text-orange-500 font-black text-xl">%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative" ref={matDropdownRef}>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Catálogo de Materiales</label>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Filtrar materiales..." 
                    className="w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50:border-blue-500 bg-white text-slate-700 font-black transition-all"
                    value={matFilter}
                    onFocus={() => setIsMatDropdownOpen(true)}
                    onChange={(e) => {
                      setMatFilter(e.target.value);
                      setIsMatDropdownOpen(true);
                    }}
                  />
                  {isMatDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-3 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl divide-y divide-slate-50">
                      {filteredMaterials.map(m => (
                        <button key={m.CODIGO} onClick={() => addItem(m)} className="w-full text-left px-5 py-4 hover:bg-blue-50 transition-colors flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-blue-500 mb-0.5 tracking-wider truncate uppercase">{m.CODIGO}</p>
                            <p className="text-sm font-bold text-slate-700 truncate">{m.DESCRIPCION}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase">Stock: {m.EN_STOCK}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-black text-slate-800">${m.PRECIO_UN.toLocaleString()}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 flex flex-col gap-10">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="px-10 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest flex items-center gap-3">
                    <ShoppingCart size={20} className="text-blue-500" />
                    Items en Cotización
                  </h3>
                  {(() => {
                    const stock = getStockStatus(editingQuote.ITEMS || []);
                    return (
                      <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${stock.allOk ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                        {stock.allOk ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {stock.allOk ? 'Todo en Stock' : 'Faltante Detectado'}
                      </div>
                    );
                  })()}
                </div>
                
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white sticky top-0 z-10 border-b border-slate-100">
                      <tr className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        <th className="px-10 py-5">Item / Disponibilidad</th>
                        <th className="px-10 py-5 w-40">Cantidad</th>
                        <th className="px-10 py-5 text-right">Subtotal</th>
                        <th className="px-10 py-5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {editingQuote.ITEMS?.map((item, idx) => {
                        const mat = data.MATERIALES.find(m => m.CODIGO === item.CODIGO);
                        const available = mat ? mat.EN_STOCK : 0;
                        const isMissing = item.CANTIDAD > available;

                        return (
                          <tr key={idx} className={`hover:bg-blue-50/10 transition-colors ${isMissing ? 'bg-red-50/30' : ''}`}>
                            <td className="px-10 py-6">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-blue-500 font-mono mb-1">{item.CODIGO}</span>
                                <span className="text-sm font-bold text-slate-800 leading-tight">{item.DESCRIPCION}</span>
                                <span className={`text-[9px] font-black uppercase mt-1 ${isMissing ? 'text-red-600' : 'text-slate-400'}`}>
                                  {isMissing ? `STOCK INSUFICIENTE (DISPONIBLE: ${available})` : `EN ALMACÉN: ${available}`}
                                </span>
                              </div>
                            </td>
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-3 bg-white p-1 rounded-[1rem] w-fit border-2 border-slate-100 shadow-sm">
                                <button onClick={() => updateItemQty(idx, item.CANTIDAD - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-lg text-slate-500 hover:text-blue-600">-</button>
                                <input 
                                  type="number" className="w-12 text-center text-sm font-black outline-none border-none bg-white text-slate-800" 
                                  value={item.CANTIDAD} onChange={(e) => updateItemQty(idx, parseInt(e.target.value) || 0)}
                                />
                                <button onClick={() => updateItemQty(idx, item.CANTIDAD + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-lg text-slate-500 hover:text-blue-600">+</button>
                              </div>
                            </td>
                            <td className="px-10 py-6 text-right">
                              <span className="text-sm font-black text-slate-900">${item.SUBTOTAL.toLocaleString()}</span>
                            </td>
                            <td className="px-10 py-6 text-right">
                              <button onClick={() => removeItem(idx)} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-10 bg-slate-900 rounded-[3rem] shadow-2xl text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-blue-600/10 pointer-events-none" />
                
                <div className="relative z-10 border-r border-white/10 md:pr-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Suma Base (Neto)</p>
                  <p className="text-2xl font-bold tracking-tight">${(editingQuote.SUBTOTAL_NETO || 0).toLocaleString()}</p>
                </div>
                
                <div className="relative z-10 border-r border-white/10 md:pr-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Impuesto / Margen (+{editingQuote.IMPREVISTOS}%)</p>
                  <p className="text-2xl font-bold text-orange-400 tracking-tight">+${( (editingQuote.TOTAL || 0) - (editingQuote.SUBTOTAL_NETO || 0) ).toLocaleString()}</p>
                </div>
                
                <div className="relative z-10 flex flex-col md:items-end">
                  <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Monto Total</p>
                  <p className="text-5xl font-black text-white leading-none tracking-tighter">
                    ${(editingQuote.TOTAL_PROYECTO && editingQuote.ESTADO === 'Modificada por Proyecto' ? editingQuote.TOTAL_PROYECTO : (editingQuote.TOTAL || 0)).toLocaleString()}
                  </p>
                  <button 
                    onClick={saveQuote}
                    className="mt-8 w-full md:w-auto px-10 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-[0.15em] hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Save size={20} />
                    {data.COTIZACIONES.some(q => q.ID === editingQuote.ID) ? 'Actualizar Datos' : 'Registrar Cotización'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
