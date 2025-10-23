-- ATUALIZAÇÃO FINAL DOS ITENS EXTRA
-- Remove todos os itens e insere os novos conforme solicitado

-- 1. Desabilitar RLS temporariamente
ALTER TABLE extra_items DISABLE ROW LEVEL SECURITY;

-- 2. Remover todos os itens existentes
DELETE FROM extra_items;

-- 3. Inserir os novos itens
INSERT INTO extra_items (name, description, price, category, is_active) VALUES
('Coca lata', 'Coca-Cola lata 350ml', 7.00, 'drink', true),
('Coca 600ml', 'Coca-Cola 600ml', 9.00, 'drink', true),
('Água c/ gás', 'Água com gás 500ml', 4.50, 'drink', true),
('Coca 2l', 'Coca-Cola 2 litros', 12.00, 'drink', true),
('Suco lata', 'Suco lata 350ml', 7.00, 'drink', true);

-- 4. Reabilitar RLS
ALTER TABLE extra_items ENABLE ROW LEVEL SECURITY;

-- 5. Criar política permissiva
DROP POLICY IF EXISTS "Allow all operations on extra_items" ON extra_items;
CREATE POLICY "Allow all operations on extra_items"
  ON extra_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Verificar resultado
SELECT 
  name,
  description,
  price,
  category,
  is_active
FROM extra_items 
ORDER BY name;

-- 7. Confirmar total
SELECT COUNT(*) as total_itens FROM extra_items;

