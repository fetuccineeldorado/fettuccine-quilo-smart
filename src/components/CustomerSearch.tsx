import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, User, Phone, Mail, Star, X } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  total_orders: number;
  total_spent: number;
}

interface CustomerSearchProps {
  onCustomerSelect: (customer: Customer | null) => void;
  selectedCustomer: Customer | null;
  placeholder?: string;
}

const CustomerSearch = ({ onCustomerSelect, selectedCustomer, placeholder = "Buscar cliente..." }: CustomerSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
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

    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
    );
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
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");

      if (error) {
        console.error("Erro ao carregar clientes:", error);
      } else {
        setCustomers(data || []);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowDropdown(value.length > 0);
  };

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    setSearchTerm(customer.name);
    setShowDropdown(false);
  };

  const handleClearSelection = () => {
    onCustomerSelect(null);
    setSearchTerm("");
    setShowDropdown(false);
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
              ) : filteredCustomers.length > 0 ? (
                <div className="py-1">
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
                              {customer.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span className="truncate">{customer.phone}</span>
                                </div>
                              )}
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
                    {selectedCustomer.phone && (
                      <span className="truncate">{selectedCustomer.phone}</span>
                    )}
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
