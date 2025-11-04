import { ReactNode, useEffect, useState } from "react";
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

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session && event === 'SIGNED_OUT') {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
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
    // TODO: Criar página de gestão de itens extras
    // { path: "/dashboard/extra-items", icon: ShoppingCart, label: "Itens Extras" },
    { path: "/dashboard/settings", icon: Settings, label: "Configurações" },
  ];

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
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
          sidebarOpen ? "w-64" : "w-20"
        } transition-all duration-300 bg-card border-r border-border flex flex-col shadow-soft fixed lg:relative z-50 h-screen lg:h-auto`}
      >
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-border flex items-center justify-between">
          {sidebarOpen ? (
            <>
              <h1 className="text-xl lg:text-2xl font-bold gradient-primary bg-clip-text text-transparent">
                FETUCCINE
              </h1>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="mx-auto"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <ThemeToggle />
            </div>
          )}
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
      <main className="flex-1 overflow-auto lg:ml-0">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
