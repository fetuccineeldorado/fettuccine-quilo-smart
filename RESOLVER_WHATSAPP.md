# 🔧 Resolver Problemas do WhatsApp - Passo a Passo

## ✅ Servidor está funcionando!

O servidor está respondendo corretamente em `http://localhost:3001`.

## 🔍 Diagnóstico Passo a Passo

### Passo 1: Verificar Migração SQL

1. Acesse o **Supabase Dashboard**: https://app.supabase.com
2. Vá em **SQL Editor**
3. Execute:
   ```sql
   SELECT * FROM whatsapp_connections LIMIT 1;
   ```
4. **Se der erro**: Aplique a migração SQL primeiro
5. **Se funcionar**: Continue para o próximo passo

### Passo 2: Configurar Conexão no Sistema

1. Acesse **Configurações → WhatsApp** no sistema
2. Clique em **"Configurar Conexão"**
3. Preencha:
   - **ID da Instância**: `default`
   - **Nome**: `Instância Principal`
   - **URL do Servidor Backend**: `http://localhost:3001`
   - **Chave**: Deixe em branco
4. Clique em **"Salvar Configuração"**

### Passo 3: Gerar QR Code

1. Clique em **"Conectar WhatsApp"**
2. Aguarde alguns segundos (pode levar até 60 segundos)
3. Um QR Code deve aparecer

### Passo 4: Escanear QR Code

1. Abra o **WhatsApp** no seu celular
2. Vá em **Configurações → Aparelhos conectados**
3. Toque em **"Conectar um aparelho"**
4. Escaneie o QR Code que aparece na tela
5. O sistema detectará automaticamente

## 🐛 Problemas Comuns

### Problema 1: QR Code não aparece

**Solução:**
1. Verifique o console do navegador (F12) para erros
2. Verifique os logs do servidor (terminal onde `npm start` está rodando)
3. Aguarde até 60 segundos (pode demorar na primeira vez)
4. Clique em "Gerar Novo QR Code" se necessário

### Problema 2: Erro "Timeout ao gerar QR Code"

**Solução:**
1. Verifique se o Puppeteer está instalado corretamente
2. No terminal do servidor, veja se há erros sobre Chromium
3. Tente novamente após alguns segundos

### Problema 3: QR Code aparece mas não conecta após escanear

**Solução:**
1. Verifique se o QR Code não expirou (expira em 60 segundos)
2. Gere um novo QR Code
3. Escaneie rapidamente antes que expire
4. Verifique se não há outro WhatsApp Web conectado no mesmo número

### Problema 4: Erro "Servidor não está rodando"

**Solução:**
```bash
cd server
npm start
```

## 🔍 Usar o Diagnóstico Automático

1. Acesse **Configurações → WhatsApp**
2. Role até o final da página
3. Você verá o card **"Diagnóstico do WhatsApp"**
4. Clique em **"Executar Diagnósticos"**
5. O sistema verificará automaticamente:
   - ✅ Tabela no banco
   - ✅ Servidor backend
   - ✅ Configuração
   - ✅ Geração de QR Code

## 📝 Logs Importantes

### No Console do Navegador (F12):
- `🔍 Verificando servidor em: ...`
- `✅ Servidor está respondendo`
- `📱 Gerando QR Code...`
- `📊 Resultado da geração: ...`

### No Terminal do Servidor:
- `📱 Solicitando QR Code para instância: default`
- `🆕 Criando novo cliente para default`
- `🚀 Inicializando cliente default...`
- `✅ QR Code recebido para default`

## ✅ Checklist Final

Antes de reportar problema, verifique:

- [ ] Servidor está rodando (`npm start` na pasta `server`)
- [ ] Servidor responde em `http://localhost:3001/health`
- [ ] Migração SQL aplicada (tabela `whatsapp_connections` existe)
- [ ] Conexão configurada no sistema (URL: `http://localhost:3001`)
- [ ] Console do navegador não mostra erros críticos
- [ ] Terminal do servidor não mostra erros

## 🆘 Se Ainda Não Funcionar

1. **Execute o diagnóstico automático** (em Configurações → WhatsApp)
2. **Copie os logs** do console do navegador
3. **Copie os logs** do terminal do servidor
4. **Informe qual erro específico** aparece quando tenta conectar

