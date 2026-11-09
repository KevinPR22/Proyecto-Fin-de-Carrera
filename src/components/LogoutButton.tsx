import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { signOut } from '../stores/authStore';

export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    await signOut();
    window.location.href = '/login';
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      title="Cerrar sesión"
    >
      <LogOut size={18} />
      <span className="hidden md:inline">Cerrar sesión</span>
    </button>
  );
}
