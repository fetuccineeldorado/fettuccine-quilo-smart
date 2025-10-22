import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeDemo } from "@/components/theme-demo";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Scale,
  FileText,
  Clock,
  Package,
  UserPlus,
  BarChart3
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const Dashboard = () => {
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    openOrders: 0,
    avgTicket: 0,
    totalWeight: 0,
  });

  const fetchStats = useCallback(async () => {
    // Verificar se a chave do Supabase está configurada
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseKey || supabaseKey === 'your_supabase_anon_key_here') {
      // Usar dados mock quando a chave não estiver configurada
      setStats({
        todayOrders: 12,
        todayRevenue: 450.75,
        openOrders: 3,
        avgTicket: 37.56,
        totalWeight: 8.5,
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch today's orders
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .gte("opened_at", today.toISOString());

    // Fetch open orders
    const { data: openOrders } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "open");

    if (orders) {
      const closedOrders = orders.filter(o => o.status === "closed");
      const totalRevenue = closedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const totalWeight = closedOrders.reduce((sum, o) => sum + Number(o.total_weight), 0);
      const avgTicket = closedOrders.length > 0 ? totalRevenue / closedOrders.length : 0;

      setStats({
        todayOrders: closedOrders.length,
        todayRevenue: totalRevenue,
        openOrders: openOrders?.length || 0,
        avgTicket: avgTicket,
        totalWeight: totalWeight,
      });
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statCards = [
    {
      title: "Vendas Hoje",
      value: `R$ ${stats.todayRevenue.toFixed(2)}`,
      icon: DollarSign,
      description: `${stats.todayOrders} pedidos fechados`,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Comandas Abertas",
      value: stats.openOrders.toString(),
      icon: FileText,
      description: "Aguardando fechamento",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Ticket Médio",
      value: `R$ ${stats.avgTicket.toFixed(2)}`,
      icon: TrendingUp,
      description: "Por cliente hoje",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Peso Total",
      value: `${stats.totalWeight.toFixed(2)} kg`,
      icon: Scale,
      description: "Vendido hoje",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Visão geral do sistema FETUCCINE
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="shadow-soft hover:shadow-lg transition-smooth">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <p className="text-sm text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="/dashboard/weighing"
              className="p-6 rounded-lg border-2 border-border hover:border-primary bg-card hover:bg-accent transition-smooth text-center"
            >
              <Scale className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">Nova Pesagem</h3>
              <p className="text-sm text-muted-foreground">Iniciar nova comanda</p>
            </a>
            
            <a
              href="/dashboard/cashier"
              className="p-6 rounded-lg border-2 border-border hover:border-success bg-card hover:bg-accent transition-smooth text-center"
            >
              <DollarSign className="h-8 w-8 mx-auto mb-3 text-success" />
              <h3 className="font-semibold mb-1">Fechar Comanda</h3>
              <p className="text-sm text-muted-foreground">Processar pagamento</p>
            </a>
            
            <a
              href="/dashboard/reports"
              className="p-6 rounded-lg border-2 border-border hover:border-secondary bg-card hover:bg-accent transition-smooth text-center"
            >
              <BarChart3 className="h-8 w-8 mx-auto mb-3 text-secondary" />
              <h3 className="font-semibold mb-1">Relatórios</h3>
              <p className="text-sm text-muted-foreground">Ver relatórios</p>
            </a>
          </CardContent>
        </Card>

        {/* Management Sections */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestão
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a
              href="/dashboard/inventory"
              className="p-6 rounded-lg border-2 border-border hover:border-primary bg-card hover:bg-accent transition-smooth text-center"
            >
              <Package className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">Estoque</h3>
              <p className="text-sm text-muted-foreground">Gerenciar inventário</p>
            </a>
            
            <a
              href="/dashboard/customers"
              className="p-6 rounded-lg border-2 border-border hover:border-success bg-card hover:bg-accent transition-smooth text-center"
            >
              <Users className="h-8 w-8 mx-auto mb-3 text-success" />
              <h3 className="font-semibold mb-1">Clientes</h3>
              <p className="text-sm text-muted-foreground">Gerenciar clientes</p>
            </a>
            
            <a
              href="/dashboard/employees"
              className="p-6 rounded-lg border-2 border-border hover:border-secondary bg-card hover:bg-accent transition-smooth text-center"
            >
              <UserPlus className="h-8 w-8 mx-auto mb-3 text-secondary" />
              <h3 className="font-semibold mb-1">Funcionários</h3>
              <p className="text-sm text-muted-foreground">Gerenciar equipe</p>
            </a>
          </CardContent>
        </Card>

        {/* Theme Demo */}
        <ThemeDemo />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
