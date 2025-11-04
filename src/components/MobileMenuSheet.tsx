import { NavLink, useLocation } from "react-router-dom";
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
  DollarSign,
  Megaphone,
  ChevronRight,
  LucideIcon
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout: () => void;
}

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  category?: string;
}

const MobileMenuSheet = ({ open, onOpenChange, onLogout }: MobileMenuSheetProps) => {
  const location = useLocation();

  const navItems: NavItem[] = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard", category: "Principal" },
    { path: "/dashboard/weighing", icon: Scale, label: "Pesagem", category: "Principal" },
    { path: "/dashboard/orders", icon: FileText, label: "Comandas", category: "Principal" },
    { path: "/dashboard/cashier", icon: CreditCard, label: "Caixa", category: "Principal" },
    
    { path: "/dashboard/cash-management", icon: DollarSign, label: "Gerenciar Caixa", category: "Gestão" },
    { path: "/dashboard/reports", icon: BarChart3, label: "Relatórios", category: "Gestão" },
    { path: "/dashboard/inventory", icon: Package, label: "Estoque", category: "Gestão" },
    
    { path: "/dashboard/customers", icon: Users, label: "Clientes", category: "Cadastros" },
    { path: "/dashboard/promotions", icon: Megaphone, label: "Promoções", category: "Cadastros" },
    { path: "/dashboard/employees", icon: UserPlus, label: "Funcionários", category: "Cadastros" },
    
    { path: "/dashboard/settings", icon: Settings, label: "Configurações", category: "Sistema" },
  ];

  const categories = ["Principal", "Gestão", "Cadastros", "Sistema"];

  const isActive = (path: string) => location.pathname === path;

  const handleNavClick = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85vw] sm:w-[350px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
            FETUCCINE
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="px-4 py-4 space-y-6">
            {categories.map((category) => {
              const categoryItems = navItems.filter(item => item.category === category);
              
              return (
                <div key={category}>
                  <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </h3>
                  <div className="space-y-1">
                    {categoryItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={handleNavClick}
                          className={`flex items-center justify-between px-3 py-3 rounded-lg transition-all group ${
                            active
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "hover:bg-accent text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 flex-shrink-0 ${active ? '' : 'text-muted-foreground group-hover:text-foreground'}`} />
                            <span className="font-medium">{item.label}</span>
                          </div>
                          {active && (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                  {category !== "Sistema" && <Separator className="mt-4" />}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer with Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-card">
          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              onLogout();
              onOpenChange(false);
            }}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sair
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenuSheet;

