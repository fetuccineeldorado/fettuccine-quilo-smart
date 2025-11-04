/**
 * Componente para Listar e Gerenciar Campanhas
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { bulkMessagingService, PromotionCampaign } from "@/utils/bulkMessaging";
import { 
  Send, 
  Calendar, 
  Users, 
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Play,
  X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const CampaignList = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<PromotionCampaign | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promotion_campaigns')
        .select(`
          *,
          promotion:promotions(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCampaigns((data || []) as any);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      toast({
        title: "Erro ao carregar campanhas",
        description: "Não foi possível carregar a lista de campanhas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async (campaign: PromotionCampaign) => {
    if (!confirm(`Enviar campanha "${campaign.campaign_name}" agora?`)) {
      return;
    }

    try {
      // Buscar mensagem da promoção
      const { data: promotion, error: promotionError } = await supabase
        .from('promotions')
        .select('message_content')
        .eq('id', campaign.promotion_id)
        .single();

      if (promotionError || !promotion) {
        throw new Error('Promoção não encontrada');
      }

      const result = await bulkMessagingService.sendCampaign(
        campaign.id,
        promotion.message_content,
        (progress) => {
          // Atualizar progresso em tempo real
          console.log('Progresso:', progress);
        }
      );

      if (result.success) {
        toast({
          title: "Campanha enviada!",
          description: `${result.totalSent} mensagens enviadas com sucesso`,
        });
        loadCampaigns();
      } else {
        toast({
          title: "Erro ao enviar",
          description: `Falha ao enviar ${result.totalFailed} mensagens`,
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
    }
  };

  const handleCancelCampaign = async (campaignId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta campanha?')) {
      return;
    }

    try {
      const result = await bulkMessagingService.cancelCampaign(campaignId);
      if (result.success) {
        toast({
          title: "Campanha cancelada",
          description: "Campanha cancelada com sucesso",
        });
        loadCampaigns();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao cancelar",
        description: error.message || "Não foi possível cancelar a campanha",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      draft: { label: "Rascunho", variant: "outline", icon: Clock },
      scheduled: { label: "Agendada", variant: "default", icon: Calendar },
      sending: { label: "Enviando", variant: "default", icon: Send },
      completed: { label: "Concluída", variant: "default", icon: CheckCircle },
      cancelled: { label: "Cancelada", variant: "secondary", icon: XCircle },
      failed: { label: "Falhou", variant: "destructive", icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Carregando campanhas...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Send className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold mb-2">Nenhuma campanha encontrada</p>
            <p className="text-sm text-muted-foreground">
              Crie uma nova campanha na aba "Criar Promoção"
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign: any) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{campaign.campaign_name}</CardTitle>
                    {campaign.promotion && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {campaign.promotion.title}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Destinatários</p>
                    <p className="text-lg font-semibold">{campaign.total_recipients}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Enviadas</p>
                    <p className="text-lg font-semibold text-green-600">{campaign.sent_count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Entregues</p>
                    <p className="text-lg font-semibold text-blue-600">{campaign.delivered_count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Falhas</p>
                    <p className="text-lg font-semibold text-red-600">{campaign.failed_count}</p>
                  </div>
                </div>

                {campaign.scheduled_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Agendada para: {format(new Date(campaign.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                )}

                {campaign.started_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Play className="h-4 w-4" />
                    <span>Iniciada em: {format(new Date(campaign.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCampaign(campaign);
                      setShowDetails(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Detalhes
                  </Button>
                  {campaign.status === 'draft' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleSendCampaign(campaign)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Enviar
                    </Button>
                  )}
                  {(campaign.status === 'scheduled' || campaign.status === 'draft') && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelCampaign(campaign.id)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Campanha</DialogTitle>
            <DialogDescription>
              Informações completas sobre a campanha
            </DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Nome</p>
                <p className="text-lg">{selectedCampaign.campaign_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                {getStatusBadge(selectedCampaign.status)}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Total de Destinatários</p>
                  <p className="text-2xl font-bold">{selectedCampaign.total_recipients}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Taxa de Sucesso</p>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedCampaign.total_recipients > 0
                      ? ((selectedCampaign.sent_count / selectedCampaign.total_recipients) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Enviadas</p>
                  <p className="text-lg font-semibold">{selectedCampaign.sent_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entregues</p>
                  <p className="text-lg font-semibold">{selectedCampaign.delivered_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lidas</p>
                  <p className="text-lg font-semibold">{selectedCampaign.read_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Falhas</p>
                  <p className="text-lg font-semibold text-red-600">{selectedCampaign.failed_count}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignList;

