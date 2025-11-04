/**
 * Componente para Criar e Enviar Promoções em Massa
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { bulkMessagingService, PromotionCampaign } from "@/utils/bulkMessaging";
import { 
  Send, 
  Calendar, 
  Users, 
  Target,
  MessageSquare,
  AlertCircle,
  Eye,
  Search,
  Check,
  X
} from "lucide-react";

interface TargetCriteria {
  tiers?: string[];
  minPoints?: number;
  maxPoints?: number;
  minTotalSpent?: number;
  maxTotalSpent?: number;
  lastOrderDays?: number;
  hasWhatsApp?: boolean;
  isActive?: boolean;
  specificCustomers?: string[];
}

const PromotionCreator = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; total: number; failed: number } | null>(null);
  const [estimatedRecipients, setEstimatedRecipients] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; whatsapp_number?: string; is_active: boolean }>>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);

  // Dados da promoção
  const [promotionData, setPromotionData] = useState({
    title: "",
    description: "",
    messageContent: "",
    promotionType: "announcement" as "discount" | "points" | "event" | "announcement" | "custom",
    discountPercentage: "",
    discountAmount: "",
    pointsBonus: "",
    validUntil: "",
  });

  // Critérios de seleção
  const [criteria, setCriteria] = useState<TargetCriteria>({
    tiers: [],
    minPoints: undefined,
    maxPoints: undefined,
    minTotalSpent: undefined,
    maxTotalSpent: undefined,
    lastOrderDays: undefined,
    hasWhatsApp: true,
    isActive: true,
  });

  // Carregar clientes
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      // Tentar buscar com whatsapp_number primeiro
      let { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email, whatsapp_number, is_active')
        .order('name');

      // Se der erro (migração não aplicada), tentar apenas com campos básicos
      if (error && error.message?.includes("Could not find the")) {
        console.log('Tentando carregar apenas campos básicos');
        const basicQuery = await supabase
          .from('customers')
          .select('id, name, phone, email')
          .order('name');
        
        if (basicQuery.error) {
          throw basicQuery.error;
        }
        
        data = basicQuery.data;
        error = basicQuery.error;
      } else if (error) {
        console.error('Erro detalhado ao carregar clientes:', error);
        throw error;
      }

      // Mapear os clientes para o formato esperado
      // Se whatsapp_number não existe, usar phone como fallback
      const mappedCustomers = (data || []).map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        whatsapp_number: customer.whatsapp_number || customer.phone || null,
        is_active: customer.is_active !== undefined ? customer.is_active : true,
      }));

      // Filtrar apenas clientes com telefone/WhatsApp
      const filteredCustomers = mappedCustomers.filter((customer: any) => {
        const hasContact = customer.whatsapp_number !== null && 
                          customer.whatsapp_number !== undefined && 
                          String(customer.whatsapp_number).trim() !== '';
        
        return hasContact;
      });

      setCustomers(filteredCustomers);
      
      if (filteredCustomers.length === 0 && (data || []).length > 0) {
        toast({
          title: "Nenhum cliente com contato",
          description: "Nenhum cliente encontrado com número de telefone/WhatsApp cadastrado",
          variant: "default",
        });
      } else if (filteredCustomers.length === 0) {
        toast({
          title: "Nenhum cliente cadastrado",
          description: "Cadastre clientes com telefone/WhatsApp para poder enviar promoções",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
      
      let errorMessage = "Não foi possível carregar a lista de clientes";
      
      if (error?.message) {
        if (error.message.includes('column') || error.message.includes('does not exist')) {
          errorMessage = "Alguns campos não existem na tabela. Verifique se a migração foi aplicada.";
        } else if (error.message.includes('permission') || error.message.includes('RLS') || error.message.includes('row-level')) {
          errorMessage = "Você não tem permissão para visualizar clientes. Verifique as políticas RLS no Supabase.";
        } else if (error.message.includes('relation') || error.message.includes('does not exist')) {
          errorMessage = "A tabela 'customers' não existe. Verifique se as migrações foram aplicadas.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Erro ao carregar clientes",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Estimar número de destinatários
  const estimateRecipients = async () => {
    try {
      // Se há clientes específicos selecionados, usar apenas eles
      if (criteria.specificCustomers && criteria.specificCustomers.length > 0) {
        setEstimatedRecipients(criteria.specificCustomers.length);
        return;
      }

      const recipientIds = await bulkMessagingService.selectRecipients(criteria);
      setEstimatedRecipients(recipientIds.length);
    } catch (error) {
      console.error('Erro ao estimar destinatários:', error);
    }
  };

  useEffect(() => {
    estimateRecipients();
  }, [criteria]);

  const handleCreatePromotion = async () => {
    if (!promotionData.title.trim() || !promotionData.messageContent.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e mensagem são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (!estimatedRecipients || estimatedRecipients === 0) {
      toast({
        title: "Nenhum destinatário",
        description: "Nenhum cliente encontrado com os critérios especificados",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Buscar sessão
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      // Criar promoção
      const { data: promotion, error: promotionError } = await supabase
        .from('promotions')
        .insert({
          title: promotionData.title,
          description: promotionData.description,
          message_content: promotionData.messageContent,
          promotion_type: promotionData.promotionType,
          discount_percentage: promotionData.discountPercentage ? parseFloat(promotionData.discountPercentage) : null,
          discount_amount: promotionData.discountAmount ? parseFloat(promotionData.discountAmount) : null,
          points_bonus: promotionData.pointsBonus ? parseFloat(promotionData.pointsBonus) : null,
          valid_until: promotionData.validUntil || null,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (promotionError || !promotion) {
        throw promotionError || new Error('Erro ao criar promoção');
      }

      // Criar campanha
      const campaignResult = await bulkMessagingService.createCampaign(
        promotion.id,
        `${promotionData.title} - ${new Date().toLocaleDateString('pt-BR')}`,
        criteria
      );

      if (!campaignResult.success || !campaignResult.campaignId) {
        throw new Error(campaignResult.error || 'Erro ao criar campanha');
      }

      toast({
        title: "Promoção criada!",
        description: `Campanha criada com ${estimatedRecipients} destinatários`,
      });

      // Limpar formulário
      setPromotionData({
        title: "",
        description: "",
        messageContent: "",
        promotionType: "announcement",
        discountPercentage: "",
        discountAmount: "",
        pointsBonus: "",
        validUntil: "",
      });
      setCriteria({
        tiers: [],
        minPoints: undefined,
        maxPoints: undefined,
        minTotalSpent: undefined,
        maxTotalSpent: undefined,
        lastOrderDays: undefined,
        hasWhatsApp: true,
        isActive: true,
      });
      setEstimatedRecipients(null);

    } catch (error: any) {
      console.error('Erro ao criar promoção:', error);
      toast({
        title: "Erro ao criar promoção",
        description: error.message || "Não foi possível criar a promoção",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendImmediately = async () => {
    if (!promotionData.messageContent.trim()) {
      toast({
        title: "Mensagem obrigatória",
        description: "A mensagem é obrigatória para envio",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    setProgress({ sent: 0, total: estimatedRecipients || 0, failed: 0 });

    try {
      // Criar promoção e campanha primeiro
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const { data: promotion, error: promotionError } = await supabase
        .from('promotions')
        .insert({
          title: promotionData.title,
          description: promotionData.description,
          message_content: promotionData.messageContent,
          promotion_type: promotionData.promotionType,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (promotionError || !promotion) {
        throw promotionError || new Error('Erro ao criar promoção');
      }

      const campaignResult = await bulkMessagingService.createCampaign(
        promotion.id,
        `${promotionData.title} - ${new Date().toLocaleDateString('pt-BR')}`,
        criteria
      );

      if (!campaignResult.success || !campaignResult.campaignId) {
        throw new Error(campaignResult.error || 'Erro ao criar campanha');
      }

      // Enviar campanha
      const sendResult = await bulkMessagingService.sendCampaign(
        campaignResult.campaignId,
        promotionData.messageContent,
        (progress) => {
          setProgress(progress);
        }
      );

      if (sendResult.success) {
        toast({
          title: "Campanha enviada!",
          description: `${sendResult.totalSent} mensagens enviadas com sucesso`,
        });
      } else {
        toast({
          title: "Erro ao enviar",
          description: `Falha ao enviar ${sendResult.totalFailed} mensagens`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Erro ao enviar campanha:', error);
      toast({
        title: "Erro ao enviar campanha",
        description: error.message || "Não foi possível enviar a campanha",
        variant: "destructive",
      });
    } finally {
      setSending(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Informações da Promoção */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Informações da Promoção
          </CardTitle>
          <CardDescription>
            Defina os detalhes da promoção que será enviada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Promoção *</Label>
              <Input
                id="title"
                value={promotionData.title}
                onChange={(e) => setPromotionData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Promoção de Verão"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Promoção</Label>
              <Select
                value={promotionData.promotionType}
                onValueChange={(value: any) => setPromotionData(prev => ({ ...prev, promotionType: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">Desconto</SelectItem>
                  <SelectItem value="points">Bônus de Pontos</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                  <SelectItem value="announcement">Anúncio</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={promotionData.description}
              onChange={(e) => setPromotionData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição da promoção (opcional)"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem para WhatsApp *</Label>
            <Textarea
              id="message"
              value={promotionData.messageContent}
              onChange={(e) => setPromotionData(prev => ({ ...prev, messageContent: e.target.value }))}
              placeholder="Digite a mensagem que será enviada para os clientes..."
              rows={6}
            />
            <p className="text-xs text-muted-foreground">
              Use *texto* para negrito e _texto_ para itálico no WhatsApp
            </p>
          </div>

          {promotionData.promotionType === 'discount' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountPercentage">Desconto (%)</Label>
                <Input
                  id="discountPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={promotionData.discountPercentage}
                  onChange={(e) => setPromotionData(prev => ({ ...prev, discountPercentage: e.target.value }))}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountAmount">Desconto (R$)</Label>
                <Input
                  id="discountAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={promotionData.discountAmount}
                  onChange={(e) => setPromotionData(prev => ({ ...prev, discountAmount: e.target.value }))}
                  placeholder="5.00"
                />
              </div>
            </div>
          )}

          {promotionData.promotionType === 'points' && (
            <div className="space-y-2">
              <Label htmlFor="pointsBonus">Bônus de Pontos</Label>
              <Input
                id="pointsBonus"
                type="number"
                min="0"
                value={promotionData.pointsBonus}
                onChange={(e) => setPromotionData(prev => ({ ...prev, pointsBonus: e.target.value }))}
                placeholder="100"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="validUntil">Válido até</Label>
            <Input
              id="validUntil"
              type="datetime-local"
              value={promotionData.validUntil}
              onChange={(e) => setPromotionData(prev => ({ ...prev, validUntil: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Seleção de Público */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Seleção de Público
          </CardTitle>
          <CardDescription>
            Defina os critérios para selecionar os clientes que receberão a promoção
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tiers</Label>
              <div className="flex flex-wrap gap-2">
                {['bronze', 'silver', 'gold', 'platinum'].map((tier) => (
                  <div key={tier} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tier-${tier}`}
                      checked={criteria.tiers?.includes(tier)}
                      onCheckedChange={(checked) => {
                        setCriteria(prev => ({
                          ...prev,
                          tiers: checked
                            ? [...(prev.tiers || []), tier]
                            : prev.tiers?.filter(t => t !== tier) || []
                        }));
                      }}
                    />
                    <Label htmlFor={`tier-${tier}`} className="font-normal capitalize">
                      {tier}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pontos</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Mínimo"
                  value={criteria.minPoints || ''}
                  onChange={(e) => setCriteria(prev => ({
                    ...prev,
                    minPoints: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                />
                <Input
                  type="number"
                  placeholder="Máximo"
                  value={criteria.maxPoints || ''}
                  onChange={(e) => setCriteria(prev => ({
                    ...prev,
                    maxPoints: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Total Gasto (R$)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Mínimo"
                  value={criteria.minTotalSpent || ''}
                  onChange={(e) => setCriteria(prev => ({
                    ...prev,
                    minTotalSpent: e.target.value ? parseFloat(e.target.value) : undefined
                  }))}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Máximo"
                  value={criteria.maxTotalSpent || ''}
                  onChange={(e) => setCriteria(prev => ({
                    ...prev,
                    maxTotalSpent: e.target.value ? parseFloat(e.target.value) : undefined
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Última Compra (dias)</Label>
              <Input
                type="number"
                placeholder="Ex: 30 (últimos 30 dias)"
                value={criteria.lastOrderDays || ''}
                onChange={(e) => setCriteria(prev => ({
                  ...prev,
                  lastOrderDays: e.target.value ? parseInt(e.target.value) : undefined
                }))}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasWhatsApp"
              checked={criteria.hasWhatsApp}
              onCheckedChange={(checked) => setCriteria(prev => ({ ...prev, hasWhatsApp: checked as boolean }))}
            />
            <Label htmlFor="hasWhatsApp" className="font-normal">
              Apenas clientes com WhatsApp verificado
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={criteria.isActive}
              onCheckedChange={(checked) => setCriteria(prev => ({ ...prev, isActive: checked as boolean }))}
            />
            <Label htmlFor="isActive" className="font-normal">
              Apenas clientes ativos
            </Label>
          </div>

          {/* Seleção de Clientes Específicos */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Selecionar Clientes Específicos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCustomerSelector(true)}
              >
                <Search className="h-4 w-4 mr-2" />
                Selecionar Clientes
              </Button>
            </div>

            {criteria.specificCustomers && criteria.specificCustomers.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {criteria.specificCustomers.length} cliente(s) selecionado(s)
                </p>
                <div className="flex flex-wrap gap-2">
                  {criteria.specificCustomers.map((customerId) => {
                    const customer = customers.find(c => c.id === customerId);
                    if (!customer) return null;
                    return (
                      <Badge key={customerId} variant="secondary" className="flex items-center gap-1">
                        {customer.name}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => {
                            setCriteria(prev => ({
                              ...prev,
                              specificCustomers: prev.specificCustomers?.filter(id => id !== customerId)
                            }));
                          }}
                        />
                      </Badge>
                    );
                  })}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCriteria(prev => ({ ...prev, specificCustomers: [] }));
                  }}
                >
                  Limpar Seleção
                </Button>
              </div>
            )}
          </div>

          {/* Estimativa de destinatários */}
          {estimatedRecipients !== null && (
            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Destinatários estimados</p>
                  <p className="text-2xl font-bold text-primary">{estimatedRecipients}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progresso de Envio */}
      {sending && progress && (
        <Card>
          <CardHeader>
            <CardTitle>Enviando Campanha...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Enviadas: {progress.sent}</span>
                <span>Total: {progress.total}</span>
                <span className="text-red-600">Falhas: {progress.failed}</span>
              </div>
              <Progress value={(progress.sent / progress.total) * 100} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => setShowPreview(true)}
          disabled={!promotionData.messageContent.trim()}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button
          onClick={handleCreatePromotion}
          disabled={loading || !promotionData.messageContent.trim()}
        >
          {loading ? "Criando..." : "Criar Promoção"}
        </Button>
        <Button
          onClick={handleSendImmediately}
          disabled={sending || loading || !promotionData.messageContent.trim() || !estimatedRecipients}
        >
          <Send className="h-4 w-4 mr-2" />
          {sending ? "Enviando..." : "Enviar Agora"}
        </Button>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preview da Mensagem</DialogTitle>
            <DialogDescription>
              Como a mensagem aparecerá no WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="whitespace-pre-wrap text-sm">
                {promotionData.messageContent || "Nenhuma mensagem definida"}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Seleção de Clientes */}
      <Dialog open={showCustomerSelector} onOpenChange={setShowCustomerSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Selecionar Clientes</DialogTitle>
            <DialogDescription>
              Selecione os clientes que receberão a promoção
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Lista de Clientes */}
            <div className="max-h-[400px] overflow-y-auto space-y-2 border rounded-lg p-2">
              {loadingCustomers ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando clientes...</p>
                </div>
              ) : (
                customers
                  .filter(customer =>
                    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                    customer.whatsapp_number?.includes(customerSearchTerm)
                  )
                  .map((customer) => {
                    const isSelected = criteria.specificCustomers?.includes(customer.id);
                    return (
                      <div
                        key={customer.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-accent'
                        }`}
                        onClick={() => {
                          setCriteria(prev => {
                            const current = prev.specificCustomers || [];
                            if (isSelected) {
                              return {
                                ...prev,
                                specificCustomers: current.filter(id => id !== customer.id)
                              };
                            } else {
                              return {
                                ...prev,
                                specificCustomers: [...current, customer.id]
                              };
                            }
                          });
                        }}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{customer.name}</p>
                          {customer.whatsapp_number && (
                            <p className="text-sm text-muted-foreground">
                              {customer.whatsapp_number}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    );
                  })
              )}

              {!loadingCustomers && customers.filter(customer =>
                customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                customer.whatsapp_number?.includes(customerSearchTerm)
              ).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum cliente encontrado</p>
                </div>
              )}
            </div>

            {/* Resumo */}
            {criteria.specificCustomers && criteria.specificCustomers.length > 0 && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium">
                  {criteria.specificCustomers.length} cliente(s) selecionado(s)
                </p>
              </div>
            )}

            {/* Ações */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCustomerSearchTerm("");
                  setShowCustomerSelector(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setCustomerSearchTerm("");
                  setShowCustomerSelector(false);
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromotionCreator;

