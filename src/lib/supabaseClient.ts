import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
}

export async function getSupabaseSession(): Promise<Session | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const session = await getSupabaseSession();
  return session?.access_token ?? null;
}

export async function signInSupabaseEmail(email: string, password: string): Promise<{
  user: User | null;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: 'Supabase غير مربوط بعد عبر متغيرات البيئة.' };
  }
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: error.message };
  return { user: data.user };
}

export async function signUpSupabaseEmail(params: {
  email: string;
  password: string;
  fullName: string;
  role: 'buyer' | 'merchant';
  region: string;
  phone?: string;
}): Promise<{ user: User | null; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: 'Supabase غير مربوط بعد عبر متغيرات البيئة.' };
  }
  const { data, error } = await client.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        full_name: params.fullName,
        role: params.role,
        region: params.region,
        phone: params.phone || '',
      },
    },
  });
  if (error) return { user: null, error: error.message };
  return { user: data.user };
}

export async function signOutSupabase(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  await client.auth.signOut();
}
