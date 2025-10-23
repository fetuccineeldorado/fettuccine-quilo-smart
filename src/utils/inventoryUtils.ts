// Utility functions for inventory management using localStorage

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  barcode: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  max_stock: number;
  current_stock: number;
  status: 'active' | 'inactive' | 'discontinued';
  is_tracked: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  notes: string | null;
  created_at: string;
}

// Load products from localStorage
export const loadProducts = (): Product[] => {
  try {
    const savedProducts = localStorage.getItem('inventory_products');
    return savedProducts ? JSON.parse(savedProducts) : [];
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    return [];
  }
};

// Save products to localStorage
export const saveProducts = (products: Product[]): void => {
  try {
    localStorage.setItem('inventory_products', JSON.stringify(products));
  } catch (error) {
    console.error("Erro ao salvar produtos:", error);
  }
};

// Load movements from localStorage
export const loadMovements = (): StockMovement[] => {
  try {
    const savedMovements = localStorage.getItem('inventory_movements');
    return savedMovements ? JSON.parse(savedMovements) : [];
  } catch (error) {
    console.error("Erro ao carregar movimentações:", error);
    return [];
  }
};

// Save movements to localStorage
export const saveMovements = (movements: StockMovement[]): void => {
  try {
    localStorage.setItem('inventory_movements', JSON.stringify(movements));
  } catch (error) {
    console.error("Erro ao salvar movimentações:", error);
  }
};

// Reduce product stock automatically
export const reduceProductStock = (
  productId: string, 
  quantity: number, 
  referenceId: string, 
  referenceType: string,
  notes?: string
): boolean => {
  try {
    const products = loadProducts();
    const movements = loadMovements();
    
    const product = products.find(p => p.id === productId);
    if (!product) {
      console.error("Produto não encontrado:", productId);
      return false;
    }

    if (!product.is_tracked) {
      console.log("Produto não controla estoque:", product.name);
      return true;
    }

    // Check if there's enough stock
    if (product.current_stock < quantity) {
      console.warn(`Estoque insuficiente para ${product.name}. Disponível: ${product.current_stock}, Necessário: ${quantity}`);
      return false;
    }

    // Update product stock
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          current_stock: Math.max(0, p.current_stock - quantity),
          updated_at: new Date().toISOString(),
        };
      }
      return p;
    });

    // Create movement record
    const movement: StockMovement = {
      id: crypto.randomUUID(),
      product_id: productId,
      product_name: product.name,
      movement_type: 'out',
      quantity: quantity,
      unit_cost: null,
      total_cost: null,
      notes: notes || `Venda automática - ${referenceType} ${referenceId}`,
      created_at: new Date().toISOString(),
    };

    // Save updates
    saveProducts(updatedProducts);
    saveMovements([...movements, movement]);

    console.log(`Estoque reduzido para ${product.name}: -${quantity} (restante: ${product.current_stock - quantity})`);
    return true;
  } catch (error) {
    console.error("Erro ao reduzir estoque:", error);
    return false;
  }
};

// Check for low stock alerts
export const checkLowStockAlerts = (): Product[] => {
  const products = loadProducts();
  return products.filter(p => 
    p.is_tracked && 
    p.status === 'active' && 
    p.current_stock <= p.min_stock
  );
};

// Get product by ID
export const getProductById = (productId: string): Product | null => {
  const products = loadProducts();
  return products.find(p => p.id === productId) || null;
};

// Get product by name (for extra items integration)
export const getProductByName = (productName: string): Product | null => {
  const products = loadProducts();
  return products.find(p => 
    p.name.toLowerCase().includes(productName.toLowerCase()) ||
    p.sku.toLowerCase().includes(productName.toLowerCase())
  ) || null;
};

// Add product if not exists (for extra items integration)
export const ensureProductExists = (itemName: string, price: number): Product => {
  const products = loadProducts();
  let product = products.find(p => 
    p.name.toLowerCase() === itemName.toLowerCase()
  );

  if (!product) {
    // Create new product
    product = {
      id: crypto.randomUUID(),
      name: itemName,
      description: `Item extra: ${itemName}`,
      category: "Itens Extras",
      sku: `EXT-${Date.now()}`,
      barcode: "",
      unit: "unidade",
      cost_price: price * 0.7, // Assume 30% margin
      selling_price: price,
      min_stock: 10,
      max_stock: 100,
      current_stock: 0,
      status: "active",
      is_tracked: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newProducts = [...products, product];
    saveProducts(newProducts);
    console.log(`Novo produto criado: ${itemName}`);
  }

  return product;
};
