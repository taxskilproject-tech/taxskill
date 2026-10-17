# Revisión previa a H08

**Fecha:** 17 de octubre de 2026. **Revisión inicial:** se encontraron tres defectos funcionales de H07, descritos abajo como registro histórico. **Seguimiento:** los tres están corregidos y validados; consultar [cierre de observaciones](h07-correcciones.md). La migración correctiva se publicó con autorización específica: 56 versiones coincidentes y 13 huellas históricas conservadas. H08 y las condiciones de su piloto continúan pendientes.

Fuentes: [reglas del agente](../../../.agents/rules.md), [entornos](../../desarrollo.md), [índice de hitos](../README.md), [requisitos H07](../h07-supervision-reportes.md), [evidencia anterior H07](h07.md), [requisitos H08](../h08-preparacion-produccion.md) y contratos/modelos referenciados por esos documentos.

## 1. Alcance y límites

Se contrastaron los requisitos, estados de cierre y evidencias de H01–H07 con el código y las migraciones actuales, prestando especial atención a las dependencias de H08. Se repitieron las verificaciones estáticas, la compilación, las seis suites SQL y el recorrido de capacidad/exportación H07. Se reprodujeron los casos adicionales descritos abajo.

Todas las pruebas con datos sintéticos se ejecutaron en Supabase local sobre Docker (`127.0.0.1:54331`). Cloud `gzwrqvqofcrdjvzoblaz` se consultó únicamente para inventario, lista de migraciones y lint. Esta revisión no aplicó migraciones, creó fixtures ni modificó datos en Cloud. Tampoco implementó H08 ni corrigió código de producción.

Las capturas, la instalación limpia/actualización histórica y el ensayo de integración n8n de entregas anteriores se consultaron como evidencia histórica; no se presentan como nuevas ejecuciones de esta revisión. No se repitió aquí una revisión visual completa ni una prueba productiva de WhatsApp.

## 2. Defectos confirmados en la revisión inicial

### REV-01 · P2 · Auditoría incompleta al filtrar por empresa o módulo

**Requisito afectado:** H07-RF12, H07-RT02 y CA24. La autorización definitiva de H08 no sustituye esta corrección funcional.

**Ubicación:** [resolución del ámbito de auditoría](../../../supabase/migrations/20261017002100_h07_queries_and_export_audit.sql), función `private.h07_audit`, líneas 22–24 y filtros posteriores.

El visor obtiene empresa/módulo desde los campos del evento, desde una empresa como recurso o desde una obligación. No sigue la relación `deliverables → obligations` ni `document_versions → deliverables → obligations`. Las revisiones de H03 se registran sobre `deliverables` y las descargas sobre `document_versions`, sin rellenar aquellos campos de ámbito. También debe contemplarse el ámbito laboral de `employment_periods`.

**Reproducción local:** se relacionaron los eventos de entregables con sus obligaciones y una empresa activa. Existían **16 eventos**; al consultar `private.h07_audit` como administrador con esa empresa y recurso `deliverables`, el visor devolvió **0**. Los eventos originales siguen conservados. Para usuarios no administradores, el requisito de `effective_module` también excluye esos eventos sin ámbito resuelto, incluso sin filtro de empresa.

**Corrección requerida:** resolver el ámbito a través de los padres del recurso, siempre dentro del mismo estudio y conservando consultas históricas. Revisar todos los tipos de recurso emitidos por las operaciones. No borrar ni reescribir el historial para corregir el visor.

**Cierre verificable:** administrador y supervisor con `audit.view` consultan aprobación, observación, reapertura, descarga y eventos laborales de su empresa/módulo; los filtros concuerdan con los eventos originales y no muestran recursos ajenos. Verificar igualmente recursos internos y padres eliminados conforme al acceso histórico permitido.

### REV-02 · P2 · Enlaces de indicadores usan permisos de otra empresa

**Requisito afectado:** H07-RF09, H07-RF14 y H07-RT02.

**Ubicación:** [ReportMetrics](../../../src/features/reporting/components/report-metrics.tsx), líneas 13–17.

La selección de `/reportes` comprueba si existe cualquier permiso `reports.view` en el contexto. No comprueba si ese permiso corresponde a la empresa/módulo del indicador.

**Reproducción:** una cuenta tiene `view` en empresa A y `reports.view` en empresa B. Con el dashboard filtrado por A, el componente genera `/reportes?company_id=A...`. El destino no contiene el mismo universo permitido del dashboard y puede quedar vacío aunque el indicador muestre pendientes. Esta observación no demuestra concesión de acceso adicional: el fallo confirmado es de navegación y conciliación del alcance.

**Corrección requerida:** resolver el destino usando el ámbito exacto del indicador. Si el universo de reportes no coincide con el del dashboard, conservar el listado del dashboard o un destino autorizado que represente las mismas filas. Considerar también filtros globales con permisos parciales y módulos diferentes.

**Cierre verificable:** probar permisos distintos por empresa y módulo, incluidos permisos parciales sin filtro de empresa. Cada indicador abre un listado que conserva filtros, recuentos y retorno; un permiso de B no decide el enlace de A.

### REV-03 · P2 · Cancelar una exportación sigue esperando el registro remoto

**Requisito afectado:** H07-RF10, H07-RT05 y reglas de feedback asíncrono.

**Ubicación:** [registro de exportaciones](../../../src/features/reporting/repositories/reporting.repository.ts), líneas 29–40; [servicio de exportación](../../../src/features/reporting/services/report-export.ts), inicio y finalización de auditoría.

Las consultas por lotes y el worker reciben `AbortSignal`, pero `recordReportExport` no recibe señal ni limita explícitamente la espera. La cancelación no interrumpe una solicitud de inicio/finalización de auditoría pendiente. El botón puede seguir ocupado mientras la red o el servidor no responden.

**Reproducción:** una prueba retuvo la promesa del registro inicial y solicitó cancelación. La exportación permaneció sin resolver hasta liberar esa promesa; después registró cancelación y terminó. No se generó ni descargó archivo durante el caso.

**Corrección requerida:** acotar y controlar la espera del transporte y del registro final, conservando el `request_id` idempotente. Una interrupción del cliente no demuestra que la transacción del servidor no se haya confirmado: contemplar conciliación y errores de resultado desconocido, sin registrar falsamente éxito o cancelación ni duplicar eventos.

**Cierre verificable:** cancelar durante inicio, lectura de lotes, generación y finalización; simular respuesta lenta, error de red y confirmación remota sin respuesta. El control recupera un estado terminal en un plazo definido, no descarga archivos cancelados y comunica explícitamente cualquier resultado de auditoría pendiente de conciliación. Cambiar de contexto no publica archivos del anterior.

## 3. Comprobaciones repetidas

| Comprobación | Resultado de esta revisión |
|---|---|
| `yarn verify` | PASS: TypeScript, ESLint, reglas de arquitectura y **195 pruebas en 23 archivos**. |
| `yarn build` | PASS, Next.js con Proxy y rutas existentes. Dos workers mediante `CIRCLE_NODE_TOTAL=3` por memoria disponible junto a Docker. |
| `yarn check:bundle` | PASS: comprobación de secretos privados configurados en artefactos públicos. |
| `git diff --check` | PASS, también tras los cambios documentales. Destinos locales de enlaces comprobados en los siete documentos revisados. |
| `supabase test db --local` | PASS: **6 suites, 34 casos pgTAP**. |
| `yarn db:lint` | PASS en esquemas `public` y `private` locales. |
| `yarn test:h07:live` | PASS: volumen de referencia, consultas autenticadas, exportaciones completas y registro de auditoría. |
| Diagnóstico adicional de navegación/cancelación | Dos casos reprodujeron REV-02 y REV-03. La ejecución incluyó las pruebas habituales: **197 pruebas, 24 archivos**. Son pruebas de caracterización del defecto, no de su corrección. |
| Diagnóstico SQL de auditoría | REV-01 confirmado: 16 eventos existentes, 0 visibles con filtro de empresa/recurso. Consulta de solo lectura en Docker. |
| Migraciones local/Cloud | **55 versiones coincidentes**, hasta `20261017002700`; ninguna pendiente. |
| `yarn db:lint:cloud` | PASS, consulta de diagnóstico sin migraciones ni fixtures. |

Los diagnósticos exploratorios y resultados sin versionar están en `test-results/revision-pre-h08/`, excluido de Git. Los escenarios y resultados necesarios para repetirlos quedan descritos en este informe; al corregirlos deben incorporarse pruebas de regresión que afirmen el comportamiento correcto en las suites habituales.

### Capacidad observada

Medición guardada por el script local el **17 de octubre de 2026, 11:09 Lima**. Dataset: 30 empresas, 100 usuarios, 1.000 trabajadores, 12.000 obligaciones y 1.000 versiones de metadatos. HTTP loopback, un usuario concurrente, una consulta de calentamiento y 20 consultas medidas por recurso.

| Recurso | P95 |
|---|---:|
| Dashboard | 1.226,1 ms |
| Reportes | 1.519,0 ms |
| Documentos | 893,1 ms |
| Auditoría | 189,6 ms |

Todos cumplen la referencia local de 2.000 ms. Exportación de 1.000 filas: Excel aproximadamente 991 ms y PDF 1.212 ms de generación. No es una medición de concurrencia, red productiva o entrega de archivos. Las versiones de capacidad son metadatos sintéticos, no objetos Storage descargables.

### Recuperación del entorno local

Docker Desktop no iniciaba por el socket residual de analítica en su carpeta `run`. Se detuvieron sus procesos, se verificó la carpeta literal y se conservó renombrada como `C:\Users\ZeCarlos\AppData\Local\Docker\run-quarantine-20261017-110539`; luego se inició Docker Desktop con ventana oculta. No se eliminaron imágenes, volúmenes ni datos, ni se restableció Docker a valores de fábrica. Las pruebas se ejecutaron después de recuperar el motor.

## 4. Estado real de Cloud y pendientes propios de H08

El inventario de solo lectura confirmó **29 tablas públicas**, **ninguna con RLS habilitado**, dos buckets privados (`document-reception`, `documents`) y cero jobs `h06-notifications-dispatch`. RLS diferido sigue siendo una decisión explícita hasta H08/T01; no se considera protección terminada.

El inventario también contó cero tablas públicas con permiso `SELECT` para `anon`. Este dato no acredita seguridad completa: no prueba permisos de otras acciones, RPC, vistas, Storage, sesiones o usuarios autenticados. La matriz de acceso directo de H08 debe comprobar todos esos canales y ámbitos.

Los buckets tienen un límite técnico de 50.000.000 bytes; el límite de negocio inicial sigue siendo 20.000.000 bytes y debe comprobarse junto con validación, reanudación y descarga en H08. No se activaron avisos productivos ni se enviaron mensajes reales durante esta revisión.

| Bloque H08 | Evidencia necesaria para cerrarlo |
|---|---|
| T01 / OP15 | Matriz y pruebas directas de privilegios, RLS, vistas, RPC, Storage, Realtime y aislamiento por estudio/empresa/módulo. |
| Auth / OP04–OP05 | Configuración real de cuentas, bootstrap y último administrador; revocación efectiva y rechazo de sesiones anteriores. |
| Entornos / OP01–OP03 | Destino Vercel, dominio/HTTPS, secretos por ejecutor y enlaces/sesiones en el dominio real. |
| Configuración / OP06–OP07 | Catálogos, responsables y reglas reales; Storage privado y pruebas de integridad/limpieza limitada. |
| WhatsApp / OP08–OP10 | n8n/proveedor productivos, remitente, contactos autorizados, plantillas, receipts, deduplicación y programación Lima comprobada. |
| Recuperación / OP11–OP12 | Copias independientes de DB y objetos, manifiesto, destino, retención y restauración aislada medida; validar RPO/RTO. |
| Operación / OP13–OP14 | Monitoreo, runbooks, responsables reales, regresión y aceptación del piloto. |

Estas filas son trabajo del último hito, no defectos nuevos que debieran haberse implementado en H07. El piloto con datos reales exige primero los controles de acceso, respaldos/restauración y configuración crítica definidos en [H08](../h08-preparacion-produccion.md#10-condición-para-piloto-y-cierre).

## 5. Reproducibilidad y documentación

Al iniciar la revisión, `HEAD` era `a51e07b` (H02), con **364 archivos modificados/nuevos, 318 sin seguimiento** al enumerar todos los archivos. H03–H07 existen en disco y migraciones aplicadas, pero ese commit no representa la aplicación revisada. Antes de desplegar H08 se necesita una base Git completa y revisada: no publicar ni etiquetar una versión que omita código, migraciones, contratos o evidencia necesaria. Este informe no hizo commit ni push.

Se detectaron afirmaciones desactualizadas en el estado inicial del diseño técnico y en `supabase/README.md`, que aún describía Cloud como desarrollo. Se aclararon para reflejar el entorno real y evitar usarlo para fixtures. El índice y la evidencia H07 se enlazan a esta revisión; los casilleros afectados por REV-01–REV-03 quedan abiertos, conservando los resultados históricos válidos.

## 6. Orden recomendado en la revisión inicial

1. Corregir REV-01–REV-03 y añadir pruebas de regresión a las suites habituales.
2. Repetir los escenarios afectados y verificaciones pertinentes; cerrar los casilleros H07 solamente con esas evidencias.
3. Registrar una base Git reproducible que incluya el trabajo completo, sin secretos ni fixtures de producción.
4. Implementar H08 comenzando por el inventario y la matriz de acceso, después privilegios/RLS/sesiones y su regresión local; continuar con operación, recuperación y configuración productiva.
5. Aplicar cambios en Cloud con el alcance autorizado y realizar el piloto cuando las condiciones de H08 estén acreditadas.

**Seguimiento:** REV-01–REV-03 cerradas y publicadas. REV-04–REV-05 de la [revisión complementaria](revision-final-pre-h08.md) están [corregidas, verificadas y publicadas](h07-cierre-complementario.md), con 57 versiones coincidentes y la base lista para comenzar H08. El dictamen y los recuentos anteriores describen la revisión inicial.
