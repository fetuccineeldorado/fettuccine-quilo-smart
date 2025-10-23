import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  BarChart3, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Download,
  Filter,
  Shield,
  Clock,
  User,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier' | 'kitchen' | 'waiter';
  department: string;
  salary: number;
  hire_date: string;
  is_active: boolean;
  created_at: string;
}

interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  totalSalary: number;
  averageSalary: number;
  byRole: Record<string, number>;
  byDepartment: Record<string, number>;
  recentHires: Employee[];
  topEarners: Employee[];
}

const EmployeeReports = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = () => {
    try {
      const savedEmployees = localStorage.getItem('employees_data');
      if (savedEmployees) {
        const data = JSON.parse(savedEmployees);
        setEmployees(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
    }
  };

  const calculateStats = (employeeData: Employee[]) => {
    const total = employeeData.length;
    const active = employeeData.filter(e => e.is_active).length;
    const inactive = total - active;
    const totalSalary = employeeData.reduce((sum, e) => sum + e.salary, 0);
    const averageSalary = total > 0 ? totalSalary / total : 0;

    // Group by role
    const byRole = employeeData.reduce((acc, emp) => {
      acc[emp.role] = (acc[emp.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by department
    const byDepartment = employeeData.reduce((acc, emp) => {
      if (emp.department) {
        acc[emp.department] = (acc[emp.department] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Recent hires (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentHires = employeeData
      .filter(e => new Date(e.hire_date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.hire_date).getTime() - new Date(a.hire_date).getTime())
      .slice(0, 5);

    // Top earners
    const topEarners = employeeData
      .filter(e => e.salary > 0)
      .sort((a, b) => b.salary - a.salary)
      .slice(0, 5);

    setStats({
      total,
      active,
      inactive,
      totalSalary,
      averageSalary,
      byRole,
      byDepartment,
      recentHires,
      topEarners,
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

  const exportToCSV = () => {
    const csvContent = [
      ["Nome", "Email", "Cargo", "Departamento", "Salário", "Data Contratação", "Status"],
      ...employees.map(emp => [
        emp.name,
        emp.email,
        emp.role,
        emp.department || "",
        emp.salary.toString(),
        format(new Date(emp.hire_date), "dd/MM/yyyy", { locale: ptBR }),
        emp.is_active ? "Ativo" : "Inativo"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `funcionarios_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesDepartment = filterDepartment === "all" || emp.department === filterDepartment;
    const matchesRole = filterRole === "all" || emp.role === filterRole;
    return matchesDepartment && matchesRole;
  });

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando relatórios...</p>
        </CardContent>
      </Card>
      );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Relatórios de Funcionários</h2>
          <p className="text-muted-foreground">
            Análises e estatísticas da equipe
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Funcionários</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Funcionários Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Folha de Pagamento</p>
                <p className="text-2xl font-bold">R$ {stats.totalSalary.toFixed(2)}</p>
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
                <p className="text-2xl font-bold">R$ {stats.averageSalary.toFixed(2)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Departamentos</SelectItem>
                  {Object.keys(stats.byDepartment).map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os cargos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Cargos</SelectItem>
                  {Object.keys(stats.byRole).map(role => (
                    <SelectItem key={role} value={role}>
                      {getRoleInfo(role).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Períodos</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution by Role */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Cargo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byRole).map(([role, count]) => {
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                const roleInfo = getRoleInfo(role);
                return (
                  <div key={role} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={roleInfo.color}>
                          {roleInfo.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {count} funcionário{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Distribution by Department */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.byDepartment).map(([dept, count]) => {
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={dept} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{dept}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {count} funcionário{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Hires */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Contratações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentHires.length > 0 ? (
                stats.recentHires.map((employee) => {
                  const roleInfo = getRoleInfo(employee.role);
                  return (
                    <div key={employee.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={roleInfo.color} variant="outline">
                          {roleInfo.label}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(employee.hire_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma contratação recente
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Earners */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Maiores Salários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topEarners.length > 0 ? (
                stats.topEarners.map((employee, index) => (
                  <div key={employee.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">{employee.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">R$ {employee.salary.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{employee.department}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum salário cadastrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Funcionários ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredEmployees.map((employee) => {
              const roleInfo = getRoleInfo(employee.role);
              return (
                <div key={employee.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {employee.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{employee.name}</p>
                      <p className="text-sm text-muted-foreground">{employee.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={roleInfo.color}>
                      {roleInfo.label}
                    </Badge>
                    {employee.salary > 0 && (
                      <span className="text-sm font-medium">
                        R$ {employee.salary.toFixed(2)}
                      </span>
                    )}
                    <Badge variant={employee.is_active ? "default" : "secondary"}>
                      {employee.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeReports;
