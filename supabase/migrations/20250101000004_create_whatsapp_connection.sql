-- =====================================================
-- SISTEMA DE CONEXÃO WHATSAPP VIA QR CODE
-- =====================================================

-- 1. Criar tabela de conexões WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id VARCHAR(100) UNIQUE NOT NULL,
  instance_name VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected', 'error')),
  qr_code TEXT,
  qr_code_expires_at TIMESTAMP WITH TIME ZONE,
  phone_number VARCHAR(20),
  phone_name VARCHAR(255),
  provider VARCHAR(50) NOT NULL DEFAULT 'evolution' CHECK (provider IN ('evolution', 'whatsapp-business', 'custom')),
  api_url VARCHAR(500),
  api_key VARCHAR(500),
  last_connected_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_instance ON whatsapp_connections(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status ON whatsapp_connections(status);

-- 3. Função para atualizar updated_at (verificar se função existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_connections_updated_at ON whatsapp_connections;
CREATE TRIGGER update_whatsapp_connections_updated_at
  BEFORE UPDATE ON whatsapp_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Habilitar RLS
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS
DROP POLICY IF EXISTS "Authenticated users can view whatsapp connections" ON whatsapp_connections;
CREATE POLICY "Authenticated users can view whatsapp connections"
  ON whatsapp_connections FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create whatsapp connections" ON whatsapp_connections;
CREATE POLICY "Authenticated users can create whatsapp connections"
  ON whatsapp_connections FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update whatsapp connections" ON whatsapp_connections;
CREATE POLICY "Authenticated users can update whatsapp connections"
  ON whatsapp_connections FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Managers and admins can delete whatsapp connections" ON whatsapp_connections;
CREATE POLICY "Managers and admins can delete whatsapp connections"
  ON whatsapp_connections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.id = ur.user_id
      WHERE p.id = auth.uid() 
      AND ur.role IN ('admin', 'manager')
    )
  );

