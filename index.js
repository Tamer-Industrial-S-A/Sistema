
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://rlyjyjbafslewjlgfzeb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseWp5amJhZnNsZXdqbGdmemViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTE0MTcsImV4cCI6MjA4NTYyNzQxN30.VaV5NMIRkAIATuxYw5kmiRsiaxhU_2varz0HRmNBW-0';

class AppController {
    constructor() {
        this.currentView = 'BASE_DE_DATOS';
        this.purchaseSubView = 'INVENTARIO'; // 'INVENTARIO' o 'COTIZACIONES'
        this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        this.data = { materiales: [], clientes: [], ofs: [], ots: [], cotizaciones: [] };
        this.filters = { materiales: '', clientes: '', ofs: '', ots: '', compras_cod: '' };
        this.editing = { table: null, id: null, item: null };
        this.editingQuoteId = null; 
        this.selectedQuoteForEdit = null; // Para la pestaña compras/cotizaciones
        
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

    setPurchaseSubView(sub) {
        this.purchaseSubView = sub;
        this.selectedQuoteForEdit = null;
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
                mount.innerHTML = this.renderPurchasesView();
            },
            'AUTOMATIZACION': () => {
                mount.innerHTML = this.renderAutomationView();
                this.attachMasterListeners();
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

    // --- MÓDULO COMPRAS ---

    renderPurchasesView() {
        const filterMats = this.data.materiales.filter(m => 
            m.codigo.toLowerCase().includes(this.filters.compras_cod.toLowerCase())
        );

        return `
            <div class="space-y-6 animate-fadeIn">
                <!-- Tabs de Compras -->
                <div class="flex gap-1 bg-slate-200 p-1 rounded-2xl w-fit shadow-inner">
                    <button onclick="app.setPurchaseSubView('INVENTARIO')" class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${this.purchaseSubView === 'INVENTARIO' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}">Inventario Maestro</button>
                    <button onclick="app.setPurchaseSubView('COTIZACIONES')" class="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${this.purchaseSubView === 'COTIZACIONES' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}">Precios en Cotizaciones</button>
                </div>

                ${this.purchaseSubView === 'INVENTARIO' ? this.renderPurchaseInventory(filterMats) : this.renderPurchaseQuotes()}
            </div>
        `;
    }

    renderPurchaseInventory(materials) {
        return `
            <div class="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                <div class="p-8 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 class="text-2xl font-black text-slate-900 uppercase tracking-tighter">Control de Precios y Stock</h3>
                        <p class="text-xs text-slate-500 font-bold uppercase tracking-widest">Maestro de materiales registrados</p>
                    </div>
                    <div class="relative w-full md:w-80">
                        <input type="text" placeholder="Filtrar por CÓDIGO..." 
                            oninput="app.filters.compras_cod = this.value; app.render();" 
                            value="${this.filters.compras_cod}"
                            class="w-full pl-4 pr-10 py-3 bg-white text-slate-900 border border-slate-300 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-100 font-bold">
                        <span class="absolute right-4 top-3.5 text-slate-400">🔍</span>
                    </div>
                </div>
                <table class="w-full text-left border-collapse">
                    <thead class="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
                        <tr>
                            <th class="p-6">CÓDIGO</th>
                            <th class="p-6">MATERIAL</th>
                            <th class="p-6 text-right">PRECIO MAESTRO ($)</th>
                            <th class="p-6 text-right">STOCK</th>
                            <th class="p-6 text-right">GESTIÓN</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 bg-white">
                        ${materials.map(m => `
                            <tr class="hover:bg-blue-50/10 transition-all">
                                <td class="p-6 font-mono text-[11px] font-black text-slate-500">${m.codigo}</td>
                                <td class="p-6 text-slate-900 text-sm font-bold">${m.descripcion}</td>
                                <td class="p-6 text-right">
                                    <input type="number" id="price-${m.id}" step="0.01" value="${m.precio_un}" 
                                        class="w-32 p-3 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl text-right font-mono font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none">
                                </td>
                                <td class="p-6 text-right">
                                    <input type="number" id="stock-${m.id}" value="${m.en_stock}" 
                                        class="w-24 p-3 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl text-right font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none">
                                </td>
                                <td class="p-6 text-right">
                                    <button onclick="app.savePurchaseRow('${m.id}', '${m.codigo}')" 
                                        class="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black shadow-lg hover:bg-emerald-600 transition-all uppercase">ACTUALIZAR</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderPurchaseQuotes() {
        return `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Lista de Cotizaciones -->
                <div class="lg:col-span-1 space-y-4">
                    <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Seleccionar para auditar</h4>
                    ${this.data.cotizaciones.map(q => `
                        <button onclick='app.selectQuoteForCostEdit(${JSON.stringify(q).replace(/'/g, "&apos;")})' 
                            class="w-full text-left p-5 bg-white border ${this.selectedQuoteForEdit?.id === q.id ? 'border-emerald-500 ring-4 ring-emerald-100' : 'border-slate-200'} rounded-3xl hover:shadow-xl transition-all group">
                            <div class="text-[10px] font-black text-emerald-600 mb-1">${q.codigo_cotizacion}</div>
                            <div class="text-sm font-black text-slate-800 uppercase mb-3">OT: ${q.ot_codigo}</div>
                            <div class="flex justify-between items-center text-slate-400">
                                <span class="text-[10px] font-bold">${new Date(q.created_at).toLocaleDateString()}</span>
                                <span class="text-lg font-mono font-black text-slate-900">$${parseFloat(q.total_mats).toFixed(2)}</span>
                            </div>
                        </button>
                    `).join('')}
                </div>

                <!-- Detalle de materiales de la cotización seleccionada -->
                <div class="lg:col-span-2">
                    ${this.selectedQuoteForEdit ? `
                        <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
                            <div class="p-8 bg-emerald-50 border-b border-emerald-100">
                                <h3 class="text-xl font-black text-emerald-900 uppercase">Auditando: ${this.selectedQuoteForEdit.codigo_cotizacion}</h3>
                                <p class="text-xs text-emerald-600 font-bold uppercase mt-1">Al actualizar un precio, se sincroniza con el catálogo maestro de materiales.</p>
                            </div>
                            <table class="w-full text-left">
                                <thead class="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    <tr>
                                        <th class="p-6">MATERIAL</th>
                                        <th class="p-6 text-center">CANT.</th>
                                        <th class="p-6 text-right">PRECIO EN COTIZ. ($)</th>
                                        <th class="p-6 text-right">SUBTOTAL</th>
                                        <th class="p-6 text-right">ACCIÓN</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${this.selectedQuoteForEdit.items_json.map((item, idx) => `
                                        <tr>
                                            <td class="p-6">
                                                <div class="text-xs font-black text-slate-500 mb-0.5">${item.codigo}</div>
                                                <div class="text-sm font-bold text-slate-800">${item.descripcion}</div>
                                            </td>
                                            <td class="p-6 text-center font-black">${item.cantidad}</td>
                                            <td class="p-6 text-right">
                                                <input type="number" id="qprice-${idx}" step="0.01" value="${item.precio_un}" 
                                                    class="w-32 p-3 bg-white text-slate-900 border-2 border-slate-200 rounded-2xl text-right font-mono font-black focus:border-emerald-500 outline-none">
                                            </td>
                                            <td class="p-6 text-right font-mono font-black text-blue-600">$${item.subtotal.toFixed(2)}</td>
                                            <td class="p-6 text-right">
                                                <button onclick="app.syncQuotePrice(${idx})" class="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg hover:bg-emerald-700 active:scale-90 transition-all">💾</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot class="bg-slate-900 text-white">
                                    <tr>
                                        <td colspan="3" class="p-6 text-right text-[11px] font-black uppercase">Total Neto Cotización</td>
                                        <td class="p-6 text-right text-2xl font-mono font-black">$${parseFloat(this.selectedQuoteForEdit.total_mats).toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ` : `
                        <div class="h-64 flex flex-col items-center justify-center border-4 border-dashed border-slate-200 rounded-3xl text-slate-300">
                            <span class="text-6xl mb-4">👈</span>
                            <span class="font-black uppercase tracking-widest text-sm">Seleccione una cotización para auditar costos</span>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    selectQuoteForCostEdit(q) {
        this.selectedQuoteForEdit = q;
        this.render();
    }

    async syncQuotePrice(idx) {
        const input = document.getElementById(`qprice-${idx}`);
        if (!input) return;
        const newPrice = parseFloat(input.value);
        if (isNaN(newPrice) || newPrice < 0) return;

        const quote = this.selectedQuoteForEdit;
        const item = quote.items_json[idx];
        
        if (!confirm(`¿Actualizar precio de ${item.descripcion} a $${newPrice}?\nEsta acción afectará al catálogo maestro.`)) return;

        try {
            // 1. Actualizar Catálogo Maestro (Materiales)
            const { error: errorMat } = await this.supabase
                .from('materiales')
                .update({ precio_un: newPrice })
                .eq('codigo', item.codigo);

            if (errorMat) throw errorMat;

            // 2. Recalcular Cotización
            item.precio_un = newPrice;
            item.subtotal = newPrice * item.cantidad;
            const newTotal = quote.items_json.reduce((acc, cur) => acc + cur.subtotal, 0);

            const { error: errorQuote } = await this.supabase
                .from('cotizaciones')
                .update({ 
                    items_json: quote.items_json,
                    total_mats: newTotal
                })
                .eq('id', quote.id);

            if (errorQuote) throw errorQuote;

            this.showToast("SINCRONIZACIÓN EXITOSA");
            this.selectedQuoteForEdit.total_mats = newTotal;
            await this.refreshData();
        } catch (err) {
            console.error(err);
            alert("Error en sincronización: " + err.message);
        }
    }

    async savePurchaseRow(id, codigo) {
        const priceInput = document.getElementById(`price-${id}`);
        const stockInput = document.getElementById(`stock-${id}`);
        if (!priceInput || !stockInput) return;
        
        const price = parseFloat(priceInput.value);
        const stock = parseInt(stockInput.value);

        if (isNaN(price) || isNaN(stock) || price < 0 || stock < 0) {
            this.showToast("VALORES NO VÁLIDOS");
            return;
        }

        if (!confirm(`CONFIRMAR CAMBIOS:\nMaterial: ${codigo}\nNuevo Precio: $${price}\nNuevo Stock: ${stock}`)) return;

        const { error } = await this.supabase.from('materiales').update({
            precio_un: price,
            en_stock: stock
        }).eq('id', id);

        if (!error) {
            this.showToast(`ACTUALIZADO: ${codigo}`);
            const mat = this.data.materiales.find(m => m.id === id);
            if (mat) { mat.precio_un = price; mat.en_stock = stock; }
        } else {
            alert("Error: " + error.message);
            await this.refreshData();
        }
    }

    // --- MÓDULO AUTOMATIZACIÓN (MATERIALES + COTIZACIONES) ---

    renderAutomationView() {
        const selectedOT = this.data.ots.find(o => o.ot === this.draftQuote.ot);
        const relatedOF = selectedOT ? this.data.ofs.find(f => f.of === selectedOT.ofabricaciones) : null;
        const relatedClient = relatedOF ? this.data.clientes.find(c => c.cod_cliente === relatedOF.cod_cliente) : null;
        const totalCotizacion = this.draftQuote.items.reduce((acc, item) => acc + item.subtotal, 0);

        return `
            <div class="space-y-12 animate-fadeIn pb-20">
                <!-- REGISTRO DE MATERIALES -->
                <section class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-2 h-6 bg-blue-500 rounded"></div>
                        <h3 class="text-lg font-bold text-slate-800 uppercase tracking-tight">Registro de Materiales</h3>
                    </div>
                    <form id="form-material" class="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
                        <div class="flex flex-col gap-1 md:col-span-2">
                            <label class="text-[10px] font-black text-slate-500 uppercase">Descripción del Material</label>
                            <input name="descripcion" required placeholder="Ej: Plancha Acero Inox 304 2mm" class="p-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 font-medium">
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-[10px] font-black text-slate-500 uppercase">Precio Unitario ($)</label>
                            <input name="precio_un" required type="number" step="0.01" placeholder="0.00" class="p-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 font-medium">
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-[10px] font-black text-slate-500 uppercase">Stock Inicial</label>
                            <input name="en_stock" required type="number" placeholder="0" class="p-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 font-medium">
                        </div>
                        <div class="md:col-span-4 mt-2">
                            <button type="submit" class="w-full bg-blue-600 text-white p-3 rounded-xl font-black hover:bg-blue-700 transition-all uppercase text-xs tracking-widest shadow-md">Añadir al Inventario</button>
                        </div>
                    </form>
                </section>

                <!-- GENERADOR DE COTIZACIONES -->
                <section id="quote-generator" class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm ${this.editingQuoteId ? 'ring-4 ring-amber-400/20' : ''}">
                    <div class="flex items-center justify-between mb-8">
                        <div class="flex items-center gap-3">
                            <div class="p-3 ${this.editingQuoteId ? 'bg-amber-500' : 'bg-emerald-600'} rounded-xl text-white shadow-md">📑</div>
                            <div>
                                <h3 class="text-xl font-black text-slate-800">${this.editingQuoteId ? 'Editando Cotización' : 'Nueva Cotización'}</h3>
                                <p class="text-[10px] ${this.editingQuoteId ? 'text-amber-600' : 'text-emerald-600'} uppercase tracking-widest font-black">${this.editingQuoteId ? 'Modificando registro existente' : 'Módulo de cálculo automático'}</p>
                            </div>
                        </div>
                        ${this.editingQuoteId ? `
                            <button onclick="app.clearDraftQuote()" class="bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-200 transition-all">Cancelar Edición</button>
                        ` : ''}
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <div class="flex flex-col gap-1">
                            <label class="text-[10px] font-black text-slate-500">SELECCIONE ORDEN DE TRABAJO (OT)</label>
                            <select onchange="app.updateQuoteOT(this.value)" class="p-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm">
                                <option value="">--- Seleccionar ---</option>
                                ${this.data.ots.map(o => `<option value="${o.ot}" ${this.draftQuote.ot === o.ot ? 'selected' : ''}>${o.ot} - ${o.descripcion_ot}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-[10px] font-black text-slate-500">ORDEN DE FABRICACIÓN</label>
                            <div class="p-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 text-sm font-bold h-[45px] flex items-center shadow-inner">${relatedOF ? relatedOF.of + ' - ' + relatedOF.descripcion_of : '---'}</div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-[10px] font-black text-slate-500">CLIENTE RESPONSABLE</label>
                            <div class="p-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-700 text-sm font-bold h-[45px] flex items-center shadow-inner">${relatedClient ? relatedClient.razon_social : '---'}</div>
                        </div>
                    </div>

                    <div class="mb-6">
                        <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                            <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest">Desglose de Materiales</h4>
                            <div class="flex gap-2 w-full md:w-auto">
                                <select id="material-picker" class="flex-1 md:w-96 p-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium">
                                    <option value="">Seleccionar material del catálogo...</option>
                                    ${this.data.materiales.map(m => `<option value="${m.id}">${m.codigo} - ${m.descripcion} ($${m.precio_un})</option>`).join('')}
                                </select>
                                <button onclick="app.addMaterialToQuote()" class="bg-slate-900 text-white px-6 rounded-lg font-black text-xs hover:bg-blue-600 transition-all shadow-md">AGREGAR</button>
                            </div>
                        </div>

                        <div class="border border-slate-200 rounded-xl overflow-hidden shadow-md">
                            <table class="w-full text-sm text-left">
                                <thead class="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-200">
                                    <tr>
                                        <th class="p-4">CÓDIGO</th>
                                        <th class="p-4">DESCRIPCIÓN</th>
                                        <th class="p-4 text-right">PRECIO UNIT.</th>
                                        <th class="p-4 text-center">CANTIDAD</th>
                                        <th class="p-4 text-right">SUBTOTAL</th>
                                        <th class="p-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 bg-white">
                                    ${this.draftQuote.items.length === 0 ? `<tr><td colspan="6" class="p-12 text-center text-slate-400 italic">La lista está vacía. Añada materiales desde el selector superior.</td></tr>` : ''}
                                    ${this.draftQuote.items.map((item, index) => `
                                        <tr class="hover:bg-slate-50/50">
                                            <td class="p-4 font-mono text-[11px] font-bold text-slate-700">${item.codigo}</td>
                                            <td class="p-4 font-semibold text-slate-800">${item.descripcion}</td>
                                            <td class="p-4 text-right font-mono text-slate-600">$${item.precio_un.toFixed(2)}</td>
                                            <td class="p-4 text-center">
                                                <input type="number" min="1" value="${item.cantidad}" onchange="app.updateQuoteItemQty(${index}, this.value)" 
                                                    class="w-20 p-2 text-center bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none font-black shadow-sm">
                                            </td>
                                            <td class="p-4 text-right font-black text-blue-600 font-mono">$${item.subtotal.toFixed(2)}</td>
                                            <td class="p-4 text-right">
                                                <button onclick="app.removeMaterialFromQuote(${index})" class="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all">🗑️</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot class="bg-slate-900 text-white">
                                    <tr>
                                        <td colspan="4" class="p-6 text-right uppercase tracking-widest text-[11px] font-black">Monto Total Estimado</td>
                                        <td class="p-6 text-right text-2xl font-mono font-black">$${totalCotizacion.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 pt-6 border-t mt-8">
                        <button onclick="app.clearDraftQuote()" class="px-6 py-3 text-slate-500 font-black hover:text-rose-600 transition-all text-xs uppercase tracking-widest">LIMPIAR</button>
                        <button onclick="app.saveQuote()" class="px-12 py-4 ${this.editingQuoteId ? 'bg-amber-600' : 'bg-emerald-600'} text-white rounded-2xl font-black shadow-xl hover:opacity-90 active:scale-95 transition-all uppercase text-xs tracking-[0.2em]">
                            ${this.editingQuoteId ? '💾 Actualizar Cotización' : '💾 Guardar Cotización'}
                        </button>
                    </div>
                </section>

                <!-- HISTORIAL -->
                <section class="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 class="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
                        <span class="w-2 h-6 bg-slate-300 rounded-full"></span> Cotizaciones Emitidas
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${this.data.cotizaciones.map(q => `
                            <div class="p-6 border border-slate-200 bg-white rounded-3xl hover:border-blue-400 hover:shadow-2xl transition-all relative group">
                                <div class="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onclick='app.loadQuoteForEdit(${JSON.stringify(q).replace(/'/g, "&apos;")})' class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Editar">✏️</button>
                                    <button onclick="app.deleteQuote('${q.id}')" class="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-all" title="Eliminar">🗑️</button>
                                </div>
                                <div class="text-[10px] font-black text-blue-600 uppercase tracking-tighter mb-2">${q.codigo_cotizacion || 'SIN COD.'}</div>
                                <div class="text-sm font-black text-slate-800 mb-6 uppercase">Referencia OT: ${q.ot_codigo}</div>
                                <div class="flex justify-between items-end border-t border-slate-100 pt-5 mt-auto">
                                    <div class="text-[10px] text-slate-400 font-black uppercase tracking-widest">${new Date(q.created_at).toLocaleDateString()}</div>
                                    <div class="text-2xl font-mono font-black text-slate-900">$${parseFloat(q.total_mats || 0).toFixed(2)}</div>
                                </div>
                            </div>
                        `).join('')}
                        ${this.data.cotizaciones.length === 0 ? '<div class="col-span-3 text-center py-16 text-slate-400 italic">No hay registros previos en el sistema.</div>' : ''}
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
        if (confirm(this.editingQuoteId ? "¿Cancelar la edición actual?" : "¿Limpiar todos los datos de la cotización actual?")) {
            this.draftQuote = { ot: '', items: [] };
            this.editingQuoteId = null;
            this.render();
        }
    }

    loadQuoteForEdit(quote) {
        this.editingQuoteId = quote.id;
        this.draftQuote = {
            ot: quote.ot_codigo,
            items: quote.items_json.map(item => ({
                ...item,
                precio_un: parseFloat(item.precio_un),
                subtotal: parseFloat(item.subtotal)
            }))
        };
        this.render();
        const gen = document.getElementById('quote-generator');
        if (gen) gen.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this.showToast("COTIZACIÓN CARGADA PARA EDICIÓN");
    }

    async generateQuoteCode() {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const datePart = `${dd}-${mm}-${yyyy}`;
        
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
            alert("Error: Debe seleccionar una Orden de Trabajo (OT) válida.");
            return;
        }
        if (this.draftQuote.items.length === 0) {
            alert("Error: La lista de materiales no puede estar vacía.");
            return;
        }

        try {
            const total = this.draftQuote.items.reduce((acc, i) => acc + i.subtotal, 0);
            
            let res;
            if (this.editingQuoteId) {
                res = await this.supabase.from('cotizaciones').update({
                    ot_codigo: this.draftQuote.ot,
                    total_mats: total,
                    items_json: this.draftQuote.items
                }).eq('id', this.editingQuoteId);
                
                if (!res.error) {
                    this.showToast(`COTIZACIÓN ACTUALIZADA`);
                }
            } else {
                const codigo = await this.generateQuoteCode();
                const payload = {
                    codigo_cotizacion: codigo,
                    ot_codigo: this.draftQuote.ot,
                    total_mats: total,
                    items_json: this.draftQuote.items
                };
                res = await this.supabase.from('cotizaciones').insert([payload]);
                
                if (!res.error) {
                    this.showToast(`COTIZACIÓN ${codigo} GUARDADA`);
                }
            }

            if (!res.error) {
                this.draftQuote = { ot: '', items: [] };
                this.editingQuoteId = null;
                await this.refreshData();
            } else {
                console.error("Supabase Error:", res.error);
                alert("Error al procesar en servidor: " + res.error.message);
            }
        } catch (err) {
            console.error("Critical Error:", err);
            alert("Error crítico interno.");
        }
    }

    async deleteQuote(id) {
        if (!confirm("¿Eliminar permanentemente esta cotización del historial?")) return;
        const { error } = await this.supabase.from('cotizaciones').delete().eq('id', id);
        if (!error) {
            this.showToast("COTIZACIÓN ELIMINADA");
            if (this.editingQuoteId === id) {
                this.editingQuoteId = null;
                this.draftQuote = { ot: '', items: [] };
            }
            await this.refreshData();
        }
    }

    // --- MANTENIMIENTO BASE DE DATOS MAESTRA ---

    renderMasterDatabase() {
        const filter = (list, query, keys) => query ? list.filter(i => keys.some(k => String(i[k] || '').toLowerCase().includes(query.toLowerCase()))) : list;

        return `
            <div class="space-y-12 animate-fadeIn pb-20">
                ${this.renderSection('materiales', 'Gestión de Materiales', 'blue', 'form-material', `
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-[10px] font-black text-slate-500 uppercase">Descripción</label>
                        <input name="descripcion" required value="${this.getVal('materiales', 'descripcion')}" class="p-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-black text-slate-500 uppercase">Precio Unit.</label>
                        <input name="precio_un" required type="number" step="0.01" value="${this.getVal('materiales', 'precio_un') || 0}" class="p-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium">
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[10px] font-black text-slate-500 uppercase">En Stock</label>
                        <input name="en_stock" required type="number" value="${this.getVal('materiales', 'en_stock') || 0}" class="p-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium">
                    </div>
                `, ['CÓDIGO', 'DESCRIPCIÓN', 'VALOR', 'STOCK'], filter(this.data.materiales, this.filters.materiales, ['codigo', 'descripcion']), (m) => `
                    <td class="p-3 font-mono text-[11px] font-bold text-slate-700">${m.codigo}</td>
                    <td class="p-3 font-semibold text-slate-800">${m.descripcion}</td>
                    <td class="p-3 font-mono text-blue-600 font-black">$${m.precio_un}</td>
                    <td class="p-3 font-bold">${m.en_stock}</td>
                `)}

                ${this.renderSection('clientes', 'Directorio de Clientes', 'emerald', 'form-cliente', `
                    <div class="flex flex-col gap-1 md:col-span-4">
                        <label class="text-[10px] font-black text-slate-500 uppercase">Razón Social o Nombre Completo</label>
                        <input name="razon_social" required value="${this.getVal('clientes', 'razon_social')}" class="p-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-medium">
                    </div>
                `, ['CÓDIGO', 'RAZÓN SOCIAL'], filter(this.data.clientes, this.filters.clientes, ['cod_cliente', 'razon_social']), (c) => `
                    <td class="p-3 font-black text-slate-700">${c.cod_cliente}</td>
                    <td class="p-3 font-bold text-slate-800">${c.razon_social}</td>
                `)}

                ${this.renderSection('ord_fabricaciones', 'Órdenes de Fabricación', 'amber', 'form-of', `
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-[10px] font-black text-slate-500 uppercase">Detalle del Proyecto</label>
                        <input name="descripcion_of" required value="${this.getVal('ord_fabricaciones', 'descripcion_of')}" class="p-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-medium">
                    </div>
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-[10px] font-black text-slate-500 uppercase">Cliente Asociado</label>
                        <select name="cod_cliente" required class="p-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold">
                            <option value="">--- Seleccionar ---</option>
                            ${this.data.clientes.map(c => `<option value="${c.cod_cliente}" ${this.getVal('ord_fabricaciones', 'cod_cliente') === c.cod_cliente ? 'selected' : ''}>${c.cod_cliente} - ${c.razon_social}</option>`).join('')}
                        </select>
                    </div>
                `, ['Nº OF', 'PROYECTO', 'CÓD. CLIENTE'], filter(this.data.ofs, this.filters.ofs, ['of', 'descripcion_of']), (o) => `
                    <td class="p-3 font-black text-slate-700">${o.of}</td>
                    <td class="p-3 font-semibold text-slate-800">${o.descripcion_of}</td>
                    <td class="p-3 text-blue-600 font-black">${o.cod_cliente}</td>
                `)}

                ${this.renderSection('ord_trabajos', 'Órdenes de Trabajo', 'indigo', 'form-ot', `
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-[10px] font-black text-slate-500 uppercase">Descripción de la Tarea</label>
                        <input name="descripcion_ot" required value="${this.getVal('ord_trabajos', 'descripcion_ot')}" class="p-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
                    </div>
                    <div class="flex flex-col gap-1 md:col-span-2">
                        <label class="text-[10px] font-black text-slate-500 uppercase">Vincular a OF</label>
                        <select name="ofabricaciones" required class="p-2.5 bg-white text-slate-900 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold">
                            <option value="">--- Seleccionar ---</option>
                            ${this.data.ofs.map(f => `<option value="${f.of}" ${this.getVal('ord_trabajos', 'ofabricaciones') === f.of ? 'selected' : ''}>${f.of} - ${f.descripcion_of}</option>`).join('')}
                        </select>
                    </div>
                `, ['Nº OT', 'DETALLE TAREA', 'Nº OF'], filter(this.data.ots, this.filters.ots, ['ot', 'descripcion_ot']), (t) => `
                    <td class="p-3 font-black text-slate-700">${t.ot}</td>
                    <td class="p-3 font-semibold text-slate-800">${t.descripcion_ot}</td>
                    <td class="p-3 font-mono text-indigo-600 font-black">${t.ofabricaciones}</td>
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
                    <h3 class="text-xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
                        <span class="w-2 h-8 bg-${color}-500 rounded-full"></span> ${title}
                    </h3>
                    <div class="relative w-full md:w-80">
                        <input type="text" placeholder="Buscador inteligente..." oninput="app.setFilter('${key}', this.value)" value="${this.filters[key] || ''}" class="w-full pl-4 pr-10 py-3 bg-white text-slate-900 border border-slate-300 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium placeholder:text-slate-400">
                        <span class="absolute right-4 top-3.5 text-slate-400">🔍</span>
                    </div>
                </div>
                <form id="${formId}" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-inner">
                    ${formFields}
                    <div class="md:col-span-4 flex gap-3 mt-4">
                        <button type="submit" class="flex-1 bg-${isEditing ? 'amber' : 'blue'}-600 text-white p-4 rounded-2xl font-black shadow-lg hover:opacity-95 active:scale-[0.98] transition-all uppercase tracking-widest text-xs">
                            ${isEditing ? 'Guardar Cambios' : 'Registrar Nuevo'}
                        </button>
                        ${isEditing ? `<button type="button" onclick="app.cancelEdit()" class="px-12 bg-white text-slate-600 border border-slate-300 rounded-2xl font-black hover:bg-slate-100 uppercase text-xs tracking-widest">CANCELAR</button>` : ''}
                    </div>
                </form>
                <div class="border border-slate-200 rounded-3xl overflow-hidden shadow-md bg-white">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-slate-50 text-slate-400 uppercase text-[9px] font-black tracking-widest border-b border-slate-200">
                            <tr>
                                ${headers.map(h => `<th class="p-5">${h}</th>`).join('')}
                                <th class="p-5 text-right">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${list.length === 0 ? `<tr><td colspan="${totalCols}" class="p-16 text-center text-slate-300 font-bold uppercase tracking-widest">Base de datos sin registros</td></tr>` : ''}
                            ${list.map(item => `
                                <tr class="hover:bg-slate-50/50 transition-all">
                                    ${rowTemplate(item)}
                                    <td class="p-5 text-right space-x-1">
                                        <button onclick='app.startEdit("${key}", ${JSON.stringify(item).replace(/'/g, "&apos;")})' class="p-3 text-blue-500 hover:bg-blue-50 rounded-2xl transition-all">✏️</button>
                                        <button onclick="app.deleteRecord('${key}', '${item.id}')" class="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">🗑️</button>
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
        if (!confirm("ADVERTENCIA: ¿Eliminar este registro de forma permanente?")) return;
        const { error } = await this.supabase.from(table).delete().eq('id', id);
        if (!error) {
            this.showToast("REGISTRO ELIMINADO");
            this.editing = { table: null, id: null, item: null };
            await this.refreshData();
        } else {
            alert("Error: El registro tiene dependencias activas.");
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
                    this.showToast("DATOS SINCRONIZADOS");
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
