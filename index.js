
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
        await this.refreshData();
    }

    updateStatus(status) {
        const dot = document.getElementById('status-dot');
        const text = document.getElementById('status-text');
        if (!dot || !text) return;
        dot.className = `w-2 h-2 rounded-full ${status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`;
        text.innerText = status === 'online' ? 'Sincronizado' : 'Error de Conexión';
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

    async refreshData() {
        // No refrescar si estamos editando para no perder el foco o los datos actuales
        if (this.editing.id) return;

        const fetchTable = async (table) => {
            const { data, error } = await this.supabase.from(table).select('*').order('created_at', { ascending: false });
            if (error) console.error(`Error en ${table}:`, error);
            return data || [];
        };

        this.data.materiales = await fetchTable('materiales');
        this.data.clientes = await fetchTable('clientes');
        this.data.ofs = await fetchTable('ord_fabricaciones');
        this.data.ots = await fetchTable('ord_trabajos');
        
        this.render();
    }

    render() {
        const mount = document.getElementById('content-mount');
        if (!mount) return;

        if (this.currentView === 'BASE_DE_DATOS') {
            mount.innerHTML = this.renderMasterDatabase();
            this.attachMasterListeners();
        } else if (this.currentView === 'COMPRAS') {
            mount.innerHTML = this.renderPurchasesView(this.data.materiales);
        } else {
            mount.innerHTML = `<div class="p-20 text-center text-slate-400 animate-fadeIn italic">El módulo ${this.currentView} está bajo desarrollo técnico.</div>`;
        }
    }

    getVal(table, field) {
        if (this.editing.table === table && this.editing.item) {
            return this.editing.item[field] !== undefined ? this.editing.item[field] : '';
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
                        <label class="text-[10px] font-bold text-slate-400">CÓDIGO (12 dígitos auto)</label>
                        <input name="codigo" value="${this.getVal('materiales', 'codigo')}" placeholder="Automático" class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400">DESCRIPCIÓN</label>
                        <input name="descripcion" required value="${this.getVal('materiales', 'descripcion')}" placeholder="Descripción del material" class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
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
                    <td class="p-3 font-mono text-[11px] font-bold text-slate-700">${m.codigo}</td><td class="p-3">${m.descripcion}</td><td class="p-3 font-mono text-blue-600">$${m.precio_un}</td><td class="p-3">${m.en_stock}</td>
                `)}

                <!-- CLIENTES -->
                ${this.renderSection('clientes', 'CLIENTES', 'emerald', 'form-cliente', `
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400">CÓDIGO (C-XXXXXX)</label>
                        <input name="cod_cliente" value="${this.getVal('clientes', 'cod_cliente')}" placeholder="Automático" class="p-2 bg-white border border-slate-300 rounded">
                    </div>
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-[10px] font-bold text-slate-400">RAZÓN SOCIAL</label>
                        <input name="razon_social" required value="${this.getVal('clientes', 'razon_social')}" placeholder="Nombre de empresa" class="p-2 bg-white border border-slate-300 rounded">
                    </div>
                `, filter(this.data.clientes, this.filters.clientes, ['cod_cliente', 'razon_social']), (c) => `
                    <td class="p-3 font-bold text-slate-700">${c.cod_cliente}</td><td class="p-3">${c.razon_social}</td><td class="p-3 italic text-slate-400">-</td><td class="p-3 italic text-slate-400">-</td>
                `)}

                <!-- OF -->
                ${this.renderSection('ord_fabricaciones', 'ORDENES DE FABRICACIÓN (OF)', 'amber', 'form-of', `
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400">Nº OF (OF-XXXXXX)</label>
                        <input name="of" value="${this.getVal('ord_fabricaciones', 'of')}" placeholder="Automático" class="p-2 bg-white border border-slate-300 rounded">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400">DESCRIPCIÓN</label>
                        <input name="descripcion_of" required value="${this.getVal('ord_fabricaciones', 'descripcion_of')}" placeholder="Proyecto / Detalle" class="p-2 bg-white border border-slate-300 rounded">
                    </div>
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-[10px] font-bold text-slate-400">CLIENTE VINCULADO</label>
                        <select name="cod_cliente" required class="p-2 bg-white border border-slate-300 rounded">
                            <option value="">Seleccionar Cliente...</option>
                            ${this.data.clientes.map(c => `<option value="${c.cod_cliente}" ${this.getVal('ord_fabricaciones', 'cod_cliente') === c.cod_cliente ? 'selected' : ''}>${c.cod_cliente} - ${c.razon_social}</option>`).join('')}
                        </select>
                    </div>
                `, filter(this.data.ofs, this.filters.ofs, ['of', 'descripcion_of']), (o) => `
                    <td class="p-3 font-bold text-slate-700">${o.of}</td><td class="p-3">${o.descripcion_of}</td><td class="p-3 text-blue-600 font-medium">${o.cod_cliente}</td><td class="p-3 italic text-slate-400">-</td>
                `)}

                <!-- OT -->
                ${this.renderSection('ord_trabajos', 'ORDENES DE TRABAJO (OT)', 'indigo', 'form-ot', `
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400">Nº OT (OT-XXXXXX)</label>
                        <input name="ot" value="${this.getVal('ord_trabajos', 'ot')}" placeholder="Automático" class="p-2 bg-white border border-slate-300 rounded">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400">DETALLE DE TRABAJO</label>
                        <input name="descripcion_ot" required value="${this.getVal('ord_trabajos', 'descripcion_ot')}" placeholder="Tarea específica" class="p-2 bg-white border border-slate-300 rounded">
                    </div>
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-[10px] font-bold text-slate-400">OF VINCULADA</label>
                        <select name="ofabricaciones" required class="p-2 bg-white border border-slate-300 rounded">
                            <option value="">Seleccionar Orden de Fabricación...</option>
                            ${this.data.ofs.map(f => `<option value="${f.of}" ${this.getVal('ord_trabajos', 'ofabricaciones') === f.of ? 'selected' : ''}>${f.of} - ${f.descripcion_of}</option>`).join('')}
                        </select>
                    </div>
                `, filter(this.data.ots, this.filters.ots, ['ot', 'descripcion_ot']), (t) => `
                    <td class="p-3 font-bold text-slate-700">${t.ot}</td><td class="p-3">${t.descripcion_ot}</td><td class="p-3 font-mono text-indigo-600 font-bold">${t.ofabricaciones}</td><td class="p-3 italic text-slate-400">-</td>
                `)}
            </div>
        `;
    }

    renderSection(key, title, color, formId, formFields, list, rowTemplate) {
        const isEditing = this.editing.table === key;
        return `
            <section class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-fadeIn">
                <div class="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span class="w-2 h-6 bg-${color}-500 rounded"></span> ${title}
                    </h3>
                    <div class="relative">
                        <input type="text" placeholder="Buscar..." oninput="app.setFilter('${key}', this.value)" value="${this.filters[key] || ''}" class="pl-4 pr-10 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-blue-500 w-64">
                        <span class="absolute right-3 top-2 text-slate-400">🔍</span>
                    </div>
                </div>
                <form id="${formId}" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
                    ${formFields}
                    <div class="md:col-span-4 flex gap-3 mt-2">
                        <button type="submit" class="flex-1 bg-${isEditing ? 'amber' : 'blue'}-600 text-white p-2.5 rounded-lg font-bold shadow-md hover:opacity-90 transition-all uppercase tracking-wider">
                            ${isEditing ? '💾 Guardar Cambios' : '➕ Crear Registro'}
                        </button>
                        ${isEditing ? `<button type="button" onclick="app.cancelEdit()" class="px-8 bg-white border border-slate-300 text-slate-600 rounded-lg font-bold hover:bg-slate-100">CANCELAR</button>` : ''}
                    </div>
                </form>
                <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b">
                            <tr>
                                <th class="p-4">Dato Principal</th>
                                <th class="p-4">Descripción / Proyecto</th>
                                <th class="p-4">Vinculación</th>
                                <th class="p-4">Estado / Stock</th>
                                <th class="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${list.length === 0 ? `<tr><td colspan="5" class="p-10 text-center text-slate-400 italic">No hay registros disponibles.</td></tr>` : ''}
                            ${list.map(item => `
                                <tr class="hover:bg-slate-50 transition-colors">
                                    ${rowTemplate(item)}
                                    <td class="p-4 text-right space-x-1">
                                        <button onclick='app.startEdit("${key}", ${JSON.stringify(item).replace(/'/g, "&apos;")})' class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">✏️</button>
                                        <button onclick="app.deleteRecord('${key}', '${item.id}')" class="p-2 text-rose-600 hover:bg-rose-50 rounded-lg" title="Eliminar">🗑️</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </section>
        `;
    }

    renderPurchasesView(materials) {
        return `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
                <div class="p-6 bg-slate-50 border-b flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-slate-800 uppercase tracking-tighter">Inventario / Compras</h3>
                        <p class="text-xs text-slate-500">Actualización rápida de stock y precios unitarios.</p>
                    </div>
                </div>
                <table class="w-full text-left border-collapse">
                    <thead class="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                        <tr>
                            <th class="p-4 border-b">CÓDIGO (12D)</th>
                            <th class="p-4 border-b">DESCRIPCIÓN</th>
                            <th class="p-4 border-b text-right">PRECIO UN ($)</th>
                            <th class="p-4 border-b text-right">STOCK</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${materials.map(m => `
                            <tr class="hover:bg-slate-50">
                                <td class="p-4 font-mono text-[11px] font-bold text-slate-800">${m.codigo}</td>
                                <td class="p-4 text-slate-600 text-sm">${m.descripcion}</td>
                                <td class="p-4 text-right">
                                    <input type="number" min="0" step="0.01" value="${m.precio_un}" 
                                        onchange="app.updateMaterialField('${m.id}', 'precio_un', this.value, '${m.codigo}')"
                                        class="w-28 p-1.5 bg-white border border-slate-200 rounded-md text-right font-mono focus:ring-2 focus:ring-blue-400 outline-none">
                                </td>
                                <td class="p-4 text-right">
                                    <input type="number" min="0" value="${m.en_stock}" 
                                        onchange="app.updateMaterialField('${m.id}', 'en_stock', this.value, '${m.codigo}')"
                                        class="w-24 p-1.5 bg-white border border-slate-200 rounded-md text-right focus:ring-2 focus:ring-blue-400 outline-none">
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    startEdit(table, item) {
        // Bloquear recargas automáticas mientras se edita
        this.editing = { table, id: item.id, item: { ...item } };
        this.render();
        // Scroll suave al formulario
        const form = document.getElementById(this.getFormId(table));
        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    getFormId(table) {
        const map = { materiales: 'form-material', clientes: 'form-cliente', ord_fabricaciones: 'form-of', ord_trabajos: 'form-ot' };
        return map[table];
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
        if (!confirm("¿Eliminar este registro de forma permanente?")) return;
        const { error } = await this.supabase.from(table).delete().eq('id', id);
        if (!error) {
            this.showToast("Registro eliminado");
            this.editing = { table: null, id: null, item: null }; // Reset por si acaso
            await this.refreshData();
        } else {
            alert("No se puede eliminar: El registro tiene vinculaciones activas en otras tablas.");
        }
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
                
                // Si el código está vacío, permitimos que Supabase use la secuencia DEFAULT
                const codeKeys = ['codigo', 'cod_cliente', 'of', 'ot'];
                codeKeys.forEach(k => {
                    if (!formData[k] && !this.editing.id) delete formData[k];
                });

                const data = f.transform ? f.transform(formData) : formData;

                let res;
                if (this.editing.table === f.table && this.editing.id) {
                    res = await this.supabase.from(f.table).update(data).eq('id', this.editing.id);
                } else {
                    res = await this.supabase.from(f.table).insert([data]);
                }

                if (!res.error) {
                    this.showToast("Datos Sincronizados");
                    this.editing = { table: null, id: null, item: null };
                    await this.refreshData();
                } else {
                    alert("Error en Base de Datos: " + res.error.message);
                }
            };
        });
    }

    async updateMaterialField(id, field, value, codigo) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
            this.showToast("Valor No Válido");
            await this.refreshData();
            return;
        }
        const obj = {}; obj[field] = numValue;
        const { error } = await this.supabase.from('materiales').update(obj).eq('id', id);
        if (!error) {
            this.showToast(`Material ${codigo} actualizado`);
            // Solo actualizamos localmente para no disparar render completo
            const mat = this.data.materiales.find(m => m.id === id);
            if (mat) mat[field] = numValue;
        } else {
            this.showToast("Error de Red");
            await this.refreshData();
        }
    }

    showToast(msg) {
        const t = document.getElementById('toast');
        const m = document.getElementById('toast-msg');
        if (!t || !m) return;
        m.innerText = msg;
        t.style.opacity = '1';
        t.style.transform = 'translateY(0)';
        setTimeout(() => { 
            t.style.opacity = '0'; 
            t.style.transform = 'translateY(24px)'; 
        }, 3000);
    }
}

window.app = new AppController();
