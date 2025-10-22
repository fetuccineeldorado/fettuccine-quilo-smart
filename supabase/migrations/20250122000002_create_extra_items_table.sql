-- Create extra_items table for additional items like drinks, etc.
CREATE TABLE IF NOT EXISTS extra_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'drink' CHECK (category IN ('drink', 'food', 'dessert', 'other')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_extra_items table to link orders with extra items
CREATE TABLE IF NOT EXISTS order_extra_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  extra_item_id UUID REFERENCES extra_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_extra_items_category ON extra_items(category);
CREATE INDEX IF NOT EXISTS idx_extra_items_active ON extra_items(is_active);
CREATE INDEX IF NOT EXISTS idx_order_extra_items_order_id ON order_extra_items(order_id);

-- Create trigger for updated_at
CREATE TRIGGER update_extra_items_updated_at BEFORE UPDATE ON extra_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default extra items
INSERT INTO extra_items (name, description, price, category) VALUES
('Refrigerante 350ml', 'Coca-Cola, Pepsi, Fanta, etc.', 4.50, 'drink'),
('Refrigerante 600ml', 'Coca-Cola, Pepsi, Fanta, etc.', 6.50, 'drink'),
('Água 500ml', 'Água mineral', 2.50, 'drink'),
('Suco Natural 300ml', 'Suco de laranja, uva, etc.', 5.00, 'drink'),
('Café', 'Café expresso', 3.00, 'drink'),
('Cerveja 350ml', 'Cerveja gelada', 8.00, 'drink'),
('Salada', 'Salada verde', 7.00, 'food'),
('Batata Frita', 'Porção de batata frita', 8.50, 'food'),
('Pudim', 'Pudim de leite', 6.00, 'dessert'),
('Sorvete', 'Sorvete de creme', 4.50, 'dessert');

