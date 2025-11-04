import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Camera, X, CheckCircle, AlertCircle, MapPin } from "lucide-react";
import { validateCPF, formatCPF, cleanCPF } from "@/utils/cpfValidator";
import { captureFacePhoto, validateFaceInPhoto, extractFaceEncoding } from "@/utils/faceRecognition";
import logger from "@/utils/logger";

interface EmployeeFormData {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  role: string;
  department: string;
  hire_date: string;
  salary: string;
  notes: string;
}

interface EmployeeFormAdvancedProps {
  employeeId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EmployeeFormAdvanced = ({ employeeId, onSuccess, onCancel }: EmployeeFormAdvancedProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [cpfValid, setCpfValid] = useState<boolean | null>(null);
  const [cpfError, setCpfError] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [formData, setFormData] = useState<EmployeeFormData>({
    name: "",
    cpf: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    role: "cashier",
    department: "",
    hire_date: new Date().toISOString().split('T')[0],
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
    "Segurança",
  ];

  const roles = [
    { value: "admin", label: "Administrador" },
    { value: "manager", label: "Gerente" },
    { value: "cashier", label: "Caixa" },
    { value: "kitchen", label: "Cozinha" },
    { value: "waiter", label: "Garçom" },
    { value: "security", label: "Segurança" },
  ];

  const states = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  useEffect(() => {
    if (employeeId) {
      loadEmployeeData();
    }
    return () => {
      // Limpar stream ao desmontar
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
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
          city: data.city || "",
          state: data.state || "",
          zip_code: data.zip_code || "",
          role: data.role || "cashier",
          department: data.department || "",
          hire_date: data.hire_date ? new Date(data.hire_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          salary: data.salary ? data.salary.toString() : "",
          notes: data.notes || "",
        });

        if (data.facial_photo_url) {
          setPhotoUrl(data.facial_photo_url);
        }

        // Validar CPF existente
        if (data.cpf) {
          const isValid = validateCPF(data.cpf);
          setCpfValid(isValid);
        }
      }
    } catch (error) {
      logger.error("Erro ao carregar dados do funcionário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do funcionário",
        variant: "destructive",
      });
    }
  };

  const handleCPFChange = (value: string) => {
    const formatted = formatCPF(value);
    setFormData({ ...formData, cpf: formatted });
    
    const cleaned = cleanCPF(value);
    if (cleaned.length === 11) {
      const isValid = validateCPF(cleaned);
      setCpfValid(isValid);
      setCpfError(isValid ? "" : "CPF inválido");
    } else {
      setCpfValid(null);
      setCpfError("");
    }
  };

  const startCamera = async () => {
    try {
      setCapturingPhoto(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      logger.error("Erro ao acessar câmera:", error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar a câmera. Verifique as permissões.",
        variant: "destructive",
      });
      setCapturingPhoto(false);
    }
  };

  const capturePhoto = async () => {
    try {
      if (!videoRef.current || !canvasRef.current) {
        throw new Error("Elementos de vídeo/canvas não encontrados");
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error("Não foi possível criar contexto do canvas");
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      // Converter para base64
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      // Validar se contém rosto
      const hasFace = await validateFaceInPhoto(photoDataUrl);
      if (!hasFace) {
        toast({
          title: "Foto inválida",
          description: "Não foi possível detectar um rosto na foto. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      setPhotoData(photoDataUrl);
      setPhotoUrl(photoDataUrl);

      // Parar câmera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setCapturingPhoto(false);

      toast({
        title: "Foto capturada!",
        description: "Foto frontal capturada com sucesso",
      });
    } catch (error) {
      logger.error("Erro ao capturar foto:", error);
      toast({
        title: "Erro",
        description: "Não foi possível capturar a foto",
        variant: "destructive",
      });
    }
  };

  const cancelPhotoCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCapturingPhoto(false);
  };

  const removePhoto = () => {
    setPhotoData(null);
    setPhotoUrl(null);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoData) return null;

    try {
      // Criar nome único para o arquivo
      const fileName = `employees/${employeeId || Date.now()}/${Date.now()}.jpg`;
      
      // Converter base64 para blob
      const response = await fetch(photoData);
      const blob = await response.blob();

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('employee-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      logger.error("Erro ao fazer upload da foto:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações
      if (!formData.name.trim()) {
        throw new Error("Nome é obrigatório");
      }

      if (!validateCPF(formData.cpf)) {
        throw new Error("CPF inválido");
      }

      if (!formData.email.trim()) {
        throw new Error("E-mail é obrigatório");
      }

      if (!formData.department.trim()) {
        throw new Error("Departamento é obrigatório");
      }

      // Verificar se CPF já existe (apenas para novos funcionários)
      if (!employeeId) {
        const { data: existing } = await supabase
          .from("employees")
          .select("id")
          .eq("cpf", cleanCPF(formData.cpf))
          .single();

        if (existing) {
          throw new Error("CPF já cadastrado");
        }

        // Verificar se e-mail já existe
        const { data: existingEmail } = await supabase
          .from("employees")
          .select("id")
          .eq("email", formData.email)
          .single();

        if (existingEmail) {
          throw new Error("E-mail já cadastrado");
        }
      }

      // Upload da foto se houver
      let facialPhotoUrl = photoUrl;
      if (photoData && !photoUrl?.startsWith('http')) {
        facialPhotoUrl = await uploadPhoto();
      }

      // Extrair encoding facial se houver foto
      let facialEncoding = null;
      if (photoData) {
        const encoding = await extractFaceEncoding(photoData);
        if (encoding) {
          facialEncoding = JSON.stringify(encoding);
        }
      }

      // Preparar dados para inserção
      const employeeData: any = {
        name: formData.name.trim(),
        cpf: cleanCPF(formData.cpf),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state || null,
        zip_code: formData.zip_code.trim() || null,
        role: formData.role,
        department: formData.department.trim(),
        hire_date: formData.hire_date,
        salary: formData.salary ? parseFloat(formData.salary) : null,
        notes: formData.notes.trim() || null,
        facial_photo_url: facialPhotoUrl,
        facial_encoding: facialEncoding,
      };

      // Obter sessão do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        if (!employeeId) {
          employeeData.created_by = session.user.id;
        }
      }

      let result;
      if (employeeId) {
        // Atualizar funcionário existente
        const { data, error } = await supabase
          .from("employees")
          .update(employeeData)
          .eq("id", employeeId)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Criar novo funcionário
        const { data, error } = await supabase
          .from("employees")
          .insert([employeeData])
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      toast({
        title: "Sucesso!",
        description: employeeId ? "Funcionário atualizado com sucesso" : "Funcionário cadastrado com sucesso",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      logger.error("Erro ao salvar funcionário:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o funcionário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <div className="relative">
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleCPFChange(e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
                {cpfValid !== null && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {cpfValid ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {cpfError && (
                <p className="text-sm text-red-500">{cpfError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData({ ...formData, state: value })}
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
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                placeholder="00000-000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Profissionais */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Profissionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Cargo *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
              <Label htmlFor="hire_date">Data de Admissão *</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                required
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
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Foto Facial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Foto para Reconhecimento Facial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!capturingPhoto && !photoUrl && (
            <Button
              type="button"
              onClick={startCamera}
              variant="outline"
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Capturar Foto Frontal
            </Button>
          )}

          {capturingPhoto && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-auto"
                  style={{ maxHeight: '400px' }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capturar
                </Button>
                <Button
                  type="button"
                  onClick={cancelPhotoCapture}
                  variant="outline"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {photoUrl && !capturingPhoto && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={photoUrl}
                  alt="Foto do funcionário"
                  className="w-full max-w-md mx-auto rounded-lg border"
                />
                <Button
                  type="button"
                  onClick={removePhoto}
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="button"
                onClick={startCamera}
                variant="outline"
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capturar Nova Foto
              </Button>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            A foto será usada para reconhecimento facial no registro de ponto.
          </p>
        </CardContent>
      </Card>

      <canvas ref={canvasRef} className="hidden" />

      {/* Botões */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="outline">
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading || cpfValid === false}>
          {loading ? "Salvando..." : employeeId ? "Atualizar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
};

export default EmployeeFormAdvanced;

