-- Adicionar bebidas específicas solicitadas
-- Primeiro, vamos limpar os itens padrão existentes e adicionar os específicos

-- Desativar itens antigos de bebidas
UPDATE extra_items 
SET is_active = false 
WHERE category = 'drink';

-- Adicionar as bebidas específicas solicitadas
INSERT INTO extra_items (name, description, price, category, is_active) VALUES
('Refrigerante 600ml', 'Refrigerante garrafa 600ml', 6.50, 'drink', true),
('Refrigerante Lata', 'Refrigerante lata 350ml', 4.50, 'drink', true),
('Água sem Gás', 'Água mineral sem gás 500ml', 3.00, 'drink', true),
('Água com Gás', 'Água mineral com gás 500ml', 3.50, 'drink', true),
('Suco Lata', 'Suco em lata 350ml', 5.00, 'drink', true);

