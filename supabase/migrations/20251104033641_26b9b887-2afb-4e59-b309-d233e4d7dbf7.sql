-- =====================================================
-- MIGRAÇÃO: Ajustes e Adição de Colunas Faltantes
-- =====================================================

-- 1. Adicionar coluna customer_name na tabela orders (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='orders' AND column_name='customer_name') THEN
    ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255);
  END IF;
END $$;

-- 2. Criar tabela inventory_movements (se não existir)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer')),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  reference_type VARCHAR(100),
  reference_id UUID,
  notes TEXT,
  moved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices para inventory_movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(created_at);

-- 4. Habilitar RLS
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS - Inventory Movements
CREATE POLICY "Authenticated users can view inventory movements"
  ON inventory_movements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create inventory movements"
  ON inventory_movements FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory movements"
  ON inventory_movements FOR UPDATE TO authenticated USING (true);