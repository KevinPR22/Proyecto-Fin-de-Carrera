import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { motion } from 'motion/react';
import { Check, Plus, X } from 'lucide-react';
import { $adjustments, reviewAdjustment } from '../stores/adjustmentStore';
import { $products } from '../stores/inventoryStore';
import { $branches } from '../stores/branchStore';
import { useUserNames } from '../hooks/useUserNames';
import { can } from '../lib/permissions';
import type { AdjustmentStatus, UserProfile } from '../types';
import AdjustmentModal from './modals/AdjustmentModal';

const STATUS_STYLE: Record<AdjustmentStatus, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-800',
  APROBADO: 'bg-green-100 text-green-800',
  RECHAZADO: 'bg-red-100 text-red-800',
};

// Ajustes de inventario: el encargado solicita y el gerente aprueba o
// rechaza (RF-10, RF-11). Solo un ajuste aprobado modifica el Kardex.
export default function AdjustmentsPanel({ profile }: { profile: UserProfile }) {
  const adjustments = useStore($adjustments);
  const products = useStore($products);
  const branches = useStore($branches);
  const userNames = useUserNames();
  const [isOpen, setIsOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const canApprove = can(profile.role, 'aprobar_ajuste');

  const visible = adjustments.filter(a => profile.role === 'GERENTE' || a.branchId === profile.branchId);

  const review = async (id: string, approve: boolean) => {
    setBusy(id);
    await reviewAdjustment(id, approve);
    setBusy(null);
  };

  return (
    <motion.div key="adjustments" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-[#141414] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus size={18} /> Solicitar ajuste
        </button>
      </div>

      <div className="overflow-x-auto border border-[#141414] bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-[#141414] font-mono text-xs text-white uppercase">
              <th className="p-3">Fecha</th>
              <th className="p-3">Sucursal</th>
              <th className="p-3">Producto</th>
              <th className="p-3">Tipo</th>
              <th className="p-3 text-right">Cantidad</th>
              <th className="p-3">Motivo</th>
              <th className="p-3">Solicitó</th>
              <th className="p-3">Estado</th>
              {canApprove && <th className="p-3 text-center">Revisión</th>}
            </tr>
          </thead>
          <tbody className="font-mono">
            {visible.map(a => (
              <tr key={a.id} className="border-b border-[#141414]">
                <td className="p-3 text-xs whitespace-nowrap">{new Date(a.date).toLocaleString('es-PE')}</td>
                <td className="p-3">{branches.find(b => b.id === a.branchId)?.code}</td>
                <td className="p-3">{products.find(p => p.id === a.productId)?.code}</td>
                <td className="p-3">{a.type === 'ENTRADA' ? 'Aumenta (+)' : 'Disminuye (−)'}</td>
                <td className="p-3 text-right font-bold">{a.quantity}</td>
                <td className="p-3 text-xs">{a.reason}</td>
                <td className="p-3 text-xs">{userNames[a.requestedBy] ?? '—'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 text-[10px] font-bold ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                </td>
                {canApprove && (
                  <td className="p-3">
                    {a.status === 'PENDIENTE' && (
                      <div className="flex justify-center gap-2">
                        <button type="button" title="Aprobar" disabled={busy === a.id} onClick={() => review(a.id, true)} className="text-green-700 disabled:opacity-30">
                          <Check size={18} />
                        </button>
                        <button type="button" title="Rechazar" disabled={busy === a.id} onClick={() => review(a.id, false)} className="text-red-700 disabled:opacity-30">
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={canApprove ? 9 : 8} className="p-12 text-center italic opacity-40">
                  No hay ajustes registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isOpen && <AdjustmentModal profile={profile} onClose={() => setIsOpen(false)} />}
    </motion.div>
  );
}
