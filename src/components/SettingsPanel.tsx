import { useStore } from '@nanostores/react';
import { motion } from 'motion/react';
import { $settings, type AppSettings, updateSettings } from '../stores/settingsStore';

// Preferencias locales de cada usuario (se guardan en el navegador).
export default function SettingsPanel() {
  const settings = useStore($settings);
  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    updateSettings({ [key]: value } as Partial<AppSettings>);

  return (
    <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl border border-[#141414] bg-white p-8">
      <div className="flex flex-col gap-6 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase opacity-70">Nombre de la empresa en reportes</span>
          <input value={settings.companyName} onChange={e => set('companyName', e.target.value)} className="border-b-2 border-[#141414] py-2 focus:outline-none" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase opacity-70">Moneda</span>
          <select value={settings.currency} onChange={e => set('currency', e.target.value as AppSettings['currency'])} className="border-b-2 border-[#141414] bg-white py-2">
            <option value="PEN">Soles (PEN)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase opacity-70">Stock mínimo por defecto</span>
          <input
            type="number"
            min="0"
            value={settings.defaultMinStock}
            onChange={e => set('defaultMinStock', Math.max(0, Number(e.target.value) || 0))}
            className="border-b-2 border-[#141414] py-2 focus:outline-none"
          />
          <span className="text-[11px] opacity-60">Se aplica a los productos que no tienen un mínimo propio en la sucursal.</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.compactTables} onChange={e => set('compactTables', e.target.checked)} /> Tablas compactas
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.notifications} onChange={e => set('notifications', e.target.checked)} /> Mostrar avisos de
          confirmación
        </label>
      </div>
    </motion.div>
  );
}
