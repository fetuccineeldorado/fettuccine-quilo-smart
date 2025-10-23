-- Script para criar e configurar itens extra com valores corretos
-- Execute este script no Supabase Dashboard > SQL Editor

-- 1. Criar tabela extra_items se não existir
CREATE TABLE IF NOT EXISTS extra_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela order_extra_items se não existir
CREATE TABLE IF NOT EXISTS order_extra_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  extra_item_id UUID NOT NULL REFERENCES extra_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE extra_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_extra_items ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "extra_items_all_access" ON extra_items;
DROP POLICY IF EXISTS "order_extra_items_all_access" ON order_extra_items;
DROP POLICY IF EXISTS "extra_items_select_policy" ON extra_items;
DROP POLICY IF EXISTS "extra_items_insert_policy" ON extra_items;
DROP POLICY IF EXISTS "extra_items_update_policy" ON extra_items;
DROP POLICY IF EXISTS "extra_items_delete_policy" ON extra_items;
DROP POLICY IF EXISTS "order_extra_items_select_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_insert_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_update_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_delete_policy" ON order_extra_items;

-- 5. Criar políticas RLS permissivas
CREATE POLICY "extra_items_all_access" ON extra_items FOR ALL USING (true);
CREATE POLICY "order_extra_items_all_access" ON order_extra_items FOR ALL USING (true);

-- 6. Limpar itens existentes
DELETE FROM extra_items;

-- 7. Inserir itens extra com valores corretos
INSERT INTO extra_items (name, price) VALUES
('Coca lata', 7.00),
('Coca 600ml', 9.00),
('Água c/ gás', 4.50),
('Coca 2l', 12.00),
('Suco lata', 7.00);

-- 8. Verificar se os itens foram inseridos
SELECT name, price FROM extra_items ORDER BY name;
