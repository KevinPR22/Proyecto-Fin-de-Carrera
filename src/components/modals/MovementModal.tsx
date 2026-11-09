import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import Modal from '../ui/Modal';
import Field, { inputClass } from '../ui/Field';
import { $movements, $products, registerMovement } from '../../stores/inventoryStore';
import { $branches } from '../../stores/branchStore';
import { $settings, formatMoney } from '../../stores/settingsStore';
import { calculateStock, currentAverageCost } from '../../lib/calculations';
import { operableBranches } from '../../lib/permissions';
import type { UserProfile } from '../../types';

// Registro de entradas (RF-01) y despachos (RF-02). El despacho se valoriza al
// costo promedio vigente y no puede superar el stock de la sucursal (RF-07).
export default function MovementModal({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const products = useStore($products).filter(p => p.active);
  const movements = useStore($movements);
  const settings = useStore($settings);
  const branches = operableBranches(profile, useStore($branches));
  const [type, setType] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');
  const [productId, setProductId] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  const available = productId && branchId ? calculateStock(movements, productId, branchId) : 0;
  const average = productId && branchId ? currentAverageCost(movements, productId, branchId) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await registerMovement({
      productId,
      branchId,
      type,
      quantity: Number(quantity),
      unitCost: type === 'ENTRADA' ? Number(unitCost) : undefined,
      reference,
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="Registrar entrada o despacho">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo" htmlFor="type">
            <select id="type" value={type} onChange={e => setType(e.target.value as 'ENTRADA' | 'SALIDA')} className={inputClass}>
              <option value="ENTRADA">Entrada (+)</option>
              <option value="SALIDA">Despacho (−)</option>
            </select>
          </Field>
          <Field label="Sucursal" htmlFor="branch">
            <select id="branch" required value={branchId} onChange={e => setBranchId(e.target.value)} className={inputClass}>
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.code} · {b.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Producto"
          htmlFor="product"
          hint={productId ? `Stock en la sucursal: ${available} · Costo promedio: ${formatMoney(average, settings.currency)}` : undefined}
        >
          <select id="product" required value={productId} onChange={e => setProductId(e.target.value)} className={inputClass}>
            <option value="">Seleccionar producto...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cantidad" htmlFor="quantity">
            <input
              id="quantity"
              type="number"
              min="0.01"
              step="0.01"
              max={type === 'SALIDA' ? available : undefined}
              required
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className={inputClass}
            />
          </Field>
          {type === 'ENTRADA' ? (
            <Field label="Costo unitario de compra" htmlFor="cost">
              <input id="cost" type="number" min="0" step="0.0001" required value={unitCost} onChange={e => setUnitCost(e.target.value)} className={inputClass} />
            </Field>
          ) : (
            <Field label="Costo unitario del despacho" htmlFor="cost" hint="Se toma el costo promedio vigente">
              <input id="cost" value={formatMoney(average, settings.currency)} readOnly className={inputClass} />
            </Field>
          )}
        </div>
        <Field label="Referencia" htmlFor="reference">
          <input
            id="reference"
            value={reference}
            onChange={e => setReference(e.target.value)}
            className={inputClass}
            placeholder={type === 'ENTRADA' ? 'Ej: Guía de remisión del proveedor 001-2345' : 'Ej: Despacho a pedido 120'}
          />
        </Field>
        <button
          type="submit"
          disabled={saving || branches.length === 0}
          className="mt-2 bg-[#141414] py-4 text-sm font-bold tracking-widest text-white uppercase hover:bg-[#141414]/90 disabled:opacity-40"
        >
          {saving ? 'Registrando...' : 'Confirmar registro'}
        </button>
      </form>
    </Modal>
  );
}
