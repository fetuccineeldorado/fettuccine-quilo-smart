import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, X, CheckCircle, Package, RefreshCw } from "lucide-react";

interface StockAlert {
  id: string;
  product_id: string;
  product_name?: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'overstock';
  current_stock: number;
  threshold: number;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

const StockAlerts = () => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stock_alerts")
        .select(`
          *,
          products (
            name
          )
        `)
        .eq("is_resolved", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const alertsWithProductNames = data?.map(alert => ({
        ...alert,
        product_name: alert.products?.name,
      })) || [];

      setAlerts(alertsWithProductNames);
    } catch (error) {
      console.error("Erro ao carregar alertas:", error);
      toast({
        title: "Erro ao carregar alertas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("stock_alerts")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getSession()).data.session?.user?.id,
        })
        .eq("id", alertId);

      if (error) throw error;

      toast({
        title: "Alerta resolvido!",
        description: "Alerta marcado como resolvido",
      });

      fetchAlerts();
    } catch (error) {
      console.error("Erro ao resolver alerta:", error);
      toast({
        title: "Erro ao resolver alerta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resolveAllAlerts = async () => {
    if (!confirm("Tem certeza que deseja resolver todos os alertas?")) return;

    try {
      const { error } = await supabase
        .from("stock_alerts")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getSession()).data.session?.user?.id,
        })
        .eq("is_resolved", false);

      if (error) throw error;

      toast({
        title: "Todos os alertas resolvidos!",
        description: "Todos os alertas foram marcados como resolvidos",
      });

      fetchAlerts();
    } catch (error) {
      console.error("Erro ao resolver alertas:", error);
      toast({
        title: "Erro ao resolver alertas",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'out_of_stock': return <X className="h-5 w-5 text-red-500" />;
      case 'low_stock': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'overstock': return <Package className="h-5 w-5 text-blue-500" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getAlertLabel = (type: string) => {
    switch (type) {
      case 'out_of_stock': return 'Estoque Zerado';
      case 'low_stock': return 'Estoque Baixo';
      case 'overstock': return 'Estoque Alto';
      default: return type;
    }
  };

  const getAlertBadge = (type: string) => {
    const variants = {
      out_of_stock: "destructive" as const,
      low_stock: "default" as const,
      overstock: "secondary" as const,
    };

    return (
      <Badge variant={variants[type] || "default"}>
        {getAlertLabel(type)}
      </Badge>
    );
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'out_of_stock': return 'border-red-200 bg-red-50';
      case 'low_stock': return 'border-yellow-200 bg-yellow-50';
      case 'overstock': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando alertas...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Alertas de Estoque</h2>
          <p className="text-muted-foreground">
            Monitore alertas de estoque baixo e zerado
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchAlerts} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          {alerts.length > 0 && (
            <Button variant="outline" onClick={resolveAllAlerts}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolver Todos
            </Button>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.map((alert) => (
          <Card key={alert.id} className={`shadow-soft ${getAlertColor(alert.alert_type)}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getAlertIcon(alert.alert_type)}
                  <div>
                    <p className="font-semibold">{alert.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Estoque atual: {alert.current_stock} | 
                      Limite: {alert.threshold}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(alert.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {getAlertBadge(alert.alert_type)}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolver
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {alerts.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg text-muted-foreground">
              Nenhum alerta ativo
            </p>
            <p className="text-sm text-muted-foreground">
              Todos os produtos estão com estoque adequado
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StockAlerts;
