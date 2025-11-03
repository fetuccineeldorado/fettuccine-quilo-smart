import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { clearSettingsCache } from "@/utils/settingsCache";

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
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .single();

      if (error) {
        console.error('Erro ao carregar configurações:', error);
        toast({
          title: "Erro ao carregar configurações",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setSettings({
          pricePerKg: Number(data.price_per_kg).toFixed(2),
          minimumCharge: Number(data.minimum_charge).toFixed(2),
          maximumWeight: Number(data.maximum_weight).toFixed(2),
        });
      }
    } catch (err) {
      console.error('Erro geral ao carregar configurações:', err);
      toast({
        title: "Erro ao carregar configurações",
        description: "Erro desconhecido",
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
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Atualizar as configurações
      const { error } = await supabase
        .from("system_settings")
        .update({
          price_per_kg: pricePerKgNum,
          minimum_charge: minimumChargeNum,
          maximum_weight: maximumWeightNum,
          updated_by: session.user.id,
        })
        .eq("id", currentSettings.id);

      if (error) throw error;

      toast({
        title: "Configurações salvas!",
        description: "As alterações foram aplicadas com sucesso",
      });

      // Limpar cache e recarregar as configurações para confirmar
      clearSettingsCache();
      await fetchSettings();
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
      </div>
    </DashboardLayout>
  );
};

export default Settings;
