import { ReactNode, useEffect, useState, memo } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  Scale,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  Package,
  Users,
  UserPlus,
  LogOut,
  Menu,
  X,
  ShoppingCart,
  DollarSign,
  Megaphone
} from "lucide-react";
import { Session } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import MobileBottomNav from "@/components/MobileBottomNav";
import MobileMenuSheet from "@/components/MobileMenuSheet";
import FloatingActionButton from "@/components/FloatingActionButton";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = memo(({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile-first: closed by default
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openOrdersCount, setOpenOrdersCount] = useState(0);

  // Swipe gesture para abrir menu
  const swipeGestures = useSwipeGesture({
    onSwipeRight: () => {
      if (window.innerWidth < 1024 && !mobileMenuOpen) {
        setMobileMenuOpen(true);
      }
    },
    onSwipeLeft: () => {
      if (window.innerWidth < 1024 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    },
    threshold: 75,
    velocityThreshold: 0.4
  });

  // Fetch open orders count for badge
  useEffect(() => {
    const fetchOpenOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id", { count: 'exact', head: true })
        .eq("status", "open");
      
      if (!error && data) {
        setOpenOrdersCount(data.length || 0);
      }
    };

    fetchOpenOrders();

    // Subscribe to order changes
    const subscription = supabase
      .channel('orders_count')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, fetchOpenOrders)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        setSession(session);
        // Só redirecionar se for explicitamente um SIGNED_OUT
        if (!session && event === 'SIGNED_OUT') {
          navigate("/auth");
        }
      }
    );

    // Verificar sessão com retry em caso de erro temporário
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (error) {
          console.warn('⚠️ Erro ao verificar sessão:', error);
          // Se erro, tentar novamente após um delay
          setTimeout(() => {
            if (mounted) {
              checkSession();
            }
          }, 1000);
          return;
        }
        
        setSession(session);
        if (!session) {
          // Aguardar um pouco antes de redirecionar (pode ser carregamento lento)
          setTimeout(async () => {
            if (mounted) {
              const { data: { session: retrySession } } = await supabase.auth.getSession();
              if (!retrySession) {
                navigate("/auth");
              }
            }
          }, 2000);
        }
      } catch (err) {
        console.error('💥 Erro ao verificar sessão:', err);
        if (mounted) {
          // Tentar novamente após erro
          setTimeout(() => {
            if (mounted) {
              checkSession();
            }
          }, 2000);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/auth");
  };

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/dashboard/weighing", icon: Scale, label: "Pesagem" },
    { path: "/dashboard/orders", icon: FileText, label: "Comandas" },
    { path: "/dashboard/cashier", icon: CreditCard, label: "Caixa" },
    { path: "/dashboard/cash-management", icon: DollarSign, label: "Gerenciar Caixa" },
    { path: "/dashboard/reports", icon: BarChart3, label: "Relatórios" },
    { path: "/dashboard/inventory", icon: Package, label: "Estoque" },
    { path: "/dashboard/customers", icon: Users, label: "Clientes" },
    { path: "/dashboard/promotions", icon: Megaphone, label: "Promoções" },
    { path: "/dashboard/employees", icon: UserPlus, label: "Funcionários" },
    { path: "/dashboard/extra-items", icon: ShoppingCart, label: "Itens Extras" },
    { path: "/dashboard/settings", icon: Settings, label: "Configurações" },
  ];

  if (!session) {
    return null;
  }

  return (
    <div
      className="min-h-screen bg-background flex flex-col lg:flex-row"
      {...swipeGestures}
    >
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold gradient-primary bg-clip-text text-transparent">
          FETUCCINE
        </h1>
        <ThemeToggle />
      </header>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${
          sidebarOpen ? "w-64" : "lg:w-20"
        } transition-all duration-300 bg-card border-r border-border flex flex-col shadow-soft fixed lg:sticky lg:top-0 z-50 h-full lg:h-screen`}
      >
        {/* Sidebar Header */}
        <div className="p-4 lg:p-6 border-b border-border flex items-center justify-between">
          <h1 className={`text-xl lg:text-2xl font-bold gradient-primary bg-clip-text text-transparent ${!sidebarOpen && 'lg:hidden'}`}>
            FETUCCINE
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className={sidebarOpen ? '' : 'hidden lg:block'}>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 lg:p-4 space-y-1 lg:space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 lg:gap-3 px-2 lg:px-4 py-2 lg:py-3 rounded-lg transition-smooth text-sm lg:text-base ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  // Close sidebar on mobile after navigation
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
              >
                <Icon className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 lg:p-4 border-t border-border">
          <Button
            variant="outline"
            className="w-full justify-start text-sm lg:text-base"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
            {sidebarOpen && <span className="ml-2 lg:ml-3">Sair</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full pb-20 lg:pb-0">
        <div className="h-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        onMenuOpen={() => setMobileMenuOpen(true)}
        notificationCount={openOrdersCount}
      />

      {/* Mobile Full Menu Sheet */}
      <MobileMenuSheet
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        onLogout={handleLogout}
      />

      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  );
});

DashboardLayout.displayName = 'DashboardLayout';

export default DashboardLayout;
