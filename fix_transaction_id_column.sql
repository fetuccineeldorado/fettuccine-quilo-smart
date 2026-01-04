-- Script simples para adicionar coluna transaction_id à tabela payments

-- Adicionar coluna transaction_id se não existir
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Adicionar comentário
COMMENT ON COLUMN payments.transaction_id IS 'ID da transação externa (Stone, etc.)';

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

-- Mensagem de sucesso
SELECT 'Coluna transaction_id adicionada com sucesso à tabela payments' as result;
