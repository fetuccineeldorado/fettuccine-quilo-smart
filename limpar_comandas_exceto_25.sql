-- ============================================
-- LIMPAR TODAS AS COMANDAS EXCETO A COMANDA #25
-- Execute este script no Supabase SQL Editor
-- ============================================
-- ATENCAO: Este script DELETA TODAS as comandas
-- exceto a comanda com order_number = 25
-- ============================================

-- PASSO 1: VERIFICAR COMANDAS ANTES DA LIMPEZA
DO $$
DECLARE
  total_comandas INTEGER;
  comanda_25_id UUID;
  comanda_25_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO total_comandas FROM orders;
  
  SELECT id, true INTO comanda_25_id, comanda_25_exists
  FROM orders
  WHERE order_number = 25
  LIMIT 1;
  
  RAISE NOTICE '';
  RAISE NOTICE 'SITUACAO ATUAL';
  RAISE NOTICE 'Total de comandas no banco: %', total_comandas;
  
  IF comanda_25_exists THEN
    RAISE NOTICE 'Comanda #25 encontrada! (ID: %)', comanda_25_id;
    RAISE NOTICE 'Esta comanda sera PRESERVADA';
  ELSE
    RAISE NOTICE 'ATENCAO: Comanda #25 NAO encontrada!';
    RAISE NOTICE 'Todas as comandas serao deletadas!';
  END IF;
  
  RAISE NOTICE 'Serao deletadas: % comanda(s)', total_comandas - (CASE WHEN comanda_25_exists THEN 1 ELSE 0 END);
  RAISE NOTICE '';
END $$;

-- Mostrar todas as comandas antes da limpeza
SELECT 
  id,
  order_number as numero,
  customer_name as cliente,
  status,
  total_amount as total,
  updated_at as atualizada_em
FROM orders
ORDER BY order_number;

-- PASSO 2: DELETAR ITENS RELACIONADOS (exceto comanda #25)
DO $$
DECLARE
  comanda_25_id UUID;
  items_deleted INTEGER;
  extra_items_deleted INTEGER;
  payments_deleted INTEGER;
BEGIN
  SELECT id INTO comanda_25_id
  FROM orders
  WHERE order_number = 25
  LIMIT 1;
  
  IF comanda_25_id IS NOT NULL THEN
    RAISE NOTICE 'Deletando itens relacionados (exceto comanda #25)...';
    
    DELETE FROM order_items
    WHERE order_id != comanda_25_id;
    GET DIAGNOSTICS items_deleted = ROW_COUNT;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
      DELETE FROM order_extra_items
      WHERE order_id != comanda_25_id;
      GET DIAGNOSTICS extra_items_deleted = ROW_COUNT;
    ELSE
      extra_items_deleted := 0;
    END IF;
    
    DELETE FROM payments
    WHERE order_id != comanda_25_id;
    GET DIAGNOSTICS payments_deleted = ROW_COUNT;
    
    RAISE NOTICE 'Itens deletados: %', items_deleted;
    RAISE NOTICE 'Itens extras deletados: %', extra_items_deleted;
    RAISE NOTICE 'Pagamentos deletados: %', payments_deleted;
  ELSE
    RAISE NOTICE 'Comanda #25 nao encontrada. Deletando todos os itens relacionados...';
    
    DELETE FROM order_items;
    GET DIAGNOSTICS items_deleted = ROW_COUNT;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
      DELETE FROM order_extra_items;
      GET DIAGNOSTICS extra_items_deleted = ROW_COUNT;
    ELSE
      extra_items_deleted := 0;
    END IF;
    
    DELETE FROM payments;
    GET DIAGNOSTICS payments_deleted = ROW_COUNT;
    
    RAISE NOTICE 'Todos os itens deletados';
  END IF;
END $$;

-- PASSO 3: DELETAR TODAS AS COMANDAS EXCETO #25
DO $$
DECLARE
  comandas_deletadas INTEGER;
  comanda_25_id UUID;
  comanda_25_exists BOOLEAN;
BEGIN
  RAISE NOTICE 'Deletando comandas (exceto #25)...';
  
  SELECT id, true INTO comanda_25_id, comanda_25_exists
  FROM orders
  WHERE order_number = 25
  LIMIT 1;
  
  IF comanda_25_exists THEN
    DELETE FROM orders
    WHERE order_number != 25;
    GET DIAGNOSTICS comandas_deletadas = ROW_COUNT;
    
    RAISE NOTICE '% comanda(s) deletada(s)', comandas_deletadas;
    RAISE NOTICE 'Comanda #25 preservada (ID: %)', comanda_25_id;
  ELSE
    DELETE FROM orders;
    GET DIAGNOSTICS comandas_deletadas = ROW_COUNT;
    
    RAISE NOTICE '% comanda(s) deletada(s)', comandas_deletadas;
    RAISE NOTICE 'Comanda #25 nao existia, entao todas foram deletadas';
  END IF;
END $$;

-- PASSO 4: VERIFICAR COMANDAS APOS A LIMPEZA
SELECT 
  id,
  order_number as numero,
  customer_name as cliente,
  status,
  total_amount as total,
  updated_at as atualizada_em
FROM orders
ORDER BY order_number;

-- PASSO 5: VERIFICACAO FINAL
DO $$
DECLARE
  total_comandas INTEGER;
  comanda_25_exists BOOLEAN;
  comanda_25_info RECORD;
BEGIN
  SELECT COUNT(*) INTO total_comandas FROM orders;
  
  SELECT id, order_number, customer_name, status, total_amount INTO comanda_25_info
  FROM orders
  WHERE order_number = 25
  LIMIT 1;
  
  comanda_25_exists := (comanda_25_info.id IS NOT NULL);
  
  RAISE NOTICE '';
  RAISE NOTICE 'LIMPEZA CONCLUIDA!';
  RAISE NOTICE 'Total de comandas restantes: %', total_comandas;
  
  IF comanda_25_exists THEN
    RAISE NOTICE 'Comanda #25 PRESERVADA:';
    RAISE NOTICE '  - ID: %', comanda_25_info.id;
    RAISE NOTICE '  - Cliente: %', comanda_25_info.customer_name;
    RAISE NOTICE '  - Status: %', comanda_25_info.status;
    RAISE NOTICE '  - Total: R$ %', comanda_25_info.total_amount;
    RAISE NOTICE 'SUCESSO! Apenas a comanda #25 permanece no banco.';
  ELSE
    IF total_comandas = 0 THEN
      RAISE NOTICE 'Nenhuma comanda restante no banco.';
      RAISE NOTICE '(A comanda #25 nao existia)';
    ELSE
      RAISE NOTICE 'ATENCAO: Comanda #25 nao foi encontrada, mas ha % comanda(s) restante(s).', total_comandas;
    END IF;
  END IF;
END $$;

