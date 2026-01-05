-- =====================================================
-- CORREÇÃO COMPLETA DA INTEGRAÇÃO STONE
-- =====================================================
-- Este script corrige todos os problemas relacionados
-- ao registro de pagamentos Stone no sistema

-- 1. ADICIONAR 'stone' AO ENUM payment_method
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'stone' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')
    ) THEN
        ALTER TYPE payment_method ADD VALUE 'stone';
        RAISE NOTICE 'Valor ''stone'' adicionado ao enum payment_method';
    ELSE
        RAISE NOTICE 'Valor ''stone'' ja existe no enum payment_method';
    END IF;
END $$;

-- 2. ADICIONAR COLUNA transaction_id SE NÃO EXISTIR
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- 3. ADICIONAR COMENTÁRIO À COLUNA
COMMENT ON COLUMN payments.transaction_id IS 'ID da transação externa (Stone, etc.)';

-- 4. CRIAR ÍNDICE PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

-- 5. ATUALIZAR POLÍTICAS RLS PARA INCLUIR stone
DROP POLICY IF EXISTS "Users can insert payments" ON payments;
CREATE POLICY "Users can insert payments"
ON payments
FOR INSERT
WITH CHECK (
    auth.uid() = processed_by
);

DROP POLICY IF EXISTS "Users can update payments" ON payments;
CREATE POLICY "Users can update payments"
ON payments
FOR UPDATE
USING (
    auth.uid() = processed_by
);

DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments"
ON payments
FOR SELECT
USING (
    auth.uid() = processed_by
);

-- 6. VERIFICAR ESTRUTURA FINAL DA TABELA payments
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. VERIFICAR VALORES DO ENUM payment_method
SELECT 
    enumlabel as payment_method_value
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')
ORDER BY enumlabel;

-- 8. VERIFICAR PAGAMENTOS EXISTENTES (PARA DIAGNÓSTICO)
SELECT 
    id,
    order_id,
    payment_method,
    amount,
    transaction_id,
    created_at
FROM payments 
ORDER BY created_at DESC 
LIMIT 5;

RAISE NOTICE 'CORRECAO DA INTEGRACAO STONE CONCLUIDA COM SUCESSO!';
RAISE NOTICE 'Resumo das correcoes:';
RAISE NOTICE '   Enum payment_method atualizado com ''stone''';
RAISE NOTICE '   Coluna transaction_id verificada/criada';
RAISE NOTICE '   Indices criados para performance';
RAISE NOTICE '   Politicas RLS atualizadas';
RAISE NOTICE '   Estrutura da tabela payments verificada';
