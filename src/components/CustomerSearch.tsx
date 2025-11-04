import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, User, Phone, Mail, Star, X } from "lucide-react";

type Customer = Database['public']['Tables']['customers']['Row'];

interface CustomerSearchProps {
  onCustomerSelect: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
  placeholder?: string;
  onManualNameChange?: (name: string) => void;
}

const CustomerSearch = ({ onCustomerSelect, selectedCustomer, placeholder = "Buscar cliente...", onManualNameChange }: CustomerSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers([]);
      return;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const searchNumber = searchTerm.replace(/\D/g, ''); // Remove caracteres não numéricos para busca por telefone

    const filtered = customers.filter(customer => {
      const nameMatch = customer.name?.toLowerCase().includes(searchLower) || false;
      const emailMatch = customer.email?.toLowerCase().includes(searchLower) || false;
      
      // Busca por telefone (com ou sem formatação)
      const phone = customer.phone || '';
      const phoneClean = phone.replace(/\D/g, '');
      const phoneMatch = phone.includes(searchTerm) || phoneClean.includes(searchNumber);
      
      // Busca por WhatsApp (com ou sem formatação)
      const whatsapp = (customer as any).whatsapp_number || '';
      const whatsappClean = typeof whatsapp === 'string' ? whatsapp.replace(/\D/g, '') : '';
      const whatsappMatch = whatsapp.includes(searchTerm) || whatsappClean.includes(searchNumber);
      
      return nameMatch || emailMatch || phoneMatch || whatsappMatch;
    });
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Tentar buscar com todos os campos primeiro
      let result = await supabase
        .from("customers")
        .select("*")
        .order("name");

      let customersData = result.data;
      let customersError = result.error;

      // Se falhar por causa de colunas faltando, tentar com campos básicos
      if (
        customersError &&
        (customersError.code === "PGRST116" ||
          customersError.message?.includes("Could not find") ||
          customersError.message?.includes("column") ||
          customersError.status === 400)
      ) {
        console.log(
          "Tentando buscar apenas com campos básicos devido a erro:",
          customersError.message
        );
        result = await supabase
          .from("customers")
          .select("id, name, email, phone, tier, total_orders, total_spent, created_at, updated_at")
          .order("name");
        
        customersData = result.data;
        customersError = result.error;
      }

      if (customersError) {
        console.error("Erro ao carregar clientes:", customersError);
        // Continuar mesmo com erro, usando array vazio
        setCustomers([]);
      } else {
        // Garantir que todos os campos necessários existam
        const processedCustomers = (customersData || []).map(customer => ({
          ...customer,
          phone: customer.phone || '',
          email: customer.email || '',
          tier: customer.tier || 'bronze',
          total_orders: customer.total_orders || 0,
          total_spent: customer.total_spent || 0,
        }));
        setCustomers(processedCustomers);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowDropdown(value.length > 0);
    setIsManualInput(true);
    
    // Notify parent component about manual input
    if (onManualNameChange) {
      onManualNameChange(value);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    try {
      // Validar que o customer tem os campos necessários
      if (!customer || !customer.id || !customer.name) {
        console.error("Cliente inválido selecionado:", customer);
        return;
      }
      
      onCustomerSelect(customer);
      setSearchTerm(customer.name || '');
      setShowDropdown(false);
      setIsManualInput(false);
    } catch (error) {
      console.error("Erro ao selecionar cliente:", error);
    }
  };

  const handleClearSelection = () => {
    onCustomerSelect(null);
    setSearchTerm("");
    setShowDropdown(false);
    setIsManualInput(false);
    if (onManualNameChange) {
      onManualNameChange("");
    }
    inputRef.current?.focus();
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bg-orange-100 text-orange-800';
      case 'silver': return 'bg-gray-100 text-gray-800';
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      case 'platinum': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'Bronze';
      case 'silver': return 'Prata';
      case 'gold': return 'Ouro';
      case 'platinum': return 'Platina';
      default: return 'Bronze';
    }
  };

  return (
    <div className="space-y-2" ref={searchRef}>
      <Label htmlFor="customer-search">Cliente</Label>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            ref={inputRef}
            id="customer-search"
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setShowDropdown(searchTerm.length > 0)}
            className="pl-10 pr-10"
          />
          {selectedCustomer && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={handleClearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Dropdown with search results */}
        {showDropdown && (
          <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto shadow-lg border">
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Carregando clientes...
                </div>
              ) : filteredCustomers.length > 0 || searchTerm.length > 0 ? (
                <div className="py-1">
                  {/* Opção para usar nome digitado manualmente */}
                  {searchTerm.length > 0 && (
                    <div
                      className="px-4 py-3 hover:bg-muted cursor-pointer border-b bg-primary/5"
                      onClick={() => {
                        onCustomerSelect(null);
                        if (onManualNameChange) {
                          onManualNameChange(searchTerm);
                        }
                        setShowDropdown(false);
                        setIsManualInput(true);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium text-primary">Usar nome: "{searchTerm}"</p>
                          <p className="text-xs text-muted-foreground">Cliente não cadastrado</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Clientes cadastrados */}
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="px-4 py-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{customer.name}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                              {(customer as any).whatsapp_number ? (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span className="truncate">{(customer as any).whatsapp_number}</span>
                                  <span className="text-xs text-green-600">WhatsApp</span>
                                </div>
                              ) : customer.phone ? (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span className="truncate">{customer.phone}</span>
                                </div>
                              ) : null}
                              {customer.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate">{customer.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`${getTierColor(customer.tier)} text-xs`}>
                            <Star className="h-3 w-3 mr-1" />
                            {getTierLabel(customer.tier)}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {customer.total_orders} pedidos • R$ {customer.total_spent.toFixed(2)} gastos
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchTerm.length > 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Nenhum cliente encontrado
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Selected customer info */}
      {selectedCustomer && (
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                <User className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{selectedCustomer.name}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground">
                    {(selectedCustomer as any).whatsapp_number ? (
                      <span className="truncate">{(selectedCustomer as any).whatsapp_number} <span className="text-xs text-green-600">(WhatsApp)</span></span>
                    ) : selectedCustomer.phone ? (
                      <span className="truncate">{selectedCustomer.phone}</span>
                    ) : null}
                    {selectedCustomer.email && (
                      <span className="truncate">{selectedCustomer.email}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className={`${getTierColor(selectedCustomer.tier)} text-xs`}>
                  <Star className="h-3 w-3 mr-1" />
                  {getTierLabel(selectedCustomer.tier)}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {selectedCustomer.total_orders} pedidos • R$ {selectedCustomer.total_spent.toFixed(2)} gastos
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerSearch;
