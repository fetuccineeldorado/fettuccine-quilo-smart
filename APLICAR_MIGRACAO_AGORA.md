# 🚀 Aplicar Migração SQL - Passo a Passo

## ⚠️ IMPORTANTE: A tabela whatsapp_connections não existe ainda!

Você precisa aplicar a migração SQL no Supabase para que o sistema funcione.

## 📋 Passo a Passo

### Opção 1: Via Supabase Dashboard (MAIS FÁCIL)

1. **Acesse o Supabase Dashboard:**
   - Vá em: https://app.supabase.com
   - Faça login na sua conta
   - Selecione seu projeto

2. **Abra o SQL Editor:**
   - No menu lateral esquerdo, clique em **"SQL Editor"**
   - Clique no botão **"New Query"** (ou tecle Ctrl+N)

3. **Copie o conteúdo da migração:**
   - Abra o arquivo: `supabase/migrations/20250101000004_create_whatsapp_connection.sql`
   - Selecione TODO o conteúdo (Ctrl+A)
   - Copie (Ctrl+C)

4. **Cole no SQL Editor:**
   - Cole o conteúdo no editor SQL
   - Verifique se todo o código está lá

5. **Execute:**
   - Clique no botão **"Run"** (ou tecle Ctrl+Enter)
   - Aguarde alguns segundos

6. **Verifique se funcionou:**
   - Deve aparecer uma mensagem de sucesso
   - Se aparecer erro, copie a mensagem de erro completa

### Opção 2: Via Supabase CLI

Se você tem Supabase CLI instalado:

```bash
supabase db push
```

Ou execute a migração específica:

```bash
supabase migration up 20250101000004_create_whatsapp_connection
```

## ✅ Verificação

Após aplicar, execute este comando no SQL Editor para verificar:

```sql
SELECT * FROM whatsapp_connections LIMIT 1;
```

Se não houver erro, a migração foi aplicada com sucesso!

## 🔄 Depois de Aplicar

1. **Recarregue a página** do sistema (F5)
2. A mensagem de aviso deve desaparecer
3. Você poderá clicar em **"Configurar Conexão"** normalmente

## ❓ Se Ainda Não Funcionar

Se após aplicar a migração ainda aparecer erro:

1. Verifique se está conectado ao projeto correto no Supabase
2. Verifique se tem permissões de administrador
3. Copie a mensagem de erro completa do SQL Editor
4. Verifique se todas as políticas RLS foram criadas

## 📝 Conteúdo da Migração

A migração cria:
- ✅ Tabela `whatsapp_connections`
- ✅ Índices para performance
- ✅ Função `update_updated_at_column()`
- ✅ Trigger para atualização automática
- ✅ Políticas RLS (Row Level Security)

