import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import SimpleInventoryManager from "@/components/SimpleInventoryManager";
import AdvancedInventoryManager from "@/components/AdvancedInventoryManager";
import { Package, ArrowRightLeft, AlertTriangle, BarChart3 } from "lucide-react";

type TabType = 'products' | 'movements' | 'alerts' | 'reports';

const Inventory = () => {
  const [activeTab, setActiveTab] = useState<TabType>('products');

  const tabs = [
    {
      id: 'products' as TabType,
      label: 'Produtos',
      icon: Package,
      description: 'Gerencie produtos e estoque'
    },
    {
      id: 'movements' as TabType,
      label: 'Movimentações',
      icon: ArrowRightLeft,
      description: 'Registre entradas e saídas'
    },
    {
      id: 'alerts' as TabType,
      label: 'Alertas',
      icon: AlertTriangle,
      description: 'Monitore estoque baixo'
    },
    {
      id: 'reports' as TabType,
      label: 'Relatórios',
      icon: BarChart3,
      description: 'Análises e relatórios'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'products':
        return <AdvancedInventoryManager />;
      case 'movements':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Movimentações de Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                As movimentações estão integradas na aba de Produtos
              </p>
            </CardContent>
          </Card>
        );
      case 'alerts':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Alertas de Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Os alertas são exibidos automaticamente na aba de Produtos
              </p>
            </CardContent>
          </Card>
        );
      case 'reports':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Relatórios de Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Relatórios detalhados em desenvolvimento...
              </p>
            </CardContent>
          </Card>
        );
      default:
        return <AdvancedInventoryManager />;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-4xl font-bold mb-2">Gestão de Estoque</h1>
            <p className="text-muted-foreground text-base lg:text-lg">
              Sistema completo de controle de estoque automático
            </p>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-border">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {renderTabContent()}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Inventory;