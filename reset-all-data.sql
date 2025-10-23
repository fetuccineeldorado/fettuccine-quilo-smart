-- Script para resetar todas as comandas e valores
-- Execute este script no Supabase Dashboard > SQL Editor

-- 1. Limpar todas as comandas e dados relacionados
DELETE FROM order_extra_items;
DELETE FROM order_items;
DELETE FROM payments;
DELETE FROM orders;

-- 2. Resetar contador de comandas (se existir)
-- Nota: Se houver uma sequência para order_number, ela será resetada automaticamente

-- 3. Limpar dados do caixa
DELETE FROM cash_register;

-- 4. Resetar configurações do sistema (manter apenas as configurações básicas)
UPDATE system_settings SET 
  price_per_kg = 54.90,
  updated_at = NOW()
WHERE id = (SELECT id FROM system_settings LIMIT 1);

-- 5. Verificar se as tabelas estão vazias
SELECT 'orders' as tabela, COUNT(*) as registros FROM orders
UNION ALL
SELECT 'order_items' as tabela, COUNT(*) as registros FROM order_items
UNION ALL
SELECT 'order_extra_items' as tabela, COUNT(*) as registros FROM order_extra_items
UNION ALL
SELECT 'payments' as tabela, COUNT(*) as registros FROM payments
UNION ALL
SELECT 'cash_register' as tabela, COUNT(*) as registros FROM cash_register;

-- 6. Mostrar configurações atuais
SELECT 
  price_per_kg,
  updated_at
FROM system_settings
LIMIT 1;
