# 🚨 CORREÇÃO URGENTE: Permissões RLS

**Status:** ⚠️ **AÇÃO NECESSÁRIA**

O erro `403 Forbidden` indica que as políticas RLS (Row Level Security) não permitem atualizar `system_settings`.

---

## ✅ SOLUÇÃO RÁPIDA (2 minutos)

### Passo 1: Abrir Supabase SQL Editor

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**

### Passo 2: Executar o Script

Copie e cole o conteúdo do arquivo **`fix-system-settings-rls.sql`** e clique em **RUN** (ou pressione `Ctrl+Enter`).

**OU**

Copie e cole o conteúdo do arquivo **`CORRIGIR_TUDO_SQL_COMPLETO.sql`** (recomendado - corrige tudo de uma vez).

### Passo 3: Verificar Sucesso

Você deve ver uma mensagem no resultado:
```
✅ Políticas RLS corrigidas para system_settings!
```

### Passo 4: Testar no Sistema

1. **Recarregue a página** do sistema (F5)
2. Vá em **Configurações**
3. Altere o preço e clique em **Salvar**
4. Deve funcionar! ✅

---

## 📋 O que o Script Faz

O script `fix-system-settings-rls.sql`:

1. ✅ Remove políticas antigas que restringem apenas admins/managers
2. ✅ Cria nova política que permite **todos os usuários autenticados** atualizarem
3. ✅ Garante políticas para INSERT, UPDATE e DELETE

---

## 🔍 Verificar se Foi Aplicado

Execute no Supabase SQL Editor:

```sql
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'system_settings'
ORDER BY cmd;
```

Você deve ver:
- `Anyone can view settings` (SELECT)
- `Authenticated users can insert settings` (INSERT)
- `Authenticated users can update settings` (UPDATE) ← **IMPORTANTE**
- `Authenticated users can delete settings` (DELETE)

---

## ❌ Se Ainda Não Funcionar

1. Verifique se você está **logado** no sistema
2. Verifique se o script foi executado com **sucesso** (sem erros)
3. Tente **limpar o cache** do navegador (Ctrl+Shift+R)
4. Verifique o console do navegador para erros adicionais

---

**⏱️ Tempo estimado:** 2 minutos  
**🔧 Dificuldade:** Fácil  
**✅ Resultado:** Sistema funcionando normalmente
