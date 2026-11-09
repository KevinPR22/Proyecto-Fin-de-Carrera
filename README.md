# Sistema de Gestión de Inventario Multialmacén

Distribuciones Dyno S.C.R.L. — Proyecto de Fin de Carrera, Ingeniería de Sistemas (UCSM).

Controla el stock de los almacenes de la empresa (O10, G9 e I7, y los que se agreguen):
entradas, salidas, transferencias entre sucursales, ajustes con aprobación, Kardex
valorizado por Promedio Ponderado, alertas de stock mínimo y reportes en PDF y Excel.

**Alcance:** solo control de almacén. El sistema no registra ventas, comprobantes
ni medios de pago (observación del asesor en las Prácticas 3 y 7).

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

Requiere Node.js 22.23 o superior.

1. En Supabase, ejecutar `db/schema.sql` y luego `db/seed_inicial.sql` en el SQL Editor.
2. En **Authentication → Providers → Email**, desactivar *Allow new users to sign up*.
3. Crear los usuarios en **Authentication → Users** y registrar su perfil
   (rol `GERENTE` o `ENCARGADO` con su sucursal) en la tabla `perfiles`.
4. Copiar `.env.example` como `.env` y completar la URL y la clave anónima.
5. Instalar y ejecutar:

```bash
npm ci
npm run dev
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en el puerto 3000 |
| `npm run lint` | Análisis estático (ESLint + reglas de SonarQube) |
| `npm run typecheck` | Verificación de tipos con `astro check` |
| `npm test` | Pruebas unitarias |
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
