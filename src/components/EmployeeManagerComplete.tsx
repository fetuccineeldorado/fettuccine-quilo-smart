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
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEmployees(data || []);
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
      toast({
        title: "Erro ao carregar funcionários",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from("employee-photos")
        .upload(filePath, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) throw error;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from("employee-photos")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload da foto:", error);
      throw error;
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

      // Validar CPF se fornecido
      if (formData.cpf && !validateCPF(formData.cpf)) {
        toast({
          title: "CPF inválido",
          description: "Por favor, insira um CPF válido",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Verificar se email já existe (se não estiver editando)
      if (!editingEmployee) {
        const { data: existingEmail } = await supabase
          .from("employees")
          .select("id")
          .eq("email", formData.email)
          .single();

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

      // Verificar se CPF já existe (se fornecido e não estiver editando)
      if (formData.cpf && !editingEmployee) {
        const { data: existingCPF } = await supabase
          .from("employees")
          .select("id")
          .eq("cpf", formData.cpf.replace(/[^\d]/g, ''))
          .single();

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
      const employeeData: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        cpf: formData.cpf ? formData.cpf.replace(/[^\d]/g, '') : null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        role: formData.role,
        position: formData.position.trim() || null,
        department: formData.department || null,
        salary: formData.salary > 0 ? formData.salary : null,
        hire_date: formData.hire_date || null,
        is_active: formData.is_active,
        notes: formData.notes.trim() || null,
        face_photo_url: photoUrl,
        created_by: session.user.id,
      };

      if (editingEmployee) {
        // Atualizar funcionário existente
        const { error: updateError } = await supabase
          .from("employees")
          .update(employeeData)
          .eq("id", editingEmployee.id);

        if (updateError) throw updateError;

        toast({
          title: "Funcionário atualizado!",
          description: "Dados do funcionário atualizados com sucesso",
        });
      } else {
        // Criar novo funcionário
        const { error: insertError } = await supabase
          .from("employees")
          .insert([employeeData])
          .select()
          .single();

        if (insertError) throw insertError;

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
      
      let errorMessage = "Não foi possível salvar os dados";
      if (error instanceof Error) {
        if (error.message.includes("CPF inválido")) {
          errorMessage = "CPF inválido. Verifique o número e tente novamente.";
        } else if (error.message.includes("duplicate key")) {
          if (error.message.includes("email")) {
            errorMessage = "Este email já está cadastrado.";
          } else if (error.message.includes("cpf")) {
            errorMessage = "Este CPF já está cadastrado.";
          }
        } else {
          errorMessage = error.message;
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
              <FaceCapture
                onCapture={(imageData) => setFormData({ ...formData, facePhoto: imageData })}
                initialImage={formData.facePhoto}
                required={!editingEmployee}
              />

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
      ) : filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || filterRole !== "all" || filterStatus !== "all"
                ? "Nenhum funcionário encontrado com os filtros aplicados"
                : "Nenhum funcionário cadastrado ainda"}
            </p>
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

