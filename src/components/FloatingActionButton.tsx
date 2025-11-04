import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus,
  Scale,
  FileText,
  CreditCard,
  Users,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface FABAction {
  icon: React.ReactNode;
  label: string;
  path: string;
  color: string;
}

const FloatingActionButton = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const actions: FABAction[] = [
    {
      icon: <Scale className="h-5 w-5" />,
      label: "Nova Pesagem",
      path: "/dashboard/weighing",
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: "Ver Comandas",
      path: "/dashboard/orders",
      color: "bg-orange-500 hover:bg-orange-600"
    },
    {
      icon: <CreditCard className="h-5 w-5" />,
      label: "Fechar Caixa",
      path: "/dashboard/cashier",
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "Novo Cliente",
      path: "/dashboard/customers",
      color: "bg-purple-500 hover:bg-purple-600"
    },
  ];

  const handleActionClick = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB Container */}
      <div className="lg:hidden fixed bottom-20 right-4 z-50">
        {/* Action Buttons */}
        <div className={`flex flex-col-reverse gap-3 mb-3 transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}>
          {actions.map((action, index) => (
            <div
              key={action.path}
              className="flex items-center gap-3"
              style={{
                transitionDelay: isOpen ? `${index * 50}ms` : '0ms'
              }}
            >
              <span className="bg-card px-3 py-2 rounded-lg shadow-lg text-sm font-medium whitespace-nowrap border border-border">
                {action.label}
              </span>
              <Button
                size="icon"
                className={`h-12 w-12 rounded-full shadow-lg ${action.color} text-white`}
                onClick={() => handleActionClick(action.path)}
              >
                {action.icon}
              </Button>
            </div>
          ))}
        </div>

        {/* Main FAB Button */}
        <Button
          size="icon"
          className={`h-14 w-14 rounded-full shadow-xl transition-all ${
            isOpen 
              ? 'bg-destructive hover:bg-destructive/90 rotate-45' 
              : 'bg-primary hover:bg-primary/90 rotate-0'
          }`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </Button>
      </div>
    </>
  );
};

export default FloatingActionButton;

