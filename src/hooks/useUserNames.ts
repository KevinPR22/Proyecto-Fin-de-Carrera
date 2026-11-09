import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Nombres de los usuarios para mostrar quién registró cada movimiento (RF-09).
export function useUserNames(): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('perfiles')
      .select('id, nombre')
      .then(({ data }) => {
        if (cancelled || !data) return;
        setNames(Object.fromEntries(data.map(row => [String(row.id), String(row.nombre)])));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return names;
}
