/**
 * Componente de Diagnóstico para WhatsApp
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

interface DiagnosticResult {
  name: string;
  status: 'checking' | 'success' | 'error';
  message: string;
}

export const WhatsAppDiagnostics = () => {
  const { toast } = useToast();
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [running, setRunning] = useState(false);

  const runDiagnostics = async () => {
    setRunning(true);
    const results: DiagnosticResult[] = [];

    // 1. Verificar tabela no banco
    results.push({ name: 'Tabela whatsapp_connections', status: 'checking', message: 'Verificando...' });
    setDiagnostics([...results]);
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await (supabase as any)
        .from('whatsapp_connections')
        .select('id')
        .limit(1);
      
      if (error && (error.code === 'PGRST205' || error.message?.includes('Could not find the table'))) {
        results[0] = {
          name: 'Tabela whatsapp_connections',
          status: 'error',
          message: 'Tabela não existe. Aplique a migração SQL primeiro.'
        };
      } else {
        results[0] = {
          name: 'Tabela whatsapp_connections',
          status: 'success',
          message: 'Tabela existe no banco de dados'
        };
      }
    } catch (error: any) {
      results[0] = {
        name: 'Tabela whatsapp_connections',
        status: 'error',
        message: error.message || 'Erro ao verificar tabela'
      };
    }
    setDiagnostics([...results]);

    // 2. Verificar servidor backend
    results.push({ name: 'Servidor Backend (localhost:3001)', status: 'checking', message: 'Verificando...' });
    setDiagnostics([...results]);
    
    try {
      const response = await fetch('http://localhost:3001/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        const data = await response.json();
        results[1] = {
          name: 'Servidor Backend (localhost:3001)',
          status: 'success',
          message: `Servidor rodando: ${data.status || 'OK'}`
        };
      } else {
        results[1] = {
          name: 'Servidor Backend (localhost:3001)',
          status: 'error',
          message: `Servidor retornou status ${response.status}`
        };
      }
    } catch (error: any) {
      results[1] = {
        name: 'Servidor Backend (localhost:3001)',
        status: 'error',
        message: `Servidor não está rodando. Inicie com: cd server && npm start`
      };
    }
    setDiagnostics([...results]);

    // 3. Verificar conexão configurada
    results.push({ name: 'Conexão Configurada', status: 'checking', message: 'Verificando...' });
    setDiagnostics([...results]);
    
    try {
      const { whatsappConnectionService } = await import('@/utils/whatsappConnection');
      const connections = await whatsappConnectionService.getAllConnections();
      
      if (connections.length === 0) {
        results[2] = {
          name: 'Conexão Configurada',
          status: 'error',
          message: 'Nenhuma conexão configurada. Configure em Configurações → WhatsApp'
        };
      } else {
        const conn = connections[0];
        if (!conn.api_url) {
          results[2] = {
            name: 'Conexão Configurada',
            status: 'error',
            message: 'URL do servidor não configurada'
          };
        } else {
          results[2] = {
            name: 'Conexão Configurada',
            status: 'success',
            message: `Configurada: ${conn.api_url}`
          };
        }
      }
    } catch (error: any) {
      results[2] = {
        name: 'Conexão Configurada',
        status: 'error',
        message: error.message || 'Erro ao verificar conexão'
      };
    }
    setDiagnostics([...results]);

    // 4. Testar geração de QR Code
    results.push({ name: 'Geração de QR Code', status: 'checking', message: 'Testando...' });
    setDiagnostics([...results]);
    
    try {
      const { whatsappConnectionService } = await import('@/utils/whatsappConnection');
      const connections = await whatsappConnectionService.getAllConnections();
      
      if (connections.length === 0 || !connections[0].api_url) {
        results[3] = {
          name: 'Geração de QR Code',
          status: 'error',
          message: 'Configure a conexão primeiro'
        };
      } else {
        const conn = connections[0];
        const result = await whatsappConnectionService.generateQRCode(
          conn.instance_id,
          conn.api_url!,
          conn.api_key || ''
        );
        
        if (result.success) {
          results[3] = {
            name: 'Geração de QR Code',
            status: 'success',
            message: result.qrCode ? 'QR Code gerado com sucesso' : 'Cliente já conectado'
          };
        } else {
          results[3] = {
            name: 'Geração de QR Code',
            status: 'error',
            message: result.error || 'Erro ao gerar QR Code'
          };
        }
      }
    } catch (error: any) {
      results[3] = {
        name: 'Geração de QR Code',
        status: 'error',
        message: error.message || 'Erro ao testar geração de QR Code'
      };
    }
    setDiagnostics([...results]);

    setRunning(false);
    
    const hasErrors = results.some(r => r.status === 'error');
    if (hasErrors) {
      toast({
        title: "Diagnóstico concluído",
        description: "Foram encontrados problemas. Veja os detalhes abaixo.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Diagnóstico concluído",
        description: "Todos os testes passaram!",
      });
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'checking':
        return <Badge variant="secondary">Verificando...</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500">OK</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Diagnóstico do WhatsApp
        </CardTitle>
        <CardDescription>
          Execute diagnósticos para identificar problemas na conexão WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={running}
          className="w-full"
        >
          {running ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Executando Diagnósticos...
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 mr-2" />
              Executar Diagnósticos
            </>
          )}
        </Button>

        {diagnostics.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            {diagnostics.map((diag, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className="mt-0.5">
                  {getStatusIcon(diag.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{diag.name}</p>
                    {getStatusBadge(diag.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">{diag.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

