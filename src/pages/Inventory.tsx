import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Package, Plus, AlertTriangle, CheckCircle } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  cost_per_unit: number;
  last_updated: string;
}

const Inventory = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    current_stock: 0,
    min_stock: 0,
    unit: "unidade",
    cost_per_unit: 0,
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Erro ao carregar estoque",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e categoria são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("inventory")
      .insert([newItem]);

    if (error) {
      toast({
        title: "Erro ao adicionar item",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Item adicionado!",
        description: "Novo item adicionado ao estoque",
      });
      setNewItem({
        name: "",
        category: "",
        current_stock: 0,
        min_stock: 0,
        unit: "unidade",
        cost_per_unit: 0,
      });
      setShowAddForm(false);
      fetchInventory();
    }
  };

  const getStockStatus = (current: number, min: number) => {
    if (current <= 0) return { status: "out", color: "destructive", label: "Sem estoque" };
    if (current <= min) return { status: "low", color: "destructive", label: "Estoque baixo" };
    return { status: "ok", color: "default", label: "Em estoque" };
  };

  const lowStockItems = items.filter(item => item.current_stock <= item.min_stock);
  const outOfStockItems = items.filter(item => item.current_stock <= 0);

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Estoque</h1>
            <p className="text-muted-foreground text-lg">
              Gerenciamento de inventário do restaurante
            </p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item
          </Button>
        </div>

        {/* Alerts */}
        {outOfStockItems.length > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">
                  {outOfStockItems.length} item(s) sem estoque
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {lowStockItems.length > 0 && (
          <Card className="border-warning bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">
                  {lowStockItems.length} item(s) com estoque baixo
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Item Form */}
        {showAddForm && (
          <Card className="shadow-strong">
            <CardHeader>
              <CardTitle>Adicionar Novo Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Item</Label>
                  <Input
                    id="name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Ex: Arroz, Feijão, Carne..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    placeholder="Ex: Grãos, Carnes, Vegetais..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_stock">Estoque Atual</Label>
                  <Input
                    id="current_stock"
                    type="number"
                    value={newItem.current_stock}
                    onChange={(e) => setNewItem({ ...newItem, current_stock: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_stock">Estoque Mínimo</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    value={newItem.min_stock}
                    onChange={(e) => setNewItem({ ...newItem, min_stock: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade</Label>
                  <Input
                    id="unit"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    placeholder="Ex: kg, litros, unidades..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_per_unit">Custo por Unidade (R$)</Label>
                  <Input
                    id="cost_per_unit"
                    type="number"
                    step="0.01"
                    value={newItem.cost_per_unit}
                    onChange={(e) => setNewItem({ ...newItem, cost_per_unit: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const stockStatus = getStockStatus(item.current_stock, item.min_stock);
            return (
              <Card key={item.id} className="shadow-soft hover:shadow-lg transition-smooth">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <Badge variant={stockStatus.color as any}>
                      {stockStatus.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.category}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Estoque Atual:</span>
                    <span className="font-semibold">{item.current_stock} {item.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Mínimo:</span>
                    <span className="text-sm">{item.min_stock} {item.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Custo/Unidade:</span>
                    <span className="text-sm">R$ {item.cost_per_unit.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Estoque</span>
                      <span>{item.current_stock}/{item.min_stock}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          stockStatus.status === "out" ? "bg-destructive" :
                          stockStatus.status === "low" ? "bg-warning" : "bg-success"
                        }`}
                        style={{ 
                          width: `${Math.min(100, (item.current_stock / Math.max(item.min_stock, 1)) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {items.length === 0 && !loading && (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum item no estoque</h3>
              <p className="text-muted-foreground mb-4">
                Comece adicionando itens ao seu inventário
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Item
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Inventory;
