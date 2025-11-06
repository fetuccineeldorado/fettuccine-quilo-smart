-- ============================================
-- DIAGNÓSTICO: Verificar por que não consigo excluir comandas
-- Execute este script no Supabase SQL Editor
-- ============================================
-- Este script mostra TODAS as informações sobre políticas RLS
-- e ajuda a identificar o problema
-- ============================================

-- ============================================
-- 1. VERIFICAR SE RLS ESTÁ HABILITADO
-- ============================================
SELECT 
  'RLS Status' as categoria,
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ HABILITADO'
    ELSE '❌ DESABILITADO'
  END as status
FROM pg_tables
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
  AND schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 2. LISTAR TODAS AS POLÍTICAS RLS (TODAS AS OPERAÇÕES)
-- ============================================
SELECT 
  'Todas as Políticas' as categoria,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operacao,
  CASE 
    WHEN qual IS NULL OR qual = '' THEN '✅ Sem restrição'
    ELSE qual
  END as restricao_usando,
  CASE 
    WHEN with_check IS NULL OR with_check = '' THEN '✅ Sem restrição'
    ELSE with_check
  END as restricao_with_check
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
ORDER BY tablename, cmd, policyname;

-- ============================================
-- 3. VERIFICAR ESPECIFICAMENTE POLÍTICAS DELETE
-- ============================================
SELECT 
  'Políticas DELETE' as categoria,
  tablename,
  policyname,
  permissive,
  roles,
  qual as restricao,
  with_check,
  CASE 
    WHEN qual IS NULL OR qual = '' OR qual = 'true' THEN '✅ PERMISSIVA'
    ELSE '⚠️ RESTRITIVA'
  END as tipo_politica
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;

-- ============================================
-- 4. CONTAR POLÍTICAS POR TIPO DE OPERAÇÃO
-- ============================================
SELECT 
  'Contagem de Políticas' as categoria,
  tablename,
  cmd as operacao,
  COUNT(*) as total_politicas,
  STRING_AGG(policyname, ', ') as nomes_politicas
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;

-- ============================================
-- 5. VERIFICAR SE HÁ POLÍTICAS RESTRITIVAS
-- ============================================
SELECT 
  '⚠️ Políticas Restritivas' as categoria,
  tablename,
  policyname,
  cmd as operacao,
  qual as restricao_usando,
  with_check as restricao_with_check,
  CASE 
    WHEN qual IS NOT NULL AND qual != '' AND qual != 'true' THEN '❌ RESTRITIVA (USING)'
    WHEN with_check IS NOT NULL AND with_check != '' AND with_check != 'true' THEN '❌ RESTRITIVA (WITH CHECK)'
    ELSE '✅ PERMISSIVA'
  END as status
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
  AND (
    (qual IS NOT NULL AND qual != '' AND qual != 'true')
    OR (with_check IS NOT NULL AND with_check != '' AND with_check != 'true')
  )
ORDER BY tablename, cmd;

-- ============================================
-- 6. VERIFICAR SE HÁ POLÍTICAS CONFLITANTES
-- ============================================
SELECT 
  '⚠️ Possíveis Conflitos' as categoria,
  tablename,
  cmd as operacao,
  COUNT(*) as total_politicas,
  CASE 
    WHEN COUNT(*) > 1 THEN '⚠️ MÚLTIPLAS POLÍTICAS (pode haver conflito)'
    WHEN COUNT(*) = 0 THEN '❌ NENHUMA POLÍTICA (bloqueia tudo)'
    ELSE '✅ UMA POLÍTICA (OK)'
  END as status
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
  AND cmd = 'DELETE'
GROUP BY tablename, cmd
ORDER BY tablename;

-- ============================================
-- 7. RESUMO EXECUTIVO
-- ============================================
DO $$
DECLARE
  orders_delete_count INTEGER;
  items_delete_count INTEGER;
  payments_delete_count INTEGER;
  orders_rls_enabled BOOLEAN;
  items_rls_enabled BOOLEAN;
  payments_rls_enabled BOOLEAN;
  orders_delete_permissive BOOLEAN;
  items_delete_permissive BOOLEAN;
  payments_delete_permissive BOOLEAN;
BEGIN
  -- Contar políticas DELETE
  SELECT COUNT(*) INTO orders_delete_count
  FROM pg_policies
  WHERE tablename = 'orders' AND cmd = 'DELETE';
  
  SELECT COUNT(*) INTO items_delete_count
  FROM pg_policies
  WHERE tablename = 'order_items' AND cmd = 'DELETE';
  
  SELECT COUNT(*) INTO payments_delete_count
  FROM pg_policies
  WHERE tablename = 'payments' AND cmd = 'DELETE';
  
  -- Verificar se RLS está habilitado
  SELECT rowsecurity INTO orders_rls_enabled
  FROM pg_tables
  WHERE tablename = 'orders' AND schemaname = 'public';
  
  SELECT rowsecurity INTO items_rls_enabled
  FROM pg_tables
  WHERE tablename = 'order_items' AND schemaname = 'public';
  
  SELECT rowsecurity INTO payments_rls_enabled
  FROM pg_tables
  WHERE tablename = 'payments' AND schemaname = 'public';
  
  -- Verificar se políticas são permissivas
  SELECT COUNT(*) > 0 INTO orders_delete_permissive
  FROM pg_policies
  WHERE tablename = 'orders' 
    AND cmd = 'DELETE'
    AND (qual IS NULL OR qual = '' OR qual = 'true');
  
  SELECT COUNT(*) > 0 INTO items_delete_permissive
  FROM pg_policies
  WHERE tablename = 'order_items' 
    AND cmd = 'DELETE'
    AND (qual IS NULL OR qual = '' OR qual = 'true');
  
  SELECT COUNT(*) > 0 INTO payments_delete_permissive
  FROM pg_policies
  WHERE tablename = 'payments' 
    AND cmd = 'DELETE'
    AND (qual IS NULL OR qual = '' OR qual = 'true');
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 DIAGNÓSTICO COMPLETO - RESUMO EXECUTIVO';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS HABILITADO:';
  RAISE NOTICE '   - orders: %', CASE WHEN orders_rls_enabled THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE '   - order_items: %', CASE WHEN items_rls_enabled THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE '   - payments: %', CASE WHEN payments_rls_enabled THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE '';
  RAISE NOTICE '🗑️ POLÍTICAS DELETE:';
  RAISE NOTICE '   - orders: % política(s)', orders_delete_count;
  RAISE NOTICE '   - order_items: % política(s)', items_delete_count;
  RAISE NOTICE '   - payments: % política(s)', payments_delete_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ POLÍTICAS PERMISSIVAS:';
  RAISE NOTICE '   - orders: %', CASE WHEN orders_delete_permissive THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE '   - order_items: %', CASE WHEN items_delete_permissive THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE '   - payments: %', CASE WHEN payments_delete_permissive THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE '';
  
  -- Diagnóstico
  IF orders_delete_count = 0 OR items_delete_count = 0 OR payments_delete_count = 0 THEN
    RAISE NOTICE '❌ PROBLEMA: Faltam políticas DELETE!';
    RAISE NOTICE '   Execute: fix delete orders ULTRA FORCE.sql';
  ELSIF NOT orders_delete_permissive OR NOT items_delete_permissive OR NOT payments_delete_permissive THEN
    RAISE NOTICE '❌ PROBLEMA: Políticas DELETE são restritivas!';
    RAISE NOTICE '   Execute: fix delete orders ULTRA FORCE.sql';
  ELSIF NOT orders_rls_enabled OR NOT items_rls_enabled OR NOT payments_rls_enabled THEN
    RAISE NOTICE '❌ PROBLEMA: RLS não está habilitado!';
    RAISE NOTICE '   Execute: fix delete orders ULTRA FORCE.sql';
  ELSE
    RAISE NOTICE '✅ CONFIGURAÇÃO PARECE CORRETA!';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Se ainda não consegue excluir:';
    RAISE NOTICE '   1. Verifique se está autenticado no sistema';
    RAISE NOTICE '   2. Abra o console do navegador (F12)';
    RAISE NOTICE '   3. Tente excluir uma comanda';
    RAISE NOTICE '   4. Copie a mensagem de erro completa';
    RAISE NOTICE '   5. Compartilhe o erro para análise';
  END IF;
  
  RAISE NOTICE '';
END $$;


