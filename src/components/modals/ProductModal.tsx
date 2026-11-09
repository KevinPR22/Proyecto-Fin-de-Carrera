import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import Modal from '../ui/Modal';
import Field, { inputClass } from '../ui/Field';
import { $categories, $minStocks, $products, saveProduct } from '../../stores/inventoryStore';
import { $branches } from '../../stores/branchStore';
import { nextProductCode } from '../../lib/calculations';
import { toUnit } from '../../lib/mappers';
import { canOperateBranch } from '../../lib/permissions';
import type { Product, UserProfile } from '../../types';

interface ProductModalProps {
  product: Product | null;
  profile: UserProfile;
  onClose: () => void;
}

// Alta y edición de productos, con el stock mínimo por sucursal (RF-05).
export default function ProductModal({ product, profile, onClose }: ProductModalProps) {
  const products = useStore($products);
  const categories = useStore($categories);
  const minStocks = useStore($minStocks);
  const branches = useStore($branches).filter(b => b.active);
  const [saving, setSaving] = useState(false);

  const code = product?.code ?? nextProductCode(products);
  const minimumOf = (branchId: string) =>
    minStocks.find(m => m.productId === product?.id && m.branchId === branchId)?.quantity ?? 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const minimums: Record<string, number> = {};
    for (const b of branches) {
      const value = data.get(`min-${b.id}`);
      if (value !== null && canOperateBranch(profile, b.id)) minimums[b.id] = Number(value) || 0;
    }
    setSaving(true);
    const ok = await saveProduct({
      id: product?.id,
      code,
      name: String(data.get('name') ?? ''),
      description: String(data.get('description') ?? ''),
      categoryId: String(data.get('categoryId') ?? '') || null,
      unit: toUnit(data.get('unit')),
      active: data.get('active') === 'on',
      minimums,
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={product ? 'Editar producto' : 'Nuevo producto'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Código" htmlFor="code">
            <input id="code" value={code} readOnly className={`${inputClass} font-mono`} />
          </Field>
          <Field label="Unidad" htmlFor="unit">
            <select id="unit" name="unit" defaultValue={product?.unit ?? 'Cajas'} className={inputClass}>
              <option value="Cajas">Cajas</option>
              <option value="Yardas">Yardas</option>
              <option value="Unidades">Unidades</option>
            </select>
          </Field>
        </div>
        <Field label="Producto" htmlFor="name">
          <input id="name" name="name" required defaultValue={product?.name} className={inputClass} placeholder="Ej: Cinta de embalaje transparente" />
        </Field>
        <Field label="Descripción" htmlFor="description">
          <input id="description" name="description" defaultValue={product?.description} className={inputClass} placeholder="Ej: 2 pulg. x 100 yardas" />
        </Field>
        <Field label="Categoría" htmlFor="categoryId">
          <select id="categoryId" name="categoryId" defaultValue={product?.categoryId ?? ''} className={inputClass}>
            <option value="">Sin categoría</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <fieldset className="border border-slate-200 p-3">
          <legend className="px-1 text-[10px] font-bold uppercase opacity-70">Stock mínimo por sucursal</legend>
          <div className="grid grid-cols-3 gap-3">
            {branches.map(b => (
              <Field key={b.id} label={b.code} htmlFor={`min-${b.id}`}>
                <input
                  id={`min-${b.id}`}
                  name={`min-${b.id}`}
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={minimumOf(b.id)}
                  disabled={!canOperateBranch(profile, b.id)}
                  className={inputClass}
                />
              </Field>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={product?.active ?? true} /> Producto activo
        </label>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 bg-[#141414] py-4 text-sm font-bold tracking-widest text-white uppercase hover:bg-[#141414]/90 disabled:opacity-40"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </form>
    </Modal>
  );
}
