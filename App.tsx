
import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TableManager } from './components/TableManager';
import { CotizacionesManager } from './components/CotizacionesManager';
import { ComprasManager } from './components/ComprasManager';
import { ProyectoManager } from './components/ProyectoManager';
import { ConfiguracionManager } from './components/ConfiguracionManager';
import { Login } from './components/Login';
import { Sector, AppData, User, Cliente, Material, OrdFabricacion, OrdTrabajo } from './types';
import { INITIAL_DATA, SUPABASE_URL, SUPABASE_ANON_KEY, COLUMNS } from './constants';
import { Loader2, Construction, Database } from 'lucide-react';
import { syncToSupabase, pullFromSupabase, initSupabase, isSupabaseReady, removeFromSupabase } from './services/supabaseService';

const App: React.FC = () => {
  const [activeSector, setActiveSector] = useState<Sector>('DASHBOARD');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPhase, setSyncPhase] = useState<string>('');
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [linkedFiles, setLinkedFiles] = useState<File[]>([]);
  const [linkedDirName, setLinkedDirName] = useState<string>('');
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('industrial_erp_session');
    return saved ? JSON.parse(saved) : null;
  });

  const sortData = (list: any[], sector: string) => {
    const columns = COLUMNS[sector];
    if (!columns || columns.length === 0 || !list) return list;
    const firstKey = columns[0].key;
    
    return [...list].sort((a, b) => {
      const valA = String(a[firstKey] || '').trim();
      const valB = String(b[firstKey] || '').trim();
      return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  const [data, setData] = useState<AppData>(() => {
    try {
      const saved = localStorage.getItem('industrial_erp_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach(key => {
          if (Array.isArray(parsed[key])) {
            parsed[key] = sortData(parsed[key], key);
          }
        });
        return parsed;
      }
      return { ...INITIAL_DATA };
    } catch (e) {
      return { ...INITIAL_DATA };
    }
  });

  useEffect(() => {
    const url = data.CONFIG?.supabaseUrl || SUPABASE_URL;
    const key = data.CONFIG?.supabaseAnonKey || SUPABASE_ANON_KEY;
    initSupabase(url, key);
  }, [data.CONFIG]);

  useEffect(() => {
    localStorage.setItem('industrial_erp_data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('industrial_erp_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('industrial_erp_session');
    }
  }, [currentUser]);

  const updateTableData = (sector: keyof AppData, newData: any[]) => {
    setIsSyncing(true);
    setSyncPhase('Guardando y Ordenando...');
    
    const sorted = sortData(newData, sector);

    setData(prev => {
      const updated = { ...prev, [sector]: sorted };
      if (isSupabaseReady()) syncToSupabase(updated);
      setTimeout(() => setIsSyncing(false), 500);
      return updated;
    });
  };

  const handleDeleteRecord = async (sector: keyof AppData, idValue: string) => {
    if (!idValue) return;
    
    // Borrado optimista (local primero para rapidez visual)
    setData(prev => {
      const newList = (prev[sector] as any[]).filter(item => {
        const id = item.CODIGO || item.codigo || 
                   item.COD_CLIENTE || item.cod_cliente || 
                   item.OF || item.of || 
                   item.OT || item.ot || 
                   item.ID || item.id;
        return String(id).trim() !== String(idValue).trim();
      });
      return { ...prev, [sector]: newList };
    });

    if (isSupabaseReady()) {
      setIsSyncing(true);
      setSyncPhase('Actualizando Nube...');
      const result = await removeFromSupabase(sector as Sector, idValue);
      if (!result.success) {
        alert(`Aviso: El registro se eliminó localmente pero no pudo eliminarse de la nube: ${result.error}. Intente sincronizar después.`);
      }
      setIsSyncing(false);
    }
  };

  const handleCloudPush = async (customData?: AppData) => {
    setIsSyncing(true);
    setSyncPhase('Subiendo datos...');
    const targetData = customData || data;
    const result = await syncToSupabase(targetData);
    setIsSyncing(false);
    if (!customData) {
      if (result.success) alert("✅ Sincronización exitosa.");
      else alert(`❌ Error: ${result.error}`);
    }
    return result;
  };

  const handleCloudPull = async () => {
    setIsSyncing(true);
    setSyncPhase('Descargando datos...');
    const result = await pullFromSupabase();
    setIsSyncing(false);
    if (result.data) {
      const sortedData: any = { ...result.data };
      Object.keys(sortedData).forEach(key => {
        if (Array.isArray(sortedData[key])) {
          sortedData[key] = sortData(sortedData[key], key);
        }
      });
      setData(prev => ({ ...prev, ...sortedData }));
      alert("✅ Importación completa.");
    } else {
      alert(`❌ Error: ${result.error}`);
    }
  };

  const handleSyncUpdate = (newMaterials: any[], newQuotes?: any[]) => {
    setIsSyncing(true);
    setData(prev => {
      const updated = {
        ...prev,
        MATERIALES: sortData(newMaterials, 'MATERIALES'),
        COTIZACIONES: newQuotes ? sortData(newQuotes, 'COTIZACIONES') : prev.COTIZACIONES
      };
      if (isSupabaseReady()) syncToSupabase(updated);
      setTimeout(() => setIsSyncing(false), 500);
      return updated;
    });
  };

  const syncFromDirectory = useCallback(async () => {
    if (!dirHandle && linkedFiles.length === 0) {
      alert("Vincule la carpeta en CONFIGURACIÓN.");
      return;
    }

    setIsSyncing(true);
    setSyncPhase('Analizando carpetas...');

    try {
      let tempUpdatedData = { ...data };
      let totalNew = 0;
      
      const formatExcelDate = (value: any): string => {
        if (!value) return '';
        if (value instanceof Date) {
          const day = String(value.getDate()).padStart(2, '0');
          const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
          return `${day}-${months[value.getMonth()]}-${value.getFullYear()}`;
        }
        return String(value).trim();
      };

      const processFile = async (file: File) => {
        const fileName = file.name.toUpperCase();
        let targetSector: keyof AppData | '' = '';

        if (fileName.includes('MATERIALES')) targetSector = 'MATERIALES';
        else if (fileName.includes('CLIENTES')) targetSector = 'CLIENTES';
        else if (fileName.includes('FABRICACION') || fileName.includes('OF')) targetSector = 'ORD_FABRICACIONES';
        else if (fileName.includes('TRABAJO') || fileName.includes('OT')) targetSector = 'ORD_TRABAJOS';

        if (!targetSector) return;

        const arrayBuffer = await file.arrayBuffer();
        const workbook = (window as any).XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows: any[][] = (window as any).XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const dataRows = rawRows.slice(1);

        let newRecords: any[] = [];
        const existingData = (tempUpdatedData as any)[targetSector] || [];

        if (targetSector === 'MATERIALES') {
          const existingCodes = new Set(existingData.map((m: any) => String(m.CODIGO || m.codigo || '').trim()));
          newRecords = dataRows
            .map(row => ({
              CODIGO: String(row[0] || '').trim(),
              DESCRIPCION: String(row[1] || '').trim(),
              MODELO: String(row[2] || '').trim(),
              MARCA: String(row[3] || '').trim(),
              PRECIO_UN: parseFloat(String(row[6] || '0').replace(',', '.')),
              EN_STOCK: parseInt(String(row[8] || '0'), 10)
            }))
            .filter(r => r.CODIGO && !existingCodes.has(r.CODIGO));
        } else if (targetSector === 'CLIENTES') {
          const existingCodes = new Set(existingData.map((c: any) => String(c.COD_CLIENTE || c.cod_cliente || '').trim()));
          newRecords = dataRows
            .map(row => ({
              COD_CLIENTE: String(row[0] || '').trim(),
              RAZON_SOCIAL: String(row[1] || '').trim()
            }))
            .filter(r => r.COD_CLIENTE && !existingCodes.has(r.COD_CLIENTE));
        } else if (targetSector === 'ORD_FABRICACIONES') {
          const existingCodes = new Set(existingData.map((of: any) => String(of.OF || of.of || '').trim()));
          newRecords = dataRows
            .map(row => ({
              OF: String(row[1] || '').trim(),
              DESCRIPCION_OF: String(row[2] || '').trim(),
              COD_CLIENTE: String(row[3] || '').trim(),
              FECHA_ENTREGA: formatExcelDate(row[4]),
              FECHA_OCOMPRA: formatExcelDate(row[5]),
              OBRA_TERMINADA: String(row[6] || '').trim()
            }))
            .filter(r => r.OF && !existingCodes.has(r.OF));
        } else if (targetSector === 'ORD_TRABAJOS') {
          const existingCodes = new Set(existingData.map((ot: any) => String(ot.OT || ot.ot || '').trim()));
          newRecords = dataRows
            .map(row => ({
              OT: String(row[1] || '').trim(),
              DESCRIPCION_OT: String(row[2] || '').trim(),
              OFABRICACION: String(row[3] || '').trim()
            }))
            .filter(r => r.OT && !existingCodes.has(r.OT));
        }

        if (newRecords.length > 0) {
          totalNew += newRecords.length;
          (tempUpdatedData as any)[targetSector] = sortData([...existingData, ...newRecords], targetSector);
        }
      };

      const filesToProcess: File[] = [];
      if (dirHandle) {
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file' && (entry.name.endsWith('.xlsx') || entry.name.endsWith('.xls'))) {
            filesToProcess.push(await (entry as FileSystemFileHandle).getFile());
          }
        }
      } else {
        filesToProcess.push(...linkedFiles.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')));
      }

      // Procesar en orden lógico (Clientes antes que OFs)
      filesToProcess.sort((a, b) => {
        const priority = (n: string) => {
          const u = n.toUpperCase();
          if (u.includes('CLIENTES')) return 1;
          if (u.includes('MATERIALES')) return 2;
          if (u.includes('OF')) return 3;
          if (u.includes('OT')) return 4;
          return 5;
        };
        return priority(a.name) - priority(b.name);
      });

      for (const file of filesToProcess) {
        setSyncPhase(`Procesando ${file.name}...`);
        await processFile(file);
      }

      setData(tempUpdatedData);
      if (isSupabaseReady()) await syncToSupabase(tempUpdatedData);
      alert(`✅ Sincronización completa: ${totalNew} registros añadidos.`);
    } catch (error) {
      alert("❌ Error al procesar archivos.");
    } finally {
      setIsSyncing(false);
      setSyncPhase('');
    }
  }, [dirHandle, linkedFiles, data]);

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveSector('DASHBOARD');
  };

  if (!currentUser) return <Login onLogin={setCurrentUser} users={data.USERS} />;

  const renderContent = () => {
    if (isSyncing) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
          <Loader2 className="animate-spin text-blue-600" size={80} strokeWidth={1} />
          <div className="text-center">
            <p className="text-slate-800 font-black uppercase tracking-[0.2em] text-sm mb-2">{syncPhase}</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Sincronizando Sistema...</p>
          </div>
        </div>
      );
    }

    switch(activeSector) {
      case 'DASHBOARD': return <Dashboard data={data} />;
      case 'MATERIALES':
      case 'CLIENTES':
      case 'ORD_FABRICACIONES':
      case 'ORD_TRABAJOS':
        return (
          <TableManager 
            sector={activeSector} 
            data={data[activeSector as keyof AppData] as any[]} 
            onDataUpdate={(newData) => updateTableData(activeSector as keyof AppData, newData)}
            onDeleteRecord={(id) => handleDeleteRecord(activeSector as keyof AppData, id)}
          />
        );
      case 'AUTOMATIZACION':
      case 'COTIZACIONES':
        return <CotizacionesManager data={data} onDataUpdate={(newList) => updateTableData('COTIZACIONES', newList)} />;
      case 'COMPRAS':
        return <ComprasManager data={data} onDataUpdate={handleSyncUpdate} />;
      case 'PROYECTO':
        return <ProyectoManager data={data} onDataUpdate={handleSyncUpdate} />;
      case 'CONFIGURACION':
        return (
          <ConfiguracionManager 
            data={data}
            onDataUpdate={(newUsers) => updateTableData('USERS', newUsers)}
            onConfigUpdate={(config) => setData(prev => ({ ...prev, CONFIG: { ...prev.CONFIG, ...config } }))}
            onSetDirHandle={(handle, files, name) => {
              setDirHandle(handle);
              if (files) setLinkedFiles(files);
              if (name) setLinkedDirName(name);
            }}
            onSyncFolder={syncFromDirectory}
            onCloudPush={() => handleCloudPush()}
            onCloudPull={handleCloudPull}
            currentDirName={dirHandle?.name || linkedDirName}
          />
        );
      default: return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 bg-white rounded-[3rem] border border-dashed border-slate-200">
          <Construction size={48} className="mb-4 text-slate-300" />
          <h2 className="text-xl font-bold text-slate-600">Módulo {activeSector}</h2>
        </div>
      );
    }
  };

  return (
    <Layout activeSector={activeSector} setActiveSector={setActiveSector} currentUser={currentUser} onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
};

export default App;
