import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
// Use a valid service role key - this should be the actual service role key from Supabase
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFra3RjY3llcW5xYWxqYXFsYW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjI0NzQ5MywiZXhwIjoyMDQ3ODIzNDkzfQ.8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ8QZ';

// Admin client with service role key for bypassing RLS
export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
