-- Create cash_register table if it doesn't exist
CREATE TABLE IF NOT EXISTS cash_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('open', 'close')),
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  opening_balance DECIMAL(10,2) DEFAULT 0,
  closing_balance DECIMAL(10,2) DEFAULT 0,
  expected_balance DECIMAL(10,2) DEFAULT 0,
  difference DECIMAL(10,2) DEFAULT 0,
  operator_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cash_register ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON cash_register;
DROP POLICY IF EXISTS "Enable insert for all users" ON cash_register;
DROP POLICY IF EXISTS "Enable update for all users" ON cash_register;

-- Create new policies
CREATE POLICY "Enable read access for all users" ON cash_register FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON cash_register FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON cash_register FOR UPDATE USING (true);

-- Create trigger for updating timestamps
CREATE TRIGGER update_cash_register_updated_at BEFORE UPDATE ON cash_register
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
