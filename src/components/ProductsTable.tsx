import React, { useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { motion } from 'motion/react';
import { FileUp, Pencil, Plus, Search } from 'lucide-react';
import { $categories, $movements, $products, importProducts } from '../stores/inventoryStore';
import { $branches } from '../stores/branchStore';
import { notify } from '../stores/notificationStore';
import { calculateStock, filterProducts } from '../lib/calculations';
import { can } from '../lib/permissions';
import type { Product, UserProfile } from '../types';
import ProductModal from './modals/ProductModal';

export default function ProductsTable({ profile }: { profile: UserProfile }) {
  const products = useStore($products);
  const categories = useStore($categories);
  const movements = useStore($movements);
  const branches = useStore($branches).filter(b => b.active);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canEdit = can(profile.role, 'gestionar_productos');

  const visible = filterProducts(products, search).filter(
    p => (showInactive || p.active) && (!categoryId || p.categoryId === categoryId),
  );

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { readProductsFromExcel } = await import('../lib/excelHandlers');
      const rows = await readProductsFromExcel(file, categories);
      await importProducts(rows);
    } catch (error) {
      console.error('Error al leer el Excel', error);
      notify('No se pudo leer el archivo. Verifique que sea un Excel con columnas Codigo y Producto.', 'error');
    }
  };

  return (
    <motion.div key="products" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 opacity-30" size={18} />
            <input
              aria-label="Buscar producto"
              placeholder="Buscar por código o nombre..."
              className="w-full border border-[#141414] bg-white py-2 pr-4 pl-10 text-sm focus:outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Filtrar por categoría"
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="border border-[#141414] bg-white px-4 py-2 text-sm"
          >
            <option value="">Todas las categorías</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />{' '}
            Ver inactivos
          </label>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 border border-[#141414] bg-white px-4 py-2 text-sm font-medium hover:bg-[#141414] hover:text-white"
            >
              <FileUp size={16} /> Importar Excel
            </button>
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 bg-[#141414] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <Plus size={18} /> Nuevo producto
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto border border-[#141414] bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-[#141414] font-mono text-xs text-white uppercase">
              <th className="p-3">Código</th>
              <th className="p-3">Producto</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Unidad</th>
              {branches.map(b => (
                <th key={b.id} className="p-3 text-right">
                  {b.code}
                </th>
              ))}
              <th className="p-3 text-right">Total</th>
              {canEdit && <th className="p-3 text-center">Editar</th>}
            </tr>
          </thead>
          <tbody className="font-mono">
            {visible.map(p => (
              <tr key={p.id} className={`border-b border-[#141414] ${p.active ? '' : 'opacity-50'}`}>
                <td className="p-3 font-bold">{p.code}</td>
                <td className="p-3">
                  <div>{p.name}</div>
                  <div className="text-xs opacity-60">{p.description}</div>
                </td>
                <td className="p-3">{categories.find(c => c.id === p.categoryId)?.name ?? '-'}</td>
                <td className="p-3">{p.unit}</td>
                {branches.map(b => (
                  <td key={b.id} className="p-3 text-right">
                    {calculateStock(movements, p.id, b.id)}
                  </td>
                ))}
                <td className="p-3 text-right font-bold">{calculateStock(movements, p.id)}</td>
                {canEdit && (
                  <td className="p-3 text-center">
                    <button type="button" onClick={() => setEditing(p)} title="Editar producto" className="text-blue-600">
                      <Pencil size={18} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={branches.length + 6} className="p-12 text-center italic opacity-40">
                  {search ? 'No se encontraron productos' : 'No hay productos registrados'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(isCreating || editing) && (
        <ProductModal
          product={editing}
          profile={profile}
          onClose={() => {
            setIsCreating(false);
            setEditing(null);
          }}
        />
      )}
    </motion.div>
  );
}
