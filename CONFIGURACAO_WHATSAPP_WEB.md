# 📱 Configuração WhatsApp Web.js

## 🎯 Visão Geral

O sistema agora usa **WhatsApp Web.js** para conectar diretamente ao WhatsApp via QR Code, sem necessidade de APIs externas como Evolution API.

## 📋 Pré-requisitos

1. **Node.js** instalado (versão 16 ou superior)
2. **npm** ou **yarn**

## 🚀 Instalação

### 1. Instalar Dependências do Servidor

```bash
cd server
npm install
```

### 2. Iniciar o Servidor

```bash
npm start
```

Ou para desenvolvimento com auto-reload:

```bash
npm run dev
```

O servidor iniciará na porta **3001** (ou a porta definida na variável `PORT`).

## ⚙️ Configuração no Sistema

1. Acesse **Configurações → WhatsApp**
2. Clique em **"Configurar Conexão"**
3. Preencha:
   - **ID da Instância**: `default` (ou outro nome único)
   - **Nome da Instância**: Ex: "Instância Principal"
   - **URL do Servidor Backend**: `http://localhost:3001` (ou a URL do seu servidor)
   - **Chave**: Deixe em branco (não é necessária para WhatsApp Web.js)
4. Clique em **"Salvar Configuração"**

## 🔗 Conectar WhatsApp

1. Clique em **"Conectar WhatsApp"**
2. Um QR Code será gerado e exibido na tela
3. Abra o **WhatsApp** no seu celular
4. Vá em **Configurações → Aparelhos conectados**
5. Toque em **"Conectar um aparelho"**
6. Escaneie o QR Code que aparece na tela
7. O sistema detectará a conexão automaticamente

## 📡 Endpoints da API

O servidor fornece os seguintes endpoints:

- `GET /api/whatsapp/qr/:instanceId` - Gerar QR Code
- `GET /api/whatsapp/status/:instanceId` - Verificar status da conexão
- `DELETE /api/whatsapp/disconnect/:instanceId` - Desconectar
- `POST /api/whatsapp/send` - Enviar mensagem
- `GET /health` - Health check

## 🔧 Variáveis de Ambiente (Opcional)

Crie um arquivo `.env` na pasta `server/`:

```env
PORT=3001
NODE_ENV=production
```

## 🐛 Troubleshooting

### Erro: "Servidor backend não está rodando"

- Verifique se o servidor está rodando na porta 3001
- Teste acessando: `http://localhost:3001/health`
- Verifique se a URL configurada está correta

### QR Code não aparece

- Verifique os logs do servidor para erros
- Certifique-se de que o Puppeteer está instalado corretamente
- No Linux, pode ser necessário instalar dependências do Chromium

### Conexão não é detectada

- O polling verifica a cada 2 segundos
- Aguarde alguns segundos após escanear o QR Code
- Verifique se o WhatsApp foi escaneado corretamente

## 📦 Dependências

O servidor usa:
- `express` - Servidor HTTP
- `whatsapp-web.js` - Cliente WhatsApp Web
- `qrcode` - Geração de QR Codes
- `puppeteer` - Automação do navegador

## 🔒 Segurança

- O servidor roda localmente por padrão
- Para produção, configure CORS adequadamente
- Considere adicionar autenticação se expor publicamente
- As sessões são armazenadas localmente via `LocalAuth`

## 📝 Notas

- A primeira conexão pode demorar mais (baixa o Chromium)
- As sessões são salvas localmente na pasta `.wwebjs_auth/`
- Cada instância mantém sua própria sessão separada

