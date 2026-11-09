import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import Modal from '../ui/Modal';
import Field, { inputClass } from '../ui/Field';
import { $movements, $products } from '../../stores/inventoryStore';
import { $branches } from '../../stores/branchStore';
import { requestAdjustment } from '../../stores/adjustmentStore';
import { calculateStock } from '../../lib/calculations';
import { operableBranches } from '../../lib/permissions';
import type { UserProfile } from '../../types';

// Solicitud de ajuste por diferencia de inventario (merma, rotura o conteo).
export default function AdjustmentModal({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const products = useStore($products).filter(p => p.active);
  const movements = useStore($movements);
  const branches = operableBranches(profile, useStore($branches));
  const [productId, setProductId] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [type, setType] = useState<'ENTRADA' | 'SALIDA'>('SALIDA');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const stock = productId && branchId ? calculateStock(movements, productId, branchId) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await requestAdjustment({ productId, branchId, type, quantity: Number(quantity), reason });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="Solicitar ajuste de inventario">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sucursal" htmlFor="a-branch">
            <select id="a-branch" required value={branchId} onChange={e => setBranchId(e.target.value)} className={inputClass}>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.code}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de ajuste" htmlFor="a-type">
            <select id="a-type" value={type} onChange={e => setType(e.target.value as 'ENTRADA' | 'SALIDA')} className={inputClass}>
              <option value="SALIDA">Disminuye stock (−)</option>
              <option value="ENTRADA">Aumenta stock (+)</option>
            </select>
          </Field>
        </div>
        <Field label="Producto" htmlFor="a-product" hint={productId ? `Stock registrado: ${stock}` : undefined}>
          <select id="a-product" required value={productId} onChange={e => setProductId(e.target.value)} className={inputClass}>
            <option value="">Seleccionar producto...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cantidad" htmlFor="a-qty">
          <input id="a-qty" type="number" min="0.01" step="0.01" required value={quantity} onChange={e => setQuantity(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Motivo" htmlFor="a-reason">
          <input id="a-reason" required minLength={5} value={reason} onChange={e => setReason(e.target.value)} className={inputClass} placeholder="Ej: Conteo físico del 27/10, 2 cajas dañadas" />
        </Field>
        <button
          type="submit"
          disabled={saving}
          className="mt-2 bg-[#141414] py-4 text-sm font-bold tracking-widest text-white uppercase hover:bg-[#141414]/90 disabled:opacity-40"
        >
          {saving ? 'Enviando...' : 'Enviar para aprobación'}
        </button>
      </form>
    </Modal>
  );
}
