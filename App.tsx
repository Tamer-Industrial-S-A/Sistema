
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
import { INITIAL_DATA } from './constants';
import { Loader2, Construction } from 'lucide-react';
import { syncToSupabase, pullFromSupabase, initSupabase, isSupabaseReady } from './services/supabaseService';

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

  const [data, setData] = useState<AppData>(() => {
    try {
      const saved = localStorage.getItem('industrial_erp_data');
      return saved ? JSON.parse(saved) : { ...INITIAL_DATA, CONFIG: {} };
    } catch (e) {
      console.error("Error loading from local storage", e);
      return { ...INITIAL_DATA, CONFIG: {} };
    }
  });

  useEffect(() => {
    if (data.CONFIG.supabaseUrl && data.CONFIG.supabaseAnonKey) {
      initSupabase(data.CONFIG.supabaseUrl, data.CONFIG.supabaseAnonKey);
    }
  }, [data.CONFIG.supabaseUrl, data.CONFIG.supabaseAnonKey]);

  useEffect(() => {
    try {
      localStorage.setItem('industrial_erp_data', JSON.stringify(data));
    } catch (e) {
      console.error("Storage error", e);
    }
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
    setSyncPhase('Guardando cambios...');
    setData(prev => {
      const updated = { ...prev, [sector]: newData };
      setTimeout(() => setIsSyncing(false), 100);
      return updated;
    });
  };

  const updateConfig = (newConfig: Partial<AppData['CONFIG']>) => {
    setData(prev => ({
      ...prev,
      CONFIG: { ...prev.CONFIG, ...newConfig }
    }));
  };

  const handleCloudPush = async (customData?: AppData) => {
    setIsSyncing(true);
    setSyncPhase('Sincronizando con Supabase...');
    const targetData = customData || data;
    const result = await syncToSupabase(targetData);
    setIsSyncing(false);
    if (!customData) {
      if (result.success) alert("✅ Nube actualizada correctamente.");
      else alert(`❌ Error Cloud: ${result.error}`);
    }
    return result;
  };

  const handleCloudPull = async () => {
    setIsSyncing(true);
    setSyncPhase('Descargando de la nube...');
    const result = await pullFromSupabase();
    setIsSyncing(false);
    if (result.data) {
      setData(prev => ({ ...prev, ...result.data }));
      alert("✅ Datos locales actualizados desde Supabase.");
    } else {
      alert(`❌ Error Importación: ${result.error}`);
    }
  };

  const handleSyncUpdate = (newMaterials: any[], newQuotes?: any[]) => {
    setIsSyncing(true);
    setData(prev => {
      const updated = {
        ...prev,
        MATERIALES: newMaterials,
        COTIZACIONES: newQuotes || prev.COTIZACIONES
      };
      setTimeout(() => setIsSyncing(false), 100);
      return updated;
    });
  };

  const syncFromDirectory = useCallback(async () => {
    if (!dirHandle && linkedFiles.length === 0) {
      alert("⚠️ Error: Vincule la carpeta de Base de Datos en CONFIGURACIÓN.");
      return;
    }

    setIsSyncing(true);
    setSyncPhase('Analizando archivos Excel...');

    try {
      const tempUpdatedData = { ...data };
      const foundSectors = new Set<string>();
      let totalNewRecords = 0;
      let skippedRecords = 0;
      const sectorsReport: string[] = [];
      
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
        foundSectors.add(targetSector);

        const arrayBuffer = await file.arrayBuffer();
        const workbook = (window as any).XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows: any[][] = (window as any).XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const dataRows = rawRows.slice(1);

        let newRecords: any[] = [];
        const existingData = (data as any)[targetSector] || [];

        if (targetSector === 'MATERIALES') {
          const existingCodes = new Set(existingData.map((m: Material) => m.CODIGO));
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
          const existingCodes = new Set(existingData.map((c: Cliente) => c.COD_CLIENTE));
          newRecords = dataRows
            .map(row => ({
              COD_CLIENTE: String(row[0] || '').trim(),
              RAZON_SOCIAL: String(row[1] || '').trim()
            }))
            .filter(r => r.COD_CLIENTE && !existingCodes.has(r.COD_CLIENTE));
        } else if (targetSector === 'ORD_FABRICACIONES') {
          const existingCodes = new Set(existingData.map((of: OrdFabricacion) => of.OF));
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
          const existingCodes = new Set(existingData.map((ot: OrdTrabajo) => ot.OT));
          newRecords = dataRows
            .map(row => ({
              OT: String(row[1] || '').trim(),
              DESCRIPCION_OT: String(row[2] || '').trim(),
              OFABRICACION: String(row[3] || '').trim()
            }))
            .filter(r => r.OT && !existingCodes.has(r.OT));
        }

        if (newRecords.length > 0) {
          (tempUpdatedData as any)[targetSector] = [...existingData, ...newRecords];
          totalNewRecords += newRecords.length;
          sectorsReport.push(`${targetSector} (+${newRecords.length})`);
        }
      };

      const filesToProcess: File[] = [];
      if (dirHandle) {
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') filesToProcess.push(await (entry as FileSystemFileHandle).getFile());
        }
      } else {
        filesToProcess.push(...linkedFiles);
      }

      for (const file of filesToProcess) {
        setSyncPhase(`Procesando ${file.name}...`);
        await processFile(file);
      }

      // --- LIMPIEZA AUTOMÁTICA DE REGISTROS INVÁLIDOS (INTEGRIDAD) ---
      const allClientCodes = new Set(tempUpdatedData.CLIENTES.map(c => c.COD_CLIENTE));
      const initialOFCount = tempUpdatedData.ORD_FABRICACIONES.length;
      
      // Filtrar OFs que no tienen cliente válido
      tempUpdatedData.ORD_FABRICACIONES = tempUpdatedData.ORD_FABRICACIONES.filter(of => {
        const isValid = of.COD_CLIENTE && allClientCodes.has(of.COD_CLIENTE);
        if (!isValid) skippedRecords++;
        return isValid;
      });

      const allOFCodes = new Set(tempUpdatedData.ORD_FABRICACIONES.map(of => of.OF));
      const initialOTCount = tempUpdatedData.ORD_TRABAJOS.length;

      // Filtrar OTs que no tienen OF válida
      tempUpdatedData.ORD_TRABAJOS = tempUpdatedData.ORD_TRABAJOS.filter(ot => {
        const isValid = ot.OFABRICACION && allOFCodes.has(ot.OFABRICACION);
        if (!isValid) skippedRecords++;
        return isValid;
      });

      // Si después de limpiar no hay nada nuevo
      if (totalNewRecords === 0) {
        alert("ℹ️ No se detectaron registros nuevos en los archivos seleccionados.");
        setIsSyncing(false);
        return;
      }

      // Actualizar estado local
      setData(tempUpdatedData);

      // Sincronización con Supabase si está disponible
      if (isSupabaseReady()) {
        setSyncPhase('Resguardando en la nube...');
        const cloudResult = await syncToSupabase(tempUpdatedData);
        if (cloudResult.success) {
          alert(`✅ Sincronización Exitosa:\n\nProcesados: ${sectorsReport.join(', ')}\nOmitidos por errores de datos: ${skippedRecords} registros.\n\nLa base de datos local y la nube están actualizadas.`);
        } else {
          alert(`⚠️ Error Cloud: Los datos se guardaron localmente pero falló la nube: ${cloudResult.error}`);
        }
      } else {
        alert(`✅ Carga Local Exitosa:\n\nRegistros: ${sectorsReport.join(', ')}\nOmitidos: ${skippedRecords} (datos incompletos en Excel).`);
      }

    } catch (error) {
      console.error("Sync error:", error);
      alert("❌ Error crítico procesando los archivos. Verifique el formato.");
    } finally {
      setIsSyncing(false);
      setSyncPhase('');
    }
  }, [dirHandle, linkedFiles, data]);

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveSector('DASHBOARD');
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} users={data.USERS} />;
  }

  const renderContent = () => {
    if (isSyncing) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-slate-500 font-black uppercase tracking-widest text-xs">{syncPhase}</p>
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
          />
        );
      case 'AUTOMATIZACION':
      case 'COTIZACIONES':
        return (
          <CotizacionesManager 
            data={data} 
            onDataUpdate={(newList) => updateTableData('COTIZACIONES', newList)} 
          />
        );
      case 'COMPRAS':
        return (
          <ComprasManager 
            data={data} 
            onDataUpdate={handleSyncUpdate} 
          />
        );
      case 'PROYECTO':
        return (
          <ProyectoManager 
            data={data} 
            onDataUpdate={handleSyncUpdate} 
          />
        );
      case 'CONFIGURACION':
        return (
          <ConfiguracionManager 
            data={data}
            onDataUpdate={(newUsers) => updateTableData('USERS', newUsers)}
            onConfigUpdate={updateConfig}
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
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
          <Construction size={48} className="mb-4 text-slate-300" />
          <h2 className="text-xl font-bold text-slate-600">Módulo {activeSector}</h2>
          <p className="max-w-xs text-center mt-2 text-sm">Desarrollo pendiente.</p>
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
