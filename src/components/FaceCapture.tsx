import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, X, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FaceCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel?: () => void;
  initialImage?: string | null;
  required?: boolean;
}

const FaceCapture = ({ onCapture, onCancel, initialImage, required = false }: FaceCaptureProps) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(initialImage || null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    return () => {
      // Limpar stream ao desmontar
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCapturing(true);
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      
      if (errorMessage.includes('Permission denied')) {
        setError('Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.');
      } else if (errorMessage.includes('NotFoundError')) {
        setError('Nenhuma câmera encontrada. Por favor, conecte uma câmera e tente novamente.');
      } else {
        setError('Erro ao acessar a câmera. Verifique se a câmera está disponível e tente novamente.');
      }
      
      toast({
        title: "Erro ao acessar câmera",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Configurar dimensões do canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Desenhar frame do vídeo no canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Converter para base64
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    onCapture(imageData);
    stopCamera();

    toast({
      title: "Foto capturada!",
      description: "Foto frontal capturada com sucesso",
    });
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const switchCamera = async () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    await new Promise(resolve => setTimeout(resolve, 100));
    await startCamera();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Captura de Foto Facial
          {required && <span className="text-destructive">*</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} className="hidden" />

        {!capturedImage && !isCapturing ? (
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
              <div className="text-center space-y-2">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Clique para iniciar a captura
                </p>
              </div>
            </div>
            <Button onClick={startCamera} className="w-full" type="button">
              <Camera className="h-4 w-4 mr-2" />
              Iniciar Câmera
            </Button>
          </div>
        ) : !capturedImage && isCapturing ? (
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-4 border-primary rounded-lg pointer-events-none" />
            </div>
            <div className="flex gap-2">
              <Button onClick={capturePhoto} className="flex-1" type="button">
                <CheckCircle className="h-4 w-4 mr-2" />
                Capturar Foto
              </Button>
              <Button
                onClick={switchCamera}
                variant="outline"
                type="button"
                title="Alternar câmera"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button onClick={stopCamera} variant="outline" type="button">
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Posicione o rosto dentro do quadro e mantenha os olhos abertos
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-primary">
              <img
                src={capturedImage || undefined}
                alt="Foto capturada"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={retakePhoto} variant="outline" className="flex-1" type="button">
                <RotateCcw className="h-4 w-4 mr-2" />
                Tirar Nova Foto
              </Button>
              {onCancel && (
                <Button onClick={onCancel} variant="outline" type="button">
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FaceCapture;

