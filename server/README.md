# 📱 Servidor WhatsApp Web.js

Servidor backend para gerenciar conexões WhatsApp via QR Code usando WhatsApp Web.js.

## 🚀 Início Rápido

### 1. Instalar Dependências

```bash
npm install
```

### 2. Iniciar Servidor

```bash
npm start
```

O servidor iniciará na porta **3001** (ou a porta definida em `PORT`).

### 3. Verificar se está rodando

Acesse: `http://localhost:3001/health`

Deve retornar: `{"status":"ok","timestamp":"..."}`

## 📋 Endpoints

### Gerar QR Code
```
GET /api/whatsapp/qr/:instanceId
```

### Verificar Status
```
GET /api/whatsapp/status/:instanceId
```

### Desconectar
```
DELETE /api/whatsapp/disconnect/:instanceId
```

### Enviar Mensagem
```
POST /api/whatsapp/send
Body: {
  "instanceId": "default",
  "to": "5511999999999",
  "message": "Olá!"
}
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env`:

```env
PORT=3001
NODE_ENV=development
```

### Porta Customizada

```bash
PORT=3002 npm start
```

## 📦 Dependências

- `express` - Servidor HTTP
- `whatsapp-web.js` - Cliente WhatsApp Web
- `qrcode` - Geração de QR Codes
- `puppeteer` - Automação do navegador

## 🔒 Sessões

As sessões são armazenadas localmente na pasta `.wwebjs_auth/` usando `LocalAuth`.

Cada instância mantém sua própria sessão separada.

## 🐛 Troubleshooting

### Erro ao instalar Puppeteer

No Linux, pode ser necessário instalar dependências:

```bash
# Ubuntu/Debian
sudo apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libgbm1 \
  libasound2

# Fedora
sudo dnf install -y \
  nss \
  atk \
  libdrm \
  libxkbcommon \
  libgbm \
  alsa-lib
```

### Erro de permissão

Se houver problemas de permissão, execute:

```bash
chmod +x node_modules/puppeteer/.local-chromium/*/chrome-linux/chrome
```

## 📝 Notas

- A primeira execução pode demorar (baixa o Chromium)
- O servidor precisa estar rodando para o frontend funcionar
- Mantenha o servidor rodando enquanto usar o sistema

