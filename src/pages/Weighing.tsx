import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import ExtraItemsSelector from "@/components/ExtraItemsSelector";
import CustomerSearch from "@/components/CustomerSearch";
import { ThermalPrinter, OrderData } from "@/utils/thermalPrinter";
import { AlertCircle, Utensils, Printer } from "lucide-react";

import { reduceProductStock, ensureProductExists } from "@/utils/inventoryUtils";


const Weighing = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [weight, setWeight] = useState<string>("");
  const [pricePerKg, setPricePerKg] = useState<number>(54.90);
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    total_orders: number;
    total_spent: number;
  } | null>(null);
  const [selectedExtraItems, setSelectedExtraItems] = useState<Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>>([]);
  const [printing, setPrinting] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("price_per_kg")
        .single();
      
      if (error) {
        console.error('Erro ao carregar preço por kg:', error);
        toast({
          title: "Erro ao carregar configurações",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      if (data) {
        setPricePerKg(Number(data.price_per_kg));
      }
    } catch (err) {
      console.error('Erro geral ao carregar configurações:', err);
      toast({
        title: "Erro ao carregar configurações",
        description: "Erro desconhecido",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    if (customer) {
      setCustomerName(customer.name);
    } else {
      setCustomerName("");
    }
  };


  const calculateFoodTotal = () => {
    const weightNum = Number(weight);
    return (weightNum * pricePerKg).toFixed(2);
  };

  const calculateExtraItemsTotal = () => {
    return selectedExtraItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const weightNum = Number(weight);
    const foodTotal = weightNum * pricePerKg;
    const extraItemsTotal = calculateExtraItemsTotal();
    return (foodTotal + extraItemsTotal).toFixed(2);
  };


  const handleCreateOrder = async () => {
    const finalCustomerName = selectedCustomer ? selectedCustomer.name : customerName.trim();
    
    if (!finalCustomerName) {
      toast({
        title: "Nome do cliente obrigatório",
        description: "Por favor, selecione um cliente ou digite o nome",
        variant: "destructive",
      });
      return;
    }

    if (!weight || Number(weight) <= 0) {
      toast({
        title: "Peso inválido",
        description: "Por favor, insira um peso válido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const weightNum = Number(weight);
      const foodTotal = weightNum * pricePerKg;
      const extraItemsTotal = calculateExtraItemsTotal();
      const total = foodTotal + extraItemsTotal;

      // Create new order
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          status: "open",
          customer_name: finalCustomerName,
          total_weight: weightNum,
          food_total: foodTotal,
          total_amount: total,
          opened_by: session?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create order item for food
      await supabase.from("order_items").insert({
        order_id: order.id,
        item_type: "food_weight",
        description: `Comida por quilo - ${weightNum}kg`,
        quantity: weightNum,
        unit_price: pricePerKg,
        total_price: foodTotal,
      });

      // Create order items for extra items and reduce stock
      if (selectedExtraItems.length > 0) {
        const extraItemsData = selectedExtraItems.map(item => ({
          order_id: order.id,
          extra_item_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        }));

        await supabase.from("order_extra_items").insert(extraItemsData);

        // Reduce stock for extra items using localStorage
        for (const item of selectedExtraItems) {
          // Ensure product exists in inventory
          const product = ensureProductExists(item.name, item.price);
          
          // Reduce stock
          const success = reduceProductStock(
            product.id, 
            item.quantity, 
            order.id, 
            'order',
            `Venda automática - Comanda #${order.order_number}`
          );
          
          if (!success) {
            console.warn(`Não foi possível reduzir estoque para ${item.name}`);
          }
        }
      }


      toast({
        title: "Comanda criada!",
        description: `Comanda #${order.order_number} - ${finalCustomerName} - R$ ${total.toFixed(2)}`,
      });

          // Imprimir comanda
          await printOrderReceipt(order, finalCustomerName, weightNum, foodTotal, extraItemsTotal);

      // Reset form
      setCustomerName("");
      setWeight("");
      setSelectedCustomer(null);
      setSelectedExtraItems([]);
      
      // Navigate to orders or stay for next weighing
      setTimeout(() => {
        navigate("/dashboard/orders");
      }, 1500);
    } catch (error: unknown) {
      toast({
        title: "Erro ao criar comanda",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const printOrderReceipt = async (order: any, customerName: string, weight: number, foodTotal: number, extraItemsTotal: number) => {
    setPrinting(true);
    try {
      console.log('=== INICIANDO IMPRESSÃO DE COMANDA ===');
      
      // Debug dos dados antes da impressão
      ThermalPrinter.debugPrintData(
        order, 
        customerName, 
        weight, 
        foodTotal, 
        selectedExtraItems, 
        extraItemsTotal
      );

      // Usar impressão direta com HTML
      const success = await ThermalPrinter.printOrderDirect(order, customerName, weight, foodTotal, selectedExtraItems, extraItemsTotal);

      if (success) {
        console.log('Impressão realizada com sucesso');
        toast({
          title: "Comanda impressa!",
          description: "A comanda foi enviada para impressão com sucesso",
        });
      } else {
        console.error('Falha na impressão');
        toast({
          title: "Erro de impressão",
          description: "Não foi possível imprimir a comanda. Verifique a impressora ou tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro ao imprimir comanda:', error);
      toast({
        title: "Erro na impressão",
        description: `Erro ao imprimir: ${error instanceof Error ? error.message : "Desconhecido"}`,
        variant: "destructive",
      });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 lg:space-y-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-4xl font-bold mb-2">Pesagem</h1>
            <p className="text-muted-foreground text-base lg:text-lg">
              Sistema de pesagem manual por quilo
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                try {
                  const printers = await ThermalPrinter.detectUSBPrinters();
                  if (printers.length > 0) {
                    toast({
                      title: "Impressoras USB detectadas",
                      description: `${printers.length} impressora(s) USB encontrada(s)`,
                    });
                  } else {
                    toast({
                      title: "Nenhuma impressora USB",
                      description: "Nenhuma impressora USB detectada",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Erro na detecção",
                    description: "Erro ao detectar impressoras USB",
                    variant: "destructive",
                  });
                }
              }}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Detectar USB
            </Button>
            <Button
              onClick={async () => {
                setPrinting(true);
                try {
                  const success = await ThermalPrinter.directUSBPrint(`
${ThermalPrinter.CENTER}${ThermalPrinter.BOLD}${ThermalPrinter.EXTRA_LARGE}TESTE DIRETO USB${ThermalPrinter.NORMAL}
${ThermalPrinter.MEDIUM}================================
${ThermalPrinter.SMALL}Data: ${new Date().toLocaleString('pt-BR')}
Status: Impressão Direta USB
================================
${ThermalPrinter.FEED}${ThermalPrinter.FEED}${ThermalPrinter.CUT}
                  `);
                  if (success) {
                    toast({
                      title: "Impressão direta USB",
                      description: "Cupom enviado via impressão direta USB",
                    });
                  } else {
                    toast({
                      title: "Erro na impressão direta",
                      description: "Não foi possível imprimir via USB direto",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Erro na impressão direta",
                    description: "Erro ao imprimir via USB direto",
                    variant: "destructive",
                  });
                } finally {
                  setPrinting(false);
                }
              }}
              variant="outline"
              disabled={printing}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              {printing ? "Imprimindo..." : "Impressão Direta USB"}
            </Button>
            <Button
              onClick={async () => {
                setPrinting(true);
                try {
                  const success = await ThermalPrinter.testPrinter();
                  if (success) {
                    toast({
                      title: "Teste de impressão",
                      description: "Cupom de teste enviado para impressora",
                    });
                  } else {
                    toast({
                      title: "Erro no teste",
                      description: "Não foi possível imprimir teste",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Erro no teste",
                    description: "Erro ao testar impressora",
                    variant: "destructive",
                  });
                } finally {
                  setPrinting(false);
                }
              }}
              variant="outline"
              disabled={printing}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              {printing ? "Testando..." : "Testar Impressora"}
            </Button>
            <Button
              onClick={async () => {
                setPrinting(true);
                try {
                  const success = await ThermalPrinter.testPrinterWithItems();
                  if (success) {
                    toast({
                      title: "Teste com itens extra",
                      description: "Cupom com itens extra enviado para impressora",
                    });
                  } else {
                    toast({
                      title: "Erro no teste",
                      description: "Não foi possível imprimir teste com itens",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Erro no teste",
                    description: "Erro ao testar impressora com itens",
                    variant: "destructive",
                  });
                } finally {
                  setPrinting(false);
                }
              }}
              variant="outline"
              disabled={printing}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              {printing ? "Testando..." : "Teste com Itens"}
            </Button>
            <Button
              onClick={async () => {
                setPrinting(true);
                try {
                  const success = await ThermalPrinter.forcePrintWithItems();
                  if (success) {
                    toast({
                      title: "Impressão forçada",
                      description: "Cupom com itens extra (HTML direto) enviado para impressora",
                    });
                  } else {
                    toast({
                      title: "Erro na impressão forçada",
                      description: "Não foi possível imprimir teste forçado",
                      variant: "destructive",
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Erro na impressão forçada",
                    description: "Erro ao testar impressão forçada",
                    variant: "destructive",
                  });
                } finally {
                  setPrinting(false);
                }
              }}
              variant="outline"
              disabled={printing}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              {printing ? "Imprimindo..." : "Forçar Impressão"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Manual Weighing Card */}
          <Card className="shadow-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-6 w-6 text-primary" />
                Pesagem Manual
              </CardTitle>
              <CardDescription>
                Insira o peso da comida manualmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="manual-weight">Peso (kg) *</Label>
                <Input
                  id="manual-weight"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>

              <CustomerSearch
                onCustomerSelect={handleCustomerSelect}
                selectedCustomer={selectedCustomer}
                placeholder="Buscar cliente cadastrado ou digite nome..."
              />
            </CardContent>
          </Card>

          {/* Extra Items Card */}
          <Card className="shadow-strong">
            <CardHeader>
              <CardTitle>Itens Extra</CardTitle>
              <CardDescription>
                Adicione bebidas e outros itens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExtraItemsSelector
                selectedItems={selectedExtraItems}
                onItemsChange={setSelectedExtraItems}
              />
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="shadow-strong">
            <CardHeader>
              <CardTitle>Resumo da Comanda</CardTitle>
              <CardDescription>Valores calculados automaticamente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Preço por kg</span>
                  <span className="text-xl font-semibold">
                    R$ {pricePerKg.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Peso</span>
                  <span className="text-xl font-semibold">
                    {Number(weight || 0).toFixed(3)} kg
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Comida</span>
                  <span className="text-xl font-semibold">
                    R$ {calculateFoodTotal()}
                  </span>
                </div>

                {selectedExtraItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                      <span className="text-muted-foreground">Itens Extra</span>
                      <span className="text-xl font-semibold">
                        R$ {calculateExtraItemsTotal().toFixed(2)}
                      </span>
                    </div>
                    
                    {/* Lista detalhada dos itens extra */}
                    <div className="space-y-1">
                      {selectedExtraItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center px-4 py-2 bg-muted/50 rounded text-sm">
                          <span className="text-muted-foreground">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-medium">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                <div className="flex justify-between items-center p-6 bg-gradient-success rounded-lg">
                  <span className="text-success-foreground font-medium text-lg">
                    Total
                  </span>
                  <span className="text-3xl font-bold text-success-foreground">
                    R$ {calculateTotal()}
                  </span>
                </div>
              </div>

              {Number(weight) > 0 && Number(weight) < 0.1 && (
                <div className="flex items-start gap-2 p-4 bg-warning/10 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-warning">
                    Peso muito baixo. Verifique a balança.
                  </p>
                </div>
              )}

              <Button
                onClick={handleCreateOrder}
                disabled={!weight || Number(weight) <= 0 || (!selectedCustomer && !customerName.trim()) || loading || printing}
                size="lg"
                className="w-full"
              >
                {loading ? "Criando..." : printing ? "Imprimindo..." : "Criar Comanda"}
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Weighing;
