# H06 — Actividades y notificaciones

**Estado:** pendiente. **Depende de:** [H05](h05-areas-documentales.md). **Habilita:** [H07](h07-supervision-reportes.md). Aplican las [reglas](README.md#3-reglas-transversales-obligatorias) y la [Definition of Done común](README.md#4-definition-of-done-comun).

<a id="objetivo"></a>
## 1. Objetivo

Centralizar las obligaciones de las tres áreas y las actividades adicionales del administrador, destacando las entregas urgentes y proporcionando avisos útiles dentro de la aplicación y mediante un resumen diario de WhatsApp.

La bandeja consulta las mismas obligaciones del motor. No se crea una segunda entidad de tareas ni se mezcla el cumplimiento de actividades adicionales con el documental.

## 2. Alcance, entradas y entregables

**Entrada:** tres áreas, revisión/versionado, motor recurrente y asignaciones elegibles disponibles; eventos iniciales de H03.

**Incluye:** bandeja completa, adicionales de empresa/internas, recurrencia, reasignación, centro de notificaciones, eventos por plazo y digest n8n con deduplicación, reintento y conciliación.

**Entregables:** recorridos completos de Actividades/Notificaciones; contratos versionados, migraciones de integración, trabajos programados de prueba, workflow n8n reproducible y evidencia de fallos externos.

| Ruta existente | Alcance |
|---|---|
| `/actividades` | Grupos, filtros, urgencia y creación administrativa de adicionales. |
| `/actividades/{obligationId}` | Mismo detalle documental, acciones, responsables e historia. |
| `/notificaciones` | Avisos personales, lectura y enlaces autorizados. |
| `/empresas/{companyId}`, pestaña Actividades | Actividades de esa empresa, con las mismas identidades. |
| `/configuracion` y `/usuarios` | Parámetros aplicables, número WhatsApp e incidencias administrativas. |

El canal/proveedor real de producción se verifica en H08. H06 debe cerrar el comportamiento de integración usando destinatarios de prueba y simulaciones deterministas, sin posponer deduplicación.

<a id="requerimientos-funcionales"></a>
## 3. Requerimientos funcionales

- **H06-RF01 — Una bandeja central.** Mostrar obligaciones de Tributario, Laboral general, Laboral por trabajador y adicionales según alcance. El UUID y estado coinciden con los del área original.
- **H06-RF02 — Grupos útiles.** Ofrecer Mis entregas, Por revisar, Vencidas, Próximas, Observadas y Todas. Los grupos pueden solaparse; no tratarlos como estados excluyentes ni sumar sus contadores como un total.
- **H06-RF03 — Filtros y navegación.** Filtrar empresa/todas/internas, módulo, clase, responsable, periodo, prioridad, fecha operativa, estado y metadatos pertinentes. Conservar filtros/página al volver del detalle y descartar valores de query no admitidos.
- **H06-RF04 — Orden de urgencia.** Primero ciclos vencidos con entrega pendiente, luego próximos dentro de siete días, otros pendientes y entregados por revisar. Dentro del grupo aplicar prioridad alta/media/baja, fecha operativa y desempate estable. Bandeja de revisión puede destacar recepción más antigua.
- **H06-RF05 — Adicional única.** Solo administrador crea título, descripción, alcance, responsable elegible, prioridad, fecha límite y al menos un entregable. Exige archivos, revisión y aprobación; no es una tarea que se complete marcando una casilla.
- **H06-RF06 — Adicional recurrente.** Administrador configura recurrencia y entregables; cada ocurrencia es independiente y usa el motor H04, con snapshot y generación idempotente.
- **H06-RF07 — Alcances adicionales.** Vincular a empresa o al estudio sin empresa para internas. Cliente puede operar adicionales de empresa con permisos pertinentes; nunca internas. El enlace no concede acceso.
- **H06-RF08 — Responsabilidad y revisión.** Existe responsable de entrega; cualquier contador/supervisor autorizado revisa, sin revisor fijo. Obligaciones automáticas heredan responsable por empresa/módulo y administrador puede reasignar con aviso e historia.
- **H06-RF09 — Incidencia de asignación.** Pérdida de permiso, baja o inhabilitación del responsable conserva su identidad y obliga a mostrar incidencia al administrador. No ocultar la obligación ni enviarle información que ya no puede consultar.
- **H06-RF10 — Indicadores separados.** Mostrar adicionales y documental con denominadores propios; ni completar ni atrasar una adicional modifica el porcentaje de las tres áreas.
- **H06-RF11 — Notificaciones internas.** Avisar asignación/reasignación, carga finalizada, observación, aprobación, reapertura, plazos e incidencias. Cargas avisan a revisores activos elegibles; asignaciones/observaciones al responsable actual.
- **H06-RF12 — Lectura y enlace.** Usuario consulta sus avisos y marca lectura; no edita destinatario/contenido ni resuelve la obligación al leer. Abrir el enlace vuelve a comprobar recurso/alcance, conserva retorno y conduce a login cuando falte sesión.
- **H06-RF13 — Avisos de plazo sin repetición técnica.** Una notificación interna por ciclo/umbral: siete, tres, uno y cero días, y primer día vencido. Dejar de recordar entrega cuando el ciclo ya fue recibido; revisión pendiente sigue en su bandeja.
- **H06-RF14 — Resumen diario.** A las 09:00 de Lima, agrupar vencimientos próximos, atrasos abiertos y nuevas observaciones sin resolver del responsable activo. Sin avisos elegibles no crear/enviar mensaje vacío. No incluir nuevas cargas, aprobaciones ni asignaciones en WhatsApp.
- **H06-RF15 — Contacto válido.** Número internacional válido en perfil para WhatsApp. Si falta/es inválido, mantener avisos internos y registrar incidencia administrativa, sin simular envío.
- **H06-RF16 — Resultado honesto y recuperable.** Distinguir webhook aceptado de mensaje enviado/entregado. Resultado ambiguo se muestra como desconocido y requiere conciliación; callbacks/reintentos no duplican envíos ni degradan un estado confirmado.
- **H06-RF17 — Conservación y privacidad.** Mantener eventos, notificaciones, digests e intentos. No enviar archivos, enlaces firmados, credenciales, salarios, diagnósticos ni detalle sensible de observación; usuario abre la aplicación para consultarlo.

**Trazabilidad:** RF-23, RF-24 y RF-27; HU-03, HU-07–HU-08; D20–D29, D31 y D33–D35. Reutiliza RF-15–RF-22 del recorrido documental; D21 actualiza RN-02 para admitir empresa nula en internas.

<a id="requerimientos-tecnicos"></a>
## 4. Requerimientos técnicos

- **H06-RT01 — Modelo sin duplicación.** Adicionales usan `obligations` de clase `additional` y reglas cuando son recurrentes. Integridad de estudio/empresa/módulo y al menos una posición; sin tabla de tareas ni tabla extra para lotes.
- **H06-RT02 — Operaciones y consulta.** `CreateAdditionalActivity`/`ReassignDelivery` por RPC directa con identidad/capacidad, petición, revisión pertinente y auditoría/eventos transaccionales. Bandeja por Data API/vistas/RPC de lectura, paginación y filtros permitidos.
- **H06-RT03 — Fecha operativa.** Calcular desde ciclos abiertos sin entrega, conservando puntualidad anterior. No derivar vencimiento de `approved_at` ni persistir `vencido` como reemplazo del estado de revisión.
- **H06-RT04 — Eventos y destinatarios.** Completar `notification_events` y `notifications`: clave de evento estable y unicidad evento/destinatario. Referencias de ciclo/revisión/obligación coherentes, JSONB mínimo y audiencia elegible reevaluada.
- **H06-RT05 — Realtime limitado.** Suscribir a avisos del usuario para actualizar contador; cerrar canales por logout/cambio de contexto. No sondear constantemente todas las tablas; `MarkNotificationRead` solo modifica lectura y metadatos.
- **H06-RT06 — Tablas de integración.** Incorporar `whatsapp_digests` e `integration_attempts`, sin soft delete/purga automática. Unicidad por estudio/destinatario/fecha local y `delivery_id`; intentos inmutables y `receipt_id` único en su estudio.
- **H06-RT07 — Preparación y ejecución.** Cron/Edge prepara resumen con elegibilidad actual y ancestros no eliminados. Congelar payload e identificador antes del primer intento; reevaluar elegibilidad antes de iniciarlo sin alterar silenciosamente un payload congelado.
- **H06-RT08 — Salida autenticada/versionada.** HTTPS POST hacia n8n con Header Auth protegido; `schema_version=1.0`, `event_type=whatsapp.digest.batch`, `batch_id`, momento UTC, zona Lima y hasta 50 resúmenes por lote como base técnica.
- **H06-RT09 — Payload mínimo.** Cada resumen identifica `delivery_id`, destinatario, teléfono, fecha local y elementos `due_soon`/`overdue`/`observed`. Elementos incluyen obligación, empresa/interna, módulo, título, prioridad, fecha y URL HTTPS canónica del detalle. Observación exige `notification_event_id`.
- **H06-RT10 — Deduplicación durable n8n.** Persistir `delivery_id` antes de llamar al proveedor y responder con resultado conocido ante repetición, incluso tras reinicio. Resultado ambiguo del proveedor requiere consulta/conciliación, no invocación ciega adicional.
- **H06-RT11 — Reintentos acotados.** Conexión/429/5xx: máximo tres intentos HTTP, pausas de uno/tres segundos y timeout de cinco segundos. Reutilizar identificadores/contenido; 4xx de configuración registra incidencia, sin bucle infinito.
- **H06-RT12 — Retorno confiable.** Única nueva API route: `POST /api/integrations/n8n/receipts`. Secreto independiente del webhook de salida, esquema/entrega existentes verificados, `receipt_id` único y aplicación transaccional. Callback repetido devuelve resultado existente; orden tardío no degrada `delivered`.
- **H06-RT13 — Evidencia del proveedor.** Estados `pending`, `accepted`, `sent`, `delivered`, `failed` y `unknown`. Registrar `sent`/`delivered` solo con evidencia; sin confirmación de entrega el máximo real es `sent`.
- **H06-RT14 — Caducidad y reservas.** `pending` no aceptado caduca al siguiente día, conserva fila y se recalcula pertinencia para nuevo día. Observaciones con `accepted`/`unknown` en curso no se liberan a otro resumen hasta resolver. Atraso abierto puede repetirse diariamente como recordatorio previsto.
- **H06-RT15 — Presentación/contexto.** Atomic Design, hooks de bandeja/avisos, filtros tipados y claves de caché por contexto. Query `pageSize` admite 25/50/100; defaults y rutas siguen navegación vigente. `returnTo` interno validado, sin dominios arbitrarios/tokens.
- **H06-RT16 — Pruebas y frontera productiva.** Usar destinatarios/servicios de prueba y simulaciones reproducibles; no registrar respuestas/cabeceras completas con secretos. RLS de avisos/internas, proveedor real, credenciales y horarios productivos se cierran H08.

## 5. Contratos y reglas de integración

### 5.1 Actividades y destinatarios

| Origen | Alcance y revisión |
|---|---|
| Obligación de las tres áreas | El módulo documental original determina permisos; aparecer en Actividades no cambia su identidad ni otorga otro acceso. |
| Adicional de empresa | Permisos de Actividades en esa empresa; archivos y revisión obligatorios. |
| Adicional interna | Empresa NULL y estudio obligatorio; membresía interna y concesión de Actividades de estudio. |
| Aviso histórico | Solo se consume información aún permitida; recibirlo no habilita el recurso. |
| Responsable retirado | No adquiere acceso por la asignación histórica; incidencia para reasignación. |

### 5.2 Salida y recepción

| Contrato | Campos y validaciones |
|---|---|
| Lote `1.0` | `schema_version`, `batch_id`, `event_type`, `generated_at`, `timezone`, `digests`. |
| Resumen | `delivery_id`, `recipient_id`, `local_date`, `phone`, `items` no vacío. Coincide con las columnas de DB. |
| Elemento | `obligation_id`, `notification_event_id`, `category`, `title`, `company`, `module`, `due_date`, `priority`, `url`. |
| Receipt | `schema_version`, `receipt_id`, `delivery_id`, `status`, `occurred_at`; `provider_message_id`/`error_code` opcionales. Secreto en cabecera, nunca en JSON. |

Los nombres y estructuras exactos se contrastan con los contratos J08–J10 y sección 13 del diseño. Cada digest de un lote genera su propio registro de intento con el mismo `batch_id`; no se incorpora una tabla número 30.

La deduplicación interna evita repetir eventos/umbrales; el digest diario se calcula con ciclos/observaciones pertinentes, no enviando indiscriminadamente toda notificación no leída.

### 5.3 Fallos y conciliación

| Situación | Comportamiento esperado |
|---|---|
| Sin destinatario/elemento elegible | No enviar mensaje vacío; mantener incidencias administrativas pertinentes. |
| Teléfono inválido | Avisos internos conservados e incidencia; no declarar WhatsApp enviado. |
| Webhook aceptado | Estado `accepted`; todavía no acreditar entrega. |
| Respuesta HTTP perdida | Repetir mismo `delivery_id`; n8n recupera estado persistido. |
| Proveedor inició envío y resultado incierto | `unknown`; consultar/conciliar antes de otro envío potencialmente duplicado. |
| Callback repetido/desordenado | Una recepción efectiva; no degradar confirmación más avanzada. |
| Pendiente no aceptado al día siguiente | Caducar intento diario anterior y preparar nuevo contenido vigente. |
| Observación ya corregida antes de preparar | Excluirla del resumen; no reutilizar aviso obsoleto. |

<a id="tareas"></a>
## 6. Tareas del hito

| Tarea | Trabajo concreto y entregable | Requisitos |
|---|---|---|
| H06-T01 | Completar consulta común de bandeja, grupos/fecha operativa, orden/filtros/paginación y retorno al origen. | RF01–RF04; RT01–RT03, RT15. |
| H06-T02 | Implementar adicionales únicas de empresa/internas con posiciones, validación administrativa y detalle común. | RF05, RF07; RT01, RT02, RT15. |
| H06-T03 | Implementar recurrencia de adicionales reutilizando H04 e indicadores separados. | RF06, RF10; RT01–RT03. |
| H06-T04 | Completar reasignación y detección de responsabilidad inválida con historia y destinatarios elegibles. | RF08, RF09; RT02, RT04. |
| H06-T05 | Completar eventos/destinatarios de revisión, asignación y umbrales; probar unicidad por evento/ciclo/receptor. | RF11, RF13; RT04. |
| H06-T06 | Implementar centro de notificaciones, marca de lectura, Realtime personal y enlaces/contexto. | RF12; RT05, RT15. |
| H06-T07 | Incorporar migraciones de digests/intentos y preparación diaria no vacía, contacto válido y payload mínimo congelado. | RF14, RF15, RF17; RT06–RT09, RT14. |
| H06-T08 | Implementar salida Cron/Edge y workflow n8n autenticado con persistencia previa de identificador y deduplicación tras reinicio. | RF14, RF16; RT08, RT10, RT11. |
| H06-T09 | Implementar receipts autenticados/idempotentes y transiciones respaldadas por evidencia del proveedor. | RF16; RT12, RT13. |
| H06-T10 | Implementar caducidad, tratamiento de errores, resultado ambiguo y procedimiento de conciliación. | RF16, RF17; RT10–RT14. |
| H06-T11 | Revisar privacidad, secretos y destinatarios, más UX de urgencia/lectura/responsabilidad en móvil/teclado. | RF01–RF17; RT09, RT15, RT16. |
| H06-T12 | Ejecutar matriz de duplicados, timeout, 429/5xx, callbacks, vacío/resuelto/retirado y entregar workflow/contratos/evidencias. | RF01–RF17; RT01–RT16. |

## 7. Escenarios de aceptación

| Caso | Resultado verificable |
|---|---|
| Identidad en área y bandeja | Mismo UUID, posiciones, estado y responsable; no segunda tarea. |
| Adicional sin entregable | Creación rechazada; única/recurrente válida exige revisión completa. |
| Adicional interna y cliente | Interfaz no ofrece internas; pruebas directas CA03 se cierran H08. |
| Urgencia | Vencida abierta precede a próxima; prioridad/fecha/desempate ordenan dentro del grupo. |
| Recibida a tiempo por revisar | No aparece como atraso de entrega ni recibe recordatorio por ciclo ya recibido. |
| Evento repetido | Una notificación por evento/receptor y una por ciclo/umbral. |
| Marca de lectura | Solo cambia lectura; no elimina evento ni resuelve tarea. |
| CA20 Vacío/resuelto/retirado | No prepara envíos vacíos ni observaciones ya resueltas ni elementos sin elegibilidad actual. |
| Teléfono ausente | Aviso interno e incidencia, sin éxito ficticio de WhatsApp. |
| CA21 Repetición tras reinicio de n8n | Mismo `delivery_id` recupera registro durable y no vuelve a llamar al proveedor. |
| CA22 HTTP 200 y fallo/ambigüedad proveedor | `accepted` no se interpreta `delivered`; `failed`/`unknown` visibles y conciliables. |
| HTTP timeout/429/5xx | Reintentos máximos y pausas acordadas, IDs/payload estables y cada intento persistido. |
| Callback falso/repetido/desordenado | Autenticación/esquema rechazados cuando corresponda; duplicado sin efectos y `delivered` no degradado. |
| Cambio de día | Pendiente no aceptado caduca; observación accepted/unknown no se envía por segunda vez sin resolver. |
| Datos privados | Payload/logs no contienen archivos, URLs firmadas, secretos, salarios ni detalle médico. |

Conservar identificadores y conteos del workflow de prueba, digests e intentos, sin tokens ni números personales de producción. Repetir CA27 y CA31–CA34 en bandeja/notificaciones.

<a id="definition-of-done"></a>
## 8. Definition of Done

- [ ] H06-RF01–H06-RF17 y H06-RT01–H06-RT16 tienen evidencia funcional y de integración.
- [ ] Bandeja central usa obligaciones originales, con filtros, grupos, urgencia, fechas y retorno correctos.
- [ ] Adicionales únicas/recurrentes de empresa/internas requieren archivos/revisión y se crean solo por administrador.
- [ ] Responsabilidad no concede acceso; pérdida de elegibilidad muestra incidencia y permite reasignar.
- [ ] Indicador de adicionales permanece separado del cumplimiento documental.
- [ ] Notificaciones internas cubren eventos/umbrales, se deduplican y actualizan por canal personal.
- [ ] Lectura/enlaces/contexto respetan sus contratos y estados accesibles.
- [ ] Resumen diario incluye solo avisos vigentes y contacto válido; no hay mensajes vacíos.
- [ ] IDs/payload congelados, unicidad diaria y deduplicación durable n8n sobreviven reintentos/reinicio.
- [ ] Receipts están autenticados, son idempotentes y no degradan estados confirmados.
- [ ] Estados enviados/entregados tienen evidencia real del entorno de prueba; aceptación HTTP no se confunde con entrega.
- [ ] Fallos ambiguos/caducidad/observaciones reservadas tienen tratamiento y procedimiento de conciliación documentado.
- [ ] Contratos, workflow, migraciones/tipos y evidencias CA20–CA22 están entregados sin datos sensibles.
- [ ] Quedan separados los pendientes productivos/RLS de H08 y se satisface la Definition of Done común.

## 9. Límites y continuidad

Este hito no añade correo, SMS, push, comentarios internos o notificaciones WhatsApp inmediatas por cada carga. La prioridad ordena actividades; no introduce una nueva asignación de revisor.

H08 verifica proveedor, remitente, plantillas/condiciones efectivas, secretos, dominio, horarios y recibos productivos. Una simulación no acredita esas configuraciones.

## 10. Referencias

- [Índice de hitos](README.md).
- [Actividades e indicadores](../diseno-tecnico.md#11-actividades-búsqueda-e-indicadores).
- [Notificaciones y n8n](../diseno-tecnico.md#13-notificaciones-y-whatsapp-mediante-n8n).
- [Tablas y JSONB de integración](../tablas-db.md).
- [Listados, detalle y retorno](../flujo-navegacion.md#33-listados-detalle-y-retorno).
- [Procesos](../diagrama-flujo.md).
- [Anterior: H05](h05-areas-documentales.md) · [Siguiente: H07](h07-supervision-reportes.md).
