/**
 * Sistema de Indicação (Referral)
 */

import { supabase } from "@/integrations/supabase/client";
import { rewardsService } from "./rewards";

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: 'pending' | 'completed' | 'rewarded';
  referrer_points_earned: number;
  referred_points_earned: number;
  first_order_id?: string;
  completed_at?: string;
  created_at: string;
}

export interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalPointsEarned: number;
  totalPointsGiven: number;
}

class ReferralService {
  /**
   * Criar código de indicação para um cliente (se não existir)
   */
  async generateReferralCode(customerId: string): Promise<string> {
    try {
      // Verificar se já tem código
      const { data: customer, error } = await supabase
        .from('customers')
        .select('referral_code')
        .eq('id', customerId)
        .single();

      if (error) {
        console.error('Erro ao buscar cliente:', error);
        throw error;
      }

      if (customer?.referral_code) {
        return customer.referral_code;
      }

      // Gerar novo código usando função do banco
      const { data: newCode, error: codeError } = await supabase
        .rpc('generate_referral_code');

      if (codeError || !newCode) {
        // Fallback: gerar código manualmente
        const code = this.generateRandomCode();
        
        // Atualizar cliente com código
        const { error: updateError } = await supabase
          .from('customers')
          .update({ referral_code: code })
          .eq('id', customerId);

        if (updateError) {
          throw updateError;
        }

        return code;
      }

      // Atualizar cliente com código gerado
      const { error: updateError } = await supabase
        .from('customers')
        .update({ referral_code: newCode })
        .eq('id', customerId);

      if (updateError) {
        throw updateError;
      }

      return newCode;
    } catch (error) {
      console.error('Erro ao gerar código de indicação:', error);
      throw error;
    }
  }

  /**
   * Gerar código aleatório (fallback)
   */
  private generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Registrar uma indicação
   */
  async registerReferral(
    referrerCode: string,
    referredCustomerId: string
  ): Promise<{ success: boolean; referralId?: string; error?: string }> {
    try {
      // Buscar cliente que indicou pelo código
      const { data: referrer, error: referrerError } = await supabase
        .from('customers')
        .select('id')
        .eq('referral_code', referrerCode)
        .single();

      if (referrerError || !referrer) {
        return {
          success: false,
          error: 'Código de indicação inválido'
        };
      }

      // Verificar se não está se auto-indicando
      if (referrer.id === referredCustomerId) {
        return {
          success: false,
          error: 'Você não pode se indicar'
        };
      }

      // Verificar se já existe indicação
      const { data: existing } = await supabase
        .from('customer_referrals')
        .select('id')
        .eq('referrer_id', referrer.id)
        .eq('referred_id', referredCustomerId)
        .single();

      if (existing) {
        return {
          success: false,
          error: 'Indicação já registrada'
        };
      }

      // Criar registro de indicação
      const { data: referral, error: referralError } = await supabase
        .from('customer_referrals')
        .insert({
          referrer_id: referrer.id,
          referred_id: referredCustomerId,
          status: 'pending',
        })
        .select()
        .single();

      if (referralError) {
        return {
          success: false,
          error: referralError.message
        };
      }

      // Atualizar cliente indicado com referrer
      await supabase
        .from('customers')
        .update({ referred_by: referrer.id })
        .eq('id', referredCustomerId);

      return {
        success: true,
        referralId: referral.id
      };
    } catch (error) {
      console.error('Erro ao registrar indicação:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Completar indicação (quando cliente indicado faz primeira compra)
   */
  async completeReferral(
    referredCustomerId: string,
    orderId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Buscar indicação pendente
      const { data: referral, error: referralError } = await supabase
        .from('customer_referrals')
        .select('*')
        .eq('referred_id', referredCustomerId)
        .eq('status', 'pending')
        .single();

      if (referralError || !referral) {
        // Não é erro crítico, apenas não há indicação
        return { success: true };
      }

      // Buscar regra de bônus de indicação
      const { data: rules, error: rulesError } = await supabase
        .from('reward_rules')
        .select('*')
        .eq('rule_type', 'referral_bonus')
        .eq('is_active', true)
        .single();

      if (rulesError) {
        console.error('Erro ao buscar regra de bônus:', rulesError);
        return { success: true }; // Não é crítico
      }

      const bonusPoints = (rules as any)?.points_per_unit || 100;

      // Dar pontos para quem indicou
      const referrerResult = await rewardsService.addPoints(
        referral.referrer_id,
        bonusPoints,
        `Bônus por indicação completada - Cliente ${referredCustomerId}`,
        orderId
      );

      // Dar pontos para quem foi indicado (bônus de boas-vindas)
      const referredResult = await rewardsService.addPoints(
        referredCustomerId,
        bonusPoints,
        `Bônus de boas-vindas por indicação`,
        orderId
      );

      if (!referrerResult.success || !referredResult.success) {
        console.error('Erro ao adicionar pontos de indicação');
      }

      // Atualizar status da indicação
      const { error: updateError } = await supabase
        .from('customer_referrals')
        .update({
          status: 'completed',
          referrer_points_earned: bonusPoints,
          referred_points_earned: bonusPoints,
          first_order_id: orderId,
          completed_at: new Date().toISOString(),
        })
        .eq('id', referral.id);

      if (updateError) {
        console.error('Erro ao atualizar indicação:', updateError);
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao completar indicação:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Obter estatísticas de indicação de um cliente
   */
  async getReferralStats(customerId: string): Promise<ReferralStats> {
    try {
      const { data: referrals, error } = await supabase
        .from('customer_referrals')
        .select('*')
        .eq('referrer_id', customerId);

      if (error || !referrals) {
        return {
          totalReferrals: 0,
          completedReferrals: 0,
          pendingReferrals: 0,
          totalPointsEarned: 0,
          totalPointsGiven: 0,
        };
      }

      const completed = referrals.filter(r => r.status === 'completed');
      const pending = referrals.filter(r => r.status === 'pending');

      const totalPointsEarned = completed.reduce((sum, r) => 
        sum + Number(r.referrer_points_earned || 0), 0
      );

      const totalPointsGiven = completed.reduce((sum, r) => 
        sum + Number(r.referred_points_earned || 0), 0
      );

      return {
        totalReferrals: referrals.length,
        completedReferrals: completed.length,
        pendingReferrals: pending.length,
        totalPointsEarned,
        totalPointsGiven,
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return {
        totalReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        totalPointsEarned: 0,
        totalPointsGiven: 0,
      };
    }
  }

  /**
   * Obter lista de indicações de um cliente
   */
  async getReferrals(customerId: string): Promise<Referral[]> {
    try {
      const { data: referrals, error } = await supabase
        .from('customer_referrals')
        .select(`
          *,
          referred:customers!customer_referrals_referred_id_fkey(
            id,
            name,
            email,
            phone,
            created_at
          )
        `)
        .eq('referrer_id', customerId)
        .order('created_at', { ascending: false });

      if (error || !referrals) {
        return [];
      }

      return referrals as Referral[];
    } catch (error) {
      console.error('Erro ao buscar indicações:', error);
      return [];
    }
  }
}

export const referralService = new ReferralService();

