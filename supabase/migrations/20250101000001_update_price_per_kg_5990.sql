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

