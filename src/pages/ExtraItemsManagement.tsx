import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  AlertTriangle, 
  ShoppingCart,
  TrendingDown,
  TrendingUp
} from "lucide-react";

interface ExtraItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  is_active: boolean;
  product_id?: string | null;
  current_stock?: number | null;
  min_stock?: number | null;
  max_stock?: number | null;
  track_stock?: boolean | null;
  unit?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Product {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
}

const ExtraItemsManagement = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<ExtraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExtraItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "drink",
    is_active: true,
    track_stock: false,
    current_stock: "",
    min_stock: "",
    max_stock: "",
    unit: "unidade",
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      
      // Tentar buscar com todos os campos primeiro
      let result = await supabase
        .from("extra_items")
        .select("*")
        .order("name");

      let extraItemsData = result.data;
      let itemsError = result.error;

      // Se falhar por causa de colunas faltando, tentar com campos básicos
      if (
        itemsError &&
        (itemsError.code === "PGRST116" ||
          itemsError.message?.includes("Could not find") ||
          itemsError.message?.includes("column"))
      ) {
        console.log(
          "Tentando buscar apenas com campos básicos devido a erro:",
          itemsError.message
        );
        result = await supabase
          .from("extra_items")
          .select("*")
          .order("name");
        
        extraItemsData = result.data;
        itemsError = result.error;
      }

      if (itemsError) throw itemsError;

      // Buscar produtos vinculados (se houver e se product_id existir)
      const itemsWithProductIds = (extraItemsData || []).filter(item => (item as any).product_id);
      const productIds = itemsWithProductIds.map(item => (item as any).product_id).filter(Boolean) as string[];

      let productsMap: Record<string, any> = {};
      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from("products")
          .select("id, name, current_stock, min_stock, max_stock")
          .in("id", productIds);

        if (productsData) {
          productsMap = (productsData as any[]).reduce((acc, product) => {
            acc[product.id] = product;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Processar dados para incluir estoque do produto vinculado
      const processedItems = (extraItemsData || []).map(item => {
        const itemAny = item as any;
        const product = itemAny.product_id ? productsMap[itemAny.product_id] : null;
        
        return {
          ...item,
          current_stock: product?.current_stock ?? itemAny.current_stock ?? 0,
          min_stock: product?.min_stock ?? itemAny.min_stock ?? 0,
          product_stock: product?.current_stock ?? null,
          // Campos opcionais com valores padrão se não existirem
          track_stock: itemAny.track_stock ?? false,
          unit: itemAny.unit ?? "unidade",
          max_stock: itemAny.max_stock ?? null,
          product_id: itemAny.product_id ?? null,
        };
      });

      setItems(processedItems);
    } catch (error) {
      console.error("Erro ao carregar itens extras:", error);
      toast({
        title: "Erro ao carregar itens",
        description: "Não foi possível carregar os itens extras. Verifique se a tabela 'extra_items' existe no banco de dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (item: ExtraItem) => {
    if (!item.track_stock) return 'not_tracked';
    const stock = item.current_stock ?? 0;
    if (stock <= 0) return 'out_of_stock';
    if (stock <= (item.min_stock ?? 0)) return 'low_stock';
    return 'in_stock';
  };

  const handleOpenDialog = (item?: ExtraItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description || "",
        price: item.price.toString(),
        category: item.category || "drink",
        is_active: item.is_active,
        track_stock: item.track_stock ?? false,
        current_stock: (item.current_stock ?? 0).toString(),
        min_stock: (item.min_stock ?? 0).toString(),
        max_stock: (item.max_stock ?? undefined)?.toString() || "",
        unit: item.unit || "unidade",
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        category: "drink",
        is_active: true,
        track_stock: false,
        current_stock: "",
        min_stock: "",
        max_stock: "",
        unit: "unidade",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!formData.name.trim()) {
      toast({
        title: "Erro de validação",
        description: "O nome do item é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast({
        title: "Erro de validação",
        description: "O preço deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    try {
      // Dados completos (com campos de estoque)
      const fullItemData: any = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        price: parseFloat(formData.price),
        category: formData.category,
        is_active: formData.is_active,
      };

      // Adicionar campos de estoque se existirem
      if (formData.track_stock !== undefined) {
        fullItemData.track_stock = formData.track_stock;
      }
      if (formData.unit) {
        fullItemData.unit = formData.unit;
      }
      if (formData.track_stock) {
        fullItemData.current_stock = parseFloat(formData.current_stock) || 0;
        fullItemData.min_stock = parseFloat(formData.min_stock) || 0;
        if (formData.max_stock) {
          fullItemData.max_stock = parseFloat(formData.max_stock);
        }
      }

      // Dados básicos (fallback)
      const basicItemData: any = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        price: parseFloat(formData.price),
        category: formData.category,
        is_active: formData.is_active,
      };

      let error: any = null;

      if (editingItem) {
        // Tentar atualizar com dados completos primeiro
        let result = await supabase
          .from("extra_items")
          .update(fullItemData)
          .eq("id", editingItem.id);

        error = result.error;

        // Se falhar por causa de colunas faltando, tentar com dados básicos
        if (
          error &&
          (error.code === "PGRST116" ||
            error.message?.includes("Could not find") ||
            error.message?.includes("column") ||
            error.status === 400)
        ) {
          console.log(
            "Tentando atualizar apenas com campos básicos devido a erro:",
            error.message
          );
          result = await supabase
            .from("extra_items")
            .update(basicItemData)
            .eq("id", editingItem.id);
          error = result.error;
        }

        if (error) throw error;

        toast({
          title: "Item atualizado!",
          description: `${formData.name} foi atualizado com sucesso`,
        });
      } else {
        // Tentar inserir com dados completos primeiro
        let result = await supabase.from("extra_items").insert(fullItemData);
        error = result.error;

        // Se falhar por causa de colunas faltando, tentar com dados básicos
        if (
          error &&
          (error.code === "PGRST116" ||
            error.message?.includes("Could not find") ||
            error.message?.includes("column") ||
            error.status === 400)
        ) {
          console.log(
            "Tentando inserir apenas com campos básicos devido a erro:",
            error.message
          );
          result = await supabase.from("extra_items").insert(basicItemData);
          error = result.error;
        }

        if (error) throw error;

        toast({
          title: "Item criado!",
          description: `${formData.name} foi criado com sucesso`,
        });
      }

      setIsDialogOpen(false);
      fetchItems();
    } catch (error: any) {
      console.error("Erro ao salvar item:", error);
      
      let errorMessage = "Não foi possível salvar o item";
      
      if (error.message?.includes("Could not find")) {
        errorMessage = `Erro: Coluna não encontrada. A migration de integração de estoque pode não ter sido aplicada. Acesse o Supabase Dashboard > SQL Editor e execute a migration: supabase/migrations/20250104000001_integrate_extra_items_stock.sql`;
      } else if (error.code === "42501" || error.message?.includes("permission denied") || error.message?.includes("policy") || error.message?.includes("RLS")) {
        errorMessage = `Erro de permissão: Você não tem permissão para criar/editar itens extras. Verifique se você está autenticado e se sua role permite esta ação. A política RLS pode estar bloqueando a operação.`;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        errorMessage = `Erro ${error.code}: ${error.message || "Erro desconhecido"}`;
      }
      
      toast({
        title: "Erro ao salvar",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (item: ExtraItem) => {
    if (!confirm(`Tem certeza que deseja excluir ${item.name}?`)) return;

    try {
      const { error } = await supabase
        .from("extra_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Item excluído!",
        description: `${item.name} foi excluído com sucesso`,
      });

      fetchItems();
    } catch (error: any) {
      console.error("Erro ao excluir item:", error);
      toast({
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o item",
        variant: "destructive",
      });
    }
  };

  const handleAdjustStock = async (item: ExtraItem, adjustment: number) => {
    try {
      const newStock = (item.current_stock ?? 0) + adjustment;
      
      const { error } = await supabase
        .from("extra_items")
        .update({ current_stock: Math.max(0, newStock) })
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Estoque ajustado!",
        description: `Estoque de ${item.name} foi ajustado`,
      });

      fetchItems();
    } catch (error: any) {
      console.error("Erro ao ajustar estoque:", error);
      toast({
        title: "Erro ao ajustar estoque",
        description: error.message || "Não foi possível ajustar o estoque",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 lg:p-8">
          <p>Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4 lg:space-y-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 lg:gap-4">
          <div>
            <h1 className="text-2xl lg:text-4xl font-bold mb-1 lg:mb-2">Gestão de Itens Extras</h1>
            <p className="text-muted-foreground text-sm lg:text-base">
              Cadastre e gerencie itens extras com controle de estoque
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="w-full lg:w-auto">
            <Plus className="h-4 w-4 lg:h-5 lg:w-5 mr-2" />
            Novo Item Extra
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {items.map((item) => {
            const stockStatus = getStockStatus(item);
            const isOutOfStock = stockStatus === 'out_of_stock';
            const isLowStock = stockStatus === 'low_stock';

            return (
              <Card key={item.id} className={isOutOfStock ? 'border-destructive/50' : ''}>
                <CardHeader className="px-4 lg:px-6 py-3 lg:py-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base lg:text-lg flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 lg:h-5 lg:w-5" />
                        {item.name}
                      </CardTitle>
                      <CardDescription className="text-xs lg:text-sm mt-1">
                        {item.description || "Sem descrição"}
                      </CardDescription>
                    </div>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 lg:px-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Preço:</span>
                    <span className="font-bold text-base lg:text-lg">R$ {item.price.toFixed(2)}</span>
                  </div>

                  {item.track_stock && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Estoque:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${
                            isOutOfStock ? 'text-destructive' : 
                            isLowStock ? 'text-warning' : 
                            'text-success'
                          }`}>
                            {item.current_stock ?? 0} {item.unit || 'un'}
                          </span>
                          {isOutOfStock && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Sem estoque
                            </Badge>
                          )}
                          {isLowStock && !isOutOfStock && (
                            <Badge variant="outline" className="text-xs border-warning text-warning">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Baixo
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {item.min_stock !== null && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Mínimo:</span>
                          <span>{item.min_stock} {item.unit || 'un'}</span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdjustStock(item, -1)}
                          className="flex-1"
                          disabled={!item.current_stock || item.current_stock <= 0}
                        >
                          <TrendingDown className="h-3 w-3 mr-1" />
                          -1
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdjustStock(item, 1)}
                          className="flex-1"
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +1
                        </Button>
                      </div>
                    </div>
                  )}

                  {!item.track_stock && (
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Estoque não rastreado
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog(item)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(item)}
                      className="flex-1"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {items.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum item extra cadastrado</p>
              <Button onClick={() => handleOpenDialog()} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Item
              </Button>
            </CardContent>
          </Card>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Editar Item Extra" : "Novo Item Extra"}
              </DialogTitle>
              <DialogDescription>
                {editingItem 
                  ? "Atualize as informações do item extra" 
                  : "Cadastre um novo item extra para venda"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ex: Refrigerante 350ml"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição opcional do item"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drink">Bebida</SelectItem>
                      <SelectItem value="food">Comida</SelectItem>
                      <SelectItem value="dessert">Sobremesa</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="unidade, caixa, etc"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="track_stock"
                  checked={formData.track_stock}
                  onCheckedChange={(checked) => setFormData({ ...formData, track_stock: checked })}
                />
                <Label htmlFor="track_stock" className="cursor-pointer">
                  Rastrear estoque deste item
                </Label>
              </div>

              {formData.track_stock && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-2">
                    <Label htmlFor="current_stock">Estoque Atual</Label>
                    <Input
                      id="current_stock"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.current_stock}
                      onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min_stock">Estoque Mínimo</Label>
                    <Input
                      id="min_stock"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_stock">Estoque Máximo (opcional)</Label>
                    <Input
                      id="max_stock"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.max_stock}
                      onChange={(e) => setFormData({ ...formData, max_stock: e.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Item ativo (disponível para venda)
                </Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingItem ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ExtraItemsManagement;

