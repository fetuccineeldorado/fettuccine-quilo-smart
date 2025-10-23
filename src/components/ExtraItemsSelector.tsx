import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, ShoppingCart } from "lucide-react";

interface ExtraItem {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
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
      const { data, error } = await supabase
        .from("extra_items")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      setExtraItems(data || []);
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

  const addItem = (item: ExtraItem) => {
    const existingItem = selectedItems.find(selected => selected.id === item.id);
    
    if (existingItem) {
      // Incrementar quantidade
      const updatedItems = selectedItems.map(selected =>
        selected.id === item.id
          ? { ...selected, quantity: selected.quantity + 1 }
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
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      R$ {item.price.toFixed(2)}
                    </p>
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
