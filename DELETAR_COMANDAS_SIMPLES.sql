-- ============================================
-- DELETAR COMANDAS - VERSÃO SIMPLES E DIRETA
-- Execute este script no Supabase SQL Editor
-- ============================================
-- Este script deleta TODAS as comandas exceto #25
-- de forma mais simples e direta
-- ============================================

-- Desabilitar RLS
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Deletar itens relacionados (exceto comanda #25)
DELETE FROM order_items 
WHERE order_id NOT IN (SELECT id FROM orders WHERE order_number = 25);

DELETE FROM payments 
WHERE order_id NOT IN (SELECT id FROM orders WHERE order_number = 25);

-- Deletar order_extra_items se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
    DELETE FROM order_extra_items 
    WHERE order_id NOT IN (SELECT id FROM orders WHERE order_number = 25);
  END IF;
END $$;

-- Deletar todas as comandas exceto #25
DELETE FROM orders 
WHERE order_number != 25;

-- Verificar resultado
SELECT 
  order_number as numero,
  customer_name as cliente,
  status,
  total_amount as total
FROM orders
ORDER BY order_number;

-- Mostrar mensagem
DO $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM orders;
  RAISE NOTICE '';
  RAISE NOTICE 'Comandas restantes: %', total;
  IF total = 1 THEN
    RAISE NOTICE 'SUCESSO! Apenas a comanda #25 permanece.';
  ELSE
    RAISE NOTICE 'ATENCAO: Ha % comanda(s) no banco', total;
  END IF;
END $$;





