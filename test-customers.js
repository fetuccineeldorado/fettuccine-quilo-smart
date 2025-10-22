import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://akktccyeqnqaljaqland.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra3RjY3llcW5xYWxqYXFsYW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTA5MzEsImV4cCI6MjA3NjcyNjkzMX0.TeuBl81JEN2s5rakt0hNS0diT6nOvg6nUHyRfFeEngk';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 TESTANDO TABELA CUSTOMERS\n');

async function testCustomers() {
  try {
    console.log('📊 Testando tabela customers...');
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('❌ Erro na tabela customers:', error.message);
      console.log('\n🎯 PROBLEMA IDENTIFICADO:');
      console.log('   A tabela customers não foi criada no banco de dados');
      console.log('\n💡 SOLUÇÃO:');
      console.log('   1. A tabela customers precisa ser criada');
      console.log('   2. Execute o SQL adicional no Supabase Dashboard');
      console.log('   3. Ou adicione a tabela ao script install_all_tables.sql');
    } else {
      console.log('✅ Tabela customers: OK');
      console.log(`📋 Clientes encontrados: ${data.length}`);
      if (data.length > 0) {
        console.log('   - Clientes:');
        data.forEach(customer => {
          console.log(`     ${customer.name} - ${customer.email}`);
        });
      }
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
}

testCustomers();
