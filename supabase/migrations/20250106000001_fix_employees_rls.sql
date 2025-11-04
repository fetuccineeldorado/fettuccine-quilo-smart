-- Migration: Corrigir políticas RLS para tabela employees
-- Permite que usuários autenticados gerenciem funcionários
-- Execute este script no Supabase SQL Editor se houver problemas de permissão

-- ============================================
-- 1. REMOVER POLÍTICAS ANTIGAS (se existirem)
-- ============================================
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
DROP POLICY IF EXISTS "Admins can create employees" ON employees;
DROP POLICY IF EXISTS "Employees can view own data" ON employees;

-- ============================================
-- 2. CRIAR POLÍTICAS RLS PERMISSIVAS
-- ============================================
-- Permitir que usuários autenticados vejam todos os funcionários
CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT
  TO authenticated
  USING (true);

-- Permitir que usuários autenticados criem funcionários
CREATE POLICY "Authenticated users can create employees"
  ON employees FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permitir que usuários autenticados atualizem funcionários
CREATE POLICY "Authenticated users can update employees"
  ON employees FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Permitir que usuários autenticados excluam funcionários
CREATE POLICY "Authenticated users can delete employees"
  ON employees FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 3. VERIFICAR SE RLS ESTÁ HABILITADO
-- ============================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. VERIFICAÇÃO FINAL
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employees' 
    AND policyname = 'Authenticated users can view employees'
  ) THEN
    RAISE NOTICE '✅ Política de visualização criada!';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employees' 
    AND policyname = 'Authenticated users can create employees'
  ) THEN
    RAISE NOTICE '✅ Política de criação criada!';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employees' 
    AND policyname = 'Authenticated users can update employees'
  ) THEN
    RAISE NOTICE '✅ Política de atualização criada!';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'employees' 
    AND policyname = 'Authenticated users can delete employees'
  ) THEN
    RAISE NOTICE '✅ Política de exclusão criada!';
  END IF;
END $$;

