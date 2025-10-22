-- Atualizar o preço por kg para R$ 54,90
UPDATE system_settings 
SET price_per_kg = 54.90, 
    updated_at = NOW()
WHERE id IN (SELECT id FROM system_settings LIMIT 1);

