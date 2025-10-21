import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { UserPlus, Plus, Search, Shield, Clock, DollarSign, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  salary: number;
  hire_date: string;
  status: string;
  total_orders_processed: number;
  total_revenue_generated: number;
  last_login: string;
}

const Employees = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    phone: "",
    role: "operator",
    salary: 0,
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Erro ao carregar funcionários",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEmployees(data || []);
    }
    setLoading(false);
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e email são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("employees")
      .insert([{
        ...newEmployee,
        hire_date: new Date().toISOString(),
        status: "active",
        total_orders_processed: 0,
        total_revenue_generated: 0,
        last_login: new Date().toISOString(),
      }]);

    if (error) {
      toast({
        title: "Erro ao adicionar funcionário",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Funcionário adicionado!",
        description: "Novo funcionário cadastrado com sucesso",
      });
      setNewEmployee({
        name: "",
        email: "",
        phone: "",
        role: "operator",
        salary: 0,
      });
      setShowAddForm(false);
      fetchEmployees();
    }
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case "admin":
        return { label: "Administrador", color: "bg-red-100 text-red-800", icon: Shield };
      case "manager":
        return { label: "Gerente", color: "bg-blue-100 text-blue-800", icon: User };
      case "operator":
        return { label: "Operador", color: "bg-green-100 text-green-800", icon: Clock };
      default:
        return { label: "Funcionário", color: "bg-gray-100 text-gray-800", icon: User };
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "active":
        return { label: "Ativo", color: "default" };
      case "inactive":
        return { label: "Inativo", color: "secondary" };
      case "on_leave":
        return { label: "Afastado", color: "outline" };
      default:
        return { label: "Desconhecido", color: "secondary" };
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topPerformers = employees
    .filter(emp => emp.status === "active")
    .sort((a, b) => b.total_revenue_generated - a.total_revenue_generated)
    .slice(0, 5);

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Funcionários</h1>
            <p className="text-muted-foreground text-lg">
              Gerenciamento de equipe e funcionários
            </p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Funcionário
          </Button>
        </div>

        {/* Search */}
        <Card className="shadow-soft">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionários por nome, email ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Add Employee Form */}
        {showAddForm && (
          <Card className="shadow-strong">
            <CardHeader>
              <CardTitle>Adicionar Novo Funcionário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    placeholder="Nome do funcionário"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    placeholder="funcionario@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={newEmployee.phone}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Cargo</Label>
                  <Select value={newEmployee.role} onValueChange={(value) => setNewEmployee({ ...newEmployee, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operator">Operador</SelectItem>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Salário (R$)</Label>
                  <Input
                    id="salary"
                    type="number"
                    step="0.01"
                    value={newEmployee.salary}
                    onChange={(e) => setNewEmployee({ ...newEmployee, salary: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddEmployee}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Funcionário
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Performers */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((employee, index) => {
                const roleInfo = getRoleInfo(employee.role);
                return (
                  <div key={employee.id} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={roleInfo.color}>
                        {roleInfo.label}
                      </Badge>
                      <p className="text-sm font-semibold">R$ {employee.total_revenue_generated.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Employees List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => {
            const roleInfo = getRoleInfo(employee.role);
            const statusInfo = getStatusInfo(employee.status);
            const Icon = roleInfo.icon;
            return (
              <Card key={employee.id} className="shadow-soft hover:shadow-lg transition-smooth">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{employee.name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant={statusInfo.color as any}>
                        {statusInfo.label}
                      </Badge>
                      <Badge className={roleInfo.color}>
                        {roleInfo.label}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{employee.email}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Icon className="h-4 w-4 text-primary" />
                    <span>{employee.role}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-success" />
                    <span>R$ {employee.total_revenue_generated.toFixed(2)} gerados</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{employee.total_orders_processed} pedidos processados</span>
                  </div>
                  {employee.phone && (
                    <div className="text-sm text-muted-foreground">
                      📞 {employee.phone}
                    </div>
                  )}
                  <div className="pt-2 border-t space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Admitido: {format(new Date(employee.hire_date), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Último login: {format(new Date(employee.last_login), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </div>
                    {employee.salary > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Salário: R$ {employee.salary.toFixed(2)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredEmployees.length === 0 && !loading && (
          <Card className="text-center py-12">
            <CardContent>
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "Nenhum funcionário encontrado" : "Nenhum funcionário cadastrado"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? "Tente ajustar os termos de busca"
                  : "Comece cadastrando os funcionários da equipe"
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowAddForm(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Cadastrar Primeiro Funcionário
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Employees;
