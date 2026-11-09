import { readSheet } from 'read-excel-file/browser';
import writeXlsxFile from 'write-excel-file/browser';
import type { Branch, Category, Product } from '../types';
import { mapExcelRowToProduct } from './mappers';
import { sheetToObjects, type MovementReportRow, type StockReportRow } from './reportData';

// Importación y exportación a Excel en el navegador. Se reemplazó la
// librería xlsx (SheetJS 0.18.5) por tener vulnerabilidades altas sin
// corrección publicada en npm.

/** Lee productos de la primera hoja: columnas Codigo, Producto, Descripcion, Categoria, Unidad */
export async function readProductsFromExcel(
  file: File,
  categories: Category[],
): Promise<Omit<Product, 'id' | 'active'>[]> {
  const sheet = await readSheet(file);
  return sheetToObjects(sheet as unknown[][])
    .map(row => mapExcelRowToProduct(row, categories))
    .filter((p): p is Omit<Product, 'id' | 'active'> => p !== null);
}

const header = (titles: string[]) => titles.map(value => ({ value, fontWeight: 'bold' as const }));

export async function exportInventoryToExcel(
  stock: StockReportRow[],
  branches: Branch[],
  moves: MovementReportRow[],
): Promise<void> {
  const stockSheet = [
    header(['Código', 'Producto', 'Categoría', 'Unidad', ...branches.map(b => b.code), 'Total', 'Valor (PPP)']),
    ...stock.map(r => [r.code, r.name, r.category, r.unit, ...r.perBranch, r.total, r.value]),
  ];
  const movementSheet = [
    header(['Fecha', 'Sucursal', 'Código', 'Producto', 'Tipo', 'Cantidad', 'Costo unitario', 'Referencia']),
    ...moves.map(r => [new Date(r.date), r.branch, r.code, r.product, r.type, r.quantity, r.unitCost, r.reference]),
  ];

  await writeXlsxFile([
    { sheet: 'Stock por sucursal', data: stockSheet, dateFormat: 'dd/mm/yyyy' },
    { sheet: 'Movimientos', data: movementSheet, dateFormat: 'dd/mm/yyyy hh:mm' },
  ]).toFile(`Inventario_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
