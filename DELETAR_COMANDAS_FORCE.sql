-- ============================================
-- DELETAR COMANDAS FORÇADAMENTE (SEM DEPENDER DE RLS)
-- Execute este script no Supabase SQL Editor
-- ============================================
-- Este script DESABILITA RLS temporariamente
-- e deleta TODAS as comandas exceto a #25
-- ============================================

-- PASSO 1: DESABILITAR RLS TEMPORARIAMENTE
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
    ALTER TABLE order_extra_items DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- PASSO 2: VERIFICAR COMANDAS ANTES
DO $$
DECLARE
  total_comandas INTEGER;
  comanda_25_id UUID;
BEGIN
  SELECT COUNT(*) INTO total_comandas FROM orders;
  SELECT id INTO comanda_25_id FROM orders WHERE order_number = 25 LIMIT 1;
  
  RAISE NOTICE 'Total de comandas: %', total_comandas;
  IF comanda_25_id IS NOT NULL THEN
    RAISE NOTICE 'Comanda #25 encontrada (ID: %)', comanda_25_id;
  ELSE
    RAISE NOTICE 'Comanda #25 NAO encontrada';
  END IF;
END $$;

-- PASSO 3: DELETAR ITENS RELACIONADOS (exceto comanda #25)
DO $$
DECLARE
  comanda_25_id UUID;
  items_deleted INTEGER;
  extra_items_deleted INTEGER;
  payments_deleted INTEGER;
BEGIN
  SELECT id INTO comanda_25_id FROM orders WHERE order_number = 25 LIMIT 1;
  
  IF comanda_25_id IS NOT NULL THEN
    -- Deletar order_items de outras comandas
    DELETE FROM order_items WHERE order_id != comanda_25_id;
    GET DIAGNOSTICS items_deleted = ROW_COUNT;
    
    -- Deletar order_extra_items de outras comandas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
      DELETE FROM order_extra_items WHERE order_id != comanda_25_id;
      GET DIAGNOSTICS extra_items_deleted = ROW_COUNT;
    ELSE
      extra_items_deleted := 0;
    END IF;
    
    -- Deletar payments de outras comandas
    DELETE FROM payments WHERE order_id != comanda_25_id;
    GET DIAGNOSTICS payments_deleted = ROW_COUNT;
    
    RAISE NOTICE 'Itens deletados: %', items_deleted;
    RAISE NOTICE 'Itens extras deletados: %', extra_items_deleted;
    RAISE NOTICE 'Pagamentos deletados: %', payments_deleted;
  ELSE
    -- Se comanda #25 não existe, deletar tudo
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
    
    RAISE NOTICE 'Todos os itens deletados (comanda #25 nao existe)';
  END IF;
END $$;

-- PASSO 4: DELETAR TODAS AS COMANDAS EXCETO #25 (FORÇADO)
DO $$
DECLARE
  comandas_deletadas INTEGER;
  comanda_25_id UUID;
BEGIN
  SELECT id INTO comanda_25_id FROM orders WHERE order_number = 25 LIMIT 1;
  
  IF comanda_25_id IS NOT NULL THEN
    -- Deletar todas exceto #25
    DELETE FROM orders WHERE order_number != 25;
    GET DIAGNOSTICS comandas_deletadas = ROW_COUNT;
    
    RAISE NOTICE '% comanda(s) deletada(s)', comandas_deletadas;
    RAISE NOTICE 'Comanda #25 preservada (ID: %)', comanda_25_id;
  ELSE
    -- Deletar todas
    DELETE FROM orders;
    GET DIAGNOSTICS comandas_deletadas = ROW_COUNT;
    
    RAISE NOTICE '% comanda(s) deletada(s)', comandas_deletadas;
    RAISE NOTICE 'Comanda #25 nao existia';
  END IF;
END $$;

-- PASSO 5: VERIFICAR RESULTADO
SELECT 
  id,
  order_number as numero,
  customer_name as cliente,
  status,
  total_amount as total
FROM orders
ORDER BY order_number;

-- PASSO 6: VERIFICACAO FINAL
DO $$
DECLARE
  total_comandas INTEGER;
  comanda_25_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO total_comandas FROM orders;
  SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = 25) INTO comanda_25_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE 'RESULTADO FINAL:';
  RAISE NOTICE 'Total de comandas restantes: %', total_comandas;
  
  IF comanda_25_exists THEN
    RAISE NOTICE 'SUCESSO! Comanda #25 preservada';
  ELSE
    IF total_comandas = 0 THEN
      RAISE NOTICE 'Todas as comandas foram deletadas (comanda #25 nao existia)';
    ELSE
      RAISE NOTICE 'ATENCAO: Comanda #25 nao foi encontrada';
    END IF;
  END IF;
END $$;

-- PASSO 7: REABILITAR RLS (OPCIONAL - comente se quiser manter desabilitado)
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;


