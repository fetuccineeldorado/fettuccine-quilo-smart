-- =====================================================
-- SISTEMA DE DISPARO DE PROMOÇÕES EM MASSA
-- =====================================================

-- 1. Criar tabela de promoções
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

-- 2. Criar tabela de campanhas (disparos)
CREATE TABLE IF NOT EXISTS promotion_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  campaign_name VARCHAR(255) NOT NULL,
  target_criteria JSONB, -- Critérios de seleção (tier, pontos, última compra, etc.)
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

-- 3. Criar tabela de destinatários da campanha
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

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_promotions_type ON promotions(promotion_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON promotion_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_promotion ON promotion_campaigns(promotion_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON promotion_campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_recipients_customer ON campaign_recipients(customer_id);
CREATE INDEX IF NOT EXISTS idx_recipients_status ON campaign_recipients(message_status);

-- 5. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Triggers para updated_at
DROP TRIGGER IF EXISTS update_promotions_updated_at ON promotions;
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON promotion_campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON promotion_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Função para contar destinatários automaticamente
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE promotion_campaigns
    SET total_recipients = (
      SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = NEW.campaign_id
    )
    WHERE id = NEW.campaign_id;
    
    IF NEW.message_status = 'sent' THEN
      UPDATE promotion_campaigns
      SET sent_count = (
        SELECT COUNT(*) FROM campaign_recipients 
        WHERE campaign_id = NEW.campaign_id AND message_status = 'sent'
      )
      WHERE id = NEW.campaign_id;
    ELSIF NEW.message_status = 'delivered' THEN
      UPDATE promotion_campaigns
      SET delivered_count = (
        SELECT COUNT(*) FROM campaign_recipients 
        WHERE campaign_id = NEW.campaign_id AND message_status = 'delivered'
      )
      WHERE id = NEW.campaign_id;
    ELSIF NEW.message_status = 'read' THEN
      UPDATE promotion_campaigns
      SET read_count = (
        SELECT COUNT(*) FROM campaign_recipients 
        WHERE campaign_id = NEW.campaign_id AND message_status = 'read'
      )
      WHERE id = NEW.campaign_id;
    ELSIF NEW.message_status = 'failed' THEN
      UPDATE promotion_campaigns
      SET failed_count = (
        SELECT COUNT(*) FROM campaign_recipients 
        WHERE campaign_id = NEW.campaign_id AND message_status = 'failed'
      )
      WHERE id = NEW.campaign_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Atualizar contadores quando status muda
    IF OLD.message_status != NEW.message_status THEN
      UPDATE promotion_campaigns
      SET 
        sent_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = NEW.campaign_id AND message_status = 'sent'),
        delivered_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = NEW.campaign_id AND message_status = 'delivered'),
        read_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = NEW.campaign_id AND message_status = 'read'),
        failed_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = NEW.campaign_id AND message_status = 'failed')
      WHERE id = NEW.campaign_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para atualizar estatísticas
DROP TRIGGER IF EXISTS trigger_update_campaign_stats ON campaign_recipients;
CREATE TRIGGER trigger_update_campaign_stats
  AFTER INSERT OR UPDATE ON campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_stats();

-- 9. Habilitar RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;

-- 10. Políticas RLS
CREATE POLICY "Authenticated users can view promotions"
  ON promotions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create promotions"
  ON promotions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update promotions"
  ON promotions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view campaigns"
  ON promotion_campaigns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create campaigns"
  ON promotion_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update campaigns"
  ON promotion_campaigns FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view recipients"
  ON campaign_recipients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create recipients"
  ON campaign_recipients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update recipients"
  ON campaign_recipients FOR UPDATE
  TO authenticated
  USING (true);

