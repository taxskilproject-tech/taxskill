# H10 — cierre funcional y puesta en marcha

Fecha civil de referencia: **30/10/2026, America/Lima**. Estado: **cerrado operativamente con límite del origen explícito**. [Hito](../h10-buzon-sunat.md) · [Registro de ejecución](h10-cierre-operativo.md) · [Manual](../../buzon-sunat-implementacion.md) · [Validación final](h10-validacion-final.json).

## Resultado demostrado

La aplicación publicada verifica el acceso autorizado, consulta octubre y septiembre, recupera un mensaje y descarga su PDF. El archivo tiene **87.581 bytes** y el mismo SHA-256 del piloto; una segunda solicitud utiliza la caché sin crear otro trabajo. La revisión diaria de la empresa está configurada a las **08:00 de Lima**. El despachador firmado recibió HTTP 200 y ejecutó un trabajo diario único. [Evidencia productiva](h10-production.json).

**La cobertura de Mensajes sigue siendo parcial.** SUNAT devuelve páginas inconsistentes; el diario puede terminar como `BUDGET_EXHAUSTED` dentro de su presupuesto. TaxSkill conserva los registros, el cursor y el motivo, y no adelanta `last_daily_success_at`. El usuario aceptó esta limitación del origen al separar su problema de paginación del fallo de acceso corregido. El cierre del producto no certifica que SUNAT entregue todo su histórico ni que no existan mensajes ausentes de esas respuestas.

## Arquitectura operativa

Las lecturas habituales continúan directamente a Supabase. Las API de credenciales y descargas conservan sesión, origen, permisos, cifrado y auditoría. `/api/sunat/run` despierta el ejecutor para un trabajo autorizado; `/api/sunat/dispatch` recibe exclusivamente pruebas HMAC de un solo uso del programador.

La clave de firma permanece en Vault y en una variable Secret de Vercel. El mensaje HTTP contiene versión, acción fija, nonce y fecha; caduca en 90 segundos y se consume una sola vez. No lleva claves reutilizables ni identidad fiscal. Las colas `pg_net` son administradas por Supabase: no se atribuye a la aplicación una revocación de privilegios que su rol no puede aplicar.

Cada ejecución crea una VM sin persistencia ni puertos públicos, con 1 vCPU, 2 GB asignados y límite de cuatro minutos. La imagen está fijada por digest. Usa su usuario `pwuser`; `run-one` comprueba UID 1001, valida de nuevo el lease, elimina las entradas privadas y procesa un trabajo. El cierre incierto conserva el lease; los intentos iniciales y su conciliación se mantienen en la historia. [Instancias detenidas y ausencia de snapshots](h10-sandbox-operacion.json).

La consulta diaria usa hasta tres páginas nuevas por bandeja y continuación durable. El límite de llamadas del motor cuenta lecturas de página; los activos y el login del navegador se miden aparte. En la primera ejecución real se registraron **116 solicitudes de red, 16.656 ms de duración del worker y 205 MB de pico del proceso Node**. Las métricas de CPU de Node no incluyen por sí solas todos los procesos Chromium; el reporte de Sandbox añade la CPU activa de la VM y su duración. Estas medidas son una muestra de operación, no una garantía de consumo futuro.

## Matriz de aceptación

| Requisito | Evidencia y alcance |
|---|---|
| RF01, RF07, RT03, RT05: empresa y permisos independientes | [Cuatro perfiles, empresa ajena, revocación y descarga anónima](h10-continuous-access.json); [regresión anterior de veinte casos](h10-aplicacion-docker.json). Los clientes quedan excluidos. |
| RF02, RF10, RT01, RT09: conexiones y custodia administrativa | Guardado y verificación reales; contratos de sesión, AES-GCM/AAD y rotación; pruebas locales de sesiones y descarte tras revocación. Nunca se probaron contraseñas erróneas contra la cuenta real. |
| RF03, RF04, RF05: bandeja mensual y consulta manual | Dos meses recuperados en producción, con estados por bandeja; interfaz y [loading real, bloqueo, foco y móvil](h10-ui-final.json). |
| RF06, RF08, RF14, RT06–RT08: diario, límites y conservación | [Trabajo diario real y estado parcial](h10-production.json); [34 comprobaciones SQL](h10-dispatch-sql.json); pruebas de continuación, ancla, deduplicación y reintento del mismo trabajo. |
| RF07, RT10: mensaje y adjunto | PDF real contrastado con el piloto, descarga privada autorizada y segunda solicitud sin otro trabajo. Formato, tamaño y rutas se validan antes de conservar el archivo. |
| RF09, RF13: efectos de lectura | Advertencia y consentimiento persistidos; efecto comprobado en el portal y en los pilotos. Lectura SUNAT no equivale a aprobación documental. |
| RF11: independencia documental | Buzón conserva permisos propios y no genera obligaciones ni modifica cumplimiento. El alta documental adicional fue solicitada expresamente y usa H09: [MYPE, perfil y 28 entregables pendientes de responsable](h10-company-preparation.json). |
| RF12, RT11–RT12: separación de pruebas y puesta en marcha | Fixtures y pruebas negativas exclusivamente Docker. Pilotos anteriores conservados; activación productiva posterior solicitada por el usuario y comprobada separadamente. |
| RT02: arquitectura del repositorio | Atomic Design, Tailwind, tipos separados, componentes ≤170 líneas, Proxy y comprobador de arquitectura. |
| RT04: persistencia y publicación | [Quince migraciones H10 publicadas, 98 totales y trece huellas preservadas antes del alta real](h10-cloud-migrations.json); lint SQL remoto sin errores. Sin seeds Cloud. |
| Recuperación y conservación | [DB, PDF y keyring restaurados en Docker](h10-recovery.json), relaciones válidas y credenciales descifradas únicamente en memoria. Cron y sesiones de la restauración desactivados. |

## Comprobaciones del piloto

P01 acceso y P05 renovación se demostraron con el conector y en Vercel. P02 comprueba consulta y contraste de ambos meses: Notificaciones completa; Mensajes parcial explícito. P03 verifica el PDF real. P04 conserva IDs y reutiliza el adjunto entre sesiones. P06 conserva paginación, presupuestos y continuación sin certificar datos ausentes. P07 incorpora medidas del proceso y del proveedor. P08 registra el efecto de lectura aceptado y su advertencia.

## Operación y límites conservados

Las variables se exportan juntas en `.env.vercel`, ignorado por Git. El keyring y `SUNAT_DISPATCH_SECRET` son Secret; modo, imagen, identificador de clave y banderas son Config. La clave de respaldo se conserva fuera de la base y del bucket. La copia de DB incluye `private.sunat_credentials` y `private.sunat_attachment_sources`; los adjuntos de `sunat-mailbox` se respaldan además de los documentos habituales.

La [publicación final](h10-release-smoke.json) confirma el deployment Production Ready promovido a `https://taxskill.vercel.app`, sesión administrativa válida, conexión conectada, 16 chunks sin los secretos configurados y rechazo 401 del despacho sin firma. La última revisión no creó nuevos trabajos SUNAT. 501 pruebas en 75 archivos, tipos, lint, arquitectura, build Yarn y bundle aprobados; SQL, cuatro perfiles, recuperación e interfaz se registran por separado. La presentación 4003 sigue conservando su build y datos locales.

Se conserva el destino temporal de respaldos en Storage elegido por el usuario y la copia cifrada local. La operación permanente de respaldos y el destino independiente de H08 continúan en ese hito. H10 no cierra H08, no publica las otras siete plantillas y no incorpora WhatsApp, actividades automáticas ni modificaciones de lectura para simular integridad.
