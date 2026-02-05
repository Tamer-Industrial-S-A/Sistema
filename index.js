
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
        
        this.draftQuote = {
            ot: '',
            items: [] 
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
        const viewTitle = document.getElementById('view-title');
        if (viewTitle) viewTitle.innerText = viewName.replace(/_/g, ' ');
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
            if (error) {
                console.error(`Error en ${table}:`, error);
                return [];
            }
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

        const views = {
            'BASE_DE_DATOS': () => {
                mount.innerHTML = this.renderMasterDatabase();
                this.attachMasterListeners();
            },
            'COMPRAS': () => {
                mount.innerHTML = this.renderPurchasesView(this.data.materiales);
            },
            'AUTOMATIZACION': () => {
                mount.innerHTML = this.renderAutomationView();
                this.attachMasterListeners(); // Para el registro de materiales dentro de automatización
            },
            'TECNICA': () => { mount.innerHTML = this.renderPlaceholder('TECNICA'); },
            'PLANEAMIENTO': () => { mount.innerHTML = this.renderPlaceholder('PLANEAMIENTO'); },
            'PROYECTO': () => { mount.innerHTML = this.renderPlaceholder('PROYECTO'); },
            'CORTE_CON_AGUA': () => { mount.innerHTML = this.renderPlaceholder('CORTE CON AGUA'); },
            'TALLER': () => { mount.innerHTML = this.renderPlaceholder('TALLER'); }
        };

        if (views[this.currentView]) {
            views[this.currentView]();
        } else {
            mount.innerHTML = this.renderPlaceholder(this.currentView);
        }
    }

    renderPlaceholder(name) {
        return `<div class="p-20 text-center animate-fadeIn">
            <div class="text-slate-300 text-6xl mb-4">⚙️</div>
            <h3 class="text-xl font-bold text-slate-400">Módulo ${name}</h3>
            <p class="text-slate-400 italic mt-2">Este componente está siendo configurado según especificaciones técnicas.</p>
        </div>`;
    }

    // --- MÓDULO AUTOMATIZACIÓN (MATERIALES + COTIZACIONES) ---

    renderAutomationView() {
        const selectedOT = this.data.ots.find(o => o.ot === this.draftQuote.ot);
        const relatedOF = selectedOT ? this.data.ofs.find(f => f.of === selectedOT.ofabricaciones) : null;
        const relatedClient = relatedOF ? this.data.clientes.find(c => c.cod_cliente === relatedOF.cod_cliente) : null;
        const totalCotizacion = this.draftQuote.items.reduce((acc, item) => acc + item.subtotal, 0);

        return `
            <div class="space-y-12 animate-fadeIn pb-20">
                <!-- REGISTRO DE MATERIALES (REQUERIMIENTO ESPECÍFICO) -->
                <section class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-2 h-6 bg-blue-500 rounded"></div>
                        <h3 class="text-lg font-bold text-slate-800">ALTA DE NUEVOS MATERIALES</h3>
                    </div>
                    <form id="form-material" class="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <div class="flex flex-col gap-1 md:col-span-2">
                            <label class="text-[10px] font-bold text-slate-400">DESCRIPCIÓN</label>
                            <input name="descripcion" required placeholder="Nombre del material" class="p-2 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-[10px] font-bold text-slate-400">PRECIO UN.</label>
                            <input name="precio_un" required type="number" step="0.01" class="p-2 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-[10px] font-bold text-slate-400">EN STOCK</label>
                            <input name="en_stock" required type="number" class="p-2 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                        </div>
                        <div class="md:col-span-4 mt-2">
                            <button type="submit" class="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition-all uppercase text-xs tracking-widest shadow-lg">➕ Registrar Material</button>
                        </div>
                    </form>
                </section>

                <!-- GENERADOR DE COTIZACIONES -->
                <section class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div class="flex items-center gap-3 mb-8">
                        <div class="p-3 bg-emerald-500 rounded-xl text-white shadow-lg">📑</div>
                        <div>
                            <h3 class="text-xl font-bold text-slate-800">Generar Cotización</h3>
                            <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Documentación de Costos</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
                        <div class="flex flex-col gap-1">
                            <label class="text-[10px] font-bold text-slate-400 tracking-tighter">ORDEN DE TRABAJO (OT)</label>
                            <select onchange="app.updateQuoteOT(this.value)" class="p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm">
                                <option value="">Seleccionar OT...</option>
                                ${this.data.ots.map(o => `<option value="${o.ot}" ${this.draftQuote.ot === o.ot ? 'selected' : ''}>${o.ot} - ${o.descripcion_ot}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-[10px] font-bold text-slate-400 tracking-tighter">OF ASOCIADA</label>
                            <div class="p-2.5 bg-slate-200/50 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium h-[42px] flex items-center">${relatedOF ? relatedOF.of + ' - ' + relatedOF.descripcion_of : '---'}</div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-[10px] font-bold text-slate-400 tracking-tighter">CLIENTE FINAL</label>
                            <div class="p-2.5 bg-slate-200/50 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium h-[42px] flex items-center">${relatedClient ? relatedClient.razon_social : '---'}</div>
                        </div>
                    </div>

                    <div class="mb-6">
                        <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                            <h4 class="text-sm font-black text-slate-700 uppercase tracking-widest">Materiales de Cotización</h4>
                            <div class="flex gap-2 w-full md:w-auto">
                                <select id="material-picker" class="flex-1 md:w-80 p-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">Añadir Material al Listado...</option>
                                    ${this.data.materiales.map(m => `<option value="${m.id}">${m.codigo} - ${m.descripcion} ($${m.precio_un})</option>`).join('')}
                                </select>
                                <button onclick="app.addMaterialToQuote()" class="bg-blue-600 text-white px-5 rounded-lg font-bold text-xs hover:bg-blue-700 active:scale-95 transition-all">AÑADIR</button>
                            </div>
                        </div>

                        <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <table class="w-full text-sm text-left">
                                <thead class="bg-slate-50 text-slate-400 uppercase text-[9px] font-black tracking-widest border-b">
                                    <tr>
                                        <th class="p-4">CÓDIGO</th>
                                        <th class="p-4">DESCRIPCIÓN</th>
                                        <th class="p-4 text-right">UNITARIO</th>
                                        <th class="p-4 text-center">CANT.</th>
                                        <th class="p-4 text-right">SUBTOTAL</th>
                                        <th class="p-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${this.draftQuote.items.length === 0 ? `<tr><td colspan="6" class="p-10 text-center text-slate-400 italic">No hay materiales en esta cotización.</td></tr>` : ''}
                                    ${this.draftQuote.items.map((item, index) => `
                                        <tr class="hover:bg-slate-50">
                                            <td class="p-4 font-mono text-[11px] font-bold text-slate-700">${item.codigo}</td>
                                            <td class="p-4 font-medium">${item.descripcion}</td>
                                            <td class="p-4 text-right font-mono">$${item.precio_un.toFixed(2)}</td>
                                            <td class="p-4 text-center">
                                                <input type="number" min="1" value="${item.cantidad}" onchange="app.updateQuoteItemQty(${index}, this.value)" 
                                                    class="w-16 p-1 text-center bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-400 outline-none font-bold">
                                            </td>
                                            <td class="p-4 text-right font-bold text-blue-600 font-mono">$${item.subtotal.toFixed(2)}</td>
                                            <td class="p-4 text-right">
                                                <button onclick="app.removeMaterialFromQuote(${index})" class="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">🗑️</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot class="bg-slate-900 text-white">
                                    <tr>
                                        <td colspan="4" class="p-5 text-right uppercase tracking-widest text-[10px] font-black">Total Neto Materiales</td>
                                        <td class="p-5 text-right text-xl font-mono font-bold">$${totalCotizacion.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 pt-6 border-t mt-8">
                        <button onclick="app.clearDraftQuote()" class="px-6 py-2.5 text-slate-500 font-bold hover:text-rose-600 transition-all text-xs uppercase">LIMPIAR TODO</button>
                        <button onclick="app.saveQuote()" class="px-10 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-xl hover:bg-emerald-700 active:scale-95 transition-all uppercase text-xs tracking-widest">
                            💾 GUARDAR COTIZACIÓN
                        </button>
                    </div>
                </section>

                <!-- HISTORIAL -->
                <section class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <span class="w-2 h-6 bg-slate-300 rounded"></span> Historial de Cotizaciones
                        </h3>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${this.data.cotizaciones.map(q => `
                            <div class="p-5 border border-slate-200 bg-white rounded-2xl hover:border-blue-400 hover:shadow-xl transition-all cursor-default relative group">
                                <button onclick="app.deleteQuote('${q.id}')" class="absolute top-4 right-4 p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>
                                <div class="text-[10px] font-black text-blue-500 uppercase tracking-tighter mb-1">${q.codigo_cotizacion || 'S/N'}</div>
                                <div class="text-sm font-bold text-slate-800 mb-4">OT: ${q.ot_codigo}</div>
                                <div class="flex justify-between items-end border-t border-slate-100 pt-4">
                                    <div class="text-[10px] text-slate-400 font-bold">${new Date(q.created_at).toLocaleDateString()}</div>
                                    <div class="text-xl font-mono font-black text-slate-900">$${parseFloat(q.total_mats || 0).toFixed(2)}</div>
                                </div>
                            </div>
                        `).join('')}
                        ${this.data.cotizaciones.length === 0 ? '<div class="col-span-3 text-center py-10 text-slate-400 italic">No se han registrado cotizaciones.</div>' : ''}
                    </div>
                </section>
            </div>
        `;
    }

    updateQuoteOT(ot) {
        this.draftQuote.ot = ot;
        this.render();
    }

    addMaterialToQuote() {
        const select = document.getElementById('material-picker');
        if (!select) return;
        const id = select.value;
        if (!id) return;

        const mat = this.data.materiales.find(m => m.id === id);
        if (!mat) return;

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
        if (confirm("¿Limpiar cotización en curso?")) {
            this.draftQuote = { ot: '', items: [] };
            this.render();
        }
    }

    async generateQuoteCode() {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const datePart = `${dd}-${mm}-${yyyy}`;
        
        // Determinar secuencia incremental diaria
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const { count, error } = await this.supabase
            .from('cotizaciones')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startOfDay);
            
        if (error) {
            console.error("Error secuencia:", error);
            return `COT-${datePart}-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        const nextNum = (count + 1).toString().padStart(4, '0');
        return `COT-${datePart}-${nextNum}`;
    }

    async saveQuote() {
        if (!this.draftQuote.ot) {
            alert("Seleccione una Orden de Trabajo (OT).");
            return;
        }
        if (this.draftQuote.items.length === 0) {
            alert("Agregue al menos un material.");
            return;
        }

        try {
            const total = this.draftQuote.items.reduce((acc, i) => acc + i.subtotal, 0);
            const codigo = await this.generateQuoteCode();

            const payload = {
                codigo_cotizacion: codigo,
                ot_codigo: this.draftQuote.ot,
                total_mats: total,
                items_json: this.draftQuote.items
            };

            const { error } = await this.supabase.from('cotizaciones').insert([payload]);

            if (!error) {
                this.showToast(`Cotización ${codigo} registrada`);
                this.draftQuote = { ot: '', items: [] };
                await this.refreshData();
            } else {
                console.error("Supabase Error:", error);
                if (error.code === '42703') {
                    alert("ERROR DE ESQUEMA: La base de datos no tiene la columna 'codigo_cotizacion'. Por favor, ejecute el script SQL actualizado en Supabase.");
                } else {
                    alert("Error al guardar: " + error.message);
                }
            }
        } catch (err) {
            console.error("Critical Save Error:", err);
            alert("Error crítico del sistema al guardar.");
        }
    }

    async deleteQuote(id) {
        if (!confirm("¿Eliminar cotización?")) return;
        const { error } = await this.supabase.from('cotizaciones').delete().eq('id', id);
        if (!error) {
            this.showToast("Eliminado correctamente");
            await this.refreshData();
        }
    }

    // --- MANTENIMIENTO BASE DE DATOS MAESTRA ---

    renderMasterDatabase() {
        const filter = (list, query, keys) => query ? list.filter(i => keys.some(k => String(i[k] || '').toLowerCase().includes(query.toLowerCase()))) : list;

        return `
            <div class="space-y-12 animate-fadeIn pb-20">
                ${this.renderSection('materiales', 'GESTIÓN DE MATERIALES', 'blue', 'form-material', `
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-[10px] font-bold text-slate-400">DESCRIPCIÓN</label>
                        <input name="descripcion" required value="${this.getVal('materiales', 'descripcion')}" class="p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400">PRECIO UNITARIO</label>
                        <input name="precio_un" required type="number" step="0.01" value="${this.getVal('materiales', 'precio_un') || 0}" class="p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-bold text-slate-400">STOCK</label>
                        <input name="en_stock" required type="number" value="${this.getVal('materiales', 'en_stock') || 0}" class="p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                `, ['CÓDIGO', 'DESCRIPCIÓN', 'VALOR', 'STOCK'], filter(this.data.materiales, this.filters.materiales, ['codigo', 'descripcion']), (m) => `
                    <td class="p-3 font-mono text-[11px] font-bold text-slate-700">${m.codigo}</td>
                    <td class="p-3 font-medium">${m.descripcion}</td>
                    <td class="p-3 font-mono text-blue-600">$${m.precio_un}</td>
                    <td class="p-3">${m.en_stock}</td>
                `)}

                ${this.renderSection('clientes', 'DIRECTORIO DE CLIENTES', 'emerald', 'form-cliente', `
                    <div class="flex flex-col gap-1 md:col-span-4">
                        <label class="text-[10px] font-bold text-slate-400">RAZÓN SOCIAL / NOMBRE</label>
                        <input name="razon_social" required value="${this.getVal('clientes', 'razon_social')}" class="p-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none">
                    </div>
                `, ['COD. CLIENTE', 'RAZÓN SOCIAL'], filter(this.data.clientes, this.filters.clientes, ['cod_cliente', 'razon_social']), (c) => `
                    <td class="p-3 font-bold text-slate-700">${c.cod_cliente}</td>
                    <td class="p-3 font-medium">${c.razon_social}</td>
                `)}

                ${this.renderSection('ord_fabricaciones', 'ORDENES DE FABRICACIÓN', 'amber', 'form-of', `
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-[10px] font-bold text-slate-400">DESCRIPCIÓN DE LA OF</label>
                        <input name="descripcion_of" required value="${this.getVal('ord_fabricaciones', 'descripcion_of')}" class="p-2 border border-slate-300 rounded outline-none">
                    </div>
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-[10px] font-bold text-slate-400">CLIENTE ASOCIADO</label>
                        <select name="cod_cliente" required class="p-2 bg-white border border-slate-300 rounded outline-none">
                            <option value="">Seleccionar Cliente...</option>
                            ${this.data.clientes.map(c => `<option value="${c.cod_cliente}" ${this.getVal('ord_fabricaciones', 'cod_cliente') === c.cod_cliente ? 'selected' : ''}>${c.cod_cliente} - ${c.razon_social}</option>`).join('')}
                        </select>
                    </div>
                `, ['Nº OF', 'DESCRIPCIÓN PROYECTO', 'CLIENTE'], filter(this.data.ofs, this.filters.ofs, ['of', 'descripcion_of']), (o) => `
                    <td class="p-3 font-bold text-slate-700">${o.of}</td>
                    <td class="p-3">${o.descripcion_of}</td>
                    <td class="p-3 text-blue-600 font-bold">${o.cod_cliente}</td>
                `)}

                ${this.renderSection('ord_trabajos', 'ORDENES DE TRABAJO', 'indigo', 'form-ot', `
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-[10px] font-bold text-slate-400">TAREA A REALIZAR</label>
                        <input name="descripcion_ot" required value="${this.getVal('ord_trabajos', 'descripcion_ot')}" class="p-2 border border-slate-300 rounded outline-none">
                    </div>
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-[10px] font-bold text-slate-400">ORDEN DE FABRICACIÓN VINCULADA</label>
                        <select name="ofabricaciones" required class="p-2 bg-white border border-slate-300 rounded outline-none">
                            <option value="">Seleccionar OF...</option>
                            ${this.data.ofs.map(f => `<option value="${f.of}" ${this.getVal('ord_trabajos', 'ofabricaciones') === f.of ? 'selected' : ''}>${f.of} - ${f.descripcion_of}</option>`).join('')}
                        </select>
                    </div>
                `, ['Nº OT', 'DETALLE TAREA', 'Nº OF'], filter(this.data.ots, this.filters.ots, ['ot', 'descripcion_ot']), (t) => `
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
            <section class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm animate-fadeIn">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b pb-6">
                    <h3 class="text-xl font-black text-slate-800 flex items-center gap-3">
                        <span class="w-2 h-8 bg-${color}-500 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]"></span> ${title}
                    </h3>
                    <div class="relative w-full md:w-80">
                        <input type="text" placeholder="Filtro rápido..." oninput="app.setFilter('${key}', this.value)" value="${this.filters[key] || ''}" class="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                        <span class="absolute right-4 top-3 text-slate-400">🔍</span>
                    </div>
                </div>
                <form id="${formId}" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 bg-slate-50 p-8 rounded-2xl border border-slate-100 shadow-inner">
                    ${formFields}
                    <div class="md:col-span-4 flex gap-3 mt-4">
                        <button type="submit" class="flex-1 bg-${isEditing ? 'amber' : 'blue'}-600 text-white p-3.5 rounded-xl font-black shadow-lg hover:opacity-90 active:scale-[0.99] transition-all uppercase tracking-widest text-xs">
                            ${isEditing ? '💾 ACTUALIZAR REGISTRO' : '➕ REGISTRAR NUEVO'}
                        </button>
                        ${isEditing ? `<button type="button" onclick="app.cancelEdit()" class="px-10 bg-white border border-slate-300 text-slate-500 rounded-xl font-bold hover:bg-slate-100 uppercase text-xs">CANCELAR</button>` : ''}
                    </div>
                </form>
                <div class="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b">
                            <tr>
                                ${headers.map(h => `<th class="p-5">${h}</th>`).join('')}
                                <th class="p-5 text-right">GESTIÓN</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${list.length === 0 ? `<tr><td colspan="${totalCols}" class="p-16 text-center text-slate-300 italic font-medium">Bandeja de datos vacía.</td></tr>` : ''}
                            ${list.map(item => `
                                <tr class="hover:bg-slate-50/50 transition-colors">
                                    ${rowTemplate(item)}
                                    <td class="p-5 text-right space-x-1">
                                        <button onclick='app.startEdit("${key}", ${JSON.stringify(item).replace(/'/g, "&apos;")})' class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Modificar">✏️</button>
                                        <button onclick="app.deleteRecord('${key}', '${item.id}')" class="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Borrar">🗑️</button>
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
            <div class="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-fadeIn">
                <div class="p-8 bg-slate-50 border-b flex justify-between items-center">
                    <div>
                        <h3 class="text-2xl font-black text-slate-900 uppercase tracking-tighter">Control de Inventario</h3>
                        <p class="text-sm text-slate-500 font-medium">Actualización masiva de precios y existencias.</p>
                    </div>
                    <div class="bg-white p-3 rounded-2xl border shadow-sm">
                        <span class="text-xs font-black text-blue-600 block uppercase tracking-widest">Items Registrados</span>
                        <span class="text-2xl font-black text-slate-800">${materials.length}</span>
                    </div>
                </div>
                <table class="w-full text-left border-collapse">
                    <thead class="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b">
                        <tr>
                            <th class="p-6">CÓDIGO MATERIAL</th>
                            <th class="p-6">DESCRIPCIÓN DEL ARTÍCULO</th>
                            <th class="p-6 text-right">VALOR UNITARIO ($)</th>
                            <th class="p-6 text-right">STOCK DISP.</th>
                            <th class="p-6 text-right">CONFIRMACIÓN</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${materials.map(m => `
                            <tr class="hover:bg-blue-50/20 transition-all group">
                                <td class="p-6 font-mono text-[11px] font-black text-slate-700">${m.codigo}</td>
                                <td class="p-6 text-slate-600 text-sm font-medium">${m.descripcion}</td>
                                <td class="p-6 text-right">
                                    <input type="number" id="price-${m.id}" step="0.01" value="${m.precio_un}" 
                                        class="w-32 p-2.5 bg-white border-2 border-slate-100 rounded-xl text-right font-mono font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all">
                                </td>
                                <td class="p-6 text-right">
                                    <input type="number" id="stock-${m.id}" value="${m.en_stock}" 
                                        class="w-24 p-2.5 bg-white border-2 border-slate-100 rounded-xl text-right font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all">
                                </td>
                                <td class="p-6 text-right">
                                    <button onclick="app.savePurchaseRow('${m.id}', '${m.codigo}')" 
                                        class="px-5 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black shadow-lg hover:bg-emerald-600 active:scale-95 transition-all uppercase tracking-widest">
                                        ACTUALIZAR
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
        if (!priceInput || !stockInput) return;
        
        const price = parseFloat(priceInput.value);
        const stock = parseInt(stockInput.value);

        if (isNaN(price) || isNaN(stock) || price < 0 || stock < 0) {
            this.showToast("Datos incorrectos");
            return;
        }

        if (!confirm(`¿Actualizar Material ${codigo}?\nPrecio: $${price}\nStock: ${stock}`)) return;

        const { error } = await this.supabase.from('materiales').update({
            precio_un: price,
            en_stock: stock
        }).eq('id', id);

        if (!error) {
            this.showToast(`Material ${codigo} actualizado`);
            const mat = this.data.materiales.find(m => m.id === id);
            if (mat) { mat.precio_un = price; mat.en_stock = stock; }
        } else {
            alert("Error: " + error.message);
            await this.refreshData();
        }
    }

    startEdit(table, item) {
        this.editing = { table, id: item.id, item: { ...item } };
        this.render();
        const formId = this.getFormId(table);
        const form = document.getElementById(formId);
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

    getVal(table, field) {
        if (this.editing.table === table && this.editing.item) {
            return this.editing.item[field] !== undefined ? this.editing.item[field] : '';
        }
        return '';
    }

    setFilter(key, val) {
        this.filters[key] = val;
        this.render();
    }

    async deleteRecord(table, id) {
        if (!confirm("Esta acción no se puede deshacer. ¿Continuar?")) return;
        const { error } = await this.supabase.from(table).delete().eq('id', id);
        if (!error) {
            this.showToast("Registro eliminado");
            this.editing = { table: null, id: null, item: null };
            await this.refreshData();
        } else {
            alert("Restricción de integridad: El registro está vinculado en otra tabla.");
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
                    this.showToast("Base de datos actualizada");
                    this.editing = { table: null, id: null, item: null };
                    await this.refreshData();
                } else {
                    alert("Error Supabase: " + res.error.message);
                }
            };
        });
    }

    showToast(msg) {
        const t = document.getElementById('toast');
        const m = document.getElementById('toast-msg');
        if (!t || !m) return;
        m.innerText = msg;
        t.classList.remove('opacity-0', 'translate-y-6');
        t.classList.add('opacity-100', 'translate-y-0');
        setTimeout(() => { 
            t.classList.remove('opacity-100', 'translate-y-0');
            t.classList.add('opacity-0', 'translate-y-6');
        }, 3000);
    }
}

window.app = new AppController();
