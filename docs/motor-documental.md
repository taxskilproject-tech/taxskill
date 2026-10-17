# Motor documental H04

Implementación de [H04](hitos/h04-motor-documental.md). Las decisiones funcionales proceden del hito y del [diseño técnico](diseno-tecnico.md#7-catálogo-reglas-y-calendario); los límites y detalles siguientes son bases técnicas de la implementación.

## Configuración y calendario

`/configuracion?tab=catalogo` administra tipos de las tres áreas. `/configuracion?tab=reglas` administra versiones, simulación, activación, pausas y resultados. Las áreas siguen como pestañas de `/empresas/{id}`; no hay rutas nuevas por frecuencia.

Las diez frecuencias usan una sola función pura SQL, `private.h04_calendar`. El navegador llama a `h04_preview` para simular y al mismo calendario transaccional al generar. Fechas civiles e identidad de ocurrencia permanecen ISO aunque cambien la zona o `DateStyle` de la conexión. Semana ISO de lunes a domingo; quincenas 1–15/16–fin; trimestres y semestres civiles. El ancla mensual 31 se ajusta en febrero y vuelve al 31 en marzo.

| Configuración | Regla |
|---|---|
| Única | Fecha explícita `anchor_date`, desplazamiento cero; clave `unique:{rule_id}`. Puede emitirse antes del plazo. |
| Calendario recurrente | Fecha límite = cierre del periodo + desplazamiento de días calendario. |
| Personalizada | N entre 1 y 1.200; unidad `days`, `weeks` o `months`; ancla obligatoria. Antes del ancla no genera. Clave `interval:{ancla}:{N}:{unidad}:{índice}`. |
| Eventual | Fecha del evento + desplazamiento. Clave `event:{rule_id}:{event_id}`. Cron no inventa eventos. |
| Posiciones | Entre 1 y 20, códigos y órdenes únicos; todas requieren aprobación individual. |
| Formatos | PDF, XLS, XLSX, DOC, DOCX, JPG, JPEG, PNG; posiciones no exceden la política de la versión. |
| Tamaños | Inicial 20.000.000 bytes; configuración H04 entre 1 y 50.000.000 por archivo. |
| Desplazamiento | Entero entre −366 y 366; vencimiento al cierre del día de Lima, sin traslado automático. |

La incorporación comienza en el periodo vigente al configurar, nunca antes del inicio de control de empresa/regla. Una fecha ya vencida produce una advertencia y mantiene el plazo original. La simulación es consultiva: muestra sus fechas de referencia y no crea obligaciones.

Una regla nueva se guarda como borrador salvo activación explícita. El intervalo de borrador se excluye de generación automática. Activar exige empresa/tipo disponibles, posiciones, formatos, plazo y un responsable con permiso de carga. Pausar exige motivo y conserva obligaciones emitidas.

Editar crea una versión inmutable. Por defecto rige desde el siguiente ciclo de la configuración vigente; una fecha posterior debe coincidir con un inicio de ciclo anterior. Para únicas/eventuales la nueva vigencia empieza, como mínimo, el día siguiente. El formulario distingue cabecera futura y versión efectiva. Los snapshots existentes nunca se recalculan.

## Contratos directos de Supabase

Las operaciones usan `h03_command(organization_id, request_id, operation, input)` para conservar el protocolo común. `request_id` se reutiliza al reintentar la misma entrada. Una entrada distinta con la misma identidad devuelve `CONFLICT`. Respuesta: `{ok:true,data:{schema_version:1,resource_id,revision,status,...}}` o `{ok:false,error:{code}}`.

| Operación | Entrada principal | Validación / resultado |
|---|---|---|
| `SaveDocumentType` | Código, nombre, módulo, categoría/descripción opcionales, formatos, activo; id/revisión al editar. | Administrador; no cambia módulo de un tipo referenciado; filtros y baja lógica conservan historia. |
| `ConfigureRequirement` | Empresa/tipo, título, frecuencia/intervalo/ancla, desplazamiento, posiciones, formatos/límites, obligatoriedad, prioridad, política de responsable y condiciones J05. Edición: id, expected_revision, effective_from opcional. | Administrador; destino inmutable; nueva `rule_version`; devuelve `effective_from`. Responsable explícito pertenece al estudio, incluso en borrador. |
| `GenerateRule` | rule_id, batch_size opcional. | Administrador; regla/ancestros disponibles; lote predeterminado 50, máximo 100 destinos. |
| `GenerateMonthly` | Igual. | Alias compatible H03 al motor único; no existe otro generador mensual. |
| `SetRuleActive` | rule_id, expected_revision, active, reason al pausar. | CAS, validación de responsable y pausas civiles. |
| `EmitRequirementEvent` | rule_id, event_id UUID estable, event_type, reference_date; employment_period_id obligatorio en destino laboral. | Evento admitido por la versión y dentro del control, sin fecha futura. Mismo ID conserva fecha y destino. |
| `ReassignDelivery` | obligation_id, expected_revision, delivery_responsible_id, reason. | Administrador; propietario elegible, CAS, auditoría y aviso; no modifica snapshot. |
| `DeleteDocumentEntity` / `RestoreDocumentEntity` | Contrato H03 existente. | Motivo, revisión, ancestros, unicidad conservada; sin cascadas ni cancelación automática de emitidas. |

Generación devuelve además `obligation_id` (nullable), `generated_count`, `processed_count`, `has_more` y `warning`. `resource_id` puede identificar la regla cuando no hay obligación: la interfaz enlaza solamente `obligation_id`. `status=pending` indica continuación; un reintento correcto puede devolver cero nuevas.

Errores principales: `VALIDATION_ERROR`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `DEPENDENCY_UNAVAILABLE`. El error del lote se muestra sanitizado junto al cursor. La configuración y revisión usan transacciones/revisiones; no se sobrescribe una decisión concurrente.

`h03_query` añade consultas paginadas de `rules` y `responsibles`, de 25 filas. Las reglas incluyen `configuration` (cabecera) y `effective_configuration` (vigente). Los selectores conservan su selección al cambiar de página. `h04_preview` recibe frecuencia, referencia, ancla, intervalo y desplazamiento, y devuelve periodo/clave/plazo/advertencia sin mutaciones.

## Transacción, lotes e historial

La clave única es estudio + regla + destino + ocurrencia; la versión no forma parte de ella. Un lote obtiene/crea periodo, obligaciones, posiciones, ciclos, auditoría y avisos en una transacción. Un fallo revierte todo ese lote, conservando los anteriores. El cursor se describe en [J03](tablas-db.md#j03--requirement_rulesgeneration_cursor).

La paginación laboral usa una clave estable de etapa, fecha de inicio del lote y versión fijada; no depende de páginas de la UI. Las etapas creadas después no se incorporan a mitad de un lote. H05 debe emitir/reconciliar sus eventos de incorporación. La ocurrencia se completa solo cuando se procesan todos sus destinos; una pausa durante un lote parcial no descarta los destinos restantes.

La recuperación técnica recorre los ciclos omitidos desde el último cierre confirmado, con máximo de 100 ciclos examinados por invocación y límite de destinos. Las pausas administrativas excluyen ciclos no iniciados dentro de sus intervalos, conservando el periodo que contiene la reactivación. Tipo, regla, empresa y estudio se comprueban por separado. Restaurar un padre no restaura hijos eliminados por separado ni cancela obligaciones antiguas.

`rule_versions.configuration_snapshot` congela título, descripción y política de asignación por versión. `obligations.snapshot` conserva configuración aplicada, destino, plazos, posiciones y responsable inicial. Reasignar modifica solo el responsable operativo y deja auditoría. Perder acceso conserva la identidad y activa `assignment_issue`, con aviso deduplicado al administrador; el sistema puede reconciliarla sin navegador.

La aplicabilidad laboral prepara etapas `any`, `relacion`, `ingreso`, `cese`. Ingreso/cese exigen frecuencia eventual y el evento correspondiente; se valida empresa, trabajador, etapa y fecha real de ingreso/cese. Motivos distintos de los configurados generan `no_aplica` con motivo y ciclos cancelados, manteniendo evidencias. Gestión del expediente, ingreso, cese y reingreso mediante UI se entrega en H05.

## Ejecución programada y operación

`h04_run_generation` procesa un lote por llamada, sin usuario conectado. Es accesible solo al ejecutor de sistema/service role, no desde el cliente autenticado. Los bloqueos siguen estudio → regla y usan `SKIP LOCKED` para evitar solapamientos con comandos interactivos.

`yarn h04:setup` habilita exclusivamente en Docker local:

- `h04-generation-day`: `5 5 * * *` UTC, equivalente a 00:05 de Lima.
- `h04-generation-continuation`: cada minuto, para continuar pendientes y reconciliar asignaciones. El trabajador automático espera hasta las 00:05 durante los primeros cinco minutos del día de Lima.

No se activan jobs al aplicar migraciones. El script de setup y la integración rechazan destinos remotos antes de crear clientes/solicitudes. La programación real de producción permanece en H08. El tamaño de lote y número de ejecutores productivos requieren medición; no se promete procesamiento instantáneo de toda la cartera.

Observar `cron.job_run_details`, `generation_cursor.last_error`, continuación pendiente y `audit_events.system_actor='h04-generation'`. Un job SQL `succeeded` confirma su ejecución, pero el resultado del negocio puede contener un fallo recuperable; comprobar también el cursor y obligaciones emitidas. No guardar SQL sensible, tokens ni archivos en el error.

Ver comandos reproducibles en [desarrollo](desarrollo.md#14-motor-documental-h04) y resultados en [evidencias H04](hitos/evidencias/h04.md). El esquema H04 se desplegó a Cloud el 16/10/2026 por autorización del usuario. RLS universal, protección definitiva de lecturas/Storage, monitoreo y habilitación del Cron productivo siguen en H08.
