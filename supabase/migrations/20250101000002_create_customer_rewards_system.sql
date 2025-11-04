-- =====================================================
-- SISTEMA COMPLETO DE CLIENTES: BONIFICAÇÃO E INDICAÇÃO
-- =====================================================

-- 1. Adicionar campos de bonificação e indicação na tabela customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES customers(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS points DECIMAL(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_points_earned DECIMAL(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_points_redeemed DECIMAL(10,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state VARCHAR(2);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Criar tabela de transações de pontos
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

-- 3. Criar tabela de indicações (referrals)
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

-- 4. Criar tabela de regras de bonificação
CREATE TABLE IF NOT EXISTS reward_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('points_per_real', 'points_per_order', 'referral_bonus', 'tier_bonus')),
  tier VARCHAR(20) CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum') OR tier IS NULL),
  points_per_unit DECIMAL(10,2) NOT NULL,
  min_amount DECIMAL(10,2) DEFAULT 0,
  max_points_per_transaction DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Criar tabela de resgates (redemptions)
CREATE TABLE IF NOT EXISTS customer_redemptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  redemption_type VARCHAR(50) NOT NULL CHECK (redemption_type IN ('discount', 'free_item', 'cash_back')),
  points_used DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'used', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 6. Criar tabela de histórico de WhatsApp
CREATE TABLE IF NOT EXISTS customer_whatsapp_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('welcome', 'order_confirmation', 'points_earned', 'points_expiring', 'promotion', 'custom')),
  message_content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_customers_referral_code ON customers(referral_code);
CREATE INDEX IF NOT EXISTS idx_customers_referred_by ON customers(referred_by);
CREATE INDEX IF NOT EXISTS idx_customers_points ON customers(points);
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp ON customers(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_points_transactions_customer ON customer_points_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_type ON customer_points_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON customer_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON customer_referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON customer_referrals(status);
CREATE INDEX IF NOT EXISTS idx_redemptions_customer ON customer_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON customer_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_customer ON customer_whatsapp_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON customer_whatsapp_messages(status);

-- 8. Função para gerar código de indicação único
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Gerar código aleatório de 8 caracteres (letras e números)
    new_code := UPPER(
      SUBSTR(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 8)
    );
    
    -- Verificar se já existe
    SELECT EXISTS(SELECT 1 FROM customers WHERE referral_code = new_code) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 9. Função para atualizar pontos automaticamente
CREATE OR REPLACE FUNCTION update_customer_points()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'earned' OR NEW.transaction_type = 'bonus' OR NEW.transaction_type = 'referral' THEN
    UPDATE customers 
    SET points = points + NEW.points,
        total_points_earned = total_points_earned + NEW.points
    WHERE id = NEW.customer_id;
  ELSIF NEW.transaction_type = 'redeemed' THEN
    UPDATE customers 
    SET points = GREATEST(0, points - NEW.points),
        total_points_redeemed = total_points_redeemed + NEW.points
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger para atualizar pontos automaticamente
DROP TRIGGER IF EXISTS trigger_update_customer_points ON customer_points_transactions;
CREATE TRIGGER trigger_update_customer_points
  AFTER INSERT ON customer_points_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_points();

-- 11. Função para atualizar tier baseado em pontos/gastos
CREATE OR REPLACE FUNCTION update_customer_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar tier baseado em total_spent
  IF NEW.total_spent >= 1000 THEN
    NEW.tier := 'platinum';
  ELSIF NEW.total_spent >= 500 THEN
    NEW.tier := 'gold';
  ELSIF NEW.total_spent >= 200 THEN
    NEW.tier := 'silver';
  ELSE
    NEW.tier := 'bronze';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Trigger para atualizar tier
DROP TRIGGER IF EXISTS trigger_update_customer_tier ON customers;
CREATE TRIGGER trigger_update_customer_tier
  BEFORE UPDATE OF total_spent ON customers
  FOR EACH ROW
  WHEN (OLD.total_spent IS DISTINCT FROM NEW.total_spent)
  EXECUTE FUNCTION update_customer_tier();

-- 13. Inserir regras de bonificação padrão (apenas se não existirem)
INSERT INTO reward_rules (id, rule_type, points_per_unit, is_active, valid_from) 
SELECT 
  gen_random_uuid(),
  'points_per_real',
  1.0,
  true,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM reward_rules WHERE rule_type = 'points_per_real');

INSERT INTO reward_rules (id, rule_type, points_per_unit, is_active, valid_from) 
SELECT 
  gen_random_uuid(),
  'referral_bonus',
  100.0,
  true,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM reward_rules WHERE rule_type = 'referral_bonus');

INSERT INTO reward_rules (id, rule_type, points_per_unit, is_active, valid_from) 
SELECT 
  gen_random_uuid(),
  'tier_bonus',
  0.0,
  true,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM reward_rules WHERE rule_type = 'tier_bonus');

-- 14. Atualizar customers existentes com código de indicação
UPDATE customers 
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- 15. Habilitar RLS (Row Level Security)
ALTER TABLE customer_points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- 16. Políticas RLS para as novas tabelas (idempotentes)
DROP POLICY IF EXISTS "Authenticated users can view points transactions" ON customer_points_transactions;
CREATE POLICY "Authenticated users can view points transactions"
  ON customer_points_transactions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create points transactions" ON customer_points_transactions;
CREATE POLICY "Authenticated users can create points transactions"
  ON customer_points_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view referrals" ON customer_referrals;
CREATE POLICY "Authenticated users can view referrals"
  ON customer_referrals FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create referrals" ON customer_referrals;
CREATE POLICY "Authenticated users can create referrals"
  ON customer_referrals FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update referrals" ON customer_referrals;
CREATE POLICY "Authenticated users can update referrals"
  ON customer_referrals FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view reward rules" ON reward_rules;
CREATE POLICY "Authenticated users can view reward rules"
  ON reward_rules FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Managers and admins can manage reward rules" ON reward_rules;
CREATE POLICY "Managers and admins can manage reward rules"
  ON reward_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.id = ur.user_id
      WHERE p.id = auth.uid() 
      AND ur.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can view redemptions" ON customer_redemptions;
CREATE POLICY "Authenticated users can view redemptions"
  ON customer_redemptions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create redemptions" ON customer_redemptions;
CREATE POLICY "Authenticated users can create redemptions"
  ON customer_redemptions FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update redemptions" ON customer_redemptions;
CREATE POLICY "Authenticated users can update redemptions"
  ON customer_redemptions FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view whatsapp messages" ON customer_whatsapp_messages;
CREATE POLICY "Authenticated users can view whatsapp messages"
  ON customer_whatsapp_messages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create whatsapp messages" ON customer_whatsapp_messages;
CREATE POLICY "Authenticated users can create whatsapp messages"
  ON customer_whatsapp_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update whatsapp messages" ON customer_whatsapp_messages;
CREATE POLICY "Authenticated users can update whatsapp messages"
  ON customer_whatsapp_messages FOR UPDATE
  TO authenticated
  USING (true);

