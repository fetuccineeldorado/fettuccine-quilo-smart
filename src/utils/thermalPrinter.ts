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
      // Tentar impressão direta via USB primeiro
      const directPrint = await this.directUSBPrint(receipt);
      if (directPrint) {
        return true;
      }

      // Fallback para Web USB API
      if (navigator.usb) {
        return await this.webUSBPrint(receipt);
      }

      // Fallback final para impressão no navegador
      return this.fallbackPrint(receipt);
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      return this.fallbackPrint(receipt);
    }
  }

  // Impressão direta via USB (sem Web USB API)
  private static async directUSBPrint(receipt: string): Promise<boolean> {
    try {
      // Método 1: Tentar impressão via endpoint local
      const localPrint = await this.tryLocalPrint(receipt);
      if (localPrint) return true;

      // Método 2: Tentar impressão via Web Serial (se disponível)
      const serialPrint = await this.trySerialPrint(receipt);
      if (serialPrint) return true;

      // Método 3: Tentar impressão via Web Bluetooth (se disponível)
      const bluetoothPrint = await this.tryBluetoothPrint(receipt);
      if (bluetoothPrint) return true;

    } catch (error) {
      console.log('Impressão direta não disponível, tentando outros métodos...');
    }
    return false;
  }

  // Tentar impressão via endpoint local
  private static async tryLocalPrint(receipt: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(receipt);
      const blob = new Blob([data], { type: 'application/octet-stream' });
      
      const response = await fetch('/api/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: blob
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Tentar impressão via Web Serial
  private static async trySerialPrint(receipt: string): Promise<boolean> {
    try {
      if (!navigator.serial) return false;

      const port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x04b8 }, // Epson
          { usbVendorId: 0x04a9 }, // Canon
          { usbVendorId: 0x03f0 }, // HP
        ]
      });

      await port.open({ baudRate: 9600 });
      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(receipt));
      writer.releaseLock();
      await port.close();

      return true;
    } catch (error) {
      return false;
    }
  }

  // Tentar impressão via Web Bluetooth
  private static async tryBluetoothPrint(receipt: string): Promise<boolean> {
    try {
      if (!navigator.bluetooth) return false;

      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'Printer' },
          { namePrefix: 'EPSON' },
          { namePrefix: 'Canon' },
        ],
        optionalServices: ['0000180a-0000-1000-8000-00805f9b34fb']
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('0000180a-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002a50-0000-1000-8000-00805f9b34fb');
      
      const encoder = new TextEncoder();
      await characteristic.writeValue(encoder.encode(receipt));
      
      await server.disconnect();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Impressão via Web USB API
  private static async webUSBPrint(receipt: string): Promise<boolean> {
    try {
      // Solicitar acesso à impressora USB
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x04a9 }, // Canon
          { vendorId: 0x03f0 }, // HP
          { vendorId: 0x04e8 }, // Samsung
          { vendorId: 0x04f9 }, // Brother
        ]
      });

      // Abrir conexão USB
      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(0);

      // Enviar dados via USB
      const encoder = new TextEncoder();
      const data = encoder.encode(receipt);
      
      // Enviar em chunks se necessário
      const chunkSize = 64;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await device.transferOut(1, chunk);
      }

      // Fechar conexão
      await device.close();

      return true;
    } catch (error) {
      console.error('Erro ao imprimir via Web USB:', error);
      return false;
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

  // Detectar impressoras USB disponíveis
  static async detectUSBPrinters(): Promise<USBDevice[]> {
    try {
      if (!navigator.usb) {
        console.warn('Web USB API não disponível');
        return [];
      }

      const devices = await navigator.usb.getDevices();
      return devices.filter(device => {
        // Filtrar dispositivos que podem ser impressoras
        const vendorId = device.vendorId;
        return [
          0x04b8, // Epson
          0x04a9, // Canon
          0x03f0, // HP
          0x04e8, // Samsung
          0x04f9, // Brother
        ].includes(vendorId);
      });
    } catch (error) {
      console.error('Erro ao detectar impressoras USB:', error);
      return [];
    }
  }

  // Impressão direta via USB (método alternativo)
  static async directUSBPrint(receipt: string): Promise<boolean> {
    try {
      // Criar um arquivo de impressão temporário
      const encoder = new TextEncoder();
      const data = encoder.encode(receipt);
      const blob = new Blob([data], { type: 'text/plain' });
      
      // Criar URL do blob
      const url = URL.createObjectURL(blob);
      
      // Tentar abrir em nova janela para impressão direta
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        URL.revokeObjectURL(url);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro na impressão direta USB:', error);
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
