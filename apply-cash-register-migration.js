import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://akktccyeqnqaljaqland.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra3RjY3llcW5xYWxqYXFsYW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjI0NzQ5MywiZXhwIjoyMDQ3ODIzNDkzfQ.8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function applyMigration() {
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20251023000003_create_cash_register_table.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  console.log(`Applying migration: ${migrationPath}`);
  
  try {
    // Execute the SQL directly
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSql });

    if (error) {
      console.error('Error applying migration:', error);
      // Try alternative method - execute statements individually
      const statements = migrationSql.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            console.log('Executing:', statement.substring(0, 50) + '...');
            const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
            if (stmtError) {
              console.error('Error executing statement:', statement, stmtError);
            } else {
              console.log('Statement executed successfully');
            }
          } catch (err) {
            console.error('Error executing statement:', statement, err);
          }
        }
      }
    } else {
      console.log('Migration applied successfully!');
    }
    
    // Test the table
    console.log('Testing cash_register table...');
    const { data, error: testError } = await supabase
      .from('cash_register')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('Error testing table:', testError);
    } else {
      console.log('Table test successful:', data);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

applyMigration();
