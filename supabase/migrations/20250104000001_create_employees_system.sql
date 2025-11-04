-- Sistema Completo de Funcionários e Registro de Ponto
-- Com reconhecimento facial e GPS

-- ============================================
-- 1. TABELA employees (ampliada)
-- ============================================
-- Atualizar tabela employees se já existir, ou criar nova
DO $$ 
BEGIN
  -- Adicionar colunas se não existirem
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'cpf') THEN
    ALTER TABLE employees ADD COLUMN cpf VARCHAR(14) UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'phone') THEN
    ALTER TABLE employees ADD COLUMN phone VARCHAR(20);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'address') THEN
    ALTER TABLE employees ADD COLUMN address TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'department') THEN
    ALTER TABLE employees ADD COLUMN department VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'hire_date') THEN
    ALTER TABLE employees ADD COLUMN hire_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'photo_url') THEN
    ALTER TABLE employees ADD COLUMN photo_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'facial_encoding') THEN
    ALTER TABLE employees ADD COLUMN facial_encoding JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'notes') THEN
    ALTER TABLE employees ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier', 'kitchen', 'waiter')),
  department VARCHAR(100),
  hire_date DATE,
  salary DECIMAL(10,2),
  photo_url TEXT,
  facial_encoding JSONB, -- Armazena os encodings faciais para reconhecimento
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. TABELA time_records (Registro de Ponto)
-- ============================================
CREATE TABLE IF NOT EXISTS time_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  record_type VARCHAR(20) NOT NULL CHECK (record_type IN ('entry', 'exit', 'break_start', 'break_end')),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  latitude DECIMAL(10, 8), -- Coordenada GPS
  longitude DECIMAL(11, 8), -- Coordenada GPS
  address TEXT, -- Endereço obtido do GPS (geocoding reverso)
  photo_url TEXT, -- Foto tirada no momento do registro
  facial_match_confidence DECIMAL(5, 2), -- Confiança do reconhecimento facial (0-100)
  device_info JSONB, -- Informações do dispositivo (navegador, OS, etc.)
  is_verified BOOLEAN DEFAULT false, -- Se foi verificado por admin
  verified_by UUID REFERENCES employees(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. TABELA admin_sessions (Sessões de Admin)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. ÍNDICES para Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_employees_cpf ON employees(cpf);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_time_records_employee_id ON time_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_records_recorded_at ON time_records(recorded_at);
CREATE INDEX IF NOT EXISTS idx_time_records_record_type ON time_records(record_type);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);

-- ============================================
-- 5. TRIGGER para updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at 
  BEFORE UPDATE ON employees 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. FUNÇÃO para validar CPF
-- ============================================
CREATE OR REPLACE FUNCTION validate_cpf(cpf_input VARCHAR(14))
RETURNS BOOLEAN AS $$
DECLARE
  cpf_clean VARCHAR(11);
  i INTEGER;
  sum INTEGER := 0;
  digit INTEGER;
BEGIN
  -- Remove caracteres não numéricos
  cpf_clean := regexp_replace(cpf_input, '[^0-9]', '', 'g');
  
  -- Verifica se tem 11 dígitos
  IF length(cpf_clean) != 11 THEN
    RETURN false;
  END IF;
  
  -- Verifica se todos os dígitos são iguais (CPF inválido)
  IF cpf_clean = regexp_replace(cpf_clean, '[0-9]', cpf_clean[1], 'g') THEN
    RETURN false;
  END IF;
  
  -- Valida primeiro dígito verificador
  FOR i IN 1..9 LOOP
    sum := sum + CAST(substring(cpf_clean, i, 1) AS INTEGER) * (11 - i);
  END LOOP;
  digit := 11 - (sum % 11);
  IF digit >= 10 THEN digit := 0; END IF;
  IF digit != CAST(substring(cpf_clean, 10, 1) AS INTEGER) THEN
    RETURN false;
  END IF;
  
  -- Valida segundo dígito verificador
  sum := 0;
  FOR i IN 1..10 LOOP
    sum := sum + CAST(substring(cpf_clean, i, 1) AS INTEGER) * (12 - i);
  END LOOP;
  digit := 11 - (sum % 11);
  IF digit >= 10 THEN digit := 0; END IF;
  IF digit != CAST(substring(cpf_clean, 11, 1) AS INTEGER) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. CONSTRAINT para validar CPF
-- ============================================
ALTER TABLE employees 
  DROP CONSTRAINT IF EXISTS employees_cpf_check;
  
ALTER TABLE employees 
  ADD CONSTRAINT employees_cpf_check 
  CHECK (cpf IS NULL OR validate_cpf(cpf));

-- ============================================
-- 8. HABILITAR RLS
-- ============================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. POLÍTICAS RLS
-- ============================================
-- Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can manage employees" ON employees;
DROP POLICY IF EXISTS "Admins can view employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;

DROP POLICY IF EXISTS "Employees can view own records" ON time_records;
DROP POLICY IF EXISTS "Admins can view all time records" ON time_records;
DROP POLICY IF EXISTS "Employees can create own records" ON time_records;
DROP POLICY IF EXISTS "Admins can manage time records" ON time_records;

-- Políticas para employees
CREATE POLICY "Admins can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()::text::uuid
      AND e.role = 'admin'
      AND e.is_active = true
    )
  );

CREATE POLICY "Admins can insert employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()::text::uuid
      AND e.role = 'admin'
      AND e.is_active = true
    )
  );

CREATE POLICY "Admins can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()::text::uuid
      AND e.role = 'admin'
      AND e.is_active = true
    )
  );

CREATE POLICY "Admins can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()::text::uuid
      AND e.role = 'admin'
      AND e.is_active = true
    )
  );

-- Políticas para time_records
CREATE POLICY "Employees can view own time records"
  ON time_records FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid()::text::uuid);

CREATE POLICY "Employees can create own time records"
  ON time_records FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid()::text::uuid);

CREATE POLICY "Admins can view all time records"
  ON time_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()::text::uuid
      AND e.role = 'admin'
      AND e.is_active = true
    )
  );

CREATE POLICY "Admins can update time records"
  ON time_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees e
      WHERE e.id = auth.uid()::text::uuid
      AND e.role = 'admin'
      AND e.is_active = true
    )
  );

-- Políticas para admin_sessions
CREATE POLICY "Admins can manage own sessions"
  ON admin_sessions FOR ALL
  TO authenticated
  USING (admin_id = auth.uid()::text::uuid)
  WITH CHECK (admin_id = auth.uid()::text::uuid);

-- ============================================
-- 10. COMENTÁRIOS
-- ============================================
COMMENT ON TABLE employees IS 'Tabela de funcionários com dados completos e reconhecimento facial';
COMMENT ON TABLE time_records IS 'Registros de ponto com GPS e reconhecimento facial';
COMMENT ON TABLE admin_sessions IS 'Sessões de administradores para login';
COMMENT ON COLUMN employees.facial_encoding IS 'Encoding facial em formato JSON para reconhecimento';
COMMENT ON COLUMN time_records.facial_match_confidence IS 'Confiança do reconhecimento facial (0-100)';
COMMENT ON COLUMN time_records.latitude IS 'Latitude GPS do registro de ponto';
COMMENT ON COLUMN time_records.longitude IS 'Longitude GPS do registro de ponto';

