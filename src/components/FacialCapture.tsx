import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FacialCaptureProps {
  onCapture: (photoUrl: string, facialEncoding?: any) => void;
  onCancel?: () => void;
  existingPhotoUrl?: string;
}

const FacialCapture = ({ onCapture, onCancel, existingPhotoUrl }: FacialCaptureProps) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(existingPhotoUrl || null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // Limpar stream quando componente desmontar
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
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user", // Câmera frontal
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
      toast({
        title: "Erro ao acessar câmera",
        description: "Permita o acesso à câmera para capturar a foto.",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Configurar dimensões do canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Desenhar frame do vídeo no canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Converter para base64
    const capturedPhotoUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPhotoUrl(capturedPhotoUrl);

    // Parar stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    // Gerar encoding facial simplificado (placeholder)
    // Em produção, usar biblioteca como face-api.js ou serviço de reconhecimento facial
    const facialEncoding = {
      timestamp: new Date().toISOString(),
      version: "1.0",
      // Em produção, aqui viria o encoding real do reconhecimento facial
      placeholder: true,
    };

    onCapture(capturedPhotoUrl, facialEncoding);
    setIsCapturing(false);
  };

  const retakePhoto = () => {
    setPhotoUrl(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (photoUrl) {
      onCapture(photoUrl);
    }
  };

  if (photoUrl && !stream) {
    // Mostrar foto capturada
    return (
      <div className="space-y-4">
        <div className="relative w-full max-w-md mx-auto">
          <img
            src={photoUrl}
            alt="Foto capturada"
            className="w-full rounded-lg border-2 border-primary"
          />
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-2">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>
        <div className="flex gap-2 justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={retakePhoto}
          >
            <X className="h-4 w-4 mr-2" />
            Refazer
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Confirmar
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {!stream && !photoUrl && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
            <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Clique para capturar uma foto frontal do funcionário
            </p>
            <Button
              type="button"
              onClick={startCamera}
              disabled={isCapturing}
            >
              <Camera className="h-4 w-4 mr-2" />
              Iniciar Câmera
            </Button>
          </div>
        </div>
      )}

      {stream && (
        <div className="space-y-4">
          <div className="relative w-full max-w-md mx-auto">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg border-2 border-primary"
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-4 border-primary/50 rounded-lg" />
              {/* Overlay para guiar posicionamento do rosto */}
              <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-2 border-white/50 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <Button
              type="button"
              onClick={capturePhoto}
              size="lg"
            >
              <Camera className="h-4 w-4 mr-2" />
              Capturar Foto
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    setStream(null);
                  }
                  onCancel();
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Posicione o rosto no centro do círculo e mantenha os olhos abertos
          </p>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default FacialCapture;

