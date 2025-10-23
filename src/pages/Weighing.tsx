import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import ExtraItemsSelector from "@/components/ExtraItemsSelector";
import { AlertCircle, Utensils } from "lucide-react";


const Weighing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [weight, setWeight] = useState<string>("");
  const [pricePerKg, setPricePerKg] = useState<number>(54.90);
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState<string>("");
  const [selectedExtraItems, setSelectedExtraItems] = useState<Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>>([]);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("price_per_kg")
        .single();
      
      if (error) {
        console.error('Erro ao carregar preço por kg:', error);
        toast({
          title: "Erro ao carregar configurações",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      if (data) {
        setPricePerKg(Number(data.price_per_kg));
      }
    } catch (err) {
      console.error('Erro geral ao carregar configurações:', err);
      toast({
        title: "Erro ao carregar configurações",
        description: "Erro desconhecido",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);


  const calculateFoodTotal = () => {
    const weightNum = Number(weight);
    return (weightNum * pricePerKg).toFixed(2);
  };

  const calculateExtraItemsTotal = () => {
    return selectedExtraItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const weightNum = Number(weight);
    const foodTotal = weightNum * pricePerKg;
    const extraItemsTotal = calculateExtraItemsTotal();
    return (foodTotal + extraItemsTotal).toFixed(2);
  };


  const handleCreateOrder = async () => {
    if (!customerName.trim()) {
      toast({
        title: "Nome do cliente obrigatório",
        description: "Por favor, insira o nome do cliente",
        variant: "destructive",
      });
      return;
    }

    if (!weight || Number(weight) <= 0) {
      toast({
        title: "Peso inválido",
        description: "Por favor, insira um peso válido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const weightNum = Number(weight);
      const foodTotal = weightNum * pricePerKg;
      const extraItemsTotal = calculateExtraItemsTotal();
      const total = foodTotal + extraItemsTotal;

      // Create new order
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          status: "open",
          customer_name: customerName.trim(),
          total_weight: weightNum,
          food_total: foodTotal,
          total_amount: total,
          opened_by: session?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create order item for food
      await supabase.from("order_items").insert({
        order_id: order.id,
        item_type: "food_weight",
        description: `Comida por quilo - ${weightNum}kg`,
        quantity: weightNum,
        unit_price: pricePerKg,
        total_price: foodTotal,
      });

      // Create order items for extra items
      if (selectedExtraItems.length > 0) {
        const extraItemsData = selectedExtraItems.map(item => ({
          order_id: order.id,
          extra_item_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        }));

        await supabase.from("order_extra_items").insert(extraItemsData);
      }


      toast({
        title: "Comanda criada!",
        description: `Comanda #${order.order_number} - ${customerName} - R$ ${total.toFixed(2)}`,
      });

      // Reset form
      setCustomerName("");
      setWeight("");
      setSelectedExtraItems([]);
      
      // Navigate to orders or stay for next weighing
      setTimeout(() => {
        navigate("/dashboard/orders");
      }, 1500);
    } catch (error: unknown) {
      toast({
        title: "Erro ao criar comanda",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Pesagem</h1>
          <p className="text-muted-foreground text-lg">
            Sistema de pesagem manual por quilo
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Manual Weighing Card */}
          <Card className="shadow-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-6 w-6 text-primary" />
                Pesagem Manual
              </CardTitle>
              <CardDescription>
                Insira o peso da comida manualmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="manual-weight">Peso (kg) *</Label>
                <Input
                  id="manual-weight"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-name">Nome do Cliente *</Label>
                <Input
                  id="customer-name"
                  type="text"
                  placeholder="Digite o nome do cliente"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Extra Items Card */}
          <Card className="shadow-strong">
            <CardHeader>
              <CardTitle>Itens Extra</CardTitle>
              <CardDescription>
                Adicione bebidas e outros itens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExtraItemsSelector
                selectedItems={selectedExtraItems}
                onItemsChange={setSelectedExtraItems}
              />
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="shadow-strong">
            <CardHeader>
              <CardTitle>Resumo da Comanda</CardTitle>
              <CardDescription>Valores calculados automaticamente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Preço por kg</span>
                  <span className="text-xl font-semibold">
                    R$ {pricePerKg.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Peso</span>
                  <span className="text-xl font-semibold">
                    {Number(weight || 0).toFixed(3)} kg
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Comida</span>
                  <span className="text-xl font-semibold">
                    R$ {calculateFoodTotal()}
                  </span>
                </div>

                {selectedExtraItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                      <span className="text-muted-foreground">Itens Extra</span>
                      <span className="text-xl font-semibold">
                        R$ {calculateExtraItemsTotal().toFixed(2)}
                      </span>
                    </div>
                    
                    {/* Lista detalhada dos itens extra */}
                    <div className="space-y-1">
                      {selectedExtraItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center px-4 py-2 bg-muted/50 rounded text-sm">
                          <span className="text-muted-foreground">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-medium">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                <div className="flex justify-between items-center p-6 bg-gradient-success rounded-lg">
                  <span className="text-success-foreground font-medium text-lg">
                    Total
                  </span>
                  <span className="text-3xl font-bold text-success-foreground">
                    R$ {calculateTotal()}
                  </span>
                </div>
              </div>

              {Number(weight) > 0 && Number(weight) < 0.1 && (
                <div className="flex items-start gap-2 p-4 bg-warning/10 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-warning">
                    Peso muito baixo. Verifique a balança.
                  </p>
                </div>
              )}

              <Button
                onClick={handleCreateOrder}
                disabled={!weight || Number(weight) <= 0 || !customerName.trim() || loading}
                size="lg"
                className="w-full"
              >
                {loading ? "Criando..." : "Criar Comanda"}
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Weighing;
