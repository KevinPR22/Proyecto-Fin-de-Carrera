# Inventario Multialmacén de Distribuciones Dyno

Aplicación web para gestionar las existencias de Distribuciones Dyno S.C.R.L.
El catálogo de productos es compartido y cada almacén lleva su propio saldo.
El sistema permite empezar con los almacenes O10, G9 e I7 y dar de alta más
sucursales a medida que la empresa las necesite.

## Operación de almacén

- Registrar entradas, salidas y transferencias entre sucursales.
- Consultar el historial de movimientos y el Kardex valorizado por promedio ponderado.
- Configurar el stock mínimo por producto y almacén y consultar alertas de reposición.
- Solicitar ajustes de inventario para que el gerente los revise y apruebe o rechace.
- Generar reportes de inventario en PDF y Excel.

Proyecto de Fin de Carrera de Ingeniería de Sistemas, Universidad Católica de Santa María.

## Tecnología

| Capa | Herramienta |
| --- | --- |
| Presentación | Astro 7 + React 19 + Tailwind CSS 4 |
| Estado | nanostores |
| Datos y autenticación | Supabase (PostgreSQL + Auth + RLS) |
| Reportes | jsPDF + jspdf-autotable, read-excel-file / write-excel-file |
| Calidad | ESLint + eslint-plugin-sonarjs, Vitest, GitHub Actions |

## Estructura

```
src/
  components/        Pantallas (Dashboard, Productos, Movimientos, Kardex, Ajustes, Reportes, Sucursales)
  components/modals/ Ventanas de registro (producto, movimiento, transferencia, ajuste)
  components/ui/     Elementos reutilizables
  hooks/             Hooks de React
  stores/            Estado: autenticación, inventario, sucursales, ajustes, configuración
  lib/               Reglas del inventario (funciones puras), permisos, reportes, cliente Supabase
  lib/__tests__/     Pruebas unitarias (Vitest)
db/schema.sql        Modelo de datos, funciones, triggers y políticas RLS
db/seed_inicial.sql  Sucursales y categorías iniciales
db/__tests__/        Pruebas del modelo de datos sobre PostgreSQL (PGlite)
.github/workflows/   Integración continua
```

## Puesta en marcha

Requiere Node.js 22.23.4 o superior.

1. En Supabase, ejecutar `db/schema.sql` y luego `db/seed_inicial.sql` en el SQL Editor.
2. En **Authentication → Providers → Email**, desactivar *Allow new users to sign up*.
3. Crear los usuarios en **Authentication → Users** y registrar su perfil
   (rol `GERENTE` o `ENCARGADO` con su sucursal) en la tabla `perfiles`.
4. Copiar `.env.example` como `.env`. En `PUBLIC_SUPABASE_URL`, colocar la URL
   del proyecto. En `PUBLIC_SUPABASE_ANON_KEY`, colocar la clave pública
   de Supabase (publishable o anon).
5. Instalar y ejecutar la aplicación.

```bash
npm ci
npm run dev
```

Para habilitar la recuperación de contraseña en desarrollo, agrega
`http://localhost:3000/restablecer-contrasena/` en
**Authentication → URL Configuration → Redirect URLs** de Supabase. Usa la
misma dirección y puerto con los que abres la aplicación en el navegador.

Si la base ya está instalada con una versión anterior, ejecuta
[`db/migrations/001_permisos_de_inventario.sql`](db/migrations/001_permisos_de_inventario.sql)
en el SQL Editor para actualizar los permisos conservando los datos.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en el puerto 3000 |
| `npm run lint` | Análisis estático (ESLint + reglas de SonarQube) |
| `npm run typecheck` | Verificación de tipos con `astro check` |
| `npm test` | Pruebas unitarias y del esquema de base de datos |
| `npm run test:coverage` | Pruebas con cobertura (mínimo 60 % en `src/lib`) |
| `npm run build` | Compilación del sitio estático en `dist/` |

## Roles

| Acción | Encargado | Gerente |
| --- | --- | --- |
| Registrar entradas, salidas y transferencias | Su sucursal | Todas |
| Solicitar ajustes | Sí | Sí |
| Aprobar o rechazar ajustes | No | Sí |
| Registrar y editar productos | Sí | Sí |
| Gestionar sucursales | No | Sí |
| Consultar Kardex y reportes | Sí | Sí |
