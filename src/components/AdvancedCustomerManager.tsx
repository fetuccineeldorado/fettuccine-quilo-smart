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
  UserPlus, 
  Edit, 
  Trash2, 
  Search, 
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Eye,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  birth_date: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  total_orders: number;
  total_spent: number;
  last_order_date: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  byTier: Record<string, number>;
  totalRevenue: number;
  averageTicket: number;
  topCustomers: Customer[];
  recentCustomers: Customer[];
}

const AdvancedCustomerManager = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    birth_date: "",
    tier: "bronze",
    notes: "",
    is_active: true,
  });

  const states = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  // Load data from localStorage
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = () => {
    try {
      const savedCustomers = localStorage.getItem('customers_data');
      if (savedCustomers) {
        const data = JSON.parse(savedCustomers);
        setCustomers(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    }
  };

  const saveCustomers = (newCustomers: Customer[]) => {
    try {
      localStorage.setItem('customers_data', JSON.stringify(newCustomers));
      setCustomers(newCustomers);
      calculateStats(newCustomers);
    } catch (error) {
      console.error("Erro ao salvar clientes:", error);
    }
  };

  const calculateStats = (customerData: Customer[]) => {
    const total = customerData.length;
    const active = customerData.filter(c => c.is_active).length;
    const inactive = total - active;
    const totalRevenue = customerData.reduce((sum, c) => sum + c.total_spent, 0);
    const averageTicket = total > 0 ? totalRevenue / total : 0;

    // Group by tier
    const byTier = customerData.reduce((acc, customer) => {
      acc[customer.tier] = (acc[customer.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top customers by spending
    const topCustomers = customerData
      .filter(c => c.total_spent > 0)
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 5);

    // Recent customers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCustomers = customerData
      .filter(c => new Date(c.created_at) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    setStats({
      total,
      active,
      inactive,
      byTier,
      totalRevenue,
      averageTicket,
      topCustomers,
      recentCustomers,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "O nome do cliente é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      const customerData: Customer = {
        id: editingCustomer?.id || crypto.randomUUID(),
        name: formData.name!,
        email: formData.email || "",
        phone: formData.phone || "",
        address: formData.address || "",
        city: formData.city || "",
        state: formData.state || "",
        zip_code: formData.zip_code || "",
        birth_date: formData.birth_date || "",
        tier: formData.tier || "bronze",
        total_orders: editingCustomer?.total_orders || 0,
        total_spent: editingCustomer?.total_spent || 0,
        last_order_date: editingCustomer?.last_order_date || "",
        notes: formData.notes || "",
        is_active: formData.is_active ?? true,
        created_at: editingCustomer?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let newCustomers;
      if (editingCustomer) {
        newCustomers = customers.map(c => c.id === editingCustomer.id ? customerData : c);
        toast({
          title: "Cliente atualizado!",
          description: "Dados do cliente atualizados com sucesso",
        });
      } else {
        newCustomers = [...customers, customerData];
        toast({
          title: "Cliente cadastrado!",
          description: "Novo cliente adicionado com sucesso",
        });
      }

      saveCustomers(newCustomers);
      setShowForm(false);
      setEditingCustomer(null);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast({
        title: "Erro ao salvar cliente",
        description: "Não foi possível salvar os dados",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData(customer);
    setShowForm(true);
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    try {
      const newCustomers = customers.filter(c => c.id !== customerId);
      saveCustomers(newCustomers);

      toast({
        title: "Cliente excluído!",
        description: "Cliente removido com sucesso",
      });
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      toast({
        title: "Erro ao excluir cliente",
        description: "Não foi possível excluir o cliente",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetails(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      birth_date: "",
      tier: "bronze",
      notes: "",
      is_active: true,
    });
  };

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case "bronze":
        return { label: "Bronze", color: "bg-orange-100 text-orange-800", icon: Star };
      case "silver":
        return { label: "Prata", color: "bg-gray-100 text-gray-800", icon: Star };
      case "gold":
        return { label: "Ouro", color: "bg-yellow-100 text-yellow-800", icon: Star };
      case "platinum":
        return { label: "Platina", color: "bg-purple-100 text-purple-800", icon: Star };
      default:
        return { label: "Cliente", color: "bg-gray-100 text-gray-800", icon: Star };
    }
  };

  const getStatusInfo = (isActive: boolean) => {
    return isActive 
      ? { label: "Ativo", color: "default", icon: CheckCircle }
      : { label: "Inativo", color: "secondary", icon: XCircle };
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTier = filterTier === "all" || customer.tier === filterTier;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && customer.is_active) ||
      (filterStatus === "inactive" && !customer.is_active);
    
    return matchesSearch && matchesTier && matchesStatus;
  });

  const exportToCSV = () => {
    const csvContent = [
      ["Nome", "Email", "Telefone", "Cidade", "Tier", "Total Pedidos", "Total Gasto", "Status"],
      ...customers.map(customer => [
        customer.name,
        customer.email,
        customer.phone,
        customer.city,
        customer.tier,
        customer.total_orders.toString(),
        customer.total_spent.toString(),
        customer.is_active ? "Ativo" : "Inativo"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando dados...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestão Avançada de Clientes</h2>
          <p className="text-muted-foreground">
            Sistema completo de cadastro e relacionamento com clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingCustomer(null);
                resetForm();
              }}>
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do cliente"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="cliente@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tier">Tier do Cliente</Label>
                    <Select
                      value={formData.tier || "bronze"}
                      onValueChange={(value: 'bronze' | 'silver' | 'gold' | 'platinum') => 
                        setFormData({ ...formData, tier: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bronze">Bronze</SelectItem>
                        <SelectItem value="silver">Prata</SelectItem>
                        <SelectItem value="gold">Ouro</SelectItem>
                        <SelectItem value="platinum">Platina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.city || ""}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Cidade"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Select
                      value={formData.state || ""}
                      onValueChange={(value) => setFormData({ ...formData, state: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map(state => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip_code">CEP</Label>
                    <Input
                      id="zip_code"
                      value={formData.zip_code || ""}
                      onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Data de Nascimento</Label>
                    <Input
                      id="birth_date"
                      type="date"
                      value={formData.birth_date || ""}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.is_active ? "active" : "inactive"}
                      onValueChange={(value) => setFormData({ ...formData, is_active: value === "active" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address || ""}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Endereço completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Observações sobre o cliente"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingCustomer ? "Atualizar" : "Cadastrar"} Cliente
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
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-2xl font-bold">R$ {stats.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">R$ {stats.averageTicket.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clientes Inativos</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
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
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tiers</SelectItem>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Prata</SelectItem>
                  <SelectItem value="gold">Ouro</SelectItem>
                  <SelectItem value="platinum">Platina</SelectItem>
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

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => {
          const tierInfo = getTierInfo(customer.tier);
          const statusInfo = getStatusInfo(customer.is_active);
          const StatusIcon = statusInfo.icon;
          
          return (
            <Card key={customer.id} className="shadow-soft hover:shadow-lg transition-smooth">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{customer.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={statusInfo.color as "default" | "secondary"} className="text-xs">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={tierInfo.color}>
                    <Star className="h-3 w-3 mr-1" />
                    {tierInfo.label}
                  </Badge>
                  {customer.city && (
                    <Badge variant="outline" className="text-xs">
                      {customer.city}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2 text-sm">
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.total_orders} pedidos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>R$ {customer.total_spent.toFixed(2)}</span>
                  </div>
                  {customer.last_order_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(customer.last_order_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(customer)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(customer)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(customer.id)}
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

      {/* Customer Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Nome</Label>
                  <p className="text-sm">{selectedCustomer.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm">{selectedCustomer.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Telefone</Label>
                  <p className="text-sm">{selectedCustomer.phone || "Não informado"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Tier</Label>
                  <p className="text-sm">{getTierInfo(selectedCustomer.tier).label}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Cidade</Label>
                  <p className="text-sm">{selectedCustomer.city || "Não informado"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Estado</Label>
                  <p className="text-sm">{selectedCustomer.state || "Não informado"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total de Pedidos</Label>
                  <p className="text-sm">{selectedCustomer.total_orders}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Gasto</Label>
                  <p className="text-sm">R$ {selectedCustomer.total_spent.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm">{selectedCustomer.is_active ? "Ativo" : "Inativo"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Data de Cadastro</Label>
                  <p className="text-sm">{format(new Date(selectedCustomer.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
              </div>
              {selectedCustomer.address && (
                <div>
                  <Label className="text-sm font-medium">Endereço</Label>
                  <p className="text-sm">{selectedCustomer.address}</p>
                </div>
              )}
              {selectedCustomer.notes && (
                <div>
                  <Label className="text-sm font-medium">Observações</Label>
                  <p className="text-sm">{selectedCustomer.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {filteredCustomers.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              {searchTerm || filterTier !== "all" || filterStatus !== "all" 
                ? "Nenhum cliente encontrado" 
                : "Nenhum cliente cadastrado"
              }
            </p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || filterTier !== "all" || filterStatus !== "all"
                ? "Tente ajustar os filtros de busca"
                : "Clique em 'Novo Cliente' para começar"
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedCustomerManager;
