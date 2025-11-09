-- ============================================
-- FIX DEFINITIVO: Permitir exclusão de comandas
-- Execute este script no Supabase SQL Editor
-- ============================================
-- Este script remove TODAS as políticas conflitantes
-- e cria políticas permissivas para DELETE
-- ============================================

-- ============================================
-- PASSO 1: REMOVER TODAS AS POLÍTICAS DE DELETE PARA orders
-- ============================================
DO $$
DECLARE
  r RECORD;
  policies_removed INTEGER := 0;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'orders' AND cmd = 'DELETE'
  ) LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON orders', r.policyname);
      policies_removed := policies_removed + 1;
      RAISE NOTICE '🗑️ Política removida: %', r.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Erro ao remover política %: %', r.policyname, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '📊 Total de políticas removidas de orders: %', policies_removed;
  
  -- Criar política permissiva para orders
  BEGIN
    EXECUTE 'CREATE POLICY "Authenticated users can delete orders"
      ON orders FOR DELETE
      TO authenticated
      USING (true)';
    RAISE NOTICE '✅ Política DELETE criada para orders';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ Política já existe, ignorando...';
  END;
END $$;

-- ============================================
-- PASSO 2: REMOVER TODAS AS POLÍTICAS DE DELETE PARA order_items
-- ============================================
DO $$
DECLARE
  r RECORD;
  policies_removed INTEGER := 0;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'order_items' AND cmd = 'DELETE'
  ) LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON order_items', r.policyname);
      policies_removed := policies_removed + 1;
      RAISE NOTICE '🗑️ Política removida: %', r.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Erro ao remover política %: %', r.policyname, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '📊 Total de políticas removidas de order_items: %', policies_removed;
  
  -- Criar política permissiva para order_items
  BEGIN
    EXECUTE 'CREATE POLICY "Authenticated users can delete order items"
      ON order_items FOR DELETE
      TO authenticated
      USING (true)';
    RAISE NOTICE '✅ Política DELETE criada para order_items';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ Política já existe, ignorando...';
  END;
END $$;

-- ============================================
-- PASSO 3: REMOVER TODAS AS POLÍTICAS DE DELETE PARA order_extra_items
-- ============================================
DO $$
DECLARE
  r RECORD;
  policies_removed INTEGER := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
    FOR r IN (
      SELECT policyname 
      FROM pg_policies 
      WHERE tablename = 'order_extra_items' AND cmd = 'DELETE'
    ) LOOP
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS %I ON order_extra_items', r.policyname);
        policies_removed := policies_removed + 1;
        RAISE NOTICE '🗑️ Política removida: %', r.policyname;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Erro ao remover política %: %', r.policyname, SQLERRM;
      END;
    END LOOP;
    
    RAISE NOTICE '📊 Total de políticas removidas de order_extra_items: %', policies_removed;
    
    -- Criar política permissiva para order_extra_items
    BEGIN
      EXECUTE 'CREATE POLICY "Authenticated users can delete order extra items"
        ON order_extra_items FOR DELETE
        TO authenticated
        USING (true)';
      RAISE NOTICE '✅ Política DELETE criada para order_extra_items';
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE '⚠️ Política já existe, ignorando...';
    END;
  ELSE
    RAISE NOTICE '⚠️ Tabela order_extra_items não existe (ok)';
  END IF;
END $$;

-- ============================================
-- PASSO 4: REMOVER TODAS AS POLÍTICAS DE DELETE PARA payments
-- ============================================
DO $$
DECLARE
  r RECORD;
  policies_removed INTEGER := 0;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'payments' AND cmd = 'DELETE'
  ) LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON payments', r.policyname);
      policies_removed := policies_removed + 1;
      RAISE NOTICE '🗑️ Política removida: %', r.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Erro ao remover política %: %', r.policyname, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '📊 Total de políticas removidas de payments: %', policies_removed;
  
  -- Criar política permissiva para payments
  BEGIN
    EXECUTE 'CREATE POLICY "Authenticated users can delete payments"
      ON payments FOR DELETE
      TO authenticated
      USING (true)';
    RAISE NOTICE '✅ Política DELETE criada para payments';
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE '⚠️ Política já existe, ignorando...';
  END;
END $$;

-- ============================================
-- PASSO 5: GARANTIR QUE RLS ESTÁ HABILITADO
-- ============================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
    ALTER TABLE order_extra_items ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- PASSO 6: VERIFICAR POLÍTICAS CRIADAS
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;

-- ============================================
-- PASSO 7: VERIFICAR SE RLS ESTÁ HABILITADO
-- ============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
  AND schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- PASSO 8: TESTE DE VERIFICAÇÃO
-- ============================================
DO $$
DECLARE
  orders_delete_count INTEGER;
  items_delete_count INTEGER;
  payments_delete_count INTEGER;
  extra_items_delete_count INTEGER;
BEGIN
  -- Contar políticas DELETE para cada tabela
  SELECT COUNT(*) INTO orders_delete_count
  FROM pg_policies
  WHERE tablename = 'orders' AND cmd = 'DELETE';
  
  SELECT COUNT(*) INTO items_delete_count
  FROM pg_policies
  WHERE tablename = 'order_items' AND cmd = 'DELETE';
  
  SELECT COUNT(*) INTO payments_delete_count
  FROM pg_policies
  WHERE tablename = 'payments' AND cmd = 'DELETE';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
    SELECT COUNT(*) INTO extra_items_delete_count
    FROM pg_policies
    WHERE tablename = 'order_extra_items' AND cmd = 'DELETE';
  ELSE
    extra_items_delete_count := 0;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ VERIFICAÇÃO FINAL DAS POLÍTICAS RLS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Políticas DELETE encontradas:';
  RAISE NOTICE '   - orders: % política(s)', orders_delete_count;
  RAISE NOTICE '   - order_items: % política(s)', items_delete_count;
  RAISE NOTICE '   - order_extra_items: % política(s)', extra_items_delete_count;
  RAISE NOTICE '   - payments: % política(s)', payments_delete_count;
  RAISE NOTICE '';
  
  IF orders_delete_count > 0 AND items_delete_count > 0 AND payments_delete_count > 0 THEN
    RAISE NOTICE '✅ SUCESSO! Todas as políticas necessárias foram criadas!';
  ELSE
    RAISE NOTICE '⚠️ ATENÇÃO: Algumas políticas podem estar faltando!';
    IF orders_delete_count = 0 THEN
      RAISE NOTICE '   ❌ Política DELETE para orders NÃO encontrada!';
    END IF;
    IF items_delete_count = 0 THEN
      RAISE NOTICE '   ❌ Política DELETE para order_items NÃO encontrada!';
    END IF;
    IF payments_delete_count = 0 THEN
      RAISE NOTICE '   ❌ Política DELETE para payments NÃO encontrada!';
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '💡 Próximos passos:';
  RAISE NOTICE '   1. Verifique a lista de políticas acima';
  RAISE NOTICE '   2. Recarregue a página do sistema (F5)';
  RAISE NOTICE '   3. Limpe o cache do navegador (Ctrl+Shift+R)';
  RAISE NOTICE '   4. Tente excluir uma comanda novamente';
  RAISE NOTICE '';
END $$;





