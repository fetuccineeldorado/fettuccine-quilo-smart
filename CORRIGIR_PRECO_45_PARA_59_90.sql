-- ============================================
-- CORRIGIR PREÇO DE R$ 45,00 PARA R$ 59,90
-- Execute este script no Supabase SQL Editor
-- ============================================

-- Forçar atualização do preço para R$ 59,90
UPDATE system_settings 
SET price_per_kg = 59.90,
    updated_at = NOW()
WHERE price_per_kg != 59.90 OR price_per_kg IS NULL;

-- Se não existir nenhuma configuração, criar uma nova
INSERT INTO system_settings (price_per_kg, minimum_charge, maximum_weight, updated_at)
SELECT 59.90, 5.00, 2.00, NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- Verificar o valor atualizado
SELECT 
  id,
  price_per_kg as "Preço por kg",
  minimum_charge as "Cobrança mínima",
  maximum_weight as "Peso máximo",
  updated_at as "Última atualização"
FROM system_settings
LIMIT 1;

-- Mensagem de sucesso
DO $$
DECLARE
  current_price DECIMAL;
BEGIN
  SELECT price_per_kg INTO current_price FROM system_settings LIMIT 1;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ PREÇO ATUALIZADO COM SUCESSO!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '💰 Preço por kg atual: R$ %', current_price;
  
  IF current_price = 59.90 THEN
    RAISE NOTICE '✅ Valor correto: R$ 59,90';
  ELSE
    RAISE NOTICE '⚠️  Valor ainda não está correto. Verifique as permissões RLS.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '💡 Próximos passos:';
  RAISE NOTICE '   1. Recarregue a página do sistema (F5)';
  RAISE NOTICE '   2. Limpe o cache do navegador (Ctrl+Shift+R)';
  RAISE NOTICE '   3. Verifique nas Configurações se o valor está R$ 59,90';
  RAISE NOTICE '';
END $$;



