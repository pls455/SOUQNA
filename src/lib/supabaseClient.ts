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

export type SupabaseProfile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: 'active' | 'blocked';
  region: string;
};

export async function getSupabaseProfile(userId?: string): Promise<SupabaseProfile | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const user = userId ? { id: userId } : (await client.auth.getUser()).data.user;
  if (!user) return null;
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, email, role, status, region')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data as SupabaseProfile;
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

export async function inviteTeamMember(params: {
  action: 'platform_admin' | 'store_staff';
  email: string;
  fullName: string;
  storeId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Supabase غير مربوط بعد عبر متغيرات البيئة.' };
  const { data, error } = await client.functions.invoke('invite-team-member', { body: params });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error || 'تعذر إرسال الدعوة.' };
  return { ok: true };
}
