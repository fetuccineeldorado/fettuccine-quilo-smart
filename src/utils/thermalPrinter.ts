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
    // eslint-disable-next-line no-control-regex
    html = html.replace(/\x1B\x61\x01/g, ''); // CENTER - será aplicado via CSS
    // eslint-disable-next-line no-control-regex
    html = html.replace(/\x1B\x61\x00/g, ''); // LEFT - será aplicado via CSS
    // eslint-disable-next-line no-control-regex
    html = html.replace(/\x1B\x45\x01/g, '<strong>'); // BOLD
    // eslint-disable-next-line no-control-regex
    html = html.replace(/\x1B\x45\x00/g, '</strong>'); // NORMAL
    // eslint-disable-next-line no-control-regex
    html = html.replace(/\x1B\x21\x50/g, '<span class="extra-large">'); // EXTRA_LARGE
    // eslint-disable-next-line no-control-regex
    html = html.replace(/\x1B\x21\x30/g, '<span class="large">'); // LARGE
    // eslint-disable-next-line no-control-regex
    html = html.replace(/\x1B\x21\x20/g, '<span class="medium">'); // MEDIUM
    // eslint-disable-next-line no-control-regex
    html = html.replace(/\x1B\x21\x00/g, '<span class="small">'); // SMALL
    
    // Remover comandos de feed e corte
    // eslint-disable-next-line no-control-regex
    html = html.replace(/\x0A/g, '\n'); // LF
    // eslint-disable-next-line no-control-regex
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
  static async printOrderDirect(order: OrderData, customerName: string, weight: number, foodTotal: number, selectedExtraItems: ExtraItem[], extraItemsTotal: number): Promise<boolean> {
    try {
      console.log('=== INICIANDO IMPRESSÃO DE COMANDA ===');
      console.log('Dados recebidos:', {
        order,
        customerName,
        weight,
        foodTotal,
        selectedExtraItems,
        extraItemsTotal
      });

      // Validar dados essenciais
      if (!order || !order.order_number) {
        console.error('Erro: Dados da comanda inválidos');
        return false;
      }

      if (!customerName || customerName.trim() === '') {
        console.error('Erro: Nome do cliente não fornecido');
        return false;
      }

      if (!weight || weight <= 0) {
        console.error('Erro: Peso inválido');
        return false;
      }

      if (!foodTotal || foodTotal <= 0) {
        console.error('Erro: Total da comida inválido');
        return false;
      }

      // Verificar se selectedExtraItems é um array válido
      const validExtraItems = Array.isArray(selectedExtraItems) ? selectedExtraItems : [];
      console.log('Itens extra válidos:', validExtraItems);

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        console.error('Erro: Não foi possível abrir janela de impressão');
        return false;
      }

      // Gerar HTML com dados reais e validação
      const extraItemsHTML = validExtraItems.length > 0 ? `
        <div>
          <div class="bold">ITENS EXTRA:</div>
          <div class="separator"></div>
          ${validExtraItems.map(item => {
            if (!item || !item.name || !item.quantity || !item.price) {
              console.warn('Item extra inválido ignorado:', item);
              return '';
            }
            return `
              <div>${item.quantity}x ${item.name}</div>
              <div>R$ ${Number(item.price).toFixed(2)} x ${item.quantity} = R$ ${(Number(item.price) * item.quantity).toFixed(2)}</div>
            `;
          }).filter(html => html !== '').join('')}
          <div class="separator"></div>
        </div>
      ` : '';

      // Calcular preço por kg com validação
      const pricePerKg = weight > 0 ? (foodTotal / weight) : 0;
      console.log('Preço por kg calculado:', pricePerKg);

      const htmlContent = `
        <html>
          <head>
            <title>Comanda #${order.order_number}</title>
            <meta charset="UTF-8">
            <style>
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                max-width: 300px; 
                margin: 0 auto; 
                padding: 10px;
                line-height: 1.2;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .separator { border-bottom: 1px dashed #000; margin: 5px 0; }
              .large { font-size: 16px; }
              .medium { font-size: 14px; }
              .small { font-size: 10px; }
            </style>
          </head>
          <body>
            <div class="center">
              <div class="bold large">FETTUCCINE ELDORADO</div>
              <div class="medium">Sistema de Pesagem por Quilo</div>
              <div class="separator"></div>
            </div>
            
            <div class="center">
              <div class="bold large">COMANDA #${order.order_number}</div>
              <div>Cliente: ${customerName}</div>
              <div>Data: ${new Date().toLocaleString('pt-BR')}</div>
              <div class="separator"></div>
            </div>
            
            <div>
              <div class="bold">ITENS DA COMANDA:</div>
              <div class="separator"></div>
              <div>Comida por quilo - ${Number(weight).toFixed(3)}kg</div>
              <div>Peso: ${Number(weight).toFixed(3)} kg</div>
              <div>Preço/kg: R$ ${Number(pricePerKg).toFixed(2)}</div>
              <div class="bold">Subtotal: R$ ${Number(foodTotal).toFixed(2)}</div>
              <div class="separator"></div>
            </div>
            
            ${extraItemsHTML}
            
            <div class="center">
              <div class="bold large">RESUMO:</div>
              <div class="separator"></div>
              <div>Comida: R$ ${Number(foodTotal).toFixed(2)}</div>
              ${Number(extraItemsTotal) > 0 ? `<div>Itens Extra: R$ ${Number(extraItemsTotal).toFixed(2)}</div>` : ''}
              <div class="separator"></div>
              <div class="bold large">TOTAL: R$ ${Number(foodTotal + extraItemsTotal).toFixed(2)}</div>
              <div class="separator"></div>
            </div>
            
            <div class="center">
              <div>Obrigado pela preferência!</div>
              <div>Volte sempre!</div>
            </div>
          </body>
        </html>
      `;

      console.log('HTML gerado para impressão');
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Aguardar carregamento e imprimir
      setTimeout(() => {
        try {
          printWindow.print();
          console.log('Comando de impressão enviado');
          
          // Fechar janela após impressão
          setTimeout(() => {
            printWindow.close();
            console.log('Janela de impressão fechada');
          }, 2000);
        } catch (printError) {
          console.error('Erro ao imprimir:', printError);
          printWindow.close();
        }
      }, 1000);

      return true;
    } catch (error) {
      console.error('Erro na impressão direta:', error);
      return false;
    }
  }

  // Testar impressora
  static async testPrinter(): Promise<boolean> {
    try {
      console.log('=== TESTE DE IMPRESSORA ===');
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        console.error('Erro: Não foi possível abrir janela de teste');
        return false;
      }

      const testContent = `
        <html>
          <head>
            <title>Teste de Impressora</title>
            <meta charset="UTF-8">
            <style>
              @media print {
                body { margin: 0; }
              }
              body { 
                font-family: 'Courier New', monospace; 
                font-size: 12px; 
                max-width: 300px; 
                margin: 0 auto; 
                padding: 10px;
                text-align: center;
              }
              .bold { font-weight: bold; }
              .large { font-size: 18px; }
              .separator { border-bottom: 1px dashed #000; margin: 5px 0; }
            </style>
          </head>
          <body>
            <div class="bold large">TESTE DE IMPRESSORA</div>
            <div class="separator"></div>
            <div>Data: ${new Date().toLocaleString('pt-BR')}</div>
            <div>Status: OK</div>
            <div class="separator"></div>
            <div>Impressora funcionando corretamente!</div>
          </body>
        </html>
      `;

      printWindow.document.write(testContent);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 2000);
      }, 500);

      console.log('Teste de impressora executado');
      return true;
    } catch (error) {
      console.error('Erro no teste de impressora:', error);
      return false;
    }
  }

  // Testar impressão com itens extra
  static async testPrinterWithItems(): Promise<boolean> {
    try {
      console.log('=== TESTE DE IMPRESSÃO COM ITENS EXTRA ===');
      
      const testOrder = {
        order_number: 999,
        customer_name: "Cliente Teste",
        total_weight: 0.500,
        food_total: 27.45,
        extra_items_total: 25.00,
        total_amount: 52.45,
        created_at: new Date().toISOString(),
      };

      const testExtraItems = [
        {
          name: "Coca lata",
          quantity: 1,
          price: 7.00,
        },
        {
          name: "Coca 600ml",
          quantity: 2,
          price: 9.00,
        }
      ];

      console.log('Dados de teste:', { testOrder, testExtraItems });

      const success = await this.printOrderDirect(
        testOrder,
        testOrder.customer_name,
        testOrder.total_weight,
        testOrder.food_total,
        testExtraItems,
        testOrder.extra_items_total
      );

      console.log('Resultado do teste:', success);
      return success;
    } catch (error) {
      console.error('Erro no teste com itens extra:', error);
      return false;
    }
  }

  // Debug: Verificar dados antes da impressão
  static debugPrintData(order: OrderData, customerName: string, weight: number, foodTotal: number, selectedExtraItems: ExtraItem[], extraItemsTotal: number): void {
    console.log('=== DEBUG DE DADOS DE IMPRESSÃO ===');
    console.log('Order:', order);
    console.log('Customer Name:', customerName);
    console.log('Weight:', weight);
    console.log('Food Total:', foodTotal);
    console.log('Selected Extra Items:', selectedExtraItems);
    console.log('Extra Items Total:', extraItemsTotal);
    
    // Validações
    console.log('=== VALIDAÇÕES ===');
    console.log('Order válido:', !!(order && order.order_number));
    console.log('Customer Name válido:', !!(customerName && customerName.trim()));
    console.log('Weight válido:', !!(weight && weight > 0));
    console.log('Food Total válido:', !!(foodTotal && foodTotal > 0));
    console.log('Selected Extra Items é array:', Array.isArray(selectedExtraItems));
    console.log('Quantidade de itens extra:', selectedExtraItems?.length || 0);
    
    // Verificar cada item extra
    if (Array.isArray(selectedExtraItems)) {
      selectedExtraItems.forEach((item, index) => {
        console.log(`Item extra ${index}:`, {
          name: item?.name,
          quantity: item?.quantity,
          price: item?.price,
          válido: !!(item?.name && item?.quantity && item?.price)
        });
      });
    }
    
    console.log('=== FIM DEBUG ===');
  }
}
