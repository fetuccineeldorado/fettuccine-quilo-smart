# ✅ MIGRAÇÕES CORRIGIDAS - APLICAR AGORA

## 🔧 CORREÇÕES APLICADAS

### ❌ Erro Original:
```
ERROR: 42830: there is no unique constraint matching given keys for referenced table "customers"
```

### ✅ Correções Realizadas:

1. **Tabela `reward_rules`** (linha 52):
   - ❌ **Antes**: `tier VARCHAR(20) REFERENCES customers(tier)` (FOREIGN KEY inválida)
   - ✅ **Agora**: `tier VARCHAR(20) CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum') OR tier IS NULL)`
   - **Motivo**: `tier` não tem constraint UNIQUE, então não pode ser referenciado por FOREIGN KEY

2. **Inserção de regras padrão** (linhas 185-189):
   - ❌ **Antes**: `INSERT ... ON CONFLICT DO NOTHING` (sem chave única definida)
   - ✅ **Agora**: `INSERT ... WHERE NOT EXISTS` (verifica antes de inserir)
   - **Motivo**: Previne duplicação de regras

3. **Políticas RLS** (todas as migrações):
   - ❌ **Antes**: `CREATE POLICY` direto (falha se já existir)
   - ✅ **Agora**: `DROP POLICY IF EXISTS` antes de `CREATE POLICY`
   - **Motivo**: Torna as migrações idempotentes (podem ser executadas múltiplas vezes)

---

## 📋 COMO APLICAR AS MIGRAÇÕES

### PASSO 1: Acesse o Supabase SQL Editor

1. Abra: https://app.supabase.com
2. Selecione seu projeto
3. Clique em **SQL Editor** no menu lateral
4. Clique em **New Query**

### PASSO 2: Execute a Migração de Clientes

1. Abra o arquivo: `supabase/migrations/20250101000002_create_customer_rewards_system.sql`
2. **Copie TODO o conteúdo** do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione Ctrl+Enter)
5. Aguarde a mensagem de sucesso

**O que esta migração faz:**
- ✅ Adiciona colunas extras na tabela `customers` (address, city, state, whatsapp_number, etc.)
- ✅ Cria tabelas de pontos, indicações, resgates
- ✅ Cria tabela `reward_rules` (CORRIGIDA - sem FOREIGN KEY inválida)
- ✅ Cria funções e triggers
- ✅ Configura políticas RLS

### PASSO 3: Execute a Migração de Promoções

1. Abra o arquivo: `supabase/migrations/20250101000003_create_promotions_system.sql`
2. **Copie TODO o conteúdo** do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione Ctrl+Enter)
5. Aguarde a mensagem de sucesso

**O que esta migração faz:**
- ✅ Cria tabela `promotions`
- ✅ Cria tabela `promotion_campaigns`
- ✅ Cria tabela `campaign_recipients`
- ✅ Cria funções e triggers para estatísticas
- ✅ Configura políticas RLS

### PASSO 4: Recarregar Schema Cache (Opcional)

Se ainda houver erros de "schema cache", execute:

```sql
NOTIFY pgrst, 'reload schema';
```

Isso força o Supabase a recarregar o cache do schema.

---

## ✅ VERIFICAÇÃO

Após executar as migrações, teste:

### Teste 1: Verificar Tabelas Criadas
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'reward_rules',
  'customer_points_transactions',
  'customer_referrals',
  'customer_redemptions',
  'customer_whatsapp_messages',
  'promotions',
  'promotion_campaigns',
  'campaign_recipients'
);
```

Deve retornar todas as 8 tabelas.

### Teste 2: Verificar Colunas na Tabela customers
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name IN ('address', 'city', 'state', 'whatsapp_number');
```

Deve retornar todas as 4 colunas.

### Teste 3: Verificar Regras Padrão
```sql
SELECT rule_type, points_per_unit 
FROM reward_rules 
WHERE is_active = true;
```

Deve retornar 3 regras padrão.

---

## 🎯 RESULTADO ESPERADO

Após aplicar as migrações corrigidas:

✅ **Erro "Could not find the 'address' column"** → **RESOLVIDO**
✅ **Erro "Could not find the table 'public.promotions'"** → **RESOLVIDO**
✅ **Erro "no unique constraint matching given keys"** → **RESOLVIDO**

Agora você pode:
- ✅ Salvar clientes com todos os campos (address, city, state, whatsapp_number, etc.)
- ✅ Criar promoções
- ✅ Enviar campanhas de marketing
- ✅ Gerenciar pontos e indicações

---

## 🚨 SE AINDA DER ERRO

### Erro: "column already exists"
**Solução**: Isso é normal! Significa que a coluna já foi criada. Continue com o resto da migração.

### Erro: "table already exists"
**Solução**: Isso é normal! Significa que a tabela já foi criada. Continue com o resto da migração.

### Erro: "policy already exists"
**Solução**: Isso foi corrigido! Agora usamos `DROP POLICY IF EXISTS` antes de criar.

### Erro: "schema cache"
**Solução**: Execute `NOTIFY pgrst, 'reload schema';` e aguarde 10 segundos.

---

## 📝 RESUMO DAS CORREÇÕES

| Problema | Correção | Status |
|----------|----------|--------|
| FOREIGN KEY inválida em `reward_rules.tier` | Substituído por CHECK constraint | ✅ Corrigido |
| INSERT com ON CONFLICT sem chave única | Substituído por WHERE NOT EXISTS | ✅ Corrigido |
| Políticas RLS não idempotentes | Adicionado DROP POLICY IF EXISTS | ✅ Corrigido |

---

**AGORA APLIQUE AS MIGRAÇÕES E TESTE!** 🚀

Todas as correções foram aplicadas e os arquivos estão prontos para execução no Supabase.

