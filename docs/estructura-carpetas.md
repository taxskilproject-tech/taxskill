# Estructura de carpetas y responsabilidades

**Actualización implementada localmente el 25/10/2026:** [vista documental compartida](vista-documental-periodos.md) en `src/features/document-workspace/{components,constants,hooks,types,utils}`; contratos y tipos persistidos en `src/domain/documents/`. Los tres módulos y el expediente componen esta funcionalidad y reutilizan el repositorio documental. No hay una copia por módulo.

- **Versión:** 1.0 — 10 de octubre de 2026.
- **Estado:** estructura objetivo del producto; base H01 implementada. Consultar [desarrollo](desarrollo.md) y [evidencias H01](hitos/evidencias/h01.md) para el inventario actual. Las reglas más recientes de [.agents](../.agents/rules.md) prevalecen sobre ejemplos anteriores.
- **Fuentes:** [diseño técnico](diseno-tecnico.md), [análisis](analisis_completo_sistema_documental_contable.md) y [resumen](resumen_ejecutivo_sistema_documental_contable.md).
- **Relacionados:** [tablas](tablas-db.md), [funcionamiento](diagrama-flujo.md) y [navegación](flujo-navegacion.md).

## 1. Decisiones y contexto del repositorio

**CONFIRMADO:** Next.js App Router, Supabase Cloud, consultas directas mediante SDK como Plan A, Route Handlers solo cuando son necesarios, Atomic Design obligatorio y RLS como trabajo técnico posterior T01/F05. Actividades consulta obligaciones; no introduce otra tabla de tareas.

**BASE TÉCNICA:** organización por funcionalidades, reglas puras compartidas, nombres físicos y puntos de importación de este documento. La estructura concreta no se atribuye a una elección adicional del usuario. Las dependencias nuevas se elegirán e instalarán durante implementación; este documento no instala Supabase SDK, una biblioteca de caché, formularios, PDF ni pruebas.

El repositorio actual declara Next.js 16.4.0, React 19.3.0, TypeScript 5 y Tailwind CSS 4. Usa src/app y alias @/* → src/*. next.config.ts ya habilita cacheComponents y partialPrefetching; conservar la configuración y revisar la guía instalada antes de cambiar comportamientos de caché. Los archivos especiales se contrastaron con node_modules/next/dist/docs/01-app: estructura, componentes cliente/servidor, Route Handlers y template.

El árbol es **destino propuesto**, no inventario de archivos implementados. Mantener AGENTS.md y los documentos existentes. No crear carpetas vacías por cumplir el dibujo: incorporar cada archivo cuando exista su primera responsabilidad real.

## 2. Árbol base completo

```text
tax-skill/
├── AGENTS.md
├── package.json
├── yarn.lock                           # Yarn Classic, único lockfile
├── next.config.ts
├── tsconfig.json
├── next-env.d.ts                         # Generado por Next.js
├── eslint.config.mjs
├── .gitignore
├── .env.example                         # Nombres; nunca valores reales
├── public/
│   ├── icons/
│   └── images/                          # Recursos públicos de interfaz
├── docs/
│   ├── analisis_completo_sistema_documental_contable.md
│   ├── resumen_ejecutivo_sistema_documental_contable.md
│   ├── diseno-tecnico.md
│   ├── tablas-db.md
│   ├── diagrama-flujo.md
│   ├── flujo-navegacion.md
│   └── estructura-carpetas.md
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # HTML, estilos y providers mínimos
│   │   ├── page.tsx                     # /; composición de EntryPage
│   │   ├── globals.css
│   │   ├── favicon.ico
│   │   ├── not-found.tsx
│   │   ├── global-error.tsx
│   │   ├── (public)/
│   │   │   ├── layout.tsx
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx               # Composición de AuthenticatedShell
│   │   │   ├── error.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── actividades/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [obligationId]/
│   │   │   │       └── page.tsx
│   │   │   ├── empresas/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [companyId]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── trabajadores/
│   │   │   │           └── [workerId]/
│   │   │   │               └── page.tsx
│   │   │   ├── documentos/
│   │   │   │   └── page.tsx
│   │   │   ├── reportes/
│   │   │   │   └── page.tsx
│   │   │   ├── notificaciones/
│   │   │   │   └── page.tsx
│   │   │   ├── usuarios/
│   │   │   │   └── page.tsx
│   │   │   ├── configuracion/
│   │   │   │   └── page.tsx
│   │   │   └── auditoria/
│   │   │       └── page.tsx
│   │   └── api/
│   │       ├── admin/
│   │       │   └── users/
│   │       │       ├── route.ts         # Crear identidad administrativamente
│   │       │       └── [userId]/
│   │       │           ├── password/
│   │       │           │   └── route.ts
│   │       │           └── enabled/
│   │       │               └── route.ts
│   │       └── integrations/
│   │           └── n8n/
│   │               └── receipts/
│   │                   └── route.ts
│   ├── components/                     # Atomic Design compartido
│   │   ├── atoms/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Label.tsx
│   │   │   ├── Icon.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── Text.tsx
│   │   ├── molecules/
│   │   │   ├── FormField.tsx
│   │   │   ├── SearchField.tsx
│   │   │   ├── DateRangeField.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── FeedbackMessage.tsx
│   │   ├── organisms/
│   │   │   ├── AppHeader.tsx
│   │   │   ├── AppSidebar.tsx
│   │   │   ├── DataTable.tsx
│   │   │   └── ResourceState.tsx
│   │   └── templates/
│   │       ├── AppShellTemplate.tsx
│   │       ├── ListPageTemplate.tsx
│   │       └── DetailPageTemplate.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── pages/
│   │   │   │   ├── EntryPage.tsx
│   │   │   │   └── LoginPage.tsx
│   │   │   ├── components/organisms/AuthenticatedShell.tsx
│   │   │   ├── hooks/                  # Sesión, alcance y cierre de sesión
│   │   │   ├── repositories/           # Auth SDK y consultas de acceso
│   │   │   ├── contracts/
│   │   │   └── mappers/
│   │   ├── dashboard/
│   │   │   ├── pages/DashboardPage.tsx
│   │   │   ├── components/organisms/
│   │   │   ├── hooks/
│   │   │   ├── repositories/
│   │   │   ├── contracts/
│   │   │   └── mappers/
│   │   ├── empresas/
│   │   │   ├── pages/
│   │   │   │   ├── CompaniesPage.tsx
│   │   │   │   └── CompanyDetailPage.tsx
│   │   │   ├── components/molecules/CompanySelector.tsx
│   │   │   ├── components/organisms/CompanyTabs.tsx
│   │   │   ├── hooks/
│   │   │   ├── repositories/
│   │   │   ├── contracts/
│   │   │   └── mappers/
│   │   ├── usuarios/
│   │   │   ├── pages/UsersPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── molecules/
│   │   │   │   └── organisms/
│   │   │   ├── hooks/
│   │   │   ├── repositories/           # SDK para asignaciones; HTTP solo Auth Admin
│   │   │   ├── contracts/
│   │   │   ├── mappers/
│   │   │   └── server/
│   │   │       ├── create-user.server.ts
│   │   │       ├── set-password.server.ts
│   │   │       └── set-enabled.server.ts
│   │   ├── documental/
│   │   │   ├── pages/DocumentsPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── molecules/DeliverableStatus.tsx
│   │   │   │   └── organisms/
│   │   │   │       ├── DeliverableReview.tsx
│   │   │   │       ├── VersionHistory.tsx
│   │   │   │       └── UploadPanel.tsx
│   │   │   ├── hooks/                  # Carga, finalización, observación y revisión
│   │   │   ├── repositories/           # Data API, RPC, Storage e invoke de validación
│   │   │   ├── contracts/
│   │   │   └── mappers/
│   │   ├── laboral/
│   │   │   ├── pages/WorkerFilePage.tsx
│   │   │   ├── components/organisms/EmploymentHistory.tsx
│   │   │   ├── hooks/
│   │   │   ├── repositories/
│   │   │   ├── contracts/
│   │   │   └── mappers/
│   │   ├── actividades/
│   │   │   ├── pages/
│   │   │   │   ├── ActivitiesPage.tsx
│   │   │   │   └── ObligationDetailPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── molecules/PriorityIndicator.tsx
│   │   │   │   └── organisms/
│   │   │   │       ├── ActivitiesFilters.tsx
│   │   │   │       ├── ActivitiesList.tsx
│   │   │   │       └── ObligationSummary.tsx
│   │   │   ├── hooks/
│   │   │   ├── repositories/
│   │   │   ├── contracts/
│   │   │   └── mappers/
│   │   ├── notificaciones/
│   │   │   ├── pages/NotificationsPage.tsx
│   │   │   ├── components/organisms/NotificationsList.tsx
│   │   │   ├── hooks/
│   │   │   ├── repositories/
│   │   │   ├── contracts/
│   │   │   ├── mappers/
│   │   │   └── server/record-n8n-receipt.server.ts
│   │   ├── reportes/
│   │   │   ├── pages/ReportsPage.tsx
│   │   │   ├── components/organisms/
│   │   │   ├── hooks/
│   │   │   ├── repositories/
│   │   │   ├── contracts/
│   │   │   ├── mappers/
│   │   │   └── exporters/              # Excel/PDF cliente, reutilizan el mismo resultado
│   │   ├── configuracion/
│   │   │   ├── pages/SettingsPage.tsx
│   │   │   ├── components/organisms/
│   │   │   ├── hooks/
│   │   │   ├── repositories/
│   │   │   ├── contracts/
│   │   │   └── mappers/
│   │   └── auditoria/
│   │       ├── pages/AuditPage.tsx
│   │       ├── components/organisms/
│   │       ├── hooks/
│   │       ├── repositories/
│   │       ├── contracts/
│   │       └── mappers/
│   ├── domain/                         # Reglas puras; sin React, Next ni SDK
│   │   ├── calendar/
│   │   │   ├── periods.ts
│   │   │   └── deadlines.ts
│   │   ├── obligations/
│   │   │   ├── states.ts
│   │   │   ├── compliance.ts
│   │   │   └── applicability.ts
│   │   ├── employment/
│   │   │   └── periods.ts
│   │   ├── access/
│   │   │   └── capabilities.ts          # Cálculo puro para presentación
│   │   └── common/
│   │       ├── identifiers.ts
│   │       └── operation-result.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── browser.ts              # URL y clave publicable; sesión del usuario
│   │   │   ├── admin.server.ts         # Credencial secreta; server-only
│   │   │   ├── server-auth.server.ts   # Verificar actor de API privilegiada
│   │   │   └── database.types.ts       # Generado a partir del esquema real futuro
│   │   ├── query/
│   │   │   ├── QueryProvider.tsx
│   │   │   └── keys.ts                 # Usuario, estudio, empresa y filtros
│   │   ├── errors/
│   │   │   └── normalize.ts
│   │   ├── formatting/
│   │   │   ├── dates.ts
│   │   │   └── money.ts
│   │   └── server/
│   │       ├── idempotency.server.ts
│   │       └── integration-auth.server.ts
│   └── styles/
│       └── tokens.ts                   # Constantes de clases Tailwind; no CSS
├── supabase/                           # Configuración y base CLI en H01; funciones futuras
│   ├── config.toml
│   ├── migrations/                     # Esquema, funciones y después RLS T01
│   ├── seed.sql                        # Datos ficticios y catálogo inicial
│   └── functions/
│       ├── _shared/                    # Contratos puros compatibles con runtime de funciones
│       ├── finalize-upload/index.ts
│       ├── daily-whatsapp-digest/index.ts
│       └── cleanup-upload-intents/index.ts
└── tests/                              # Se añade junto con comportamiento verificable
    ├── domain/
    ├── database/
    ├── integrations/
    └── e2e/
```

Los nombres de funciones Edge son BASE TÉCNICA. Generación idempotente y cambios transaccionales residen en funciones SQL invocadas por RPC/Cron; no necesitan un endpoint Next.js para cada operación. El saneamiento de temporales es una tarea confiable; no borra versiones documentales conservadas.

public/ contiene solo recursos públicos del producto. Los documentos tributarios, laborales y de actividades permanecen en Storage privado; no se copian a public ni al sistema de archivos de Vercel.

## 3. Rutas delgadas y composición por funcionalidad

| Ruta | Archivo especial | Página de funcionalidad que compone |
|---|---|---|
| / | `src/app/page.tsx` | `src/features/auth/pages/EntryPage.tsx` |
| /login | `src/app/(public)/login/page.tsx` | `src/features/auth/pages/LoginPage.tsx` |
| /dashboard | `src/app/(app)/dashboard/page.tsx` | `src/features/dashboard/pages/DashboardPage.tsx` |
| /actividades | `src/app/(app)/actividades/page.tsx` | `src/features/actividades/pages/ActivitiesPage.tsx` |
| /actividades/{obligationId} | `src/app/(app)/actividades/[obligationId]/page.tsx` | `src/features/actividades/pages/ObligationDetailPage.tsx` |
| /empresas | `src/app/(app)/empresas/page.tsx` | `src/features/empresas/pages/CompaniesPage.tsx` |
| /empresas/{companyId} | `src/app/(app)/empresas/[companyId]/page.tsx` | `src/features/empresas/pages/CompanyDetailPage.tsx` |
| /empresas/{companyId}/trabajadores/{workerId} | `src/app/(app)/empresas/[companyId]/trabajadores/[workerId]/page.tsx` | `src/features/laboral/pages/WorkerFilePage.tsx` |
| /documentos | `src/app/(app)/documentos/page.tsx` | `src/features/documental/pages/DocumentsPage.tsx` |
| /reportes | `src/app/(app)/reportes/page.tsx` | `src/features/reportes/pages/ReportsPage.tsx` |
| /notificaciones | `src/app/(app)/notificaciones/page.tsx` | `src/features/notificaciones/pages/NotificationsPage.tsx` |
| /usuarios | `src/app/(app)/usuarios/page.tsx` | `src/features/usuarios/pages/UsersPage.tsx` |
| /configuracion | `src/app/(app)/configuracion/page.tsx` | `src/features/configuracion/pages/SettingsPage.tsx` |
| /auditoria | `src/app/(app)/auditoria/page.tsx` | `src/features/auditoria/pages/AuditPage.tsx` |

Los grupos (public)/(app) no se exponen en URL. Las pestañas de /empresas/{companyId} no generan archivos page.tsx nuevos por módulo. /configuracion compone capacidades existentes: catálogo/reglas propias y componentes públicos de usuarios/empresas cuando corresponda; no replica sus repositorios ni formularios.

app/**/page.tsx organiza entrada y parámetros e instancia la página del dominio. No contiene SQL, reglas de vencimiento ni formularios completos. Respetar la API de params/searchParams de la versión instalada, incluida su resolución asíncrona donde corresponda, al implementar.

Los layouts organizan estructura y proveedores. Las páginas/layouts pueden seguir siendo componentes de servidor para composición; la parte que utiliza SDK, hooks y estado se declara cliente en una frontera explícita. No convertir todos los átomos ni todo app en componentes cliente por comodidad. La consulta habitual de negocio sigue en navegador.

AuthenticatedShell pertenece a auth porque conoce sesión y contexto; entrega datos y callbacks a AppShellTemplate/AppHeader/AppSidebar. Estos componentes compartidos no importan auth ni consultan Supabase.

No añadir loading.tsx para navegación normal. Los indicadores representan trabajo asíncrono real del SDK dentro de la funcionalidad; los controles instantáneos no muestran loading. error.tsx/global-error.tsx manejan errores de renderización según Next.js; los fallos esperados de consulta/formulario se representan con ResourceState/FeedbackMessage. not-found.tsx no agrega una ruta /404; recursos consultados en cliente pueden usar estado No encontrado dentro de la página.

## 4. Atomic Design obligatorio

| Nivel | Responsabilidad | Ejemplos y límites |
|---|---|---|
| Átomo | Elemento de interfaz con una responsabilidad y contrato pequeño. | Botón, input, label, icono, badge. Sin consulta, permisos remotos ni reglas de entrega. |
| Molécula | Combinación breve de átomos para una interacción reutilizable. | Campo con etiqueta/error, búsqueda, rango de fechas, confirmación. Recibe valores/callbacks. |
| Organismo | Sección de interfaz coherente formada por niveles anteriores. | Filtros, revisión de un entregable, tabla, historial. Recibe un modelo de vista; no SDK. |
| Template | Distribución de regiones y slots; define estructura visual reutilizable. | ListPageTemplate/DetailPageTemplate. No conoce una empresa, regla o tabla concreta. |
| Página | Composición de una funcionalidad con datos, filtros y acciones reales. | ActivitiesPage une hook, template, filtros/listado y estados. |

Descomponer por responsabilidad, interacción y reutilización. Mantener los componentes tan atómicos como resulte útil: separar carga, progreso, selección y validación en piezas cuando cambien por motivos distintos. Cada componente y archivo de componentes tiene un máximo de 170 líneas físicas según la regla reciente del usuario. No comprimir código para cumplir el límite ni crear wrappers sin contrato propio para cada etiqueta HTML.

components/ es el sistema compartido. features/<dominio>/components usa las mismas categorías cuando necesita piezas específicas. Una molécula con conceptos de entregable puede permanecer en documental; un campo de fecha sin negocio puede compartirse. La primera implementación no requiere inventar átomos específicos para todos los dominios.

**Promoción a compartido:** cuando dos funcionalidades requieren el mismo comportamiento y accesibilidad, extraer la responsabilidad común; quitar conceptos de negocio y exponer props claras. Si solo comparten aspecto, compartir tokens/primitivas y mantener la composición específica. No unir formularios distintos mediante decenas de booleanos.

Templates de Atomic Design son componentes React con nombres propios bajo components/templates. El archivo especial **app/**/template.tsx de Next.js** vuelve a montar componentes cliente de su segmento al navegar, reiniciando estado y efectos conforme a su convención. No es la categoría de Atomic Design. El árbol inicial no incluye template.tsx: se añadirá únicamente si se necesita expresamente ese reinicio, evitando perder formularios o estado de contexto por una confusión de nombres.

## 5. Separación de presentación, datos y dominio

| Carpeta | Qué contiene | Qué no debe contener |
|---|---|---|
| features/*/pages | Composición, parámetros de pantalla y conexión de hooks a UI. | Consultas SDK repetidas o reglas contables. |
| features/*/components | Átomos/moléculas/organismos específicos, props y estado local de interacción. | Credenciales, llamadas SDK, cambios de tablas por cuenta propia. |
| features/*/hooks | Orquestación cliente, caché, filtros, progreso, acciones y manejo de estados. | JSX de una pantalla completa ni credenciales administrativas. |
| features/*/repositories | Acceso tipado directo a Data API/RPC/Storage/Auth; HTTP solo para las cuatro excepciones. | Texto de UI, JSX o reglas de autorización definitivas implementadas solo en cliente. |
| features/*/contracts | Entradas/salidas, modelos de vista, validaciones de formulario y códigos de operación. | Copias manuales del esquema físico generado. |
| features/*/mappers | Traducción entre filas/DTO y modelos de presentación. | Peticiones, estado React o cálculos duplicados de cumplimiento. |
| features/*/server | Casos privilegiados; valida actor, idempotencia y coordina Auth/dominio. | CRUD ordinario convertido en API sin necesidad. |
| domain | Cálculos deterministas de plazos, estados, cumplimiento y etapas laborales. | SDK, React, Next, secretos o acceso a red. |
| lib | Adaptadores técnicos, errores, formato, claves de caché y utilidades con responsabilidad concreta. | Un utils.ts con reglas de todos los módulos. |
| supabase | Modelo físico, restricciones, RPC, tareas programadas y funciones confiables. | Dependencia de componentes React o imports de Next.js. |

Un contrato de formulario puede seleccionar campos del dominio sin replicar cada columna de la base. Los tipos de tabla se generarán desde Supabase una vez que exista el esquema; no declarar como existentes tipos generados, migraciones ni RPC.

Las reglas puras del navegador explican y anticipan estados. La confirmación definitiva de cambios, unicidad, relaciones, revisión y concurrencia se ejecuta en transacciones SQL. Una validación de UI no sustituye CHECK, CAS o autorización. Mantener ejemplos/fixtures compartidos de calendario y cumplimiento para comprobar equivalencia entre SQL y dominio, sin prometer que TypeScript se ejecuta automáticamente dentro de PostgreSQL.

## 6. Importaciones y dependencias permitidas

La dirección principal es:

```text
app/page o layout
    -> features/*/pages o shell de auth
        -> hooks -> repositories -> adaptador Supabase browser
        -> components propios -> components compartidos
        -> contracts / mappers / domain
Route Handler
    -> caso de uso *.server.ts -> adaptador administrativo y SQL confiable
components compartidos
    -> componentes de igual o menor responsabilidad visual / tokens / formato puro
domain
    -> tipos y utilidades puras de domain/common
```

- Usar @/*, ya configurado, para evitar rutas relativas profundas. Los imports locales cortos dentro de una misma pieza son válidos.
- Átomos no importan moléculas/organismos; moléculas no importan organismos/templates/páginas. Organismos usan átomos/moléculas y pueden componer secciones pequeñas sin ciclos. Templates reciben slots en lugar de importar funcionalidades.
- components/ no importa features/, repositories/, SDK ni módulos *.server.ts. lib/supabase/browser.ts se usa desde repositorios, no directamente desde cada botón.
- Las funcionalidades exponen contratos/componentes reutilizables desde un punto de entrada pequeño cuando haya consumidores reales. No exportar credenciales ni todo el dominio con exportaciones globales.
- Evitar imports entre carpetas internas de dos funcionalidades. Compartir capacidades estables por su interfaz pública o domain. Si la relación crea un ciclo, mover composición al consumidor o extraer una regla pura.
- Composición prevista: empresas usa piezas públicas de laboral/documental; actividades usa documental para revisar/archivos; configuración compone usuarios/empresas. Esas funcionalidades proveedoras no importan páginas de sus consumidoras.
- Separar entradas cliente y servidor; no reexportar *.server.ts desde un index que use UI. Añadir server-only al adaptador/casos privilegiados en implementación para que un import cliente falle.
- Los contratos que requieran validación en Next y Edge deben ser compatibles con ambos runtimes y tener una fuente mantenida. _shared no importa src/lib/supabase/browser.ts ni utilidades React; verificar contratos de integración con fixtures, sin copiar lógica silenciosamente.
- Las reglas de importación se comprobarán con ESLint en implementación. Esta entrega documenta la regla, no afirma haber añadido restricciones al linter actual.

## 7. Supabase directo y excepciones justificadas

Flujo habitual: página cliente → hook → repositorio → SDK Supabase con sesión del usuario → Data API/RPC/Storage. Las mutaciones compuestas usan RPC para transacción e idempotencia; no son varias escrituras coordinadas solo por el navegador.

| Operación | Transporte previsto | Ubicación |
|---|---|---|
| Consultar empresas, trabajadores, actividades, documentos y avisos | SDK directo. | Repositorio de funcionalidad. |
| Configurar, restaurar, cesar/reingresar, aprobar/observar/reabrir | RPC directa con sesión. | Repositorio; función SQL bajo supabase/migrations. |
| Reservar carga y transferir/reanudar bytes | RPC + Storage SDK. | documental/repositories. |
| Validar bytes y promover archivo | SDK functions.invoke a Edge Function. | finalize-upload; validación confiable y confirmación SQL. |
| Generar obligaciones periódicas/eventuales | Cron + función SQL idempotente. | Supabase; fuera del ciclo de vida de React. |
| Resumen diario y limpieza controlada de temporales | Cron + Edge Function. | Funciones con credenciales de integración/Storage. |
| Auth Admin y recepción de resultado n8n | Route Handler. | Los cuatro contratos siguientes. |

| HTTP | Contrato | Archivo futuro | Necesidad |
|---|---|---|---|
| POST | /api/admin/users | src/app/api/admin/users/route.ts | Clave Auth Admin y coordinación confiable de aprovisionamiento. |
| POST | /api/admin/users/{userId}/password | src/app/api/admin/users/[userId]/password/route.ts | Contraseña administrativa y revocación de sesiones. |
| PATCH | /api/admin/users/{userId}/enabled | src/app/api/admin/users/[userId]/enabled/route.ts | Inhabilitación/rehabilitación en Auth y dominio. |
| POST | /api/integrations/n8n/receipts | src/app/api/integrations/n8n/receipts/route.ts | Verificar secreto y deduplicar resultado de proveedor. |

Route Handler adapta HTTP al contrato, verifica identidad/secretos y delega el caso. Las reglas de negocio no se duplican en route.ts y hook. Recepción de n8n no utiliza sesión de usuario; verifica su secreto específico. Una respuesta HTTP aceptada del webhook no equivale a entrega WhatsApp.

No se propone una API genérica /api/empresas, /api/actividades o /api/documentos, ni Server Actions para el CRUD habitual. La justificación de nuevas excepciones se registra primero en el diseño central. No se utiliza un proxy de Next.js para reenviar por defecto todas las peticiones a Supabase.

## 8. Contexto, caché y estados

QueryProvider representa la responsabilidad de caché y cancelación; la biblioteca concreta es una selección técnica futura. Una clave de consulta incluye user_id, organization_id, scope de empresa/módulo y filtros normalizados; nunca incluye contraseña, URL firmada o secreto. No compartir caché entre usuarios.

Cambiar empresa cancela consultas anteriores y elimina selecciones incompatibles. Una carga conserva los identificadores con que fue reservada. Logout/inhabilitación cancela canales y retira datos/formularios sensibles. Evitar persistir expedientes laborales en localStorage como optimización inicial.

Las mutaciones con expected_revision rechazan datos desactualizados. Hook muestra CONFLICT, refresca y conserva el formulario; no reintenta automáticamente aprobar/observar sobre una versión nueva. Rutas/componentes no calculan éxito antes de recibir confirmación confiable.

Los estados de carga, vacío, error, restricción y recurso inexistente pertenecen a contratos explícitos de presentación. Los indicadores derivados de vencimiento y cumplimiento usan domain y los datos autorizados; no se almacena otro estado contradictorio en UI.

## 9. Estilos y accesibilidad

Usar clases Tailwind y constantes compartidas en TypeScript para tipografía, color, espacio, bordes y foco; no escribir CSS personalizado. globals.css conserva únicamente la infraestructura para importar Tailwind. En H01 las constantes de controles viven en src/components/constants/control-styles.ts; no crear tokens.css. Átomos controlan estados disabled/focus/error con contratos consistentes y UI minimalista.

Listas y revisiones deben funcionar en móvil y teclado. Campos con label, mensajes vinculados, foco visible, encabezados jerárquicos y avisos anunciados. Vencidas, observadas y prioridades necesitan texto/icono además de color. Diálogos controlan foco, permiten salida y conservan el contexto; indicar progreso/reanudación de cargas.

DataTable ofrece columnas/renderers y accesibilidad comunes; no contiene nombres de tablas DB o todas las variantes de reglas. El dominio decide qué puede mostrarse y la funcionalidad entrega modelos de vista. Los permisos visuales mejoran la experiencia; el enforcement confiable pendiente de T01 sigue siendo independiente.

## 10. Configuración y tareas posteriores

| Dato | Ubicación | Clasificación |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Entorno frontend; .env.example documenta nombres. | PREPUBLICACIÓN; configuración real pendiente. |
| SUPABASE_SECRET_KEY | Vercel/funciones confiables; nunca NEXT_PUBLIC. | PREPUBLICACIÓN. |
| APP_BASE_URL | Servidor/funciones; enlaces canónicos. | PREPUBLICACIÓN: dominio definitivo. |
| N8N_WEBHOOK_URL / N8N_WEBHOOK_TOKEN | Función diaria de salida. | PREPUBLICACIÓN; proveedor y webhook reales pendientes. |
| N8N_RECEIPT_TOKEN | Receptor Next.js; secreto distinto al de salida. | PREPUBLICACIÓN. |
| IDEMPOTENCY_HMAC_KEY | Servidor para huella de operaciones administrativas sensibles. | BASE TÉCNICA nueva; provisionar antes de activar Auth Admin. |
| Respaldos DB/Storage y credenciales | Entorno operativo independiente. | PREPUBLICACIÓN; validar restauración real. |
| RLS, permisos Data API/RPC y Storage | Migración posterior T01/F05 y pruebas de acceso directo. | TRABAJO TÉCNICO POSTERIOR; no configurado aquí. |

No guardar contraseñas/tokens en logs, operation_requests o audit_events. La huella de entrada sensible usa HMAC con clave de servidor, según [diccionario](tablas-db.md#5-contratos-de-campos-jsonb); los ejemplos de entorno contienen solo nombres. Bootstrap del primer administrador es un procedimiento confiable de ejecución única, no otro endpoint público.

Las migraciones futuras versionan primero el modelo y las operaciones; RLS se abordará después conforme a la decisión del usuario. La documentación de roles y los filtros UI describe el comportamiento objetivo, sin afirmar que haya políticas implementadas.

## 11. Pruebas futuras y criterios de aceptación

Las carpetas de tests son responsabilidades previstas. Probar calendario de Lima, cierre de día, condiciones históricas, cumplimiento parcial, reingreso, unicidad/idempotencia y concurrencia. Las pruebas de Data API/Storage deben intentar acceso directo con sesiones de distintos ámbitos al completar T01. Integraciones verifican duplicados/reintentos y diferencia accepted/delivered.

E2E recorre entrega, observación, corrección, revisión parcial, reapertura, cambio de empresa y restauración administrativa. No añadir pruebas que solo repitan el JSX de cada átomo.

| Criterio de la estructura | Evidencia esperada durante implementación |
|---|---|
| Cada URL del inventario tiene un único page.tsx. | 14 rutas coinciden con navegación; tabs no generan páginas adicionales. |
| Atomic Design y fronteras de datos se respetan. | Componentes compartidos sin SDK y revisiones visuales/accessibilidad. |
| Revisión/carga no se duplican en Actividades y módulos. | Una composición documental reutilizada con obligation_id/deliverable_id. |
| Las consultas habituales son directas. | Repositorios con SDK; cuatro excepciones HTTP documentadas. |
| Los secretos quedan en código servidor. | Imports server-only y verificación del bundle público. |
| Reglas/calendario tienen una fuente por responsabilidad. | Fixtures y resultados coherentes con SQL; sin copias por módulo. |
| Histórico y soft delete mantienen identidad. | Repositorios operativos excluyen eliminados; consulta/restauración administrativa explícita. |
| Los documentos siguen siendo el punto de entrada. | Relaciones con [modelo](tablas-db.md), [flujo](diagrama-flujo.md) y [rutas](flujo-navegacion.md). |

## 12. Referencias

### Actualización implementada: accesos a módulos, 24/10/2026

La implementación conserva las rutas y la organización por funcionalidad. `src/app/(app)/empresas/page.tsx` delega en `CompaniesEntryPage`: directorio habitual o selector de empresa según `module`. La ruta de detalle de empresa sigue delegando en su página de funcionalidad; con un `tab` documental compone `CompanyModuleWorkspace`, sin duplicar servicios.

```text
src/features/auth/
  components/      # Enlaces compartidos, barra lateral, barra móvil y cabecera
  constants/       # Grupos de navegación y límite de origen
  hooks/           # Contexto de empresa derivado de URL e identidad
  types/           # NavigationItem, WorkspaceRoute y estado del contexto
  utils/           # Módulo, permisos actuales, empresa elegible y destinos puros
src/features/companies/
  pages/           # Entrada, directorio, selector por módulo y detalle existentes
  components/      # Filas de selección de empresa
src/features/documents/
  components/      # Espacio de módulo, filtros plegados y listado común
src/features/workers/
  components/      # Listado y expediente reutilizados desde el módulo laboral
```

El repositorio compartido sigue en `features/access/repositories`; no se creó `features/companies/repositories` por esta entrega. El layout autenticado incluye Suspense alrededor del espacio protegido para leer parámetros de URL conforme a la guía instalada de Next.js. No hay un dominio/SDK nuevo por cada módulo, endpoint adicional ni migración. Ver [implementación, pruebas y capturas](plan-navegacion-modulos.md).

**Implementación H05:** `src/features/workers/` contiene componentes, hooks, repositorio, tipos y mapeo de formularios; `src/domain/workers/` mantiene contratos y constantes. La única ruta laboral nueva es `src/app/(app)/empresas/[companyId]/trabajadores/[workerId]/page.tsx`. Las tres áreas componen `features/documents` y el motor existente, sin tres copias de servicios. Detalles en [contratos laborales](expediente-laboral.md).

- Guía instalada de Next.js: estructura, Server/Client Components, Route Handlers y template bajo node_modules/next/dist/docs/01-app; consultar esa versión al escribir código conforme a AGENTS.md.
- [Estructura oficial de App Router](https://nextjs.org/docs/app/getting-started/project-structure).
- [Componentes cliente/servidor](https://nextjs.org/docs/app/getting-started/server-and-client-components).
- [Convención template](https://nextjs.org/docs/app/api-reference/file-conventions/template).
- [Modelo físico y conservación](tablas-db.md).
- [Estados y contratos del proceso](diagrama-flujo.md).
- [URLs y recorridos](flujo-navegacion.md).

## Extensión H09 implementada

- `src/domain/company-profile/{constants,contracts,types,utils}`: regímenes cerrados, perfil documental y aplicabilidad puros.
- `src/domain/documents/contracts/template.schema.ts` y `types/template.types.ts`: contratos de plantillas, versiones, preparación y uso por empresa.
- `src/features/deliverable-templates/{components,types,utils}`: borradores/publicación por régimen, checklist, edición de un entregable y previsualización; reutiliza recurrencias, archivos y paneles existentes.
- `src/features/companies/{components,hooks,contracts,types}`: alta guiada y resumen confirmado del perfil. `legacy-company-form.tsx` conserva la edición de empresas anteriores y comparte campos; no se convierten automáticamente.
- `src/features/document-workspace`: lista unificada de tipos realmente configurados, numeración por contexto y estados vacíos, reutilizada por los tres módulos.
- `supabase/migrations/*_h09_*.sql` y `supabase/tests/h09-templates.sql`: esquema, RPC, RLS y casos transaccionales de H09.
- `scripts/run-h09-lab.ts`, `scripts/utils/h09-lab-environment.ts` y fixtures H09: laboratorio Docker separado, con conexión validada antes de solicitar o escribir datos.

No se añaden rutas App Router, API routes, bibliotecas visuales ni servicios duplicados por módulo. Los artefactos locales `.next-h09` y `test-results/local/h09-lab` están excluidos del repositorio. [Especificación y conservación H09](entregables-plantillas-empresa.md).
