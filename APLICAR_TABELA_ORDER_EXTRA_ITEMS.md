# 🔧 Aplicar Tabela order_extra_items

## ⚠️ Problema Identificado

O erro `Could not find the table 'public.order_extra_items' in the schema cache` indica que a tabela `order_extra_items` não existe no banco de dados.

## ✅ Solução

Execute o script SQL abaixo no Supabase Dashboard para criar a tabela e suas políticas RLS.

---

## 📋 Instruções

### 1. Acesse o Supabase Dashboard
- Vá para: https://supabase.com/dashboard
- Selecione seu projeto
- Clique em **SQL Editor** no menu lateral

### 2. Execute o Script

**Opção 1 - Script Completo (Recomendado):**
Copie e cole o conteúdo completo do arquivo `criar_tabelas_extra_items_completo.sql` no SQL Editor e execute. Este script cria ambas as tabelas (`extra_items` e `order_extra_items`) com todas as configurações.

**Opção 2 - Script Apenas para order_extra_items:**
Se a tabela `extra_items` já existe, copie e cole o conteúdo do arquivo `criar_order_extra_items_table.sql` no SQL Editor e execute.

**OU** execute diretamente:

```sql
-- Criar tabela order_extra_items
CREATE TABLE IF NOT EXISTS order_extra_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  extra_item_id UUID NOT NULL REFERENCES extra_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_order_extra_items_order_id ON order_extra_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_extra_items_extra_item_id ON order_extra_items(extra_item_id);

-- Habilitar RLS
ALTER TABLE order_extra_items ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated users can view order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can create order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can update order extra items" ON order_extra_items;
DROP POLICY IF EXISTS "Authenticated users can delete order extra items" ON order_extra_items;

-- Criar políticas RLS
CREATE POLICY "Authenticated users can view order extra items"
  ON order_extra_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create order extra items"
  ON order_extra_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order extra items"
  ON order_extra_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete order extra items"
  ON order_extra_items FOR DELETE
  TO authenticated
  USING (true);
```

### 3. Verificar Criação

Após executar, verifique se a tabela foi criada:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'order_extra_items';
```

Deve retornar `order_extra_items`.

---

## ✅ O que o Script Faz

1. **Cria a tabela** `order_extra_items` com:
   - `id`: UUID (chave primária)
   - `order_id`: Referência à tabela `orders`
   - `extra_item_id`: Referência à tabela `extra_items`
   - `quantity`: Quantidade (INTEGER)
   - `unit_price`: Preço unitário (DECIMAL)
   - `total_price`: Preço total (DECIMAL)
   - `created_at`: Data de criação

2. **Cria índices** para melhor performance:
   - Índice em `order_id`
   - Índice em `extra_item_id`

3. **Habilita RLS** (Row Level Security)

4. **Cria políticas RLS** permissivas:
   - SELECT: Todos os usuários autenticados podem ver
   - INSERT: Todos os usuários autenticados podem criar
   - UPDATE: Todos os usuários autenticados podem atualizar
   - DELETE: Todos os usuários autenticados podem deletar

---

## 🔍 Verificações Adicionais

### Verificar se extra_items existe:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'extra_items';
```

Se não existir, execute primeiro:
```sql
-- Criar tabela extra_items
CREATE TABLE IF NOT EXISTS extra_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'drink' CHECK (category IN ('drink', 'food', 'dessert', 'other')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Verificar se orders existe:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'orders';
```

---

## 📝 Notas Importantes

- O script é **idempotente** (pode ser executado múltiplas vezes sem problemas)
- Usa `CREATE TABLE IF NOT EXISTS` para evitar erros se a tabela já existir
- Usa `DROP POLICY IF EXISTS` para evitar erros se as políticas já existirem
- As políticas RLS são **permissivas** (todos os usuários autenticados podem gerenciar)

---

## 🚀 Após Aplicar

Após executar o script:
1. Recarregue a página do sistema
2. Tente criar uma comanda com itens extras novamente
3. O erro deve desaparecer

Se ainda houver erro, verifique:
- Se a tabela foi criada (usando a query de verificação)
- Se as políticas RLS foram criadas
- Se você está autenticado no sistema

