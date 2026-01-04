-- Adicionar coluna transaction_id à tabela payments para armazenar ID das transações Stone

-- Primeiro, verificar se a coluna já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='payments' 
        AND column_name='transaction_id'
        AND table_schema='public'
    ) THEN
        -- Se não existe, adicionar a coluna
        ALTER TABLE payments 
        ADD COLUMN transaction_id TEXT;
        
        RAISE NOTICE 'Coluna transaction_id adicionada à tabela payments';
    ELSE
        RAISE NOTICE 'Coluna transaction_id já existe na tabela payments';
    END IF;
END $$;

-- Adicionar comentário à coluna
COMMENT ON COLUMN payments.transaction_id IS 'ID da transação externa (ex: Stone, etc.)';

-- Adicionar índice para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id 
ON payments(transaction_id);

-- Atualizar RLS para permitir inclusão de transaction_id
CREATE POLICY IF NOT EXISTS "Users can insert payments with transaction_id"
ON payments
FOR INSERT
WITH CHECK (
    auth.uid() = processed_by
);

-- Atualizar RLS para permitir atualização de transaction_id
CREATE POLICY IF NOT EXISTS "Users can update payments with transaction_id"
ON payments
FOR UPDATE
USING (
    auth.uid() = processed_by
);

RAISE NOTICE 'Migração da coluna transaction_id concluída com sucesso!';
