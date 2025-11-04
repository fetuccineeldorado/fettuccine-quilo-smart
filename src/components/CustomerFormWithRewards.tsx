/**
 * Componente de Formulário de Cliente com Sistema de Bonificação e Indicação
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { whatsappService, configureWhatsAppFromEnv } from "@/utils/whatsapp";
import { referralService } from "@/utils/referrals";
import { 
  UserPlus, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Gift,
  Users,
  MessageCircle,
  CheckCircle,
  AlertCircle
} from "lucide-react";

type CustomerFormData = Database['public']['Tables']['customers']['Insert'];

interface CustomerFormWithRewardsProps {
  customerId?: string; // Se fornecido, está editando
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CustomerFormWithRewards = ({ customerId, onSuccess, onCancel }: CustomerFormWithRewardsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: "",
    email: "",
    phone: "",
    whatsapp_number: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    birth_date: "",
    notes: "",
    referral_code: "",
    is_active: true,
  });

  const states = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  useEffect(() => {
    // Configurar WhatsApp ao montar
    configureWhatsAppFromEnv();

    // Se está editando, carregar dados do cliente
    if (customerId) {
      loadCustomerData();
    }
  }, [customerId]);

  const loadCustomerData = async () => {
    try {
      // Tentar carregar todos os campos primeiro
      let { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      // Se erro de coluna não encontrada, carregar apenas campos básicos originais
      if (error && error.message?.includes("Could not find the")) {
        const { data: basicData, error: basicError } = await supabase
          .from('customers')
          .select('id, name, email, phone, tier, total_orders, total_spent, created_at, updated_at')
          .eq('id', customerId)
          .single();
        
        if (basicError) throw basicError;
        data = basicData as any;
      } else if (error) {
        throw error;
      }

      if (data) {
        setFormData({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          whatsapp_number: data.whatsapp_number || "",
          address: (data as any).address || "",
          city: (data as any).city || "",
          state: (data as any).state || "",
          zip_code: (data as any).zip_code || "",
          birth_date: (data as any).birth_date ? ((data as any).birth_date.split('T')[0] || "") : "",
          notes: (data as any).notes || "",
          is_active: data.is_active ?? true,
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar cliente:', error);
      
      let errorMessage = "Não foi possível carregar os dados do cliente";
      if (error.message?.includes("Could not find the")) {
        errorMessage = "A migração SQL não foi aplicada. Alguns campos podem não estar disponíveis.";
      }
      
      toast({
        title: "Erro ao carregar cliente",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações
      if (!formData.name?.trim()) {
        toast({
          title: "Nome obrigatório",
          description: "O nome do cliente é obrigatório",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Se tem código de indicação, validar antes de salvar
      if (formData.referral_code && !customerId) {
        const { data: referrer } = await supabase
          .from('customers')
          .select('id')
          .eq('referral_code', formData.referral_code.toUpperCase())
          .single();

        if (!referrer) {
          toast({
            title: "Código de indicação inválido",
            description: "O código informado não existe",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Preparar dados para inserção/atualização
      // Função auxiliar para limpar strings vazias
      const cleanValue = (value: string | undefined | null): string | null => {
        if (!value || typeof value !== 'string') return null;
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
      };

      // Limpar e formatar WhatsApp
      const cleanWhatsApp = formData.whatsapp_number?.trim() 
        ? formData.whatsapp_number.replace(/[^\d+]/g, '').trim() 
        : null;

      // Campos básicos (sempre existem na tabela original)
      const basicCustomerData: any = {
        name: formData.name.trim(),
        email: cleanValue(formData.email),
        phone: cleanValue(formData.phone),
      };

      // Campos da migração (só existem se a migração foi aplicada)
      const migrationFields: any = {};
      if (cleanWhatsApp) migrationFields.whatsapp_number = cleanWhatsApp;
      migrationFields.whatsapp_verified = !!cleanWhatsApp;
      migrationFields.is_active = formData.is_active ?? true;
      if (formData.address?.trim()) migrationFields.address = formData.address.trim();
      if (formData.city?.trim()) migrationFields.city = formData.city.trim();
      if (formData.state?.trim()) migrationFields.state = formData.state;
      if (formData.zip_code?.trim()) migrationFields.zip_code = formData.zip_code.trim();
      if (formData.birth_date) migrationFields.birth_date = formData.birth_date;
      if (formData.notes?.trim()) migrationFields.notes = formData.notes.trim();

      // Tentar com todos os campos primeiro
      const fullCustomerData = { ...basicCustomerData, ...migrationFields };

      let savedCustomerId: string;

      if (customerId) {
        // Atualizar cliente existente
        // Tentar primeiro com todos os campos
        let { data, error } = await supabase
          .from('customers')
          .update(fullCustomerData)
          .eq('id', customerId)
          .select()
          .single();

        // Se erro de coluna não encontrada, tentar sem os campos da migração
        if (error && (error.message?.includes("Could not find the") || error.code === '400')) {
          console.log('Tentando salvar apenas com campos básicos devido a erro:', error.message);
          // Apenas campos que existem na tabela original (sem migração)
          const basicData = {
            name: basicCustomerData.name,
            email: basicCustomerData.email,
            phone: basicCustomerData.phone,
          };
          
          const retry = await supabase
            .from('customers')
            .update(basicData)
            .eq('id', customerId)
            .select()
            .single();
          
          if (retry.error) {
            console.error('Erro no retry com campos básicos:', retry.error);
            throw retry.error;
          }
          data = retry.data;
          
          toast({
            title: "Cliente atualizado!",
            description: "Dados básicos atualizados. Aplique a migração SQL para usar todos os campos.",
            variant: "default",
          });
          savedCustomerId = customerId;
        } else if (error) {
          throw error;
        } else {
          savedCustomerId = customerId;

          toast({
            title: "Cliente atualizado!",
            description: "Dados do cliente atualizados com sucesso",
          });
        }
      } else {
        // Criar novo cliente
        // Tentar primeiro com todos os campos
        let { data, error } = await supabase
          .from('customers')
          .insert([fullCustomerData])
          .select()
          .single();

        // Se erro de coluna não encontrada, tentar sem os campos da migração
        if (error && (error.message?.includes("Could not find the") || error.code === '400')) {
          console.log('Tentando salvar apenas com campos básicos devido a erro:', error.message);
          // Apenas campos que existem na tabela original (sem migração)
          const basicData = {
            name: basicCustomerData.name,
            email: basicCustomerData.email,
            phone: basicCustomerData.phone,
          };
          
          const retry = await supabase
            .from('customers')
            .insert([basicData])
            .select()
            .single();
          
          if (retry.error) {
            console.error('Erro no retry com campos básicos:', retry.error);
            throw retry.error;
          }
          data = retry.data;
          savedCustomerId = data.id;
          
          toast({
            title: "Cliente cadastrado!",
            description: "Cliente cadastrado com dados básicos. Aplique a migração SQL para usar todos os campos.",
            variant: "default",
          });
        } else if (error) {
          throw error;
        } else {
          savedCustomerId = data.id;
        }

        // Gerar código de indicação
        const referralCode = await referralService.generateReferralCode(savedCustomerId);

        // Registrar indicação se houver código
        if (formData.referral_code) {
          const referralResult = await referralService.registerReferral(
            formData.referral_code.toUpperCase(),
            savedCustomerId
          );

          if (!referralResult.success) {
            console.warn('Aviso ao registrar indicação:', referralResult.error);
            // Não falha o cadastro, apenas avisa
            toast({
              title: "Cliente cadastrado",
              description: "Cliente cadastrado, mas houve um problema ao registrar a indicação",
              variant: "default",
            });
          }
        }

        // Enviar mensagem de boas-vindas via WhatsApp
        if (formData.whatsapp_number) {
          try {
            const whatsappResult = await whatsappService.sendWelcomeMessage(
              formData.name,
              formData.whatsapp_number,
              referralCode
            );

            if (whatsappResult.success) {
              console.log('Mensagem WhatsApp enviada com sucesso');
            } else {
              console.warn('Erro ao enviar WhatsApp:', whatsappResult.error);
            }
          } catch (whatsappError) {
            console.error('Erro ao enviar WhatsApp:', whatsappError);
            // Não falha o cadastro por erro de WhatsApp
          }
        }

        toast({
          title: "Cliente cadastrado!",
          description: `Cliente cadastrado com sucesso. Código de indicação: ${referralCode}`,
        });
      }

      // Limpar formulário
      setFormData({
        name: "",
        email: "",
        phone: "",
        whatsapp_number: "",
        address: "",
        city: "",
        state: "",
        zip_code: "",
        birth_date: "",
        notes: "",
        referral_code: "",
        is_active: true,
      });

      // Callback de sucesso
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      console.error('Detalhes do erro:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      
      // Tratar erros específicos
      let errorMessage = error.message || "Não foi possível salvar os dados";
      
      if (error.code === '400' || error.message?.includes('400')) {
        errorMessage = "Erro de validação. Verifique se todos os campos obrigatórios estão preenchidos corretamente.";
      } else if (error.message?.includes("Could not find the 'address' column") ||
          error.message?.includes("Could not find the 'city' column") ||
          error.message?.includes("Could not find the 'state' column") ||
          error.message?.includes("Could not find the 'zip_code' column") ||
          error.message?.includes("Could not find the 'birth_date' column") ||
          error.message?.includes("Could not find the 'notes' column")) {
        errorMessage = "A migração SQL não foi aplicada. Execute o arquivo 'supabase/migrations/20250101000002_create_customer_rewards_system.sql' no Supabase SQL Editor.";
      } else if (error.message?.includes("Could not find the table")) {
        errorMessage = "A tabela não existe. Aplique as migrações SQL no Supabase.";
      } else if (error.code === 'PGRST205') {
        errorMessage = "Tabela ou coluna não encontrada. Aplique as migrações SQL primeiro.";
      } else if (error.code === '23505') {
        errorMessage = "Já existe um cliente com este e-mail ou código de indicação.";
      } else if (error.code === '23503') {
        errorMessage = "Erro de referência: verifique se o código de indicação é válido.";
      } else if (error.code === 'PGRST116') {
        errorMessage = "Cliente não encontrado.";
      } else if (error.code === 'PGRST301') {
        errorMessage = "Erro de permissão. Verifique as políticas RLS no Supabase.";
      }

      toast({
        title: "Erro ao salvar cliente",
        description: errorMessage,
        variant: "destructive",
        duration: 10000, // 10 segundos para dar tempo de ler
      });
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar WhatsApp com telefone se não preenchido
  const handlePhoneChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      phone: value,
      whatsapp_number: prev.whatsapp_number || value, // Preencher WhatsApp se vazio
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Informações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do cliente"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="h-4 w-4 inline mr-1" />
                Telefone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">
                <MessageCircle className="h-4 w-4 inline mr-1" />
                WhatsApp
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                value={formData.whatsapp_number}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
              <p className="text-xs text-muted-foreground">
                Número para receber notificações e promoções (opcional)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">
                <Calendar className="h-4 w-4 inline mr-1" />
                Data de Nascimento
              </Label>
              <Input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Rua, número, complemento"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Cidade"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip_code">CEP</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                placeholder="00000-000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sistema de Indicação */}
      {!customerId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Sistema de Indicação
            </CardTitle>
            <CardDescription>
              Foi indicado por alguém? Informe o código de indicação e ambos ganham pontos!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="referral_code">
                <Users className="h-4 w-4 inline mr-1" />
                Código de Indicação
              </Label>
              <Input
                id="referral_code"
                value={formData.referral_code}
                onChange={(e) => setFormData(prev => ({ ...prev, referral_code: e.target.value.toUpperCase() }))}
                placeholder="ABC12345"
                maxLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco se não foi indicado por ninguém
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Anotações sobre o cliente</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observações, preferências, restrições alimentares, etc."
              rows={4}
            />
          </div>

          <div className="mt-4 flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, is_active: checked as boolean }))
              }
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Cliente ativo
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : customerId ? "Atualizar Cliente" : "Cadastrar Cliente"}
        </Button>
      </div>
    </form>
  );
};

export default CustomerFormWithRewards;

