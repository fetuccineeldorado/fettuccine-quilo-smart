-- ============================================
-- FIX FORÇADO: Permitir exclusão de comandas
-- Execute este script no Supabase SQL Editor
-- ============================================
-- Este script REMOVE TODAS as políticas antigas e
-- cria políticas permissivas para DELETE
-- ============================================

-- IMPORTANTE: Este script remove TODAS as políticas de DELETE existentes
-- e cria novas políticas permissivas

-- ============================================
-- 1. REMOVER TODAS AS POLÍTICAS DE DELETE PARA orders
-- ============================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'orders' AND cmd = 'DELETE'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON orders', r.policyname);
    RAISE NOTICE '🗑️ Política removida: %', r.policyname;
  END LOOP;
  
  -- Criar política permissiva para orders
  EXECUTE 'CREATE POLICY "Authenticated users can delete orders"
    ON orders FOR DELETE
    TO authenticated
    USING (true)';
  
  RAISE NOTICE '✅ Política DELETE criada para orders';
END $$;

-- ============================================
-- 2. REMOVER TODAS AS POLÍTICAS DE DELETE PARA order_items
-- ============================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'order_items' AND cmd = 'DELETE'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON order_items', r.policyname);
    RAISE NOTICE '🗑️ Política removida: %', r.policyname;
  END LOOP;
  
  -- Criar política permissiva para order_items
  EXECUTE 'CREATE POLICY "Authenticated users can delete order items"
    ON order_items FOR DELETE
    TO authenticated
    USING (true)';
  
  RAISE NOTICE '✅ Política DELETE criada para order_items';
END $$;

-- ============================================
-- 3. REMOVER TODAS AS POLÍTICAS DE DELETE PARA order_extra_items (se existir)
-- ============================================
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
    FOR r IN (
      SELECT policyname 
      FROM pg_policies 
      WHERE tablename = 'order_extra_items' AND cmd = 'DELETE'
    ) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON order_extra_items', r.policyname);
      RAISE NOTICE '🗑️ Política removida: %', r.policyname;
    END LOOP;
    
    -- Criar política permissiva para order_extra_items
    EXECUTE 'CREATE POLICY "Authenticated users can delete order extra items"
      ON order_extra_items FOR DELETE
      TO authenticated
      USING (true)';
    
    RAISE NOTICE '✅ Política DELETE criada para order_extra_items';
  ELSE
    RAISE NOTICE '⚠️ Tabela order_extra_items não existe (ok)';
  END IF;
END $$;

-- ============================================
-- 4. REMOVER TODAS AS POLÍTICAS DE DELETE PARA payments
-- ============================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'payments' AND cmd = 'DELETE'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON payments', r.policyname);
    RAISE NOTICE '🗑️ Política removida: %', r.policyname;
  END LOOP;
  
  -- Criar política permissiva para payments
  EXECUTE 'CREATE POLICY "Authenticated users can delete payments"
    ON payments FOR DELETE
    TO authenticated
    USING (true)';
  
  RAISE NOTICE '✅ Política DELETE criada para payments';
END $$;

-- ============================================
-- 5. GARANTIR QUE RLS ESTÁ HABILITADO
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
-- 6. VERIFICAR POLÍTICAS CRIADAS
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
-- 7. VERIFICAR SE RLS ESTÁ HABILITADO
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
-- 8. MENSAGEM DE SUCESSO
-- ============================================
DO $$
DECLARE
  policies_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
    AND cmd = 'DELETE';
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ POLÍTICAS RLS DE DELETE CRIADAS COM SUCESSO!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total de políticas DELETE criadas: %', policies_count;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Políticas criadas:';
  RAISE NOTICE '   ✅ orders (DELETE) - PERMISSIVA';
  RAISE NOTICE '   ✅ order_items (DELETE) - PERMISSIVA';
  RAISE NOTICE '   ✅ order_extra_items (DELETE) - PERMISSIVA (se existir)';
  RAISE NOTICE '   ✅ payments (DELETE) - PERMISSIVA';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS habilitado para todas as tabelas';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Próximos passos:';
  RAISE NOTICE '   1. Recarregue a página do sistema (F5)';
  RAISE NOTICE '   2. Limpe o cache do navegador (Ctrl+Shift+R)';
  RAISE NOTICE '   3. Tente excluir uma comanda novamente';
  RAISE NOTICE '   4. Deve funcionar agora! ✅';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ Se ainda não funcionar:';
  RAISE NOTICE '   - Verifique se você está autenticado';
  RAISE NOTICE '   - Verifique se há outras políticas conflitantes';
  RAISE NOTICE '   - Execute este script novamente';
  RAISE NOTICE '';
END $$;

