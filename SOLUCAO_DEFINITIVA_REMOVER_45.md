# ✅ SOLUÇÃO DEFINITIVA: REMOVER R$ 45,00 E FIXAR EM R$ 59,90

**Data:** 2025-01-06  
**Problema:** O preço por kg continua aparecendo como R$ 45,00  
**Solução:** Remover completamente o valor 45.00 e fixar em R$ 59,90

---

## 🚀 SOLUÇÃO RÁPIDA (Execute Agora)

### Opção 1: Script Completo (Recomendado)

Execute o arquivo **`REMOVER_45_FIXAR_59_90.sql`** no Supabase SQL Editor:

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Copie **TODO** o conteúdo de **`REMOVER_45_FIXAR_59_90.sql`**
5. Cole no editor e clique em **RUN** (ou `Ctrl+Enter`)

Este script:
- ✅ Altera o DEFAULT da coluna para R$ 59,90
- ✅ **DELETA** todos os registros com R$ 45,00
- ✅ Atualiza todos os registros restantes para R$ 59,90
- ✅ Verifica se ainda há registros com 45.00
- ✅ Mostra resultado completo

### Opção 2: Script Simplificado

Se preferir, execute **`FIXAR_PRECO_59_90.sql`** (também remove 45.00)

---

## 📋 O QUE FOI CORRIGIDO

### 1. Migration Criada
- ✅ `supabase/migrations/20250106000001_fix_price_per_kg_default_5990.sql`
- Altera o DEFAULT da coluna para 59.90

### 2. Scripts SQL Atualizados
- ✅ `REMOVER_45_FIXAR_59_90.sql` - Remove completamente o valor 45.00
- ✅ `FIXAR_PRECO_59_90.sql` - Atualizado para deletar registros com 45.00
- ✅ `CORRIGIR_TUDO_SQL_COMPLETO.sql` - Atualizado para remover 45.00

### 3. Código TypeScript
- ✅ `src/utils/autoFix.ts` - Sempre verifica e corrige para 59.90

---

## 🧪 VERIFICAÇÃO

Após executar o script, verifique:

```sql
-- Verificar se ainda há registros com 45.00 (deve retornar 0)
SELECT COUNT(*) FROM system_settings WHERE price_per_kg = 45.00;

-- Verificar o valor atual (deve ser 59.90)
SELECT price_per_kg FROM system_settings LIMIT 1;

-- Verificar o DEFAULT da coluna (deve ser 59.90)
SELECT column_default 
FROM information_schema.columns
WHERE table_name = 'system_settings' 
  AND column_name = 'price_per_kg';
```

---

## ✅ RESULTADO ESPERADO

Após executar o script:

1. ✅ **Nenhum registro** com R$ 45,00 deve existir
2. ✅ **DEFAULT da coluna** será R$ 59,90
3. ✅ **Todos os registros** terão R$ 59,90
4. ✅ **Sistema** sempre usará R$ 59,90 como padrão

---

## 🔍 SE AINDA HOUVER PROBLEMA

Se após executar o script ainda aparecer R$ 45,00:

1. **Execute novamente** o script `REMOVER_45_FIXAR_59_90.sql`
2. **Verifique** se há registros duplicados:
   ```sql
   SELECT * FROM system_settings ORDER BY updated_at DESC;
   ```
3. **Delete manualmente** se necessário:
   ```sql
   DELETE FROM system_settings WHERE price_per_kg = 45.00;
   UPDATE system_settings SET price_per_kg = 59.90, updated_at = NOW();
   ```
4. **Limpe o cache** do navegador (Ctrl+Shift+R)
5. **Recarregue** a página (F5)

---

## 📝 NOTAS TÉCNICAS

### Por que o valor 45.00 aparece?

1. **Migration inicial** (`20251021221215...`) criou a tabela com DEFAULT 45.00
2. **Migration inicial** inseriu um registro com 45.00
3. **Novos registros** criados sem valor explícito usam o DEFAULT (45.00)

### Solução Aplicada

1. ✅ **ALTER TABLE** muda o DEFAULT para 59.90
2. ✅ **DELETE** remove todos os registros com 45.00
3. ✅ **UPDATE** força todos os registros para 59.90
4. ✅ **INSERT** cria novo registro com 59.90 se não existir nenhum

---

**✅ Problema resolvido!** Execute o script `REMOVER_45_FIXAR_59_90.sql` e o valor R$ 45,00 será completamente removido.



