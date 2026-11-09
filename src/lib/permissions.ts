// Permisos por rol (RF-08). La interfaz oculta lo que el rol no puede hacer
// y las políticas RLS de db/schema.sql lo impiden en la base de datos.

import type { Role, TabType, UserProfile } from '../types';

export type Action =
  | 'registrar_movimiento'
  | 'registrar_transferencia'
  | 'solicitar_ajuste'
  | 'aprobar_ajuste'
  | 'gestionar_productos'
  | 'gestionar_sucursales'
  | 'ver_reportes';

const PERMISSIONS: Record<Role, ReadonlySet<Action>> = {
  ENCARGADO: new Set<Action>([
    'registrar_movimiento',
    'registrar_transferencia',
    'solicitar_ajuste',
    'gestionar_productos',
    'ver_reportes',
  ]),
  GERENTE: new Set<Action>([
    'registrar_movimiento',
    'registrar_transferencia',
    'solicitar_ajuste',
    'aprobar_ajuste',
    'gestionar_productos',
    'gestionar_sucursales',
    'ver_reportes',
  ]),
};

export function can(role: Role | undefined, action: Action): boolean {
  if (!role) return false;
  return PERMISSIONS[role].has(action);
}

/** El gerente opera todas las sucursales; el encargado, solo la asignada */
export function canOperateBranch(profile: Pick<UserProfile, 'role' | 'branchId'> | null, branchId: string): boolean {
  if (!profile) return false;
  if (profile.role === 'GERENTE') return true;
  return profile.branchId === branchId;
}

/** Pestañas del menú lateral según el rol (mapa de navegación de la Práctica 7) */
export function tabsForRole(role: Role | undefined): TabType[] {
  if (!role) return [];
  const common: TabType[] = ['dashboard', 'products', 'movements', 'kardex', 'adjustments', 'reports'];
  return role === 'GERENTE' ? [...common, 'branches', 'settings'] : [...common, 'settings'];
}

/** Sucursales activas en las que el usuario puede registrar operaciones */
export function operableBranches<T extends { id: string; active: boolean }>(
  profile: Pick<UserProfile, 'role' | 'branchId'> | null,
  branches: T[],
): T[] {
  return branches.filter(b => b.active && canOperateBranch(profile, b.id));
}
