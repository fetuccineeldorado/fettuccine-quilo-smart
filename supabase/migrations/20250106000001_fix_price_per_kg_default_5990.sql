-- ============================================
-- CORRIGIR DEFAULT DE price_per_kg PARA R$ 59,90
-- Esta migration remove o DEFAULT 45.00 e define 59.90
-- ============================================

-- 1. Alterar o DEFAULT da coluna para R$ 59,90 (removendo 45.00)
ALTER TABLE system_settings 
ALTER COLUMN price_per_kg SET DEFAULT 59.90;

-- 2. Atualizar todos os registros existentes para R$ 59,90
UPDATE system_settings 
SET price_per_kg = 59.90,
    updated_at = NOW()
WHERE price_per_kg IS NULL OR price_per_kg != 59.90 OR ABS(price_per_kg - 59.90) > 0.01;

-- 3. Garantir que existe pelo menos uma configuração com R$ 59,90
INSERT INTO system_settings (price_per_kg, minimum_charge, maximum_weight, updated_at)
SELECT 59.90, 5.00, 2.00, NOW()
WHERE NOT EXISTS (SELECT 1 FROM system_settings);

-- 4. Verificar resultado
DO $$
DECLARE
  current_default TEXT;
  count_45 INTEGER;
BEGIN
  -- Verificar o DEFAULT atual
  SELECT column_default INTO current_default
  FROM information_schema.columns
  WHERE table_name = 'system_settings' 
    AND column_name = 'price_per_kg';
  
  -- Contar registros com 45.00
  SELECT COUNT(*) INTO count_45 
  FROM system_settings 
  WHERE price_per_kg = 45.00;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration aplicada com sucesso!';
  RAISE NOTICE '   DEFAULT atual: %', current_default;
  RAISE NOTICE '   Registros com R$ 45,00: %', count_45;
  RAISE NOTICE '';
  
  IF count_45 > 0 THEN
    RAISE NOTICE '⚠️  Ainda existem registros com R$ 45,00. Execute REMOVER_45_FIXAR_59_90.sql';
  END IF;
END $$;



