-- ============================================
-- SCRIPT COMPLETO: CORRIGIR TODOS OS PROBLEMAS
-- Execute este script NOVAMENTE no Supabase SQL Editor
-- Este script é idempotente (pode ser executado múltiplas vezes)
-- ============================================

-- ============================================
-- 1. GARANTIR CONFIGURAÇÕES DO SISTEMA
-- ============================================

-- Criar tabela system_settings se não existir
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  price_per_kg DECIMAL(10,2) NOT NULL DEFAULT 59.90,
  minimum_charge DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  maximum_weight DECIMAL(10,2) NOT NULL DEFAULT 2.00,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.1. ALTERAR o DEFAULT da coluna para R$ 59,90 (REMOVE o DEFAULT 45.00)
ALTER TABLE system_settings 
ALTER COLUMN price_per_kg SET DEFAULT 59.90;

-- 1.2. DELETAR registros com valor 45.00 (REMOVER COMPLETAMENTE)
DELETE FROM system_settings 
WHERE price_per_kg = 45.00;

-- Garantir que existe pelo menos uma configuração
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM system_settings) THEN
    INSERT INTO system_settings (price_per_kg, minimum_charge, maximum_weight)
    VALUES (59.90, 5.00, 2.00);
    RAISE NOTICE '✅ Configuração criada com preço R$ 59,90';
  ELSE
    -- FORÇAR atualização para R$ 59,90 (TODOS os registros)
    UPDATE system_settings 
    SET price_per_kg = 59.90,
        updated_at = NOW()
    WHERE price_per_kg IS NULL OR price_per_kg != 59.90 OR ABS(price_per_kg - 59.90) > 0.01;
    RAISE NOTICE '✅ Configurações atualizadas para preço R$ 59,90';
  END IF;
END $$;

-- ============================================
-- 1.1. CORRIGIR POLÍTICAS RLS PARA system_settings
-- ============================================

-- Remover política antiga que restringe apenas a managers e admins
DROP POLICY IF EXISTS "Only managers and admins can update settings" ON system_settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON system_settings;

-- Criar política permissiva para UPDATE
CREATE POLICY "Authenticated users can update settings"
  ON system_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Garantir que também existe política para INSERT
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON system_settings;
CREATE POLICY "Authenticated users can insert settings"
  ON system_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Garantir que também existe política para DELETE (caso necessário)
DROP POLICY IF EXISTS "Authenticated users can delete settings" ON system_settings;
CREATE POLICY "Authenticated users can delete settings"
  ON system_settings FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 2. CRIAR TABELA order_extra_items (se não existir)
-- ============================================

-- Garantir que a função update_updated_at_column existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar tabela order_extra_items se não existir
CREATE TABLE IF NOT EXISTS order_extra_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  extra_item_id UUID NOT NULL REFERENCES extra_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_order_extra_items_order_id ON order_extra_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_extra_items_extra_item_id ON order_extra_items(extra_item_id);
CREATE INDEX IF NOT EXISTS idx_order_extra_items_created_at ON order_extra_items(created_at);

-- Habilitar RLS
ALTER TABLE order_extra_items ENABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes (para evitar conflitos)
DROP POLICY IF EXISTS "Authenticated users can view order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can create order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can update order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can delete order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_all_access" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_select_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_insert_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_update_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_delete_policy" ON order_extra_items;

-- Criar políticas RLS permissivas (todos os usuários autenticados podem gerenciar)
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

-- ============================================
-- 3. POLÍTICAS RLS PARA ORDERS (DELETE)
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can delete orders" ON orders;
CREATE POLICY "Authenticated users can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 4. POLÍTICAS RLS PARA ORDER_ITEMS (DELETE)
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can delete order items" ON order_items;
CREATE POLICY "Authenticated users can delete order items"
  ON order_items FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 5. POLÍTICAS RLS PARA ORDER_EXTRA_ITEMS (DELETE)
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can delete order extra items" ON order_extra_items;
CREATE POLICY "Authenticated users can delete order extra items"
  ON order_extra_items FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 6. POLÍTICAS RLS PARA PAYMENTS (DELETE)
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can delete payments" ON payments;
CREATE POLICY "Authenticated users can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 7. TRIGGERS PARA updated_at
-- ============================================

-- Trigger para system_settings
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. VERIFICAÇÃO FINAL
-- ============================================

DO $$
DECLARE
  settings_count INTEGER;
  price_value DECIMAL;
BEGIN
  -- Verificar configurações
  SELECT COUNT(*) INTO settings_count FROM system_settings;
  SELECT price_per_kg INTO price_value FROM system_settings LIMIT 1;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ CORREÇÕES APLICADAS COM SUCESSO!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Configurações encontradas: %', settings_count;
  RAISE NOTICE '💰 Preço por kg: R$ %', price_value;
  RAISE NOTICE '';
  -- Verificar se order_extra_items existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
    RAISE NOTICE '✅ Tabela order_extra_items criada';
  ELSE
    RAISE NOTICE '⚠️ Tabela order_extra_items não encontrada (pode precisar ser criada)';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas RLS de DELETE criadas para:';
  RAISE NOTICE '   - orders';
  RAISE NOTICE '   - order_items';
  RAISE NOTICE '   - order_extra_items';
  RAISE NOTICE '   - payments';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas RLS completas para order_extra_items:';
  RAISE NOTICE '   - SELECT (visualizar)';
  RAISE NOTICE '   - INSERT (criar)';
  RAISE NOTICE '   - UPDATE (atualizar)';
  RAISE NOTICE '   - DELETE (excluir)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Próximos passos:';
  RAISE NOTICE '   1. Recarregue a página do sistema (F5)';
  RAISE NOTICE '   2. Limpe o cache do navegador (Ctrl+Shift+R)';
  RAISE NOTICE '   3. Teste as funcionalidades';
  RAISE NOTICE '';
END $$;

