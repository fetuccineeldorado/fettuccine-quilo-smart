-- Fix RLS policies for orders table
DROP POLICY IF EXISTS "Anyone can view orders" ON orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON orders;

CREATE POLICY "Authenticated users can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = opened_by);

CREATE POLICY "Authenticated users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = opened_by OR get_user_role(auth.uid()) IN ('admin', 'manager'));

-- Fix RLS policies for payments table
DROP POLICY IF EXISTS "Anyone can view payments" ON payments;
DROP POLICY IF EXISTS "Anyone can create payments" ON payments;

CREATE POLICY "Authenticated users can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = processed_by);

-- Fix RLS policies for cash_register table
DROP POLICY IF EXISTS "Anyone can view cash register" ON cash_register;
DROP POLICY IF EXISTS "Anyone can create cash register entries" ON cash_register;

CREATE POLICY "Authenticated users can view cash register"
  ON cash_register FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('admin', 'manager'));

CREATE POLICY "Authenticated users can create cash register entries"
  ON cash_register FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = operator_id AND get_user_role(auth.uid()) IN ('admin', 'manager'));

-- Fix RLS policies for order_items table
DROP POLICY IF EXISTS "Anyone can view order items" ON order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON order_items;
DROP POLICY IF EXISTS "Anyone can update order items" ON order_items;

CREATE POLICY "Authenticated users can view order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (true);