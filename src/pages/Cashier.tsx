import { useEffect, useState } from "react";
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOpenOrders();
  }, []);

  const fetchOpenOrders = async () => {
    try {
      // Corrigido: buscar comandas "open" e "pending" (em edição)
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total_amount, total_weight, status, customer_name")
        .in("status", ["open", "pending"])
        .order("order_number", { ascending: false });

      if (error) {
        console.error('Erro ao carregar comandas abertas:', error);
        toast({
          title: "Erro ao carregar comandas",
          description: error.message,
          variant: "destructive",
        });
        setOrders([]);
      } else {
        setOrders(data || []);
      }
    } catch (err) {
      console.error('Erro geral ao carregar comandas abertas:', err);
      
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
                {orders.length} comanda{orders.length !== 1 ? "s" : ""} aberta{orders.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        Comanda #{order.order_number} - {order.customer_name} - R$ {Number(order.total_amount).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrder && (
                <div className="space-y-3 p-4 bg-accent/30 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="font-semibold">
                      {selectedOrder.customer_name}
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
