-- Recriar sistema de itens extra
-- Primeiro, recriar as tabelas se não existirem

-- Criar tabela extra_items
CREATE TABLE IF NOT EXISTS extra_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela order_extra_items
CREATE TABLE IF NOT EXISTS order_extra_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  extra_item_id UUID NOT NULL REFERENCES extra_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE extra_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_extra_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para extra_items (permissivas para usuários autenticados)
DROP POLICY IF EXISTS "extra_items_select_policy" ON extra_items;
DROP POLICY IF EXISTS "extra_items_insert_policy" ON extra_items;
DROP POLICY IF EXISTS "extra_items_update_policy" ON extra_items;
DROP POLICY IF EXISTS "extra_items_delete_policy" ON extra_items;

CREATE POLICY "extra_items_select_policy" ON extra_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "extra_items_insert_policy" ON extra_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "extra_items_update_policy" ON extra_items
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "extra_items_delete_policy" ON extra_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas RLS para order_extra_items
DROP POLICY IF EXISTS "order_extra_items_select_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_insert_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_update_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_delete_policy" ON order_extra_items;

CREATE POLICY "order_extra_items_select_policy" ON order_extra_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "order_extra_items_insert_policy" ON order_extra_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "order_extra_items_update_policy" ON order_extra_items
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "order_extra_items_delete_policy" ON order_extra_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- Inserir os itens extra solicitados
INSERT INTO extra_items (name, price) VALUES
('Coca lata', 7.00),
('Coca 600ml', 9.00),
('Água c/ gás', 4.50),
('Coca 2l', 12.00),
('Suco lata', 7.00)
ON CONFLICT DO NOTHING;
