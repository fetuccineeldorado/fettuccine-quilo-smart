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
    console.log('Processando itens extra:', orderData.extra_items);
    console.log('Quantidade de itens extra:', orderData.extra_items.length);
    
    if (orderData.extra_items.length > 0) {
      receipt += this.BOLD;
      receipt += this.MEDIUM;
      receipt += 'ITENS EXTRA:\n';
      receipt += this.NORMAL;
      receipt += this.SMALL;
      orderData.extra_items.forEach(item => {
        console.log('Processando item extra:', item);
        receipt += this.MEDIUM;
        receipt += `${item.quantity}x ${item.name}\n`;
        receipt += this.SMALL;
        receipt += `R$ ${item.unit_price.toFixed(2)} x ${item.quantity} = `;
        receipt += this.BOLD;
        receipt += `R$ ${item.total_price.toFixed(2)}\n`;
        receipt += this.NORMAL;
      });
      receipt += '--------------------------------\n';
    } else {
      console.log('Nenhum item extra encontrado para impressão');
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

      // Converter comandos de impressão térmica para HTML
      console.log('Receipt original:', receipt);
      const htmlReceipt = this.convertThermalToHTML(receipt);
      console.log('HTML convertido:', htmlReceipt);

      printWindow.document.write(`
        <html>
          <head>
            <title>Comanda - ${new Date().toLocaleString('pt-BR')}</title>
            <style>
              @media print {
                body { margin: 0; }
              }
              body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.2;
                margin: 0;
                padding: 10px;
                max-width: 300px;
                margin: 0 auto;
                white-space: pre-line;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .large { font-size: 18px; }
              .medium { font-size: 14px; }
              .small { font-size: 10px; }
              .extra-large { font-size: 22px; }
              .separator { border-bottom: 1px dashed #000; margin: 5px 0; }
              strong { font-weight: bold; }
            </style>
          </head>
          <body>
            <div style="text-align: center;">
              <strong style="font-size: 22px;">FETTUCCINE ELDORADO</strong><br>
              <span style="font-size: 14px;">Sistema de Pesagem por Quilo</span><br>
              <div class="separator"></div>
            </div>
            ${htmlReceipt}
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      
      // Aguardar um pouco antes de imprimir para garantir que o conteúdo carregou
      setTimeout(() => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
      }, 500);

      return true;
    } catch (error) {
      console.error('Erro no fallback de impressão:', error);
      return false;
    }
  }

  // Converter comandos térmicos para HTML
  private static convertThermalToHTML(receipt: string): string {
    let html = receipt;
    
    // Remover comandos de controle que não são necessários para HTML
    html = html.replace(/\x1B\x61\x01/g, ''); // CENTER - será aplicado via CSS
    html = html.replace(/\x1B\x61\x00/g, ''); // LEFT - será aplicado via CSS
    html = html.replace(/\x1B\x45\x01/g, '<strong>'); // BOLD
    html = html.replace(/\x1B\x45\x00/g, '</strong>'); // NORMAL
    html = html.replace(/\x1B\x21\x50/g, '<span class="extra-large">'); // EXTRA_LARGE
    html = html.replace(/\x1B\x21\x30/g, '<span class="large">'); // LARGE
    html = html.replace(/\x1B\x21\x20/g, '<span class="medium">'); // MEDIUM
    html = html.replace(/\x1B\x21\x00/g, '<span class="small">'); // SMALL
    
    // Remover comandos de feed e corte
    html = html.replace(/\x0A/g, '\n'); // LF
    html = html.replace(/\x1D\x56\x00/g, ''); // CUT
    
    // Converter quebras de linha
    html = html.replace(/\n/g, '<br>');
    
    // Adicionar separadores visuais
    html = html.replace(/={30,}/g, '<div class="separator"></div>');
    html = html.replace(/-{30,}/g, '<div class="separator"></div>');
    
    // Fechar tags abertas
    html = html.replace(/<span class="extra-large">/g, '<span class="extra-large">');
    html = html.replace(/<span class="large">/g, '<span class="large">');
    html = html.replace(/<span class="medium">/g, '<span class="medium">');
    html = html.replace(/<span class="small">/g, '<span class="small">');
    
    return html;
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

  // Impressão forçada com HTML simples
  static async forcePrintWithItems(): Promise<boolean> {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return false;

      const htmlContent = `
        <html>
          <head>
            <title>Comanda Teste</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                max-width: 300px; 
                margin: 0 auto; 
                padding: 10px;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .separator { border-bottom: 1px dashed #000; margin: 5px 0; }
            </style>
          </head>
          <body>
            <div class="center">
              <div class="bold" style="font-size: 18px;">FETTUCCINE ELDORADO</div>
              <div>Sistema de Pesagem por Quilo</div>
              <div class="separator"></div>
            </div>
            
            <div class="center">
              <div class="bold" style="font-size: 16px;">COMANDA #999</div>
              <div>Cliente: Cliente Teste</div>
              <div>Data: ${new Date().toLocaleString('pt-BR')}</div>
              <div class="separator"></div>
            </div>
            
            <div>
              <div class="bold">ITENS DA COMANDA:</div>
              <div class="separator"></div>
              <div>Comida por quilo - 0.500kg</div>
              <div>Peso: 0.500 kg</div>
              <div>Preço/kg: R$ 54,90</div>
              <div class="bold">Subtotal: R$ 27,45</div>
              <div class="separator"></div>
            </div>
            
            <div>
              <div class="bold">ITENS EXTRA:</div>
              <div>1x Coca lata</div>
              <div>R$ 7,00 x 1 = R$ 7,00</div>
              <div>2x Coca 600ml</div>
              <div>R$ 9,00 x 2 = R$ 18,00</div>
              <div class="separator"></div>
            </div>
            
            <div class="center">
              <div class="bold" style="font-size: 16px;">RESUMO:</div>
              <div class="separator"></div>
              <div>Comida: R$ 27,45</div>
              <div>Itens Extra: R$ 25,00</div>
              <div class="separator"></div>
              <div class="bold" style="font-size: 18px;">TOTAL: R$ 52,45</div>
              <div class="separator"></div>
            </div>
            
            <div class="center">
              <div>Obrigado pela preferência!</div>
              <div>Volte sempre!</div>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
      }, 500);

      return true;
    } catch (error) {
      console.error('Erro na impressão forçada:', error);
      return false;
    }
  }

  // Impressão direta de comanda com dados reais
  static async printOrderDirect(order: any, customerName: string, weight: number, foodTotal: number, selectedExtraItems: any[], extraItemsTotal: number): Promise<boolean> {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return false;

      console.log('Imprimindo comanda direta:', {
        order,
        customerName,
        weight,
        foodTotal,
        selectedExtraItems,
        extraItemsTotal
      });

      // Gerar HTML com dados reais
      const extraItemsHTML = selectedExtraItems.length > 0 ? `
        <div>
          <div class="bold">ITENS EXTRA:</div>
          <div class="separator"></div>
          ${selectedExtraItems.map(item => `
            <div>${item.quantity}x ${item.name}</div>
            <div>R$ ${item.price.toFixed(2)} x ${item.quantity} = R$ ${(item.price * item.quantity).toFixed(2)}</div>
          `).join('')}
          <div class="separator"></div>
        </div>
      ` : '';

      const htmlContent = `
        <html>
          <head>
            <title>Comanda #${order.order_number}</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                max-width: 300px; 
                margin: 0 auto; 
                padding: 10px;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .separator { border-bottom: 1px dashed #000; margin: 5px 0; }
            </style>
          </head>
          <body>
            <div class="center">
              <div class="bold" style="font-size: 18px;">FETTUCCINE ELDORADO</div>
              <div>Sistema de Pesagem por Quilo</div>
              <div class="separator"></div>
            </div>
            
            <div class="center">
              <div class="bold" style="font-size: 16px;">COMANDA #${order.order_number}</div>
              <div>Cliente: ${customerName}</div>
              <div>Data: ${new Date().toLocaleString('pt-BR')}</div>
              <div class="separator"></div>
            </div>
            
            <div>
              <div class="bold">ITENS DA COMANDA:</div>
              <div class="separator"></div>
              <div>Comida por quilo - ${weight}kg</div>
              <div>Peso: ${weight} kg</div>
              <div>Preço/kg: R$ ${(foodTotal / weight).toFixed(2)}</div>
              <div class="bold">Subtotal: R$ ${foodTotal.toFixed(2)}</div>
              <div class="separator"></div>
            </div>
            
            ${extraItemsHTML}
            
            <div class="center">
              <div class="bold" style="font-size: 16px;">RESUMO:</div>
              <div class="separator"></div>
              <div>Comida: R$ ${foodTotal.toFixed(2)}</div>
              ${extraItemsTotal > 0 ? `<div>Itens Extra: R$ ${extraItemsTotal.toFixed(2)}</div>` : ''}
              <div class="separator"></div>
              <div class="bold" style="font-size: 18px;">TOTAL: R$ ${(foodTotal + extraItemsTotal).toFixed(2)}</div>
              <div class="separator"></div>
            </div>
            
            <div class="center">
              <div>Obrigado pela preferência!</div>
              <div>Volte sempre!</div>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 1000);
      }, 500);

      return true;
    } catch (error) {
      console.error('Erro na impressão direta:', error);
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

  // Testar impressão com itens extra
  static async testPrinterWithItems(): Promise<boolean> {
    const testOrderData: OrderData = {
      order_number: 999,
      customer_name: "Cliente Teste",
      total_weight: 0.500,
      food_total: 27.45,
      extra_items_total: 25.00,
      total_amount: 52.45,
      created_at: new Date().toISOString(),
      items: [{
        description: "Comida por quilo - 0.500kg",
        quantity: 0.500,
        unit_price: 54.90,
        total_price: 27.45,
      }],
      extra_items: [
        {
          name: "Coca lata",
          quantity: 1,
          unit_price: 7.00,
          total_price: 7.00,
        },
        {
          name: "Coca 600ml",
          quantity: 2,
          unit_price: 9.00,
          total_price: 18.00,
        }
      ]
    };

    console.log('Dados de teste para impressão:', testOrderData);
    console.log('Itens extra no teste:', testOrderData.extra_items);
    console.log('Quantidade de itens extra:', testOrderData.extra_items.length);

    const testReceipt = this.generateReceipt(testOrderData);
    console.log('Cupom gerado:', testReceipt);
    
    return await this.printReceipt(testReceipt);
  }
}
