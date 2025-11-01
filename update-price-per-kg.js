import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Obter diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tentar carregar variáveis de ambiente de um arquivo .env se existir
function loadEnv() {
  try {
    const envPath = join(__dirname, '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          envVars[key.trim()] = value;
        }
      }
    });
    
    Object.keys(envVars).forEach(key => {
      if (!process.env[key]) {
        process.env[key] = envVars[key];
      }
    });
  } catch (err) {
    // Arquivo .env não existe, continuar com variáveis de sistema
  }
}

loadEnv();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Preferir chave de serviço para bypass RLS, caso contrário usar anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.log('');
  console.log('Por favor, configure uma das seguintes opções:');
  console.log('  1. Crie um arquivo .env na raiz do projeto com:');
  console.log('     VITE_SUPABASE_URL=sua_url');
  console.log('     VITE_SUPABASE_ANON_KEY=sua_chave');
  console.log('');
  console.log('  2. Configure as variáveis de ambiente do sistema');
  console.log('');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePricePerKg() {
  try {
    console.log('🔄 Atualizando preço por quilo para R$ 59,90...');
    
    // Primeiro, verificar se há configurações existentes
    const { data: allSettings, error: fetchError } = await supabase
      .from('system_settings')
      .select('id, price_per_kg')
      .limit(1);

    if (fetchError) {
      console.error('❌ Erro ao buscar configurações:', fetchError);
      return;
    }

    if (!allSettings || allSettings.length === 0) {
      // Criar configuração se não existir
      console.log('📝 Criando configuração inicial...');
      const { data: newSettings, error: insertError } = await supabase
        .from('system_settings')
        .insert({
          price_per_kg: 59.90,
          minimum_charge: 5.00,
          maximum_weight: 2.00,
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erro ao criar configuração:', insertError);
        return;
      }

      console.log('✅ Configuração criada com sucesso!');
      console.log(`   Preço por kg: R$ ${newSettings.price_per_kg}`);
      return;
    }

    // Atualizar configuração existente
    const currentSettings = allSettings[0];
    const oldValue = currentSettings.price_per_kg;
    
    console.log(`📊 Configuração encontrada. Valor atual: R$ ${oldValue}`);

    // Tentar atualizar sem usar .single() primeiro
    const { data: updatedData, error: updateError } = await supabase
      .from('system_settings')
      .update({
        price_per_kg: 59.90,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSettings.id)
      .select();

    if (updateError) {
      console.error('❌ Erro ao atualizar configuração:', updateError);
      console.log('   Isso pode ser devido a permissões RLS (Row Level Security)');
      console.log('   Tente atualizar manualmente pela interface de Configurações da aplicação');
      return;
    }

    if (!updatedData || updatedData.length === 0) {
      console.error('❌ Nenhuma linha foi atualizada. Verifique as permissões RLS.');
      console.log('   Tente atualizar manualmente pela interface de Configurações da aplicação');
      return;
    }

    const updatedSettings = updatedData[0];
    console.log('✅ Preço por quilo atualizado com sucesso!');
    console.log(`   Valor anterior: R$ ${oldValue}`);
    console.log(`   Novo valor: R$ ${updatedSettings.price_per_kg}`);
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

updatePricePerKg();

