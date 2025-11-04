/**
 * Servidor Backend para WhatsApp Web.js
 * Este servidor gerencia a conexão do WhatsApp via QR Code
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
// Usar a versão local da pasta zap ao invés do npm package
const { Client, LocalAuth } = require(path.join(__dirname, '../zap'));
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
    console.log(`📱 Solicitando QR Code para instância: ${instanceId}`);
    
    let client = clients.get(instanceId);

    // Se cliente já existe e está conectado, retornar info
    if (client && client.info) {
      console.log(`✅ Cliente ${instanceId} já está conectado`);
      return res.json({ 
        success: true, 
        qrCode: null,
        message: 'Cliente já está conectado',
        connected: true,
        phoneNumber: client.info.wid?.user,
        phoneName: client.info.pushname
      });
    }

    // Se cliente existe mas não está conectado, destruir e recriar
    if (client && !client.info) {
      console.log(`🔄 Cliente ${instanceId} existe mas não está conectado. Recriando...`);
      try {
        await client.destroy();
      } catch (e) {
        console.warn('Erro ao destruir cliente antigo:', e.message);
      }
      clients.delete(instanceId);
      clients.delete(`${instanceId}_qr`);
      clients.delete(`${instanceId}_info`);
    }

    // Criar novo cliente
    console.log(`🆕 Criando novo cliente para ${instanceId}`);
    client = createWhatsAppClient(instanceId);

    // Limpar QR Code antigo
    clients.delete(`${instanceId}_qr`);

    // Aguardar QR Code (máximo 60 segundos)
    const qrCode = await new Promise((resolve, reject) => {
      let qrReceived = false;
      const timeout = setTimeout(() => {
        if (!qrReceived) {
          client.removeAllListeners('qr');
          client.removeAllListeners('ready');
          reject(new Error('Timeout ao gerar QR Code. Aguarde e tente novamente.'));
        }
      }, 60000);

      // Listener para QR Code
      const qrHandler = async (qr) => {
        if (qrReceived) return;
        qrReceived = true;
        try {
          clearTimeout(timeout);
          console.log(`✅ QR Code recebido para ${instanceId}`);
          const qrCodeBase64 = await qrcode.toDataURL(qr);
          clients.set(`${instanceId}_qr`, qrCodeBase64);
          // Limpar após 60 segundos
          setTimeout(() => {
            clients.delete(`${instanceId}_qr`);
          }, 60000);
          client.removeListener('ready', readyHandler);
          resolve(qrCodeBase64);
        } catch (error) {
          client.removeListener('ready', readyHandler);
          reject(error);
        }
      };

      // Listener para quando cliente já está pronto (já conectado)
      const readyHandler = () => {
        if (qrReceived) return;
        qrReceived = true;
        clearTimeout(timeout);
        console.log(`✅ Cliente ${instanceId} já está pronto (conectado)`);
        client.removeListener('qr', qrHandler);
        resolve(null);
      };

      client.on('qr', qrHandler);
      client.on('ready', readyHandler);

      // Inicializar cliente
      console.log(`🚀 Inicializando cliente ${instanceId}...`);
      client.initialize().catch((err) => {
        console.error(`❌ Erro ao inicializar cliente ${instanceId}:`, err);
        if (!qrReceived) {
          qrReceived = true;
          clearTimeout(timeout);
          client.removeAllListeners('qr');
          client.removeAllListeners('ready');
          reject(new Error(`Erro ao inicializar cliente: ${err.message || 'Erro desconhecido'}`));
        }
      });
      
      // Timeout adicional para inicialização
      setTimeout(() => {
        if (!qrReceived && !client.pupPage) {
          console.warn(`⚠️ Cliente ${instanceId} ainda não inicializou após 10 segundos`);
        }
      }, 10000);
    });

    res.json({ success: true, qrCode });
  } catch (error) {
    console.error('❌ Erro ao gerar QR Code:', error);
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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp Web.js Backend',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /health',
      qrCode: 'GET /api/whatsapp/qr/:instanceId',
      status: 'GET /api/whatsapp/status/:instanceId',
      send: 'POST /api/whatsapp/send',
      disconnect: 'DELETE /api/whatsapp/disconnect/:instanceId'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor WhatsApp rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
  console.log(`📱 Endpoints disponíveis:`);
  console.log(`   GET  /`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/whatsapp/qr/:instanceId`);
  console.log(`   GET  /api/whatsapp/status/:instanceId`);
  console.log(`   DELETE /api/whatsapp/disconnect/:instanceId`);
  console.log(`   POST /api/whatsapp/send`);
});

