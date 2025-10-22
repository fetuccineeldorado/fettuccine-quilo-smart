import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, ShoppingCart, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ExtraItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'drink' | 'food' | 'dessert' | 'other';
  is_active: boolean;
}

interface SelectedExtraItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface ExtraItemsSelectorProps {
  onItemsChange: (items: SelectedExtraItem[], total: number) => void;
}

const ExtraItemsSelector = ({ onItemsChange }: ExtraItemsSelectorProps) => {
  const { toast } = useToast();
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedExtraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const fetchExtraItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("extra_items")
      .select("*")
      .eq("is_active", true)
      .order("category, name");

    if (error) {
      toast({
        title: "Erro ao carregar itens extras",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setExtraItems(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchExtraItems();
  }, [fetchExtraItems]);

  useEffect(() => {
    const total = selectedItems.reduce((sum, item) => sum + item.total, 0);
    onItemsChange(selectedItems, total);
  }, [selectedItems, onItemsChange]);

  const addItem = (item: ExtraItem) => {
    const existingItem = selectedItems.find(selected => selected.id === item.id);
    
    if (existingItem) {
      setSelectedItems(prev => 
        prev.map(selected => 
          selected.id === item.id 
            ? { ...selected, quantity: selected.quantity + 1, total: (selected.quantity + 1) * item.price }
            : selected
        )
      );
    } else {
      setSelectedItems(prev => [...prev, {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        total: item.price
      }]);
    }
  };

  const removeItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setSelectedItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, quantity, total: quantity * item.price }
          : item
      )
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'drink': return '🥤';
      case 'food': return '🍽️';
      case 'dessert': return '🍰';
      default: return '📦';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'drink': return 'Bebidas';
      case 'food': return 'Comidas';
      case 'dessert': return 'Sobremesas';
      default: return 'Outros';
    }
  };

  const filteredItems = extraItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { value: "all", label: "Todos" },
    { value: "drink", label: "Bebidas" },
    { value: "food", label: "Comidas" },
    { value: "dessert", label: "Sobremesas" },
    { value: "other", label: "Outros" }
  ];

  const total = selectedItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Itens Extras
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar itens</Label>
              <Input
                id="search"
                placeholder="Digite o nome do item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Label htmlFor="category">Categoria</Label>
              <select
                id="category"
                className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="shadow-soft hover:shadow-lg transition-smooth">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>{getCategoryIcon(item.category)}</span>
                  {item.name}
                </CardTitle>
                <Badge variant="outline">
                  {getCategoryLabel(item.category)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">
                  R$ {item.price.toFixed(2)}
                </span>
                <Button
                  onClick={() => addItem(item)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Items */}
      {selectedItems.length > 0 && (
        <Card className="shadow-strong">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Itens Selecionados</span>
              <Badge variant="default" className="text-lg">
                Total: R$ {total.toFixed(2)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      R$ {item.price.toFixed(2)} cada
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="text-right min-w-[80px]">
                      <div className="font-semibold">
                        R$ {item.total.toFixed(2)}
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total dos Itens Extras:</span>
              <span className="text-primary">R$ {total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExtraItemsSelector;
