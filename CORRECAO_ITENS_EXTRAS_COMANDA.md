# 🔧 Correção: Erro ao Inserir Itens Extras na Comanda

## 📋 Problema Identificado

O erro ocorria ao inserir itens extras para fechamento da comanda, possivelmente devido a:
1. **Falta de validação**: Dados não eram validados antes de inserir
2. **Tipos incorretos**: Quantity pode não ser inteiro, preços podem ter muitos decimais
3. **IDs inválidos**: IDs podem estar faltando ou serem inválidos
4. **Mensagens de erro genéricas**: Não indicavam qual item estava com problema

## ✅ Soluções Implementadas

### 1. Função de Validação e Preparação de Dados

**Arquivo**: `src/pages/Weighing.tsx`

Criada função `prepareExtraItemsData` que:
- ✅ Valida ID da comanda
- ✅ Valida ID de cada item extra
- ✅ Valida quantidade (deve ser > 0 e inteiro)
- ✅ Valida preço (deve ser > 0 e número válido)
- ✅ Valida total (deve ser > 0 e número válido)
- ✅ Arredonda valores para 2 decimais
- ✅ Garante que quantity é inteiro

```typescript
const prepareExtraItemsData = (orderId: string) => {
  // Validações completas de cada item
  for (const item of selectedExtraItems) {
    // Validar ID
    if (!item.id || typeof item.id !== 'string' || item.id.length === 0) {
      throw new Error(`Item extra "${item.name}" não possui ID válido`);
    }
    
    // Validar quantidade (deve ser inteiro)
    if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      throw new Error(`Quantidade inválida para item "${item.name}": ${item.quantity}`);
    }
    
    // Validar preço
    if (!item.price || item.price <= 0 || isNaN(item.price)) {
      throw new Error(`Preço inválido para item "${item.name}": ${item.price}`);
    }
    
    // Preparar dados validados
    extraItemsData.push({
      order_id: orderId,
      extra_item_id: item.id,
      quantity: Number(item.quantity), // Garantir inteiro
      unit_price: Number(item.price.toFixed(2)), // 2 decimais
      total_price: Number(totalPrice.toFixed(2)), // 2 decimais
    });
  }
};
```

### 2. Função de Inserção com Tratamento de Erros

**Arquivo**: `src/pages/Weighing.tsx`

Criada função `insertExtraItems` que:
- ✅ Usa a função de preparação
- ✅ Trata erros específicos do banco
- ✅ Fornece mensagens claras
- ✅ Logs detalhados para debug

```typescript
const insertExtraItems = async (orderId: string) => {
  const extraItemsData = prepareExtraItemsData(orderId);
  
  const { error } = await supabase.from("order_extra_items").insert(extraItemsData);
  
  if (error) {
    // Tratar erros específicos
    if (error.code === "23503" || error.message?.includes("foreign key")) {
      errorMessage = "Um ou mais itens extras não foram encontrados no banco de dados.";
    } else if (error.code === "23502" || error.message?.includes("null value")) {
      errorMessage = "Dados inválidos ao inserir itens extras.";
    } else if (error.code === "42501" || error.message?.includes("permission")) {
      errorMessage = "Você não tem permissão para inserir itens extras.";
    }
    throw new Error(errorMessage);
  }
};
```

### 3. Reutilização da Função

A função `insertExtraItems` é usada em ambos os lugares:
- ✅ Ao adicionar itens a comanda existente
- ✅ Ao criar nova comanda

Isso garante consistência e validação em ambos os casos.

### 4. Tratamento de Erros Específicos

**Arquivo**: `src/pages/Weighing.tsx`

Adicionado tratamento específico para erros de itens extras no catch:

```typescript
// Tratar erros específicos de itens extras
if (error instanceof Error && (
  error.message.includes("Item extra") ||
  error.message.includes("Quantidade inválida") ||
  error.message.includes("Preço inválido") ||
  error.message.includes("Total inválido") ||
  error.message.includes("itens extras")
)) {
  toast({
    title: "Erro ao adicionar itens extras",
    description: error.message,
    variant: "destructive",
  });
  return;
}
```

## 🔍 Validações Implementadas

### Validação de ID da Comanda:
- ✅ Não pode ser null ou vazio
- ✅ Deve ser string válida

### Validação de Cada Item Extra:
- ✅ **ID**: Deve existir e ser string válida
- ✅ **Quantidade**: Deve ser > 0 e número inteiro
- ✅ **Preço**: Deve ser > 0 e número válido
- ✅ **Total**: Deve ser > 0 e número válido

### Normalização de Dados:
- ✅ Quantity convertido para número inteiro
- ✅ Preços arredondados para 2 decimais
- ✅ Totais arredondados para 2 decimais

## 📝 Mensagens de Erro Específicas

Cada tipo de erro agora tem uma mensagem clara:

- **ID inválido**: "Item extra 'X' não possui ID válido"
- **Quantidade inválida**: "Quantidade inválida para item 'X': Y"
- **Preço inválido**: "Preço inválido para item 'X': Y"
- **Total inválido**: "Total inválido para item 'X': Y"
- **Foreign key**: "Um ou mais itens extras não foram encontrados no banco"
- **Null value**: "Dados inválidos ao inserir itens extras"
- **Permissão**: "Você não tem permissão para inserir itens extras"

## 🔍 Logs de Debug

Agora o sistema faz logs detalhados:
- 📦 Dados antes da validação
- 📦 Dados após validação
- ❌ Erros com dados tentados
- ✅ Sucesso na inserção

## ✨ Resultado

- ✅ Validações completas antes de inserir
- ✅ Dados normalizados (quantidade inteira, preços com 2 decimais)
- ✅ Mensagens de erro específicas e claras
- ✅ Tratamento de erros do banco de dados
- ✅ Logs detalhados para debug
- ✅ Código reutilizável e consistente

## 🧪 Como Testar

1. Tente adicionar itens extras com quantidade inválida
2. Tente adicionar itens extras com preço inválido
3. Tente adicionar itens extras normalmente
4. Verifique os logs no console se houver erros
5. As mensagens de erro devem indicar qual item está com problema

## 📌 Próximos Passos

Se ainda houver erro:
1. Verifique o console do navegador para ver os logs detalhados
2. Verifique a mensagem de erro exibida
3. Verifique se os itens extras estão cadastrados no banco
4. Verifique se tem permissão (RLS) para inserir

