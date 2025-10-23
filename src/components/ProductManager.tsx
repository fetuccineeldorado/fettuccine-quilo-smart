import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Edit, Trash2, AlertTriangle, CheckCircle, X } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  category_name?: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  max_stock: number | null;
  current_stock: number;
  status: 'active' | 'inactive' | 'discontinued';
  is_tracked: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface ProductFormData {
  name: string;
  description: string;
  category_id: string;
  sku: string;
  barcode: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  max_stock: number;
  current_stock: number;
  status: 'active' | 'inactive' | 'discontinued';
  is_tracked: boolean;
}

const ProductManager = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    category_id: "",
    sku: "",
    barcode: "",
    unit: "unidade",
    cost_price: 0,
    selling_price: 0,
    min_stock: 0,
    max_stock: 0,
    current_stock: 0,
    status: "active",
    is_tracked: true,
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          product_categories (
            id,
            name,
            color
          )
        `)
        .order("name");

      if (error) throw error;

      const productsWithCategories = data?.map(product => ({
        ...product,
        category_name: product.product_categories?.name,
      })) || [];

      setProducts(productsWithCategories);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "O nome do produto é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      const productData = {
        ...formData,
        max_stock: formData.max_stock || null,
        description: formData.description || null,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;

        toast({
          title: "Produto atualizado!",
          description: "Produto atualizado com sucesso",
        });
      } else {
        const { error } = await supabase
          .from("products")
          .insert([productData]);

        if (error) throw error;

        toast({
          title: "Produto criado!",
          description: "Novo produto adicionado com sucesso",
        });
      }

      setShowForm(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast({
        title: "Erro ao salvar produto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      category_id: product.category_id || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      unit: product.unit,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      min_stock: product.min_stock,
      max_stock: product.max_stock || 0,
      current_stock: product.current_stock,
      status: product.status,
      is_tracked: product.is_tracked,
    });
    setShowForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      toast({
        title: "Produto excluído!",
        description: "Produto excluído com sucesso",
      });

      fetchProducts();
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      toast({
        title: "Erro ao excluir produto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category_id: "",
      sku: "",
      barcode: "",
      unit: "unidade",
      cost_price: 0,
      selling_price: 0,
      min_stock: 0,
      max_stock: 0,
      current_stock: 0,
      status: "active",
      is_tracked: true,
    });
  };

  const getStockStatus = (current: number, min: number) => {
    if (current <= 0) return { status: "out", color: "destructive", icon: X };
    if (current <= min) return { status: "low", color: "destructive", icon: AlertTriangle };
    return { status: "ok", color: "default", icon: CheckCircle };
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Ativo", variant: "default" as const },
      inactive: { label: "Inativo", variant: "secondary" as const },
      discontinued: { label: "Descontinuado", variant: "destructive" as const },
    };

    const config = statusConfig[status] || statusConfig.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando produtos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Produtos</h2>
          <p className="text-muted-foreground">
            Gerencie produtos, estoque e categorias
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingProduct(null);
              resetForm();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Produto *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Arroz, Feijão, Carne..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Código interno"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Código de Barras</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Código de barras"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Ex: kg, litros, unidades..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'inactive' | 'discontinued') => 
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="discontinued">Descontinuado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Preço de Custo</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Preço de Venda</Label>
                  <Input
                    id="selling_price"
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_stock">Estoque Atual</Label>
                  <Input
                    id="current_stock"
                    type="number"
                    step="0.001"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: Number(e.target.value) })}
                    placeholder="0.000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_stock">Estoque Mínimo</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    step="0.001"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                    placeholder="0.000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_stock">Estoque Máximo</Label>
                  <Input
                    id="max_stock"
                    type="number"
                    step="0.001"
                    value={formData.max_stock}
                    onChange={(e) => setFormData({ ...formData, max_stock: Number(e.target.value) })}
                    placeholder="0.000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do produto"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_tracked"
                  checked={formData.is_tracked}
                  onChange={(e) => setFormData({ ...formData, is_tracked: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_tracked">Controlar estoque</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingProduct ? "Atualizar" : "Criar"} Produto
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => {
          const stockStatus = getStockStatus(product.current_stock, product.min_stock);
          const StatusIcon = stockStatus.icon;
          
          return (
            <Card key={product.id} className="shadow-soft hover:shadow-lg transition-smooth">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    {product.category_name && (
                      <Badge variant="outline" className="text-xs">
                        {product.category_name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <StatusIcon className={`h-4 w-4 ${
                      stockStatus.status === 'out' ? 'text-red-500' :
                      stockStatus.status === 'low' ? 'text-yellow-500' :
                      'text-green-500'
                    }`} />
                    {getStatusBadge(product.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Estoque Atual</p>
                    <p className="font-semibold">{product.current_stock} {product.unit}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Estoque Mínimo</p>
                    <p className="font-semibold">{product.min_stock} {product.unit}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Preço de Custo</p>
                    <p className="font-semibold">R$ {product.cost_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Preço de Venda</p>
                    <p className="font-semibold">R$ {product.selling_price.toFixed(2)}</p>
                  </div>
                </div>
                
                {product.description && (
                  <p className="text-sm text-muted-foreground">{product.description}</p>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {products.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              Nenhum produto cadastrado
            </p>
            <p className="text-sm text-muted-foreground">
              Clique em "Novo Produto" para começar
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductManager;
