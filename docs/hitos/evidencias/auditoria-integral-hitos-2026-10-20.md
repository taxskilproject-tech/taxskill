# Auditoría integral H01–H08 después de las correcciones

**Fecha:** 20/10/2026, America/Lima. **Base revisada:** `957b32115f15caacb5102b116a06be467ced7f9f`. Se preservó la modificación previa de `revalidacion-base-h08.md`, ajena a esta auditoría. Fuentes: [reglas](../../../.agents/rules.md), [índice](../README.md), los ocho hitos, [diseño](../../diseno-tecnico.md), [diccionario](../../tablas-db.md), contratos y evidencias del repositorio.

## Dictamen

H01–H05 y H07 tienen implementación y regresiones técnicas satisfactorias dentro del alcance comprobado. H06 conserva un defecto de capacidad en la preparación del resumen diario. H08 sigue abierto por ese defecto, una omisión del panel operativo y las condiciones productivas ya registradas. No procede afirmar que los ocho hitos estén completamente cerrados.

Las correcciones AUD-01–AUD-04 y OBS-01 de la [auditoría anterior](auditoria-integral-hitos-2026-10-19.md) permanecen en el código y pasaron sus regresiones. Los hallazgos siguientes corresponden a caminos adicionales; **CAP-01 del barrido de avisos continúa corregida**. No se revierte su [evidencia de remediación](correcciones-auditoria-2026-10-20.md).

## Hallazgos confirmados

### AUD2-01 · P1 · Preparar resúmenes todavía puede detener todo el despacho

**Fuentes:** [h06_prepare_digests](../../../supabase/migrations/20261017001200_h06_digest_persistence_and_preparation.sql), bucle de destinatarios y cálculo por usuario; [h06_digest_items vigente](../../../supabase/migrations/20261017001800_h06_correction_event_cycle.sql); [runNotificationCycle](../../../supabase/functions/notification-operations/run.ts).

La preparación recorre todos los destinatarios en una sola transacción, sin lote ni cursor. Para cada uno recalcula documentos y permisos. El servicio Edge ejecuta la preparación antes de despachar; un error en esta fase lanza `DEPENDENCY_UNAVAILABLE` e impide despachar incluso resúmenes durables de otros usuarios. El aislamiento ya añadido al fallo del barrido de avisos no cubre este paso.

**Reproducción nueva:** referencia H07 activa, con 30 empresas, 100 usuarios, 1.000 trabajadores y 12.000 obligaciones. Dentro de una transacción local se asignaron las obligaciones entre los 100 usuarios, se habilitaron concesiones reales `view`/`upload` y teléfonos sintéticos válidos. Se llamó a `h06_prepare_digests` en ventana de resumen, con `statement_timeout=8s`. Dos ejecuciones fallaron por timeout a **8.001,10 ms** y **8.000,97 ms**, dentro de `has_permission` → `h06_visible` → `h06_digest_items`. No basta con marcar los usuarios como administradores: la reproducción final contiene permisos y asignaciones explícitos.

Al terminar ambas conexiones se revirtió la transacción completa. El inventario posterior confirma **12.000 obligaciones y cero responsables asignados** en la fuente original. No se llamó al webhook ni al proveedor; no quedaron contactos, roles o concesiones de la reproducción. Los ocho segundos coinciden con la configuración local de `authenticated` y `authenticator`.

**Impacto:** H06-RF14/RT07 y H08-RF10/RF14. La caída de un lote vuelve a bloquear la salida global y se pierde todo avance de preparación de esa transacción.

**Corrección requerida:** paginar preparación por estudio/destinatario con progreso durable y consultas eficientes; aislar un fallo de preparación del despacho de otros resúmenes listos. Mantener unicidad diaria, payload congelado, elegibilidad, privacidad e idempotencia.

**Criterio de cierre:** completar la referencia con responsables válidos mediante llamadas por debajo del presupuesto real, interrumpir/reanudar entre páginas y demostrar ausencia de duplicados, mensajes vacíos y bloqueo de otros destinatarios. Ejecutar junto con la fuente de incidencias de CAP-01, sin desactivar estudios para obtener un resultado favorable.

### AUD2-02 · P2 · El panel administrativo omite los nuevos errores de automatización

**Fuentes:** [OperationsStatus](../../../src/features/operations/components/operations-status.tsx), [métricas visibles](../../../src/features/operations/constants/operations.ts) y [evaluador operativo](../../../src/features/operations/utils/evaluate-operations-health.ts).

El contrato ya admite `automation_failures`, `generation_pending_since` y `deadline_pending_since`, y el monitor de servidor los evalúa. La pantalla solo presenta las seis métricas anteriores, respaldo y los jobs devueltos. No muestra estos errores, falta de avance ni jobs esperados ausentes. Un Cron puede figurar «Activo · Correcta» mientras la generación de negocio está fallando.

**Reproducción sin red:** renderizado del componente real con un snapshot sano y otro con dos fallos de automatización y cinco horas sin progreso. El evaluador produce `AUTOMATION_FAILED`, `GENERATION_NO_PROGRESS` y `DEADLINES_NO_PROGRESS`; **ambos componentes generan exactamente el mismo HTML y cero alertas**. No se atribuye a esta prueba una revisión visual móvil.

**Impacto:** H08-RF12 y H08-RT14. El administrador que consulta Configuración no dispone del mismo diagnóstico que el ejecutor privado; el monitor permanente sigue pendiente de activación.

**Corrección requerida:** reutilizar el diagnóstico común en presentación, añadir mensajes accionables, mostrar avance/incidencias y diferenciar procesos ausentes de una suspensión de prepublicación explícita. No introducir configuración secreta en el navegador.

**Criterio de cierre:** pruebas con fallo laboral recuperable, barrido fallido, ausencia de progreso y job ausente; cada condición visible y distinguible de operación saludable o suspensión deliberada, con accesibilidad y actualización correctas.

### OBS2-01 · P3 · El estado vigente de H08 conserva una condición desactualizada

La sección «Condición para piloto y cierre» de [H08](../h08-preparacion-produccion.md#10-condición-para-piloto-y-cierre) aún dice «CAP-01 sigue abierta», aunque el índice y la remediación del 20/10 registran su corrección y publicación. Algunas cifras de las cabeceras son históricas y están fechadas; se conservan como tales. La condición de cierre requiere actualización para distinguir CAP-01 resuelta de AUD2-01 pendiente. No es motivo para marcar el resto de H08 como cerrado.

## Cobertura por hito

| Hito | Contraste y evidencia nueva | Resultado |
|---|---|---|
| [H01](../h01-preparacion-tecnica.md) | Versiones, App Router, Proxy, adaptadores, contratos, Atomic Design, Yarn, tipos/lint/arquitectura/build/bundle. | Conforme técnicamente dentro del alcance revisado. |
| [H02](../h02-acceso-empresas.md) | SQL y suite HTTP: cuentas, perfiles, reintentos, CSRF y sesiones. Permisos directos contrastados además por H08. | Conforme; aceptación formal de producto independiente. |
| [H03](../h03-primer-recorrido-documental.md) | SQL y **59 comprobaciones**: TUS, validación real, versiones, revisión parcial, corrección, reapertura, descarga y conservación. | Conforme. |
| [H04](../h04-motor-documental.md) | SQL, calendario unitario y **78 comprobaciones**: diez frecuencias, snapshots, concurrencia y generación real por Cron sin navegador. Regresiones del tick H08 incluidas. | Conforme; automatización Cloud aún detenida. |
| [H05](../h05-areas-documentales.md) | SQL y **165 comprobaciones**, incluidos tres recorridos completos de archivos; ingreso, cese, reingreso e historia laboral. | Conforme. |
| [H06](../h06-actividades-notificaciones.md) | SQL, contratos/reintentos unitarios, integración n8n Docker y reproducción de preparación masiva. | AUD2-01 pendiente. El canal productivo completo sigue sujeto al piloto. |
| [H07](../h07-supervision-reportes.md) | SQL, búsqueda/auditoría, 12.000 obligaciones, exportaciones Excel/PDF de 1.000 filas, fingerprints y controles de cancelación/conciliación. | Recorrido técnico correcto; medición de rendimiento detallada abajo. |
| [H08](../h08-preparacion-produccion.md) | RLS/ACL, **28 comprobaciones API**, recuperación nueva con 68 migraciones y objeto real sintético, inventario Cloud solo lectura. | AUD2-02 y pendientes operativos/piloto abiertos. |

## Verificaciones de esta ejecución

Los logs privados se conservan en `test-results/auditoria-posterior-20261020/`, ignorado por Git. Se conserva también el primer fallo de cada comprobación; no se convierte una ejecución fallida en éxito.

| Verificación | Resultado |
|---|---|
| `yarn verify` | TypeScript, ESLint, arquitectura y **279 unitarias / 37 archivos** aprobados; 272,47 s. |
| Integración H02–H06 / seguridad H08 | H02 cuentas/perfiles/HTTP correcto; H03 **59**, H04 **78**, H05 **165**, H06 **170** y H08 **28** comprobaciones aprobadas. H06 finalizó en **141,86 s**, con reinicio real de su n8n local, replay, callbacks y Cron. |
| `supabase test db --local` | **98 casos / ocho suites** aprobados; 109 s. |
| `yarn db:lint` | `public,private` sin errores. |
| Tipos generados desde Docker | Coinciden con los versionados, normalizando formato mediante AST. |
| `yarn build` y `yarn check:bundle` | Build aprobado fuera del sandbox en **25,60 s** y bundle sin secretos configurados; 19 entradas y cuatro API routes. El primer build falló al conectar con el subproceso Turbopack; se conserva su log, sin cambios de código ni borrado de `.next`. |
| Recuperación H08 | **68 migraciones**, 13 huellas, un objeto de **881 bytes**, descarga/copia incremental, restore, sesiones revocadas, jobs detenidos, login nuevo y restricciones de descarga aprobados. Suite total **144,50 s**, fase de recuperación **74,52 s**. Dos proyectos Docker nuevos y aislados; no acredita RTO productivo. |
| Esquema local | **29 tablas públicas con RLS**, 12 con metadatos completos de soft delete, cero FK públicas con cascada y cero privilegios de escritura directa de navegador. Ninguna función pública ejecutable por `anon`; ambas vistas públicas `security_invoker`. |
| Secretos en archivos candidatos | **675 archivos / 18 valores privados configurados**, sin coincidencias. No equivale a detectar cualquier secreto desconocido. |
| Documentación | Revisión inicial **48 Markdown / 597 enlaces** y revisión final con este informe **49 Markdown / 621 enlaces locales y anclas**, sin fallos. |

### Rendimiento y laboratorio

La primera medición H07 coincidió con compilación y reproducciones de capacidad: dashboard **2.609,3 ms**, reporte **2.034,0 ms**, documentos **699,9 ms** y auditoría **517,9 ms**, P95 de 20 consultas por recurso. El script terminó correctamente porque registra tiempos y valida resultados, pero **no convierte el objetivo de dos segundos en una aserción**. Esta medición no satisface por sí sola el objetivo y se distingue de la repetición sin carga de compilación.

La repetición sin build ni suites pesadas concurrentes pasó en **72,74 s**, con P95 de **1.159,5 ms** para dashboard, **1.161,2 ms** para reportes, **815,7 ms** para documentos y **507,4 ms** para auditoría, 20 consultas por recurso tras calentamiento. Las exportaciones de 1.000 filas y su auditoría también pasaron. Satisface el objetivo local de dos segundos en esas condiciones; no acredita concurrencia ni capacidad productiva.

La primera ejecución H06 de esta revisión falló por conexión al servidor Next local. Se reinició exclusivamente la aplicación de TaxSkill fuera del sandbox en el puerto ya autorizado **4001**; `/login` respondió 200. No se modificaron credenciales ni workflows productivos para resolverlo.

La aceptación móvil/teclado previa del [18/10](aceptacion-funcional-docker-h08.md) se conserva como histórica. Esta auditoría añade revisión de fuentes de interacción y render del panel, pero no reejecuta visualmente cada formulario en cada perfil/dispositivo. No se comprobó una nueva ejecución remota de GitHub Actions ni un nuevo deployment de Vercel.

## Cloud y límites de la revisión

Solo lectura: **68 migraciones**, **29 tablas públicas con RLS**, `document-operations` **v5 ACTIVE** y `notification-operations` **v2 ACTIVE**, ambas con autenticación propia y `verify_jwt=false` conservado. El inventario conserva las **13 huellas históricas idénticas** a la publicación correctiva. Únicamente `h03-staging-cleanup` figura activo; no se habilitaron generación ni WhatsApp.

Las huellas se calcularon dentro de PostgreSQL y solo se devolvieron hashes/contadores/jobs; no se descargaron filas productivas. No se cambiaron Auth, secretos, esquema, usuarios, archivos o workflow n8n Cloud. No hubo mensajes reales ni fixtures remotos.

## Orden recomendado de remediación y cierre

1. Resolver **AUD2-01** con preparación acotada y despacho aislado, y repetir la referencia con permisos reales y límite de ejecución.
2. Resolver **AUD2-02** y actualizar la condición documental **OBS2-01**, conservando evidencias históricas.
3. Mantener separados los [pendientes operativos](cierre-hitos.md#pendientes-para-cierre-productivo): digest/receipt productivo con datos autorizados, jobs/monitor permanentes, programación/retención de copias y piloto por perfiles. La copia temporal en el mismo Supabase es la decisión vigente del usuario; la independencia externa permanece aplazada.
4. Registrar versión del despliegue y aceptación de producto con capacidad y recuperación del entorno objetivo. Las pruebas técnicas locales no sustituyen esa aceptación.
