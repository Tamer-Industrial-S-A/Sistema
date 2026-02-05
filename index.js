
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// CONFIGURACIÓN - REEMPLAZA CON TUS DATOS DE SUPABASE
const SUPABASE_URL = 'https://rlyjyjbafslewjlgfzeb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseWp5amJhZnNsZXdqbGdmemViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTE0MTcsImV4cCI6MjA4NTYyNzQxN30.VaV5NMIRkAIATuxYw5kmiRsiaxhU_2varz0HRmNBW-0';

class AppController {
    constructor() {
        this.currentView = 'BASE_DE_DATOS';
        this.supabase = null;
        this.data = { materiales: [], clientes: [], ofs: [], ots: [] };
        this.filters = { materiales: '', clientes: '', ofs: '', ots: '' };
        this.editing = { table: null, id: null };
        this.initSupabase();
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
            dot.className = 'w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]';
            text.innerText = 'Sincronizado';
        } else {
            dot.className = 'w-2 h-2 rounded-full bg-rose-500';
            text.innerText = 'Sin conexión';
        }
    }

    setView(viewName) {
        this.currentView = viewName;
        const titleEl = document.getElementById('view-title');
        if (titleEl) titleEl.innerText = viewName.replace(/_/g, ' ');
        
        document.querySelectorAll('.sidebar-item').forEach(btn => {
            btn.classList.remove('active', 'bg-slate-800', 'text-white');
            if (btn.id === `btn-${viewName}`) btn.classList.add('active', 'bg-slate-800', 'text-white');
        });
        this.render();
    }

    async fetchTable(tableName) {
        try {
            const { data, error } = await this.supabase.from(tableName).select('*').order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    async render() {
        const mount = document.getElementById('content-mount');
        if (!mount) return;

        if (this.currentView === 'BASE_DE_DATOS') {
            this.data.materiales = await this.fetchTable('materiales');
            this.data.clientes = await this.fetchTable('clientes');
            this.data.ofs = await this.fetchTable('ord_fabricaciones');
            this.data.ots = await this.fetchTable('ord_trabajos');
            mount.innerHTML = this.renderMasterDatabase();
            this.attachMasterListeners();
        } else if (this.currentView === 'COMPRAS') {
            this.data.materiales = await this.fetchTable('materiales');
            mount.innerHTML = this.renderPurchasesView(this.data.materiales);
        } else {
            mount.innerHTML = this.renderPlaceholder();
        }
    }

    renderMasterDatabase() {
        const filterData = (list, query, keys) => {
            if (!query) return list;
            const q = query.toLowerCase();
            return list.filter(item => keys.some(key => String(item[key] || '').toLowerCase().includes(q)));
        };

        const fMaterials = filterData(this.data.materiales, this.filters.materiales, ['codigo', 'descripcion']);
        const fClients = filterData(this.data.clientes, this.filters.clientes, ['cod_cliente', 'razon_social']);
        const fOfs = filterData(this.data.ofs, this.filters.ofs, ['of', 'descripcion_of', 'cod_cliente']);
        const fOts = filterData(this.data.ots, this.filters.ots, ['ot', 'descripcion_ot', 'ofabricaciones']);

        return `
            <div class="space-y-12 animate-fadeIn pb-20">
                ${this.renderSection('materiales', 'MATERIALES', 'blue', 'form-material', `
                    <input name="codigo" required placeholder="CÓDIGO" class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                    <input name="descripcion" required placeholder="DESCRIPCIÓN" class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                    <input name="precio_un" required type="number" min="0" step="0.01" placeholder="PRECIO UN." class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                    <input name="en_stock" required type="number" min="0" placeholder="STOCK" class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                `, fMaterials, ['Código', 'Descripción', 'Precio', 'Stock'], (m) => `
                    <td class="p-3 font-bold text-slate-800">${m.codigo}</td>
                    <td class="p-3 text-slate-600">${m.descripcion}</td>
                    <td class="p-3 text-slate-800 font-mono">$${parseFloat(m.precio_un).toFixed(2)}</td>
                    <td class="p-3 text-slate-800">${m.en_stock}</td>
                `)}

                ${this.renderSection('clientes', 'CLIENTES', 'emerald', 'form-cliente', `
                    <input name="cod_cliente" required placeholder="CÓDIGO CLIENTE" class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                    <input name="razon_social" required placeholder="RAZÓN SOCIAL" class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                `, fClients, ['Código', 'Razón Social'], (c) => `
                    <td class="p-3 font-bold text-slate-800">${c.cod_cliente}</td>
                    <td class="p-3 text-slate-600">${c.razon_social}</td>
                `)}

                ${this.renderSection('ord_fabricaciones', 'ORDENES DE FABRICACIÓN (OF)', 'amber', 'form-of', `
                    <input name="of" required placeholder="NÚMERO OF" class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                    <input name="descripcion_of" required placeholder="DESCRIPCIÓN" class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                    <select name="cod_cliente" required class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Seleccionar Cliente...</option>
                        ${this.data.clientes.map(c => `<option value="${c.cod_cliente}">${c.razon_social}</option>`).join('')}
                    </select>
                `, fOfs, ['OF', 'Descripción', 'Cliente'], (o) => `
                    <td class="p-3 font-bold text-slate-800">${o.of}</td>
                    <td class="p-3 text-slate-600">${o.descripcion_of}</td>
                    <td class="p-3 text-blue-600 font-medium">${o.cod_cliente}</td>
                `)}

                ${this.renderSection('ord_trabajos', 'ORDENES DE TRABAJO (OT)', 'indigo', 'form-ot', `
                    <input name="ot" required placeholder="NÚMERO OT" class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                    <input name="descripcion_ot" required placeholder="DETALLE" class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                    <select name="ofabricaciones" required class="p-2 bg-white text-slate-900 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Vincular a OF...</option>
                        ${this.data.ofs.map(f => `<option value="${f.of}">${f.of} - ${f.descripcion_of}</option>`).join('')}
                    </select>
                `, fOts, ['OT', 'Descripción', 'OF Vinculada'], (t) => `
                    <td class="p-3 font-bold text-slate-800">${t.ot}</td>
                    <td class="p-3 text-slate-600">${t.descripcion_ot}</td>
                    <td class="p-3 font-mono text-indigo-600 font-medium">${t.ofabricaciones}</td>
                `)}
            </div>
        `;
    }

    renderSection(key, title, color, formId, formFields, list, headers, rowTemplate) {
        const isEditing = this.editing.table === key;
        const filterVal = this.filters[key] || '';
        
        return `
            <section class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b pb-4">
                    <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span class="w-2 h-6 bg-${color}-500 rounded"></span> ${title}
                    </h3>
                    <div class="relative max-w-xs w-full">
                        <input type="text" placeholder="Buscar..." value="${filterVal}" oninput="app.setFilter('${key}', this.value)" class="w-full pl-9 pr-4 py-2 bg-slate-50 text-sm text-slate-900 border border-slate-200 rounded-full focus:ring-2 focus:ring-blue-500 outline-none">
                        <span class="absolute left-3 top-2.5">🔍</span>
                    </div>
                </div>

                <form id="${formId}" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    ${formFields}
                    <div class="md:col-span-4 flex gap-2">
                        <button type="submit" class="flex-1 bg-${isEditing ? 'amber' : 'blue'}-600 text-white p-2 rounded font-bold hover:bg-${isEditing ? 'amber' : 'blue'}-700 transition-colors">
                            ${isEditing ? '✓ ACTUALIZAR REGISTRO' : '+ AÑADIR REGISTRO'}
                        </button>
                        ${isEditing ? `<button type="button" onclick="app.cancelEdit()" class="px-4 bg-slate-200 text-slate-700 p-2 rounded font-bold hover:bg-slate-300">CANCELAR</button>` : ''}
                    </div>
                </form>

                <div class="overflow-x-auto border rounded-xl">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-slate-50 text-slate-500 uppercase text-xs">
                            <tr>
                                ${headers.map(h => `<th class="p-3">${h}</th>`).join('')}
                                <th class="p-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${list.length === 0 ? `<tr><td colspan="${headers.length + 1}" class="p-8 text-center text-slate-400 italic">Sin resultados.</td></tr>` : ''}
                            ${list.map((item, idx) => {
                                // Guardamos el objeto en una variable temporal para evitar problemas de escape en el HTML
                                const itemStr = btoa(unescape(encodeURIComponent(JSON.stringify(item))));
                                return `
                                    <tr class="border-t hover:bg-slate-50 transition-colors">
                                        ${rowTemplate(item)}
                                        <td class="p-3 text-right space-x-2">
                                            <button onclick="app.handleEditBtn('${key}', '${itemStr}')" class="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Editar">✏️</button>
                                            <button onclick="app.deleteRecord('${key}', '${item.id}')" class="text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors" title="Eliminar">🗑️</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </section>
        `;
    }

    renderPurchasesView(materials) {
        return `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
                <div class="p-6 bg-slate-50 border-b">
                    <h3 class="font-bold text-slate-800">Compras / Inventario</h3>
                    <p class="text-xs text-slate-500">Edición rápida de precios y stock con confirmación.</p>
                </div>
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
                            <tr class="hover:bg-slate-50 border-b last:border-0">
                                <td class="p-4 font-bold text-slate-800">${m.codigo}</td>
                                <td class="p-4 text-slate-700">${m.descripcion}</td>
                                <td class="p-4">
                                    <input type="number" min="0" step="0.01" value="${m.precio_un}" 
                                        onchange="app.updateMaterialField('${m.id}', 'precio_un', this.value, '${m.codigo}')"
                                        class="w-24 p-1 bg-white text-slate-900 border border-slate-300 rounded text-right focus:ring-2 focus:ring-blue-400 outline-none">
                                </td>
                                <td class="p-4">
                                    <input type="number" min="0" value="${m.en_stock}" 
                                        onchange="app.updateMaterialField('${m.id}', 'en_stock', this.value, '${m.codigo}')"
                                        class="w-24 p-1 bg-white text-slate-900 border border-slate-300 rounded text-right focus:ring-2 focus:ring-blue-400 outline-none">
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderPlaceholder() {
        return `<div class="p-20 text-center text-slate-400 animate-fadeIn italic">El módulo ${this.currentView.replace(/_/g, ' ')} se encuentra actualmente en desarrollo. Por favor, utilice el módulo de GESTIÓN DE REGISTROS.</div>`;
    }

    // --- ACCIONES DE DATOS ---
    setFilter(key, value) {
        this.filters[key] = value;
        if (this._filterTimeout) clearTimeout(this._filterTimeout);
        this._filterTimeout = setTimeout(() => this.render(), 150);
    }

    handleEditBtn(tableKey, encodedItem) {
        try {
            const item = JSON.parse(decodeURIComponent(escape(atob(encodedItem))));
            this.startEdit(tableKey, item);
        } catch(e) { console.error("Error al decodificar item para editar", e); }
    }

    startEdit(tableKey, item) {
        this.editing = { table: tableKey, id: item.id };
        this.render();
        const formId = this.getFormId(tableKey);
        const form = document.getElementById(formId);
        if (form) {
            Object.keys(item).forEach(key => {
                if (form.elements[key]) form.elements[key].value = item[key];
            });
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    cancelEdit() {
        this.editing = { table: null, id: null };
        this.render();
    }

    async deleteRecord(table, id) {
        if (!confirm('¿CONFIRMAR ELIMINACIÓN? Esta acción borrará el registro de forma permanente en la base de datos.')) return;
        const { error } = await this.supabase.from(table).delete().eq('id', id);
        if (!error) {
            this.showToast('Registro eliminado exitosamente');
            this.render();
        } else {
            this.showToast('Error: El registro podría estar siendo usado en otra tabla.');
        }
    }

    getFormId(tableKey) {
        const map = { 'materiales': 'form-material', 'clientes': 'form-cliente', 'ord_fabricaciones': 'form-of', 'ord_trabajos': 'form-ot' };
        return map[tableKey] || '';
    }

    attachMasterListeners() {
        const forms = [
            { id: 'form-material', table: 'materiales', transform: (d) => ({ ...d, precio_un: parseFloat(d.precio_un), en_stock: parseInt(d.en_stock) }) },
            { id: 'form-cliente', table: 'clientes' },
            { id: 'form-of', table: 'ord_fabricaciones' },
            { id: 'form-ot', table: 'ord_trabajos' }
        ];

        forms.forEach(f => {
            const form = document.getElementById(f.id);
            if (!form) return;
            form.onsubmit = async (e) => {
                e.preventDefault();
                const raw = Object.fromEntries(new FormData(form).entries());
                const data = f.transform ? f.transform(raw) : raw;
                
                let res;
                if (this.editing.table === f.table && this.editing.id) {
                    res = await this.supabase.from(f.table).update(data).eq('id', this.editing.id);
                } else {
                    res = await this.supabase.from(f.table).insert([data]);
                }

                if (!res.error) {
                    this.showToast(this.editing.id ? 'Cambios guardados correctamente' : 'Nuevo registro creado');
                    this.editing = { table: null, id: null };
                    form.reset();
                    this.render();
                } else {
                    this.showToast('Error al procesar: ' + res.error.message);
                }
            };
        });
    }

    async updateMaterialField(id, field, value, codigo) {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
            this.showToast('Error: No se permiten valores negativos');
            this.render();
            return;
        }
        const label = field === 'precio_un' ? 'PRECIO' : 'STOCK';
        if (!confirm(`¿Actualizar ${label} del material ${codigo} a ${value}?`)) {
            this.render();
            return;
        }
        const obj = {}; obj[field] = numValue;
        const { error } = await this.supabase.from('materiales').update(obj).eq('id', id);
        if (!error) this.showToast('Sincronización exitosa');
        else { this.showToast('Error de red'); this.render(); }
    }

    showToast(msg) {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toast-msg');
        if (!toast || !toastMsg) return;
        toastMsg.innerText = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(24px)'; }, 2800);
    }
}

window.app = new AppController();
