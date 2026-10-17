# H02 — Acceso y empresas

**Estado:** implementado y verificado técnicamente, incluida reconstrucción e integración en Docker el 16 de octubre de 2026; demostración disponible para revisión del equipo. [Validación local vigente](evidencias/validacion-local-h02-h03.md) · [Evidencias históricas y límites](evidencias/h02.md). **Depende de:** [H01](h01-preparacion-tecnica.md). **Habilita:** [H03](h03-primer-recorrido-documental.md). Aplican las [reglas](README.md#3-reglas-transversales-obligatorias) y la [Definition of Done común](README.md#4-definition-of-done-comun).

<a id="objetivo"></a>
## 1. Objetivo

Permitir que un administrador gestione empresas, cuentas y accesos del estudio, y que cada usuario inicie sesión y trabaje en el contexto de empresa/módulo previsto.

La entrega incorpora persistencia íntegra, operaciones recuperables y permisos funcionales de interfaz. La demostración de aislamiento de todas las consultas directas y revocación inmediata queda expresamente pendiente de T01 en H08.

## 2. Alcance, entradas y entregables

**Entrada:** proyecto reproducible, adaptadores separados, contratos de error y estructura Atomic Design de H01.

**Incluye:** estudio inicial, cuentas, membresías, empresas, roles, permisos, asignaciones, responsables por módulo, soft delete/restauración administrativa y primer registro confiable de operaciones/auditoría.

**Entregables:** administración ejecutable, migraciones y seeds ficticios, flujos de acceso, contratos de Auth Admin, catálogo de permisos y demostración de contextos.

| Pantalla existente | Alcance de esta entrega |
|---|---|
| `/`, `/login` | Entrada por sesión y formulario de acceso. |
| `/empresas` | Listado, alta, edición, estado y tratamiento administrativo de eliminadas. |
| `/empresas/{companyId}` | Resumen y configuración de empresa; pestañas documentales se completan después. |
| `/usuarios` | Cuenta, contraseña administrativa, habilitación, membresía y asignaciones. |
| `/configuracion` | Roles, permisos, responsables y parámetros pertinentes. |
| `/dashboard` | Destino autenticado y shell; indicadores completos en H07. |

No crear rutas de registro, recuperación por correo ni páginas independientes por módulo. Los formularios se componen sobre las rutas existentes.

<a id="requerimientos-funcionales"></a>
## 3. Requerimientos funcionales

- **H02-RF01 — Empresa.** El administrador registra RUC, razón social, datos de contacto disponibles, régimen informado manualmente, estado, contador/supervisor y fecha de inicio de control. Edita con validaciones y conserva autoría. RUC exige 11 dígitos y es único dentro del estudio incluso si la ficha está eliminada.
- **H02-RF02 — Estado de empresa.** Diferenciar `active`, `inactive` y `suspended` de eliminación lógica. Inactividad/suspensión bloquean nuevas generaciones y avisos del alcance; no eliminan documentos ni reescriben cumplimiento histórico. La integración del generador se verifica en H04.
- **H02-RF03 — Alta administrativa de usuario.** Crear con correo, nombre, contraseña establecida por administrador, tipo de membresía y asignaciones. La cuenta queda apta para login al finalizar el aprovisionamiento, sin invitación ni confirmación por correo.
- **H02-RF04 — Recuperación y contraseña.** Solo el administrador establece/cambia contraseñas. No hay contraseña temporal, cambio obligatorio al primer ingreso, recuperación por email ni edición propia en esta versión. La aplicación no conserva ni muestra de nuevo el valor.
- **H02-RF05 — Inhabilitación y rehabilitación.** Inhabilitar bloquea la cuenta y solicita revocación de sesiones admitidas. Rehabilitar exige un nuevo login y no revive sesiones antiguas. No inhabilitar/eliminar al último administrador efectivo. El bloqueo de todas las lecturas directas se acredita en H08.
- **H02-RF06 — Roles y acciones.** Crear roles del estudio y configurar acciones permitidas. Administrador es facultad del estudio, no un permiso de módulo que pueda concederse a un cliente. Los perfiles iniciales son plantillas configurables dentro de las restricciones del dominio.
- **H02-RF07 — Asignaciones por contexto.** Asignar usuario a empresa y módulo con rol y overrides. Un usuario puede tener alcances diferentes en distintas empresas. El override explícito prevalece sobre el rol; sin concesión se deniega. Ningún override habilita aprobación, observación o reapertura a un perfil cliente.
- **H02-RF08 — Alcance interno.** Diferenciar miembros internos y clientes. Actividades internas requieren membresía interna y permisos de Actividades a nivel de estudio, sin empresa. Un cliente no recibe ese alcance.
- **H02-RF09 — Responsables.** Configurar responsable de entrega por empresa/módulo únicamente entre usuarios elegibles. Ser responsable no concede acceso. El contador/supervisor administrativo de la empresa no reemplaza automáticamente la configuración de entrega.
- **H02-RF10 — Eliminación y restauración.** El administrador elimina lógicamente con motivo y puede consultar/restaurar registros cuando sus padres estén disponibles. Restaurar no cambia `enabled`, `status` o permisos, ni restaura hijos eliminados por separado. Conservar la identidad histórica y restaurar antes de intentar reutilizar un RUC o identificador existente.
- **H02-RF11 — Sesión y empresa actual.** Login/logout mediante Supabase Auth directo. La UI carga perfil, membresía y alcances, ofrece selector de empresas disponibles y limpia caché/canales al cerrar sesión. Cambio de empresa no reutiliza datos de la anterior.
- **H02-RF12 — Fallos de administración.** Una operación de alta parcialmente fallida queda identificable y recuperable; el administrador puede reintentar sin duplicar identidades ni asignaciones. La cuenta incompleta no se presenta como lista para operar.
- **H02-RF13 — Navegación y estados.** Usuarios sin asignaciones ven una explicación útil y ninguna lista ajena. Formularios muestran validaciones, carga y conflictos; una administración fuera de facultad ofrece acceso denegado y un recurso ajeno/no existente se trata sin revelar su contenido.
- **H02-RF14 — Trazabilidad.** Altas, cambios, asignaciones, eliminación/restauración, habilitación y operaciones de contraseña dejan actor, recurso, momento y decisión, sin registrar credenciales.

**Trazabilidad:** RF-01–RF-07, RF-27; RN-01, RN-10, RN-11 y RN-15; HU-01, HU-02 y HU-12; D03, D05–D09, D22, D24, D33–D35. CA01–CA05 se preparan aquí y se cierran integralmente en H08.

<a id="requerimientos-tecnicos"></a>
## 4. Requerimientos técnicos

- **H02-RT01 — Tablas de acceso.** Incorporar `organizations`, `profiles`, `organization_members`, `companies`, `roles`, `permissions`, `role_permissions`, `access_grants`, `grant_permission_overrides` y `company_module_settings` según el diccionario. `profiles.user_id` referencia la identidad `auth.users` administrada por Supabase; no almacenar hash de contraseña propio.
- **H02-RT02 — Operaciones desde el inicio.** Incorporar `audit_events` y `operation_requests` junto a las primeras mutaciones. Modelar `app_sessions` cuando sea necesario para los flujos Auth; su registro confiable y comprobación en todas las lecturas se completa en H08.
- **H02-RT03 — Integridad de ámbitos.** FK compuestas impiden vincular recursos a otro estudio/empresa. UUID, revisiones no negativas, correos normalizados y unicidad estable siguen el diccionario. Resolver ciclos de FK en migraciones sin desactivar permanentemente restricciones.
- **H02-RT04 — Soft delete completo del dominio.** Las nueve tablas administrables de este hito incluyen metadatos de creación/modificación y los tres campos de eliminación. `permissions`, `audit_events`, `operation_requests` y `app_sessions` siguen su conservación específica, sin añadir soft delete indiscriminado.
- **H02-RT05 — Operaciones administrativas transaccionales.** `AssignAccess` y `CreateOrUpdateCompany` se invocan por RPC directa. `DeleteEntity`/`RestoreEntity` validan administrador, padres, motivo y revisión, preservando auditoría y restricciones. Un perfil global no se elimina si mantiene membresías vigentes en otros estudios.
- **H02-RT06 — Excepciones de servidor limitadas.** Únicamente `POST /api/admin/users`, `POST /api/admin/users/{userId}/password` y `PATCH /api/admin/users/{userId}/enabled` requieren Auth Admin. Validar sesión real, habilitación, facultad administrativa y estudio del destinatario antes de utilizar la clave secreta; protección CSRF cuando aplique y límites de frecuencia.
- **H02-RT07 — Aprovisionamiento recuperable.** Reservar solicitud, crear identidad y completar perfil/membresía/accesos; habilitar el negocio al concluir. Identificar cada fase y reconciliar errores entre Auth y PostgreSQL; no asumir una transacción compartida entre servicios.
- **H02-RT08 — Idempotencia sin credenciales.** Identificador de petición y huella de entrada evitan duplicados o reutilización con otro contenido. Las entradas con contraseña usan la huella HMAC de servidor prevista, con `IDEMPOTENCY_HMAC_KEY` protegida; no guardar contraseña ni un hash simple susceptible de comparación.
- **H02-RT09 — Sesiones admitidas.** Conservar `session_id` verificado por un ejecutor confiable, sin JWT/refresh tokens en `app_sessions`. Mantener revocaciones por cambio de contraseña/inhabilitación y no reactivar una sesión revocada al rehabilitar. T01 resuelve su comprobación universal.
- **H02-RT10 — Auditoría controlada.** El cambio DB y su evento se confirman transaccionalmente. Usar listas permitidas para valores anteriores/posteriores y actor humano/sistema explícito; el cliente no inserta libremente una prueba de autoría.
- **H02-RT11 — Pausas operativas.** Modelar intervalos de pausa deliberada en estudio/empresa y respetar sus contratos JSONB. Eliminar el padre frena operación sin borrar hijos; su restauración no recuperará periodos excluidos.
- **H02-RT12 — SDK y componentes.** Consultas normales por repositorios Supabase de navegador, filtros tipados y paginación. Hook de sesión/contexto desacoplado de presentación; átomos/moléculas sin SDK ni autorizaciones de dominio. Datos autenticados sin caché pública.
- **H02-RT13 — RLS diferido.** Revisar permisos de las operaciones críticas desde el comienzo, pero mantener la exposición definitiva de tablas/vistas/RPC/Storage y el rechazo de accesos directos como T01 pendiente.

## 5. Reglas de dominio y contratos a entregar

| Operación | Entrada y validación esencial | Resultado y fallo significativo |
|---|---|---|
| CreateUser | Correo, nombre, contraseña, membresía, accesos y `request_id`; actor administrador del estudio. | Identidad/perfil listo o solicitud recuperable; duplicado no crea otra cuenta. |
| SetUserPassword | Usuario y contraseña nueva, petición única; no guardar el valor. | Cambio administrativo y revocación coordinada; fallo externo identificable. |
| SetUserEnabled | Usuario y estado; proteger último administrador. | Estado nuevo y sesiones revocadas al inhabilitar. |
| AssignAccess | Usuario, alcance empresa/estudio, módulo, rol y overrides compatibles. | Acceso configurado y auditable; pertenencia incompatible rechazada. |
| CreateOrUpdateCompany | Campos de empresa y revisión esperada al editar. | RUC único y revisión nueva; edición obsoleta devuelve CONFLICT. |
| DeleteEntity / RestoreEntity | Tipo, ID, motivo/petición/revisión y padres elegibles. | Metadatos cambiados y auditoría; restauración no reactiva estados/hijos. |

El catálogo de acciones incluye `view`, `upload`, `download`, `approve`, `observe`, `reopen`, `waive`, `reports.view`, `reports.export`, `workers.manage` y `audit.view`. Respetar los perfiles iniciales del diseño; una capacidad de administración no se concede por asignar un rol documental.

La entrega de la contraseña inicial al usuario se realiza mediante el procedimiento operativo del estudio, fuera de la aplicación; este hito no añade envío de email o WhatsApp con credenciales.

<a id="tareas"></a>
## 6. Tareas del hito

| Tarea | Trabajo concreto y entregable | Requisitos |
|---|---|---|
| H02-T01 | Preparar migraciones de estudio, perfiles, membresías y empresas, con relaciones/ciclos resueltos y seed del administrador de desarrollo. | RF01, RF03; RT01, RT03. |
| H02-T02 | Incorporar roles, catálogo de acciones, permisos de rol, asignaciones y overrides; verificar precedencia y restricciones del cliente. | RF06–RF09; RT01, RT03, RT05. |
| H02-T03 | Incorporar auditoría, solicitudes recuperables y sesiones necesarias; definir transacciones, huellas y datos excluidos. | RF12, RF14; RT02, RT07–RT10. |
| H02-T04 | Implementar alta administrativa recuperable y reintento de cada fallo entre Auth y SQL, con autorización del actor real. | RF03, RF12; RT06–RT08. |
| H02-T05 | Implementar contraseña/habilitación y coordinación de revocación, más defensa del último administrador. | RF04, RF05; RT06, RT08, RT09. |
| H02-T06 | Implementar CRUD de empresa y estados, con validaciones, revisión esperada y configuración por módulo. | RF01, RF02, RF09; RT05, RT11. |
| H02-T07 | Implementar eliminación/restauración para las entidades administrables de este dominio y filtros de ancestros. | RF10, RF14; RT04, RT05, RT10, RT11. |
| H02-T08 | Implementar repositorios/hooks de sesión y contexto, login/logout y selector de empresa con limpieza de caché. | RF11, RF13; RT09, RT12. |
| H02-T09 | Componer Empresas, Usuarios y Configuración con Atomic Design y formularios accesibles; mantener rutas delgadas. | RF01–RF13; RT12. |
| H02-T10 | Verificar permisos funcionales, restricciones, conflictos, fallos de aprovisionamiento y secretos; registrar qué pruebas de acceso directo siguen pendientes. | RF01–RF14; RT01–RT13. |
| H02-T11 | Entregar demostración por perfil, tipos actualizados, migraciones reproducibles y guía de gestión de cuentas. | RF11–RF14; RT02, RT12, RT13. |

## 7. Escenarios y evidencia de aceptación

| Escenario | Resultado esperado |
|---|---|
| RUC nuevo / RUC repetido incluido eliminado | Alta válida / rechazo de duplicado y restauración de ficha existente. |
| Un usuario con Tributario en A y Laboral en B | Selector y acciones reflejan alcances diferentes; enforcement directo pendiente H08. |
| Cliente con override de aprobación | Configuración rechazada por incompatibilidad del perfil. |
| Falta de confirmación por correo | Cuenta creada administrativamente puede iniciar sesión al quedar lista. |
| Auth creado y SQL fallido | Cuenta no lista para negocio; reintento identifica la identidad ya creada y termina una sola vez. |
| Dos ediciones con la misma revisión | Una confirma y la otra recibe CONFLICT, conservando los cambios del primer actor. |
| Inhabilitar / rehabilitar | Se registra revocación; la rehabilitación exige login nuevo y no elimina registros revocados. |
| Último administrador | Rechazo de inhabilitación/eliminación que dejaría al estudio sin administrador efectivo. |
| Eliminar padre y restaurarlo | Conserva hijos, estado e historia; no restaura un hijo eliminado separadamente. |
| Logout / cambio de empresa con consulta en curso | Caché/canales se limpian y respuesta anterior no se muestra en el nuevo contexto. |
| Inspección de logs, eventos y build | Ausencia de contraseñas, tokens y claves administrativas. |

Preparar CA01–CA05, CA24, CA28 y CA31–CA34. Conservar evidencia funcional y de integridad; no usarla como certificado de aislamiento antes de H08.

<a id="definition-of-done"></a>
## 8. Definition of Done

- [x] H02-RF01–H02-RF14 y H02-RT01–H02-RT13 están cubiertos por entregables/evidencias.
- [x] Administrador puede crear/editar empresas, cambiar su estado y consultar/restaurar eliminadas sin duplicar RUC.
- [x] Cuentas se crean sin flujo de correo y los fallos de aprovisionamiento se recuperan sin duplicados.
- [x] Contraseña e inhabilitación se gestionan exclusivamente por administrador; último administrador protegido y sesiones revocadas conservadas.
- [x] Roles/asignaciones/overrides funcionan por empresa/módulo y el perfil cliente no obtiene revisión.
- [x] Responsables solo se seleccionan entre usuarios elegibles; responsabilidad y autorización permanecen diferenciadas.
- [x] Soft delete, restauración, auditoría y metadatos están implementados desde las primeras entidades.
- [x] Login/logout/contexto, navegación y formularios pasan las verificaciones de estados, teclado y móvil pertinentes.
- [x] Mutaciones críticas usan contratos, revisión esperada e idempotencia; tipos y migraciones son reproducibles.
- [x] Auth Admin está aislado en servidor y los tres Route Handlers verifican actor/alcance.
- [x] Queda explícitamente pendiente el enforcement global de RLS y sesiones de H08.
- [ ] Demostración aceptada y Definition of Done común satisfecha; H03 puede comenzar con empresas/accesos disponibles.

## 9. Pendientes que no bloquean este cierre funcional

T01 y configuración productiva de Auth se cierran en H08. El control de pausas del generador se completa en H04. Los documentos, trabajadores, avisos completos e indicadores se entregan después; no se inventan pantallas vacías para declararlos terminados.

## 10. Referencias

- [Índice de hitos](README.md).
- [Usuarios, permisos y sesiones](../diseno-tecnico.md#6-usuarios-permisos-y-aislamiento).
- [Contratos y API routes](../diseno-tecnico.md#12-contratos-de-operaciones).
- [Diccionario de tablas](../tablas-db.md#4-diccionario-completo-de-tablas).
- [Soft delete y conservación](../tablas-db.md#2-soft-delete-y-conservación).
- [Navegación por perfil](../flujo-navegacion.md#4-recorridos-por-perfil).
- [Anterior: H01](h01-preparacion-tecnica.md) · [Siguiente: H03](h03-primer-recorrido-documental.md).
