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
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

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

async function checkPricePerKg() {
  try {
    console.log('🔍 Verificando valor atual do preço por quilo...');
    console.log('');
    
    // Buscar configurações
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('price_per_kg, minimum_charge, maximum_weight, updated_at')
      .limit(1);

    if (error) {
      console.error('❌ Erro ao buscar configurações:', error);
      return;
    }

    if (!settings || settings.length === 0) {
      console.log('⚠️  Nenhuma configuração encontrada no banco de dados.');
      console.log('   O sistema usará o valor padrão do código: R$ 59,90');
      return;
    }

    const currentSettings = settings[0];
    const currentPrice = Number(currentSettings.price_per_kg);
    const targetPrice = 59.90;

    console.log('📊 Configurações encontradas:');
    console.log(`   Preço por kg: R$ ${currentPrice.toFixed(2)}`);
    console.log(`   Cobrança mínima: R$ ${Number(currentSettings.minimum_charge).toFixed(2)}`);
    console.log(`   Peso máximo: ${Number(currentSettings.maximum_weight).toFixed(2)} kg`);
    if (currentSettings.updated_at) {
      const updatedAt = new Date(currentSettings.updated_at);
      console.log(`   Última atualização: ${updatedAt.toLocaleString('pt-BR')}`);
    }
    console.log('');

    if (currentPrice === targetPrice) {
      console.log('✅ O valor já está atualizado para R$ 59,90!');
    } else {
      console.log(`⚠️  O valor ainda não está atualizado.`);
      console.log(`   Valor atual: R$ ${currentPrice.toFixed(2)}`);
      console.log(`   Valor esperado: R$ ${targetPrice.toFixed(2)}`);
      console.log('');
      console.log('💡 Para atualizar, execute o SQL no Supabase:');
      console.log('');
      console.log('UPDATE system_settings');
      console.log('SET price_per_kg = 59.90,');
      console.log('    updated_at = NOW();');
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

checkPricePerKg();

