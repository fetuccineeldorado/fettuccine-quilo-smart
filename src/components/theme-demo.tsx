"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeIndicator } from "@/components/theme-indicator";

export function ThemeDemo() {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Demonstração do Sistema de Temas</span>
          <ThemeIndicator />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Cores Primárias</h3>
            <div className="flex gap-2">
              <Badge className="bg-primary text-primary-foreground">Primary</Badge>
              <Badge className="bg-secondary text-secondary-foreground">Secondary</Badge>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold">Estados</h3>
            <div className="flex gap-2">
              <Badge className="bg-success text-success-foreground">Success</Badge>
              <Badge className="bg-warning text-warning-foreground">Warning</Badge>
              <Badge className="bg-destructive text-destructive-foreground">Error</Badge>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold">Gradientes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-16 rounded-lg gradient-primary flex items-center justify-center text-white font-semibold">
              Primary
            </div>
            <div className="h-16 rounded-lg gradient-secondary flex items-center justify-center text-white font-semibold">
              Secondary
            </div>
            <div className="h-16 rounded-lg gradient-success flex items-center justify-center text-white font-semibold">
              Success
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold">Sombras</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-16 rounded-lg bg-card border shadow-soft flex items-center justify-center">
              Soft
            </div>
            <div className="h-16 rounded-lg bg-card border shadow-md flex items-center justify-center">
              Medium
            </div>
            <div className="h-16 rounded-lg bg-card border shadow-lg flex items-center justify-center">
              Large
            </div>
            <div className="h-16 rounded-lg bg-card border shadow-strong flex items-center justify-center">
              Strong
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
