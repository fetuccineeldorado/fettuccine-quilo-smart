-- Adicionar políticas de DELETE para todas as tabelas relacionadas a comandas

-- Política de DELETE para orders
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON orders;
CREATE POLICY "Authenticated users can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (true);

-- Política de DELETE para order_items
DROP POLICY IF EXISTS "Authenticated users can delete order items" ON order_items;
CREATE POLICY "Authenticated users can delete order items"
  ON order_items FOR DELETE
  TO authenticated
  USING (true);

-- Política de DELETE para order_extra_items
DROP POLICY IF EXISTS "Authenticated users can delete order extra items" ON order_extra_items;
CREATE POLICY "Authenticated users can delete order extra items"
  ON order_extra_items FOR DELETE
  TO authenticated
  USING (true);

-- Política de DELETE para payments
DROP POLICY IF EXISTS "Authenticated users can delete payments" ON payments;
CREATE POLICY "Authenticated users can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (true);

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
ORDER BY tablename, policyname;

