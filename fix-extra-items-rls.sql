-- Corrigir políticas RLS para extra_items
-- Permitir que usuários autenticados gerenciem itens extras

-- Remover políticas existentes
DROP POLICY IF EXISTS "Authenticated users can view extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can insert extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can update extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can delete extra items" ON extra_items;

-- Criar novas políticas mais permissivas
CREATE POLICY "Anyone can view extra items"
  ON extra_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert extra items"
  ON extra_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update extra items"
  ON extra_items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete extra items"
  ON extra_items FOR DELETE
  TO authenticated
  USING (true);

-- Verificar se as políticas foram criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'extra_items';
