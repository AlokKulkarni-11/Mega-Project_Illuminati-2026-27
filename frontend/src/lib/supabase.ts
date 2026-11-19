import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co'
);

if (!isSupabaseConfigured && import.meta.env.MODE !== 'test') {
  console.warn(
    '[MarketMind Supabase Auth] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
    'Please add your Supabase credentials to frontend/.env'
  );
}

// Create a singleton Supabase client
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'marketmind_supabase_auth',
    },
  }
);
