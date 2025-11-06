-- ============================================
-- DEFINIR PREÇO POR KG: R$ 59,90
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Atualizar o preço por kg para R$ 59,90
-- Primeiro, tenta atualizar se já existir uma configuração
UPDATE system_settings 
SET price_per_kg = 59.90, 
    updated_at = NOW()
WHERE id IN (SELECT id FROM system_settings LIMIT 1);

-- Se não existir nenhuma configuração, cria uma nova
INSERT INTO system_settings (price_per_kg, minimum_charge, maximum_weight, updated_at)
SELECT 59.90, 5.00, 2.00, NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- Verificar o resultado
SELECT 
  id,
  price_per_kg,
  minimum_charge,
  maximum_weight,
  updated_at
FROM system_settings
ORDER BY updated_at DESC
LIMIT 1;

-- Mensagem de confirmação
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ PREÇO POR KG DEFINIDO COM SUCESSO!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '💰 Preço por kg: R$ 59,90';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Próximos passos:';
  RAISE NOTICE '  1. Recarregue a página do sistema (F5)';
  RAISE NOTICE '  2. Vá em Configurações > Parâmetros do Sistema';
  RAISE NOTICE '  3. Verifique se o valor está correto';
  RAISE NOTICE '';
END $$;



