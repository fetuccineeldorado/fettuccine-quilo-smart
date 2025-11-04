-- ============================================
-- SCRIPT DE DIAGNÓSTICO: Módulo de Funcionários
-- Execute este script para verificar o estado atual do sistema
-- ============================================

-- 1. Verificar se a tabela employees existe
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') 
    THEN '✅ Tabela employees existe'
    ELSE '❌ Tabela employees NÃO existe'
  END as status_tabela;

-- 2. Verificar colunas da tabela employees
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'employees'
ORDER BY ordinal_position;

-- 3. Verificar se há dados na tabela
SELECT 
  COUNT(*) as total_funcionarios,
  COUNT(*) FILTER (WHERE is_active = true) as funcionarios_ativos,
  COUNT(*) FILTER (WHERE is_active = false) as funcionarios_inativos
FROM employees;

-- 4. Verificar políticas RLS
SELECT 
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'employees'
ORDER BY policyname;

-- 5. Verificar se RLS está habilitado
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'employees';

-- 6. Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'employees'
ORDER BY indexname;

-- 7. Verificar constraints
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'employees'::regclass
ORDER BY conname;

-- 8. Verificar triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'employees'
ORDER BY trigger_name;

-- 9. Teste de permissão (simular SELECT)
-- Este teste verifica se você tem permissão para ler
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO test_count FROM employees;
    RAISE NOTICE '✅ SELECT permitido - Total de registros: %', test_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERRO ao fazer SELECT: %', SQLERRM;
  END;
END $$;

-- 10. Verificar usuário atual
SELECT 
  current_user as usuario_atual,
  session_user as usuario_sessao;

