# Auditoría integral de H01–H08

**Seguimiento del 20/10:** [correcciones y nuevas evidencias](correcciones-auditoria-2026-10-20.md). Este informe conserva los defectos y resultados encontrados al auditar; su estado posterior se documenta en ese seguimiento.

**Fecha:** 19/10/2026, America/Lima. **Versión revisada:** `ff08a51`, rama `codex/h02-acceso-empresas`, más la copia de trabajo indicada abajo. **Dictamen:** la base funcional está implementada, pero no corresponde declarar todos los hitos conformes ni cerrar H08. Hay dos defectos de prioridad alta y dos de prioridad media reproducidos; además, el JSON local de n8n presenta una discrepancia de configuración.

Esta entrega documenta la auditoría. No corrige código, modifica migraciones, publica workflows, activa jobs ni cambia Supabase Cloud.

## 1. Alcance y método

Fuentes: [reglas del agente](../../../.agents/rules.md), [desarrollo y entornos](../../desarrollo.md), [índice de hitos](../README.md), los ocho hitos, [diseño técnico](../../diseno-tecnico.md), [tablas](../../tablas-db.md), [procesos](../../diagrama-flujo.md), [navegación](../../flujo-navegacion.md), [carpetas](../../estructura-carpetas.md), contratos de dominio, migraciones y evidencias funcionales/operativas relacionadas.

Se contrastaron los requisitos con las implementaciones críticas de sesión, permisos, operaciones administrativas, documentos, generación, expediente laboral, avisos, reportes y recuperación. Se ejecutaron controles estáticos, compilación, pruebas unitarias, SQL y seguridad por API. Los hallazgos se reprodujeron por separado para distinguir defectos de la implementación de limitaciones del entorno.

Los datos ficticios y las pruebas de integración de esta auditoría se ejecutaron exclusivamente en Supabase Docker local, API `127.0.0.1:54331`, contenedor `supabase_db_tax-skill`. Las reproducciones SQL de los defectos terminaron con `ROLLBACK`. No se usó Cloud como entorno de pruebas ni se enviaron nuevos mensajes WhatsApp.

El árbol tenía cambios ajenos al informe en `revalidacion-base-h08.md` y, al revisar la configuración, en el JSON productivo de n8n. Se conservaron. La discrepancia del JSON se identifica expresamente como cambio de la copia de trabajo; no se atribuye al commit auditado ni demuestra un cambio en n8n publicado.

### Criterio de prioridades

- **P1:** impide una función central o la operación autónoma prevista; resolver antes de activar esa operación o aceptar su capacidad.
- **P2:** deteriora controles de entrega, detección o reproducibilidad; resolver antes del cierre productivo.
- **Pendiente operativo:** falta configuración o evidencia real, diferenciada de un defecto de código.

## 2. Hallazgos reproducidos

### AUD-01 · P1 · El programador H08 utiliza identificadores incompatibles

**Fuente:** [h08_generation_tick](../../../supabase/migrations/20261018004913_h08_auth_admission_and_scheduler.sql), líneas 81–95, especialmente 90–91.

El bucle obtiene un estudio y llama a `h04_run_generation(v_org.id,100)` y `h05_run_generation(v_org.id,100)`. Sin embargo, los contratos vigentes reciben `p_rule_id` y `p_employment_period_id`, respectivamente: el primer UUID debe identificar una regla o una etapa laboral, no el estudio. Los filtros de ambas funciones buscan ese UUID en sus entidades y devuelven `idle` al no encontrarlo.

`h08_generation_tick` ignora esos resultados y devuelve `completed`, incrementando el contador de estudios. `h08_schedule_generation(true)` sustituye los jobs anteriores por este ejecutor, por lo que activar el mecanismo H08 deja sin avance la generación periódica y las continuaciones laborales pendientes.

**Reproducción Docker:** se dejaron temporalmente pendientes una regla diaria válida y una fase laboral existentes. El tick respondió `{"status":"completed","organizations":12}`. Después del tick, la regla seguía pendiente y la fase conservaba `pending`. Invocando los motores con el ID correcto, la regla avanzó a no pendiente y la fase a `completed`. Como las obligaciones de esas ocurrencias ya existían, la recuperación procesó el trabajo sin duplicarlas: `generated_count=0`. Se ejecutó rollback. La repetición concluyente se hizo después de H06 para excluir interferencias por bloqueos.

**Requisitos afectados:** H08-RF10, H08-RT10, H08-T08; continuidad de H04 y H05. La comprobación existente de H08 demuestra que una migración no activa jobs, pero no verifica el avance del nuevo tick. Los jobs H04/H05 anteriores estaban activos en Docker: su funcionamiento no valida el sustituto H08.

**Corrección requerida:** acordar explícitamente el contrato por estudio del ejecutor, o seleccionar reglas/etapas y pasar sus IDs. Mantener aislamiento, procesamiento acotado y progreso justo entre estudios; no reemplazarlo por un bucle global sin límites. Propagar resultados de fallo/pendiente en lugar de contabilizarlos como trabajo completado.

**Cierre:** prueba del tick real con reglas de empresa e internas, alta/cese/reconciliación laboral pendientes, dos estudios, repetición idempotente y fallo recuperable. Debe comprobar avance y resultados, no solamente que Cron terminó sin excepción.

### AUD-02 · P1 · CAP-01 sigue bloqueando el procesamiento masivo de avisos

**Fuentes:** [h06_run_deadlines](../../../supabase/migrations/20261017001600_h06_assignment_and_transport_defaults.sql), líneas 7–14; [ejecutor Edge](../../../supabase/functions/notification-operations/index.ts), líneas 24–27.

`h06_run_deadlines` recorre todas las obligaciones operativas en una transacción, sin paginación ni cursor. Cada obligación sin responsable vuelve a pasar por la preparación del evento de incidencia. El ejecutor Edge espera este RPC y, si falla, no llega a `dispatchBatch`: una carga masiva de incidencias puede detener la salida del lote completo.

**Reproducción nueva:** el estudio sintético de capacidad permaneció activo con **12.000 obligaciones sin responsable**. El rol `authenticator` local tiene `statement_timeout=8s`; con ese mismo límite, el RPC falló con SQLSTATE **57014** a los **8.003 segundos**, dentro de la creación/validación de eventos de incidencia. Se ejecutó rollback; el total de eventos permaneció en **1.356 antes y después**.

La suite SQL H06 sí terminó al ejecutarse por PostgreSQL sin ese límite de Data API. Por tanto, que pgTAP pase no demuestra que el RPC cumpla su presupuesto real de ejecución. Este resultado confirma la [observación CAP-01 anterior](aceptacion-funcional-docker-h08.md#observación-cap-01--avisos-sobre-obligaciones-masivas-sin-responsable).

**Requisitos afectados:** preparación/ejecución H06-RT07, reintentos recuperables, H08-RF10, H08-RF12 y aceptación de capacidad H08-RF14.

**Corrección requerida:** procesamiento acotado con progreso persistente y selección eficiente de candidatos, evitando rehacer todas las incidencias conocidas. Aislar fallos de un lote para que no paralicen indiscriminadamente otros destinatarios/estudios. Conservar claves de evento, deduplicación, revisión de elegibilidad y estados honestos de integración.

**Cierre:** repetir con la fuente masiva activa, usando el límite efectivo de RPC, avisos válidos y obligaciones sin responsable combinados. Acreditar finalización por lotes, continuidad, ausencia de duplicados y salida de avisos elegibles, sin desactivar el estudio sintético para obtener un resultado favorable.

### AUD-03 · P2 · El monitor permite éxito cuando faltan jobs obligatorios

**Fuente:** [check-operations.ts](../../../scripts/check-operations.ts), líneas 45–63; inventario SQL en [h08_health / h08_jobs](../../../supabase/migrations/20261018004913_h08_auth_admission_and_scheduler.sql).

El monitor examina únicamente los jobs devueltos y comprueba que la lista no esté vacía. No contrasta un conjunto de jobs esperados. Si existe un cleanup sano pero faltan generación y despacho de notificaciones, ninguna condición identifica esas ausencias.

**Reproducción sin red:** se ejecutó el script real con `fetch` interceptado y un `h08_health` válido: contadores en cero, respaldo reciente y solamente `h03-staging-cleanup` activo, reciente y exitoso. El monitor terminó con **exit code 0**, faltando `h08-generation` y `h06-notifications-dispatch`. No se llamó a ningún servidor ni se alteraron jobs reales.

**Requisitos afectados:** H08-RF10, H08-RF12, H08-RT10 y H08-RT14. Este control tampoco detecta AUD-01 cuando Cron informa éxito sin progreso funcional.

**Corrección requerida:** definir los jobs exigibles según el modo operativo y detectar nombres ausentes, desactivados y atrasados. Diferenciar una suspensión de prepublicación autorizada de una operación productiva esperada. Incorporar evidencia de avance funcional para no depender exclusivamente del estado de Cron.

**Cierre:** pruebas con inventario completo, job eliminado, desactivado, nunca ejecutado, atrasado y suspendido deliberadamente. La falta de un job productivo esperado debe producir una alerta accionable y salida fallida.

### AUD-04 · P2 · CI no proporciona la configuración exigida por check:bundle

**Fuentes:** [ci.yml](../../../.github/workflows/ci.yml), líneas 22–24; [check-client-bundle.ts](../../../scripts/check-client-bundle.ts), líneas 6–13.

CI ejecuta `yarn check:bundle`, pero el verificador exige valores no vacíos para `SUPABASE_SECRET_KEY` e `IDEMPOTENCY_HMAC_KEY`. El workflow no declara esas variables; los archivos privados `.env*` están ignorados y los secrets de GitHub no se incorporan automáticamente a un proceso si el workflow no los referencia.

**Reproducción:** se ejecutó el verificador real desde un directorio local sin `.env`, eliminando esas variables del proceso. Falló antes de inspeccionar el bundle con `Configura las dos claves privadas antes de verificar el bundle.` El chequeo local sí pasó con la configuración privada existente; esto explica por qué una validación local satisfactoria no acredita un checkout limpio de CI. No se consultó una ejecución remota de GitHub en esta auditoría.

**Requisitos afectados:** reproducibilidad H01-RF01/H01-RT10 y validación/despliegue H08-RT15–RT16.

**Corrección requerida:** configurar valores sintéticos de control para el build y la inspección de CI, o separar el escaneo estático de la comprobación contra secretos disponibles por entorno. El chequeo debe seguir fallando ante una filtración; no usar claves productivas en PR no confiables ni eliminar silenciosamente la verificación.

**Cierre:** checkout limpio sin `.env` ejecuta toda la cadena; un canario deliberadamente incluido en un recurso cliente provoca un fallo comprobable. Las credenciales reales permanecen fuera del repositorio y de los logs.

### OBS-01 · P2 de configuración local · El JSON de importación volvió a botcci

**Fuente:** [workflow de la copia de trabajo](../../../integrations/n8n/produccion/taxskill-whatsapp-evolution.workflow.json), línea 120; [guía vigente](../../../integrations/n8n/produccion/README.md).

En el commit `ff08a51`, el endpoint termina en `/message/sendText/%20TI`; la copia de trabajo examinada contiene `/message/sendText/botcci`. La guía y la [prueba recibida](whatsapp-ti.md) confirman que la instancia elegida fue **TI**, cuyo nombre exacto contiene un espacio inicial y necesita `%20TI`.

Reimportar esta copia introduciría un remitente distinto del acordado. Es una discrepancia local sin commit: **no demuestra que el workflow publicado en n8n haya cambiado**. No se revirtió ni publicó durante la auditoría.

**Cierre:** reconciliar la copia de importación con la instancia efectivamente autorizada y contrastar importación/publicación sin enviar pruebas duplicadas. Conservar la credencial privada existente y la evidencia del envío confirmado.

## 3. Estado por hito

“Sin hallazgos nuevos” significa que las comprobaciones y muestras revisadas no encontraron otro defecto; no sustituye aceptación formal de producto ni promete ausencia absoluta de errores.

| Hito | Implementación contrastada | Evidencia de esta auditoría y evidencia anterior | Dictamen |
|---|---|---|---|
| [H01](../h01-preparacion-tecnica.md) | App Router/Proxy; adaptadores separados; dominio, repositorios/hooks y Atomic Design; contratos, fechas, caché y controles de acción. | Tipos, lint, arquitectura, unitarias, build y bundle nuevos. Reproducción de CI sin entorno. | Base presente; **AUD-04** impide dar por reproducible la cadena CI versionada. |
| [H02](../h02-acceso-empresas.md) | Usuarios/empresas, roles y overrides, responsables, soft delete/restauración, Auth Admin idempotente y revocación. | SQL H02 y seguridad API H08 nuevos; unitarias de sesión/contexto/acciones. [Recorridos previos](validacion-local-h02-h03.md). | Implementado; sin hallazgos nuevos en el alcance comprobado. Aceptación de producto sigue separada. |
| [H03](../h03-primer-recorrido-documental.md) | Reserva y TUS directo, validación Edge, promoción inmutable/confirmación recuperable, versiones/ciclos, revisión parcial, corrección/reapertura y descarga breve. | SQL H03 nuevo; unitarias de validación/estado/error/URL. [Aceptación previa](aceptacion-funcional-docker-h08.md): 59 comprobaciones del recorrido y muestra visual. | Implementado; sin hallazgos nuevos. La transferencia/Edge y UI completas no se repitieron en esta auditoría. |
| [H04](../h04-motor-documental.md) | Diez frecuencias, calendario civil, snapshots/versiones, cursor, idempotencia, pausas, reglas y responsables. | SQL H04 nuevo; unitarias de calendario/contratos; reproducción real de tick. [Motor previo](h04.md). | Motores presentes; **su programación mediante H08 queda bloqueada por AUD-01**. |
| [H05](../h05-areas-documentales.md) | Tres áreas sobre motor común, ficha única, importes exactos, etapas sin superposición, ingreso/cese/reingreso e historial. | SQL H05 nuevo y contratos unitarios; fase laboral pendiente en reproducción AUD-01. [207 comprobaciones previas](aceptacion-funcional-docker-h08.md). | Implementado; **continuación autónoma mediante H08 bloqueada por AUD-01**. |
| [H06](../h06-actividades-notificaciones.md) | Actividades sobre obligaciones; adicionales/internas, filtros, asignación, avisos, resumen, claims, intentos, receipts y conciliación. | SQL H06/unitarias nuevos; CAP-01 reproducida con 12.000 obligaciones. [Circuito funcional previo](h06.md) y [proveedor manual recibido](whatsapp-ti.md). | Implementado con **AUD-02 abierta**. OBS-01 afecta al JSON local. Canal manual no acredita digest productivo completo. |
| [H07](../h07-supervision-reportes.md) | Agregaciones comunes, filtros intersectados, historia autorizada, exportación completa/cancelable, auditoría e indicadores separados. | SQL H07/unitarias nuevos. [Métricas y regresión previas](aceptacion-funcional-docker-h08.md), incluidas correcciones REV-01–05. | Implementado; sin hallazgos nuevos. P95 y capacidad del entorno objetivo no se midieron nuevamente. |
| [H08](../h08-preparacion-produccion.md) | RLS/privilegios/sesiones, Auth administrativo, Storage/Realtime privado, rate limits, recuperación, monitor y workflows operativos. | SQL H08, 28 comprobaciones API, inventario de esquema y build/bundle nuevos. Recuperación y publicación sustentadas en [evidencia anterior](h08.md). | **Abierto**: AUD-01/AUD-03, validación integral y condiciones operativas de la sección siguiente. |

## 4. Reglas y conservación comprobadas

- Arquitectura verificada: tipos de aplicación en archivos dedicados, archivos con componentes de hasta 170 líneas, sin ciclos detectados, fronteras de servidor y Tailwind. ESLint aplica además imports, límites de anidación y restricciones de dependencia de componentes compartidos.
- Las rutas revisadas corresponden al inventario de navegación. El build mantiene Proxy y **cuatro Route Handlers**: tres de Auth Admin y uno de receipts; las operaciones habituales utilizan Supabase directo.
- Esquema Docker: **64 migraciones**, **29 tablas públicas**, todas con RLS; **cero FK públicas con borrado en cascada**.
- Las **12 tablas administrables** tienen `deleted_at`, `deleted_by` y `deletion_reason`, conforme al diccionario: estudios, perfiles, membresías, empresas, roles, relaciones de permisos, concesiones/overrides, configuración por módulo, trabajadores, tipos y reglas.
- No hay privilegios públicos de INSERT/UPDATE/DELETE/TRUNCATE para `anon`/`authenticated`. Las vistas públicas `h02_users` y `h03_obligation_summary` son `security_invoker`.
- Las suites revisan integridad, unicidad, historia, estados, permisos, reintentos y conservación. Seguridad API comprueba acceso directo y sesiones; el ocultamiento de controles no se utilizó como frontera.
- Unitarias de interacción y exportación verifican bloqueo de dobles acciones, feedback de errores, recuperación y cancelación al cambiar contexto. No se repitió toda la revisión visual de cada formulario.

## 5. Verificaciones ejecutadas el 19/10

| Verificación | Resultado nuevo |
|---|---|
| `corepack yarn typecheck` | Correcto; 13,82 s. |
| `corepack yarn lint` | Correcto; 57,91 s. |
| `corepack yarn check:architecture` | Correcto; 72,47 s. |
| `corepack yarn test --maxWorkers=1 --no-file-parallelism` | **256 pruebas, 33 archivos**, correctos; Vitest 51,01 s. |
| `supabase test db --local` | **7 suites, 78 casos pgTAP**, correctos; 129 s. Sin timeout Data API impuesto por el runner. |
| `supabase db lint --local --schema public,private --level error --fail-on error` | Sin errores. |
| `corepack yarn test:h08:live` | **28 comprobaciones**, correctas; 27,84 s, solo Docker. |
| `corepack yarn build` | Correcto; 28,01 s; 19 entradas estáticas, cuatro API routes y Proxy. |
| `corepack yarn check:bundle` | Correcto con los secretos locales configurados; 0,98 s. No contradice AUD-04. |
| Escaneo de valores privados configurados | 658 archivos candidatos contrastados con 18 valores privados, sin coincidencias. No acredita secretos desconocidos del entorno. |
| Enlaces del informe y del índice | 80 destinos locales y sus anclas Markdown comprobados, sin errores. |
| Reproducción AUD-01 | Defecto confirmado; tick no avanza, motores con ID correcto sí; rollback. |
| Reproducción AUD-02 | Defecto confirmado; SQLSTATE 57014 con timeout 8 s y fuente masiva activa; rollback. |
| Reproducción AUD-03 | Defecto confirmado; monitor retorna 0 con jobs exigibles ausentes; respuesta simulada, sin red. |
| Reproducción AUD-04 | Defecto confirmado; verificador falla sin entorno antes de inspeccionar recursos. |

Docker estaba apagado al iniciar; se abrió Docker Desktop y se usaron los volúmenes existentes. No se reinició ni detuvo ningún contenedor de otro proyecto. Para limitar el consumo de memoria, las pruebas unitarias se ejecutaron con un worker y el build con dos; no se cambiaron dependencias ni configuración del producto.

Los logs/reproducciones se conservan en `test-results/auditoria-20261019-*`, ignorados por Git. Los resultados esperados de fallo no se contabilizan como suites satisfactorias. El primer intento del simulador del monitor necesitó corregir una ruta ESM de Windows en el arnés temporal; el resultado citado corresponde a su ejecución completa posterior.

### Evidencias anteriores que no se reejecutaron

La [aceptación funcional Docker del 18/10](aceptacion-funcional-docker-h08.md) contiene los recorridos API H02–H07, revisión móvil/teclado, PDF/Excel y mediciones de capacidad. La restauración aislada y el despliegue Cloud/Vercel se documentaron en [H08](h08.md). El [envío manual recibido](whatsapp-ti.md) fue confirmado el 19/10 por el usuario.

Esta auditoría no repite todos esos recorridos, un reset desde base vacía, un nuevo ensayo de recuperación, una publicación Vercel/Cloud ni una inspección de la versión publicada actual de n8n. No atribuye sus resultados históricos a una ejecución nueva. La muestra H07 de lecturas con P95 final menor de dos segundos fue de un caller; no acredita concurrencia multiusuario ni capacidad productiva.

## 6. Pendientes operativos de H08

Los siguientes puntos ya estaban reconocidos en el [registro de cierre](cierre-hitos.md#pendientes-para-cierre-productivo). No equivalen todos a código faltante, pero impiden aceptar H08 como cerrado:

| Condición | Evidencia disponible | Falta para cerrar |
|---|---|---|
| WhatsApp de punta a punta | Proveedor TI acepta un mensaje manual y usuario confirma recepción. Workflow con contratos/claim/receipt implementados. | Digest con datos reales autorizados → n8n → proveedor → receipt; replay y conciliación productivos. No fabricar obligaciones Cloud para demostrarlo. |
| Automatización | Ejecutores, configuración y funciones existentes; jobs productivos de generación/WhatsApp se mantuvieron detenidos en la evidencia anterior. | Corregir AUD-01/AUD-02; habilitar mediante el procedimiento autorizado y observar ejecución, progreso y horario Lima sin navegador. |
| Monitor permanente | Workflow/panel presentes. | Corregir AUD-03, configurar ejecutor/variables, destinatario responsable y probar recepción/atención de una alerta. |
| Copias y retención | Copia Cloud cifrada y restauración aislada registradas. Ensayo Docker separado con bytes de PDF. | Ejecutor permanente, retención efectiva, custodia de claves y comprobación de RPO/RTO con volumen representativo. |
| Independencia de respaldo | El usuario eligió provisionalmente Storage privado del mismo Supabase. | Es una excepción temporal aceptada: conserva riesgo común de pérdida del proyecto. No se presenta como destino independiente ni se reabre esa decisión como si faltara permiso. |
| Empresas y piloto | Recorridos por perfil demostrados con datos locales; administrador real creado. | Configuración autorizada de empresas/reglas/responsables, piloto real por perfiles y aceptación formal. |
| Capacidad y versión objetivo | Mediciones locales y evidencia previa de Vercel Ready. | Registrar versión desplegada aceptada, medir entorno objetivo y concurrencia pertinente; cerrar CAP-01 y objetivos operativos. |

## 7. Orden de remediación y aceptación

1. **AUD-01:** corregir el contrato del programador y probar avance real antes de sustituir los jobs anteriores.
2. **AUD-02 / CAP-01:** acotar avisos y verificar la carga de referencia con el timeout real e idempotencia.
3. **AUD-03 y AUD-04:** hacer fiables las alertas y la validación de checkout limpio; añadir regresiones que detecten ambos fallos.
4. **OBS-01:** reconciliar el JSON de importación con TI antes de cualquier reimportación/publicación.
5. Completar la prueba real del digest/receipt, configuración permanente de jobs/monitor/copias y aceptación del piloto. Conservar la excepción temporal de respaldo y documentar sus objetivos efectivos.

**Condición de cierre:** volver a ejecutar las pruebas de los defectos corregidos y la regresión afectada, registrar publicación compatible y aceptación de producto. Los checks generales en verde no sustituyen las pruebas de los casos fallidos ni las condiciones operativas pendientes. H02–H07 no necesitan reescribirse: la remediación se concentra en estos defectos y en el cierre de H08.
