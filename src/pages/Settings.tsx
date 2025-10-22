import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Settings as SettingsIcon, Save } from "lucide-react";

const Settings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    pricePerKg: "45.00",
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
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

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
          price_per_kg: Number(settings.pricePerKg),
          minimum_charge: Number(settings.minimumCharge),
          maximum_weight: Number(settings.maximumWeight),
          updated_by: session?.user?.id,
        })
        .eq("id", currentSettings.id);

      if (error) throw error;

      toast({
        title: "Configurações salvas!",
        description: "As alterações foram aplicadas com sucesso",
      });

      // Recarregar as configurações para confirmar
      await fetchSettings();
    } catch (error: unknown) {
      console.error('Erro ao salvar configurações:', error);
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
                onChange={(e) =>
                  setSettings({ ...settings, pricePerKg: e.target.value })
                }
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
                onChange={(e) =>
                  setSettings({ ...settings, minimumCharge: e.target.value })
                }
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
                onChange={(e) =>
                  setSettings({ ...settings, maximumWeight: e.target.value })
                }
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
