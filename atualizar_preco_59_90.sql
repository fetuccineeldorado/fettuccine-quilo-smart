-- ============================================
-- ATUALIZAR PREÇO POR KG PARA R$ 59,90
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Atualizar o preço por kg para R$ 59,90
UPDATE system_settings 
SET price_per_kg = 59.90,
    updated_at = NOW()
WHERE id IN (SELECT id FROM system_settings LIMIT 1);

-- Se não existir nenhuma configuração, criar uma nova
INSERT INTO system_settings (price_per_kg, minimum_charge, maximum_weight, updated_at)
SELECT 59.90, 5.00, 2.00, NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- Verificar o valor atualizado
SELECT 
  id,
  price_per_kg,
  minimum_charge,
  maximum_weight,
  updated_at
FROM system_settings
LIMIT 1;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Preço por kg atualizado para R$ 59,90!';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Próximos passos:';
  RAISE NOTICE '   1. Recarregue a página do sistema (F5)';
  RAISE NOTICE '   2. Limpe o cache do navegador (Ctrl+Shift+R)';
  RAISE NOTICE '   3. Verifique se o valor está correto nas Configurações';
  RAISE NOTICE '';
END $$;



