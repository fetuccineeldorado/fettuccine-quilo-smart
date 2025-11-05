import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, ArrowUp, ArrowDown, RotateCcw, ArrowRightLeft, AlertTriangle } from "lucide-react";

interface Product {
  id: string;
  name: string;
  current_stock: number;
  unit: string;
  min_stock: number;
}

interface StockMovement {
  id: string;
  product_id: string;
  product_name?: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  operator_id: string | null;
  created_at: string;
}

interface MovementFormData {
  product_id: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  unit_cost: number;
  notes: string;
}

const StockMovementManager = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<MovementFormData>({
    product_id: "",
    movement_type: "in",
    quantity: 0,
    unit_cost: 0,
    notes: "",
  });

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock_quantity, unit, min_stock_level")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts((data || []) as any);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select(`
          *,
          products (
            name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const movementsWithProductNames = (data?.map(movement => ({
        ...movement,
        product_name: (movement as any).products?.name,
        operator_id: movement.moved_by,
      })) || []) as any;

      setMovements(movementsWithProductNames);
    } catch (error) {
      console.error("Erro ao carregar movimentações:", error);
      toast({
        title: "Erro ao carregar movimentações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchMovements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_id) {
      toast({
        title: "Produto obrigatório",
        description: "Selecione um produto",
        variant: "destructive",
      });
      return;
    }

    if (formData.quantity <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "A quantidade deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    try {
      const movementData = {
        product_id: formData.product_id,
        movement_type: formData.movement_type,
        quantity: formData.quantity,
        unit_cost: formData.unit_cost || null,
        total_cost: formData.unit_cost ? formData.quantity * formData.unit_cost : null,
        notes: formData.notes || null,
        operator_id: (await supabase.auth.getSession()).data.session?.user?.id,
      };

      const { error } = await supabase
        .from("inventory_movements")
        .insert([movementData]);

      if (error) throw error;

      toast({
        title: "Movimentação registrada!",
        description: "Movimentação de estoque registrada com sucesso",
      });

      setShowForm(false);
      resetForm();
      fetchMovements();
      fetchProducts(); // Refresh products to update stock
    } catch (error) {
      console.error("Erro ao registrar movimentação:", error);
      toast({
        title: "Erro ao registrar movimentação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      movement_type: "in",
      quantity: 0,
      unit_cost: 0,
      notes: "",
    });
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in': return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'out': return <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'adjustment': return <RotateCcw className="h-4 w-4 text-blue-500" />;
      case 'transfer': return <ArrowRightLeft className="h-4 w-4 text-purple-500" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'in': return 'Entrada';
      case 'out': return 'Saída';
      case 'adjustment': return 'Ajuste';
      case 'transfer': return 'Transferência';
      default: return type;
    }
  };

  const getMovementBadge = (type: string) => {
    const variants = {
      in: "default" as const,
      out: "destructive" as const,
      adjustment: "secondary" as const,
      transfer: "outline" as const,
    };

    return (
      <Badge variant={variants[type] || "default"}>
        {getMovementLabel(type)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando movimentações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Movimentações de Estoque</h2>
          <p className="text-muted-foreground">
            Registre entradas, saídas e ajustes de estoque
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Movimentação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Movimentação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product">Produto *</Label>
                <Select
                  value={formData.product_id}
                  onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {product.current_stock} {product.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="movement_type">Tipo de Movimentação *</Label>
                <Select
                  value={formData.movement_type}
                  onValueChange={(value: 'in' | 'out' | 'adjustment' | 'transfer') => 
                    setFormData({ ...formData, movement_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Entrada</SelectItem>
                    <SelectItem value="out">Saída</SelectItem>
                    <SelectItem value="adjustment">Ajuste</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.001"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  placeholder="0.000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_cost">Custo Unitário (Opcional)</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: Number(e.target.value) })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações sobre a movimentação"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Registrar Movimentação
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Movements List */}
      <div className="space-y-4">
        {movements.map((movement) => (
          <Card key={movement.id} className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getMovementIcon(movement.movement_type)}
                  <div>
                    <p className="font-semibold">{movement.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(movement.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="font-semibold">
                      {movement.movement_type === 'out' ? '-' : '+'}{movement.quantity}
                    </p>
                    {movement.total_cost && (
                      <p className="text-sm text-muted-foreground">
                        R$ {movement.total_cost.toFixed(2)}
                      </p>
                    )}
                  </div>
                  {getMovementBadge(movement.movement_type)}
                </div>
              </div>
              {movement.notes && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  {movement.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {movements.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              Nenhuma movimentação registrada
            </p>
            <p className="text-sm text-muted-foreground">
              Clique em "Nova Movimentação" para começar
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StockMovementManager;
