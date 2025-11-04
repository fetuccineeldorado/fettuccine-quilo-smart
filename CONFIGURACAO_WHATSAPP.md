# 📱 Configuração do Sistema de WhatsApp

## Visão Geral

O sistema de integração com WhatsApp permite:
- Envio automático de mensagens de boas-vindas
- Notificações de pontos ganhos
- Confirmações de pedidos
- Alertas de pontos expirando
- Promoções personalizadas

## Provedores Suportados

### 1. Evolution API (Recomendado)
API gratuita e open-source para WhatsApp.

**Configuração:**
```env
VITE_WHATSAPP_PROVIDER=evolution
VITE_WHATSAPP_API_URL=https://sua-instancia.evolution-api.com
VITE_WHATSAPP_API_KEY=sua-api-key
VITE_WHATSAPP_INSTANCE_ID=default
```

**Como obter:**
1. Instale o Evolution API (Docker recomendado)
2. Crie uma instância
3. Obtenha a API key e URL da instância

### 2. WhatsApp Business API (Oficial)
API oficial do Meta para WhatsApp Business.

**Configuração:**
```env
VITE_WHATSAPP_PROVIDER=whatsapp-business
VITE_WHATSAPP_API_URL=https://graph.facebook.com/v18.0
VITE_WHATSAPP_API_KEY=seu-access-token
```

**Como obter:**
1. Crie uma conta no Meta for Developers
2. Configure um app WhatsApp Business
3. Obtenha o Access Token

### 3. API Customizada
Para usar sua própria API de WhatsApp.

**Configuração:**
```env
VITE_WHATSAPP_PROVIDER=custom
VITE_WHATSAPP_API_URL=https://sua-api.com
VITE_WHATSAPP_API_KEY=sua-api-key
```

## Variáveis de Ambiente

Adicione ao arquivo `.env.local`:

```env
# WhatsApp Configuration
VITE_WHATSAPP_PROVIDER=evolution
VITE_WHATSAPP_API_URL=https://sua-instancia.evolution-api.com
VITE_WHATSAPP_API_KEY=sua-api-key-aqui
VITE_WHATSAPP_INSTANCE_ID=default
```

## Funcionalidades

### Mensagens Automáticas

1. **Boas-vindas**: Enviada automaticamente quando um novo cliente é cadastrado
2. **Pontos ganhos**: Notificação quando cliente ganha pontos
3. **Confirmação de pedido**: Enviada após confirmação de pedido
4. **Pontos expirando**: Alerta quando pontos estão próximos de expirar
5. **Promoções**: Mensagens promocionais personalizadas

### Formato de Números

Os números devem estar no formato:
- Sem espaços ou caracteres especiais
- Com código do país (55 para Brasil)
- Exemplo: `5511999999999`

O sistema formatará automaticamente números informados em outros formatos.

## Testando a Integração

1. Configure as variáveis de ambiente
2. Reinicie o servidor de desenvolvimento
3. Cadastre um novo cliente com número de WhatsApp
4. Verifique se a mensagem de boas-vindas foi enviada
5. Verifique o console para logs de erro (se houver)

## Troubleshooting

### Mensagens não são enviadas
- Verifique se as variáveis de ambiente estão configuradas
- Verifique se a API está acessível
- Verifique os logs do console do navegador
- Confirme que o número está no formato correto

### Erro de autenticação
- Verifique se a API key está correta
- Verifique se a instância (para Evolution) está ativa
- Verifique se o token (para WhatsApp Business) não expirou

### Mensagens não são entregues
- Verifique se o número está conectado ao WhatsApp
- Verifique se o número está bloqueado
- Verifique as políticas de spam do provedor

## Segurança

⚠️ **Importante**: 
- Nunca exponha suas API keys no código frontend público
- Use variáveis de ambiente
- Considere criar um backend proxy para APIs sensíveis
- Implemente rate limiting para evitar spam

## Suporte

Para problemas com a integração:
1. Verifique os logs do console
2. Verifique a documentação do provedor escolhido
3. Teste a API diretamente com ferramentas como Postman

