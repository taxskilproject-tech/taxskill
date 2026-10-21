# Correcciones de la auditoría integral

**Fecha de actualización:** 20/10/2026, America/Lima. Trabajo iniciado el 19/10 sobre `ff08a51`. Este registro complementa la [auditoría original](auditoria-integral-hitos-2026-10-19.md), sin sustituir sus resultados históricos ni declarar cerrado el piloto H08.

## 1. Cambios implementados

| Observación | Corrección | Regresión |
|---|---|---|
| AUD-01 · programador | Un estudio por tick, seleccionado por último intento. Se pasan IDs de regla y etapa a H04/H05. Hasta 100 destinos por motor; progreso/error persistidos y rotación entre estudios. Un `pending` laboral con `error_code` sigue siendo fallo. | Generación por estudio, reglas internas, ingreso/cese/reconciliación, idempotencia, fallo recuperable y siguiente turno de otro estudio. |
| AUD-02 / CAP-01 · avisos | RPC paginada con cursor por estudio/fecha, 100 obligaciones por defecto y máximo 250. Omite incidencias estables antes de validarlas nuevamente. Fallos por recurso quedan visibles hasta recuperar o quedar no operativo. Edge intenta despachar otros resúmenes elegibles aunque falle la página de avisos. | Límites de página, continuidad, 12.000 obligaciones activas, evento único, repetición sin reprocesamiento y aislamiento del despacho ante fallos. |
| AUD-03 · monitor | Inventario obligatorio de generación, notificaciones y cleanup; detecta ausentes/desactivados/atrasados y falta de avance funcional. `prepublication` es una suspensión explícita que reporta `paused`. | Cleanup solo, job ausente, desactivado, nunca iniciado, fallido, atrasado, tiempo inválido, ausencia de avance y suspensión deliberada. |
| AUD-04 · CI | Variables sintéticas de control declaradas en el workflow. Se conserva el rechazo de filtraciones sin proporcionar secretos productivos a PR. Verificador de archivos reutilizable. | Ejecución real del verificador sin `.env`; filtración de cada uno de cinco canarios debe fallar sin imprimir el valor. |
| OBS-01 · TI | Copia de importación reconciliada con `/message/sendText/%20TI`, conservando el espacio del nombre exacto autorizado. | JSON contiene endpoint exacto y referencia de credencial, sin clave incrustada. No implica una nueva publicación en n8n productivo. |

El cambio conserva las 29 tablas públicas y sus contratos de negocio, consultas habituales directas a Supabase, cuatro API routes, Atomic Design, Proxy, soft delete e historial. No introduce tablas de tareas. Los dos registros nuevos de progreso son privados, tienen RLS y no son accesibles desde el navegador.

## 2. Paquete de migraciones y Edge

Se crearon con Supabase CLI, sin editar ni revertir migraciones anteriores:

1. [20261019234401_h08_bounded_generation_scheduler.sql](../../../supabase/migrations/20261019234401_h08_bounded_generation_scheduler.sql).
2. [20261019234402_h06_bounded_deadline_processing.sql](../../../supabase/migrations/20261019234402_h06_bounded_deadline_processing.sql).
3. [20261019234404_h08_automation_health.sql](../../../supabase/migrations/20261019234404_h08_automation_health.sql).
4. [20261019235626_h08_automation_recovery_guards.sql](../../../supabase/migrations/20261019235626_h08_automation_recovery_guards.sql).

La cuarta migración respeta el contrato H05 existente: un error recuperable devuelve `pending` acompañado de `error_code`. Impide contabilizarlo como avance y permite resolver una incidencia cuyo recurso dejó de ser operativo. Se conserva cada versión ya aplicada durante el desarrollo.

La función [notification-operations](../../../supabase/functions/notification-operations/index.ts) delega la coordinación en un servicio separado y comunica degradación sin detener indiscriminadamente otros resúmenes. Mantiene autenticación propia y secretos existentes. Los tipos públicos se regeneraron desde Docker; solo cambian los parámetros opcionales del RPC de avisos.

La opción TypeScript `allowImportingTsExtensions` acompaña `noEmit=true` para probar directamente módulos compartidos con Deno; no elimina tipado estricto ni incorpora secretos en cliente.

## 3. Capacidad comprobada en Docker

El estudio H07 permaneció **activo**, con **12.000 obligaciones sin responsable**. Se alternaron dos clientes SDK entre páginas, de modo que el avance dependiera del cursor de PostgreSQL y no de memoria del proceso.

| Medida | Resultado del 19/10 |
|---|---|
| Páginas | 120, de 100 obligaciones. |
| Obligaciones procesadas | 12.000. |
| P95 por llamada | 310,74 ms. |
| Máximo por llamada | 408,18 ms. |
| Presupuesto efectivo Data API | 8.000 ms. |
| Incidencias al terminar | 12.000. |
| Repetición posterior | Cero obligaciones reprocesadas; cero eventos duplicados. |

Antes de la corrección, el RPC agotaba ocho segundos y terminaba con SQLSTATE 57014. El resultado actual acredita la corrección de ese escenario local; no equivale a capacidad concurrente ni aceptación del entorno productivo.

Comando reproducible, con rechazo de destinos remotos antes de crear clientes o efectuar solicitudes:

```powershell
yarn test:automation:capacity
```

Requiere la fuente local H07 existente. No la desactiva ni borra historial; conserva los eventos ficticios exclusivamente en Docker.

## 4. Verificaciones y límites

Resultados ejecutados el 19/10, conservados en `test-results/correcciones-auditoria-*`:

- TypeScript, ESLint y arquitectura aprobados. Se corrigieron imports y anidación detectados durante la primera ejecución de lint.
- **279 pruebas unitarias en 37 archivos** aprobadas; incluyen 23 regresiones nuevas de monitor, CI, workflow y despacho.
- Ocho suites SQL: **95 casos** aprobados antes del último ajuste. La suite adicional de automatización se repitió después y aprobó **20 casos**, tres más que en la ejecución anterior.
- Lint de `public,private` sin errores tras las cuatro migraciones.
- Build con Yarn aprobado en **38,43 s**; 19 entradas estáticas, cuatro API routes y Proxy. Verificación del bundle aprobada.
- Las cuatro migraciones están aplicadas en Docker; total local **68**.

No se atribuyen estas ejecuciones a una fecha posterior. El **20/10** se repitió la integración H06 completa: **170 comprobaciones aprobadas en 128,18 s**, con reintentos 429/500, payload estable, pérdida de respuesta, reinicio real de n8n, replay sin segundo envío, conciliación y ejecución autónoma mediante Cron local. La fuente masiva permaneció activa. Después pasaron **28 comprobaciones de seguridad H08**.

El primer intento del 19/10 había quedado `accepted` porque el workflow local conservaba un callback a 3001. Se regeneró y publicó **solo en n8n Docker** con callback a 4001, preservando sus credenciales ficticias. Se conserva ese fallo junto con la repetición satisfactoria; no se modificó el workflow n8n productivo ni se enviaron WhatsApp reales.

La regresión SQL integral final del **20/10** aprobó **98 casos en ocho suites, 93 s**, sobre las cuatro migraciones, y el lint posterior no encontró errores. El intento de pausar Cron mediante UPDATE directo fue rechazado por permisos de `cron.job`; no cambió su estado y las suites finalizaron con la programación local conservada.

## 5. Estado de publicación

**Aplicado en Cloud el 20/10:** las cuatro migraciones y la versión corregida de `notification-operations`. El proyecto quedó en **68 migraciones y 29 tablas públicas con RLS**. No se modificó Auth ni la función de documentos.

La línea base Cloud del 19/10 se obtuvo mediante un único SELECT agregado: **13 hashes calculados dentro de PostgreSQL**, 64 migraciones, 29 tablas públicas con RLS y únicamente el cleanup preexistente activo. No se descargaron filas productivas. La propuesta inicial de calcular hashes descargando filas fue rechazada automáticamente y no se ejecutó; se sustituyó por esta comprobación agregada, autorizada por la revisión.

El dry-run final incluyó exclusivamente las cuatro versiones revisadas, sin seeds ni roles. Se repitió la línea base agregada el 20/10 y se contrastó tras la publicación: **13 huellas idénticas y jobs sin cambios**, conservando únicamente `h03-staging-cleanup` activo. Generación y WhatsApp productivos permanecen detenidos. No se insertaron fixtures ni se modificaron documentos históricos.

`notification-operations` quedó **ACTIVE, versión 2**, con autenticación propia y `verify_jwt=false` conservados. Un POST sin credenciales respondió **401 / UNAUTHENTICATED**. `document-operations` continúa en versión 5, sin cambios. No se ejecutó un despacho autenticado contra el proveedor real durante esta publicación.

## 6. Pendientes que no se cierran con estas correcciones

H08 conserva los pendientes del [registro de cierre](cierre-hitos.md#pendientes-para-cierre-productivo): digest/receipt productivo completo, activación y observación de jobs, monitor permanente, programación/retención de copias y piloto real por perfiles. El respaldo provisional en Storage del mismo Supabase sigue siendo una decisión explícita del usuario; no se presenta como independencia externa.

No se añadieron datos ficticios a Cloud, no se enviaron nuevos WhatsApp reales y no se borraron registros para conseguir pruebas favorables. La recepción manual previa de TI sigue acreditada por su [evidencia específica](whatsapp-ti.md).
