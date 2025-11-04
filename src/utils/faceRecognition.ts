/**
 * Utilitário para reconhecimento facial
 * Usa a API do navegador para capturar e processar imagens faciais
 */

export interface FaceEncoding {
  data: Float32Array | number[];
  confidence: number;
}

/**
 * Captura foto do usuário usando a câmera
 */
export async function captureFacePhoto(): Promise<string> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user', // Câmera frontal
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;

    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve(null);
      };
    });

    // Aguardar um momento para garantir que a câmera está pronta
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Capturar frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Não foi possível criar contexto do canvas');
    }

    ctx.drawImage(video, 0, 0);
    
    // Parar a stream
    stream.getTracks().forEach((track) => track.stop());

    // Converter para base64
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch (error) {
    console.error('Erro ao capturar foto:', error);
    throw new Error('Não foi possível acessar a câmera. Verifique as permissões.');
  }
}

/**
 * Processa imagem facial para extrair encoding
 * Nota: Esta é uma implementação básica. Para produção, use uma biblioteca como face-api.js ou TensorFlow.js
 */
export async function extractFaceEncoding(imageData: string): Promise<FaceEncoding | null> {
  try {
    // Carregar imagem
    const img = new Image();
    img.src = imageData;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // Criar canvas para processamento
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return null;
    }

    ctx.drawImage(img, 0, 0);

    // Extrair dados da imagem (simplificado - em produção, use ML)
    const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = Array.from(imageDataObj.data.slice(0, 4096)); // Primeiros 4096 pixels

    // Calcular confiança básica (em produção, use modelo de ML)
    const confidence = 85.0; // Placeholder

    return {
      data,
      confidence,
    };
  } catch (error) {
    console.error('Erro ao processar imagem facial:', error);
    return null;
  }
}

/**
 * Compara dois encodings faciais
 * Retorna confiança da correspondência (0-100)
 */
export function compareFaceEncodings(
  encoding1: FaceEncoding,
  encoding2: FaceEncoding
): number {
  if (encoding1.data.length !== encoding2.data.length) {
    return 0;
  }

  // Calcular distância euclidiana
  let sum = 0;
  for (let i = 0; i < encoding1.data.length; i++) {
    const diff = encoding1.data[i] - encoding2.data[i];
    sum += diff * diff;
  }

  const distance = Math.sqrt(sum);
  
  // Converter distância para confiança (0-100)
  // Quanto menor a distância, maior a confiança
  const maxDistance = 1000; // Ajuste conforme necessário
  const confidence = Math.max(0, 100 - (distance / maxDistance) * 100);

  return Math.round(confidence * 100) / 100;
}

/**
 * Valida se a foto contém um rosto
 * Nota: Implementação básica. Para produção, use face-api.js
 */
export async function validateFaceInPhoto(imageData: string): Promise<boolean> {
  try {
    const img = new Image();
    img.src = imageData;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // Validação básica: verificar se a imagem tem dimensões adequadas
    if (img.width < 200 || img.height < 200) {
      return false;
    }

    // Em produção, aqui você usaria uma biblioteca de detecção facial
    // Por enquanto, retornamos true se a imagem foi carregada
    return true;
  } catch (error) {
    console.error('Erro ao validar foto:', error);
    return false;
  }
}

