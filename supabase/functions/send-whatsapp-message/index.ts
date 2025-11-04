import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { customerId, message, templateType } = await req.json();

    console.log('Enviando mensagem WhatsApp:', { customerId, templateType });

    // 1. Buscar dados do cliente
    const { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      throw new Error('Cliente não encontrado');
    }

    if (!customer.whatsapp_number) {
      throw new Error('Cliente não possui número de WhatsApp cadastrado');
    }

    // 2. Buscar conexão WhatsApp ativa
    const { data: connection, error: connError } = await supabaseClient
      .from('whatsapp_connections')
      .select('*')
      .eq('status', 'connected')
      .order('last_connected_at', { ascending: false })
      .limit(1)
      .single();

    if (connError || !connection) {
      throw new Error('Nenhuma conexão WhatsApp ativa. Conecte primeiro em Configurações → WhatsApp');
    }

    // 3. Formatar número de telefone
    const formatPhoneNumber = (phone: string): string => {
      let cleaned = phone.replace(/\D/g, '');
      if (!cleaned.startsWith('55') && cleaned.length <= 11) {
        cleaned = '55' + cleaned;
      }
      return cleaned;
    };

    const formattedNumber = formatPhoneNumber(customer.whatsapp_number);

    // 4. Enviar mensagem via API do backend
    const backendUrl = connection.api_url || 'http://localhost:3001';
    
    const response = await fetch(`${backendUrl}/api/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceId: connection.instance_id,
        to: formattedNumber,
        message: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Erro ao enviar mensagem');
    }

    console.log('Mensagem enviada com sucesso:', data.messageId);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: data.messageId,
        customer: customer.name,
        phone: formattedNumber,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error);
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
