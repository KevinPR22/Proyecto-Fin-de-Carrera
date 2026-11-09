import React from 'react';
import { useStore } from '@nanostores/react';
import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  ClipboardCheck,
  Layers,
  LayoutDashboard,
  Mail,
  ScrollText,
  Settings,
  Warehouse,
} from 'lucide-react';
import NavItem from './ui/NavItem';
import LogoutButton from './LogoutButton';
import { $pendingAdjustments } from '../stores/adjustmentStore';
import type { TabType, UserProfile } from '../types';

const NAV: Record<TabType, { label: string; icon: React.ReactNode }> = {
  dashboard: { label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  products: { label: 'Productos', icon: <Layers size={20} /> },
  movements: { label: 'Movimientos', icon: <ArrowLeftRight size={20} /> },
  kardex: { label: 'Kardex', icon: <ScrollText size={20} /> },
  adjustments: { label: 'Ajustes', icon: <ClipboardCheck size={20} /> },
  reports: { label: 'Reportes', icon: <BarChart3 size={20} /> },
  branches: { label: 'Sucursales', icon: <Building2 size={20} /> },
  settings: { label: 'Configuración', icon: <Settings size={20} /> },
};

interface SidebarProps {
  activeTab: TabType;
  tabs: TabType[];
  onTabChange: (tab: TabType) => void;
  profile: UserProfile;
}

export default function Sidebar({ activeTab, tabs, onTabChange, profile }: SidebarProps) {
  const pending = useStore($pendingAdjustments);

  return (
    <nav className="fixed top-0 left-0 z-40 flex h-full w-20 flex-col border-r border-[#141414] bg-white md:w-64">
      <div className="flex items-center gap-3 border-b border-[#141414] p-6">
        <div className="flex h-10 w-10 items-center justify-center bg-[#141414]">
          <Warehouse className="h-6 w-6 text-white" />
        </div>
        <span className="hidden font-serif text-xl font-bold tracking-tight italic md:block">Inventario Dyno</span>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto py-4">
        {tabs.map(tab => (
          <NavItem
            key={tab}
            active={activeTab === tab}
            onClick={() => onTabChange(tab)}
            icon={NAV[tab].icon}
            label={
              tab === 'adjustments' && profile.role === 'GERENTE' && pending.length > 0
                ? `${NAV[tab].label} (${pending.length})`
                : NAV[tab].label
            }
          />
        ))}
      </div>

      <div className="flex flex-col gap-4 border-t border-[#141414] p-4">
        <div className="hidden rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs md:block">
          <div className="mb-1 truncate font-semibold">{profile.name}</div>
          <div className="mb-1 font-mono text-[10px] uppercase opacity-60">{profile.role}</div>
          <div className="flex min-w-0 items-start gap-1 text-slate-600">
            <Mail size={12} className="mt-0.5 flex-shrink-0" />
            <span className="truncate">{profile.email}</span>
          </div>
        </div>
        <LogoutButton />
      </div>
    </nav>
  );
}
