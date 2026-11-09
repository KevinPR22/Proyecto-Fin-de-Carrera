import { describe, expect, it } from 'vitest';
import { can, canOperateBranch, operableBranches, tabsForRole } from '../permissions';
import { BRANCHES, G9, O10 } from './fixtures';

const encargado = { role: 'ENCARGADO' as const, branchId: O10.id };
const gerente = { role: 'GERENTE' as const, branchId: null };

describe('Permisos por rol (RF-08)', () => {
  it('CP-11: solo el gerente aprueba ajustes y gestiona sucursales', () => {
    expect(can('GERENTE', 'aprobar_ajuste')).toBe(true);
    expect(can('ENCARGADO', 'aprobar_ajuste')).toBe(false);
    expect(can('GERENTE', 'gestionar_sucursales')).toBe(true);
    expect(can('ENCARGADO', 'gestionar_sucursales')).toBe(false);
  });

  it('ambos roles registran movimientos y solicitan ajustes', () => {
    for (const role of ['GERENTE', 'ENCARGADO'] as const) {
      expect(can(role, 'registrar_movimiento')).toBe(true);
      expect(can(role, 'solicitar_ajuste')).toBe(true);
    }
  });

  it('sin rol no hay permisos', () => {
    expect(can(undefined, 'ver_reportes')).toBe(false);
    expect(tabsForRole(undefined)).toEqual([]);
  });

  it('CP-12: el encargado opera solo su sucursal; el gerente, todas', () => {
    expect(canOperateBranch(encargado, O10.id)).toBe(true);
    expect(canOperateBranch(encargado, G9.id)).toBe(false);
    expect(canOperateBranch(gerente, G9.id)).toBe(true);
    expect(canOperateBranch(null, O10.id)).toBe(false);
    expect(operableBranches(encargado, BRANCHES).map(b => b.code)).toEqual(['O10']);
    expect(operableBranches(gerente, BRANCHES)).toHaveLength(3);
  });

  it('el menú del gerente incluye Sucursales y el del encargado no', () => {
    expect(tabsForRole('GERENTE')).toContain('branches');
    expect(tabsForRole('ENCARGADO')).not.toContain('branches');
  });
});
