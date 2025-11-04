import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { ArrowLeft, Package, Clock, User, Weight, DollarSign, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ThermalPrinter, OrderData } from "@/utils/thermalPrinter";

interface Order {
  id: string;
  order_number: number;
  status: string;
  total_weight: number;
  food_total: number;
  extras_total: number;
  total_amount: number;
  customer_name: string;
  opened_at: string;
  closed_at: string | null;
  table_number: number | null;
  notes: string | null;
}

interface OrderItem {
  id: string;
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

const OrderDetails = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    if (!orderId) {
      toast({
        title: "Erro",
        description: "ID da comanda não fornecido",
        variant: "destructive",
      });
      navigate("/dashboard/orders");
      return;
    }

    try {
      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) {
        // Tratamento específico para comanda não encontrada
        if (orderError.code === "PGRST116" || orderError.message.includes("No rows")) {
          toast({
            title: "Comanda não encontrada",
            description: "A comanda solicitada não foi encontrada no sistema",
            variant: "destructive",
          });
          navigate("/dashboard/orders");
          return;
        }
        throw orderError;
      }

      if (!orderData) {
        toast({
          title: "Comanda não encontrada",
          description: "A comanda não foi encontrada",
          variant: "destructive",
        });
        navigate("/dashboard/orders");
        return;
      }

      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      // Fetch order extra items with join to extra_items
      // Type assertion necessário pois order_extra_items não está nos tipos gerados
      const { data: extraItemsData, error: extraItemsError } = await (supabase
        .from("order_extra_items" as any)
        .select(`
          *,
          extra_items (
            id,
            name,
            description
          )
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: true }) as any);

      if (extraItemsError) {
        console.error("Erro ao carregar itens extras:", extraItemsError);
        // Não bloquear se der erro, apenas logar
      }

      setOrder(orderData);
      
      // Combine order_items and order_extra_items into a single array
      const allItems: OrderItem[] = [
        ...(itemsData || []),
        // Map extra items to OrderItem format
        ...((extraItemsData || []) as any[]).map((extraItem: any) => ({
          id: extraItem.id,
          item_type: "extra",
          description: `${(extraItem.extra_items as any)?.name || 'Item Extra'} (x${extraItem.quantity})`,
          quantity: extraItem.quantity,
          unit_price: extraItem.unit_price,
          total_price: extraItem.total_price,
          created_at: extraItem.created_at,
        }))
      ];
      
      setOrderItems(allItems);
    } catch (error) {
      console.error("Erro ao carregar detalhes da comanda:", error);
      
      // Tratamento específico de erros
      if (error instanceof Error) {
        if (error.message.includes("network") || error.message.includes("fetch")) {
          toast({
            title: "Erro de conexão",
            description: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
            variant: "destructive",
          });
        } else if (error.message.includes("permission") || error.message.includes("unauthorized")) {
          toast({
            title: "Sem permissão",
            description: "Você não tem permissão para visualizar esta comanda.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao carregar comanda",
            description: error.message || "Não foi possível carregar os detalhes da comanda",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erro ao carregar comanda",
          description: "Não foi possível carregar os detalhes da comanda",
          variant: "destructive",
        });
      }
      navigate("/dashboard/orders");
    } finally {
      setLoading(false);
    }
  };

  const handleReprint = async () => {
    if (!order || !orderItems.length) {
      toast({
        title: "Erro ao reimprimir",
        description: "Dados da comanda não disponíveis",
        variant: "destructive",
      });
      return;
    }

    setPrinting(true);
    try {
      // Separar itens por tipo
      const foodItems = orderItems.filter(item => item.item_type === "food_weight");
      const extraItems = orderItems.filter(item => item.item_type === "extra");

      console.log("Dados da comanda:", order);
      console.log("Itens da comanda:", orderItems);
      console.log("Itens de comida:", foodItems);
      console.log("Itens extras:", extraItems);

      // Usar método direto de impressão que sempre funciona
      const success = await printOrderDirect();

      if (success) {
        toast({
          title: "Comanda reimpressa!",
          description: `Comanda #${order.order_number} enviada para impressão`,
        });
      } else {
        toast({
          title: "Erro na impressão",
          description: "Não foi possível imprimir a comanda. Verifique a impressora.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao reimprimir comanda:", error);
      toast({
        title: "Erro ao reimprimir",
        description: "Ocorreu um erro inesperado ao reimprimir a comanda",
        variant: "destructive",
      });
    } finally {
      setPrinting(false);
    }
  };

  const printOrderDirect = async (): Promise<boolean> => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return false;

      // Separar itens por tipo
      const foodItems = orderItems.filter(item => item.item_type === "food_weight");
      const extraItems = orderItems.filter(item => item.item_type === "extra");

      // Formatação melhorada de data e hora
      const date = order?.opened_at ? new Date(order.opened_at) : new Date();
      const dateStr = date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const timeStr = date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });

      // Gerar HTML com dados reais - melhor formatado
      const extraItemsHTML = extraItems.length > 0 ? `
        <div class="section">
          <div class="section-title">➕ Itens Extra</div>
          ${extraItems.map((item, index) => {
            const itemName = item.description.split(' (x')[0];
            return `
              <div class="item-row">
                <div class="item-name">${index + 1}. ${item.quantity}x ${itemName.toUpperCase()}</div>
                <div class="item-details">
                  R$ ${item.unit_price.toFixed(2)} × ${item.quantity}
                </div>
                <div class="item-price">R$ ${item.total_price.toFixed(2)}</div>
              </div>
            `;
          }).join('')}
        </div>
      ` : '';

      const htmlContent = `
        <html>
          <head>
            <title>Comanda #${order?.order_number}</title>
            <meta charset="UTF-8">
            <style>
              @media print {
                body { margin: 0; padding: 15px; }
                .no-print { display: none; }
                @page { 
                  size: 80mm auto;
                  margin: 0;
                }
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body { 
                font-family: 'Courier New', 'Consolas', monospace; 
                font-size: 14px; 
                max-width: 80mm; 
                width: 80mm;
                margin: 0 auto; 
                padding: 15px 10px;
                line-height: 1.6;
                color: #000;
                background: #fff;
              }
              .header {
                text-align: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 3px double #000;
              }
              .header-title {
                font-size: 24px;
                font-weight: 900;
                letter-spacing: 1px;
                margin-bottom: 5px;
                text-transform: uppercase;
              }
              .header-subtitle {
                font-size: 14px;
                font-weight: 600;
                color: #333;
                margin-top: 3px;
              }
              .order-info {
                text-align: center;
                margin: 15px 0;
                padding: 10px 0;
                border-top: 2px solid #000;
                border-bottom: 2px solid #000;
              }
              .order-number {
                font-size: 28px;
                font-weight: 900;
                letter-spacing: 2px;
                margin: 8px 0;
                text-transform: uppercase;
              }
              .order-details {
                font-size: 13px;
                margin: 5px 0;
                font-weight: 600;
              }
              .customer-name {
                font-size: 16px;
                font-weight: 700;
                text-transform: uppercase;
                margin: 8px 0;
                color: #000;
              }
              .section {
                margin: 15px 0;
                padding: 10px 0;
              }
              .section-title {
                font-size: 18px;
                font-weight: 900;
                margin-bottom: 10px;
                text-transform: uppercase;
                border-bottom: 2px dashed #000;
                padding-bottom: 5px;
              }
              .item-row {
                margin: 8px 0;
                padding: 5px 0;
                border-bottom: 1px dotted #ccc;
              }
              .item-name {
                font-size: 15px;
                font-weight: 700;
                margin-bottom: 3px;
                text-transform: uppercase;
              }
              .item-details {
                font-size: 12px;
                margin-left: 10px;
                color: #444;
              }
              .item-price {
                font-size: 14px;
                font-weight: 700;
                margin-top: 3px;
                text-align: right;
              }
              .summary {
                margin: 20px 0;
                padding: 15px 0;
                border-top: 3px double #000;
                border-bottom: 3px double #000;
              }
              .summary-title {
                font-size: 20px;
                font-weight: 900;
                text-align: center;
                margin-bottom: 15px;
                text-transform: uppercase;
              }
              .summary-row {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
                font-size: 14px;
                font-weight: 600;
              }
              .summary-label {
                text-align: left;
              }
              .summary-value {
                text-align: right;
                font-weight: 700;
              }
              .total-row {
                margin-top: 15px;
                padding-top: 15px;
                border-top: 2px solid #000;
                font-size: 22px;
                font-weight: 900;
                text-transform: uppercase;
              }
              .total-label {
                text-align: center;
                font-size: 18px;
                margin-bottom: 5px;
              }
              .total-value {
                text-align: center;
                font-size: 28px;
                letter-spacing: 2px;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                padding-top: 15px;
                border-top: 2px dashed #000;
                font-size: 13px;
              }
              .footer-message {
                font-size: 15px;
                font-weight: 700;
                margin: 8px 0;
              }
              .footer-thanks {
                font-size: 12px;
                margin: 5px 0;
                color: #555;
              }
              .separator {
                border-bottom: 1px dashed #000;
                margin: 10px 0;
              }
              .double-separator {
                border-top: 3px double #000;
                border-bottom: 3px double #000;
                margin: 15px 0;
                padding: 5px 0;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-title">FETTUCCINE ELDORADO</div>
              <div class="header-subtitle">Sistema de Pesagem por Quilo</div>
              <div class="header-subtitle">Comida Caseira de Qualidade</div>
            </div>
            
            <div class="order-info">
              <div class="order-number">COMANDA #${order?.order_number?.toString().padStart(4, '0') || '0000'}</div>
              <div class="customer-name">${(order?.customer_name || 'Cliente').toUpperCase()}</div>
              <div class="order-details">Data: ${dateStr} às ${timeStr}</div>
            </div>
            
            <div class="section">
              <div class="section-title">📋 Itens da Comanda</div>
              ${foodItems.map(item => `
                <div class="item-row">
                  <div class="item-name">🍽️ ${item.description.toUpperCase()}</div>
                  <div class="item-details">
                    Peso: ${item.quantity.toFixed(3)} kg<br>
                    Preço/kg: R$ ${item.unit_price.toFixed(2)}
                  </div>
                  <div class="item-price">Subtotal: R$ ${item.total_price.toFixed(2)}</div>
                </div>
              `).join('')}
            </div>
            
            ${extraItemsHTML}
            
            <div class="summary">
              <div class="summary-title">💰 Resumo Financeiro</div>
              <div class="summary-row">
                <span class="summary-label">Comida por Quilo:</span>
                <span class="summary-value">R$ ${(order?.food_total || 0).toFixed(2)}</span>
              </div>
              ${(order?.extras_total || 0) > 0 ? `
              <div class="summary-row">
                <span class="summary-label">Itens Extra:</span>
                <span class="summary-value">R$ ${(order?.extras_total || 0).toFixed(2)}</span>
              </div>
              ` : ''}
              <div class="double-separator"></div>
              <div class="total-row">
                <div class="total-label">TOTAL</div>
                <div class="total-value">R$ ${(order?.total_amount || 0).toFixed(2)}</div>
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-message">✨ Obrigado pela preferência! ✨</div>
              <div class="footer-thanks">Volte sempre!</div>
              <div class="footer-thanks">Avalie nosso atendimento</div>
              <div class="separator"></div>
              <div class="footer-thanks">Comanda #${order?.order_number?.toString().padStart(4, '0') || '0000'} - ${dateStr}</div>
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
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "outline" | "destructive" | "secondary"; label: string }> = {
      open: { variant: "default", label: "Aberta" },
      pending: { variant: "secondary", label: "Sendo Editada" },
      closed: { variant: "outline", label: "Fechada" },
      cancelled: { variant: "destructive", label: "Cancelada" },
    };

    const config = variants[status] || variants.open;
    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  const getItemTypeIcon = (itemType: string) => {
    switch (itemType) {
      case "food_weight":
        return <Weight className="h-4 w-4" />;
      case "extra":
        return <Package className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getItemTypeLabel = (itemType: string) => {
    switch (itemType) {
      case "food_weight":
        return "Comida por Quilo";
      case "extra":
        return "Item Extra";
      default:
        return "Item";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Carregando detalhes da comanda...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Comanda não encontrada</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard/orders")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleReprint}
                disabled={printing}
              >
                <Printer className="h-4 w-4 mr-2" />
                {printing ? "Imprimindo..." : "Reimprimir"}
              </Button>
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Comanda #{order.order_number}
              </h1>
              <div className="flex items-center gap-4">
                <p className="text-muted-foreground text-lg">
                  {order.customer_name}
                </p>
                {getStatusBadge(order.status)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Resumo da Comanda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peso Total</span>
                  <span className="font-semibold">
                    {Number(order.total_weight).toFixed(3)} kg
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comida</span>
                  <span className="font-semibold">
                    R$ {Number(order.food_total).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extras</span>
                  <span className="font-semibold">
                    R$ {Number(order.extras_total).toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-xl">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-primary">
                      R$ {Number(order.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Informações da Comanda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-semibold">{order.customer_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Aberta em</p>
                    <p className="font-semibold">
                      {format(new Date(order.opened_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>

                {order.closed_at && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Fechada em</p>
                      <p className="font-semibold">
                        {format(new Date(order.closed_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {order.table_number && (
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Mesa</p>
                      <p className="font-semibold">{order.table_number}</p>
                    </div>
                  </div>
                )}
              </div>

              {order.notes && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Observações</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Itens da Comanda
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orderItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum item na comanda
              </p>
            ) : (
              <div className="space-y-4">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        {getItemTypeIcon(item.item_type)}
                        <Badge variant="outline" className="text-xs">
                          {getItemTypeLabel(item.item_type)}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} x R$ {Number(item.unit_price).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Adicionado em {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">
                        R$ {Number(item.total_price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default OrderDetails;
