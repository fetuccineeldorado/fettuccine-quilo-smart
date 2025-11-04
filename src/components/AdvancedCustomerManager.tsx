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
import { supabase } from "@/integrations/supabase/client";
import CustomerFormWithRewards from "./CustomerFormWithRewards";
import CustomerRewardsDisplay from "./CustomerRewardsDisplay";
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
  Filter,
  MessageCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp_number?: string;
  whatsapp_verified?: boolean;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  birth_date?: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  total_orders: number;
  total_spent: number;
  last_order_date?: string;
  notes?: string;
  is_active: boolean;
  referral_code?: string;
  referred_by?: string;
  points?: number;
  total_points_earned?: number;
  total_points_redeemed?: number;
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

  // Load data from Supabase
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setCustomers(data as Customer[]);
        calculateStats(data as Customer[]);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast({
        title: "Erro ao carregar clientes",
        description: "Não foi possível carregar a lista de clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  // Removido - agora usa CustomerFormWithRewards

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData(customer);
    setShowForm(true);
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;

      toast({
        title: "Cliente excluído!",
        description: "Cliente removido com sucesso",
      });

      // Recarregar lista
      loadCustomers();
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

  const getTierBadge = (tier: string) => {
    const info = getTierInfo(tier);
    const Icon = info.icon;
    return (
      <Badge className={info.color}>
        <Icon className="h-3 w-3 mr-1" />
        {info.label}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    const info = getStatusInfo(isActive);
    const Icon = info.icon;
    return (
      <Badge variant={info.color as any}>
        <Icon className="h-3 w-3 mr-1" />
        {info.label}
      </Badge>
    );
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
                </DialogTitle>
              </DialogHeader>
              <CustomerFormWithRewards
                customerId={editingCustomer?.id}
                onSuccess={() => {
                  setShowForm(false);
                  setEditingCustomer(null);
                  loadCustomers();
                }}
                onCancel={() => {
                  setShowForm(false);
                  setEditingCustomer(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Customer Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <Card>
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p className="font-semibold">{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-semibold">{selectedCustomer.email || "Não informado"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <p className="font-semibold">{selectedCustomer.phone || "Não informado"}</p>
                    </div>
                    {selectedCustomer.whatsapp_number && (
                      <div>
                        <p className="text-sm text-muted-foreground">WhatsApp</p>
                        <p className="font-semibold flex items-center gap-2">
                          {selectedCustomer.whatsapp_number}
                          {selectedCustomer.whatsapp_verified && (
                            <Badge variant="default" className="text-xs">Verificado</Badge>
                          )}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Tier</p>
                      {getTierBadge(selectedCustomer.tier)}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      {getStatusBadge(selectedCustomer.is_active)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sistema de Bonificação e Indicação */}
              <CustomerRewardsDisplay
                customerId={selectedCustomer.id}
                customerName={selectedCustomer.name}
                customerWhatsapp={selectedCustomer.whatsapp_number}
                referralCode={selectedCustomer.referral_code}
              />

              {/* Estatísticas */}
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                      <p className="text-2xl font-bold">{selectedCustomer.total_orders}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Gasto</p>
                      <p className="text-2xl font-bold text-green-600">
                        R$ {selectedCustomer.total_spent.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ticket Médio</p>
                      <p className="text-2xl font-bold">
                        R$ {selectedCustomer.total_orders > 0 
                          ? (selectedCustomer.total_spent / selectedCustomer.total_orders).toFixed(2)
                          : '0.00'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ações */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleEdit(selectedCustomer);
                    setShowDetails(false);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDetails(false);
                    handleDelete(selectedCustomer.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      {stats && (
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
      )}

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
      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold mb-2">Nenhum cliente encontrado</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || filterTier !== "all" || filterStatus !== "all"
                ? "Tente ajustar os filtros de busca"
                : "Clique em 'Novo Cliente' para começar"}
            </p>
          </CardContent>
        </Card>
      ) : (
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
                      <p className="text-sm text-muted-foreground">{customer.email || "Sem email"}</p>
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
                    {customer.points && customer.points > 0 && (
                      <Badge variant="outline" className="text-xs bg-yellow-50">
                        {customer.points} pts
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
                    {customer.whatsapp_number && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">{customer.whatsapp_number}</span>
                        {customer.whatsapp_verified && (
                          <Badge variant="default" className="text-xs">Verificado</Badge>
                        )}
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
      )}
    </div>
  );
};

export default AdvancedCustomerManager;
