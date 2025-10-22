import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import ExtraItemsSelector from "@/components/ExtraItemsSelector";
import { Scale, CheckCircle, AlertCircle, ShoppingCart, Utensils } from "lucide-react";

interface SelectedExtraItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

const Weighing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [weight, setWeight] = useState<string>("");
  const [pricePerKg, setPricePerKg] = useState<number>(54.90);
  const [loading, setLoading] = useState(false);
  const [simulatedWeight, setSimulatedWeight] = useState<number>(0);
  const [extraItems, setExtraItems] = useState<SelectedExtraItem[]>([]);
  const [extraItemsTotal, setExtraItemsTotal] = useState<number>(0);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("price_per_kg")
      .single();
    
    if (data) {
      setPricePerKg(Number(data.price_per_kg));
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const simulateWeighing = () => {
    // Simulate a random weight between 0.2kg and 1.5kg
    const randomWeight = (Math.random() * 1.3 + 0.2).toFixed(3);
    setSimulatedWeight(Number(randomWeight));
    setWeight(randomWeight);
  };

  const calculateTotal = () => {
    const weightNum = Number(weight);
    const foodTotal = weightNum * pricePerKg;
    return (foodTotal + extraItemsTotal).toFixed(2);
  };

  const calculateFoodTotal = () => {
    const weightNum = Number(weight);
    return (weightNum * pricePerKg).toFixed(2);
  };

  const handleExtraItemsChange = (items: SelectedExtraItem[], total: number) => {
    setExtraItems(items);
    setExtraItemsTotal(total);
  };

  const handleCreateOrder = async () => {
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
      const total = foodTotal + extraItemsTotal;

      // Create new order
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          status: "open",
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
      if (extraItems.length > 0) {
        const extraItemsData = extraItems.map(item => ({
          order_id: order.id,
          item_type: "extra_item",
          description: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.total,
        }));

        await supabase.from("order_items").insert(extraItemsData);
      }

      toast({
        title: "Comanda criada!",
        description: `Comanda #${order.order_number} - R$ ${total.toFixed(2)}`,
      });

      // Reset form
      setWeight("");
      setSimulatedWeight(0);
      setExtraItems([]);
      setExtraItemsTotal(0);
      
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
            Sistema de pesagem automática por quilo com itens extras
          </p>
        </div>

        <Tabs defaultValue="weighing" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weighing" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Pesagem
            </TabsTrigger>
            <TabsTrigger value="extras" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Itens Extras
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weighing" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
          {/* Weighing Card */}
          <Card className="shadow-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-6 w-6 text-primary" />
                Balança Digital
              </CardTitle>
              <CardDescription>
                Coloque o prato na balança ou simule uma pesagem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-12 bg-accent/30 rounded-lg border-2 border-dashed border-border">
                {simulatedWeight > 0 ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-16 w-16 mx-auto text-success" />
                    <p className="text-6xl font-bold text-success">
                      {simulatedWeight} kg
                    </p>
                    <p className="text-muted-foreground">Peso detectado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Scale className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">Aguardando pesagem...</p>
                  </div>
                )}
              </div>

              <Button
                onClick={simulateWeighing}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Simular Pesagem Automática
              </Button>

              <div className="space-y-2">
                <Label htmlFor="manual-weight">Ou insira o peso manualmente</Label>
                <Input
                  id="manual-weight"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  value={weight}
                  onChange={(e) => {
                    setWeight(e.target.value);
                    setSimulatedWeight(0);
                  }}
                />
              </div>
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

                {extraItemsTotal > 0 && (
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Itens Extras</span>
                    <span className="text-xl font-semibold">
                      R$ {extraItemsTotal.toFixed(2)}
                    </span>
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
                disabled={!weight || Number(weight) <= 0 || loading}
                size="lg"
                className="w-full"
              >
                {loading ? "Criando..." : "Criar Comanda"}
              </Button>
            </CardContent>
          </Card>
            </div>
          </TabsContent>

          <TabsContent value="extras" className="space-y-6">
            <ExtraItemsSelector onItemsChange={handleExtraItemsChange} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Weighing;
