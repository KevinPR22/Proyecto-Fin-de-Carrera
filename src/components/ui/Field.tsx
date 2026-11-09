import React from 'react';

// Campo de formulario con etiqueta, reutilizado por todas las ventanas modales.

interface FieldProps {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}

export const inputClass =
  'w-full border-b-2 border-[#141414] bg-white py-2 focus:border-blue-600 focus:outline-none disabled:opacity-50';

export default function Field({ label, htmlFor, children, hint }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-[10px] font-bold uppercase opacity-70">
        {label}
      </label>
      {children}
      {hint && <span className="text-[11px] opacity-60">{hint}</span>}
    </div>
  );
}
