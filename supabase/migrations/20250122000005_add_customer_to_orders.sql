-- Adicionar campo customer_name à tabela orders
ALTER TABLE orders 
ADD COLUMN customer_name VARCHAR(255);

-- Criar índice para melhorar performance nas buscas por cliente
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);

