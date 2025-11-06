/**
 * Sistema de Auto-Recuperação de Erros
 * Corrige automaticamente problemas comuns sem necessidade de intervenção manual
 */

import { supabase } from "@/integrations/supabase/client";
import { clearSettingsCache } from "@/utils/settingsCache";

export interface AutoFixResult {
  success: boolean;
  message: string;
  action?: string;
}

/**
 * Tenta corrigir automaticamente erros de RLS (Row Level Security)
 */
export async function autoFixRLS(tableName: string): Promise<AutoFixResult> {
  try {
    // Tentar criar políticas RLS básicas via função stored procedure
    // Se não existir, pelo menos logar o que precisa ser feito
    console.log(`🔄 Tentando auto-corrigir RLS para tabela: ${tableName}`);
    
    // Por enquanto, retornamos instruções claras
    // Em produção, poderia chamar uma Edge Function do Supabase
    return {
      success: false,
      message: `Políticas RLS precisam ser criadas para a tabela ${tableName}`,
      action: `Execute o script de correção RLS no Supabase SQL Editor`
    };
  } catch (error) {
    return {
      success: false,
      message: `Erro ao tentar auto-corrigir RLS: ${error}`,
    };
  }
}

/**
 * Verifica e cria configurações padrão se não existirem
 */
export async function ensureSystemSettings(): Promise<AutoFixResult> {
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return {
        success: false,
        message: `Erro ao verificar configurações: ${error.message}`,
      };
    }

    // Se não existir, criar automaticamente
    if (!data) {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data: newSettings, error: createError } = await supabase
        .from("system_settings")
        .insert([{
          price_per_kg: 59.90,
          minimum_charge: 5.00,
          maximum_weight: 2.00,
          updated_by: session?.user?.id || null,
        }])
        .select()
        .single();

      if (createError) {
        return {
          success: false,
          message: `Erro ao criar configurações: ${createError.message}`,
        };
      }

      return {
        success: true,
        message: "Configurações padrão criadas automaticamente",
      };
    }

    return {
      success: true,
      message: "Configurações já existem",
    };
  } catch (error) {
    return {
      success: false,
      message: `Erro inesperado: ${error}`,
    };
  }
}

/**
 * Limpa cache e força recarregamento
 */
export function forceRefreshCache(): void {
  // Limpar cache de configurações
  if (typeof window !== 'undefined' && (window as any).clearAllCache) {
    (window as any).clearAllCache();
  }
  
  // Limpar localStorage
  try {
    localStorage.removeItem('settings_cache');
    localStorage.removeItem('price_per_kg');
  } catch (e) {
    console.warn('Erro ao limpar localStorage:', e);
  }
  
  // Forçar reload após um delay
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

/**
 * Verifica e corrige automaticamente o preço por kg
 */
export async function autoFixPricePerKg(): Promise<AutoFixResult> {
  try {
    // Verificar valor atual
    const { data, error } = await supabase
      .from("system_settings")
      .select("id, price_per_kg")
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        message: `Erro ao verificar preço: ${error.message}`,
      };
    }

    if (!data) {
      // Criar configurações se não existir
      const result = await ensureSystemSettings();
      return result;
    }

    // Verificar se precisa atualizar (sempre forçar para 59.90)
    const currentPrice = Number(data.price_per_kg || 0);
    const targetPrice = 59.90;

    // Sempre atualizar se não for exatamente 59.90
    if (currentPrice !== targetPrice) {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error: updateError } = await supabase
        .from("system_settings")
        .update({
          price_per_kg: targetPrice,
          updated_by: session?.user?.id || null,
        })
        .eq("id", data.id);

      if (updateError) {
        return {
          success: false,
          message: `Erro ao atualizar preço: ${updateError.message}`,
        };
      }

      // Limpar cache sem recarregar a página
      clearSettingsCache();

      return {
        success: true,
        message: `Preço atualizado automaticamente de R$ ${currentPrice.toFixed(2)} para R$ ${targetPrice.toFixed(2)}`,
      };
    }

    return {
      success: true,
      message: `Preço já está correto: R$ ${currentPrice.toFixed(2)}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Erro inesperado: ${error}`,
    };
  }
}

/**
 * Sistema de auto-recuperação geral
 */
export async function autoRecover(error: any, context: string): Promise<AutoFixResult | null> {
  if (!error) return null;

  const errorCode = error.code;
  const errorMessage = error.message || String(error);

  // Erro de tabela não encontrada
  if (errorCode === 'PGRST205' || errorMessage.includes('Could not find the table')) {
    return {
      success: false,
      message: `Tabela não encontrada. Execute o script SQL apropriado no Supabase.`,
      action: `Verifique se a tabela existe no banco de dados`,
    };
  }

  // Erro de permissão (RLS)
  if (errorCode === 'PGRST301' || errorCode === '42501' || errorMessage.includes('permission denied')) {
    const result = await autoFixRLS(context);
    return result;
  }

  // Erro de configurações não encontradas
  if (errorCode === 'PGRST116' && context.includes('system_settings')) {
    const result = await ensureSystemSettings();
    return result;
  }

  return null;
}

