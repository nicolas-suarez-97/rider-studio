import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from './database.types';

export function isSupabaseServerConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!(url && key && !url.includes('your-project'));
}

/**
 * Cliente de servidor seguro respetuoso de RLS y autenticación por cookies.
 * Utiliza anon key de forma predeterminada para asegurar aislamiento por sesión.
 */
export async function createServerSupabaseClient() {
  if (!isSupabaseServerConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // El método setAll fue invocado desde un Server Component
        }
      },
    },
  });
}

/**
 * Cliente administrativo de servicio (Service Role).
 * SOLO para tareas internas aisladas donde se deba eludir RLS explícitamente.
 */
export function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || supabaseUrl.includes('your-project')) {
    return null;
  }

  return createSupabaseJsClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
