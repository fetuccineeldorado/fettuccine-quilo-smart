# Integração Stone - Sistema PDV Fettuccine

## Visão Geral

O sistema agora está integrado com a máquina Stone para processamento de pagamentos. Quando o valor for lançado, ele pode ir direto para a máquina Stone através da nova funcionalidade.

## Funcionalidades Implementadas

### 1. Pagamento Manual (Existente)
- Dinheiro
- Cartão Débito  
- Cartão Crédito
- PIX

### 2. Máquina Stone (Novo)
- Pagamento via máquina Stone
- Suporte para Crédito, Débito e PIX
- Processamento em tempo real
- Registro automático no sistema

## Configuração

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis ao arquivo `.env`:

```bash
# Configurações Stone
VITE_STONE_API_URL="https://api.stone.com.br"
VITE_STONE_ENVIRONMENT="sandbox"  # sandbox para testes, production para produção
VITE_STONE_MERCHANT_ID="SEU_MERCHANT_ID"
VITE_STONE_TERMINAL_SERIAL="NUMERO_SERIAL_TERMINAL"
```

### 2. Configuração do Merchant ID

1. Acesse o portal Stone
2. Faça login com suas credenciais
3. Copie o Merchant ID da sua conta
4. Cole no campo `VITE_STONE_MERCHANT_ID`

### 3. Configuração do Terminal Serial

1. Na máquina Stone, vá em Configurações
2. Encontre o número de série do terminal
3. Cole no campo `VITE_STONE_TERMINAL_SERIAL`

## Como Usar

### 1. Acessar o Caixa
1. Faça login no sistema
2. Vá para `Caixa` no menu lateral
3. Selecione uma comanda aberta

### 2. Escolher Método de Pagamento
1. Clique na aba **"Máquina Stone"**
2. O sistema exibirá as opções de pagamento:
   - **Crédito**: Pagamento em até 12x
   - **Débito**: Débito na conta
   - **PIX**: Transferência instantânea

### 3. Processar Pagamento
1. Selecione a forma desejada
2. O sistema comunicará com a máquina Stone
3. Aguarde o processamento
4. Após aprovação, a comanda será fechada automaticamente

## Fluxo de Pagamento

```
Selecionar Comanda → Escolher "Máquina Stone" → Selecionar Forma → Processar → Aprovar → Fechar Comanda
```

## Status da Transação

### ✅ Pagamento Aprovado
- Transação registrada no banco
- Comanda fechada automaticamente  
- ID da transação salvo
- Notificação de sucesso exibida

### ❌ Pagamento Recusado
- Mensagem de erro exibida
- Comanda permanece aberta
- Possibilidade de tentar novamente

## Ambientes

### Sandbox (Testes)
- Ambiente: `sandbox`
- Simula pagamentos com 90% de sucesso
- Ideal para testes e desenvolvimento
- Nenhuma transação real é processada

### Produção
- Ambiente: `production`
- Processa pagamentos reais
- Conecta à API real da Stone
- Requer credenciais válidas

## Segurança

### 🔐 Criptografia
- Todas as comunicações são criptografadas
- Tokens de autenticação expiram
- Dados sensíveis nunca são armazenados localmente

### 🛡️ Validação
- Validação de valores antes do envio
- Verificação de sessão ativa
- Rollback automático em caso de erro

## Troubleshooting

### Stone não configurado
Se aparecer mensagem "Stone não configurado":
1. Verifique as variáveis de ambiente
2. Reinicie o servidor
3. Confirme os dados no portal Stone

### Erro de comunicação
1. Verifique conexão com internet
2. Confirme se a máquina Stone está online
3. Verifique o número de série do terminal

### Pagamento não registrado
1. Verifique logs do console
2. Confirme sessão do usuário
3. Tente processar novamente

## Logs e Monitoramento

### Console do Navegador
Todos os pagamentos Stone são logados:
```
🔄 Iniciando pagamento Stone: {amount, method, orderId}
✅ Pagamento aprovado: {transactionId}
❌ Erro no pagamento: {error}
```

### Banco de Dados
- Tabela `payments` registra todas as transações
- Campo `transaction_id` armazena ID Stone
- Campo `payment_method = 'stone'` identifica transações Stone

## Próximos Passos

### 1. Configurar Credenciais
- Obter Merchant ID
- Obter Serial do Terminal
- Configurar variáveis de ambiente

### 2. Testar Integração
- Usar ambiente sandbox
- Testar todas as formas de pagamento
- Verificar registro no banco

### 3. Ir para Produção
- Alterar ambiente para `production`
- Testar com transações reais
- Monitorar primeiros pagamentos

## Suporte

### Documentação Stone
- API Reference: https://docs.stone.com.br
- Portal: https://portal.stone.com.br
- Suporte: suporte@stone.com.br

### Suporte do Sistema
- Verificar logs no console
- Consultar tabela `payments`
- Analisar erros na rede

## Considerações Finais

✅ **Integração completa**: Sistema integrado com Stone
✅ **Pagamento direto**: Valor vai direto para máquina
✅ **Registro automático**: Transações salvas automaticamente
✅ **Segurança**: Criptografia e validação
✅ **Flexibilidade**: Ambientes de teste e produção

O sistema agora está pronto para processar pagamentos diretamente na máquina Stone!
