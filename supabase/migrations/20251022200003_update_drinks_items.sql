-- Desativar itens antigos de bebidas
UPDATE extra_items 
SET is_active = false 
WHERE category = 'drink' AND is_active = true;

-- Adicionar as bebidas específicas solicitadas (apenas se ainda não existirem)
INSERT INTO extra_items (name, description, price, category, is_active) 
SELECT * FROM (VALUES
  ('Refrigerante 600ml', 'Refrigerante garrafa 600ml', 6.50, 'drink', true),
  ('Refrigerante Lata', 'Refrigerante lata 350ml', 4.50, 'drink', true),
  ('Água sem Gás', 'Água mineral sem gás 500ml', 3.00, 'drink', true),
  ('Água com Gás', 'Água mineral com gás 500ml', 3.50, 'drink', true),
  ('Suco Lata', 'Suco em lata 350ml', 5.00, 'drink', true)
) AS new_items(name, description, price, category, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM extra_items 
  WHERE extra_items.name = new_items.name 
  AND extra_items.is_active = true
);

