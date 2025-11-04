-- Ajustar políticas RLS para extra_items
-- Este script torna as políticas mais permissivas para usuários autenticados

-- Remover políticas existentes
DROP POLICY IF EXISTS "Authenticated users can view extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can insert extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can update extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can delete extra items" ON extra_items;
DROP POLICY IF EXISTS "Anyone can view extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can manage extra items" ON extra_items;

-- Criar políticas mais permissivas
-- SELECT: Qualquer usuário autenticado pode ver
CREATE POLICY "Authenticated users can view extra items"
  ON extra_items FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Qualquer usuário autenticado pode criar
CREATE POLICY "Authenticated users can insert extra items"
  ON extra_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Qualquer usuário autenticado pode atualizar
CREATE POLICY "Authenticated users can update extra items"
  ON extra_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Qualquer usuário autenticado pode deletar
CREATE POLICY "Authenticated users can delete extra items"
  ON extra_items FOR DELETE
  TO authenticated
  USING (true);

-- Ajustar políticas para order_extra_items também
DROP POLICY IF EXISTS "Authenticated users can view order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can create order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can update order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can delete order extra items" ON order_extra_items;

CREATE POLICY "Authenticated users can view order extra items"
  ON order_extra_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create order extra items"
  ON order_extra_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order extra items"
  ON order_extra_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete order extra items"
  ON order_extra_items FOR DELETE
  TO authenticated
  USING (true);
