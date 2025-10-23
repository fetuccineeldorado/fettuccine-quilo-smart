import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: 'admin' | 'manager' | 'cashier' | 'kitchen' | 'waiter';
  department: string;
  salary: number;
  hire_date: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface EmployeeFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  role: 'admin' | 'manager' | 'cashier' | 'kitchen' | 'waiter';
  department: string;
  salary: number;
  hire_date: string;
  is_active: boolean;
  notes: string;
}

const EmployeeManager = () => {
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
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    role: "cashier",
    department: "",
    salary: 0,
    hire_date: new Date().toISOString().split('T')[0],
    is_active: true,
    notes: "",
  });

  const departments = [
    "Administração",
    "Atendimento",
    "Cozinha",
    "Caixa",
    "Limpeza",
    "Gerência"
  ];

  // Load data from localStorage
  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = () => {
    try {
      const savedEmployees = localStorage.getItem('employees_data');
      if (savedEmployees) {
        setEmployees(JSON.parse(savedEmployees));
      }
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
    }
  };

  const saveEmployees = (newEmployees: Employee[]) => {
    try {
      localStorage.setItem('employees_data', JSON.stringify(newEmployees));
      setEmployees(newEmployees);
    } catch (error) {
      console.error("Erro ao salvar funcionários:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e email são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const employeeData: Employee = {
        id: editingEmployee?.id || crypto.randomUUID(),
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        role: formData.role,
        department: formData.department,
        salary: formData.salary,
        hire_date: formData.hire_date,
        is_active: formData.is_active,
        notes: formData.notes,
        created_at: editingEmployee?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let newEmployees;
      if (editingEmployee) {
        newEmployees = employees.map(e => e.id === editingEmployee.id ? employeeData : e);
        toast({
          title: "Funcionário atualizado!",
          description: "Dados do funcionário atualizados com sucesso",
        });
      } else {
        newEmployees = [...employees, employeeData];
        toast({
          title: "Funcionário cadastrado!",
          description: "Novo funcionário adicionado com sucesso",
        });
      }

      saveEmployees(newEmployees);
      setShowForm(false);
      setEditingEmployee(null);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar funcionário:", error);
      toast({
        title: "Erro ao salvar funcionário",
        description: "Não foi possível salvar os dados",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      address: employee.address,
      role: employee.role,
      department: employee.department,
      salary: employee.salary,
      hire_date: employee.hire_date,
      is_active: employee.is_active,
      notes: employee.notes,
    });
    setShowForm(true);
  };

  const handleDelete = async (employeeId: string) => {
    if (!confirm("Tem certeza que deseja excluir este funcionário?")) return;

    try {
      const newEmployees = employees.filter(e => e.id !== employeeId);
      saveEmployees(newEmployees);

      toast({
        title: "Funcionário excluído!",
        description: "Funcionário removido com sucesso",
      });
    } catch (error) {
      console.error("Erro ao excluir funcionário:", error);
      toast({
        title: "Erro ao excluir funcionário",
        description: "Não foi possível excluir o funcionário",
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
      phone: "",
      address: "",
      role: "cashier",
      department: "",
      salary: 0,
      hire_date: new Date().toISOString().split('T')[0],
      is_active: true,
      notes: "",
    });
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case "admin":
        return { label: "Administrador", color: "bg-red-100 text-red-800", icon: Shield };
      case "manager":
        return { label: "Gerente", color: "bg-blue-100 text-blue-800", icon: User };
      case "cashier":
        return { label: "Caixa", color: "bg-green-100 text-green-800", icon: Clock };
      case "kitchen":
        return { label: "Cozinha", color: "bg-orange-100 text-orange-800", icon: User };
      case "waiter":
        return { label: "Garçom", color: "bg-purple-100 text-purple-800", icon: User };
      default:
        return { label: "Funcionário", color: "bg-gray-100 text-gray-800", icon: User };
    }
  };

  const getStatusInfo = (isActive: boolean) => {
    return isActive 
      ? { label: "Ativo", color: "default", icon: CheckCircle }
      : { label: "Inativo", color: "secondary", icon: XCircle };
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === "all" || employee.role === filterRole;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && employee.is_active) ||
      (filterStatus === "inactive" && !employee.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeEmployees = employees.filter(e => e.is_active);
  const totalSalary = employees.reduce((sum, e) => sum + e.salary, 0);
  const averageSalary = employees.length > 0 ? totalSalary / employees.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Funcionários</h2>
          <p className="text-muted-foreground">
            Sistema completo de gestão de equipe
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingEmployee(null);
                resetForm();
              }}>
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? "Editar Funcionário" : "Novo Funcionário"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do funcionário"
                      required
                    />
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
                    <Label htmlFor="salary">Salário (R$)</Label>
                    <Input
                      id="salary"
                      type="number"
                      step="0.01"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hire_date">Data de Contratação</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
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
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Endereço completo"
                  />
                </div>
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
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingEmployee ? "Atualizar" : "Cadastrar"} Funcionário
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <p className="text-sm text-muted-foreground">Folha de Pagamento</p>
                <p className="text-2xl font-bold">R$ {totalSalary.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Salário Médio</p>
                <p className="text-2xl font-bold">R$ {averageSalary.toFixed(2)}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar funcionários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Cargos</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="cashier">Caixa</SelectItem>
                  <SelectItem value="kitchen">Cozinha</SelectItem>
                  <SelectItem value="waiter">Garçom</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((employee) => {
          const roleInfo = getRoleInfo(employee.role);
          const statusInfo = getStatusInfo(employee.is_active);
          const StatusIcon = statusInfo.icon;
          
          return (
            <Card key={employee.id} className="shadow-soft hover:shadow-lg transition-smooth">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{employee.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{employee.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={statusInfo.color as any} className="text-xs">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className={roleInfo.color}>
                    {roleInfo.label}
                  </Badge>
                  {employee.department && (
                    <Badge variant="outline" className="text-xs">
                      {employee.department}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2 text-sm">
                  {employee.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  {employee.salary > 0 && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>R$ {employee.salary.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(employee.hire_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(employee)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(employee)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(employee.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Employee Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Funcionário</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Nome</Label>
                  <p className="text-sm">{selectedEmployee.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm">{selectedEmployee.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Telefone</Label>
                  <p className="text-sm">{selectedEmployee.phone || "Não informado"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Cargo</Label>
                  <p className="text-sm">{getRoleInfo(selectedEmployee.role).label}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Departamento</Label>
                  <p className="text-sm">{selectedEmployee.department || "Não informado"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Salário</Label>
                  <p className="text-sm">R$ {selectedEmployee.salary.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Data de Contratação</Label>
                  <p className="text-sm">{format(new Date(selectedEmployee.hire_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm">{selectedEmployee.is_active ? "Ativo" : "Inativo"}</p>
                </div>
              </div>
              {selectedEmployee.address && (
                <div>
                  <Label className="text-sm font-medium">Endereço</Label>
                  <p className="text-sm">{selectedEmployee.address}</p>
                </div>
              )}
              {selectedEmployee.notes && (
                <div>
                  <Label className="text-sm font-medium">Observações</Label>
                  <p className="text-sm">{selectedEmployee.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              {searchTerm || filterRole !== "all" || filterStatus !== "all" 
                ? "Nenhum funcionário encontrado" 
                : "Nenhum funcionário cadastrado"
              }
            </p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || filterRole !== "all" || filterStatus !== "all"
                ? "Tente ajustar os filtros de busca"
                : "Clique em 'Novo Funcionário' para começar"
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeManager;
