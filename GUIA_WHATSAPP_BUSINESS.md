# 📱 Guia Completo: Conectar WhatsApp Business

## ✅ STATUS ATUAL
- ✅ Servidor backend rodando na porta 3001
- ✅ Código instalado e funcionando
- ⏳ Aguardando configuração e conexão do WhatsApp

---

## 🚀 PASSO 1: Verificar se a Tabela Existe no Supabase

### 1.1 Acesse o Supabase
1. Abra: https://app.supabase.com
2. Faça login
3. Selecione seu projeto: `fettuccine-quilo-smart`

### 1.2 Aplicar a Migração SQL
1. No menu lateral, clique em **SQL Editor**
2. Clique em **New Query**
3. Cole este SQL:

```sql
-- =====================================================
-- SISTEMA DE CONEXÃO WHATSAPP VIA QR CODE
-- =====================================================

-- 1. Criar tabela de conexões WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id VARCHAR(100) UNIQUE NOT NULL,
  instance_name VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected', 'error')),
  qr_code TEXT,
  qr_code_expires_at TIMESTAMP WITH TIME ZONE,
  phone_number VARCHAR(20),
  phone_name VARCHAR(255),
  provider VARCHAR(50) NOT NULL DEFAULT 'evolution' CHECK (provider IN ('evolution', 'whatsapp-business', 'custom')),
  api_url VARCHAR(500),
  api_key VARCHAR(500),
  last_connected_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_instance ON whatsapp_connections(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_status ON whatsapp_connections(status);

-- 3. Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_whatsapp_connections_updated_at ON whatsapp_connections;
CREATE TRIGGER update_whatsapp_connections_updated_at
  BEFORE UPDATE ON whatsapp_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Habilitar RLS
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS
DROP POLICY IF EXISTS "Authenticated users can view whatsapp connections" ON whatsapp_connections;
CREATE POLICY "Authenticated users can view whatsapp connections"
  ON whatsapp_connections FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create whatsapp connections" ON whatsapp_connections;
CREATE POLICY "Authenticated users can create whatsapp connections"
  ON whatsapp_connections FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update whatsapp connections" ON whatsapp_connections;
CREATE POLICY "Authenticated users can update whatsapp connections"
  ON whatsapp_connections FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Managers and admins can delete whatsapp connections" ON whatsapp_connections;
CREATE POLICY "Managers and admins can delete whatsapp connections"
  ON whatsapp_connections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.id = ur.user_id
      WHERE p.id = auth.uid() 
      AND ur.role IN ('admin', 'manager')
    )
  );
```

4. Clique em **Run** (ou pressione Ctrl+Enter)
5. Aguarde a mensagem de sucesso

### 1.3 Verificar se a Tabela Foi Criada
Execute este SQL para testar:
```sql
SELECT * FROM whatsapp_connections LIMIT 1;
```

Se não houver erro, tudo certo! ✅

---

## 🎯 PASSO 2: Configurar WhatsApp no Sistema

### 2.1 Abra o Sistema
1. Acesse: http://localhost:8080
2. Faça login
3. Vá para **Configurações** no menu

### 2.2 Aba WhatsApp
1. Clique na aba **WhatsApp**
2. Clique em **Configurar Conexão**

### 2.3 Preencha os Dados
- **ID da Instância**: `default` (pode deixar assim)
- **Nome da Instância**: `WhatsApp Principal` (ou qualquer nome)
- **URL do Servidor Backend**: `http://localhost:3001`
- **Chave**: deixe em branco (não precisa)

4. Clique em **Salvar Configuração**

---

## 📱 PASSO 3: Escanear QR Code

### 3.1 Gerar QR Code
1. Após salvar a configuração, clique em **Conectar WhatsApp**
2. O sistema vai gerar um QR Code
3. **Aguarde alguns segundos** (pode levar até 60 segundos)

### 3.2 Escanear com o WhatsApp Business
1. Abra o **WhatsApp Business** no seu celular
2. Toque nos **3 pontinhos** (canto superior direito)
3. Vá em **Aparelhos Conectados**
4. Toque em **Conectar um Aparelho**
5. **Escaneie o QR Code** que apareceu na tela do sistema

### 3.3 Aguarde a Conexão
- O sistema vai detectar automaticamente a conexão
- Quando conectar, verá: ✅ **WhatsApp Conectado**
- Mostrará o nome e número do seu WhatsApp Business

---

## 🎉 PASSO 4: Testar o Envio de Mensagens

### 4.1 Acesse Clientes
1. Vá para **Clientes** no menu
2. Cadastre ou edite um cliente
3. Adicione o número de WhatsApp no formato: `5511999999999`
   - **Importante**: use DDD + número, sem espaços ou caracteres especiais

### 4.2 Enviar Mensagem de Teste
1. Clique no ícone do WhatsApp ao lado do cliente
2. Escolha uma opção (Boas-vindas, Pontos, etc)
3. A mensagem será enviada automaticamente!

---

## 🔍 DIAGNÓSTICO E SOLUÇÃO DE PROBLEMAS

### Problema 1: "Tabela não encontrada"
**Solução**: Execute o SQL do PASSO 1 no Supabase

### Problema 2: "Servidor não está respondendo"
**Solução**: 
```bash
cd server
npm start
```

### Problema 3: QR Code não aparece
**Solução**:
1. Verifique se o servidor está rodando
2. Limpe o cache do navegador (Ctrl+Shift+Delete)
3. Tente gerar novamente

### Problema 4: QR Code expirou
**Solução**: Clique em "Novo QR Code" e escaneie novamente

### Problema 5: Conexão caiu
**Solução**:
1. Clique em "Conectar WhatsApp" novamente
2. Escaneie o QR Code
3. A conexão será restabelecida

---

## 📊 FERRAMENTA DE DIAGNÓSTICO AUTOMÁTICO

O sistema possui uma ferramenta de diagnóstico automático:

1. Vá em **Configurações** → **WhatsApp**
2. Role até **Diagnóstico Automático**
3. Clique em **Executar Diagnóstico**

Ele vai verificar:
- ✅ Se a tabela existe no Supabase
- ✅ Se o servidor backend está rodando
- ✅ Se há conexão configurada
- ✅ Se consegue gerar QR Code

---

## 🔐 SEGURANÇA E BOAS PRÁTICAS

### ✅ O que o sistema FAZ:
- ✅ Conecta seu WhatsApp Business via QR Code
- ✅ Envia mensagens para clientes cadastrados
- ✅ Armazena conexão de forma segura
- ✅ Funciona como WhatsApp Web

### ❌ O que o sistema NÃO FAZ:
- ❌ Não acessa suas conversas privadas
- ❌ Não lê mensagens recebidas
- ❌ Não envia mensagens sem sua autorização
- ❌ Não compartilha seus dados

### 🔒 Segurança:
- Os dados da sessão ficam salvos localmente no servidor
- A conexão é criptografada (mesmo protocolo do WhatsApp Web)
- Você pode desconectar a qualquer momento

---

## 📞 DICAS IMPORTANTES

### ✅ FAÇA:
- ✅ Use WhatsApp Business (não o WhatsApp comum)
- ✅ Mantenha o servidor rodando enquanto usa o sistema
- ✅ Teste com seu próprio número primeiro
- ✅ Desconecte quando não estiver usando (por segurança)

### ❌ NÃO FAÇA:
- ❌ Não use para SPAM (pode banir sua conta)
- ❌ Não envie mensagens em massa sem consentimento
- ❌ Não compartilhe a sessão com terceiros
- ❌ Não feche o servidor enquanto estiver enviando mensagens

---

## 🆘 PRECISA DE AJUDA?

### Logs do Servidor
Para ver o que está acontecendo:
```bash
cd server
npm start
```
Observe os logs no terminal

### Logs do Navegador
1. Pressione F12
2. Vá na aba **Console**
3. Procure por erros (linhas em vermelho)

### Comandos Úteis
```bash
# Reinstalar dependências
cd server
npm install

# Iniciar servidor
npm start

# Verificar se a porta está em uso
Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet
```

---

## ✅ CHECKLIST DE SUCESSO

Marque conforme for completando:

- [ ] ✅ Tabela criada no Supabase
- [ ] ✅ Servidor backend rodando
- [ ] ✅ Conexão configurada no sistema
- [ ] ✅ QR Code gerado
- [ ] ✅ QR Code escaneado com WhatsApp Business
- [ ] ✅ Status mostra "Conectado"
- [ ] ✅ Mensagem de teste enviada com sucesso

---

## 🎯 RESULTADO FINAL

Quando tudo estiver funcionando, você verá:

```
✅ WhatsApp Conectado
Nome: [Seu Nome]
Número: [Seu Número]
Conectado em: [Data e Hora]
```

Agora você pode:
- ✅ Enviar mensagens de boas-vindas para novos clientes
- ✅ Notificar clientes sobre pontos acumulados
- ✅ Enviar promoções e ofertas
- ✅ Enviar mensagens personalizadas

**Parabéns! Seu WhatsApp Business está integrado ao sistema! 🎉**

