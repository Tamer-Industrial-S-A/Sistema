
import React, { useState } from 'react';
import { Upload, FileDown, Loader2, AlertTriangle } from 'lucide-react';

interface ExcelHandlerProps {
  data: any[];
  onImport: (data: any[]) => void;
  sectorName: string;
}

declare global {
  interface Window {
    XLSX: any;
  }
}

export const ExcelHandler: React.FC<ExcelHandlerProps> = ({ data, onImport, sectorName }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const formatExcelDate = (value: any): string => {
    if (!value) return '';
    if (value instanceof Date) {
      if (isNaN(value.getTime())) return '';
      const day = String(value.getDate()).padStart(2, '0');
      const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      return `${day}-${months[value.getMonth()]}-${value.getFullYear()}`;
    }
    if (typeof value === 'number') {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      const day = String(date.getDate()).padStart(2, '0');
      const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
    }
    return String(value).trim();
  };

  const handleExport = () => {
    try {
      const ws = window.XLSX.utils.json_to_sheet(data);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, sectorName);
      window.XLSX.writeFile(wb, `${sectorName}_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Export error:", error);
      alert("Error al exportar el archivo Excel.");
    }
  };

  const validateFileName = (fileName: string, sector: string): boolean => {
    const name = fileName.toUpperCase();
    const mapping: Record<string, string[]> = {
      'MATERIALES': ['MATERIALES', 'MATERIAL'],
      'CLIENTES': ['CLIENTES', 'CLIENTE'],
      'ORD_FABRICACIONES': ['ORD_FABRICACIONES', 'FABRICACION', 'OF'],
      'ORD_TRABAJOS': ['ORD_TRABAJOS', 'TRABAJO', 'OT']
    };

    const keywords = mapping[sector] || [sector];
    return keywords.some(keyword => name.includes(keyword));
  };

  const processRowsBySector = (sector: string, rows: any[][]) => {
    const dataRows = rows.slice(1);
    switch (sector) {
      case 'MATERIALES':
        return dataRows.filter(r => r[0]).map(row => ({
          CODIGO: String(row[0] || '').trim(),
          DESCRIPCION: String(row[1] || '').trim(),
          MODELO: String(row[2] || '').trim(),
          MARCA: String(row[3] || '').trim(),
          PRECIO_UN: parseFloat(String(row[6] || '0').replace(',', '.')),
          EN_STOCK: parseInt(String(row[8] || '0'), 10)
        }));
      case 'CLIENTES':
        return dataRows.filter(r => r[0]).map(row => ({
          COD_CLIENTE: String(row[0] || '').trim(),
          RAZON_SOCIAL: String(row[1] || '').trim()
        }));
      case 'ORD_FABRICACIONES':
        return dataRows.filter(r => r[1]).map(row => ({
          OF: String(row[1] || '').trim(),
          DESCRIPCION_OF: String(row[2] || '').trim(),
          COD_CLIENTE: String(row[3] || '').trim(),
          FECHA_ENTREGA: formatExcelDate(row[4]),
          FECHA_OCOMPRA: formatExcelDate(row[5]),
          OBRA_TERMINADA: String(row[6] || '').trim()
        }));
      case 'ORD_TRABAJOS':
        return dataRows.filter(r => r[1]).map(row => ({
          OT: String(row[1] || '').trim(),
          DESCRIPCION_OT: String(row[2] || '').trim(),
          OFABRICACION: String(row[3] || '').trim()
        }));
      default:
        return window.XLSX.utils.sheet_to_json(rows);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFileName(file.name, sectorName)) {
      alert(`⚠️ TABLA ERRÓNEA:\nEl archivo "${file.name}" no corresponde a esta sección.\n\nUsted está en: "${sectorName}".\nPor favor, seleccione el archivo Excel de ${sectorName.toLowerCase()} correcto.`);
      e.target.value = '';
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const workbook = window.XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const finalData = processRowsBySector(sectorName, rawRows);
        
        if (finalData && finalData.length > 0) {
          onImport(finalData);
        } else {
          throw new Error("El archivo no contiene registros válidos.");
        }
      } catch (error) {
        alert(`Error al procesar el archivo Excel para ${sectorName}. Verifique que las columnas coincidan con el formato esperado.`);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div className="flex gap-2">
      <label className={`flex items-center gap-2 px-4 py-2 rounded-lg transition cursor-pointer font-medium text-sm ${
        isProcessing ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm border border-slate-200'
      }`}>
        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {isProcessing ? 'Sincronizando...' : 'Sincronizar Excel'}
        <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleImport} disabled={isProcessing} />
      </label>
      <button onClick={handleExport} disabled={isProcessing} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition font-medium text-sm disabled:opacity-50">
        <FileDown size={16} />
        Exportar
      </button>
    </div>
  );
};
