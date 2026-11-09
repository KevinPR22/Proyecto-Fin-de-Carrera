// Datos de los reportes (RF-06) separados de la generación del archivo:
// las mismas filas alimentan el PDF y el Excel, y se prueban sin navegador.

import type { Branch, Category, KardexRow, Movement, Product } from '../types';
import { buildKardex, calculateStock, MOVEMENT_LABELS, round2, sortChronologically } from './calculations';

export interface StockReportRow {
  code: string;
  name: string;
  category: string;
  unit: string;
  perBranch: number[];
  total: number;
  value: number;
}

/** Stock por sucursal, total consolidado y valor a costo promedio */
export function buildStockReport(
  products: Product[],
  branches: Branch[],
  movements: Movement[],
  categories: Category[],
): StockReportRow[] {
  return products
    .filter(p => p.active)
    .map(p => {
      const perBranch = branches.map(b => calculateStock(movements, p.id, b.id));
      const value = branches.reduce((acc, b) => {
        const kardex = buildKardex(movements, p.id, b.id);
        return acc + (kardex.length > 0 ? kardex[kardex.length - 1].balanceValue : 0);
      }, 0);
      return {
        code: p.code,
        name: p.name,
        category: categories.find(c => c.id === p.categoryId)?.name ?? '-',
        unit: p.unit,
        perBranch,
        total: round2(perBranch.reduce((a, n) => a + n, 0)),
        value: round2(value),
      };
    });
}

export interface MovementReportRow {
  date: string;
  branch: string;
  code: string;
  product: string;
  type: string;
  quantity: number;
  unitCost: number;
  reference: string;
}

/** Movimientos de un periodo, opcionalmente filtrados por sucursal */
export function buildMovementReport(
  movements: Movement[],
  products: Product[],
  branches: Branch[],
  from?: Date,
  to?: Date,
  branchId?: string,
): MovementReportRow[] {
  return sortChronologically(movements)
    .filter(m => {
      const t = new Date(m.date).getTime();
      if (from && t < from.getTime()) return false;
      if (to && t > to.getTime()) return false;
      return !branchId || m.branchId === branchId;
    })
    .map(m => {
      const product = products.find(p => p.id === m.productId);
      return {
        date: m.date,
        branch: branches.find(b => b.id === m.branchId)?.code ?? '',
        code: product?.code ?? '',
        product: product?.name ?? '',
        type: MOVEMENT_LABELS[m.type],
        quantity: m.quantity,
        unitCost: m.unitCost,
        reference: m.reference ?? '',
      };
    });
}

/** Filas de Kardex listas para imprimir */
export function kardexToTable(rows: KardexRow[], money: (n: number) => string): string[][] {
  return rows.map(r => [
    new Date(r.date).toLocaleDateString('es-PE'),
    MOVEMENT_LABELS[r.type],
    r.inQty ? String(r.inQty) : '',
    r.outQty ? String(r.outQty) : '',
    money(r.unitCost),
    String(r.balanceQty),
    money(r.averageCost),
    money(r.balanceValue),
  ]);
}

/** Convierte una hoja leída (primera fila = encabezados) en objetos */
export function sheetToObjects(sheet: unknown[][]): Record<string, unknown>[] {
  if (sheet.length < 2) return [];
  const headers = sheet[0].map(h => String(h ?? '').trim());
  return sheet.slice(1).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])));
}
