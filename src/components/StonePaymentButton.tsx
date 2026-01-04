import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Smartphone, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { stonePaymentService } from "@/services/stonePayment";

interface StonePaymentButtonProps {
  amount: number;
  orderId: string;
  customerName?: string;
  onPaymentSuccess?: (transactionId: string) => void;
  onPaymentError?: (error: string) => void;
  disabled?: boolean;
}

type PaymentMethod = 'credit' | 'debit' | 'pix';
type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

const StonePaymentButton = ({
  amount,
  orderId,
  customerName,
  onPaymentSuccess,
  onPaymentError,
  disabled = false
}: StonePaymentButtonProps) => {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const paymentMethods = [
    {
      id: 'credit' as PaymentMethod,
      label: 'Crédito',
      icon: CreditCard,
      description: 'Pagamento em até 12x',
      color: 'bg-blue-500'
    },
    {
      id: 'debit' as PaymentMethod,
      label: 'Débito',
      icon: CreditCard,
      description: 'Débito na conta',
      color: 'bg-green-500'
    },
    {
      id: 'pix' as PaymentMethod,
      label: 'PIX',
      icon: Smartphone,
      description: 'Transferência instantânea',
      color: 'bg-purple-500'
    }
  ];

  const handlePayment = async (method: PaymentMethod) => {
    setSelectedMethod(method);
    setPaymentStatus('processing');
    setErrorMessage(null);
    setTransactionId(null);

    try {
      console.log(`💳 Iniciando pagamento ${method} no valor de R$ ${amount.toFixed(2)}`);

      const response = await stonePaymentService.processPayment({
        amount,
        paymentMethod: method,
        orderId,
        customerName
      });

      if (response.success && response.transactionId) {
        setTransactionId(response.transactionId);
        setPaymentStatus('success');
        
        toast({
          title: "✅ Pagamento aprovado!",
          description: response.message || `Pagamento de R$ ${amount.toFixed(2)} aprovado via ${method}`,
        });

        onPaymentSuccess?.(response.transactionId);
      } else {
        setErrorMessage(response.error || 'Erro no pagamento');
        setPaymentStatus('error');
        
        toast({
          title: "❌ Pagamento recusado",
          description: response.error || 'Transação não autorizada',
          variant: "destructive",
        });

        onPaymentError?.(response.error || 'Erro no pagamento');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      setErrorMessage(errorMsg);
      setPaymentStatus('error');
      
      toast({
        title: "❌ Erro no pagamento",
        description: errorMsg,
        variant: "destructive",
      });

      onPaymentError?.(errorMsg);
    }
  };

  const resetPayment = () => {
    setSelectedMethod(null);
    setPaymentStatus('idle');
    setTransactionId(null);
    setErrorMessage(null);
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'processing':
        return <Loader2 className="h-6 w-6 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
    }
  };

  const isConfigured = stonePaymentService.isConfigured();
  const config = stonePaymentService.getConfiguration();

  if (!isConfigured) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="h-5 w-5" />
            Stone não configurado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-yellow-700">
            <p>Para usar o pagamento Stone, configure as credenciais:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>VITE_STONE_MERCHANT_ID: {config.merchantId}</li>
              <li>VITE_STONE_TERMINAL_SERIAL: {config.terminalSerial}</li>
              <li>Ambiente: {config.environment}</li>
            </ul>
            <p className="text-xs mt-2">
              Adicione estas variáveis no arquivo .env e reinicie o servidor.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pagamento Stone
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Ambiente: {config.environment}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Terminal: {config.terminalSerial}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentStatus === 'idle' && (
          <>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary mb-2">
                R$ {amount.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                Selecione a forma de pagamento
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.id}
                    variant="outline"
                    className="h-16 justify-start gap-3 p-4"
                    onClick={() => handlePayment(method.id)}
                    disabled={disabled}
                  >
                    <div className={`p-2 rounded-lg ${method.color} bg-opacity-10`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{method.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {method.description}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </>
        )}

        {paymentStatus === 'processing' && (
          <div className="text-center space-y-4">
            {getStatusIcon()}
            <div>
              <p className="font-semibold">Processando pagamento...</p>
              <p className="text-sm text-muted-foreground">
                Aguardando resposta da máquina Stone
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Forma: {selectedMethod && paymentMethods.find(m => m.id === selectedMethod)?.label}
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="text-center space-y-4">
            {getStatusIcon()}
            <div>
              <p className="font-semibold text-green-600">Pagamento aprovado!</p>
              <p className="text-sm text-muted-foreground">
                R$ {amount.toFixed(2)} via {selectedMethod && paymentMethods.find(m => m.id === selectedMethod)?.label}
              </p>
              {transactionId && (
                <p className="text-xs text-muted-foreground mt-2">
                  ID da transação: {transactionId}
                </p>
              )}
            </div>
            <Button onClick={resetPayment} variant="outline" size="sm">
              Novo pagamento
            </Button>
          </div>
        )}

        {paymentStatus === 'error' && (
          <div className="text-center space-y-4">
            {getStatusIcon()}
            <div>
              <p className="font-semibold text-red-600">Pagamento recusado</p>
              <p className="text-sm text-muted-foreground">
                {errorMessage || 'Erro na transação'}
              </p>
            </div>
            <Button onClick={resetPayment} variant="outline" size="sm">
              Tentar novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StonePaymentButton;
