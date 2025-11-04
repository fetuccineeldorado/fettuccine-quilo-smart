# ⚡ INÍCIO RÁPIDO - WhatsApp Business

## 🎯 3 PASSOS PARA CONECTAR

### 1️⃣ VERIFICAR E INICIAR SERVIDOR (2 minutos)

Execute o script de verificação:
```powershell
.\verificar-whatsapp.ps1
```

Se o servidor NÃO estiver rodando:
```powershell
cd server
npm install
npm start
```

✅ **Resultado esperado**: "Servidor rodando na porta 3001"

---

### 2️⃣ APLICAR MIGRAÇÃO NO SUPABASE (1 minuto)

1. Acesse: https://app.supabase.com
2. Seu projeto → **SQL Editor** → **New Query**
3. Cole e execute o conteúdo de:
   ```
   supabase/migrations/20250101000004_create_whatsapp_connection.sql
   ```
4. Clique em **Run** (ou Ctrl+Enter)

✅ **Resultado esperado**: "Success. No rows returned"

---

### 3️⃣ CONECTAR WHATSAPP BUSINESS (30 segundos)

1. Abra: http://localhost:8080/settings
2. Clique na aba **WhatsApp**
3. Clique em **Configurar Conexão**
4. Preencha:
   - **URL**: `http://localhost:3001`
   - (deixe o resto padrão)
5. Clique em **Salvar Configuração**
6. Clique em **Conectar WhatsApp**
7. **Escaneie o QR Code** com WhatsApp Business:
   - Abra WhatsApp Business no celular
   - Menu (3 pontinhos) → Aparelhos conectados
   - Conectar um aparelho
   - Escaneie o QR Code

✅ **Resultado esperado**: "✅ WhatsApp Conectado"

---

## 🧪 TESTE RÁPIDO

1. Vá em **Clientes**
2. Adicione seu próprio número: `5511999999999`
   - Formato: 55 + DDD + número (sem espaços)
3. Clique no ícone do WhatsApp
4. Escolha "Mensagem de Boas-vindas"

✅ **Resultado esperado**: Mensagem recebida no celular!

---

## 🚨 PROBLEMAS?

### Servidor não inicia
```powershell
cd server
npm install
npm start
```

### Erro "Tabela não encontrada"
Execute a migração SQL no Supabase (PASSO 2)

### QR Code não aparece
- Aguarde 60 segundos
- Clique em "Gerar Novo QR Code"
- Limpe o cache: Ctrl+Shift+Delete

### Mensagem não chega
Verifique o formato do número: `5511999999999`

---

## 📚 DOCUMENTAÇÃO COMPLETA

- `README_WHATSAPP.md` - Documentação técnica completa
- `GUIA_WHATSAPP_BUSINESS.md` - Guia passo a passo detalhado
- `VERIFICACAO_RAPIDA_WHATSAPP.md` - Checklist de verificação

---

## ✅ STATUS ATUAL

✅ Código instalado e configurado
✅ Servidor backend pronto
✅ Interface de conexão implementada
✅ Sistema de envio de mensagens ativo
✅ Diagnóstico automático disponível

⏳ **Aguardando você:**
1. Aplicar migração SQL
2. Escanear QR Code
3. Testar envio de mensagem

**Total: ~3 minutos!** ⚡

---

## 🎉 PRONTO!

Após estes 3 passos, você poderá:
- ✅ Enviar mensagens para clientes
- ✅ Criar campanhas de promoção
- ✅ Notificar sobre pontos e ofertas
- ✅ Sistema de indicação automático

**Boa sorte! 🚀**

