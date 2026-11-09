// Conversión entre las filas de PostgreSQL (snake_case, en español) y los
// tipos de la aplicación (camelCase). Se aísla aquí para poder probarla.

import type {
  Adjustment,
  AdjustmentStatus,
  Branch,
  Category,
  MinStock,
  Movement,
  MovementType,
  Product,
  Role,
  Unit,
  UserProfile,
} from '../types';

type Row = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const optStr = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const UNITS: Unit[] = ['Cajas', 'Yardas', 'Unidades'];
export const toUnit = (v: unknown): Unit => (UNITS.includes(v as Unit) ? (v as Unit) : 'Cajas');

export function mapBranch(row: Row): Branch {
  return {
    id: str(row.id),
    code: str(row.codigo),
    name: str(row.nombre),
    address: optStr(row.direccion),
    active: row.activo !== false,
  };
}

export function mapProfile(row: Row, email: string): UserProfile {
  return {
    id: str(row.id),
    name: str(row.nombre, email),
    email,
    role: (row.rol === 'GERENTE' ? 'GERENTE' : 'ENCARGADO') as Role,
    branchId: optStr(row.id_sucursal) ?? null,
  };
}

export function mapCategory(row: Row): Category {
  return { id: str(row.id), name: str(row.nombre) };
}

export function mapProduct(row: Row): Product {
  return {
    id: str(row.id),
    code: str(row.codigo),
    name: str(row.nombre),
    description: str(row.descripcion),
    categoryId: optStr(row.id_categoria) ?? null,
    unit: toUnit(row.unidad),
    active: row.activo !== false,
  };
}

export function mapMovement(row: Row): Movement {
  return {
    id: str(row.id),
    productId: str(row.id_producto),
    branchId: str(row.id_sucursal),
    type: str(row.tipo) as MovementType,
    quantity: num(row.cantidad),
    unitCost: num(row.costo_unitario),
    date: str(row.creado_en),
    userId: str(row.id_usuario),
    transferId: optStr(row.id_transferencia),
    adjustmentId: optStr(row.id_ajuste),
    reference: optStr(row.referencia),
  };
}

export function mapMinStock(row: Row): MinStock {
  return {
    productId: str(row.id_producto),
    branchId: str(row.id_sucursal),
    quantity: num(row.cantidad),
  };
}

export function mapAdjustment(row: Row): Adjustment {
  return {
    id: str(row.id),
    productId: str(row.id_producto),
    branchId: str(row.id_sucursal),
    type: row.tipo === 'SALIDA' ? 'SALIDA' : 'ENTRADA',
    quantity: num(row.cantidad),
    reason: str(row.motivo),
    status: str(row.estado, 'PENDIENTE') as AdjustmentStatus,
    requestedBy: str(row.solicitado_por),
    reviewedBy: optStr(row.revisado_por),
    reviewedAt: optStr(row.revisado_en),
    date: str(row.creado_en),
  };
}

/** Fila de Excel → producto nuevo. Acepta encabezados con o sin tilde. */
export function mapExcelRowToProduct(
  row: Row,
  categories: Category[],
): Omit<Product, 'id' | 'active'> | null {
  const code = str(row.Codigo ?? row['Código'] ?? row.CODIGO).trim();
  const name = str(row.Producto ?? row.Nombre ?? row.PRODUCTO).trim();
  if (!code || !name) return null;
  const categoryName = str(row.Categoria ?? row['Categoría']).trim().toLowerCase();
  const category = categories.find(c => c.name.toLowerCase() === categoryName);
  return {
    code,
    name,
    description: str(row.Descripcion ?? row['Descripción']).trim(),
    categoryId: category?.id ?? null,
    unit: toUnit(row.Unidad),
  };
}
