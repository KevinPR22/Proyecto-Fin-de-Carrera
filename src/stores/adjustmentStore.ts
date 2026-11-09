import { atom, computed } from 'nanostores';
import { supabase } from '../lib/supabaseClient';
import { mapAdjustment } from '../lib/mappers';
import type { Adjustment } from '../types';
import { describeDbError, notify } from './notificationStore';
import { reloadMovements } from './inventoryStore';

// Ajustes de inventario con aprobación (RF-10, RF-11). El encargado
// solicita; el gerente aprueba o rechaza mediante revisar_ajuste().

export const $adjustments = atom<Adjustment[]>([]);
export const $pendingAdjustments = computed($adjustments, list =>
  list.filter(a => a.status === 'PENDIENTE'),
);

export async function loadAdjustments(): Promise<void> {
  const { data, error } = await supabase
    .from('ajustes')
    .select('*')
    .order('creado_en', { ascending: false });
  if (error) {
    notify(describeDbError(error), 'error');
    return;
  }
  $adjustments.set((data ?? []).map(mapAdjustment));
}

export async function requestAdjustment(
  input: Pick<Adjustment, 'productId' | 'branchId' | 'type' | 'quantity' | 'reason'>,
): Promise<boolean> {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    notify('La cantidad debe ser mayor que cero', 'error');
    return false;
  }
  if (input.reason.trim().length < 5) {
    notify('Describa el motivo del ajuste', 'error');
    return false;
  }
  const { data, error } = await supabase
    .from('ajustes')
    .insert({
      id_producto: input.productId,
      id_sucursal: input.branchId,
      tipo: input.type,
      cantidad: input.quantity,
      motivo: input.reason.trim(),
    })
    .select()
    .single();
  if (error) {
    notify(describeDbError(error), 'error');
    return false;
  }
  $adjustments.set([mapAdjustment(data), ...$adjustments.get()]);
  notify('Ajuste enviado para aprobación');
  return true;
}

export async function reviewAdjustment(id: string, approve: boolean): Promise<boolean> {
  const { error } = await supabase.rpc('revisar_ajuste', { p_ajuste: id, p_aprobar: approve });
  if (error) {
    notify(describeDbError(error), 'error');
    return false;
  }
  await Promise.all([loadAdjustments(), approve ? reloadMovements() : Promise.resolve()]);
  notify(approve ? 'Ajuste aprobado y registrado en el Kardex' : 'Ajuste rechazado');
  return true;
}
