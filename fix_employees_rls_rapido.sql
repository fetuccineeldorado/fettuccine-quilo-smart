-- ============================================
-- CORREÇÃO RÁPIDA: Políticas RLS para employees
-- Execute este script no Supabase SQL Editor
-- ============================================

-- 1. Remover todas as políticas antigas
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

-- 2. Criar políticas permissivas
-- Usuários autenticados podem visualizar funcionários
CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

-- Usuários autenticados podem criar funcionários
CREATE POLICY "Authenticated users can create employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Usuários autenticados podem atualizar funcionários
CREATE POLICY "Authenticated users can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados podem excluir funcionários
CREATE POLICY "Authenticated users can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (true);

-- 3. Garantir que RLS está habilitado
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- 4. Verificação
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS corrigidas para a tabela employees!';
  RAISE NOTICE 'Agora usuários autenticados podem gerenciar funcionários.';
END $$;

