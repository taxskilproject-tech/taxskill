<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Reglas obligatorias del proyecto

### Entornos y datos de prueba

El Supabase Cloud `gzwrqvqofcrdjvzoblaz` compartido por el usuario es el destino de la aplicación real.
**Todos los datos ficticios, seeds, pruebas SQL y pruebas de integración deben ejecutarse exclusivamente
en Supabase local sobre Docker.** Nunca usar Cloud como sustituto si Docker no está disponible.
Los scripts de prueba deben rechazar destinos remotos antes de iniciar solicitudes o escrituras.
No borrar datos existentes de Cloud ni revertir migraciones para limpiar fixtures sin autorización específica.
Consulta [desarrollo y entornos](docs/desarrollo.md) antes de preparar o cambiar la conexión.

Antes de crear o modificar código, lee y aplica [las reglas del agente](.agents/rules.md).
Son obligatorias para todo el repositorio e incluyen Atomic Design, Tailwind sin CSS personalizado,
tipos en archivos separados, componentes de hasta 170 líneas, feedback asíncrono en acciones,
migraciones con Supabase CLI, compilación con Yarn y uso de Proxy en lugar de middleware.

Consulta también el [índice de hitos](docs/hitos/README.md) y el hito correspondiente para respetar
los requisitos funcionales, contratos y criterios de aceptación acordados.
