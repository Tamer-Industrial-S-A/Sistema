
import React, { useState, useMemo } from 'react';
import { Material, Cliente, QuoteItem } from '../types';

interface AutomationViewProps {
  materials: Material[];
  clientes: Cliente[];
}

const AutomationView: React.FC<AutomationViewProps> = ({ materials, clientes }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => 
      m.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.marca.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materials, searchTerm]);

  const addToQuote = (material: Material) => {
    setQuoteItems(prev => {
      const existing = prev.find(item => item.materialId === material.id);
      if (existing) {
        return prev.map(item => 
          item.materialId === material.id 
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { materialId: material.id, cantidad: 1, precioUnitario: material.valor }];
    });
  };

  const updateQuantity = (materialId: string, delta: number) => {
    setQuoteItems(prev => prev.map(item => {
      if (item.materialId === materialId) {
        const newQty = Math.max(1, item.cantidad + delta);
        return { ...item, cantidad: newQty };
      }
      return item;
    }));
  };

  const removeFromQuote = (materialId: string) => {
    setQuoteItems(prev => prev.filter(item => item.materialId !== materialId));
  };

  const total = useMemo(() => {
    return quoteItems.reduce((acc, item) => acc + (item.cantidad * item.precioUnitario), 0);
  }, [quoteItems]);

  const selectedClientData = useMemo(() => {
    return clientes.find(c => c.id === selectedCliente);
  }, [clientes, selectedCliente]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Material Selection */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
             <i className="fa-solid fa-magnifying-glass text-indigo-500"></i>
             Catálogo de Materiales
          </h3>
          <div className="relative mb-6">
            <input 
              type="text"
              placeholder="Buscar por descripción, marca o código..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Código / Marca</th>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3">Valor (USD)</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map(m => (
                  <tr key={m.id} className="hover:bg-indigo-50/50 transition cursor-default group">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{m.codigo}</p>
                      <p className="text-xs text-indigo-500 font-semibold">{m.marca}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-medium">{m.descripcion}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700">${m.valor.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => addToQuote(m)}
                        className="bg-slate-100 text-indigo-600 p-2 rounded-lg hover:bg-indigo-600 hover:text-white transition"
                      >
                        <i className="fa-solid fa-plus"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Right Column: Quote Summary */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <section className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 sticky top-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
               <i className="fa-solid fa-file-invoice-dollar text-indigo-500"></i>
               Presupuesto Actual
            </h3>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded uppercase">En Proceso</span>
          </div>

          {/* Client Selection */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cliente Destino</label>
            <select 
              value={selectedCliente}
              onChange={(e) => setSelectedCliente(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium"
            >
              <option value="">Seleccionar Cliente de Tabla...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.empresa} - {c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Quote Items List */}
          <div className="min-h-[200px] mb-6 space-y-3 overflow-y-auto max-h-[400px] pr-2">
            {quoteItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-300 border-2 border-dashed border-slate-100 rounded-xl">
                <i className="fa-solid fa-cart-shopping text-3xl mb-2"></i>
                <p>No hay materiales seleccionados</p>
              </div>
            ) : (
              quoteItems.map(item => {
                const mat = materials.find(m => m.id === item.materialId);
                if (!mat) return null;
                return (
                  <div key={item.materialId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 line-clamp-1">{mat.descripcion}</p>
                      <p className="text-xs text-slate-500">{mat.marca} | ${mat.valor}/u</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.materialId, -1)} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">-</button>
                      <span className="w-6 text-center font-mono font-bold">{item.cantidad}</span>
                      <button onClick={() => updateQuantity(item.materialId, 1)} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">+</button>
                    </div>
                    <div className="w-20 text-right font-mono font-bold text-slate-700">
                      ${(item.cantidad * item.precioUnitario).toLocaleString()}
                    </div>
                    <button onClick={() => removeFromQuote(item.materialId)} className="text-slate-300 hover:text-red-500 transition">
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Total and Actions */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="flex justify-between items-center px-2">
              <span className="text-slate-500 font-medium">Subtotal Estimado</span>
              <span className="font-mono font-bold text-slate-700">${total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center px-2">
              <span className="text-slate-500 font-medium">Impuestos (IVA 21%)</span>
              <span className="font-mono font-bold text-slate-700">${(total * 0.21).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
              <span className="text-lg font-bold">TOTAL FINAL</span>
              <span className="text-2xl font-black font-mono">${(total * 1.21).toLocaleString()}</span>
            </div>

            <button 
              disabled={quoteItems.length === 0 || !selectedCliente}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-md ${
                quoteItems.length > 0 && selectedCliente 
                ? 'bg-slate-900 text-white hover:bg-black active:scale-[0.98]' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <i className="fa-solid fa-file-pdf"></i>
              Generar Cotización PDF
            </button>
            <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest font-bold italic">
              * Datos obtenidos en tiempo real de Tablas Access
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AutomationView;
