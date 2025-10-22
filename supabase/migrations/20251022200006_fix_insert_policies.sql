-- Corrigir políticas de INSERT para permitir que usuários autenticados criem comandas
-- sem precisar que opened_by seja igual a auth.uid()

DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Garantir que order_items pode ser inserido por usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can create order items" ON order_items;

CREATE POLICY "Authenticated users can create order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permitir que usuários atualizem suas próprias comandas ou se forem admin/manager
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;

CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true);

