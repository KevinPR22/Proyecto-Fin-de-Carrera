import { atom, computed } from 'nanostores';
import { supabase } from '../lib/supabaseClient';
import { mapBranch } from '../lib/mappers';
import type { Branch } from '../types';
import { describeDbError, notify } from './notificationStore';

// Sucursales (almacenes). Se registran desde la interfaz, sin cambiar el
// código (RNF-06). Solo el gerente puede crearlas o editarlas (RLS).

export const $branches = atom<Branch[]>([]);
export const $activeBranches = computed($branches, list => list.filter(b => b.active));

export async function loadBranches(): Promise<void> {
  const { data, error } = await supabase.from('sucursales').select('*').order('codigo');
  if (error) {
    notify(describeDbError(error), 'error');
    return;
  }
  $branches.set((data ?? []).map(mapBranch));
}

export async function saveBranch(branch: Omit<Branch, 'id'> & { id?: string }): Promise<boolean> {
  const row = {
    codigo: branch.code.trim().toUpperCase(),
    nombre: branch.name.trim(),
    direccion: branch.address?.trim() || null,
    activo: branch.active,
  };
  const query = branch.id
    ? supabase.from('sucursales').update(row).eq('id', branch.id).select().single()
    : supabase.from('sucursales').insert(row).select().single();

  const { data, error } = await query;
  if (error) {
    notify(describeDbError(error), 'error');
    return false;
  }
  const saved = mapBranch(data);
  const others = $branches.get().filter(b => b.id !== saved.id);
  $branches.set([...others, saved].sort((a, b) => a.code.localeCompare(b.code)));
  notify(branch.id ? 'Sucursal actualizada' : 'Sucursal registrada');
  return true;
}
