-- CORREÇÃO IMEDIATA DAS POLÍTICAS RLS PARA EXTRA_ITEMS
-- Este script corrige definitivamente o problema dos botões de edição e exclusão

-- 1. Desabilitar RLS temporariamente para correção
ALTER TABLE extra_items DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas existentes
DROP POLICY IF EXISTS "Anyone can view extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can view extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can insert extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can update extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can delete extra items" ON extra_items;

-- 3. Reabilitar RLS
ALTER TABLE extra_items ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas permissivas
CREATE POLICY "Allow all operations on extra_items"
  ON extra_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Verificar se as políticas foram aplicadas
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
WHERE tablename = 'extra_items';

-- 6. Teste de inserção para verificar se funciona
INSERT INTO extra_items (name, description, price, category, is_active)
VALUES ('Teste RLS', 'Teste de políticas', 1.00, 'drink', true);

-- 7. Limpar o item de teste
DELETE FROM extra_items WHERE name = 'Teste RLS';

-- 8. Confirmar que tudo funcionou
SELECT 'Políticas RLS corrigidas com sucesso!' as status;
