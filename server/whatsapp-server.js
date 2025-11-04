/**
 * Servidor Backend para WhatsApp Web.js
 * Este servidor gerencia a conexão do WhatsApp via QR Code
 */

const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Armazenar clientes WhatsApp
const clients = new Map();

// Função para criar cliente WhatsApp
function createWhatsAppClient(instanceId) {
  if (clients.has(instanceId)) {
    return clients.get(instanceId);
  }

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: instanceId }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  // Evento: QR Code gerado
  client.on('qr', async (qr) => {
    try {
      const qrCodeBase64 = await qrcode.toDataURL(qr);
      console.log(`✅ QR Code gerado para instância: ${instanceId}`);
      // Armazenar QR Code para acesso posterior
      clients.set(`${instanceId}_qr`, qrCodeBase64);
      // Limpar após 40 segundos (tempo de expiração do WhatsApp)
      setTimeout(() => {
        clients.delete(`${instanceId}_qr`);
      }, 40000);
    } catch (error) {
      console.error('❌ Erro ao gerar QR Code:', error);
    }
  });

  // Evento: Cliente pronto
  client.on('ready', () => {
    console.log(`Cliente WhatsApp pronto para instância: ${instanceId}`);
    const info = client.info;
    clients.set(`${instanceId}_info`, {
      wid: info.wid,
      pushname: info.pushname,
      connected: true
    });
  });

  // Evento: Autenticação
  client.on('authenticated', () => {
    console.log(`Autenticado para instância: ${instanceId}`);
  });

  // Evento: Falha na autenticação
  client.on('auth_failure', (msg) => {
    console.error(`Falha na autenticação para ${instanceId}:`, msg);
    clients.delete(instanceId);
  });

  // Evento: Desconectado
  client.on('disconnected', (reason) => {
    console.log(`Cliente desconectado ${instanceId}:`, reason);
    clients.delete(instanceId);
    clients.delete(`${instanceId}_qr`);
    clients.delete(`${instanceId}_info`);
  });

  clients.set(instanceId, client);
  return client;
}

// Endpoint: Gerar QR Code
app.get('/api/whatsapp/qr/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    let client = clients.get(instanceId);

    // Se cliente já existe e está inicializado, verificar se já está conectado
    if (client && client.info) {
      return res.json({ 
        success: true, 
        qrCode: null,
        message: 'Cliente já está conectado',
        connected: true
      });
    }

    // Criar ou obter cliente
    client = createWhatsAppClient(instanceId);

    // Se já está inicializando, aguardar
    if (client.pupPage && !client.info) {
      // Aguardar um pouco antes de gerar novo QR
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Inicializar cliente se necessário
    if (!client.pupPage) {
      await client.initialize();
    }

    // Verificar se já tem QR Code armazenado
    const storedQR = clients.get(`${instanceId}_qr`);
    if (storedQR) {
      return res.json({ success: true, qrCode: storedQR });
    }

    // Aguardar QR Code (máximo 40 segundos)
    const qrCode = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout ao gerar QR Code. Tente novamente.'));
      }, 40000);

      // Se já tem um QR Code armazenado, usar ele
      const storedQR = clients.get(`${instanceId}_qr`);
      if (storedQR) {
        clearTimeout(timeout);
        resolve(storedQR);
        return;
      }

      // Listener para novo QR Code
      const qrHandler = async (qr) => {
        try {
          clearTimeout(timeout);
          client.removeListener('qr', qrHandler);
          const qrCodeBase64 = await qrcode.toDataURL(qr);
          clients.set(`${instanceId}_qr`, qrCodeBase64);
          resolve(qrCodeBase64);
        } catch (error) {
          reject(error);
        }
      };

      client.on('qr', qrHandler);

      // Se cliente já está pronto, não precisa de QR
      if (client.info) {
        clearTimeout(timeout);
        client.removeListener('qr', qrHandler);
        resolve(null);
      }
    });

    res.json({ success: true, qrCode });
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro desconhecido ao gerar QR Code'
    });
  }
});

// Endpoint: Verificar status
app.get('/api/whatsapp/status/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const client = clients.get(instanceId);

    if (!client) {
      return res.json({
        success: true,
        status: 'disconnected',
        connected: false
      });
    }

    const info = client.info;
    const connected = info && info.wid;

    res.json({
      success: true,
      status: connected ? 'connected' : 'connecting',
      connected,
      phoneNumber: info?.wid?.user,
      phoneName: info?.pushname
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint: Desconectar
app.delete('/api/whatsapp/disconnect/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const client = clients.get(instanceId);

    if (client) {
      await client.logout();
      await client.destroy();
      clients.delete(instanceId);
      clients.delete(`${instanceId}_qr`);
      clients.delete(`${instanceId}_info`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao desconectar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint: Enviar mensagem
app.post('/api/whatsapp/send', async (req, res) => {
  try {
    const { instanceId, to, message } = req.body;

    if (!instanceId || !to || !message) {
      return res.status(400).json({
        success: false,
        error: 'instanceId, to e message são obrigatórios'
      });
    }

    const client = clients.get(instanceId);
    if (!client || !client.info) {
      return res.status(400).json({
        success: false,
        error: 'Cliente não conectado'
      });
    }

    // Formatar número (remover caracteres especiais)
    const number = to.replace(/\D/g, '');
    const chatId = `${number}@c.us`;

    const result = await client.sendMessage(chatId, message);

    res.json({
      success: true,
      messageId: result.id._serialized
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`);
  console.log(`📱 Endpoints disponíveis:`);
  console.log(`   GET  /api/whatsapp/qr/:instanceId`);
  console.log(`   GET  /api/whatsapp/status/:instanceId`);
  console.log(`   DELETE /api/whatsapp/disconnect/:instanceId`);
  console.log(`   POST /api/whatsapp/send`);
});

