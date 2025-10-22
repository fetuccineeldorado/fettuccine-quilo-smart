import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://akktccyeqnqaljaqland.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra3RjY3llcW5xYWxqYXFsYW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTA5MzEsImV4cCI6MjA3NjcyNjkzMX0.TeuBl81JEN2s5rakt0hNS0diT6nOvg6nUHyRfFeEngk';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Testando conexão com Supabase...\n');

async function testConnection() {
  try {
    // Testar conexão básica
    console.log('📡 Testando conexão básica...');
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('✅ Conexão com Supabase funcionando!');
      console.log('❌ Tabela orders não existe ainda.');
    } else if (error) {
      console.log('❌ Erro na conexão:', error.message);
      return;
    } else {
      console.log('✅ Conexão funcionando e tabela orders existe!');
    }
    
    // Testar se a tabela orders existe
    console.log('\n📊 Testando tabela orders...');
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
    
    if (ordersError) {
      console.log('❌ Tabela orders não existe:', ordersError.message);
      console.log('\n📝 SOLUÇÃO:');
      console.log('1. Acesse: https://supabase.com/dashboard');
      console.log('2. Selecione seu projeto');
      console.log('3. Vá em SQL Editor');
      console.log('4. Cole o conteúdo do arquivo install_all_tables.sql');
      console.log('5. Execute o script');
    } else {
      console.log('✅ Tabela orders existe e está funcionando!');
    }
    
    // Testar tabela system_settings
    console.log('\n⚙️ Testando tabela system_settings...');
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1);
    
    if (settingsError) {
      console.log('❌ Tabela system_settings não existe:', settingsError.message);
    } else {
      console.log('✅ Tabela system_settings existe!');
      console.log('📋 Configurações:', settingsData);
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
}

testConnection();
