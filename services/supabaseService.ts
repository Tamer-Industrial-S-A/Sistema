import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppData, Sector } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

let supabaseInstance: SupabaseClient | null = null;

const sectorToTable: Record<string, string> = {
  'MATERIALES': 'materiales',
  'CLIENTES': 'clientes',
  'ORD_FABRICACIONES': 'ord_fabricaciones',
  'ORD_TRABAJOS': 'ord_trabajos',
  'COTIZACIONES': 'cotizaciones'
};

const sectorToKey: Record<string, string> = {
  'MATERIALES': 'codigo',
  'CLIENTES': 'cod_cliente',
  'ORD_FABRICACIONES': 'of',
  'ORD_TRABAJOS': 'ot',
  'COTIZACIONES': 'id'
};

export const initSupabase = (url?: string, key?: string) => {
  const finalUrl = url?.trim() || SUPABASE_URL;
  const finalKey = key?.trim() || SUPABASE_ANON_KEY;

  if (finalUrl && finalKey && finalUrl.startsWith('http')) {
    try {
      supabaseInstance = createClient(finalUrl, finalKey);
      return true;
    } catch (e) {
      console.error("Error al inicializar Supabase:", e);
      return false;
    }
  }
  return false;
};

export const isSupabaseReady = () => !!supabaseInstance;

export const testConnection = async () => {
  if (!supabaseInstance) return { success: false, error: "No configurado." };
  try {
    const { error } = await supabaseInstance.from('materiales').select('count', { count: 'exact', head: true });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const removeFromSupabase = async (sector: Sector, idValue: string) => {
  if (!supabaseInstance) return { success: false, error: "Supabase no conectado" };
  const table = sectorToTable[sector];
  const key = sectorToKey[sector];
  
  if (!table || !key) return { success: false, error: "Tabla no mapeada" };

  try {
    const { error } = await supabaseInstance
      .from(table)
      .delete()
      .eq(key, String(idValue).trim());
      
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Sincroniza datos locales a Supabase.
 * IMPORTANTE: Convierte claves en MAYÚSCULAS (Frontend) a snake_case (Backend).
 */
export const syncToSupabase = async (data: AppData) => {
  if (!supabaseInstance) return { success: false, error: "Supabase no configurado" };

  try {
    // 1. MATERIALES
    if (data.MATERIALES.length > 0) {
      const { error } = await supabaseInstance.from('materiales').upsert(
        data.MATERIALES.map(m => ({
          codigo: String(m.CODIGO || '').trim(),
          descripcion: m.DESCRIPCION || '',
          modelo: m.MODELO || '',
          marca: m.MARCA || '',
          precio_un: Number(m.PRECIO_UN) || 0,
          en_stock: Number(m.EN_STOCK) || 0
        })),
        { onConflict: 'codigo' }
      );
      if (error) throw new Error(`Materiales: ${error.message}`);
    }

    // 2. CLIENTES
    if (data.CLIENTES.length > 0) {
      const { error } = await supabaseInstance.from('clientes').upsert(
        data.CLIENTES.map(c => ({
          cod_cliente: String(c.COD_CLIENTE || '').trim(),
          razon_social: c.RAZON_SOCIAL || ''
        })),
        { onConflict: 'cod_cliente' }
      );
      if (error) throw new Error(`Clientes: ${error.message}`);
    }

    const validClientCodes = new Set(data.CLIENTES.map(c => String(c.COD_CLIENTE || '').trim()));

    // 3. OFs (Filtrar huérfanos para evitar errores de FK)
    const validOFs = data.ORD_FABRICACIONES.filter(of => {
      const cCode = String(of.COD_CLIENTE || '').trim();
      return cCode !== '' && validClientCodes.has(cCode);
    });

    if (validOFs.length > 0) {
      const { error } = await supabaseInstance.from('ord_fabricaciones').upsert(
        validOFs.map(of => ({
          of: String(of.OF || '').trim(),
          descripcion_of: of.DESCRIPCION_OF || '',
          cod_cliente: String(of.COD_CLIENTE || '').trim(),
          fecha_entrega: of.FECHA_ENTREGA || '',
          fecha_ocompra: of.FECHA_OCOMPRA || '',
          obra_terminada: of.OBRA_TERMINADA || ''
        })),
        { onConflict: 'of' }
      );
      if (error) throw new Error(`OFs: ${error.message}`);
    }

    const validOFCodes = new Set(data.ORD_FABRICACIONES.map(of => String(of.OF || '').trim()));

    // 4. OTs
    const validOTs = data.ORD_TRABAJOS.filter(ot => {
      const ofCode = String(ot.OFABRICACION || '').trim();
      return ofCode !== '' && validOFCodes.has(ofCode);
    });

    if (validOTs.length > 0) {
      const { error } = await supabaseInstance.from('ord_trabajos').upsert(
        validOTs.map(ot => ({
          ot: String(ot.OT || '').trim(),
          descripcion_ot: ot.DESCRIPCION_OT || '',
          ofabricacion: String(ot.OFABRICACION || '').trim()
        })),
        { onConflict: 'ot' }
      );
      if (error) throw new Error(`OTs: ${error.message}`);
    }

    // 5. COTIZACIONES
    if (data.COTIZACIONES.length > 0) {
      const { error } = await supabaseInstance.from('cotizaciones').upsert(
        data.COTIZACIONES.map(q => ({
          id: String(q.ID).trim(),
          fecha: q.FECHA,
          ot: q.OT,
          of: q.OF,
          cliente: q.CLIENTE,
          items: q.ITEMS,
          subtotal_neto: Number(q.SUBTOTAL_NETO) || 0,
          imprevistos: Number(q.IMPREVISTOS) || 0,
          total: Number(q.TOTAL) || 0,
          total_proyecto: q.TOTAL_PROYECTO ? Number(q.TOTAL_PROYECTO) : null,
          estado: q.ESTADO
        })),
        { onConflict: 'id' }
      );
      if (error) throw new Error(`Cotizaciones: ${error.message}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Supabase Sync Error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Descarga datos de Supabase y los mapea a claves en MAYÚSCULAS.
 */
export const pullFromSupabase = async (): Promise<{data: Partial<AppData> | null, error?: string}> => {
  if (!supabaseInstance) return { data: null, error: "No conectado" };
  try {
    const [resMat, resCli, resOf, resOt, resCot] = await Promise.all([
      supabaseInstance.from('materiales').select('*'),
      supabaseInstance.from('clientes').select('*'),
      supabaseInstance.from('ord_fabricaciones').select('*'),
      supabaseInstance.from('ord_trabajos').select('*'),
      supabaseInstance.from('cotizaciones').select('*')
    ]);

    if (resMat.error) throw resMat.error;
    if (resCli.error) throw resCli.error;
    if (resOf.error) throw resOf.error;
    if (resOt.error) throw resOt.error;
    if (resCot.error) throw resCot.error;

    return {
      data: {
        MATERIALES: resMat.data?.map(m => ({
          CODIGO: m.codigo, DESCRIPCION: m.descripcion, MODELO: m.modelo, MARCA: m.marca, PRECIO_UN: m.precio_un, EN_STOCK: m.en_stock
        })),
        CLIENTES: resCli.data?.map(c => ({
          COD_CLIENTE: c.cod_cliente, RAZON_SOCIAL: c.razon_social
        })),
        ORD_FABRICACIONES: resOf.data?.map(of => ({
          OF: of.of, DESCRIPCION_OF: of.descripcion_of, COD_CLIENTE: of.cod_cliente, FECHA_ENTREGA: of.fecha_entrega, FECHA_OCOMPRA: of.fecha_ocompra, OBRA_TERMINADA: of.obra_terminada
        })),
        ORD_TRABAJOS: resOt.data?.map(ot => ({
          OT: ot.ot, DESCRIPCION_OT: ot.descripcion_ot, OFABRICACION: ot.ofabricacion
        })),
        COTIZACIONES: resCot.data?.map(q => ({
          ID: q.id, FECHA: q.fecha, OT: q.ot, OF: q.of, CLIENTE: q.cliente, ITEMS: q.items, SUBTOTAL_NETO: q.subtotal_neto, IMPREVISTOS: q.imprevistos, TOTAL: q.total, TOTAL_PROYECTO: q.total_proyecto, ESTADO: q.estado
        }))
      }
    };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};
