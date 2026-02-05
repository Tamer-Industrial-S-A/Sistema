
import React, { useState, useMemo } from 'react';
import { COLUMNS } from '../constants';
import { ExcelHandler } from './ExcelHandler';
import { Plus, Trash2, Edit3, Search, Filter, X } from 'lucide-react';

interface TableManagerProps {
  sector: string;
  data: any[];
  onDataUpdate: (data: any[]) => void;
}

const ITEMS_PER_PAGE = 20;

export const TableManager: React.FC<TableManagerProps> = ({ sector, data, onDataUpdate }) => {
  const [globalSearch, setGlobalSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const columns = COLUMNS[sector] || [];

  const getItemId = (item: any) => {
    return item.CODIGO || item.COD_CLIENTE || item.OF || item.OT || item.ID || JSON.stringify(item);
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      // Fix: Use any cast to ensure Object.values and val can have .toLowerCase() safely via String()
      const matchesGlobal = (Object.values(item || {}) as any[]).some(val => 
        String(val).toLowerCase().includes(globalSearch.toLowerCase())
      );
      if (!matchesGlobal) return false;

      // Fix: Cast filterValue to string to prevent "toLowerCase on unknown" errors
      return Object.entries(columnFilters).every(([key, filterValue]) => {
        if (!filterValue) return true;
        const itemValue = (item as any)[key];
        return String(itemValue || '').toLowerCase().includes(String(filterValue).toLowerCase());
      });
    });
  }, [data, globalSearch, columnFilters]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const handleEdit = (item: any) => {
    const originalIndex = data.indexOf(item);
    setEditingIndex(originalIndex);
    setEditFormData({ ...item });
  };

  const handleDelete = (item: any) => {
    if (confirm('¿Está seguro de que desea eliminar permanentemente este registro del sistema?')) {
      const originalIndex = data.indexOf(item);
      if (originalIndex !== -1) {
        const newData = [...data];
        newData.splice(originalIndex, 1);
        onDataUpdate(newData);
      }
    }
  };

  const handleSaveEdit = () => {
    const newData = [...data];
    const processedData = { ...editFormData };
    if (sector === 'MATERIALES') {
      processedData.PRECIO_UN = parseFloat(String(processedData.PRECIO_UN)) || 0;
      processedData.EN_STOCK = parseInt(String(processedData.EN_STOCK)) || 0;
    }

    if (editingIndex !== null && editingIndex !== -1) {
      newData[editingIndex] = processedData;
    } else {
      newData.push(processedData);
    }
    onDataUpdate(newData);
    setEditFormData(null);
    setEditingIndex(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={`Filtrar ${sector.toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm font-black"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowColumnFilters(!showColumnFilters)}
            className={`p-3 rounded-xl border transition-all ${showColumnFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
            title="Filtros por columna"
          >
            <Filter size={20} />
          </button>
          
          <div className="px-5 py-2.5 bg-slate-900 text-white rounded-xl border border-slate-800 text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-xl">
            Registros: {data.length}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ExcelHandler 
            data={data} 
            onImport={onDataUpdate} 
            sectorName={sector}
          />
          <button 
            onClick={() => setEditFormData(columns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), {}))}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200"
          >
            <Plus size={20} />
            Nuevo Registro
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map(col => (
                  <th key={col.key} className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {col.label}
                      </span>
                      {showColumnFilters && (
                        <input 
                          type="text"
                          className="text-[10px] px-2 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 bg-white text-slate-700 font-bold"
                          value={columnFilters[col.key] || ''}
                          onChange={(e) => setColumnFilters(p => ({ ...p, [col.key]: e.target.value }))}
                        />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((item, idx) => (
                <tr key={getItemId(item) + idx} className="hover:bg-slate-50 transition-colors group">
                  {columns.map(col => (
                    <td key={col.key} className={`px-6 py-4 text-sm font-bold ${col.key === 'CODIGO' || col.key === 'OF' || col.key === 'OT' ? 'text-blue-600 font-mono' : 'text-slate-700'}`}>
                      {col.key === 'PRECIO_UN' ? `$${(item[col.key] || 0).toLocaleString()}` : item[col.key]}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 transition" title="Editar"><Edit3 size={18} /></button>
                      <button onClick={() => handleDelete(item)} className="p-2 text-slate-400 hover:text-red-500 transition" title="Eliminar"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-6 py-20 text-center text-slate-400 font-bold italic uppercase text-xs tracking-widest">
                    No se encontraron registros coincidentes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editFormData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight">Gestión de {sector}</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Editor de Registro Individual</p>
              </div>
              <button onClick={() => setEditFormData(null)} className="p-2 hover:bg-slate-200 rounded-full transition"><X className="text-slate-400" size={24} /></button>
            </div>
            <div className="p-8 grid grid-cols-1 gap-5 max-h-[60vh] overflow-y-auto">
              {columns.map(col => (
                <div key={col.key}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{col.label}</label>
                  <input 
                    type={col.key === 'PRECIO_UN' || col.key === 'EN_STOCK' ? 'number' : 'text'}
                    className="w-full px-5 py-3 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-50:focus:border-blue-500 font-black text-slate-700 bg-white transition-all"
                    value={editFormData[col.key] || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, [col.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div className="p-8 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => setEditFormData(null)} className="px-6 py-3 text-slate-400 font-black uppercase text-xs">Cancelar</button>
              <button onClick={handleSaveEdit} className="px-10 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Guardar Datos</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
