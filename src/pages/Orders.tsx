import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { FileText, Eye, XCircle, Clock, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchOrders = useCallback(async () => {
    console.log('🔄 fetchOrders: Iniciando carregamento de comandas...');
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("opened_at", { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar comandas:', error);
        toast({
          title: "Erro ao carregar comandas",
          description: error.message,
          variant: "destructive",
        });
        setOrders([]);
      } else {
        console.log('✅ fetchOrders: Comandas carregadas:', data?.length || 0);
        console.log('📋 fetchOrders: IDs das comandas:', data?.map(o => o.id) || []);
        setOrders(data || []);
      }
    } catch (err) {
      console.error('💥 Erro geral ao carregar comandas:', err);
      toast({
        title: "Erro ao carregar comandas",
        description: "Erro desconhecido",
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setLoading(false);
      console.log('✅ fetchOrders: Carregamento finalizado');
    }
  }, [toast]);

  const handleDeleteOrder = useCallback(async (orderId: string, orderNumber: number, status: string) => {
    console.log('🗑️ Iniciando exclusão da comanda:', { orderId, orderNumber, status });
    
    // Diferentes mensagens de confirmação baseadas no status
    let confirmMessage = `Tem certeza que deseja excluir a comanda #${orderNumber}?\n\n`;
    
    if (status === "open") {
      confirmMessage += "⚠️ ATENÇÃO: Esta comanda está ABERTA e pode ter vendas ativas.\n\n";
    } else if (status === "closed") {
      confirmMessage += "⚠️ ATENÇÃO: Esta comanda está FECHADA e pode ter dados de vendas importantes.\n\n";
    } else if (status === "cancelled") {
      confirmMessage += "Esta comanda foi cancelada e pode ser excluída com segurança.\n\n";
    }
    
    confirmMessage += "Esta ação não pode ser desfeita e irá remover todos os dados relacionados à comanda.";
    
    if (!confirm(confirmMessage)) {
      console.log('❌ Usuário cancelou a exclusão');
      return;
    }
    
    console.log('✅ Usuário confirmou a exclusão, iniciando processo...');

    try {
      console.log('🔄 Iniciando exclusão da comanda...');
      
      // Primeiro, deletar itens relacionados
      console.log('🔄 Passo 1: Deletando itens da comanda...');
      const { error: itemsError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId);

      if (itemsError) {
        console.error('❌ Erro ao deletar itens da comanda:', itemsError);
        throw itemsError;
      }
      console.log('✅ Itens da comanda deletados com sucesso');

      // Deletar itens extras relacionados
      console.log('🔄 Passo 2: Deletando itens extras...');
      const { error: extraItemsError } = await supabase
        .from("order_extra_items")
        .delete()
        .eq("order_id", orderId);

      if (extraItemsError) {
        console.error('❌ Erro ao deletar itens extras da comanda:', extraItemsError);
        throw extraItemsError;
      }
      console.log('✅ Itens extras deletados com sucesso');

      // Deletar pagamentos relacionados
      console.log('🔄 Passo 3: Deletando pagamentos...');
      const { error: paymentsError } = await supabase
        .from("payments")
        .delete()
        .eq("order_id", orderId);

      if (paymentsError) {
        console.error('❌ Erro ao deletar pagamentos da comanda:', paymentsError);
        throw paymentsError;
      }
      console.log('✅ Pagamentos deletados com sucesso');

      // Finalmente, deletar a comanda
      console.log('🔄 Passo 4: Deletando comanda principal...');
      console.log('🔍 ID da comanda a ser deletada:', orderId);
      
      // Primeiro, verificar se a comanda existe
      const { data: existingOrder, error: checkError } = await supabase
        .from("orders")
        .select("id, order_number, status")
        .eq("id", orderId)
        .single();

      if (checkError) {
        console.error('❌ Erro ao verificar comanda:', checkError);
        throw checkError;
      }
      
      console.log('🔍 Comanda encontrada:', existingOrder);
      
      // Tentar deletar a comanda
      const { error: orderError, count } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (orderError) {
        console.error('❌ Erro ao deletar comanda:', orderError);
        console.error('❌ Detalhes do erro:', {
          code: orderError.code,
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint
        });
        throw orderError;
      }
      
      console.log('✅ Comanda principal deletada com sucesso. Registros afetados:', count);
      
      if (count === 0) {
        console.log('⚠️ ATENÇÃO: Nenhum registro foi afetado! Isso pode indicar:');
        console.log('⚠️ 1. RLS (Row Level Security) bloqueando a exclusão');
        console.log('⚠️ 2. Permissões insuficientes');
        console.log('⚠️ 3. Chaves estrangeiras impedindo a exclusão');
        throw new Error('Nenhum registro foi afetado pela exclusão');
      }

      console.log('🎉 Exclusão concluída com sucesso!');
      
      // Remover comanda do estado local imediatamente
      console.log('🔄 Removendo comanda do estado local...');
      console.log('📊 Estado atual antes da remoção:', orders.length, 'comandas');
      console.log('🎯 ID da comanda a ser removida:', orderId);
      
      // Forçar remoção imediata usando uma abordagem mais direta
      const updatedOrders = orders.filter(order => {
        const shouldKeep = order.id !== orderId;
        console.log(`🔍 Comanda ${order.order_number} (${order.id}): ${shouldKeep ? 'MANTER' : 'REMOVER'}`);
        return shouldKeep;
      });
      
      console.log('📋 Comandas após filtro:', updatedOrders.map(o => ({ id: o.id, number: o.order_number })));
      console.log('✅ Comanda removida do estado local. Total restante:', updatedOrders.length);
      
      // Atualizar o estado diretamente
      setOrders(updatedOrders);
      
      // Verificar se o estado foi atualizado
      console.log('🔄 Verificando se o estado foi atualizado...');
      setTimeout(() => {
        console.log('📊 Estado após atualização:', orders.length, 'comandas');
        console.log('📋 IDs atuais:', orders.map(o => ({ id: o.id, number: o.order_number })));
      }, 100);
      
      toast({
        title: "Comanda excluída!",
        description: `Comanda #${orderNumber} foi excluída com sucesso.`,
      });

      // Forçar re-renderização
      console.log('🔄 Forçando re-renderização...');
      setRefreshKey(prev => prev + 1);

      // Aguardar um pouco para garantir que o estado foi atualizado
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verificar se a comanda foi realmente excluída do banco
      console.log('🔍 Verificando se a comanda foi excluída do banco...');
      const { data: checkData, error: verifyError } = await supabase
        .from("orders")
        .select("id")
        .eq("id", orderId)
        .single();

      if (verifyError && verifyError.code === 'PGRST116') {
        console.log('✅ Comanda confirmada como excluída do banco');
      } else if (checkData) {
        console.log('❌ ERRO: Comanda ainda existe no banco!', checkData);
        throw new Error('Comanda não foi excluída do banco de dados');
      }

      // Recarregar a lista de comandas para garantir sincronização
      console.log('🔄 Recarregando lista de comandas para sincronização...');
      await fetchOrders();
      console.log('✅ Lista de comandas recarregada');
    } catch (error: unknown) {
      console.error('💥 Erro geral ao excluir comanda:', error);
      toast({
        title: "Erro ao excluir comanda",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  }, [orders, toast]);

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

  // Monitorar mudanças no estado de comandas
  useEffect(() => {
    console.log('🔄 Estado de comandas atualizado:', orders.length, 'comandas');
    console.log('📋 IDs das comandas atuais:', orders.map(o => ({ id: o.id, number: o.order_number })));
  }, [orders]);

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
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold mb-2">Comandas</h1>
          <p className="text-muted-foreground text-base lg:text-lg">
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
          <div key={refreshKey} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {orders.map((order) => (
              <Card key={order.id} className="shadow-soft hover:shadow-lg transition-smooth">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <span className="text-2xl font-bold">#{order.order_number}</span>
                      {getStatusBadge(order.status)}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/dashboard/order-details/${order.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      {order.status === "open" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/edit-order/${order.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteOrder(order.id, order.order_number, order.status)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </>
                      )}
                      {order.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Sendo Editada
                        </Button>
                      )}
                      {/* Botão de exclusão para comandas fechadas/canceladas */}
                      {(order.status === "closed" || order.status === "cancelled") && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteOrder(order.id, order.order_number, order.status)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
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
