-- REMOVER COMPLETAMENTE O SISTEMA DE ITENS EXTRA
-- Este script remove todas as tabelas e dados relacionados

-- 1. Remover tabela de itens extras vinculados a pedidos
DROP TABLE IF EXISTS order_extra_items CASCADE;

-- 2. Remover tabela de itens extras
DROP TABLE IF EXISTS extra_items CASCADE;

-- 3. Verificar se as tabelas foram removidas
SELECT 
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('extra_items', 'order_extra_items');

-- 4. Confirmar remoção
SELECT 'Sistema de itens extras removido com sucesso!' as status;

