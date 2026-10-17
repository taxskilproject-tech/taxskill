# H03 — Primer recorrido documental

**Estado:** implementado y validado técnicamente en Docker el 16 de octubre de 2026; base lista para H04, aceptación formal de producto pendiente. Ver [reconstrucción e integración local](evidencias/validacion-local-h02-h03.md). Las pruebas históricas usaron Cloud por error: se conservan la [corrección de entornos](evidencias/correccion-entornos.md) y las [evidencias históricas](evidencias/h03.md). **Depende de:** [H02](h02-acceso-empresas.md). **Habilita:** [H04](h04-motor-documental.md). Aplican las [reglas](README.md#3-reglas-transversales-obligatorias) y la [Definition of Done común](README.md#4-definition-of-done-comun).

<a id="objetivo"></a>
## 1. Objetivo

Entregar un recorrido real desde una regla documental hasta su cumplimiento: generar una obligación mensual con dos archivos requeridos, cargar cada uno, revisarlos individualmente, observar/corregir, aprobar y reabrir con historial.

Este recorrido valida la arquitectura con una capacidad completa antes de ampliar el calendario o las áreas. La primera regla mensual no reduce las periodicidades del MVP, que se completan en H04.

## 2. Alcance y entregables

**Entrada:** empresa activa, usuario de entrega, revisor elegible, asignaciones y operaciones auditables de H02.

**Caso de referencia:** PDT mensual con dos posiciones revisables configuradas y archivos de prueba acordes a sus formatos. Una posición representa un archivo requerido; una versión representa una entrega sucesiva de esa misma posición.

**Incluye:** catálogo/regla mínima, ocurrencia mensual, snapshots, entregables/ciclos, cargas recuperables, validación confiable, revisiones, archivos históricos, disposiciones y eventos iniciales.

**Entregables:** recorrido ejecutable por cliente/revisor/administrador, migraciones/RPC/Edge necesarias, almacenamiento de prueba, repositorios/hooks y evidencia de los fallos relevantes.

| Pantalla existente | Capacidad del hito |
|---|---|
| `/configuracion` | Configurar el tipo/regla mensual de prueba y posiciones. |
| `/empresas/{companyId}`, pestaña Tributario | Listar obligación y estado de sus entregables. |
| `/actividades` | Bandeja básica de obligaciones generadas, sin duplicar registros. |
| `/actividades/{obligationId}` | Carga, revisión individual, corrección, reapertura e historial. |
| `/documentos` | Acceso básico a versiones del recorrido y descarga; búsqueda completa H07. |

<a id="requerimientos-funcionales"></a>
## 3. Requerimientos funcionales

- **H03-RF01 — Configuración mínima válida.** Administrador define tipo, empresa/módulo, responsable elegible, frecuencia mensual, plazo, formatos y dos posiciones requeridas. No activar una regla incompleta.
- **H03-RF02 — Generación única.** Crear una obligación del periodo vigente con los dos entregables y su snapshot. Repetir o concurrir la generación no crea otra obligación ni duplica posiciones.
- **H03-RF03 — Entrega por posición.** Usuario con capacidad de carga elige el archivo del entregable correcto, conoce formato/tamaño permitido y ve progreso/resultado. Cambiar empresa no reasigna una carga en curso a otro contexto.
- **H03-RF04 — Entrega confirmada.** Solo una versión validada y registrada cuenta como archivo recibido. Transferencia terminada sin confirmación no se presenta como entrega completa.
- **H03-RF05 — Revisión individual.** Cualquier contador/supervisor autorizado, o administrador con capacidad de revisión, revisa cada versión vigente. No asignar un revisor fijo ni aprobar automáticamente las demás posiciones.
- **H03-RF06 — Aprobación parcial.** Una de dos posiciones aprobadas muestra avance 1/2 y mantiene la obligación incompleta. El cumplimiento llega únicamente cuando todas las posiciones requeridas están aprobadas.
- **H03-RF07 — Plazo y cumplimiento.** El vencimiento mide la entrega del cliente y la aprobación mide cumplimiento documental. Todos los archivos entregados a tiempo, todavía sin revisar, se muestran por revisar sin atraso de entrega.
- **H03-RF08 — Observación.** El revisor indica motivo no vacío y nueva fecha límite de corrección. El usuario consulta ese motivo y sabe qué posición corregir. Se conserva la puntualidad del ciclo previo.
- **H03-RF09 — Corrección.** Cargar un archivo corregido genera una nueva versión asociada al nuevo ciclo; las anteriores y sus observaciones permanecen consultables. La corrección vuelve a revisión, no se aprueba sola.
- **H03-RF10 — Reapertura.** Archivo aprobado requiere revisor autorizado, motivo y nuevo plazo antes de aceptar reemplazo. La reapertura retira su aprobación vigente y exige versión nueva; no modifica ni borra la decisión histórica.
- **H03-RF11 — No aplica y cancelación.** No aplica requiere capacidad `waive` y motivo; cancelación requiere administrador y motivo. Ambas conservan archivos/historia y se excluyen de exigibles según el diseño, sin eliminación física.
- **H03-RF12 — Historial y descarga.** Ver versiones con autor, fecha y decisión asociada; acceder a PDF/imágenes o descargar Office según capacidad. Acceso breve solicitado al usarlo, sin precargar URLs de todos los archivos.
- **H03-RF13 — Conflictos y reintentos.** Dos revisores no sobrescriben decisiones. Un fallo recuperable de transferencia/validación/registro permite reintentar sin crear otra versión confirmada ni repetir eventos.
- **H03-RF14 — Eventos y trazabilidad.** Entrega, aprobación, observación y reapertura producen auditoría y eventos iniciales de notificación. Su centro completo y resúmenes se entregan en H06.
- **H03-RF15 — Estados útiles.** Mostrar carga, validación en curso, error, observación, avance y resultado con mensajes comprensibles, teclado y móvil. Un archivo rechazado explica qué debe corregirse sin filtrar datos internos.

**Trazabilidad:** RF-12, RF-14–RF-24, RF-26 y RF-27; RN-04–RN-07 y RN-12–RN-14; HU-03–HU-07 y HU-11; D10–D13, D19, D22, D27 y D33–D35.

<a id="requerimientos-tecnicos"></a>
## 4. Requerimientos técnicos

- **H03-RT01 — Dependencias DB previas.** Incorporar estructura de `workers` y `employment_periods` antes de las FK laborales del motor cuando sean necesarias, aunque su UI espere H05. No crear referencias a tablas inexistentes ni cambiar el modelo a causa del orden de pantallas.
- **H03-RT02 — Persistencia documental.** Incorporar `document_types`, `requirement_rules`, `rule_versions`, `periods`, `obligations`, `deliverables`, `submission_cycles`, `upload_intents`, `document_versions` y `review_events`. Añadir `notification_events`/`notifications` para efectos del recorrido; reutilizar `audit_events`/`operation_requests`.
- **H03-RT03 — Snapshots e integridad.** Respetar FK, unicidad y JSONB del diccionario. Conservar regla/versión usada, posiciones, formatos, tamaño permitido, plazo, obligatoriedad, prioridad y responsable inicial. `document_types`/`requirement_rules` usan soft delete; versiones, ciclos y revisiones se conservan.
- **H03-RT04 — Carga directa y reserva.** `CreateUploadIntent` por RPC valida contexto, capacidad, disposición, ciclo y revisión esperada; reserva versión/ruta con `request_id`. Bytes al staging de Storage directamente desde el navegador, con carga reanudable y sin proxy Next.js.
- **H03-RT05 — Validación confiable.** `FinalizeUpload` se ejecuta por Edge Function invocada con SDK. Comprueba presencia, tamaño real, formato por firma/contenedor y SHA-256; nombre/MIME declarados no son prueba. Validar XLSX/DOCX como contenedores Office correctos, no aceptar cualquier ZIP.
- **H03-RT06 — Confirmación recuperable.** Promover a ruta final inmutable sin `upsert` y confirmar SQL interna con intención, versión, cabecera, recepción del ciclo, auditoría y eventos. Fallos entre Storage y DB se reconcilian con la misma intención/versión; no asumir atomicidad entre ambos servicios.
- **H03-RT07 — Límites de archivo.** Límite inicial configurable 20.000.000 bytes, `bigint` y formatos pdf/xls/xlsx/doc/docx/jpg/jpeg/png sujetos a la regla. Una obligación conserva su límite; si el proveedor impide cumplirlo se informa incompatibilidad, no se reescribe el snapshot.
- **H03-RT08 — Versiones/ciclos.** Primera finalización del ciclo fija recepción y puntualidad. Reemplazar antes de aprobación agrega versión sin cambiar la primera recepción del mismo ciclo. Observar/reabrir abre un ciclo nuevo con plazo explícito no anterior a la fecha local actual.
- **H03-RT09 — Mutación concurrente.** `ApproveVersion`, `ObserveVersion` y `ReopenApproved` usan versión vigente y `expected_revision`; cambio, revisión, auditoría y eventos en una transacción. CONFLICT no se transforma en aprobación automática después de refrescar.
- **H03-RT10 — Estados calculados.** Persistir `pendiente`, `por_revisar`, `observado`, `aprobado` para revisión según el diccionario. `cargado`/`corregido` son eventos y `vencido` es cálculo de ciclo abierto sin entrega, no otro estado de revisión.
- **H03-RT11 — Descarga breve.** `RequestDownload` por RPC registra intento autorizado y Storage emite URL firmada de 60 segundos según la base técnica. En H03 la Edge ejecuta esa RPC como el usuario y firma mediante SDK administrativo, porque la emisión directa en navegador requiere las políticas aplazadas a H08. Los bytes siguen viajando directamente desde Storage. No guardar URL firmada como dato permanente ni usar archivos públicos. La restricción efectiva universal de Storage se completa en H08.
- **H03-RT12 — Temporales.** TTL inicial de staging: 24 horas para objetos sin versión confirmada y sin validación en curso. Conservar intención/resultados; no limpiar archivos finales ni versiones/revisiones por este TTL.
- **H03-RT13 — Presentación desacoplada.** Repositorios/mappers/hooks encapsulan SDK, subida, estado de intención y errores. Componentes por posición y visor se componen con Atomic Design; las reglas agregadas viven en dominio.
- **H03-RT14 — Consulta y caché.** Listados paginados y campos seleccionados; progreso de intención consultado con espera limitada/backoff, sin recargar toda la bandeja. Invalidar recurso/counters tras confirmar una operación.
- **H03-RT15 — Exposición pendiente.** Recursos de Storage diseñados para acceso privado; secreto de validación solo en Edge. SQL interna de confirmación no se diseña como mutación libre del navegador. Privilegios/RLS definitivos y acceso de objetos no confirmados se prueban en H08.

## 5. Reglas del recorrido y contratos

### 5.1 Separar revisión, entrega y disposición

| Dimensión | Ejemplo | Interpretación |
|---|---|---|
| Revisión | Dos archivos recibidos, ninguno aprobado | `por_revisar`; cumplimiento aún incompleto. |
| Entrega | Primera recepción de cada ciclo antes del cierre del día | Entrega puntual; revisión posterior no genera atraso del cliente. |
| Corrección | Archivo observado y nuevo plazo | Otro ciclo; el plazo anterior conserva su resultado histórico. |
| Disposición | No aplica o cancelada con motivo | Excluida de exigibles, conservando historia y archivos. |

El agregado sigue la precedencia documentada: disposición, aprobación completa, observación vigente, entrega faltante y revisión pendiente. Mostrar contadores por posición para no ocultar una combinación de archivos observados, faltantes y aprobados.

La fecha operativa usa los ciclos abiertos con entrega pendiente. Si todos fueron recibidos, no hay vencimiento de entrega pendiente aunque la revisión siga abierta. No introducir un plazo obligatorio de revisión no acordado.

### 5.2 Operaciones

| Operación | Entradas principales | Efectos que deben quedar coherentes |
|---|---|---|
| ConfigureRequirement / generación mensual | Empresa, tipo, posiciones, formatos, plazo y responsable. | Regla versionada y ocurrencia única con snapshot. |
| CreateUploadIntent | Entregable/ciclo, revisión y metadatos declarados. | Reserva recuperable para versión y ruta. |
| FinalizeUpload | Intención, revisión y petición. | Bytes validados, versión confirmada y fecha de recepción confiable. |
| ApproveVersion | Entregable, versión y revisión. | Decisión identificada y agregado actualizado. |
| ObserveVersion | Versión, motivo, fecha nueva y revisión. | Observación conservada y ciclo de corrección abierto. |
| ReopenApproved | Versión aprobada, motivo, fecha nueva y revisión. | Aprobación histórica intacta, cabecera pendiente de nueva versión. |
| SetNotApplicable / CancelObligation | Motivo y revisión de obligación. | Disposición auditable sin borrar versiones. |
| RequestDownload | Versión solicitada. | Intento autorizado auditado y enlace breve; no prueba de guardado local. |

Formato real no equivale a análisis antivirus, OCR o clasificación inteligente; esas capacidades no se añaden a este hito.

<a id="tareas"></a>
## 6. Tareas del hito

| Tarea | Trabajo concreto y entregable | Requisitos |
|---|---|---|
| H03-T01 | Resolver dependencias/FK e incorporar esquema documental, eventos iniciales y datos ficticios de una empresa con PDT de dos posiciones. | RF01, RF02; RT01–RT03. |
| H03-T02 | Implementar contrato y UI mínima de regla mensual; generación transaccional/idempotente y consulta de obligación. | RF01, RF02; RT02, RT03, RT14. |
| H03-T03 | Implementar reserva de carga e integración Storage reanudable con progreso y recuperación por intención. | RF03, RF04, RF13, RF15; RT04, RT07, RT14. |
| H03-T04 | Implementar Edge de validación binaria/promoción y confirmación SQL recuperable; probar límites/fallos entre servicios. | RF04, RF13; RT05–RT07, RT15. |
| H03-T05 | Implementar versiones, ciclos y cálculo de puntualidad/estado agregado/cumplimiento básico en reglas puras reutilizables. | RF06–RF10; RT08, RT10. |
| H03-T06 | Implementar aprobación y observación individual con comentario/nuevo plazo, transacción y revisión esperada. | RF05–RF09, RF13, RF14; RT08–RT10. |
| H03-T07 | Implementar reapertura, versión posterior y disposiciones No aplica/cancelación con motivo e historial. | RF10, RF11; RT03, RT08–RT10. |
| H03-T08 | Implementar visor/historial y descarga breve bajo el contrato previsto; registrar intento sin atribuir guardado al usuario. | RF12; RT11, RT13, RT15. |
| H03-T09 | Implementar auditoría y eventos de entrega/revisión sin duplicación; preparar consumo posterior de notificaciones. | RF14; RT02, RT06, RT09. |
| H03-T10 | Configurar limpieza limitada de staging y evidencia de recuperación después de cierre/fallo del navegador. | RF13; RT06, RT12, RT14. |
| H03-T11 | Componer pestaña Tributario, bandeja básica y detalle con Atomic Design, estados accesibles y contexto consistente. | RF03, RF05–RF15; RT13, RT14. |
| H03-T12 | Demostrar todo el recorrido y fallos/concurrencia, actualizar tipos/contratos y registrar restricciones de acceso aún pendientes. | RF01–RF15; RT01–RT15. |

## 7. Escenarios obligatorios de aceptación

| Caso | Preparación y acción | Resultado verificable |
|---|---|---|
| CA06 Aprobación parcial | Subir dos archivos y aprobar solo uno. | Avance 1/2; obligación no completa ni contabilizada como aprobada. |
| CA07 Entrega puntual por revisar | Finalizar ambos antes del plazo; revisar después. | Sin atraso de entrega; cumplimiento pendiente hasta aprobar ambos. |
| CA08 Observación | Observar una posición con motivo y fecha nueva. | Motivo visible; nuevo ciclo; resultado de puntualidad anterior conservado. |
| CA09 Corrección tardía aprobada | Corregir después del nuevo plazo y aprobar. | No hay entrega pendiente; tardanza histórica visible y cumplimiento aprobado. |
| CA10 Reapertura | Intentar reemplazar aprobado y luego reabrir autorizado. | Primer intento rechazado; reapertura exige motivo/plazo y nueva versión, con aprobación anterior conservada. |
| CA11 Revisores concurrentes | Dos revisores actúan con misma revisión. | Solo uno confirma; otro recibe CONFLICT; no hay doble auditoría/evento de la misma acción. |
| CA16 Disposición | Marcar No aplica/cancelar con y sin motivo. | Sin motivo se rechaza; con motivo excluye exigibles sin borrar archivos. |
| CA18 Formato/tamaño/interrupción | Archivo sobre límite, MIME falso y transferencia cortada. | Invalidaciones confiables y reanudación pertinente; ninguna versión prematura. |
| CA19 Storage/SQL | Promover archivo y simular fallo antes/después de confirmación. | Reintento converge en una versión; intención permite reconciliar; no afirmar protección universal hasta H08. |
| CA12 inicial Generación repetida | Invocar dos veces/concurrentemente la ocurrencia mensual. | Una obligación y dos posiciones; versión de configuración no duplica la clave. |
| CA29 inicial Descarga | Solicitar URL al usarla y consultar versiones históricas. | Caducidad breve y auditoría; retirada efectiva de permiso se cierra H08. |
| CA27 / CA34 Interfaz/contexto | Cargar/revisar en móvil/teclado y cambiar contexto durante consultas. | Acciones utilizables y ausencia de datos mostrados bajo el contexto equivocado. |

La evidencia incluirá IDs de regla/obligación/posición/versión/ciclo y consulta de sus relaciones, sin contenido confidencial ni URLs de acceso vigentes.

<a id="definition-of-done"></a>
## 8. Definition of Done

- [x] H03-RF01–H03-RF15 y H03-RT01–H03-RT15 tienen evidencia del recorrido y de sus fallos relevantes.
- [x] La regla mensual genera exactamente una obligación con dos posiciones y condiciones conservadas.
- [x] Carga directa reanudable y validación real de formato/tamaño funcionan; confirmación no depende del MIME del navegador.
- [x] Reintento tras fallo Storage/SQL converge sin duplicar versiones, revisiones ni eventos.
- [x] Revisión por posición, aprobación parcial y cumplimiento total respetan los contadores.
- [x] Entrega puntual sin revisar no aparece vencida para el cliente.
- [x] Observación, corrección tardía y reapertura conservan plazos, versiones y decisiones anteriores.
- [x] Concurrencia produce CONFLICT sin sobrescritura ni reintento automático de revisión.
- [x] No aplica/cancelación exigen motivo y conservan la documentación.
- [x] Historial/descarga breve y limpieza exclusiva de staging funcionan según su ciclo de vida.
- [x] Auditoría y eventos relacionados nacen de la operación confiable, sin inserciones arbitrarias del cliente.
- [x] Componentes, hooks y repositorios respetan Atomic Design, contexto y estados accesibles.
- [x] Se entregan migraciones/tipos/contratos y evidencia CA06–CA11, CA16, CA18–CA19 y checks transversales pertinentes.
- [x] Reconstrucción limpia y actualización desde H02 verificadas en Docker, conservando los datos previos; integración SQL/SDK local repetida.
- [x] El aislamiento universal de Storage/Data API y privilegios internos continúa identificado para H08/T01.
- [ ] Aceptación formal del responsable de producto y cierre de su seguimiento en la Definition of Done común.

El pendiente técnico del reset y la integración local quedó resuelto: 19 migraciones en base nueva, actualización con huellas coincidentes de las 13 tablas H02, dos suites SQL y 59 comprobaciones del recorrido H03. Los controles de código pasan 111 pruebas en 18 archivos. Consultar la [evidencia vigente](evidencias/validacion-local-h02-h03.md); la aceptación formal de producto permanece separada. RLS conserva su etapa H08.

## 9. Límites y continuidad

H04 amplía las diez periodicidades, cambios de regla y recuperación completa del motor. H05 aporta el expediente laboral. H06 completa actividades adicionales y notificaciones; H07 consolida indicadores/búsqueda/reportes.

No añadir un segundo motor tributario, un API proxy de archivos, un plazo obligatorio para el revisor o una tabla de tareas. Las mejoras futuras no deben impedir demostrar este recorrido base.

## 10. Referencias

- [Índice de hitos](README.md).
- [Estados, ciclos y revisión](../diseno-tecnico.md#8-estados-plazos-y-revisiones).
- [Carga, acceso y conservación](../diseno-tecnico.md#10-carga-acceso-y-conservación-de-archivos).
- [Contratos de operaciones](../diseno-tecnico.md#12-contratos-de-operaciones).
- [Diccionario DB y contratos JSONB](../tablas-db.md).
- [Diagrama de procesos](../diagrama-flujo.md).
- [Navegación](../flujo-navegacion.md).
- [Anterior: H02](h02-acceso-empresas.md) · [Siguiente: H04](h04-motor-documental.md).
