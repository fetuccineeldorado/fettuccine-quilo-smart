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
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  BarChart3,
  Download,
  Filter,
  Eye,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  category: string;
  cost_price: number;
  sale_price: number;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  unit: string;
  is_active: boolean;
  track_stock: boolean;
  created_at: string;
  updated_at: string;
}

interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  cost_per_unit: number;
  total_cost: number;
  reference_type: string;
  reference_id: string;
  notes: string;
  created_at: string;
  moved_by: string;
}

interface StockAlert {
  id: string;
  product_id: string;
  product_name: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'over_stock';
  current_stock: number;
  threshold: number;
  is_resolved: boolean;
  created_at: string;
}

const AdvancedInventoryManager = () => {
  console.log('🔄 AdvancedInventoryManager - Componente renderizado');
  
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    description: "",
    sku: "",
    barcode: "",
    category: "",
    cost_price: 0,
    sale_price: 0,
    current_stock: 0,
    min_stock: 0,
    max_stock: 0,
    unit: "un",
    is_active: true,
    track_stock: true,
  });
  const [movementData, setMovementData] = useState({
    product_id: "",
    movement_type: "in" as 'in' | 'out' | 'adjustment' | 'transfer',
    quantity: 0,
    cost_per_unit: 0,
    notes: "",
  });

  const categories = [
    "Alimentos",
    "Bebidas",
    "Sobremesas",
    "Itens Extras",
    "Ingredientes",
    "Limpeza",
    "Utensílios"
  ];

  const units = [
    { value: "un", label: "Unidade" },
    { value: "kg", label: "Quilograma" },
    { value: "g", label: "Grama" },
    { value: "l", label: "Litro" },
    { value: "ml", label: "Mililitro" },
    { value: "cx", label: "Caixa" },
    { value: "pct", label: "Pacote" }
  ];

  // Load data from localStorage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    console.log('📦 AdvancedInventoryManager - Carregando dados...');
    try {
      // Load products
      const savedProducts = localStorage.getItem('inventory_products');
      console.log('📦 Produtos salvos:', savedProducts ? 'Encontrado' : 'Não encontrado');
      
      if (savedProducts) {
        const loadedProducts = JSON.parse(savedProducts);
        console.log('📦 Produtos carregados:', loadedProducts.length);
        
        // Validate products - check if they have required fields
        const validProducts = loadedProducts.every((p: Product) => 
          p.name && 
          typeof p.sale_price === 'number' && 
          typeof p.cost_price === 'number' &&
          typeof p.current_stock === 'number'
        );
        
        if (!validProducts) {
          console.log('⚠️ Produtos com dados inválidos detectados. Recriando...');
          localStorage.removeItem('inventory_products');
          // Recursively call to create sample data
          loadData();
          return;
        }
        
        setProducts(loadedProducts);
        // Generate alerts with loaded products
        generateAlerts(loadedProducts);
      } else {
        console.log('📦 Inicializando com dados de exemplo...');
        // Initialize with sample data if empty
        const sampleProducts: Product[] = [
          {
            id: crypto.randomUUID(),
            name: "Coca-Cola Lata 350ml",
            description: "Refrigerante de cola 350ml",
            sku: "BEB001",
            barcode: "7894900011517",
            category: "Bebidas",
            cost_price: 3.50,
            sale_price: 7.00,
            current_stock: 50,
            min_stock: 20,
            max_stock: 200,
            unit: "un",
            is_active: true,
            track_stock: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            name: "Arroz Tipo 1",
            description: "Arroz branco tipo 1 - 5kg",
            sku: "ALI001",
            barcode: "7896015299996",
            category: "Ingredientes",
            cost_price: 22.00,
            sale_price: 35.00,
            current_stock: 15,
            min_stock: 10,
            max_stock: 50,
            unit: "pct",
            is_active: true,
            track_stock: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            name: "Feijão Preto",
            description: "Feijão preto tipo 1 - 1kg",
            sku: "ALI002",
            barcode: "7891000100103",
            category: "Ingredientes",
            cost_price: 8.00,
            sale_price: 15.00,
            current_stock: 8,
            min_stock: 15,
            max_stock: 60,
            unit: "pct",
            is_active: true,
            track_stock: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            name: "Óleo de Soja",
            description: "Óleo de soja refinado - 900ml",
            sku: "ALI003",
            barcode: "7896102500271",
            category: "Ingredientes",
            cost_price: 6.50,
            sale_price: 12.00,
            current_stock: 12,
            min_stock: 10,
            max_stock: 40,
            unit: "un",
            is_active: true,
            track_stock: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            name: "Pudim de Leite",
            description: "Sobremesa - pudim de leite condensado",
            sku: "SOB001",
            barcode: "",
            category: "Sobremesas",
            cost_price: 3.00,
            sale_price: 8.00,
            current_stock: 5,
            min_stock: 10,
            max_stock: 30,
            unit: "un",
            is_active: true,
            track_stock: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ];
        console.log('📦 Produtos de exemplo criados:', sampleProducts.length);
        setProducts(sampleProducts);
        localStorage.setItem('inventory_products', JSON.stringify(sampleProducts));
        generateAlerts(sampleProducts);
        console.log('📦 Dados de exemplo salvos no localStorage');
      }

      // Load movements
      const savedMovements = localStorage.getItem('inventory_movements');
      if (savedMovements) {
        setMovements(JSON.parse(savedMovements));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const saveData = (newProducts: Product[], newMovements?: StockMovement[]) => {
    try {
      localStorage.setItem('inventory_products', JSON.stringify(newProducts));
      setProducts(newProducts);

      if (newMovements) {
        localStorage.setItem('inventory_movements', JSON.stringify(newMovements));
        setMovements(newMovements);
      }

      // Regenerate alerts with new products
      generateAlerts(newProducts);
    } catch (error) {
      console.error("Erro ao salvar dados:", error);
    }
  };

  const generateAlerts = (productsToCheck: Product[] = products) => {
    const newAlerts: StockAlert[] = [];
    
    productsToCheck.forEach(product => {
      if (!product.track_stock) return;

      // Out of stock
      if (product.current_stock <= 0) {
        newAlerts.push({
          id: crypto.randomUUID(),
          product_id: product.id,
          product_name: product.name,
          alert_type: 'out_of_stock',
          current_stock: product.current_stock,
          threshold: 0,
          is_resolved: false,
          created_at: new Date().toISOString(),
        });
      }
      // Low stock
      else if (product.current_stock <= product.min_stock) {
        newAlerts.push({
          id: crypto.randomUUID(),
          product_id: product.id,
          product_name: product.name,
          alert_type: 'low_stock',
          current_stock: product.current_stock,
          threshold: product.min_stock,
          is_resolved: false,
          created_at: new Date().toISOString(),
        });
      }
      // Over stock
      else if (product.max_stock > 0 && product.current_stock >= product.max_stock) {
        newAlerts.push({
          id: crypto.randomUUID(),
          product_id: product.id,
          product_name: product.name,
          alert_type: 'over_stock',
          current_stock: product.current_stock,
          threshold: product.max_stock,
          is_resolved: false,
          created_at: new Date().toISOString(),
        });
      }
    });

    setAlerts(newAlerts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "O nome do produto é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      const productData: Product = {
        id: selectedProduct?.id || crypto.randomUUID(),
        name: formData.name!,
        description: formData.description || "",
        sku: formData.sku || "",
        barcode: formData.barcode || "",
        category: formData.category || "",
        cost_price: Number(formData.cost_price) || 0,
        sale_price: Number(formData.sale_price) || 0,
        current_stock: Number(formData.current_stock) || 0,
        min_stock: Number(formData.min_stock) || 0,
        max_stock: Number(formData.max_stock) || 0,
        unit: formData.unit || "un",
        is_active: formData.is_active ?? true,
        track_stock: formData.track_stock ?? true,
        created_at: selectedProduct?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let newProducts;
      if (selectedProduct) {
        newProducts = products.map(p => p.id === selectedProduct.id ? productData : p);
        toast({
          title: "Produto atualizado!",
          description: "Produto atualizado com sucesso",
        });
      } else {
        newProducts = [...products, productData];
        toast({
          title: "Produto cadastrado!",
          description: "Novo produto adicionado ao estoque",
        });
      }

      saveData(newProducts);
      setShowForm(false);
      setSelectedProduct(null);
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

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!movementData.product_id || !movementData.quantity) {
      toast({
        title: "Dados obrigatórios",
        description: "Selecione um produto e informe a quantidade",
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
        quantity: Number(movementData.quantity),
        cost_per_unit: Number(movementData.cost_per_unit) || 0,
        total_cost: Number(movementData.quantity) * Number(movementData.cost_per_unit),
        reference_type: 'manual',
        reference_id: '',
        notes: movementData.notes,
        created_at: new Date().toISOString(),
        moved_by: 'system',
      };

      // Update product stock
      let newStock = product.current_stock;
      if (movementData.movement_type === 'in') {
        newStock += Number(movementData.quantity);
      } else if (movementData.movement_type === 'out') {
        newStock -= Number(movementData.quantity);
      } else if (movementData.movement_type === 'adjustment') {
        newStock = Number(movementData.quantity);
      }

      const updatedProducts = products.map(p => 
        p.id === movementData.product_id 
          ? { ...p, current_stock: newStock, updated_at: new Date().toISOString() }
          : p
      );

      const newMovements = [...movements, movement];

      saveData(updatedProducts, newMovements);

      toast({
        title: "Movimentação registrada!",
        description: `Estoque atualizado para ${product.name}`,
      });

      setShowMovementForm(false);
      setMovementData({
        product_id: "",
        movement_type: "in",
        quantity: 0,
        cost_per_unit: 0,
        notes: "",
      });
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
    setSelectedProduct(product);
    setFormData(product);
    setShowForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      const newProducts = products.filter(p => p.id !== productId);
      saveData(newProducts);

      toast({
        title: "Produto excluído!",
        description: "Produto removido do estoque",
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
      sku: "",
      barcode: "",
      category: "",
      cost_price: 0,
      sale_price: 0,
      current_stock: 0,
      min_stock: 0,
      max_stock: 0,
      unit: "un",
      is_active: true,
      track_stock: true,
    });
  };

  const getStockStatus = (product: Product) => {
    if (!product.track_stock) {
      return { label: "Não rastreado", color: "secondary", icon: XCircle };
    }
    if (product.current_stock <= 0) {
      return { label: "Sem estoque", color: "destructive", icon: AlertTriangle };
    }
    if (product.current_stock <= product.min_stock) {
      return { label: "Estoque baixo", color: "warning", icon: AlertCircle };
    }
    if (product.max_stock > 0 && product.current_stock >= product.max_stock) {
      return { label: "Estoque alto", color: "info", icon: TrendingUp };
    }
    return { label: "Em estoque", color: "default", icon: CheckCircle };
  };

  const getMovementTypeInfo = (type: string) => {
    switch (type) {
      case "in":
        return { label: "Entrada", color: "bg-green-100 text-green-800", icon: TrendingUp };
      case "out":
        return { label: "Saída", color: "bg-red-100 text-red-800", icon: TrendingDown };
      case "adjustment":
        return { label: "Ajuste", color: "bg-blue-100 text-blue-800", icon: ArrowRightLeft };
      case "transfer":
        return { label: "Transferência", color: "bg-purple-100 text-purple-800", icon: ArrowRightLeft };
      default:
        return { label: "Movimentação", color: "bg-gray-100 text-gray-800", icon: ArrowRightLeft };
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === "all" || product.category === filterCategory;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && product.is_active) ||
      (filterStatus === "inactive" && !product.is_active);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.is_active).length;
  const lowStockProducts = products.filter(p => p.track_stock && (p.current_stock || 0) <= (p.min_stock || 0)).length;
  const outOfStockProducts = products.filter(p => p.track_stock && (p.current_stock || 0) <= 0).length;
  const totalStockValue = products.reduce((sum, p) => sum + ((p.current_stock || 0) * (p.cost_price || 0)), 0);

  console.log('🎨 AdvancedInventoryManager - Renderizando interface');
  console.log('📊 Total de produtos:', products.length);
  console.log('🔍 Produtos filtrados:', filteredProducts.length);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestão Avançada de Estoque</h2>
          <p className="text-muted-foreground">
            Controle completo de produtos, movimentações e alertas
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setSelectedProduct(null);
                resetForm();
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedProduct ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Produto *</Label>
                    <Input
                      id="name"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do produto"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku || ""}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="Código do produto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Código de Barras</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode || ""}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="Código de barras"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      value={formData.category || ""}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost_price">Preço de Custo</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      step="0.01"
                      value={formData.cost_price || 0}
                      onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sale_price">Preço de Venda</Label>
                    <Input
                      id="sale_price"
                      type="number"
                      step="0.01"
                      value={formData.sale_price || 0}
                      onChange={(e) => setFormData({ ...formData, sale_price: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="current_stock">Estoque Atual</Label>
                    <Input
                      id="current_stock"
                      type="number"
                      step="0.001"
                      value={formData.current_stock || 0}
                      onChange={(e) => setFormData({ ...formData, current_stock: Number(e.target.value) })}
                      placeholder="0.000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unidade</Label>
                    <Select
                      value={formData.unit || "un"}
                      onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(unit => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_stock">Estoque Mínimo</Label>
                    <Input
                      id="min_stock"
                      type="number"
                      step="0.001"
                      value={formData.min_stock || 0}
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
                      value={formData.max_stock || 0}
                      onChange={(e) => setFormData({ ...formData, max_stock: Number(e.target.value) })}
                      placeholder="0.000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do produto"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {selectedProduct ? "Atualizar" : "Cadastrar"} Produto
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={showMovementForm} onOpenChange={setShowMovementForm}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Movimentação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Movimentação</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleMovement} className="space-y-4">
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
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.current_stock} {product.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="movement_type">Tipo de Movimentação *</Label>
                  <Select
                    value={movementData.movement_type}
                    onValueChange={(value: 'in' | 'out' | 'adjustment' | 'transfer') => 
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
                      <SelectItem value="transfer">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="cost_per_unit">Custo por Unidade</Label>
                    <Input
                      id="cost_per_unit"
                      type="number"
                      step="0.01"
                      value={movementData.cost_per_unit}
                      onChange={(e) => setMovementData({ ...movementData, cost_per_unit: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Produtos</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Produtos Ativos</p>
                <p className="text-2xl font-bold">{activeProducts}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                <p className="text-2xl font-bold text-yellow-600">{lowStockProducts}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sem Estoque</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockProducts}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">R$ {totalStockValue.toFixed(2)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => {
          const stockStatus = getStockStatus(product);
          const StatusIcon = stockStatus.icon;
          
          return (
            <Card key={product.id} className="shadow-soft hover:shadow-lg transition-smooth">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={stockStatus.color as "default" | "destructive" | "secondary"} className="text-xs">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {stockStatus.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Estoque:</span>
                    <p className="font-semibold">{product.current_stock || 0} {product.unit || 'un'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Preço:</span>
                    <p className="font-semibold">R$ {(product.sale_price || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mín:</span>
                    <p className="text-sm">{product.min_stock || 0} {product.unit || 'un'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Máx:</span>
                    <p className="text-sm">{product.max_stock || 0} {product.unit || 'un'}</p>
                  </div>
                </div>

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

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Alertas de Estoque ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="font-medium">{alert.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.alert_type === 'out_of_stock' ? 'Sem estoque' : 
                         alert.alert_type === 'low_stock' ? 'Estoque baixo' : 'Estoque alto'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{alert.current_stock} unidades</p>
                    <p className="text-sm text-muted-foreground">
                      {alert.alert_type === 'low_stock' ? `Mín: ${alert.threshold}` : 
                       alert.alert_type === 'over_stock' ? `Máx: ${alert.threshold}` : ''}
                    </p>
                  </div>
                </div>
              ))}
              {alerts.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{alerts.length - 5} alertas adicionais
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              {searchTerm || filterCategory !== "all" || filterStatus !== "all" 
                ? "Nenhum produto encontrado" 
                : "Nenhum produto cadastrado"
              }
            </p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || filterCategory !== "all" || filterStatus !== "all"
                ? "Tente ajustar os filtros de busca"
                : "Clique em 'Novo Produto' para começar"
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedInventoryManager;
