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
  const [pricePerKg, setPricePerKg] = useState<number>(59.90);

  useEffect(() => {
    if (orderId) {
      fetchOrderData();
      fetchExtraItems();
      fetchSystemSettings();
    }

    // Cleanup function to restore order status when component unmounts
    return () => {
      if (orderId && order && order.status === "pending") {
        // Restaurar status para "open" apenas se ainda estiver em "pending"
        supabase
          .from("orders")
          .update({ status: "open" as any })
          .eq("id", orderId)
          .then(({ error }) => {
            if (error) {
              console.error("Erro ao restaurar status da comanda:", error);
            }
          });
      }
    };
  }, [orderId]);

  const fetchOrderData = async () => {
    try {
      // Set order to pending status when editing starts
      // Type assertion necessário pois "pending" não está no enum de tipos gerados
      await supabase
        .from("orders")
        .update({ status: "pending" as any })
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
          extra_item_id: extraItem.extra_item_id,
        }))
      ];
      
      setOrderItems(allItems);
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
      // Garantir que as configurações existam e o preço esteja correto
      const { autoFixPricePerKg, ensureSystemSettings } = await import("@/utils/autoFix");
      await ensureSystemSettings();
      const fixResult = await autoFixPricePerKg();
      
      if (fixResult.success) {
        console.log('✅', fixResult.message);
      } else {
        console.warn('⚠️', fixResult.message);
      }
      
      // Limpar cache antes de buscar
      const { clearSettingsCache } = await import("@/utils/settingsCache");
      clearSettingsCache();
      
      const { data, error } = await supabase
        .from("system_settings")
        .select("price_per_kg")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar configurações:", error);
        // Usar valor padrão 59.90 em caso de erro
        setPricePerKg(59.90);
        return;
      }

      if (data && data.price_per_kg) {
        const price = Number(data.price_per_kg);
        // FORÇAR para 59.90 se não for esse valor
        if (price !== 59.90) {
          console.warn(`⚠️ Preço incorreto no banco (R$ ${price.toFixed(2)}). Forçando R$ 59,90.`);
          setPricePerKg(59.90);
          // Tentar corrigir novamente
          await autoFixPricePerKg();
        } else {
          setPricePerKg(price);
        }
      } else {
        setPricePerKg(59.90); // Valor padrão
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      // Usar valor padrão em caso de erro
      setPricePerKg(59.90);
    }
  };

  // Listener para atualizações de configurações em tempo real
  useEffect(() => {
    const handleSettingsUpdate = (event: CustomEvent) => {
      const settings = event.detail;
      if (settings?.price_per_kg) {
        const price = Number(settings.price_per_kg);
        console.log('🔄 Configurações atualizadas em EditOrder, atualizando preço...');
        // FORÇAR para 59.90 se não for esse valor
        if (price !== 59.90) {
          console.warn(`⚠️ Preço incorreto recebido (R$ ${price.toFixed(2)}). Forçando R$ 59,90.`);
          setPricePerKg(59.90);
        } else {
          setPricePerKg(price);
        }
      }
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    };
  }, []);

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

      // Buscar comanda atualizada do banco para evitar problemas de concorrência
      const { data: currentOrder, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", order.id)
        .single();

      if (fetchError) {
        console.error("Erro ao buscar comanda atualizada:", fetchError);
        // Continuar com cálculo local, mas logar o erro
      }

      // Usar dados atualizados se disponíveis, senão usar dados locais
      const baseOrder = currentOrder || order;

      // Update order totals - usar dados atualizados para evitar problemas de concorrência
      const newTotalWeight = baseOrder.total_weight + weightNum;
      const newFoodTotal = baseOrder.food_total + foodTotal;
      const newTotalAmount = newFoodTotal + baseOrder.extras_total;

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          total_weight: newTotalWeight,
          food_total: newFoodTotal,
          total_amount: newTotalAmount,
        })
        .eq("id", order.id);

      if (updateError) throw updateError;

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
            description: "Você não tem permissão para adicionar itens a esta comanda.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao adicionar item",
            description: error.message || "Não foi possível adicionar o item à comanda",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erro ao adicionar item",
          description: "Não foi possível adicionar o item à comanda",
          variant: "destructive",
        });
      }
    }
  };

  const addExtraItems = async () => {
    if (selectedExtraItems.length === 0) {
      toast({
        title: "Nenhum item selecionado",
        description: "Selecione pelo menos um item extra para adicionar",
        variant: "destructive",
      });
      return;
    }

    // Validação: verificar se todos os itens têm quantidade válida
    const invalidItems = selectedExtraItems.filter(item => !item.quantity || item.quantity <= 0);
    if (invalidItems.length > 0) {
      toast({
        title: "Quantidade inválida",
        description: "Todos os itens devem ter uma quantidade maior que zero",
        variant: "destructive",
      });
      return;
    }

    // Validação: verificar se todos os itens têm preço válido
    const invalidPrices = selectedExtraItems.filter(item => !item.price || item.price <= 0);
    if (invalidPrices.length > 0) {
      toast({
        title: "Preço inválido",
        description: "Todos os itens devem ter um preço válido maior que zero",
        variant: "destructive",
      });
      return;
    }

    if (!order) {
      toast({
        title: "Erro",
        description: "Comanda não encontrada. Por favor, recarregue a página.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Corrigido: usar order_extra_items ao invés de order_items
      const extraItemsData = selectedExtraItems.map(item => ({
        order_id: order.id,
        extra_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      // Type assertion necessário pois order_extra_items não está nos tipos gerados
      const { data: newItems, error: insertError } = await (supabase
        .from("order_extra_items" as any)
        .insert(extraItemsData)
        .select() as any);

      if (insertError) throw insertError;

      // Calculate new extras total
      const newExtrasTotal = selectedExtraItems.reduce((total, item) => 
        total + (item.price * item.quantity), 0
      );

      // Corrigido: cálculo correto do total (não soma extras_total duas vezes)
      const updatedExtrasTotal = order.extras_total + newExtrasTotal;
      const newTotalAmount = order.food_total + updatedExtrasTotal;

      // Update order totals
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          extras_total: updatedExtrasTotal,
          total_amount: newTotalAmount,
        })
        .eq("id", order.id);

      if (updateError) throw updateError;

      // Update local state - mapear order_extra_items para formato OrderItem
      const mappedItems: OrderItem[] = (newItems as any[]).map((item: any) => ({
        id: item.id,
        item_type: "extra",
        description: `${extraItems.find(ei => ei.id === item.extra_item_id)?.name || 'Item Extra'} (x${item.quantity})`,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        extra_item_id: item.extra_item_id,
      }));
      
      setOrderItems(prev => [...prev, ...mappedItems]);
      setOrder(prev => prev ? {
        ...prev,
        extras_total: updatedExtrasTotal,
        total_amount: newTotalAmount,
      } : null);

      const itemsCount = selectedExtraItems.length;
      setSelectedExtraItems([]);
      toast({
        title: "Itens extras adicionados!",
        description: `${itemsCount} item(s) adicionado(s) à comanda`,
      });
    } catch (error) {
      console.error("Erro ao adicionar itens extras:", error);
      
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
            description: "Você não tem permissão para adicionar itens a esta comanda.",
            variant: "destructive",
          });
        } else if (error.message.includes("duplicate") || error.message.includes("unique")) {
          toast({
            title: "Erro ao adicionar",
            description: "Parece que houve um conflito. Por favor, recarregue a página e tente novamente.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao adicionar itens",
            description: error.message || "Não foi possível adicionar os itens extras",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erro ao adicionar itens",
          description: "Não foi possível adicionar os itens extras",
          variant: "destructive",
        });
      }
    }
  };

  const removeItem = async (itemId: string) => {
    if (!order) {
      toast({
        title: "Erro",
        description: "Comanda não encontrada. Por favor, recarregue a página.",
        variant: "destructive",
      });
      return;
    }

    try {
      const itemToRemove = orderItems.find(item => item.id === itemId);
      if (!itemToRemove) {
        toast({
          title: "Item não encontrado",
          description: "O item não foi encontrado na comanda",
          variant: "destructive",
        });
        return;
      }

      // Remover item do banco - verificar se é item extra ou item normal
      let error;
      if (itemToRemove.item_type === "extra" && itemToRemove.extra_item_id) {
        // Item extra deve ser removido de order_extra_items
        // Type assertion necessário pois order_extra_items não está nos tipos gerados
        const { error: deleteError } = await (supabase
          .from("order_extra_items" as any)
          .delete()
          .eq("id", itemId) as any);
        error = deleteError;
      } else {
        // Item normal deve ser removido de order_items
        const { error: deleteError } = await supabase
          .from("order_items")
          .delete()
          .eq("id", itemId);
        error = deleteError;
      }

      if (error) throw error;

      // Buscar comanda atualizada do banco para evitar problemas de concorrência
      const { data: currentOrder, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", order.id)
        .single();

      if (fetchError) {
        console.error("Erro ao buscar comanda atualizada:", fetchError);
        // Continuar com cálculo local, mas logar o erro
      }

      // Usar dados atualizados se disponíveis, senão usar dados locais
      const baseOrder = currentOrder || order;

      // Update order totals
      let newTotalWeight = baseOrder.total_weight;
      let newFoodTotal = baseOrder.food_total;
      let newExtrasTotal = baseOrder.extras_total;

      if (itemToRemove.item_type === "food_weight") {
        newTotalWeight -= itemToRemove.quantity;
        newFoodTotal -= itemToRemove.total_price;
      } else if (itemToRemove.item_type === "extra") {
        newExtrasTotal -= itemToRemove.total_price;
      }

      // Garantir que valores não sejam negativos
      newTotalWeight = Math.max(0, newTotalWeight);
      newFoodTotal = Math.max(0, newFoodTotal);
      newExtrasTotal = Math.max(0, newExtrasTotal);

      const newTotalAmount = newFoodTotal + newExtrasTotal;

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          total_weight: newTotalWeight,
          food_total: newFoodTotal,
          extras_total: newExtrasTotal,
          total_amount: newTotalAmount,
        })
        .eq("id", order.id);

      if (updateError) throw updateError;

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
            description: "Você não tem permissão para remover itens desta comanda.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao remover item",
            description: error.message || "Não foi possível remover o item da comanda",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erro ao remover item",
          description: "Não foi possível remover o item da comanda",
          variant: "destructive",
        });
      }
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
              onClick={async () => {
                // Restaurar status da comanda antes de sair
                if (order && order.status === "pending") {
                  try {
                    const { error } = await supabase
                      .from("orders")
                      .update({ status: "open" as any })
                      .eq("id", order.id);
                    if (error) {
                      console.error("Erro ao restaurar status:", error);
                      toast({
                        title: "Aviso",
                        description: "Não foi possível restaurar o status da comanda automaticamente",
                        variant: "destructive",
                      });
                    }
                  } catch (err) {
                    console.error("Erro ao restaurar status:", err);
                  }
                }
                navigate("/dashboard/orders");
              }}
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
