import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { motion } from 'motion/react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { $categories, $movements, $products } from '../stores/inventoryStore';
import { $branches } from '../stores/branchStore';
import { $settings, formatMoney } from '../stores/settingsStore';
import { buildMovementReport, buildStockReport } from '../lib/reportData';
import type { UserProfile } from '../types';
import ReportCard from './ui/ReportCard';

// Reportes de almacén en PDF y Excel (RF-06): stock por sucursal valorizado
// y movimientos por periodo. Se retiraron los rankings de "más vendidos".
// Las librerías de PDF y Excel se cargan solo al exportar (import dinámico).
export default function Reports({ profile }: { profile: UserProfile }) {
  const products = useStore($products);
  const categories = useStore($categories);
  const movements = useStore($movements);
  const allBranches = useStore($branches);
  const settings = useStore($settings);
  const branches = profile.role === 'GERENTE' ? allBranches : allBranches.filter(b => b.id === profile.branchId);

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState(profile.role === 'GERENTE' ? '' : (profile.branchId ?? ''));

  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T23:59:59.999`);
  const validPeriod = fromDate <= toDate;
  const selectedBranches = branchId ? branches.filter(b => b.id === branchId) : branches;
  const stockBranches = selectedBranches.filter(b => b.active);
  const selectedMovements = movements.filter(m => selectedBranches.some(b => b.id === m.branchId));
  const stock = buildStockReport(products, stockBranches, selectedMovements, categories);
  const period = buildMovementReport(selectedMovements, products, selectedBranches, fromDate, toDate);
  const totalValue = stock.reduce((acc, r) => acc + r.value, 0);

  return (
    <motion.div key="reports" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid gap-6 lg:grid-cols-2">
      <label className="flex flex-wrap items-center gap-3 text-sm lg:col-span-2">
        Sucursal de los reportes
        <select
          value={branchId}
          disabled={profile.role !== 'GERENTE'}
          onChange={e => setBranchId(e.target.value)}
          className="border border-[#141414] px-2 py-1"
        >
          <option value="">Todas</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.code}</option>)}
        </select>
      </label>
      <ReportCard title="Stock por sucursal" description="Saldo de cada producto por almacén y valor a costo promedio ponderado.">
        <p className="mb-6 text-sm">
          {stock.length} productos · Valor total <strong>{formatMoney(totalValue, settings.currency)}</strong>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => (await import('../lib/pdfExporter')).exportStockToPDF(products, stockBranches, selectedMovements, categories)}
            className="flex items-center gap-2 bg-[#141414] px-4 py-2 text-sm text-white"
          >
            <FileDown size={16} /> PDF
          </button>
          <button
            type="button"
            disabled={!validPeriod}
            onClick={async () => (await import('../lib/excelHandlers')).exportInventoryToExcel(stock, stockBranches, period)}
            className="flex items-center gap-2 border border-[#141414] px-4 py-2 text-sm disabled:opacity-50"
          >
            <FileSpreadsheet size={16} /> Excel (stock y movimientos)
          </button>
        </div>
      </ReportCard>

      <ReportCard title="Movimientos por periodo" description="Entradas, despachos, transferencias y ajustes registrados entre dos fechas.">
        <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
          <input aria-label="Desde" type="date" value={from} onChange={e => setFrom(e.target.value)} className="border border-[#141414] px-2 py-1" />
          <input aria-label="Hasta" type="date" value={to} onChange={e => setTo(e.target.value)} className="border border-[#141414] px-2 py-1" />
        </div>
        <p className="mb-6 text-sm">
          {validPeriod ? `${period.length} movimientos en el periodo` : 'Selecciona un rango de fechas válido para exportar los movimientos.'}
        </p>
        <button
          type="button"
          disabled={!validPeriod}
          onClick={async () =>
            (await import('../lib/pdfExporter')).exportMovementsToPDF(selectedMovements, products, selectedBranches, fromDate, toDate)
          }
          className="flex items-center gap-2 bg-[#141414] px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          <FileDown size={16} /> PDF
        </button>
      </ReportCard>
    </motion.div>
  );
}
