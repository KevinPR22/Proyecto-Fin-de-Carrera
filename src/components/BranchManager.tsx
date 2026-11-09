import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { motion } from 'motion/react';
import { Pencil, Plus } from 'lucide-react';
import { $branches, saveBranch } from '../stores/branchStore';
import type { Branch } from '../types';
import Modal from './ui/Modal';
import Field, { inputClass } from './ui/Field';

// Gestión de sucursales (solo gerente). Agregar un almacén no requiere
// cambiar el código (RNF-06).
export default function BranchManager() {
  const branches = useStore($branches);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const isOpen = isCreating || editing !== null;

  const close = () => {
    setIsCreating(false);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const ok = await saveBranch({
      id: editing?.id,
      code: String(data.get('code') ?? ''),
      name: String(data.get('name') ?? ''),
      address: String(data.get('address') ?? ''),
      active: data.get('active') === 'on',
    });
    if (ok) close();
  };

  return (
    <motion.div key="branches" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-6 flex justify-end">
        <button type="button" onClick={() => setIsCreating(true)} className="flex items-center gap-2 bg-[#141414] px-5 py-2 text-sm font-semibold text-white hover:opacity-90">
          <Plus size={18} /> Nueva sucursal
        </button>
      </div>

      <div className="overflow-x-auto border border-[#141414] bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-[#141414] font-mono text-xs text-white uppercase">
              <th className="p-3">Código</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Dirección</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-center">Editar</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {branches.map(b => (
              <tr key={b.id} className="border-b border-[#141414]">
                <td className="p-3 font-bold">{b.code}</td>
                <td className="p-3">{b.name}</td>
                <td className="p-3">{b.address ?? '-'}</td>
                <td className="p-3">{b.active ? 'Activa' : 'Inactiva'}</td>
                <td className="p-3 text-center">
                  <button type="button" title="Editar sucursal" onClick={() => setEditing(b)} className="text-blue-600">
                    <Pencil size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isOpen} onClose={close} title={editing ? 'Editar sucursal' : 'Nueva sucursal'}>
        <form key={editing?.id ?? 'new'} onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Código" htmlFor="b-code" hint="Letras mayúsculas y números">
              <input id="b-code" name="code" required maxLength={10} pattern="[A-Za-z0-9]+" defaultValue={editing?.code} className={`${inputClass} font-mono uppercase`} />
            </Field>
            <Field label="Nombre" htmlFor="b-name">
              <input id="b-name" name="name" required defaultValue={editing?.name} className={inputClass} />
            </Field>
          </div>
          <Field label="Dirección" htmlFor="b-address">
            <input id="b-address" name="address" defaultValue={editing?.address} className={inputClass} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={editing?.active ?? true} /> Sucursal activa
          </label>
          <button type="submit" className="mt-2 bg-[#141414] py-4 text-sm font-bold tracking-widest text-white uppercase hover:bg-[#141414]/90">
            Guardar
          </button>
        </form>
      </Modal>
    </motion.div>
  );
}
