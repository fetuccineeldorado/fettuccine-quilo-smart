-- ============================================
-- SISTEMA DE GERENCIAMENTO DE FUNCIONÁRIOS
-- E REGISTRO DE PONTO ELETRÔNICO
-- ============================================

-- 1. Tabela de localização da empresa (para validação GPS)
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

-- 2. Tabela de funcionários
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  position VARCHAR(255) NOT NULL, -- cargo
  department VARCHAR(255) NOT NULL, -- departamento
  address TEXT,
  hire_date DATE NOT NULL, -- data de admissão
  face_photo_url TEXT, -- URL da foto facial (armazenada de forma segura)
  face_encoding TEXT, -- Encoding facial para reconhecimento (criptografado)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT cpf_format CHECK (cpf ~ '^[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}$')
);

-- 3. Tabela de registros de ponto
CREATE TABLE IF NOT EXISTS time_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  record_type VARCHAR(10) NOT NULL CHECK (record_type IN ('entry', 'exit')), -- entrada ou saída
  record_date DATE NOT NULL,
  record_time TIME NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_from_company DECIMAL(10, 2), -- distância em metros do local da empresa
  face_match_score DECIMAL(5, 2), -- score de correspondência facial (0-100)
  face_match_status VARCHAR(20) DEFAULT 'pending' CHECK (face_match_status IN ('approved', 'rejected', 'pending')),
  is_valid BOOLEAN DEFAULT false, -- true se passou em todas as validações
  validation_errors TEXT, -- erros de validação se houver
  device_info TEXT, -- informações do dispositivo
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de tentativas falhas (para logs e segurança)
CREATE TABLE IF NOT EXISTS failed_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  attempt_type VARCHAR(20) NOT NULL CHECK (attempt_type IN ('face_recognition', 'gps_validation', 'both')),
  face_match_score DECIMAL(5, 2),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_from_company DECIMAL(10, 2),
  error_message TEXT,
  device_info TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de usuários administradores (usa auth.users do Supabase)
-- Os admins serão gerenciados através do sistema de autenticação do Supabase
-- Esta tabela armazena metadados adicionais
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_employees_cpf ON employees(cpf);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_time_records_employee_id ON time_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_records_date ON time_records(record_date);
CREATE INDEX IF NOT EXISTS idx_time_records_employee_date ON time_records(employee_id, record_date);
CREATE INDEX IF NOT EXISTS idx_failed_attempts_employee ON failed_attempts(employee_id);
CREATE INDEX IF NOT EXISTS idx_failed_attempts_date ON failed_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_company_locations_active ON company_locations(is_active);

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at 
  BEFORE UPDATE ON employees 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_locations_updated_at ON company_locations;
CREATE TRIGGER update_company_locations_updated_at 
  BEFORE UPDATE ON company_locations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at 
  BEFORE UPDATE ON admin_users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular distância entre duas coordenadas (Haversine)
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

-- Habilitar RLS (Row Level Security)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para employees
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
CREATE POLICY "Admins can manage employees"
  ON employees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.is_active = true
    )
  );

DROP POLICY IF EXISTS "Employees can view own data" ON employees;
CREATE POLICY "Employees can view own data"
  ON employees FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid() 
    AND admin_users.is_active = true
  ));

-- Políticas RLS para time_records
DROP POLICY IF EXISTS "Admins can view all time records" ON time_records;
CREATE POLICY "Admins can view all time records"
  ON time_records FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid() 
    AND admin_users.is_active = true
  ));

DROP POLICY IF EXISTS "Employees can insert own time records" ON time_records;
CREATE POLICY "Employees can insert own time records"
  ON time_records FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM employees WHERE id = auth.uid()
    )
  );

-- Políticas RLS para failed_attempts (apenas admins)
DROP POLICY IF EXISTS "Only admins can view failed attempts" ON failed_attempts;
CREATE POLICY "Only admins can view failed attempts"
  ON failed_attempts FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid() 
    AND admin_users.is_active = true
  ));

DROP POLICY IF EXISTS "System can insert failed attempts" ON failed_attempts;
CREATE POLICY "System can insert failed attempts"
  ON failed_attempts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Políticas RLS para company_locations (apenas admins)
DROP POLICY IF EXISTS "Admins can manage company locations" ON company_locations;
CREATE POLICY "Admins can manage company locations"
  ON company_locations FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = auth.uid() 
    AND admin_users.is_active = true
  ));

-- Políticas RLS para admin_users (apenas super admins)
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;
CREATE POLICY "Super admins can manage admin users"
  ON admin_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.id = auth.uid() 
      AND admin_users.role = 'admin'
      AND admin_users.is_active = true
    )
  );

-- Inserir localização padrão da empresa (exemplo)
INSERT INTO company_locations (name, address, latitude, longitude, radius_meters)
VALUES (
  'Sede Principal',
  'Endereço da empresa - Cidade, Estado',
  -23.550520, -- latitude (exemplo: São Paulo)
  -46.633308, -- longitude (exemplo: São Paulo)
  50
)
ON CONFLICT DO NOTHING;

