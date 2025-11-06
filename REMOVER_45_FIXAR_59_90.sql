-- ============================================
-- REMOVER VALOR R$ 45,00 E FIXAR EM R$ 59,90
-- Execute este script no Supabase SQL Editor
-- Este script REMOVE completamente o valor 45.00
-- ============================================

-- 1. ALTERAR o DEFAULT da coluna para R$ 59,90 (removendo 45.00)
ALTER TABLE system_settings 
ALTER COLUMN price_per_kg SET DEFAULT 59.90;

-- 2. DELETAR todos os registros com valor 45.00 ou NULL
DELETE FROM system_settings 
WHERE price_per_kg = 45.00 OR price_per_kg IS NULL;

-- 3. FORÇAR atualização de TODOS os registros para R$ 59,90
UPDATE system_settings 
SET price_per_kg = 59.90,
    updated_at = NOW()
WHERE price_per_kg != 59.90 OR ABS(price_per_kg - 59.90) > 0.01;

-- 4. Garantir que existe pelo menos uma configuração com R$ 59,90
INSERT INTO system_settings (price_per_kg, minimum_charge, maximum_weight, updated_at)
SELECT 59.90, 5.00, 2.00, NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- 5. Verificar se ainda há algum valor 45.00 (não deveria ter)
DO $$
DECLARE
  count_45 INTEGER;
  count_total INTEGER;
  current_price DECIMAL;
BEGIN
  SELECT COUNT(*) INTO count_45 FROM system_settings WHERE price_per_kg = 45.00;
  SELECT COUNT(*) INTO count_total FROM system_settings;
  SELECT price_per_kg INTO current_price FROM system_settings LIMIT 1;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 VERIFICAÇÃO DE LIMPEZA';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total de configurações: %', count_total;
  RAISE NOTICE '❌ Registros com R$ 45,00: %', count_45;
  RAISE NOTICE '💰 Valor atual: R$ %', current_price;
  RAISE NOTICE '';
  
  IF count_45 > 0 THEN
    RAISE NOTICE '⚠️  ATENÇÃO: Ainda existem % registro(s) com R$ 45,00!', count_45;
    RAISE NOTICE '   Execute este script novamente.';
  ELSE
    RAISE NOTICE '✅ SUCESSO! Nenhum registro com R$ 45,00 encontrado.';
  END IF;
  
  IF current_price = 59.90 THEN
    RAISE NOTICE '✅ Preço fixado corretamente em R$ 59,90!';
  ELSE
    RAISE NOTICE '⚠️  ATENÇÃO: O valor atual ainda não está em R$ 59,90!';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- 6. Mostrar todos os registros para verificação
SELECT 
  id,
  price_per_kg as "Preço por kg",
  minimum_charge as "Cobrança mínima",
  maximum_weight as "Peso máximo",
  updated_at as "Última atualização"
FROM system_settings
ORDER BY updated_at DESC;

-- 7. Mensagem final
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ PROCESSO CONCLUÍDO!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 O que foi feito:';
  RAISE NOTICE '   ✅ DEFAULT da coluna alterado para R$ 59,90';
  RAISE NOTICE '   ✅ Registros com R$ 45,00 foram DELETADOS';
  RAISE NOTICE '   ✅ Todos os registros atualizados para R$ 59,90';
  RAISE NOTICE '   ✅ Configuração garantida com R$ 59,90';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Próximos passos:';
  RAISE NOTICE '   1. Recarregue a página do sistema (F5)';
  RAISE NOTICE '   2. Limpe o cache do navegador (Ctrl+Shift+R)';
  RAISE NOTICE '   3. Verifique nas Configurações se está R$ 59,90';
  RAISE NOTICE '';
END $$;



