
export interface Material {
  id: string;
  codigo: string;
  descripcion: string;
  marca: string;
  valor: number;
  categoria?: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  empresa: string;
  cuit: string;
  email: string;
}

export interface QuoteItem {
  materialId: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Quote {
  id: string;
  clienteId: string;
  fecha: string;
  items: QuoteItem[];
  total: number;
}

export enum ViewType {
  AUTOMATIZACION = 'Automatizacion',
  TECNICA = 'Tecnica',
  PLANEAMIENTO = 'Planeamiento',
  PROYECTO = 'Proyecto',
  DATA_IMPORT = 'Importar Datos'
}
