import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import Modal from '../ui/Modal';
import Field, { inputClass } from '../ui/Field';
import { $movements, $products, registerTransfer } from '../../stores/inventoryStore';
import { $branches } from '../../stores/branchStore';
import { calculateStock } from '../../lib/calculations';
import { operableBranches } from '../../lib/permissions';
import type { UserProfile } from '../../types';

// Transferencia entre sucursales: genera una salida en el origen y una
// entrada en el destino al mismo costo promedio, en una sola transacción.
export default function TransferModal({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const products = useStore($products).filter(p => p.active);
  const movements = useStore($movements);
  const allBranches = useStore($branches).filter(b => b.active);
  const origins = operableBranches(profile, allBranches);
  const [productId, setProductId] = useState('');
  const [origin, setOrigin] = useState(origins[0]?.id ?? '');
  const [target, setTarget] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  const available = productId && origin ? calculateStock(movements, productId, origin) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await registerTransfer({
      productId,
      branchId: origin,
      targetBranchId: target,
      type: 'TRANSFERENCIA_SALIDA',
      quantity: Number(quantity),
      reference,
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="Transferencia entre sucursales">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="Producto" htmlFor="t-product" hint={productId ? `Disponible en origen: ${available}` : undefined}>
          <select id="t-product" required value={productId} onChange={e => setProductId(e.target.value)} className={inputClass}>
            <option value="">Seleccionar producto...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Origen" htmlFor="t-origin">
            <select id="t-origin" required value={origin} onChange={e => setOrigin(e.target.value)} className={inputClass}>
              {origins.map(b => (
                <option key={b.id} value={b.id}>
                  {b.code}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Destino" htmlFor="t-target">
            <select id="t-target" required value={target} onChange={e => setTarget(e.target.value)} className={inputClass}>
              <option value="">Seleccionar...</option>
              {allBranches
                .filter(b => b.id !== origin)
                .map(b => (
                  <option key={b.id} value={b.id}>
                    {b.code}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <Field label="Cantidad" htmlFor="t-qty">
          <input id="t-qty" type="number" min="0.01" step="0.01" max={available} required value={quantity} onChange={e => setQuantity(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Referencia" htmlFor="t-ref">
          <input id="t-ref" value={reference} onChange={e => setReference(e.target.value)} className={inputClass} placeholder="Ej: Reposición de stock en G9" />
        </Field>
        <button
          type="submit"
          disabled={saving}
          className="mt-2 bg-[#141414] py-4 text-sm font-bold tracking-widest text-white uppercase hover:bg-[#141414]/90 disabled:opacity-40"
        >
          {saving ? 'Registrando...' : 'Confirmar transferencia'}
        </button>
      </form>
    </Modal>
  );
}
