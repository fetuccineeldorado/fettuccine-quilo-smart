// Serviço de integração com Stone para processamento de pagamentos

interface StonePaymentRequest {
  amount: number; // valor em centavos
  paymentMethod: 'credit' | 'debit' | 'pix';
  orderId: string;
  customerName?: string;
}

interface StonePaymentResponse {
  success: boolean;
  transactionId?: string;
  status?: string;
  message?: string;
  error?: string;
}

interface StoneTransactionStatus {
  status: 'authorized' | 'paid' | 'cancelled' | 'refunded' | 'pending' | 'error';
  amount: number;
  paymentMethod: string;
  transactionId: string;
  createdAt: string;
  acquirerResponse?: string;
}

class StonePaymentService {
  private apiUrl: string;
  private environment: string;
  private merchantId: string;
  private terminalSerial: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_STONE_API_URL || 'https://api.stone.com.br';
    this.environment = import.meta.env.VITE_STONE_ENVIRONMENT || 'sandbox';
    this.merchantId = import.meta.env.VITE_STONE_MERCHANT_ID || '';
    this.terminalSerial = import.meta.env.VITE_STONE_TERMINAL_SERIAL || '';
  }

  /**
   * Processa um pagamento na máquina Stone
   */
  async processPayment(request: StonePaymentRequest): Promise<StonePaymentResponse> {
    try {
      console.log('🔄 Iniciando pagamento Stone:', request);

      // Validação das credenciais
      if (!this.merchantId || !this.terminalSerial) {
        throw new Error('Credenciais Stone não configuradas. Configure VITE_STONE_MERCHANT_ID e VITE_STONE_TERMINAL_SERIAL');
      }

      // Converter valor para centavos (API da Stone trabalha com centavos)
      const amountInCents = Math.round(request.amount * 100);

      // Simulação de chamada à API Stone (em ambiente real, seria uma chamada HTTP)
      if (this.environment === 'sandbox') {
        return await this.simulatePayment(request, amountInCents);
      }

      // Em produção, faria a chamada real à API
      const response = await this.makeRealPayment(request, amountInCents);
      return response;

    } catch (error) {
      console.error('❌ Erro no pagamento Stone:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido no pagamento'
      };
    }
  }

  /**
   * Simula pagamento em ambiente de sandbox
   */
  private async simulatePayment(request: StonePaymentRequest, amountInCents: number): Promise<StonePaymentResponse> {
    console.log('🧪 Simulando pagamento Stone (sandbox)');

    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simular成功率 de 90%
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      const transactionId = `STN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        transactionId,
        status: 'authorized',
        message: `Pagamento de R$ ${request.amount.toFixed(2)} autorizado com sucesso via ${request.paymentMethod}`
      };
    } else {
      return {
        success: false,
        error: 'Transação negada pelo banco emissor'
      };
    }
  }

  /**
   * Faz chamada real à API Stone (produção)
   */
  private async makeRealPayment(request: StonePaymentRequest, amountInCents: number): Promise<StonePaymentResponse> {
    // Esta é uma implementação exemplo. Em produção, você usaria a SDK oficial da Stone
    // ou faria chamadas HTTP diretas à API
    
    const payload = {
      merchantId: this.merchantId,
      terminalSerial: this.terminalSerial,
      amount: amountInCents,
      paymentMethod: request.paymentMethod,
      orderId: request.orderId,
      customerName: request.customerName || 'Cliente',
      // Outros campos necessários para a API Stone
    };

    try {
      // Exemplo de como seria a chamada HTTP (requer CORS configurado no backend)
      const response = await fetch(`${this.apiUrl}/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`, // Implementar autenticação
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          transactionId: data.transactionId,
          status: data.status,
          message: 'Pagamento processado com sucesso'
        };
      } else {
        return {
          success: false,
          error: data.message || 'Erro na transação'
        };
      }
    } catch (error) {
      throw new Error(`Erro na comunicação com Stone: ${error}`);
    }
  }

  /**
   * Verifica status de uma transação
   */
  async checkTransactionStatus(transactionId: string): Promise<StoneTransactionStatus | null> {
    try {
      if (this.environment === 'sandbox') {
        // Simular status em sandbox
        return {
          status: 'authorized',
          amount: 10000, // R$ 100.00 em centavos
          paymentMethod: 'credit',
          transactionId,
          createdAt: new Date().toISOString(),
          acquirerResponse: 'Transação autorizada'
        };
      }

      // Em produção, faria chamada real à API
      const response = await fetch(`${this.apiUrl}/v1/transactions/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        }
      });

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao verificar status da transação:', error);
      return null;
    }
  }

  /**
   * Cancela uma transação
   */
  async cancelTransaction(transactionId: string): Promise<boolean> {
    try {
      if (this.environment === 'sandbox') {
        // Simular cancelamento em sandbox
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      }

      const response = await fetch(`${this.apiUrl}/v1/transactions/${transactionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        }
      });

      return response.ok;
    } catch (error) {
      console.error('❌ Erro ao cancelar transação:', error);
      return false;
    }
  }

  /**
   * Obtém token de autenticação (implementar conforme necessidade)
   */
  private getAuthToken(): string {
    // Em produção, você obteria um token JWT ou API key da Stone
    // Por enquanto, retorna um placeholder
    return 'stone_api_token_placeholder';
  }

  /**
   * Verifica se as credenciais estão configuradas
   */
  isConfigured(): boolean {
    return !!(this.merchantId && this.terminalSerial);
  }

  /**
   * Obtém informações de configuração
   */
  getConfiguration(): {
    environment: string;
    merchantId: string;
    terminalSerial: string;
    isConfigured: boolean;
  } {
    return {
      environment: this.environment,
      merchantId: this.merchantId || 'Não configurado',
      terminalSerial: this.terminalSerial || 'Não configurado',
      isConfigured: this.isConfigured()
    };
  }
}

// Exportar instância única do serviço
export const stonePaymentService = new StonePaymentService();
export default stonePaymentService;
