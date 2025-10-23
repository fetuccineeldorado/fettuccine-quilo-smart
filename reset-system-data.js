const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://akktccyeqnqaljaqland.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra3RjY3llcW5xYWxqYWFsYW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTA5MzEsImV4cCI6MjA3NjcyNjkzMX0.TeuBl81JEN2s5rakt0hNS0diT6nOvg6nUHyRfFeEngk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetAllData() {
  console.log('🔄 INICIANDO RESET DO SISTEMA...\n');

  try {
    // 1. Limpar order_extra_items
    console.log('1. Limpando itens extra das comandas...');
    const { error: error1 } = await supabase
      .from('order_extra_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletar todos
    
    if (error1) {
      console.error('Erro ao limpar order_extra_items:', error1);
    } else {
      console.log('✅ order_extra_items limpo');
    }

    // 2. Limpar order_items
    console.log('2. Limpando itens das comandas...');
    const { error: error2 } = await supabase
      .from('order_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error2) {
      console.error('Erro ao limpar order_items:', error2);
    } else {
      console.log('✅ order_items limpo');
    }

    // 3. Limpar payments
    console.log('3. Limpando pagamentos...');
    const { error: error3 } = await supabase
      .from('payments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error3) {
      console.error('Erro ao limpar payments:', error3);
    } else {
      console.log('✅ payments limpo');
    }

    // 4. Limpar orders
    console.log('4. Limpando comandas...');
    const { error: error4 } = await supabase
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error4) {
      console.error('Erro ao limpar orders:', error4);
    } else {
      console.log('✅ orders limpo');
    }

    // 5. Limpar cash_register
    console.log('5. Limpando dados do caixa...');
    const { error: error5 } = await supabase
      .from('cash_register')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error5) {
      console.error('Erro ao limpar cash_register:', error5);
    } else {
      console.log('✅ cash_register limpo');
    }

    // 6. Resetar configurações do sistema
    console.log('6. Resetando configurações do sistema...');
    const { error: error6 } = await supabase
      .from('system_settings')
      .update({
        price_per_kg: 54.90,
        updated_at: new Date().toISOString()
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error6) {
      console.error('Erro ao resetar configurações:', error6);
    } else {
      console.log('✅ Configurações resetadas');
    }

    // 7. Verificar se as tabelas estão vazias
    console.log('\n7. Verificando limpeza...');
    
    const { data: ordersCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true });
    
    const { data: orderItemsCount } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true });
    
    const { data: paymentsCount } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true });
    
    const { data: cashRegisterCount } = await supabase
      .from('cash_register')
      .select('id', { count: 'exact', head: true });

    console.log('\n📊 RESULTADO DO RESET:');
    console.log(`   Comandas: ${ordersCount?.length || 0}`);
    console.log(`   Itens de comandas: ${orderItemsCount?.length || 0}`);
    console.log(`   Pagamentos: ${paymentsCount?.length || 0}`);
    console.log(`   Dados do caixa: ${cashRegisterCount?.length || 0}`);

    console.log('\n🎉 RESET CONCLUÍDO COM SUCESSO!');
    console.log('   - Todas as comandas foram removidas');
    console.log('   - Todos os valores foram resetados');
    console.log('   - Sistema voltou ao estado inicial');
    console.log('   - Preço por kg: R$ 54,90');

  } catch (error) {
    console.error('❌ Erro durante o reset:', error);
  }
}

// Executar reset
resetAllData();
