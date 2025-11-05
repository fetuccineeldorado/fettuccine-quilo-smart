-- ============================================
-- FASE 1: CORREÇÃO CRÍTICA DO BANCO DE DADOS
-- ============================================

-- 1.1 Criar tabela employees
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  role VARCHAR(50) NOT NULL DEFAULT 'cashier',
  department VARCHAR(100) NOT NULL,
  hire_date DATE NOT NULL,
  salary DECIMAL(10,2),
  facial_photo_url TEXT,
  facial_encoding TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_employees_cpf ON employees(cpf);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);

-- RLS Policies
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create employees"
  ON employees FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees"
  ON employees FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete employees"
  ON employees FOR DELETE TO authenticated USING (true);

-- Trigger updated_at
CREATE TRIGGER employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 1.2 Alinhar estrutura da tabela products
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS is_tracked BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Migrar dados existentes
UPDATE products 
SET cost_price = COALESCE(cost_price, cost), 
    selling_price = COALESCE(selling_price, price),
    is_tracked = COALESCE(is_tracked, true)
WHERE cost_price IS NULL OR selling_price IS NULL;

-- Adicionar constraint para status
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_status_check;

ALTER TABLE products
  ADD CONSTRAINT products_status_check 
  CHECK (status IN ('active', 'inactive', 'discontinued'));

-- 1.3 Atualizar extra_items para suportar estoque
ALTER TABLE extra_items
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_stock INTEGER,
  ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'un';

CREATE INDEX IF NOT EXISTS idx_extra_items_product ON extra_items(product_id);

-- ============================================
-- FASE 2: CORREÇÕES DE SEGURANÇA
-- ============================================

-- 2.1 Restringir acesso a profiles (já permite authenticated users ver todos)
-- Política atual já está adequada

-- 2.2 Corrigir funções sem search_path
CREATE OR REPLACE FUNCTION public.update_customers_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 2.3 Adicionar constraints de validação
-- Validações em system_settings
ALTER TABLE system_settings 
  DROP CONSTRAINT IF EXISTS price_per_kg_positive,
  DROP CONSTRAINT IF EXISTS minimum_charge_valid,
  DROP CONSTRAINT IF EXISTS maximum_weight_valid;

ALTER TABLE system_settings 
  ADD CONSTRAINT price_per_kg_positive CHECK (price_per_kg > 0),
  ADD CONSTRAINT minimum_charge_valid CHECK (minimum_charge >= 0),
  ADD CONSTRAINT maximum_weight_valid CHECK (maximum_weight > 0 AND maximum_weight <= 10);

-- Validações em products
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS selling_price_positive,
  DROP CONSTRAINT IF EXISTS cost_price_positive;

ALTER TABLE products
  ADD CONSTRAINT selling_price_positive CHECK (selling_price >= 0),
  ADD CONSTRAINT cost_price_positive CHECK (cost_price >= 0);

-- Validações em extra_items
ALTER TABLE extra_items
  DROP CONSTRAINT IF EXISTS price_positive;

ALTER TABLE extra_items
  ADD CONSTRAINT price_positive CHECK (price >= 0);