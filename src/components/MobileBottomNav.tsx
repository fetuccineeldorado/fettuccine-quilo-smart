import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Scale, 
  FileText, 
  CreditCard,
  Menu,
  LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

interface MobileBottomNavProps {
  onMenuOpen?: () => void;
  notificationCount?: number;
}

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

const MobileBottomNav = ({ onMenuOpen, notificationCount = 0 }: MobileBottomNavProps) => {
  const location = useLocation();

  // Itens principais que aparecem na bottom bar
  const primaryNavItems: NavItem[] = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Início" },
    { path: "/dashboard/weighing", icon: Scale, label: "Pesar" },
    { path: "/dashboard/orders", icon: FileText, label: "Comandas", badge: notificationCount },
    { path: "/dashboard/cashier", icon: CreditCard, label: "Caixa" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg safe-area-inset-bottom">
      <div className="grid grid-cols-5 h-16">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 relative transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${active ? 'scale-110' : ''} transition-transform`} />
                {item.badge && item.badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'font-bold' : ''}`}>
                {item.label}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-b-full" />
              )}
            </NavLink>
          );
        })}

        {/* Menu Button - Opens Full Menu */}
        <Button
          variant="ghost"
          className="flex flex-col items-center justify-center gap-1 h-full rounded-none"
          onClick={onMenuOpen}
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">Menu</span>
        </Button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;

