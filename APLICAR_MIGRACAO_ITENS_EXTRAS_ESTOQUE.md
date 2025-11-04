# 📦 APLICAR MIGRAÇÃO - INTEGRAÇÃO ITENS EXTRAS COM ESTOQUE

## ✅ MIGRAÇÃO CRIADA

A migration `20250104000001_integrate_extra_items_stock.sql` foi criada para integrar completamente os itens extras com o sistema de estoque.

---

## 🎯 O QUE A MIGRAÇÃO FAZ

### 1. **Adiciona Campos de Estoque em `extra_items`**
- `product_id` - Vincula com tabela `products` (sincronização)
- `current_stock` - Estoque atual do item
- `min_stock` - Estoque mínimo para alertas
- `max_stock` - Estoque máximo recomendado
- `track_stock` - Se deve rastrear estoque
- `unit` - Unidade de medida (unidade, caixa, etc)

### 2. **Sincronização Automática**
- **Trigger `sync_extra_item_with_product`**: 
  - Cria automaticamente produto no estoque quando `track_stock = true`
  - Sincroniza dados entre `extra_items` e `products`
  - Mantém consistência entre tabelas

### 3. **Redução Automática de Estoque**
- **Trigger `reduce_extra_item_stock`**:
  - Reduz estoque automaticamente ao criar `order_extra_items`
  - Verifica estoque suficiente antes de reduzir
  - Gera erro se estoque insuficiente
  - Cria movimento de saída no `inventory_movements`

### 4. **Alertas de Estoque**
- **Função `check_extra_item_stock_alerts`**:
  - Verifica estoque baixo ou zerado
  - Gera alertas automaticamente
  - Integrado com sistema de `stock_alerts`

### 5. **View para Consulta**
- **View `extra_items_with_stock`**:
  - Facilita consulta de itens extras com estoque
  - Mostra status de estoque (in_stock, low_stock, out_of_stock)
  - Integra dados de `extra_items` e `products`

---

## 📋 COMO APLICAR

### Passo 1: Acessar Supabase Dashboard
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**

### Passo 2: Executar Migration
1. Abra o arquivo: `supabase/migrations/20250104000001_integrate_extra_items_stock.sql`
2. Copie todo o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** ou pressione `Ctrl+Enter`

### Passo 3: Verificar Aplicação
```sql
-- Verificar se campos foram adicionados
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'extra_items' 
AND column_name IN ('product_id', 'current_stock', 'min_stock', 'track_stock');

-- Verificar triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'extra_items' OR event_object_table = 'order_extra_items';

-- Verificar view
SELECT * FROM extra_items_with_stock LIMIT 5;
```

---

## 🔧 FUNCIONALIDADES IMPLEMENTADAS

### ✅ **No Componente ExtraItemsSelector:**
- ✅ Mostra estoque disponível de cada item
- ✅ Badge de "Sem estoque" quando estoque = 0
- ✅ Badge de "Estoque baixo" quando <= min_stock
- ✅ Desabilita botão "+" quando sem estoque
- ✅ Valida estoque antes de adicionar
- ✅ Toast de erro quando estoque insuficiente

### ✅ **Na Página de Pesagem:**
- ✅ Seleção de itens extras com verificação de estoque
- ✅ Estoque reduzido automaticamente ao criar comanda
- ✅ Validação antes de inserir na comanda
- ✅ Erro se tentar vender mais que disponível

### ✅ **Na Página de Gestão:**
- ✅ Cadastro de itens extras com controle de estoque
- ✅ Visualização de estoque atual
- ✅ Ajuste manual de estoque (+1 / -1)
- ✅ Configuração de estoque mínimo/máximo
- ✅ Ativar/desativar rastreamento de estoque
- ✅ Sincronização automática com `products`

---

## 📊 FLUXO DE FUNCIONAMENTO

### 1. **Cadastro de Item Extra:**
```
Usuário cria item extra → 
Trigger cria produto no estoque (se track_stock=true) →
Item sincronizado com products →
Estoque inicial configurado
```

### 2. **Adição de Item na Pesagem:**
```
Usuário seleciona item → 
ExtraItemsSelector verifica estoque →
Se disponível: adiciona à seleção →
Ao criar comanda: order_extra_items inserido →
Trigger reduz estoque automaticamente →
Movimento de saída criado →
Alertas verificados
```

### 3. **Alertas de Estoque:**
```
Estoque reduzido → 
Trigger verifica nível →
Se <= min_stock: cria alerta →
Se = 0: cria alerta de sem estoque →
Dashboard mostra alertas →
Usuário é notificado
```

---

## 🎨 INTERFACE

### ExtraItemsSelector (Pesagem):
```
┌─────────────────────────────────┐
│ 🛒 Itens Extra                  │
├─────────────────────────────────┤
│                                 │
│ Refrigerante 350ml  [⚠️ Baixo] │
│ R$ 4.50  📦 3 un               │
│                    [-][2][+]    │
│                                 │
│ Coca-Cola 600ml    [❌ Sem]    │
│ R$ 7.00  📦 0 un               │
│                    [DESABILITADO]│
└─────────────────────────────────┘
```

### Página de Gestão:
```
┌─────────────────────────────────┐
│ 🛒 Refrigerante 350ml          │
│ R$ 4.50                         │
│                                 │
│ 📦 Estoque: 3 un  [⚠️ Baixo]   │
│ Mínimo: 5 un                   │
│                                 │
│ [-1] [+1]                       │
│                                 │
│ [Editar] [Excluir]              │
└─────────────────────────────────┘
```

---

## ⚠️ IMPORTANTE

### Antes de Aplicar:
1. ✅ Fazer backup do banco de dados
2. ✅ Verificar se tabela `products` existe
3. ✅ Verificar se tabela `product_categories` existe
4. ✅ Verificar se categoria "Itens Extras" existe

### Após Aplicar:
1. ✅ Verificar se campos foram adicionados
2. ✅ Verificar se triggers foram criados
3. ✅ Testar criação de item extra
4. ✅ Testar redução de estoque
5. ✅ Verificar alertas

---

## 🐛 TROUBLESHOOTING

### Erro: "column does not exist"
**Solução:** Migration não foi aplicada. Execute novamente.

### Erro: "trigger already exists"
**Solução:** Migration já foi aplicada. Pode ignorar ou usar `DROP TRIGGER IF EXISTS`.

### Estoque não reduz automaticamente
**Solução:** Verificar se trigger `trigger_reduce_extra_item_stock` existe:
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trigger_reduce_extra_item_stock';
```

### Alertas não aparecem
**Solução:** Verificar se função `check_stock_alerts` existe e se está sendo chamada.

---

## ✅ CHECKLIST DE APLICAÇÃO

- [ ] Migration executada no Supabase SQL Editor
- [ ] Campos de estoque adicionados em `extra_items`
- [ ] Triggers criados e funcionando
- [ ] View `extra_items_with_stock` criada
- [ ] Testar cadastro de item extra
- [ ] Testar seleção na pesagem
- [ ] Testar redução de estoque
- [ ] Verificar alertas no dashboard
- [ ] Testar ajuste manual de estoque

---

## 🚀 RESULTADO ESPERADO

Após aplicar a migration:

✅ **Itens extras** podem ser cadastrados com controle de estoque
✅ **Estoque** é reduzido automaticamente ao criar comanda
✅ **Alertas** são gerados quando estoque baixo
✅ **Sincronização** automática entre `extra_items` e `products`
✅ **Interface** mostra estoque e alertas em tempo real

---

**MIGRATION PRONTA PARA APLICAÇÃO!** 🎉

*Execute a migration no Supabase SQL Editor para ativar todas as funcionalidades!*

