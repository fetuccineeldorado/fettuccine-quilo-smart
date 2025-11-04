import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 10;
const DELAY_BETWEEN_BATCHES = 2000;
const DELAY_BETWEEN_MESSAGES = 500;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const formatPhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned.startsWith('55') && cleaned.length <= 11) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { campaignId, messageContent, media } = await req.json();

    console.log('Iniciando envio de campanha:', campaignId);

    // 1. Buscar campanha
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('promotion_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campanha não encontrada');
    }

    // 2. Buscar mídia da promoção se não fornecida
    let finalMedia = media;
    if (!finalMedia && campaign.promotion_id) {
      const { data: promotion } = await supabaseClient
        .from('promotions')
        .select('media_url, media_type, media_filename, media_mime_type')
        .eq('id', campaign.promotion_id)
        .maybeSingle();

      if (promotion && promotion.media_url && promotion.media_type) {
        finalMedia = {
          url: promotion.media_url,
          type: promotion.media_type as 'image' | 'video' | 'audio',
          mimeType: promotion.media_mime_type,
          filename: promotion.media_filename,
        };
      }
    }

    // 3. Buscar conexão WhatsApp ativa
    const { data: connection, error: connError } = await supabaseClient
      .from('whatsapp_connections')
      .select('*')
      .eq('status', 'connected')
      .order('last_connected_at', { ascending: false })
      .limit(1)
      .single();

    if (connError || !connection) {
      throw new Error('Nenhuma conexão WhatsApp ativa');
    }

    // 4. Atualizar status da campanha para "sending"
    await supabaseClient
      .from('promotion_campaigns')
      .update({
        status: 'sending',
        started_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    // 5. Buscar destinatários pendentes
    const { data: recipients, error: recipientsError } = await supabaseClient
      .from('campaign_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('message_status', 'pending');

    if (recipientsError || !recipients || recipients.length === 0) {
      throw new Error('Nenhum destinatário encontrado');
    }

    console.log(`Enviando para ${recipients.length} destinatários`);

    let sentCount = 0;
    let failedCount = 0;
    const backendUrl = connection.api_url || 'http://localhost:3001';

    // 6. Enviar em batches
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (recipient) => {
        try {
          await delay(DELAY_BETWEEN_MESSAGES);

          const formattedNumber = formatPhoneNumber(recipient.whatsapp_number);

          const response = await fetch(`${backendUrl}/api/whatsapp/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              instanceId: connection.instance_id,
              to: formattedNumber,
              message: messageContent,
              mediaUrl: finalMedia?.url,
              mediaType: finalMedia?.type,
              mediaMimeType: finalMedia?.mimeType,
              mediaFilename: finalMedia?.filename,
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            await supabaseClient
              .from('campaign_recipients')
              .update({
                message_status: 'sent',
                sent_at: new Date().toISOString(),
              })
              .eq('id', recipient.id);

            sentCount++;
            console.log(`✓ Enviado para ${formattedNumber}`);
          } else {
            throw new Error(data.error || 'Erro ao enviar');
          }
        } catch (error) {
          await supabaseClient
            .from('campaign_recipients')
            .update({
              message_status: 'failed',
              error_message: error instanceof Error ? error.message : 'Erro desconhecido',
            })
            .eq('id', recipient.id);

          failedCount++;
          console.error(`✗ Falha para ${recipient.whatsapp_number}:`, error);
        }
      });

      await Promise.all(batchPromises);

      // Delay entre batches
      if (i + BATCH_SIZE < recipients.length) {
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }

    // 7. Atualizar estatísticas da campanha
    await supabaseClient
      .from('promotion_campaigns')
      .update({
        status: 'completed',
        sent_count: sentCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    console.log(`Campanha concluída: ${sentCount} enviados, ${failedCount} falhas`);

    return new Response(
      JSON.stringify({
        success: true,
        totalSent: sentCount,
        totalFailed: failedCount,
        message: `Campanha enviada com sucesso! ${sentCount} mensagens enviadas, ${failedCount} falhas.`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro ao enviar campanha:', error);

    // Marcar campanha como falha
    const { campaignId } = await req.json().catch(() => ({}));
    if (campaignId) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      
      await supabaseClient
        .from('promotion_campaigns')
        .update({ status: 'failed' })
        .eq('id', campaignId);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
