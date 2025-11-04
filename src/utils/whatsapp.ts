/**
 * Utilitário para integração com WhatsApp
 * Suporta múltiplas APIs: WhatsApp Business API, Evolution API, etc.
 */

export interface WhatsAppMessage {
  to: string; // Número no formato: 5511999999999 (sem + ou espaços)
  message: string;
  type?: 'text' | 'template' | 'media';
  templateName?: string;
  templateParams?: string[];
  mediaUrl?: string;
  mediaType?: 'image' | 'document';
}

export interface WhatsAppConfig {
  apiUrl: string;
  apiKey: string;
  instanceId?: string;
  provider: 'evolution' | 'whatsapp-business' | 'custom';
}

class WhatsAppService {
  private config: WhatsAppConfig | null = null;

  /**
   * Configurar o serviço de WhatsApp
   */
  configure(config: WhatsAppConfig) {
    this.config = config;
  }

  /**
   * Enviar mensagem de texto simples (WhatsApp Web.js)
   */
  async sendMessage(message: WhatsAppMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Buscar conexão ativa no Supabase
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: connection, error: connError } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('status', 'connected')
        .order('last_connected_at', { ascending: false })
        .limit(1)
        .single();

      if (connError || !connection) {
        return {
          success: false,
          error: 'Nenhuma conexão WhatsApp ativa. Conecte primeiro em Configurações → WhatsApp'
        };
      }

      const backendUrl = connection.api_url || 'http://localhost:3001';
      const formattedNumber = this.formatPhoneNumber(message.to);

      const response = await fetch(`${backendUrl}/api/whatsapp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceId: connection.instance_id,
          to: formattedNumber,
          message: message.message,
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

      return {
        success: true,
        messageId: data.messageId
      };
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Enviar mensagem via Evolution API
   */
  private async sendViaEvolution(
    to: string,
    message: WhatsAppMessage
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.config) return { success: false, error: 'Config não definido' };

    const url = `${this.config.apiUrl}/message/sendText/${this.config.instanceId || 'default'}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.config.apiKey,
      },
      body: JSON.stringify({
        number: to,
        text: message.message,
      }),
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
      return {
        success: true,
        messageId: data.key?.id || data.messageId,
      };
    }

    return {
      success: false,
      error: data.message || 'Erro ao enviar mensagem',
    };
  }

  /**
   * Enviar mensagem via WhatsApp Business API
   */
  private async sendViaWhatsAppBusiness(
    to: string,
    message: WhatsAppMessage
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.config) return { success: false, error: 'Config não definido' };

    const url = `${this.config.apiUrl}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message.message,
        },
      }),
    });

    const data = await response.json();

    if (response.ok && data.messages?.[0]?.id) {
      return {
        success: true,
        messageId: data.messages[0].id,
      };
    }

    return {
      success: false,
      error: data.error?.message || 'Erro ao enviar mensagem',
    };
  }

  /**
   * Enviar mensagem via API customizada
   */
  private async sendViaCustom(
    to: string,
    message: WhatsAppMessage
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.config) return { success: false, error: 'Config não definido' };

    const url = `${this.config.apiUrl}/send`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        to,
        message: message.message,
        type: message.type || 'text',
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        messageId: data.messageId || data.id,
      };
    }

    return {
      success: false,
      error: data.error || data.message || 'Erro ao enviar mensagem',
    };
  }

  /**
   * Enviar mensagem de boas-vindas para novo cliente
   */
  async sendWelcomeMessage(
    customerName: string,
    phone: string,
    referralCode?: string
  ): Promise<{ success: boolean; error?: string }> {
    const message = `Olá ${customerName}! 👋\n\n` +
      `Bem-vindo ao Fetuccine! 🍝\n\n` +
      `Seu cadastro foi realizado com sucesso.\n\n` +
      (referralCode 
        ? `Seu código de indicação: *${referralCode}*\n` +
          `Compartilhe com seus amigos e ganhe pontos! 🎁\n\n`
        : '') +
      `Estamos felizes em tê-lo conosco! 😊\n\n` +
      `Qualquer dúvida, estamos à disposição.`;

    return await this.sendMessage({
      to: phone,
      message,
    });
  }

  /**
   * Enviar notificação de pontos ganhos
   */
  async sendPointsNotification(
    customerName: string,
    phone: string,
    points: number,
    totalPoints: number,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    const message = `Olá ${customerName}! 🎉\n\n` +
      `Você ganhou *${points} pontos*! 🎁\n\n` +
      `Motivo: ${reason}\n\n` +
      `Seu saldo atual: *${totalPoints} pontos*\n\n` +
      `Continue comprando para ganhar mais pontos! 💰`;

    return await this.sendMessage({
      to: phone,
      message,
    });
  }

  /**
   * Enviar notificação de confirmação de pedido
   */
  async sendOrderConfirmation(
    customerName: string,
    phone: string,
    orderNumber: number,
    totalAmount: number,
    pointsEarned?: number
  ): Promise<{ success: boolean; error?: string }> {
    let message = `Olá ${customerName}! ✅\n\n` +
      `Seu pedido #${orderNumber} foi confirmado!\n\n` +
      `Valor total: R$ ${totalAmount.toFixed(2)}\n\n`;

    if (pointsEarned) {
      message += `Você ganhou *${pointsEarned} pontos* nesta compra! 🎁\n\n`;
    }

    message += `Obrigado pela preferência! 😊`;

    return await this.sendMessage({
      to: phone,
      message,
    });
  }

  /**
   * Enviar notificação de pontos expirando
   */
  async sendPointsExpiringWarning(
    customerName: string,
    phone: string,
    pointsExpiring: number,
    expirationDate: string
  ): Promise<{ success: boolean; error?: string }> {
    const message = `Olá ${customerName}! ⚠️\n\n` +
      `Atenção: Você tem *${pointsExpiring} pontos* expirando em ${expirationDate}!\n\n` +
      `Não perca seus pontos! Use-os antes que expirem. 🎁\n\n` +
      `Acesse nosso sistema para ver como resgatar.`;

    return await this.sendMessage({
      to: phone,
      message,
    });
  }

  /**
   * Enviar promoção personalizada
   */
  async sendPromotion(
    customerName: string,
    phone: string,
    promotionTitle: string,
    promotionDescription: string,
    validUntil?: string
  ): Promise<{ success: boolean; error?: string }> {
    let message = `Olá ${customerName}! 🎉\n\n` +
      `*${promotionTitle}*\n\n` +
      `${promotionDescription}\n\n`;

    if (validUntil) {
      message += `Válido até: ${validUntil}\n\n`;
    }

    message += `Não perca esta oportunidade! 😊`;

    return await this.sendMessage({
      to: phone,
      message,
    });
  }

  /**
   * Formatar número de telefone para WhatsApp
   * Remove caracteres especiais e adiciona código do país se necessário
   */
  private formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');

    // Se não começar com código do país (55 para Brasil), adiciona
    if (!cleaned.startsWith('55') && cleaned.length <= 11) {
      cleaned = '55' + cleaned;
    }

    return cleaned;
  }

  /**
   * Validar número de telefone
   */
  validatePhoneNumber(phone: string): boolean {
    const cleaned = this.formatPhoneNumber(phone);
    // Validação básica: deve ter pelo menos 10 dígitos (com código do país)
    return cleaned.length >= 12 && cleaned.length <= 15;
  }
}

// Instância singleton
export const whatsappService = new WhatsAppService();

/**
 * Função helper para configurar WhatsApp a partir de variáveis de ambiente
 */
export function configureWhatsAppFromEnv() {
  const apiUrl = import.meta.env.VITE_WHATSAPP_API_URL;
  const apiKey = import.meta.env.VITE_WHATSAPP_API_KEY;
  const instanceId = import.meta.env.VITE_WHATSAPP_INSTANCE_ID;
  const provider = (import.meta.env.VITE_WHATSAPP_PROVIDER || 'evolution') as 'evolution' | 'whatsapp-business' | 'custom';

  if (apiUrl && apiKey) {
    whatsappService.configure({
      apiUrl,
      apiKey,
      instanceId,
      provider,
    });
    console.log('✅ WhatsApp configurado com sucesso');
  } else {
    console.warn('⚠️ WhatsApp não configurado. Configure as variáveis de ambiente.');
  }
}

