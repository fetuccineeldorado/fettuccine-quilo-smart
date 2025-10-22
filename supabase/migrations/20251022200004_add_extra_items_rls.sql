-- Habilitar RLS na tabela extra_items
ALTER TABLE extra_items ENABLE ROW LEVEL SECURITY;

-- Políticas para extra_items
DROP POLICY IF EXISTS "Anyone can view extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can manage extra items" ON extra_items;

CREATE POLICY "Authenticated users can view extra items"
  ON extra_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert extra items"
  ON extra_items FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'manager'));

CREATE POLICY "Authenticated users can update extra items"
  ON extra_items FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin', 'manager'));

CREATE POLICY "Authenticated users can delete extra items"
  ON extra_items FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin', 'manager'));

-- Habilitar RLS na tabela order_extra_items se existir
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_extra_items') THEN
    ALTER TABLE order_extra_items ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Authenticated users can view order extra items" ON order_extra_items;
    DROP POLICY IF EXISTS "Authenticated users can create order extra items" ON order_extra_items;
    
    CREATE POLICY "Authenticated users can view order extra items"
      ON order_extra_items FOR SELECT
      TO authenticated
      USING (true);
    
    CREATE POLICY "Authenticated users can create order extra items"
      ON order_extra_items FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

