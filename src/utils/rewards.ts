/**
 * Sistema de Bonificação e Pontos
 */

import { supabase } from "@/integrations/supabase/client";

export interface RewardRule {
  id: string;
  rule_type: 'points_per_real' | 'points_per_order' | 'referral_bonus' | 'tier_bonus';
  tier?: string;
  points_per_unit: number;
  min_amount?: number;
  max_points_per_transaction?: number;
  is_active: boolean;
}

export interface PointsTransaction {
  id: string;
  customer_id: string;
  transaction_type: 'earned' | 'redeemed' | 'expired' | 'bonus' | 'referral';
  points: number;
  description?: string;
  order_id?: string;
  referral_customer_id?: string;
  expires_at?: string;
  created_at: string;
}

export interface CustomerPoints {
  customer_id: string;
  current_points: number;
  total_earned: number;
  total_redeemed: number;
  transactions: PointsTransaction[];
}

class RewardsService {
  /**
   * Calcular pontos baseado em valor gasto
   */
  async calculatePointsForOrder(
    customerId: string,
    orderAmount: number,
    customerTier: string = 'bronze'
  ): Promise<number> {
    try {
      // Buscar regra ativa de pontos por real
      const { data: rules, error } = await (supabase as any)
        .from('reward_rules')
        .select('*')
        .eq('rule_type', 'points_per_real')
        .eq('is_active', true)
        .or(`tier.is.null,tier.eq.${customerTier}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Erro ao buscar regras de pontos:', error);
        return 0;
      }

      if (!rules || rules.length === 0) {
        // Regra padrão: 1 ponto por R$ 1,00
        return Math.floor(orderAmount);
      }

      const rule = rules[0] as any;
      let points = orderAmount * rule.points_per_unit;

      // Aplicar bônus de tier se aplicável
      if (customerTier !== 'bronze') {
        const tierBonus = await this.getTierBonus(customerTier);
        if (tierBonus > 0) {
          points = points * (1 + tierBonus / 100);
        }
      }

      // Aplicar limite máximo se existir
      if (rule.max_points_per_transaction) {
        points = Math.min(points, rule.max_points_per_transaction);
      }

      return Math.floor(points);
    } catch (error) {
      console.error('Erro ao calcular pontos:', error);
      return 0;
    }
  }

  /**
   * Obter bônus de tier
   */
  async getTierBonus(tier: string): Promise<number> {
    try {
      const { data: rules, error } = await (supabase as any)
        .from('reward_rules')
        .select('*')
        .eq('rule_type', 'tier_bonus')
        .eq('tier', tier)
        .eq('is_active', true)
        .single();

      if (error || !rules) {
        // Valores padrão por tier
        const defaultBonuses: Record<string, number> = {
          silver: 10, // 10% de bônus
          gold: 20,   // 20% de bônus
          platinum: 30 // 30% de bônus
        };
        return defaultBonuses[tier] || 0;
      }

      return (rules as RewardRule).points_per_unit;
    } catch (error) {
      console.error('Erro ao buscar bônus de tier:', error);
      return 0;
    }
  }

  /**
   * Adicionar pontos a um cliente
   */
  async addPoints(
    customerId: string,
    points: number,
    description: string,
    orderId?: string,
    expiresInDays: number = 365
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { error } = await supabase
        .from('customer_points_transactions')
        .insert({
          customer_id: customerId,
          transaction_type: 'earned',
          points,
          description,
          order_id: orderId,
          expires_at: expiresAt.toISOString(),
        });

      if (error) {
        console.error('Erro ao adicionar pontos:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao adicionar pontos:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Resgatar pontos
   */
  async redeemPoints(
    customerId: string,
    points: number,
    redemptionType: 'discount' | 'free_item' | 'cash_back',
    description: string,
    orderId?: string
  ): Promise<{ success: boolean; redemptionId?: string; error?: string }> {
    try {
      // Verificar se cliente tem pontos suficientes
      const customerPoints = await this.getCustomerPoints(customerId);
      
      if (customerPoints.current_points < points) {
        return {
          success: false,
          error: 'Pontos insuficientes'
        };
      }

      // Criar transação de resgate
      const { data: transaction, error: transactionError } = await supabase
        .from('customer_points_transactions')
        .insert({
          customer_id: customerId,
          transaction_type: 'redeemed',
          points,
          description,
          order_id: orderId,
        })
        .select()
        .single();

      if (transactionError) {
        return {
          success: false,
          error: transactionError.message
        };
      }

      // Criar registro de resgate
      const discountAmount = this.calculateDiscountFromPoints(points);
      
      const { data: redemption, error: redemptionError } = await (supabase as any)
        .from('customer_redemptions')
        .insert({
          customer_id: customerId,
          redemption_type: redemptionType,
          points_used: points,
          discount_amount: discountAmount,
          order_id: orderId,
          description,
          status: 'approved',
        })
        .select()
        .single();

      if (redemptionError) {
        console.error('Erro ao criar resgate:', redemptionError);
        // Não falha, pois a transação já foi criada
      }

      return {
        success: true,
        redemptionId: redemption?.id
      };
    } catch (error) {
      console.error('Erro ao resgatar pontos:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Obter pontos do cliente
   */
  async getCustomerPoints(customerId: string): Promise<CustomerPoints> {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('points, total_points_earned, total_points_redeemed')
        .eq('id', customerId)
        .single();

      if (error || !customer) {
        return {
          customer_id: customerId,
          current_points: 0,
          total_earned: 0,
          total_redeemed: 0,
          transactions: []
        };
      }

      // Buscar transações recentes
      const { data: transactions } = await supabase
        .from('customer_points_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50);

      return {
        customer_id: customerId,
        current_points: Number(customer.points || 0),
        total_earned: Number(customer.total_points_earned || 0),
        total_redeemed: Number(customer.total_points_redeemed || 0),
        transactions: (transactions || []) as PointsTransaction[]
      };
    } catch (error) {
      console.error('Erro ao buscar pontos:', error);
      return {
        customer_id: customerId,
        current_points: 0,
        total_earned: 0,
        total_redeemed: 0,
        transactions: []
      };
    }
  }

  /**
   * Calcular desconto baseado em pontos
   * Regra: 100 pontos = R$ 1,00 de desconto
   */
  calculateDiscountFromPoints(points: number): number {
    return points / 100;
  }

  /**
   * Calcular pontos necessários para um desconto
   */
  calculatePointsForDiscount(discountAmount: number): number {
    return discountAmount * 100;
  }

  /**
   * Processar pontos de uma compra
   */
  async processOrderPoints(
    customerId: string,
    orderId: string,
    orderAmount: number,
    customerTier: string
  ): Promise<{ success: boolean; pointsEarned?: number; error?: string }> {
    try {
      const points = await this.calculatePointsForOrder(customerId, orderAmount, customerTier);
      
      if (points > 0) {
        const result = await this.addPoints(
          customerId,
          points,
          `Pontos ganhos na compra #${orderId}`,
          orderId
        );

        if (result.success) {
          return {
            success: true,
            pointsEarned: points
          };
        }

        return result;
      }

      return { success: true, pointsEarned: 0 };
    } catch (error) {
      console.error('Erro ao processar pontos da compra:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}

export const rewardsService = new RewardsService();

