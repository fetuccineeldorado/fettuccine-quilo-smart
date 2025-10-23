-- Script para limpar completamente e recriar itens extra
-- Execute este script no Supabase Dashboard > SQL Editor

-- 1. Desabilitar RLS temporariamente
ALTER TABLE extra_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_extra_items DISABLE ROW LEVEL SECURITY;

-- 2. Limpar completamente as tabelas
TRUNCATE TABLE order_extra_items CASCADE;
TRUNCATE TABLE extra_items CASCADE;

-- 3. Reabilitar RLS
ALTER TABLE extra_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_extra_items ENABLE ROW LEVEL SECURITY;

-- 4. Remover todas as políticas existentes
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

-- 6. Inserir APENAS os itens corretos
INSERT INTO extra_items (name, price, is_active) VALUES
('Coca lata', 7.00, true),
('Coca 600ml', 9.00, true),
('Água c/ gás', 4.50, true),
('Coca 2l', 12.00, true),
('Suco lata', 7.00, true);

-- 7. Verificar resultado
SELECT 
  name, 
  price, 
  is_active,
  created_at
FROM extra_items 
ORDER BY name;

-- 8. Contar itens
SELECT COUNT(*) as total_items FROM extra_items;
