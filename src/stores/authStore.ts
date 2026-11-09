import { atom, computed } from 'nanostores';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { mapProfile } from '../lib/mappers';
import type { UserProfile } from '../types';

// Autenticación con Supabase Auth (RF-08). El registro público y el acceso
// de demostración se retiraron: los usuarios los crea el gerente desde el
// panel de Supabase y su rol se guarda en la tabla perfiles.

export interface AuthState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

export const $authState = atom<AuthState>({ profile: null, isLoading: true, error: null });

export const $profile = computed($authState, s => s.profile);
export const $isAuthenticated = computed($authState, s => s.profile !== null);

async function loadProfile(user: User): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .eq('activo', true)
    .maybeSingle();
  if (error || !data) return null;
  return mapProfile(data, user.email ?? '');
}

export async function initializeAuth(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    const profile = user ? await loadProfile(user) : null;
    $authState.set({ profile, isLoading: false, error: null });
  } catch (error) {
    console.error('Error al verificar la sesión', error);
    $authState.set({ profile: null, isLoading: false, error: 'No se pudo verificar la sesión' });
  }
}

export async function signIn(email: string, password: string): Promise<boolean> {
  $authState.set({ ...$authState.get(), isLoading: true, error: null });
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      $authState.set({ profile: null, isLoading: false, error: 'Correo o contraseña incorrectos' });
      return false;
    }
    const profile = await loadProfile(data.user);
    if (!profile) {
      await supabase.auth.signOut();
      $authState.set({
        profile: null,
        isLoading: false,
        error: 'El usuario no tiene un perfil activo. Consulte con el gerente.',
      });
      return false;
    }
    $authState.set({ profile, isLoading: false, error: null });
    return true;
  } catch (error) {
    console.error('Error al iniciar sesión', error);
    $authState.set({ profile: null, isLoading: false, error: 'Error de conexión al iniciar sesión' });
    return false;
  }
}

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Error al cerrar sesión', error);
  } finally {
    $authState.set({ profile: null, isLoading: false, error: null });
  }
}
