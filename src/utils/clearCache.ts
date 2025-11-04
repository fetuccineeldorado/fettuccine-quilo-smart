/**
 * Utilitário para limpar todo o cache do sistema
 */

/**
 * Limpar todo o cache do Service Worker
 */
export const clearServiceWorkerCache = async (): Promise<boolean> => {
  if ('serviceWorker' in navigator && 'caches' in window) {
    try {
      // Limpar todos os caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          console.log('🗑️ Removendo cache:', cacheName);
          return caches.delete(cacheName);
        })
      );

      // Enviar mensagem para o Service Worker limpar também
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (registration.active) {
          const channel = new MessageChannel();
          registration.active.postMessage({ type: 'CLEAR_CACHE' }, [channel.port2]);
        }
      }

      console.log('✅ Cache do Service Worker limpo!');
      return true;
    } catch (error) {
      console.error('❌ Erro ao limpar cache do Service Worker:', error);
      return false;
    }
  }
  return false;
};

/**
 * Limpar localStorage
 */
export const clearLocalStorage = (): boolean => {
  try {
    localStorage.clear();
    console.log('✅ localStorage limpo!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao limpar localStorage:', error);
    return false;
  }
};

/**
 * Limpar sessionStorage
 */
export const clearSessionStorage = (): boolean => {
  try {
    sessionStorage.clear();
    console.log('✅ sessionStorage limpo!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao limpar sessionStorage:', error);
    return false;
  }
};

/**
 * Limpar todos os caches (Service Worker, localStorage, sessionStorage)
 */
export const clearAllCaches = async (): Promise<{
  serviceWorker: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
}> => {
  const results = {
    serviceWorker: await clearServiceWorkerCache(),
    localStorage: clearLocalStorage(),
    sessionStorage: clearSessionStorage(),
  };

  console.log('📊 Resultado da limpeza de cache:', results);
  return results;
};

/**
 * Desregistrar todos os Service Workers
 */
export const unregisterServiceWorkers = async (): Promise<boolean> => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister())
      );
      console.log('✅ Service Workers desregistrados!');
      return true;
    } catch (error) {
      console.error('❌ Erro ao desregistrar Service Workers:', error);
      return false;
    }
  }
  return false;
};

