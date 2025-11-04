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

interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  whatsapp_number?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  birth_date?: string;
  notes?: string;
  referral_code?: string; // Código de quem indicou
  is_active?: boolean;
}

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
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          whatsapp_number: data.whatsapp_number || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          zip_code: data.zip_code || "",
          birth_date: data.birth_date || "",
          notes: data.notes || "",
          is_active: data.is_active ?? true,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      toast({
        title: "Erro ao carregar cliente",
        description: "Não foi possível carregar os dados do cliente",
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

      // Validar WhatsApp se fornecido
      if (formData.whatsapp_number && !whatsappService.validatePhoneNumber(formData.whatsapp_number)) {
        toast({
          title: "Número de WhatsApp inválido",
          description: "Por favor, informe um número válido",
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
      const customerData: any = {
        name: formData.name.trim(),
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        whatsapp_number: formData.whatsapp_number?.trim() || null,
        whatsapp_verified: !!formData.whatsapp_number,
        address: formData.address?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state || null,
        zip_code: formData.zip_code?.trim() || null,
        birth_date: formData.birth_date || null,
        notes: formData.notes?.trim() || null,
        is_active: formData.is_active ?? true,
      };

      let savedCustomerId: string;

      if (customerId) {
        // Atualizar cliente existente
        const { data, error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customerId)
          .select()
          .single();

        if (error) throw error;
        savedCustomerId = customerId;

        toast({
          title: "Cliente atualizado!",
          description: "Dados do cliente atualizados com sucesso",
        });
      } else {
        // Criar novo cliente
        const { data, error } = await supabase
          .from('customers')
          .insert([customerData])
          .select()
          .single();

        if (error) throw error;
        savedCustomerId = data.id;

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
              // Registrar mensagem no banco
              await supabase
                .from('customer_whatsapp_messages')
                .insert({
                  customer_id: savedCustomerId,
                  message_type: 'welcome',
                  message_content: `Mensagem de boas-vindas enviada com código ${referralCode}`,
                  status: 'sent',
                  sent_at: new Date().toISOString(),
                });
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
      toast({
        title: "Erro ao salvar cliente",
        description: error.message || "Não foi possível salvar os dados",
        variant: "destructive",
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
                WhatsApp *
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                value={formData.whatsapp_number}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                placeholder="(11) 99999-9999"
                required={!customerId}
              />
              <p className="text-xs text-muted-foreground">
                Número para receber notificações e promoções
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

