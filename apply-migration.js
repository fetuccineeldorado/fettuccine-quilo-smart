const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Aplicando migração para adicionar status "pending"...');
    
    // Executar a migração SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add pending status to order_status enum
        ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending';
        
        -- Add updated_at column to orders table if it doesn't exist
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Create function to update updated_at timestamp
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        -- Create trigger to automatically update updated_at
        DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
        CREATE TRIGGER update_orders_updated_at
            BEFORE UPDATE ON orders
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        
        -- Add index for better performance on status queries
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at);
      `
    });

    if (error) {
      console.error('Erro ao aplicar migração:', error);
    } else {
      console.log('Migração aplicada com sucesso!');
    }
  } catch (err) {
    console.error('Erro geral:', err);
  }
}

applyMigration();
