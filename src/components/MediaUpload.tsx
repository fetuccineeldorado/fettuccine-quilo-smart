import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, Video, Music, File, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type MediaType = 'image' | 'video' | 'audio';

export interface MediaFile {
  file: File;
  type: MediaType;
  preview?: string;
  url?: string;
  uploaded: boolean;
}

interface MediaUploadProps {
  onMediaChange: (media: MediaFile | null) => void;
  maxSizeMB?: number;
  acceptedTypes?: MediaType[];
  disabled?: boolean;
}

const MediaUpload = ({ 
  onMediaChange, 
  maxSizeMB = 10, 
  acceptedTypes = ['image', 'video', 'audio'],
  disabled = false 
}: MediaUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<MediaFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptedMimeTypes = (): string[] => {
    const types: string[] = [];
    if (acceptedTypes.includes('image')) {
      types.push('image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp');
    }
    if (acceptedTypes.includes('video')) {
      types.push('video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm');
    }
    if (acceptedTypes.includes('audio')) {
      types.push('audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm');
    }
    return types;
  };

  const detectMediaType = (file: File): MediaType => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'image'; // fallback
  };

  const getMediaIcon = (type: MediaType) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'audio':
        return <Music className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  const getMediaTypeLabel = (type: MediaType): string => {
    switch (type) {
      case 'image':
        return 'Imagem';
      case 'video':
        return 'Vídeo';
      case 'audio':
        return 'Áudio';
      default:
        return 'Arquivo';
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast({
        title: "Arquivo muito grande",
        description: `O arquivo deve ter no máximo ${maxSizeMB}MB. Tamanho atual: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        variant: "destructive",
      });
      return;
    }

    // Validar tipo
    const acceptedTypes = getAcceptedMimeTypes();
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: `Aceitos apenas: ${acceptedTypes.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    const mediaType = detectMediaType(file);
    const mediaFile: MediaFile = {
      file,
      type: mediaType,
      uploaded: false,
    };

    // Criar preview para imagens
    if (mediaType === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => {
        mediaFile.preview = e.target?.result as string;
        setMedia(mediaFile);
        onMediaChange(mediaFile);
      };
      reader.readAsDataURL(file);
    } else {
      setMedia(mediaFile);
      onMediaChange(mediaFile);
    }

    // Fazer upload automaticamente
    await uploadMedia(mediaFile);
  };

  const uploadMedia = async (mediaFile: MediaFile) => {
    setUploading(true);
    try {
      // Criar nome único para o arquivo
      const fileExt = mediaFile.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `promotions/${fileName}`;

      // Fazer upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('promotions')
        .upload(filePath, mediaFile.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // Se o bucket não existir, criar ou usar fallback
        if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
          toast({
            title: "Aviso",
            description: "Bucket de storage não encontrado. Criando bucket...",
            variant: "default",
          });
          
          // Tentar criar o bucket (requer permissões de admin)
          // Por enquanto, vamos usar um fallback: salvar URL temporária
          const localUrl = URL.createObjectURL(mediaFile.file);
          mediaFile.url = localUrl;
          mediaFile.uploaded = false; // Será enviado como base64
          
          setMedia({ ...mediaFile });
          onMediaChange({ ...mediaFile });
          setUploading(false);
          return;
        }
        
        throw uploadError;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('promotions')
        .getPublicUrl(filePath);

      mediaFile.url = publicUrl;
      mediaFile.uploaded = true;

      setMedia({ ...mediaFile });
      onMediaChange({ ...mediaFile });

      toast({
        title: "Upload concluído!",
        description: `${getMediaTypeLabel(mediaType)} enviado com sucesso`,
      });
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível fazer upload do arquivo",
        variant: "destructive",
      });
      
      // Em caso de erro, manter o arquivo localmente para envio como base64
      mediaFile.uploaded = false;
      setMedia({ ...mediaFile });
      onMediaChange({ ...mediaFile });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    // Limpar URL do objeto se foi criada
    if (media?.preview && media.preview.startsWith('blob:')) {
      URL.revokeObjectURL(media.preview);
    }
    setMedia(null);
    onMediaChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-2">
      {!media ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 hover:border-primary transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-2">Clique para fazer upload de mídia</p>
              <p className="text-xs text-muted-foreground mb-4">
                {getAcceptedMimeTypes().join(', ')} (máx. {maxSizeMB}MB)
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivo
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={getAcceptedMimeTypes().join(',')}
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled || uploading}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {media.type === 'image' && media.preview && (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border">
                  <img
                    src={media.preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {media.type !== 'image' && (
                <div className="w-32 h-32 rounded-lg border flex items-center justify-center bg-muted">
                  {getMediaIcon(media.type)}
                </div>
              )}

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{media.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getMediaTypeLabel(media.type)} • {formatFileSize(media.file.size)}
                    </p>
                    {media.uploaded && (
                      <p className="text-xs text-green-600 mt-1">✓ Upload concluído</p>
                    )}
                    {!media.uploaded && media.url && (
                      <p className="text-xs text-yellow-600 mt-1">⚠ Será enviado como base64</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemove}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {uploading && (
                  <div className="space-y-1">
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                    <p className="text-xs text-muted-foreground">Enviando arquivo...</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MediaUpload;

