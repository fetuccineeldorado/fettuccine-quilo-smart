import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuração do Supabase
const supabaseUrl = 'https://akktccyeqnqaljaqland.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra3RjY3llcW5xYWxqYXFsYW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTA5MzEsImV4cCI6MjA3NjcyNjkzMX0.TeuBl81JEN2s5rakt0hNS0diT6nOvg6nUHyRfFeEngk';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Iniciando criação das tabelas do FETUCCINE PDV...\n');

// SQL simplificado para criar as tabelas essenciais
const createTablesSQL = `
-- Criar enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'operator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('open', 'closed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('cash', 'debit', 'credit', 'pix');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar tabela user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'operator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Criar tabela system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_kg DECIMAL(10,2) NOT NULL DEFAULT 54.90,
  minimum_charge DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  maximum_weight DECIMAL(10,2) NOT NULL DEFAULT 2.00,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Criar tabela orders (comandas)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL UNIQUE NOT NULL,
  status order_status NOT NULL DEFAULT 'open',
  customer_name VARCHAR(255),
  total_weight DECIMAL(10,3) NOT NULL DEFAULT 0,
  food_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  extras_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  table_number INTEGER,
  opened_by UUID REFERENCES profiles(id),
  closed_by UUID REFERENCES profiles(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  notes TEXT
);

-- Criar tabela order_items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar tabela payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method payment_method NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  change_amount DECIMAL(10,2) DEFAULT 0,
  processed_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- Criar tabela cash_register
CREATE TABLE IF NOT EXISTS cash_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  opening_balance DECIMAL(10,2),
  closing_balance DECIMAL(10,2),
  expected_balance DECIMAL(10,2),
  difference DECIMAL(10,2),
  operator_id UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar tabela extra_items
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

-- Criar tabela order_extra_items
CREATE TABLE IF NOT EXISTS order_extra_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  extra_item_id UUID REFERENCES extra_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir configurações padrão
INSERT INTO system_settings (price_per_kg, minimum_charge, maximum_weight) 
VALUES (54.90, 5.00, 2.00)
ON CONFLICT DO NOTHING;

-- Inserir itens extras padrão
INSERT INTO extra_items (name, description, price, category)
SELECT * FROM (VALUES
  ('Refrigerante 600ml', 'Refrigerante garrafa 600ml', 6.50, 'drink'),
  ('Refrigerante Lata', 'Refrigerante lata 350ml', 4.50, 'drink'),
  ('Água sem Gás', 'Água mineral sem gás 500ml', 3.00, 'drink'),
  ('Água com Gás', 'Água mineral com gás 500ml', 3.50, 'drink'),
  ('Suco Lata', 'Suco em lata 350ml', 5.00, 'drink'),
  ('Salada', 'Salada verde', 7.00, 'food'),
  ('Batata Frita', 'Porção de batata frita', 8.50, 'food'),
  ('Pudim', 'Pudim de leite', 6.00, 'dessert'),
  ('Sorvete', 'Sorvete de creme', 4.50, 'dessert')
) AS items(name, description, price, category)
WHERE NOT EXISTS (SELECT 1 FROM extra_items LIMIT 1);
`;

async function createTables() {
  try {
    console.log('📊 Executando SQL para criar tabelas...');
    
    // Executar SQL via RPC (Remote Procedure Call)
    const { data, error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
    
    if (error) {
      console.error('❌ Erro ao executar SQL:', error);
      return;
    }
    
    console.log('✅ Tabelas criadas com sucesso!');
    console.log('📋 Tabelas criadas:');
    console.log('   - profiles');
    console.log('   - user_roles');
    console.log('   - system_settings');
    console.log('   - orders');
    console.log('   - order_items');
    console.log('   - payments');
    console.log('   - cash_register');
    console.log('   - extra_items');
    console.log('   - order_extra_items');
    
  } catch (err) {
    console.error('❌ Erro na execução:', err);
  }
}

// Executar criação das tabelas
createTables();
