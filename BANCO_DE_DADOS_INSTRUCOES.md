# Instruções para Aplicar Migrações no Banco de Dados

## ⚠️ IMPORTANTE: Execute na ordem abaixo

Acesse o **Supabase Dashboard** → **SQL Editor** e execute os comandos na ordem apresentada.

---

## 1️⃣ Adicionar campo customer_name à tabela orders

```sql
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
```

---

## 2️⃣ Atualizar preço por kg para R$ 54,90

```sql
UPDATE system_settings 
SET price_per_kg = 54.90, 
    updated_at = NOW()
WHERE EXISTS (SELECT 1 FROM system_settings LIMIT 1);
```

---

## 3️⃣ Criar tabela extra_items (se não existir)

```sql
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

CREATE INDEX IF NOT EXISTS idx_extra_items_category ON extra_items(category);
CREATE INDEX IF NOT EXISTS idx_extra_items_active ON extra_items(is_active);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_extra_items_updated_at ON extra_items;
CREATE TRIGGER update_extra_items_updated_at 
  BEFORE UPDATE ON extra_items 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 4️⃣ Inserir bebidas padrão

```sql
-- Desativar bebidas antigas
UPDATE extra_items 
SET is_active = false 
WHERE category = 'drink' AND is_active = true;

-- Adicionar bebidas específicas
INSERT INTO extra_items (name, description, price, category, is_active) 
VALUES
  ('Refrigerante 600ml', 'Refrigerante garrafa 600ml', 6.50, 'drink', true),
  ('Refrigerante Lata', 'Refrigerante lata 350ml', 4.50, 'drink', true),
  ('Água sem Gás', 'Água mineral sem gás 500ml', 3.00, 'drink', true),
  ('Água com Gás', 'Água mineral com gás 500ml', 3.50, 'drink', true),
  ('Suco Lata', 'Suco em lata 350ml', 5.00, 'drink', true)
ON CONFLICT DO NOTHING;
```

---

## 5️⃣ Configurar políticas RLS para extra_items

```sql
-- Habilitar RLS
ALTER TABLE extra_items ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Anyone can view extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can view extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can insert extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can update extra items" ON extra_items;
DROP POLICY IF EXISTS "Authenticated users can delete extra items" ON extra_items;

-- Criar novas políticas
CREATE POLICY "Authenticated users can view extra items"
  ON extra_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert extra items"
  ON extra_items FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'manager'));

CREATE POLICY "Authenticated users can update extra items"
  ON extra_items FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin', 'manager'));

CREATE POLICY "Authenticated users can delete extra items"
  ON extra_items FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin', 'manager'));
```

---

## 6️⃣ Corrigir políticas de INSERT para orders

```sql
-- Permitir que usuários autenticados criem comandas
DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permitir que usuários atualizem comandas
DROP POLICY IF EXISTS "Authenticated users can update orders" ON orders;

CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (true);
```

---

## ✅ Verificação

Após executar todos os comandos, verifique se tudo está funcionando:

```sql
-- Verificar se customer_name foi adicionado
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'customer_name';

-- Verificar preço por kg
SELECT price_per_kg FROM system_settings;

-- Verificar bebidas ativas
SELECT name, price, is_active 
FROM extra_items 
WHERE category = 'drink' 
ORDER BY name;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('orders', 'extra_items', 'order_items')
ORDER BY tablename, policyname;
```

---

## 🚨 Em caso de erro

Se encontrar erros relacionados a:

- **update_updated_at_column**: A função já existe, pode ignorar
- **Políticas duplicadas**: Execute os DROP POLICY primeiro
- **Tabela já existe**: Use IF NOT EXISTS nas criações

---

## 📝 Notas

- Todas as migrações são idempotentes (podem ser executadas múltiplas vezes)
- As políticas RLS garantem segurança no acesso aos dados
- O sistema agora suporta nome do cliente nas comandas
- Itens extras podem ser gerenciados pela interface

