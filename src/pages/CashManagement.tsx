import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
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
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CashRegisterOperation {
  id: string;
  operation_type: string;
  amount: number;
  opening_balance: number | null;
  closing_balance: number | null;
  expected_balance: number | null;
  difference: number | null;
  operator_id: string;
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
  paymentMethods: {
    cash: number;
    credit: number;
    debit: number;
    pix: number;
  };
  cashFlow: {
    opening: number;
    expected: number;
    actual: number;
    difference: number;
  };
}

const CashManagement = () => {
  const { toast } = useToast();
  const [cashStatus, setCashStatus] = useState<CashStatus | null>(null);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form states
  const [openingAmount, setOpeningAmount] = useState<string>("");
  const [closingAmount, setClosingAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    fetchCashStatus();
    fetchDailyReport();
  }, []);

  const fetchCashStatus = async () => {
    try {
      console.log("Iniciando busca do status do caixa...");
      
      // First, try to get all operations to see if table exists
      const { data: allOperations, error: listError } = await supabaseAdmin
        .from("cash_register")
        .select("*")
        .order("created_at", { ascending: false });

      if (listError) {
        console.error("Erro ao listar operações:", listError);
        throw listError;
      }

      console.log("Operações encontradas:", allOperations);

      // Get the latest operation
      const lastOperation = allOperations && allOperations.length > 0 ? allOperations[0] : null;

      // Check if the last operation was an "open" and there's no subsequent "close"
      const isOpen = lastOperation?.operation_type === "open";
      const currentBalance = lastOperation?.closing_balance || lastOperation?.opening_balance || 0;
      const openingBalance = lastOperation?.opening_balance || 0;
      const expectedBalance = lastOperation?.expected_balance || 0;
      const difference = lastOperation?.difference || 0;

      console.log("Status do caixa calculado:", {
        lastOperation,
        isOpen,
        currentBalance,
        openingBalance,
        expectedBalance,
        difference
      });

      setCashStatus({
        isOpen: isOpen || false,
        currentBalance: currentBalance || 0,
        openingBalance: openingBalance || 0,
        expectedBalance: expectedBalance || 0,
        difference: difference || 0,
        lastOperation: lastOperation || null,
      });

      console.log("Status do caixa atualizado com sucesso");
    } catch (error) {
      console.error("Erro ao carregar status do caixa:", error);
      
      // Set default status when there's an error
      setCashStatus({
        isOpen: false,
        currentBalance: 0,
        openingBalance: 0,
        expectedBalance: 0,
        difference: 0,
        lastOperation: null,
      });
      
      toast({
        title: "Erro ao carregar status do caixa",
        description: `Erro: ${error.message || 'Desconhecido'}`,
        variant: "destructive",
      });
    }
  };

  const fetchDailyReport = async () => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Get today's sales
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("total_amount, total_weight, status")
        .eq("status", "closed")
        .gte("closed_at", startOfDay.toISOString())
        .lt("closed_at", endOfDay.toISOString());

      if (ordersError) throw ordersError;

      // Get payment methods breakdown
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("payment_method, amount")
        .gte("processed_at", startOfDay.toISOString())
        .lt("processed_at", endOfDay.toISOString());

      if (paymentsError) throw paymentsError;

      // Calculate totals
      const totalSales = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const totalOrders = orders?.length || 0;
      const totalWeight = orders?.reduce((sum, order) => sum + Number(order.total_weight), 0) || 0;
      const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Payment methods breakdown
      const paymentMethods = {
        cash: 0,
        credit: 0,
        debit: 0,
        pix: 0,
      };

      payments?.forEach(payment => {
        const amount = Number(payment.amount);
        switch (payment.payment_method) {
          case "cash":
            paymentMethods.cash += amount;
            break;
          case "credit":
            paymentMethods.credit += amount;
            break;
          case "debit":
            paymentMethods.debit += amount;
            break;
          case "pix":
            paymentMethods.pix += amount;
            break;
        }
      });

      // Get cash flow data
      const { data: cashOperations, error: cashError } = await supabase
        .from("cash_register")
        .select("*")
        .gte("created_at", startOfDay.toISOString())
        .lt("created_at", endOfDay.toISOString())
        .order("created_at", { ascending: true });

      if (cashError) throw cashError;

      const openingOperation = cashOperations?.find(op => op.operation_type === "open");
      const closingOperation = cashOperations?.find(op => op.operation_type === "close");

      const cashFlow = {
        opening: openingOperation?.opening_balance || 0,
        expected: closingOperation?.expected_balance || paymentMethods.cash,
        actual: closingOperation?.closing_balance || 0,
        difference: closingOperation?.difference || 0,
      };

      setDailyReport({
        totalSales,
        totalOrders,
        totalWeight,
        averageTicket,
        paymentMethods,
        cashFlow,
      });
    } catch (error) {
      console.error("Erro ao carregar relatório diário:", error);
      toast({
        title: "Erro ao carregar relatório",
        description: "Não foi possível carregar o relatório diário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      const { data: { session } } = await supabase.auth.getSession();
      const amount = Number(openingAmount);

      console.log("Abrindo caixa com valor:", amount);
      console.log("Session user ID:", session?.user?.id);

      const operationData = {
        operation_type: "open",
        amount: amount,
        opening_balance: amount,
        operator_id: session?.user?.id || '00000000-0000-0000-0000-000000000000',
        notes: notes.trim() || null,
      };

      console.log("Dados da operação:", operationData);

      const { data: newOperation, error } = await supabaseAdmin
        .from("cash_register")
        .insert(operationData)
        .select()
        .single();

      if (error) {
        console.error("Erro ao inserir operação de abertura:", error);
        throw error;
      }

      console.log("Operação de abertura criada:", newOperation);

      toast({
        title: "Caixa aberto!",
        description: `Caixa aberto com R$ ${amount.toFixed(2)}`,
      });

      setOpeningAmount("");
      setNotes("");
      
      // Aguardar um pouco antes de atualizar o status
      setTimeout(() => {
        fetchCashStatus();
        fetchDailyReport();
      }, 500);
    } catch (error) {
      console.error("Erro ao abrir caixa:", error);
      toast({
        title: "Erro ao abrir caixa",
        description: `Erro: ${error.message || 'Não foi possível abrir o caixa'}`,
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
      const { data: { session } } = await supabase.auth.getSession();
      const actualAmount = Number(closingAmount);
      const expectedAmount = dailyReport?.cashFlow.expected || 0;
      const difference = actualAmount - expectedAmount;

      const { data: newOperation, error } = await supabaseAdmin.from("cash_register").insert({
        operation_type: "close",
        amount: actualAmount,
        opening_balance: cashStatus?.openingBalance || 0,
        closing_balance: actualAmount,
        expected_balance: expectedAmount,
        difference: difference,
        operator_id: session?.user?.id,
        notes: notes.trim() || null,
      }).select().single();

      if (error) {
        console.error("Erro ao inserir operação de fechamento:", error);
        throw error;
      }

      console.log("Operação de fechamento criada:", newOperation);

      toast({
        title: "Caixa fechado!",
        description: `Caixa fechado com R$ ${actualAmount.toFixed(2)}. Diferença: R$ ${difference.toFixed(2)}`,
      });

      setClosingAmount("");
      setNotes("");
      
      // Aguardar um pouco antes de atualizar o status
      setTimeout(() => {
        fetchCashStatus();
        fetchDailyReport();
      }, 500);
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

  const printReport = () => {
    if (!dailyReport) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Relatório Diário - ${format(new Date(), "dd/MM/yyyy", { locale: ptBR })}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              max-width: 400px; 
              margin: 0 auto; 
              padding: 20px;
            }
            .header { text-align: center; margin-bottom: 20px; }
            .section { margin: 15px 0; }
            .bold { font-weight: bold; }
            .separator { border-bottom: 1px dashed #000; margin: 10px 0; }
            .right { text-align: right; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="bold" style="font-size: 18px;">FETTUCCINE ELDORADO</div>
            <div>Relatório Diário</div>
            <div>${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
            <div class="separator"></div>
          </div>
          
          <div class="section">
            <div class="bold">RESUMO DE VENDAS</div>
            <div class="separator"></div>
            <div>Total de Vendas: R$ ${dailyReport.totalSales.toFixed(2)}</div>
            <div>Número de Pedidos: ${dailyReport.totalOrders}</div>
            <div>Peso Total: ${dailyReport.totalWeight.toFixed(3)} kg</div>
            <div>Ticket Médio: R$ ${dailyReport.averageTicket.toFixed(2)}</div>
            <div class="separator"></div>
          </div>
          
          <div class="section">
            <div class="bold">FORMAS DE PAGAMENTO</div>
            <div class="separator"></div>
            <div>Dinheiro: R$ ${dailyReport.paymentMethods.cash.toFixed(2)}</div>
            <div>Cartão Crédito: R$ ${dailyReport.paymentMethods.credit.toFixed(2)}</div>
            <div>Cartão Débito: R$ ${dailyReport.paymentMethods.debit.toFixed(2)}</div>
            <div>PIX: R$ ${dailyReport.paymentMethods.pix.toFixed(2)}</div>
            <div class="separator"></div>
          </div>
          
          <div class="section">
            <div class="bold">FLUXO DE CAIXA</div>
            <div class="separator"></div>
            <div>Saldo Inicial: R$ ${dailyReport.cashFlow.opening.toFixed(2)}</div>
            <div>Esperado: R$ ${dailyReport.cashFlow.expected.toFixed(2)}</div>
            <div>Encontrado: R$ ${dailyReport.cashFlow.actual.toFixed(2)}</div>
            <div class="bold">Diferença: R$ ${dailyReport.cashFlow.difference.toFixed(2)}</div>
            <div class="separator"></div>
          </div>
          
          <div class="center">
            <div>Relatório gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 1000);
    }, 500);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Carregando informações do caixa...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-4xl font-bold mb-2">Gerenciamento de Caixa</h1>
            <p className="text-muted-foreground text-base lg:text-lg">
              Abertura, fechamento e relatórios detalhados do caixa
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                fetchCashStatus();
                fetchDailyReport();
              }}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              {loading ? "Atualizando..." : "Atualizar Status"}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  console.log("Testando conexão com cash_register...");
                  const { data, error } = await supabaseAdmin
                    .from("cash_register")
                    .select("count")
                    .limit(1);
                  
                  if (error) {
                    console.error("Erro na conexão:", error);
                    toast({
                      title: "Erro de conexão",
                      description: `Erro: ${error.message}`,
                      variant: "destructive",
                    });
                  } else {
                    console.log("Conexão OK:", data);
                    toast({
                      title: "Conexão OK",
                      description: "Tabela cash_register acessível",
                    });
                  }
                } catch (err) {
                  console.error("Erro no teste:", err);
                  toast({
                    title: "Erro no teste",
                    description: `Erro: ${err.message}`,
                    variant: "destructive",
                  });
                }
              }}
              className="flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              Testar Conexão
            </Button>
          </div>
        </div>

        {/* Cash Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {cashStatus?.isOpen ? (
                <Unlock className="h-6 w-6 text-green-600" />
              ) : (
                <Lock className="h-6 w-6 text-red-600" />
              )}
              Status do Caixa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="text-center">
                <Badge variant={cashStatus?.isOpen ? "default" : "destructive"} className="text-lg px-4 py-2">
                  {cashStatus?.isOpen ? "ABERTO" : "FECHADO"}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  {cashStatus?.isOpen ? "Caixa em operação" : "Caixa fechado"}
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  R$ {cashStatus?.currentBalance.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Saldo Atual</p>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold">
                  R$ {cashStatus?.expectedBalance.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Saldo Esperado</p>
              </div>
            </div>

            {cashStatus?.difference && cashStatus.difference !== 0 && (
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
          {!cashStatus?.isOpen && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Unlock className="h-5 w-5 text-green-600" />
                  Abrir Caixa
                </CardTitle>
                <CardDescription>
                  Inicie o turno de trabalho abrindo o caixa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="opening-amount">Valor Inicial (R$)</Label>
                  <Input
                    id="opening-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="opening-notes">Observações (opcional)</Label>
                  <Input
                    id="opening-notes"
                    placeholder="Observações sobre a abertura"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
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
          {cashStatus?.isOpen && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-red-600" />
                  Fechar Caixa
                </CardTitle>
                <CardDescription>
                  Finalize o turno fechando o caixa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Saldo Esperado:</strong> R$ {cashStatus?.expectedBalance.toFixed(2)}
                  </p>
                </div>
                <div>
                  <Label htmlFor="closing-amount">Valor Encontrado (R$)</Label>
                  <Input
                    id="closing-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="closing-notes">Observações (opcional)</Label>
                  <Input
                    id="closing-notes"
                    placeholder="Observações sobre o fechamento"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleCloseCash} 
                  disabled={actionLoading || !closingAmount}
                  className="w-full"
                  variant="destructive"
                >
                  {actionLoading ? "Fechando..." : "Fechar Caixa"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Daily Report */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatório Diário
              </CardTitle>
              <CardDescription>
                Resumo das vendas do dia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dailyReport ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">
                        R$ {dailyReport.totalSales.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total de Vendas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {dailyReport.totalOrders}
                      </p>
                      <p className="text-sm text-muted-foreground">Pedidos</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Dinheiro:</span>
                      <span className="font-semibold">R$ {dailyReport.paymentMethods.cash.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cartão Crédito:</span>
                      <span className="font-semibold">R$ {dailyReport.paymentMethods.credit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cartão Débito:</span>
                      <span className="font-semibold">R$ {dailyReport.paymentMethods.debit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PIX:</span>
                      <span className="font-semibold">R$ {dailyReport.paymentMethods.pix.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <Button onClick={printReport} className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Imprimir Relatório
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum dado disponível
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Report */}
        {dailyReport && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Relatório Detalhado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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
                    {dailyReport.totalWeight.toFixed(2)} kg
                  </p>
                  <p className="text-sm text-muted-foreground">Peso Total</p>
                </div>
                
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    R$ {dailyReport.averageTicket.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CashManagement;
