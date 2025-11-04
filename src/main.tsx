import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registrado com sucesso:', registration);
        
        // Limpar caches antigos na inicialização
        registration.update();
        
        // Verificar se há atualização disponível
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Novo Service Worker disponível, limpar cache antigo
                console.log('🔄 Novo Service Worker disponível, limpando cache...');
                caches.keys().then((cacheNames) => {
                  return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                  );
                });
              }
            });
          }
        });
      })
      .catch((error) => {
        console.log('Falha ao registrar Service Worker:', error);
      });
  });
  
  // Adicionar função global para limpar cache (para debug)
  (window as any).clearAllCache = async () => {
    const { clearAllCaches } = await import('./utils/clearCache');
    await clearAllCaches();
    console.log('🔄 Recarregando página...');
    window.location.reload();
  };
}

createRoot(document.getElementById("root")!).render(<App />);
