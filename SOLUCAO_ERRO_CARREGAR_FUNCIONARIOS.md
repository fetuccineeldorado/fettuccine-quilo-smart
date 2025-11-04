# Solução: Erro ao Carregar Funcionários

## 🔍 Diagnóstico Rápido

### Passo 1: Execute o Script de Diagnóstico
Execute o arquivo `diagnostico_funcionarios.sql` no Supabase SQL Editor para identificar o problema.

### Passo 2: Verificar o Console do Navegador
1. Abra o DevTools (F12)
2. Vá na aba **Console**
3. Procure por mensagens que começam com:
   - 🔄 Iniciando carregamento...
   - ❌ Erro...
   - 🔒 Erro de permissão...
   - 📋 Tabela não encontrada...

## 🔧 Soluções Comuns

### Problema 1: Tabela não existe
**Sintoma:** Erro "Could not find the table 'employees'"

**Solução:**
1. Execute: `criar_tabelas_funcionarios_completo.sql`
2. Verifique se a tabela foi criada no Supabase Dashboard > Table Editor

### Problema 2: Políticas RLS bloqueando
**Sintoma:** Erro "permission denied" ou "policy"

**Solução:**
1. Execute: `fix_employees_rls_rapido.sql`
2. Ou execute este script rápido:

```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;

-- Criar política permissiva
CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);
```

### Problema 3: Usuário não autenticado
**Sintoma:** Erro de autenticação

**Solução:**
1. Faça logout e login novamente
2. Verifique se a sessão está válida no Supabase Dashboard > Authentication

### Problema 4: Colunas faltando
**Sintoma:** Erro "Could not find the column"

**Solução:**
1. Execute: `criar_tabelas_funcionarios_completo.sql` (ele adiciona colunas faltantes automaticamente)

## 🚀 Solução Completa (Recomendada)

Execute estes scripts na ordem:

### 1. Criar/Estruturar Tabelas
```sql
-- Execute: criar_tabelas_funcionarios_completo.sql
```

### 2. Corrigir Políticas RLS
```sql
-- Execute: fix_employees_rls_rapido.sql
```

### 3. Verificar
```sql
-- Execute: diagnostico_funcionarios.sql
```

## 📋 Checklist de Verificação

Após executar os scripts, verifique:

- [ ] Tabela `employees` existe no Table Editor
- [ ] Políticas RLS estão configuradas (verificar em Authentication > Policies)
- [ ] Usuário está autenticado (verificar no console: "✅ Sessão verificada: Autenticado")
- [ ] Não há erros no console do navegador
- [ ] A página recarrega corretamente

## 🐛 Se Ainda Não Funcionar

1. **Copie o erro completo do console** (F12 > Console)
2. **Execute o script de diagnóstico** e copie o resultado
3. **Verifique no Supabase Dashboard:**
   - Table Editor > employees (existe?)
   - Authentication > Policies (há políticas para employees?)
   - SQL Editor > Execute `diagnostico_funcionarios.sql`

## 📞 Informações para Depuração

Quando reportar o erro, inclua:

1. **Mensagem de erro completa** do console
2. **Código do erro** (ex: PGRST301, PGRST205)
3. **Resultado do script de diagnóstico**
4. **Screenshot** (se possível)

---

**Arquivos de Ajuda:**
- `diagnostico_funcionarios.sql` - Script de diagnóstico
- `criar_tabelas_funcionarios_completo.sql` - Criar tabelas
- `fix_employees_rls_rapido.sql` - Corrigir RLS

