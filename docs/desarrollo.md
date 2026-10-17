# Desarrollo local y preparación técnica

H01 y H02 aportan la base, acceso y administración. H03 añade el primer recorrido documental mensual con carga reanudable, validación y revisión individual. Consultar los [hitos](hitos/README.md), las [evidencias de H03](hitos/evidencias/h03.md) y [las reglas del agente](../.agents/rules.md).

**Regla confirmada por el usuario:** todos los datos ficticios, seeds y pruebas de integración/SQL se ejecutan exclusivamente en Supabase local sobre Docker. `gzwrqvqofcrdjvzoblaz` es el proyecto Cloud de la aplicación real. Nunca sustituir Docker por ese proyecto. Ver [corrección e inventario histórico](hitos/evidencias/correccion-entornos.md).

## 1. Requisitos y versiones

- Node.js 22.12 o posterior compatible; verificado con Node.js 22.16.0.
- Yarn Classic 1.22.22, declarado en `packageManager`; `yarn.lock` es el único lockfile.
- Next.js 16.4.0, React 19.3.0 y Tailwind CSS 4; conservar la versión del framework.
- Supabase CLI autenticado para vincular proyecto y leer esquema/clave pública.
- Docker con motor Linux activo: obligatorio para las pruebas de base de datos e integración.

Los tipos de Node corresponden a la rama 22. jsdom está fijado en 26.1.0 para funcionar con el Node instalado; no se ignoraron comprobaciones de engine.

## 2. Incorporación de un desarrollador

Desde la raíz del repositorio:

```powershell
yarn install --frozen-lockfile
yarn db:local:start
yarn env:local
yarn dev
```

Abrir http://localhost:3000. Supabase local expone la API en `http://127.0.0.1:54331`. Si Docker no funciona, detener las pruebas de integración y resolver el entorno; no usar Cloud como alternativa.

TaxSkill reserva los puertos 54330–54339 y el inspector Edge 8183 para coexistir con otros proyectos Supabase. PostgreSQL usa 54332 y Studio 54333. Las pruebas rechazan también el puerto habitual 54321, que puede pertenecer a otra aplicación; no detener sus contenedores ni reutilizar su base.

La agregación opcional de logs de Studio (`analytics`) está desactivada localmente: esta combinación de CLI y Docker Windows intentaba acceder a `host.docker.internal:2375`, provocando un bucle de reinicio de Vector. Se conservan `audit_events` y la consulta directa con `docker logs`; no habilitar acceso Docker TCP sin autenticación para usar ese panel. El monitoreo de publicación se resuelve por separado en H08.

`yarn env:local` obtiene la configuración del CLI local sin imprimir secretos. Antes de sustituir una conexión remota conserva su contenido en `.env.cloud.local`, ignorado por Git; nunca sobrescribe un respaldo diferente. Si Supabase local no está disponible, no modifica `.env.local`. Las credenciales locales proceden del contenedor, con una clave HMAC propia.

`yarn env:setup <project-ref>` y `yarn env:admin <project-ref>` son configuraciones explícitas para operar con el proyecto Cloud real. No habilitan seeds ni pruebas ficticias. La vinculación del CLI se conserva en `supabase/.temp/`; los comandos de prueba SQL fuerzan `--local` independientemente de ese vínculo.

La aplicación muestra los problemas de configuración de forma explícita. Reiniciar desarrollo o reconstruir después de modificar variables públicas, porque Next.js las incorpora al build. H02 reemplaza la portada temporal por la entrada de sesión, login y espacio autenticado.

H01–H07 usan datos sintéticos únicamente en Docker local. Las ejecuciones anteriores de H02/H03 usaron incorrectamente el proyecto Cloud compartido: están registradas como evidencia histórica y deben repetirse en local. No se considera ese proyecto un entorno de desarrollo.

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

`.env.example` solo contiene nombres y valores vacíos. `.env.local` y `.env.cloud.local` están excluidos de Git. El desarrollo con fixtures usa Docker local; un preview tampoco debe generar datos ficticios en el proyecto Cloud real. Las variables públicas quedan incorporadas en el build: reiniciar desarrollo y recompilar antes de servir una compilación de otro entorno.

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

El motor Docker no estaba activo durante las primeras verificaciones y se utilizó incorrectamente el Cloud compartido para fixtures H02/H03. Esos datos remotos se eliminaron por instrucción del usuario y sus credenciales históricas ya no funcionan. El 16 de octubre se recuperó Docker y se completaron una base limpia, la actualización con datos H02 → H03 y la integración local; consultar la [evidencia vigente](hitos/evidencias/validacion-local-h02-h03.md). No repetir fixtures en Cloud.

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

Durante la validación Docker, Turbopack conservó un fallo de conexión a su proceso auxiliar; regenerar exclusivamente `.next` permitió compilar de nuevo con `yarn build`. Verificar siempre que la ruta resuelta corresponda al build de este proyecto antes de limpiar artefactos; no borrar fuentes ni almacenamiento de Docker.

El error de Docker `running OTel manager: removing stale socket` se resolvió apartando únicamente su carpeta runtime, que contenía un socket inaccesible, con sus procesos detenidos. Se conservaron imágenes, volúmenes y la carpeta apartada. El procedimiento y las comprobaciones figuran en la evidencia local; no usar un restablecimiento de fábrica para repetir esta recuperación.

Se usa la fuente sans del sistema mediante Tailwind, evitando descargar fuentes durante compilación. Estos ajustes no cambian las funcionalidades ni el modelo documental.

Referencias: [cliente Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient) y guías instaladas de Next.js sobre estructura, componentes cliente/servidor, variables, errores, Proxy y Tailwind.

<a id="11-acceso-administrativo-y-demostracion-de-h02"></a>
## 11. Acceso administrativo y demostración de H02

Exclusivamente con Supabase Docker local:

```powershell
yarn db:local:start
yarn env:local
yarn db:types --local

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

El administrador ficticio es `admin.h02@example.test`; su contraseña local queda exclusivamente en `.env.h02-demo.docker.local`. Las otras cuentas locales están en `test-results/local/h02-fixtures.json` y `test-results/local/h02-recovery.json`. No reutilizar los archivos históricos de Cloud. `seed:demo`, `test:h02:live` y `test:h03:live` rechazan cualquier destino que no sea loopback HTTP, puerto 54331, antes de contactar Supabase. Las pruebas SQL independientes fuerzan `--local` y hacen rollback de sus fixtures.

Para una instalación nueva con administrador elegido por el estudio, crear localmente `.env.bootstrap.local` con `BOOTSTRAP_EMAIL`, `BOOTSTRAP_NAME` y `BOOTSTRAP_PASSWORD` (mínimo 12 caracteres), y ejecutar `yarn auth:bootstrap`. El script agrega/conserva `BOOTSTRAP_USER_ID` para reintentos. No acepta crear otro estudio si ya existe uno; no ofrece un endpoint público. Auth confirma el correo administrativamente y el bootstrap crea organización, membresía, catálogo y tres plantillas de rol en una transacción. La facultad administrativa no concede permisos documentales: asignarlos explícitamente cuando corresponda.

En una base ya inicializada, las cuentas siguientes se crean desde `/usuarios`. El administrador distribuye la contraseña mediante el procedimiento externo del estudio. No hay registro, recuperación por correo ni edición propia de contraseña en la UI.

Para el login local, `[auth.email].enable_signup = true` mantiene activo el proveedor de correo/contraseña; `[auth].enable_signup = false` bloquea el registro público. La aceptación H02 verifica ambas condiciones mediante login y rechazo `signup_disabled`. Deshabilitar ambos valores impide también ingresar a las cuentas existentes.

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
## 13. Primer recorrido documental H03

Preparar exclusivamente Supabase local en Docker. Se requiere H02 local y sus cuentas ficticias para repetir la integración. No desplegar funciones ni cargar fixtures en Cloud para estas pruebas.

```powershell
yarn db:local:start
yarn env:local
supabase migration up --local
yarn db:types --local
yarn h03:setup

# Otra terminal: mantener el servicio local de Edge en ejecución.
supabase functions serve document-operations --env-file .env.h03-operations.docker.local

# En la terminal de verificaciones:
yarn verify
yarn build
yarn check:bundle
yarn db:lint
yarn test:h02:sql
yarn test:h03:sql
yarn test:h03:live
```

`h03:setup` usa la conexión configurada; antes de ejecutarlo para pruebas debe haberse completado `env:local`. Crea los buckets privados y guarda la credencial local junto con `H03_PUBLIC_SUPABASE_URL` en `.env.h03-operations.docker.local`, ignorado por Git. Conserva la credencial existente al repetirlo. La URL pública permite que las descargas firmadas usen 54331, mientras Edge accede internamente a `kong:8000`. Reiniciar `functions serve` después de cambiar ese archivo. La credencial Cloud histórica queda separada en `.env.h03-operations.local`; esta validación no la modificó ni desplegó funciones remotas. No imprimir, compartir ni versionar esos archivos. La reserva de ejecución de validación dura dos minutos y la vigencia de recepción 24 horas.

No ejecutar `--schedule` para este recorrido local: el job de publicación requiere una URL alcanzable desde su ejecutor y configuración propia del entorno. La integración llama directamente a la limpieza de Edge local para comprobar el TTL. No se da por probada la programación Cloud al repetir una prueba local.

En la aplicación: Configuración → Catálogo → Nuevo tipo tributario; empresas → ficha → responsable de Tributario; Configuración → Reglas → Nueva regla mensual activa con dos posiciones → Generar obligaciones. Abrir la obligación en Actividades. H04 amplía este formulario a diez frecuencias. Un cliente con upload entrega; contador/supervisor con el permiso correspondiente revisa cada archivo. El administrador requiere permiso documental para cargar, descargar o revisar, además de su facultad administrativa.

Una observación exige motivo y nueva fecha; la corrección crea versión/ciclo nuevos. Reabrir un aprobado conserva la decisión histórica y exige otra entrega. Actualizar el detalle tras un conflicto no repite la decisión. El historial muestra recepción, plazo, puntualidad, autores y decisiones; las vistas previas y descargas se preparan al usarlas.

El visor PDF usa `pdfjs-dist` 6.4.299, cargado al solicitar la vista previa. `yarn dev` y `yarn build` copian automáticamente su worker a `public/pdf.worker.min.mjs`; ese artefacto generado no se versiona. Servir el worker local mantiene su versión sincronizada con la biblioteca, sin CDN ni configuración manual adicional. La vista previa conserva el loading hasta renderizar o informar el error. Las imágenes se muestran localmente desde el archivo preparado; Office conserva la descarga controlada.

Al volver tras una interrupción, la intención pendiente aparece en su posición: confirmar lo recibido o seleccionar el mismo archivo para reanudar TUS. El navegador conserva la referencia TUS, no el contenido del archivo. Si el archivo cambia, usar «Empezar otra entrega». La operación conserva el destino original al cambiar el selector; al desmontar el control se interrumpe la transferencia local. La recepción solo cuenta después de la validación confiable.

`test:h03:live` usa archivos sintéticos en Docker y escribe IDs/checks en `test-results/local/h03-evidence.json`. Comprueba TUS interrumpido/reanudado, bytes falsos, recuperación de promoción previa, revisores simultáneos, enlace breve y limpieza real de un temporal de prueba. El SQL revierte sus fixtures. Los comandos bloquean Cloud; no tienen una opción para habilitar pruebas remotas.

Los dos comandos SQL usan `supabase test db --local` mediante pgTAP, con archivos conocidos y `ROLLBACK`. `db query --local` no se utiliza para ejecutar estos archivos transaccionales, porque la versión del CLI rechaza varias sentencias en una consulta preparada. La validación local del 16 de octubre pasó 111 pruebas de código, ambas suites SQL y 59 comprobaciones de integración documental; ver el informe enlazado al inicio.

El job `h03-staging-cleanup` corre cada hora, minuto 17 UTC: revisar `cron.job_run_details` y el resultado HTTP de pg_net; un job SQL completado solo acredita que se envió la petición, no que Edge terminó. La marca `staging_cleaned_at` acredita la limpieza del objeto. Los fallos de red quedan para el siguiente intento. Las validaciones activas y objetos finales nunca se eliminan por TTL.

En H03, Edge emite tokens de ruta para cargas TUS firmadas y enlaces Storage de 60 segundos después de autorizar la descarga como usuario. Los bytes se transfieren directamente a Storage. Es una adaptación técnica para mantener RLS diferido: no añade API routes Next.js ni permite confirmación SQL libre. Completar las políticas y la revocación universal en H08 antes de publicar.

La propia cuenta administrativa debe inhabilitarla otro administrador; la aplicación rechaza la operación antes de iniciar fases parciales. El último administrador sigue protegido.

## 14. Motor documental H04

Requiere las migraciones H02/H03 y el entorno Docker anterior. La validación funcional usa solo Docker. Después de validarlo, el usuario autorizó desplegar el esquema H04 a Cloud el 16/10/2026: nueve migraciones, sin seeds ni fixtures y con huellas históricas conservadas. Publicar migraciones revisadas es distinto de ejecutar pruebas con datos ficticios; estas últimas nunca se permiten en Cloud. Los jobs productivos se configuran en H08.

```powershell
supabase migration up --local
yarn db:types --local
yarn h04:setup

yarn test:h04:sql
yarn test:h04:live
yarn verify
yarn build
yarn check:bundle
yarn db:lint
```

`h04:setup` y `test:h04:live` rechazan cualquier destino distinto de loopback HTTP en el puerto 54331 antes de crear clientes o solicitar datos. La integración usa las credenciales locales de demostración y las fixtures H03; crea reglas sintéticas de las diez frecuencias, prueba concurrencia y espera una ejecución real de Cron. Registra IDs y comprobaciones sin secretos en `test-results/local/h04-evidence.json`. Puede tardar hasta 150 segundos esperando el planificador. Las pruebas SQL usan pgTAP y revierten sus fixtures, incluida la inyección controlada de fallo de lote.

El setup activa `h04-generation-day` (00:05 Lima) y `h04-generation-continuation` (cada minuto, respetando la ventana inicial de 00:05). No requiere navegador ni servidor Next.js. Los jobs no se activan por aplicar migraciones. Para detenerlos localmente, el administrador técnico puede invocar `h04_schedule_generation` con `p_enabled:false` usando su cliente de servidor; no se expone como control del navegador. Producción se habilita y supervisa en H08.

En la UI: Configuración → Catálogo (cualquiera de las tres áreas) → Reglas → Nueva regla. Completar empresa, tipo, frecuencia, condiciones, responsable y posiciones. «Simular calendario» solo consulta fechas. Guardar sin marcar activa conserva un borrador; «Activar regla» valida al responsable. «Generar obligaciones» muestra nuevas/procesadas, continuación y enlace al detalle cuando existe. La edición crea una nueva versión con vigencia futura. Una pausa exige motivo; eliminar/restaurar conserva los archivos e instancias anteriores. En el detalle, el administrador puede reasignar con motivo.

La generación automática procesa 50 destinos por lote y examina hasta 100 ciclos por llamada. El cursor y sus errores se ven en Reglas. Para seguimiento operativo, combinar `cron.job_run_details`, cursor y auditoría; el estado SQL del job por sí solo no confirma que todas las obligaciones se generaron. Más detalles y contratos en [motor documental](motor-documental.md) y [evidencias H04](hitos/evidencias/h04.md).

## 15. Expediente y tres áreas H05

Contrato funcional, operaciones, fechas y fases en [expediente laboral](expediente-laboral.md); pruebas y despliegue en [evidencias H05](hitos/evidencias/h05.md). H05 añadió ocho migraciones incrementales, alcanzando 36. H06 amplía el esquema a 47, publicadas sin datos de demostración. Mantener `.env.local` conectado a Docker para desarrollar; no ejecutar fixtures ni pruebas contra Cloud.

```powershell
supabase migration up --local
yarn db:types --local
yarn h05:setup
yarn test:h05:sql
yarn test:h05:live
yarn verify
yarn build
yarn check:bundle
yarn db:lint
```

Para la integración completa deben existir las cuentas locales H02, el setup H03 y Edge `document-operations` local del apartado 13. `h05:setup` activa únicamente el Cron laboral Docker. Los scripts rechazan destinos remotos antes de crear clientes; no existe bandera para saltarse la protección. `test:h05:live` crea/reutiliza una empresa local identificada como H05, asigna capacidades ficticias, configura reglas, recorre ingreso/cese/reingreso y ejecuta el mismo flujo de archivos en las tres áreas. También espera hasta 150 segundos el avance real del planificador. Evidencia sin secretos en `test-results/local/h05-evidence.json`.

`verify-h03.ts` acepta `--module tributario|laboral_general|laboral_trabajador`, `--company-id UUID` y `--employment-period-id UUID`; este último es obligatorio para el módulo por trabajador. Son opciones del recorrido local compartido, no destinos remotos. El script valida opciones y entorno antes de contactar Supabase. H05 lo invoca automáticamente para cada área; no es necesario duplicar la prueba manualmente.

En la UI: Empresa → Laboral por trabajador → Registrar trabajador; se puede añadir la primera etapa en la misma solicitud. Abrir ficha → registrar cese/reingreso o corregir con motivo. El selector conserva las etapas; Ingreso/Relación/Cese muestran sus obligaciones y el detalle común vuelve al contexto original. Una generación pendiente mantiene el cambio laboral confirmado y se continúa con Cron o «Actualizar obligaciones vigentes y reintentar pendientes»; no repetir el alta.

Configuración → Catálogo → importar tipos iniciales crea códigos faltantes sin sobrescribir personalizaciones. Configurar plazo, formatos, posiciones, responsable y condiciones por empresa antes de activar reglas. La importación es una acción administrativa explícita; las migraciones no insertan el catálogo en Cloud. Salarios se introducen con punto decimal, se almacenan en `numeric(14,2)` y se consultan como texto exacto. No hay cálculo de nómina.

El job `h05-employment-continuation` ejecuta un lote por minuto sin navegador. Su activación productiva, límites operativos, alertas y RLS quedan en H08. No confundir despliegue de funciones SQL con ejecución de pruebas o activación de automatismos remotos.

## 16. Actividades y notificaciones H06

[Contratos, privacidad y conciliación](actividades-notificaciones.md), [workflow y laboratorio reproducible](../integrations/n8n/README.md) y [evidencias H06](hitos/evidencias/h06.md). Once migraciones completan las 29 tablas del modelo. Cloud tiene 47 migraciones sin fixtures y ningún job H06 de envíos activado. La app local conserva Docker como destino.

```powershell
supabase migration up --local
yarn db:types --local
yarn h06:setup
```

El setup conserva secretos locales existentes y genera archivos ignorados de Edge/n8n; añade el token de receipts a `.env.local`. Importar las credenciales/workflow y publicarlos en la instancia n8n **local** siguiendo su guía; después servir Edge con `.env.h06-operations.docker.local`, iniciar `scripts/fixtures/h06-provider.ts`, compilar y reiniciar Next en 3001.

```powershell
yarn test:h06:sql
yarn test:h06:live
yarn verify
yarn build
yarn check:bundle
yarn db:lint
```

La integración usa cuentas H02 locales, adicionales con archivos reales de prueba, Realtime y proveedor simulado. Pausa solo el Cron H06 local durante la matriz determinista, prueba timeout/429/500/respuesta perdida, reinicia el contenedor local n8n y verifica que el proveedor no repita delivery. Al final habilita el Cron local y comprueba una preparación/entrega originada por ese job. Puede tardar unos dos minutos; guarda IDs/estados/checks en `test-results/local/h06-evidence.json`, sin imprimir claves ni payloads.

`verify-h03.ts` también acepta `--module actividades --obligation-id UUID --delivery-role cliente|contador` para reutilizar el recorrido completo en una adicional local existente; no crea reglas documentales para ese destino. Las cuentas deben tener capacidades de Actividades en la empresa o estudio correspondientes. Estas opciones no permiten destinos remotos.

En UI: Actividades → crear adicional única/recurrente → elegir empresa o interna, responsable elegible, prioridad, plazo y posiciones; detalle común → entregar/revisar/reasignar. Filtros, grupo y tamaño 25/50/100 se conservan al volver. Notificaciones → lectura personal y enlaces. Usuarios → contacto WhatsApp; Configuración → WhatsApp → incidencias, estados e intentos. Conciliar reaplica evidencia guardada; unknown sin evidencia sigue el procedimiento del contrato, sin reenvío automático.

Realtime usa un marcador Broadcast sin contenido; las lecturas personales permanecen en RPC. Su autorización privada, RLS/Storage y configuración productiva de Edge/n8n/proveedor se cierran H08. Nunca usar `h06:setup`, `h06:publish:local`, el stub ni `test:h06:live` con credenciales Cloud. El despliegue de SQL no activa servicios externos.

## H07 · Supervisión y reportes

H07 incorpora dashboard, búsqueda de versiones, seis reportes básicos, exportación Excel/PDF en el navegador, resumen de empresa y consulta mínima de auditoría. Consultar [contratos](supervision-reportes.md) y [evidencia, capacidad y muestras](hitos/evidencias/h07.md).

Las ocho migraciones originales H07 se publicaron con autorización expresa, alcanzando 55 migraciones y 29 tablas públicas en local/Cloud, con historia conservada. El [cierre de observaciones](hitos/evidencias/h07-correcciones.md) incorpora una migración correctiva adicional validada y publicada con autorización específica: local y Cloud tienen 56 versiones coincidentes y 13 huellas históricas conservadas. No se enviaron fixtures a Cloud ni se activó el job de WhatsApp. La aplicación local continúa apuntando a Docker; RLS y preparación productiva siguen en H08.

Verificación reproducible: `yarn test:h07:sql` y `yarn test:h07:live`. El script de capacidad rechaza destinos remotos antes de leer fixtures o crear el SDK. Los ejemplos/muestras se guardan en `test-results/local/h07/` (ignorado); las muestras entregables están en `docs/hitos/evidencias/`. En equipos con memoria limitada junto a Docker, establecer `$env:CIRCLE_NODE_TOTAL='3'` antes de `yarn build` reduce a dos los workers de compilación.
