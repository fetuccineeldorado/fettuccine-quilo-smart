# 🔧 Troubleshooting - WhatsApp Web.js

## ❌ Problemas Comuns e Soluções

### 1. "Servidor backend não está rodando"

**Sintoma:**
- Erro ao tentar gerar QR Code
- Mensagem: "Servidor backend não está rodando em http://localhost:3001"

**Solução:**
```bash
# 1. Ir para a pasta do servidor
cd server

# 2. Instalar dependências (se ainda não instalou)
npm install

# 3. Iniciar o servidor
npm start

# Deve aparecer:
# 🚀 Servidor WhatsApp rodando na porta 3001
```

**Verificar:**
- Abra no navegador: `http://localhost:3001/health`
- Deve retornar: `{"status":"ok","timestamp":"..."}`

---

### 2. "URL do servidor não configurada"

**Sintoma:**
- Botão "Conectar WhatsApp" desabilitado
- Mensagem de aviso sobre URL não configurada

**Solução:**
1. Acesse **Configurações → WhatsApp**
2. Clique em **"Configurar Conexão"**
3. Preencha:
   - **URL do Servidor Backend**: `http://localhost:3001`
   - Deixe outros campos como estão
4. Salve

---

### 3. QR Code não aparece

**Sintoma:**
- Clicou em "Conectar WhatsApp" mas não aparece QR Code
- Fica em "Gerando QR Code..." indefinidamente

**Possíveis causas:**

#### a) Servidor não iniciado
```bash
cd server
npm start
```

#### b) Porta 3001 já em uso
```bash
# Verificar se algo está usando a porta
netstat -ano | findstr :3001

# Ou mudar a porta no servidor
# Edite server/whatsapp-server.js e altere:
const PORT = process.env.PORT || 3002;

# E atualize a URL no sistema para: http://localhost:3002
```

#### c) Erro no servidor (verificar console)
- Abra o terminal onde o servidor está rodando
- Procure por erros (mensagens em vermelho)
- Erros comuns:
  - Puppeteer não instalado
  - Dependências faltando

---

### 4. "Erro ao gerar QR Code"

**Sintoma:**
- Toast de erro aparece
- QR Code não é gerado

**Verificações:**

1. **Servidor está rodando?**
   ```bash
   # Teste no navegador
   http://localhost:3001/health
   ```

2. **Logs do servidor:**
   - Veja o terminal onde o servidor está rodando
   - Procure por mensagens de erro
   - Copie a mensagem de erro completa

3. **Dependências instaladas?**
   ```bash
   cd server
   npm install
   ```

---

### 5. QR Code aparece mas não conecta

**Sintoma:**
- QR Code aparece na tela
- Escaneia com WhatsApp mas não conecta
- Fica em "Aguardando conexão..."

**Soluções:**

1. **QR Code expirou:**
   - Clique em "Gerar Novo QR Code"
   - Escaneie o novo QR Code

2. **WhatsApp já conectado em outro lugar:**
   - Desconecte outros aparelhos do WhatsApp
   - Tente novamente

3. **Verificar status manualmente:**
   ```bash
   # No navegador, teste:
   http://localhost:3001/api/whatsapp/status/default
   ```

---

### 6. Erro: "Cannot find module 'whatsapp-web.js'"

**Sintoma:**
- Servidor não inicia
- Erro sobre módulo não encontrado

**Solução:**
```bash
cd server
npm install
```

---

### 7. Erro: Puppeteer/Chromium

**Sintoma:**
- Erro ao iniciar servidor relacionado a Puppeteer
- Erro sobre Chromium não encontrado

**Solução:**
```bash
cd server

# Forçar reinstalação do Puppeteer
npm uninstall puppeteer
npm install puppeteer

# Ou instalar dependências do sistema (Linux)
# Ubuntu/Debian:
sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 libasound2

# Fedora:
sudo dnf install -y nss atk libdrm libxkbcommon libgbm alsa-lib
```

---

### 8. CORS Error

**Sintoma:**
- Erro no console do navegador sobre CORS
- "Access to fetch blocked by CORS policy"

**Solução:**
- O servidor já tem CORS habilitado
- Verifique se o servidor está rodando
- Verifique se a URL está correta (sem barra no final)

---

## 🔍 Como Diagnosticar

### 1. Verificar Servidor
```bash
# Teste no navegador
http://localhost:3001/health

# Deve retornar JSON com status ok
```

### 2. Verificar Logs
- Abra o terminal onde o servidor está rodando
- Procure por mensagens de erro ou sucesso
- Logs importantes:
  - `✅ QR Code gerado para instância: default`
  - `Cliente WhatsApp pronto para instância: default`
  - `❌ Erro ao gerar QR Code: ...`

### 3. Verificar Console do Navegador
- Abra DevTools (F12)
- Vá na aba "Console"
- Procure por erros em vermelho
- Copie mensagens de erro completas

### 4. Verificar Configuração
- Acesse Configurações → WhatsApp
- Verifique se a URL está correta: `http://localhost:3001`
- Verifique se há conexão cadastrada

---

## 📝 Checklist de Verificação

Antes de reportar problema, verifique:

- [ ] Servidor está rodando (`npm start` na pasta `server`)
- [ ] Servidor responde em `http://localhost:3001/health`
- [ ] URL configurada no sistema: `http://localhost:3001`
- [ ] Dependências instaladas: `cd server && npm install`
- [ ] Porta 3001 não está em uso por outro processo
- [ ] Migração SQL aplicada no Supabase
- [ ] Console do navegador não mostra erros críticos

---

## 🆘 Ainda Não Funciona?

Se após seguir todos os passos ainda não funcionar:

1. **Copie os logs do servidor:**
   - Tudo que aparece no terminal onde o servidor roda
   
2. **Copie os erros do console:**
   - Abra DevTools (F12) → Console
   - Copie mensagens de erro

3. **Informe:**
   - Sistema operacional (Windows/Linux/Mac)
   - Versão do Node.js (`node --version`)
   - Mensagem de erro completa
   - Passos que você já tentou

---

## ✅ Teste Rápido

Execute estes comandos para verificar se tudo está ok:

```bash
# 1. Verificar Node.js
node --version  # Deve ser 16+

# 2. Ir para pasta do servidor
cd server

# 3. Instalar dependências
npm install

# 4. Iniciar servidor
npm start

# 5. Em outro terminal, testar
curl http://localhost:3001/health
# Ou abra no navegador: http://localhost:3001/health
```

Se todos os passos funcionarem, o problema pode estar na configuração do frontend.

