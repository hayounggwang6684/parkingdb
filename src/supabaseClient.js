import { createClient } from '@supabase/supabase-js';

const fallbackSupabaseUrl = 'https://khpzmtmchpkdtjxwygkp.supabase.co';
const fallbackSupabaseKey = 'sb_publishable_w7rFEoNebkEGemYUkcQ99A_yxqUXU84';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? fallbackSupabaseUrl;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? fallbackSupabaseKey;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
