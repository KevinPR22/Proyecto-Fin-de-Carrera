import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { AlertCircle, LogIn, Warehouse } from 'lucide-react';
import { $authState, initializeAuth, signIn } from '../stores/authStore';

// Inicio de sesión. Sin registro público ni acceso de demostración:
// las cuentas las crea el gerente en Supabase Auth.
export default function LoginForm() {
  const auth = useStore($authState);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void initializeAuth();
  }, []);

  useEffect(() => {
    if (!auth.isLoading && auth.profile) window.location.href = '/';
  }, [auth.isLoading, auth.profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    const ok = await signIn(email, password);
    setIsSubmitting(false);
    if (ok) window.location.href = '/';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md rounded-lg border border-[#141414]/10 bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-[#141414]">
            <Warehouse className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-serif text-3xl font-bold italic">Inventario Multialmacén</h1>
          <p className="mt-2 text-sm text-slate-600">Distribuciones Dyno S.C.R.L.</p>
        </div>

        {auth.error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 flex-shrink-0 text-red-600" size={20} />
            <div className="text-sm text-red-700">{auth.error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#141414] px-4 py-2 focus:ring-2 focus:ring-[#141414] focus:outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#141414] px-4 py-2 focus:ring-2 focus:ring-[#141414] focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#141414] py-3 font-semibold text-white transition-colors hover:bg-[#141414]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn size={18} />
            {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          <a href="/restablecer-contrasena/" className="font-semibold underline">
            ¿Olvidaste tu contraseña?
          </a>
        </p>

        <p className="mt-6 text-center text-xs text-slate-500">
          ¿No tiene cuenta? Solicítela al gerente de la empresa.
        </p>
      </div>
    </div>
  );
}
