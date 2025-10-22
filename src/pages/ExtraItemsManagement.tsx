import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Pencil, Trash2, ShoppingCart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ExtraItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_active: boolean;
}

const ExtraItemsManagement = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<ExtraItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExtraItem | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    price: string;
    category: 'drink' | 'food' | 'dessert' | 'other';
  }>({
    name: "",
    description: "",
    price: "",
    category: "drink",
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("extra_items")
      .select("*")
      .order("category, name");

    if (error) {
      toast({
        title: "Erro ao carregar itens",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setItems(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from("extra_items")
          .update({
            name: formData.name,
            description: formData.description,
            price: Number(formData.price),
            category: formData.category,
          })
          .eq("id", editingItem.id);

        if (error) throw error;

        toast({
          title: "Item atualizado!",
          description: "O item foi atualizado com sucesso",
        });
      } else {
        // Create new item
        const { error } = await supabase
          .from("extra_items")
          .insert({
            name: formData.name,
            description: formData.description,
            price: Number(formData.price),
            category: formData.category,
            is_active: true,
          });

        if (error) throw error;

        toast({
          title: "Item criado!",
          description: "O item foi adicionado com sucesso",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchItems();
    } catch (error: unknown) {
      toast({
        title: "Erro ao salvar item",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: ExtraItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category as 'drink' | 'food' | 'dessert' | 'other',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;

    try {
      const { error } = await supabase
        .from("extra_items")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Item excluído!",
        description: "O item foi removido com sucesso",
      });

      fetchItems();
    } catch (error: unknown) {
      toast({
        title: "Erro ao excluir item",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (item: ExtraItem) => {
    try {
      const { error } = await supabase
        .from("extra_items")
        .update({ is_active: !item.is_active })
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: item.is_active ? "Item desativado" : "Item ativado",
        description: `O item foi ${item.is_active ? "desativado" : "ativado"} com sucesso`,
      });

      fetchItems();
    } catch (error: unknown) {
      toast({
        title: "Erro ao atualizar item",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "drink",
    });
    setEditingItem(null);
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'drink': return 'Bebida';
      case 'food': return 'Comida';
      case 'dessert': return 'Sobremesa';
      default: return 'Outro';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Gerenciar Itens Extras</h1>
            <p className="text-muted-foreground text-lg">
              Adicione, edite ou remova itens extras (bebidas, sobremesas, etc.)
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar Item" : "Novo Item Extra"}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados do item extra
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Item *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Refrigerante Lata"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ex: Refrigerante lata 350ml"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as any })}
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

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? "Salvando..." : editingItem ? "Atualizar" : "Criar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className={`shadow-soft ${!item.is_active ? 'opacity-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <Badge variant={item.is_active ? "default" : "secondary"}>
                    {getCategoryLabel(item.category)}
                  </Badge>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-bold text-primary">
                  R$ {item.price.toFixed(2)}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(item)}
                    className="flex-1"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant={item.is_active ? "secondary" : "default"}
                    onClick={() => toggleActive(item)}
                    className="flex-1"
                  >
                    {item.is_active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {items.length === 0 && (
          <Card className="shadow-soft">
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum item cadastrado. Clique em "Novo Item" para começar.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ExtraItemsManagement;

