
import React from 'react';
import { ViewType } from '../types';

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const menuItems = [
    { type: ViewType.AUTOMATIZACION, icon: 'fa-robot' },
    { type: ViewType.TECNICA, icon: 'fa-wrench' },
    { type: ViewType.PLANEAMIENTO, icon: 'fa-calendar-days' },
    { type: ViewType.PROYECTO, icon: 'fa-diagram-project' },
  ];

  return (
    <aside className="w-64 bg-slate-900 h-full text-slate-300 flex flex-col shadow-2xl">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center text-white">
            <i className="fa-solid fa-microchip"></i>
          </div>
          <span className="text-xl font-black text-white tracking-tighter uppercase">Industrial.AI</span>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.type}
              onClick={() => setActiveView(item.type)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 group ${
                activeView === item.type
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <i className={`fa-solid ${item.icon} ${activeView === item.type ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`}></i>
              {item.type}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Base de Datos</p>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>Access Conectado (Local)</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
