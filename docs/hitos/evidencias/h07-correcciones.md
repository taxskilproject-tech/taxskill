# Cierre de observaciones previo a H08

**Fecha:** 17 de octubre de 2026. **Estado:** REV-01, REV-02 y REV-03 corregidas y validadas en Docker local. Migración correctiva publicada en Cloud con autorización específica del usuario; 56 migraciones coincidentes y 13 huellas históricas conservadas. Las observaciones quedan cerradas y la base permite continuar con H08, que permanece pendiente.

Se conserva la [revisión inicial](revision-pre-h08.md) para consultar los defectos, sus requisitos y la reproducción anterior. Esta evidencia registra su corrección; no acredita todavía seguridad ni operación productiva de H08.

## 1. Correcciones y aceptación

| Observación | Cambio final | Evidencia de cierre funcional |
|---|---|---|
| REV-01 · Auditoría | Nueva vista privada `h07_audit_scoped` resuelve empresa/módulo desde los recursos y sus padres. El visor conserva su proyección mínima y filtros; los eventos originales no se actualizan. | La consulta local que encontraba 16 eventos pero mostraba 0 ahora muestra **16 de 16**. SQL comprueba aprobaciones, observación/corrección, reapertura, descarga histórica, supervisor autorizado, empresas/módulos ajenos y empresa eliminada/restaurada. H05 comprueba ámbitos laborales sin salario/notas en la proyección; H06 conserva el ámbito de actividades internas. |
| REV-02 · Indicadores | Los enlaces mantienen el recurso de origen: `/dashboard` usa consultas `view`; `/reportes` conserva `reports.view`. Se preservan empresa, módulo y periodo y se vuelve a la primera página. Un permiso de otra empresa ya no decide el destino. | `report-metrics.test.tsx`: tres casos de renderizado real del componente, incluidos permisos parciales en otras empresas/módulos y alcance global/interno. |
| REV-03 · Cancelación | Registro remoto con señal de cancelación y tiempo límite; conciliación usando el mismo UUID y las operaciones idempotentes existentes. El control muestra “Cancelando…” y permanece deshabilitado durante el trabajo. | Doce casos de transporte/servicio y dos de controles: inicio pendiente, lotes, worker, finalización, respuesta perdida después de confirmar, cancelación confirmada sin respuesta, error de generación, rechazo de permisos y conciliación no disponible. No se oculta el resultado desconocido tras un mensaje genérico de cancelación. |

La migración nueva es [20261017164155_h07_audit_resource_scope.sql](../../../supabase/migrations/20261017164155_h07_audit_resource_scope.sql). No se editaron las 55 migraciones anteriores, no se crean tablas ni se modifican filas de negocio. Añade una vista privada sin permisos directos para `public`, `anon` o `authenticated` y actualiza la resolución de ámbito del visor. Conserva RLS para H08.

Los recursos documentales resuelven su obligación a través de entregables, versiones, ciclos, intenciones o decisiones de revisión. También se contemplan trabajadores/etapas laborales, reglas/versiones, tipos documentales, asignaciones/overrides y configuración de módulo. Las relaciones se comprueban dentro del estudio. Los eventos administrativos sin un ámbito atribuible mantienen la consulta administrativa.

## 2. Contrato de cancelación y conciliación

- Cada solicitud conserva un único `request_id` desde el inicio hasta la conciliación. Repetir `start` con la misma entrada devuelve la reserva o su resultado terminal; no reabre operaciones completadas.
- El transporte del registro usa un límite normal de **10 segundos** y propaga cancelación a Supabase. Una carrera controlada libera la interfaz incluso si el transporte tarda en respetar la señal. Se limpian temporizadores y listeners.
- Tras una interrupción, la conciliación usa señales independientes de la cancelación del usuario: repite `start`, intenta cerrar `cancelled`/`failed` si sigue en curso y, si se pierde la respuesta final, vuelve a comprobar la reserva. Cada espera tiene un límite de **3 segundos**, hasta tres solicitudes de conciliación.
- Si ya estaba `generated`, se conserva ese resultado: acredita bytes preparados, aunque la cancelación impida descargar. No se sustituye por `cancelled` ni se crea un segundo evento.
- Si no puede confirmarse el estado remoto, la interfaz termina el loading, no descarga el archivo y muestra que auditoría necesita conciliación con la referencia de operación. No afirma que el servidor haya revertido una transacción por cancelar HTTP.
- Un rechazo definitivo del inicio, como falta de permiso, conserva su error explícito y no se presenta como una reserva incierta.
- Cambiar usuario/empresa/filtros/permisos o desmontar aborta el trabajo. El progreso y los errores de una identidad anterior no se publican en la nueva.

No se añadieron API routes, endpoints de cancelación, tablas de exportaciones ni claves privadas en el navegador. El contrato de las RPC conserva sus argumentos públicos; se generaron tipos desde Docker local.

## 3. Verificaciones finales

| Verificación | Resultado |
|---|---|
| `yarn verify` | PASS: TypeScript, ESLint, arquitectura y **212 pruebas en 26 archivos**. Son 17 pruebas de regresión nuevas sobre las 195 previas. |
| `yarn build` | PASS, usando dos workers (`CIRCLE_NODE_TOTAL=3`), 19 páginas generadas y Proxy. |
| `yarn check:bundle` | PASS: sin secretos administrativos/HMAC/integración configurados en recursos públicos. |
| `supabase test db --local` | PASS: seis suites, **34 casos pgTAP**, ampliados con aserciones de auditoría y terminalidad de exportaciones. |
| `yarn db:lint` y `yarn db:types --local` | PASS: esquemas local `public`/`private` y generación de tipos. |
| `yarn test:h07:live` | PASS: volumen de referencia, consultas autenticadas, exportaciones completas de 1.000 filas y auditoría. |
| Instalación desde cero | Proyecto Docker aislado `tax-skill-h07-fixes-clean`, puertos 54510–54519: **56 migraciones completas** y las seis suites SQL PASS. Detenido después conservando sus volúmenes; el proyecto local principal sigue activo. |
| Actualización incremental | La migración se aplicó sobre el esquema local previo de 55 versiones y sus datos sintéticos conservados. Las consultas de auditoría no reescriben eventos y la prueba contrasta su huella antes/después. |
| Publicación Cloud | Tras autorización expresa, se aplicó únicamente `20261017164155`, sin seeds ni roles. Inventario: 56 migraciones, 29 tablas y el nuevo resolver utilizado por el visor. Lint remoto PASS; 13/13 huellas históricas iguales; cero jobs de WhatsApp activados. Dry-run final sin pendientes. |
| Revisión Git/secretos | Se comprobaron los archivos candidatos contra los valores privados de los entornos local/Cloud, sin imprimirlos. Los archivos de entorno, diagnósticos y fixtures ejecutados permanecen ignorados; se versionan código, migraciones, contratos y evidencia sintética. |

La instalación aislada no utilizó Cloud, conexiones de otro proyecto ni archivos de credenciales reales. No se enviaron avisos productivos ni se activaron jobs remotos durante estas comprobaciones. La validación visual previa se conserva como histórica; esta corrección verifica navegación y feedback mediante renderizado y pruebas de interacción de los controles existentes.

### Capacidad después de la corrección

[Mediciones completas](h07-correcciones-capacidad.json), del 17 de octubre de 2026 a las **11:55 Lima**. Supabase Docker principal, HTTP loopback 54331, 30 empresas, 100 usuarios, 1.000 trabajadores, 12.000 obligaciones y 1.000 versiones de metadatos. Un usuario concurrente, un calentamiento y 20 muestras por recurso.

| Recurso | P95 | Objetivo local |
|---|---:|---:|
| Dashboard | 1.152,6 ms | ≤2.000 ms |
| Reportes | 1.139,3 ms | ≤2.000 ms |
| Documentos | 702,1 ms | ≤2.000 ms |
| Auditoría | 582,6 ms | ≤2.000 ms |

Generación de 1.000 filas: Excel aproximadamente **461 ms** y PDF **1.315 ms**. Memoria heap del proceso de prueba al final: aproximadamente **82 MB**. Estas cifras no acreditan transferencia de archivos, dispositivos reales ni concurrencia productiva.

## 4. Publicación y base Git

La primera solicitud de publicación fue rechazada antes de ejecutarse porque la autorización previa correspondía a las ocho migraciones originales. Posteriormente, el usuario autorizó expresamente publicar únicamente `20261017164155_h07_audit_resource_scope.sql` en Supabase Cloud `gzwrqvqofcrdjvzoblaz`, sin datos ficticios, borrados ni jobs.

Con esa autorización se ejecutó `supabase db push --linked --yes --output-format json`. El resultado contiene una sola migración y cero seeds/roles. La comprobación posterior confirmó **56 versiones coincidentes**, `private.h07_audit_scoped` presente y utilizado por el visor, lint `public`/`private` sin errores, **13 huellas históricas idénticas** y cero jobs `h06-notifications-dispatch`. Un dry-run posterior confirmó `upToDate: true`, sin migraciones pendientes. Se mantienen 29 tablas públicas y RLS diferido a H08, sin alterar ese alcance.

[Inventario sanitizado de publicación](h07-correcciones-cloud.json). Los resultados completos del CLI y las huellas están ignorados en `test-results/revision-pre-h08/approved-deploy-*`; no contienen fixtures nuevos de Cloud. No se realizaron pruebas de integración ni SQL con datos ficticios en Cloud: las verificaciones posteriores fueron de solo lectura.

El código completo de H03–H07 y las tres correcciones están publicados en GitHub en el commit `dc324407c3cf2099d9dde808210f97818c1a28b4`, rama `codex/h02-acceso-empresas`. Esta actualización documental registra la publicación remota y sus comprobaciones en el commit que contiene este archivo. Los archivos necesarios para reproducir las pruebas locales y su evidencia quedan versionados, sin secretos ni documentos personales reales.

## 5. Continuidad

Las tres observaciones funcionales y la entrega correctiva remota están cerradas. La base está lista para comenzar [H08 — Preparación para producción](../h08-preparacion-produccion.md).

El piloto real sigue condicionado a RLS/privilegios/sesiones, Storage, respaldos/restauración, monitoreo, configuración productiva, canal WhatsApp y aceptación del equipo. Esta corrección no cierra esos requisitos.
