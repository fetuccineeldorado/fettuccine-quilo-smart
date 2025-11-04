-- Migration: Correção e padronização do sistema de ponto eletrônico
-- Cria tabelas faltantes e corrige estrutura

-- ============================================
-- 1. CRIAR TABELA company_locations (se não existir)
-- ============================================
CREATE TABLE IF NOT EXISTS company_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. CRIAR TABELA failed_attempts (logs de tentativas falhas)
-- ============================================
CREATE TABLE IF NOT EXISTS failed_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  attempt_type VARCHAR(50) NOT NULL CHECK (attempt_type IN ('gps_validation', 'face_recognition', 'both', 'unknown')),
  face_match_score DECIMAL(5, 2),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_from_company DECIMAL(10, 2),
  error_message TEXT,
  device_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_failed_attempts_employee_id ON failed_attempts(employee_id);
CREATE INDEX IF NOT EXISTS idx_failed_attempts_created_at ON failed_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_failed_attempts_attempt_type ON failed_attempts(attempt_type);

-- ============================================
-- 3. GARANTIR QUE employees TENHA user_id (opcional, para conectar com auth.users)
-- ============================================
DO $$ 
BEGIN
  -- Adicionar user_id se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'user_id') THEN
    ALTER TABLE employees ADD COLUMN user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  -- Adicionar face_photo_url se não existir (pode ter nome diferente)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'face_photo_url') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'facial_photo_url') THEN
      ALTER TABLE employees RENAME COLUMN facial_photo_url TO face_photo_url;
    ELSE
      ALTER TABLE employees ADD COLUMN face_photo_url TEXT;
    END IF;
  END IF;
  
  -- Adicionar face_hash/face_encoding se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'face_hash') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'facial_encoding') THEN
      ALTER TABLE employees RENAME COLUMN facial_encoding TO face_hash;
    ELSE IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'face_encoding') THEN
      ALTER TABLE employees RENAME COLUMN face_encoding TO face_hash;
    ELSE
      ALTER TABLE employees ADD COLUMN face_hash TEXT;
    END IF;
  END IF;
END $$;

-- ============================================
-- 4. GARANTIR QUE time_clock EXISTA (usando a estrutura mais completa)
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
-- 5. HABILITAR RLS
-- ============================================
ALTER TABLE company_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_clock ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. POLÍTICAS RLS PARA company_locations
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view company locations" ON company_locations;
CREATE POLICY "Authenticated users can view company locations"
  ON company_locations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage company locations" ON company_locations;
CREATE POLICY "Admins can manage company locations"
  ON company_locations FOR ALL
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
-- 7. POLÍTICAS RLS PARA failed_attempts
-- ============================================
DROP POLICY IF EXISTS "Admins can view failed attempts" ON failed_attempts;
CREATE POLICY "Admins can view failed attempts"
  ON failed_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid() 
      AND admin_users.is_active = true
    )
    OR employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Employees can insert their own failed attempts" ON failed_attempts;
CREATE POLICY "Employees can insert their own failed attempts"
  ON failed_attempts FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Permitir qualquer usuário autenticado registrar tentativas falhas

-- ============================================
-- 8. POLÍTICAS RLS PARA time_clock (se ainda não existirem)
-- ============================================
DROP POLICY IF EXISTS "Employees can view their own time clock" ON time_clock;
CREATE POLICY "Employees can view their own time clock"
  ON time_clock FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid() OR id = time_clock.employee_id
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
      SELECT id FROM employees WHERE user_id = auth.uid() OR id = time_clock.employee_id
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
-- 9. FUNÇÃO PARA ATUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_company_locations_updated_at ON company_locations;
CREATE TRIGGER update_company_locations_updated_at
  BEFORE UPDATE ON company_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. VERIFICAÇÃO FINAL
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_locations') THEN
    RAISE NOTICE '✅ Tabela company_locations verificada/criada!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'failed_attempts') THEN
    RAISE NOTICE '✅ Tabela failed_attempts verificada/criada!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_clock') THEN
    RAISE NOTICE '✅ Tabela time_clock verificada/criada!';
  END IF;
END $$;

