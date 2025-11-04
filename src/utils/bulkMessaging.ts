/**
 * Sistema de Disparo de Mensagens em Massa via WhatsApp
 */

import { supabase } from "@/integrations/supabase/client";
import { whatsappService, WhatsAppMessage } from "./whatsapp";

export interface PromotionCampaign {
  id: string;
  promotion_id: string;
  campaign_name: string;
  target_criteria: {
    tiers?: string[];
    minPoints?: number;
    maxPoints?: number;
    minTotalSpent?: number;
    maxTotalSpent?: number;
    lastOrderDays?: number; // Clientes que compraram nos últimos X dias
    hasWhatsApp?: boolean;
    isActive?: boolean;
    specificCustomers?: string[]; // IDs específicos de clientes
  };
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed';
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  customer_id: string;
  whatsapp_number: string;
  message_status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
}

export interface SendResult {
  success: boolean;
  totalSent: number;
  totalFailed: number;
  errors: string[];
}

class BulkMessagingService {
  private readonly BATCH_SIZE = 10; // Enviar 10 mensagens por vez
  private readonly DELAY_BETWEEN_BATCHES = 2000; // 2 segundos entre batches
  private readonly DELAY_BETWEEN_MESSAGES = 500; // 500ms entre mensagens individuais

  /**
   * Selecionar clientes baseado nos critérios
   */
  async selectRecipients(criteria: PromotionCampaign['target_criteria']): Promise<string[]> {
    try {
      // Se há clientes específicos, retornar apenas eles
      if (criteria.specificCustomers && criteria.specificCustomers.length > 0) {
        // Buscar clientes selecionados usando apenas campos básicos
        const { data: customers, error } = await supabase
          .from('customers')
          .select('id, phone')
          .in('id', criteria.specificCustomers);

        if (error) throw error;

        // Retornar apenas IDs de clientes com telefone
        return (customers || [])
          .filter((c: any) => {
            const contact = c.whatsapp_number || c.phone;
            return contact && String(contact).trim() !== '';
          })
          .map(c => c.id);
      }

      // Caso contrário, aplicar filtros normais (sem campos que podem não existir)
      let query = supabase
        .from('customers')
        .select('id, phone, tier, total_spent');

      // Filtrar por tier
      if (criteria.tiers && criteria.tiers.length > 0) {
        query = query.in('tier', criteria.tiers);
      }

      // Filtrar por pontos
      if (criteria.minPoints !== undefined) {
        query = query.gte('points', criteria.minPoints);
      }
      if (criteria.maxPoints !== undefined) {
        query = query.lte('points', criteria.maxPoints);
      }

      // Filtrar por total gasto
      if (criteria.minTotalSpent !== undefined) {
        query = query.gte('total_spent', criteria.minTotalSpent);
      }
      if (criteria.maxTotalSpent !== undefined) {
        query = query.lte('total_spent', criteria.maxTotalSpent);
      }

      const { data: customers, error } = await query;

      if (error) throw error;

      if (!customers || customers.length === 0) {
        return [];
      }

      // Filtrar no cliente: apenas com telefone/WhatsApp
      let customerIds = customers
        .filter((c: any) => {
          const contact = c.whatsapp_number || c.phone;
          return contact && String(contact).trim() !== '';
        })
        .map(c => c.id);

      // Filtrar por última compra se necessário
      if (criteria.lastOrderDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - criteria.lastOrderDays);

        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('customer_id')
          .eq('status', 'closed')
          .gte('closed_at', cutoffDate.toISOString());

        if (!ordersError && ordersData) {
          const recentCustomerIds = new Set(
            ordersData
              .map(o => o.customer_id)
              .filter(id => id !== null)
          );
          customerIds = customerIds.filter(id => recentCustomerIds.has(id));
        }
      }

      return customerIds;
    } catch (error) {
      console.error('Erro ao selecionar destinatários:', error);
      return [];
    }
  }

  /**
   * Criar campanha de promoção
   */
  async createCampaign(
    promotionId: string,
    campaignName: string,
    criteria: PromotionCampaign['target_criteria'],
    scheduledAt?: string
  ): Promise<{ success: boolean; campaignId?: string; error?: string }> {
    try {
      // Selecionar destinatários
      const recipientIds = await this.selectRecipients(criteria);

      if (recipientIds.length === 0) {
        return {
          success: false,
          error: 'Nenhum cliente encontrado com os critérios especificados'
        };
      }

      // Buscar sessão do usuário
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return {
          success: false,
          error: 'Usuário não autenticado'
        };
      }

      // Criar campanha
      const { data: campaign, error: campaignError } = await supabase
        .from('promotion_campaigns')
        .insert({
          promotion_id: promotionId,
          campaign_name: campaignName,
          target_criteria: criteria,
          total_recipients: recipientIds.length,
          status: scheduledAt ? 'scheduled' : 'draft',
          scheduled_at: scheduledAt,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (campaignError || !campaign) {
        return {
          success: false,
          error: campaignError?.message || 'Erro ao criar campanha'
        };
      }

      // Buscar números de WhatsApp dos destinatários
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, whatsapp_number')
        .in('id', recipientIds)
        .not('whatsapp_number', 'is', null);

      if (customersError || !customers) {
        return {
          success: false,
          error: 'Erro ao buscar números de WhatsApp'
        };
      }

      // Criar registros de destinatários
      const recipients = customers.map(customer => ({
        campaign_id: campaign.id,
        customer_id: customer.id,
        whatsapp_number: customer.whatsapp_number!,
        message_status: 'pending' as const,
      }));

      const { error: recipientsError } = await supabase
        .from('campaign_recipients')
        .insert(recipients);

      if (recipientsError) {
        console.error('Erro ao criar destinatários:', recipientsError);
        // Não falha a campanha, apenas loga o erro
      }

      return {
        success: true,
        campaignId: campaign.id
      };
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Enviar campanha (disparo em massa)
   */
  async sendCampaign(
    campaignId: string,
    messageContent: string,
    onProgress?: (progress: { sent: number; total: number; failed: number }) => void
  ): Promise<SendResult> {
    try {
      // Buscar campanha
      const { data: campaign, error: campaignError } = await supabase
        .from('promotion_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        return {
          success: false,
          totalSent: 0,
          totalFailed: 0,
          errors: ['Campanha não encontrada']
        };
      }

      // Atualizar status para "sending"
      await supabase
        .from('promotion_campaigns')
        .update({
          status: 'sending',
          started_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      // Buscar destinatários pendentes
      const { data: recipients, error: recipientsError } = await supabase
        .from('campaign_recipients')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('message_status', 'pending');

      if (recipientsError || !recipients || recipients.length === 0) {
        return {
          success: false,
          totalSent: 0,
          totalFailed: 0,
          errors: ['Nenhum destinatário encontrado']
        };
      }

      let sentCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Enviar em batches para evitar rate limiting
      for (let i = 0; i < recipients.length; i += this.BATCH_SIZE) {
        const batch = recipients.slice(i, i + this.BATCH_SIZE);

        // Enviar mensagens do batch em paralelo
        const batchPromises = batch.map(async (recipient) => {
          try {
            const result = await whatsappService.sendMessage({
              to: recipient.whatsapp_number,
              message: messageContent,
            });

            if (result.success) {
              // Atualizar status
              await supabase
                .from('campaign_recipients')
                .update({
                  message_status: 'sent',
                  sent_at: new Date().toISOString(),
                })
                .eq('id', recipient.id);

              sentCount++;
              return { success: true };
            } else {
              // Marcar como falha
              await supabase
                .from('campaign_recipients')
                .update({
                  message_status: 'failed',
                  error_message: result.error || 'Erro desconhecido',
                })
                .eq('id', recipient.id);

              failedCount++;
              errors.push(`Cliente ${recipient.customer_id}: ${result.error}`);
              return { success: false, error: result.error };
            }
          } catch (error) {
            // Marcar como falha
            await supabase
              .from('campaign_recipients')
              .update({
                message_status: 'failed',
                error_message: error instanceof Error ? error.message : 'Erro desconhecido',
              })
              .eq('id', recipient.id);

            failedCount++;
            const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
            errors.push(`Cliente ${recipient.customer_id}: ${errorMsg}`);
            return { success: false, error: errorMsg };
          }
        });

        // Aguardar batch completar
        await Promise.all(batchPromises);

        // Delay entre batches
        if (i + this.BATCH_SIZE < recipients.length) {
          await this.delay(this.DELAY_BETWEEN_BATCHES);
        }

        // Atualizar progresso
        if (onProgress) {
          onProgress({
            sent: sentCount,
            total: recipients.length,
            failed: failedCount,
          });
        }
      }

      // Atualizar status da campanha
      await supabase
        .from('promotion_campaigns')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      return {
        success: true,
        totalSent: sentCount,
        totalFailed: failedCount,
        errors: errors.slice(0, 10), // Limitar a 10 erros no retorno
      };
    } catch (error) {
      console.error('Erro ao enviar campanha:', error);

      // Atualizar status para "failed"
      await supabase
        .from('promotion_campaigns')
        .update({
          status: 'failed',
        })
        .eq('id', campaignId);

      return {
        success: false,
        totalSent: 0,
        totalFailed: 0,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Agendar campanha
   */
  async scheduleCampaign(
    campaignId: string,
    scheduledAt: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('promotion_campaigns')
        .update({
          status: 'scheduled',
          scheduled_at: scheduledAt,
        })
        .eq('id', campaignId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Cancelar campanha
   */
  async cancelCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('promotion_campaigns')
        .update({
          status: 'cancelled',
        })
        .eq('id', campaignId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Buscar estatísticas da campanha
   */
  async getCampaignStats(campaignId: string): Promise<PromotionCampaign | null> {
    try {
      const { data, error } = await supabase
        .from('promotion_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as PromotionCampaign;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return null;
    }
  }

  /**
   * Helper para delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const bulkMessagingService = new BulkMessagingService();

