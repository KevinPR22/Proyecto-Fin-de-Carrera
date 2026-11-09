import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Sitio estático (Jamstack): Astro genera HTML y los componentes React se
// hidratan en el navegador; los datos vienen de Supabase (BaaS).
export default defineConfig({
  output: 'static',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
  server: { port: 3000 },
});
