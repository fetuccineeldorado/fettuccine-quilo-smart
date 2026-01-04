# Como Aplicar a Migração da Coluna transaction_id

## Problema Identificado

O erro ocorre porque a tabela `payments` não possui a coluna `transaction_id` necessária para armazenar o ID das transações Stone.

## Solução

Execute o script `fix_transaction_id_column.sql` no Supabase para adicionar a coluna `transaction_id`.

## Passo a Passo

### 1. Acessar o Supabase
1. Abra seu navegador e acesse: https://supabase.com/dashboard
2. Faça login com suas credenciais
3. Selecione seu projeto: **lzmmichiumsvgcnkpxke**

### 2. Abrir o SQL Editor
1. No menu lateral, clique em **"SQL Editor"**
2. Você verá uma interface para executar comandos SQL

### 3. Executar o Script
1. Copie o conteúdo do arquivo `fix_transaction_id_column.sql`
2. Cole no SQL Editor do Supabase
3. Clique em **"Run"** ou pressione **Ctrl + Enter**

### 4. Verificar Resultado
Após executar, você deverá ver a mensagem:
```
Coluna transaction_id adicionada com sucesso à tabela payments
```

## Script SQL para Copiar

```sql
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
```

## Após a Migração

### 1. Reiniciar o Sistema
1. Feche a aba do navegador com o sistema
2. Abra novamente: http://localhost:8080
3. Faça login novamente

### 2. Testar a Integração Stone
1. Vá para **Caixa**
2. Selecione uma comanda aberta
3. Clique na aba **"Máquina Stone"**
4. Tente processar um pagamento

## Verificação

Para confirmar que a coluna foi adicionada corretamente:

### 1. Verificar no Supabase
1. Vá em **"Table Editor"**
2. Selecione a tabela **"payments"**
3. Verifique se a coluna **"transaction_id"** aparece

### 2. Verificar no Código
O pagamento Stone deve funcionar sem o erro:
```
Could not find 'transaction_id' column of 'payments' in schema cache
```

## Troubleshooting

### Se o script falhar:
1. Verifique se você tem permissões de administrador
2. Confirme que está no projeto correto
3. Tente executar comando por comando:
   ```sql
   ALTER TABLE payments ADD COLUMN transaction_id TEXT;
   ```

### Se a coluna já existir:
O script `IF NOT EXISTS` evitará erros se a coluna já existir.

## Suporte

Se tiver dificuldades:
1. Verifique os logs no console do navegador
2. Confirme as configurações no arquivo .env
3. Entre em contato com o suporte técnico

---

**Importante**: Execute este script antes de tentar usar a integração Stone novamente!
