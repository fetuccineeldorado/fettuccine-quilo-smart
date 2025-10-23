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
    try {
      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      setOrder(orderData);
      setOrderItems(itemsData || []);
    } catch (error) {
      console.error("Erro ao carregar detalhes da comanda:", error);
      toast({
        title: "Erro ao carregar comanda",
        description: "Não foi possível carregar os detalhes da comanda",
        variant: "destructive",
      });
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

      // Gerar HTML com dados reais
      const extraItemsHTML = extraItems.length > 0 ? `
        <div>
          <div class="bold">ITENS EXTRA:</div>
          <div class="separator"></div>
          ${extraItems.map(item => `
            <div>${item.quantity}x ${item.description.split(' (x')[0]}</div>
            <div>R$ ${item.unit_price.toFixed(2)} x ${item.quantity} = R$ ${item.total_price.toFixed(2)}</div>
          `).join('')}
          <div class="separator"></div>
        </div>
      ` : '';

      const htmlContent = `
        <html>
          <head>
            <title>Comanda #${order?.order_number}</title>
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
              <div class="bold" style="font-size: 16px;">COMANDA #${order?.order_number}</div>
              <div>Cliente: ${order?.customer_name}</div>
              <div>Data: ${new Date().toLocaleString('pt-BR')}</div>
              <div class="separator"></div>
            </div>
            
            <div>
              <div class="bold">ITENS DA COMANDA:</div>
              <div class="separator"></div>
              ${foodItems.map(item => `
                <div>${item.description}</div>
                <div>Peso: ${item.quantity} kg</div>
                <div>Preço/kg: R$ ${item.unit_price.toFixed(2)}</div>
                <div class="bold">Subtotal: R$ ${item.total_price.toFixed(2)}</div>
                <div class="separator"></div>
              `).join('')}
            </div>
            
            ${extraItemsHTML}
            
            <div class="center">
              <div class="bold" style="font-size: 16px;">RESUMO:</div>
              <div class="separator"></div>
              <div>Comida: R$ ${order?.food_total.toFixed(2)}</div>
              ${order?.extras_total > 0 ? `<div>Itens Extra: R$ ${order?.extras_total.toFixed(2)}</div>` : ''}
              <div class="separator"></div>
              <div class="bold" style="font-size: 18px;">TOTAL: R$ ${order?.total_amount.toFixed(2)}</div>
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
