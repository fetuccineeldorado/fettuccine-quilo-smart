import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Edit, Trash2, AlertTriangle, CheckCircle, X, ArrowUp, ArrowDown } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
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
  created_at: string;
  updated_at: string;
}

interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  notes: string | null;
  created_at: string;
}

interface ProductFormData {
  name: string;
  description: string;
  category: string;
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

const SimpleInventoryManager = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    category: "",
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
  const [movementData, setMovementData] = useState({
    product_id: "",
    movement_type: "in" as 'in' | 'out' | 'adjustment',
    quantity: 0,
    unit_cost: 0,
    notes: "",
  });

  const categories = [
    "Alimentos",
    "Bebidas", 
    "Sobremesas",
    "Itens Extras",
    "Ingredientes"
  ];

  // Load data from localStorage
  useEffect(() => {
    loadProducts();
    loadMovements();
  }, []);

  const loadProducts = () => {
    try {
      const savedProducts = localStorage.getItem('inventory_products');
      if (savedProducts) {
        setProducts(JSON.parse(savedProducts));
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  const loadMovements = () => {
    try {
      const savedMovements = localStorage.getItem('inventory_movements');
      if (savedMovements) {
        setMovements(JSON.parse(savedMovements));
      }
    } catch (error) {
      console.error("Erro ao carregar movimentações:", error);
    }
  };

  const saveProducts = (newProducts: Product[]) => {
    try {
      localStorage.setItem('inventory_products', JSON.stringify(newProducts));
      setProducts(newProducts);
    } catch (error) {
      console.error("Erro ao salvar produtos:", error);
    }
  };

  const saveMovements = (newMovements: StockMovement[]) => {
    try {
      localStorage.setItem('inventory_movements', JSON.stringify(newMovements));
      setMovements(newMovements);
    } catch (error) {
      console.error("Erro ao salvar movimentações:", error);
    }
  };

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
      const productData: Product = {
        id: editingProduct?.id || crypto.randomUUID(),
        name: formData.name,
        description: formData.description,
        category: formData.category,
        sku: formData.sku,
        barcode: formData.barcode,
        unit: formData.unit,
        cost_price: formData.cost_price,
        selling_price: formData.selling_price,
        min_stock: formData.min_stock,
        max_stock: formData.max_stock,
        current_stock: formData.current_stock,
        status: formData.status,
        is_tracked: formData.is_tracked,
        created_at: editingProduct?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let newProducts;
      if (editingProduct) {
        newProducts = products.map(p => p.id === editingProduct.id ? productData : p);
        toast({
          title: "Produto atualizado!",
          description: "Produto atualizado com sucesso",
        });
      } else {
        newProducts = [...products, productData];
        toast({
          title: "Produto criado!",
          description: "Novo produto adicionado com sucesso",
        });
      }

      saveProducts(newProducts);
      setShowForm(false);
      setEditingProduct(null);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast({
        title: "Erro ao salvar produto",
        description: "Não foi possível salvar o produto",
        variant: "destructive",
      });
    }
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!movementData.product_id) {
      toast({
        title: "Produto obrigatório",
        description: "Selecione um produto",
        variant: "destructive",
      });
      return;
    }

    if (movementData.quantity <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "A quantidade deve ser maior que zero",
        variant: "destructive",
      });
      return;
    }

    try {
      const product = products.find(p => p.id === movementData.product_id);
      if (!product) return;

      const movement: StockMovement = {
        id: crypto.randomUUID(),
        product_id: movementData.product_id,
        product_name: product.name,
        movement_type: movementData.movement_type,
        quantity: movementData.quantity,
        unit_cost: movementData.unit_cost || null,
        total_cost: movementData.unit_cost ? movementData.quantity * movementData.unit_cost : null,
        notes: movementData.notes || null,
        created_at: new Date().toISOString(),
      };

      // Update product stock
      const updatedProducts = products.map(p => {
        if (p.id === movementData.product_id) {
          let newStock = p.current_stock;
          if (movementData.movement_type === 'in') {
            newStock += movementData.quantity;
          } else if (movementData.movement_type === 'out') {
            newStock -= movementData.quantity;
          } else if (movementData.movement_type === 'adjustment') {
            newStock = movementData.quantity;
          }
          
          return {
            ...p,
            current_stock: Math.max(0, newStock),
            updated_at: new Date().toISOString(),
          };
        }
        return p;
      });

      saveProducts(updatedProducts);
      saveMovements([...movements, movement]);

      toast({
        title: "Movimentação registrada!",
        description: "Movimentação de estoque registrada com sucesso",
      });

      setShowMovementForm(false);
      resetMovementForm();
    } catch (error) {
      console.error("Erro ao registrar movimentação:", error);
      toast({
        title: "Erro ao registrar movimentação",
        description: "Não foi possível registrar a movimentação",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      sku: product.sku,
      barcode: product.barcode,
      unit: product.unit,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      min_stock: product.min_stock,
      max_stock: product.max_stock,
      current_stock: product.current_stock,
      status: product.status,
      is_tracked: product.is_tracked,
    });
    setShowForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      const newProducts = products.filter(p => p.id !== productId);
      saveProducts(newProducts);

      toast({
        title: "Produto excluído!",
        description: "Produto excluído com sucesso",
      });
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      toast({
        title: "Erro ao excluir produto",
        description: "Não foi possível excluir o produto",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
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

  const resetMovementForm = () => {
    setMovementData({
      product_id: "",
      movement_type: "in",
      quantity: 0,
      unit_cost: 0,
      notes: "",
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

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in': return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'out': return <ArrowDown className="h-4 w-4 text-red-500" />;
      case 'adjustment': return <Package className="h-4 w-4 text-blue-500" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'in': return 'Entrada';
      case 'out': return 'Saída';
      case 'adjustment': return 'Ajuste';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const lowStockProducts = products.filter(p => p.is_tracked && p.current_stock <= p.min_stock);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Estoque Simplificada</h2>
          <p className="text-muted-foreground">
            Sistema de estoque usando localStorage (funciona offline)
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showMovementForm} onOpenChange={setShowMovementForm}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={resetMovementForm}>
                <ArrowUp className="h-4 w-4 mr-2" />
                Movimentação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nova Movimentação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleMovementSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Produto *</Label>
                  <Select
                    value={movementData.product_id}
                    onValueChange={(value) => setMovementData({ ...movementData, product_id: value })}
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
                    value={movementData.movement_type}
                    onValueChange={(value: 'in' | 'out' | 'adjustment') => 
                      setMovementData({ ...movementData, movement_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Entrada</SelectItem>
                      <SelectItem value="out">Saída</SelectItem>
                      <SelectItem value="adjustment">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.001"
                    value={movementData.quantity}
                    onChange={(e) => setMovementData({ ...movementData, quantity: Number(e.target.value) })}
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
                    value={movementData.unit_cost}
                    onChange={(e) => setMovementData({ ...movementData, unit_cost: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={movementData.notes}
                    onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
                    placeholder="Observações sobre a movimentação"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowMovementForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Registrar Movimentação
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
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
      </div>

      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-2 bg-yellow-100 rounded">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium">{product.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {product.current_stock <= 0 ? 'Sem estoque' : 'Estoque baixo'}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {product.current_stock} {product.unit} (mín: {product.min_stock})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                    {product.category && (
                      <Badge variant="outline" className="text-xs">
                        {product.category}
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

      {/* Recent Movements */}
      {movements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Movimentações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {movements.slice(0, 5).map((movement) => (
                <div key={movement.id} className="flex items-center justify-between p-2 border rounded">
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
                    <Badge variant="outline">
                      {getMovementLabel(movement.movement_type)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

export default SimpleInventoryManager;
