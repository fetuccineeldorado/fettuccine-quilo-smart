-- Atualizar o preço por kg para R$ 54,90
UPDATE system_settings 
SET price_per_kg = 54.90, 
    updated_at = NOW()
WHERE EXISTS (SELECT 1 FROM system_settings LIMIT 1);

