
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://rlyjyjbafslewjlgfzeb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseWp5amJhZnNsZXdqbGdmemViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTE0MTcsImV4cCI6MjA4NTYyNzQxN30.VaV5NMIRkAIATuxYw5kmiRsiaxhU_2varz0HRmNBW-0';

class AppController {
    constructor() {
        this.currentView = 'BASE_DE_DATOS';
        this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        this.data = { materiales: [], clientes: [], ofs: [], ots: [], cotizaciones: [] };
        this.filters = { materiales: '', clientes: '', ofs: '', ots: '' };
        this.editing = { table: null, id: null, item: null };
        
        // Estado para la cotización en curso
        this.draftQuote = {
            ot: '',
            items: [] // { id_material, codigo, descripcion, precio_un, cantidad, subtotal }
        };

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
        this.data.cotizaciones = await fetchTable('cotizaciones');
        
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
        } else if (this.currentView === 'AUTOMATIZACION') {
            mount.innerHTML = this.renderAutomationView();
        } else {
            mount.innerHTML = `<div class="p-20 text-center text-slate-400 animate-fadeIn italic">El módulo ${this.currentView} está bajo desarrollo técnico.</div>`;
        }
    }

    // --- MÓDULO AUTOMATIZACIÓN (COTIZACIONES) ---

    renderAutomationView() {
        const selectedOT = this.data.ots.find(o => o.ot === this.draftQuote.ot);
        const relatedOF = selectedOT ? this.data.ofs.find(f => f.of === selectedOT.ofabricaciones) : null;
        const relatedClient = relatedOF ? this.data.clientes.find(c => c.cod_cliente === relatedOF.cod_cliente) : null;

        const totalCotizacion = this.draftQuote.items.reduce((acc, item) => acc + item.subtotal, 0);

        return `
            <div class="space-y-8 animate-fadeIn pb-20">
                <div class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div class="flex items-center gap-4 mb-8">
                        <div class="p-3 bg-blue-500 rounded-xl text-white">📑</div>
                        <div>
                            <h3 class="text-xl font-bold text-slate-800">Generador de Cotizaciones</h3>
                            <p class="text-xs text-slate-500 uppercase tracking-widest font-semibold">Selección de OT y Materiales</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <div class="flex flex-col gap-1">
                            <label class="text-[10px] font-bold text-slate-400">SELECCIONAR ORDEN DE TRABAJO (OT)</label>
                            <select onchange="app.updateQuoteOT(this.value)" class="p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold">
                                <option value="">Seleccionar OT...</option>
                                ${this.data.ots.map(o => `<option value="${o.ot}" ${this.draftQuote.ot === o.ot ? 'selected' : ''}>${o.ot} - ${o.descripcion_ot}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-[10px] font-bold text-slate-400">OF VINCULADA</label>
                            <input disabled value="${relatedOF ? relatedOF.of + ' - ' + relatedOF.descripcion_of : 'N/A'}" class="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 italic">
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-[10px] font-bold text-slate-400">CLIENTE</label>
                            <input disabled value="${relatedClient ? relatedClient.razon_social : 'N/A'}" class="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 italic">
                        </div>
                    </div>

                    <div class="mb-6">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="text-sm font-bold text-slate-700">LISTADO DE MATERIALES</h4>
                            <div class="flex gap-2">
                                <select id="material-picker" class="p-2 text-sm bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]">
                                    <option value="">Añadir Material...</option>
                                    ${this.data.materiales.map(m => `<option value="${m.id}">${m.codigo} - ${m.descripcion} ($${m.precio_un})</option>`).join('')}
                                </select>
                                <button onclick="app.addMaterialToQuote()" class="bg-blue-600 text-white px-4 rounded-lg font-bold text-sm hover:bg-blue-700 transition-all">AÑADIR</button>
                            </div>
                        </div>

                        <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <table class="w-full text-sm text-left">
                                <thead class="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b">
                                    <tr>
                                        <th class="p-4">CÓDIGO</th>
                                        <th class="p-4">DESCRIPCIÓN</th>
                                        <th class="p-4 text-right">PRECIO UNIT.</th>
                                        <th class="p-4 text-center">CANTIDAD</th>
                                        <th class="p-4 text-right">SUBTOTAL</th>
                                        <th class="p-4 text-right">ACCIONES</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${this.draftQuote.items.length === 0 ? `<tr><td colspan="6" class="p-10 text-center text-slate-400 italic">No se han añadido materiales aún.</td></tr>` : ''}
                                    ${this.draftQuote.items.map((item, index) => `
                                        <tr class="hover:bg-slate-50 transition-colors">
                                            <td class="p-4 font-mono text-[11px] font-bold text-slate-700">${item.codigo}</td>
                                            <td class="p-4">${item.descripcion}</td>
                                            <td class="p-4 text-right font-mono">$${item.precio_un.toFixed(2)}</td>
                                            <td class="p-4 text-center">
                                                <input type="number" min="1" value="${item.cantidad}" onchange="app.updateQuoteItemQty(${index}, this.value)" 
                                                    class="w-20 p-1 text-center bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-400 outline-none">
                                            </td>
                                            <td class="p-4 text-right font-bold text-blue-600 font-mono">$${item.subtotal.toFixed(2)}</td>
                                            <td class="p-4 text-right">
                                                <button onclick="app.removeMaterialFromQuote(${index})" class="p-2 text-rose-600 hover:bg-rose-50 rounded-lg">🗑️</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot class="bg-slate-900 text-white font-bold">
                                    <tr>
                                        <td colspan="4" class="p-4 text-right uppercase tracking-widest text-xs">Total Materiales</td>
                                        <td class="p-4 text-right text-lg font-mono">$${totalCotizacion.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 pt-6 border-t">
                        <button onclick="app.clearDraftQuote()" class="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-all">DESCARTAR</button>
                        <button onclick="app.saveQuote()" class="px-8 py-2.5 bg-emerald-600 text-white rounded-lg font-bold shadow-lg hover:bg-emerald-700 transition-all uppercase tracking-wider">
                            💾 Guardar Cotización
                        </button>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span class="w-2 h-6 bg-slate-400 rounded"></span> Historial de Cotizaciones
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${this.data.cotizaciones.map(q => `
                            <div class="p-4 border border-slate-100 bg-slate-50 rounded-xl hover:shadow-md transition-all cursor-default relative group">
                                <button onclick="app.deleteQuote('${q.id}')" class="absolute top-2 right-2 p-2 bg-white rounded-lg text-rose-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>
                                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cotización #${q.id.slice(0,8)}</div>
                                <div class="text-sm font-bold text-slate-800 mb-2">OT: ${q.ot_codigo}</div>
                                <div class="flex justify-between items-end border-t border-slate-200 pt-2 mt-2">
                                    <div class="text-[10px] text-slate-500">${new Date(q.created_at).toLocaleDateString()}</div>
                                    <div class="text-lg font-mono font-bold text-blue-600">$${parseFloat(q.total_mats || 0).toFixed(2)}</div>
                                </div>
                            </div>
                        `).join('')}
                        ${this.data.cotizaciones.length === 0 ? '<div class="col-span-3 text-center p-10 text-slate-400 italic">No hay cotizaciones guardadas.</div>' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    updateQuoteOT(ot) {
        this.draftQuote.ot = ot;
        this.render();
    }

    addMaterialToQuote() {
        const select = document.getElementById('material-picker');
        const id = select.value;
        if (!id) return;

        const mat = this.data.materiales.find(m => m.id === id);
        if (!mat) return;

        // Evitar duplicados
        const exists = this.draftQuote.items.find(i => i.id_material === id);
        if (exists) {
            exists.cantidad += 1;
            exists.subtotal = exists.cantidad * exists.precio_un;
        } else {
            this.draftQuote.items.push({
                id_material: mat.id,
                codigo: mat.codigo,
                descripcion: mat.descripcion,
                precio_un: parseFloat(mat.precio_un),
                cantidad: 1,
                subtotal: parseFloat(mat.precio_un)
            });
        }
        
        select.value = "";
        this.render();
    }

    updateQuoteItemQty(index, qty) {
        const q = parseInt(qty);
        if (isNaN(q) || q < 1) return;
        this.draftQuote.items[index].cantidad = q;
        this.draftQuote.items[index].subtotal = q * this.draftQuote.items[index].precio_un;
        this.render();
    }

    removeMaterialFromQuote(index) {
        this.draftQuote.items.splice(index, 1);
        this.render();
    }

    clearDraftQuote() {
        if (confirm("¿Estás seguro de limpiar la cotización actual?")) {
            this.draftQuote = { ot: '', items: [] };
            this.render();
        }
    }

    async saveQuote() {
        if (!this.draftQuote.ot) {
            alert("Debe seleccionar una OT vinculada.");
            return;
        }
        if (this.draftQuote.items.length === 0) {
            alert("Debe añadir al menos un material.");
            return;
        }

        const total = this.draftQuote.items.reduce((acc, i) => acc + i.subtotal, 0);

        const { data, error } = await this.supabase.from('cotizaciones').insert([{
            ot_codigo: this.draftQuote.ot,
            total_mats: total,
            items_json: this.draftQuote.items
        }]);

        if (!error) {
            this.showToast("Cotización guardada");
            this.draftQuote = { ot: '', items: [] };
            await this.refreshData();
        } else {
            alert("Error al guardar cotización: " + error.message);
        }
    }

    async deleteQuote(id) {
        if (!confirm("¿Eliminar esta cotización del historial?")) return;
        const { error } = await this.supabase.from('cotizaciones').delete().eq('id', id);
        if (!error) {
            this.showToast("Cotización eliminada");
            await this.refreshData();
        }
    }

    // --- FIN MÓDULO AUTOMATIZACIÓN ---

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
                    <div class="flex flex-col gap-1 md:col-span-2">
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
                `, ['CÓDIGO', 'DESCRIPCIÓN', 'PRECIO', 'STOCK'], filter(this.data.materiales, this.filters.materiales, ['codigo', 'descripcion']), (m) => `
                    <td class="p-3 font-mono text-[11px] font-bold text-slate-700">${m.codigo}</td>
                    <td class="p-3">${m.descripcion}</td>
                    <td class="p-3 font-mono text-blue-600">$${m.precio_un}</td>
                    <td class="p-3">${m.en_stock}</td>
                `)}

                <!-- CLIENTES -->
                ${this.renderSection('clientes', 'CLIENTES', 'emerald', 'form-cliente', `
                    <div class="flex flex-col gap-1 md:col-span-4">
                        <label class="text-[10px] font-bold text-slate-400">RAZÓN SOCIAL</label>
                        <input name="razon_social" required value="${this.getVal('clientes', 'razon_social')}" placeholder="Nombre completo o empresa" class="p-2 bg-white border border-slate-300 rounded">
                    </div>
                `, ['CÓDIGO CLIENTE', 'RAZÓN SOCIAL'], filter(this.data.clientes, this.filters.clientes, ['cod_cliente', 'razon_social']), (c) => `
                    <td class="p-3 font-bold text-slate-700">${c.cod_cliente}</td>
                    <td class="p-3">${c.razon_social}</td>
                `)}

                <!-- OF -->
                ${this.renderSection('ord_fabricaciones', 'ORDENES DE FABRICACIÓN (OF)', 'amber', 'form-of', `
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-[10px] font-bold text-slate-400">DESCRIPCIÓN DEL PROYECTO</label>
                        <input name="descripcion_of" required value="${this.getVal('ord_fabricaciones', 'descripcion_of')}" placeholder="Detalle del proyecto" class="p-2 bg-white border border-slate-300 rounded">
                    </div>
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-[10px] font-bold text-slate-400">CLIENTE VINCULADO</label>
                        <select name="cod_cliente" required class="p-2 bg-white border border-slate-300 rounded">
                            <option value="">Seleccionar Cliente...</option>
                            ${this.data.clientes.map(c => `<option value="${c.cod_cliente}" ${this.getVal('ord_fabricaciones', 'cod_cliente') === c.cod_cliente ? 'selected' : ''}>${c.cod_cliente} - ${c.razon_social}</option>`).join('')}
                        </select>
                    </div>
                `, ['Nº OF', 'PROYECTO / DESCRIPCIÓN', 'CLIENTE VINCULADO'], filter(this.data.ofs, this.filters.ofs, ['of', 'descripcion_of']), (o) => `
                    <td class="p-3 font-bold text-slate-700">${o.of}</td>
                    <td class="p-3">${o.descripcion_of}</td>
                    <td class="p-3 text-blue-600 font-medium">${o.cod_cliente}</td>
                `)}

                <!-- OT -->
                ${this.renderSection('ord_trabajos', 'ORDENES DE TRABAJO (OT)', 'indigo', 'form-ot', `
                    <div class="flex flex-col gap-1 md:col-span-2">
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
                `, ['Nº OT', 'TAREA / DETALLE', 'OF VINCULADA'], filter(this.data.ots, this.filters.ots, ['ot', 'descripcion_ot']), (t) => `
                    <td class="p-3 font-bold text-slate-700">${t.ot}</td>
                    <td class="p-3">${t.descripcion_ot}</td>
                    <td class="p-3 font-mono text-indigo-600 font-bold">${t.ofabricaciones}</td>
                `)}
            </div>
        `;
    }

    renderSection(key, title, color, formId, formFields, headers, list, rowTemplate) {
        const isEditing = this.editing.table === key;
        const totalCols = headers.length + 1;

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
                                ${headers.map(h => `<th class="p-4">${h}</th>`).join('')}
                                <th class="p-4 text-right">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${list.length === 0 ? `<tr><td colspan="${totalCols}" class="p-10 text-center text-slate-400 italic">No hay registros disponibles.</td></tr>` : ''}
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
                        <p class="text-xs text-slate-500">Actualice stock y precios. Requiere confirmación manual por fila.</p>
                    </div>
                </div>
                <table class="w-full text-left border-collapse">
                    <thead class="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                        <tr>
                            <th class="p-4 border-b">CÓDIGO (12D)</th>
                            <th class="p-4 border-b">DESCRIPCIÓN</th>
                            <th class="p-4 border-b text-right">PRECIO UN ($)</th>
                            <th class="p-4 border-b text-right">STOCK</th>
                            <th class="p-4 border-b text-right">ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${materials.map(m => `
                            <tr class="hover:bg-slate-50 transition-all">
                                <td class="p-4 font-mono text-[11px] font-bold text-slate-800">${m.codigo}</td>
                                <td class="p-4 text-slate-600 text-sm">${m.descripcion}</td>
                                <td class="p-4 text-right">
                                    <input type="number" id="price-${m.id}" min="0" step="0.01" value="${m.precio_un}" 
                                        class="w-28 p-1.5 bg-white border border-slate-200 rounded-md text-right font-mono focus:ring-2 focus:ring-blue-400 outline-none transition-all">
                                </td>
                                <td class="p-4 text-right">
                                    <input type="number" id="stock-${m.id}" min="0" value="${m.en_stock}" 
                                        class="w-24 p-1.5 bg-white border border-slate-200 rounded-md text-right focus:ring-2 focus:ring-blue-400 outline-none transition-all">
                                </td>
                                <td class="p-4 text-right">
                                    <button onclick="app.savePurchaseRow('${m.id}', '${m.codigo}')" 
                                        class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-md hover:bg-emerald-700 active:scale-95 transition-all">
                                        💾 GUARDAR
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async savePurchaseRow(id, codigo) {
        const priceInput = document.getElementById(`price-${id}`);
        const stockInput = document.getElementById(`stock-${id}`);
        
        const price = parseFloat(priceInput.value);
        const stock = parseInt(stockInput.value);

        if (isNaN(price) || isNaN(stock) || price < 0 || stock < 0) {
            this.showToast("Valores inválidos");
            return;
        }

        if (!confirm(`¿Confirma actualización de Material ${codigo}?\nPrecio: $${price}\nStock: ${stock}`)) return;

        const { error } = await this.supabase.from('materiales').update({
            precio_un: price,
            en_stock: stock
        }).eq('id', id);

        if (!error) {
            this.showToast("Sincronizado correctamente");
            // Actualización silenciosa de los datos locales
            const mat = this.data.materiales.find(m => m.id === id);
            if (mat) {
                mat.precio_un = price;
                mat.en_stock = stock;
            }
        } else {
            alert("Error al actualizar: " + error.message);
            await this.refreshData();
        }
    }

    startEdit(table, item) {
        this.editing = { table, id: item.id, item: { ...item } };
        this.render();
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
            this.editing = { table: null, id: null, item: null };
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
