# 🔧 Correção: Erro ao Excluir Comandas

## ❌ Problema
Ao tentar excluir comandas, o sistema está retornando erros, geralmente relacionados a permissões RLS (Row Level Security).

## ✅ Solução

### 1. Executar Script SQL de Correção

Execute o script `fix-delete-orders.sql` no Supabase SQL Editor para adicionar as políticas de DELETE necessárias:

1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Faça login e selecione seu projeto

2. **Abra o SQL Editor**
   - No menu lateral, clique em **"SQL Editor"**
   - Clique em **"New query"**

3. **Cole e Execute o Script**
   - Abra o arquivo `fix-delete-orders.sql`
   - Copie todo o conteúdo (Ctrl+A, Ctrl+C)
   - Cole no SQL Editor (Ctrl+V)
   - Clique em **"Run"** ou pressione **Ctrl+Enter**

4. **Verifique o Resultado**
   - O script deve criar políticas de DELETE para:
     - `orders`
     - `order_items`
     - `order_extra_items`
     - `payments`
   - Você deve ver uma tabela mostrando as políticas criadas

### 2. Melhorias no Código

O código de exclusão foi melhorado para:

- ✅ **Tratamento de Erros Específicos**: Detecta erros de permissão (RLS), relacionamentos (foreign key), e conexão
- ✅ **Mensagens Mais Claras**: Fornece mensagens específicas sobre o tipo de erro
- ✅ **Instruções de Correção**: Quando há erro de permissão, indica exatamente qual script executar
- ✅ **Logs Detalhados**: Console logs detalhados para debug

### 3. Verificação

Após executar o script SQL:

1. Recarregue a página do sistema (F5)
2. Tente excluir uma comanda novamente
3. Se ainda houver erro, verifique:
   - Console do navegador (F12) para logs detalhados
   - Se você está autenticado no sistema
   - Se a tabela `orders` existe no banco

## 📋 Checklist

- [ ] Script `fix-delete-orders.sql` executado no Supabase
- [ ] Políticas de DELETE verificadas (deve aparecer 4 políticas)
- [ ] Página do sistema recarregada
- [ ] Tentativa de exclusão realizada
- [ ] Comanda excluída com sucesso

## 🔍 Troubleshooting

### Erro: "Você não tem permissão para excluir comandas"
**Solução**: Execute o script `fix-delete-orders.sql` no Supabase SQL Editor.

### Erro: "foreign key constraint"
**Solução**: O sistema já tenta deletar todos os dados relacionados automaticamente. Se o erro persistir, pode haver um relacionamento não mapeado. Verifique os logs do console.

### Erro: "Comanda não encontrada"
**Solução**: A comanda pode já ter sido excluída. Recarregue a lista de comandas.

### Erro: "Erro de conexão"
**Solução**: Verifique sua conexão com a internet e tente novamente.

---

**Arquivo SQL**: `fix-delete-orders.sql`  
**Arquivo Corrigido**: `src/pages/Orders.tsx`



