import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import FaceCapture from "@/components/FaceCapture";
import { validateCPF, formatCPF } from "@/utils/cpfValidator";
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  Search, 
  Shield, 
  Clock, 
  DollarSign, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Camera,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Employee {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  address: string | null;
  role: 'admin' | 'manager' | 'cashier' | 'kitchen' | 'waiter';
  position: string | null;
  department: string | null;
  salary: number | null;
  hire_date: string | null;
  is_active: boolean;
  notes: string | null;
  face_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

interface EmployeeFormData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  address: string;
  role: 'admin' | 'manager' | 'cashier' | 'kitchen' | 'waiter';
  position: string;
  department: string;
  salary: number;
  hire_date: string;
  is_active: boolean;
  notes: string;
  facePhoto: string | null;
}

const EmployeeManagerComplete = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [tableNotFound, setTableNotFound] = useState(false);
  
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    address: "",
    role: "cashier",
    position: "",
    department: "",
    salary: 0,
    hire_date: new Date().toISOString().split('T')[0],
    is_active: true,
    notes: "",
    facePhoto: null,
  });

  const departments = [
    "Administração",
    "Atendimento",
    "Cozinha",
    "Caixa",
    "Limpeza",
    "Gerência"
  ];

  const positions = [
    "Assistente",
    "Auxiliar",
    "Operador",
    "Supervisor",
    "Coordenador",
    "Gerente",
    "Diretor"
  ];

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      console.log("🔄 Iniciando carregamento de funcionários...");
      
      // Verificar sessão primeiro
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("❌ Erro ao verificar sessão:", sessionError);
        throw new Error("Erro de autenticação. Por favor, faça login novamente.");
      }

      console.log("✅ Sessão verificada:", session ? "Autenticado" : "Não autenticado");

      if (!session) {
        console.warn("⚠️ Nenhuma sessão encontrada. Tentando carregar sem autenticação...");
        toast({
          title: "Atenção",
          description: "Você não está autenticado. Algumas funcionalidades podem não funcionar.",
          variant: "default",
        });
      }

      // Primeiro, verificar se a tabela existe tentando uma query simples
      console.log("🔍 Verificando se a tabela employees existe...");
      
      // Tentar carregar funcionários com timeout
      const queryPromise = supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout: A consulta demorou mais de 10 segundos")), 10000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        console.error("❌ Erro detalhado ao carregar funcionários:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          fullError: JSON.stringify(error, null, 2)
        });

        // Tratar erros específicos
        if (error.code === 'PGRST301' || error.message?.includes('permission denied') || error.message?.includes('policy') || error.message?.includes('RLS')) {
          const errorMsg = "Você não tem permissão para visualizar funcionários. Execute o script 'fix_employees_rls_rapido.sql' no Supabase SQL Editor.";
          console.error("🔒 Erro de permissão RLS:", errorMsg);
          throw new Error(errorMsg);
        } else if (error.code === 'PGRST205' || error.message?.includes('Could not find the table') || error.message?.includes('does not exist')) {
          const errorMsg = "A tabela 'employees' não foi encontrada. Execute o script 'criar_tabelas_funcionarios_completo.sql' no Supabase SQL Editor.";
          console.error("📋 Tabela não encontrada:", errorMsg);
          setTableNotFound(true);
          throw new Error(errorMsg);
        } else if (error.code === 'PGRST116') {
          // Tabela existe mas não há dados - não é um erro
          console.log("✅ Nenhum funcionário cadastrado ainda.");
          setEmployees([]);
          return;
        } else if (error.code === 'PGRST301') {
          const errorMsg = "Erro de permissão. Verifique as políticas RLS no Supabase.";
          console.error("🔒 Erro de permissão:", errorMsg);
          throw new Error(errorMsg);
        }
        
        throw error;
      }

      console.log("✅ Funcionários carregados com sucesso:", data?.length || 0, "registros");
      setEmployees(data || []);
      setTableNotFound(false); // Resetar flag se carregou com sucesso
    } catch (error) {
      console.error("❌ Erro ao carregar funcionários:", error);
      
      let errorMessage = "Erro desconhecido ao carregar funcionários";
      let errorTitle = "Erro ao carregar funcionários";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Mensagens mais específicas
        if (error.message.includes("timeout") || error.message.includes("Timeout")) {
          errorTitle = "Timeout";
          errorMessage = "A consulta demorou muito. Verifique sua conexão ou tente novamente.";
        } else if (error.message.includes("permission") || error.message.includes("RLS") || error.message.includes("policy")) {
          errorTitle = "Erro de Permissão";
          errorMessage = "Você não tem permissão para visualizar funcionários. Execute o script 'fix_employees_rls_rapido.sql' no Supabase SQL Editor.";
        } else if (error.message.includes("table") || error.message.includes("não foi encontrada")) {
          errorTitle = "Tabela Não Encontrada";
          errorMessage = "A tabela 'employees' não existe no banco de dados.\n\n📋 SOLUÇÃO RÁPIDA:\n1. Acesse: https://supabase.com/dashboard\n2. Abra o SQL Editor\n3. Execute o script: CRIAR_TABELA_EMPLOYEES_SIMPLES.sql\n4. Recarregue esta página (F5)\n\n📁 Arquivo: CRIAR_TABELA_EMPLOYEES_SIMPLES.sql";
          setTableNotFound(true);
        }
      } else if (typeof error === 'object' && error !== null) {
        const supabaseError = error as any;
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        } else if (supabaseError.code) {
          errorMessage = `Erro ${supabaseError.code}: ${supabaseError.message || 'Erro ao carregar funcionários'}`;
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 10000, // Mostrar por 10 segundos
      });
      
      // Definir array vazio para evitar erros na renderização
      setEmployees([]);
    } finally {
      setLoading(false);
      console.log("🏁 Carregamento de funcionários finalizado");
    }
  };

  const uploadFacePhoto = async (imageData: string): Promise<string | null> => {
    try {
      setUploadingPhoto(true);
      
      // Converter base64 para blob
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      // Gerar nome único para o arquivo
      const fileName = `employee-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `employee-photos/${fileName}`;

      // Verificar se o bucket existe, se não, tentar criar ou usar fallback
      let bucketName = "employee-photos";
      
      // Tentar fazer upload
      let uploadResult = await supabase.storage
        .from(bucketName)
        .upload(filePath, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      // Se o bucket não existir, tentar criar ou retornar null (foto opcional)
      if (uploadResult.error) {
        console.warn("Erro ao fazer upload da foto:", uploadResult.error);
        
        // Se o erro for relacionado ao bucket não existir, retornar null
        if (uploadResult.error.message?.includes("Bucket") || 
            uploadResult.error.message?.includes("not found") ||
            uploadResult.error.message?.includes("does not exist")) {
          console.warn("Bucket 'employee-photos' não encontrado. A foto não será salva no storage.");
          return null;
        }
        
        throw uploadResult.error;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload da foto:", error);
      // Retornar null em vez de lançar erro - foto é opcional
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar campos obrigatórios
      if (!formData.name.trim() || !formData.email.trim()) {
        toast({
          title: "Campos obrigatórios",
          description: "Nome e email são obrigatórios",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        toast({
          title: "Email inválido",
          description: "Por favor, insira um email válido",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Validar CPF se fornecido (CPF é opcional mas se fornecido deve ser válido)
      if (formData.cpf && formData.cpf.trim()) {
        const cleanCPF = formData.cpf.replace(/[^\d]/g, '');
        if (cleanCPF.length > 0 && !validateCPF(formData.cpf)) {
          toast({
            title: "CPF inválido",
            description: "Por favor, insira um CPF válido ou deixe em branco",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // Verificar se email já existe (se não estiver editando)
      if (!editingEmployee) {
        const { data: existingEmail, error: emailError } = await supabase
          .from("employees")
          .select("id")
          .eq("email", formData.email.trim().toLowerCase())
          .maybeSingle();

        if (emailError && emailError.code !== 'PGRST116') {
          throw emailError;
        }

        if (existingEmail) {
          toast({
            title: "Email já cadastrado",
            description: "Este email já está em uso por outro funcionário",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      } else {
        // Ao editar, verificar se o email mudou e se o novo email já existe
        if (formData.email.trim().toLowerCase() !== editingEmployee.email.toLowerCase()) {
          const { data: existingEmail, error: emailError } = await supabase
            .from("employees")
            .select("id")
            .eq("email", formData.email.trim().toLowerCase())
            .maybeSingle();

          if (emailError && emailError.code !== 'PGRST116') {
            throw emailError;
          }

          if (existingEmail) {
            toast({
              title: "Email já cadastrado",
              description: "Este email já está em uso por outro funcionário",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }
      }

      // Verificar se CPF já existe (se fornecido e não estiver editando)
      if (formData.cpf && formData.cpf.trim()) {
        const cleanCPF = formData.cpf.replace(/[^\d]/g, '');
        if (cleanCPF.length > 0) {
          const checkQuery = supabase
            .from("employees")
            .select("id")
            .eq("cpf", cleanCPF);
          
          if (editingEmployee) {
            checkQuery.neq("id", editingEmployee.id);
          }
          
          const { data: existingCPF, error: cpfError } = await checkQuery.maybeSingle();

          if (cpfError && cpfError.code !== 'PGRST116') {
            throw cpfError;
          }

          if (existingCPF) {
            toast({
              title: "CPF já cadastrado",
              description: "Este CPF já está em uso por outro funcionário",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }
      }

      // Fazer upload da foto se houver
      let photoUrl = editingEmployee?.face_photo_url || null;
      if (formData.facePhoto && !editingEmployee) {
        photoUrl = await uploadFacePhoto(formData.facePhoto);
      } else if (formData.facePhoto && editingEmployee && formData.facePhoto !== editingEmployee.face_photo_url) {
        // Se estiver editando e a foto mudou, fazer upload
        photoUrl = await uploadFacePhoto(formData.facePhoto);
      }

      // Obter sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Sessão não encontrada. Por favor, faça login novamente.");
      }

      // Preparar dados para inserção
      // Limpar valores vazios e converter para null
      const cleanValue = (value: string | number | null | undefined): string | number | null => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') {
          const trimmed = value.trim();
          return trimmed.length > 0 ? trimmed : null;
        }
        if (typeof value === 'number') {
          return value > 0 ? value : null;
        }
        return null;
      };

      const employeeData: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        cpf: formData.cpf && formData.cpf.trim() ? formData.cpf.replace(/[^\d]/g, '') : null,
        phone: cleanValue(formData.phone) as string | null,
        address: cleanValue(formData.address) as string | null,
        role: formData.role,
        position: cleanValue(formData.position) as string | null,
        department: cleanValue(formData.department) as string | null,
        salary: formData.salary > 0 ? formData.salary : null,
        hire_date: formData.hire_date && formData.hire_date.trim() ? formData.hire_date : null,
        is_active: formData.is_active,
        notes: cleanValue(formData.notes) as string | null,
        face_photo_url: photoUrl,
      };

      // Adicionar created_by apenas para novos funcionários
      if (!editingEmployee) {
        employeeData.created_by = session.user.id;
      }

      if (editingEmployee) {
        // Atualizar funcionário existente
        const { data: updatedData, error: updateError } = await supabase
          .from("employees")
          .update(employeeData)
          .eq("id", editingEmployee.id)
          .select()
          .single();

        if (updateError) {
          // Tratar erros específicos
          if (updateError.code === '23505') {
            // Violação de chave única
            if (updateError.message.includes('email')) {
              throw new Error("Este email já está cadastrado para outro funcionário.");
            } else if (updateError.message.includes('cpf')) {
              throw new Error("Este CPF já está cadastrado para outro funcionário.");
            }
          }
          throw updateError;
        }

        toast({
          title: "Funcionário atualizado!",
          description: "Dados do funcionário atualizados com sucesso",
        });
      } else {
        // Criar novo funcionário
        const { data: insertedData, error: insertError } = await supabase
          .from("employees")
          .insert([employeeData])
          .select()
          .single();

        if (insertError) {
          // Tratar erros específicos
          if (insertError.code === '23505') {
            // Violação de chave única
            if (insertError.message.includes('email')) {
              throw new Error("Este email já está cadastrado. Use um email diferente.");
            } else if (insertError.message.includes('cpf')) {
              throw new Error("Este CPF já está cadastrado. Verifique o número.");
            }
          } else if (insertError.code === '23502') {
            // Violação de NOT NULL
            throw new Error("Alguns campos obrigatórios não foram preenchidos corretamente.");
          } else if (insertError.code === '23514') {
            // Violação de CHECK constraint
            throw new Error("Alguns dados não atendem aos requisitos do sistema.");
          }
          throw insertError;
        }

        toast({
          title: "Funcionário cadastrado!",
          description: "Novo funcionário adicionado com sucesso",
        });
      }

      await loadEmployees();
      setShowForm(false);
      setEditingEmployee(null);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar funcionário:", error);
      
      let errorMessage = "Não foi possível salvar os dados do funcionário.";
      
      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes("cpf inválido") || errorMsg.includes("invalid cpf")) {
          errorMessage = "CPF inválido. Verifique o número e tente novamente.";
        } else if (errorMsg.includes("email já") || errorMsg.includes("email já cadastrado") || (errorMsg.includes("duplicate key") && errorMsg.includes("email"))) {
          errorMessage = "Este email já está cadastrado para outro funcionário. Use um email diferente.";
        } else if (errorMsg.includes("cpf já") || errorMsg.includes("cpf já cadastrado") || (errorMsg.includes("duplicate key") && errorMsg.includes("cpf"))) {
          errorMessage = "Este CPF já está cadastrado para outro funcionário. Verifique o número.";
        } else if (errorMsg.includes("not null") || errorMsg.includes("null value")) {
          errorMessage = "Alguns campos obrigatórios não foram preenchidos corretamente.";
        } else if (errorMsg.includes("check constraint") || errorMsg.includes("violates check")) {
          errorMessage = "Alguns dados não atendem aos requisitos do sistema. Verifique os campos preenchidos.";
        } else if (errorMsg.includes("permission denied") || errorMsg.includes("row-level security") || errorMsg.includes("policy")) {
          errorMessage = "Você não tem permissão para realizar esta operação. Verifique se você está logado corretamente.";
        } else if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
          errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        } else {
          errorMessage = error.message || "Erro desconhecido ao salvar funcionário.";
        }
      } else if (typeof error === 'object' && error !== null) {
        // Tratar erros do Supabase
        const supabaseError = error as any;
        if (supabaseError.code === '23505') {
          if (supabaseError.message?.includes('email')) {
            errorMessage = "Este email já está cadastrado.";
          } else if (supabaseError.message?.includes('cpf')) {
            errorMessage = "Este CPF já está cadastrado.";
          }
        } else if (supabaseError.code === '23502') {
          errorMessage = "Campos obrigatórios não preenchidos.";
        } else if (supabaseError.message) {
          errorMessage = supabaseError.message;
        }
      }

      toast({
        title: "Erro ao salvar funcionário",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      cpf: employee.cpf ? formatCPF(employee.cpf) : "",
      phone: employee.phone || "",
      address: employee.address || "",
      role: employee.role,
      position: employee.position || "",
      department: employee.department || "",
      salary: employee.salary || 0,
      hire_date: employee.hire_date || new Date().toISOString().split('T')[0],
      is_active: employee.is_active,
      notes: employee.notes || "",
      facePhoto: employee.face_photo_url,
    });
    setShowForm(true);
  };

  const handleDelete = async (employeeId: string) => {
    if (!confirm("Tem certeza que deseja excluir este funcionário?")) return;

    try {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", employeeId);

      if (error) throw error;

      toast({
        title: "Funcionário excluído!",
        description: "Funcionário removido com sucesso",
      });

      await loadEmployees();
    } catch (error) {
      console.error("Erro ao excluir funcionário:", error);
      toast({
        title: "Erro ao excluir funcionário",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetails(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      cpf: "",
      phone: "",
      address: "",
      role: "cashier",
      position: "",
      department: "",
      salary: 0,
      hire_date: new Date().toISOString().split('T')[0],
      is_active: true,
      notes: "",
      facePhoto: null,
    });
  };

  const handleCPFChange = (value: string) => {
    // Remove caracteres não numéricos
    const cleanCPF = value.replace(/[^\d]/g, '');
    // Limita a 11 dígitos
    const limitedCPF = cleanCPF.slice(0, 11);
    // Formata
    const formatted = formatCPF(limitedCPF);
    setFormData({ ...formData, cpf: formatted });
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.cpf && employee.cpf.includes(searchTerm)) ||
      (employee.phone && employee.phone.includes(searchTerm)) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.department && employee.department.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = filterRole === "all" || employee.role === filterRole;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && employee.is_active) ||
      (filterStatus === "inactive" && !employee.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeEmployees = employees.filter(e => e.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Funcionários</h2>
          <p className="text-muted-foreground">
            Sistema completo de cadastro e gestão de equipe
          </p>
        </div>
        <Dialog open={showForm} onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setEditingEmployee(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingEmployee(null);
              resetForm();
            }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Editar Funcionário" : "Novo Funcionário"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Captura de Foto Facial */}
              <div className="space-y-2">
                <Label>Foto Facial (Opcional)</Label>
                <FaceCapture
                  onCapture={(imageData) => setFormData({ ...formData, facePhoto: imageData })}
                  initialImage={formData.facePhoto}
                  required={false}
                />
                <p className="text-xs text-muted-foreground">
                  A foto facial é opcional, mas recomendada para o sistema de reconhecimento facial no registro de ponto.
                </p>
              </div>

              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dados Pessoais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome completo do funcionário"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => handleCPFChange(e.target.value)}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                    {formData.cpf && !validateCPF(formData.cpf) && (
                      <p className="text-xs text-destructive">CPF inválido</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="funcionario@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Endereço completo"
                    />
                  </div>
                </div>
              </div>

              {/* Dados Profissionais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dados Profissionais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Cargo *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: 'admin' | 'manager' | 'cashier' | 'kitchen' | 'waiter') => 
                        setFormData({ ...formData, role: value })
                      }
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
                  <div className="space-y-2">
                    <Label htmlFor="position">Posição/Função</Label>
                    <Select
                      value={formData.position}
                      onValueChange={(value) => setFormData({ ...formData, position: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a posição" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((pos) => (
                          <SelectItem key={pos} value={pos}>
                            {pos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento</Label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => setFormData({ ...formData, department: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um departamento" />
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
                  <div className="space-y-2">
                    <Label htmlFor="hire_date">Data de Admissão</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salary">Salário (R$)</Label>
                    <Input
                      id="salary"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.is_active ? "active" : "inactive"}
                      onValueChange={(value) => setFormData({ ...formData, is_active: value === "active" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações sobre o funcionário"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingEmployee(null);
                    resetForm();
                  }}
                  disabled={loading || uploadingPhoto}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || uploadingPhoto}>
                  {loading || uploadingPhoto ? (
                    "Salvando..."
                  ) : (
                    <>
                      {editingEmployee ? "Atualizar" : "Cadastrar"} Funcionário
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Funcionários</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
              <User className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Funcionários Ativos</p>
                <p className="text-2xl font-bold">{activeEmployees.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Funcionários Inativos</p>
                <p className="text-2xl font-bold">{employees.length - activeEmployees.length}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email, CPF, telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cargos</SelectItem>
                <SelectItem value="cashier">Caixa</SelectItem>
                <SelectItem value="waiter">Garçom</SelectItem>
                <SelectItem value="kitchen">Cozinha</SelectItem>
                <SelectItem value="manager">Gerente</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employees List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando funcionários...</p>
        </div>
      ) : employees.length === 0 && !loading ? (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            {tableNotFound ? (
              <>
                <AlertTriangle className="h-16 w-16 mx-auto text-destructive mb-4" />
                <h3 className="text-xl font-semibold mb-2">Tabela Não Encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  A tabela <code className="bg-muted px-2 py-1 rounded">employees</code> não existe no banco de dados.
                </p>
                <div className="bg-muted/50 border rounded-lg p-6 text-left max-w-2xl mx-auto space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Solução Rápida:
                  </h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>Acesse <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://supabase.com/dashboard</a></li>
                    <li>Abra o <strong>SQL Editor</strong> no menu lateral</li>
                    <li>Clique em <strong>"New query"</strong></li>
                    <li>Execute o script: <code className="bg-background px-2 py-1 rounded">CRIAR_TABELA_EMPLOYEES_SIMPLES.sql</code></li>
                    <li>Recarregue esta página (F5)</li>
                  </ol>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      <strong>Arquivo:</strong> <code className="bg-background px-2 py-1 rounded text-xs">CRIAR_TABELA_EMPLOYEES_SIMPLES.sql</code>
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={loadEmployees}
                  className="mt-6"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Verificar Novamente
                </Button>
              </>
            ) : (
              <>
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm || filterRole !== "all" || filterStatus !== "all"
                    ? "Nenhum funcionário encontrado com os filtros aplicados"
                    : "Nenhum funcionário cadastrado ainda"}
                </p>
                <Button 
                  variant="outline" 
                  onClick={loadEmployees}
                  className="mt-4"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Tentar Carregar Novamente
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhum funcionário encontrado com os filtros aplicados
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setFilterRole("all");
                setFilterStatus("all");
              }}
              className="mt-4"
            >
              Limpar Filtros
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {employee.face_photo_url ? (
                      <img
                        src={employee.face_photo_url}
                        alt={employee.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">{employee.name}</h3>
                      <p className="text-sm text-muted-foreground">{employee.email}</p>
                    </div>
                  </div>
                  <Badge variant={employee.is_active ? "default" : "secondary"}>
                    {employee.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                
                <div className="space-y-2 mb-4">
                  {employee.cpf && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">CPF:</span>
                      <span>{formatCPF(employee.cpf)}</span>
                    </div>
                  )}
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  {employee.department && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{employee.department}</span>
                    </div>
                  )}
                  {employee.hire_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Admissão: {format(new Date(employee.hire_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(employee)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(employee)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(employee.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Funcionário</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              {selectedEmployee.face_photo_url && (
                <div className="flex justify-center">
                  <img
                    src={selectedEmployee.face_photo_url}
                    alt={selectedEmployee.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-primary"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <p className="font-semibold">{selectedEmployee.name}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p>{selectedEmployee.email}</p>
                </div>
                {selectedEmployee.cpf && (
                  <div>
                    <Label>CPF</Label>
                    <p>{formatCPF(selectedEmployee.cpf)}</p>
                  </div>
                )}
                {selectedEmployee.phone && (
                  <div>
                    <Label>Telefone</Label>
                    <p>{selectedEmployee.phone}</p>
                  </div>
                )}
                <div>
                  <Label>Cargo</Label>
                  <p>{selectedEmployee.role}</p>
                </div>
                {selectedEmployee.position && (
                  <div>
                    <Label>Posição</Label>
                    <p>{selectedEmployee.position}</p>
                  </div>
                )}
                {selectedEmployee.department && (
                  <div>
                    <Label>Departamento</Label>
                    <p>{selectedEmployee.department}</p>
                  </div>
                )}
                {selectedEmployee.salary && (
                  <div>
                    <Label>Salário</Label>
                    <p>R$ {selectedEmployee.salary.toFixed(2)}</p>
                  </div>
                )}
                {selectedEmployee.hire_date && (
                  <div>
                    <Label>Data de Admissão</Label>
                    <p>{format(new Date(selectedEmployee.hire_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                )}
                <div>
                  <Label>Status</Label>
                  <Badge variant={selectedEmployee.is_active ? "default" : "secondary"}>
                    {selectedEmployee.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                {selectedEmployee.address && (
                  <div className="col-span-2">
                    <Label>Endereço</Label>
                    <p>{selectedEmployee.address}</p>
                  </div>
                )}
                {selectedEmployee.notes && (
                  <div className="col-span-2">
                    <Label>Observações</Label>
                    <p>{selectedEmployee.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeManagerComplete;

