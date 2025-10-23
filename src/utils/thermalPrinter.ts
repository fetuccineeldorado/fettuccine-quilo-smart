// Utilitário para impressão térmica de comandas
export interface OrderItem {
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface ExtraItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface OrderData {
  order_number: number;
  customer_name: string;
  total_weight: number;
  food_total: number;
  extra_items_total: number;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
  extra_items: ExtraItem[];
}

export class ThermalPrinter {
  private static ESC = '\x1B';
  private static GS = '\x1D';
  private static LF = '\x0A';

  // Comandos de formatação
  private static CENTER = '\x1B\x61\x01'; // Centralizar texto
  private static LEFT = '\x1B\x61\x00'; // Alinhar à esquerda
  private static BOLD = '\x1B\x45\x01'; // Texto em negrito
  private static NORMAL = '\x1B\x45\x00'; // Texto normal
  private static LARGE = '\x1B\x21\x30'; // Texto grande (2x altura e largura)
  private static EXTRA_LARGE = '\x1B\x21\x50'; // Texto extra grande (3x altura e largura)
  private static MEDIUM = '\x1B\x21\x20'; // Texto médio (2x altura)
  private static SMALL = '\x1B\x21\x00'; // Texto pequeno
  private static CUT = '\x1D\x56\x00'; // Corte do papel
  private static FEED = '\x0A'; // Avançar linha

  // Gerar cupom térmico
  static generateReceipt(orderData: OrderData): string {
    let receipt = '';

    // Cabeçalho
    receipt += this.CENTER;
    receipt += this.BOLD;
    receipt += this.EXTRA_LARGE;
    receipt += 'FETTUCCINE ELDORADO\n';
    receipt += this.NORMAL;
    receipt += this.MEDIUM;
    receipt += 'Sistema de Pesagem por Quilo\n';
    receipt += '================================\n';
    receipt += this.FEED;

    // Dados da comanda
    receipt += this.CENTER;
    receipt += this.BOLD;
    receipt += this.LARGE;
    receipt += `COMANDA #${orderData.order_number.toString().padStart(3, '0')}\n`;
    receipt += this.NORMAL;
    receipt += this.MEDIUM;
    receipt += `Cliente: ${orderData.customer_name}\n`;
    receipt += `Data: ${new Date(orderData.created_at).toLocaleString('pt-BR')}\n`;
    receipt += '================================\n';
    receipt += this.FEED;

    // Itens da comanda
    receipt += this.LEFT;
    receipt += this.BOLD;
    receipt += this.MEDIUM;
    receipt += 'ITENS DA COMANDA:\n';
    receipt += this.NORMAL;
    receipt += this.SMALL;
    receipt += '--------------------------------\n';

    // Comida por quilo
    if (orderData.items.length > 0) {
      const foodItem = orderData.items[0];
      receipt += this.MEDIUM;
      receipt += `${foodItem.description}\n`;
      receipt += this.SMALL;
      receipt += `Peso: ${orderData.total_weight.toFixed(3)} kg\n`;
      receipt += `Preço/kg: R$ ${foodItem.unit_price.toFixed(2)}\n`;
      receipt += this.BOLD;
      receipt += `Subtotal: R$ ${foodItem.total_price.toFixed(2)}\n`;
      receipt += this.NORMAL;
      receipt += '--------------------------------\n';
    }

    // Itens extra
    if (orderData.extra_items.length > 0) {
      receipt += this.BOLD;
      receipt += this.MEDIUM;
      receipt += 'ITENS EXTRA:\n';
      receipt += this.NORMAL;
      receipt += this.SMALL;
      orderData.extra_items.forEach(item => {
        receipt += this.MEDIUM;
        receipt += `${item.quantity}x ${item.name}\n`;
        receipt += this.SMALL;
        receipt += `R$ ${item.unit_price.toFixed(2)} x ${item.quantity} = `;
        receipt += this.BOLD;
        receipt += `R$ ${item.total_price.toFixed(2)}\n`;
        receipt += this.NORMAL;
      });
      receipt += '--------------------------------\n';
    }

    // Totais
    receipt += this.FEED;
    receipt += this.CENTER;
    receipt += this.BOLD;
    receipt += this.LARGE;
    receipt += 'RESUMO:\n';
    receipt += this.NORMAL;
    receipt += this.MEDIUM;
    receipt += '--------------------------------\n';
    receipt += `Comida: R$ ${orderData.food_total.toFixed(2)}\n`;
    if (orderData.extra_items_total > 0) {
      receipt += `Itens Extra: R$ ${orderData.extra_items_total.toFixed(2)}\n`;
    }
    receipt += '--------------------------------\n';
    receipt += this.BOLD;
    receipt += this.EXTRA_LARGE;
    receipt += `TOTAL: R$ ${orderData.total_amount.toFixed(2)}\n`;
    receipt += this.NORMAL;
    receipt += this.SMALL;

    // Rodapé
    receipt += this.FEED;
    receipt += this.CENTER;
    receipt += '================================\n';
    receipt += this.MEDIUM;
    receipt += 'Obrigado pela preferência!\n';
    receipt += 'Volte sempre!\n';
    receipt += this.SMALL;
    receipt += this.FEED;
    receipt += this.FEED;
    receipt += this.FEED;

    // Corte do papel
    receipt += this.CUT;

    return receipt;
  }

  // Enviar para impressora
  static async printReceipt(receipt: string): Promise<boolean> {
    try {
      // Verificar se a API de impressão está disponível
      if (!navigator.serial) {
        console.warn('Web Serial API não disponível. Usando fallback para impressão.');
        return this.fallbackPrint(receipt);
      }

      // Solicitar acesso à impressora
      const port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x04b8 }, // Epson
          { usbVendorId: 0x04a9 }, // Canon
          { usbVendorId: 0x03f0 }, // HP
        ]
      });

      // Abrir conexão
      await port.open({ baudRate: 9600 });

      // Enviar dados
      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(receipt));
      writer.releaseLock();

      // Fechar conexão
      await port.close();

      return true;
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      return this.fallbackPrint(receipt);
    }
  }

  // Fallback: abrir em nova janela para impressão
  private static fallbackPrint(receipt: string): boolean {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        console.error('Não foi possível abrir janela de impressão');
        return false;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Comanda #${new Date().getTime()}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.2;
                margin: 0;
                padding: 10px;
                white-space: pre-line;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .large { font-size: 16px; }
              .medium { font-size: 14px; }
              .small { font-size: 10px; }
            </style>
          </head>
          <body>
            ${receipt.replace(/\n/g, '<br>')}
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();

      return true;
    } catch (error) {
      console.error('Erro no fallback de impressão:', error);
      return false;
    }
  }

  // Testar impressora
  static async testPrinter(): Promise<boolean> {
    const testReceipt = `
${this.CENTER}${this.BOLD}${this.EXTRA_LARGE}TESTE DE IMPRESSORA${this.NORMAL}
${this.MEDIUM}================================
${this.SMALL}Data: ${new Date().toLocaleString('pt-BR')}
Status: OK
================================
${this.FEED}${this.FEED}${this.CUT}
    `;

    return await this.printReceipt(testReceipt);
  }
}
