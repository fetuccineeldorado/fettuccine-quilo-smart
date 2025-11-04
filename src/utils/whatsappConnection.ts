/**
 * Utilitário para Gerenciar Conexão WhatsApp via QR Code
 */

import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppConnection {
  id: string;
  instance_id: string;
  instance_name?: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  qr_code?: string;
  qr_code_expires_at?: string;
  phone_number?: string;
  phone_name?: string;
  provider: 'evolution' | 'whatsapp-business' | 'custom';
  api_url?: string;
  api_key?: string;
  last_connected_at?: string;
  error_message?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface QRCodeResponse {
  qrCode: string;
  expiresAt: Date;
  instanceId: string;
}

class WhatsAppConnectionService {
  /**
   * Criar ou atualizar conexão WhatsApp
   */
  async createConnection(
    instanceId: string,
    instanceName: string,
    provider: 'evolution' | 'whatsapp-business' | 'custom',
    apiUrl: string,
    apiKey: string
  ): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Verificar se a tabela existe
      const { error: tableError } = await supabase
        .from('whatsapp_connections')
        .select('id')
        .limit(1);

      if (tableError) {
        if (tableError.code === 'PGRST205' || tableError.message?.includes('Could not find the table')) {
          return {
            success: false,
            error: 'Tabela whatsapp_connections não existe. Por favor, aplique a migração SQL: supabase/migrations/20250101000004_create_whatsapp_connection.sql'
          };
        }
        throw tableError;
      }

      // Verificar se já existe conexão
      const { data: existing } = await supabase
        .from('whatsapp_connections')
        .select('id')
        .eq('instance_id', instanceId)
        .maybeSingle();

      let connectionId: string;

      if (existing) {
        // Atualizar conexão existente
        const { data, error } = await supabase
          .from('whatsapp_connections')
          .update({
            instance_name: instanceName,
            provider,
            api_url: apiUrl,
            api_key: apiKey,
            status: 'disconnected',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        connectionId = data.id;
      } else {
        // Criar nova conexão
        const { data, error } = await supabase
          .from('whatsapp_connections')
          .insert({
            instance_id: instanceId,
            instance_name: instanceName,
            provider,
            api_url: apiUrl,
            api_key: apiKey,
            status: 'disconnected',
            created_by: session.user.id,
          })
          .select()
          .single();

        if (error) throw error;
        connectionId = data.id;
      }

      return { success: true, connectionId };
    } catch (error: any) {
      console.error('Erro ao criar conexão:', error);
      return {
        success: false,
        error: error.message || 'Erro ao criar conexão'
      };
    }
  }

  /**
   * Gerar QR Code para conexão (WhatsApp Web.js)
   */
  async generateQRCode(instanceId: string, apiUrl: string, apiKey: string): Promise<{ success: boolean; qrCode?: string; expiresAt?: Date; error?: string }> {
    try {
      // Usar servidor backend local ou configurado
      const backendUrl = apiUrl || 'http://localhost:3001';
      const url = `${backendUrl}/api/whatsapp/qr/${instanceId}`;
      
      const response = await fetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.qrCode) {
        throw new Error('QR Code não encontrado na resposta');
      }

      // QR Code já vem em base64 do servidor
      const qrCode = data.qrCode;

      // Expiração padrão: 40 segundos (tempo típico do WhatsApp Web)
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + 40);

      // Atualizar status no banco
      await this.updateConnectionStatus(instanceId, 'connecting', qrCode, expiresAt);

      return {
        success: true,
        qrCode,
        expiresAt
      };
    } catch (error: any) {
      console.error('Erro ao gerar QR Code:', error);
      return {
        success: false,
        error: error.message || 'Erro ao gerar QR Code. Verifique se o servidor backend está rodando.'
      };
    }
  }

  /**
   * Verificar status da conexão (WhatsApp Web.js)
   */
  async checkConnectionStatus(instanceId: string, apiUrl: string, apiKey: string): Promise<{ success: boolean; status?: string; phoneNumber?: string; phoneName?: string; error?: string }> {
    try {
      const backendUrl = apiUrl || 'http://localhost:3001';
      const url = `${backendUrl}/api/whatsapp/status/${instanceId}`;
      
      const response = await fetch(url, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao verificar status');
      }

      let status: WhatsAppConnection['status'] = data.connected ? 'connected' : 'disconnected';
      const phoneNumber = data.phoneNumber;
      const phoneName = data.phoneName;

      // Se está conectando mas ainda não tem info, manter como connecting
      if (!data.connected && status === 'disconnected') {
        // Verificar se há QR Code ativo (então está conectando)
        const { data: connection } = await supabase
          .from('whatsapp_connections')
          .select('qr_code, qr_code_expires_at')
          .eq('instance_id', instanceId)
          .single();

        if (connection?.qr_code && connection.qr_code_expires_at) {
          const expiresAt = new Date(connection.qr_code_expires_at);
          if (expiresAt > new Date()) {
            status = 'connecting';
          }
        }
      }

      // Atualizar status no banco
      await supabase
        .from('whatsapp_connections')
        .update({
          status,
          phone_number: phoneNumber,
          phone_name: phoneName,
          last_connected_at: status === 'connected' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('instance_id', instanceId);

      return {
        success: true,
        status,
        phoneNumber,
        phoneName
      };
    } catch (error: any) {
      console.error('Erro ao verificar status:', error);
      return {
        success: false,
        error: error.message || 'Erro ao verificar status'
      };
    }
  }

  /**
   * Desconectar instância (WhatsApp Web.js)
   */
  async disconnect(instanceId: string, apiUrl: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const backendUrl = apiUrl || 'http://localhost:3001';
      const url = `${backendUrl}/api/whatsapp/disconnect/${instanceId}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 404) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      // Atualizar status no banco
      await this.updateConnectionStatus(instanceId, 'disconnected');

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao desconectar:', error);
      return {
        success: false,
        error: error.message || 'Erro ao desconectar'
      };
    }
  }

  /**
   * Buscar conexão atual
   */
  async getCurrentConnection(): Promise<WhatsAppConnection | null> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('status', 'connected')
        .order('last_connected_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return data as WhatsAppConnection;
    } catch (error) {
      console.error('Erro ao buscar conexão:', error);
      return null;
    }
  }

  /**
   * Buscar todas as conexões
   */
  async getAllConnections(): Promise<WhatsAppConnection[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Se a tabela não existe, retornar array vazio
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          console.warn('Tabela whatsapp_connections não existe. Aplique a migração SQL.');
          return [];
        }
        throw error;
      }

      return (data || []) as WhatsAppConnection[];
    } catch (error) {
      console.error('Erro ao buscar conexões:', error);
      return [];
    }
  }

  /**
   * Atualizar status da conexão no banco
   */
  private async updateConnectionStatus(
    instanceId: string,
    status: WhatsAppConnection['status'],
    qrCode?: string,
    expiresAt?: Date,
    errorMessage?: string
  ): Promise<void> {
    try {
      await supabase
        .from('whatsapp_connections')
        .update({
          status,
          qr_code: qrCode || null,
          qr_code_expires_at: expiresAt?.toISOString() || null,
          error_message: errorMessage || null,
          updated_at: new Date().toISOString(),
        })
        .eq('instance_id', instanceId);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  }
}

export const whatsappConnectionService = new WhatsAppConnectionService();

