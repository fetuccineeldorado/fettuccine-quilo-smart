import { useState, useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import ExtraItemsSelector from "@/components/ExtraItemsSelector";
import CustomerSearch from "@/components/CustomerSearch";
import { ThermalPrinter, OrderData } from "@/utils/thermalPrinter";
import { AlertCircle, Utensils, Printer, Users } from "lucide-react";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useDebounce } from "@/hooks/useDebounce";
import { weightSchema, priceSchema, rateLimiter } from "@/utils/validation";

import { reduceProductStock, ensureProductExists } from "@/utils/inventoryUtils";
import { getCachedSettings, clearSettingsCache } from "@/utils/settingsCache";
import { autoFixPricePerKg, ensureSystemSettings } from "@/utils/autoFix";


const Weighing = memo(() => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [weight, setWeight] = useState<string>("");
  const [pricePerKg, setPricePerKg] = useState<number>(59.90);
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
  const [addToExistingOrder, setAddToExistingOrder] = useState(false);
  const [openOrders, setOpenOrders] = useState<Array<{
    id: string;
    order_number: number;
    customer_name: string;
    total_amount: number;
    total_weight: number;
  }>>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");

  const fetchSettings = useCallback(async () => {
    try {
      // Usar valor padrão imediatamente para não bloquear a UI
      setPricePerKg(59.90);
      
      // Verificar sessão primeiro antes de fazer qualquer chamada
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        console.warn('⚠️ Sem sessão ativa, usando valor padrão');
        return;
      }
      
      // Primeiro, garantir que as configurações existam e o preço esteja correto
      // Mas não bloquear se der erro
      try {
        console.log('🔄 Verificando e corrigindo preço por kg...');
        await ensureSystemSettings();
        const fixResult = await autoFixPricePerKg();
        
        if (fixResult.success) {
          console.log('✅', fixResult.message);
        } else {
          console.warn('⚠️', fixResult.message);
        }
      } catch (fixError) {
        console.warn('⚠️ Erro ao auto-corrigir preço (não crítico):', fixError);
        // Continuar mesmo com erro
      }
      
      // Limpar cache antes de buscar
      clearSettingsCache();
      
      // Buscar do banco com cache limpo
      const { data, error } = await supabase
        .from("system_settings")
        .select("price_per_kg")
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao carregar preço por kg:', error);
        // Se erro, já está usando valor padrão 59.90
        // Não mostrar toast para não incomodar o usuário
        return;
      }
      
      if (data && data.price_per_kg) {
        const price = Number(data.price_per_kg);
        // Garantir que o preço seja 59.90
        if (price !== 59.90) {
          console.warn(`⚠️ Preço incorreto no banco (R$ ${price.toFixed(2)}). Forçando R$ 59,90.`);
          setPricePerKg(59.90);
          // Tentar corrigir em background (não bloquear)
          autoFixPricePerKg().catch(err => console.warn('Erro ao corrigir preço:', err));
        } else {
          setPricePerKg(price);
        }
      } else {
        // Se não houver dados, já está usando valor padrão 59.90
        console.warn('⚠️ Configurações não encontradas. Usando valor padrão R$ 59,90.');
      }
    } catch (err) {
      console.error('Erro geral ao carregar configurações:', err);
      // Em caso de erro, já está usando valor padrão 59.90
      // Não mostrar toast para não incomodar o usuário
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchOpenOrders();
  }, [fetchSettings]);

  const fetchOpenOrders = async () => {
    try {
      console.log('🔄 Buscando comandas abertas...');
      
      // Primeiro, tentar buscar todas as comandas para debug
      const { data: allData, error: allError } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, total_amount, total_weight, status")
        .order("order_number", { ascending: false })
        .limit(10);

      if (allError) {
        console.error('❌ Erro ao buscar todas as comandas:', allError);
        toast({
          title: "Erro ao carregar comandas",
          description: allError.message,
          variant: "destructive",
        });
        return;
      }

      console.log('📊 Total de comandas encontradas:', allData?.length || 0);
      if (allData && allData.length > 0) {
        console.log('📋 Status das comandas:', allData.map(o => ({ num: o.order_number, status: o.status })));
      }

      // Buscar comandas abertas - usar .eq() para status "open" primeiro (igual Cashier faz)
      const { data: openData, error: openError } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, total_amount, total_weight, status")
        .eq("status", "open")
        .order("order_number", { ascending: false });

      if (openError) {
        console.error('❌ Erro ao carregar comandas abertas (open):', openError);
      } else {
        console.log('✅ Comandas com status "open" encontradas:', openData?.length || 0);
      }

      // Buscar comandas pending separadamente (pode não existir se migração não foi aplicada)
      let pendingData: typeof openData = [];
      try {
        const { data: pending, error: pendingError } = await supabase
          .from("orders")
          .select("id, order_number, customer_name, total_amount, total_weight, status")
          .eq("status", "pending" as any)
          .order("order_number", { ascending: false });
        
        if (!pendingError && pending) {
          pendingData = pending;
          console.log('✅ Comandas com status "pending" encontradas:', pending.length);
        } else if (pendingError && pendingError.code !== '22P02') {
          // Ignorar apenas erro de enum inválido (22P02), outros erros são logados
          console.log('⚠️ Erro ao buscar comandas "pending":', pendingError.message);
        }
      } catch (pendingErr: any) {
        // Se "pending" não existe no enum, ignorar o erro e continuar apenas com "open"
        if (pendingErr?.code === '22P02' || pendingErr?.message?.includes('invalid input value for enum')) {
          console.log('⚠️ Status "pending" não disponível no banco. Continuando apenas com comandas "open".');
        } else {
          console.log('⚠️ Erro ao buscar comandas "pending":', pendingErr);
        }
      }

      // Combinar resultados
      const allOpenOrders = [
        ...(openData || []),
        ...(pendingData || [])
      ];

      // Remover duplicatas por ID
      const uniqueOrders = Array.from(
        new Map(allOpenOrders.map(order => [order.id, order])).values()
      );

      console.log('✅ Total de comandas abertas (open + pending):', uniqueOrders.length);
      
      if (uniqueOrders.length === 0) {
        console.log('⚠️ Nenhuma comanda aberta encontrada');
      }

      setOpenOrders(uniqueOrders);
      
      if (openError && uniqueOrders.length === 0) {
        toast({
          title: "Erro ao carregar comandas",
          description: "Não foi possível buscar comandas abertas",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('💥 Erro geral ao carregar comandas abertas:', err);
      toast({
        title: "Erro ao carregar comandas",
        description: "Erro desconhecido ao buscar comandas abertas",
        variant: "destructive",
      });
      setOpenOrders([]);
    }
  };

  const handleCustomerSelect = (customer: any | null) => {
    try {
      if (!customer) {
        setSelectedCustomer(null);
        setCustomerName("");
        return;
      }

      // Validar e normalizar os dados do cliente
      if (!customer.id || !customer.name) {
        console.error("Cliente inválido:", customer);
        toast({
          title: "Erro ao selecionar cliente",
          description: "Cliente selecionado não possui dados válidos",
          variant: "destructive",
        });
        return;
      }

      // Normalizar dados do cliente com valores padrão
      const normalizedCustomer = {
        id: customer.id,
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        tier: (customer.tier || 'bronze') as 'bronze' | 'silver' | 'gold' | 'platinum',
        total_orders: customer.total_orders || 0,
        total_spent: customer.total_spent || 0,
      };

      setSelectedCustomer(normalizedCustomer);
      setCustomerName(normalizedCustomer.name);
    } catch (error: any) {
      console.error("Erro ao selecionar cliente:", error);
      toast({
        title: "Erro ao selecionar cliente",
        description: error.message || "Ocorreu um erro ao selecionar o cliente",
        variant: "destructive",
      });
      setSelectedCustomer(null);
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

  // Função auxiliar para validar e preparar dados dos itens extras
  const prepareExtraItemsData = (orderId: string) => {
    if (!orderId || typeof orderId !== 'string' || orderId.length === 0) {
      throw new Error("ID da comanda inválido");
    }

    if (selectedExtraItems.length === 0) {
      return [];
    }

    const extraItemsData: any[] = [];
    
    for (const item of selectedExtraItems) {
      // Validações
      if (!item.id || typeof item.id !== 'string' || item.id.length === 0) {
        throw new Error(`Item extra "${item.name || 'Desconhecido'}" não possui ID válido`);
      }
      
      if (!item.quantity || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        throw new Error(`Quantidade inválida para item "${item.name || 'Desconhecido'}": ${item.quantity}`);
      }
      
      if (!item.price || item.price <= 0 || isNaN(item.price)) {
        throw new Error(`Preço inválido para item "${item.name || 'Desconhecido'}": ${item.price}`);
      }
      
      const totalPrice = item.price * item.quantity;
      if (isNaN(totalPrice) || totalPrice <= 0) {
        throw new Error(`Total inválido para item "${item.name || 'Desconhecido'}": ${totalPrice}`);
      }
      
      // Preparar dados validados
      extraItemsData.push({
        order_id: orderId,
        extra_item_id: item.id,
        quantity: Number(item.quantity), // Garantir que é número inteiro
        unit_price: Number(item.price.toFixed(2)), // Arredondar para 2 decimais
        total_price: Number(totalPrice.toFixed(2)), // Arredondar para 2 decimais
      });
    }

    return extraItemsData;
  };

  // Função auxiliar para inserir itens extras
  const insertExtraItems = async (orderId: string) => {
    if (selectedExtraItems.length === 0) {
      return;
    }

    try {
      console.log('📦 Preparando para inserir itens extras:', selectedExtraItems);
      
      const extraItemsData = prepareExtraItemsData(orderId);
      
      console.log('📦 Dados preparados e validados para inserção:', extraItemsData);
      
      // Type assertion necessário pois order_extra_items não está nos tipos gerados
      const { error: insertExtraError } = await (supabase.from("order_extra_items" as any).insert(extraItemsData) as any);
      
      if (insertExtraError) {
        console.error('❌ Erro ao inserir itens extras:', insertExtraError);
        console.error('Dados que tentaram ser inseridos:', extraItemsData);
        
        // Mensagem de erro mais específica
        let errorMessage = "Erro ao inserir itens extras";
        if (insertExtraError.message) {
          errorMessage = insertExtraError.message;
        } else if (insertExtraError.code) {
          errorMessage = `Erro ${insertExtraError.code}: ${insertExtraError.message || "Erro desconhecido"}`;
        }
        
        // Tratar erros específicos
        if (insertExtraError.code === "PGRST205" || insertExtraError.message?.includes("Could not find the table") || insertExtraError.message?.includes("order_extra_items")) {
          errorMessage = `🔴 ERRO: A tabela 'order_extra_items' não existe no banco!

📋 SOLUÇÃO RÁPIDA:
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Clique em "SQL Editor" (menu lateral)
4. Abra o arquivo: CORRIGIR_TUDO_SQL_COMPLETO.sql
5. Copie TODO o conteúdo e cole no SQL Editor
6. Clique em "Run" para executar
7. Aguarde a mensagem de sucesso ✅
8. Recarregue esta página (F5)

💡 O arquivo está na raiz do projeto.`;
        } else if (insertExtraError.code === "23503" || insertExtraError.message?.includes("foreign key")) {
          errorMessage = "Um ou mais itens extras não foram encontrados no banco de dados. Por favor, recarregue a página e tente novamente.";
        } else if (insertExtraError.code === "23502" || insertExtraError.message?.includes("null value")) {
          errorMessage = "Dados inválidos ao inserir itens extras. Verifique se todos os campos estão preenchidos corretamente.";
        } else if (insertExtraError.code === "42501" || insertExtraError.message?.includes("permission")) {
          errorMessage = "Você não tem permissão para inserir itens extras. Verifique se está autenticado corretamente.";
        }
        
        throw new Error(errorMessage);
      }
      
      console.log('✅ Itens extras inseridos com sucesso');
      console.log('✅ Estoque será reduzido automaticamente pelo sistema');
    } catch (error: any) {
      console.error('💥 Erro ao inserir itens extras:', error);
      throw error;
    }
  };

  const calculateTotal = () => {
    const weightNum = Number(weight);
    const foodTotal = weightNum * pricePerKg;
    const extraItemsTotal = calculateExtraItemsTotal();
    return (foodTotal + extraItemsTotal).toFixed(2);
  };


  const handleCreateOrder = async () => {
    // Normalizar nome do cliente
    const finalCustomerName = selectedCustomer 
      ? (selectedCustomer.name || '').trim() 
      : (customerName || '').trim();
    
    // Validar nome do cliente (apenas para novas comandas)
    if (!addToExistingOrder && (!finalCustomerName || finalCustomerName.length === 0)) {
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

    // Se for adicionar a comanda existente, validar seleção
    if (addToExistingOrder && !selectedOrderId) {
      toast({
        title: "Comanda não selecionada",
        description: "Por favor, selecione uma comanda para adicionar os itens",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Usar timeout para evitar que operação trave indefinidamente
      let sessionTimeout: NodeJS.Timeout;
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) => {
        sessionTimeout = setTimeout(
          () => reject(new Error("Timeout: Verificação de sessão excedeu 10 segundos")),
          10000
        );
      });

      const { data: { session }, error: sessionError } = await Promise.race([
        sessionPromise.then((result) => {
          clearTimeout(sessionTimeout);
          return result;
        }),
        timeoutPromise,
      ]);

      // Validação crítica: verificar se há sessão ativa
      if (sessionError || !session?.user?.id) {
        console.error('❌ Erro de sessão:', { sessionError, hasSession: !!session, hasUserId: !!session?.user?.id });
        toast({
          title: "Erro de autenticação",
          description: "Sessão inválida. Por favor, faça login novamente.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // Validar que o user.id é um UUID válido
      if (!session.user.id || typeof session.user.id !== 'string' || session.user.id.length === 0) {
        console.error('❌ User ID inválido:', session.user.id);
        toast({
          title: "Erro de autenticação",
          description: "ID do usuário inválido. Por favor, faça login novamente.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      const weightNum = Number(weight);
      
      // Validação de peso: verificar se é um número válido
      if (isNaN(weightNum) || weightNum <= 0) {
        toast({
          title: "Peso inválido",
          description: "Por favor, insira um peso válido maior que zero",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validação adicional: verificar se peso não é negativo (mesmo que já validado acima)
      if (weightNum < 0) {
        toast({
          title: "Peso inválido",
          description: "O peso não pode ser negativo",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validação: verificar se peso não é muito grande (proteção contra erros de digitação)
      if (weightNum > 1000) {
        toast({
          title: "Peso muito alto",
          description: "O peso informado parece estar incorreto. Por favor, verifique.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validação de peso: buscar configurações do sistema com cache e timeout
      let settingsTimeout: NodeJS.Timeout;
      const fetchSettings = async () => {
        return await supabase
          .from("system_settings")
          .select("maximum_weight, minimum_charge, price_per_kg")
          .single();
      };

      const settingsPromise = getCachedSettings(fetchSettings);
      const settingsTimeoutPromise = new Promise<never>((_, reject) => {
        settingsTimeout = setTimeout(
          () => reject(new Error("Timeout: Busca de configurações excedeu 10 segundos")),
          10000
        );
      });

      const result = await Promise.race([
        settingsPromise.then((result) => {
          clearTimeout(settingsTimeout);
          return result;
        }),
        settingsTimeoutPromise,
      ]);
      
      // Verificar se houve erro na busca
      if (result.error) {
        console.error('❌ Erro ao buscar configurações:', result.error);
        // Continuar com valores padrão se houver erro
        // Mas mostrar aviso ao usuário
        toast({
          title: "Aviso",
          description: "Não foi possível carregar as configurações do sistema. Usando valores padrão.",
          variant: "default",
        });
      }
      
      const { data: settings } = result;
      
      // Validação de peso máximo (se configurado)
      if (settings?.maximum_weight && weightNum > Number(settings.maximum_weight)) {
        toast({
          title: "Peso excede o máximo permitido",
          description: `O peso máximo permitido é ${settings.maximum_weight} kg. Peso informado: ${weightNum.toFixed(3)} kg`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Usar preço atualizado do sistema se disponível (definir antes das validações)
      // SEMPRE garantir que seja 59.90
      let finalPricePerKg = settings?.price_per_kg ? Number(settings.price_per_kg) : pricePerKg;
      
      // FORÇAR para 59.90 se não for esse valor
      if (finalPricePerKg !== 59.90) {
        console.warn(`⚠️ Preço incorreto detectado (R$ ${finalPricePerKg.toFixed(2)}). Forçando R$ 59,90.`);
        finalPricePerKg = 59.90;
      }
      
      // Validar que o preço é válido
      if (!finalPricePerKg || isNaN(finalPricePerKg) || finalPricePerKg <= 0) {
        toast({
          title: "Erro de configuração",
          description: "O preço por quilo não está configurado corretamente. Usando valor padrão R$ 59,90.",
          variant: "default",
        });
        finalPricePerKg = 59.90;
      }
      
      // Validação de peso mínimo (verificar se atende cobrança mínima)
      const calculatedFoodTotal = weightNum * finalPricePerKg;
      
      if (settings?.minimum_charge && calculatedFoodTotal < Number(settings.minimum_charge)) {
        const minWeight = Number(settings.minimum_charge) / finalPricePerKg;
        toast({
          title: "Peso abaixo do mínimo",
          description: `O peso mínimo para atender a cobrança mínima de R$ ${settings.minimum_charge} é ${minWeight.toFixed(3)} kg. Peso informado: ${weightNum.toFixed(3)} kg (valor: R$ ${calculatedFoodTotal.toFixed(2)})`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      const foodTotal = weightNum * finalPricePerKg;
      const extraItemsTotal = calculateExtraItemsTotal();
      
      // Validar que os totais são números válidos
      if (isNaN(foodTotal) || isNaN(extraItemsTotal)) {
        toast({
          title: "Erro de cálculo",
          description: "Erro ao calcular os valores da comanda. Verifique os dados informados.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      const total = foodTotal + extraItemsTotal;
      
      // Validar que o total é válido
      if (isNaN(total) || total < 0) {
        toast({
          title: "Erro de cálculo",
          description: "O valor total da comanda é inválido. Verifique os dados informados.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      let order;

      if (addToExistingOrder && selectedOrderId) {
        // Adicionar a comanda existente
        const { data: existingOrder, error: fetchError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", selectedOrderId)
          .single();

        if (fetchError) throw fetchError;
        if (!existingOrder) throw new Error("Comanda não encontrada");

        order = existingOrder;

        // Create order item for food
        const { error: insertItemError } = await supabase.from("order_items").insert({
          order_id: order.id,
          item_type: "food_weight",
          description: `Comida por quilo - ${weightNum}kg`,
          quantity: weightNum,
          unit_price: finalPricePerKg,
          total_price: foodTotal,
        });

        if (insertItemError) throw insertItemError;

        // Update order totals
        const newTotalWeight = order.total_weight + weightNum;
        const newFoodTotal = order.food_total + foodTotal;
        const newExtrasTotal = order.extras_total + extraItemsTotal;
        const newTotalAmount = newFoodTotal + newExtrasTotal;

        const { error: updateError } = await supabase
          .from("orders")
          .update({
            total_weight: newTotalWeight,
            food_total: newFoodTotal,
            extras_total: newExtrasTotal,
            total_amount: newTotalAmount,
          })
          .eq("id", order.id);

        if (updateError) throw updateError;

        // Create order items for extra items and reduce stock
        // Se houver erro (tabela não existe), continuar sem itens extras
        try {
          await insertExtraItems(order.id);
        } catch (extraItemsError: any) {
          console.warn('⚠️ Não foi possível adicionar itens extras:', extraItemsError);
          
          // Se for erro de tabela não encontrada, mostrar aviso mas continuar
          if (extraItemsError.message?.includes('order_extra_items') || 
              extraItemsError.message?.includes('não existe') ||
              extraItemsError.code === 'PGRST205') {
            toast({
              title: "⚠️ Itens adicionados, mas itens extras não foram salvos",
              description: `A tabela 'order_extra_items' não existe. Os itens de comida foram adicionados, mas os itens extras não. Execute o script SQL CORRIGIR_TUDO_SQL_COMPLETO.sql no Supabase para corrigir.`,
              variant: "default",
              duration: 10000,
            });
          } else {
            // Para outros erros, mostrar aviso mas continuar
            toast({
              title: "⚠️ Aviso",
              description: "Itens adicionados, mas houve um problema ao adicionar itens extras. Verifique manualmente.",
              variant: "default",
            });
          }
        }

        toast({
          title: "Itens adicionados!",
          description: `Itens adicionados à Comanda #${order.order_number} - R$ ${total.toFixed(2)}`,
        });

        // Atualizar lista de comandas abertas
        await fetchOpenOrders();
      } else {
        // Create new order
        // Garantir que customer_name não seja null ou vazio
        const orderCustomerName = finalCustomerName && finalCustomerName.trim() ? finalCustomerName.trim() : null;
        
        // Preparar dados da comanda com validação
        const orderData: any = {
          status: "open",
          customer_name: orderCustomerName,
          total_weight: Number(weightNum.toFixed(3)),
          food_total: Number(foodTotal.toFixed(2)),
          extras_total: Number(extraItemsTotal.toFixed(2)),
          total_amount: Number(total.toFixed(2)),
          opened_by: session.user.id,
        };
        
        // Validar dados antes de inserir
        console.log('📝 Dados da comanda a serem inseridos:', orderData);
        
        if (orderData.total_weight < 0 || orderData.food_total < 0 || orderData.extras_total < 0 || orderData.total_amount < 0) {
          throw new Error("Valores negativos não são permitidos na comanda");
        }
        
        const { data: newOrder, error } = await supabase
          .from("orders")
          .insert(orderData)
          .select()
          .single();

        if (error) {
          console.error('❌ Erro ao criar comanda:', error);
          throw error;
        }
        
        if (!newOrder) {
          throw new Error("Comanda criada mas não retornada pelo banco de dados");
        }
        order = newOrder;

        // Create order item for food
        const { error: insertItemError } = await supabase.from("order_items").insert({
          order_id: order.id,
          item_type: "food_weight",
          description: `Comida por quilo - ${weightNum}kg`,
          quantity: weightNum,
          unit_price: finalPricePerKg,
          total_price: foodTotal,
        });

        if (insertItemError) {
          console.error('❌ Erro ao inserir item de comida:', insertItemError);
          throw insertItemError;
        }

        // Create order items for extra items and reduce stock
        // Se houver erro (tabela não existe), continuar sem itens extras
        try {
          await insertExtraItems(order.id);
        } catch (extraItemsError: any) {
          console.warn('⚠️ Não foi possível adicionar itens extras:', extraItemsError);
          
          // Se for erro de tabela não encontrada, mostrar aviso mas continuar
          if (extraItemsError.message?.includes('order_extra_items') || 
              extraItemsError.message?.includes('não existe') ||
              extraItemsError.code === 'PGRST205') {
            toast({
              title: "⚠️ Comanda criada, mas itens extras não foram adicionados",
              description: `A tabela 'order_extra_items' não existe. A comanda foi criada sem itens extras. Execute o script SQL CORRIGIR_TUDO_SQL_COMPLETO.sql no Supabase para corrigir.`,
              variant: "default",
              duration: 10000,
            });
          } else {
            // Para outros erros, mostrar aviso mas continuar
            toast({
              title: "⚠️ Aviso",
              description: "Comanda criada, mas houve um problema ao adicionar itens extras. Verifique manualmente.",
              variant: "default",
            });
          }
        }

        toast({
          title: "Comanda criada!",
          description: `Comanda #${order.order_number} - ${finalCustomerName} - R$ ${total.toFixed(2)}`,
        });

        // Imprimir comanda
        await printOrderReceipt(order, finalCustomerName, weightNum, foodTotal, extraItemsTotal);
      }

      // Reset form
      if (!addToExistingOrder) {
        setCustomerName("");
        setWeight("");
        setSelectedCustomer(null);
      } else {
        // Limpar apenas peso e itens extras, manter seleção da comanda
        setWeight("");
      }
      setSelectedExtraItems([]);
      
      // Navigate to orders or stay for next weighing
      if (!addToExistingOrder) {
        setTimeout(() => {
          navigate("/dashboard/orders");
        }, 1500);
      } else {
        // Se estiver adicionando a uma comanda existente, recarregar as comandas e manter na página
        await fetchOpenOrders();
      }
    } catch (error: unknown) {
      // Tratar erros de timeout especificamente
      if (error instanceof Error && error.message.includes("Timeout")) {
        toast({
          title: "Operação demorou muito",
          description: "A operação excedeu o tempo limite. Por favor, tente novamente ou verifique sua conexão.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Tratar erros de rede especificamente
      if (error instanceof Error && (
        error.message.includes("network") || 
        error.message.includes("fetch") || 
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      )) {
        toast({
          title: "Erro de conexão",
          description: "Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Tratar erros de duplicação (se houver)
      if (error instanceof Error && (
        error.message.includes("duplicate") || 
        error.message.includes("unique") ||
        error.message.includes("violates unique constraint")
      )) {
        toast({
          title: "Erro ao criar comanda",
          description: "Parece que houve um conflito ao criar a comanda. Por favor, tente novamente.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Tratar erros de permissão (RLS)
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as any).code;
        if (errorCode === "42501" || errorCode === "PGRST301" || (error as any).message?.includes("permission denied") || (error as any).message?.includes("policy")) {
          toast({
            title: "Erro de permissão",
            description: "Você não tem permissão para criar comandas. Verifique se está autenticado corretamente.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Tratar erros de validação do banco de dados
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as any).code;
        if (errorCode === "23502" || errorCode === "PGRST116" || (error as any).message?.includes("null value") || (error as any).message?.includes("column")) {
          toast({
            title: "Erro de validação",
            description: "Dados inválidos ao criar comanda. Verifique se todos os campos obrigatórios foram preenchidos.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Tratar erros específicos de itens extras
      if (error instanceof Error && (
        error.message.includes("Item extra") ||
        error.message.includes("Quantidade inválida") ||
        error.message.includes("Preço inválido") ||
        error.message.includes("Total inválido") ||
        error.message.includes("itens extras")
      )) {
        toast({
          title: "Erro ao adicionar itens extras",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Log detalhado do erro para debug
      console.error('💥 Erro detalhado ao processar comanda:', error);
      if (error && typeof error === 'object') {
        console.error('Código do erro:', (error as any).code);
        console.error('Mensagem do erro:', (error as any).message);
        console.error('Detalhes do erro:', (error as any).details);
        console.error('Hint do erro:', (error as any).hint);
      }

      // Mensagem de erro genérico com mais informações
      let errorMessage = "Erro desconhecido";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String((error as any).message);
      }

      toast({
        title: "Erro ao processar comanda",
        description: errorMessage || "Ocorreu um erro inesperado. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const printOrderReceipt = async (order: OrderData, customerName: string, weight: number, foodTotal: number, extraItemsTotal: number) => {
    setPrinting(true);
    try {
      console.log('=== INICIANDO IMPRESSÃO DE COMANDA ===');
      
      // Mapear selectedExtraItems para o formato ExtraItem esperado pelo ThermalPrinter
      const extraItemsForPrint: Array<{ name: string; quantity: number; unit_price: number; total_price: number }> = 
        selectedExtraItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
        }));
      
      // Debug dos dados antes da impressão
      ThermalPrinter.debugPrintData(
        order, 
        customerName, 
        weight, 
        foodTotal, 
        extraItemsForPrint, 
        extraItemsTotal
      );

      // Usar impressão direta com HTML
      const success = await ThermalPrinter.printOrderDirect(order, customerName, weight, foodTotal, extraItemsForPrint, extraItemsTotal);

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
      <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-4 lg:space-y-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 lg:gap-4">
          <div>
            <h1 className="text-2xl lg:text-4xl font-bold mb-1 lg:mb-2">Pesagem</h1>
            <p className="text-muted-foreground text-sm lg:text-lg">
              Sistema de pesagem manual por quilo
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:gap-2">
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
              className="flex items-center gap-2 text-xs lg:text-sm"
            >
              <Printer className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">Detectar USB</span>
              <span className="sm:hidden">USB</span>
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

        {/* Opção para adicionar a comanda existente */}
        <Card className="shadow-strong border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-3 flex-1">
                <Users className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <Label htmlFor="add-to-existing" className="text-base font-medium cursor-pointer">
                    Adicionar a comanda existente (múltiplas pessoas na mesma comanda)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Ative esta opção quando quiser lançar itens em uma comanda já aberta
                  </p>
                </div>
              </div>
              <Switch
                id="add-to-existing"
                checked={addToExistingOrder}
                onCheckedChange={async (checked) => {
                  setAddToExistingOrder(checked);
                  if (!checked) {
                    setSelectedOrderId("");
                  } else {
                    // Recarregar comandas quando ativar
                    await fetchOpenOrders();
                  }
                }}
              />
            </div>
            
            {addToExistingOrder && (
              <div className="mt-4 pt-4 border-t space-y-2">
                <Label htmlFor="select-order">Selecione a Comanda *</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedOrderId}
                      onValueChange={setSelectedOrderId}
                    >
                      <SelectTrigger id="select-order">
                        <SelectValue placeholder={openOrders.length === 0 ? "Nenhuma comanda aberta" : "Selecione uma comanda aberta"} />
                      </SelectTrigger>
                      <SelectContent>
                        {openOrders.length === 0 ? (
                          <SelectItem value="none" disabled>
                            Nenhuma comanda aberta disponível
                          </SelectItem>
                        ) : (
                          openOrders.map((order) => (
                            <SelectItem key={order.id} value={order.id}>
                              Comanda #{order.order_number} - {order.customer_name} - R$ {Number(order.total_amount).toFixed(2)} ({Number(order.total_weight).toFixed(3)} kg)
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          // Buscar novamente
                          const { data: openData } = await supabase
                            .from("orders")
                            .select("id, order_number, customer_name, total_amount, total_weight, status")
                            .eq("status", "open")
                            .order("order_number", { ascending: false });

                          const { data: pendingData } = await supabase
                            .from("orders")
                            .select("id, order_number, customer_name, total_amount, total_weight, status")
                            .eq("status", "pending" as any)
                            .order("order_number", { ascending: false });

                          const allOpenOrders = [
                            ...(openData || []),
                            ...(pendingData || [])
                          ];

                          const uniqueOrders = Array.from(
                            new Map(allOpenOrders.map(order => [order.id, order])).values()
                          );

                          setOpenOrders(uniqueOrders);
                          const count = uniqueOrders.length;
                          
                          toast({
                            title: "Comandas atualizadas",
                            description: count > 0 
                              ? `${count} comanda(s) aberta(s) encontrada(s)`
                              : "Nenhuma comanda aberta encontrada",
                          });
                        } catch (err) {
                          toast({
                            title: "Erro ao atualizar",
                            description: "Não foi possível recarregar as comandas",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="shrink-0"
                    >
                      Atualizar
                    </Button>
                  </div>
                  {openOrders.length === 0 && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        ⚠️ Nenhuma comanda aberta encontrada. Crie uma nova comanda ou verifique se há comandas com status "open" ou "pending".
                      </p>
                    </div>
                  )}
                </div>
                {selectedOrderId && (
                  <div className="mt-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground">
                      <strong>Comanda selecionada:</strong>{" "}
                      {openOrders.find(o => o.id === selectedOrderId) && (
                        <>
                          Comanda #{openOrders.find(o => o.id === selectedOrderId)!.order_number} -{" "}
                          {openOrders.find(o => o.id === selectedOrderId)!.customer_name}
                        </>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Manual Weighing Card */}
          <Card className="shadow-strong">
            <CardHeader className="px-4 lg:px-6 py-3 lg:py-6">
              <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                <Utensils className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                Pesagem Manual
              </CardTitle>
              <CardDescription className="text-xs lg:text-sm">
                Insira o peso da comida manualmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 lg:space-y-6 px-4 lg:px-6">
              <div className="space-y-2">
                <Label htmlFor="manual-weight">Peso (kg) *</Label>
                <Input
                  id="manual-weight"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  value={weight}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Permitir vazio, mas validar se for número
                    if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 1000)) {
                      setWeight(value);
                    }
                  }}
                />
              </div>

              {!addToExistingOrder && (
                <CustomerSearch
                  onCustomerSelect={handleCustomerSelect}
                  selectedCustomer={selectedCustomer as any}
                  placeholder="Buscar cliente cadastrado ou digite nome..."
                  onManualNameChange={(name) => setCustomerName(name)}
                />
              )}
            </CardContent>
          </Card>

          {/* Extra Items Card */}
          <Card className="shadow-strong lg:col-span-1">
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
                {/* Cliente */}
                {customerName && (
                  <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <span className="text-muted-foreground">Cliente</span>
                    <span className="text-lg font-semibold text-primary">
                      {customerName}
                    </span>
                  </div>
                )}
                
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
                disabled={
                  !weight || 
                  Number(weight) <= 0 || 
                  (addToExistingOrder ? !selectedOrderId : (!selectedCustomer && !customerName.trim())) || 
                  loading || 
                  printing
                }
                size="lg"
                className="w-full text-sm lg:text-base"
              >
                {loading 
                  ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
                      {addToExistingOrder ? "Adicionando à comanda..." : "Criando comanda..."}
                    </span>
                  )
                  : printing 
                    ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
                        Imprimindo...
                      </span>
                    )
                    : addToExistingOrder 
                      ? "Adicionar à Comanda" 
                      : "Criar Comanda"}
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
});

Weighing.displayName = 'Weighing';

export default Weighing;
