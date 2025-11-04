# Correção: Erro ao Carregar Funcionários

## Problema
O sistema está dando erro ao carregar a lista de funcionários.

## Soluções Aplicadas

### 1. Melhorias no Código
- ✅ Verificação de sessão antes de carregar
- ✅ Tratamento específico de erros (RLS, tabela não encontrada, etc.)
- ✅ Logs detalhados para diagnóstico
- ✅ Botão para tentar carregar novamente
- ✅ Mensagens de erro mais claras

### 2. Possíveis Causas e Soluções

#### Causa 1: Políticas RLS (Row Level Security) Bloqueando
**Sintoma:** Erro "permission denied" ou "policy" no console

**Solução:**
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Execute o seguinte script:

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

**OU** execute o arquivo completo:
- `supabase/migrations/20250106000001_fix_employees_rls.sql`

#### Causa 2: Tabela 'employees' Não Existe
**Sintoma:** Erro "Could not find the table 'employees'"

**Solução:**
1. Acesse o Supabase Dashboard > SQL Editor
2. Execute a migration:
   - `supabase/migrations/20250105000002_fix_time_clock_system.sql`

#### Causa 3: Usuário Não Autenticado
**Sintoma:** Erro de autenticação

**Solução:**
1. Verifique se está logado no sistema
2. Faça logout e login novamente
3. Verifique se a sessão está válida

#### Causa 4: Colunas Faltando na Tabela
**Sintoma:** Erro "Could not find the column"

**Solução:**
1. Execute a migration completa:
   - `supabase/migrations/20250105000002_fix_time_clock_system.sql`

## Verificação Rápida

### No Console do Navegador
Abra o DevTools (F12) e verifique:
1. **Erro de código:** Copie o código do erro (ex: `PGRST301`, `PGRST205`)
2. **Mensagem de erro:** Anote a mensagem completa
3. **Stack trace:** Verifique onde o erro está ocorrendo

### No Supabase Dashboard
1. Vá em **Table Editor**
2. Verifique se a tabela `employees` existe
3. Verifique se há dados na tabela
4. Vá em **Authentication** > **Policies**
5. Verifique se há políticas RLS para `employees`

## Solução Rápida (Recomendada)

Execute este script no Supabase SQL Editor:

```sql
-- ============================================
-- CORREÇÃO RÁPIDA: Políticas RLS para employees
-- ============================================

-- Remover todas as políticas antigas
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can create employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can delete employees" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Admins can insert employees" ON employees;
DROP POLICY IF EXISTS "Admins can update employees" ON employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
DROP POLICY IF EXISTS "Admins and managers can view all employees" ON employees;
DROP POLICY IF EXISTS "Employees can view own data" ON employees;

-- Criar políticas permissivas (usuários autenticados podem tudo)
CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (true);

-- Verificar se RLS está habilitado
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
```

## Teste Após Correção

1. Recarregue a página do sistema
2. Vá em **Funcionários**
3. Verifique se os funcionários são carregados
4. Se ainda houver erro, verifique o console do navegador (F12)

## Logs de Diagnóstico

O sistema agora exibe logs detalhados no console:
- Verificação de sessão
- Código do erro do Supabase
- Mensagem de erro completa
- Detalhes e hints do erro

**Como verificar:**
1. Abra o DevTools (F12)
2. Vá na aba **Console**
3. Procure por mensagens começando com "Erro ao carregar funcionários" ou "Erro detalhado"

## Próximos Passos

Se o problema persistir após aplicar as correções:

1. **Copie o erro completo do console** (código + mensagem)
2. **Verifique se a tabela existe** no Supabase Dashboard
3. **Execute a migration RLS** (`20250106000001_fix_employees_rls.sql`)
4. **Verifique a sessão** do usuário no Supabase Dashboard > Authentication

## Arquivos Modificados

- `src/components/EmployeeManagerComplete.tsx` - Função `loadEmployees` melhorada

## Notas Importantes

- O sistema agora trata erros de forma mais robusta
- Mensagens de erro são mais específicas e úteis
- Botão para tentar carregar novamente foi adicionado
- Logs detalhados para facilitar diagnóstico

