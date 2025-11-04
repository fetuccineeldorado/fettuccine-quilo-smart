import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isStandalone: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

export const usePWA = () => {
  const [pwaState, setPwaState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
    installPrompt: null,
  });

  useEffect(() => {
    // Verificar se está instalado
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const navigatorWithStandalone = window.navigator as NavigatorStandalone;
      const isIosStandalone = navigatorWithStandalone.standalone === true; // iOS Safari
      const isAndroidStandalone = document.referrer.includes('android-app://'); // Android
      const isInstalled = isStandalone || isIosStandalone || isAndroidStandalone;

      setPwaState(prev => ({
        ...prev,
        isInstalled,
        isStandalone,
      }));
    };

    // Verificar conectividade
    const handleOnline = () => setPwaState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setPwaState(prev => ({ ...prev, isOnline: false }));

    // Evento de instalação
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPwaState(prev => ({
        ...prev,
        isInstallable: true,
        installPrompt: e as BeforeInstallPromptEvent,
      }));
    };

    // Evento de instalação concluída
    const handleAppInstalled = () => {
      setPwaState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null,
      }));
    };

    // Verificar instalação inicial
    checkInstalled();

    // Event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar mudanças no display mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      setPwaState(prev => ({
        ...prev,
        isStandalone: mediaQuery.matches,
        isInstalled: mediaQuery.matches,
      }));
    };

    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const installApp = async () => {
    if (pwaState.installPrompt) {
      pwaState.installPrompt.prompt();
      const { outcome } = await pwaState.installPrompt.userChoice;

      setPwaState(prev => ({
        ...prev,
        isInstallable: false,
        installPrompt: null,
      }));

      return outcome === 'accepted';
    }
    return false;
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registrado:', registration);
        return registration;
      } catch (error) {
        console.error('Erro ao registrar Service Worker:', error);
        return null;
      }
    }
    return null;
  };

  const unregisterServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        console.log('Service Workers desregistrados');
        return true;
      } catch (error) {
        console.error('Erro ao desregistrar Service Workers:', error);
        return false;
      }
    }
    return false;
  };

  return {
    ...pwaState,
    installApp,
    registerServiceWorker,
    unregisterServiceWorker,
  };
};
