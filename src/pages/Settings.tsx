import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import WhatsAppQRCode from "@/components/WhatsAppQRCode";
import { Settings as SettingsIcon, Save, MessageCircle } from "lucide-react";
import { clearSettingsCache } from "@/utils/settingsCache";
import { autoFixPricePerKg, ensureSystemSettings } from "@/utils/autoFix";

const Settings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    pricePerKg: "59.90",
    minimumCharge: "5.00",
    maximumWeight: "2.00",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Primeiro, garantir que as configurações existam (auto-fix)
      const ensureResult = await ensureSystemSettings();
      if (!ensureResult.success && ensureResult.message.includes('Erro')) {
        console.warn('⚠️ Auto-fix não conseguiu criar configurações:', ensureResult.message);
      }

      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar configurações:', error);
        // Tentar auto-recuperar
        const autoFixResult = await ensureSystemSettings();
        if (autoFixResult.success) {
          // Tentar novamente após auto-fix
          const { data: retryData, error: retryError } = await supabase
            .from("system_settings")
            .select("*")
            .limit(1)
            .maybeSingle();
          
          if (retryError || !retryData) {
            toast({
              title: "Erro ao carregar configurações",
              description: error.message,
              variant: "destructive",
            });
            return;
          }
          
          // Usar dados após auto-fix
          const pricePerKg = retryData.price_per_kg ? Number(retryData.price_per_kg) : 59.90;
          const minimumCharge = retryData.minimum_charge ? Number(retryData.minimum_charge) : 5.00;
          const maximumWeight = retryData.maximum_weight ? Number(retryData.maximum_weight) : 2.00;
          
          setSettings({
            pricePerKg: pricePerKg.toFixed(2),
            minimumCharge: minimumCharge.toFixed(2),
            maximumWeight: maximumWeight.toFixed(2),
          });
          return;
        }
        
        toast({
          title: "Erro ao carregar configurações",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Se não houver configurações, criar com valores padrão (auto-fix)
      if (!data) {
        const fixResult = await ensureSystemSettings();
        if (fixResult.success) {
          // Recarregar após criar
          const { data: newData } = await supabase
            .from("system_settings")
            .select("*")
            .limit(1)
            .maybeSingle();
          
          if (newData) {
            setSettings({
              pricePerKg: Number(newData.price_per_kg || 59.90).toFixed(2),
              minimumCharge: Number(newData.minimum_charge || 5.00).toFixed(2),
              maximumWeight: Number(newData.maximum_weight || 2.00).toFixed(2),
            });
          }
        }
        return;
      }

      // Se houver configurações, usar os valores
      // Forçar recálculo do valor para garantir precisão
      const pricePerKg = data.price_per_kg ? Number(data.price_per_kg) : 59.90;
      const minimumCharge = data.minimum_charge ? Number(data.minimum_charge) : 5.00;
      const maximumWeight = data.maximum_weight ? Number(data.maximum_weight) : 2.00;
      
      console.log('📊 Configurações carregadas do banco:', {
        price_per_kg: pricePerKg,
        minimum_charge: minimumCharge,
        maximum_weight: maximumWeight
      });
      
      setSettings({
        pricePerKg: pricePerKg.toFixed(2),
        minimumCharge: minimumCharge.toFixed(2),
        maximumWeight: maximumWeight.toFixed(2),
      });
    } catch (err) {
      console.error('Erro geral ao carregar configurações:', err);
      toast({
        title: "Erro ao carregar configurações",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    // Validação de inputs numéricos
    const pricePerKgNum = Number(settings.pricePerKg);
    const minimumChargeNum = Number(settings.minimumCharge);
    const maximumWeightNum = Number(settings.maximumWeight);

    // Validação de preço por kg
    if (isNaN(pricePerKgNum) || pricePerKgNum < 0) {
      toast({
        title: "Valor inválido",
        description: "Preço por kg deve ser um número válido maior ou igual a zero",
        variant: "destructive",
      });
      return;
    }

    if (pricePerKgNum > 10000) {
      toast({
        title: "Valor muito alto",
        description: "Preço por kg não pode ser maior que R$ 10.000,00",
        variant: "destructive",
      });
      return;
    }

    // Validação de cobrança mínima
    if (isNaN(minimumChargeNum) || minimumChargeNum < 0) {
      toast({
        title: "Valor inválido",
        description: "Cobrança mínima deve ser um número válido maior ou igual a zero",
        variant: "destructive",
      });
      return;
    }

    if (minimumChargeNum > 10000) {
      toast({
        title: "Valor muito alto",
        description: "Cobrança mínima não pode ser maior que R$ 10.000,00",
        variant: "destructive",
      });
      return;
    }

    // Validação de peso máximo
    if (isNaN(maximumWeightNum) || maximumWeightNum < 0) {
      toast({
        title: "Valor inválido",
        description: "Peso máximo deve ser um número válido maior ou igual a zero",
        variant: "destructive",
      });
      return;
    }

    if (maximumWeightNum > 100) {
      toast({
        title: "Valor muito alto",
        description: "Peso máximo não pode ser maior que 100 kg",
        variant: "destructive",
      });
      return;
    }

    // Validação de lógica de negócio: cobrança mínima deve ser menor que peso máximo * preço por kg
    if (maximumWeightNum > 0 && minimumChargeNum > maximumWeightNum * pricePerKgNum) {
      toast({
        title: "Valores inconsistentes",
        description: `Cobrança mínima (R$ ${minimumChargeNum.toFixed(2)}) não pode ser maior que o valor máximo possível (${maximumWeightNum} kg × R$ ${pricePerKgNum.toFixed(2)} = R$ ${(maximumWeightNum * pricePerKgNum).toFixed(2)})`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      // Validação crítica: verificar se há sessão ativa
      if (sessionError || !session?.user?.id) {
        toast({
          title: "Erro de autenticação",
          description: "Sessão inválida. Por favor, faça login novamente.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Primeiro, obter o ID da configuração atual
      const { data: currentSettings, error: fetchError } = await supabase
        .from("system_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      // Se não houver configurações, criar uma nova
      if (!currentSettings) {
        const { data: newSettings, error: createError } = await supabase
          .from("system_settings")
          .insert([{
            price_per_kg: pricePerKgNum,
            minimum_charge: minimumChargeNum,
            maximum_weight: maximumWeightNum,
            updated_by: session.user.id,
          }])
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        toast({
          title: "Configurações salvas!",
          description: "As alterações foram aplicadas com sucesso",
        });

        clearSettingsCache();
        await fetchSettings();
        return;
      }

      // Atualizar as configurações
      console.log('💾 Salvando configurações:', {
        price_per_kg: pricePerKgNum,
        minimum_charge: minimumChargeNum,
        maximum_weight: maximumWeightNum,
        id: currentSettings.id
      });
      
      const { data: updatedData, error } = await supabase
        .from("system_settings")
        .update({
          price_per_kg: pricePerKgNum,
          minimum_charge: minimumChargeNum,
          maximum_weight: maximumWeightNum,
          updated_by: session.user.id,
        })
        .eq("id", currentSettings.id)
        .select();

      if (error) {
        console.error('❌ Erro ao atualizar configurações:', error);
        
        // Se for erro de permissão RLS, mostrar instruções e não tentar fallback
        if (error.code === 'PGRST301' || error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy') || error.message?.includes('403')) {
          console.error('');
          console.error('═══════════════════════════════════════════════════════════');
          console.error('🚨 ERRO DE PERMISSÃO RLS DETECTADO');
          console.error('═══════════════════════════════════════════════════════════');
          console.error('');
          console.error('📋 SOLUÇÃO RÁPIDA (2 minutos):');
          console.error('');
          console.error('1. Acesse: https://supabase.com/dashboard');
          console.error('2. Selecione seu projeto');
          console.error('3. No menu lateral, clique em "SQL Editor"');
          console.error('4. Copie todo o conteúdo do arquivo: fix-system-settings-rls.sql');
          console.error('5. Cole no editor SQL e clique em RUN (ou Ctrl+Enter)');
          console.error('');
          console.error('📄 Arquivos disponíveis:');
          console.error('   - fix-system-settings-rls.sql (correção específica)');
          console.error('   - CORRIGIR_TUDO_SQL_COMPLETO.sql (correção completa)');
          console.error('');
          console.error('✅ Após executar o script, recarregue esta página (F5)');
          console.error('');
          console.error('═══════════════════════════════════════════════════════════');
          console.error('');
          
          toast({
            title: "⚠️ Permissão negada - Ação necessária",
            description: "As políticas de segurança precisam ser atualizadas. Veja as instruções detalhadas no console do navegador (F12).",
            variant: "destructive",
            duration: 15000,
          });
          
          setLoading(false);
          throw new Error(`Permissão RLS negada. Execute o script SQL 'fix-system-settings-rls.sql' no Supabase SQL Editor. Veja instruções completas no console acima.`);
        }
        
        throw error;
      }

       // Verificar se alguma linha foi atualizada
       if (!updatedData || updatedData.length === 0) {
         console.warn('⚠️ Nenhuma linha foi atualizada. Pode ser problema de permissão RLS.');
         
         // Mostrar aviso antes de tentar fallback
         console.error('');
         console.error('═══════════════════════════════════════════════════════════');
         console.error('⚠️ ATUALIZAÇÃO FALHOU - NENHUMA LINHA ATUALIZADA');
         console.error('═══════════════════════════════════════════════════════════');
         console.error('');
         console.error('📋 Isso geralmente indica problema de permissão RLS.');
         console.error('   Tentando criar nova configuração como fallback...');
         console.error('');
         
         // Tentar criar uma nova configuração como fallback
         const { data: newSettings, error: createError } = await supabase
           .from("system_settings")
           .insert([{
             price_per_kg: pricePerKgNum,
             minimum_charge: minimumChargeNum,
             maximum_weight: maximumWeightNum,
             updated_by: session.user.id,
           }])
           .select()
           .single();
         
         if (createError) {
           // Erro específico de permissão RLS
           if (createError.code === 'PGRST301' || createError.message?.includes('permission') || createError.message?.includes('policy') || createError.message?.includes('403') || createError.code === '42501') {
             console.error('❌ Erro de permissão RLS detectado:', createError);
             
             // Mostrar mensagem detalhada com instruções
             toast({
               title: "⚠️ Permissão negada - Ação necessária",
               description: "As políticas de segurança precisam ser atualizadas. Veja as instruções detalhadas no console do navegador (F12).",
               variant: "destructive",
               duration: 15000,
             });
             
             // Log detalhado no console com instruções
             console.error('');
             console.error('═══════════════════════════════════════════════════════════');
             console.error('🚨 ERRO DE PERMISSÃO RLS DETECTADO');
             console.error('═══════════════════════════════════════════════════════════');
             console.error('');
             console.error('📋 SOLUÇÃO RÁPIDA (2 minutos):');
             console.error('');
             console.error('1. Acesse: https://supabase.com/dashboard');
             console.error('2. Selecione seu projeto');
             console.error('3. No menu lateral, clique em "SQL Editor"');
             console.error('4. Copie todo o conteúdo do arquivo: fix-system-settings-rls.sql');
             console.error('5. Cole no editor SQL e clique em RUN (ou Ctrl+Enter)');
             console.error('');
             console.error('📄 Arquivos disponíveis:');
             console.error('   - fix-system-settings-rls.sql (correção específica)');
             console.error('   - CORRIGIR_TUDO_SQL_COMPLETO.sql (correção completa)');
             console.error('');
             console.error('✅ Após executar o script, recarregue esta página (F5)');
             console.error('');
             console.error('═══════════════════════════════════════════════════════════');
             console.error('');
             
             setLoading(false);
             throw new Error(`Permissão RLS negada. Execute o script SQL 'fix-system-settings-rls.sql' no Supabase SQL Editor. Veja instruções completas no console acima.`);
           }
           throw new Error(`Erro ao atualizar configurações: Nenhuma linha foi atualizada e não foi possível criar nova configuração. ${createError.message}`);
         }
        
        // Configuração criada com sucesso
        clearSettingsCache();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('settingsUpdated', {
            detail: {
              price_per_kg: pricePerKgNum,
              minimum_charge: minimumChargeNum,
              maximum_weight: maximumWeightNum,
            }
          }));
        }
        
        toast({
          title: "Configurações salvas!",
          description: `Preço por kg definido para R$ ${pricePerKgNum.toFixed(2)}.`,
        });
        
        setSettings({
          pricePerKg: pricePerKgNum.toFixed(2),
          minimumCharge: minimumChargeNum.toFixed(2),
          maximumWeight: maximumWeightNum.toFixed(2),
        });
        
        setLoading(false);
        await fetchSettings();
        return;
      }

      console.log('✅ Configurações atualizadas no banco:', updatedData[0]);

      // Limpar cache IMEDIATAMENTE
      clearSettingsCache();
      
      // Atualizar o estado local IMEDIATAMENTE com os valores salvos
      setSettings({
        pricePerKg: pricePerKgNum.toFixed(2),
        minimumCharge: minimumChargeNum.toFixed(2),
        maximumWeight: maximumWeightNum.toFixed(2),
      });
      
      console.log('✅ Estado local atualizado:', {
        pricePerKg: pricePerKgNum.toFixed(2),
        minimumCharge: minimumChargeNum.toFixed(2),
        maximumWeight: maximumWeightNum.toFixed(2),
      });
      
      // Verificar se temos dados atualizados válidos
      if (updatedData && updatedData.length > 0) {
        console.log('✅ Configurações atualizadas:', updatedData[0]);
      }

      // Limpar cache IMEDIATAMENTE e forçar atualização
      clearSettingsCache();
      
      // Forçar atualização de todos os componentes que usam essas configurações
      // Disparar evento customizado para notificar outros componentes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settingsUpdated', {
          detail: {
            price_per_kg: pricePerKgNum,
            minimum_charge: minimumChargeNum,
            maximum_weight: maximumWeightNum,
          }
        }));
      }

      toast({
        title: "Configurações salvas!",
        description: `Preço por kg atualizado para R$ ${pricePerKgNum.toFixed(2)}. Recarregando...`,
      });

      // Recarregar as configurações do banco para confirmar
      await fetchSettings();
      
      // Forçar atualização visual imediata
      setSettings({
        pricePerKg: pricePerKgNum.toFixed(2),
        minimumCharge: minimumChargeNum.toFixed(2),
        maximumWeight: maximumWeightNum.toFixed(2),
      });
    } catch (error: unknown) {
      console.error('Erro ao salvar configurações:', error);

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

      // Tratar erros de permissão
      if (error instanceof Error && (
        error.message.includes("permission") || 
        error.message.includes("unauthorized") ||
        error.message.includes("403")
      )) {
        toast({
          title: "Sem permissão",
          description: "Você não tem permissão para alterar as configurações do sistema.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Erro ao salvar configurações",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Configurações</h1>
          <p className="text-muted-foreground text-lg">
            Configure os parâmetros do sistema
          </p>
        </div>

        <Tabs defaultValue="system" className="space-y-6">
          <TabsList>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Sistema
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="space-y-6">
            <Card className="shadow-strong">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-6 w-6 text-primary" />
                  Parâmetros do Sistema
                </CardTitle>
                <CardDescription>
                  Defina os valores padrão para operação do restaurante
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="price-per-kg">Preço por Kg (R$)</Label>
              <Input
                id="price-per-kg"
                type="number"
                step="0.01"
                min="0"
                value={settings.pricePerKg}
                onChange={(e) => {
                  const value = e.target.value;
                  // Validar que é um número válido
                  if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                    setSettings({ ...settings, pricePerKg: value });
                  }
                }}
              />
              <p className="text-sm text-muted-foreground">
                Valor cobrado por quilograma de comida
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minimum-charge">Cobrança Mínima (R$)</Label>
              <Input
                id="minimum-charge"
                type="number"
                step="0.01"
                min="0"
                value={settings.minimumCharge}
                onChange={(e) => {
                  const value = e.target.value;
                  // Validar que é um número válido
                  if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                    setSettings({ ...settings, minimumCharge: value });
                  }
                }}
              />
              <p className="text-sm text-muted-foreground">
                Valor mínimo a ser cobrado por refeição
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maximum-weight">Peso Máximo (Kg)</Label>
              <Input
                id="maximum-weight"
                type="number"
                step="0.01"
                min="0"
                value={settings.maximumWeight}
                onChange={(e) => {
                  const value = e.target.value;
                  // Validar que é um número válido
                  if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                    setSettings({ ...settings, maximumWeight: value });
                  }
                }}
              />
              <p className="text-sm text-muted-foreground">
                Peso máximo permitido por prato
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={loading}
              size="lg"
              className="w-full md:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6">
            <WhatsAppQRCode
              onConnected={() => {
                toast({
                  title: "WhatsApp conectado!",
                  description: "Agora você pode enviar mensagens via WhatsApp",
                });
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
