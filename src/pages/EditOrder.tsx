import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { ArrowLeft, Plus, Minus, Trash2, Save } from "lucide-react";
import ExtraItemsSelector from "@/components/ExtraItemsSelector";

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
}

interface OrderItem {
  id: string;
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  extra_item_id?: string;
}

interface ExtraItem {
  id: string;
  name: string;
  price: number;
}

const EditOrder = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states for adding new items
  const [newWeight, setNewWeight] = useState<string>("");
  const [selectedExtraItems, setSelectedExtraItems] = useState<Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>>([]);
  const [pricePerKg, setPricePerKg] = useState<number>(45.00);

  useEffect(() => {
    if (orderId) {
      fetchOrderData();
      fetchExtraItems();
      fetchSystemSettings();
    }

    // Cleanup function to restore order status when component unmounts
    return () => {
      if (orderId && order) {
        supabase
          .from("orders")
          .update({ status: "open" })
          .eq("id", orderId);
      }
    };
  }, [orderId]);

  const fetchOrderData = async () => {
    try {
      // Set order to pending status when editing starts
      await supabase
        .from("orders")
        .update({ status: "pending" })
        .eq("id", orderId);

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
      console.error("Erro ao carregar comanda:", error);
      toast({
        title: "Erro ao carregar comanda",
        description: "Não foi possível carregar os dados da comanda",
        variant: "destructive",
      });
      navigate("/orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchExtraItems = async () => {
    try {
      const { data, error } = await supabase
        .from("extra_items")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setExtraItems(data || []);
    } catch (error) {
      console.error("Erro ao carregar itens extras:", error);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("price_per_kg")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setPricePerKg(Number(data.price_per_kg));
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const addFoodItem = async () => {
    if (!newWeight || Number(newWeight) <= 0) {
      toast({
        title: "Peso inválido",
        description: "Por favor, insira um peso válido",
        variant: "destructive",
      });
      return;
    }

    if (!order) return;

    const weightNum = Number(newWeight);
    const foodTotal = weightNum * pricePerKg;

    try {
      // Add new order item
      const { data: newItem, error } = await supabase
        .from("order_items")
        .insert({
          order_id: order.id,
          item_type: "food_weight",
          description: `Comida por quilo - ${weightNum}kg`,
          quantity: weightNum,
          unit_price: pricePerKg,
          total_price: foodTotal,
        })
        .select()
        .single();

      if (error) throw error;

      // Update order totals
      const newTotalWeight = order.total_weight + weightNum;
      const newFoodTotal = order.food_total + foodTotal;
      const newTotalAmount = newFoodTotal + order.extras_total;

      await supabase
        .from("orders")
        .update({
          total_weight: newTotalWeight,
          food_total: newFoodTotal,
          total_amount: newTotalAmount,
        })
        .eq("id", order.id);

      // Update local state
      setOrderItems(prev => [...prev, newItem]);
      setOrder(prev => prev ? {
        ...prev,
        total_weight: newTotalWeight,
        food_total: newFoodTotal,
        total_amount: newTotalAmount,
      } : null);

      setNewWeight("");
      toast({
        title: "Item adicionado!",
        description: `${weightNum}kg de comida adicionado à comanda`,
      });
    } catch (error) {
      console.error("Erro ao adicionar item:", error);
      toast({
        title: "Erro ao adicionar item",
        description: "Não foi possível adicionar o item à comanda",
        variant: "destructive",
      });
    }
  };

  const addExtraItems = async () => {
    if (selectedExtraItems.length === 0) {
      toast({
        title: "Nenhum item selecionado",
        description: "Selecione pelo menos um item extra",
        variant: "destructive",
      });
      return;
    }

    if (!order) return;

    try {
      const extraItemsData = selectedExtraItems.map(item => ({
        order_id: order.id,
        item_type: "extra",
        description: `${item.name} (x${item.quantity})`,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { data: newItems, error } = await supabase
        .from("order_items")
        .insert(extraItemsData)
        .select();

      if (error) throw error;

      // Calculate new extras total
      const newExtrasTotal = selectedExtraItems.reduce((total, item) => 
        total + (item.price * item.quantity), 0
      );

      const newTotalAmount = order.food_total + order.extras_total + newExtrasTotal;

      // Update order totals
      await supabase
        .from("orders")
        .update({
          extras_total: order.extras_total + newExtrasTotal,
          total_amount: newTotalAmount,
        })
        .eq("id", order.id);

      // Update local state
      setOrderItems(prev => [...prev, ...newItems]);
      setOrder(prev => prev ? {
        ...prev,
        extras_total: prev.extras_total + newExtrasTotal,
        total_amount: newTotalAmount,
      } : null);

      setSelectedExtraItems([]);
      toast({
        title: "Itens extras adicionados!",
        description: `${selectedExtraItems.length} item(s) adicionado(s) à comanda`,
      });
    } catch (error) {
      console.error("Erro ao adicionar itens extras:", error);
      toast({
        title: "Erro ao adicionar itens",
        description: "Não foi possível adicionar os itens extras",
        variant: "destructive",
      });
    }
  };

  const removeItem = async (itemId: string) => {
    if (!order) return;

    try {
      const itemToRemove = orderItems.find(item => item.id === itemId);
      if (!itemToRemove) return;

      // Remove item from database
      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      // Update order totals
      let newTotalWeight = order.total_weight;
      let newFoodTotal = order.food_total;
      let newExtrasTotal = order.extras_total;

      if (itemToRemove.item_type === "food_weight") {
        newTotalWeight -= itemToRemove.quantity;
        newFoodTotal -= itemToRemove.total_price;
      } else if (itemToRemove.item_type === "extra") {
        newExtrasTotal -= itemToRemove.total_price;
      }

      const newTotalAmount = newFoodTotal + newExtrasTotal;

      await supabase
        .from("orders")
        .update({
          total_weight: newTotalWeight,
          food_total: newFoodTotal,
          extras_total: newExtrasTotal,
          total_amount: newTotalAmount,
        })
        .eq("id", order.id);

      // Update local state
      setOrderItems(prev => prev.filter(item => item.id !== itemId));
      setOrder(prev => prev ? {
        ...prev,
        total_weight: newTotalWeight,
        food_total: newFoodTotal,
        extras_total: newExtrasTotal,
        total_amount: newTotalAmount,
      } : null);

      toast({
        title: "Item removido!",
        description: "Item removido da comanda com sucesso",
      });
    } catch (error) {
      console.error("Erro ao remover item:", error);
      toast({
        title: "Erro ao remover item",
        description: "Não foi possível remover o item da comanda",
        variant: "destructive",
      });
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
          <p className="text-muted-foreground">Carregando comanda...</p>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard/orders")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Editar Comanda #{order.order_number}
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
              <CardTitle>Resumo da Comanda</CardTitle>
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

          {/* Add Items */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Adicionar Itens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Food Weight */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Adicionar Comida por Quilo</h3>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0.000"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addFoodItem} disabled={!newWeight}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Add Extra Items */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Adicionar Itens Extras</h3>
                <ExtraItemsSelector
                  selectedItems={selectedExtraItems}
                  onItemsChange={setSelectedExtraItems}
                />
                <Button onClick={addExtraItems} disabled={selectedExtraItems.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Itens Extras
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Items */}
        <Card>
          <CardHeader>
            <CardTitle>Itens da Comanda</CardTitle>
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
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} x R$ {Number(item.unit_price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">
                        R$ {Number(item.total_price).toFixed(2)}
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

export default EditOrder;
