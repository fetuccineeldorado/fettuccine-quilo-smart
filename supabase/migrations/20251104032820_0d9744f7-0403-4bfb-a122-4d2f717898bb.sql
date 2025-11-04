-- =====================================================
-- MIGRAÇÃO CONSOLIDADA: Sistema Completo WhatsApp + Clientes
-- =====================================================

-- 1. Tabela de Clientes (base para tudo)
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  whatsapp_number VARCHAR(20),
  whatsapp_verified BOOLEAN DEFAULT false,
  tier VARCHAR(20) NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  points DECIMAL(10,2) DEFAULT 0,
  total_points_earned DECIMAL(10,2) DEFAULT 0,
  total_points_redeemed DECIMAL(10,2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  referral_code VARCHAR(20) UNIQUE,
  referred_by UUID REFERENCES customers(id),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  birth_date DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Conexões WhatsApp
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

-- 3. Tabela de Promoções
CREATE TABLE IF NOT EXISTS promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  message_content TEXT NOT NULL,
  promotion_type VARCHAR(50) NOT NULL CHECK (promotion_type IN ('discount', 'points', 'event', 'announcement', 'custom')),
  discount_percentage DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  points_bonus DECIMAL(10,2),
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Campanhas de Promoção
CREATE TABLE IF NOT EXISTS promotion_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  campaign_name VARCHAR(255) NOT NULL,
  target_criteria JSONB,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'cancelled', 'failed')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Destinatários da Campanha
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES promotion_campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  whatsapp_number VARCHAR(20) NOT NULL,
  message_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (message_status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(campaign_id, customer_id)
);

-- 6. Tabela de Transações de Pontos
CREATE TABLE IF NOT EXISTS customer_points_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'bonus', 'referral')),
  points DECIMAL(10,2) NOT NULL,
  description TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  referral_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabela de Indicações
CREATE TABLE IF NOT EXISTS customer_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  referrer_points_earned DECIMAL(10,2) DEFAULT 0,
  referred_points_earned DECIMAL(10,2) DEFAULT 0,
  first_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- 8. Criar Índices
CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_referral ON customers(referral_code);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_instance ON whatsapp_connections(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status ON whatsapp_connections(status);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON promotion_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipients_status ON campaign_recipients(message_status);
CREATE INDEX IF NOT EXISTS idx_points_customer ON customer_points_transactions(customer_id);

-- 9. Habilitar RLS em todas as tabelas
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_referrals ENABLE ROW LEVEL SECURITY;

-- 10. Políticas RLS - Customers
CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create customers"
  ON customers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE TO authenticated USING (true);

-- 11. Políticas RLS - WhatsApp Connections
CREATE POLICY "Authenticated users can view whatsapp connections"
  ON whatsapp_connections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create whatsapp connections"
  ON whatsapp_connections FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update whatsapp connections"
  ON whatsapp_connections FOR UPDATE TO authenticated USING (true);

-- 12. Políticas RLS - Promotions
CREATE POLICY "Authenticated users can view promotions"
  ON promotions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create promotions"
  ON promotions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update promotions"
  ON promotions FOR UPDATE TO authenticated USING (true);

-- 13. Políticas RLS - Campaigns
CREATE POLICY "Authenticated users can view campaigns"
  ON promotion_campaigns FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create campaigns"
  ON promotion_campaigns FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update campaigns"
  ON promotion_campaigns FOR UPDATE TO authenticated USING (true);

-- 14. Políticas RLS - Campaign Recipients
CREATE POLICY "Authenticated users can view recipients"
  ON campaign_recipients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create recipients"
  ON campaign_recipients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update recipients"
  ON campaign_recipients FOR UPDATE TO authenticated USING (true);

-- 15. Políticas RLS - Points Transactions
CREATE POLICY "Authenticated users can view points transactions"
  ON customer_points_transactions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create points transactions"
  ON customer_points_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- 16. Políticas RLS - Referrals
CREATE POLICY "Authenticated users can view referrals"
  ON customer_referrals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create referrals"
  ON customer_referrals FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update referrals"
  ON customer_referrals FOR UPDATE TO authenticated USING (true);

-- 17. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_customers_updated_at();

CREATE TRIGGER whatsapp_connections_updated_at
BEFORE UPDATE ON whatsapp_connections
FOR EACH ROW
EXECUTE FUNCTION update_customers_updated_at();

CREATE TRIGGER promotions_updated_at
BEFORE UPDATE ON promotions
FOR EACH ROW
EXECUTE FUNCTION update_customers_updated_at();

CREATE TRIGGER campaigns_updated_at
BEFORE UPDATE ON promotion_campaigns
FOR EACH ROW
EXECUTE FUNCTION update_customers_updated_at();