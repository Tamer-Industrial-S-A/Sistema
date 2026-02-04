
import React from 'react';
import { Sector, User } from '../types';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Factory, 
  Wrench, 
  Database,
  Menu,
  X,
  Cpu,
  Settings,
  Calendar,
  Scissors,
  ClipboardList,
  Hammer,
  ChevronDown,
  ChevronRight,
  FileText,
  ShoppingCart,
  LogOut,
  Sliders
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeSector: Sector;
  setActiveSector: (s: Sector) => void;
  currentUser: User;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeSector, setActiveSector, currentUser, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({
    base_datos: true,
    automatizacion: true,
  });

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const menuItems = [
    { id: 'DASHBOARD', label: 'Panel Principal', icon: LayoutDashboard },
    { 
      id: 'BASE_DATOS', 
      label: 'BASE DATOS', 
      icon: Database,
      subItems: [
        { id: 'MATERIALES', label: 'Materiales', icon: Package },
        { id: 'CLIENTES', label: 'Clientes', icon: Users },
        { id: 'ORD_FABRICACIONES', label: 'Órdenes Fabricación', icon: Factory },
        { id: 'ORD_TRABAJOS', label: 'Órdenes Trabajo', icon: Wrench },
      ]
    },
    { 
      id: 'AUTOMATIZACION', 
      label: 'AUTOMATIZACION', 
      icon: Cpu,
      subItems: [
        { id: 'COTIZACIONES', label: 'Cotizaciones', icon: FileText },
      ]
    },
    { id: 'COMPRAS', label: 'COMPRAS', icon: ShoppingCart },
    { id: 'TECNICA', label: 'TECNICA', icon: Settings },
    { id: 'PLANEAMIENTO', label: 'PLANEAMIENTO', icon: Calendar },
    { id: 'CORTE_AGUA', label: 'CORTE AGUA', icon: Scissors },
    { id: 'PROYECTO', label: 'PROYECTO', icon: ClipboardList },
    { id: 'TALLER', label: 'TALLER', icon: Hammer },
    { id: 'CONFIGURACION', label: 'CONFIGURACIÓN', icon: Sliders },
  ];

  // Filter items based on user permissions
  const filteredMenuItems = menuItems.filter(item => {
    if (item.subItems) {
      // Keep main item if header is allowed OR if at least one subitem is allowed
      const headerAllowed = currentUser.permissions.includes(item.id as Sector);
      const allowedSub = item.subItems.some(sub => currentUser.permissions.includes(sub.id as Sector));
      return headerAllowed || allowedSub;
    }
    return currentUser.permissions.includes(item.id as Sector);
  }).map(item => {
    if (item.subItems) {
      return {
        ...item,
        subItems: item.subItems.filter(sub => currentUser.permissions.includes(sub.id as Sector))
      };
    }
    return item;
  });

  const getActiveLabel = () => {
    for (const item of menuItems) {
      if (item.id === activeSector) return item.label;
      if (item.subItems) {
        const sub = item.subItems.find(si => si.id === activeSector);
        if (sub) return sub.label;
      }
    }
    return 'Sector';
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-900 text-white transition-all duration-300 flex flex-col shadow-2xl z-50`}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <div className={`flex items-center gap-2 font-black text-blue-400 truncate ${!isSidebarOpen && 'hidden'}`}>
            <Database size={24} />
            <span className="tracking-tight">INDUSTRIAL ERP</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 mt-6 px-2 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredMenuItems.map((item) => (
            <div key={item.id}>
              {item.subItems && item.subItems.length > 0 ? (
                <>
                  <button
                    onClick={() => isSidebarOpen && toggleGroup(item.id.toLowerCase())}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all text-slate-400 hover:bg-slate-800/50 hover:text-white`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} />
                      <span className={`${!isSidebarOpen && 'hidden'} font-black text-[10px] uppercase tracking-widest`}>{item.label}</span>
                    </div>
                    {isSidebarOpen && (expandedGroups[item.id.toLowerCase()] ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                  </button>
                  {isSidebarOpen && expandedGroups[item.id.toLowerCase()] && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-slate-800 pl-2">
                      {item.subItems.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => setActiveSector(sub.id as Sector)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                            activeSector === sub.id 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                              : 'text-slate-500 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <sub.icon size={18} />
                          <span className="text-sm font-bold">{sub.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                !item.subItems && (
                  <button
                    onClick={() => setActiveSector(item.id as Sector)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                      activeSector === item.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 font-bold' 
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <item.icon size={20} />
                    <span className={`${!isSidebarOpen && 'hidden'} text-sm font-bold`}>{item.label}</span>
                  </button>
                )
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
          {isSidebarOpen && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-xl border border-white/5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-[10px] font-black uppercase">
                {currentUser.username.slice(0,2)}
              </div>
              <div className="flex-1 truncate">
                <p className="text-[10px] font-black truncate">{currentUser.username}</p>
                <p className="text-[8px] text-slate-500 font-bold uppercase">{currentUser.role}</p>
              </div>
            </div>
          )}
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className={`${!isSidebarOpen && 'hidden'} text-sm font-bold`}>Cerrar Sesión</span>
          </button>
          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-3 mt-2">
            {isSidebarOpen ? 'v1.2.5 ERP SYSTEM' : 'v1.2'}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            {getActiveLabel()}
          </h1>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
              <span className="text-[10px] text-green-500 font-black uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                En Línea
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-black text-xs uppercase">
              {currentUser.username.slice(0,1)}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          {children}
        </div>
      </main>
    </div>
  );
};
