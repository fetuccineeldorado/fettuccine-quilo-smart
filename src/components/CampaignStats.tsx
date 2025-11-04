/**
 * Componente de Estatísticas de Campanhas
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp,
  Send,
  Users,
  CheckCircle,
  XCircle,
  BarChart3
} from "lucide-react";

interface CampaignStats {
  totalCampaigns: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  averageSuccessRate: number;
  campaignsThisMonth: number;
}

const CampaignStats = () => {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data: campaigns, error } = await supabase
        .from('promotion_campaigns')
        .select('*');

      if (error) throw error;

      if (!campaigns || campaigns.length === 0) {
        setStats({
          totalCampaigns: 0,
          totalSent: 0,
          totalDelivered: 0,
          totalRead: 0,
          totalFailed: 0,
          averageSuccessRate: 0,
          campaignsThisMonth: 0,
        });
        return;
      }

      const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
      const totalDelivered = campaigns.reduce((sum, c) => sum + (c.delivered_count || 0), 0);
      const totalRead = campaigns.reduce((sum, c) => sum + (c.read_count || 0), 0);
      const totalFailed = campaigns.reduce((sum, c) => sum + (c.failed_count || 0), 0);

      const completedCampaigns = campaigns.filter(c => c.status === 'completed');
      const averageSuccessRate = completedCampaigns.length > 0
        ? completedCampaigns.reduce((sum, c) => {
            const rate = c.total_recipients > 0
              ? (c.sent_count / c.total_recipients) * 100
              : 0;
            return sum + rate;
          }, 0) / completedCampaigns.length
        : 0;

      // Campanhas deste mês
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const campaignsThisMonth = campaigns.filter(c => 
        new Date(c.created_at) >= thisMonth
      ).length;

      setStats({
        totalCampaigns: campaigns.length,
        totalSent,
        totalDelivered,
        totalRead,
        totalFailed,
        averageSuccessRate,
        campaignsThisMonth,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Carregando estatísticas...</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Total de Campanhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalCampaigns}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.campaignsThisMonth} criadas este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Mensagens Enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.totalSent.toLocaleString('pt-BR')}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.totalDelivered.toLocaleString('pt-BR')} entregues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Taxa de Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {stats.averageSuccessRate.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Média de todas as campanhas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enviadas</p>
                <p className="text-2xl font-bold">{stats.totalSent.toLocaleString('pt-BR')}</p>
              </div>
              <Send className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entregues</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalDelivered.toLocaleString('pt-BR')}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lidas</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalRead.toLocaleString('pt-BR')}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Falhas</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalFailed.toLocaleString('pt-BR')}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Taxa de Conversão */}
      <Card>
        <CardHeader>
          <CardTitle>Taxa de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Taxa de Entrega</span>
                <span>
                  {stats.totalSent > 0
                    ? ((stats.totalDelivered / stats.totalSent) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${stats.totalSent > 0 ? (stats.totalDelivered / stats.totalSent) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Taxa de Leitura</span>
                <span>
                  {stats.totalDelivered > 0
                    ? ((stats.totalRead / stats.totalDelivered) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{
                    width: `${stats.totalDelivered > 0 ? (stats.totalRead / stats.totalDelivered) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignStats;

