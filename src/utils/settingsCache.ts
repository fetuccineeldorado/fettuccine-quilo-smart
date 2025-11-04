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
  console.log('🗑️ Limpando cache de configurações...');
  settingsCache = null;
  cacheTimestamp = 0;
  console.log('✅ Cache de configurações limpo');
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
 * Valida se os dados do cache têm a estrutura correta
 */
function validateCacheData(data: any): data is SystemSettings {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // Verificar se tem pelo menos uma das propriedades esperadas
  return (
    ('maximum_weight' in data || data.maximum_weight === null) &&
    ('minimum_charge' in data || data.minimum_charge === null) &&
    ('price_per_kg' in data || data.price_per_kg === null)
  );
}

/**
 * Obtém configurações do cache ou busca do banco
 * @param fetchFunction - Função para buscar do banco se cache não estiver disponível
 */
export async function getCachedSettings<T extends SystemSettings>(
  fetchFunction: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  try {
    // Se cache é válido, validar e retornar do cache
    if (isCacheValid() && settingsCache) {
      // Validar estrutura dos dados do cache
      if (validateCacheData(settingsCache)) {
        console.log('✅ Usando configurações do cache');
        return { data: settingsCache as T, error: null };
      } else {
        // Cache inválido, limpar e buscar do banco
        console.warn('⚠️ Dados do cache inválidos, limpando cache...');
        clearSettingsCache();
      }
    }

    // Buscar do banco
    console.log('📡 Buscando configurações do banco de dados...');
    const result = await fetchFunction();
    
    // Se busca foi bem-sucedida, validar e atualizar cache
    if (result.data && !result.error) {
      // Validar estrutura dos dados antes de cachear
      if (validateCacheData(result.data)) {
        settingsCache = result.data;
        cacheTimestamp = Date.now();
        console.log('✅ Configurações atualizadas no cache');
      } else {
        console.warn('⚠️ Dados do banco inválidos, não atualizando cache');
        // Limpar cache se dados são inválidos
        clearSettingsCache();
      }
    } else if (result.error) {
      // Se houver erro na busca, limpar cache se houver
      console.error('❌ Erro ao buscar configurações:', result.error);
      // Não limpar cache em caso de erro, pode ser erro de rede
      // O cache pode ser útil como fallback
    }

    return result;
  } catch (error) {
    console.error('💥 Erro inesperado no getCachedSettings:', error);
    // Em caso de erro inesperado, limpar cache e tentar buscar do banco
    clearSettingsCache();
    
    try {
      const result = await fetchFunction();
      return result;
    } catch (fetchError) {
      console.error('💥 Erro ao buscar configurações após limpar cache:', fetchError);
      return { data: null, error: fetchError };
    }
  }
}

