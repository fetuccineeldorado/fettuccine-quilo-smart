# 🔴 PROBLEMA: Não consigo excluir comandas

Se você está tendo problemas para excluir comandas mesmo após executar o script SQL, siga estes passos:

## 📋 SOLUÇÃO PASSO A PASSO:

### 1️⃣ **Verificar se o script foi executado corretamente**

1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Execute esta query para verificar se as políticas foram criadas:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;
```

**Você DEVE ver pelo menos 3 políticas:**
- ✅ `orders` com `cmd = 'DELETE'`
- ✅ `order_items` com `cmd = 'DELETE'`
- ✅ `payments` com `cmd = 'DELETE'`

Se não aparecer, as políticas não foram criadas. Continue para o passo 2.

---

### 2️⃣ **Executar o script SQL correto**

**Opção A: Script simples (recomendado primeiro)**
1. Abra o arquivo `fix delete orders.sql` no VS Code
2. Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
3. Cole no Supabase SQL Editor
4. Clique em **Run**
5. Verifique se apareceu a mensagem de sucesso

**Opção B: Script forçado (se a Opção A não funcionar)**
1. Abra o arquivo `fix delete orders FORCE.sql` no VS Code
2. Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
3. Cole no Supabase SQL Editor
4. Clique em **Run**
5. Verifique se apareceu a mensagem de sucesso

**Opção C: Script definitivo (se as outras não funcionarem)**
1. Abra o arquivo `fix delete orders DEFINITIVO.sql` no VS Code
2. Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
3. Cole no Supabase SQL Editor
4. Clique em **Run**
5. Verifique se apareceu a mensagem de sucesso

---

### 3️⃣ **Verificar se você está autenticado**

1. No sistema, verifique se você está logado
2. Se não estiver, faça login novamente
3. As políticas RLS só funcionam para usuários autenticados

---

### 4️⃣ **Limpar cache do navegador**

1. Pressione **Ctrl+Shift+R** (Windows/Linux) ou **Cmd+Shift+R** (Mac)
2. Isso força o navegador a recarregar tudo do servidor
3. Ou feche e abra o navegador novamente

---

### 5️⃣ **Verificar se o RLS está habilitado**

Execute esta query no Supabase SQL Editor:

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Habilitado"
FROM pg_tables
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
  AND schemaname = 'public'
ORDER BY tablename;
```

**Todas as tabelas devem ter `RLS Habilitado = true`**

Se alguma estiver `false`, execute:

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
```

---

### 6️⃣ **Verificar se há políticas conflitantes**

Execute esta query no Supabase SQL Editor:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY cmd, policyname;
```

**Verifique se:**
- Há pelo menos uma política com `cmd = 'DELETE'`
- A política tem `permissive = 'PERMISSIVE'`
- A política tem `roles = '{authenticated}'`
- O `qual` ou `with_check` não está bloqueando (deve ser `true` ou similar)

---

### 7️⃣ **Testar diretamente no Supabase**

Execute esta query no Supabase SQL Editor (substitua `ORDER_ID_AQUI` pelo ID de uma comanda que você quer testar):

```sql
-- Primeiro, pegue o ID de uma comanda
SELECT id, order_number, status FROM orders LIMIT 1;

-- Depois, tente deletar (SUBSTITUA o ID abaixo)
DELETE FROM orders WHERE id = 'ORDER_ID_AQUI';
```

**Se funcionar no SQL Editor mas não funcionar no sistema:**
- O problema pode estar no código do frontend
- Verifique o console do navegador (F12) para ver erros

**Se NÃO funcionar nem no SQL Editor:**
- As políticas RLS estão bloqueando
- Execute o script SQL novamente

---

## 🔍 **DIAGNÓSTICO:**

Se após todos os passos ainda não funcionar, execute esta query de diagnóstico e compartilhe o resultado:

```sql
-- Diagnóstico completo
SELECT 
  'Políticas DELETE' as tipo,
  COUNT(*) as quantidade
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
  AND cmd = 'DELETE'

UNION ALL

SELECT 
  'RLS Habilitado' as tipo,
  COUNT(*) as quantidade
FROM pg_tables
WHERE tablename IN ('orders', 'order_items', 'order_extra_items', 'payments')
  AND schemaname = 'public'
  AND rowsecurity = true;
```

---

## ⚠️ **ERROS COMUNS:**

1. **"permission denied for table orders"**
   - Significa que as políticas RLS não foram criadas corretamente
   - Execute o script SQL novamente

2. **"Could not find the table"**
   - A tabela não existe
   - Execute o script `CORRIGIR_TUDO_SQL_COMPLETO.sql`

3. **"policy already exists"**
   - Normal, pode ignorar
   - O script já remove e recria as políticas

4. **A comanda não aparece deletada, mas o SQL retorna sucesso**
   - Verifique se há outras políticas RLS bloqueando a visualização
   - Execute: `SELECT * FROM orders WHERE id = 'ORDER_ID';` para verificar

---

## 📞 **PRÓXIMOS PASSOS:**

Se nada funcionar:
1. Execute o script `CORRIGIR_TUDO_SQL_COMPLETO.sql` (script completo)
2. Verifique os logs do console do navegador (F12)
3. Compartilhe as mensagens de erro que aparecem

---

**Última atualização:** Scripts atualizados para remover TODAS as políticas antigas antes de criar novas.





