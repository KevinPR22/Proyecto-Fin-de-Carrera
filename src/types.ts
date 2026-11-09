// Tipos compartidos del Sistema de Gestión de Inventario Multialmacén.
// Alcance: control de almacén (sin ventas, comprobantes ni medios de pago).

export type Unit = 'Cajas' | 'Yardas' | 'Unidades';

export type Role = 'ENCARGADO' | 'GERENTE';

export type MovementType =
  | 'ENTRADA'
  | 'SALIDA'
  | 'TRANSFERENCIA_ENTRADA'
  | 'TRANSFERENCIA_SALIDA'
  | 'AJUSTE_ENTRADA'
  | 'AJUSTE_SALIDA';

export type AdjustmentStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address?: string;
  active: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  branchId: string | null;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  categoryId: string | null;
  unit: Unit;
  active: boolean;
}

export interface Movement {
  id: string;
  productId: string;
  branchId: string;
  type: MovementType;
  quantity: number;
  unitCost: number;
  date: string;
  userId: string;
  transferId?: string;
  adjustmentId?: string;
  reference?: string;
}

export interface MinStock {
  productId: string;
  branchId: string;
  quantity: number;
}

export interface Adjustment {
  id: string;
  productId: string;
  branchId: string;
  type: 'ENTRADA' | 'SALIDA';
  quantity: number;
  reason: string;
  status: AdjustmentStatus;
  requestedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  date: string;
}

/** Fila del Kardex valorizado por Promedio Ponderado */
export interface KardexRow {
  movementId: string;
  date: string;
  type: MovementType;
  reference?: string;
  inQty: number;
  outQty: number;
  unitCost: number;
  balanceQty: number;
  averageCost: number;
  balanceValue: number;
}

export interface StockAlert {
  product: Product;
  branch: Branch;
  stock: number;
  minimum: number;
}

export type TabType =
  | 'dashboard'
  | 'products'
  | 'movements'
  | 'kardex'
  | 'adjustments'
  | 'reports'
  | 'branches'
  | 'settings';

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error';
}
