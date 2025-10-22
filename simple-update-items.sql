-- ATUALIZAÇÃO SIMPLES DOS ITENS EXTRA
-- Script direto para substituir todos os itens

-- Remover todos os itens existentes
TRUNCATE TABLE extra_items;

-- Inserir os novos itens
INSERT INTO extra_items (name, description, price, category, is_active) VALUES
('Coca lata', 'Coca-Cola lata 350ml', 7.00, 'drink', true),
('Coca 600ml', 'Coca-Cola 600ml', 9.00, 'drink', true),
('Água c/ gás', 'Água com gás 500ml', 4.50, 'drink', true),
('Coca 2l', 'Coca-Cola 2 litros', 12.00, 'drink', true),
('Suco lata', 'Suco lata 350ml', 7.00, 'drink', true);

-- Verificar resultado
SELECT name, price, category FROM extra_items ORDER BY name;
