import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { AnimatePresence } from 'motion/react';
import type { TabType, UserProfile } from '../types';
import { $settings } from '../stores/settingsStore';
import { $branches, loadBranches } from '../stores/branchStore';
import { loadInventory } from '../stores/inventoryStore';
import { loadAdjustments } from '../stores/adjustmentStore';
import { tabsForRole } from '../lib/permissions';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import ProductsTable from './ProductsTable';
import MovementsTable from './MovementsTable';
import KardexView from './KardexView';
import AdjustmentsPanel from './AdjustmentsPanel';
import Reports from './Reports';
import BranchManager from './BranchManager';
import SettingsPanel from './SettingsPanel';
import NotificationContainer from './ui/Notification';

export const TAB_TITLES: Record<TabType, string> = {
  dashboard: 'Resumen de almacenes',
  products: 'Catálogo de productos',
  movements: 'Entradas, salidas y transferencias',
  kardex: 'Kardex valorizado',
  adjustments: 'Ajustes de inventario',
  reports: 'Reportes',
  branches: 'Sucursales',
  settings: 'Configuración',
};

export default function InventoryApp({ profile }: { profile: UserProfile }) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const settings = useStore($settings);
  const branches = useStore($branches);
  const allowedTabs = tabsForRole(profile.role);
  const assignedBranch = branches.find(b => b.id === profile.branchId);

  useEffect(() => {
    void Promise.all([loadBranches(), loadInventory(), loadAdjustments()]);
  }, []);

  const tab = allowedTabs.includes(activeTab) ? activeTab : 'dashboard';

  return (
    <div className="min-h-screen bg-[#E4E3E0] font-sans text-[#141414]">
      <Sidebar activeTab={tab} tabs={allowedTabs} onTabChange={setActiveTab} profile={profile} />

      <main className="ml-20 p-4 md:ml-64 md:p-8">
        <header className="mb-8">
          <h1 className="mb-1 font-serif text-3xl font-bold italic md:text-4xl">{TAB_TITLES[tab]}</h1>
          <p className="text-sm opacity-60">
            {settings.companyName} ·{' '}
            {profile.role === 'GERENTE' ? 'Todas las sucursales' : `Sucursal ${assignedBranch?.code ?? ''}`}
          </p>
        </header>

        <div className="max-w-7xl">
          <AnimatePresence mode="wait">
            {tab === 'dashboard' && <Dashboard profile={profile} />}
            {tab === 'products' && <ProductsTable profile={profile} />}
            {tab === 'movements' && <MovementsTable profile={profile} />}
            {tab === 'kardex' && <KardexView profile={profile} />}
            {tab === 'adjustments' && <AdjustmentsPanel profile={profile} />}
            {tab === 'reports' && <Reports profile={profile} />}
            {tab === 'branches' && <BranchManager />}
            {tab === 'settings' && <SettingsPanel />}
          </AnimatePresence>
        </div>
      </main>

      <NotificationContainer />
    </div>
  );
}
