-- ============================================
-- REMOVER TODAS AS RESTRIÇÕES RLS
-- Execute este script no Supabase SQL Editor
-- ============================================
-- ⚠️ ATENÇÃO: Este script REMOVE TODAS as políticas RLS
-- e DESABILITA RLS nas tabelas de comandas
-- Isso permite exclusão SEM NENHUMA RESTRIÇÃO
-- ============================================

-- ============================================
-- PASSO 1: REMOVER TODAS AS POLÍTICAS RLS
-- ============================================
DO $$
DECLARE
  r RECORD;
  total_removed INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🗑️ Removendo TODAS as políticas RLS...';
  RAISE NOTICE '';
  
  -- Remover TODAS as políticas de orders
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'orders'
  ) LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON orders', r.policyname);
      total_removed := total_removed + 1;
      RAISE NOTICE '   ✅ Removida: orders.%', r.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️ Erro ao remover orders.%: %', r.policyname, SQLERRM;
    END;
  END LOOP;
  
  -- Remover TODAS as políticas de order_items
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'order_items'
  ) LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON order_items', r.policyname);
      total_removed := total_removed + 1;
      RAISE NOTICE '   ✅ Removida: order_items.%', r.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️ Erro ao remover order_items.%: %', r.policyname, SQLERRM;
    END;
  END LOOP;
  
  -- Remover TODAS as políticas de payments
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'payments'
  ) LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON payments', r.policyname);
      total_removed := total_removed + 1;
      RAISE NOTICE '   ✅ Removida: payments.%', r.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '   ⚠️ Erro ao remover payments.%: %', r.policyname, SQLERRM;
    END;
  END LOOP;
  
  -- Remover TODAS as políticas de order_extra_items (se existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
    FOR r IN (
      SELECT policyname 
      FROM pg_policies 
      WHERE tablename = 'order_extra_items'
    ) LOOP
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS %I ON order_extra_items', r.policyname);
        total_removed := total_removed + 1;
        RAISE NOTICE '   ✅ Removida: order_extra_items.%', r.policyname;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ⚠️ Erro ao remover order_extra_items.%: %', r.policyname, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total de políticas removidas: %', total_removed;
  RAISE NOTICE '';
END $$;

-- ============================================
-- PASSO 2: DESABILITAR RLS COMPLETAMENTE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔓 Desabilitando RLS nas tabelas...';
  RAISE NOTICE '';
END $$;

ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
    ALTER TABLE order_extra_items DISABLE ROW LEVEL SECURITY;
  END IF;
  
  RAISE NOTICE '   ✅ RLS desabilitado em orders';
  RAISE NOTICE '   ✅ RLS desabilitado em order_items';
  RAISE NOTICE '   ✅ RLS desabilitado em payments';
  RAISE NOTICE '';
END $$;

-- ============================================
-- PASSO 3: VERIFICAR STATUS
-- ============================================
SELECT 
  'Status RLS' as categoria,
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '❌ HABILITADO (ainda há restrições)'
    ELSE '✅ DESABILITADO (sem restrições)'
  END as status_rls,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as total_politicas
FROM pg_tables
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
  AND schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- PASSO 4: VERIFICAR SE AINDA HÁ POLÍTICAS
-- ============================================
SELECT 
  'Políticas Restantes' as categoria,
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
ORDER BY tablename, policyname;

-- ============================================
-- PASSO 5: MENSAGEM FINAL
-- ============================================
DO $$
DECLARE
  orders_rls_enabled BOOLEAN;
  items_rls_enabled BOOLEAN;
  payments_rls_enabled BOOLEAN;
  orders_policies_count INTEGER;
  items_policies_count INTEGER;
  payments_policies_count INTEGER;
BEGIN
  -- Verificar status RLS
  SELECT rowsecurity INTO orders_rls_enabled
  FROM pg_tables
  WHERE tablename = 'orders' AND schemaname = 'public';
  
  SELECT rowsecurity INTO items_rls_enabled
  FROM pg_tables
  WHERE tablename = 'order_items' AND schemaname = 'public';
  
  SELECT rowsecurity INTO payments_rls_enabled
  FROM pg_tables
  WHERE tablename = 'payments' AND schemaname = 'public';
  
  -- Contar políticas restantes
  SELECT COUNT(*) INTO orders_policies_count
  FROM pg_policies
  WHERE tablename = 'orders';
  
  SELECT COUNT(*) INTO items_policies_count
  FROM pg_policies
  WHERE tablename = 'order_items';
  
  SELECT COUNT(*) INTO payments_policies_count
  FROM pg_policies
  WHERE tablename = 'payments';
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ REMOÇÃO DE RESTRIÇÕES RLS CONCLUÍDA!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Status RLS:';
  RAISE NOTICE '   - orders: %', CASE WHEN orders_rls_enabled THEN '❌ AINDA HABILITADO' ELSE '✅ DESABILITADO' END;
  RAISE NOTICE '   - order_items: %', CASE WHEN items_rls_enabled THEN '❌ AINDA HABILITADO' ELSE '✅ DESABILITADO' END;
  RAISE NOTICE '   - payments: %', CASE WHEN payments_rls_enabled THEN '❌ AINDA HABILITADO' ELSE '✅ DESABILITADO' END;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Políticas restantes:';
  RAISE NOTICE '   - orders: % política(s)', orders_policies_count;
  RAISE NOTICE '   - order_items: % política(s)', items_policies_count;
  RAISE NOTICE '   - payments: % política(s)', payments_policies_count;
  RAISE NOTICE '';
  
  IF NOT orders_rls_enabled AND NOT items_rls_enabled AND NOT payments_rls_enabled THEN
    IF orders_policies_count = 0 AND items_policies_count = 0 AND payments_policies_count = 0 THEN
      RAISE NOTICE '✅ SUCESSO TOTAL! Todas as restrições foram removidas!';
      RAISE NOTICE '';
      RAISE NOTICE '🎉 Agora você pode excluir comandas sem nenhuma restrição!';
      RAISE NOTICE '';
      RAISE NOTICE '💡 Próximos passos:';
      RAISE NOTICE '   1. Recarregue a página do sistema (F5)';
      RAISE NOTICE '   2. Limpe o cache do navegador (Ctrl+Shift+R)';
      RAISE NOTICE '   3. Tente excluir uma comanda';
      RAISE NOTICE '   4. Deve funcionar agora! ✅';
    ELSE
      RAISE NOTICE '⚠️ ATENÇÃO: RLS está desabilitado mas ainda há políticas!';
      RAISE NOTICE '   Execute este script novamente para remover as políticas restantes.';
    END IF;
  ELSE
    RAISE NOTICE '❌ ERRO: RLS ainda está habilitado em algumas tabelas!';
    RAISE NOTICE '   Execute este script novamente ou verifique manualmente.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE: Com RLS desabilitado, qualquer usuário autenticado';
  RAISE NOTICE '   pode excluir qualquer comanda. Use com cuidado em produção!';
  RAISE NOTICE '';
END $$;

