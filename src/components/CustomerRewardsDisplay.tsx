/**
 * Componente para exibir informações de bonificação e indicação de um cliente
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Gift, 
  Users, 
  TrendingUp, 
  Copy, 
  CheckCircle,
  Clock,
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { rewardsService, CustomerPoints } from "@/utils/rewards";
import { referralService, ReferralStats } from "@/utils/referrals";
import { whatsappService } from "@/utils/whatsapp";
import { supabase } from "@/integrations/supabase/client";

interface CustomerRewardsDisplayProps {
  customerId: string;
  customerName: string;
  customerWhatsapp?: string;
  referralCode?: string;
}

const CustomerRewardsDisplay = ({ 
  customerId, 
  customerName,
  customerWhatsapp,
  referralCode 
}: CustomerRewardsDisplayProps) => {
  const { toast } = useToast();
  const [points, setPoints] = useState<CustomerPoints | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    loadRewardsData();
  }, [customerId]);

  const loadRewardsData = async () => {
    setLoading(true);
    try {
      const [pointsData, statsData] = await Promise.all([
        rewardsService.getCustomerPoints(customerId),
        referralService.getReferralStats(customerId),
      ]);

      setPoints(pointsData);
      setReferralStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar dados de bonificação:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReferralCode = async () => {
    if (!referralCode) return;

    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      toast({
        title: "Código copiado!",
        description: "Código de indicação copiado para a área de transferência",
      });
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código",
        variant: "destructive",
      });
    }
  };

  const handleShareViaWhatsApp = async () => {
    if (!customerWhatsapp || !referralCode) return;

    const message = `Olá! 👋\n\n` +
      `Venha conhecer o Fetuccine! Use meu código de indicação e ganhe pontos na sua primeira compra! 🎁\n\n` +
      `Código: *${referralCode}*\n\n` +
      `Apresente este código no cadastro e você ganha pontos de boas-vindas! 😊`;

    const result = await whatsappService.sendMessage({
      to: customerWhatsapp,
      message,
    });

    if (result.success) {
      toast({
        title: "Mensagem enviada!",
        description: "Link de compartilhamento enviado via WhatsApp",
      });
    } else {
      toast({
        title: "Erro ao enviar",
        description: result.error || "Não foi possível enviar a mensagem",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Carregando informações de bonificação...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pontos do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Sistema de Pontos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Pontos Atuais</p>
              <p className="text-3xl font-bold text-primary">
                {points?.current_points.toLocaleString('pt-BR') || '0'}
              </p>
            </div>
            <div className="text-center p-4 bg-green-100 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Ganhos</p>
              <p className="text-3xl font-bold text-green-700">
                {points?.total_earned.toLocaleString('pt-BR') || '0'}
              </p>
            </div>
            <div className="text-center p-4 bg-blue-100 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Resgatados</p>
              <p className="text-3xl font-bold text-blue-700">
                {points?.total_redeemed.toLocaleString('pt-BR') || '0'}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              💡 {points?.current_points || 0} pontos = R$ {(points?.current_points || 0) / 100}.toFixed(2) em desconto
            </p>
            <p className="text-xs text-muted-foreground">
              Regra: 100 pontos = R$ 1,00 de desconto
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Código de Indicação */}
      {referralCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Código de Indicação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Seu código</p>
                <p className="text-2xl font-mono font-bold">{referralCode}</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyReferralCode}
                title="Copiar código"
              >
                {copiedCode ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>

            {customerWhatsapp && (
              <Button
                variant="default"
                className="w-full"
                onClick={handleShareViaWhatsApp}
              >
                <Users className="h-4 w-4 mr-2" />
                Compartilhar via WhatsApp
              </Button>
            )}

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm">
                💡 <strong>Como funciona:</strong> Compartilhe seu código com amigos. 
                Quando eles se cadastrarem usando seu código e fizerem a primeira compra, 
                vocês ganham pontos!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas de Indicação */}
      {referralStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Estatísticas de Indicação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total de Indicações</p>
                <p className="text-2xl font-bold">
                  {referralStats.totalReferrals}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Completadas</p>
                <p className="text-2xl font-bold text-green-700">
                  {referralStats.completedReferrals}
                </p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {referralStats.pendingReferrals}
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Pontos Ganhos</p>
                <p className="text-2xl font-bold text-purple-700">
                  {referralStats.totalPointsEarned.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Transações Recentes */}
      {points && points.transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico Recente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {points.transactions.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{transaction.description || 'Transação'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge
                    variant={
                      transaction.transaction_type === 'earned' || 
                      transaction.transaction_type === 'bonus' ||
                      transaction.transaction_type === 'referral'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {transaction.transaction_type === 'earned' && '+'}
                    {transaction.transaction_type === 'redeemed' && '-'}
                    {transaction.points} pts
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerRewardsDisplay;

