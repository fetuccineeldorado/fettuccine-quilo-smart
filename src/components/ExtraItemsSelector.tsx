import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, ShoppingCart, AlertTriangle, Package } from "lucide-react";

interface ExtraItem {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  product_id?: string | null;
  current_stock?: number | null;
  min_stock?: number | null;
  max_stock?: number | null;
  track_stock?: boolean | null;
  unit?: string | null;
}

interface SelectedExtraItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface ExtraItemsSelectorProps {
  selectedItems: SelectedExtraItem[];
  onItemsChange: (items: SelectedExtraItem[]) => void;
}

const ExtraItemsSelector = ({ selectedItems, onItemsChange }: ExtraItemsSelectorProps) => {
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchExtraItems();
  }, []);

  const fetchExtraItems = async () => {
    try {
      // Buscar itens extras ativos
      const { data: extraItemsData, error: itemsError } = await supabase
        .from("extra_items")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (itemsError) throw itemsError;

      // Buscar produtos vinculados (se houver)
      const itemsWithProductIds = (extraItemsData || []).filter(item => item.product_id);
      const productIds = itemsWithProductIds.map(item => item.product_id).filter(Boolean) as string[];

      let productsMap: Record<string, any> = {};
      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from("products")
          .select("id, name, stock_quantity, min_stock_level, max_stock_level")
          .in("id", productIds);

        if (productsData) {
          productsMap = productsData.reduce((acc, product) => {
            acc[product.id] = product;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Processar dados para incluir estoque do produto vinculado
      const processedItems = (extraItemsData || []).map(item => {
        const product = item.product_id ? productsMap[item.product_id] : null;
        
        return {
          ...item,
          // Se tem product_id, usar estoque do produto, senão usar estoque direto
          current_stock: product?.current_stock ?? item.current_stock ?? 0,
          min_stock: product?.min_stock ?? item.min_stock ?? 0,
          product_stock: product?.current_stock ?? null,
        };
      });

      setExtraItems(processedItems);
    } catch (error) {
      console.error("Erro ao carregar itens extra:", error);
      toast({
        title: "Erro ao carregar itens extra",
        description: "Não foi possível carregar os itens disponíveis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableStock = (item: ExtraItem): number | null => {
    if (!item.track_stock) return null; // Não rastreia estoque
    return item.current_stock ?? 0;
  };

  const getStockStatus = (item: ExtraItem): 'in_stock' | 'low_stock' | 'out_of_stock' | 'not_tracked' => {
    if (!item.track_stock) return 'not_tracked';
    const stock = getAvailableStock(item);
    if (stock === null) return 'not_tracked';
    if (stock <= 0) return 'out_of_stock';
    if (stock <= (item.min_stock ?? 0)) return 'low_stock';
    return 'in_stock';
  };

  const addItem = (item: ExtraItem) => {
    // Verificar estoque antes de adicionar
    if (item.track_stock) {
      const availableStock = getAvailableStock(item);
      const currentQuantity = getItemQuantity(item.id);
      
      if (availableStock !== null && currentQuantity >= availableStock) {
        toast({
          title: "Estoque insuficiente",
          description: `${item.name} não possui estoque suficiente (disponível: ${availableStock})`,
          variant: "destructive",
        });
        return;
      }
    }

    const existingItem = selectedItems.find(selected => selected.id === item.id);
    
    if (existingItem) {
      // Incrementar quantidade
      const newQuantity = existingItem.quantity + 1;
      
      // Verificar estoque novamente
      if (item.track_stock) {
        const availableStock = getAvailableStock(item);
        if (availableStock !== null && newQuantity > availableStock) {
          toast({
            title: "Estoque insuficiente",
            description: `Quantidade máxima disponível: ${availableStock}`,
            variant: "destructive",
          });
          return;
        }
      }
      
      const updatedItems = selectedItems.map(selected =>
        selected.id === item.id
          ? { ...selected, quantity: newQuantity }
          : selected
      );
      onItemsChange(updatedItems);
    } else {
      // Adicionar novo item
      const newItem: SelectedExtraItem = {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
      };
      onItemsChange([...selectedItems, newItem]);
    }
  };

  const removeItem = (itemId: string) => {
    const existingItem = selectedItems.find(selected => selected.id === itemId);
    
    if (existingItem && existingItem.quantity > 1) {
      // Decrementar quantidade
      const updatedItems = selectedItems.map(selected =>
        selected.id === itemId
          ? { ...selected, quantity: selected.quantity - 1 }
          : selected
      );
      onItemsChange(updatedItems);
    } else {
      // Remover item completamente
      const updatedItems = selectedItems.filter(selected => selected.id !== itemId);
      onItemsChange(updatedItems);
    }
  };

  const getItemQuantity = (itemId: string) => {
    const item = selectedItems.find(selected => selected.id === itemId);
    return item ? item.quantity : 0;
  };

  const calculateTotal = () => {
    return selectedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Itens Extra</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando itens...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Itens Extra
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {extraItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhum item extra disponível
          </p>
        ) : (
          <div className="grid gap-3">
            {extraItems.map((item) => {
              const quantity = getItemQuantity(item.id);
              const stockStatus = getStockStatus(item);
              const availableStock = getAvailableStock(item);
              const isOutOfStock = stockStatus === 'out_of_stock';
              const isLowStock = stockStatus === 'low_stock';
              
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                    isOutOfStock ? 'opacity-60 border-destructive/50' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.name}</p>
                      {isOutOfStock && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Sem estoque
                        </Badge>
                      )}
                      {isLowStock && !isOutOfStock && (
                        <Badge variant="outline" className="text-xs border-warning text-warning">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Estoque baixo
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-muted-foreground">
                        R$ {item.price.toFixed(2)}
                      </p>
                      {item.track_stock && availableStock !== null && (
                        <div className="flex items-center gap-1 text-xs">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span className={isOutOfStock ? 'text-destructive' : isLowStock ? 'text-warning' : 'text-muted-foreground'}>
                            {availableStock} {item.unit || 'un'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {quantity > 0 && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeItem(item.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Badge variant="secondary" className="min-w-[2rem] justify-center">
                          {quantity}
                        </Badge>
                      </>
                    )}
                    <Button
                      size="sm"
                      onClick={() => addItem(item)}
                      className="h-8 w-8 p-0"
                      disabled={isOutOfStock}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedItems.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total dos itens extra:</span>
              <span className="font-bold text-lg">
                R$ {calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExtraItemsSelector;
