import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Supabase URL or Service Role Key is not set. Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function applyMigration() {
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20251023000002_fix_cash_register_rls.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  console.log(`Applying migration: ${migrationPath}`);
  try {
    // Execute the SQL directly
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSql });

    if (error) {
      console.error('Error applying migration:', error);
      // Try alternative method
      const { error: altError } = await supabase.from('_migrations').insert({
        version: '20251023000002',
        name: 'fix_cash_register_rls',
        sql: migrationSql
      });
      
      if (altError) {
        throw altError;
      }
    }
    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error.message);
    console.log('Trying direct SQL execution...');
    
    // Try to execute SQL statements individually
    const statements = migrationSql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error) {
            console.error('Error executing statement:', statement, error);
          } else {
            console.log('Statement executed successfully');
          }
        } catch (err) {
          console.error('Error executing statement:', statement, err);
        }
      }
    }
  }
}

applyMigration();
