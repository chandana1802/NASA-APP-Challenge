import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      supabasePublishableKey &&
      !supabaseUrl.includes('your-project-ref') &&
      !supabasePublishableKey.includes('your-supabase')
  );
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!cachedClient && supabaseUrl && supabasePublishableKey) {
    cachedClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return cachedClient;
}

export const SUPABASE_STAGE_STATUS = {
  stage: isSupabaseConfigured()
    ? 'Stage 2 – Connected to Supabase Project'
    : 'Stage 1 – Frontend Foundation (Demo Mode)',
  configured: isSupabaseConfigured(),
  projectUrl: supabaseUrl ?? 'Not configured',
  requiredBrowserVars: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'],
  preparedBuckets: ['soil-reports', 'research-reports', 'farm-documents'],
  migrationFile: 'supabase/migrations/001_initial_schema.sql',
};
