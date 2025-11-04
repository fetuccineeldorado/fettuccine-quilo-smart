# 📋 Como Aplicar a Migração de WhatsApp

## ⚠️ IMPORTANTE

O arquivo `src/utils/whatsappConnection.ts` é um arquivo **TypeScript** e **NÃO deve ser executado como SQL**.

Apenas o arquivo **`.sql`** deve ser executado no banco de dados.

## 📝 Passos para Aplicar a Migração

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu lateral)
4. Clique em **New Query**
5. Copie e cole o conteúdo do arquivo:
   ```
   supabase/migrations/20250101000004_create_whatsapp_connection.sql
   ```
6. Clique em **Run** (ou pressione Ctrl+Enter)

### Opção 2: Via Supabase CLI

Se você está usando Supabase CLI localmente:

```bash
# Aplicar todas as migrações pendentes
supabase db push

# Ou aplicar uma migração específica
supabase migration up 20250101000004_create_whatsapp_connection
```

### Opção 3: Copiar e Colar Manualmente

1. Abra o arquivo: `supabase/migrations/20250101000004_create_whatsapp_connection.sql`
2. Copie TODO o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Execute

## ✅ Verificação

Após aplicar a migração, verifique se a tabela foi criada:

```sql
SELECT * FROM whatsapp_connections LIMIT 1;
```

Se não houver erro, a migração foi aplicada com sucesso!

## 🐛 Se Ainda Houver Erros

Se você continuar vendo erros:

1. Verifique se está executando o arquivo **`.sql`** e não o **`.ts`**
2. Certifique-se de que está conectado ao projeto correto no Supabase
3. Verifique se tem permissões de administrador no banco de dados
4. Veja os logs de erro no SQL Editor do Supabase para mais detalhes

