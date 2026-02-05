
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://rlyjyjbafslewjlgfzeb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseWp5amJhZnNsZXdqbGdmemViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTE0MTcsImV4cCI6MjA4NTYyNzQxN30.VaV5NMIRkAIATuxYw5kmiRsiaxhU_2varz0HRmNBW-0';

class AppController {
    constructor() {
        this.currentView = 'BASE_DE_DATOS';
        this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        this.data = { materiales: [], clientes: [], ofs: [], ots: [] };
        this.filters = { materiales: '', clientes: '', ofs: '', ots: '' };
        this.editing = { table: null, id: null, item: null };
        this.init();
    }

    async init() {
        this.updateStatus('online');
        this.setView(this.currentView);
    }

    updateStatus(status) {
        const dot = document.getElementById('status-dot');
        const text = document.getElementById('status-text');
        if (!dot || !text) return;
        dot.className = `w-2 h-2 rounded-full ${status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`;
        text.innerText = status === 'online' ? 'Sincronizado' : 'Error';
    }

    setView(viewName) {
        this.currentView = viewName;
        document.getElementById('view-title').innerText = viewName.replace(/_/g, ' ');
        document.querySelectorAll('.sidebar-item').forEach(btn => {
            btn.classList.toggle('active', btn.id === `btn-${viewName}`);
            btn.classList.toggle('bg-slate-800', btn.id === `btn-${viewName}`);
        });
        this.render();
    }

    async fetchAll() {
        const fetch = async (table) => {
            const { data } = await this.supabase.from(table).select('*').order('created_at', { ascending: false });
            return data || [];
        };
        this.data.materiales = await fetch('materiales');
        this.data.clientes = await fetch('clientes');
        this.data.ofs = await fetch('ord_fabricaciones');
        this.data.ots = await fetch('ord_trabajos');
    }

    async render() {
        const mount = document.getElementById('content-mount');
        if (!mount) return;

        if (this.currentView === 'BASE_DE_DATOS') {
            await this.fetchAll();
            mount.innerHTML = this.renderMasterDatabase();
            this.attachMasterListeners();
        } else if (this.currentView === 'COMPRAS') {
            this.data.materiales = await this.fetchTable('materiales');
            mount.innerHTML = this.renderPurchasesView(this.data.materiales);
        } else {
            mount.innerHTML = `<div class="p-20 text-center text-slate-400 italic">Módulo en desarrollo.</div>`;
        }
    }

    // Facilita obtener el valor actual si estamos editando
    getVal(table, field) {
        if (this.editing.table === table && this.editing.item) {
            return this.editing.item[field] || '';
        }
        return '';
    }

    renderMasterDatabase() {
        const filter = (list, query, keys) => query ? list.filter(i => keys.some(k => String(i[k] || '').toLowerCase().includes(query.toLowerCase()))) : list;

        return `
            <div class="space-y-12 animate-fadeIn pb-20">
                <!-- MATERIALES -->
                ${this.renderSection('materiales', 'MATERIALES', 'blue', 'form-material', `
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400">CÓDIGO (Auto si vacío)</label>
                        <input name="codigo" value="${this.getVal('materiales', 'codigo')}" placeholder="Automático" class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400">DESCRIPCIÓN</label>
                        <input name="descripcion" required value="${this.getVal('materiales', 'descripcion')}" placeholder="Nombre del material" class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400">PRECIO UN.</label>
                        <input name="precio_un" required type="number" min="0" step="0.01" value="${this.getVal('materiales', 'precio_un') || 0}" class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400">STOCK</label>
                        <input name="en_stock" required type="number" min="0" value="${this.getVal('materiales', 'en_stock') || 0}" class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                `, filter(this.data.materiales, this.filters.materiales, ['codigo', 'descripcion']), (m) => `
                    <td class="p-3 font-bold">${m.codigo}</td><td class="p-3">${m.descripcion}</td><td class="p-3">$${m.precio_un}</td><td class="p-3">${m.en_stock}</td>
                `)}

                <!-- CLIENTES -->
                ${this.renderSection('clientes', 'CLIENTES', 'emerald', 'form-cliente', `
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400">CÓDIGO CLIENTE</label>
                        <input name="cod_cliente" value="${this.getVal('clientes', 'cod_cliente')}" placeholder="Automático" class="p-2 bg-white border rounded">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400">RAZÓN SOCIAL</label>
                        <input name="razon_social" required value="${this.getVal('clientes', 'razon_social')}" placeholder="Nombre empresa" class="p-2 bg-white border rounded">
                    </div>
                `, filter(this.data.clientes, this.filters.clientes, ['cod_cliente', 'razon_social']), (c) => `
                    <td class="p-3 font-bold">${c.cod_cliente}</td><td class="p-3">${c.razon_social}</td>
                `)}

                <!-- OF -->
                ${this.renderSection('ord_fabricaciones', 'ORDENES DE FABRICACIÓN (OF)', 'amber', 'form-of', `
                    <input name="of" value="${this.getVal('ord_fabricaciones', 'of')}" placeholder="NÚMERO OF (Auto)" class="p-2 bg-white border rounded">
                    <input name="descripcion_of" required value="${this.getVal('ord_fabricaciones', 'descripcion_of')}" placeholder="DESCRIPCIÓN" class="p-2 bg-white border rounded">
                    <select name="cod_cliente" required class="p-2 bg-white border rounded">
                        <option value="">Seleccionar Cliente...</option>
                        ${this.data.clientes.map(c => `<option value="${c.cod_cliente}" ${this.getVal('ord_fabricaciones', 'cod_cliente') === c.cod_cliente ? 'selected' : ''}>${c.razon_social}</option>`).join('')}
                    </select>
                `, filter(this.data.ofs, this.filters.ofs, ['of', 'descripcion_of']), (o) => `
                    <td class="p-3 font-bold">${o.of}</td><td class="p-3">${o.descripcion_of}</td><td class="p-3 text-blue-600">${o.cod_cliente}</td>
                `)}

                <!-- OT -->
                ${this.renderSection('ord_trabajos', 'ORDENES DE TRABAJO (OT)', 'indigo', 'form-ot', `
                    <input name="ot" value="${this.getVal('ord_trabajos', 'ot')}" placeholder="NÚMERO OT (Auto)" class="p-2 bg-white border rounded">
                    <input name="descripcion_ot" required value="${this.getVal('ord_trabajos', 'descripcion_ot')}" placeholder="DETALLE" class="p-2 bg-white border rounded">
                    <select name="ofabricaciones" required class="p-2 bg-white border rounded">
                        <option value="">Vincular a OF...</option>
                        ${this.data.ofs.map(f => `<option value="${f.of}" ${this.getVal('ord_trabajos', 'ofabricaciones') === f.of ? 'selected' : ''}>${f.of} - ${f.descripcion_of}</option>`).join('')}
                    </select>
                `, filter(this.data.ots, this.filters.ots, ['ot', 'descripcion_ot']), (t) => `
                    <td class="p-3 font-bold">${t.ot}</td><td class="p-3">${t.descripcion_ot}</td><td class="p-3 font-mono text-indigo-600">${t.ofabricaciones}</td>
                `)}
            </div>
        `;
    }

    renderSection(key, title, color, formId, formFields, list, rowTemplate) {
        const isEditing = this.editing.table === key;
        return `
            <section class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div class="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span class="w-2 h-6 bg-${color}-500 rounded"></span> ${title}
                    </h3>
                    <input type="text" placeholder="Buscar..." oninput="app.setFilter('${key}', this.value)" value="${this.filters[key] || ''}" class="pl-4 pr-4 py-1.5 bg-slate-50 border rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500">
                </div>
                <form id="${formId}" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-4 rounded-xl">
                    ${formFields}
                    <div class="md:col-span-4 flex gap-2">
                        <button type="submit" class="flex-1 bg-${isEditing ? 'amber' : 'blue'}-600 text-white p-2 rounded font-bold hover:opacity-90">
                            ${isEditing ? 'GUARDAR CAMBIOS' : 'CREAR REGISTRO'}
                        </button>
                        ${isEditing ? `<button type="button" onclick="app.cancelEdit()" class="px-6 bg-slate-200 rounded font-bold">CANCELAR</button>` : ''}
                    </div>
                </form>
                <div class="border rounded-xl overflow-hidden">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                            <tr><th class="p-3">Dato Principal</th><th class="p-3">Descripción</th><th class="p-3">Adicional 1</th><th class="p-3">Adicional 2</th><th class="p-3 text-right">Acciones</th></tr>
                        </thead>
                        <tbody>
                            ${list.map(item => `
                                <tr class="border-t hover:bg-slate-50">
                                    ${rowTemplate(item)}
                                    <td class="p-3 text-right">
                                        <button onclick='app.startEdit("${key}", ${JSON.stringify(item).replace(/'/g, "&apos;")})' class="p-1 hover:bg-blue-100 rounded">✏️</button>
                                        <button onclick="app.deleteRecord('${key}', '${item.id}')" class="p-1 hover:bg-rose-100 rounded">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </section>
        `;
    }

    startEdit(table, item) {
        this.editing = { table, id: item.id, item };
        this.render();
    }

    cancelEdit() {
        this.editing = { table: null, id: null, item: null };
        this.render();
    }

    setFilter(key, val) {
        this.filters[key] = val;
        this.render();
    }

    async deleteRecord(table, id) {
        if (!confirm("¿Eliminar registro?")) return;
        await this.supabase.from(table).delete().eq('id', id);
        this.showToast("Eliminado");
        this.render();
    }

    attachMasterListeners() {
        const forms = [
            { id: 'form-material', table: 'materiales', transform: d => ({...d, precio_un: parseFloat(d.precio_un || 0), en_stock: parseInt(d.en_stock || 0)}) },
            { id: 'form-cliente', table: 'clientes' },
            { id: 'form-of', table: 'ord_fabricaciones' },
            { id: 'form-ot', table: 'ord_trabajos' }
        ];

        forms.forEach(f => {
            const form = document.getElementById(f.id);
            if (!form) return;
            form.onsubmit = async (e) => {
                e.preventDefault();
                const formData = Object.fromEntries(new FormData(form).entries());
                // Si el código está vacío y no estamos editando, eliminamos la key para que SQL use el DEFAULT (Sequence)
                if (!formData.codigo && !this.editing.id) delete formData.codigo;
                if (!formData.cod_cliente && !this.editing.id) delete formData.cod_cliente;
                if (!formData.of && !this.editing.id) delete formData.of;
                if (!formData.ot && !this.editing.id) delete formData.ot;

                const data = f.transform ? f.transform(formData) : formData;

                let res;
                if (this.editing.table === f.table) {
                    res = await this.supabase.from(f.table).update(data).eq('id', this.editing.id);
                } else {
                    res = await this.supabase.from(f.table).insert([data]);
                }

                if (!res.error) {
                    this.showToast("Éxito");
                    this.cancelEdit();
                } else {
                    alert("Error: " + res.error.message);
                }
            };
        });
    }

    showToast(msg) {
        const t = document.getElementById('toast');
        document.getElementById('toast-msg').innerText = msg;
        t.style.opacity = '1';
        t.style.transform = 'translateY(0)';
        setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(24px)'; }, 2000);
    }
}

window.app = new AppController();
