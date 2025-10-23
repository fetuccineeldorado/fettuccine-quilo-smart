-- Script COMPLETO para resetar todo o sistema FETTUCCINE
-- Execute este script no Supabase Dashboard > SQL Editor
-- ⚠️ ATENÇÃO: Este script irá APAGAR TODOS os dados do sistema!

-- ===========================================
-- 1. LIMPAR TODAS AS COMANDAS E VENDAS
-- ===========================================

-- Limpar dados relacionados às vendas
DELETE FROM product_sales;
DELETE FROM order_extra_items;
DELETE FROM order_items;
DELETE FROM payments;
DELETE FROM orders;

-- ===========================================
-- 2. LIMPAR SISTEMA DE ESTOQUE
-- ===========================================

-- Limpar movimentações de estoque
DELETE FROM inventory_movements;

-- Limpar alertas de estoque
DELETE FROM stock_alerts;

-- Limpar produtos
DELETE FROM products;

-- Limpar categorias de produtos
DELETE FROM product_categories;

-- ===========================================
-- 3. LIMPAR SISTEMA DE CAIXA
-- ===========================================

-- Limpar registros de abertura/fechamento de caixa
DELETE FROM cash_register;

-- ===========================================
-- 4. LIMPAR SISTEMA DE CLIENTES
-- ===========================================

-- Limpar clientes (se existir tabela)
-- DELETE FROM customers; -- Descomente se existir

-- ===========================================
-- 5. LIMPAR SISTEMA DE FUNCIONÁRIOS
-- ===========================================

-- Limpar funcionários (se existir tabela)
-- DELETE FROM employees; -- Descomente se existir

-- ===========================================
-- 6. RESETAR CONFIGURAÇÕES DO SISTEMA
-- ===========================================

-- Resetar configurações para valores padrão
UPDATE system_settings SET 
  price_per_kg = 54.90,
  updated_at = NOW();

-- ===========================================
-- 7. RECRIAR CATEGORIAS PADRÃO
-- ===========================================

-- Inserir categorias padrão do sistema
INSERT INTO product_categories (name, description, color) VALUES
('Alimentos', 'Produtos alimentícios em geral', '#10B981'),
('Bebidas', 'Bebidas e líquidos', '#3B82F6'),
('Sobremesas', 'Doces e sobremesas', '#F59E0B'),
('Itens Extras', 'Itens adicionais e complementos', '#8B5CF6'),
('Ingredientes', 'Ingredientes para preparo', '#EF4444');

-- ===========================================
-- 8. VERIFICAÇÃO FINAL
-- ===========================================

-- Verificar se todas as tabelas estão vazias
SELECT 'orders' as tabela, COUNT(*) as registros FROM orders
UNION ALL
SELECT 'order_items' as tabela, COUNT(*) as registros FROM order_items
UNION ALL
SELECT 'order_extra_items' as tabela, COUNT(*) as registros FROM order_extra_items
UNION ALL
SELECT 'payments' as tabela, COUNT(*) as registros FROM payments
UNION ALL
SELECT 'cash_register' as tabela, COUNT(*) as registros FROM cash_register
UNION ALL
SELECT 'products' as tabela, COUNT(*) as registros FROM products
UNION ALL
SELECT 'inventory_movements' as tabela, COUNT(*) as registros FROM inventory_movements
UNION ALL
SELECT 'stock_alerts' as tabela, COUNT(*) as registros FROM stock_alerts
UNION ALL
SELECT 'product_sales' as tabela, COUNT(*) as registros FROM product_sales;

-- Mostrar configurações atuais
SELECT 
  price_per_kg,
  updated_at
FROM system_settings;

-- Mostrar categorias criadas
SELECT 
  name,
  description,
  color
FROM product_categories
ORDER BY name;

-- ===========================================
-- 9. MENSAGEM DE CONFIRMAÇÃO
-- ===========================================

SELECT 'SISTEMA RESETADO COM SUCESSO!' as status,
       'Todas as comandas, vendas, estoque e dados foram limpos.' as descricao,
       'O sistema está pronto para uso em produção.' as proximo_passo;
