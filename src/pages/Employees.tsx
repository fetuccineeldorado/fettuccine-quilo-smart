import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import EmployeeManager from "@/components/EmployeeManager";
import EmployeeReports from "@/components/EmployeeReports";
import { UserPlus, BarChart3, Users, Settings } from "lucide-react";

type TabType = 'management' | 'reports' | 'settings';

const Employees = () => {
  const [activeTab, setActiveTab] = useState<TabType>('management');

  const tabs = [
    {
      id: 'management' as TabType,
      label: 'Gestão',
      icon: Users,
      description: 'Gerenciar funcionários'
    },
    {
      id: 'reports' as TabType,
      label: 'Relatórios',
      icon: BarChart3,
      description: 'Análises e estatísticas'
    },
    {
      id: 'settings' as TabType,
      label: 'Configurações',
      icon: Settings,
      description: 'Configurações do sistema'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'management':
        return <EmployeeManager />;
      case 'reports':
        return <EmployeeReports />;
      case 'settings':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Funcionários</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configurações do sistema de funcionários em desenvolvimento...
              </p>
            </CardContent>
          </Card>
        );
      default:
        return <EmployeeManager />;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-4xl font-bold mb-2">Funcionários</h1>
            <p className="text-muted-foreground text-base lg:text-lg">
              Sistema completo de gestão de equipe
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

export default Employees;

