
export type Sector = 
  | 'DASHBOARD' 
  | 'BASE_DATOS' 
  | 'AUTOMATIZACION' 
  | 'TECNICA' 
  | 'PLANEAMIENTO' 
  | 'CORTE_AGUA' 
  | 'PROYECTO' 
  | 'TALLER'
  | 'MATERIALES' 
  | 'CLIENTES' 
  | 'ORD_FABRICACIONES' 
  | 'ORD_TRABAJOS' 
  | 'COTIZACIONES'
  | 'COMPRAS'
  | 'CONFIGURACION';

export interface UserPermission {
  sector: Sector;
  enabled: boolean;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  permissions: Sector[];
}

export interface Material {
  CODIGO: string;
  DESCRIPCION: string;
  MODELO: string;
  MARCA: string;
  PRECIO_UN: number;
  EN_STOCK: number;
}

export interface Cliente {
  COD_CLIENTE: string;
  RAZON_SOCIAL: string;
}

export interface OrdFabricacion {
  OF: string;
  DESCRIPCION_OF: string;
  COD_CLIENTE: string;
  FECHA_ENTREGA: string;
  FECHA_OCOMPRA: string;
  OBRA_TERMINADA: string;
}

export interface OrdTrabajo {
  OT: string;
  DESCRIPCION_OT: string;
  OFABRICACION: string;
}

export interface CotizacionItem {
  CODIGO: string;
  DESCRIPCION: string;
  CANTIDAD: number;
  PRECIO_UNIT: number;
  PRECIO_PROYECTO?: number;
  SUBTOTAL: number;
}

export interface Cotizacion {
  ID: string;
  FECHA: string;
  OT: string;
  OF: string;
  CLIENTE: string;
  ITEMS: CotizacionItem[];
  SUBTOTAL_NETO: number;
  IMPREVISTOS: number;
  TOTAL: number;
  TOTAL_PROYECTO?: number;
  ESTADO: 'Borrador' | 'Enviada' | 'Aprobada' | 'Modificada por Proyecto';
}

export interface AppData {
  MATERIALES: Material[];
  CLIENTES: Cliente[];
  ORD_FABRICACIONES: OrdFabricacion[];
  ORD_TRABAJOS: OrdTrabajo[];
  COTIZACIONES: Cotizacion[];
  USERS: User[];
  CONFIG: {
    lastSyncPath?: string;
    supabaseUrl?: string;
    supabaseAnonKey?: string;
  };
}

export interface TableColumn {
  key: string;
  label: string;
}
