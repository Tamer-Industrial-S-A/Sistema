
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// CONFIGURACIÓN - REEMPLAZA CON TUS DATOS DE SUPABASE
const SUPABASE_URL = 'https://rlyjyjbafslewjlgfzeb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseWp5amJhZnNsZXdqbGdmemViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTE0MTcsImV4cCI6MjA4NTYyNzQxN30.VaV5NMIRkAIATuxYw5kmiRsiaxhU_2varz0HRmNBW-0';

class AppController {
    constructor() {
        this.currentView = 'BASE_DE_DATOS';
        this.supabase = null;
        
        // Inicializar la conexión
        this.initSupabase();
        
        // Primera carga de vista
        this.setView(this.currentView);
    }

    initSupabase() {
        try {
            this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
            this.updateStatus('online');
        } catch (e) {
            console.error('Error inicializando Supabase:', e);
            this.updateStatus('offline');
        }
    }

    updateStatus(status) {
        const dot = document.getElementById('status-dot');
        const text = document.getElementById('status-text');
        if (!dot || !text) return;
        if (status === 'online') {
            dot.className = 'w-2 h-2 rounded-full bg-emerald-500';
            text.innerText = 'Conectado a Supabase';
        } else {
            dot.className = 'w-2 h-2 rounded-full bg-rose-500';
            text.innerText = 'Desconectado';
        }
    }

    setView(viewName) {
        this.currentView = viewName;
        const titleEl = document.getElementById('view-title');
        if (titleEl) titleEl.innerText = viewName.replace(/_/g, ' ');
        
        // Actualizar UI sidebar
        document.querySelectorAll('.sidebar-item').forEach(btn => {
            btn.classList.remove('active', 'bg-slate-800', 'text-white');
            if (btn.id === `btn-${viewName}`) {
                btn.classList.add('active', 'bg-slate-800', 'text-white');
            }
        });

        this.render();
    }

    async render() {
        const mount = document.getElementById('content-mount');
        if (!mount) return;
        
        mount.innerHTML = `<div class="flex items-center justify-center h-64"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div></div>`;

        switch(this.currentView) {
            case 'BASE_DE_DATOS':
                mount.innerHTML = this.renderDatabaseView();
                break;
            case 'AUTOMATIZACION':
                mount.innerHTML = this.renderAutomationView();
                this.attachAutomationListeners();
                break;
            case 'COMPRAS':
                const materials = await this.fetchTable('materiales');
                mount.innerHTML = this.renderPurchasesView(materials);
                break;
            case 'PLANEAMIENTO':
                const clientes = await this.fetchTable('clientes');
                const ofs = await this.fetchTable('ord_fabricaciones');
                mount.innerHTML = this.renderPlaneamientoView(clientes, ofs);
                this.attachPlaneamientoListeners();
                break;
            case 'PROYECTO':
                const ots = await this.fetchTable('ord_trabajos');
                mount.innerHTML = this.renderProyectoView(ots);
                this.attachProyectoListeners();
                break;
            default:
                mount.innerHTML = this.renderPlaceholder();
                break;
        }
    }

    // --- FETCH DATA ---
    async fetchTable(tableName) {
        try {
            const { data, error } = await this.supabase.from(tableName).select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        } catch (err) {
            this.showToast('Error cargando ' + tableName, 'error');
            return [];
        }
    }

    // --- RENDERS ---
    renderDatabaseView() {
        return `
            <div class="max-w-2xl mx-auto space-y-6 animate-fadeIn">
                <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h3 class="text-xl font-bold mb-4">Configuración de Base de Datos</h3>
                    <p class="text-slate-500 mb-6 italic text-sm">Los datos están hardcoded en index.js para conexión automática.</p>
                    <div class="space-y-3">
                        <div class="p-3 bg-white rounded border border-slate-200 font-mono text-xs break-all text-slate-800">URL: ${SUPABASE_URL}</div>
                        <div class="p-3 bg-white rounded border border-slate-200 font-mono text-xs break-all text-slate-800">KEY: ${SUPABASE_KEY.substring(0, 30)}...</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAutomationView() {
        return `
            <div class="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-fadeIn">
                <h3 class="text-xl font-bold mb-6 text-slate-800">Crear Nuevo Material</h3>
                <form id="form-material" class="space-y-4">
                    <input name="codigo" required placeholder="CÓDIGO (Ej: MAT-01)" class="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <input name="descripcion" required placeholder="DESCRIPCIÓN" class="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <input name="precio_un" required type="number" step="0.01" placeholder="PRECIO UNITARIO" class="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <input name="en_stock" required type="number" placeholder="STOCK INICIAL" class="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <button type="submit" class="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">Guardar Material</button>
                </form>
            </div>
        `;
    }

    renderPurchasesView(materials) {
        return `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                            <th class="p-4 border-b">CÓDIGO</th>
                            <th class="p-4 border-b">DESCRIPCIÓN</th>
                            <th class="p-4 border-b">PRECIO UN ($)</th>
                            <th class="p-4 border-b">STOCK</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materials.map(m => `
                            <tr class="hover:bg-slate-50">
                                <td class="p-4 border-b font-bold text-slate-800">${m.codigo}</td>
                                <td class="p-4 border-b text-slate-700">${m.descripcion}</td>
                                <td class="p-4 border-b">
                                    <input type="number" step="0.01" value="${m.precio_un}" 
                                        onchange="app.updateField('materiales', '${m.id}', 'precio_un', this.value)"
                                        class="w-24 p-1 bg-white text-slate-900 border border-slate-300 rounded text-right focus:ring-2 focus:ring-blue-400 outline-none">
                                </td>
                                <td class="p-4 border-b">
                                    <input type="number" value="${m.en_stock}" 
                                        onchange="app.updateField('materiales', '${m.id}', 'en_stock', this.value)"
                                        class="w-24 p-1 bg-white text-slate-900 border border-slate-300 rounded text-right focus:ring-2 focus:ring-blue-400 outline-none">
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderPlaneamientoView(clientes, ofs) {
        return `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
                <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 class="font-bold mb-4 text-slate-800 border-b pb-2">Registrar Cliente</h4>
                    <form id="form-cliente" class="space-y-3">
                        <input name="cod_cliente" required placeholder="CÓDIGO CLIENTE" class="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                        <input name="razon_social" required placeholder="RAZÓN SOCIAL" class="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                        <button class="w-full bg-slate-900 text-white p-2 rounded hover:bg-slate-800 transition-colors">Guardar Cliente</button>
                    </form>
                </div>
                <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 class="font-bold mb-4 text-slate-800 border-b pb-2">Registrar OF (Ord. Fabricación)</h4>
                    <form id="form-of" class="space-y-3">
                        <input name="of" required placeholder="NÚMERO OF" class="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                        <input name="descripcion_of" required placeholder="DESCRIPCIÓN PROYECTO" class="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                        <select name="cod_cliente" class="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Seleccionar Cliente...</option>
                            ${clientes.map(c => `<option value="${c.cod_cliente}">${c.razon_social} (${c.cod_cliente})</option>`).join('')}
                        </select>
                        <button class="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition-colors">Guardar OF</button>
                    </form>
                </div>
            </div>
        `;
    }

    renderProyectoView(ots) {
        return `
            <div class="space-y-6 animate-fadeIn">
                <div class="bg-white p-6 rounded-2xl border border-slate-200 max-w-xl mx-auto shadow-sm">
                    <h4 class="font-bold mb-4 text-slate-800 border-b pb-2">Nueva OT (Orden de Trabajo)</h4>
                    <form id="form-ot" class="space-y-3">
                        <input name="ot" required placeholder="NÚMERO OT" class="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                        <input name="descripcion_ot" required placeholder="DETALLE DEL TRABAJO" class="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                        <input name="ofabricaciones" required placeholder="VINCULAR A OF" class="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                        <button class="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition-colors">Crear OT</button>
                    </form>
                </div>
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="p-4 bg-slate-50 font-bold border-b text-slate-800">Lista de Proyectos (OTs)</div>
                    <table class="w-full text-sm">
                        <thead class="bg-slate-50 text-slate-500 uppercase text-xs">
                            <tr><th class="p-3 text-left">OT</th><th class="p-3 text-left">Descripción</th><th class="p-3 text-left">OF Vinculada</th></tr>
                        </thead>
                        <tbody>
                            ${ots.map(o => `<tr class="hover:bg-slate-50"><td class="p-3 border-b font-bold text-slate-800">${o.ot}</td><td class="p-3 border-b text-slate-700">${o.descripcion_ot}</td><td class="p-3 border-b font-mono text-blue-600">${o.ofabricaciones}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderPlaceholder() {
        return `<div class="p-20 text-center text-slate-400">Módulo ${this.currentView} en construcción...</div>`;
    }

    // --- LISTENERS ---
    attachAutomationListeners() {
        const form = document.getElementById('form-material');
        if (!form) return;
        form.onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form).entries());
            const { error } = await this.supabase.from('materiales').insert([{ 
                codigo: data.codigo, 
                descripcion: data.descripcion, 
                precio_un: parseFloat(data.precio_un), 
                en_stock: parseInt(data.en_stock) 
            }]);
            if (!error) { this.showToast('Material guardado'); form.reset(); }
        };
    }

    attachPlaneamientoListeners() {
        const fClient = document.getElementById('form-cliente');
        if (fClient) fClient.onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(fClient).entries());
            await this.supabase.from('clientes').insert([data]);
            this.showToast('Cliente guardado');
            this.render();
        };

        const fOf = document.getElementById('form-of');
        if (fOf) fOf.onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(fOf).entries());
            await this.supabase.from('ord_fabricaciones').insert([data]);
            this.showToast('OF Guardada');
            this.render();
        };
    }

    attachProyectoListeners() {
        const fOt = document.getElementById('form-ot');
        if (fOt) fOt.onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(fOt).entries());
            await this.supabase.from('ord_trabajos').insert([data]);
            this.showToast('OT Generada');
            this.render();
        };
    }

    async updateField(table, id, field, value) {
        const obj = {}; obj[field] = value;
        const { error } = await this.supabase.from(table).update(obj).eq('id', id);
        if (!error) this.showToast('Sincronizado');
    }

    showToast(msg) {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toast-msg');
        if (!toast || !toastMsg) return;
        toastMsg.innerText = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(24px)';
        }, 2000);
    }
}

window.app = new AppController();
