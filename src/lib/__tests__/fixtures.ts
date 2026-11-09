import type { Branch, Movement, MovementType, Product } from '../../types';

export const O10: Branch = { id: 'b-o10', code: 'O10', name: 'Almacén O10', active: true };
export const G9: Branch = { id: 'b-g9', code: 'G9', name: 'Almacén G9', active: true };
export const I7: Branch = { id: 'b-i7', code: 'I7', name: 'Almacén I7', active: true };
export const BRANCHES = [O10, G9, I7];

export const CINTA: Product = {
  id: 'p-1',
  code: 'DY-001',
  name: 'Cinta transparente',
  description: '2 pulg. x 100 yd',
  categoryId: 'c-1',
  unit: 'Cajas',
  active: true,
};

let seq = 0;

/** Crea un movimiento con fecha correlativa para mantener el orden */
export function mv(
  type: MovementType,
  quantity: number,
  unitCost = 0,
  branchId = O10.id,
  productId = CINTA.id,
): Movement {
  seq += 1;
  return {
    id: `m-${String(seq).padStart(4, '0')}`,
    productId,
    branchId,
    type,
    quantity,
    unitCost,
    date: new Date(Date.UTC(2026, 9, 1, 8, 0, seq)).toISOString(),
    userId: 'u-1',
  };
}
