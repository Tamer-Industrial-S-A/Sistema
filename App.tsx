
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import AutomationView from './components/AutomationView';
import { ViewType, Material, Cliente } from './types';
import { MOCK_MATERIALS, MOCK_CLIENTES } from './constants';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.AUTOMATIZACION);
  const [materials, setMaterials] = useState<Material[]>(MOCK_MATERIALS);
  const [clientes, setClientes] = useState<Cliente[]>(MOCK_CLIENTES);

  // Sync with local storage or actual DB integration point
  useEffect(() => {
    const savedMaterials = localStorage.getItem('materials');
    const savedClientes = localStorage.getItem('clientes');
    if (savedMaterials) setMaterials(JSON.parse(savedMaterials));
    if (savedClientes) setClientes(JSON.parse(savedClientes));
  }, []);

  const renderContent = () => {
    switch (activeView) {
      case ViewType.AUTOMATIZACION:
        return <AutomationView materials={materials} clientes={clientes} />;
      case ViewType.TECNICA:
        return (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <i className="fa-solid fa-wrench text-6xl mb-4"></i>
            <h2 className="text-2xl font-bold">Módulo de Técnica</h2>
            <p>Próximamente disponible</p>
          </div>
        );
      case ViewType.PLANEAMIENTO:
        return (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <i className="fa-solid fa-calendar-days text-6xl mb-4"></i>
            <h2 className="text-2xl font-bold">Módulo de Planeamiento</h2>
            <p>Próximamente disponible</p>
          </div>
        );
      case ViewType.PROYECTO:
        return (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <i className="fa-solid fa-diagram-project text-6xl mb-4"></i>
            <h2 className="text-2xl font-bold">Módulo de Proyecto</h2>
            <p>Próximamente disponible</p>
          </div>
        );
      case ViewType.DATA_IMPORT:
        return <DataImportView setMaterials={setMaterials} setClientes={setClientes} />;
      default:
        return <AutomationView materials={materials} clientes={clientes} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{activeView}</h1>
            <p className="text-slate-500">Gestión Integral Industrial v1.0</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setActiveView(ViewType.DATA_IMPORT)}
                className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 transition shadow-sm flex items-center gap-2"
              >
               <i className="fa-solid fa-file-import"></i> Sincronizar Access
             </button>
             <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
               FS
             </div>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
};

const DataImportView: React.FC<{ setMaterials: any, setClientes: any }> = ({ setMaterials, setClientes }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [target, setTarget] = useState<'materials' | 'clientes'>('materials');

  const handleImport = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (Array.isArray(parsed)) {
        if (target === 'materials') {
          setMaterials(parsed);
          localStorage.setItem('materials', JSON.stringify(parsed));
        } else {
          setClientes(parsed);
          localStorage.setItem('clientes', JSON.stringify(parsed));
        }
        alert('Datos importados correctamente');
        setJsonInput('');
      } else {
        alert('El formato debe ser un array de objetos JSON');
      }
    } catch (e) {
      alert('Error al parsear JSON. Verifique el formato.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-100">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <i className="fa-solid fa-database text-indigo-500"></i>
        Importación de Datos desde Access
      </h2>
      <p className="text-slate-600 mb-6">
        Exporte sus tablas de Microsoft Access a formato JSON o CSV y péguelos aquí para sincronizar la aplicación.
      </p>
      
      <div className="flex gap-4 mb-4">
        <button 
          onClick={() => setTarget('materials')}
          className={`flex-1 py-3 rounded-lg font-medium transition ${target === 'materials' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}
        >
          Tabla MATERIALES
        </button>
        <button 
          onClick={() => setTarget('clientes')}
          className={`flex-1 py-3 rounded-lg font-medium transition ${target === 'clientes' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}
        >
          Tabla CLIENTES
        </button>
      </div>

      <textarea 
        className="w-full h-64 p-4 border border-slate-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
        placeholder={`Pegue aquí el JSON de la tabla ${target === 'materials' ? 'MATERIALES' : 'CLIENTES'}...`}
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
      />

      <button 
        onClick={handleImport}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition shadow-lg"
      >
        Procesar e Importar
      </button>

      <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-100">
        <h3 className="text-amber-800 font-bold mb-2">Instrucciones de Exportación</h3>
        <ul className="text-amber-700 text-sm list-disc ml-5 space-y-1">
          <li>En MS Access, seleccione la tabla.</li>
          <li>Vaya a Datos Externos > Exportar > Más > Archivo XML/JSON (o CSV).</li>
          <li>Asegúrese de que los campos coincidan: "codigo", "descripcion", "marca", "valor".</li>
        </ul>
      </div>
    </div>
  );
};

export default App;
