-- Migration: Sistema Completo de Funcionários com Cadastro e Registro de Ponto
-- Inclui: CPF, foto facial, GPS, validações, etc.

-- ============================================
-- 1. EXPANDIR TABELA employees (adicionar campos necessários)
-- ============================================

-- Adicionar colunas se não existirem
DO $$ 
BEGIN
  -- CPF (único, obrigatório)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'cpf') THEN
    ALTER TABLE employees ADD COLUMN cpf VARCHAR(14) UNIQUE;
  END IF;

  -- Cargo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'position') THEN
    ALTER TABLE employees ADD COLUMN position VARCHAR(100);
  END IF;

  -- Departamento
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'department') THEN
    ALTER TABLE employees ADD COLUMN department VARCHAR(100);
  END IF;

  -- Telefone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'phone') THEN
    ALTER TABLE employees ADD COLUMN phone VARCHAR(20);
  END IF;

  -- Endereço
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'address') THEN
    ALTER TABLE employees ADD COLUMN address TEXT;
  END IF;

  -- Data de admissão
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'hire_date') THEN
    ALTER TABLE employees ADD COLUMN hire_date DATE;
  END IF;

  -- Foto facial (URL do Supabase Storage)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'face_photo_url') THEN
    ALTER TABLE employees ADD COLUMN face_photo_url TEXT;
  END IF;

  -- Hash da foto facial para reconhecimento (será gerado pelo sistema)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'face_hash') THEN
    ALTER TABLE employees ADD COLUMN face_hash TEXT;
  END IF;

  -- Salário
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'salary') THEN
    ALTER TABLE employees ADD COLUMN salary DECIMAL(10,2) DEFAULT 0;
  END IF;

  -- Observações
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'notes') THEN
    ALTER TABLE employees ADD COLUMN notes TEXT;
  END IF;

  -- Criado por (admin que cadastrou)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'created_by') THEN
    ALTER TABLE employees ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Garantir que email e CPF sejam únicos
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email_unique ON employees(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_cpf_unique ON employees(cpf) WHERE cpf IS NOT NULL;

-- ============================================
-- 2. CRIAR TABELA time_clock (Registro de Ponto)
-- ============================================
CREATE TABLE IF NOT EXISTS time_clock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  clock_type VARCHAR(20) NOT NULL CHECK (clock_type IN ('entry', 'exit', 'break_start', 'break_end')),
  clock_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_address TEXT,
  device_info TEXT,
  face_verification_confidence DECIMAL(5, 2), -- 0-100, nível de confiança do reconhecimento facial
  face_verified BOOLEAN DEFAULT false,
  photo_url TEXT, -- Foto do ponto registrado
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_time_clock_employee_id ON time_clock(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_clock_time ON time_clock(clock_time);
CREATE INDEX IF NOT EXISTS idx_time_clock_clock_type ON time_clock(clock_type);
CREATE INDEX IF NOT EXISTS idx_time_clock_employee_date ON time_clock(employee_id, clock_time);

-- ============================================
-- 3. CRIAR TABELA admin_users (Separar admins de funcionários)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  is_super_admin BOOLEAN DEFAULT false,
  can_manage_employees BOOLEAN DEFAULT true,
  can_view_reports BOOLEAN DEFAULT true,
  can_manage_settings BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Índice para email
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email_unique ON admin_users(email);

-- ============================================
-- 4. HABILITAR RLS (Row Level Security)
-- ============================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_clock ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CRIAR POLÍTICAS RLS PARA employees
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert employees" ON employees;
CREATE POLICY "Admins can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
      AND admin_users.can_manage_employees = true
    )
  );

DROP POLICY IF EXISTS "Admins can update employees" ON employees;
CREATE POLICY "Admins can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
      AND admin_users.can_manage_employees = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
      AND admin_users.can_manage_employees = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete employees" ON employees;
CREATE POLICY "Admins can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
      AND admin_users.can_manage_employees = true
    )
  );

-- ============================================
-- 6. CRIAR POLÍTICAS RLS PARA time_clock
-- ============================================
DROP POLICY IF EXISTS "Employees can view their own time clock" ON time_clock;
CREATE POLICY "Employees can view their own time clock"
  ON time_clock FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE id = time_clock.employee_id
    )
    OR EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
  );

DROP POLICY IF EXISTS "Employees can insert their own time clock" ON time_clock;
CREATE POLICY "Employees can insert their own time clock"
  ON time_clock FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE id = time_clock.employee_id
    )
  );

DROP POLICY IF EXISTS "Admins can manage time clock" ON time_clock;
CREATE POLICY "Admins can manage time clock"
  ON time_clock FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
  );

-- ============================================
-- 7. CRIAR POLÍTICAS RLS PARA admin_users
-- ============================================
DROP POLICY IF EXISTS "Admins can view admin users" ON admin_users;
CREATE POLICY "Admins can view admin users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
  );

DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;
CREATE POLICY "Super admins can manage admin users"
  ON admin_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
      AND admin_users.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
      AND admin_users.is_super_admin = true
    )
  );

-- ============================================
-- 8. CRIAR FUNÇÃO PARA ATUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_clock_updated_at ON time_clock;
CREATE TRIGGER update_time_clock_updated_at
  BEFORE UPDATE ON time_clock
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. CRIAR FUNÇÃO PARA VALIDAR CPF
-- ============================================
CREATE OR REPLACE FUNCTION validate_cpf(cpf_text VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  cpf_clean VARCHAR;
  i INTEGER;
  sum_val INTEGER;
  digit1 INTEGER;
  digit2 INTEGER;
BEGIN
  -- Remove caracteres não numéricos
  cpf_clean := regexp_replace(cpf_text, '[^0-9]', '', 'g');
  
  -- Verifica se tem 11 dígitos
  IF length(cpf_clean) != 11 THEN
    RETURN false;
  END IF;
  
  -- Verifica se todos os dígitos são iguais (CPF inválido)
  IF cpf_clean = regexp_replace(cpf_clean, '^.', '', 'g') THEN
    RETURN false;
  END IF;
  
  -- Valida primeiro dígito verificador
  sum_val := 0;
  FOR i IN 1..9 LOOP
    sum_val := sum_val + CAST(substring(cpf_clean, i, 1) AS INTEGER) * (11 - i);
  END LOOP;
  digit1 := 11 - (sum_val % 11);
  IF digit1 >= 10 THEN
    digit1 := 0;
  END IF;
  
  IF digit1 != CAST(substring(cpf_clean, 10, 1) AS INTEGER) THEN
    RETURN false;
  END IF;
  
  -- Valida segundo dígito verificador
  sum_val := 0;
  FOR i IN 1..10 LOOP
    sum_val := sum_val + CAST(substring(cpf_clean, i, 1) AS INTEGER) * (12 - i);
  END LOOP;
  digit2 := 11 - (sum_val % 11);
  IF digit2 >= 10 THEN
    digit2 := 0;
  END IF;
  
  IF digit2 != CAST(substring(cpf_clean, 11, 1) AS INTEGER) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. CRIAR TRIGGER PARA VALIDAR CPF ANTES DE INSERIR/ATUALIZAR
-- ============================================
CREATE OR REPLACE FUNCTION check_cpf_valid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cpf IS NOT NULL AND NOT validate_cpf(NEW.cpf) THEN
    RAISE EXCEPTION 'CPF inválido: %', NEW.cpf;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_employee_cpf ON employees;
CREATE TRIGGER validate_employee_cpf
  BEFORE INSERT OR UPDATE ON employees
  FOR EACH ROW
  WHEN (NEW.cpf IS NOT NULL)
  EXECUTE FUNCTION check_cpf_valid();

-- ============================================
-- 11. CRIAR BUCKET NO STORAGE PARA FOTOS (será executado manualmente se necessário)
-- ============================================
-- Nota: O bucket será criado via Supabase Dashboard ou API
-- Nome sugerido: 'employee-photos'

-- ============================================
-- 12. VERIFICAR SE AS TABELAS FORAM CRIADAS
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
    RAISE NOTICE '✅ Tabela employees verificada/atualizada!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_clock') THEN
    RAISE NOTICE '✅ Tabela time_clock criada/verificada!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') THEN
    RAISE NOTICE '✅ Tabela admin_users criada/verificada!';
  END IF;
END $$;

