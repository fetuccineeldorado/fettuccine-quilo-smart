-- ============================================
-- FORÇAR PREÇO POR KG PARA R$ 59,90
-- Execute este script no Supabase SQL Editor
-- ============================================
-- Este script FORÇA o preço para R$ 59,90
-- independente do valor atual no banco
-- ============================================

-- 1. ALTERAR o DEFAULT da coluna para R$ 59,90
ALTER TABLE system_settings 
ALTER COLUMN price_per_kg SET DEFAULT 59.90;

-- 2. DELETAR todos os registros com valor diferente de 59.90
DELETE FROM system_settings 
WHERE price_per_kg IS NULL OR price_per_kg != 59.90 OR ABS(price_per_kg - 59.90) > 0.01;

-- 3. FORÇAR atualização do preço para R$ 59,90 (TODOS os registros)
UPDATE system_settings 
SET price_per_kg = 59.90,
    updated_at = NOW()
WHERE price_per_kg IS NULL OR price_per_kg != 59.90 OR ABS(price_per_kg - 59.90) > 0.01;

-- 4. Se não existir nenhuma configuração, criar com R$ 59,90
INSERT INTO system_settings (price_per_kg, minimum_charge, maximum_weight, updated_at)
SELECT 59.90, 5.00, 2.00, NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- 5. Verificar o valor atual
SELECT 
  id,
  price_per_kg as "Preço por kg",
  minimum_charge as "Cobrança mínima",
  maximum_weight as "Peso máximo",
  updated_at as "Última atualização"
FROM system_settings;

-- 6. Mensagem de sucesso
DO $$
DECLARE
  current_price DECIMAL;
  total_records INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_records FROM system_settings;
  SELECT price_per_kg INTO current_price FROM system_settings LIMIT 1;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ PREÇO POR KG FORÇADO PARA R$ 59,90!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total de registros: %', total_records;
  RAISE NOTICE '💰 Valor atual no banco: R$ %', current_price;
  RAISE NOTICE '';
  
  IF current_price = 59.90 THEN
    RAISE NOTICE '✅ SUCESSO! O preço está correto em R$ 59,90';
  ELSE
    RAISE NOTICE '⚠️ ATENÇÃO: O valor ainda não está correto. Execute novamente.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '💡 Próximos passos:';
  RAISE NOTICE '   1. Recarregue a página do sistema (F5)';
  RAISE NOTICE '   2. Limpe o cache do navegador (Ctrl+Shift+R)';
  RAISE NOTICE '   3. Verifique nas Configurações se o valor está R$ 59,90';
  RAISE NOTICE '';
END $$;





