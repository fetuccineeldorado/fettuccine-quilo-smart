import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  Lock, 
  Unlock, 
  FileText, 
  TrendingUp, 
  Users, 
  ShoppingCart,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  BarChart3,
  Calendar,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CashRegisterOperation {
  id: string;
  operation_type: 'open' | 'close' | 'withdrawal' | 'deposit';
  amount: number;
  opening_balance: number | null;
  closing_balance: number | null;
  expected_balance: number | null;
  difference: number | null;
  operator_id: string;
  operator_name: string;
  notes: string | null;
  created_at: string;
}

interface CashStatus {
  isOpen: boolean;
  currentBalance: number;
  openingBalance: number;
  expectedBalance: number;
  difference: number;
  lastOperation: CashRegisterOperation | null;
}

interface DailyReport {
  totalSales: number;
  totalOrders: number;
  totalWeight: number;
  averageTicket: number;
  paymentMethods: Record<string, number>;
  cashFlow: {
    opening: number;
    expected: number;
    found: number;
    difference: number;
  };
}

const AdvancedCashManager = () => {
  const { toast } = useToast();
  const [cashStatus, setCashStatus] = useState<CashStatus>({
    isOpen: false,
    currentBalance: 0,
    openingBalance: 0,
    expectedBalance: 0,
    difference: 0,
    lastOperation: null,
  });
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [operations, setOperations] = useState<CashRegisterOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [showOperations, setShowOperations] = useState(false);

  // Load data from localStorage
  useEffect(() => {
    loadCashData();
  }, []);

  const loadCashData = () => {
    try {
      // Load operations
      const savedOperations = localStorage.getItem('cash_register_operations');
      if (savedOperations) {
        const data = JSON.parse(savedOperations);
        setOperations(data);
        
        // Calculate current status
        if (data.length > 0) {
          const lastOperation = data[0]; // Most recent operation
          const isOpen = lastOperation.operation_type === 'open';
          
          setCashStatus({
            isOpen,
            currentBalance: isOpen ? lastOperation.amount : 0,
            openingBalance: lastOperation.opening_balance || 0,
            expectedBalance: lastOperation.expected_balance || 0,
            difference: lastOperation.difference || 0,
            lastOperation,
          });
        }
      }

      // Generate daily report
      generateDailyReport().catch(err => console.error('Erro ao gerar relatório:', err));
    } catch (error) {
      console.error("Erro ao carregar dados do caixa:", error);
    }
  };

  const saveOperations = (newOperations: CashRegisterOperation[]) => {
    try {
      localStorage.setItem('cash_register_operations', JSON.stringify(newOperations));
      setOperations(newOperations);
    } catch (error) {
      console.error("Erro ao salvar operações:", error);
    }
  };

  const generateDailyReport = async () => {
    try {
      console.log('📊 AdvancedCashManager: Gerando relatório diário...');
      
      // Buscar comandas fechadas de hoje do Supabase
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, total_amount, total_weight, closed_at, payments(payment_method, amount)")
        .eq("status", "closed")
        .gte("closed_at", today.toISOString());

      if (ordersError) {
        console.error('❌ Erro ao buscar comandas:', ordersError);
        // Fallback para valores zero
        setDailyReport({
          totalSales: 0,
          totalOrders: 0,
          totalWeight: 0,
          averageTicket: 0,
          paymentMethods: {},
          cashFlow: {
            opening: 0,
            expected: 0,
            found: 0,
            difference: 0,
          },
        });
        return;
      }

      const totalSales = orders?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const totalWeight = orders?.reduce((sum, order) => sum + Number(order.total_weight || 0), 0) || 0;
      const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Calcular métodos de pagamento
      const paymentMethods: Record<string, number> = {
        'Dinheiro': 0,
        'Cartão': 0,
        'PIX': 0,
      };

      orders?.forEach((order: any) => {
        if (order.payments && Array.isArray(order.payments)) {
          order.payments.forEach((payment: any) => {
            const method = payment.payment_method;
            const amount = Number(payment.amount || 0);
            
            if (method === 'cash') {
              paymentMethods['Dinheiro'] += amount;
            } else if (method === 'credit' || method === 'debit') {
              paymentMethods['Cartão'] += amount;
            } else if (method === 'pix') {
              paymentMethods['PIX'] += amount;
            }
          });
        }
      });

      // Cash flow
      const openingBalance = cashStatus.openingBalance;
      const expectedBalance = openingBalance + totalSales;
      const foundBalance = 0; // Will be set when closing
      const difference = foundBalance - expectedBalance;

      setDailyReport({
        totalSales,
        totalOrders,
        totalWeight,
        averageTicket,
        paymentMethods,
        cashFlow: {
          opening: openingBalance,
          expected: expectedBalance,
          found: foundBalance,
          difference,
        },
      });
    } catch (error) {
      console.error("Erro ao gerar relatório diário:", error);
    }
  };

  const handleOpenCash = async () => {
    if (!openingAmount || Number(openingAmount) < 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido para abertura do caixa",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      const amount = Number(openingAmount);
      const operation: CashRegisterOperation = {
        id: crypto.randomUUID(),
        operation_type: 'open',
        amount,
        opening_balance: amount,
        closing_balance: null,
        expected_balance: null,
        difference: null,
        operator_id: 'system',
        operator_name: 'Sistema',
        notes: notes.trim() || null,
        created_at: new Date().toISOString(),
      };

      const newOperations = [operation, ...operations];
      saveOperations(newOperations);

      setCashStatus({
        isOpen: true,
        currentBalance: amount,
        openingBalance: amount,
        expectedBalance: 0,
        difference: 0,
        lastOperation: operation,
      });

      toast({
        title: "Caixa aberto!",
        description: `Caixa aberto com R$ ${amount.toFixed(2)}`,
      });

      setOpeningAmount("");
      setNotes("");
      generateDailyReport();
    } catch (error) {
      console.error("Erro ao abrir caixa:", error);
      toast({
        title: "Erro ao abrir caixa",
        description: "Não foi possível abrir o caixa",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseCash = async () => {
    if (!closingAmount || Number(closingAmount) < 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira o valor encontrado no caixa",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      const actualAmount = Number(closingAmount);
      const expectedAmount = dailyReport?.totalSales || 0;
      const openingAmount = cashStatus.openingBalance;
      const difference = actualAmount - (openingAmount + expectedAmount);

      const operation: CashRegisterOperation = {
        id: crypto.randomUUID(),
        operation_type: 'close',
        amount: actualAmount,
        opening_balance: openingAmount,
        closing_balance: actualAmount,
        expected_balance: openingAmount + expectedAmount,
        difference,
        operator_id: 'system',
        operator_name: 'Sistema',
        notes: notes.trim() || null,
        created_at: new Date().toISOString(),
      };

      const newOperations = [operation, ...operations];
      saveOperations(newOperations);

      setCashStatus({
        isOpen: false,
        currentBalance: 0,
        openingBalance: 0,
        expectedBalance: 0,
        difference: 0,
        lastOperation: operation,
      });

      toast({
        title: "Caixa fechado!",
        description: `Caixa fechado com R$ ${actualAmount.toFixed(2)}. Diferença: R$ ${difference.toFixed(2)}`,
      });

      setClosingAmount("");
      setNotes("");
      generateDailyReport();
    } catch (error) {
      console.error("Erro ao fechar caixa:", error);
      toast({
        title: "Erro ao fechar caixa",
        description: "Não foi possível fechar o caixa",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const exportOperations = () => {
    const csvContent = [
      ["Data", "Operação", "Valor", "Saldo Inicial", "Saldo Final", "Esperado", "Diferença", "Operador", "Observações"],
      ...operations.map(op => [
        format(new Date(op.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        op.operation_type === 'open' ? 'Abertura' : op.operation_type === 'close' ? 'Fechamento' : op.operation_type,
        op.amount.toString(),
        op.opening_balance?.toString() || '',
        op.closing_balance?.toString() || '',
        op.expected_balance?.toString() || '',
        op.difference?.toString() || '',
        op.operator_name,
        op.notes || ''
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `operacoes_caixa_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestão Avançada de Caixa</h2>
          <p className="text-muted-foreground">
            Sistema completo de abertura, fechamento e relatórios do caixa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCashData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={exportOperations}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Cash Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {cashStatus.isOpen ? (
              <CheckCircle className="h-6 w-6 text-green-500" />
            ) : (
              <XCircle className="h-6 w-6 text-red-500" />
            )}
            Status do Caixa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <Badge variant={cashStatus.isOpen ? "default" : "destructive"} className="text-lg px-4 py-2">
                {cashStatus.isOpen ? "ABERTO" : "FECHADO"}
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Status Atual
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">
                R$ {cashStatus.currentBalance.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Saldo Atual</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">
                R$ {cashStatus.openingBalance.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Saldo Inicial</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">
                R$ {cashStatus.expectedBalance.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Saldo Esperado</p>
            </div>
          </div>

          {cashStatus.difference !== 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="font-semibold text-yellow-800">
                  Diferença encontrada: R$ {cashStatus.difference.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Cash */}
        {!cashStatus.isOpen && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Unlock className="h-6 w-6 text-green-500" />
                Abrir Caixa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="opening-amount">Valor de Abertura *</Label>
                <Input
                  id="opening-amount"
                  type="number"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opening-notes">Observações</Label>
                <Textarea
                  id="opening-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações sobre a abertura do caixa"
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleOpenCash} 
                disabled={actionLoading || !openingAmount} 
                className="w-full"
              >
                {actionLoading ? "Abrindo..." : "Abrir Caixa"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Close Cash */}
        {cashStatus.isOpen && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-6 w-6 text-red-500" />
                Fechar Caixa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="closing-amount">Valor Encontrado no Caixa *</Label>
                <Input
                  id="closing-amount"
                  type="number"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing-notes">Observações</Label>
                <Textarea
                  id="closing-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações sobre o fechamento do caixa"
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleCloseCash} 
                disabled={actionLoading || !closingAmount} 
                className="w-full"
              >
                {actionLoading ? "Fechando..." : "Fechar Caixa"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Operations History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Operações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {operations.slice(0, 5).map((operation) => (
                <div key={operation.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {operation.operation_type === 'open' ? (
                      <Unlock className="h-4 w-4 text-green-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {operation.operation_type === 'open' ? 'Abertura' : 'Fechamento'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(operation.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">R$ {operation.amount.toFixed(2)}</p>
                    {operation.difference !== null && operation.difference !== 0 && (
                      <p className={`text-sm ${operation.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {operation.difference > 0 ? '+' : ''}R$ {operation.difference.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {operations.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma operação registrada
                </p>
              )}
            </div>
            {operations.length > 5 && (
              <Button 
                variant="outline" 
                className="w-full mt-2"
                onClick={() => setShowOperations(true)}
              >
                Ver Todas as Operações ({operations.length})
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Report */}
      {dailyReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Relatório Diário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  R$ {dailyReport.totalSales.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Faturamento Total</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {dailyReport.totalOrders}
                </p>
                <p className="text-sm text-muted-foreground">Total de Pedidos</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {dailyReport.totalWeight.toFixed(3)} kg
                </p>
                <p className="text-sm text-muted-foreground">Peso Total Vendido</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">
                  R$ {dailyReport.averageTicket.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
              </div>
            </div>

            <h3 className="text-xl font-semibold mt-8 mb-4">Formas de Pagamento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(dailyReport.paymentMethods).map(([method, amount]) => (
                <div key={method} className="text-center">
                  <p className="text-2xl font-bold">R$ {Number(amount).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">{method.toUpperCase()}</p>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-semibold mt-8 mb-4">Fluxo de Caixa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">R$ {dailyReport.cashFlow.opening.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Saldo Inicial</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">R$ {dailyReport.cashFlow.expected.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Saldo Esperado</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">R$ {dailyReport.cashFlow.found.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Saldo Encontrado</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">R$ {dailyReport.cashFlow.difference.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Diferença</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operations Modal */}
      <Dialog open={showOperations} onOpenChange={setShowOperations}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Histórico Completo de Operações</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {operations.map((operation) => (
              <div key={operation.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  {operation.operation_type === 'open' ? (
                    <Unlock className="h-5 w-5 text-green-500" />
                  ) : (
                    <Lock className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {operation.operation_type === 'open' ? 'Abertura' : 'Fechamento'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(operation.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                    {operation.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {operation.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">R$ {operation.amount.toFixed(2)}</p>
                  {operation.difference !== null && operation.difference !== 0 && (
                    <p className={`text-sm ${operation.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {operation.difference > 0 ? '+' : ''}R$ {operation.difference.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvancedCashManager;
