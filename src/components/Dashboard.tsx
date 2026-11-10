import { useStore } from '@nanostores/react';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowLeftRight, Boxes, ClipboardCheck, Wallet } from 'lucide-react';
import { $minStocks, $movements, $products } from '../stores/inventoryStore';
import { $branches } from '../stores/branchStore';
import { $pendingAdjustments } from '../stores/adjustmentStore';
import { $settings, formatMoney } from '../stores/settingsStore';
import { calculateStock, getStockAlerts, inventoryValue } from '../lib/calculations';
import type { UserProfile } from '../types';
import StatCard from './ui/StatCard';

// Resumen de almacenes: stock y valor por sucursal, alertas de stock mínimo
// y ajustes pendientes. No muestra indicadores de venta (fuera del alcance).
export default function Dashboard({ profile }: { profile: UserProfile }) {
  const products = useStore($products);
  const movements = useStore($movements);
  const minimums = useStore($minStocks);
  const allBranches = useStore($branches);
  const pending = useStore($pendingAdjustments);
  const settings = useStore($settings);

  const activeBranches = allBranches.filter(b => b.active);
  const operatingBranches = activeBranches.filter(
    b => profile.role === 'GERENTE' || b.id === profile.branchId,
  );
  const activeProducts = products.filter(p => p.active);
  const alerts = getStockAlerts(activeProducts, operatingBranches, movements, minimums, settings.defaultMinStock);
  const totalValue = inventoryValue(movements, activeProducts, operatingBranches);
  const lastWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentMovements = movements.filter(
    m => new Date(m.date).getTime() >= lastWeek && operatingBranches.some(b => b.id === m.branchId),
  ).length;

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Valor del inventario"
          value={formatMoney(totalValue, settings.currency)}
          subtitle="Valorizado a costo promedio ponderado"
          icon={<Wallet className="text-blue-600" />}
        />
        <StatCard
          title="Productos activos"
          value={String(activeProducts.length)}
          subtitle={`${activeBranches.length} sucursal(es) visibles`}
          icon={<Boxes className="text-slate-700" />}
        />
        <StatCard
          title="Movimientos (7 días)"
          value={String(recentMovements)}
          subtitle="Entradas, despachos, transferencias y ajustes"
          icon={<ArrowLeftRight className="text-purple-600" />}
        />
        <StatCard
          title="Ajustes pendientes"
          value={String(pending.length)}
          subtitle={profile.role === 'GERENTE' ? 'Esperan su aprobación' : 'Enviados al gerente'}
          icon={<ClipboardCheck className="text-orange-600" />}
        />
      </div>

      <section className="border border-[#141414] bg-white p-6">
        <h2 className="mb-4 font-serif text-xl font-bold italic">Stock por sucursal</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#141414] font-mono text-xs uppercase opacity-60">
                <th className="py-2">Código</th>
                <th className="py-2">Producto</th>
                {activeBranches.map(b => (
                  <th key={b.id} className="py-2 text-right">
                    {b.code}
                  </th>
                ))}
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {activeProducts.map(p => {
                const perBranch = activeBranches.map(b => calculateStock(movements, p.id, b.id));
                const total = perBranch.reduce((a, n) => a + n, 0);
                return (
                  <tr key={p.id} className="border-b border-slate-200">
                    <td className="py-2">{p.code}</td>
                    <td className="py-2">{p.name}</td>
                    {perBranch.map((qty, i) => (
                      <td key={activeBranches[i].id} className="py-2 text-right">
                        {qty}
                      </td>
                    ))}
                    <td className="py-2 text-right font-bold">
                      {total} {p.unit}
                    </td>
                  </tr>
                );
              })}
              {activeProducts.length === 0 && (
                <tr>
                  <td colSpan={activeBranches.length + 3} className="py-8 text-center opacity-50">
                    No hay productos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border border-[#141414] bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-bold italic">Alertas de stock mínimo</h2>
          <AlertTriangle className="text-red-500" />
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#141414] font-mono text-xs uppercase opacity-60">
              <th className="py-2">Sucursal</th>
              <th className="py-2">Producto</th>
              <th className="py-2 text-right">Stock</th>
              <th className="py-2 text-right">Mínimo</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {alerts.slice(0, 10).map(a => (
              <tr key={`${a.product.id}-${a.branch.id}`} className="border-b border-slate-200">
                <td className="py-2">{a.branch.code}</td>
                <td className="py-2">
                  {a.product.code} · {a.product.name}
                </td>
                <td className="py-2 text-right font-bold text-red-700">{a.stock}</td>
                <td className="py-2 text-right">{a.minimum}</td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center opacity-50">
                  Sin alertas de stock
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </motion.div>
  );
}
