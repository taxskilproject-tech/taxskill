# H10 — Buzón SUNAT

**Cierre operativo — 30/10/2026, Lima:** implementación y puesta en marcha verificadas. [Matriz de aceptación y límites](evidencias/h10-cierre.md), [validación final](evidencias/h10-validacion-final.json), [recorrido real y diario](evidencias/h10-production.json), [publicación final](evidencias/h10-release-smoke.json) y [recuperación](evidencias/h10-recovery.json). Quince migraciones H10 publicadas, 98 totales; empresa real autorizada conectada y diario habilitado a las 08:00. Mensajes conserva la cobertura parcial del origen aceptada por el usuario; nunca se certifica una consulta incompleta. H08 mantiene sus pendientes propios.

## Cronología anterior al cierre

Los estados abiertos y bloqueos que siguen describen cada fecha histórica; el estado vigente es el cierre anterior y su matriz de evidencias.

**Corrección del 30/10/2026 verificada:** [acceso y apertura del buzón](evidencias/h10-correccion-autenticacion.md). Preparación del formulario y del menú, usuario normalizado según SOL y reintento acotado. Docker y dos pruebas Vercel consecutivas con la misma imagen completaron identidad, Notificaciones, PDF y renovación. 482 pruebas y verificaciones locales aprobadas; ocho instancias detenidas y cero snapshots. Mensajes conserva su limitación de cobertura. **H10 permanece abierto por operación diaria y puesta en marcha**, sin activar el origen real ni jobs. Las entradas siguientes conservan el diagnóstico anterior.

**Estado al 30/10/2026:** [quinta prueba y condiciones pendientes](evidencias/h10-bloqueo-origen.md). La quinta conservó el informe y falló en acceso inicial. La cuarta sí entró y verificó identidad, antes de otro login fallido. Las cinco instancias autorizadas están detenidas, sin snapshots. 464 pruebas y build/bundle principal Next.js 16.4.3 aprobados; 4003 funciona con simulador. **H10 permanece abierto** por fiabilidad de sesión, integridad de Mensajes y revisión diaria real.

**Último resultado, cuarta instancia autorizada:** [el buzón abrió en Vercel y verificó identidad](evidencias/h10-vercel-piloto-4.json); un login posterior de renovación falló. La traza no muestra bloqueos de nuestra política ni errores de recursos/JavaScript, pero todavía no explica el retorno de SOL. Instancia detenida y cero snapshots. Se corrige además la conservación del informe por etapas para no perder evidencia ante un fallo posterior. [Detalle y límites](evidencias/h10-diagnostico-retorno-sol.md). H10 sigue abierto por fiabilidad de sesión, integridad mensual y consulta diaria real. Las notas siguientes conservan la historia anterior.

**Diagnóstico posterior del 29/10/2026:** [retorno de autenticación SOL](evidencias/h10-diagnostico-retorno-sol.md), instrumentado sin URL, HTML ni secretos; 458 pruebas y un fixture Chromium real sin red externa aprobados. Las tres pruebas Vercel anteriores siguen fallidas; preparar este observador no autoriza otra instancia ni cierra el hito.

**Última validación del 29/10/2026:** [tres pruebas remotas y runtime corregido](evidencias/h10-runtime-y-validacion.md). Las tres instancias temporales autorizadas terminaron detenidas, sin snapshots. La imagen oficial completa entra localmente y conserva Notificaciones, PDF y renovación de sesión. La tercera prueba usó esa corrección en Vercel, pero tampoco completó el login; no se demostró un bloqueo por IP. 452 pruebas y build aislado Next.js 16.4.3 aprobados; 4003 sigue con su build de presentación. Acceso remoto, integridad de Mensajes y revisión diaria real siguen pendientes; **H10 no está cerrado**. Las notas siguientes conservan la cronología anterior.

**Avance del 29/10/2026:** [Vercel CLI, orientación y MCP configurados y comprobados](evidencias/h10-vercel-configuracion.md). Imagen privada publicada y Chromium protegido funcionando en la única instancia temporal autorizada. El login SUNAT remoto no completó; instancia detenida y cero snapshots confirmados. [Resultado](evidencias/h10-vercel-piloto.json). Presentación Docker restablecida en 4003; no se publicaron aplicación, migraciones ni jobs. H10 sigue abierto y otra instancia requiere autorización nueva.

**Avance posterior del 28/10/2026:** [recuperación parcial y lectura confirmadas](evidencias/h10-recuperacion-y-vercel.md). Se conservan mensajes válidos sin certificar la página, con 430 pruebas, 45 comprobaciones Docker y seis SQL transaccionales. Destino aclarado: Vercel Hobby/Supabase; piloto temporal Sandbox autorizado, aún pendiente de ejecutar. No cierra la integridad de Mensajes ni la revisión diaria.

**Estado al 28/10/2026: aplicación validada localmente; acceso real, Notificaciones y adjuntos demostrados. Mensajes presenta inconsistencias también en SOL. H10 permanece abierto.** Se conservan las ocho comprobaciones como condición para aprobar la integración real y activar producción. Consultar [implementación](../buzon-sunat-implementacion.md), [evidencias locales](evidencias/h10-implementacion.md), [piloto anterior](evidencias/h10.md), [reglas](../../.agents/rules.md) y [entornos](../desarrollo.md).

**Actualización al 28/10/2026:** el 403 corresponde a la página informativa. La entrada oficial SOL respondió por HTTP, pero Chromium Docker falló al navegar al Menú SOL con `ERR_EMPTY_RESPONSE`. Chrome habitual mostró el formulario. Esta comprobación no utilizó credenciales ni completa el piloto; [resultados y límites](evidencias/h10-comparacion-acceso.md).

**Corrección posterior del 28/10/2026:** acceso y Notificaciones funcionando mediante el conector propio en modo gráfico estándar/Xvfb. Se verificaron RUC, dos meses, PDF e IDs estables tras renovar sesión. Mensajes devuelve 24 de 40 y una segunda página vacía, reproducidos también en Mis Trámites y Consultas de SOL. [Informe de corrección](evidencias/h10-correccion-conector.md) y [evidencia Docker real](evidencias/h10-conector-docker.json). **H10 sigue abierto** por integridad de Mensajes y las condiciones diarias/operativas pendientes; no confundir los rechazos históricos con el estado actual.

**Tercera empresa autorizada, 28/10/2026:** acceso correcto en Chrome y Docker; Notificaciones de octubre/septiembre y otro PDF comprobados. Mensajes muestra 17 filas de 54 y las páginas siguientes vacías también en SOL. [Contraste y límites](evidencias/h10-tercer-piloto.md), con [evidencia independiente](evidencias/h10-conector-piloto-3.json). No se mezclan sus resultados con el piloto anterior ni se considera resuelta la integridad de Mensajes.

## Objetivo, alcance y dependencias

Consultar los mensajes y notificaciones del Buzón SUNAT de cada empresa desde TaxSkill, con sus adjuntos y un consumo de recursos acotado. Comenzar por demostrar la consulta y descarga en una empresa autorizada; pasar a implementación únicamente con evidencias satisfactorias.

Depende de H02 para identidad/empresas/permisos, H08 para seguridad/operación y de un mecanismo SUNAT validado. Se conserva el funcionamiento de H09. La posesión de las claves SOL permite evaluar el acceso, pero no demuestra por sí misma una API disponible ni automatización fiable.

## Decisiones confirmadas

1. Módulo independiente **Buzón SUNAT**, una empresa seleccionada a la vez.
2. Bandeja de mensajes y notificaciones; consulta y descarga de adjuntos.
3. Conector propio. Las claves se procesarán en nuestra infraestructura y SUNAT; no contratar ni transmitirlas a proveedores de consulta externos.
4. Botón **Consultar novedades** y revisión diaria para empresas conectadas.
5. Horario inicial **08:00, America/Lima**, configurable por el administrador.
6. Administrador y contadores/supervisores con autorización explícita por empresa. Sin acceso de clientes en esta versión.
7. Solo el administrador gestiona conexiones y credenciales. El permiso de Tributario no concede acceso al buzón.
8. Selección de año y mes; abre el actual y consulta los anteriores bajo demanda.
9. El mes corresponde a la fecha de depósito/publicación de SUNAT, no al periodo tributario mencionado en un documento.
10. Caché de resultados, una sincronización por empresa, ejecución secuencial y páginas de 25 registros en la interfaz.
11. Buscar novedades desde la última consulta correcta. No descargar todo el historial ni todos los adjuntos diariamente.
12. Adjuntos bajo demanda y reutilización de copia privada disponible.
13. Distinguir consulta incompleta/error de consulta completa sin resultados. Conservar el último resultado válido con su fecha.
14. Avisos dentro de la aplicación. WhatsApp, creación automática de actividades y cálculo de plazos legales fuera de esta versión.
15. Verificaciones humanas o CAPTCHA se comunican al administrador; no se eluden controles.
16. Pruebas ficticias exclusivamente en Docker. Piloto real solo con autorización específica y evidencias sin secretos ni contenido tributario publicado.
17. Publicación y activación diaria son pasos posteriores al piloto y a la implementación validada.
18. Se permite que la consulta marque mensajes como leídos en SUNAT. Al configurar la conexión se debe advertir expresamente este efecto; la lectura en SUNAT seguirá separada de cualquier estado local de TaxSkill. Decisión confirmada después de observar el comportamiento del portal.

## Información del administrador

| Dato | Necesidad | Situación |
|---|---|---|
| Empresa piloto: RUC y razón social | Identificar el buzón autorizado; reutilizar registro de TaxSkill si existe. | Facilitados por el usuario; se mantienen fuera de documentación pública. |
| Usuario y clave SOL vigentes | Acceso con permiso de buzón. Preferir secundario limitado cuando se verifique su compatibilidad. | Pilotos autorizados y custodia cifrada productiva; descifrado únicamente en memoria del conector. |
| Autorización específica | Inicio de sesión, consulta de octubre/septiembre de 2026 y descarga de un adjunto. | Confirmada expresamente en esta conversación. |
| Mensaje/adjunto conocidos y mes | Comparar listado, identificador, fecha, lectura y bytes descargados. | Notificaciones de octubre/septiembre y PDF de referencia comprobados en producción; Mensajes permanece parcial explícito por el origen. |
| Equipo autorizado por empresa | Asignación de capacidades propias en TaxSkill. | Administrador real activo; el administrador concede a futuros internos el permiso independiente en Usuarios. Cuatro perfiles y revocación probados en Docker. |
| Plataforma y recursos | Ejecutar el conector aislado con límites. | Vercel Hobby, Sandbox temporal: 1 vCPU, 2 GB, cuatro minutos; imagen privada fijada por digest. No requiere un servidor permanente en n8n. |
| Responsable de accesos | Atender rotación, permisos y verificación humana. | Josmel, administrador real confirmado. |

No guardar claves, cookies, capturas con credenciales, URLs con tokens ni documentos reales en Git. El kit de evaluación rechaza campos de contraseña en sus JSON. El formulario privado del kit registra metadatos; **no es el mecanismo de custodia cifrada de credenciales**, que pertenece a la implementación posterior.

## Requerimientos funcionales

| ID | Requisito |
|---|---|
| H10-RF01 | Exigir empresa y permiso propio antes de consultar; permitir elegir otra empresa sin datos residuales. |
| H10-RF02 | Administrador configura/verifica/desconecta acceso; la respuesta no devuelve la clave. |
| H10-RF03 | Mensajes y notificaciones separados mediante filtro; mostrar asunto, fecha y adjuntos disponibles. |
| H10-RF04 | Consultar mes actual y meses anteriores solicitados; marcar meses aún no consultados. |
| H10-RF05 | Consulta manual con progreso visible y bloqueo de doble ejecución. |
| H10-RF06 | Revisión diaria incremental con última consulta correcta y novedades deduplicadas. |
| H10-RF07 | Descargar adjuntos a demanda; reutilizar copia autorizada e informar errores/progreso. |
| H10-RF08 | Conservar datos válidos tras un fallo y mostrar su antigüedad. |
| H10-RF09 | Mantener lectura SUNAT y cualquier revisión local como conceptos distintos; comprobar efectos antes de abrir mensajes automáticamente. |
| H10-RF10 | Avisar al administrador de clave rechazada, falta de permisos o intervención humana, evitando reintentos que bloqueen la cuenta. |
| H10-RF11 | No modificar cumplimiento documental, plantillas, entregables ni obligaciones existentes. |
| H10-RF12 | No activar sincronización productiva durante el piloto. |
| H10-RF13 | Advertir al administrador al configurar la conexión que consultar puede marcar mensajes como leídos en SUNAT; no describir la integración como preservadora del estado de lectura. |
| H10-RF14 | Si el contador, la página o las filas recibidas discrepan, conservar el resultado como parcial/fallido y mostrarlo; no certificar ausencia de mensajes. Acotar reintentos y conservar continuación. |

## Requerimientos técnicos y contratos

| ID | Requisito |
|---|---|
| H10-RT01 | Mantener Next.js/Supabase directo para consultar resultados persistidos; secretos y acceso SUNAT solo en servidor/worker. |
| H10-RT02 | Atomic Design, Tailwind, tipos separados, componentes hasta 170 líneas y Proxy. |
| H10-RT03 | Incorporar capacidades `buzon_sunat` en autorización sin incorporarlo a `DocumentaryModuleId` ni al motor documental. |
| H10-RT04 | Persistencia versionada para conexiones, trabajos, mensajes y adjuntos, validada localmente por la autorización posterior; origen real condicionado al piloto. |
| H10-RT05 | RLS por estudio/empresa/sesión, Storage privado, auditoría y credenciales cifradas sin claves de descifrado en el navegador. |
| H10-RT06 | Deduplicación con identificador estable contrastado con SUNAT; no inventar IDs a partir de asunto/fecha solamente. |
| H10-RT07 | Límites por trabajo, paginación/cursor y continuación durables; registrar CPU, memoria, duración y solicitudes reales. |
| H10-RT08 | Un trabajo activo por empresa y worker secuencial; reutilizar trabajo pendiente ante clics repetidos. |
| H10-RT09 | Sesiones aisladas por empresa y revisión de credenciales; descartar resultados de accesos revocados. |
| H10-RT10 | Fallos explícitos y sin datos sensibles; PDF/otros adjuntos validados antes de vista previa; no renderizar HTML externo confiando en su origen. |
| H10-RT11 | El evaluador preflight no hace solicitudes de red. El laboratorio usa únicamente un fixture HTTP por loopback dentro de Docker con red externa deshabilitada; ninguno carga variables Cloud ni modifica Supabase. |
| H10-RT12 | Una inspección autenticada del portal o tests sintéticos no equivalen a un worker diario validado. |

La autorización inicial permitió construir y probar localmente durante el piloto. La solicitud posterior de cerrar H10 autorizó su puesta en marcha con la última empresa piloto real. El adaptador, los límites y la revisión diaria tienen evidencia productiva; el problema de integridad de páginas de SUNAT se conserva como resultado parcial y límite aceptado, sin modificar los módulos documentales ni sus enums.

## Tareas del hito

- [x] H10-T01: registrar acuerdos, alcance, requisitos y fuentes oficiales.
- [x] H10-T02: preparar el protocolo de ocho comprobaciones, ejemplos sin claves y evaluador local de evidencias.
- [x] H10-T03a: comprobar inicio de sesión y apertura del buzón en el portal oficial con autorización específica.
- [x] H10-T03a.1: observar el caso positivo de una segunda empresa autorizada, descargar un PDF válido y contrastar IDs tras actualizar, conservando evidencia privada.
- [x] H10-T03a.2: implementar núcleo de consulta y laboratorio Docker aislado para reproducir y manejar páginas incompletas, sesiones, continuidad, límites y mediciones. [Correcciones y alcance](evidencias/h10-correcciones.md).
- [x] H10-T03b: demostrar consulta de meses, adjunto, IDs, sesiones, paginación limitada, recursos y efectos de lectura mediante el conector propio; cobertura parcial del origen identificada.
- [x] H10-T04: revisar evidencias, presupuestos medidos y ejecución en Vercel Hobby; límites descritos en el cierre.
- [x] H10-T05: persistencia, permisos, worker secuencial, consultas y custodia cifrada locales; origen real condicionado al piloto.
- [x] H10-T06: navegación, bandeja mensual, gestión de conexiones y descargas locales.
- [x] H10-T07: regresión final de 501 pruebas, 34 comprobaciones SQL y diez de acceso actuales; regresión Docker anterior de veinte casos conservada. Pruebas reales separadas, sin datos ficticios en Cloud.
- [x] H10-T08: publicar, activar y comprobar revisión diaria en una etapa autorizada y supervisada; callback firmado HTTP 200, un trabajo por fecha de Lima y cierre de todas las VM.

## Condición obligatoria para continuar

| Caso | Evidencia exigida |
|---|---|
| P01 Acceso | Login y buzón autorizado; no confundir acceso SOL con permiso de lectura completo. |
| P02 Periodos | Mensajes/notificaciones de mes actual y otro conocido, contrastados con el portal. |
| P03 Adjunto | Archivo descargado que corresponda a la referencia autorizada; tamaño/hash y formato comprobados. |
| P04 Identificadores | Mismo documento mantiene ID en consultas repetidas; deduplicación reproducible. |
| P05 Sesiones/fallos | Renovación/expiración e indisponibilidad controladas; credenciales inválidas preferentemente contra simulador para no bloquear la cuenta real. |
| P06 Consulta acotada | Filtro de origen o paginación limitada con criterio de finalización y continuación verificable. |
| P07 Recursos | Medidas del worker y presupuestos explícitos; revisión diaria sin recargar el histórico. |
| P08 Lectura | Comprobar si listar/abrir/descargar cambia lectura; no producir efectos no autorizados. |

Todos requieren evidencia real autorizada y revisión humana. El evaluador distingue `not_run`, `synthetic` y `authorized_live`; una observación en navegador no satisface la comprobación del worker. El estado más favorable del evaluador es `ready_for_implementation_review`, nunca «H10 terminado» ni «producción lista».

**Política de lectura confirmada:** tras observar la previsualización automática y el indicador 12→11, el usuario aceptó permitir cambios de lectura con advertencia al configurar la conexión. Después se abrió un registro con la marca visual de nuevo: perdió esa marca, quedó seleccionado y el indicador pasó de 11 a 10. Se demuestra el efecto de apertura en el portal; aún deben distinguirse los efectos del listado y de la descarga en el prototipo. No restaurar marcas automáticamente ni confundir lectura con conformidad documental o cálculo de plazos legales.

## Definition of Done

- [x] Ocho comprobaciones revisadas con evidencia real, límites medidos y alcance explícito de P02/P06: consulta completa de Notificaciones y parcial conservada de Mensajes ante la inconsistencia del origen aceptada por el usuario.
- [x] Bandeja mensual, actualización manual/diaria y adjuntos funcionando con permisos independientes.
- [x] Cifrado, sesiones aisladas, deduplicación, conservación y errores comprobados.
- [x] Administrador/contador/supervisor permitidos por empresa; cliente y empresa ajena rechazados.
- [x] Fallos, cuenta revocada, duplicación, meses vacíos/incompletos y descarga interrumpida probados.
- [x] Teclado, móvil/escritorio y feedback asíncrono verificados.
- [x] Tipos, lint, arquitectura, pruebas pertinentes, `yarn build` y bundle aprobados para la implementación completa.
- [x] Despliegue y programación diaria documentados como pasos separados y autorizados; recuperación Docker comprobada.

La [matriz de cierre](evidencias/h10-cierre.md) vincula cada requisito y comprobación con su evidencia. El diario incompleto conserva cursor y no adelanta la última consulta correcta. La integración del buzón no acredita la integridad de las páginas de SUNAT ni cierra otras integraciones SUNAT o pendientes operativos H08.

**No cerrar H10 por haber conseguido iniciar sesión o por aprobar las pruebas unitarias del evaluador.** No modifica el estado de cierre de H08.
