# Expediente laboral y áreas documentales — H05

Implementación de [H05](hitos/h05-areas-documentales.md) sobre el [motor H04](motor-documental.md). Las decisiones de producto siguen el [diseño técnico](diseno-tecnico.md); los límites de lote, cursor y contratos que se concretan aquí son bases técnicas. Pruebas y datos ficticios exclusivamente en [Docker local](desarrollo.md#15-expediente-y-tres-áreas-h05). Evidencias en [H05](hitos/evidencias/h05.md).

## 1. Recorrido y responsabilidades

Tributario y Laboral general listan obligaciones de empresa. Laboral por trabajador abre el listado y el expediente, sin crear un motor o almacenamiento paralelo. Los tres usan `h03_command`, `h03_query`, posiciones, ciclos, versiones, revisión individual, corrección y reapertura existentes.

- Empresa: `/empresas/{companyId}?tab=tributario|laboral_general|laboral_trabajador|historial`.
- Expediente: `/empresas/{companyId}/trabajadores/{workerId}`.
- `employmentPeriodId` selecciona etapa; `stage=ingreso|relacion|cese` selecciona sus documentos. Por defecto, etapa abierta o última etapa; relación como sección documental inicial.
- Detalle común: `/actividades/{obligationId}?returnTo=...`, conservando empresa, trabajador, etapa y sección en el retorno.
- Configuración conserva catálogo, reglas, posiciones, condiciones y responsables. No hay rutas adicionales por módulo.

Las consultas pasan directamente del repositorio del navegador a RPC de Supabase y validan la respuesta con Zod. Los componentes no contienen SQL ni secretos. Se reutilizan los controles de consulta, paginación y feedback; rutas delgadas, componentes pequeños y tipos separados conforme a [.agents](../.agents/rules.md).

## 2. Permisos y alcance

| Acción | Capacidad y condiciones |
|---|---|
| Consultar expediente | Membresía válida, empresa disponible y `laboral_trabajador.view`; la administración puede consultar para gestionar el estudio. |
| Crear/editar ficha, registrar/corregir etapa, cesar, reconciliar o registrar solicitud eventual | `laboral_trabajador.workers.manage`, empresa activa y trabajador no eliminado. Ser responsable no concede esta capacidad. |
| Eliminar/restaurar ficha | Administración y `workers.manage`; motivo obligatorio. |
| Entregar, descargar, aprobar, observar o reabrir | Permiso documental correspondiente del módulo, por los contratos H03. La administración no sustituye automáticamente esas capacidades. |
| Importar catálogo de partida | Administración; solo incorpora códigos faltantes. |
| Continuación de sistema | Función reservada a `service_role`/ejecutor SQL confiable; no disponible al navegador. |

Remuneración y examen médico pertenecen al acceso laboral completo, sin un permiso adicional. La remuneración se lee en el expediente; no se añade a resúmenes documentales, auditoría, notificaciones ni mensajes externos. Las respuestas se limitan a lo necesario para la pantalla. RLS, revocación universal y acceso directo a Data API/Storage siguen **H08/T01**: las validaciones de RPC y UI de H05 no acreditan ese cierre.

## 3. Ficha, etapas y dinero

`workers` mantiene identificación y contactos; no almacena otro estado activo/cesado. Se normaliza identificación quitando espacios y convirtiendo letras a mayúsculas; conserva ceros. DNI exige ocho dígitos. La unicidad canónica incluye registros eliminados dentro de estudio/empresa/tipo. Una identidad eliminada se restaura, no se vuelve a registrar.

`employment_periods` conserva etapas con secuencia desde uno. Cargo, área, contrato y remuneración son referencias documentales; H05 no calcula nómina. El salario es `numeric(14,2)` no negativo o NULL en PostgreSQL y **texto decimal exacto** en formularios/RPC de lectura. Nunca se transforma a `Number` para guardarlo. Moneda de tres letras mayúsculas, inicialmente PEN.

El servidor valida fechas civiles de Lima, nacimiento y fechas laborales no futuras. Cese y motivo se establecen juntos; `otro` requiere observación. El rango laboral es inclusivo: un reingreso requiere fecha posterior al cese anterior. Una unicidad parcial impide dos etapas abiertas; un trigger serializado por trabajador impide superposición histórica. Estudio, empresa, trabajador y secuencia de una etapa son inmutables.

Corregir exige motivo y revisión esperada; no puede abrir/cerrar implícitamente la etapa. El cese solo admite sus campos de cierre: no puede cambiar salario, cargo o fecha de ingreso. Los cambios válidos no reescriben snapshots, archivos ni decisiones ya emitidos.

## 4. Contratos de operaciones

Todas las operaciones laborales usan `h03_command(p_organization_id, p_request_id, p_operation, p_input)`. El actor procede de la sesión. Se reutilizan reserva idempotente, huella de entrada, transacción, CAS, normalización de errores y auditoría H02/H03.

| Operación | Entrada específica | Revisión/resultados |
|---|---|---|
| `RegisterWorker` | `company_id`, identidad, nombres/apellidos, contactos/nacimiento/notas opcionales; `employment` opcional con condiciones iniciales. No acepta `id` ni revisión de creación. | Ficha y etapa inicial, si se solicita, se confirman juntas. Devuelve ficha, revisión vigente, etapa y resultado de generación. |
| `UpdateWorker` | Empresa, trabajador, datos de ficha. | `expected_revision` de ficha; no modifica etapas. |
| `StartEmployment` | Empresa, trabajador, ingreso, condiciones y, opcionalmente, cese histórico completo. | Revisión de ficha; crea otro ID y secuencia. No reutiliza una etapa cerrada. |
| `EndEmployment` | Empresa, trabajador, etapa, `end_date`, `termination_reason`, `termination_notes`. | Revisión de etapa; solo una etapa abierta puede cesar. Campos de condiciones ajenos al cierre se rechazan. |
| `CorrectEmployment` | Empresa, trabajador, etapa, condiciones corregidas y `reason`. | Revisión de etapa; conserva apertura/cierre y valida superposición. Motivo en metadatos de auditoría, sin remuneración ni notas privadas. |
| `ReconcileEmployment` | Empresa, trabajador y etapa. | Revisión de etapa; reintenta fases pendientes y solicita periódicas vigentes sin volver a registrar ingreso/cese. |
| `DeleteWorker` / `RestoreWorker` | Empresa, trabajador, `reason`. | Revisión de ficha; eliminación/restauración lógica con pausas, sin crear ni borrar etapas. |
| `EmitEmploymentRequest` | Empresa, trabajador, etapa, regla eventual configurada, UUID estable del evento y fecha. | Revisión de etapa; reglas `manual_request` de ese destino; reutiliza H04. |
| `ImportDocumentCatalog` | Arreglo de plantillas con código estable, nombre, módulo, descripción y formatos. | Administración, máximo 50 entradas por solicitud; incorpora faltantes sin sobrescribir ni restaurar tipos existentes. |

Para todos los casos de modificación se incluye `company_id` y el ID del recurso. Los datos opcionales vacíos se envían como NULL. El resultado común conserva `schema_version`, `resource_id`, `revision`, `status` y, cuando corresponde, `employment_period_id` y `generation:{status,generated_count,error_code?}`.

Errores: `VALIDATION_ERROR` para entradas incoherentes; `FORBIDDEN` para capacidad/contexto no operativo; `NOT_FOUND` para destino ajeno o no disponible; `CONFLICT` para revisión vencida, identidad duplicada, superposición o segunda etapa abierta. Refrescar y decidir después de un conflicto; no sobrescribir automáticamente.

El mismo `request_id` y entrada recupera el resultado anterior. Una acción distinta usa otra intención. La UI conserva la intención durante un reintento de la misma solicitud, muestra loading en el botón y deshabilita también cancelar mientras se ejecuta. Errores explícitos reciben foco; la navegación y filtros no añaden esperas artificiales.

## 5. Eventos y generación recuperable

El cambio laboral y el progreso de sus eventos se confirman en la misma transacción. El adaptador laboral llama al calendario y emisor **compartidos H04**; no copia la lógica de obligaciones. Procesa hasta 25 reglas por lote inicial, configurable técnicamente entre 1 y 100 en el trabajador de sistema.

| Caso | Fecha de referencia y efecto |
|---|---|
| Ingreso registrado dentro del control | Checklist de ingreso y periódicas vigentes que intersecten la etapa. |
| Ingreso anterior al control | Checklist como solicitud actual: referencia máxima entre hoy, inicio de control e ingreso. Conserva fecha laboral real; no genera meses anteriores de boletas. |
| Cese dentro del control, registrado después | Plazo desde fecha real de cese. Selección de configuración vigente al registrar, congelada para continuación; admite reglas configuradas después del día del cese. |
| Cese totalmente anterior al control | Etapa histórica conservada; fases omitidas, sin cese retroactivo automático. |
| Motivo fuera de condición de regla | Obligación `no_aplica` con explicación; no se pierde la evidencia de aplicabilidad. |
| Mes parcialmente trabajado | Periodo intersectante elegible. Mes completamente posterior al cese excluido; obligaciones existentes intactas. |
| Reingreso | Otro ID/sequence y checklist, sin convertir documentación anterior en evidencia nueva. |

El ID de ingreso es estable por etapa; el ID de cese queda persistido. Una solicitud manual conserva su UUID al reintentar. La unicidad H04 `(regla, destino, ocurrencia)` evita duplicación. El snapshot añade únicamente `employment_event` cuando el adaptador emite por evento laboral: identidad, tipo y fechas, sin salario ni notas.

`employment_periods.document_generation` conserva las fases `hire`, `termination`, `reconcile`, descritas en [diccionario](tablas-db.md#j14--employment_periodsdocument_generation). Una fase recorre reglas en orden estable y recuerda su cursor y momento de solicitud. No incorpora silenciosamente reglas creadas después de esa solicitud.

Si falla la generación, se revierte el lote documental de la fase fallida y se guarda `failed` con error seguro. El cambio laboral ya válido permanece confirmado: **no hay que volver a cesar ni registrar al trabajador**. Lotes previos conservan sus documentos y cursor. Un resultado `pending` es trabajo duradero pendiente, no una operación laboral perdida.

`h05_run_generation` toma bloqueos estudio → trabajador → etapa y continúa un lote. Prioriza fases aún no intentadas o con intento más antiguo; un expediente fallido no impide avanzar los demás del estudio. `h05_schedule_generation` activa/desactiva el job `h05-employment-continuation`, cada minuto. Aplicar migraciones **no activa el job**. El setup de prueba lo activa solo localmente. La programación productiva y su monitoreo se configuran en H08.

Eliminar trabajador registra una pausa y bloquea generación. Restaurar cierra la pausa y permite reconciliar lo vigente; no genera periódicas correspondientes exclusivamente a la pausa, ni otra etapa, ni un ingreso ficticio. Cesado, eliminado y empresa inactiva son situaciones diferentes.

## 6. Consultas y navegación contextual

`h05_query(p_organization_id,p_resource,p_input)` entrega:

- `workers`: empresa, búsqueda por identificación/nombre, estado derivado `active|ended|unregistered`, paginación de 25; incluir eliminados solo administración.
- `worker`: ficha y resumen paginado de etapas; detalle de una sola etapa con condiciones y progreso. `has_open_period` se calcula sobre todas las etapas, independientemente de la página seleccionada.
- `event_rules`: reglas eventuales manuales para ese trabajador/etapa, paginadas.

No se precargan archivos de todas las etapas. El selector conserva la etapa seleccionada aunque no esté en la página de resúmenes. Una etapa de otro trabajador, otra empresa o inexistente devuelve `NOT_FOUND` antes de exponer condiciones/documentos. `h03_query` amplía el listado común con `worker_id`, `employment_period_id`, `employment_stage`, clave exacta de periodo y estado documental, manteniendo la autorización del módulo.

El listado común incorpora nombre actual del trabajador y secuencia como ayudas; no altera el snapshot histórico. Entrega puntual, aprobación parcial y vencimiento siguen siendo dimensiones diferentes según H03/H04.

## 7. Catálogo y límites

La UI ofrece importar **28 tipos orientativos editables**: siete tributarios, ocho de Laboral general, cinco de ingreso, cuatro de relación y cuatro de cese. Son datos de configuración de partida. No activan reglas, no fijan plazos legales y no se insertan automáticamente al desplegar migraciones. El administrador configura posiciones/formato/plazo, aplicabilidad y responsable antes de activar.

No hay cálculos de planilla, calendario SUNAT, expediente OCR ni privilegio médico separado. Actividades adicionales/avisos son H06; reportes H07; RLS, respaldos, operación y aceptación productiva H08. La validación técnica no sustituye la aceptación formal del responsable de producto.
