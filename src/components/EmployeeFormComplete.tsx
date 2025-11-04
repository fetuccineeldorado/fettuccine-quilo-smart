import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import FacialCapture from "@/components/FacialCapture";
import { validateCPF, formatCPF, cleanCPF } from "@/utils/cpfValidator";
import { UserPlus, Save, X, Loader2, Camera, AlertCircle } from "lucide-react";

interface EmployeeFormCompleteProps {
  employeeId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface EmployeeFormData {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  address: string;
  role: "admin" | "manager" | "cashier" | "kitchen" | "waiter";
  department: string;
  hire_date: string;
  salary: string;
  notes: string;
}

const EmployeeFormComplete = ({ employeeId, onSuccess, onCancel }: EmployeeFormCompleteProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingCPF, setCheckingCPF] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [facialEncoding, setFacialEncoding] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);

  const [formData, setFormData] = useState<EmployeeFormData>({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    address: "",
    role: "cashier",
    department: "",
    hire_date: new Date().toISOString().split("T")[0],
    salary: "",
    notes: "",
  });

  const departments = [
    "Administração",
    "Atendimento",
    "Cozinha",
    "Caixa",
    "Limpeza",
    "Gerência",
  ];

  useEffect(() => {
    if (employeeId) {
      loadEmployeeData();
    }
  }, [employeeId]);

  const loadEmployeeData = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", employeeId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name || "",
          cpf: data.cpf || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          role: data.role || "cashier",
          department: data.department || "",
          hire_date: data.hire_date || new Date().toISOString().split("T")[0],
          salary: data.salary ? data.salary.toString() : "",
          notes: data.notes || "",
        });
        setPhotoUrl(data.photo_url);
      }
    } catch (error) {
      console.error("Erro ao carregar funcionário:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do funcionário.",
        variant: "destructive",
      });
    }
  };

  const checkCPFUnique = async (cpf: string): Promise<boolean> => {
    if (!cpf || cpf.length < 11) return true; // Não verificar se CPF está incompleto

    const clean = cleanCPF(cpf);
    if (!validateCPF(clean)) {
      setCpfError("CPF inválido");
      return false;
    }

    setCheckingCPF(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id")
        .eq("cpf", clean)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data && (!employeeId || data.id !== employeeId)) {
        setCpfError("CPF já cadastrado para outro funcionário");
        setCheckingCPF(false);
        return false;
      }

      setCpfError(null);
      setCheckingCPF(false);
      return true;
    } catch (error) {
      console.error("Erro ao verificar CPF:", error);
      setCpfError("Erro ao verificar CPF. Tente novamente.");
      setCheckingCPF(false);
      return false;
    }
  };

  const handleCPFChange = async (value: string) => {
    // Remove caracteres não numéricos
    const clean = value.replace(/\D/g, "");
    
    // Limita a 11 dígitos
    const limited = clean.slice(0, 11);
    
    // Formata enquanto digita
    const formatted = formatCPF(limited);
    setFormData({ ...formData, cpf: formatted });

    // Valida e verifica unicidade se tiver 11 dígitos
    if (limited.length === 11) {
      const isValid = validateCPF(limited);
      if (isValid) {
        await checkCPFUnique(formatted);
      } else {
        setCpfError("CPF inválido");
      }
    } else {
      setCpfError(null);
    }
  };

  const handlePhotoCapture = (capturedPhotoUrl: string, encoding?: any) => {
    setPhotoUrl(capturedPhotoUrl);
    if (encoding) {
      setFacialEncoding(encoding);
    }
    setShowCamera(false);
    toast({
      title: "Foto capturada!",
      description: "Foto facial capturada com sucesso.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações
      if (!formData.name.trim()) {
        toast({
          title: "Nome obrigatório",
          description: "O nome do funcionário é obrigatório.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!formData.cpf || !validateCPF(cleanCPF(formData.cpf))) {
        toast({
          title: "CPF inválido",
          description: "Por favor, insira um CPF válido.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!formData.email.trim()) {
        toast({
          title: "Email obrigatório",
          description: "O email do funcionário é obrigatório.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Verificar CPF único novamente
      const cpfClean = cleanCPF(formData.cpf);
      const { data: existingCPF } = await supabase
        .from("employees")
        .select("id")
        .eq("cpf", cpfClean)
        .maybeSingle();

      if (existingCPF && (!employeeId || existingCPF.id !== employeeId)) {
        toast({
          title: "CPF já cadastrado",
          description: "Este CPF já está cadastrado para outro funcionário.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Verificar email único
      const { data: existingEmail } = await supabase
        .from("employees")
        .select("id")
        .eq("email", formData.email)
        .maybeSingle();

      if (existingEmail && (!employeeId || existingEmail.id !== employeeId)) {
        toast({
          title: "Email já cadastrado",
          description: "Este email já está cadastrado para outro funcionário.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Upload da foto se houver
      let finalPhotoUrl = photoUrl;
      if (photoUrl && photoUrl.startsWith("data:image")) {
        // Foto base64, precisa fazer upload para Supabase Storage
        // Por enquanto, manteremos como base64 ou fazer upload
        // TODO: Implementar upload para Supabase Storage
        finalPhotoUrl = photoUrl;
      }

      // Preparar dados para inserção/atualização
      const employeeData: any = {
        name: formData.name.trim(),
        cpf: cpfClean,
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        role: formData.role,
        department: formData.department || null,
        hire_date: formData.hire_date || null,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        notes: formData.notes.trim() || null,
        photo_url: finalPhotoUrl,
        facial_encoding: facialEncoding || null,
        is_active: true,
      };

      if (employeeId) {
        // Atualizar funcionário existente
        const { error } = await supabase
          .from("employees")
          .update(employeeData)
          .eq("id", employeeId);

        if (error) throw error;

        toast({
          title: "Funcionário atualizado!",
          description: "Os dados do funcionário foram atualizados com sucesso.",
        });
      } else {
        // Criar novo funcionário
        const { error } = await supabase
          .from("employees")
          .insert([employeeData])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Funcionário cadastrado!",
          description: "Novo funcionário cadastrado com sucesso.",
        });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Erro ao salvar funcionário:", error);
      toast({
        title: "Erro ao salvar funcionário",
        description: error.message || "Não foi possível salvar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Nome Completo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="João Silva"
            required
          />
        </div>

        {/* CPF */}
        <div className="space-y-2">
          <Label htmlFor="cpf">
            CPF <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(e) => handleCPFChange(e.target.value)}
              placeholder="000.000.000-00"
              maxLength={14}
              required
              className={cpfError ? "border-destructive" : ""}
            />
            {checkingCPF && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          {cpfError && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {cpfError}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">
            E-mail <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="joao@exemplo.com"
            required
          />
        </div>

        {/* Telefone */}
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(00) 00000-0000"
          />
        </div>

        {/* Cargo */}
        <div className="space-y-2">
          <Label htmlFor="role">
            Cargo <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.role}
            onValueChange={(value: any) => setFormData({ ...formData, role: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cashier">Caixa</SelectItem>
              <SelectItem value="waiter">Garçom</SelectItem>
              <SelectItem value="kitchen">Cozinha</SelectItem>
              <SelectItem value="manager">Gerente</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Departamento */}
        <div className="space-y-2">
          <Label htmlFor="department">Departamento</Label>
          <Select
            value={formData.department}
            onValueChange={(value) => setFormData({ ...formData, department: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o departamento" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Data de Admissão */}
        <div className="space-y-2">
          <Label htmlFor="hire_date">Data de Admissão</Label>
          <Input
            id="hire_date"
            type="date"
            value={formData.hire_date}
            onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
          />
        </div>

        {/* Salário */}
        <div className="space-y-2">
          <Label htmlFor="salary">Salário (R$)</Label>
          <Input
            id="salary"
            type="number"
            step="0.01"
            min="0"
            value={formData.salary}
            onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Endereço */}
      <div className="space-y-2">
        <Label htmlFor="address">Endereço</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Rua, número, bairro, cidade - Estado, CEP"
          rows={2}
        />
      </div>

      {/* Foto Facial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Foto Facial para Reconhecimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showCamera && !photoUrl && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCamera(true)}
            >
              <Camera className="h-4 w-4 mr-2" />
              Capturar Foto
            </Button>
          )}

          {showCamera && (
            <FacialCapture
              onCapture={handlePhotoCapture}
              onCancel={() => setShowCamera(false)}
            />
          )}

          {photoUrl && !showCamera && (
            <div className="space-y-4">
              <div className="relative w-48 h-48 mx-auto">
                <img
                  src={photoUrl}
                  alt="Foto do funcionário"
                  className="w-full h-full object-cover rounded-lg border-2 border-primary"
                />
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPhotoUrl(null);
                    setFacialEncoding(null);
                    setShowCamera(true);
                  }}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Refazer Foto
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observações */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Informações adicionais sobre o funcionário..."
          rows={3}
        />
      </div>

      {/* Botões */}
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading || !!cpfError || checkingCPF}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {employeeId ? "Atualizar" : "Cadastrar"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default EmployeeFormComplete;

