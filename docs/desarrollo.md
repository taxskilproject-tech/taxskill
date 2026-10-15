# Desarrollo local y preparación técnica

H01 prepara el proyecto para implementar acceso y empresas en H02. La portada actual es una comprobación de desarrollo, no un dashboard ni un login. Consultar [H01](hitos/h01-preparacion-tecnica.md), [sus evidencias](hitos/evidencias/h01.md) y [las reglas del agente](../.agents/rules.md).

## 1. Requisitos y versiones

- Node.js 22.12 o posterior compatible; verificado con Node.js 22.16.0.
- Yarn Classic 1.22.22, declarado en `packageManager`; `yarn.lock` es el único lockfile.
- Next.js 16.4.0, React 19.3.0 y Tailwind CSS 4; conservar la versión del framework.
- Supabase CLI autenticado para vincular proyecto y leer esquema/clave pública.
- Docker con motor activo solamente si se usa Supabase local.

Los tipos de Node corresponden a la rama 22. jsdom está fijado en 26.1.0 para funcionar con el Node instalado; no se ignoraron comprobaciones de engine.

## 2. Incorporación de un desarrollador

Desde la raíz del repositorio:

```powershell
yarn install --frozen-lockfile
supabase login
supabase link --project-ref gzwrqvqofcrdjvzoblaz
yarn env:setup gzwrqvqofcrdjvzoblaz
yarn dev
```

Abrir http://localhost:3000. La vinculación se conserva en `supabase/.temp/`, excluida de Git; cada desarrollador utiliza su sesión del CLI.

`yarn env:setup` obtiene exclusivamente URL/clave pública y crea `.env.local` sin mostrarlas. Rechaza sobrescribir un archivo existente. Alternativamente, copiar `.env.example` y configurar sus variables públicas con los valores del proyecto.

La aplicación muestra los problemas de configuración de forma explícita. Reiniciar desarrollo o reconstruir después de modificar variables públicas, porque Next.js las incorpora al build. H02 reemplaza la portada temporal por la entrada de sesión, login y espacio autenticado.

La conexión apunta a Supabase Cloud de desarrollo. H02 aplica migraciones y crea cuentas/empresas ficticias; no incorpora documentos personales. Usar datos sintéticos durante H01–H07.

## 3. Entornos y secretos

| Configuración | Ejecutor | Situación |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Navegador. | URL pública del proyecto configurada localmente. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Navegador. | Publicable; admite anon legado tras validar su formato/rol. Rechaza claves administrativas. |
| `SUPABASE_SECRET_KEY` | Adaptador administrativo de servidor. | Necesaria para los tres endpoints de Auth Admin de H02. |
| `IDEMPOTENCY_HMAC_KEY` | Servidor administrativo. | HMAC-SHA256 canónico; 32 bytes aleatorios representados en hexadecimal. Conservarla para recuperar solicitudes existentes. |
| `APP_BASE_URL` | Servidor/Edge. | URL canónica por entorno antes de enlaces externos. |
| `N8N_WEBHOOK_URL` y `N8N_WEBHOOK_TOKEN` | Edge de resumen diario. | H06/H08; no se leen desde presentación. |
| `N8N_RECEIPT_TOKEN` | Receptor Next.js. | H06; secreto diferente del de salida. |

`.env.example` solo contiene nombres y valores vacíos. `.env.local` está excluido de Git. Desarrollo, preview y producción usarán proyectos/configuración separados; un preview no debe conectarse por defecto a datos productivos.

Los validadores devuelven errores sin incluir valores recibidos. Los adaptadores se inicializan cuando se necesitan, de modo que faltar una credencial administrativa no rompe el build público de H01.

## 4. Estructura implementada y dependencias

| Área | Responsabilidad |
|---|---|
| `src/app` | Entrada por sesión, grupos públicos/autenticados, rutas delgadas y tres excepciones Auth Admin. |
| `src/components/atoms` | Button, Input, Label, Badge y Spinner. |
| `src/components/molecules` | FormField y FeedbackMessage. |
| `src/components/organisms` | SectionPanel reutilizable y ResourceState para carga real, vacío, error, conflicto, restricción y recurso no encontrado. |
| `src/components/templates` | WorkspaceTemplate con composición por slots. |
| `src/features/setup` | Portada temporal de preparación, controles de conexión/fecha, hook y repositorio de comprobación. |
| `src/features/auth` | Sesión real, login/logout, contexto de empresa y shell autenticado. |
| `src/features/access` | Contratos de operación y composiciones compartidas por la administración. |
| `src/features/companies`, `users`, `configuration` | Administración de empresas, cuentas, roles, asignaciones, responsables y restauración. |
| `src/features/dashboard` | Inicio autenticado con contexto disponible, sin anticipar indicadores H07. |
| `src/domain/access` | Validaciones, precedencia de permisos y elegibilidad como funciones puras. |
| `src/domain/common` | Contratos, errores de dominio y validación de metadatos de operación. |
| `src/domain/time` | Fechas civiles, instantes y cálculo de fecha/vencimiento en Lima. |
| `src/config/env` | Validación pública y administración separadas. |
| `src/lib/query` | TanStack Query en memoria y separación/cancelación por contexto. |
| `src/lib/supabase` | Adaptadores navegador/administrativo y tipos generados del esquema real. |
| `scripts` | Preparación pública, generación de tipos y comprobaciones de arquitectura. |
| `supabase` | Configuración CLI, migraciones y seed local controlado. |
| `tests` | Casos significativos de validación, fechas, errores, caché y operaciones asíncronas. |

Flujo previsto: presentación → hook → repositorio → adaptador Supabase. Reglas puras de dominio no importan React ni SDK. Las rutas son delgadas y los componentes compartidos no importan features o persistencia.

Los tipos de cada dominio se declaran en su carpeta `types/`. H02 incorpora los grupos públicos/autenticados y sus rutas reales; no crea páginas ficticias para las funcionalidades de H03–H08.

Promover un componente específico a compartido cuando haya reutilización y un contrato general. No exportar adaptadores administrativos desde un barrel consumido por UI. Los templates de Atomic Design no son el archivo especial `template.tsx`.

## 5. Adaptadores, contratos y errores

- `createSupabaseBrowserClient`: `@supabase/ssr`, clave pública y cookies del navegador; lo consumirán repositorios de las funcionalidades.
- `createSupabaseAdminClient`: `server-only`, clave secreta y sin persistencia/renovación automática de sesión. Construir este cliente no autoriza al actor: cada operación administrativa de H02 debe verificarlo antes de usarlo.
- Ninguna API route se crea en H01. Administración de Auth y receipts de n8n conservarán las excepciones acordadas.
- La comprobación de preparación usa directamente el endpoint público `/auth/v1/health` de Supabase, sin proxy Next.js: el SDK no ofrece una operación de salud. No consulta tablas.
- `OperationResult<T>` distingue éxito/error; errores se sanitizan en la frontera.
- `request_id` UUID y `expected_revision` entero no negativo se validan por contrato. Idempotencia transaccional real pertenece a las operaciones que se incorporan desde H02.
- La equivalencia de códigos a HTTP se reserva para Route Handlers; no se asume igual comportamiento de Data API.

## 6. Sesión y caché

`QueryProvider` crea una caché en memoria por identidad de contexto. Incluye usuario, estudio, tipo de alcance, empresa cuando corresponda y módulo. Cada consulta añade recurso/filtros normalizados; no admite claves de credenciales o URLs firmadas.

Al cambiar identidad, el proveedor remonta su subárbol y limpia la caché anterior. La limpieza cancela peticiones que consuman el `AbortSignal`; sus respuestas tardías no se presentan bajo el nuevo contexto. Formularios y selecciones de ese subárbol también se reinician.

En H02 AuthProvider valida el contexto mediante RPC con el JWT de Auth. QueryProvider recibe usuario, estudio, empresa/módulo y una identidad estable de los permisos vigentes. Cambiarlos remonta los consumidores y limpia/cancela la caché anterior. Cada repositorio consume el signal de la consulta; no configurar `keepPreviousData` entre identidades. Un refresco de permisos no conserva datos de un alcance retirado.

Las mutaciones no reintentan automáticamente. Las consultas tienen un reintento acotado y 30 segundos de frescura inicial. No se persiste caché documental en localStorage.

Realtime se implementa con las funcionalidades que lo requieran; sus hooks deberán cerrar suscripciones al salir/cambiar contexto. H02 no abre canales; logout elimina los que pudiera mantener el cliente SDK. Revalidar contexto al volver el foco a la ventana no sustituye el enforcement universal de H08.

`src/proxy.ts` conserva la convención Proxy, aplica `private, no-store` y renueva cookies con `auth.getClaims()`. Preserva cookies y cabeceras de caché de `@supabase/ssr`. Los endpoints verifican además `auth.getUser()` y el contexto de negocio antes de inicializar Auth Admin. Proxy no sustituye autorización ni RLS; el enforcement universal es H08/T01.

## 7. Fechas, UI y accesibilidad

- `parseCivilDate` valida fechas civiles exactas, incluidos meses cortos y bisiestos.
- `formatCivilDate` conserva el día independientemente de zona horaria.
- Los instantes exigen zona/offset explícito; no se acepta una fecha civil como timestamp.
- Hora/fecha de negocio: `America/Lima`. Un vencimiento pasa a atrasado cuando la fecha local supera el día indicado, sin ajuste por fines de semana.
- Tailwind por clases y constantes compartidas en TypeScript; `globals.css` contiene únicamente la importación de Tailwind. No existe `tokens.css` ni CSS personalizado.
- Interfaz minimalista, etiquetas asociadas, errores anunciados, foco visible, objetivos de al menos 44 px y spinner con reducción de movimiento.
- Button muestra loading/texto contextual y queda deshabilitado; el hook de conexión además bloquea clics simultáneos y cancela al desmontar.
- Fecha, navegación y controles instantáneos no muestran loading artificial.

## 8. Migraciones, tipos y datos ficticios

```powershell
# Crear una migración de la capacidad que se implemente.
yarn db:new nombre_descriptivo

# Iniciar Supabase local: requiere Docker con el motor activo.
yarn db:local:start

# Reiniciar SOLO la base local y ejecutar migraciones/seed.
yarn db:local:reset

# Generar tipos desde local o desde el proyecto vinculado.
yarn db:types --local
yarn db:types --linked

# Consultar historial remoto sin ejecutar migraciones.
yarn db:status
```

`supabase/migrations/` conserva SQL con timestamp. Una migración puede agrupar tablas, restricciones, índices y RPC de una misma capacidad, resolviendo FK/ciclos antes de aplicar. Regenerar tipos después y versionar el resultado.

Desde el esquema público vacío comprobado en H01 se aplicaron las diez migraciones incrementales de H02. Incorporan 13 tablas, la vista `h02_users`, restricciones, índices, funciones privadas y RPC. Los tipos se regeneran desde ese esquema. `seed.sql` no escribe identidades de Auth: el bootstrap y las fixtures usan su Admin SDK, sin contraseñas en SQL.

Para un cambio DB de H02 en adelante: crear migración → aplicar sobre base local limpia con seed → comprobar restricciones/operaciones → generar tipos → probar actualización desde la versión anterior → revisar antes de aplicar al entorno remoto previsto. La publicación de producción pertenece a H08.

El motor Docker no estaba activo durante H01/H02; no se ejecutaron `supabase start` ni reset local. La secuencia se aplicó al entorno Cloud de desarrollo que partía vacío, con aceptación SQL transaccional, pruebas HTTP y lint de funciones. El ensayo de reset local sigue disponible para el equipo al iniciar Docker; no se presenta como ejecutado.

RLS y exposición definitiva de tablas/vistas/RPC/Storage permanecen en H08/T01. Filtros y caché de H01 no acreditan aislamiento de datos.

## 9. Verificaciones

```powershell
yarn verify
yarn build
```

`yarn verify` ejecuta tipos (con `next typegen`), ESLint, reglas de arquitectura y Vitest. No usar `yarn check`: es un comando interno de Yarn Classic, distinto del script del proyecto.

Arquitectura verifica tipos separados, componentes de hasta 170 líneas, ausencia de ciclos, dependencias cliente/servidor, Tailwind sin CSS personalizado y Proxy. ESLint comprueba imports, reglas TypeScript y límites de anidación.

Tests cubren configuración, errores sanitizados, calendario/Lima, caché, cancelación/respuestas tardías, doble clic, loading, validaciones de acceso, precedencia de permisos, CSRF, HMAC y logout. H02 añade aceptación SQL con rollback y pruebas en vivo de los tres endpoints y de perfiles distintos.

Para repetir pruebas interactivamente: `yarn test:watch`. Para revisar el build: `yarn start`. No guardar datos productivos ni claves en fixtures/evidencias.

## 10. Ajustes de compatibilidad documentados

Se conservan Next.js 16.4.0, React 19.3.0, `cacheComponents` y `partialPrefetching`. Las guías locales se revisaron antes del código.

El loader previo `@tailwindcss/turbopack` fallaba al iniciar su worker durante build, también fuera del sandbox. Se sustituyó por `@tailwindcss/postcss` y `postcss.config.mjs`, siguiendo la guía instalada. Next.js continúa compilando con Turbopack; se retiró únicamente el loader que fallaba. Se eliminaron dependencias no utilizadas y `package-lock.json` al adoptar Yarn.

Se usa la fuente sans del sistema mediante Tailwind, evitando descargar fuentes durante compilación. Estos ajustes no cambian las funcionalidades ni el modelo documental.

Referencias: [cliente Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient) y guías instaladas de Next.js sobre estructura, componentes cliente/servidor, variables, errores, Proxy y Tailwind.

<a id="11-acceso-administrativo-y-demostracion-de-h02"></a>
## 11. Acceso administrativo y demostración de H02

Sobre un proyecto de desarrollo vinculado y con configuración pública:

```powershell
yarn env:admin gzwrqvqofcrdjvzoblaz
supabase db push --linked
yarn db:types

# Solo si no existe todavía un estudio: cuenta sintética de desarrollo.
yarn seed:demo

# En una terminal, iniciar la aplicación para la aceptación HTTP.
yarn dev --hostname 127.0.0.1 --port 3001

# En otra terminal, completar/verificar las fixtures de desarrollo.
yarn test:h02:live
yarn test:h02:sql
yarn db:lint
```

`env:admin` conserva la configuración pública y añade únicamente las claves privadas que falten. No imprime valores y comprueba que el project-ref coincida. Nunca copiar `.env.local`, `.env.h02-demo.local`, `.env.bootstrap.local` ni `test-results/` a Git, evidencias o chats.

El administrador ficticio es `admin.h02@example.test`; su contraseña aleatoria queda exclusivamente en `.env.h02-demo.local`. Las otras cuentas ficticias y sus contraseñas están en `test-results/h02-fixtures.json`. No se envían correos. `test:h02:live` conserva dos empresas y cuentas de contador, supervisor, cliente y recuperación; su reejecución reutiliza solicitudes/identidades. Ejecutarlo únicamente con datos ficticios. Las pruebas SQL independientes hacen rollback de sus fixtures.

Para una instalación nueva con administrador elegido por el estudio, crear localmente `.env.bootstrap.local` con `BOOTSTRAP_EMAIL`, `BOOTSTRAP_NAME` y `BOOTSTRAP_PASSWORD` (mínimo 12 caracteres), y ejecutar `yarn auth:bootstrap`. El script agrega/conserva `BOOTSTRAP_USER_ID` para reintentos. No acepta crear otro estudio si ya existe uno; no ofrece un endpoint público. Auth confirma el correo administrativamente y el bootstrap crea organización, membresía, catálogo y tres plantillas de rol en una transacción. La facultad administrativa no concede permisos documentales: asignarlos explícitamente cuando corresponda.

En una base ya inicializada, las cuentas siguientes se crean desde `/usuarios`. El administrador distribuye la contraseña mediante el procedimiento externo del estudio. No hay registro, recuperación por correo ni edición propia de contraseña en la UI.

## 12. Contratos implementados en H02

| Entrada | Ejecución | Integridad |
|---|---|---|
| Login/logout y consultas | SDK navegador; sesión mediante `h02_context`. | Perfil/membresía habilitados, ancestros y sesión admitida. |
| Empresas, roles, permisos, asignaciones, responsables, membresía y parámetros | `h02_command` directo con `request_id`, operación y entrada validada. | Revisión esperada, idempotencia, transacción y auditoría. |
| Eliminación/restauración de las nueve entidades H02 | `DeleteEntity` / `RestoreEntity` en la misma RPC. | Motivo, unicidad conservada, padres disponibles y sin cascadas físicas. |
| Crear cuenta | `POST /api/admin/users`. | Actor verificado → reserva durable → Auth con UUID reservado → SQL → listo. |
| Contraseña | `POST /api/admin/users/{userId}/password`. | Solo administrador; revisión, HMAC y revocación de sesiones admitidas. |
| Habilitación | `PATCH /api/admin/users/{userId}/enabled`. | Último administrador protegido; inhabilitación primero en DB y coordinación con Auth. |

Los endpoints rechazan origen distinto, JSON inválido y cuerpo superior a 32.000 bytes. La reserva limita inicialmente a 20 intenciones nuevas por administrador/estudio por minuto. Solo la misma intención puede recuperar una ejecución `processing` tras dos minutos; otras operaciones sobre una cuenta con fase externa pendiente se rechazan con conflicto. Son bases técnicas iniciales, no decisiones adicionales atribuidas al usuario.

Una solicitud sensible conserva una HMAC de entrada canónica, nunca contraseña ni hash simple. Ante un fallo, mantener el formulario y reintentar **la misma entrada** para conservar `request_id`; cambiar un campo inicia otra intención. Tras recargar, la lista de operaciones permite identificar el fallo, pero no reconstruye contraseñas. Conservarlas mediante el procedimiento administrativo seguro hasta confirmar el alta. No registrar cuerpos HTTP ni resultados completos de Auth en logs.

La identidad Auth puede existir antes de completar SQL. Mientras no haya perfil listo y membresía válida, `h02_context` deniega acceso al negocio. La prueba de recuperación pausa una dependencia del rol, observa el fallo SQL y completa después la misma solicitud/identidad. No existe una transacción distribuida entre Auth y PostgreSQL.

Inhabilitar/eliminar perfiles o membresías revoca sus sesiones admitidas; restaurar/habilitar no borra revocaciones. Las RPC y endpoints H02 comprueban estas sesiones. **Las tablas/vistas todavía no tienen RLS**: la ocultación en UI y las validaciones de RPC no acreditan aislamiento de lecturas arbitrarias. Las políticas, Storage y enforcement universal permanecen en H08/T01.

Las páginas privadas exportan `instant=false` conforme a la guía instalada de Next.js: su contenido depende del contexto Auth cargado en navegador. Se mantienen Cache Components y Partial Prefetching globales, sin cachear públicamente datos autenticados ni crear `middleware.ts`.

Validación de entrega: `yarn verify`, `yarn build`, `yarn check:bundle`, `yarn test:h02:sql`, `yarn test:h02:live` y `yarn db:lint`. Consultar [evidencia H02](hitos/evidencias/h02.md) para distinguir resultados obtenidos y pendientes.
