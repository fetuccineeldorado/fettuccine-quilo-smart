/**
 * Página de Gerenciamento de Promoções em Massa
 */

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Megaphone, 
  Send, 
  Calendar, 
  Users, 
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Plus
} from "lucide-react";
import PromotionCreator from "@/components/PromotionCreator";
import CampaignList from "@/components/CampaignList";
import CampaignStats from "@/components/CampaignStats";

const Promotions = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'campaigns' | 'stats'>('create');

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-4xl font-bold mb-2 flex items-center gap-2">
              <Megaphone className="h-8 w-8" />
              Promoções em Massa
            </h1>
            <p className="text-muted-foreground text-base lg:text-lg">
              Crie e envie promoções para seus clientes via WhatsApp
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Criar Promoção
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Estatísticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <PromotionCreator />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-6">
            <CampaignList />
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <CampaignStats />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Promotions;

