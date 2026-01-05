-- Adicionar 'stone' ao enum payment_method de forma idempotente

DO $$
BEGIN
    -- Verificar se 'stone' já existe no enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'stone' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')
    ) THEN
        -- Adicionar 'stone' ao enum payment_method
        ALTER TYPE payment_method ADD VALUE 'stone';
        RAISE NOTICE 'Valor ''stone'' adicionado ao enum payment_method';
    ELSE
        RAISE NOTICE 'Valor ''stone'' já existe no enum payment_method';
    END IF;
END $$;

-- Verificar o estado final do enum
SELECT 
    enumlabel as payment_method_value
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')
ORDER BY enumlabel;

RAISE NOTICE 'Enum payment_method atualizado com sucesso!';
