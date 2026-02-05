
import React, { useState, useRef, useEffect } from 'react';
import { AppData, User, Sector } from '../types';
import { ALL_SECTORS } from '../constants';
import { testConnection, isSupabaseReady } from '../services/supabaseService';
import { 
  UserPlus, 
  Trash2, 
  Shield, 
  Lock, 
  ShieldCheck, 
  X, 
  Save, 
  Key, 
  UserCheck, 
  FolderSearch, 
  Link2,
  AlertCircle,
  CheckCircle2,
  RefreshCcw,
  CloudUpload,
  CloudDownload,
  Server,
  Database,
  Activity,
  Unplug
} from 'lucide-react';

interface ConfiguracionManagerProps {
  data: AppData;
  onDataUpdate: (newUsers: User[]) => void;
  onConfigUpdate: (newConfig: Partial<AppData['CONFIG']>) => void;
  onSetDirHandle: (handle: any | null, files?: File[], name?: string) => void;
  onSyncFolder: () => void;
  onCloudPush: () => void;
  onCloudPull: () => void;
  currentDirName?: string;
}

export const ConfiguracionManager: React.FC<ConfiguracionManagerProps> = ({ 
  data, 
  onDataUpdate, 
  onConfigUpdate,
  onSetDirHandle, 
  onSyncFolder, 
  onCloudPush, 
  onCloudPull,
  currentDirName 
}) => {
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'TESTING' | 'CONNECTED' | 'ERROR'>('IDLE');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkConnection = async () => {
      if (isSupabaseReady()) {
        const result = await testConnection();
        if (result.success) {
          setConnectionStatus('CONNECTED');
        } else {
          setConnectionStatus('ERROR');
          setConnectionError(result.error || "No se pudo conectar.");
        }
      }
    };
    checkConnection();
  }, []);

  const handleStartNewUser = () => {
    setEditingUser({
      id: `user-${Date.now()}`,
      username: '',
      password: '',
      role: 'user',
      permissions: ['DASHBOARD']
    });
  };

  const handleSelectDirectory = async () => {
    try {
      const picker = (window as any).showDirectoryPicker;
      if (typeof picker === 'function') {
        const handle = await picker({ mode: 'read' });
        onSetDirHandle(handle, [], handle.name);
      } else {
        throw new Error("API not supported");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (folderInputRef.current) {
        folderInputRef.current.click();
      }
    }
  };

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      // Fix: Cast file to any to access webkitRelativePath safely in TypeScript
      const firstPath = (fileList[0] as any).webkitRelativePath;
      const folderName = firstPath.split('/')[0] || 'Carpeta Vinculada';
      onSetDirHandle(null, fileList, folderName);
    }
  };

  const handleTogglePermission = (sector: Sector) => {
    if (!editingUser) return;
    const current = editingUser.permissions || [];
    const updated = current.includes(sector)
      ? current.filter(s => s !== sector)
      : [...current, sector];
    setEditingUser({ ...editingUser, permissions: updated });
  };

  const handleSaveUser = () => {
    if (!editingUser?.username || !editingUser?.password) {
      alert("Complete usuario y contraseña.");
      return;
    }
    const newList = [...data.USERS];
    const index = newList.findIndex(u => u.id === editingUser.id);
    if (index >= 0) {
      newList[index] = editingUser as User;
    } else {
      newList.push(editingUser as User);
    }
    onDataUpdate(newList);
    setEditingUser(null);
  };

  const handleDeleteUser = (id: string) => {
    if (id === 'admin-01') {
      alert("No se puede eliminar el administrador principal.");
      return;
    }
    if (confirm('¿Eliminar este usuario?')) {
      onDataUpdate(data.USERS.filter(u => u.id !== id));
    }
  };

  const handleRetryConnection = async () => {
    setConnectionStatus('TESTING');
    setConnectionError(null);
    const result = await testConnection();
    if (result.success) {
      setConnectionStatus('CONNECTED');
    } else {
      setConnectionStatus('ERROR');
      setConnectionError(result.error || "Error al conectar.");
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Supabase Status Section */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Database size={28} />
            </div>
            <div>
              <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">Servidor de Base de Datos</h3>
              <p className="text-sm text-slate-500 font-medium">Conexión centralizada con Supabase Cloud.</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
              connectionStatus === 'CONNECTED' ? 'bg-green-50 text-green-600' : 
              connectionStatus === 'ERROR' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'
            }`}>
              {connectionStatus === 'CONNECTED' ? <CheckCircle2 size={14} /> : 
               connectionStatus === 'ERROR' ? <Unplug size={14} /> : <Activity size={14} className={connectionStatus === 'TESTING' ? 'animate-spin' : ''} />}
              {connectionStatus === 'CONNECTED' ? 'En Línea' : 
               connectionStatus === 'ERROR' ? 'Error de Conexión' : 
               connectionStatus === 'TESTING' ? 'Validando...' : 'Sin Configurar'}
            </div>
            {connectionStatus === 'ERROR' && (
              <button 
                onClick={handleRetryConnection}
                className="text-[9px] font-black text-blue-600 uppercase underline hover:text-blue-800"
              >
                Reintentar Conexión
              </button>
            )}
          </div>
        </div>

        {connectionError && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-bold">
            <AlertCircle size={16} />
            {connectionError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={onCloudPush}
            className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.1em] flex items-center justify-center gap-3 hover:bg-black transition shadow-xl active:scale-95 disabled:opacity-50 disabled:bg-slate-300"
            disabled={connectionStatus !== 'CONNECTED'}
          >
            <CloudUpload size={20} />
            Subir Datos Local a la Nube
          </button>
          <button 
            onClick={onCloudPull}
            className="px-6 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-black uppercase text-xs tracking-[0.1em] flex items-center justify-center gap-3 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
            disabled={connectionStatus !== 'CONNECTED'}
          >
            <CloudDownload size={20} />
            Descargar Datos de la Nube
          </button>
        </div>
      </div>

      {/* Directory Selection Section */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <FolderSearch size={28} />
            </div>
            <div>
              <h3 className="font-black text-xl text-slate-800 uppercase tracking-tight">Sincronización Local (Excel)</h3>
              <p className="text-sm text-slate-500 font-medium">Vincula archivos .xlsx del equipo para carga masiva.</p>
            </div>
          </div>
          
          <input 
            type="file" 
            ref={folderInputRef}
            className="hidden" 
            {...{ webkitdirectory: "", directory: "" } as any} 
            onChange={handleFolderInputChange}
          />
          
          <div className="flex gap-3">
            {currentDirName && (
              <button 
                onClick={onSyncFolder}
                className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.1em] flex items-center gap-3 hover:bg-blue-700 transition shadow-xl shadow-blue-200 active:scale-95"
              >
                <RefreshCcw size={20} />
                Procesar Archivos
              </button>
            )}
            <button 
              onClick={handleSelectDirectory}
              className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-[0.1em] flex items-center gap-3 hover:bg-slate-200 transition active:scale-95 border border-slate-200"
            >
              <Link2 size={20} />
              {currentDirName ? 'Cambiar Origen' : 'Vincular Carpeta'}
            </button>
          </div>
        </div>

        {currentDirName ? (
          <div className="flex items-center gap-4 p-5 bg-green-50 border border-green-100 rounded-[1.5rem]">
            <div className="bg-white p-3 rounded-xl text-green-600 shadow-sm">
              <CheckCircle2 size={20} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carpeta vinculada activa</p>
              <p className="text-sm font-black text-green-700 font-mono">{currentDirName}</p>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-slate-50 border border-dashed border-slate-200 rounded-[1.5rem] flex items-center gap-3 text-slate-400 italic text-sm">
            <FolderSearch size={18} />
            Seleccione la carpeta donde residen los archivos de MATERIALES, CLIENTES, etc.
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Usuarios y Accesos</h2>
          <p className="text-sm text-slate-500 font-medium">Gestión de cuentas y permisos sectoriales.</p>
        </div>
        <button 
          onClick={handleStartNewUser}
          className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black transition shadow-xl"
        >
          <UserPlus size={20} />
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="px-8 py-5">Identificador / Usuario</th>
              <th className="px-8 py-5">Rol</th>
              <th className="px-8 py-5">Accesos Habilitados</th>
              <th className="px-8 py-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.USERS.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">{u.username}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{u.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${u.role === 'admin' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-wrap gap-1">
                    {u.permissions.slice(0, 4).map(p => (
                      <span key={p} className="text-[8px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">
                        {p}
                      </span>
                    ))}
                    {u.permissions.length > 4 && <span className="text-[8px] font-black text-slate-300">+{u.permissions.length - 4} más</span>}
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => setEditingUser(u)}
                      className="p-2 text-slate-400 hover:text-blue-600 transition"
                    >
                      <Shield size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[90vh] animate-in slide-in-from-bottom-8">
            <div className="p-8 bg-blue-600 text-white flex justify-between items-center shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white text-blue-600 rounded-2xl shadow-lg">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h3 className="font-black text-xl uppercase tracking-tight">Editor de Seguridad</h3>
                  <p className="text-xs text-blue-100 font-bold uppercase tracking-widest">Permisos para: {editingUser.username || 'Nuevo Usuario'}</p>
                </div>
              </div>
              <button onClick={() => setEditingUser(null)} className="hover:bg-blue-500 p-2 rounded-full transition"><X size={32} className="text-white" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-2 gap-10 bg-slate-50/50">
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Lock size={14} className="text-blue-500" />
                    Acceso de Identidad
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre de Usuario</label>
                      <div className="relative">
                        <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                          type="text"
                          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-700"
                          value={editingUser.username || ''}
                          onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                          placeholder="Nombre de usuario"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Contraseña de Sistema</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                          type="text"
                          className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-700"
                          value={editingUser.password || ''}
                          onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                          placeholder="Contraseña"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Rol Jerárquico</label>
                      <select 
                        className="w-full px-4 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all text-slate-700 appearance-none"
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({...editingUser, role: e.target.value as any})}
                      >
                        <option value="user">Usuario Estándar</option>
                        <option value="admin">Administrador Total</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-blue-500" />
                  Privilegios de Módulos
                </h4>
                <div className="grid grid-cols-1 gap-2 h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                  {ALL_SECTORS.map(sector => (
                    <button 
                      key={sector}
                      onClick={() => handleTogglePermission(sector)}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                        editingUser.permissions?.includes(sector)
                          ? 'border-blue-500 bg-blue-50 text-blue-700 font-black'
                          : 'border-slate-50 hover:border-slate-200 text-slate-400 font-bold'
                      }`}
                    >
                      <span className="text-xs uppercase tracking-widest">{sector}</span>
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${editingUser.permissions?.includes(sector) ? 'bg-blue-600' : 'bg-slate-200'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingUser.permissions?.includes(sector) ? 'left-5' : 'left-1'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 bg-white border-t border-slate-100 flex justify-end gap-4 shadow-2xl">
              <button 
                onClick={() => setEditingUser(null)}
                className="px-8 py-4 text-slate-400 font-bold uppercase text-xs hover:text-slate-600 transition"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveUser}
                className="px-12 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-sm tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Save size={20} />
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
