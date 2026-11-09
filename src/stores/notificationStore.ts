import { atom } from 'nanostores';
import type { Notification } from '../types';
import { $settings } from './settingsStore';

export const $notifications = atom<Notification[]>([]);
let nextId = 1;

export function notify(message: string, type: 'success' | 'error' = 'success') {
  // Los errores siempre se muestran; los avisos de éxito dependen de la configuración
  if (type === 'success' && !$settings.get().notifications) return;

  const id = nextId++;
  $notifications.set([...$notifications.get(), { id, message, type }]);
  setTimeout(() => {
    $notifications.set($notifications.get().filter(n => n.id !== id));
  }, 3500);
}

/** Traduce los errores de PostgreSQL más comunes a mensajes para el usuario */
export function describeDbError(error: { code?: string; message: string }): string {
  switch (error.code) {
    case '23505':
      return 'Ya existe un registro con ese código';
    case '23503':
      return 'El registro está relacionado con otros datos y no puede modificarse';
    case '42501':
      return 'Su rol no tiene permiso para esta operación';
    case 'P0001':
      return error.message;
    default:
      return `Error de base de datos: ${error.message}`;
  }
}
