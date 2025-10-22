import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Users, Plus, Search, Star, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

const Customers = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name) {
      toast({
        title: "Nome obrigatório",
        description: "O nome do cliente é obrigatório",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("customers")
      .insert([{
        ...newCustomer,
        tier: 'bronze',
        total_orders: 0,
        total_spent: 0,
      }]);

    if (error) {
      toast({
        title: "Erro ao adicionar cliente",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cliente adicionado!",
        description: "Novo cliente cadastrado com sucesso",
      });
      setNewCustomer({
        name: "",
        email: "",
        phone: "",
      });
      setShowAddForm(false);
      fetchCustomers();
    }
  };

  const getCustomerTier = (tier: string) => {
    const tierMap = {
      'bronze': { tier: "Bronze", color: "bg-orange-100 text-orange-800" },
      'silver': { tier: "Silver", color: "bg-gray-100 text-gray-800" },
      'gold': { tier: "Gold", color: "bg-yellow-100 text-yellow-800" },
      'platinum': { tier: "Platinum", color: "bg-purple-100 text-purple-800" },
    };
    return tierMap[tier as keyof typeof tierMap] || tierMap.bronze;
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const topCustomers = customers
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 5);

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Clientes</h1>
            <p className="text-muted-foreground text-lg">
              Gerenciamento de clientes e relacionamento
            </p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>

        {/* Search */}
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Add Customer Form */}
        {showAddForm && (
          <Card className="shadow-strong">
            <CardHeader>
              <CardTitle>Adicionar Novo Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="Nome do cliente"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    placeholder="cliente@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddCustomer}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Cliente
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Customers */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Top Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCustomers.map((customer, index) => {
                const tier = getCustomerTier(customer.tier);
                return (
                  <div key={customer.id} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={tier.color}>
                        {tier.tier}
                      </Badge>
                      <p className="text-sm font-semibold">R$ {customer.total_spent.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Customers List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => {
            const tier = getCustomerTier(customer.tier);
            return (
              <Card key={customer.id} className="shadow-soft hover:shadow-lg transition-smooth">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{customer.name}</CardTitle>
                    <Badge className={tier.color}>
                      {tier.tier}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-success" />
                    <span>R$ {customer.total_spent.toFixed(2)} gastos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{customer.total_orders} pedidos</span>
                  </div>
                  {customer.phone && (
                    <div className="text-sm text-muted-foreground">
                      📞 {customer.phone}
                    </div>
                  )}
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Cadastrado em: {format(new Date(customer.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredCustomers.length === 0 && !loading && (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Tente ajustar os termos de busca"
                  : "Comece cadastrando seus primeiros clientes"
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Primeiro Cliente
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Customers;
