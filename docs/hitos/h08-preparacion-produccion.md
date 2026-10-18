# H08 — Preparación para producción

**Estado al 18/10/2026:** implementación y validación técnica local completadas; siete migraciones publicadas en Cloud (64 versiones, 29 tablas con RLS, 13 huellas conservadas). Auth, despliegue de aplicación/Edge y habilitadores productivos aún abiertos. Consultar [registro de cierre](evidencias/cierre-hitos.md), [evidencias H08](evidencias/h08.md), [matriz de seguridad](../seguridad-produccion.md) y [manual operativo](../operacion-produccion.md). **Depende de:** [H07](h07-supervision-reportes.md) y evidencias pertinentes de H01–H06. **Resultado requerido:** primera versión apta para piloto y publicación controlada. Aplican las [reglas](README.md#3-reglas-transversales-obligatorias) y la [Definition of Done común](README.md#4-definition-of-done-comun).

<a id="objetivo"></a>
## 1. Objetivo

Demostrar que la primera versión protege datos y archivos desde todos sus canales de acceso, conserva y recupera la documentación, y opera con configuración productiva comprobada.

Este hito completa T01 —RLS, privilegios y sesiones—, resuelve las tareas OP01–OP15 y valida el piloto. Es parte del MVP: no puede reemplazarse por esconder botones ni por una simulación de servicios productivos.

## 2. Alcance, entradas y entregables

**Entrada:** recorridos funcionales completos, migraciones versionadas, catálogos/reglas, pruebas de fallos, integración n8n y mediciones de H01–H07.

**Incluye:** controles de tablas/vistas/RPC/Storage, sesiones admitidas, configuración Auth, dominio/secretos, canal real de WhatsApp, crons, respaldos/restauración, monitoreo, despliegue reproducible y piloto.

**Entregables:** migraciones de T01, matriz de acceso permitido/denegado con evidencias, inventario de configuración sin secretos, runbooks de operación/recuperación, ensayo de restauración y aceptación del piloto.

No introduce nuevas rutas de negocio. Mantiene las cuatro API routes justificadas y completa exposición de recursos existentes. El registro de sesiones no exige una nueva API de login.

<a id="requerimientos-funcionales"></a>
## 3. Requerimientos funcionales

- **H08-RF01 — Aislamiento efectivo.** Usuario no obtiene datos ni objetos ajenos aunque conozca UUID, manipule query/selector o llame directamente al SDK/API. Separación por estudio, empresa, módulo y acciones desde la persistencia.
- **H08-RF02 — Alcances diferentes.** Misma cuenta puede tener permisos distintos entre empresas y módulos; overrides/default deny y restricción de revisión para clientes se cumplen fuera de la interfaz.
- **H08-RF03 — Actividades internas.** Cliente no consulta ni modifica internas; equipo autorizado sí. Empresa nula no implica un recurso público/global.
- **H08-RF04 — Inhabilitación y contraseña.** Cuenta inhabilitada/sesión revocada deja de leer y operar. Renovar token o rehabilitar cuenta no readmite una sesión revocada. Cambio administrativo de contraseña conserva recuperación ante fallo y revoca acceso previo.
- **H08-RF05 — Retiro de permisos.** Responsable que pierde permiso no mantiene acceso por estar asignado; incidencia y reasignación siguen disponibles. No se emiten nuevas URLs de descarga, y una ya emitida caduca en la vigencia breve acordada.
- **H08-RF06 — Recuperación administrativa de acceso.** Configurar Auth acorde al MVP: cuenta lista sin confirmación email, sin registro público ni flujos de recuperación/cambio de contraseña de la aplicación fuera del administrador. Revisar las capacidades directas de Auth, sin aceptar ocultar controles como solución.
- **H08-RF07 — Documentos privados e íntegros.** Solo versiones confirmadas/autorizadas se descargan. Usuario no altera archivos finales, versiones, revisiones o auditoría por un acceso directo, ni valida por sí mismo una carga.
- **H08-RF08 — Reportes autorizados.** Dashboard, búsqueda, auditoría, histórico y exportación respetan el mismo alcance desde llamadas directas. Parámetro `include_deleted` no concede facultad administrativa.
- **H08-RF09 — Canal productivo real.** WhatsApp tiene remitente/destinatarios, contrato, deduplicación persistente y resultados reales verificados. Solo afirmar `delivered` cuando lo confirma el proveedor; los resultados inciertos conservan conciliación.
- **H08-RF10 — Horarios y operación autónoma.** Generación a las 00:05 y digest a las 09:00 de Lima funcionan sin usuario conectado, recuperan fallos y no envían mensajes vacíos/obsoletos.
- **H08-RF11 — Recuperación completa.** Restaurar base y objetos de archivos preserva relaciones, tamaños e integridad de versiones. Revocar sesiones admitidas restauradas y exigir login nuevo; durante ensayo no enviar avisos históricos a usuarios reales.
- **H08-RF12 — Incidencias operativas.** Equipo puede detectar y gestionar generación atrasada/fallida, cargas sin resolver, responsable inválido, integración desconocida/fallida y respaldo ausente, con referencias trazables y datos mínimos.
- **H08-RF13 — Piloto por perfil.** Administrador, contador/supervisor y cliente completan recorridos esenciales con datos autorizados después de pasar controles de acceso y recuperación. Defectos que impidan el MVP se resuelven antes de ampliar operación.
- **H08-RF14 — Capacidad real.** Validar la referencia y consultas habituales en entorno objetivo, con recursos/plans acordes al uso. Medir límites reales de archivos/exportación y ajustes antes de publicación, sin imponer topes comerciales nuevos.
- **H08-RF15 — Publicación y continuidad.** Registrar versión desplegada, pasos de instalación/despliegue y recuperación de fallos. Rollback no borra documentación ni revierte indiscriminadamente migraciones que ya contienen datos nuevos.

**Trazabilidad:** todos los RF originales en su aceptación final, especialmente RF-05, RF-07, RF-15–RF-16 y RF-25–RF-29; RNF-01–RNF-10; D02–D03, D05–D09, D19, D28–D34; T01 y OP01–OP15.

<a id="requerimientos-tecnicos"></a>
## 4. Requerimientos técnicos

- **H08-RT01 — RLS y privilegios completos.** Incorporar migración posterior T01 para tablas, vistas y Storage, con aislamiento y acciones del diseño. Comprobar exposición/privilegios de RPC y acceso anónimo; filtros de UI no son la frontera.
- **H08-RT02 — Identidad confiable.** Actor/estudio/capacidad se derivan de sesión verificada y relaciones del recurso, no de parámetros controlados por navegador. Funciones privilegiadas tienen responsabilidad limitada y no sustituyen la autorización del actor.
- **H08-RT03 — Sesiones admitidas confiables.** Registro/revocación de `app_sessions` con `session_id` verificado y sin JWT/refresh tokens. Lecturas/RPC/Storage verifican cuenta, membresía, sesión y concesiones actuales; no permitir reinsertar/readmitir una sesión revocada.
- **H08-RT04 — Auth real.** Configurar registro/confirmación/correo/recuperación y sesiones; verificar comportamiento por API además de UI. Cerrar bootstrap de una sola ejecución, proteger último administrador y revisar capacidades directas de Auth respecto al alcance acordado.
- **H08-RT05 — Ancestros y conservación.** Reglas de acceso operativo consideran soft delete/inactividad de ancestros; historia administrativa se concede expresamente. RUC/identificación siguen únicos y no se habilitan borrados físicos en cascada.
- **H08-RT06 — Storage protegido.** Buckets privados y separación staging/final, límites reales compatibles, rutas ligadas a intención/versión autorizadas. Impedir confirmación SQL interna desde navegador, sobrescritura de objetos finales y lectura de finales no confirmados. Firmadas de 60 segundos al uso.
- **H08-RT07 — Endpoints limitados/protegidos.** Tres rutas Auth Admin y receptor de receipts con validación real, CSRF cuando corresponde, límites de frecuencia y secretos separados. Operaciones habituales continúan Supabase directo; no crear un API proxy para implantar seguridad.
- **H08-RT08 — Entornos y secretos.** Proyectos separados dev/preview/producción, Vercel/Supabase Cloud y dominio HTTPS canónico. Variables públicas solo URL/clave publicable; secretos fuera del repositorio/bundle/respuestas/logs. `IDEMPOTENCY_HMAC_KEY` queda en servidor administrativo.
- **H08-RT09 — n8n/proveedor reales.** Webhook productivo HTTPS autenticado, persistencia de `delivery_id` y receipts, secretos independientes, remitente/plantillas/condiciones del proveedor verificadas y conciliación operativa. No registrar cabeceras/cuerpos completos privados.
- **H08-RT10 — Programación durable.** Horarios convertidos a la configuración efectiva del ejecutor, con verificación en Lima, identidad de servicio, progreso y alertas. Jobs desactivados en restauración y hasta que el despliegue/configuración estén listos.
- **H08-RT11 — Copias independientes.** Respaldo DB y copia incremental de objetos a destino independiente, más manifiesto de versiones/rutas/tamaños y comprobación de hashes cuando corresponda. Backup PostgreSQL no incluye bytes de Storage.
- **H08-RT12 — Objetivos de recuperación.** Base técnica: respaldo diario, RPO inicial 24 horas, RTO inicial ocho horas y retención de copias 30 días. Validar contra procedimiento/plan real y registrar resultado; retención de backups no elimina archivos/versiones productivos.
- **H08-RT13 — Ensayo de restauración.** Entorno aislado; recuperar DB/objetos, contrastar manifiesto/FK/hash, revocar sesiones restauradas, probar login nuevo y mantener WhatsApp/jobs desactivados. Reconciliar integraciones antes de cualquier reanudación productiva para no duplicar envíos.
- **H08-RT14 — Observabilidad.** Último avance Cron, intenciones estancadas, validaciones fallidas, digests rejected/unknown, responsabilidad inválida, denegaciones anómalas y último respaldo correcto. IDs de correlación y mensajes sanitizados; no salarios/diagnósticos/secretos.
- **H08-RT15 — Despliegue compatible.** Aplicar esquema/funciones compatibles, después frontend y programación. Verificar desde base limpia/versión anterior; evitar rollback destructivo sobre datos nuevos. Registrar versión y procedimiento de recuperación.
- **H08-RT16 — Validación final.** Regresión pertinente CA01–CA34, revisión de Atomic Design/SDK directo, ausencia de secretos, móvil/teclado y capacidad P95 inicial <= 2 segundos según medición acordada, excluyendo transferencias/WhatsApp.

## 5. Matriz de prepublicación obligatoria

Cada fila necesita responsable real y evidencia de cierre en el tablero del equipo. Los valores secretos no se escriben en estos documentos.

| ID del diseño | Trabajo a completar | Evidencia que acredita cierre |
|---|---|---|
| OP01 | Configurar Vercel/Supabase productivos; revisar planes, capacidad, límites y presupuesto vigentes al contratar. | Inventario de proyectos/entornos y capacidad efectiva, sin credenciales. |
| OP02 | Dominio/HTTPS, `APP_BASE_URL`, enlaces y sesión en dominio real. | Prueba de login, retorno interno y enlaces generados. |
| OP03 | Instalar secretos en cada ejecutor; separar salida/receipts y huella HMAC de operaciones administrativas. | Revisión de variables/nombres y build/logs sin valores privados. |
| OP04 | Crear primer administrador mediante bootstrap de una ejecución y cerrarlo. | Alta administrativa y rechazo de reapertura pública; último administrador protegido. |
| OP05 | Configurar Auth y verificar administración/inhabilitación/sesiones/recuperación según alcance. | Pruebas de configuración/API y casos CA04–CA05. |
| OP06 | Catálogo, reglas, plazos, posiciones y responsables de empresas iniciales. | Checklist de configuración y activación válida, sin backlog histórico automático. |
| OP07 | Storage privado, límites, carga/validación, limpieza limitada y descargas. | Pruebas directas permitidas/denegadas y recuperación CA18–CA19/CA29. |
| OP08 | n8n productivo con Header Auth, persistencia y retorno. | Ejecuciones trazadas, duplicado tras reinicio y receipts. |
| OP09 | Proveedor WhatsApp, remitente, destinatarios autorizados y plantillas/condiciones técnicas. | Mensajes de prueba productiva con estado confirmado por proveedor. |
| OP10 | Generación 00:05 y digest 09:00 de Lima en programación efectiva. | Ejecuciones sin navegador y registro de fecha local/progreso. |
| OP11 | Copias DB/objetos, destino independiente, manifiesto, retención y monitoreo. | Última copia correcta, verificación de integridad y registro de configuración. |
| OP12 | Restauración aislada, sesiones revocadas y avisos desactivados. | Ensayo CA25 con duración y relaciones/objetos contrastados. |
| OP13 | Monitoreo e incidencias de sistema/asignación/integración y backups. | Fallos simulados visibles y procedimiento de atención probado. |
| OP14 | Piloto, aceptación por perfiles y medición en entorno objetivo. | Resultado del piloto, métricas y defectos impeditivos resueltos. |
| OP15 | T01 completo en tablas/vistas/RPC/Storage y sesiones. | Matriz de accesos directos permitidos/denegados con evidencias. |

Se verifica el precio/capacidad actual al seleccionar planes, sin congelar en esta documentación cifras o límites comerciales que puedan cambiar.

## 6. Matriz mínima de acceso directo

Probar con sesiones distintas y mediante Data API, RPC, vistas y Storage cuando aplique. Las pruebas no se limitan a navegar con los botones visibles.

| Actor/situación | Permitido | Rechazado |
|---|---|---|
| Anónimo | Flujo de Auth habilitado acorde al alcance. | Datos, objetos privados y operaciones de negocio/administración. |
| Cliente de empresa A | Lectura/carga/descarga de módulos concedidos de A. | Empresa B, módulo no concedido, revisión y actividades internas. |
| Contador de alcance parcial | Revisión/documentos de su alcance y acciones concedidas. | Recursos de otro ámbito y administración de cuentas por rol documental. |
| Supervisor | Revisión y consulta concedidas; carga solo si está configurada. | Acciones fuera de su concesión o facultad administrativa. |
| Administrador | Gestión dentro de su estudio y facultades previstas. | Administración/recurso de otro estudio o borrado histórico arbitrario. |
| Cuenta/membresía inactiva o eliminada | Nuevo acceso solamente después de habilitación pertinente y nueva sesión válida. | Lecturas/operaciones actuales; no aprovechar refresh o vieja sesión. |
| Sesión revocada | Nada de negocio bajo esa sesión. | Reinsertar/admitir su mismo ID o continuar con token renovado. |
| Responsable sin permiso | Identidad histórica permanece visible a administradores elegibles. | Acceso por el hecho de seguir asignado; descargas nuevas. |
| Caller de validación interna | Ejecutor confiable de finalización con responsabilidad limitada. | Confirmación de archivo, auditoría o revisión fabricada desde navegador. |
| Consulta de eliminados | Historia administrativa expresamente autorizada. | Conceder alcance mediante `include_deleted` o restablecer hijos automáticamente. |

Para probar aislamiento entre estudios pueden usarse dos estudios ficticios en el entorno aislado. Esto no implementa la operación comercial multiestudio, que sigue posterior.

<a id="tareas"></a>
## 7. Tareas del hito

| Tarea | Trabajo concreto y entregable | Requisitos |
|---|---|---|
| H08-T01 | Inventariar tablas/vistas/RPC/Storage y acciones expuestas; convertir permisos funcionales en matriz de protección verificable. | RF01–RF03, RF08; RT01, RT02, RT05. |
| H08-T02 | Implementar migración T01, privilegios y RLS de todos los ámbitos, incluidos avisos/históricos/internas y funciones internas. | RF01–RF03, RF07, RF08; RT01, RT02, RT05, RT06. |
| H08-T03 | Completar registro confiable/revocación de sesiones en accesos directos y revisar configuración Auth, último administrador y bootstrap. | RF04, RF06; RT03, RT04, RT07. |
| H08-T04 | Probar retirada de permisos, ancestros eliminados, responsabilidad inválida y descargas firmadas vigentes, sin borrar historia. | RF05, RF07; RT03, RT05, RT06. |
| H08-T05 | Configurar proyectos, dominio, variables/secretos y procedimiento de despliegue compatible en entornos separados. | RF14, RF15; RT08, RT15. |
| H08-T06 | Configurar Storage real y verificar límites/formatos/reanudación, objetos no confirmados y cleanup limitado. | RF07, RF14; RT06, RT08. |
| H08-T07 | Instalar/verificar n8n y proveedor productivos, contactos/plantillas y receipts; probar deduplicación y conciliación. | RF09; RT09. |
| H08-T08 | Configurar y observar Cron real en Lima, con reglas/responsables válidos y recuperación de ejecución fallida. | RF10, RF12; RT10, RT14. |
| H08-T09 | Implementar respaldo DB/objetos/manifiesto independiente con retención/monitoreo y procedimiento incremental. | RF11, RF12; RT11, RT12, RT14. |
| H08-T10 | Ejecutar restauración aislada, medir recuperación, revocar sesiones y verificar que no hay mensajes externos históricos. | RF11; RT11–RT13. |
| H08-T11 | Entregar monitoreo y runbooks de generación/cargas/asignaciones/integración/backup/incidentes. | RF12, RF15; RT10, RT14, RT15. |
| H08-T12 | Ejecutar regresión CA01–CA34 pertinente y medición real; revisar exportaciones, secretos, Atomic Design y acceso SDK directo. | RF01–RF15; RT01–RT16. |
| H08-T13 | Ejecutar piloto con perfiles/empresas autorizados tras cumplir el control previo; resolver defectos impeditivos. | RF13, RF14; RT16. |
| H08-T14 | Consolidar evidencias OP01–OP15, manual operativo y aceptación de publicación, con versión/responsables reales. | RF01–RF15; RT01–RT16. |

## 8. Escenarios y evidencias de aceptación

| Caso | Resultado esperado |
|---|---|
| CA01–CA03 UUID y acceso directo | No hay datos/archivos ajenos, módulos no concedidos ni internas para cliente. |
| CA04 Cuenta inhabilitada con sesión abierta | Lecturas/operaciones bloqueadas y refresh no readmite sesión. |
| CA05 Cambio de contraseña/fallo externo | Sin secretos en registros; solicitud recuperable y sesiones previas no admitidas. |
| CA19 Final de Storage no confirmado | No descargable por usuario; reintento reconcilia sin versión duplicada. |
| CA23 Exportación restringida | Mismo alcance autorizado desde SQL/vistas/RPC, sin filas globales ni fórmulas de texto. |
| CA24 Auditoría directa | No modificable/fabricable por cliente; actor/recurso/decisión íntegros y mínimos. |
| CA25 Restauración | DB/objetos/manifiesto coherentes, login nuevo tras revocación y cero envíos históricos del ensayo. |
| CA28 Responsable sin permiso | No accede; incidencia administrable y reasignación válida. |
| CA29 URL previa a retirar permiso | No se emiten nuevas; la anterior expira dentro de TTL documentado. |
| CA20–CA22 n8n productivo | Resumen vigente/no vacío, deduplicación durable y resultado del proveedor representado con precisión. |
| CA30 Entorno objetivo | Métricas de consultas/capacidad y ajustes previos a publicación registrados. |
| CA31–CA34 Arquitectura/contexto | Supabase directo, Atomic Design, secretos ausentes y caché/canales correctos por contexto. |
| CA06–CA18 y CA26–CA27 regresión | Recorridos de revisión/calendario/laboral/uploads y accesibilidad siguen funcionando después de T01. |

Guardar la evidencia con hito/requisito/caso, entorno, versión desplegada, actores ficticios o autorizados, solicitud/recurso, resultado y defecto asociado si existe. Los reportes no contienen claves, tokens ni documentos personales productivos versionados.

### 8.1 Contenido mínimo de los runbooks

- Instalación/configuración por entorno, bootstrap, migraciones y orden de despliegue.
- Cómo diagnosticar y recuperar generación parcial, intención de carga y responsable inválido.
- Cómo conciliar WhatsApp `unknown` y callbacks, sin repetir ciegamente.
- Cómo verificar última copia, restaurar DB/objetos/manifiesto y comprobar relaciones/hash.
- Cómo revocar sesiones y mantener jobs/avisos desactivados durante recuperación/ensayo.
- Qué hacer ante un despliegue fallido sin borrar documentos ni revertir datos nuevos.
- Responsables operativos reales, referencia de incidentes y evidencia de las pruebas.

<a id="definition-of-done"></a>
## 9. Definition of Done

- [ ] H08-RF01–H08-RF15 y H08-RT01–H08-RT16 tienen evidencia verificable.
- [ ] T01 protege todas las tablas/vistas/RPC/Storage relevantes; acceso anónimo/ajeno/incompatible está rechazado directamente.
- [ ] Cuenta inhabilitada, membresía inactiva y sesión revocada no leen ni operan, incluso con refresh.
- [ ] Contraseña administrativa/aprovisionamiento recuperable, configuración Auth y último administrador están comprobados.
- [ ] Clientes no acceden a internas ni adquieren revisión mediante override.
- [ ] Retirar permiso no mantiene acceso por responsabilidad; descargas nuevas bloqueadas y enlaces previos caducan.
- [ ] Objetos finales no confirmados y funciones internas de validación/auditoría no son accesibles libremente.
- [ ] Reportes, exportaciones, historial y avisos aplican autorización efectiva, además de los filtros.
- [ ] OP01–OP15 están resueltos con responsables/evidencia y sin valores secretos versionados.
- [ ] Dominio/entornos, programación real, n8n/proveedor y estados de WhatsApp se verificaron productivamente.
- [ ] Respaldo DB más objetos/manifiesto funciona; ensayo aislado acredita integridad, revocación y ausencia de avisos históricos.
- [ ] RPO/RTO/retención propuestos fueron medidos/validados o ajustados justificadamente antes de aceptar publicación.
- [ ] Monitoreo, incidencias y procedimientos de atención/recuperación son operativos y consultables.
- [ ] Regresión pertinente CA01–CA34, medición en entorno objetivo, móvil/teclado y revisión de secretos pasan.
- [ ] Piloto por perfiles está aceptado y los defectos que impiden el MVP están resueltos.
- [ ] Se registra versión desplegada, continuidad/recuperación y Definition of Done común; primera versión aceptada por producto.

## 10. Condición para piloto y cierre

El piloto con datos reales comienza únicamente después de verificar T01, acceso privado, respaldos/restauración y configuración crítica. La preparación de pilotos puede adelantarse con datos sintéticos.

Si falta proveedor, credencial, dominio, destino de respaldo o evidencia requerida, H08 permanece abierto y se registra la dependencia concreta. No sustituir configuración real por casilleros marcados a partir de simulaciones.

La operación comercial multiestudio, planes, facturación y demás ampliaciones de la matriz posterior no se incorporan como requisitos de publicación de este MVP.

## 11. Referencias

- [Índice de hitos](README.md).
- [Control de acceso diferido](../diseno-tecnico.md#65-control-de-acceso-técnico-diferido).
- [Entornos, respaldo y publicación](../diseno-tecnico.md#17-entornos-despliegue-y-recuperación).
- [Prepublicación OP01–OP15](../diseno-tecnico.md#20-configuraciones-necesarias-antes-de-publicar).
- [Aceptación CA01–CA34](../diseno-tecnico.md#21-criterios-de-aceptación-y-plan-de-pruebas).
- [Tablas y conservación](../tablas-db.md).
- [Orden general de implementación](../hitos-implementacion.md).
- [Anterior: H07](h07-supervision-reportes.md).
