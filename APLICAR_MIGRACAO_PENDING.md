# 🔧 Como Aplicar a Migração do Status "pending"

## Problema
O erro `invalid input value for enum order_status: "pending"` indica que o status "pending" ainda não foi adicionado ao enum no banco de dados.

## Solução Temporária ✅
O código foi ajustado para funcionar mesmo sem "pending" estar no banco. Ele buscará apenas comandas "open" se "pending" não existir.

## Solução Definitiva: Aplicar a Migração

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá para **SQL Editor** (menu lateral)
4. Cole e execute o seguinte SQL:

```sql
-- Add pending status to order_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_enum 
    WHERE enumlabel = 'pending' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE order_status ADD VALUE 'pending';
  END IF;
END $$;

-- Add updated_at column to orders table if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at);
```

5. Clique em **Run** para executar

### Opção 2: Via Script Node.js

Execute o script que foi criado:

```bash
node apply-pending-status.js
```

**Nota:** Você precisa ter as variáveis de ambiente configuradas no arquivo `.env.local`:
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Verificação

Após aplicar a migração, você pode verificar se funcionou:

1. No SQL Editor do Supabase, execute:
```sql
SELECT unnest(enum_range(NULL::order_status))::text AS enum_value;
```

2. Você deve ver: `open`, `closed`, `cancelled`, `pending`

## Após Aplicar

Após aplicar a migração, o sistema funcionará completamente, incluindo:
- ✅ Buscar comandas "open" e "pending" no Caixa
- ✅ Editar comandas (que muda status para "pending")
- ✅ Todas as funcionalidades relacionadas ao status "pending"

---

**Importante:** O sistema já está funcionando mesmo sem esta migração, mas algumas funcionalidades podem ser limitadas. Aplicar a migração é recomendado para uso completo.

