-- Integração de Itens Extras com Sistema de Estoque
-- Esta migration sincroniza extra_items com products para controle de estoque

-- 1. Adicionar campos de estoque em extra_items (se não existirem)
DO $$ 
BEGIN
  -- Adicionar product_id para vincular com products
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'extra_items' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE extra_items ADD COLUMN product_id UUID REFERENCES products(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_extra_items_product_id ON extra_items(product_id);
  END IF;

  -- Adicionar campos de estoque direto (backup)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'extra_items' AND column_name = 'current_stock'
  ) THEN
    ALTER TABLE extra_items ADD COLUMN current_stock DECIMAL(10,3) DEFAULT 0;
    ALTER TABLE extra_items ADD COLUMN min_stock DECIMAL(10,3) DEFAULT 0;
    ALTER TABLE extra_items ADD COLUMN max_stock DECIMAL(10,3);
    ALTER TABLE extra_items ADD COLUMN track_stock BOOLEAN DEFAULT false;
    ALTER TABLE extra_items ADD COLUMN unit VARCHAR(50) DEFAULT 'unidade';
  END IF;
END $$;

-- 2. Criar função para sincronizar extra_items com products
CREATE OR REPLACE FUNCTION sync_extra_item_with_product()
RETURNS TRIGGER AS $$
DECLARE
  product_exists BOOLEAN;
  new_product_id UUID;
  category_id_val UUID;
BEGIN
  -- Se product_id não existe, criar produto automaticamente
  IF NEW.product_id IS NULL AND NEW.track_stock = true THEN
    -- Buscar categoria "Itens Extras"
    SELECT id INTO category_id_val 
    FROM product_categories 
    WHERE name = 'Itens Extras' 
    LIMIT 1;
    
    -- Se categoria não existe, criar
    IF category_id_val IS NULL THEN
      INSERT INTO product_categories (name, description, color)
      VALUES ('Itens Extras', 'Itens adicionais e complementos', '#8B5CF6')
      RETURNING id INTO category_id_val;
    END IF;
    
    -- Criar produto no estoque
    INSERT INTO products (
      name,
      description,
      category_id,
      unit,
      selling_price,
      cost_price,
      current_stock,
      min_stock,
      max_stock,
      is_tracked,
      status
    ) VALUES (
      NEW.name,
      COALESCE(NEW.description, NEW.name),
      category_id_val,
      COALESCE(NEW.unit, 'unidade'),
      NEW.price,
      0,
      COALESCE(NEW.current_stock, 0),
      COALESCE(NEW.min_stock, 0),
      COALESCE(NEW.max_stock, NULL),
      NEW.track_stock,
      CASE WHEN NEW.is_active THEN 'active' ELSE 'inactive' END
    )
    ON CONFLICT (name) DO UPDATE SET
      selling_price = NEW.price,
      status = CASE WHEN NEW.is_active THEN 'active' ELSE 'inactive' END
    RETURNING id INTO new_product_id;
    
    -- Atualizar extra_items com product_id
    NEW.product_id := new_product_id;
  END IF;
  
  -- Se product_id existe, atualizar produto
  IF NEW.product_id IS NOT NULL THEN
    UPDATE products SET
      name = NEW.name,
      selling_price = NEW.price,
      current_stock = COALESCE(NEW.current_stock, products.current_stock),
      min_stock = COALESCE(NEW.min_stock, products.min_stock),
      max_stock = NEW.max_stock,
      status = CASE WHEN NEW.is_active THEN 'active' ELSE 'inactive' END,
      updated_at = NOW()
    WHERE id = NEW.product_id;
    
    -- Verificar alertas de estoque
    PERFORM check_stock_alerts(NEW.product_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS trigger_sync_extra_item_product ON extra_items;
CREATE TRIGGER trigger_sync_extra_item_product
  BEFORE INSERT OR UPDATE ON extra_items
  FOR EACH ROW
  EXECUTE FUNCTION sync_extra_item_with_product();

-- 4. Criar função para reduzir estoque ao criar comanda
CREATE OR REPLACE FUNCTION reduce_extra_item_stock()
RETURNS TRIGGER AS $$
DECLARE
  extra_item_record RECORD;
  product_record RECORD;
BEGIN
  -- Buscar dados do item extra
  SELECT * INTO extra_item_record 
  FROM extra_items 
  WHERE id = NEW.extra_item_id;
  
  -- Se não rastreia estoque, não fazer nada
  IF NOT extra_item_record.track_stock THEN
    RETURN NEW;
  END IF;
  
  -- Se tem product_id, reduzir estoque do produto
  IF extra_item_record.product_id IS NOT NULL THEN
    -- Verificar se tem estoque suficiente
    SELECT * INTO product_record 
    FROM products 
    WHERE id = extra_item_record.product_id;
    
    IF product_record.current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para % (disponível: %, solicitado: %)', 
        extra_item_record.name, 
        product_record.current_stock, 
        NEW.quantity;
    END IF;
    
    -- Criar movimento de saída
    INSERT INTO inventory_movements (
      product_id,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      notes
    ) VALUES (
      extra_item_record.product_id,
      'out',
      NEW.quantity,
      'order',
      NEW.order_id,
      'Venda de item extra: ' || extra_item_record.name
    );
    
    -- Atualizar estoque do extra_item também
    UPDATE extra_items 
    SET current_stock = current_stock - NEW.quantity,
        updated_at = NOW()
    WHERE id = extra_item_record.id;
  ELSIF extra_item_record.current_stock IS NOT NULL THEN
    -- Reduzir estoque direto do extra_item
    IF extra_item_record.current_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Estoque insuficiente para % (disponível: %, solicitado: %)', 
        extra_item_record.name, 
        extra_item_record.current_stock, 
        NEW.quantity;
    END IF;
    
    UPDATE extra_items 
    SET current_stock = current_stock - NEW.quantity,
        updated_at = NOW()
    WHERE id = extra_item_record.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar trigger para reduzir estoque ao inserir order_extra_items
DROP TRIGGER IF EXISTS trigger_reduce_extra_item_stock ON order_extra_items;
CREATE TRIGGER trigger_reduce_extra_item_stock
  BEFORE INSERT ON order_extra_items
  FOR EACH ROW
  EXECUTE FUNCTION reduce_extra_item_stock();

-- 6. Criar função para verificar alertas de estoque em extra_items
CREATE OR REPLACE FUNCTION check_extra_item_stock_alerts()
RETURNS VOID AS $$
DECLARE
  item_record RECORD;
BEGIN
  FOR item_record IN 
    SELECT * FROM extra_items 
    WHERE track_stock = true AND is_active = true
  LOOP
    -- Se tem product_id, alertas já são gerados pelo sistema de products
    IF item_record.product_id IS NOT NULL THEN
      CONTINUE;
    END IF;
    
    -- Verificar estoque baixo ou zerado
    IF item_record.current_stock <= 0 THEN
      -- Se tem product_id, alertas já são gerados pelo sistema de products
      -- Para itens sem product_id, criar alerta manualmente se necessário
      IF item_record.product_id IS NULL AND item_record.current_stock <= 0 THEN
        -- Criar alerta manual (pode ser feito via aplicação)
        -- Por enquanto, apenas logar
        RAISE NOTICE 'Item extra % sem estoque: %', item_record.name, item_record.current_stock;
      END IF;
    ELSIF item_record.current_stock <= item_record.min_stock THEN
      -- Se tem product_id, alertas já são gerados pelo sistema de products
      IF item_record.product_id IS NULL THEN
        RAISE NOTICE 'Item extra % com estoque baixo: % (mínimo: %)', 
          item_record.name, 
          item_record.current_stock, 
          item_record.min_stock;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Atualizar itens extra existentes para criar produtos correspondentes
DO $$
DECLARE
  item_record RECORD;
BEGIN
  FOR item_record IN 
    SELECT * FROM extra_items 
    WHERE product_id IS NULL AND is_active = true
  LOOP
    -- Atualizar para forçar sincronização
    UPDATE extra_items 
    SET track_stock = true,
        current_stock = COALESCE(current_stock, 0),
        min_stock = COALESCE(min_stock, 5)
    WHERE id = item_record.id;
  END LOOP;
END $$;

-- 8. Criar view para facilitar consulta de itens extras com estoque
CREATE OR REPLACE VIEW extra_items_with_stock AS
SELECT 
  ei.id,
  ei.name,
  ei.description,
  ei.price,
  ei.category,
  ei.is_active,
  ei.product_id,
  ei.current_stock,
  ei.min_stock,
  ei.max_stock,
  ei.track_stock,
  ei.unit,
  ei.created_at,
  ei.updated_at,
  p.name as product_name,
  p.current_stock as product_stock,
  p.min_stock as product_min_stock,
  CASE 
    WHEN ei.track_stock = false THEN 'not_tracked'
    WHEN COALESCE(p.current_stock, ei.current_stock, 0) <= 0 THEN 'out_of_stock'
    WHEN COALESCE(p.current_stock, ei.current_stock, 0) <= COALESCE(p.min_stock, ei.min_stock, 0) THEN 'low_stock'
    ELSE 'in_stock'
  END as stock_status
FROM extra_items ei
LEFT JOIN products p ON ei.product_id = p.id;

-- 9. Adicionar comentários
COMMENT ON COLUMN extra_items.product_id IS 'ID do produto no estoque (sincronização automática)';
COMMENT ON COLUMN extra_items.current_stock IS 'Estoque atual do item extra';
COMMENT ON COLUMN extra_items.min_stock IS 'Estoque mínimo para gerar alerta';
COMMENT ON COLUMN extra_items.max_stock IS 'Estoque máximo recomendado';
COMMENT ON COLUMN extra_items.track_stock IS 'Se deve rastrear estoque deste item';
COMMENT ON COLUMN extra_items.unit IS 'Unidade de medida (unidade, caixa, etc)';

