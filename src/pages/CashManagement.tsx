import DashboardLayout from "@/components/DashboardLayout";
import AdvancedCashManager from "@/components/AdvancedCashManager";

const CashManagement = () => {
  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-4xl font-bold mb-2">Gerenciamento de Caixa</h1>
            <p className="text-muted-foreground text-base lg:text-lg">
              Sistema completo de abertura, fechamento e relatórios do caixa
            </p>
          </div>
        </div>

        {/* Advanced Cash Manager */}
        <AdvancedCashManager />
      </div>
    </DashboardLayout>
  );
};

export default CashManagement;