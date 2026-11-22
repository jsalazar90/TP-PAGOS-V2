import { createClient, SupabaseClient } from '@supabase/supabase-js';

function cleanEnvValue(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();
}

const rawUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

// Sanitize URL: remove trailing slashes or '/rest/v1' if user mistakenly included it in .env
export const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');

const hasValidUrl = /^https?:\/\/.+/i.test(supabaseUrl);

let client: SupabaseClient | null = null;
if (hasValidUrl && supabaseAnonKey) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('[Supabase] Invalid configuration, falling back to local mode:', err);
    client = null;
  }
}

export const supabase = client;
export const isSupabaseConfigured = Boolean(supabase);
