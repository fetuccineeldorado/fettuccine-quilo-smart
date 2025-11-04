-- Migration: Adicionar suporte a mídia (imagem, vídeo, áudio) nas promoções
-- Execute este script no Supabase Dashboard > SQL Editor

-- ============================================
-- 1. ADICIONAR CAMPOS DE MÍDIA NA TABELA promotions
-- ============================================
DO $$ 
BEGIN
  -- URL da mídia (imagem, vídeo ou áudio)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promotions' AND column_name = 'media_url') THEN
    ALTER TABLE promotions ADD COLUMN media_url TEXT;
  END IF;

  -- Tipo de mídia (image, video, audio)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promotions' AND column_name = 'media_type') THEN
    ALTER TABLE promotions ADD COLUMN media_type VARCHAR(20) CHECK (media_type IN ('image', 'video', 'audio'));
  END IF;

  -- Nome do arquivo original
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promotions' AND column_name = 'media_filename') THEN
    ALTER TABLE promotions ADD COLUMN media_filename VARCHAR(255);
  END IF;

  -- Tamanho do arquivo em bytes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promotions' AND column_name = 'media_size') THEN
    ALTER TABLE promotions ADD COLUMN media_size BIGINT;
  END IF;

  -- MIME type do arquivo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promotions' AND column_name = 'media_mime_type') THEN
    ALTER TABLE promotions ADD COLUMN media_mime_type VARCHAR(100);
  END IF;
END $$;

-- ============================================
-- 2. CRIAR BUCKET DE STORAGE PARA PROMOÇÕES (se não existir)
-- ============================================
-- Nota: Este comando deve ser executado manualmente no Supabase Dashboard > Storage
-- ou via API. O bucket será criado automaticamente no primeiro upload.
-- Nome sugerido: 'promotions'

-- ============================================
-- 3. VERIFICAÇÃO
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promotions' AND column_name = 'media_url') THEN
    RAISE NOTICE '✅ Campos de mídia adicionados à tabela promotions!';
  END IF;
END $$;

