import { describe, expect, it } from 'vitest';
import {
  buildKardex,
  calculateStock,
  currentAverageCost,
  filterProducts,
  getStockAlerts,
  inventoryValue,
  nextProductCode,
  signedQuantity,
  stockByBranch,
  validateMovement,
  weightedAverageCost,
} from '../calculations';
import { BRANCHES, CINTA, G9, I7, mv, O10 } from './fixtures';

describe('Stock por sucursal (RF-01, RF-02, RF-04)', () => {
  it('CP-01: stock luego de una entrada (10 + 5 = 15)', () => {
    const movements = [mv('ENTRADA', 10, 20), mv('ENTRADA', 5, 20)];
    expect(calculateStock(movements, CINTA.id, O10.id)).toBe(15);
  });

  it('CP-02: stock luego de una salida válida (10 − 4 = 6)', () => {
    const movements = [mv('ENTRADA', 10, 20), mv('SALIDA', 4)];
    expect(calculateStock(movements, CINTA.id, O10.id)).toBe(6);
  });

  it('CP-05: stock consolidado entre sucursales (10 + 5 + 0 = 15)', () => {
    const movements = [mv('ENTRADA', 10, 20, O10.id), mv('ENTRADA', 5, 20, G9.id)];
    const result = stockByBranch(movements, CINTA.id, BRANCHES);
    expect(result.perBranch).toEqual({ [O10.id]: 10, [G9.id]: 5, [I7.id]: 0 });
    expect(result.total).toBe(15);
  });

  it('CP-06: una transferencia mueve stock sin cambiar el total de la empresa', () => {
    const movements = [
      mv('ENTRADA', 10, 20, O10.id),
      mv('TRANSFERENCIA_SALIDA', 4, 20, O10.id),
      mv('TRANSFERENCIA_ENTRADA', 4, 20, G9.id),
    ];
    expect(calculateStock(movements, CINTA.id, O10.id)).toBe(6);
    expect(calculateStock(movements, CINTA.id, G9.id)).toBe(4);
    expect(calculateStock(movements, CINTA.id)).toBe(10);
  });

  it('los ajustes suman o restan según su tipo', () => {
    expect(signedQuantity({ type: 'AJUSTE_ENTRADA', quantity: 2 })).toBe(2);
    expect(signedQuantity({ type: 'AJUSTE_SALIDA', quantity: 2 })).toBe(-2);
  });
});

describe('Validación de movimientos (RF-07)', () => {
  it('CP-03: rechaza una salida mayor que el stock disponible', () => {
    const result = validateMovement({ type: 'SALIDA', quantity: 5, branchId: O10.id }, 3);
    expect(result).toEqual({ ok: false, error: 'Stock insuficiente: disponible 3' });
  });

  it('CP-04: rechaza cantidad igual a cero o negativa', () => {
    expect(validateMovement({ type: 'ENTRADA', quantity: 0, unitCost: 1, branchId: O10.id }, 0).ok).toBe(false);
    expect(validateMovement({ type: 'ENTRADA', quantity: -2, unitCost: 1, branchId: O10.id }, 0).ok).toBe(false);
  });

  it('acepta una salida igual al stock disponible', () => {
    expect(validateMovement({ type: 'SALIDA', quantity: 3, branchId: O10.id }, 3)).toEqual({ ok: true });
  });

  it('exige costo unitario en las entradas', () => {
    expect(validateMovement({ type: 'ENTRADA', quantity: 1, branchId: O10.id }, 0).ok).toBe(false);
    expect(validateMovement({ type: 'ENTRADA', quantity: 1, unitCost: Number.NaN, branchId: O10.id }, 0).ok).toBe(false);
  });

  it('exige la sucursal', () => {
    expect(validateMovement({ type: 'ENTRADA', quantity: 1, unitCost: 1, branchId: '' }, 0).ok).toBe(false);
  });

  it('CP-07: rechaza transferencias sin destino o hacia la misma sucursal', () => {
    expect(validateMovement({ type: 'TRANSFERENCIA_SALIDA', quantity: 1, branchId: O10.id }, 5).ok).toBe(false);
    expect(
      validateMovement({ type: 'TRANSFERENCIA_SALIDA', quantity: 1, branchId: O10.id, targetBranchId: O10.id }, 5),
    ).toEqual({ ok: false, error: 'La sucursal de origen y destino deben ser distintas' });
    expect(
      validateMovement({ type: 'TRANSFERENCIA_SALIDA', quantity: 1, branchId: O10.id, targetBranchId: G9.id }, 5).ok,
    ).toBe(true);
  });
});

describe('Costo Promedio Ponderado (RF-03)', () => {
  it('calcula el promedio al ingresar mercadería', () => {
    // 10 cajas a S/ 20 + 10 cajas a S/ 26 = 20 cajas a S/ 23
    expect(weightedAverageCost(10, 200, 10, 26)).toBe(23);
    expect(weightedAverageCost(0, 0, 0, 10)).toBe(0);
  });

  it('CP-08: Kardex valorizado con entradas a distinto costo y una salida', () => {
    const movements = [mv('ENTRADA', 100, 2.5), mv('ENTRADA', 50, 3.1), mv('SALIDA', 60)];
    const kardex = buildKardex(movements, CINTA.id, O10.id);

    expect(kardex).toHaveLength(3);
    // Promedio tras la segunda entrada: (250 + 155) / 150 = 2.7
    expect(kardex[1].averageCost).toBeCloseTo(2.7, 4);
    expect(kardex[1].balanceValue).toBe(405);
    // La salida sale al promedio vigente y no lo modifica
    expect(kardex[2].unitCost).toBeCloseTo(2.7, 4);
    expect(kardex[2].balanceQty).toBe(90);
    expect(kardex[2].averageCost).toBeCloseTo(2.7, 4);
    expect(kardex[2].balanceValue).toBe(243);
  });

  it('el saldo vuelve a cero cuando sale todo el stock', () => {
    const kardex = buildKardex([mv('ENTRADA', 5, 10), mv('SALIDA', 5)], CINTA.id, O10.id);
    expect(kardex[1].balanceQty).toBe(0);
    expect(kardex[1].balanceValue).toBe(0);
  });

  it('un ajuste positivo ingresa al costo promedio vigente', () => {
    const movements = [mv('ENTRADA', 10, 4), mv('AJUSTE_ENTRADA', 2, 999)];
    const kardex = buildKardex(movements, CINTA.id, O10.id);
    expect(kardex[1].unitCost).toBe(4);
    expect(kardex[1].averageCost).toBe(4);
    expect(currentAverageCost(movements, CINTA.id, O10.id)).toBe(4);
  });

  it('el Kardex de cada sucursal es independiente', () => {
    const movements = [mv('ENTRADA', 10, 4, O10.id), mv('ENTRADA', 10, 6, G9.id)];
    expect(currentAverageCost(movements, CINTA.id, O10.id)).toBe(4);
    expect(currentAverageCost(movements, CINTA.id, G9.id)).toBe(6);
    expect(currentAverageCost(movements, CINTA.id, I7.id)).toBe(0);
  });

  it('valoriza el inventario por sucursal y total', () => {
    const movements = [mv('ENTRADA', 10, 4, O10.id), mv('ENTRADA', 10, 6, G9.id)];
    expect(inventoryValue(movements, [CINTA], BRANCHES, O10.id)).toBe(40);
    expect(inventoryValue(movements, [CINTA], BRANCHES)).toBe(100);
  });
});

describe('Alertas de stock mínimo (RF-05)', () => {
  it('CP-09: producto bajo el mínimo aparece en las alertas (stock 4, mínimo 5)', () => {
    const movements = [mv('ENTRADA', 4, 1, O10.id)];
    const alerts = getStockAlerts([CINTA], [O10], movements, [{ productId: CINTA.id, branchId: O10.id, quantity: 5 }], 0);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ stock: 4, minimum: 5 });
  });

  it('CP-10: producto en el mínimo aparece en las alertas (stock 5, mínimo 5)', () => {
    const movements = [mv('ENTRADA', 5, 1, O10.id)];
    const alerts = getStockAlerts([CINTA], [O10], movements, [{ productId: CINTA.id, branchId: O10.id, quantity: 5 }], 0);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ stock: 5, minimum: 5 });
  });

  it('un mínimo configurado en cero desactiva la alerta', () => {
    const minimums = [{ productId: CINTA.id, branchId: O10.id, quantity: 0 }];
    expect(getStockAlerts([CINTA], [O10], [], minimums, 10)).toHaveLength(0);
  });

  it('usa el mínimo por defecto cuando no hay mínimo propio', () => {
    const alerts = getStockAlerts([CINTA], [O10, G9], [mv('ENTRADA', 20, 1, O10.id)], [], 10);
    expect(alerts.map(a => a.branch.code)).toEqual(['G9']);
  });

  it('ignora productos y sucursales inactivos', () => {
    const inactive = { ...CINTA, active: false };
    expect(getStockAlerts([inactive], [O10], [], [], 10)).toHaveLength(0);
    expect(getStockAlerts([CINTA], [{ ...O10, active: false }], [], [], 10)).toHaveLength(0);
  });
});

describe('Catálogo', () => {
  it('genera el siguiente código correlativo', () => {
    expect(nextProductCode([])).toBe('DY-001');
    expect(nextProductCode([{ code: 'DY-001' }, { code: 'DY-009' }, { code: 'OTRO' }])).toBe('DY-010');
  });

  it('filtra por código, nombre o descripción', () => {
    expect(filterProducts([CINTA], 'dy-001')).toHaveLength(1);
    expect(filterProducts([CINTA], 'transparente')).toHaveLength(1);
    expect(filterProducts([CINTA], '100 yd')).toHaveLength(1);
    expect(filterProducts([CINTA], 'stretch')).toHaveLength(0);
    expect(filterProducts([CINTA], '  ')).toHaveLength(1);
  });
});
