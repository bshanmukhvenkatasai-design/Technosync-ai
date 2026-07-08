import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl.startsWith('http') ? rawUrl : 'https://placeholder-demo-project-id.supabase.co';
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
if (!supabaseAnonKey || supabaseAnonKey.split('.').length !== 3) {
  console.warn("Invalid Supabase Anon Key format (must be JWT). Falling back to mock key to prevent app crash.");
  supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-anon-key';
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
