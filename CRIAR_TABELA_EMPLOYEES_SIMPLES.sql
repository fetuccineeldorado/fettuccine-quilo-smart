-- ============================================
-- SCRIPT SIMPLES: Criar Tabela employees
-- Execute este script no Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CRIAR TABELA employees (BÁSICA)
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'cashier',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. ADICIONAR COLUNAS OPCIONAIS (se não existirem)
-- ============================================
DO $$ 
BEGIN
  -- CPF
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'cpf') THEN
    ALTER TABLE employees ADD COLUMN cpf VARCHAR(14);
    RAISE NOTICE '✅ Coluna cpf adicionada';
  END IF;
  
  -- Telefone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'phone') THEN
    ALTER TABLE employees ADD COLUMN phone VARCHAR(20);
    RAISE NOTICE '✅ Coluna phone adicionada';
  END IF;
  
  -- Endereço
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'address') THEN
    ALTER TABLE employees ADD COLUMN address TEXT;
    RAISE NOTICE '✅ Coluna address adicionada';
  END IF;
  
  -- Cidade
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'city') THEN
    ALTER TABLE employees ADD COLUMN city VARCHAR(100);
    RAISE NOTICE '✅ Coluna city adicionada';
  END IF;
  
  -- Estado
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'state') THEN
    ALTER TABLE employees ADD COLUMN state VARCHAR(2);
    RAISE NOTICE '✅ Coluna state adicionada';
  END IF;
  
  -- CEP
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'zip_code') THEN
    ALTER TABLE employees ADD COLUMN zip_code VARCHAR(10);
    RAISE NOTICE '✅ Coluna zip_code adicionada';
  END IF;
  
  -- Cargo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'position') THEN
    ALTER TABLE employees ADD COLUMN position VARCHAR(100);
    RAISE NOTICE '✅ Coluna position adicionada';
  END IF;
  
  -- Departamento
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'department') THEN
    ALTER TABLE employees ADD COLUMN department VARCHAR(100);
    RAISE NOTICE '✅ Coluna department adicionada';
  END IF;
  
  -- Salário
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'salary') THEN
    ALTER TABLE employees ADD COLUMN salary DECIMAL(10,2);
    RAISE NOTICE '✅ Coluna salary adicionada';
  END IF;
  
  -- Data de admissão
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'hire_date') THEN
    ALTER TABLE employees ADD COLUMN hire_date DATE;
    RAISE NOTICE '✅ Coluna hire_date adicionada';
  END IF;
  
  -- Foto do rosto
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'face_photo_url') THEN
    ALTER TABLE employees ADD COLUMN face_photo_url TEXT;
    RAISE NOTICE '✅ Coluna face_photo_url adicionada';
  END IF;
  
  -- Hash do rosto
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'face_hash') THEN
    ALTER TABLE employees ADD COLUMN face_hash TEXT;
    RAISE NOTICE '✅ Coluna face_hash adicionada';
  END IF;
  
  -- Notas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'notes') THEN
    ALTER TABLE employees ADD COLUMN notes TEXT;
    RAISE NOTICE '✅ Coluna notes adicionada';
  END IF;
  
  -- User ID (opcional, para vincular com auth.users)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'user_id') THEN
    ALTER TABLE employees ADD COLUMN user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Coluna user_id adicionada';
  END IF;
  
  -- Created by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'created_by') THEN
    ALTER TABLE employees ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Coluna created_by adicionada';
  END IF;
END $$;

-- ============================================
-- 3. REMOVER POLÍTICAS RLS ANTIGAS (se existirem)
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can create employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can delete employees" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Admins can insert employees" ON employees;
DROP POLICY IF EXISTS "Admins can update employees" ON employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
DROP POLICY IF EXISTS "Employees can view own data" ON employees;

-- ============================================
-- 4. HABILITAR RLS
-- ============================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CRIAR POLÍTICAS RLS PERMISSIVAS
-- ============================================
CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 6. CRIAR ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

-- Índices condicionais (apenas se as colunas existirem)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'cpf') THEN
    CREATE INDEX IF NOT EXISTS idx_employees_cpf ON employees(cpf) WHERE cpf IS NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'department') THEN
    CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department) WHERE department IS NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id) WHERE user_id IS NOT NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'created_by') THEN
    CREATE INDEX IF NOT EXISTS idx_employees_created_by ON employees(created_by) WHERE created_by IS NOT NULL;
  END IF;
END $$;

-- ============================================
-- 7. FUNÇÃO E TRIGGER PARA updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. VERIFICAÇÃO FINAL
-- ============================================
DO $$
DECLARE
  table_exists BOOLEAN;
  policy_count INTEGER;
  rls_enabled BOOLEAN;
  column_count INTEGER;
BEGIN
  -- Verificar se a tabela existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'employees'
  ) INTO table_exists;
  
  -- Verificar quantas políticas existem
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'employees';
  
  -- Verificar se RLS está habilitado
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'employees';
  
  -- Contar colunas
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'employees';
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 RESULTADO DA VERIFICAÇÃO';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  IF table_exists THEN
    RAISE NOTICE '✅ Tabela employees existe';
    RAISE NOTICE '   Colunas: %', column_count;
  ELSE
    RAISE EXCEPTION '❌ ERRO: Tabela employees não foi criada!';
  END IF;
  
  IF policy_count >= 4 THEN
    RAISE NOTICE '✅ Políticas RLS criadas: % políticas', policy_count;
  ELSE
    RAISE NOTICE '⚠️ ATENÇÃO: Apenas % políticas RLS encontradas (esperado: 4)', policy_count;
  END IF;
  
  IF rls_enabled THEN
    RAISE NOTICE '✅ RLS está habilitado';
  ELSE
    RAISE NOTICE '⚠️ ATENÇÃO: RLS não está habilitado';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Próximos passos:';
  RAISE NOTICE '  1. Recarregue a página do sistema (F5)';
  RAISE NOTICE '  2. Abra o console do navegador (F12)';
  RAISE NOTICE '  3. Verifique se os funcionários são carregados';
  RAISE NOTICE '';
END $$;



