import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://khpzmtmchpkdtjxwygkp.supabase.co';
const supabaseKey = 'sb_publishable_w7rFEoNebkEGemYUkcQ99A_yxqUXU84';

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;
