-- =====================================================
-- MIGRAÇÃO: Tabelas de Produtos, Extras e Alertas
-- =====================================================

-- 1. Tabela de Categorias de Produtos
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2),
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER,
  unit VARCHAR(50) DEFAULT 'unit',
  is_active BOOLEAN DEFAULT true,
  image_url TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Itens Extras
CREATE TABLE IF NOT EXISTS extra_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Alertas de Estoque
CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock', 'expiring')),
  current_stock INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  message TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Criar Índices
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_extra_items_active ON extra_items(is_active);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_resolved ON stock_alerts(is_resolved);

-- 6. Habilitar RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS - Product Categories
CREATE POLICY "Authenticated users can view categories"
  ON product_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create categories"
  ON product_categories FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON product_categories FOR UPDATE TO authenticated USING (true);

-- 8. Políticas RLS - Products
CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create products"
  ON products FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE TO authenticated USING (true);

-- 9. Políticas RLS - Extra Items
CREATE POLICY "Authenticated users can view extra items"
  ON extra_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create extra items"
  ON extra_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update extra items"
  ON extra_items FOR UPDATE TO authenticated USING (true);

-- 10. Políticas RLS - Stock Alerts
CREATE POLICY "Authenticated users can view stock alerts"
  ON stock_alerts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create stock alerts"
  ON stock_alerts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update stock alerts"
  ON stock_alerts FOR UPDATE TO authenticated USING (true);

-- 11. Triggers para updated_at
CREATE TRIGGER product_categories_updated_at
BEFORE UPDATE ON product_categories
FOR EACH ROW
EXECUTE FUNCTION update_customers_updated_at();

CREATE TRIGGER products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_customers_updated_at();

CREATE TRIGGER extra_items_updated_at
BEFORE UPDATE ON extra_items
FOR EACH ROW
EXECUTE FUNCTION update_customers_updated_at();