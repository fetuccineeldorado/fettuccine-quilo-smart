-- Create product categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  sku TEXT UNIQUE,
  barcode TEXT UNIQUE,
  unit TEXT NOT NULL DEFAULT 'unidade',
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
  max_stock DECIMAL(10,3),
  current_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  is_tracked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create inventory_movements table for tracking all stock changes
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer')),
  quantity DECIMAL(10,3) NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  reference_type TEXT, -- 'order', 'purchase', 'adjustment', 'transfer'
  reference_id UUID, -- ID of the order, purchase, etc.
  notes TEXT,
  operator_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create stock_alerts table for low stock notifications
CREATE TABLE IF NOT EXISTS stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock')),
  current_stock DECIMAL(10,3) NOT NULL,
  threshold DECIMAL(10,3) NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create product_sales table to track sales by product
CREATE TABLE IF NOT EXISTS product_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default categories
INSERT INTO product_categories (name, description, color) VALUES
('Alimentos', 'Produtos alimentícios em geral', '#10B981'),
('Bebidas', 'Bebidas e líquidos', '#3B82F6'),
('Sobremesas', 'Doces e sobremesas', '#F59E0B'),
('Itens Extras', 'Itens adicionais e complementos', '#8B5CF6'),
('Ingredientes', 'Ingredientes para preparo', '#EF4444');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON stock_alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_resolved ON stock_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_product_sales_product ON product_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_order ON product_sales(order_id);

-- Create function to update product stock
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current stock based on movement
  IF NEW.movement_type = 'in' THEN
    UPDATE products 
    SET current_stock = current_stock + NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE products 
    SET current_stock = current_stock - NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
  ELSIF NEW.movement_type = 'adjustment' THEN
    UPDATE products 
    SET current_stock = NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;

  -- Check for stock alerts
  PERFORM check_stock_alerts(NEW.product_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to check stock alerts
CREATE OR REPLACE FUNCTION check_stock_alerts(product_uuid UUID)
RETURNS VOID AS $$
DECLARE
  product_record RECORD;
BEGIN
  SELECT * INTO product_record FROM products WHERE id = product_uuid;
  
  -- Check for low stock or out of stock
  IF product_record.current_stock <= 0 THEN
    INSERT INTO stock_alerts (product_id, alert_type, current_stock, threshold)
    VALUES (product_uuid, 'out_of_stock', product_record.current_stock, 0)
    ON CONFLICT DO NOTHING;
  ELSIF product_record.current_stock <= product_record.min_stock THEN
    INSERT INTO stock_alerts (product_id, alert_type, current_stock, threshold)
    VALUES (product_uuid, 'low_stock', product_record.current_stock, product_record.min_stock)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory movements
CREATE TRIGGER trigger_update_product_stock
  AFTER INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON product_categories FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON product_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON product_categories FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON products FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON inventory_movements FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON inventory_movements FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON inventory_movements FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON stock_alerts FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON stock_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON stock_alerts FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON product_sales FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON product_sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON product_sales FOR UPDATE USING (true);

-- Create trigger for updating timestamps
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
