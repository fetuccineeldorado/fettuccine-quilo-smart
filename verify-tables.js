import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://akktccyeqnqaljaqland.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra3RjY3llcW5xYWxqYXFsYW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTA5MzEsImV4cCI6MjA3NjcyNjkzMX0.TeuBl81JEN2s5rakt0hNS0diT6nOvg6nUHyRfFeEngk';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 VERIFICANDO TABELAS DO SUPABASE...\n');

const tablesToCheck = [
  'profiles',
  'user_roles', 
  'system_settings',
  'orders',
  'order_items',
  'payments',
  'cash_register',
  'extra_items',
  'order_extra_items'
];

async function verifyTables() {
  let allTablesExist = true;
  
  for (const table of tablesToCheck) {
    try {
      console.log(`📊 Verificando tabela: ${table}...`);
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
        allTablesExist = false;
      } else {
        console.log(`✅ ${table}: OK`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Erro - ${err.message}`);
      allTablesExist = false;
    }
  }
  
  console.log('\n📋 RESULTADO:');
  if (allTablesExist) {
    console.log('✅ TODAS AS TABELAS FORAM CRIADAS COM SUCESSO!');
    console.log('🎉 A aplicação FETUCCINE PDV está pronta para uso!');
    console.log('\n🚀 PRÓXIMOS PASSOS:');
    console.log('   1. Acesse: http://localhost:8080');
    console.log('   2. Crie uma conta de usuário');
    console.log('   3. Teste as funcionalidades do PDV');
  } else {
    console.log('❌ ALGUMAS TABELAS NÃO FORAM CRIADAS');
    console.log('📝 SOLUÇÃO:');
    console.log('   1. Execute o SQL no Supabase Dashboard');
    console.log('   2. Verifique se não houve erros na execução');
    console.log('   3. Execute este script novamente');
  }
}

verifyTables();
