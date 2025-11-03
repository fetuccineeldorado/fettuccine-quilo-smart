/**
 * Cache simples para configurações do sistema
 * Evita múltiplas requisições desnecessárias ao banco
 */

interface SystemSettings {
  maximum_weight: number | null;
  minimum_charge: number | null;
  price_per_kg: number | null;
}

let settingsCache: SystemSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minuto

/**
 * Limpa o cache de configurações
 */
export function clearSettingsCache() {
  settingsCache = null;
  cacheTimestamp = 0;
}

/**
 * Verifica se o cache ainda é válido
 */
function isCacheValid(): boolean {
  if (!settingsCache || cacheTimestamp === 0) {
    return false;
  }
  
  const now = Date.now();
  return (now - cacheTimestamp) < CACHE_DURATION;
}

/**
 * Obtém configurações do cache ou busca do banco
 * @param fetchFunction - Função para buscar do banco se cache não estiver disponível
 */
export async function getCachedSettings<T extends SystemSettings>(
  fetchFunction: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  // Se cache é válido, retornar do cache
  if (isCacheValid() && settingsCache) {
    return { data: settingsCache as T, error: null };
  }

  // Buscar do banco
  const result = await fetchFunction();
  
  // Se busca foi bem-sucedida, atualizar cache
  if (result.data && !result.error) {
    settingsCache = result.data;
    cacheTimestamp = Date.now();
  }

  return result;
}

