import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Utensils, Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        navigate("/dashboard");
      } else {
        navigate("/auth");
      }
    };

    checkAuth();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center">
          <Utensils className="w-10 h-10 text-primary-foreground" />
        </div>
        <div>
          <h1 className="mb-4 text-4xl font-bold">FETUCCINE</h1>
          <p className="text-xl text-muted-foreground">Sistema PDV para Restaurante Self-Service</p>
        </div>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    </div>
  );
};

export default Index;
