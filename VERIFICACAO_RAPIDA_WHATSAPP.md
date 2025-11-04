# ⚡ Verificação Rápida - WhatsApp Business

## 🎯 VERIFICAÇÃO EM 3 PASSOS

### ✅ PASSO 1: Verificar Servidor Backend
```powershell
Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet
```
- **True** = ✅ Servidor rodando
- **False** = ❌ Precisa iniciar o servidor:
  ```powershell
  cd server
  npm start
  ```

### ✅ PASSO 2: Verificar Tabela no Supabase
1. Acesse: https://app.supabase.com
2. SQL Editor → Execute:
```sql
SELECT COUNT(*) FROM whatsapp_connections;
```
- **Sucesso** = ✅ Tabela existe
- **Erro** = ❌ Aplicar migração (veja GUIA_WHATSAPP_BUSINESS.md)

### ✅ PASSO 3: Conectar WhatsApp
1. Abra: http://localhost:8080/settings
2. Aba **WhatsApp**
3. Se vê "Configurar Conexão":
   - Clique e configure
   - URL: `http://localhost:3001`
   - Salve
4. Clique em **Conectar WhatsApp**
5. Escaneie o QR Code
6. Aguarde "✅ WhatsApp Conectado"

---

## 🔍 STATUS ATUAL DO SEU SISTEMA

### ✅ O que JÁ ESTÁ PRONTO:
- ✅ Servidor backend instalado e configurado
- ✅ Código frontend integrado
- ✅ Interface de conexão via QR Code
- ✅ Diagnóstico automático
- ✅ Sistema de envio de mensagens

### ⏳ O que VOCÊ PRECISA FAZER:
1. Aplicar migração SQL no Supabase (1 minuto)
2. Configurar URL do servidor no sistema (30 segundos)
3. Escanear QR Code com WhatsApp Business (30 segundos)

**Total: ~2 minutos!** ⚡

---

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES RÁPIDAS

| Problema | Solução Rápida |
|----------|----------------|
| "Tabela não encontrada" | Execute SQL no Supabase (PASSO 2) |
| "Servidor não responde" | `cd server && npm start` |
| QR Code não aparece | Aguarde 60 segundos, limpe cache |
| QR Code expirou | Clique "Novo QR Code" |
| Mensagem não envia | Verifique formato do número: 5511999999999 |

---

## 📞 TESTE RÁPIDO DE FUNCIONAMENTO

### Após Conectar, Teste:
1. Vá em **Clientes**
2. Adicione seu próprio número: `55[DDD][NÚMERO]`
3. Clique no ícone WhatsApp
4. Escolha "Mensagem de Boas-vindas"
5. Você deve receber a mensagem no celular! ✅

---

## 🎯 CHECKLIST VISUAL

```
┌─────────────────────────────────────────┐
│  STATUS DA INTEGRAÇÃO WHATSAPP          │
├─────────────────────────────────────────┤
│                                         │
│  [ ] Servidor rodando na porta 3001     │
│  [ ] Tabela existe no Supabase          │
│  [ ] Conexão configurada no sistema     │
│  [ ] QR Code escaneado                  │
│  [ ] Status: "Conectado"                │
│  [ ] Teste de mensagem realizado        │
│                                         │
│  Quando todos marcados: ✅ PRONTO!      │
└─────────────────────────────────────────┘
```

---

## 📱 FORMATO CORRETO DOS NÚMEROS

### ✅ CORRETO:
- `5511999999999` (55 + DDD + número)
- `5521988888888`
- `5548977777777`

### ❌ ERRADO:
- ~~`(11) 99999-9999`~~ (tem caracteres especiais)
- ~~`11999999999`~~ (falta código do país)
- ~~`+55 11 99999-9999`~~ (tem espaços)

---

## 🔧 COMANDOS ÚTEIS

```powershell
# Ver se servidor está rodando
Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet

# Iniciar servidor (se não estiver rodando)
cd server; npm start

# Reinstalar (se houver problemas)
cd server; npm install; npm start

# Limpar cache do navegador
# Pressione: Ctrl+Shift+Delete
```

---

## 🎉 PRONTO PARA USAR?

Se você conseguir ver isto no sistema:

```
✅ WhatsApp Conectado
Nome: Seu Nome Aqui
Número: 5511999999999
Conectado em: 04/11/2025 às 10:30
```

**PARABÉNS! ESTÁ FUNCIONANDO! 🎉**

Agora você pode:
- Enviar mensagens para clientes
- Configurar promoções automáticas
- Notificar sobre pontos e ofertas
- Usar o sistema de indicação

