import { atom } from 'nanostores';
import { supabase } from '../lib/supabaseClient';
import { calculateStock, validateMovement, type MovementInput } from '../lib/calculations';
import { mapCategory, mapMinStock, mapMovement, mapProduct } from '../lib/mappers';
import type { Category, MinStock, Movement, Product } from '../types';
import { describeDbError, notify } from './notificationStore';

// Estado central del inventario: todas las pantallas leen productos,
// movimientos y mínimos desde aquí, así el Dashboard, el Kardex y las
// tablas muestran siempre el mismo dato.

export const $products = atom<Product[]>([]);
export const $categories = atom<Category[]>([]);
export const $movements = atom<Movement[]>([]);
export const $minStocks = atom<MinStock[]>([]);
export const $loading = atom<boolean>(false);

export async function loadInventory(): Promise<void> {
  $loading.set(true);
  try {
    const [products, categories, movements, minimums] = await Promise.all([
      supabase.from('productos').select('*').order('codigo'),
      supabase.from('categorias').select('*').order('nombre'),
      supabase.from('movimientos').select('*').order('creado_en'),
      supabase.from('stock_minimo').select('*'),
    ]);
    const failed = [products, categories, movements, minimums].find(r => r.error);
    if (failed?.error) throw failed.error;

    $products.set((products.data ?? []).map(mapProduct));
    $categories.set((categories.data ?? []).map(mapCategory));
    $movements.set((movements.data ?? []).map(mapMovement));
    $minStocks.set((minimums.data ?? []).map(mapMinStock));
  } catch (error) {
    console.error('Error al cargar el inventario', error);
    notify('No se pudo cargar el inventario', 'error');
  } finally {
    $loading.set(false);
  }
}

// --- Productos -------------------------------------------------------------

export interface ProductForm {
  id?: string;
  code: string;
  name: string;
  description: string;
  categoryId: string | null;
  unit: Product['unit'];
  active: boolean;
  minimums: Record<string, number>;
}

export async function saveProduct(form: ProductForm): Promise<boolean> {
  const row = {
    codigo: form.code.trim(),
    nombre: form.name.trim(),
    descripcion: form.description.trim() || null,
    id_categoria: form.categoryId,
    unidad: form.unit,
    activo: form.active,
  };
  const { data, error } = form.id
    ? await supabase.from('productos').update(row).eq('id', form.id).select().single()
    : await supabase.from('productos').insert(row).select().single();

  if (error) {
    notify(describeDbError(error), 'error');
    return false;
  }

  const saved = mapProduct(data);
  const minimumRows = Object.entries(form.minimums).map(([branchId, quantity]) => ({
    id_producto: saved.id,
    id_sucursal: branchId,
    cantidad: quantity,
  }));
  if (minimumRows.length > 0) {
    const res = await supabase.from('stock_minimo').upsert(minimumRows).select();
    if (res.error) notify(describeDbError(res.error), 'error');
    else {
      const others = $minStocks.get().filter(m => m.productId !== saved.id);
      $minStocks.set([...others, ...(res.data ?? []).map(mapMinStock)]);
    }
  }

  const others = $products.get().filter(p => p.id !== saved.id);
  $products.set([...others, saved].sort((a, b) => a.code.localeCompare(b.code)));
  notify(form.id ? 'Producto actualizado' : 'Producto registrado');
  return true;
}

export async function importProducts(rows: Omit<Product, 'id' | 'active'>[]): Promise<number> {
  const existing = new Set($products.get().map(p => p.code));
  const unique = rows.filter(r => !existing.has(r.code));
  if (unique.length === 0) {
    notify('El archivo no contiene productos nuevos', 'error');
    return 0;
  }
  const { data, error } = await supabase
    .from('productos')
    .insert(
      unique.map(r => ({
        codigo: r.code,
        nombre: r.name,
        descripcion: r.description || null,
        id_categoria: r.categoryId,
        unidad: r.unit,
      })),
    )
    .select();
  if (error) {
    notify(describeDbError(error), 'error');
    return 0;
  }
  const imported = (data ?? []).map(mapProduct);
  $products.set([...$products.get(), ...imported].sort((a, b) => a.code.localeCompare(b.code)));
  notify(`Se importaron ${imported.length} productos`);
  return imported.length;
}

// --- Movimientos (Kardex) --------------------------------------------------

export function getStock(productId: string, branchId?: string): number {
  return calculateStock($movements.get(), productId, branchId);
}

export interface MovementForm extends MovementInput {
  productId: string;
  reference?: string;
}

/** Entrada o salida simple (RF-01, RF-02) */
export async function registerMovement(form: MovementForm): Promise<boolean> {
  const check = validateMovement(form, getStock(form.productId, form.branchId));
  if (!check.ok) {
    notify(check.error, 'error');
    return false;
  }

  const { data, error } = await supabase
    .from('movimientos')
    .insert({
      id_producto: form.productId,
      id_sucursal: form.branchId,
      tipo: form.type,
      cantidad: form.quantity,
      costo_unitario: form.type === 'ENTRADA' ? form.unitCost : 0,
      referencia: form.reference?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    notify(describeDbError(error), 'error');
    return false;
  }
  $movements.set([...$movements.get(), mapMovement(data)]);
  notify('Movimiento registrado');
  return true;
}

/** Transferencia entre sucursales: dos movimientos en una sola transacción */
export async function registerTransfer(form: MovementForm & { targetBranchId: string }): Promise<boolean> {
  const check = validateMovement(
    { ...form, type: 'TRANSFERENCIA_SALIDA' },
    getStock(form.productId, form.branchId),
  );
  if (!check.ok) {
    notify(check.error, 'error');
    return false;
  }

  const { data: transferId, error } = await supabase.rpc('registrar_transferencia', {
    p_producto: form.productId,
    p_origen: form.branchId,
    p_destino: form.targetBranchId,
    p_cantidad: form.quantity,
    p_referencia: form.reference?.trim() || null,
  });
  if (error) {
    notify(describeDbError(error), 'error');
    return false;
  }

  const { data } = await supabase.from('movimientos').select('*').eq('id_transferencia', transferId);
  $movements.set([...$movements.get(), ...(data ?? []).map(mapMovement)]);
  notify('Transferencia registrada');
  return true;
}

/** Recarga solo los movimientos (después de aprobar un ajuste) */
export async function reloadMovements(): Promise<void> {
  const { data, error } = await supabase.from('movimientos').select('*').order('creado_en');
  if (error) {
    notify(describeDbError(error), 'error');
    return;
  }
  $movements.set((data ?? []).map(mapMovement));
}
