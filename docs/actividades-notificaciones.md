# Actividades y notificaciones · Contratos H06

Implementación de [H06](hitos/h06-actividades-notificaciones.md). Las decisiones de producto se conservan en el [diseño](diseno-tecnico.md); los nombres físicos, leases y el protocolo operativo son bases técnicas. Consultar [evidencias](hitos/evidencias/h06.md) y [entornos](desarrollo.md). Los datos de prueba permanecen exclusivamente en Docker.

## 1. Una obligación y un recorrido documental

Actividades consulta `obligations`, `deliverables` y `submission_cycles` del motor existente. No hay tabla de tareas ni duplicación de documentos. Las áreas originales conservan sus UUID, permisos, posiciones y revisión. Las adicionales tienen `class=additional`, `module=actividades` y el mismo recorrido de entrega, validación, observación, corrección, aprobación y reapertura.

Una adicional única conserva `manual_request_id`, `rule_id=NULL` y snapshot completo. Una recurrente conserva regla/versiones y usa calendario, cursor, lotes y generación idempotente H04. Internas tienen empresa NULL, destino `organization:{id}` y responsable interno con concesión de Actividades del estudio. Un cliente no puede verlas ni operar sus archivos por estas RPC, aunque conozca el enlace. La asignación no otorga permisos.

Todas exigen una o más posiciones y revisión individual. La configuración fuerza `is_required=true` e `inherit_responsible=false`. Modificar una regla crea otra versión para ciclos futuros. Pausa, eliminación lógica y restauración mantienen sus obligaciones e historia; no restauran padres/hijos por separado. La adicional única no admite una casilla de “completada”: termina cuando se aprueban sus archivos.

## 2. Bandeja, urgencia y contexto

`h06_query(organization_id, resource, input)` se consulta directamente desde Supabase del navegador, con identidad vigente. `activities` devuelve `rows`, `count`, `groups` e `indicators`. La lectura se vuelve a comprobar por estudio, empresa y módulo. El administrador puede consultar incidencias; la condición administrativa por sí sola no sustituye permisos para entregar o revisar.

| Grupo | Condición |
|---|---|
| `mine` | Responsable actual igual al usuario. |
| `review` | Versión recibida pendiente y permiso actual para aprobar u observar. |
| `overdue` | Algún ciclo abierto sin entrega venció antes del día de Lima. |
| `upcoming` | Entrega pendiente entre hoy y la ventana configurada, inicialmente siete días. |
| `observed` | Posiciones con estado de observación. |
| `all` | Todas las obligaciones visibles según filtros. |

Los grupos se solapan; sus contadores no se suman. Se calculan sobre el alcance filtrado antes de elegir grupo. Cada indicador tiene su denominador `required` y numerador `approved`: documental y adicional nunca se mezclan.

Orden de urgencia: pendiente vencida, próxima, otras pendientes, entregadas para revisar. Dentro del nivel: alta/media/baja, fecha operativa y UUID. El orden `received` prioriza la recepción pendiente más antigua. La fecha de aprobación no determina puntualidad de entrega.

Query URL admitida: `group`, `sort`, `page`, `pageSize`, `scope`, `companyId`, `module`, `class`, `responsibleId`, `period`, `priority`, `dueFrom`, `dueTo`, `state`, `q`. `pageSize` admite 25/50/100. Se descartan valores no admitidos y claves desconocidas. El adaptador convierte nombres a `company_id`, `responsible_id`, `due_from`, `due_to` para la RPC. `returnTo` conserva filtros/página en rutas internas permitidas y elimina tokens/claves arbitrarias.

La pestaña Actividades de empresa usa la misma bandeja, con empresa fija. El selector global admite todas, empresa o internas para miembros internos. Un contexto incompatible muestra recurso no encontrado. La ruta `/actividades/{id}` conserva posiciones, historial y controles comunes; el selector de reasignación se comparte entre adicionales y documentación.

## 3. Operaciones de navegador

Todas usan `h03_command` con `p_organization_id`, `p_request_id` UUID estable, `p_operation` y `p_input`. El servidor revalida sesión/capacidad y persiste solicitud, cambio, auditoría y avisos en transacción. Repetir una solicitud idéntica devuelve resultado; otro contenido con el mismo identificador produce conflicto.

| Operación | Entrada y resultado |
|---|---|
| `CreateAdditionalActivity` | Administrador; empresa UUID o NULL, título 2–150, descripción opcional hasta 1000, responsable UUID elegible, prioridad, periodicidad y plazo, formatos/tamaño, 1–20 posiciones. Única requiere fecha actual/futura. Devuelve `resource_id`/`obligation_id`; recurrente añade `rule_id`. |
| `ConfigureAdditionalRequirement` | Administrador, regla y `expected_revision`, configuración completa. Crea versión futura; archivos ya emitidos permanecen iguales. |
| `SetRuleActive` | Regla, revisión esperada, activo y motivo. Pausa/reanuda el motor común. |
| `DeleteDocumentEntity` / `RestoreDocumentEntity` | Regla adicional, revisión y motivo. Soft delete/restauración con ancestros y responsable elegible. |
| `ReassignDelivery` | Administrador, obligación, revisión, responsable y motivo. Mantiene snapshot, resuelve incidencia y avisa al nuevo responsable; no fija revisor. |
| `MarkNotificationRead` | `notification_id` propio, todavía visible. Idempotente; solo cambia lectura y metadatos, nunca resuelve entrega. |
| `SaveWhatsAppContact` | Administrador, `user_id`, revisión de perfil, teléfono E.164 o NULL. Auditoría sin copiar el número. |
| `ReconcileDigest` | Administrador, digest y revisión. Reaplica solo evidencia guardada; no permite inventar `delivered`. |

Resultados comunes: `schema_version`, `resource_id`, `revision`, `status`. Errores explícitos: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `DEPENDENCY_UNAVAILABLE`. Reintentar una edición con revisión vieja no sobrescribe el cambio de otro actor.

## 4. Avisos internos y Realtime

`notification_events` identifica el hecho; `notifications` congela el aviso por destinatario. Clave estable de evento y UNIQUE evento/destinatario evitan repetición. Los eventos son inmutables; los avisos permiten lectura y metadatos, conservándose ambos.

| Evento | Audiencia actual |
|---|---|
| Asignación/reasignación, observación, aprobación y reapertura | Responsable que todavía puede consultar y entregar. |
| Archivo validado/finalizado | Contadores/supervisores activos con capacidad de aprobar u observar en ese alcance. |
| Umbral de plazo | Responsable actual con acceso; umbrales 7/3/1/0/−1, una vez por ciclo/umbral. |
| Responsable inválido, contacto ausente/inválido, fallo de integración | Administradores activos del estudio. |

La observación apunta al **nuevo ciclo de corrección**. Para eventos H03 históricos, `h06_observation_cycle` deriva ese ciclo desde la versión revisada y su ciclo siguiente, sin editar el evento. Una corrección recibida deja de generar recordatorios aunque espere aprobación.

`h06_run_deadlines` detecta pérdida de elegibilidad y actualiza `assignment_issue`, conservando identidad/snapshot. La bandeja también calcula la incidencia con permisos actuales, sin esperar al siguiente job. Un padre eliminado o inactivo bloquea generación/avisos operativos; no borra historia.

El centro `/notificaciones` consulta solo los avisos propios todavía autorizados. El contador usa una consulta de conteo. Realtime solo invalida esas claves de caché; no sondea otras tablas ni devuelve contenido del aviso por el canal. Se cierra al salir/cambiar contexto y muestra error de conexión con actualización manual disponible.

**Base provisional hasta H08:** trigger con `realtime.send({changed:true}, 'changed', 'personal-notices:{org}:{user}', false)`. La tabla de avisos no recibe un permiso SELECT adicional para hacer funcionar Postgres Changes. El canal Broadcast público transporta únicamente ese marcador vacío de datos de negocio; no constituye autorización personal. H08 debe convertirlo a privado y comprobar sus políticas antes del piloto. El contenido siempre se obtiene de `h06_query` con autorización actual. Ver [Broadcast oficial](https://supabase.com/docs/guides/realtime/broadcast).

## 5. Preparación y transporte diario

Cron ejecuta el dispatcher cada minuto. La preparación comprueba `digest_local_time` de cada estudio, inicialmente 09:00 de Lima; la unicidad estudio/destinatario/fecha permite un resumen diario después de esa hora. `upcoming_days` configura la ventana inicial de siete días.

1. `h06_run_deadlines`: umbrales e incidencias actuales.
2. `h06_prepare_digests`: agrupa próximos vencimientos, atrasos abiertos y observaciones nuevas sin resolver del responsable activo. Sin elementos no crea fila; sin E.164 crea incidencia, conservando avisos internos.
3. `h06_claim_batch`: reserva hasta 50 digests del mismo estudio, payload y `batch_id`/`generated_at` estables; lease de 60 s. Antes del primer intento revalida acceso, contacto, responsabilidad y pertinencia de todos los elementos congelados. Si cambiaron, conserva el digest como fallo/incidencia y no altera su contenido.
4. `h06_begin_dispatch`: incrementa el contador y persiste reserva **antes** de enviar HTTP. El mismo `attempt_id` identifica su cierre.
5. Edge envía HTTPS POST autenticado a n8n: timeout 5 s, máximo tres intentos, pausas 1/3 s. Solo timeout/error de conexión, 429 o 5xx permiten reintento automático. Un 4xx definitivo no se repite. Redirecciones rechazadas.
6. `h06_finish_dispatch`: agrega cierre inmutable del intento. HTTP exitoso con `{accepted:true}` acredita recepción del webhook; no acredita WhatsApp enviado/entregado.

Los secretos del dispatcher viven en Vault/Edge; los de n8n viven en credenciales. La función exige `x-dispatch-key` independiente. `verify_jwt=false` permite la llamada Cron sin JWT de usuario; la validación del secreto permanece obligatoria. Solo en Docker se admite el URL exacto HTTP local. No se activa ningún job Cloud como parte de fixtures.

## 6. Contrato externo 1.0

| Nivel | Campos |
|---|---|
| Lote | `schema_version="1.0"`, `event_type="whatsapp.digest.batch"`, `batch_id`, `generated_at` UTC, `timezone="America/Lima"`, `digests` 1–50. |
| Digest | `delivery_id`, `recipient_id`, `local_date`, `phone` E.164, `items` no vacío. |
| Elemento | `obligation_id`, `notification_event_id` nullable, `category` due_soon/overdue/observed, `title`, `company` nullable, `module`, `due_date`, `priority`, `url`. `observed` exige evento. |
| Receipt | `schema_version="1.0"`, `receipt_id`, `delivery_id`, `status` sent/delivered/failed/unknown, `occurred_at`; opcionales `provider_message_id`, `error_code`. |

La URL es HTTPS canónica `/actividades/{UUID}`, sin credenciales, query ni fragmento. No se incluyen archivos, Storage paths, enlaces firmados, salario, diagnóstico, descripción privada ni comentario de observación. Para consultar el contenido se abre la aplicación.

`POST /api/integrations/n8n/receipts` es la única API nueva: necesita secreto administrativo para registrar evidencia de sistema. Usa Bearer `N8N_RECEIPT_TOKEN`, diferente del token de salida; comparación de hashes en tiempo constante, JSON estricto, cuerpo limitado por bytes reales a 8192 y respuesta `no-store`. Respuestas 401/413/415/422/404/409/503 según autenticación, tamaño, formato, contrato, identidad, conflicto o dependencia. No requiere sesión de usuario ni incluye secretos en JSON.

Sent/delivered requieren identificador del proveedor. Fechas futuras superiores a cinco minutos se rechazan en DB. Un `receipt_id` repetido con contenido diferente produce conflicto; repetición idéntica no agrega otro intento. Confirmación delivered no retrocede; estados antiguos se registran como evidencia no aplicada cuando corresponde.

## 7. n8n, deduplicación y conciliación

El [workflow](../integrations/n8n/whatsapp-digest.workflow.json) y su [guía reproducible](../integrations/n8n/README.md) están versionados sin secretos. El adaptador de proveedor recibe `delivery_id`, `phone`, `text`; el proveedor real y sus plantillas se configuran en H08.

Antes del proveedor, `h06_gateway_claim` compara el digest exacto y reserva de forma atómica `delivery_id`, `claim_id` y `receipt_id` en `whatsapp_digests.gateway_state`. Solo el primer consumidor obtiene `send=true`. Repetir, incluso tras reiniciar n8n, obtiene evidencia guardada o un resultado pendiente, sin otra llamada al proveedor. El proveedor ficticio **no deduplica**; su contador permite comprobar esta propiedad del workflow.

`h06_gateway_complete` conserva la evidencia antes del callback. Si se pierde el callback, el replay lo recupera o el administrador usa “Conciliar evidencia guardada”. Si hubo reserva pero no evidencia, o el proveedor agotó su timeout, el resultado permanece accepted/unknown con incidencia; no se reenvía automáticamente.

Procedimiento ante unknown o reserva incompleta:

1. Identificar el `delivery_id` en Configuración → WhatsApp y revisar intentos/estado.
2. Consultar al proveedor mediante su identificador o mecanismo de búsqueda por `delivery_id`; no asumir que falló por timeout.
3. Si existe evidencia guardada, reaplicarla con revisión esperada desde la interfaz. Si el proveedor aporta evidencia nueva, su adaptador autorizado emite un receipt con identificador nuevo y el identificador/momento real del mensaje.
4. Sin evidencia, conservar la incidencia. No modificar el payload, borrar el claim ni fabricar un receipt exitoso. Un envío nuevo requiere resolver explícitamente la situación con el operador/proveedor.

Pendientes no aceptados caducan al cambiar de día y conservan su fila. Observaciones en pending vigente/accepted/sent/delivered/unknown permanecen reservadas para evitar repetición; una corrección recibida se excluye. Un atraso abierto puede volver a recordarse otro día de manera prevista. No se deduce el resumen de “todas las notificaciones no leídas”.

## 8. Persistencia y límites productivos

Se completan las 29 tablas documentadas con `whatsapp_digests` e `integration_attempts`, sin tabla de lotes. El [diccionario](tablas-db.md#tabla-26) detalla JSONB de payload, reserva de transporte y claim del gateway. Cada intento HTTP agrega dos filas inmutables: `reserved` y `finished`; no equivale a dos envíos. Los callbacks agregan su propia evidencia idempotente. No hay soft delete/purga automática de estos registros técnicos.

Supabase local es el único destino de seeds, integración, simulaciones y credenciales ficticias. El workflow de laboratorio usa un proveedor HTTP local, sin WhatsApp real. H08 conserva RLS/Storage/Realtime privado, proveedor/remitente/plantillas reales, dominio HTTPS, secretos productivos, activación y monitoreo Cron, respaldo y piloto. La aceptación formal de producto se registra por separado de las verificaciones técnicas.
