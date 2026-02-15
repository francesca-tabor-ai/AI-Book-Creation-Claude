import { supabase } from '../lib/supabase';
import type { User } from '../types';

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithEmail(email: string, password: string, name?: string): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: { full_name: name },
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}`,
  });
  if (error) throw error;
}

export async function getCurrentAppUser(): Promise<User | null> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  // Retry once with delay to handle race condition with handle_new_user trigger
  let profile = await fetchProfile(authUser.id);
  if (!profile) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    profile = await fetchProfile(authUser.id);
  }
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name ?? undefined,
    picture: profile.picture ?? undefined,
    isVerified: !!authUser.email_confirmed_at,
    provider: authUser.app_metadata.provider === 'google' ? 'google' : 'email',
    createdAt: profile.created_at,
    tier: profile.subscription_tier as User['tier'],
    usage: {
      tokensUsed: profile.tokens_used,
      tokenLimit: profile.token_limit,
      tokensThisMonth: profile.tokens_this_month,
      projectCount: profile.project_count,
    },
  };
}

async function fetchProfile(authId: string) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authId)
    .single();
  return data;
}
