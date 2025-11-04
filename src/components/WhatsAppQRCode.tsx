/**
 * Componente para Exibir QR Code e Gerenciar Conexão WhatsApp
 */

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { whatsappConnectionService, WhatsAppConnection } from "@/utils/whatsappConnection";
import { 
  QrCode, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  LogOut,
  Settings,
  Phone,
  AlertCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface WhatsAppQRCodeProps {
  onConnected?: () => void;
}

const WhatsAppQRCode = ({ onConnected }: WhatsAppQRCodeProps) => {
  const { toast } = useToast();
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    instanceId: 'default',
    instanceName: 'Instância Principal',
    provider: 'evolution' as 'evolution' | 'whatsapp-business' | 'custom',
    apiUrl: '',
    apiKey: '',
  });
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadConnection();
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const loadConnection = async () => {
    try {
      const connections = await whatsappConnectionService.getAllConnections();
      if (connections.length > 0) {
        const current = connections[0];
        setConnection(current);
        setConfig({
          instanceId: current.instance_id,
          instanceName: current.instance_name || 'Instância Principal',
          provider: current.provider,
          apiUrl: current.api_url || '',
          apiKey: current.api_key || '',
        });

        // Se está conectando, iniciar polling
        if (current.status === 'connecting') {
          startPolling();
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conexão:', error);
      // Se a tabela não existe, mostrar mensagem
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('Could not find the table') || errorMessage.includes('PGRST205')) {
        toast({
          title: "Migração necessária",
          description: "A tabela whatsapp_connections não existe. Aplique a migração SQL primeiro.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCreateConnection = async () => {
    if (!config.apiUrl) {
      toast({
        title: "Campo obrigatório",
        description: "URL do Servidor Backend é obrigatória",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await whatsappConnectionService.createConnection(
        config.instanceId,
        config.instanceName,
        config.provider,
        config.apiUrl,
        config.apiKey
      );

      if (result.success) {
        toast({
          title: "Conexão criada",
          description: "Configuração salva com sucesso",
        });
        setShowConfig(false);
        await loadConnection();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar conexão",
        description: error.message || "Não foi possível criar a conexão",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!connection) {
      toast({
        title: "Sem conexão",
        description: "Configure uma conexão primeiro",
        variant: "destructive",
      });
      return;
    }

    if (!connection.api_url) {
      toast({
        title: "URL do servidor não configurada",
        description: "Configure a URL do servidor backend primeiro",
        variant: "destructive",
      });
      return;
    }

    setConnecting(true);
    setQrCode(null);

    try {
      // Verificar se o servidor está respondendo
      const healthUrl = connection.api_url.replace(/\/$/, '') + '/health';
      try {
        const healthCheck = await fetch(healthUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // 5 segundos de timeout
        });
        
        if (!healthCheck.ok) {
          throw new Error(`Servidor não está respondendo (${healthCheck.status})`);
        }
      } catch (healthError: any) {
        if (healthError.name === 'AbortError' || healthError.message.includes('fetch')) {
          throw new Error(`Servidor backend não está rodando em ${connection.api_url}. Inicie o servidor primeiro (cd server && npm start)`);
        }
        throw healthError;
      }

      const result = await whatsappConnectionService.generateQRCode(
        connection.instance_id,
        connection.api_url!,
        connection.api_key || ''
      );

      if (result.success && result.qrCode) {
        setQrCode(result.qrCode);
        
        // Iniciar polling para verificar status
        startPolling();

        toast({
          title: "QR Code gerado",
          description: "Escaneie o QR Code com seu WhatsApp",
        });
      } else {
        throw new Error(result.error || 'Erro ao gerar QR Code');
      }
    } catch (error: any) {
      console.error('Erro detalhado ao gerar QR Code:', error);
      toast({
        title: "Erro ao gerar QR Code",
        description: error.message || "Não foi possível gerar o QR Code. Verifique se o servidor está rodando.",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const startPolling = () => {
    // Limpar polling anterior
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Verificar status a cada 2 segundos
    pollingIntervalRef.current = setInterval(async () => {
      if (!connection) return;

      const result = await whatsappConnectionService.checkConnectionStatus(
        connection.instance_id,
        connection.api_url!,
        connection.api_key!
      );

      if (result.success && result.status === 'connected') {
        // Parar polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        setQrCode(null);
        setConnecting(false);
        
        await loadConnection();
        
        toast({
          title: "WhatsApp conectado!",
          description: `Conectado como ${result.phoneName || result.phoneNumber || 'WhatsApp'}`,
        });

        if (onConnected) {
          onConnected();
        }
      } else if (result.success && result.status === 'disconnected') {
        // Se desconectou, limpar QR Code
        setQrCode(null);
      }
    }, 2000);
  };

  const handleDisconnect = async () => {
    if (!connection) return;

    if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await whatsappConnectionService.disconnect(
        connection.instance_id,
        connection.api_url!,
        connection.api_key!
      );

      if (result.success) {
        toast({
          title: "WhatsApp desconectado",
          description: "Conexão encerrada com sucesso",
        });
        
        // Parar polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        await loadConnection();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao desconectar",
        description: error.message || "Não foi possível desconectar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: any }> = {
      connected: { label: "Conectado", variant: "default", icon: CheckCircle },
      connecting: { label: "Conectando", variant: "default", icon: RefreshCw },
      disconnected: { label: "Desconectado", variant: "secondary", icon: XCircle },
      error: { label: "Erro", variant: "destructive", icon: AlertCircle },
    };

    const config = configs[status] || configs.disconnected;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar WhatsApp
          </CardTitle>
          <CardDescription>
            Configure a conexão com o WhatsApp para enviar mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => setShowConfig(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurar Conexão
          </Button>
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-xs text-yellow-900">
              <strong>Importante:</strong> Se você está vendo erros sobre tabela não encontrada, 
              é necessário aplicar a migração SQL primeiro. Execute o arquivo: 
              <code className="bg-yellow-100 px-1 rounded">supabase/migrations/20250101000004_create_whatsapp_connection.sql</code>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Conexão WhatsApp
              </CardTitle>
              <CardDescription>
                {connection.instance_name || connection.instance_id}
              </CardDescription>
            </div>
            {getStatusBadge(connection.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {connection.status === 'connected' && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="h-5 w-5 text-green-600" />
                <p className="font-semibold text-green-900">WhatsApp Conectado</p>
              </div>
              {connection.phone_name && (
                <p className="text-sm text-green-700">
                  Nome: {connection.phone_name}
                </p>
              )}
              {connection.phone_number && (
                <p className="text-sm text-green-700">
                  Número: {connection.phone_number}
                </p>
              )}
              {connection.last_connected_at && (
                <p className="text-xs text-green-600 mt-2">
                  Conectado em: {new Date(connection.last_connected_at).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          )}

          {connection.status === 'connecting' && qrCode && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm font-medium mb-2">Escaneie o QR Code com seu WhatsApp</p>
                <div className="flex justify-center p-4 bg-white rounded-lg border-2 border-dashed">
                  <img
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64"
                    onError={(e) => {
                      console.error('Erro ao carregar QR Code');
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  1. Abra o WhatsApp no seu celular
                  <br />
                  2. Vá em Configurações → Aparelhos conectados
                  <br />
                  3. Toque em "Conectar um aparelho"
                  <br />
                  4. Escaneie este código
                </p>
              </div>
              <div className="flex justify-center">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Aguardando conexão...</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateQR}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Gerar Novo QR Code
              </Button>
            </div>
          )}
          
          {connection.status === 'connecting' && !qrCode && (
            <div className="text-center py-4">
              <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground mb-4">
                Gerando QR Code...
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setConnecting(false);
                  if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                  }
                }}
              >
                Cancelar
              </Button>
            </div>
          )}

          {connection.status === 'disconnected' && (
            <div className="text-center py-4">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                WhatsApp não está conectado
              </p>
              <Button onClick={handleGenerateQR} disabled={connecting}>
                <QrCode className="h-4 w-4 mr-2" />
                {connecting ? "Gerando QR Code..." : "Conectar WhatsApp"}
              </Button>
            </div>
          )}

          {connection.status === 'error' && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="font-semibold text-red-900">Erro na Conexão</p>
              </div>
              {connection.error_message && (
                <p className="text-sm text-red-700">{connection.error_message}</p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowConfig(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Editar Configuração
            </Button>
            {connection.status === 'connected' && (
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={loading}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            )}
            {connection.status === 'connecting' && (
              <Button
                variant="outline"
                onClick={() => {
                  if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                  }
                  setQrCode(null);
                  setConnecting(false);
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Configuração */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Conexão WhatsApp</DialogTitle>
            <DialogDescription>
              Configure os dados da sua API de WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instanceId">ID da Instância</Label>
              <Input
                id="instanceId"
                value={config.instanceId}
                onChange={(e) => setConfig(prev => ({ ...prev, instanceId: e.target.value }))}
                placeholder="default"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instanceName">Nome da Instância</Label>
              <Input
                id="instanceName"
                value={config.instanceName}
                onChange={(e) => setConfig(prev => ({ ...prev, instanceName: e.target.value }))}
                placeholder="Instância Principal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiUrl">URL do Servidor Backend *</Label>
              <Input
                id="apiUrl"
                value={config.apiUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
                placeholder="http://localhost:3001"
                required
              />
              <p className="text-xs text-muted-foreground">
                URL do servidor WhatsApp Web.js (padrão: http://localhost:3001)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">Chave (Opcional)</Label>
              <Input
                id="apiKey"
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Deixe em branco se não usar autenticação"
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco se o servidor não requer autenticação
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-900">
                <strong>Como configurar:</strong> 
                <br />1. Instale as dependências: <code>cd server && npm install</code>
                <br />2. Inicie o servidor: <code>npm start</code>
                <br />3. O servidor rodará na porta 3001 (ou configure outra porta)
                <br />4. Configure esta URL acima (ex: http://localhost:3001)
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfig(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateConnection} disabled={loading}>
                {loading ? "Salvando..." : "Salvar Configuração"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppQRCode;

