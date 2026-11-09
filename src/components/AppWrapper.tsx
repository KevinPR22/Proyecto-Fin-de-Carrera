import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $authState, initializeAuth } from '../stores/authStore';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import InventoryApp from './InventoryApp';

// Protección de la ruta principal: sin sesión válida y perfil activo,
// el usuario vuelve a la pantalla de inicio de sesión.
export default function AppWrapper() {
  const auth = useStore($authState);

  useEffect(() => {
    void initializeAuth();
  }, []);

  useEffect(() => {
    if (!auth.isLoading && !auth.profile) window.location.href = '/login';
  }, [auth.isLoading, auth.profile]);

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center">
        <p className="max-w-md text-slate-700">
          Falta configurar la conexión a Supabase. Copie <code>.env.example</code> como <code>.env</code> y
          complete la URL y la clave del proyecto.
        </p>
      </div>
    );
  }

  if (auth.isLoading || !auth.profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-[#141414]" />
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return <InventoryApp profile={auth.profile} />;
}
