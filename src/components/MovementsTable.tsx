import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { motion } from 'motion/react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react';
import { $movements, $products } from '../stores/inventoryStore';
import { $branches } from '../stores/branchStore';
import { $settings, formatMoney } from '../stores/settingsStore';
import { isIncoming, MOVEMENT_LABELS, sortChronologically } from '../lib/calculations';
import { useUserNames } from '../hooks/useUserNames';
import type { UserProfile } from '../types';
import MovementModal from './modals/MovementModal';
import TransferModal from './modals/TransferModal';

// Historial de movimientos con sucursal, usuario y referencia (RF-09).
export default function MovementsTable({ profile }: { profile: UserProfile }) {
  const products = useStore($products);
  const movements = useStore($movements);
  const branches = useStore($branches);
  const settings = useStore($settings);
  const userNames = useUserNames();
  const [branchFilter, setBranchFilter] = useState(profile.role === 'GERENTE' ? '' : (profile.branchId ?? ''));
  const [modal, setModal] = useState<'movement' | 'transfer' | null>(null);

  const rows = sortChronologically(movements)
    .reverse()
    .filter(m => !branchFilter || m.branchId === branchFilter);
  const pad = settings.compactTables ? 'p-2' : 'p-3';

  return (
    <motion.div key="movements" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select
          aria-label="Filtrar por sucursal"
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          className="border border-[#141414] bg-white px-4 py-2 text-sm"
        >
          <option value="">Todas las sucursales</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>
              {b.code} · {b.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setModal('transfer')}
            className="flex items-center gap-2 border border-[#141414] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#141414] hover:text-white"
          >
            <ArrowLeftRight size={18} /> Transferir
          </button>
          <button
            type="button"
            onClick={() => setModal('movement')}
            className="flex items-center gap-2 bg-[#141414] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <ArrowDownLeft size={18} /> Entrada / salida
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-[#141414] bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#141414] font-mono text-xs text-white uppercase">
              <th className={pad}>Fecha</th>
              <th className={pad}>Sucursal</th>
              <th className={pad}>Producto</th>
              <th className={pad}>Tipo</th>
              <th className={`${pad} text-right`}>Cantidad</th>
              <th className={`${pad} text-right`}>Costo unit.</th>
              <th className={pad}>Usuario</th>
              <th className={pad}>Referencia</th>
            </tr>
          </thead>
          <tbody className={`font-mono ${settings.compactTables ? 'text-xs' : 'text-sm'}`}>
            {rows.map(m => {
              const product = products.find(p => p.id === m.productId);
              const incoming = isIncoming(m.type);
              return (
                <tr key={m.id} className="border-b border-[#141414]">
                  <td className={`${pad} text-xs whitespace-nowrap`}>{new Date(m.date).toLocaleString('es-PE')}</td>
                  <td className={pad}>{branches.find(b => b.id === m.branchId)?.code}</td>
                  <td className={pad}>
                    <div className="font-bold">{product?.code}</div>
                    <div className="text-xs opacity-60">{product?.name}</div>
                  </td>
                  <td className={pad}>
                    <span
                      className={`flex w-fit items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase ${
                        incoming ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {incoming ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                      {MOVEMENT_LABELS[m.type]}
                    </span>
                  </td>
                  <td className={`${pad} text-right font-bold`}>
                    {m.quantity} {product?.unit}
                  </td>
                  <td className={`${pad} text-right`}>{formatMoney(m.unitCost, settings.currency)}</td>
                  <td className={`${pad} text-xs`}>{userNames[m.userId] ?? '—'}</td>
                  <td className={`${pad} text-xs italic opacity-70`}>{m.reference}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-12 text-center italic opacity-40">
                  No hay movimientos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal === 'movement' && <MovementModal profile={profile} onClose={() => setModal(null)} />}
      {modal === 'transfer' && <TransferModal profile={profile} onClose={() => setModal(null)} />}
    </motion.div>
  );
}
