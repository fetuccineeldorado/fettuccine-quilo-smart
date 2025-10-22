import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://akktccyeqnqaljaqland.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra3RjY3llcW5xYWxqYXFsYW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTA5MzEsImV4cCI6MjA3NjcyNjkzMX0.TeuBl81JEN2s5rakt0hNS0diT6nOvg6nUHyRfFeEngk';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 DIAGNÓSTICO DE AUTENTICAÇÃO\n');

async function testAuth() {
  try {
    console.log('📡 Testando conexão com Supabase...');
    
    // Testar conexão básica
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Erro na sessão:', sessionError.message);
      return;
    }
    
    console.log('✅ Conexão com Supabase: OK');
    console.log('📊 Sessão atual:', sessionData.session ? 'Usuário logado' : 'Nenhum usuário logado');
    
    // Testar se a tabela profiles existe
    console.log('\n📋 Testando tabela profiles...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log('❌ Erro na tabela profiles:', profilesError.message);
    } else {
      console.log('✅ Tabela profiles: OK');
    }
    
    // Testar se a tabela user_roles existe
    console.log('\n👥 Testando tabela user_roles...');
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(1);
    
    if (rolesError) {
      console.log('❌ Erro na tabela user_roles:', rolesError.message);
    } else {
      console.log('✅ Tabela user_roles: OK');
    }
    
    console.log('\n🎯 POSSÍVEIS CAUSAS DO ERRO DE LOGIN:');
    console.log('1. 🔑 Usuário não existe no banco de dados');
    console.log('2. 🔐 Senha incorreta');
    console.log('3. 📧 Email não cadastrado');
    console.log('4. 🚫 Políticas RLS bloqueando o acesso');
    console.log('5. ⚙️ Configuração do Supabase Auth');
    
    console.log('\n💡 SOLUÇÕES:');
    console.log('1. 📝 Crie uma conta primeiro (aba "Criar Conta")');
    console.log('2. ✅ Verifique se o email está correto');
    console.log('3. 🔑 Confirme se a senha tem pelo menos 6 caracteres');
    console.log('4. 🔄 Tente fazer logout e login novamente');
    console.log('5. 🌐 Verifique se o Supabase Auth está habilitado');
    
  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  }
}

testAuth();
