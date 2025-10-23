import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Supabase URL or Service Role Key is not set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fixCashRegister() {
  console.log('Fixing cash_register RLS policies...');
  
  try {
    // Test if we can read from cash_register
    const { data, error } = await supabase
      .from('cash_register')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error reading cash_register:', error);
    } else {
      console.log('Successfully read from cash_register:', data);
    }
    
    // Test if we can insert into cash_register
    const testData = {
      operation_type: 'test',
      amount: 0,
      operator_id: '00000000-0000-0000-0000-000000000000',
      notes: 'Test entry'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('cash_register')
      .insert(testData)
      .select();
    
    if (insertError) {
      console.error('Error inserting into cash_register:', insertError);
    } else {
      console.log('Successfully inserted into cash_register:', insertData);
      
      // Clean up test data
      if (insertData && insertData[0]) {
        await supabase
          .from('cash_register')
          .delete()
          .eq('id', insertData[0].id);
        console.log('Test data cleaned up');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixCashRegister();
