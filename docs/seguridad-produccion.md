# Seguridad de publicación · H08

Implementación técnica de T01. Ver [H08](hitos/h08-preparacion-produccion.md), [operación](operacion-produccion.md), [evidencias](hitos/evidencias/h08.md) y [modelo](tablas-db.md). El 18/10/2026 se publicaron las siete migraciones en Cloud: 29 tablas públicas con RLS, 64 versiones y 13 huellas históricas conservadas durante esa publicación. Después de la autorización del usuario se aplicó Auth productivo, sin diferencias declaradas restantes y conservando nueve propiedades remotas ajenas. El administrador real Josmel ingresó correctamente y su sesión quedó admitida por el hook de contraseña; la sesión de comprobación se cerró. Ambas funciones Edge publicadas rechazan llamadas anónimas con HTTP 401.

## Identidad y sesiones

El navegador mantiene Supabase Auth y consulta directamente Data API/RPC. No se añade un proxy general de datos ni una API de login. El JWT identifica al actor; el UUID del recurso determina estudio, empresa y módulo. Los parámetros del navegador no conceden privilegios.

El trigger de `auth.sessions` registra la sesión, pero eso no basta para admitir acceso. El hook **Custom Access Token** `public.h08_access_token_hook` verifica que coincidan usuario, `claims.sub` y sesión Auth; admite exclusivamente contraseña o refresh de una sesión ya verificada. Marca `authentication_verified_at` y `authentication_method=password`. Solo `supabase_auth_admin` puede ejecutarlo. Cada lectura/operación comprueba perfil listo y habilitado, membresía activa y sesión existente/no revocada. Una sesión inventada, OTP, recovery o una fila sin admisión del hook no obtiene datos.

La migración revoca las admisiones anteriores: el despliegue exige login nuevo. Inhabilitar perfil/membresía, eliminar lógicamente o cambiar contraseña revoca sesiones previas; habilitar de nuevo y refrescar tokens no las readmite. No se almacenan JWT, refresh tokens ni contraseñas en las tablas de negocio.

Auth mantiene registro público desactivado y contraseña mínima de 12 caracteres. El hook **Send Email** `h08_block_auth_email` rechaza recuperación, magic links y otros correos; las cuentas se provisionan confirmadas por el administrador. Desactivar las opciones visuales no sustituye estos controles. No habilitar proveedores alternativos, registro anónimo ni recuperación por correo al publicar.

El guard de credenciales es un constraint trigger diferido: Auth Admin cambia primero la contraseña y después sus metadatos dentro de la misma transacción. Al confirmar, exige el marcador administrativo nuevo y una operación `SetUserPassword` preparada, en procesamiento y con etapa DB reciente. Rechaza el cambio directo del usuario. Si Auth ya completó la operación y falló la confirmación posterior, el mismo `request_id` termina la operación sin cambiar otra vez la contraseña. El marcador es un UUID de operación, nunca un secreto. Bootstrap es exclusivo de servicio y rechaza un segundo estudio incluso si el anterior fue eliminado lógicamente.

## Matriz de recursos

Las 29 tablas públicas tienen RLS. Se revocan escrituras directas del navegador; las mutaciones pasan por contratos RPC transaccionales existentes. El administrador sigue limitado a su estudio. El histórico administrativo no concede permiso para borrar versiones, revisiones o auditoría.

| Recurso | Lectura directa autenticada | Mutación y conservación |
|---|---|---|
| `organizations` | Estudio de membresía/sesión admitida; historial administrativo explícito. | RPC administrativo, soft delete. |
| `profiles` | Perfil propio; administrador del mismo estudio. | Auth Admin/RPC, sin directorio global de contactos. |
| `organization_members` | Membresía propia activa; administrador del estudio. | RPC; inhabilitación distinta de soft delete. |
| `app_sessions` | Propias o administración del estudio con sesión admitida. | Trigger/hook/servicio; nunca readmisión de una revocada. |
| `companies` | Algún módulo concedido de esa empresa; administrador. | RPC; ancestro inactivo/eliminado bloquea operación ordinaria. |
| `roles`, `role_permissions` | Administrador del estudio. | RPC con audiencia y acciones válidas. |
| `permissions` | Catálogo de acciones del estudio admitido. | Servicio/catálogo controlado. |
| `access_grants` | Concesiones propias activas o administración del estudio. | RPC administrativo; default deny y overrides vigentes. |
| `grant_permission_overrides` | Concesión propia visible; eliminados solo administrador. | RPC; cliente no adquiere facultades de revisión. |
| `company_module_settings` | Empresa/módulo concedido o administrador. | RPC; responsable con permiso actual. |
| `workers`, `employment_periods` | Laboral por trabajador de empresa concedida; ancestros vigentes. | RPC laboral; historial y reingresos conservados. |
| `document_types`, `requirement_rules`, `rule_versions` | Administración del estudio. | RPC de catálogo/reglas; snapshots conservados. |
| `periods` | Periodos con obligaciones visibles; administrador del estudio. | Motor idempotente, sin escritura libre. |
| `obligations` | Estudio/empresa/módulo vigentes y trabajador aplicable; internas solo equipo autorizado. | RPC; cancelar con motivo, sin borrado histórico. |
| `deliverables`, `submission_cycles` | Heredan el alcance de su obligación. | RPC con revisión esperada. |
| `upload_intents` | Intenciones propias de entregable visible; columnas expresamente concedidas. | Reserva/RPC y finalización de servicio. No exponer `validation_token` ni lease. |
| `document_versions`, `review_events` | Heredan entregable y obligación autorizados. | Confirmación interna y revisión por contrato; inmutables. |
| `notification_events`, `notifications` | Sin SELECT libre; RPC H06 por destinatario y alcance actual. | Servicio/operación de lectura de avisos autorizada. |
| `whatsapp_digests`, `integration_attempts` | Sin SELECT libre; consultas H06 administrativas autorizadas. | Sistema, claim durable y receipts autenticados. |
| `audit_events` | RPC H07 con filtros de recurso/alcance. | Append controlado; cliente no fabrica eventos. |
| `operation_requests` | Consulta de estado autorizada por RPC. | Operaciones idempotentes; sin credenciales en payload. |

`h02_users` y `h03_obligation_summary` son vistas `security_invoker`; no eluden las políticas de sus tablas. Las vistas privadas H07 solo se consultan desde funciones que verifican alcance. `include_deleted` sigue siendo una facultad administrativa explícita. RUC e identidad laboral permanecen únicos tras soft delete; restaurar el padre no restaura hijos por separado.

Las tablas técnicas privadas `h08_rate_limits` y `h08_recovery_runs` tienen RLS y ningún acceso libre de navegador. No añaden entidades al modelo de negocio de 29 tablas. El servicio registra límites agregados y resultados de backup/restore; el administrador obtiene contadores sanitizados mediante `h08_health`.

## Funciones y ejecutores

La whitelist del navegador conserva `h02_context`, `h02_command`, `h02_operation_status`, `h03_query`, `h03_command`, `h03_upload_context`, `h04_preview`, `h05_query`, `h06_query`, `h07_query`, `h07_export` y el nuevo `h08_health` administrativo. Los comandos revalidan acción/actor/ancestros; un permiso `view` no concede aprobar. El anónimo no ejecuta RPC de negocio. Las funciones privadas no se exponen como esquema Data API.

Confirmación de carga, validación, generación programada, bootstrap, gateway n8n, ratelimit y registro de recuperación son de servicio. Las funciones de Auth se reservan a `supabase_auth_admin`. Los auxiliares de políticas reciben únicamente los permisos EXECUTE necesarios; los validadores inmutables de CHECK también son ejecutables por servicio.

Se mantienen **cuatro** API routes: tres de Auth Admin y receipts n8n. Auth Admin conserva validación, sesión, autorización y CSRF, con 20 solicitudes/minuto por usuario verificado. Receipts exige secreto independiente, contrato válido y 120/minuto; responde 429 con `Retry-After` o error explícito cuando falla el almacén del límite. El límite es persistente en PostgreSQL y usa identidades hash, no memoria por instancia Vercel.

## Storage y Realtime

`documents` y `document-reception` son privados. Políticas restrictivas impiden lectura/escritura cruda de estos buckets a `anon`/`authenticated`, incluso para administradores del producto. Una política SELECT libre permitiría firmar URLs largas sin auditoría: las descargas pasan por el Edge existente, autorización RPC y URL de **60 segundos** para versión confirmada.

La carga usa reserva y token firmado de recepción, TUS recuperable y validación confiable de bytes/formato/tamaño. El token de validación SQL no viaja al navegador. El servicio promociona el objeto sin sobrescribir y reconcilia fallos; confirmar revalida permisos actuales. Retirar una concesión impide nuevos enlaces; un enlace ya firmado conserva su capacidad hasta expirar. No prometer revocación instantánea de URLs emitidas.

Los canales son privados y tienen topic `personal-notices:<organization_id>:<user_id>:<session_id>`. La política de `realtime.messages` exige esa sesión admitida; se rechaza publicar marcadores desde clientes. El broadcast contiene únicamente `changed:true`, sin documentos, teléfono o contenido del aviso. Su receptor invalida y consulta nuevamente el RPC con alcance actual. El emisor no publica a sesiones revocadas; no depende de que el usuario cierre la pestaña.

## Verificación y activación

Pruebas locales: RLS/SDK real/Auth directo, bloqueo de contraseña/recovery, sesión inventada/no verificada/revocada, módulos diferentes, revocación y rehabilitación, descarga autorizada y TTL, base limpia y recuperación. Consultar resultados y límites exactos en [evidencias](hitos/evidencias/h08.md). No usar el proyecto Cloud como fixture ni insertar cuentas ficticias para completar una demostración.

Antes de Cloud: copia real independiente, ventana de cambio y versión de aplicación compatible, siete migraciones H08, ambos hooks Auth efectivos, Edge y frontend actualizados, inventario de privilegios y login nuevo de cuenta autorizada. Si falta el hook de tokens, el acceso queda cerrado por defecto; no retirar controles para compensarlo. El orden completo y las tareas externas pendientes están en [operación](operacion-produccion.md).

Referencias: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [token hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook), [email hook](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook) y [autorización Realtime](https://supabase.com/docs/guides/realtime/authorization).
