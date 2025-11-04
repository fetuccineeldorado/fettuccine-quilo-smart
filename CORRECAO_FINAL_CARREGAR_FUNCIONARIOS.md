# 🔧 Correção Final: Erro ao Carregar Funcionários

## ✅ O Que Foi Feito

### 1. Logs Detalhados no Console
O sistema agora exibe logs detalhados no console do navegador para facilitar o diagnóstico:
- 🔄 Iniciando carregamento...
- ✅ Sessão verificada
- 🔍 Verificando tabela...
- ❌ Erros detalhados com código e mensagem
- ✅ Sucesso com quantidade de registros

### 2. Tratamento de Erros Melhorado
- Detecção específica de problemas de RLS
- Detecção de tabela não encontrada
- Timeout de 10 segundos para evitar travamentos
- Mensagens de erro mais claras e acionáveis

### 3. Script de Diagnóstico
Criei `diagnostico_funcionarios.sql` que verifica:
- Se a tabela existe
- Colunas da tabela
- Políticas RLS
- Índices e constraints
- Permissões de acesso

## 🚀 SOLUÇÃO RÁPIDA (Execute Agora)

### Passo 1: Execute o Script de Diagnóstico
1. Abra o Supabase Dashboard > SQL Editor
2. Execute o arquivo: `diagnostico_funcionarios.sql`
3. **Copie o resultado** e me envie

### Passo 2: Execute a Correção RLS
1. No Supabase SQL Editor, execute: `fix_employees_rls_rapido.sql`

### Passo 3: Verifique o Console
1. Abra o DevTools (F12)
2. Vá na aba **Console**
3. Recarregue a página de Funcionários
4. **Copie TODAS as mensagens** do console (especialmente as que começam com 🔄, ✅, ❌)

## 📋 Verificação Rápida

Abra o console do navegador (F12) e procure por estas mensagens:

### Se ver "✅ Funcionários carregados com sucesso"
→ O problema está resolvido! ✅

### Se ver "🔒 Erro de permissão RLS"
→ Execute: `fix_employees_rls_rapido.sql`

### Se ver "📋 Tabela não encontrada"
→ Execute: `criar_tabelas_funcionarios_completo.sql`

### Se ver "❌ Erro ao verificar sessão"
→ Faça logout e login novamente

## 🔍 Diagnóstico Completo

Execute este comando no Supabase SQL Editor para verificar tudo:

```sql
-- Verificar se a tabela existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') 
    THEN '✅ Tabela existe'
    ELSE '❌ Tabela NÃO existe'
  END as status;

-- Verificar políticas RLS
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'employees';

-- Verificar se RLS está habilitado
SELECT rowsecurity as rls_enabled 
FROM pg_tables 
WHERE tablename = 'employees';
```

## ⚡ Solução Imediata

Se você quiser uma solução rápida, execute este script no Supabase SQL Editor:

```sql
-- 1. Garantir que a tabela existe (criar se não existir)
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'cashier',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Adicionar colunas opcionais se não existirem
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'cpf') THEN
    ALTER TABLE employees ADD COLUMN cpf VARCHAR(14);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'phone') THEN
    ALTER TABLE employees ADD COLUMN phone VARCHAR(20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'address') THEN
    ALTER TABLE employees ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'position') THEN
    ALTER TABLE employees ADD COLUMN position VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'department') THEN
    ALTER TABLE employees ADD COLUMN department VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'salary') THEN
    ALTER TABLE employees ADD COLUMN salary DECIMAL(10,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'hire_date') THEN
    ALTER TABLE employees ADD COLUMN hire_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'face_photo_url') THEN
    ALTER TABLE employees ADD COLUMN face_photo_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'notes') THEN
    ALTER TABLE employees ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'created_by') THEN
    ALTER TABLE employees ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 3. Remover todas as políticas RLS antigas
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Admins can view all employees" ON employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can create employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can delete employees" ON employees;

-- 4. Criar políticas RLS permissivas
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

-- 5. Habilitar RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 6. Verificar
SELECT '✅ Tabela employees configurada com sucesso!' as status;
```

## 📝 Próximos Passos

1. **Execute o script acima** no Supabase SQL Editor
2. **Recarregue a página** do sistema
3. **Abra o console** (F12) e verifique os logs
4. **Me envie** o que aparece no console se ainda houver erro

## 🆘 Se Ainda Não Funcionar

Envie-me estas informações:

1. **Mensagens do console** (F12 > Console) - copie tudo
2. **Resultado do script de diagnóstico** (`diagnostico_funcionarios.sql`)
3. **Screenshot** do erro (se possível)

Com essas informações, posso identificar exatamente qual é o problema! 🔍

