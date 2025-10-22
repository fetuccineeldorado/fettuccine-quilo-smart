-- Atualizar itens extras conforme solicitado
-- Remover todos os itens existentes e inserir os novos

-- 1. Remover todos os itens extras existentes
DELETE FROM extra_items;

-- 2. Inserir os novos itens conforme especificação
INSERT INTO extra_items (name, description, price, category, is_active) VALUES
('Coca lata', 'Coca-Cola lata 350ml', 7.00, 'drink', true),
('Coca 600ml', 'Coca-Cola 600ml', 9.00, 'drink', true),
('Água c/ gás', 'Água com gás 500ml', 4.50, 'drink', true),
('Coca 2l', 'Coca-Cola 2 litros', 12.00, 'drink', true),
('Suco lata', 'Suco lata 350ml', 7.00, 'drink', true);

-- 3. Verificar os itens inseridos
SELECT 
  name,
  description,
  price,
  category,
  is_active
FROM extra_items 
ORDER BY name;

-- 4. Confirmar total de itens
SELECT COUNT(*) as total_itens FROM extra_items;
