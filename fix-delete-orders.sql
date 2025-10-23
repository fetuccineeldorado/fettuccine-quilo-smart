-- ============================================
-- FIX: Adicionar políticas de DELETE para comandas
-- ============================================
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- ============================================

-- 1. Adicionar política de DELETE para orders
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON orders;
CREATE POLICY "Authenticated users can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (true);

-- 2. Adicionar política de DELETE para order_items
DROP POLICY IF EXISTS "Authenticated users can delete order items" ON order_items;
CREATE POLICY "Authenticated users can delete order items"
  ON order_items FOR DELETE
  TO authenticated
  USING (true);

-- 3. Adicionar política de DELETE para order_extra_items
DROP POLICY IF EXISTS "Authenticated users can delete order extra items" ON order_extra_items;
CREATE POLICY "Authenticated users can delete order extra items"
  ON order_extra_items FOR DELETE
  TO authenticated
  USING (true);

-- 4. Adicionar política de DELETE para payments
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

