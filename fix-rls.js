import { createClient } from '@supabase/supabase-js';

// Use environment variables directly
const supabaseUrl = 'https://akktccyeqnqaljaqland.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra3RjY3llcW5xYWxqYXFsYW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjI0NzQ5MywiZXhwIjoyMDQ3ODIzNDkzfQ.8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fixRLS() {
  console.log('Fixing RLS policies for cash_register...');
  
  try {
    // First, let's check the current policies
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { table_name: 'cash_register' });
    
    console.log('Current policies:', policies);
    
    // Test direct SQL execution
    const sql = `
      -- Drop existing policies
      DROP POLICY IF EXISTS "Anyone can view cash register" ON cash_register;
      DROP POLICY IF EXISTS "Anyone can create cash register entries" ON cash_register;
      
      -- Create new policies
      CREATE POLICY "Enable read access for all users" ON cash_register FOR SELECT USING (true);
      CREATE POLICY "Enable insert for all users" ON cash_register FOR INSERT WITH CHECK (true);
      CREATE POLICY "Enable update for all users" ON cash_register FOR UPDATE USING (true);
    `;
    
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql });
    
    if (sqlError) {
      console.error('SQL execution error:', sqlError);
    } else {
      console.log('SQL executed successfully');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixRLS();
