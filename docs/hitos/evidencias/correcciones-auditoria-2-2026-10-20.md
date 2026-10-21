# Correcciones de la segunda auditoría integral

**Fecha:** 20/10/2026, America/Lima. Seguimiento de la [auditoría sobre `957b321`](auditoria-integral-hitos-2026-10-20.md), registrada en `581dae3`. Se conserva la modificación previa y ajena de `revalidacion-base-h08.md`. Los timestamps del CLI corresponden a UTC.

## Cambios y criterios de cierre

| Observación | Corrección | Evidencia |
|---|---|---|
| AUD2-01 · P1 | Preparación por estudio y destinatario con cursor durable, cinco destinatarios por defecto, máximo diez. Permisos calculados una vez por empresa/módulo; solo se agregan obligaciones del destinatario. Caducidad antigua limitada a 100 filas por llamada. Fallos de preparación no bloquean el despacho de otros resúmenes durables. | 100 usuarios, 12.000 obligaciones, 20 llamadas reales Data API con dos clientes; replay sin cambios. SQL con recuperación, fallos parciales, rotación, caducidad, aislamiento y contactos corregidos. H06 completo con proveedor simulado. |
| AUD2-02 · P2 | El panel reutiliza el evaluador del monitor: alerta de fallos, falta de avance y jobs ausentes. Presenta contador de automatización y avance de generación, avisos y preparación. Producción es el modo predeterminado; prepublicación requiere selección explícita. | Cuatro pruebas del componente real con alertas accesibles; regresión de salud y revisión de la aplicación local. |
| OBS2-01 · P3 | La condición de cierre de H08 distingue CAP-01 corregida de esta segunda remediación. Enlaza evidencias y conserva los pendientes productivos. | [Condición vigente](../h08-preparacion-produccion.md#10-condición-para-piloto-y-cierre), [índice](../README.md) y [operación](../../operacion-produccion.md#programación-y-monitoreo). |

## Migraciones y compatibilidad

Se crearon con Supabase CLI y se aplicaron en Docker, sin editar migraciones ya aplicadas:

1. [20261021015205_h06_bounded_digest_preparation.sql](../../../supabase/migrations/20261021015205_h06_bounded_digest_preparation.sql): cursor técnico privado, índices de candidatos, agregación y elegibilidad compartidas, preparación acotada.
2. [20261021015206_h08_digest_health_progress.sql](../../../supabase/migrations/20261021015206_h08_digest_health_progress.sql): errores y progreso de preparación en el diagnóstico autorizado.
3. [20261021020201_h08_digest_readiness_observation.sql](../../../supabase/migrations/20261021020201_h08_digest_readiness_observation.sql): detecta preparación que todavía no comenzó y caducidad pendiente aunque no exista cursor de destinatario.

`h06_prepare_digests` conserva sus tres argumentos anteriores, con dos opcionales nuevos: `p_organization_id` y `p_batch_size`. La firma PostgreSQL nueva reemplaza la anterior para evitar sobrecargas ambiguas. Los llamadores existentes de uno a tres argumentos siguen siendo válidos; tipos públicos regenerados desde Docker. Solo servicio puede ejecutar esta operación. No hay nuevas API routes, tablas de tareas, dependencias ni variables de Vercel.

`private.h06_digest_progress` tiene RLS y ningún acceso directo de navegador. Es estado técnico reconstruible, no historial documental. La rotación por último intento y el cursor por fecha/UUID permiten continuar con otro proceso. Al completar una vuelta se puede recoger un destinatario nuevo o un contacto corregido; no se reinicia un payload diario existente. Un fallo por destinatario queda registrado, conserva sus vecinos exitosos y se recupera en una vuelta posterior.

Caducar pendientes antiguos no modifica su contenido; los resúmenes aceptados o de resultado desconocido mantienen las reservas de observaciones. La comprobación del payload congelado usa los mismos hechos autorizados de la preparación. No se omiten retirada de permisos, ancestros, ciclos recibidos, contacto vigente ni correcciones pendientes.

La función [notification-operations](../../../supabase/functions/notification-operations/run.ts) intenta despachar resúmenes durables aunque una página de avisos o preparación falle. Comunica degradación HTTP 503 en ese caso; no declara una ejecución íntegramente exitosa. Si el despacho mismo falla, conserva el error explícito.

## Capacidad y reanudación comprobadas

Comando reproducible: `yarn test:digests:capacity`. El ejecutor rechaza destinos remotos **antes de leer credenciales de integración, crear clientes o ejecutar SQL**. Usa exclusivamente el contenedor `supabase_db_tax-skill` y API loopback 54331.

Se creó un estudio de fixtures separado con 30 empresas, 100 usuarios, 1.000 trabajadores y 12.000 obligaciones, con concesiones `view`/`upload` y contactos sintéticos. Durante la medición permaneció activo, junto con la fuente original de 12.000 obligaciones sin responsable de CAP-01. Se alternaron dos clientes SDK; cada RPC confirmó su propia transacción, por lo que la continuidad no dependía de memoria del cliente.

| Medida | Primera ejecución | Repetición tras refactorizar el ejecutor |
|---|---|---|
| Preparados / destinatarios | 100 / 100 | 100 / 100 |
| Páginas de cinco destinatarios | 20 | 20 |
| P95 por llamada | 1.114,40 ms | 567,48 ms |
| Máximo por llamada | 1.115,63 ms | 624,40 ms |
| Presupuesto Data API | 8.000 ms | 8.000 ms |
| Replay | Cero resúmenes nuevos; payloads idénticos. | Cero resúmenes nuevos; payloads idénticos. |
| Despachos externos del ejecutor | 0 | 0 |

La reproducción transaccional adicional preparó también los 100 resúmenes no vacíos; el control de elegibilidad de 50 resúmenes tardó **5.172,14 ms**, dentro del mismo límite. Todo ese ensayo se revirtió. No se cambia la capacidad declarada del proveedor ni se acredita concurrencia productiva.

El ejecutor API pausa exclusivamente el Cron local de H06 durante la medición y lo restablece en `finally`. **Después de las aserciones**, pausa solo su nuevo estudio de fixtures para impedir envíos posteriores del laboratorio; conserva todas sus filas y resúmenes. No desactiva ni altera la fuente CAP-01 original para obtener resultados favorables. No se borró historia.

## Panel y experiencia de operación

Los diagnósticos usan mensajes en español y `role=alert`, además de datos de avance y estado, sin depender del color. El snapshot indica cuándo se consultó. Actualizar estado conserva loading contextual y bloqueo del mismo botón durante la consulta; la selección de modo es instantánea y no simula trabajo asíncrono.

«Prepublicación declarada» modifica únicamente la evaluación de esa pantalla: no persiste configuración ni habilita/detiene procesos. Mantiene visibles los errores funcionales y no se presenta como producción saludable. El monitor permanente conserva su configuración privada `H08_OPERATION_MODE`. No se agregó una variable pública ni se envió ningún secreto al cliente.

Los componentes siguen Atomic Design, Tailwind, tipos separados y el límite de 170 líneas. Las pruebas comparan estados de fallo con un snapshot sano: el caso que antes generaba el mismo HTML ahora produce diagnósticos visibles.

En la aplicación Docker se verificaron login del administrador ficticio, acceso a Operación, selección explícita de prepublicación, retorno por teclado al modo productivo y actualización del snapshot. Las capturas de [producción esperada](capturas/auditoria-2/operacion-produccion-local.png) y [prepublicación](capturas/auditoria-2/operacion-prepublicacion-local.png) muestran incidencias deliberadas del laboratorio; no son capturas de Cloud ni una declaración de nuevos defectos. Los errores funcionales permanecieron visibles al cambiar de modo. No se atribuye a esta revisión una nueva aceptación móvil integral.

## Verificaciones

Logs y resultados privados: `test-results/correcciones-auditoria-2/`, ignorado por Git.

| Verificación | Resultado |
|---|---|
| `yarn verify` | TypeScript, ESLint, arquitectura y **286 unitarias / 38 archivos** aprobados; 169,31 s. Se corrigieron imports y anidación detectados durante la preparación. |
| Regresión específica de panel | Cuatro casos aprobados después de revisar los textos finales. |
| `supabase test db --local` | **123 casos / nueve suites**, 129 s. La nueva suite aporta 25 casos. El primer intento detectó un periodo faltante del fixture y se corrigió antes de la ejecución integral. |
| `yarn db:lint` | `public,private` sin errores. |
| Build y bundle | `yarn build` final aprobado en **23,05 s**, cuatro API routes, Proxy y 19 entradas; `yarn check:bundle` aprobado. |
| H06 live | **170 comprobaciones**, 81,41 s: archivos, Realtime, 429/500, contenido estable, callback/replay, reinicio real de n8n Docker, ambigüedad y Cron. |
| Seguridad H08 | **28 comprobaciones**, 34,23 s, solo Docker. |
| Recuperación con 71 migraciones | Copia incremental/descarga y restauración aprobadas; **13 huellas, un archivo de 881 bytes**, sesiones revocadas, jobs detenidos, login nuevo y restricciones de descarga. Suite 145,58 s; recuperación 68,99 s. Dos proyectos Docker aislados; no acredita RTO productivo. |
| CI remoto del código corregido | [Ejecución 39532135186](https://github.com/taxskilproject-tech/taxskill/actions/runs/39532135186), commit `31a6613`: instalación frozen, `yarn verify`, build y bundle completados correctamente. No se proporcionaron secretos productivos a CI. |
| Repositorio y documentación | 691 archivos candidatos contrastados con 18 valores privados configurados, sin coincidencias. **50 Markdown / 637 enlaces locales y anclas**, sin fallos; no verifica enlaces externos ni secretos desconocidos. |

## Publicación y límites

**Publicado en Supabase Cloud:** las tres migraciones y `notification-operations` **v3 ACTIVE**, conservando autenticación propia y `verify_jwt=false`. `document-operations` permanece **v5**, sin cambios. Un POST anónimo al notificador devuelve **401 / UNAUTHENTICATED**; no se ejecutó despacho productivo autenticado.

El dry-run remoto incluyó exclusivamente esas tres migraciones, sin seeds ni roles. La línea base y el contraste posterior se obtuvieron con hashes/contadores calculados dentro de PostgreSQL; no se descargaron filas productivas. Resultado: **71 migraciones, 29 tablas públicas con RLS, 13 huellas históricas idénticas y jobs sin cambios**. Solo sigue activo el cleanup preexistente. Generación y WhatsApp productivos continúan detenidos.

La conexión GitHub se recuperó y se subieron la auditoría y el código corregido, commit **`31a6613413c1b44b13fff5e60fc94d799ebe6f28`**. El proveedor confirmó **Production / success, Deployment has completed** para ese commit: [deployment Vercel](https://vercel.com/taxskilproject-6139/taxskill/Dsc25ijnWC7LYiwWiAoEZGt5HQS5), registro GitHub `7215958587`. El [dominio público](https://taxskill.vercel.app/login) respondió HTTP 200. Esta verificación acredita publicación, no sustituye un nuevo piloto autenticado productivo; las capturas de interfaz corresponden a Docker.

Esta remediación no cierra el piloto ni la operación permanente de H08. Siguen separados el digest/receipt productivo completo, activación/observación de jobs, ejecutores permanentes de copias/monitor, retención y aceptación por perfiles. La copia temporal en el mismo Supabase es la decisión vigente del usuario. No hubo fixtures en Cloud, nuevos mensajes WhatsApp reales ni cambios de Auth.
