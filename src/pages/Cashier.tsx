import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { CreditCard, DollarSign, Smartphone, Receipt } from "lucide-react";

interface Order {
  id: string;
  order_number: number;
  total_amount: number;
  total_weight: number;
  status: string;
}

const Cashier = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [amountReceived, setAmountReceived] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOpenOrders();
  }, []);

  const fetchOpenOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "open")
      .order("order_number", { ascending: false });

    setOrders(data || []);
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
      const received = Number(amountReceived);
      if (received < Number(selectedOrder.total_amount)) {
        toast({
          title: "Valor insuficiente",
          description: "Valor recebido é menor que o total",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Create payment record
      await supabase.from("payments").insert([{
        order_id: selectedOrder.id,
        payment_method: paymentMethod as "cash" | "card" | "pix",
        amount: Number(selectedOrder.total_amount),
        change_amount: paymentMethod === "cash" ? calculateChange() : 0,
        processed_by: session?.user?.id,
      }]);

      // Update order status
      await supabase
        .from("orders")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by: session?.user?.id,
        })
        .eq("id", selectedOrder.id);

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
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Caixa</h1>
          <p className="text-muted-foreground text-lg">
            Fechamento de comandas e processamento de pagamentos
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
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
                        Comanda #{order.order_number} - R$ {Number(order.total_amount).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrder && (
                <div className="space-y-3 p-4 bg-accent/30 rounded-lg">
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
                      onChange={(e) => setAmountReceived(e.target.value)}
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
