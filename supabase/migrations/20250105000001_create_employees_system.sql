-- Migration completa para sistema de funcionários com reconhecimento facial e ponto eletrônico
-- Execute este script no Supabase Dashboard > SQL Editor

-- ============================================
-- 1. CRIAR TABELA employees (com campos completos)
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL, -- CPF único (formato: 000.000.000-00)
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier', 'kitchen', 'waiter', 'security')),
  department VARCHAR(100) NOT NULL,
  hire_date DATE NOT NULL,
  salary DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  facial_photo_url TEXT, -- URL da foto para reconhecimento facial (armazenada no Supabase Storage)
  facial_encoding TEXT, -- Encoding do reconhecimento facial (JSON ou base64)
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CRIAR TABELA time_records (registro de ponto)
-- ============================================
CREATE TABLE IF NOT EXISTS time_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  record_type VARCHAR(20) NOT NULL CHECK (record_type IN ('entry', 'exit', 'break_start', 'break_end')),
  record_date DATE NOT NULL,
  record_time TIME NOT NULL,
  latitude DECIMAL(10, 8), -- Coordenada GPS latitude
  longitude DECIMAL(11, 8), -- Coordenada GPS longitude
  address TEXT, -- Endereço obtido via geocoding reverso
  facial_verified BOOLEAN DEFAULT false, -- Se o reconhecimento facial foi verificado
  facial_match_confidence DECIMAL(5, 2), -- Confiança da correspondência facial (0-100)
  device_info TEXT, -- Informações do dispositivo (user agent, etc.)
  ip_address VARCHAR(45), -- Endereço IP
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CRIAR TABELA employee_work_schedules (horários de trabalho)
-- ============================================
CREATE TABLE IF NOT EXISTS employee_work_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Domingo, 6 = Sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. CRIAR TABELA employee_absences (faltas e ausências)
-- ============================================
CREATE TABLE IF NOT EXISTS employee_absences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  absence_type VARCHAR(20) NOT NULL CHECK (absence_type IN ('sick_leave', 'vacation', 'personal', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_employees_cpf ON employees(cpf);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

CREATE INDEX IF NOT EXISTS idx_time_records_employee_id ON time_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_records_record_date ON time_records(record_date);
CREATE INDEX IF NOT EXISTS idx_time_records_record_type ON time_records(record_type);
CREATE INDEX IF NOT EXISTS idx_time_records_employee_date ON time_records(employee_id, record_date);

CREATE INDEX IF NOT EXISTS idx_work_schedules_employee_id ON employee_work_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_schedules_day_of_week ON employee_work_schedules(day_of_week);

CREATE INDEX IF NOT EXISTS idx_absences_employee_id ON employee_absences(employee_id);
CREATE INDEX IF NOT EXISTS idx_absences_start_date ON employee_absences(start_date);

-- ============================================
-- 6. CRIAR TRIGGERS PARA updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at 
  BEFORE UPDATE ON employees 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_schedules_updated_at ON employee_work_schedules;
CREATE TRIGGER update_work_schedules_updated_at 
  BEFORE UPDATE ON employee_work_schedules 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_absences_updated_at ON employee_absences;
CREATE TRIGGER update_absences_updated_at 
  BEFORE UPDATE ON employee_absences 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. HABILITAR RLS (Row Level Security)
-- ============================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_absences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. REMOVER POLÍTICAS ANTIGAS (se existirem)
-- ============================================
-- Políticas para employees
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can create employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can delete employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
DROP POLICY IF EXISTS "Employees can view their own data" ON employees;

-- Políticas para time_records
DROP POLICY IF EXISTS "Authenticated users can view time records" ON time_records;
DROP POLICY IF EXISTS "Authenticated users can create time records" ON time_records;
DROP POLICY IF EXISTS "Authenticated users can update time records" ON time_records;
DROP POLICY IF EXISTS "Employees can view their own time records" ON time_records;
DROP POLICY IF EXISTS "Employees can create their own time records" ON time_records;

-- Políticas para work_schedules
DROP POLICY IF EXISTS "Authenticated users can view work schedules" ON employee_work_schedules;
DROP POLICY IF EXISTS "Authenticated users can manage work schedules" ON employee_work_schedules;

-- Políticas para absences
DROP POLICY IF EXISTS "Authenticated users can view absences" ON employee_absences;
DROP POLICY IF EXISTS "Authenticated users can manage absences" ON employee_absences;

-- ============================================
-- 9. CRIAR POLÍTICAS RLS
-- ============================================
-- Políticas para employees
-- Admins e managers podem ver todos os funcionários
CREATE POLICY "Admins and managers can view all employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
    OR id IN (
      SELECT id FROM employees WHERE id = auth.uid()
    )
  );

-- Apenas admins podem criar funcionários
CREATE POLICY "Admins can create employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Apenas admins podem atualizar funcionários
CREATE POLICY "Admins can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
      AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Apenas admins podem deletar funcionários
CREATE POLICY "Admins can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Políticas para time_records
-- Todos autenticados podem ver seus próprios registros
CREATE POLICY "Employees can view their own time records"
  ON time_records FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );

-- Funcionários podem criar seus próprios registros
CREATE POLICY "Employees can create their own time records"
  ON time_records FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE id = auth.uid()
    )
  );

-- Admins podem atualizar registros
CREATE POLICY "Admins can update time records"
  ON time_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Políticas para work_schedules
CREATE POLICY "Authenticated users can view work schedules"
  ON employee_work_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage work schedules"
  ON employee_work_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Políticas para absences
CREATE POLICY "Authenticated users can view absences"
  ON employee_absences FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage absences"
  ON employee_absences FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      WHERE p.id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- ============================================
-- 10. FUNÇÃO PARA VALIDAR CPF
-- ============================================
CREATE OR REPLACE FUNCTION validate_cpf(cpf_text TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  cpf_clean TEXT;
  i INTEGER;
  sum_digit INTEGER;
  digit INTEGER;
  remainder INTEGER;
BEGIN
  -- Remove caracteres não numéricos
  cpf_clean := regexp_replace(cpf_text, '[^0-9]', '', 'g');
  
  -- Verifica se tem 11 dígitos
  IF length(cpf_clean) != 11 THEN
    RETURN FALSE;
  END IF;
  
  -- Verifica se todos os dígitos são iguais (CPF inválido)
  IF cpf_clean = regexp_replace(cpf_clean, '^.', '', 'g') THEN
    RETURN FALSE;
  END IF;
  
  -- Valida primeiro dígito verificador
  sum_digit := 0;
  FOR i IN 1..9 LOOP
    sum_digit := sum_digit + CAST(substring(cpf_clean, i, 1) AS INTEGER) * (11 - i);
  END LOOP;
  remainder := sum_digit % 11;
  digit := CASE WHEN remainder < 2 THEN 0 ELSE 11 - remainder END;
  
  IF digit != CAST(substring(cpf_clean, 10, 1) AS INTEGER) THEN
    RETURN FALSE;
  END IF;
  
  -- Valida segundo dígito verificador
  sum_digit := 0;
  FOR i IN 1..10 LOOP
    sum_digit := sum_digit + CAST(substring(cpf_clean, i, 1) AS INTEGER) * (12 - i);
  END LOOP;
  remainder := sum_digit % 11;
  digit := CASE WHEN remainder < 2 THEN 0 ELSE 11 - remainder END;
  
  IF digit != CAST(substring(cpf_clean, 11, 1) AS INTEGER) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 11. CONSTRAINT PARA VALIDAR CPF
-- ============================================
ALTER TABLE employees 
ADD CONSTRAINT check_cpf_valid 
CHECK (validate_cpf(cpf));

-- ============================================
-- 12. VERIFICAR SE AS TABELAS FORAM CRIADAS
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
    RAISE NOTICE '✅ Tabela employees criada/verificada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro ao criar tabela employees';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_records') THEN
    RAISE NOTICE '✅ Tabela time_records criada/verificada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro ao criar tabela time_records';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_work_schedules') THEN
    RAISE NOTICE '✅ Tabela employee_work_schedules criada/verificada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro ao criar tabela employee_work_schedules';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employee_absences') THEN
    RAISE NOTICE '✅ Tabela employee_absences criada/verificada com sucesso!';
  ELSE
    RAISE EXCEPTION '❌ Erro ao criar tabela employee_absences';
  END IF;
END $$;

