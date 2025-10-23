-- Fix cash_register RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view cash register" ON cash_register;
DROP POLICY IF EXISTS "Anyone can create cash register entries" ON cash_register;

-- Recreate policies with proper permissions
CREATE POLICY "Enable read access for all users" ON cash_register FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON cash_register FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON cash_register FOR UPDATE USING (true);

-- Ensure RLS is enabled
ALTER TABLE cash_register ENABLE ROW LEVEL SECURITY;
