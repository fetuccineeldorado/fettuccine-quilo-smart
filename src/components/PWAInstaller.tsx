import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Monitor, CheckCircle } from "lucide-react";

const PWAInstaller = () => {
  console.log('PWAInstaller: Componente renderizando');

  const handleInstallClick = () => {
    console.log('PWAInstaller: Botão de instalação clicado');
    alert('Para instalar o aplicativo:\n\nChrome/Edge: Menu → "Instalar Fettuccine PDV"\nFirefox: Menu → "Instalar"\nSafari: Compartilhar → "Adicionar à Tela de Início"');
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-blue-800 flex items-center gap-2">
          <Download className="h-5 w-5" />
          Instalar Fettuccine PDV
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4 text-blue-700">
          Instale o aplicativo para acesso rápido e funcionalidade offline.
        </CardDescription>
        
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Smartphone className="h-4 w-4" />
            <span>Funciona em celulares e tablets</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Monitor className="h-4 w-4" />
            <span>Funciona em computadores</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <CheckCircle className="h-4 w-4" />
            <span>Funciona offline</span>
          </div>
        </div>

        <Button onClick={handleInstallClick} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Instalar Aplicativo
        </Button>
      </CardContent>
    </Card>
  );
};

export default PWAInstaller;
