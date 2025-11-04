-- Script COMPLETO para criar tabelas extra_items e order_extra_items
-- Execute este script no Supabase Dashboard > SQL Editor
-- Este script é idempotente (pode ser executado múltiplas vezes sem problemas)

-- ============================================
-- 1. CRIAR TABELA extra_items (se não existir)
-- ============================================
CREATE TABLE IF NOT EXISTS extra_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'drink' CHECK (category IN ('drink', 'food', 'dessert', 'other')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para extra_items
CREATE INDEX IF NOT EXISTS idx_extra_items_category ON extra_items(category);
CREATE INDEX IF NOT EXISTS idx_extra_items_active ON extra_items(is_active);

-- Criar trigger para updated_at em extra_items
DROP TRIGGER IF EXISTS update_extra_items_updated_at ON extra_items;
CREATE TRIGGER update_extra_items_updated_at 
  BEFORE UPDATE ON extra_items 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. CRIAR TABELA order_extra_items (se não existir)
-- ============================================
CREATE TABLE IF NOT EXISTS order_extra_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  extra_item_id UUID NOT NULL REFERENCES extra_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para order_extra_items
CREATE INDEX IF NOT EXISTS idx_order_extra_items_order_id ON order_extra_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_extra_items_extra_item_id ON order_extra_items(extra_item_id);

-- ============================================
-- 3. HABILITAR RLS (Row Level Security)
-- ============================================
ALTER TABLE extra_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_extra_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. REMOVER POLÍTICAS ANTIGAS (se existirem)
-- ============================================
-- Políticas para extra_items
DROP POLICY IF EXISTS "Anyone can view extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can manage extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can view extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can insert extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can update extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can delete extra items" ON extra_items;
DROP POLICY IF EXISTS "extra_items_all_access" ON extra_items;
DROP POLICY IF EXISTS "extra_items_select_policy" ON extra_items;
DROP POLICY IF EXISTS "extra_items_insert_policy" ON extra_items;
DROP POLICY IF EXISTS "extra_items_update_policy" ON extra_items;
DROP POLICY IF EXISTS "extra_items_delete_policy" ON extra_items;

-- Políticas para order_extra_items
DROP POLICY IF EXISTS "Authenticated users can view order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can create order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can update order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can delete order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_all_access" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_select_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_insert_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_update_policy" ON order_extra_items;
DROP POLICY IF EXISTS "order_extra_items_delete_policy" ON order_extra_items;

-- ============================================
-- 5. CRIAR POLÍTICAS RLS PERMISSIVAS
-- ============================================
-- Políticas para extra_items (permissivas)
CREATE POLICY "Authenticated users can view extra items"
  ON extra_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert extra items"
  ON extra_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update extra items"
  ON extra_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete extra items"
  ON extra_items FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para order_extra_items (permissivas)
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

-- ============================================
-- 6. INSERIR ITENS EXTRAS PADRÃO (se tabela estiver vazia)
-- ============================================
INSERT INTO extra_items (name, description, price, category)
SELECT * FROM (VALUES
  ('Refrigerante 350ml', 'Coca-Cola, Pepsi, Fanta, etc.', 4.50, 'drink'),
  ('Refrigerante 600ml', 'Coca-Cola, Pepsi, Fanta, etc.', 6.50, 'drink'),
  ('Água 500ml', 'Água mineral', 2.50, 'drink'),
  ('Suco Natural 300ml', 'Suco de laranja, uva, etc.', 5.00, 'drink'),
  ('Café', 'Café expresso', 3.00, 'drink'),
  ('Cerveja 350ml', 'Cerveja gelada', 8.00, 'drink'),
  ('Salada', 'Salada verde', 7.00, 'food'),
  ('Batata Frita', 'Porção de batata frita', 8.50, 'food'),
  ('Pudim', 'Pudim de leite', 6.00, 'dessert'),
  ('Sorvete', 'Sorvete de creme', 4.50, 'dessert')
) AS items(name, description, price, category)
WHERE NOT EXISTS (SELECT 1 FROM extra_items LIMIT 1);

-- ============================================
-- 7. VERIFICAR SE AS TABELAS FORAM CRIADAS
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'extra_items') THEN
    RAISE NOTICE '✅ Tabela extra_items criada/verificada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro ao criar tabela extra_items';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
    RAISE NOTICE '✅ Tabela order_extra_items criada/verificada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro ao criar tabela order_extra_items';
  END IF;
END $$;

