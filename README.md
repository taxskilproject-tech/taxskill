# TaxSkills

Sistema documental contable y laboral con Next.js, Supabase Cloud y Atomic Design.

**H01 y H02 implementados:** acceso, empresas, cuentas, roles, permisos por módulo, responsables, soft delete y auditoría. El recorrido documental comienza en H03.

## Inicio

Requiere Node.js 22.12+ compatible, Yarn Classic 1.22.22 y Supabase CLI autenticado.

```powershell
yarn install --frozen-lockfile
supabase login
supabase link --project-ref gzwrqvqofcrdjvzoblaz
yarn env:setup gzwrqvqofcrdjvzoblaz
yarn env:admin gzwrqvqofcrdjvzoblaz
yarn dev
```

Abrir http://localhost:3000. `yarn env:setup` crea `.env.local` y rechaza sobrescribirlo. `yarn env:admin` añade las dos claves privadas sin mostrarlas. Para una base nueva, aplicar migraciones y seguir el bootstrap de la [guía de desarrollo](docs/desarrollo.md#11-acceso-administrativo-y-demostracion-de-h02). No hay registro público ni recuperación por correo.

## Verificación

```powershell
yarn verify
yarn build
```

Compilar siempre con Yarn. `yarn.lock` es el único lockfile.

## Documentación

- [Desarrollo, configuración y migraciones](docs/desarrollo.md).
- [Hitos del proyecto](docs/hitos/README.md).
- [H01 y sus criterios](docs/hitos/h01-preparacion-tecnica.md).
- [Evidencias de H01](docs/hitos/evidencias/h01.md).
- [H02 y sus criterios](docs/hitos/h02-acceso-empresas.md).
- [Evidencias y operación de H02](docs/hitos/evidencias/h02.md).
- [Arquitectura y decisiones](docs/diseno-tecnico.md).
- [Reglas de agentes](.agents/rules.md).

RLS y la revocación universal de consultas directas permanecen pendientes de H08/T01; durante desarrollo se utilizan datos sintéticos. Docker solo es necesario para ejecutar Supabase local.
