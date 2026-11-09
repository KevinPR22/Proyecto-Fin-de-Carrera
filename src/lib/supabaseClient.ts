import { createClient } from '@supabase/supabase-js';

// Único punto de acceso a la base de datos. Las credenciales se leen de
// .env (no versionado). Si faltan, la compilación continúa con valores de
// relleno y la aplicación avisa en pantalla en lugar de fallar.
const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true } },
);
