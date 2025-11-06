import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { FileText, Eye, XCircle, Clock, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Order {
  id: string;
  order_number: number;
  status: string;
  total_weight: number;
  total_amount: number;
  opened_at: string;
  closed_at: string | null;
  table_number: number | null;
}

const Orders = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchOrders = useCallback(async () => {
    console.log('🔄 fetchOrders: Iniciando carregamento de comandas...');
    setLoading(true);
    
    try {
      // Verificar sessão antes de buscar comandas
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ Erro de autenticação:', sessionError);
        toast({
          title: "Erro de autenticação",
          description: "Por favor, faça login novamente.",
          variant: "destructive",
        });
        setOrders([]);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("opened_at", { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar comandas:', error);
        console.error('❌ Detalhes do erro:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Tratamento específico de erros
        let errorMessage = error.message;
        if (error.code === 'PGRST301' || error.message.includes("permission") || error.message.includes("unauthorized")) {
          errorMessage = "Você não tem permissão para visualizar comandas. Verifique sua autenticação.";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        }
        
        toast({
          title: "Erro ao carregar comandas",
          description: errorMessage,
          variant: "destructive",
        });
        setOrders([]);
      } else {
        console.log('✅ fetchOrders: Comandas carregadas:', data?.length || 0);
        console.log('📋 fetchOrders: IDs das comandas:', data?.map(o => o.id) || []);
        setOrders(data || []);
      }
    } catch (err) {
      console.error('💥 Erro geral ao carregar comandas:', err);
      
      // Tratamento específico de erros
      let errorMessage = "Erro desconhecido";
      if (err instanceof Error) {
        if (err.message.includes("network") || err.message.includes("fetch")) {
          errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        } else if (err.message.includes("permission") || err.message.includes("unauthorized")) {
          errorMessage = "Você não tem permissão para visualizar comandas.";
        } else {
          errorMessage = err.message;
        }
      }
      
      toast({
        title: "Erro ao carregar comandas",
        description: errorMessage,
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setLoading(false);
      console.log('✅ fetchOrders: Carregamento finalizado');
    }
  }, [toast]);

  const handleDeleteOrder = useCallback(async (orderId: string, orderNumber: number, status: string) => {
    console.log('🗑️ Iniciando exclusão da comanda:', { orderId, orderNumber, status });
    
    // Diferentes mensagens de confirmação baseadas no status
    let confirmMessage = `Tem certeza que deseja excluir a comanda #${orderNumber}?\n\n`;
    
    if (status === "open") {
      confirmMessage += "⚠️ ATENÇÃO: Esta comanda está ABERTA e pode ter vendas ativas.\n\n";
    } else if (status === "closed") {
      confirmMessage += "⚠️ ATENÇÃO: Esta comanda está FECHADA e pode ter dados de vendas importantes.\n\n";
    } else if (status === "cancelled") {
      confirmMessage += "Esta comanda foi cancelada e pode ser excluída com segurança.\n\n";
    }
    
    confirmMessage += "Esta ação não pode ser desfeita e irá remover todos os dados relacionados à comanda.";
    
    if (!confirm(confirmMessage)) {
      console.log('❌ Usuário cancelou a exclusão');
      return;
    }
    
    console.log('✅ Usuário confirmou a exclusão, iniciando processo...');

    try {
      console.log('🔄 Iniciando exclusão da comanda...');
      
      // ESTRATÉGIA: Tentar deletar tudo, mas não parar se houver erros em itens relacionados
      // O importante é deletar a comanda principal, que pode ter CASCADE que deleta o resto
      
      // Tentar deletar itens relacionados (mas não bloquear se falhar)
      console.log('🔄 Tentando deletar itens relacionados...');
      
      // 1. Deletar itens da comanda (não crítico se falhar)
      try {
        const { error: itemsError } = await supabase
          .from("order_items")
          .delete()
          .eq("order_id", orderId);
        if (itemsError) {
          console.warn('⚠️ Erro ao deletar itens (não crítico):', itemsError.message);
        } else {
          console.log('✅ Itens deletados');
        }
      } catch (e) {
        console.warn('⚠️ Erro ao deletar itens (continuando):', e);
      }

      // 2. Deletar itens extras (não crítico se falhar ou se tabela não existir)
      try {
        const { error: extraItemsError } = await (supabase
          .from("order_extra_items" as any)
          .delete()
          .eq("order_id", orderId) as any);
        if (extraItemsError) {
          if (extraItemsError.code === 'PGRST205') {
            console.warn('⚠️ Tabela order_extra_items não existe (ok)');
          } else {
            console.warn('⚠️ Erro ao deletar itens extras (não crítico):', extraItemsError.message);
          }
        } else {
          console.log('✅ Itens extras deletados');
        }
      } catch (e) {
        console.warn('⚠️ Erro ao deletar itens extras (continuando):', e);
      }

      // 3. Deletar pagamentos (não crítico se falhar)
      try {
        const { error: paymentsError } = await supabase
          .from("payments")
          .delete()
          .eq("order_id", orderId);
        if (paymentsError) {
          console.warn('⚠️ Erro ao deletar pagamentos (não crítico):', paymentsError.message);
        } else {
          console.log('✅ Pagamentos deletados');
        }
      } catch (e) {
        console.warn('⚠️ Erro ao deletar pagamentos (continuando):', e);
      }

      // CRÍTICO: Deletar a comanda principal - isso é o mais importante
      console.log('🔄 Deletando comanda principal...');
      console.log('🔍 ID da comanda:', orderId);
      
      // Primeiro verificar se a comanda existe e se temos permissão
      const { data: checkBefore, error: checkBeforeError } = await supabase
        .from("orders")
        .select("id, order_number, status, opened_by")
        .eq("id", orderId)
        .maybeSingle();
      
      if (checkBeforeError && checkBeforeError.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar comanda antes de deletar:', checkBeforeError);
        throw checkBeforeError;
      }
      
      if (!checkBefore) {
        console.warn('⚠️ Comanda não encontrada (pode já ter sido deletada)');
        toast({
          title: "Comanda não encontrada",
          description: `A comanda #${orderNumber} não foi encontrada no banco de dados.`,
          variant: "default",
        });
        await fetchOrders();
        return;
      }
      
      console.log('🔍 Comanda encontrada:', checkBefore);
      
      // Tentar deletar a comanda
      const { data: deletedOrder, error: orderError, count } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId)
        .select();

      if (orderError) {
        console.error('❌ ERRO CRÍTICO ao deletar comanda:', orderError);
        console.error('❌ Detalhes completos do erro:', JSON.stringify(orderError, null, 2));
        console.error('❌ Código do erro:', orderError.code);
        console.error('❌ Mensagem:', orderError.message);
        console.error('❌ Details:', orderError.details);
        console.error('❌ Hint:', orderError.hint);
        
        // Verificar se é erro de RLS
        const isRLSError = 
          orderError.code === 'PGRST301' || 
          orderError.code === '42501' ||
          orderError.message?.includes('permission denied') ||
          orderError.message?.includes('row-level security') ||
          orderError.message?.toLowerCase().includes('policy');
        
        if (isRLSError) {
          const detailedError = `🔴 ERRO DE PERMISSÃO RLS (Row Level Security)

📋 CÓDIGO DO ERRO: ${orderError.code}
📋 MENSAGEM: ${orderError.message}

📋 SOLUÇÃO DEFINITIVA:
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em "SQL Editor"
4. Execute o script: "fix delete orders ULTRA FORCE.sql"
   (Este script remove TODAS as políticas antigas e cria novas)

⚠️ IMPORTANTE:
- Execute o script ULTRA FORCE (não o script normal)
- Verifique se apareceu a mensagem de sucesso
- Recarregue a página (F5) e limpe o cache (Ctrl+Shift+R)
- Tente novamente

💡 Se ainda não funcionar, verifique:
- Se você está autenticado no sistema
- Se há outras políticas RLS bloqueando
- Execute o script novamente`;
          
          console.error('🔴 ERRO DE RLS DETECTADO:', detailedError);
          throw new Error(detailedError);
        }
        
        // Outros erros
        const genericError = `🔴 ERRO AO EXCLUIR COMANDA

📋 CÓDIGO: ${orderError.code || 'N/A'}
📋 MENSAGEM: ${orderError.message || 'Erro desconhecido'}
${orderError.details ? `📋 DETALHES: ${orderError.details}` : ''}
${orderError.hint ? `💡 DICA: ${orderError.hint}` : ''}

📋 TENTE:
1. Recarregar a página (F5)
2. Limpar cache do navegador (Ctrl+Shift+R)
3. Verificar se está autenticado
4. Executar o script "fix delete orders ULTRA FORCE.sql" no Supabase`;
        
        throw new Error(genericError);
      }
      
      // Verificar se realmente foi deletada
      if (deletedOrder && deletedOrder.length > 0) {
        console.log('✅ Comanda deletada com sucesso!', deletedOrder);
      } else {
        console.warn('⚠️ Delete executado mas nenhum registro deletado. Verificando...');
        
        // Verificar se ainda existe
        const { data: checkAfter, error: verifyError } = await supabase
          .from("orders")
          .select("id")
          .eq("id", orderId)
          .maybeSingle();
        
        if (verifyError && verifyError.code === 'PGRST116') {
          console.log('✅ Comanda confirmada como deletada (não encontrada)');
        } else if (checkAfter) {
          console.error('❌ ERRO CRÍTICO: Comanda ainda existe após tentativa de exclusão!', checkAfter);
          console.error('❌ Isso indica que a política RLS está bloqueando a exclusão.');
          
          throw new Error(`🔴 ERRO: A comanda não foi deletada do banco de dados!\n\n📋 CAUSA: Política RLS (Row Level Security) está bloqueando a exclusão.\n\n📋 SOLUÇÃO:\n1. Acesse: https://supabase.com/dashboard\n2. Selecione seu projeto\n3. Clique em "SQL Editor"\n4. Execute o script: CORRIGIR_TUDO_SQL_COMPLETO.sql\n\nEste script cria a política RLS necessária para permitir que usuários autenticados deletem comandas.`);
        } else {
          console.log('✅ Comanda confirmada como deletada');
        }
      }

      console.log('🎉 Exclusão concluída com sucesso!');
      
      // Mostrar toast de sucesso
      toast({
        title: "✅ Comanda excluída!",
        description: `Comanda #${orderNumber} foi excluída do banco de dados com sucesso.`,
      });

      // Remover comanda do estado local imediatamente
      setOrders(prevOrders => {
        const filtered = prevOrders.filter(order => order.id !== orderId);
        console.log(`✅ Comanda removida do estado. Total: ${prevOrders.length} → ${filtered.length}`);
        return filtered;
      });

      // Recarregar comandas do banco para garantir sincronização
      console.log('🔄 Recarregando comandas do banco...');
      await fetchOrders();
      console.log('✅ Comandas recarregadas');
    } catch (error: unknown) {
      console.error('💥 Erro geral ao excluir comanda:', error);
      
      // Tratamento específico de erros
      let errorMessage = "Erro desconhecido ao excluir a comanda";
      let errorTitle = "Erro ao excluir comanda";
      
      if (error && typeof error === 'object') {
        const supabaseError = error as any;
        
        // Verificar código de erro do Supabase
        if (supabaseError.code === 'PGRST301' || supabaseError.code === '42501') {
          errorTitle = "Erro de Permissão";
          errorMessage = "Você não tem permissão para excluir comandas. Execute o script 'fix-delete-orders.sql' no Supabase SQL Editor para corrigir as políticas RLS.";
        } else if (supabaseError.code === '23503' || supabaseError.message?.includes("foreign key") || supabaseError.message?.includes("violates foreign key")) {
          errorTitle = "Erro de Relacionamento";
          errorMessage = "Não é possível excluir esta comanda pois há dados relacionados que precisam ser removidos primeiro. Tente novamente ou contate o suporte.";
        } else if (supabaseError.code === 'PGRST116') {
          errorTitle = "Comanda Não Encontrada";
          errorMessage = "A comanda não foi encontrada no banco de dados. Ela pode já ter sido excluída.";
        } else if (supabaseError.message) {
          errorMessage = supabaseError.message;
          if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
            errorTitle = "Erro de Conexão";
            errorMessage = "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
          } else if (errorMessage.includes("permission") || errorMessage.includes("unauthorized") || errorMessage.includes("RLS") || errorMessage.includes("policy")) {
            errorTitle = "Erro de Permissão";
            errorMessage = "Você não tem permissão para excluir comandas. Execute o script 'fix-delete-orders.sql' no Supabase SQL Editor.";
          }
        } else if (supabaseError.code) {
          errorMessage = `Erro ${supabaseError.code}: ${supabaseError.hint || 'Erro ao excluir comanda'}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
          errorTitle = "Erro de Conexão";
          errorMessage = "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
        } else if (errorMessage.includes("permission") || errorMessage.includes("unauthorized") || errorMessage.includes("RLS") || errorMessage.includes("policy")) {
          errorTitle = "Erro de Permissão";
          errorMessage = "Você não tem permissão para excluir comandas. Execute o script 'fix-delete-orders.sql' no Supabase SQL Editor.";
        } else if (errorMessage.includes("foreign key") || errorMessage.includes("violates foreign key")) {
          errorTitle = "Erro de Relacionamento";
          errorMessage = "Não é possível excluir esta comanda pois há dados relacionados que precisam ser removidos primeiro.";
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 10000, // 10 segundos para permitir leitura completa
      });
      
      // Recarregar comandas mesmo em caso de erro para garantir estado consistente
      await fetchOrders();
    }
  }, [orders, toast, fetchOrders]);

  useEffect(() => {
    fetchOrders();
    
    // Real-time subscription
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // Monitorar mudanças no estado de comandas
  useEffect(() => {
    console.log('🔄 Estado de comandas atualizado:', orders.length, 'comandas');
    console.log('📋 IDs das comandas atuais:', orders.map(o => ({ id: o.id, number: o.order_number })));
  }, [orders]);

  const handleCancelOrder = async (orderId: string) => {
    // Validação de sessão
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Sessão inválida. Por favor, faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    // Confirmação antes de cancelar
    if (!confirm("Tem certeza que deseja cancelar esta comanda? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      // Verificar se comanda existe e obter dados atuais
      const { data: currentOrder, error: fetchError } = await supabase
        .from("orders")
        .select("id, status, order_number")
        .eq("id", orderId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!currentOrder) {
        toast({
          title: "Comanda não encontrada",
          description: "A comanda não foi encontrada no sistema",
          variant: "destructive",
        });
        return;
      }

      // Verificar se comanda já está cancelada ou fechada
      if (currentOrder.status === "cancelled") {
        toast({
          title: "Comanda já cancelada",
          description: "Esta comanda já foi cancelada anteriormente",
          variant: "destructive",
        });
        return;
      }

      if (currentOrder.status === "closed") {
        if (!confirm("⚠️ ATENÇÃO: Esta comanda está FECHADA e pode ter pagamentos registrados. Deseja realmente cancelá-la?")) {
          return;
        }
      }

      // Atualizar status
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Comanda cancelada!",
        description: `Comanda #${currentOrder.order_number} cancelada com sucesso`,
      });
      fetchOrders();
    } catch (error: unknown) {
      console.error("Erro ao cancelar comanda:", error);
      
      // Tratamento específico de erros
      if (error instanceof Error) {
        if (error.message.includes("network") || error.message.includes("fetch")) {
          toast({
            title: "Erro de conexão",
            description: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
            variant: "destructive",
          });
        } else if (error.message.includes("permission") || error.message.includes("unauthorized")) {
          toast({
            title: "Sem permissão",
            description: "Você não tem permissão para cancelar comandas.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao cancelar comanda",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Erro ao cancelar comanda",
          description: "Erro desconhecido ao cancelar a comanda",
          variant: "destructive",
        });
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "outline" | "destructive" | "secondary"; label: string }> = {
      open: { variant: "default", label: "Aberta" },
      pending: { variant: "secondary", label: "Sendo Editada" },
      closed: { variant: "outline", label: "Fechada" },
      cancelled: { variant: "destructive", label: "Cancelada" },
    };

    const config = variants[status] || variants.open;
    return (
      <Badge variant={config.variant} className="capitalize">
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Carregando comandas...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold mb-2">Comandas</h1>
          <p className="text-muted-foreground text-base lg:text-lg">
            Gestão de todas as comandas do sistema
          </p>
        </div>

        {orders.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg text-muted-foreground">
                Nenhuma comanda encontrada
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                As comandas aparecerão aqui quando forem criadas
              </p>
            </CardContent>
          </Card>
        ) : (
          <div key={refreshKey} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {orders.map((order) => (
              <Card key={order.id} className="shadow-soft hover:shadow-lg transition-smooth">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <span className="text-2xl font-bold">#{order.order_number}</span>
                      {getStatusBadge(order.status)}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/dashboard/order-details/${order.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      {order.status === "open" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/edit-order/${order.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelOrder(order.id)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteOrder(order.id, order.order_number, order.status)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </>
                      )}
                      {order.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Sendo Editada
                        </Button>
                      )}
                      {/* Botão de exclusão para comandas fechadas/canceladas */}
                      {(order.status === "closed" || order.status === "cancelled") && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteOrder(order.id, order.order_number, order.status)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Peso Total</p>
                      <p className="text-lg font-semibold">
                        {Number(order.total_weight).toFixed(3)} kg
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
                      <p className="text-lg font-semibold text-success">
                        R$ {Number(order.total_amount).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Aberta em
                      </p>
                      <p className="text-sm">
                        {format(new Date(order.opened_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {order.closed_at && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Fechada em</p>
                        <p className="text-sm">
                          {format(new Date(order.closed_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    )}
                    {order.table_number && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Mesa</p>
                        <p className="text-lg font-semibold">{order.table_number}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Orders;
