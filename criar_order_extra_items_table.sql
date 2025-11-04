-- Script para criar a tabela order_extra_items com todas as configurações
-- Execute este script no Supabase Dashboard > SQL Editor

-- 1. Criar tabela order_extra_items se não existir
CREATE TABLE IF NOT EXISTS order_extra_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  extra_item_id UUID NOT NULL REFERENCES extra_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_order_extra_items_order_id ON order_extra_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_extra_items_extra_item_id ON order_extra_items(extra_item_id);

-- 3. Habilitar RLS (Row Level Security)
ALTER TABLE order_extra_items ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas existentes (se houver) para evitar conflitos
DROP POLICY IF EXISTS "Authenticated users can view order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can create order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can update order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can delete order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_all_access" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_select_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_insert_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_update_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_delete_policy" ON order_extra_items;

-- 5. Criar políticas RLS permissivas (todos os usuários autenticados podem gerenciar)
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

-- 6. Verificar se a tabela foi criada
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
    RAISE NOTICE '✅ Tabela order_extra_items criada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro ao criar tabela order_extra_items';
  END IF;
END $$;

