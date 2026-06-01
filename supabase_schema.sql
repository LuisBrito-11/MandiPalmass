-- ========================================================
-- MANDIPALMAS POS SYSTEM - SUPABASE SCHEMA MIGRATION
-- Copy and paste this script in your Supabase SQL Editor
-- ========================================================

-- Disable Row Level Security (RLS) for simple setup (as requested, local/trusted client only)
-- Note: In production you can enable RLS, but for a local-first trusted single-PC app, this is fine.

-- Drop existing tables if they exist
DROP TABLE IF EXISTS recetas CASCADE;
DROP TABLE IF EXISTS pedido_items CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS mesas CASCADE;
DROP TABLE IF EXISTS inventario CASCADE;
DROP TABLE IF EXISTS cierres_caja CASCADE;

-- 1. Categorias
CREATE TABLE categorias (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  emoji TEXT,
  orden INTEGER DEFAULT 0,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Productos
CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  precio INTEGER NOT NULL,
  ingredientes TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Mesas
CREATE TABLE mesas (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  estado TEXT DEFAULT 'libre', -- 'libre', 'ocupada', 'cuenta'
  pedido_activo_id INTEGER,
  hora_ocupacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Pedidos
CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  numero INTEGER NOT NULL,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  mesa_id INTEGER REFERENCES mesas(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL, -- 'mesa', 'llevar', 'domicilio'
  metodo_pago TEXT, -- 'efectivo', 'transferencia'
  total INTEGER NOT NULL,
  recibido INTEGER DEFAULT 0,
  cambio INTEGER DEFAULT 0,
  direccion TEXT,
  notas TEXT,
  estado TEXT DEFAULT 'completado',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Pedido Items
CREATE TABLE pedido_items (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_codigo TEXT,
  nombre TEXT NOT NULL,
  precio_unitario INTEGER NOT NULL,
  cantidad INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  personalizacion JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Inventario
CREATE TABLE inventario (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  cantidad_actual REAL DEFAULT 0,
  unidad TEXT DEFAULT 'unidades',
  stock_minimo REAL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Recetas
CREATE TABLE recetas (
  id SERIAL PRIMARY KEY,
  producto_codigo TEXT NOT NULL,
  inventario_id INTEGER REFERENCES inventario(id) ON DELETE CASCADE,
  cantidad_requerida REAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Cierres de caja
CREATE TABLE cierres_caja (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  total_ventas INTEGER,
  total_efectivo INTEGER,
  total_transferencia INTEGER,
  cantidad_pedidos INTEGER,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- SEED INITIAL DATA
-- ==========================================

-- Seed Categorias
INSERT INTO categorias (id, nombre, emoji, orden, activa) VALUES
(1, 'Mandingas', '🍟', 1, true),
(2, 'Perritos', '🌭', 2, true);

-- Seed Productos (Mandingas)
INSERT INTO productos (categoria_id, codigo, nombre, precio, ingredientes) VALUES
(1, 'salchi', 'SALCHIPAPAS', 10000, '150g de papas, salchichas y huevo de codorniz.'),
(1, 'superm', 'SUPERMANDINGAS', 15000, '250g de papas, salchichas, chorizos cocteleros, huevos de codorniz y arepita.'),
(1, 'mandimix', 'MANDIMIXTA', 26500, '250g de papas, 90g de pollo desmechado, 90g de carne desmechada, huevos de codorniz, guacamole y pico de gallo.'),
(1, 'mandipollo_p', 'MANDIPOLLO PEQUEÑA', 15000, '150g de papas, salchichas, chorizo coctelero, 90g de pollo desmechado y huevo de codorniz.'),
(1, 'mandipollo_g', 'MANDIPOLLO GRANDE', 20000, '250g de papas, salchichas, chorizos cocteleros, 140g de pollo desmechado y huevos de codorniz.'),
(1, 'mandicarne_p', 'MANDICARNE PEQUEÑA', 19000, '150g de papas, salchichas, chorizo coctelero, 90g de carne desmechada, huevo de codorniz, guacamole y pico de gallo.'),
(1, 'mandicarne_g', 'MANDICARNE GRANDE', 26500, '250g de papas, salchichas, chorizos cocteleros, 140g de carne desmechada, huevos de codorniz, guacamole y pico de gallo.'),
(1, 'mandilongui', 'MANDILONGUI', 16000, '250g de papas, longaniza, chorizos cocteleros y una arepa.'),
(1, 'choripapas', 'CHORIPAPAS', 20000, '200g de papas, chorizo casero, huevos de codorniz y arepa.'),
(1, 'longuichorizo', 'LONGUICHORIZO', 22000, '200g de papas, longaniza, chorizo casero y arepa.'),
(1, 'mandibombon_p', 'MANDIBOMBÓN PEQUEÑO', 16000, '150g de papas, bombón de pollo, torta de pollo, arepa y huevo de codorniz.'),
(1, 'mandibombon_g', 'MANDIBOMBÓN GRANDE', 20000, '250g de papas, bombón de pollo, torta de pollo, arepa y huevos de codorniz.');

-- Seed Productos (Perritos)
INSERT INTO productos (categoria_id, codigo, nombre, precio, ingredientes) VALUES
(2, 'perrito', 'PERRITO', 6000, 'Pan suave, salchicha y salsas al gusto.'),
(2, 'comboperro', 'COMBOPERRO', 11000, 'Perrito + adición de papas.'),
(2, 'choriperro', 'CHORIPERRO', 15000, 'Chorizo jugoso en pan suave.'),
(2, 'combochori', 'COMBO CHORIPERRO', 20000, 'Choriperro + adición de papas.');

-- Seed 15 Mesas
INSERT INTO mesas (id, nombre, estado) VALUES
(1, 'Mesa 1', 'libre'),
(2, 'Mesa 2', 'libre'),
(3, 'Mesa 3', 'libre'),
(4, 'Mesa 4', 'libre'),
(5, 'Mesa 5', 'libre'),
(6, 'Mesa 6', 'libre'),
(7, 'Mesa 7', 'libre'),
(8, 'Mesa 8', 'libre'),
(9, 'Mesa 9', 'libre'),
(10, 'Mesa 10', 'libre'),
(11, 'Mesa 11', 'libre'),
(12, 'Mesa 12', 'libre'),
(13, 'Mesa 13', 'libre'),
(14, 'Mesa 14', 'libre'),
(15, 'Mesa 15', 'libre');

-- Enable permissions
ALTER TABLE categorias FORCE ROW LEVEL SECURITY;
ALTER TABLE productos FORCE ROW LEVEL SECURITY;
ALTER TABLE mesas FORCE ROW LEVEL SECURITY;
ALTER TABLE pedidos FORCE ROW LEVEL SECURITY;
ALTER TABLE pedido_items FORCE ROW LEVEL SECURITY;
ALTER TABLE inventario FORCE ROW LEVEL SECURITY;
ALTER TABLE recetas FORCE ROW LEVEL SECURITY;
ALTER TABLE cierres_caja FORCE ROW LEVEL SECURITY;

-- Create policies (Allow select/insert/update/delete for authenticated and anon to simplify trusted local app)
CREATE POLICY "Allow public read on categorias" ON categorias FOR SELECT USING (true);
CREATE POLICY "Allow public write on categorias" ON categorias FOR ALL USING (true);

CREATE POLICY "Allow public read on productos" ON productos FOR SELECT USING (true);
CREATE POLICY "Allow public write on productos" ON productos FOR ALL USING (true);

CREATE POLICY "Allow public read on mesas" ON mesas FOR SELECT USING (true);
CREATE POLICY "Allow public write on mesas" ON mesas FOR ALL USING (true);

CREATE POLICY "Allow public read on pedidos" ON pedidos FOR SELECT USING (true);
CREATE POLICY "Allow public write on pedidos" ON pedidos FOR ALL USING (true);

CREATE POLICY "Allow public read on pedido_items" ON pedido_items FOR SELECT USING (true);
CREATE POLICY "Allow public write on pedido_items" ON pedido_items FOR ALL USING (true);

CREATE POLICY "Allow public read on inventario" ON inventario FOR SELECT USING (true);
CREATE POLICY "Allow public write on inventario" ON inventario FOR ALL USING (true);

CREATE POLICY "Allow public read on recetas" ON recetas FOR SELECT USING (true);
CREATE POLICY "Allow public write on recetas" ON recetas FOR ALL USING (true);

CREATE POLICY "Allow public read on cierres_caja" ON cierres_caja FOR SELECT USING (true);
CREATE POLICY "Allow public write on cierres_caja" ON cierres_caja FOR ALL USING (true);
