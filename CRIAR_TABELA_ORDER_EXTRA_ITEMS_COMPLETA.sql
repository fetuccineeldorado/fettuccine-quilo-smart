-- ============================================
-- CRIAR TABELA order_extra_items COMPLETA
-- Execute este script no Supabase Dashboard > SQL Editor
-- Este script é idempotente (pode ser executado múltiplas vezes)
-- ============================================

-- 1. Garantir que a função update_updated_at_column existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Criar tabela order_extra_items se não existir
CREATE TABLE IF NOT EXISTS order_extra_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  extra_item_id UUID NOT NULL REFERENCES extra_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_order_extra_items_order_id ON order_extra_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_extra_items_extra_item_id ON order_extra_items(extra_item_id);
CREATE INDEX IF NOT EXISTS idx_order_extra_items_created_at ON order_extra_items(created_at);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE order_extra_items ENABLE ROW LEVEL SECURITY;

-- 5. Remover todas as políticas existentes (para evitar conflitos)
DROP POLICY IF EXISTS "Authenticated users can view order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can create order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can update order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can delete order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_all_access" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_select_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_insert_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_update_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_delete_policy" ON order_extra_items;

-- 6. Criar políticas RLS permissivas (todos os usuários autenticados podem gerenciar)
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

-- 7. Verificar se a tabela foi criada corretamente
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ TABELA order_extra_items CRIADA COM SUCESSO!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Políticas RLS criadas:';
    RAISE NOTICE '   ✅ SELECT (visualizar)';
    RAISE NOTICE '   ✅ INSERT (criar)';
    RAISE NOTICE '   ✅ UPDATE (atualizar)';
    RAISE NOTICE '   ✅ DELETE (excluir)';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Próximos passos:';
    RAISE NOTICE '   1. Recarregue a página do sistema (F5)';
    RAISE NOTICE '   2. Tente criar uma comanda com itens extras novamente';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '⚠️ ATENÇÃO: A tabela order_extra_items não foi criada. Verifique os erros acima.';
  END IF;
END $$;

-- 8. Exibir estrutura da tabela criada
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'order_extra_items'
ORDER BY ordinal_position;

-- 9. Verificar políticas RLS criadas
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
WHERE tablename = 'order_extra_items'
ORDER BY cmd, policyname;


