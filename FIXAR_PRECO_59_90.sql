-- ============================================
-- FIXAR PREÇO POR KG EM R$ 59,90
-- Execute este script no Supabase SQL Editor
-- Este script FORÇA o valor para R$ 59,90
-- ============================================

-- 1. Garantir que a tabela existe
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  price_per_kg DECIMAL(10,2) NOT NULL DEFAULT 59.90,
  minimum_charge DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  maximum_weight DECIMAL(10,2) NOT NULL DEFAULT 2.00,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.1. ALTERAR o DEFAULT da coluna para R$ 59,90 (REMOVE o DEFAULT 45.00)
ALTER TABLE system_settings 
ALTER COLUMN price_per_kg SET DEFAULT 59.90;

-- 2. DELETAR registros com valor 45.00 (REMOVER COMPLETAMENTE)
DELETE FROM system_settings 
WHERE price_per_kg = 45.00;

-- 3. FORÇAR atualização do preço para R$ 59,90 (TODOS os registros restantes)
UPDATE system_settings 
SET price_per_kg = 59.90,
    updated_at = NOW()
WHERE price_per_kg IS NULL OR price_per_kg != 59.90 OR ABS(price_per_kg - 59.90) > 0.01;

-- 4. Se não existir nenhuma configuração, criar com R$ 59,90
INSERT INTO system_settings (price_per_kg, minimum_charge, maximum_weight, updated_at)
SELECT 59.90, 5.00, 2.00, NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- 5. Verificar se ainda há registros com 45.00
DO $$
DECLARE
  count_45 INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_45 FROM system_settings WHERE price_per_kg = 45.00;
  IF count_45 > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ATENÇÃO: Ainda existem % registro(s) com R$ 45,00!', count_45;
    RAISE NOTICE '   Execute DELETE FROM system_settings WHERE price_per_kg = 45.00;';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ Nenhum registro com R$ 45,00 encontrado!';
  END IF;
END $$;

-- 6. Verificar o valor atual
SELECT 
  id,
  price_per_kg as "Preço por kg",
  minimum_charge as "Cobrança mínima",
  maximum_weight as "Peso máximo",
  updated_at as "Última atualização"
FROM system_settings
LIMIT 1;

-- 5. Mensagem de sucesso
DO $$
DECLARE
  current_price DECIMAL;
BEGIN
  SELECT price_per_kg INTO current_price FROM system_settings LIMIT 1;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ PREÇO POR KG FIXADO EM R$ 59,90!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '💰 Valor atual no banco: R$ %', current_price;
  RAISE NOTICE '';
  
  IF current_price = 59.90 THEN
    RAISE NOTICE '✅ SUCESSO! O preço está correto em R$ 59,90';
  ELSE
    RAISE NOTICE '⚠️  ATENÇÃO: O valor ainda não está correto. Execute novamente.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '💡 Próximos passos:';
  RAISE NOTICE '   1. Recarregue a página do sistema (F5)';
  RAISE NOTICE '   2. Limpe o cache do navegador (Ctrl+Shift+R)';
  RAISE NOTICE '   3. Verifique nas Configurações se o valor está R$ 59,90';
  RAISE NOTICE '';
END $$;

