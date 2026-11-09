import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { Branch, Category, KardexRow, Movement, Product } from '../types';
import { $settings, formatMoney } from '../stores/settingsStore';
import { buildMovementReport, buildStockReport, kardexToTable } from './reportData';
import { addReportFooter, addReportHeader } from './reportTemplate';

// Reportes en PDF generados en el navegador (RF-06).

const tableStyles = {
  theme: 'grid' as const,
  styles: { fontSize: 8, cellPadding: 4 },
  headStyles: { fillColor: [20, 20, 20] as [number, number, number], textColor: 255 },
  margin: { top: 90, left: 40, right: 40, bottom: 44 },
};

const money = (n: number) => formatMoney(n, $settings.get().currency);
const today = () => new Date().toISOString().slice(0, 10);

export function exportStockToPDF(
  products: Product[],
  branches: Branch[],
  movements: Movement[],
  categories: Category[],
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  const rows = buildStockReport(products, branches, movements, categories);
  const total = rows.reduce((acc, r) => acc + r.value, 0);

  addReportHeader(doc, 'Stock por sucursal', `${$settings.get().companyName} · Valor total: ${money(total)}`);
  autoTable(doc, {
    ...tableStyles,
    startY: 90,
    head: [['Código', 'Producto', 'Categoría', 'Unidad', ...branches.map(b => b.code), 'Total', 'Valor (PPP)']],
    body: rows.map(r => [r.code, r.name, r.category, r.unit, ...r.perBranch.map(String), String(r.total), money(r.value)]),
    didDrawPage: data => addReportFooter(doc, data.pageNumber),
  });
  doc.save(`Stock_${today()}.pdf`);
}

export function exportMovementsToPDF(
  movements: Movement[],
  products: Product[],
  branches: Branch[],
  from?: Date,
  to?: Date,
  branchId?: string,
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  const rows = buildMovementReport(movements, products, branches, from, to, branchId);
  const period = from && to ? `${from.toLocaleDateString('es-PE')} al ${to.toLocaleDateString('es-PE')}` : 'Todo el historial';

  addReportHeader(doc, 'Reporte de movimientos', `${$settings.get().companyName} · ${period}`);
  autoTable(doc, {
    ...tableStyles,
    startY: 90,
    head: [['Fecha', 'Sucursal', 'Código', 'Producto', 'Tipo', 'Cantidad', 'Costo unit.', 'Referencia']],
    body: rows.map(r => [
      new Date(r.date).toLocaleString('es-PE'),
      r.branch,
      r.code,
      r.product,
      r.type,
      String(r.quantity),
      money(r.unitCost),
      r.reference,
    ]),
    didDrawPage: data => addReportFooter(doc, data.pageNumber),
  });
  doc.save(`Movimientos_${today()}.pdf`);
}

export function exportKardexToPDF(product: Product, branch: Branch, rows: KardexRow[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  addReportHeader(doc, `Kardex valorizado · ${product.code}`, `${product.name} · Sucursal ${branch.code} · Método: Promedio Ponderado`);
  autoTable(doc, {
    ...tableStyles,
    startY: 90,
    head: [['Fecha', 'Concepto', 'Entrada', 'Salida', 'Costo unit.', 'Saldo', 'Costo prom.', 'Valor saldo']],
    body: kardexToTable(rows, money),
    didDrawPage: data => addReportFooter(doc, data.pageNumber),
  });
  doc.save(`Kardex_${product.code}_${branch.code}_${today()}.pdf`);
}
