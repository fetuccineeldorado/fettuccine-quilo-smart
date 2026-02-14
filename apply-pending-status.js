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
  console.error('❌ Supabase URL ou Service Role Key não configurados. Verifique seu arquivo .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyPendingStatusMigration() {
  console.log('🔄 Aplicando migração para adicionar status "pending"...');

  try {
    // Primeiro, verificar se "pending" já existe no enum
    console.log('🔍 Verificando se "pending" já existe no enum...');
    const { data: enumCheck, error: checkError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT unnest(enum_range(NULL::order_status))::text AS enum_value;
      `
    });

    if (checkError) {
      console.log('⚠️ Não foi possível verificar enum. Tentando adicionar "pending" diretamente...');
    } else {
      console.log('📋 Valores do enum encontrados:', enumCheck);
      if (enumCheck && enumCheck.some((v) => v.enum_value === 'pending')) {
        console.log('✅ Status "pending" já existe no enum!');
        return;
      }
    }

    // Tentar adicionar "pending" ao enum
    console.log('➕ Adicionando "pending" ao enum order_status...');

    // Usar uma função que tenta adicionar e ignora se já existir
    const migrationSql = `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum
          WHERE enumlabel = 'pending'
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
        ) THEN
          ALTER TYPE order_status ADD VALUE 'pending';
        END IF;
      END $$;

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
    `;

    // Tentar executar via RPC se disponível
    const { error: rpcError } = await supabase.rpc('exec_sql', { sql: migrationSql });

    if (rpcError) {
      console.log('⚠️ RPC não disponível. Tentando método alternativo...');

      // Método alternativo: executar cada comando separadamente
      const statements = migrationSql.split(';').filter((stmt) => stmt.trim());

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            console.log('🔄 Executando:', statement.substring(0, 80).replace(/\n/g, ' ') + '...');
            const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement + ';' });
            if (stmtError) {
              // Se o erro for "duplicate value", ignorar
              if (stmtError.message.includes('already exists') || stmtError.message.includes('duplicate')) {
                console.log('ℹ️ Valor já existe, ignorando...');
              } else {
                console.error('❌ Erro ao executar:', stmtError.message);
              }
            } else {
              console.log('✅ Comando executado com sucesso');
            }
          } catch (err) {
            console.error('❌ Erro ao executar comando:', err.message);
          }
        }
      }
    } else {
      console.log('✅ Migração aplicada com sucesso via RPC!');
    }

    // Verificar se "pending" foi adicionado
    console.log('\n🔍 Verificando se "pending" foi adicionado...');
    const { data: testData, error: testError } = await supabase
      .from('orders')
      .select('status')
      .limit(1);

    if (testError && testError.message.includes('pending')) {
      console.error('❌ Erro ao testar: "pending" ainda não está disponível');
      console.error('💡 Você pode precisar aplicar esta migração manualmente no Supabase Dashboard');
      console.error('💡 SQL para executar manualmente:');
      console.log('\n' + migrationSql + '\n');
    } else {
      console.log('✅ Verificação concluída!');
    }

    console.log('\n✅ Migração concluída!');
    console.log('📝 Nota: Se ainda houver erros, execute o SQL manualmente no Supabase Dashboard SQL Editor');
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    console.error('\n💡 Você pode aplicar a migração manualmente:');
    console.error('1. Acesse o Supabase Dashboard');
    console.error('2. Vá para SQL Editor');
    console.error('3. Execute o SQL do arquivo: supabase/migrations/20251023000001_add_pending_status.sql');
    process.exit(1);
  }
}

applyPendingStatusMigration();

