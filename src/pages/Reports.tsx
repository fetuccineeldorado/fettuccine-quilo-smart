import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3, Download, DollarSign, TrendingUp, Users } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

const Reports = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgTicket: 0,
    cashPayments: 0,
    cardPayments: 0,
    pixPayments: 0,
    totalWeight: 0,
  });

  useEffect(() => {
    fetchDailyReport();
  }, []);

  const fetchDailyReport = async () => {
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    // Fetch closed orders
    const { data: orders } = await supabase
      .from("orders")
      .select("*, payments(*)")
      .eq("status", "closed")
      .gte("closed_at", start.toISOString())
      .lte("closed_at", end.toISOString());

    if (orders) {
      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const totalWeight = orders.reduce((sum, o) => sum + Number(o.total_weight), 0);
      const avgTicket = orders.length > 0 ? totalRevenue / orders.length : 0;

      let cashPayments = 0;
      let cardPayments = 0;
      let pixPayments = 0;

      orders.forEach((order) => {
        order.payments?.forEach((payment: any) => {
          const amount = Number(payment.amount);
          if (payment.payment_method === "cash") cashPayments += amount;
          else if (payment.payment_method === "pix") pixPayments += amount;
          else cardPayments += amount;
        });
      });

      setStats({
        totalOrders: orders.length,
        totalRevenue,
        avgTicket,
        cashPayments,
        cardPayments,
        pixPayments,
        totalWeight,
      });
    }
  };

  const exportReport = () => {
    const reportText = `
RELATÓRIO DIÁRIO - FETUCCINE
Data: ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}

RESUMO DE VENDAS
Total de Pedidos: ${stats.totalOrders}
Peso Total Vendido: ${stats.totalWeight.toFixed(2)} kg
Ticket Médio: R$ ${stats.avgTicket.toFixed(2)}

FATURAMENTO
Total: R$ ${stats.totalRevenue.toFixed(2)}

FORMAS DE PAGAMENTO
Dinheiro: R$ ${stats.cashPayments.toFixed(2)}
Cartão: R$ ${stats.cardPayments.toFixed(2)}
PIX: R$ ${stats.pixPayments.toFixed(2)}
    `.trim();

    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${format(new Date(), "yyyy-MM-dd")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Relatórios</h1>
            <p className="text-muted-foreground text-lg">
              Relatório do dia {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <Button onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">{stats.totalOrders}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Faturamento Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                <span className="text-3xl font-bold text-success">
                  R$ {stats.totalRevenue.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-secondary" />
                <span className="text-3xl font-bold">
                  R$ {stats.avgTicket.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Peso Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold">
                  {stats.totalWeight.toFixed(2)} kg
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Methods Breakdown */}
        <Card className="shadow-strong">
          <CardHeader>
            <CardTitle>Formas de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-success" />
                  <div>
                    <p className="font-semibold">Dinheiro</p>
                    <p className="text-sm text-muted-foreground">
                      {((stats.cashPayments / stats.totalRevenue) * 100 || 0).toFixed(1)}% do total
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold">
                  R$ {stats.cashPayments.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-semibold">Cartão (Débito/Crédito)</p>
                    <p className="text-sm text-muted-foreground">
                      {((stats.cardPayments / stats.totalRevenue) * 100 || 0).toFixed(1)}% do total
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold">
                  R$ {stats.cardPayments.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-accent/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-secondary" />
                  <div>
                    <p className="font-semibold">PIX</p>
                    <p className="text-sm text-muted-foreground">
                      {((stats.pixPayments / stats.totalRevenue) * 100 || 0).toFixed(1)}% do total
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold">
                  R$ {stats.pixPayments.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
