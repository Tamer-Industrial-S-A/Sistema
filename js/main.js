import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from "@google/genai";
import * as Lucide from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- CONSTANTS & CONFIG ---
const SUPABASE_URL = 'https://rlyjyjbafslewjlgfzeb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseWp5amJhZnNsZXdqbGdmemViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTE0MTcsImV4cCI6MjA4NTYyNzQxN30.VaV5NMIRkAIATuxYw5kmiRsiaxhU_2varz0HRmNBW-0';

const INITIAL_DATA = {
    MATERIALES: [],
    CLIENTES: [],
    ORD_FABRICACIONES: [],
    ORD_TRABAJOS: [],
    COTIZACIONES: [],
    USERS: [{ id: 'admin-01', username: 'admin', password: 'admin', role: 'admin', permissions: ['DASHBOARD', 'MATERIALES', 'CLIENTES', 'ORD_FABRICACIONES', 'ORD_TRABAJOS', 'COTIZACIONES', 'CONFIGURACION'] }],
    CONFIG: { supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY }
};

const COLUMNS = {
    MATERIALES: [
        { key: 'CODIGO', label: 'Código' },
        { key: 'DESCRIPCION', label: 'Descripción' },
        { key: 'MODELO', label: 'Modelo' },
        { key: 'MARCA', label: 'Marca' },
        { key: 'PRECIO_UN', label: 'Precio Unit.' },
        { key: 'EN_STOCK', label: 'En Stock' },
    ],
    CLIENTES: [
        { key: 'COD_CLIENTE', label: 'Cód. Cliente' },
        { key: 'RAZON_SOCIAL', label: 'Razón Social' },
    ],
    ORD_FABRICACIONES: [
        { key: 'OF', label: 'OF' },
        { key: 'DESCRIPCION_OF', label: 'Descripción OF' },
        { key: 'COD_CLIENTE', label: 'Cód. Cliente' },
        { key: 'FECHA_ENTREGA', label: 'F. Entrega' },
        { key: 'OBRA_TERMINADA', label: 'Terminada' },
    ],
    ORD_TRABAJOS: [
        { key: 'OT', label: 'OT' },
        { key: 'DESCRIPCION_OT', label: 'Descripción OT' },
        { key: 'OFABRICACION', label: 'OF Relacionada' },
    ]
};

// --- SERVICES ---
let supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const syncToSupabase = async (data) => {
    try {
        if (data.MATERIALES.length > 0) await supabase.from('materiales').upsert(data.MATERIALES.map(m => ({ codigo: m.CODIGO, descripcion: m.DESCRIPCION, modelo: m.MODELO, marca: m.MARCA, precio_un: m.PRECIO_UN, en_stock: m.EN_STOCK })), { onConflict: 'codigo' });
        if (data.CLIENTES.length > 0) await supabase.from('clientes').upsert(data.CLIENTES.map(c => ({ cod_cliente: c.COD_CLIENTE, razon_social: c.RAZON_SOCIAL })), { onConflict: 'cod_cliente' });
        return { success: true };
    } catch (e) { return { success: false, error: e.message }; }
};

// --- COMPONENTS ---

const Login = ({ onLogin, users }) => {
    const [u, setU] = useState('');
    const [p, setP] = useState('');
    const handleS = (e) => {
        e.preventDefault();
        const user = users.find(x => x.username === u && x.password === p);
        if (user) onLogin(user); else alert('Credenciales incorrectas');
    };
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="bg-white/10 backdrop-blur-md p-10 rounded-[3rem] border border-white/10 w-full max-w-md">
                <div className="flex flex-col items-center mb-10 text-white">
                    <Lucide.Database size={48} className="text-blue-500 mb-4" />
                    <h1 className="text-2xl font-black uppercase">TAMER INDUSTRIAL</h1>
                </div>
                <form onSubmit={handleS} className="space-y-6">
                    <input type="text" placeholder="Usuario" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none" value={u} onChange={e => setU(e.target.value)} />
                    <input type="password" placeholder="Contraseña" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none" value={p} onChange={e => setP(e.target.value)} />
                    <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-xl hover:bg-blue-500 transition">Entrar</button>
                </form>
            </div>
        </div>
    );
};

const Dashboard = ({ data }) => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Materiales', val: data.MATERIALES.length, icon: Lucide.Package, col: 'text-blue-600' },
                    { label: 'Clientes', val: data.CLIENTES.length, icon: Lucide.Users, col: 'text-green-600' },
                    { label: 'Órdenes OF', val: data.ORD_FABRICACIONES.length, icon: Lucide.Activity, col: 'text-orange-600' }
                ].map((s, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex items-center gap-6 shadow-sm">
                        <div className="bg-slate-50 p-4 rounded-2xl"><s.icon className={s.col} size={32} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                            <p className="text-3xl font-black text-slate-800">{s.val}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm h-96">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8">Stock de Materiales</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.MATERIALES.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="CODIGO" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '20px', border: 'none' }} />
                        <Bar dataKey="EN_STOCK" fill="#3b82f6" radius={[10, 10, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const TableManager = ({ sector, data, onUpdate }) => {
    const cols = COLUMNS[sector] || [];
    return (
        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-slate-800 uppercase tracking-tight">{sector}</h3>
                <div className="text-[10px] font-black bg-slate-900 text-white px-4 py-1.5 rounded-full uppercase">Total: {data.length}</div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {cols.map(c => <th key={c.key} className="px-8 py-5">{c.label}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                {cols.map(c => <td key={c.key} className="px-8 py-4 text-sm font-bold text-slate-600">{row[c.key]}</td>)}
                            </tr>
                        ))}
                        {data.length === 0 && <tr><td colSpan={cols.length} className="px-8 py-20 text-center text-slate-400 font-bold uppercase italic text-xs">No hay datos registrados.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- MAIN APP ---

const App = () => {
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('erp_user')));
    const [sector, setSector] = useState('DASHBOARD');
    const [data, setData] = useState(() => JSON.parse(localStorage.getItem('erp_data')) || INITIAL_DATA);

    useEffect(() => { localStorage.setItem('erp_user', JSON.stringify(user)); }, [user]);
    useEffect(() => { localStorage.setItem('erp_data', JSON.stringify(data)); }, [data]);

    if (!user) return <Login onLogin={setUser} users={data.USERS} />;

    const renderContent = () => {
        switch (sector) {
            case 'DASHBOARD': return <Dashboard data={data} />;
            case 'MATERIALES':
            case 'CLIENTES':
            case 'ORD_FABRICACIONES':
            case 'ORD_TRABAJOS':
                return <TableManager sector={sector} data={data[sector]} onUpdate={setData} />;
            default: return <div className="p-20 text-center text-slate-400 font-black uppercase italic">Módulo en construcción</div>;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-72 bg-slate-900 text-white flex flex-col p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-10 p-2">
                    <Lucide.Database className="text-blue-500" size={32} />
                    <span className="font-black tracking-tighter text-xl">TAMER ERP</span>
                </div>
                <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                    {['DASHBOARD', 'MATERIALES', 'CLIENTES', 'ORD_FABRICACIONES', 'ORD_TRABAJOS', 'COTIZACIONES', 'CONFIGURACION'].map(s => (
                        <button key={s} onClick={() => setSector(s)} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${sector === s ? 'bg-blue-600 shadow-lg shadow-blue-900/40 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                            {s}
                        </button>
                    ))}
                </nav>
                <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black">{user.username.slice(0, 1)}</div>
                        <span className="text-[10px] font-black uppercase">{user.username}</span>
                    </div>
                    <button onClick={() => setUser(null)} className="text-red-400 hover:text-red-300 transition"><Lucide.LogOut size={20} /></button>
                </div>
            </aside>

            {/* Content */}
            <main className="flex-1 flex flex-col">
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-sm">
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">{sector}</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-green-500 uppercase flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Sistema en línea</span>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
