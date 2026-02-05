
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppData } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

let supabaseInstance: SupabaseClient | null = null;

export const initSupabase = (url?: string, key?: string) => {
  const finalUrl = url?.trim() || SUPABASE_URL;
  const finalKey = key?.trim() || SUPABASE_ANON_KEY;

  if (finalUrl && finalKey && finalUrl !== 'https://tu-proyecto.supabase.co') {
    try {
      if (!finalUrl.startsWith('http')) {
        console.error("URL de Supabase inválida");
        return false;
      }
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
  if (!supabaseInstance) return { success: false, error: "No se han configurado las credenciales." };
  try {
    const { error } = await supabaseInstance.from('materiales').select('count', { count: 'exact', head: true });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Error de conexión desconocido" };
  }
};

/**
 * Sincroniza los datos con Supabase en el orden correcto para evitar errores de FK.
 * El orden es: MATERIALES -> CLIENTES -> ORD_FABRICACIONES -> ORD_TRABAJOS
 */
export const syncToSupabase = async (data: AppData) => {
  if (!supabaseInstance) return { success: false, error: "Supabase no está configurado" };

  try {
    // 1. MATERIALES (Independiente)
    if (data.MATERIALES.length > 0) {
      const { error } = await supabaseInstance.from('materiales').upsert(
        data.MATERIALES.map(m => ({
          codigo: String(m.CODIGO).trim(),
          descripcion: m.DESCRIPCION,
          modelo: m.MODELO,
          marca: m.MARCA,
          precio_un: m.PRECIO_UN,
          en_stock: m.EN_STOCK
        })),
        { onConflict: 'codigo' }
      );
      if (error) throw new Error(`Materiales: ${error.message}`);
    }

    // 2. CLIENTES (Independiente)
    if (data.CLIENTES.length > 0) {
      const { error } = await supabaseInstance.from('clientes').upsert(
        data.CLIENTES.map(c => ({
          cod_cliente: String(c.COD_CLIENTE).trim(),
          razon_social: c.RAZON_SOCIAL
        })),
        { onConflict: 'cod_cliente' }
      );
      if (error) throw new Error(`Clientes: ${error.message}`);
    }

    // 3. OFs (Depende de CLIENTES)
    if (data.ORD_FABRICACIONES.length > 0) {
      const { error } = await supabaseInstance.from('ord_fabricaciones').upsert(
        data.ORD_FABRICACIONES.map(of => ({
          of: String(of.OF).trim(),
          descripcion_of: of.DESCRIPCION_OF,
          cod_cliente: String(of.COD_CLIENTE).trim(),
          fecha_entrega: of.FECHA_ENTREGA,
          fecha_ocompra: of.FECHA_OCOMPRA,
          obra_terminada: of.OBRA_TERMINADA
        })),
        { onConflict: 'of' }
      );
      if (error) throw new Error(`OFs: ${error.message}`);
    }

    // 4. OTs (Depende de OFs)
    if (data.ORD_TRABAJOS.length > 0) {
      const { error } = await supabaseInstance.from('ord_trabajos').upsert(
        data.ORD_TRABAJOS.map(ot => ({
          ot: String(ot.OT).trim(),
          descripcion_ot: ot.DESCRIPCION_OT,
          ofabricacion: String(ot.OFABRICACION).trim()
        })),
        { onConflict: 'ot' }
      );
      if (error) throw new Error(`OTs: ${error.message}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Supabase Sync Error:", error);
    return { success: false, error: error.message };
  }
};

export const pullFromSupabase = async (): Promise<{data: Partial<AppData> | null, error?: string}> => {
  if (!supabaseInstance) return { data: null, error: "Cliente no inicializado" };

  try {
    const [resMat, resCli, resOf, resOt] = await Promise.all([
      supabaseInstance.from('materiales').select('*'),
      supabaseInstance.from('clientes').select('*'),
      supabaseInstance.from('ord_fabricaciones').select('*'),
      supabaseInstance.from('ord_trabajos').select('*')
    ]);

    if (resMat.error) throw resMat.error;
    if (resCli.error) throw resCli.error;
    if (resOf.error) throw resOf.error;
    if (resOt.error) throw resOt.error;

    return {
      data: {
        MATERIALES: resMat.data?.map(m => ({
          CODIGO: m.codigo,
          DESCRIPCION: m.descripcion,
          MODELO: m.modelo,
          MARCA: m.marca,
          PRECIO_UN: m.precio_un,
          EN_STOCK: m.en_stock
        })) || [],
        CLIENTES: resCli.data?.map(c => ({
          COD_CLIENTE: c.cod_cliente,
          RAZON_SOCIAL: c.razon_social
        })) || [],
        ORD_FABRICACIONES: resOf.data?.map(of => ({
          OF: of.of,
          DESCRIPCION_OF: of.descripcion_of,
          COD_CLIENTE: of.cod_cliente,
          FECHA_ENTREGA: of.fecha_entrega,
          FECHA_OCOMPRA: of.fecha_ocompra,
          OBRA_TERMINADA: of.obra_terminada
        })) || [],
        ORD_TRABAJOS: resOt.data?.map(ot => ({
          OT: ot.ot,
          DESCRIPCION_OT: ot.descripcion_ot,
          OFABRICACION: ot.ofabricacion
        })) || []
      }
    };
  } catch (error: any) {
    console.error("Supabase Pull Error:", error);
    return { data: null, error: error.message };
  }
};
