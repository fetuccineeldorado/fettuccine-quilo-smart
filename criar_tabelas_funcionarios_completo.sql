-- ============================================
-- SCRIPT COMPLETO: MÓDULO DE FUNCIONÁRIOS
-- Sistema completo de gestão de funcionários com registro de ponto eletrônico
-- ============================================
-- Execute este script no Supabase Dashboard > SQL Editor
-- Este script é idempotente (pode ser executado múltiplas vezes sem problemas)
-- ============================================

-- ============================================
-- 1. FUNÇÕES AUXILIARES
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para validar CPF (formato brasileiro)
CREATE OR REPLACE FUNCTION validate_cpf(cpf_text VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove caracteres não numéricos
  cpf_text := regexp_replace(cpf_text, '[^0-9]', '', 'g');
  
  -- Verifica se tem 11 dígitos
  IF length(cpf_text) != 11 THEN
    RETURN false;
  END IF;
  
  -- Verifica se todos os dígitos são iguais (CPF inválido)
  IF cpf_text ~ '^(\d)\1{10}$' THEN
    RETURN false;
  END IF;
  
  -- Validação básica (pode ser expandida com algoritmo completo)
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para calcular distância entre coordenadas GPS (Haversine)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  earth_radius DECIMAL := 6371000; -- raio da Terra em metros
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon/2) * sin(dlon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 2. TABELA employees (FUNCIONÁRIOS)
-- ============================================

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'cashier' 
    CHECK (role IN ('admin', 'manager', 'cashier', 'kitchen', 'waiter')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas se não existirem (para tabelas já existentes)
DO $$ 
BEGIN
  -- CPF
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'cpf') THEN
    ALTER TABLE employees ADD COLUMN cpf VARCHAR(14) UNIQUE;
  END IF;
  
  -- City
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'city') THEN
    ALTER TABLE employees ADD COLUMN city VARCHAR(100);
  END IF;
  
  -- State
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'state') THEN
    ALTER TABLE employees ADD COLUMN state VARCHAR(2);
  END IF;
  
  -- Zip code
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'zip_code') THEN
    ALTER TABLE employees ADD COLUMN zip_code VARCHAR(10);
  END IF;
  
  -- Position
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'position') THEN
    ALTER TABLE employees ADD COLUMN position VARCHAR(100);
  END IF;
  
  -- Department
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'department') THEN
    ALTER TABLE employees ADD COLUMN department VARCHAR(100);
  END IF;
  
  -- Salary
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'salary') THEN
    ALTER TABLE employees ADD COLUMN salary DECIMAL(10,2);
  END IF;
  
  -- Hire date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'hire_date') THEN
    ALTER TABLE employees ADD COLUMN hire_date DATE;
  END IF;
  
  -- Face photo URL
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'face_photo_url') THEN
    -- Tentar renomear se existir com outro nome
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'facial_photo_url') THEN
      ALTER TABLE employees RENAME COLUMN facial_photo_url TO face_photo_url;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'photo_url') THEN
      ALTER TABLE employees RENAME COLUMN photo_url TO face_photo_url;
    ELSE
      ALTER TABLE employees ADD COLUMN face_photo_url TEXT;
    END IF;
  END IF;
  
  -- Face hash
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'face_hash') THEN
    -- Tentar renomear se existir com outro nome
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'facial_encoding') THEN
      ALTER TABLE employees RENAME COLUMN facial_encoding TO face_hash;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'face_encoding') THEN
      ALTER TABLE employees RENAME COLUMN face_encoding TO face_hash;
    ELSE
      ALTER TABLE employees ADD COLUMN face_hash TEXT;
    END IF;
  END IF;
  
  -- Notes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'notes') THEN
    ALTER TABLE employees ADD COLUMN notes TEXT;
  END IF;
  
  -- User ID
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'user_id') THEN
    ALTER TABLE employees ADD COLUMN user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  -- Created by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'created_by') THEN
    ALTER TABLE employees ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Garantir constraint de unicidade no CPF (se a coluna existir)
DO $$
BEGIN
  -- Verificar se já existe constraint de unicidade
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'employees_cpf_key' 
    AND conrelid = 'employees'::regclass
  ) THEN
    -- Tentar adicionar constraint (pode falhar se houver CPFs duplicados)
    BEGIN
      ALTER TABLE employees ADD CONSTRAINT employees_cpf_key UNIQUE (cpf);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Não foi possível adicionar constraint UNIQUE no CPF. Verifique se há CPFs duplicados.';
    END;
  END IF;
END $$;

-- Índices para performance (criar apenas se as colunas existirem)
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

-- Índices condicionais (apenas se as colunas existirem)
DO $$
BEGIN
  -- CPF
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'cpf') THEN
    CREATE INDEX IF NOT EXISTS idx_employees_cpf ON employees(cpf) WHERE cpf IS NOT NULL;
  END IF;
  
  -- Department
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'department') THEN
    CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department) WHERE department IS NOT NULL;
  END IF;
  
  -- User ID
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id) WHERE user_id IS NOT NULL;
  END IF;
  
  -- Created by
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'created_by') THEN
    CREATE INDEX IF NOT EXISTS idx_employees_created_by ON employees(created_by) WHERE created_by IS NOT NULL;
  END IF;
END $$;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. TABELA company_locations (LOCALIZAÇÕES DA EMPRESA)
-- ============================================

CREATE TABLE IF NOT EXISTS company_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL, -- Nome do local (ex: "Matriz", "Filial Centro")
  address TEXT NOT NULL, -- Endereço completo
  latitude DECIMAL(10, 8) NOT NULL, -- Coordenada GPS latitude
  longitude DECIMAL(11, 8) NOT NULL, -- Coordenada GPS longitude
  radius_meters INTEGER NOT NULL DEFAULT 50, -- Raio permitido em metros (padrão: 50m)
  is_active BOOLEAN DEFAULT true, -- Se está ativo
  description TEXT, -- Descrição adicional
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_company_locations_is_active ON company_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_company_locations_coords ON company_locations(latitude, longitude);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_company_locations_updated_at ON company_locations;
CREATE TRIGGER update_company_locations_updated_at
  BEFORE UPDATE ON company_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. TABELA time_records ou time_clock (REGISTRO DE PONTO)
-- ============================================
-- Usando time_clock como nome padrão (mais comum no sistema)

CREATE TABLE IF NOT EXISTS time_clock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  clock_type VARCHAR(20) NOT NULL 
    CHECK (clock_type IN ('entry', 'exit', 'break_start', 'break_end')),
  clock_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  latitude DECIMAL(10, 8), -- Coordenada GPS latitude
  longitude DECIMAL(11, 8), -- Coordenada GPS longitude
  location_address TEXT, -- Endereço obtido do GPS (geocoding reverso)
  distance_from_company DECIMAL(10, 2), -- Distância em metros do local da empresa
  face_verification_confidence DECIMAL(5, 2), -- Confiança do reconhecimento facial (0-100)
  face_verified BOOLEAN DEFAULT false, -- Se foi verificado pelo sistema
  photo_url TEXT, -- Foto tirada no momento do registro
  device_info JSONB, -- Informações do dispositivo (navegador, OS, etc.)
  is_verified BOOLEAN DEFAULT false, -- Se foi verificado manualmente por admin
  verified_by UUID REFERENCES employees(id) ON DELETE SET NULL, -- Admin que verificou
  verified_at TIMESTAMP WITH TIME ZONE, -- Data/hora da verificação
  notes TEXT, -- Observações sobre o registro
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_time_clock_employee_id ON time_clock(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_clock_clock_time ON time_clock(clock_time);
CREATE INDEX IF NOT EXISTS idx_time_clock_clock_type ON time_clock(clock_type);
CREATE INDEX IF NOT EXISTS idx_time_clock_employee_date ON time_clock(employee_id, clock_time);
CREATE INDEX IF NOT EXISTS idx_time_clock_is_verified ON time_clock(is_verified);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_time_clock_updated_at ON time_clock;
CREATE TRIGGER update_time_clock_updated_at
  BEFORE UPDATE ON time_clock
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. TABELA failed_attempts (LOGS DE TENTATIVAS FALHAS)
-- ============================================

CREATE TABLE IF NOT EXISTS failed_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  attempt_type VARCHAR(50) NOT NULL 
    CHECK (attempt_type IN ('gps_validation', 'face_recognition', 'both', 'unknown')),
  face_match_score DECIMAL(5, 2), -- Score de correspondência facial (0-100)
  latitude DECIMAL(10, 8), -- Coordenada GPS da tentativa
  longitude DECIMAL(11, 8), -- Coordenada GPS da tentativa
  distance_from_company DECIMAL(10, 2), -- Distância em metros do local da empresa
  error_message TEXT, -- Mensagem de erro
  device_info JSONB, -- Informações do dispositivo
  ip_address INET, -- Endereço IP (opcional)
  user_agent TEXT, -- User agent do navegador
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_failed_attempts_employee_id ON failed_attempts(employee_id);
CREATE INDEX IF NOT EXISTS idx_failed_attempts_created_at ON failed_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_failed_attempts_attempt_type ON failed_attempts(attempt_type);

-- ============================================
-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_clock ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_attempts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. POLÍTICAS RLS PARA employees
-- ============================================

-- Remover políticas antigas
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

-- Criar políticas permissivas para usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create employees" ON employees;
CREATE POLICY "Authenticated users can create employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update employees" ON employees;
CREATE POLICY "Authenticated users can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete employees" ON employees;
CREATE POLICY "Authenticated users can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 8. POLÍTICAS RLS PARA company_locations
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can view company locations" ON company_locations;
DROP POLICY IF EXISTS "Authenticated users can manage company locations" ON company_locations;
DROP POLICY IF EXISTS "Admins can manage company locations" ON company_locations;

CREATE POLICY "Authenticated users can view company locations"
  ON company_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage company locations"
  ON company_locations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 9. POLÍTICAS RLS PARA time_clock
-- ============================================

DROP POLICY IF EXISTS "Employees can view their own time clock" ON time_clock;
DROP POLICY IF EXISTS "Employees can insert their own time clock" ON time_clock;
DROP POLICY IF EXISTS "Authenticated users can view time clock" ON time_clock;
DROP POLICY IF EXISTS "Authenticated users can create time clock" ON time_clock;
DROP POLICY IF EXISTS "Authenticated users can manage time clock" ON time_clock;
DROP POLICY IF EXISTS "Admins can manage time clock" ON time_clock;

-- Usuários autenticados podem ver seus próprios registros ou todos (se admin)
DROP POLICY IF EXISTS "Authenticated users can view time clock" ON time_clock;
CREATE POLICY "Authenticated users can view time clock"
  ON time_clock FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
    OR true -- Permitir ver todos (pode ser restrito depois se necessário)
  );

-- Usuários autenticados podem criar registros de ponto
DROP POLICY IF EXISTS "Authenticated users can create time clock" ON time_clock;
CREATE POLICY "Authenticated users can create time clock"
  ON time_clock FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
    OR true -- Permitir criar para qualquer funcionário (pode ser restrito depois)
  );

-- Usuários autenticados podem atualizar registros
DROP POLICY IF EXISTS "Authenticated users can update time clock" ON time_clock;
CREATE POLICY "Authenticated users can update time clock"
  ON time_clock FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados podem deletar registros
DROP POLICY IF EXISTS "Authenticated users can delete time clock" ON time_clock;
CREATE POLICY "Authenticated users can delete time clock"
  ON time_clock FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 10. POLÍTICAS RLS PARA failed_attempts
-- ============================================

DROP POLICY IF EXISTS "Admins can view failed attempts" ON failed_attempts;
DROP POLICY IF EXISTS "Employees can insert their own failed attempts" ON failed_attempts;
DROP POLICY IF EXISTS "Authenticated users can view failed attempts" ON failed_attempts;
DROP POLICY IF EXISTS "Authenticated users can create failed attempts" ON failed_attempts;

-- Todos os usuários autenticados podem visualizar tentativas falhas
DROP POLICY IF EXISTS "Authenticated users can view failed attempts" ON failed_attempts;
CREATE POLICY "Authenticated users can view failed attempts"
  ON failed_attempts FOR SELECT
  TO authenticated
  USING (true);

-- Todos os usuários autenticados podem criar tentativas falhas
DROP POLICY IF EXISTS "Authenticated users can create failed attempts" ON failed_attempts;
CREATE POLICY "Authenticated users can create failed attempts"
  ON failed_attempts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- 11. VERIFICAÇÃO E CONFIRMAÇÃO
-- ============================================

DO $$
BEGIN
  -- Verificar tabelas criadas
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
    RAISE NOTICE '✅ Tabela employees criada/verificada!';
  ELSE
    RAISE EXCEPTION '❌ Erro: Tabela employees não foi criada!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_locations') THEN
    RAISE NOTICE '✅ Tabela company_locations criada/verificada!';
  ELSE
    RAISE EXCEPTION '❌ Erro: Tabela company_locations não foi criada!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_clock') THEN
    RAISE NOTICE '✅ Tabela time_clock criada/verificada!';
  ELSE
    RAISE EXCEPTION '❌ Erro: Tabela time_clock não foi criada!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'failed_attempts') THEN
    RAISE NOTICE '✅ Tabela failed_attempts criada/verificada!';
  ELSE
    RAISE EXCEPTION '❌ Erro: Tabela failed_attempts não foi criada!';
  END IF;
  
  -- Verificar funções criadas
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    RAISE NOTICE '✅ Função update_updated_at_column criada/verificada!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_cpf') THEN
    RAISE NOTICE '✅ Função validate_cpf criada/verificada!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_distance') THEN
    RAISE NOTICE '✅ Função calculate_distance criada/verificada!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MÓDULO DE FUNCIONÁRIOS CRIADO COM SUCESSO!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Tabelas criadas:';
  RAISE NOTICE '  • employees (funcionários)';
  RAISE NOTICE '  • company_locations (localizações da empresa)';
  RAISE NOTICE '  • time_clock (registros de ponto)';
  RAISE NOTICE '  • failed_attempts (logs de tentativas falhas)';
  RAISE NOTICE '';
  RAISE NOTICE 'Funções criadas:';
  RAISE NOTICE '  • update_updated_at_column()';
  RAISE NOTICE '  • validate_cpf()';
  RAISE NOTICE '  • calculate_distance()';
  RAISE NOTICE '';
  RAISE NOTICE 'Políticas RLS configuradas para todas as tabelas.';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos passos:';
  RAISE NOTICE '  1. Configure uma localização da empresa na tabela company_locations';
  RAISE NOTICE '  2. Cadastre funcionários na tabela employees';
  RAISE NOTICE '  3. Configure o bucket "employee-photos" no Supabase Storage (opcional)';
  RAISE NOTICE '';
END $$;

