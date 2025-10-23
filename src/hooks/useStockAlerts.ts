import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StockAlert {
  id: string;
  product_id: string;
  product_name?: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'overstock';
  current_stock: number;
  threshold: number;
  is_resolved: boolean;
  created_at: string;
}

export const useStockAlerts = () => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNewAlerts, setHasNewAlerts] = useState(false);

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
      
      // Check if there are new alerts (created in the last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const newAlerts = alertsWithProductNames.filter(alert => 
        new Date(alert.created_at) > fiveMinutesAgo
      );
      
      if (newAlerts.length > 0) {
        setHasNewAlerts(true);
        showAlertNotifications(newAlerts);
      }
    } catch (error) {
      console.error("Erro ao carregar alertas:", error);
    } finally {
      setLoading(false);
    }
  };

  const showAlertNotifications = (newAlerts: StockAlert[]) => {
    newAlerts.forEach(alert => {
      const alertMessage = getAlertMessage(alert);
      toast({
        title: "⚠️ Alerta de Estoque",
        description: alertMessage,
        variant: "destructive",
      });
    });
  };

  const getAlertMessage = (alert: StockAlert) => {
    switch (alert.alert_type) {
      case 'out_of_stock':
        return `${alert.product_name} está sem estoque!`;
      case 'low_stock':
        return `${alert.product_name} está com estoque baixo (${alert.current_stock} restantes)`;
      case 'overstock':
        return `${alert.product_name} está com estoque alto (${alert.current_stock} em estoque)`;
      default:
        return `Alerta para ${alert.product_name}`;
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
        description: "Não foi possível resolver o alerta",
        variant: "destructive",
      });
    }
  };

  const resolveAllAlerts = async () => {
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
        description: "Não foi possível resolver os alertas",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAlerts();
    
    // Check for alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    alerts,
    loading,
    hasNewAlerts,
    fetchAlerts,
    resolveAlert,
    resolveAllAlerts,
  };
};
