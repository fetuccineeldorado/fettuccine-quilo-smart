/**
 * Utilitário para obter localização GPS
 */

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeocodedAddress {
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

/**
 * Obtém localização GPS do dispositivo
 */
export async function getCurrentLocation(): Promise<GPSLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não é suportada pelo navegador'));
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || 0,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let errorMessage = 'Erro ao obter localização';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permissão de localização negada pelo usuário';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Informações de localização indisponíveis';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tempo esgotado ao obter localização';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      options
    );
  });
}

/**
 * Geocodifica coordenadas GPS para endereço
 * Nota: Em produção, use uma API de geocodificação (Google Maps, OpenStreetMap, etc.)
 */
export async function geocodeLocation(
  latitude: number,
  longitude: number
): Promise<GeocodedAddress> {
  try {
    // Usando OpenStreetMap Nominatim (gratuito, mas limitado)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'FETUCCINE-PDV/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Erro ao geocodificar localização');
    }

    const data = await response.json();
    
    const address = data.address || {};
    const parts: string[] = [];
    
    if (address.road) parts.push(address.road);
    if (address.house_number) parts.push(address.house_number);
    if (address.neighbourhood) parts.push(address.neighbourhood);
    
    return {
      address: parts.join(', ') || data.display_name || 'Localização não identificada',
      city: address.city || address.town || address.village,
      state: address.state,
      zipCode: address.postcode,
    };
  } catch (error) {
    console.error('Erro ao geocodificar:', error);
    return {
      address: `Coordenadas: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    };
  }
}

/**
 * Calcula distância entre duas coordenadas GPS (em metros)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distância em metros
}

