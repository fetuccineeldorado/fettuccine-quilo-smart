import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://znkbehmucknvguzymzrg.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpua2JlaG11Y2tudmd1enltenJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTQ1NDI4MiwiZXhwIjoyMDQ1MDMwMjgyfQ.t_sfxLTFTdSFP1lECX-j6KIpLbPHm0g6KK8x1NEhJdw';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🔄 Aplicando migração de políticas de DELETE...');
  
  try {
    const sql = readFileSync('supabase/migrations/20251023200001_fix_delete_policies.sql', 'utf8');
    
    console.log('📝 SQL a ser executado:');
    console.log(sql);
    
    // Executar a migração
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Erro ao aplicar migração:', error);
      
      // Tentar executar cada comando SQL separadamente
      console.log('🔄 Tentando executar comandos individualmente...');
      const commands = sql.split(';').filter(cmd => cmd.trim());
      
      for (const command of commands) {
        if (command.trim()) {
          console.log('🔄 Executando:', command.substring(0, 50) + '...');
          const { error: cmdError } = await supabase.rpc('exec_sql', { sql: command + ';' });
          if (cmdError) {
            console.error('❌ Erro:', cmdError);
          } else {
            console.log('✅ Comando executado com sucesso');
          }
        }
      }
    } else {
      console.log('✅ Migração aplicada com sucesso!');
      console.log('📊 Resultado:', data);
    }
    
    // Verificar políticas criadas
    console.log('\n🔍 Verificando políticas criadas...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .in('tablename', ['orders', 'order_items', 'order_extra_items', 'payments']);
    
    if (policiesError) {
      console.error('❌ Erro ao verificar políticas:', policiesError);
    } else {
      console.log('✅ Políticas encontradas:');
      console.log(policies);
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

applyMigration();

