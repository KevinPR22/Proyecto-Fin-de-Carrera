// Reglas del inventario en funciones puras: no dependen de la interfaz ni
// de Supabase, por lo que se prueban con Vitest (src/lib/calculations.test.ts).
// La misma regla de Promedio Ponderado está en db/schema.sql (costo_promedio).

import type {
  Branch,
  KardexRow,
  MinStock,
  Movement,
  MovementType,
  Product,
  StockAlert,
} from '../types';

const INCOMING: ReadonlySet<MovementType> = new Set([
  'ENTRADA',
  'TRANSFERENCIA_ENTRADA',
  'AJUSTE_ENTRADA',
]);

/** Redondeo a 4 decimales para costos y a 2 para cantidades y valores */
export const round4 = (n: number) => Math.round(n * 10_000) / 10_000;
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function isIncoming(type: MovementType): boolean {
  return INCOMING.has(type);
}

/** Cantidad con signo: positiva si ingresa al almacén, negativa si sale */
export function signedQuantity(m: Pick<Movement, 'type' | 'quantity'>): number {
  return isIncoming(m.type) ? m.quantity : -m.quantity;
}

/** Ordena los movimientos en orden cronológico estable */
export function sortChronologically<T extends Pick<Movement, 'date' | 'id'>>(movements: T[]): T[] {
  return [...movements].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });
}

/**
 * Stock de un producto. Si se indica la sucursal, devuelve el stock de esa
 * sucursal; si no, el stock consolidado de la empresa (RF-04).
 */
export function calculateStock(movements: Movement[], productId: string, branchId?: string): number {
  const total = movements
    .filter(m => m.productId === productId && (branchId === undefined || m.branchId === branchId))
    .reduce((acc, m) => acc + signedQuantity(m), 0);
  return round2(total);
}

/** Stock del producto en cada sucursal, más el total consolidado */
export function stockByBranch(
  movements: Movement[],
  productId: string,
  branches: Branch[],
): { perBranch: Record<string, number>; total: number } {
  const perBranch: Record<string, number> = {};
  for (const b of branches) {
    perBranch[b.id] = calculateStock(movements, productId, b.id);
  }
  return { perBranch, total: calculateStock(movements, productId) };
}

/**
 * Costo promedio ponderado (RF-03). Se recalcula con cada ingreso:
 *   nuevo promedio = (valor del saldo + cantidad ingresada × costo) / nuevo saldo
 */
export function weightedAverageCost(
  balanceQty: number,
  balanceValue: number,
  inQty: number,
  inUnitCost: number,
): number {
  const qty = balanceQty + inQty;
  if (qty <= 0) return 0;
  return round4((balanceValue + inQty * inUnitCost) / qty);
}

/**
 * Kardex valorizado de un producto en una sucursal (RF-03, RF-09).
 * Los ingresos entran a su costo; las salidas salen al promedio vigente.
 */
export function buildKardex(movements: Movement[], productId: string, branchId: string): KardexRow[] {
  const rows: KardexRow[] = [];
  let qty = 0;
  let value = 0;
  let average = 0;

  const own = movements.filter(m => m.productId === productId && m.branchId === branchId);

  for (const m of sortChronologically(own)) {
    let unitCost: number;
    if (isIncoming(m.type)) {
      unitCost = m.type === 'AJUSTE_ENTRADA' ? average : m.unitCost;
      average = weightedAverageCost(qty, value, m.quantity, unitCost);
      qty = round2(qty + m.quantity);
      value = round2(qty * average);
    } else {
      unitCost = average;
      qty = round2(qty - m.quantity);
      value = qty > 0 ? round2(qty * average) : 0;
    }

    rows.push({
      movementId: m.id,
      date: m.date,
      type: m.type,
      reference: m.reference,
      inQty: isIncoming(m.type) ? m.quantity : 0,
      outQty: isIncoming(m.type) ? 0 : m.quantity,
      unitCost,
      balanceQty: qty,
      averageCost: average,
      balanceValue: value,
    });
  }

  return rows;
}

/** Costo promedio vigente de un producto en una sucursal */
export function currentAverageCost(movements: Movement[], productId: string, branchId: string): number {
  const kardex = buildKardex(movements, productId, branchId);
  return kardex.length > 0 ? kardex[kardex.length - 1].averageCost : 0;
}

/** Valor del inventario de una sucursal, o de toda la empresa si no se indica */
export function inventoryValue(
  movements: Movement[],
  products: Product[],
  branches: Branch[],
  branchId?: string,
): number {
  const targetBranches = branchId ? branches.filter(b => b.id === branchId) : branches;
  let total = 0;
  for (const p of products) {
    for (const b of targetBranches) {
      const kardex = buildKardex(movements, p.id, b.id);
      if (kardex.length > 0) total += kardex[kardex.length - 1].balanceValue;
    }
  }
  return round2(total);
}

export interface MovementInput {
  type: MovementType;
  quantity: number;
  unitCost?: number;
  branchId: string;
  targetBranchId?: string;
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * Validación previa al registro (RF-07). La base de datos repite la
 * validación de stock en el trigger validar_movimiento().
 */
export function validateMovement(input: MovementInput, availableStock: number): ValidationResult {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { ok: false, error: 'La cantidad debe ser mayor que cero' };
  }
  if (!input.branchId) {
    return { ok: false, error: 'Seleccione la sucursal' };
  }
  if (input.type === 'ENTRADA' && (input.unitCost === undefined || Number.isNaN(input.unitCost) || input.unitCost < 0)) {
    return { ok: false, error: 'Ingrese el costo unitario de la entrada' };
  }
  if (input.type === 'TRANSFERENCIA_SALIDA') {
    if (!input.targetBranchId) return { ok: false, error: 'Seleccione la sucursal de destino' };
    if (input.targetBranchId === input.branchId) {
      return { ok: false, error: 'La sucursal de origen y destino deben ser distintas' };
    }
  }
  if (!isIncoming(input.type) && input.quantity > availableStock) {
    return { ok: false, error: `Stock insuficiente: disponible ${availableStock}` };
  }
  return { ok: true };
}

/**
 * Productos por debajo de su stock mínimo en cada sucursal (RF-05).
 * Si un producto no tiene mínimo propio en la sucursal, se usa el mínimo
 * por defecto de la configuración. Un producto en el mínimo no genera alerta.
 */
export function getStockAlerts(
  products: Product[],
  branches: Branch[],
  movements: Movement[],
  minimums: MinStock[],
  defaultMinimum: number,
): StockAlert[] {
  const alerts: StockAlert[] = [];
  for (const product of products.filter(p => p.active)) {
    for (const branch of branches.filter(b => b.active)) {
      const own = minimums.find(m => m.productId === product.id && m.branchId === branch.id);
      const minimum = own ? own.quantity : defaultMinimum;
      const stock = calculateStock(movements, product.id, branch.id);
      if (stock < minimum) alerts.push({ product, branch, stock, minimum });
    }
  }
  return alerts.sort((a, b) => a.stock - a.minimum - (b.stock - b.minimum));
}

/** Búsqueda por código, nombre o descripción */
export function filterProducts(products: Product[], searchTerm: string): Product[] {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return products;
  return products.filter(
    p =>
      p.code.toLowerCase().includes(term) ||
      p.name.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term),
  );
}

/** Siguiente código correlativo con el prefijo de la empresa (DY-001, DY-002, ...) */
export function nextProductCode(products: Pick<Product, 'code'>[], prefix = 'DY'): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  const used = products
    .map(p => pattern.exec(p.code))
    .filter((m): m is RegExpExecArray => m !== null)
    .map(m => Number.parseInt(m[1], 10));
  const next = used.length > 0 ? Math.max(...used) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

/** Etiqueta legible del tipo de movimiento */
export const MOVEMENT_LABELS: Record<MovementType, string> = {
  ENTRADA: 'Entrada',
  SALIDA: 'Salida',
  TRANSFERENCIA_ENTRADA: 'Transferencia (ingreso)',
  TRANSFERENCIA_SALIDA: 'Transferencia (salida)',
  AJUSTE_ENTRADA: 'Ajuste (+)',
  AJUSTE_SALIDA: 'Ajuste (-)',
};
