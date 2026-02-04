
-- SCRIPT DE CONFIGURACIÓN REVISADO PARA SUPABASE
-- Ejecutar esto en el SQL Editor de Supabase

-- 1. Tabla de Materiales
CREATE TABLE IF NOT EXISTS materiales (
  codigo TEXT PRIMARY KEY,
  descripcion TEXT NOT NULL,
  modelo TEXT,
  marca TEXT,
  precio_un NUMERIC DEFAULT 0,
  en_stock INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
  cod_cliente TEXT PRIMARY KEY,
  razon_social TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Órdenes de Fabricación
CREATE TABLE IF NOT EXISTS ord_fabricaciones (
  of TEXT PRIMARY KEY,
  descripcion_of TEXT,
  cod_cliente TEXT REFERENCES clientes(cod_cliente),
  fecha_entrega TEXT,
  fecha_ocompra TEXT,
  obra_terminada TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Órdenes de Trabajo
CREATE TABLE IF NOT EXISTS ord_trabajos (
  ot TEXT PRIMARY KEY,
  descripcion_ot TEXT,
  ofabricacion TEXT REFERENCES ord_fabricaciones(of),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
  id TEXT PRIMARY KEY,
  fecha DATE DEFAULT CURRENT_DATE,
  ot TEXT,
  of TEXT,
  cliente TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_neto NUMERIC DEFAULT 0,
  imprevistos NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  total_proyecto NUMERIC,
  estado TEXT DEFAULT 'Borrador',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ord_fabricaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ord_trabajos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;

-- ELIMINAR POLÍTICAS ANTIGUAS SI EXISTEN
DROP POLICY IF EXISTS "Public Access" ON materiales;
DROP POLICY IF EXISTS "Public Access" ON clientes;
DROP POLICY IF EXISTS "Public Access" ON ord_fabricaciones;
DROP POLICY IF EXISTS "Public Access" ON ord_trabajos;
DROP POLICY IF EXISTS "Public Access" ON cotizaciones;

-- CREAR POLÍTICAS PARA ROL ANON (La clave que usas en el frontend)
CREATE POLICY "Public Access" ON materiales FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON clientes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON ord_fabricaciones FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON ord_trabajos FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON cotizaciones FOR ALL TO anon USING (true) WITH CHECK (true);
