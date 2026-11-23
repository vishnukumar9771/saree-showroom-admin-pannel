/**
 * Supabase Integration Readiness Adapter
 *
 * This module prepares AARANYA for production Supabase Auth + PostgreSQL + RLS.
 * When VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured in environment
 * variables, the application can switch seamlessly from Preview Local Scrypt mode
 * to Supabase JWT + Row Level Security verification.
 */

export interface SupabaseEnvironmentConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export function getSupabaseConfig(): SupabaseEnvironmentConfig {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
}
