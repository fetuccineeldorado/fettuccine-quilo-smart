# 🚀 Instruções Rápidas: Criar Tabela employees

## ❌ Problema
A tabela `employees` não existe no banco de dados, causando o erro:
```
Could not find the table 'public.employees' in the schema cache
```

## ✅ Solução

### Opção 1: Script Simples (RECOMENDADO)
Execute o arquivo **`CRIAR_TABELA_EMPLOYEES_SIMPLES.sql`** no Supabase SQL Editor.

### Opção 2: Script Completo
Execute o arquivo **`SOLUCAO_DEFINITIVA_FUNCIONARIOS.sql`** no Supabase SQL Editor.

---

## 📋 Passo a Passo

1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Faça login na sua conta
   - Selecione seu projeto

2. **Abra o SQL Editor**
   - No menu lateral, clique em **"SQL Editor"**
   - Clique em **"New query"**

3. **Cole o Script**
   - Abra o arquivo `CRIAR_TABELA_EMPLOYEES_SIMPLES.sql`
   - Copie todo o conteúdo (Ctrl+A, Ctrl+C)
   - Cole no SQL Editor (Ctrl+V)

4. **Execute o Script**
   - Clique no botão **"Run"** ou pressione **Ctrl+Enter**
   - Aguarde a execução

5. **Verifique o Resultado**
   - Você deve ver mensagens de sucesso no painel de resultados
   - Procure por: `✅ CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!`

6. **Recarregue o Sistema**
   - Volte para a aplicação
   - Recarregue a página (F5)
   - Abra o console do navegador (F12) para verificar se os funcionários são carregados

---

## ⚠️ Importante

- **Execute apenas uma vez**: Ambos os scripts são idempotentes (podem ser executados múltiplas vezes sem problemas)
- **Aguarde a conclusão**: Alguns scripts podem levar alguns segundos para executar
- **Verifique os logs**: Se houver erros, eles aparecerão no painel de resultados do SQL Editor

---

## 🔍 Verificação Manual

Após executar o script, você pode verificar se a tabela foi criada:

1. No Supabase Dashboard, vá para **"Table Editor"**
2. Procure pela tabela **`employees`**
3. Verifique se ela existe e tem as colunas esperadas

---

## 📞 Suporte

Se o erro persistir após executar o script:

1. Verifique se você está conectado ao projeto correto do Supabase
2. Verifique se você tem permissões de administrador
3. Execute o script `diagnostico_funcionarios.sql` para verificar o estado atual
4. Verifique os logs no console do navegador (F12)

---

## ✅ Checklist

- [ ] Script executado no Supabase SQL Editor
- [ ] Mensagem de sucesso apareceu
- [ ] Página do sistema recarregada
- [ ] Console do navegador aberto (F12)
- [ ] Funcionários carregam sem erros






