# Implementação de Upload e Envio de Mídia nas Promoções

## 📋 Resumo

Foi implementado suporte completo para upload e envio de imagens, vídeos e áudios nas campanhas de promoção em massa via WhatsApp.

## ✅ Funcionalidades Implementadas

### 1. **Componente de Upload de Mídia** (`MediaUpload.tsx`)

- Upload de imagens (JPG, PNG, GIF, WebP)
- Upload de vídeos (MP4, MPEG, QuickTime, WebM)
- Upload de áudios (MP3, WAV, OGG, WebM)
- Validação de tamanho (máx. 10MB configurável)
- Preview automático para imagens
- Upload automático para Supabase Storage
- Fallback para base64 se o bucket não existir
- Feedback visual de progresso

### 2. **Atualização do PromotionCreator**

- Campo de upload de mídia integrado
- Preview da mídia no diálogo de preview
- Suporte a mídia ao criar e enviar promoções
- Limpeza automática do formulário após envio

### 3. **Migração SQL** (`20250105000003_add_media_to_promotions.sql`)

Adiciona os seguintes campos à tabela `promotions`:
- `media_url` (TEXT) - URL da mídia no Supabase Storage
- `media_type` (VARCHAR) - Tipo: 'image', 'video' ou 'audio'
- `media_filename` (VARCHAR) - Nome original do arquivo
- `media_size` (BIGINT) - Tamanho em bytes
- `media_mime_type` (VARCHAR) - MIME type do arquivo

### 4. **Backend WhatsApp Server** (`whatsapp-server.js`)

- Suporte completo para envio de mídia via WhatsApp Web.js
- Processamento de base64 e URLs
- Download automático de mídia de URLs
- Envio de imagens com legenda
- Envio de vídeos com legenda
- Envio de áudios (com mensagem separada)
- Fallback para mensagem de texto em caso de erro

### 5. **Serviços de Envio**

- **`whatsapp.ts`**: Atualizado para suportar mídia
  - Conversão de arquivo para base64
  - Envio de mídia via URL ou base64
  - Suporte a MIME types e filenames

- **`bulkMessaging.ts`**: Atualizado para passar mídia nas campanhas
  - Parâmetro opcional de mídia em `sendCampaign`
  - Propagação de dados de mídia para o serviço WhatsApp

## 🚀 Como Usar

### 1. Aplicar Migração SQL

Execute o arquivo `supabase/migrations/20250105000003_add_media_to_promotions.sql` no Supabase SQL Editor.

### 2. Criar Bucket de Storage (Opcional)

No Supabase Dashboard → Storage:
1. Crie um bucket chamado `promotions`
2. Configure políticas públicas se necessário

**Nota**: Se o bucket não existir, o sistema usará base64 como fallback.

### 3. Criar Promoção com Mídia

1. Acesse a página de Promoções
2. Preencha os dados da promoção (título, mensagem)
3. **Clique em "Selecionar Arquivo"** no campo de Mídia
4. Escolha uma imagem, vídeo ou áudio (máx. 10MB)
5. Aguarde o upload concluir
6. Visualize o preview clicando em "Preview"
7. Selecione os destinatários
8. Clique em "Enviar Agora" ou "Criar Promoção"

### 4. Formatos Suportados

**Imagens:**
- JPG, JPEG, PNG, GIF, WebP

**Vídeos:**
- MP4, MPEG, QuickTime (.mov), WebM

**Áudios:**
- MP3, WAV, OGG, WebM

## 📝 Detalhes Técnicos

### Fluxo de Upload

1. **Seleção de Arquivo**: Usuário seleciona arquivo via input
2. **Validação**: Tamanho e tipo são validados
3. **Preview**: Imagens mostram preview imediato
4. **Upload**: Arquivo é enviado para Supabase Storage (`promotions` bucket)
5. **Armazenamento**: URL da mídia é salva na tabela `promotions`
6. **Fallback**: Se upload falhar, arquivo é mantido localmente para envio como base64

### Fluxo de Envio

1. **Campanha Criada**: Promoção com mídia é salva no banco
2. **Seleção de Destinatários**: Clientes são selecionados conforme critérios
3. **Envio em Batch**: Mensagens são enviadas em lotes de 10
4. **Processamento de Mídia**:
   - Se `mediaUrl` existe: baixa da URL usando `MessageMedia.fromUrl`
   - Se `mediaBase64` existe: converte de base64 para Buffer
   - Cria `MessageMedia` com MIME type e filename corretos
5. **Envio via WhatsApp**:
   - **Imagem**: Enviada com legenda (caption)
   - **Vídeo**: Enviado com legenda (caption)
   - **Áudio**: Enviado como áudio, mensagem enviada separadamente
6. **Registro de Status**: Cada envio é registrado na tabela `campaign_recipients`

## 🔧 Configuração

### Tamanho Máximo

O tamanho máximo padrão é **10MB**. Para alterar:

```tsx
<MediaUpload
  maxSizeMB={20} // Alterar para 20MB
  ...
/>
```

### Tipos Aceitos

Para restringir tipos de mídia:

```tsx
<MediaUpload
  acceptedTypes={['image']} // Apenas imagens
  acceptedTypes={['video']} // Apenas vídeos
  acceptedTypes={['audio']} // Apenas áudios
  ...
/>
```

## ⚠️ Limitações e Considerações

1. **Tamanho de Arquivo**: 
   - WhatsApp tem limites de tamanho (16MB para vídeos, 64MB para documentos)
   - O sistema limita a 10MB por padrão para garantir melhor performance

2. **Upload de Storage**:
   - Requer bucket `promotions` no Supabase Storage
   - Se não existir, usa base64 (mais lento para envios em massa)

3. **Envio em Massa**:
   - Mídias grandes podem aumentar o tempo de envio
   - Recomenda-se usar imagens otimizadas (compressão)

4. **Formato de Áudio**:
   - Áudios são enviados como áudio normal (não como voice note)
   - A mensagem de texto é enviada separadamente

## 🐛 Troubleshooting

### Erro: "Bucket não encontrado"
- **Solução**: Crie o bucket `promotions` no Supabase Storage
- **Alternativa**: O sistema usará base64 automaticamente

### Erro: "Arquivo muito grande"
- **Solução**: Reduza o tamanho do arquivo ou aumente `maxSizeMB`

### Erro: "Tipo de arquivo não suportado"
- **Solução**: Use formatos suportados (JPG, PNG, MP4, MP3, etc.)

### Mídia não aparece no WhatsApp
- **Verifique**: Se a conexão WhatsApp está ativa
- **Verifique**: Logs do backend para erros de processamento
- **Verifique**: Se a URL da mídia é acessível publicamente

### Upload lento
- **Causa**: Arquivos grandes ou conexão lenta
- **Solução**: Comprima imagens antes de fazer upload
- **Solução**: Use vídeos em resolução menor

## 📚 Arquivos Modificados

1. `src/components/MediaUpload.tsx` - **NOVO** - Componente de upload
2. `src/components/PromotionCreator.tsx` - Integração de mídia
3. `src/utils/whatsapp.ts` - Suporte a mídia no envio
4. `src/utils/bulkMessaging.ts` - Propagação de mídia nas campanhas
5. `server/whatsapp-server.js` - Processamento e envio de mídia
6. `supabase/migrations/20250105000003_add_media_to_promotions.sql` - **NOVO** - Migração SQL

## ✅ Checklist de Implementação

- [x] Componente de upload criado
- [x] Validação de arquivos implementada
- [x] Upload para Supabase Storage
- [x] Preview de mídia
- [x] Migração SQL criada
- [x] Backend atualizado para envio de mídia
- [x] Serviços de envio atualizados
- [x] Integração no PromotionCreator
- [x] Preview atualizado com mídia
- [ ] Testes de envio (pendente)

---

**Data de Implementação**: 2025-01-05
**Versão**: 1.0.0

