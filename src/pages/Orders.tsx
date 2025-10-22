import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { FileText, Eye, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Order {
  id: string;
  order_number: number;
  status: string;
  total_weight: number;
  total_amount: number;
  opened_at: string;
  closed_at: string | null;
  table_number: number | null;
}

const Orders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    
    // Verificar se a chave do Supabase está configurada
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseKey || supabaseKey === 'your_supabase_anon_key_here') {
      // Usar dados mock quando a chave não estiver configurada
      const mockOrders = [
        {
          id: '1',
          order_number: 1001,
          customer_name: 'João Silva',
          status: 'open',
          total_amount: 25.50,
          total_weight: 0.5,
          opened_at: new Date().toISOString(),
          closed_at: null,
          table_number: 1
        },
        {
          id: '2',
          order_number: 1002,
          customer_name: 'Maria Santos',
          status: 'closed',
          total_amount: 45.00,
          total_weight: 0.8,
          opened_at: new Date(Date.now() - 3600000).toISOString(),
          closed_at: new Date().toISOString(),
          table_number: 2
        }
      ];
      setOrders(mockOrders);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("opened_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar comandas",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchOrders();
    
    // Real-time subscription
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  const handleCancelOrder = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);

    if (error) {
      toast({
        title: "Erro ao cancelar comanda",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Comanda cancelada",
        description: "A comanda foi cancelada com sucesso",
      });
      fetchOrders();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "outline" | "destructive"; label: string }> = {
      open: { variant: "default", label: "Aberta" },
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Carregando comandas...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Comandas</h1>
          <p className="text-muted-foreground text-lg">
            Gestão de todas as comandas do sistema
          </p>
        </div>

        {orders.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">
                Nenhuma comanda encontrada
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                As comandas aparecerão aqui quando forem criadas
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <Card key={order.id} className="shadow-soft hover:shadow-lg transition-smooth">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <span className="text-2xl font-bold">#{order.order_number}</span>
                      {getStatusBadge(order.status)}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      {order.status === "open" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelOrder(order.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Peso Total</p>
                      <p className="text-lg font-semibold">
                        {Number(order.total_weight).toFixed(3)} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
                      <p className="text-lg font-semibold text-success">
                        R$ {Number(order.total_amount).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Aberta em
                      </p>
                      <p className="text-sm">
                        {format(new Date(order.opened_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {order.closed_at && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Fechada em</p>
                        <p className="text-sm">
                          {format(new Date(order.closed_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    )}
                    {order.table_number && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Mesa</p>
                        <p className="text-lg font-semibold">{order.table_number}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Orders;
