-- =====================================================
-- CORRECAO SIMPLIFICADA DA INTEGRACAO STONE
-- =====================================================

-- 1. Adicionar 'stone' ao enum payment_method
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'stone' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')
    ) THEN
        ALTER TYPE payment_method ADD VALUE 'stone';
    END IF;
END $$;

-- 2. Adicionar coluna transaction_id se nao existir
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- 3. Criar indice para performance
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

-- 4. Verificar estrutura
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Verificar valores do enum
SELECT 
    enumlabel as payment_method_value
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')
ORDER BY enumlabel;
