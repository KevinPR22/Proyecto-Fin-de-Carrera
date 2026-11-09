import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { motion } from 'motion/react';
import { FileDown } from 'lucide-react';
import { $movements, $products } from '../stores/inventoryStore';
import { $branches } from '../stores/branchStore';
import { $settings, formatMoney } from '../stores/settingsStore';
import { buildKardex, MOVEMENT_LABELS } from '../lib/calculations';
import type { UserProfile } from '../types';

// Kardex valorizado por Promedio Ponderado de un producto en una sucursal (RF-03).
export default function KardexView({ profile }: { profile: UserProfile }) {
  const products = useStore($products);
  const movements = useStore($movements);
  const branches = useStore($branches);
  const settings = useStore($settings);
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [branchId, setBranchId] = useState(profile.branchId ?? branches[0]?.id ?? '');

  const product = products.find(p => p.id === productId);
  const branch = branches.find(b => b.id === branchId);
  const rows = productId && branchId ? buildKardex(movements, productId, branchId) : [];
  const money = (n: number) => formatMoney(n, settings.currency);

  return (
    <motion.div key="kardex" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select aria-label="Producto" value={productId} onChange={e => setProductId(e.target.value)} className="border border-[#141414] bg-white px-4 py-2 text-sm">
          <option value="">Seleccionar producto...</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.code} · {p.name}
            </option>
          ))}
        </select>
        <select aria-label="Sucursal" value={branchId} onChange={e => setBranchId(e.target.value)} className="border border-[#141414] bg-white px-4 py-2 text-sm">
          {branches.map(b => (
            <option key={b.id} value={b.id}>
              {b.code} · {b.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!product || !branch || rows.length === 0}
          onClick={async () => {
            if (product && branch) (await import('../lib/pdfExporter')).exportKardexToPDF(product, branch, rows);
          }}
          className="flex items-center gap-2 border border-[#141414] bg-white px-4 py-2 text-sm font-medium hover:bg-[#141414] hover:text-white disabled:opacity-40"
        >
          <FileDown size={16} /> Exportar PDF
        </button>
      </div>

      <div className="overflow-x-auto border border-[#141414] bg-white">
        <table className="w-full text-right font-mono text-xs">
          <thead>
            <tr className="bg-[#141414] text-white uppercase">
              <th className="p-2 text-left" rowSpan={2}>Fecha</th>
              <th className="p-2 text-left" rowSpan={2}>Concepto</th>
              <th className="p-2 text-center" colSpan={2}>Entrada</th>
              <th className="p-2 text-center" colSpan={2}>Salida</th>
              <th className="p-2 text-center" colSpan={3}>Saldo</th>
            </tr>
            <tr className="bg-[#141414] text-white uppercase">
              <th className="p-2">Cant.</th>
              <th className="p-2">C. unit.</th>
              <th className="p-2">Cant.</th>
              <th className="p-2">C. unit.</th>
              <th className="p-2">Cant.</th>
              <th className="p-2">C. prom.</th>
              <th className="p-2">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.movementId} className="border-b border-slate-200">
                <td className="p-2 text-left whitespace-nowrap">{new Date(r.date).toLocaleDateString('es-PE')}</td>
                <td className="p-2 text-left">
                  {MOVEMENT_LABELS[r.type]}
                  {r.reference && <div className="opacity-60">{r.reference}</div>}
                </td>
                <td className="p-2">{r.inQty || ''}</td>
                <td className="p-2">{r.inQty ? money(r.unitCost) : ''}</td>
                <td className="p-2">{r.outQty || ''}</td>
                <td className="p-2">{r.outQty ? money(r.unitCost) : ''}</td>
                <td className="p-2 font-bold">{r.balanceQty}</td>
                <td className="p-2">{money(r.averageCost)}</td>
                <td className="p-2 font-bold">{money(r.balanceValue)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-12 text-center italic opacity-40">
                  Sin movimientos para el producto en esta sucursal
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
