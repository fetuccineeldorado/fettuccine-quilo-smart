-- ============================================
-- FIX RÁPIDO: Permitir exclusão de comandas
-- Execute este script no Supabase SQL Editor
-- ============================================
-- Este script cria apenas as políticas RLS de DELETE
-- necessárias para permitir exclusão de comandas
-- ============================================

-- 1. Política de DELETE para orders (CRÍTICO)
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON orders;
CREATE POLICY "Authenticated users can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (true);

-- 2. Política de DELETE para order_items
DROP POLICY IF EXISTS "Authenticated users can delete order items" ON order_items;
CREATE POLICY "Authenticated users can delete order items"
  ON order_items FOR DELETE
  TO authenticated
  USING (true);

-- 3. Política de DELETE para order_extra_items (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
    DROP POLICY IF EXISTS "Authenticated users can delete order extra items" ON order_extra_items;
    CREATE POLICY "Authenticated users can delete order extra items"
      ON order_extra_items FOR DELETE
      TO authenticated
      USING (true);
    RAISE NOTICE '✅ Política DELETE criada para order_extra_items';
  ELSE
    RAISE NOTICE '⚠️ Tabela order_extra_items não existe (ok, será criada depois)';
  END IF;
END $$;

-- 4. Política de DELETE para payments
DROP POLICY IF EXISTS "Authenticated users can delete payments" ON payments;
CREATE POLICY "Authenticated users can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- Verificar políticas criadas
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;

-- ============================================
-- Mensagem de sucesso
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ POLÍTICAS RLS DE DELETE CRIADAS COM SUCESSO!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Políticas criadas:';
  RAISE NOTICE '   ✅ orders (DELETE)';
  RAISE NOTICE '   ✅ order_items (DELETE)';
  RAISE NOTICE '   ✅ order_extra_items (DELETE) - se existir';
  RAISE NOTICE '   ✅ payments (DELETE)';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Próximos passos:';
  RAISE NOTICE '   1. Recarregue a página do sistema (F5)';
  RAISE NOTICE '   2. Tente excluir uma comanda novamente';
  RAISE NOTICE '   3. Deve funcionar agora! ✅';
  RAISE NOTICE '';
END $$;


