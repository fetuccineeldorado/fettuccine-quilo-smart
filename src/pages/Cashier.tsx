import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { CreditCard, DollarSign, Smartphone, Receipt, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Order {
  id: string;
  order_number: number;
  total_amount: number;
  total_weight: number;
  status: string;
  customer_name: string;
}

const Cashier = () => {
  console.log('🎯🎯🎯 COMPONENTE CASHIER INICIADO! 🎯🎯🎯');
  console.log('🎯 Cashier: Componente sendo renderizado agora!');
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);
  
  // Refs para acessar valores atuais sem causar re-renders
  const ordersRef = useRef(orders);
  const selectedOrderRef = useRef(selectedOrder);
  
  // Atualizar refs quando estado muda
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  
  useEffect(() => {
    selectedOrderRef.current = selectedOrder;
  }, [selectedOrder]);

  useEffect(() => {
    console.log('🚀🚀🚀 Cashier: Componente montado! 🚀🚀🚀');
    console.log('🚀 Cashier: Componente montado, iniciando busca de comandas...');
    console.log('🚀 Cashier: Timestamp:', new Date().toISOString());
    
    // Garantir que fetchOpenOrders seja chamada
    const loadOrders = async () => {
      try {
        await fetchOpenOrders();
      } catch (error) {
        console.error('💥 Erro ao chamar fetchOpenOrders:', error);
      }
    };
    
    loadOrders();

    // Real-time subscription para atualizações automáticas de comandas
    const ordersChannel = supabase
      .channel("cashier-orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("🔄 Atualização de comanda detectada:", payload.eventType, payload.new);
          
          // Se foi INSERT ou UPDATE, atualizar a lista
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const updatedOrder = payload.new as Order;
            
            // Se a comanda foi fechada (status mudou para "closed"), remover da lista
            if (updatedOrder.status === "closed") {
              setOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
              
              // Se a comanda selecionada foi fechada, limpar seleção
              if (selectedOrderRef.current?.id === updatedOrder.id) {
                setSelectedOrder(null);
                setPaymentMethod("");
                setAmountReceived("");
                toast({
                  title: "Comanda fechada",
                  description: `A comanda #${updatedOrder.order_number} foi fechada.`,
                });
              }
            } else {
              // Atualizar ou adicionar comanda na lista
              setOrders(prev => {
                const existingIndex = prev.findIndex(o => o.id === updatedOrder.id);
                if (existingIndex >= 0) {
                  // Atualizar comanda existente
                  const updated = [...prev];
                  updated[existingIndex] = updatedOrder;
                  
                  // Se a comanda selecionada foi atualizada, atualizar também
                  if (selectedOrderRef.current?.id === updatedOrder.id) {
                    setSelectedOrder(updatedOrder);
                  }
                  
                  return updated;
                } else {
                  // Adicionar nova comanda (se for "open" ou "pending")
                  if (updatedOrder.status === "open" || updatedOrder.status === "pending") {
                    return [...prev, updatedOrder].sort((a, b) => b.order_number - a.order_number);
                  }
                  return prev;
                }
              });
              
              // Feedback visual para atualizações
              if (payload.eventType === "UPDATE" && selectedOrderRef.current?.id === updatedOrder.id) {
                toast({
                  title: "Comanda atualizada",
                  description: "Os valores da comanda foram atualizados automaticamente.",
                  duration: 2000,
                });
              }
            }
          } else if (payload.eventType === "DELETE") {
            // Remover comanda deletada da lista
            const deletedOrder = payload.old as Order;
            setOrders(prev => prev.filter(o => o.id !== deletedOrder.id));
            
            // Se a comanda selecionada foi deletada, limpar seleção
            if (selectedOrderRef.current?.id === deletedOrder.id) {
              setSelectedOrder(null);
              setPaymentMethod("");
              setAmountReceived("");
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Status da subscription de comandas:", status);
      });

    // Subscription para mudanças em order_items que podem afetar totais
    const orderItemsChannel = supabase
      .channel("cashier-order-items-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
        },
        async (payload) => {
          console.log("🔄 Mudança em itens de comanda detectada:", payload.eventType);
          
          // Quando há mudança em order_items, buscar comanda atualizada
          if (payload.new && "order_id" in payload.new) {
            const orderId = payload.new.order_id as string;
            
            // Verificar se a comanda está na lista de comandas abertas
            const orderInList = ordersRef.current.find(o => o.id === orderId);
            if (orderInList) {
              // Buscar dados atualizados da comanda
              const { data: updatedOrder, error } = await supabase
                .from("orders")
                .select("id, order_number, total_amount, total_weight, status, customer_name")
                .eq("id", orderId)
                .single();
              
              if (!error && updatedOrder) {
                // Atualizar comanda na lista
                setOrders(prev => {
                  const updated = prev.map(o => 
                    o.id === orderId ? updatedOrder : o
                  );
                  return updated;
                });
                
                // Atualizar comanda selecionada se for a mesma
                if (selectedOrderRef.current?.id === orderId) {
                  setSelectedOrder(updatedOrder);
                  toast({
                    title: "Comanda atualizada",
                    description: "Os itens da comanda foram atualizados.",
                    duration: 2000,
                  });
                }
              }
            }
          }
        }
      )
      .subscribe();

    // Subscription para mudanças em order_extra_items
    const orderExtraItemsChannel = supabase
      .channel("cashier-order-extra-items-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_extra_items",
        },
        async (payload) => {
          console.log("🔄 Mudança em itens extras de comanda detectada:", payload.eventType);
          
          // Quando há mudança em order_extra_items, buscar comanda atualizada
          if (payload.new && "order_id" in payload.new) {
            const orderId = payload.new.order_id as string;
            
            // Verificar se a comanda está na lista de comandas abertas
            const orderInList = ordersRef.current.find(o => o.id === orderId);
            if (orderInList) {
              // Buscar dados atualizados da comanda
              const { data: updatedOrder, error } = await supabase
                .from("orders")
                .select("id, order_number, total_amount, total_weight, status, customer_name")
                .eq("id", orderId)
                .single();
              
              if (!error && updatedOrder) {
                // Atualizar comanda na lista
                setOrders(prev => {
                  const updated = prev.map(o => 
                    o.id === orderId ? updatedOrder : o
                  );
                  return updated;
                });
                
                // Atualizar comanda selecionada se for a mesma
                if (selectedOrderRef.current?.id === orderId) {
                  setSelectedOrder(updatedOrder);
                  toast({
                    title: "Comanda atualizada",
                    description: "Os itens extras da comanda foram atualizados.",
                    duration: 2000,
                  });
                }
              }
            }
          }
        }
      )
      .subscribe();

    // Cleanup: remover subscriptions quando componente desmontar
    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(orderItemsChannel);
      supabase.removeChannel(orderExtraItemsChannel);
    };
  }, [toast]); // Removido orders e selectedOrder das dependências para evitar loops

  const fetchOpenOrders = async () => {
    console.log('🚀🚀🚀 fetchOpenOrders CHAMADA! 🚀🚀🚀');
    console.log('🚀🚀🚀 Stack trace:', new Error().stack);
    setLoadingOrders(true);
    try {
      console.log('🔄 Cashier: Buscando comandas abertas...');
      console.log('🔄 Cashier: Timestamp:', new Date().toISOString());
      console.log('🔄 Cashier: Supabase client:', !!supabase);
      
      // Verificar sessão antes de buscar comandas
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ Cashier: Erro de autenticação:', sessionError);
        toast({
          title: "Erro de autenticação",
          description: "Por favor, faça login novamente.",
          variant: "destructive",
        });
        setOrders([]);
        return;
      }
      
      console.log('✅ Cashier: Sessão válida, buscando comandas...');
      
      // Buscar comandas "open" primeiro (sempre disponível)
      const { data: openData, error: openError } = await supabase
        .from("orders")
        .select("id, order_number, total_amount, total_weight, status, customer_name")
        .eq("status", "open")
        .order("order_number", { ascending: false });

      if (openError) {
        console.error('❌ Cashier: Erro ao buscar comandas "open":', openError);
        throw openError;
      }
      
      console.log('✅ Cashier: Comandas "open" encontradas:', openData?.length || 0);
      if (openData && openData.length > 0) {
        console.log('📋 Cashier: IDs das comandas "open":', openData.map(o => ({ id: o.id, number: o.order_number, total: o.total_amount })));
      }

      // Tentar buscar comandas "pending" (pode não existir se migração não foi aplicada)
      let pendingData: typeof openData = [];
      try {
        const { data: pending, error: pendingError } = await supabase
          .from("orders")
          .select("id, order_number, total_amount, total_weight, status, customer_name")
          .eq("status", "pending" as any)
          .order("order_number", { ascending: false });
        
        if (!pendingError && pending) {
          pendingData = pending;
          console.log('✅ Cashier: Comandas "pending" encontradas:', pending.length);
        } else if (pendingError) {
          console.log('⚠️ Cashier: Status "pending" não disponível ou erro:', pendingError.message);
        }
      } catch (pendingErr) {
        // Se "pending" não existe no enum, ignorar o erro e continuar apenas com "open"
        console.log('⚠️ Cashier: Status "pending" não disponível no banco. Continuando apenas com comandas "open".');
      }

      // Combinar resultados
      const allOrders = [...(openData || []), ...(pendingData || [])];
      
      console.log('📊 Cashier: Total de comandas antes de remover duplicatas:', allOrders.length);
      
      // Remover duplicatas (caso existam)
      const uniqueOrders = allOrders.filter((order, index, self) =>
        index === self.findIndex(o => o.id === order.id)
      );

      console.log('✅ Cashier: Total de comandas únicas:', uniqueOrders.length);
      if (uniqueOrders.length > 0) {
        console.log('📋 Cashier: Comandas que serão exibidas:', uniqueOrders.map(o => ({ number: o.order_number, total: o.total_amount })));
      } else {
        console.log('⚠️ Cashier: Nenhuma comanda aberta encontrada!');
      }

      setOrders(uniqueOrders);

    } catch (err) {
      console.error('💥 Cashier: Erro geral ao carregar comandas abertas:', err);
      
      // Tratamento específico de erros
      let errorMessage = "Erro desconhecido";
      if (err instanceof Error) {
        if (err.message.includes("network") || err.message.includes("fetch")) {
          errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        } else if (err.message.includes("permission") || err.message.includes("unauthorized")) {
          errorMessage = "Você não tem permissão para visualizar comandas.";
        } else {
          errorMessage = err.message;
        }
      }
      
      toast({
        title: "Erro ao carregar comandas",
        description: errorMessage,
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const calculateChange = () => {
    if (!selectedOrder || !amountReceived) return 0;
    const received = Number(amountReceived);
    const total = Number(selectedOrder.total_amount);
    return Math.max(0, received - total);
  };

  const handlePayment = async () => {
    if (!selectedOrder || !paymentMethod) {
      toast({
        title: "Dados incompletos",
        description: "Selecione uma comanda e forma de pagamento",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "cash") {
      // Validação de valor recebido
      if (!amountReceived || amountReceived.trim() === "") {
        toast({
          title: "Valor não informado",
          description: "Por favor, informe o valor recebido",
          variant: "destructive",
        });
        return;
      }

      const received = Number(amountReceived);
      
      // Validação de número válido
      if (isNaN(received) || received <= 0) {
        toast({
          title: "Valor inválido",
          description: "Por favor, informe um valor válido maior que zero",
          variant: "destructive",
        });
        return;
      }

      // Validação de valor muito alto (proteção contra erros de digitação)
      if (received > Number(selectedOrder.total_amount) * 10) {
        toast({
          title: "Valor muito alto",
          description: "O valor informado parece estar incorreto. Por favor, verifique.",
          variant: "destructive",
        });
        return;
      }

      if (received < Number(selectedOrder.total_amount)) {
        toast({
          title: "Valor insuficiente",
          description: `Valor recebido (R$ ${received.toFixed(2)}) é menor que o total (R$ ${Number(selectedOrder.total_amount).toFixed(2)})`,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      // Usar timeout para evitar que operação trave indefinidamente
      let sessionTimeout: NodeJS.Timeout;
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) => {
        sessionTimeout = setTimeout(
          () => reject(new Error("Timeout: Verificação de sessão excedeu 10 segundos")),
          10000
        );
      });

      const { data: { session }, error: sessionError } = await Promise.race([
        sessionPromise.then((result) => {
          clearTimeout(sessionTimeout);
          return result;
        }),
        timeoutPromise,
      ]);

      // Validação crítica: verificar se há sessão ativa
      if (sessionError || !session?.user?.id) {
        toast({
          title: "Erro de autenticação",
          description: "Sessão inválida. Por favor, faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      // Create payment record - verificar erro
      const { error: paymentError } = await supabase.from("payments").insert([{
        order_id: selectedOrder.id,
        payment_method: paymentMethod as "cash" | "credit" | "debit" | "pix",
        amount: Number(selectedOrder.total_amount),
        change_amount: paymentMethod === "cash" ? calculateChange() : 0,
        processed_by: session.user.id,
      }]);

      if (paymentError) {
        console.error('Erro ao criar pagamento:', paymentError);
        throw paymentError;
      }

      // Update order status - verificar erro
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by: session.user.id,
        })
        .eq("id", selectedOrder.id);

      if (updateError) {
        console.error('Erro ao atualizar comanda:', updateError);
        // Tentar reverter pagamento criado (rollback manual)
        try {
          // Buscar o último pagamento criado para esta comanda por este usuário
          const { data: lastPayment, error: fetchError } = await supabase
            .from("payments")
            .select("id")
            .eq("order_id", selectedOrder.id)
            .eq("processed_by", session.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          
          if (!fetchError && lastPayment) {
            // Deletar o pagamento encontrado
            const { error: deletePaymentError } = await supabase
              .from("payments")
              .delete()
              .eq("id", lastPayment.id);
            
            if (deletePaymentError) {
              console.error('Erro ao reverter pagamento:', deletePaymentError);
              toast({
                title: "Erro crítico",
                description: "Pagamento foi registrado mas não foi possível fechar a comanda. Contate o suporte imediatamente.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Operação revertida",
                description: "Erro ao fechar comanda. Pagamento foi cancelado automaticamente.",
                variant: "destructive",
              });
            }
          } else {
            console.error('Erro ao buscar pagamento para reverter:', fetchError);
            toast({
              title: "Erro crítico",
              description: "Pagamento foi registrado mas não foi possível fechar a comanda. Contate o suporte imediatamente.",
              variant: "destructive",
            });
          }
        } catch (rollbackError) {
          console.error('Erro ao tentar rollback:', rollbackError);
          toast({
            title: "Erro crítico",
            description: "Pagamento foi registrado mas não foi possível fechar a comanda. Contate o suporte imediatamente.",
            variant: "destructive",
          });
        }
        throw updateError;
      }

      toast({
        title: "Pagamento processado!",
        description: `Comanda #${selectedOrder.order_number} fechada com sucesso`,
      });

      // Reset form
      setSelectedOrder(null);
      setPaymentMethod("");
      setAmountReceived("");
      fetchOpenOrders();
    } catch (error: unknown) {
      // Tratar erros de timeout especificamente
      if (error instanceof Error && error.message.includes("Timeout")) {
        toast({
          title: "Operação demorou muito",
          description: "A operação excedeu o tempo limite. Por favor, tente novamente ou verifique sua conexão.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Tratar erros de rede especificamente
      if (error instanceof Error && (
        error.message.includes("network") || 
        error.message.includes("fetch") || 
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      )) {
        toast({
          title: "Erro de conexão",
          description: "Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Erro ao processar pagamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { value: "cash", label: "Dinheiro", icon: DollarSign },
    { value: "debit", label: "Cartão Débito", icon: CreditCard },
    { value: "credit", label: "Cartão Crédito", icon: CreditCard },
    { value: "pix", label: "PIX", icon: Smartphone },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6 lg:space-y-8">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold mb-2">Caixa</h1>
          <p className="text-muted-foreground text-base lg:text-lg">
            Fechamento de comandas e processamento de pagamentos
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Selection */}
          <Card className="shadow-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-6 w-6 text-primary" />
                Selecionar Comanda
              </CardTitle>
              <CardDescription>
                {loadingOrders ? "Carregando..." : `${orders.length} comanda${orders.length !== 1 ? "s" : ""} aberta${orders.length !== 1 ? "s" : ""}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingOrders ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Carregando comandas...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Receipt className="h-12 w-12 mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground font-medium">Nenhuma comanda aberta</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    As comandas abertas aparecerão aqui quando forem criadas
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Número da Comanda</Label>
                  <Select
                    value={selectedOrder?.id}
                    onValueChange={(value) => {
                      const order = orders.find((o) => o.id === value);
                      setSelectedOrder(order || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma comanda" />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.map((order) => (
                        <SelectItem key={order.id} value={order.id}>
                          Comanda #{order.order_number} - {order.customer_name || "Sem nome"} - R$ {Number(order.total_amount).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedOrder && (
                <div className="space-y-3 p-4 bg-accent/30 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-semibold">
                      {selectedOrder.customer_name || "Sem nome"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Peso</span>
                    <span className="font-semibold">
                      {Number(selectedOrder.total_weight).toFixed(3)} kg
                    </span>
                  </div>
                  <div className="flex justify-between text-xl">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-primary">
                      R$ {Number(selectedOrder.total_amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/dashboard/edit-order/${selectedOrder.id}`)}
                      className="w-full"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Comanda
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Processing */}
          <Card className="shadow-strong">
            <CardHeader>
              <CardTitle>Processar Pagamento</CardTitle>
              <CardDescription>Selecione a forma de pagamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <Button
                      key={method.value}
                      variant={paymentMethod === method.value ? "default" : "outline"}
                      className="h-20 flex-col gap-2"
                      onClick={() => setPaymentMethod(method.value)}
                      disabled={!selectedOrder}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-sm">{method.label}</span>
                    </Button>
                  );
                })}
              </div>

              {paymentMethod === "cash" && selectedOrder && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount-received">Valor Recebido</Label>
                    <Input
                      id="amount-received"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={amountReceived}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Permitir vazio, mas validar se for número
                        if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100000)) {
                          setAmountReceived(value);
                        }
                      }}
                    />
                  </div>

                  {amountReceived && Number(amountReceived) >= Number(selectedOrder.total_amount) && (
                    <div className="p-4 bg-success/10 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-success font-medium">Troco</span>
                        <span className="text-2xl font-bold text-success">
                          R$ {calculateChange().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handlePayment}
                disabled={!selectedOrder || !paymentMethod || loading}
                size="lg"
                className="w-full"
              >
                {loading ? "Processando..." : "Confirmar Pagamento"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Cashier;
