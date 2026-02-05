
import { AppData, TableColumn, Sector } from './types';

// Credenciales Hardcoded de Supabase
export const SUPABASE_URL = 'https://rlyjyjbafslewjlgfzeb.supabase.co'; 
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJseWp5amJhZnNsZXdqbGdmemViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNTE0MTcsImV4cCI6MjA4NTYyNzQxN30.VaV5NMIRkAIATuxYw5kmiRsiaxhU_2varz0HRmNBW-0';

export const ALL_SECTORS: Sector[] = [
  'DASHBOARD',
  'MATERIALES',
  'CLIENTES',
  'ORD_FABRICACIONES',
  'ORD_TRABAJOS',
  'AUTOMATIZACION',
  'COTIZACIONES',
  'COMPRAS',
  'TECNICA',
  'PLANEAMIENTO',
  'CORTE_AGUA',
  'PROYECTO',
  'TALLER',
  'CONFIGURACION'
];

export const INITIAL_DATA: AppData = {
  MATERIALES: [
    { CODIGO: 'M001', DESCRIPCION: 'Aluminio 6061', MODELO: 'Barra 2"', MARCA: 'AluMetals', PRECIO_UN: 25.5, EN_STOCK: 150 },
    { CODIGO: 'M002', DESCRIPCION: 'Acero Inox 304', MODELO: 'Chapa 3mm', MARCA: 'SteelWorld', PRECIO_UN: 45.0, EN_STOCK: 80 },
  ],
  CLIENTES: [
    { COD_CLIENTE: 'C001', RAZON_SOCIAL: 'Tech Corp S.A.' },
    { COD_CLIENTE: 'C002', RAZON_SOCIAL: 'BuildIt Industrial Ltd' },
  ],
  ORD_FABRICACIONES: [
    { OF: 'OF-1001', DESCRIPCION_OF: 'Estructura Metálica A1', COD_CLIENTE: 'C001', FECHA_ENTREGA: '2023-12-15', FECHA_OCOMPRA: '2023-11-01', OBRA_TERMINADA: 'No' },
  ],
  ORD_TRABAJOS: [
    { OT: 'OT-500', DESCRIPCION_OT: 'Corte de perfiles', OFABRICACION: 'OF-1001' },
  ],
  COTIZACIONES: [],
  USERS: [
    {
      id: 'admin-01',
      username: 'admin',
      password: '14569',
      role: 'admin',
      permissions: ALL_SECTORS
    }
  ],
  CONFIG: {
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY
  }
};

export const COLUMNS: Record<string, TableColumn[]> = {
  MATERIALES: [
    { key: 'CODIGO', label: 'Código' },
    { key: 'DESCRIPCION', label: 'Descripción' },
    { key: 'MODELO', label: 'Modelo' },
    { key: 'MARCA', label: 'Marca' },
    { key: 'PRECIO_UN', label: 'Precio Unit.' },
    { key: 'EN_STOCK', label: 'En Stock' },
  ],
  CLIENTES: [
    { key: 'COD_CLIENTE', label: 'Cód. Cliente' },
    { key: 'RAZON_SOCIAL', label: 'Razón Social' },
  ],
  ORD_FABRICACIONES: [
    { key: 'OF', label: 'OF' },
    { key: 'DESCRIPCION_OF', label: 'Descripción OF' },
    { key: 'COD_CLIENTE', label: 'Cód. Cliente' },
    { key: 'FECHA_ENTREGA', label: 'F. Entrega' },
    { key: 'FECHA_OCOMPRA', label: 'F. O.Compra' },
    { key: 'OBRA_TERMINADA', label: 'Terminada' },
  ],
  ORD_TRABAJOS: [
    { key: 'OT', label: 'OT' },
    { key: 'DESCRIPCION_OT', label: 'Descripción OT' },
    { key: 'OFABRICACION', label: 'OF Relacionada' },
  ],
  COTIZACIONES: [
    { key: 'ID', label: 'Cotización #' },
    { key: 'FECHA', label: 'Fecha' },
    { key: 'OT', label: 'OT' },
    { key: 'CLIENTE', label: 'Cliente' },
    { key: 'TOTAL', label: 'Total' },
    { key: 'ESTADO', label: 'Estado' },
  ]
};
