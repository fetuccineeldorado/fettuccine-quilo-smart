import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { loadProducts, checkLowStockAlerts } from "@/utils/inventoryUtils";

interface Product {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
  unit: string;
  is_tracked: boolean;
  status: 'active' | 'inactive' | 'discontinued';
}

export const useSimpleStockAlerts = () => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNewAlerts, setHasNewAlerts] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const lowStockProducts = checkLowStockAlerts();
      setAlerts(lowStockProducts);
      
      // Check if there are new alerts (products with stock <= 0)
      const outOfStockProducts = lowStockProducts.filter(p => p.current_stock <= 0);
      
      if (outOfStockProducts.length > 0) {
        setHasNewAlerts(true);
        showAlertNotifications(outOfStockProducts);
      }
    } catch (error) {
      console.error("Erro ao carregar alertas:", error);
    } finally {
      setLoading(false);
    }
  };

  const showAlertNotifications = (outOfStockProducts: Product[]) => {
    outOfStockProducts.forEach(product => {
      toast({
        title: "⚠️ Alerta de Estoque",
        description: `${product.name} está sem estoque!`,
        variant: "destructive",
      });
    });
  };

  const resolveAlert = async (productId: string) => {
    try {
      // In a real system, this would mark the alert as resolved
      // For now, we just refresh the alerts
      fetchAlerts();
      
      toast({
        title: "Alerta resolvido!",
        description: "Alerta marcado como resolvido",
      });
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
      // In a real system, this would mark all alerts as resolved
      // For now, we just refresh the alerts
      fetchAlerts();
      
      toast({
        title: "Todos os alertas resolvidos!",
        description: "Todos os alertas foram marcados como resolvidos",
      });
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
