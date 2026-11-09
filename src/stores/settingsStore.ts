import { atom } from 'nanostores';

export type AppSettings = {
  companyName: string;
  currency: 'PEN' | 'USD';
  defaultReportFormat: 'pdf' | 'excel';
  /** Mínimo usado cuando un producto no tiene stock mínimo propio en la sucursal */
  defaultMinStock: number;
  compactTables: boolean;
  notifications: boolean;
};

export const defaultSettings: AppSettings = {
  companyName: 'Distribuciones Dyno S.C.R.L.',
  currency: 'PEN',
  defaultReportFormat: 'pdf',
  defaultMinStock: 10,
  compactTables: false,
  notifications: true,
};

const STORAGE_KEY = 'inventario-multialmacen.settings';

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch (error) {
    console.warn('No se pudo leer la configuración guardada', error);
    return defaultSettings;
  }
}

export const $settings = atom<AppSettings>(loadSettings());

export function updateSettings(patch: Partial<AppSettings>) {
  const next = { ...$settings.get(), ...patch };
  $settings.set(next);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('No se pudo guardar la configuración', error);
  }
}

export function formatMoney(value: number, currency?: AppSettings['currency']) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: currency ?? $settings.get().currency,
    maximumFractionDigits: 2,
  }).format(value);
}
