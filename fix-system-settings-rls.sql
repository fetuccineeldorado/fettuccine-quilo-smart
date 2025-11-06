-- ============================================
-- CORREÇÃO: Política RLS para system_settings
-- Execute este script no Supabase SQL Editor
-- ============================================
-- Este script permite que TODOS os usuários autenticados
-- possam atualizar as configurações do sistema
-- ============================================

-- 1. Remover política antiga que restringe apenas a managers e admins
DROP POLICY IF EXISTS "Only managers and admins can update settings" ON system_settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON system_settings;

-- 2. Criar política permissiva para UPDATE
CREATE POLICY "Authenticated users can update settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Garantir que também existe política para INSERT
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON system_settings;
CREATE POLICY "Authenticated users can insert settings"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Garantir que também existe política para DELETE (caso necessário)
DROP POLICY IF EXISTS "Authenticated users can delete settings" ON system_settings;
CREATE POLICY "Authenticated users can delete settings"
  ON system_settings FOR DELETE
  TO authenticated
  USING (true);

-- 5. Verificar políticas criadas
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
WHERE tablename = 'system_settings'
ORDER BY cmd, policyname;

-- 6. Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas RLS corrigidas para system_settings!';
  RAISE NOTICE '   Agora todos os usuários autenticados podem:';
  RAISE NOTICE '   - Visualizar configurações';
  RAISE NOTICE '   - Atualizar configurações';
  RAISE NOTICE '   - Criar configurações';
  RAISE NOTICE '   - Excluir configurações';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Próximos passos:';
  RAISE NOTICE '   1. Recarregue a página do sistema (F5)';
  RAISE NOTICE '   2. Tente salvar as configurações novamente';
  RAISE NOTICE '';
END $$;
