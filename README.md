# TaxSkills

Sistema documental contable y laboral con Next.js, Supabase Cloud y Atomic Design.

**H01–H07 implementados y comprobados localmente:** acceso, entrega/revisión, motor, áreas laborales, Actividades/notificaciones, supervisión, búsqueda, Excel/PDF y auditoría. Las tres observaciones de la revisión están corregidas: [cierre, pruebas y publicación pendiente](docs/hitos/evidencias/h07-correcciones.md). Ver [contratos H07](docs/supervision-reportes.md), [evidencias H07](docs/hitos/evidencias/h07.md) y [entornos](docs/desarrollo.md). Local tiene 56 migraciones y Cloud 55: la migración correctiva adicional espera autorización específica de publicación. Pruebas exclusivamente en Docker, sin fixtures remotos. La aceptación formal y la preparación productiva de RLS/operación se registran por separado. Siguiente implementación: H08, tras completar la entrega correctiva.

## Inicio

Requiere Node.js 22.12+ compatible, Yarn Classic 1.22.22, Supabase CLI y Docker con motor Linux activo. Todos los datos ficticios y pruebas usan exclusivamente Supabase local. El proyecto Cloud compartido es para la aplicación real.

```powershell
yarn install --frozen-lockfile
yarn db:local:start
yarn env:local
yarn dev
```

Abrir http://localhost:3000. `yarn env:local` obtiene las claves del contenedor y conserva la conexión remota previa en `.env.cloud.local` sin imprimir secretos. Si Docker no está disponible, no cambia la configuración. `dev`, seeds y pruebas de integración bloquean Cloud. Para una base local nueva, seguir el bootstrap de la [guía de desarrollo](docs/desarrollo.md#11-acceso-administrativo-y-demostracion-de-h02). No hay registro público ni recuperación por correo.

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
- [Evidencias de H03](docs/hitos/evidencias/h03.md).
- [Actividades y notificaciones H06](docs/actividades-notificaciones.md).
- [Workflow n8n reproducible](integrations/n8n/README.md).
- [Evidencias de H06](docs/hitos/evidencias/h06.md).
- [Supervisión, búsqueda y reportes H07](docs/supervision-reportes.md).
- [Evidencias, capacidad y muestras de H07](docs/hitos/evidencias/h07.md).
- [Validación local H02/H03 y recuperación de Docker](docs/hitos/evidencias/validacion-local-h02-h03.md).
- [Corrección de entornos e inventario de fixtures remotos](docs/hitos/evidencias/correccion-entornos.md).
- [Arquitectura y decisiones](docs/diseno-tecnico.md).
- [Reglas de agentes](.agents/rules.md).

RLS y la revocación universal de consultas directas permanecen pendientes de H08/T01. Durante desarrollo se utilizan datos sintéticos exclusivamente en Docker local; no se usa Cloud como alternativa si Docker falla.
