import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Filter, AlertTriangle, Calendar } from "lucide-react";
import { format, parseISO, differenceInHours, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimeRecord {
  id: string;
  employee_id: string;
  record_type: "entry" | "exit";
  record_date: string;
  record_time: string;
  latitude: number;
  longitude: number;
  distance_from_company: number;
  face_match_score: number;
  face_match_status: string;
  is_valid: boolean;
  created_at: string;
  employee: {
    name: string;
    position: string;
    department: string;
  };
}

interface ReportStats {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  lateEntries: number;
  earlyExits: number;
  totalHours: number;
  averageHours: number;
}

const AdminTimeReports = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-01"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    loadEmployees();
    loadRecords();
  }, [startDate, endDate, selectedEmployee]);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      let query = (supabase as any)
        .from("time_records")
        .select(`
          *,
          employee:employees(id, name, position, department)
        `)
        .gte("record_date", startDate)
        .lte("record_date", endDate)
        .order("record_date", { ascending: false })
        .order("record_time", { ascending: false });

      if (selectedEmployee !== "all") {
        query = query.eq("employee_id", selectedEmployee);
      }

      const { data, error } = await query;

      if (error) throw error;

      const processedRecords = (data || []).map((record: any) => ({
        ...record,
        employee: record.employee || {},
      }));

      setRecords(processedRecords);
      calculateStats(processedRecords);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar registros",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (recordsData: TimeRecord[]) => {
    const validRecords = recordsData.filter((r) => r.is_valid);
    const invalidRecords = recordsData.filter((r) => !r.is_valid);

    // Agrupar por funcionário e data para calcular horas
    const employeeDays = new Map<string, Map<string, { entry?: TimeRecord; exit?: TimeRecord }>>();

    validRecords.forEach((record) => {
      const employeeId = record.employee_id;
      const date = record.record_date;

      if (!employeeDays.has(employeeId)) {
        employeeDays.set(employeeId, new Map());
      }

      const dayMap = employeeDays.get(employeeId)!;
      if (!dayMap.has(date)) {
        dayMap.set(date, {});
      }

      const day = dayMap.get(date)!;
      if (record.record_type === "entry") {
        day.entry = record;
      } else {
        day.exit = record;
      }
    });

    let totalMinutes = 0;
    let dayCount = 0;
    let lateEntries = 0;
    let earlyExits = 0;

    employeeDays.forEach((days) => {
      days.forEach((day) => {
        if (day.entry && day.exit) {
          const entryTime = parseISO(`${day.entry.record_date}T${day.entry.record_time}`);
          const exitTime = parseISO(`${day.exit.record_date}T${day.exit.record_time}`);
          const minutes = differenceInMinutes(exitTime, entryTime);
          totalMinutes += minutes;
          dayCount++;

          // Verificar atrasos (entrada após 8:00)
          const expectedEntry = parseISO(`${day.entry.record_date}T08:00:00`);
          if (entryTime > expectedEntry) {
            lateEntries++;
          }

          // Verificar saídas antecipadas (saída antes de 17:00)
          const expectedExit = parseISO(`${day.exit.record_date}T17:00:00`);
          if (exitTime < expectedExit) {
            earlyExits++;
          }
        }
      });
    });

    const totalHours = totalMinutes / 60;
    const averageHours = dayCount > 0 ? totalHours / dayCount : 0;

    setStats({
      totalRecords: recordsData.length,
      validRecords: validRecords.length,
      invalidRecords: invalidRecords.length,
      lateEntries,
      earlyExits,
      totalHours,
      averageHours,
    });
  };

  const exportToCSV = () => {
    const headers = [
      "Data",
      "Hora",
      "Funcionário",
      "Cargo",
      "Departamento",
      "Tipo",
      "Válido",
      "Score Facial",
      "Distância (m)",
    ];

    const rows = records.map((record) => [
      format(parseISO(record.record_date), "dd/MM/yyyy", { locale: ptBR }),
      record.record_time,
      record.employee?.name || "N/A",
      record.employee?.position || "N/A",
      record.employee?.department || "N/A",
      record.record_type === "entry" ? "Entrada" : "Saída",
      record.is_valid ? "Sim" : "Não",
      record.face_match_score?.toFixed(2) || "N/A",
      record.distance_from_company?.toFixed(2) || "N/A",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-ponto-${startDate}-${endDate}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    // TODO: Implementar geração de PDF (usar biblioteca como jsPDF ou react-pdf)
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "Exportação para PDF será implementada em breve",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios de Ponto</h1>
        <p className="text-muted-foreground">Visualize e analise registros de ponto</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Funcionário</Label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="all">Todos</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button onClick={exportToPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalRecords}</p>
              <p className="text-xs text-muted-foreground">
                {stats.validRecords} válidos, {stats.invalidRecords} inválidos
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalHours.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">
                Média: {stats.averageHours.toFixed(1)}h/dia
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Atrasos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-600">{stats.lateEntries}</p>
              <p className="text-xs text-muted-foreground">Entradas após 8h</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Saídas Antecipadas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{stats.earlyExits}</p>
              <p className="text-xs text-muted-foreground">Saídas antes de 17h</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de Registros */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Ponto</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : (
            <div className="space-y-2">
              {records.map((record) => (
                <div
                  key={record.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    !record.is_valid ? "bg-red-50 dark:bg-red-900/20" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      record.record_type === "entry" ? "bg-green-500" : "bg-blue-500"
                    }`} />
                    <div>
                      <p className="font-semibold">
                        {record.employee?.name || "N/A"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(record.record_date), "dd/MM/yyyy", { locale: ptBR })} às{" "}
                        {record.record_time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {record.record_type === "entry" ? "Entrada" : "Saída"}
                    </p>
                    <div className="flex gap-2 items-center">
                      {!record.is_valid && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-xs px-2 py-1 rounded ${
                        record.is_valid
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {record.is_valid ? "Válido" : "Inválido"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Score: {record.face_match_score?.toFixed(0)}% | Distância:{" "}
                      {record.distance_from_company?.toFixed(0)}m
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTimeReports;

