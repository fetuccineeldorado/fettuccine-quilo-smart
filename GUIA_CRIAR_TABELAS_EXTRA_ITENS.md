# 📋 GUIA PASSO A PASSO - Criar Tabelas de Itens Extra no Supabase

## 🎯 Objetivo
Criar as tabelas `extra_items` e `order_extra_items` no Supabase para gerenciar itens extras (bebidas, sobremesas, etc.) nas comandas.

---

## 📝 PASSO A PASSO

### 1️⃣ Acesse o Supabase Dashboard

1. Abra seu navegador e vá para: **https://supabase.com/dashboard**
2. Faça login na sua conta
3. Selecione o projeto **FETUCCINE** (ou o nome do seu projeto)

### 2️⃣ Abra o SQL Editor

1. No menu lateral esquerdo, clique em **"SQL Editor"**
2. Clique no botão **"New Query"** (Nova Query) no canto superior direito

### 3️⃣ Copie e Cole o Script SQL

1. Abra o arquivo `criar_tabelas_extra_items_completo.sql` no seu editor de texto
2. **Selecione TODO o conteúdo** do arquivo (Ctrl+A)
3. **Copie** (Ctrl+C)
4. **Cole** no SQL Editor do Supabase (Ctrl+V)

### 4️⃣ Execute o Script

1. Clique no botão **"Run"** (Executar) ou pressione **Ctrl+Enter**
2. Aguarde alguns segundos enquanto o script é executado
3. Você verá mensagens de sucesso:
   - ✅ `Tabela extra_items criada/verificada com sucesso!`
   - ✅ `Tabela order_extra_items criada/verificada com sucesso!`

---

## ✅ VERIFICAÇÃO

Após executar o script, verifique se as tabelas foram criadas:

### Verificar Tabela extra_items:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'extra_items';
```

### Verificar Tabela order_extra_items:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'order_extra_items';
```

### Verificar Itens Padrão Criados:
```sql
SELECT * FROM extra_items;
```

Você deve ver 10 itens padrão (Refrigerante, Água, Suco, Café, Cerveja, Salada, Batata Frita, Pudim, Sorvete).

---

## 📊 O QUE O SCRIPT FAZ

### 1. Cria a Tabela `extra_items`
- Armazena os itens extras disponíveis (bebidas, comidas, sobremesas)
- Campos: `id`, `name`, `description`, `price`, `category`, `is_active`
- Cria índices para melhor performance
- Cria trigger para atualizar `updated_at` automaticamente

### 2. Cria a Tabela `order_extra_items`
- Liga itens extras às comandas
- Campos: `id`, `order_id`, `extra_item_id`, `quantity`, `unit_price`, `total_price`
- Cria índices para melhor performance
- Relacionamento com `orders` e `extra_items`

### 3. Habilita RLS (Row Level Security)
- Protege os dados com políticas de segurança
- Permite acesso apenas para usuários autenticados

### 4. Cria Políticas RLS Permissivas
- SELECT: Todos podem ver itens extras
- INSERT: Todos podem criar itens extras
- UPDATE: Todos podem atualizar itens extras
- DELETE: Todos podem deletar itens extras

### 5. Insere Itens Padrão
- 10 itens extras pré-configurados:
  - Refrigerante 350ml (R$ 4,50)
  - Refrigerante 600ml (R$ 6,50)
  - Água 500ml (R$ 2,50)
  - Suco Natural 300ml (R$ 5,00)
  - Café (R$ 3,00)
  - Cerveja 350ml (R$ 8,00)
  - Salada (R$ 7,00)
  - Batata Frita (R$ 8,50)
  - Pudim (R$ 6,00)
  - Sorvete (R$ 4,50)

---

## ⚠️ IMPORTANTE

- ✅ O script é **idempotente** (pode ser executado múltiplas vezes sem problemas)
- ✅ Se a tabela já existir, ela não será recriada (usa `IF NOT EXISTS`)
- ✅ Se as políticas já existirem, elas serão recriadas (usa `DROP POLICY IF EXISTS`)
- ✅ Os itens padrão só são inseridos se a tabela estiver vazia

---

## 🚀 APÓS CRIAR AS TABELAS

1. **Recarregue a página do sistema** (F5)
2. **Acesse "Itens Extras"** no menu do dashboard
3. **Teste criando uma comanda** com itens extras
4. **Verifique se os itens aparecem** corretamente

---

## 🔍 TROUBLESHOOTING

### Erro: "relation 'orders' does not exist"
**Solução:** A tabela `orders` precisa existir primeiro. Execute as migrations anteriores.

### Erro: "function update_updated_at_column() does not exist"
**Solução:** Execute primeiro a migration que cria essa função, ou remova a linha do trigger temporariamente.

### Erro: "permission denied"
**Solução:** Verifique se você tem permissões de administrador no projeto Supabase.

### As tabelas foram criadas mas não aparecem itens
**Solução:** Verifique se a tabela `extra_items` está vazia. Se estiver, execute apenas a parte de INSERT do script.

---

## 📞 SUPORTE

Se encontrar algum problema:
1. Verifique os logs no SQL Editor do Supabase
2. Copie a mensagem de erro completa
3. Verifique se todas as tabelas relacionadas existem (`orders`, etc.)

---

## ✅ CONCLUSÃO

Após executar este script, você terá:
- ✅ Tabela `extra_items` criada e configurada
- ✅ Tabela `order_extra_items` criada e configurada
- ✅ 10 itens extras padrão disponíveis
- ✅ Políticas RLS configuradas
- ✅ Índices para performance
- ✅ Sistema pronto para usar itens extras nas comandas

