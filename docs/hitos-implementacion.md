# Hitos de implementación del producto

- **Versión:** 1.0.
- **Fecha:** 10 de octubre de 2026.
- **Destinatarios:** equipo de desarrollo y responsable del producto.
- **Estado:** hoja de ruta acordada; los hitos están pendientes de ejecución. Este archivo no acredita funcionalidades implementadas.
- **Alcance:** primera versión del sistema documental contable y laboral.

## 1. Propósito y documentos de referencia

Este documento convierte el orden de implementación aprobado en ocho hitos verificables. Cada hito reúne base de datos, operaciones, acceso a datos, interfaz y pruebas necesarias para entregar una capacidad funcional.

Una tabla, una migración, un componente o una pantalla aislada son tareas de un hito. El hito se cierra cuando su recorrido funciona y existe evidencia de sus criterios de aceptación.

Fuentes del alcance:

| Documento | Uso para el equipo |
|---|---|
| [Diseño técnico](diseno-tecnico.md) | Decisiones confirmadas, contratos, reglas, fases F01–F05 y casos CA01–CA34. |
| [Tablas DB](tablas-db.md) | Las 29 tablas propuestas, tipos, relaciones, restricciones, JSONB y conservación. |
| [Diagrama de flujo](diagrama-flujo.md) | Generación, entrega, revisión, corrección, reapertura y avisos. |
| [Flujo de navegación](flujo-navegacion.md) | Rutas, pestañas, perfiles y estados de pantalla. |
| [Estructura de carpetas](estructura-carpetas.md) | Atomic Design, funcionalidades, repositorios, hooks y fronteras cliente/servidor. |
| [Análisis original](analisis_completo_sistema_documental_contable.md) y [resumen ejecutivo](resumen_ejecutivo_sistema_documental_contable.md) | Contexto funcional y necesidades del negocio. Las decisiones recientes prevalecen sobre propuestas anteriores. |

Los ocho hitos y su orden están **confirmados por el usuario**. La división de tareas y las demostraciones propuestas aquí son **bases técnicas de ejecución**. Fechas, duración, responsables y capacidad de cada sprint deberán ser definidos por el equipo; este documento no los inventa ni amplía el alcance.

## 2. Orden general y dependencias

| Hito | Resultado | Dependencia principal | Correspondencia con el diseño |
|---|---|---|---|
| [H01 — Preparación técnica](#h01--preparación-técnica) | Entorno reproducible y conexión Next.js–Supabase. | Ninguna funcionalidad de negocio previa. | Preparación de F01. |
| [H02 — Acceso y empresas](#h02--acceso-y-empresas) | Cuentas, empresas y asignaciones utilizables. | H01. | F01. |
| [H03 — Primer recorrido documental](#h03--primer-recorrido-documental) | Entregar, revisar, observar y corregir una obligación tributaria. | H02 y tablas auxiliares requeridas por sus FK. | Primera entrega de F02 y validación inicial de Tributario. |
| [H04 — Motor documental completo](#h04--motor-documental-completo) | Generación, periodicidades, plazos e historial completos. | H03. | Completa F02. |
| [H05 — Tres áreas documentales](#h05--tres-áreas-documentales) | Tributario, Laboral general y expediente por trabajador. | H04. | F03. |
| [H06 — Actividades y notificaciones](#h06--actividades-y-notificaciones) | Bandeja completa, actividades adicionales y avisos internos/WhatsApp. | H04–H05; eventos de negocio iniciados en H03. | F04. |
| [H07 — Supervisión y reportes](#h07--supervisión-y-reportes) | Indicadores, búsqueda y exportaciones consistentes. | H05–H06. | Parte funcional de F05. |
| [H08 — Preparación para producción](#h08--preparación-para-producción) | Control de acceso completo, recuperación y piloto comprobados. | H01–H07 y configuraciones de publicación. | T01 y cierre operativo de F05. |

El orden define dependencias, no obliga a esperar para cualquier tarea independiente. Por ejemplo, preparar componentes de interfaz o contratos de integración puede adelantarse; cerrar un hito exige que sus dependencias y pruebas estén listas.

Una tabla puede existir antes de su pantalla. El motor usa referencias a trabajadores/etapas laborales, por lo que workers y employment_periods pueden necesitar su esquema base durante H03. La gestión completa del expediente y sus recorridos se cierra en H05. No crear FK hacia tablas inexistentes ni debilitar integridad para simular que una funcionalidad está terminada.

## 3. Reglas comunes para todos los hitos

1. **Next.js y Supabase directo.** Consultas habituales con SDK desde el frontend. Usar RPC para operaciones transaccionales; Route Handlers únicamente para Auth Admin y recepción autenticada de n8n, según contratos existentes. La validación binaria y trabajos con secretos corresponden a funciones confiables.
2. **Atomic Design obligatorio.** Átomos, moléculas, organismos, templates y páginas con responsabilidades delimitadas. Organismos y componentes compartidos reciben datos/callbacks; no consultan Supabase. Páginas, hooks y repositorios permanecen separados.
3. **Migraciones desde el inicio.** Versionar cambios coherentes de tablas, restricciones, índices, funciones y vistas necesarias. Una funcionalidad puede requerir varias tablas/migraciones; una pantalla no exige automáticamente una vista SQL. Migraciones ya compartidas/desplegadas se corrigen con nuevas migraciones.
4. **Integridad y conservación desde cada tabla.** Incorporar organization_id donde corresponda, FK de contexto, unicidad, metadatos, revision y soft delete según el diccionario. Mantener RUC e identificación laboral únicos incluso tras eliminación lógica; restaurar registros existentes.
5. **Sin cascadas físicas.** Eliminación lógica, inhabilitación, empresa inactiva, cese y regla pausada son operaciones diferentes. Conservar versiones, revisiones y auditoría; cancelar obligaciones con motivo.
6. **Auditoría y concurrencia desde cada operación crítica.** Confirmar cambios relacionados en transacciones; request_id evita duplicados y expected_revision impide sobrescribir decisiones concurrentes. No aplazar toda la auditoría hasta reportes.
7. **Secretos protegidos desde H01.** Credenciales administrativas y tokens de integración fuera del bundle público, respuestas y logs. RLS posterior no autoriza usar claves administrativas en navegador.
8. **RLS diferido a H08.** H01–H07 usan datos ficticios en entornos aislados. Los filtros y controles UI no acreditan aislamiento de Data API/Storage. Las pruebas completas de acceso, inhabilitación y sesiones se cierran con T01.
9. **Verificación por comportamiento.** Probar reglas, integridad, concurrencia y recorridos relevantes. No añadir pruebas que solo repitan el JSX de cada átomo.
10. **Convenciones del repositorio.** Antes de escribir código Next.js, leer las guías pertinentes de la versión instalada bajo node_modules/next/dist/docs, conforme a AGENTS.md.

## H01 — Preparación técnica

**Objetivo:** disponer de una base técnica reproducible que permita desarrollar y verificar las funcionalidades siguientes.

**Alcance:**

- Preparar Next.js, TypeScript, estilos/tokens y la organización por funcionalidades del documento de carpetas.
- Configurar un entorno de desarrollo Supabase local o aislado, separado de producción.
- Establecer historial de migraciones, datos ficticios y procedimiento de reconstrucción de la base de desarrollo.
- Configurar el adaptador de navegador y separar los adaptadores administrativos de servidor.
- Preparar generación de tipos a partir del esquema real disponible, contratos básicos y normalización de errores.
- Incorporar átomos/moléculas/templates mínimos según necesidades reales: campos, botones, feedback y estructura de pantalla.
- Documentar variables de entorno por nombre, sin valores reales versionados.

**Entregables:** proyecto ejecutable, conexión de desarrollo, estructura inicial, componentes base y guía de arranque/reconstrucción para el equipo.

**Criterios de cierre:**

1. Otro integrante puede instalar, configurar y ejecutar el proyecto siguiendo instrucciones guardadas en el repositorio.
2. Las migraciones disponibles reconstruyen la base de desarrollo con datos ficticios, sin cambios manuales ocultos.
3. Se demuestra conexión con Supabase sin exponer una credencial administrativa.
4. Las comprobaciones de tipado, lint y build pertinentes pasan.
5. Las fronteras cliente/servidor y Atomic Design tienen una implementación mínima revisable.

**Evidencia:** pasos reproducibles de arranque, resultado de verificaciones y demostración de conexión. No ejecutar resets sobre una base de producción.

**Relación con aceptación:** base de CA31–CA33; estos criterios vuelven a comprobarse en los módulos posteriores.

## H02 — Acceso y empresas

**Objetivo:** permitir al administrador preparar usuarios, empresas y asignaciones para operar el primer recorrido documental.

**Alcance:**

- Estudio inicial, perfiles asociados a Auth, membresías y empresas.
- Roles, permissions, relaciones de permisos, asignaciones por empresa/módulo y excepciones configurables.
- Configuración de responsable de entrega por empresa/módulo.
- Bootstrap confiable del primer administrador; no publicar un endpoint abierto para crearlo.
- Login directo con Supabase Auth; sin registro público ni recuperación de contraseña por correo.
- Crear cuenta, cambiar contraseña e inhabilitar/rehabilitar mediante los tres contratos administrativos autorizados.
- Soft delete/restauración de las entidades aplicables, protección del último administrador y unicidad de RUC.
- Selector de empresa, navegación autenticada, estados de acceso previstos y limpieza de caché al cambiar usuario/contexto.
- Base de auditoría e idempotencia para las operaciones implementadas.

**Tablas principales:** organizations, profiles, organization_members, companies, roles, permissions, role_permissions, access_grants, grant_permission_overrides, company_module_settings, audit_events y operation_requests. La base de app_sessions se incorpora cuando la gestión Auth la requiera; su registro/revocación y enforcement definitivo se verifican en H08.

**Entregables:** login, pantallas de empresas/usuarios/configuración necesarias y operaciones administrativas conectadas.

**Criterios de cierre:**

1. Administrador crea una cuenta y la asigna a una empresa/módulo.
2. Usuario inicia sesión y la interfaz presenta su contexto y capacidades configuradas.
3. Cambiar empresa no muestra respuestas tardías del contexto anterior; salir retira datos de la sesión.
4. Crear una empresa con RUC ya existente, incluido un registro eliminado, exige tratar/restaurar esa identidad.
5. Restaurar no habilita cuentas ni restaura hijos por sí mismo.
6. Fallos de aprovisionamiento tienen estado recuperable; contraseñas y secretos no aparecen en auditoría.
7. Los componentes reutilizables y el transporte respetan las reglas comunes.

**Demostración:** dos empresas ficticias, un administrador y un usuario con facultades diferentes por empresa/módulo. Verificar recorridos y configuración, sin presentar filtros visuales como aislamiento ya demostrado.

**Relación con aceptación:** CA24 y CA31–CA34 según alcance implementado. Preparar escenarios CA01–CA05 y CA28–CA29; su cierre integral corresponde a H08.

## H03 — Primer recorrido documental

**Objetivo:** validar el proceso central completo con una obligación tributaria mensual antes de extenderlo a todas las áreas.

**Alcance:**

- Catálogo y primera regla versionada con periodo, plazo y dos entregables requeridos.
- Creación idempotente de una obligación con snapshot y responsable heredado.
- Listado básico y detalle común de obligación bajo las rutas ya definidas.
- Reserva de intención, carga directa/reanudable a Storage y validación confiable de bytes/formato/tamaño.
- Confirmación de versión, cabecera y primera entrega del ciclo; recuperación del fallo entre almacenamiento y base.
- Revisión individual mediante RPC: aprobar, observar con comentario/nuevo plazo y recibir corrección.
- Historial de versiones y revisiones; auditoría y eventos/notificaciones internos de las acciones implementadas.
- Estados de carga, vacío, rechazo, error y conflicto; interfaz utilizable con teclado/móvil.

**Tablas principales:** document_types, requirement_rules, rule_versions, periods, obligations, deliverables, submission_cycles, upload_intents, document_versions, review_events, notification_events y notifications. Crear las dependencias auxiliares de workers/employment_periods y las FK cíclicas en orden consistente, aunque sus pantallas completas lleguen en H05.

**Entregables:** flujo integrado de cliente y revisor con datos ficticios. La bandeja inicial de Actividades muestra obligaciones; no requiere otra tabla de tareas.

**Criterios de cierre:**

1. La generación repetida produce una sola obligación y los dos entregables previstos.
2. Cargar un archivo válido crea una versión recuperable; un archivo rechazado no confirma versión.
3. Una aprobación de dos muestra avance 1/2 y conserva la obligación incompleta.
4. Observar el otro archivo exige comentario y nueva fecha; corregir crea otra versión y conserva la anterior.
5. Aprobar todos completa la obligación.
6. Entregas puntuales pendientes de revisión no se clasifican como atraso del cliente.
7. Una operación concurrente desactualizada devuelve conflicto, sin sobrescribir la decisión ganadora.
8. Interrupción de carga o fallo Storage/SQL se recupera con la misma intención sin duplicar versión.

**Demostración:** cliente entrega dos archivos; revisor aprueba uno y observa el otro; cliente corrige y revisor aprueba. Consultar historial y cumplimiento resultante.

**Relación con aceptación:** CA06–CA09, CA11–CA12, CA18–CA19, CA24, CA27 y CA31–CA34 para este recorrido. La reapertura completa se cierra en H04.

## H04 — Motor documental completo

**Objetivo:** convertir el recorrido inicial en un motor reutilizable de generación, entrega y revisión con todas las condiciones del MVP.

**Alcance:**

- Periodicidades única, diaria, semanal, quincenal, mensual, trimestral, semestral, anual, eventual y personalizada por intervalos.
- Calendario civil de America/Lima, cierre de día y reglas de cálculo documentadas.
- Activación/versionado de reglas, vigencia y snapshots históricos; formatos, tamaños y número de entregables configurables.
- Generación programada e idempotente, cursor, lotes y recuperación de indisponibilidad.
- Empresa nueva desde periodo vigente; sin pendientes automáticos de periodos anteriores.
- Herencia/reasignación de responsables y manejo visible de asignaciones no elegibles.
- No aplica, cancelación con motivo y exclusión correcta de indicadores/avisos.
- Reapertura autorizada con motivo, nuevo plazo y nueva versión; aprobación anterior conservada.
- Pausas por estado/soft delete y restauración sin generar backlog deliberadamente excluido.
- Limpieza controlada de recepción temporal; conservación de versiones finales y registros históricos.

**Entregables:** configuración del motor, funciones SQL/RPC, tareas programadas y componentes documentales compartidos consolidados.

**Criterios de cierre:**

1. Cada periodicidad produce sus ocurrencias y destinos previstos; probar cambios de año, bisiestos, meses cortos y anclas.
2. Generaciones concurrentes/reintentadas no duplican instancias ni adelantan cursores incompletos.
3. Cambiar una regla afecta ocurrencias nuevas según vigencia; obligaciones existentes conservan sus condiciones.
4. Soft delete/pausa frena nuevos usos pertinentes; restaurar conserva estados y excluye intervalos pausados.
5. Reabrir retira cumplimiento actual del archivo hasta nueva aprobación y conserva toda su historia.
6. No aplica/cancelled se excluyen de exigibles; sin exigibles se muestra Sin obligaciones.
7. Una incidencia de responsable se hace visible y puede reasignarse sin conceder permisos automáticamente.
8. Las reglas de negocio y las funciones transaccionales se reutilizan desde los módulos siguientes.

**Relación con aceptación:** CA10–CA14, CA16–CA17 y CA26, más regresión de los escenarios documentales de H03. La autorización efectiva tras retirar permisos se verifica en H08.

## H05 — Tres áreas documentales

**Objetivo:** completar el uso del motor en Tributario, Laboral general y Laboral por trabajador.

**Alcance:**

- Completar catálogo/configuración y recorridos tributarios previstos.
- Laboral general por empresa, reutilizando generación, carga, plazos y revisión.
- Alta/edición de trabajador e identificación única por empresa, incluidos registros eliminados.
- Etapas laborales separadas, remuneraciones y expediente documental por etapa.
- Ingreso, documentación durante la relación, cese con fecha/motivo y reingreso.
- Aplicabilidad de documentos por evento/motivo; no exigir carta de renuncia cuando no corresponde.
- Soft delete/restauración del trabajador sin inventar cese ni borrar etapas.
- Pestañas en ficha de empresa y ruta de expediente existente; no crear rutas nuevas independientes para cada módulo.

**Tablas específicas:** workers y employment_periods, completando operaciones/validaciones del esquema auxiliar introducido para el motor. Los documentos siguen usando las mismas obligations, deliverables, versiones y revisiones.

**Entregables:** las tres áreas operativas y expediente laboral histórico, con componentes compartidos de carga/revisión.

**Criterios de cierre:**

1. Cada área permite configurar, generar, entregar, observar/corregir y aprobar sus documentos.
2. Ingreso y cese producen documentación pertinente en la etapa correcta.
3. Reingreso crea una etapa distinta; no reutiliza ni sobrescribe la anterior.
4. Se impide una segunda etapa abierta o superposición inválida para el mismo trabajador.
5. Activo/cesado se deriva de las etapas; eliminación lógica es una condición diferente.
6. La identificación eliminada se restaura en lugar de duplicarse.
7. Seleccionar una etapa ajena/inexistente no presenta el expediente de otra identidad.
8. Remuneraciones y exámenes se incluyen en el acceso laboral acordado; su protección definitiva se prueba en H08.
9. Las áreas comparten la implementación documental y conservan filtros/retorno al origen.

**Demostración:** una empresa ficticia con documentos de las tres áreas y un trabajador que ingresa, cesa y reingresa. Consultar ambos expedientes sin mezclar sus documentos.

**Relación con aceptación:** CA15–CA16 y regresión del motor; CA27 y CA31–CA34. Pruebas directas de alcance laboral se cierran en H08.

## H06 — Actividades y notificaciones

**Objetivo:** centralizar el trabajo pendiente y ofrecer avisos útiles sin duplicados técnicos.

**Alcance:**

- Completar bandeja Actividades sobre obligations de las tres áreas y de clase additional.
- Filtros por empresa/módulo/responsable/periodo/estado operativo; vencidas primero y prioridades alta/media/baja.
- Actividades adicionales administradas, internas o vinculadas a empresa, únicas/recurrentes y con archivos/revisión obligatorios.
- Responsable de entrega; revisión por cualquier contador/supervisor con permiso.
- Indicador separado del cumplimiento documental de las tres áreas.
- Centro de notificaciones, enlaces al detalle y estados de lectura; no atribuir acceso por recibir un enlace.
- Completar eventos de plazos/asignaciones/revisión y su deduplicación.
- Resumen diario WhatsApp mediante webhook autenticado hacia n8n; recepción de resultados autenticada en Next.js.
- Registro de intentos, caducidad, errores, resultado ambiguo y conciliación.

**Tablas específicas:** whatsapp_digests e integration_attempts; completar notification_events/notifications iniciadas con el flujo documental. Actividades no crea otra tabla de tareas.

**Entregables:** bandeja y creación de actividades completas, notificaciones internas e integración n8n comprobada con destinatarios de prueba.

**Criterios de cierre:**

1. Una obligación aparece con la misma identidad desde su área y desde Actividades.
2. Actividad adicional exige archivos y aprobación; internas no se ofrecen a perfiles cliente.
3. Fecha operativa y grupos distinguen entrega pendiente, revisión y corrección; no confunden vencimiento con aprobación.
4. Sin avisos elegibles no se prepara/envía un mensaje vacío.
5. Existe un resumen por estudio/usuario/fecha local, con contenido e identificador congelados.
6. Repetir delivery_id se deduplica persistentemente en n8n, incluso tras reinicio del workflow.
7. Repetir receipt_id no duplica registro/efectos; un callback tardío no degrada delivered.
8. HTTP accepted no se presenta como WhatsApp delivered; sent/delivered requieren evidencia del proveedor.
9. Fallo ambiguo queda unknown y se concilia antes de otro intento que pudiera duplicar un envío.
10. Webhooks no transportan archivos, URLs firmadas, contraseñas, salarios ni comentarios médicos.

**Verificación de integración:** usar proveedor/entorno de prueba disponible y simulaciones deterministas de timeout, 429/5xx, duplicados y callbacks desordenados. La validación del canal/proveedor de producción se cierra en H08; no posponer la implementación de deduplicación hasta ese momento.

**Relación con aceptación:** CA20–CA22 y CA31–CA34. CA03 y el acceso efectivo de destinatarios se cierran en H08.

## H07 — Supervisión y reportes

**Objetivo:** permitir supervisar el producto con indicadores y exportaciones conciliados con los documentos.

**Alcance:**

- Dashboard con pendientes, por revisar, observaciones, vencimientos y cumplimiento por empresa/módulo.
- Cumplimiento documental y actividades adicionales separados; cálculo global ponderado por obligaciones.
- Búsqueda transversal por metadatos y filtros/paginación acordados.
- Reportes de cumplimiento, pendientes, vencimientos y observaciones.
- Exportación Excel/PDF desde navegador sobre todos los lotes del resultado solicitado, no solo la página visible.
- Consulta de auditoría e historial según capacidades previstas, incluyendo tratamiento administrativo de eliminados.
- Estados vacíos, carga/error y navegación de indicadores hacia los listados/detalles existentes.

**Entregables:** dashboard, buscador, reportes, exportadores y consulta de auditoría.

**Criterios de cierre:**

1. Los totales de dashboard, detalle, reportes y exportación coinciden para el mismo conjunto de datos/filtros.
2. Una obligación parcialmente aprobada no cuenta como completa.
3. Una entrega puntual pendiente de revisión no aparece como atraso del cliente.
4. El cumplimiento global se obtiene de totales y no del promedio simple de porcentajes.
5. Sin exigibles se muestra Sin obligaciones; no se inventa 0 % o 100 %.
6. La exportación incluye todas las filas del resultado solicitado y trata textos para evitar fórmulas ejecutables no previstas.
7. Eliminación/restauración conserva historia y unicidad; consultas operativas no incluyen eliminados.
8. La auditoría conserva actor, recurso, momento y decisión sin datos sensibles indebidos.
9. Medir consultas habituales con referencia sintética de 30 empresas, 100 usuarios y 1.000 trabajadores, y registrar ajustes pendientes.

**Relación con aceptación:** CA17, CA23–CA24 y CA30–CA34. Verificar funcionalidad de filtros aquí; demostrar autorización de resultados/exportaciones contra acceso directo en H08.

## H08 — Preparación para producción

**Objetivo:** demostrar que la primera versión puede operar con datos reales, con acceso controlado y recuperación comprobada.

**Alcance:**

- Completar T01: RLS de tablas/vistas/Storage, privilegios y exposición de RPC, aislamiento por estudio/empresa/módulo.
- Registro confiable de sesiones, inhabilitación/revocación, cambio administrativo de contraseña y comportamiento tras retirar permisos.
- Verificar lectura, modificación y descarga directa con sesiones de distintos alcances; no limitar pruebas a botones ocultos.
- Configurar dominio, entornos, claves, webhook de producción, proveedor WhatsApp y parámetros efectivos.
- Respaldos independientes de base y objetos Storage, manifiesto de archivos y ensayo de restauración.
- Monitoreo de generación, validación de archivos, integraciones, errores y respaldos.
- Despliegue reproducible y procedimiento de recuperación ante fallos.
- Piloto con usuarios autorizados después de superar los controles anteriores.

**Entregables:** controles de acceso completos, evidencias de pruebas directas, configuración operativa, manual de recuperación y resultado del piloto.

**Criterios de cierre:**

1. Usuario de empresa A no obtiene datos/archivos de B aunque conozca sus UUID.
2. Permisos diferentes por empresa/módulo y actividades internas se respetan desde Data API, RPC, vistas y Storage.
3. Cuenta inhabilitada no realiza nuevas operaciones/lecturas; sesiones revocadas no se rehabilitan por renovación.
4. Cambio de contraseña y fallos externos se resuelven sin filtrar secretos ni dejar acceso previo admitido.
5. Retirar permiso a un responsable no le concede acceso por su asignación histórica; descargas nuevas se bloquean y URLs previas expiran según la vigencia acordada.
6. Bundle público, logs, auditoría y respuestas no contienen credenciales administrativas/tokens.
7. Restaurar DB y Storage mantiene relaciones/integridad del manifiesto; revoca sesiones anteriores y evita avisos de prueba a usuarios reales.
8. Se documentan credenciales/configuración por entorno sin versionar valores secretos.
9. WhatsApp de producción confirma el estado que realmente informa su proveedor, sin prometer delivered cuando solo dispone de sent.
10. El piloto verifica recorridos de administrador, contador/supervisor y cliente, y resuelve defectos que impidan los criterios del MVP.

**Relación con aceptación:** cierre integral de CA01–CA05, CA23, CA25, CA28–CA29 y demás controles de T01; regresión final pertinente de CA01–CA34, con CA30/CA33 revisados para el entorno real.

**Condición para iniciar el piloto con datos reales:** T01 y configuración de acceso privado comprobados, respaldos/restauración ensayados y tareas de prepublicación críticas resueltas. H08 sigue abierto si faltan credenciales, proveedor o verificaciones necesarias; una simulación no acredita la configuración productiva.

## 4. Forma de trabajar dentro de cada hito

Aplicar esta secuencia por funcionalidad:

1. **Contrato y aceptación:** definir entrada, actor/alcance, resultado, errores y demostración.
2. **Base de datos:** crear migraciones de tablas/relaciones/restricciones/índices y RPC necesarias; resolver dependencias y ciclos de FK.
3. **Verificación de persistencia:** aplicar en desarrollo y comprobar restricciones, transacciones e idempotencia; actualizar tipos generados.
4. **Acceso a datos:** implementar contratos, mappers, repositorios y hooks con Supabase directo.
5. **Presentación:** componer páginas y componentes con Atomic Design; incluir estados de error/carga/conflicto.
6. **Recorrido completo:** verificar criterios con datos ficticios y fallos relevantes; cerrar aislamiento completo en H08.
7. **Entrega al equipo/producto:** registrar evidencia y actualizar documentación afectada.

El modelo de 29 tablas guía las dependencias; no obliga a construir toda la base antes del primer recorrido de interfaz. Tampoco obliga a una migración por tabla ni a duplicar el motor dentro de cada módulo.

Una aprobación/observación, por ejemplo, debe confirmar revisión, estado/ciclo, auditoría y eventos relacionados en una operación transaccional. Crear esos registros desde varias llamadas independientes del navegador no satisface el contrato del hito.

## 5. Evidencia y definición de terminado

Para cerrar un hito, el equipo debe entregar:

- Funcionalidad ejecutable y demostración del recorrido descrito.
- Migraciones versionadas, aplicables desde una base de desarrollo limpia, con datos ficticios reproducibles.
- Tipos/contratos y documentación coherentes con lo implementado.
- Resultado de las pruebas pertinentes, incluidas restricciones, errores y conflictos relevantes.
- Revisión de Atomic Design, fronteras de datos y secretos.
- Defectos pendientes registrados con impacto; ninguno impide los criterios de cierre.
- Conformidad del responsable de producto sobre la demostración y el alcance entregado.

Un porcentaje de tareas terminadas o pantallas diseñadas no reemplaza esa evidencia. Las verificaciones de T01 se marcan expresamente pendientes hasta H08.

Plantilla sugerida para convertir alcance en tareas del tablero:

| Dato de la tarea | Contenido esperado |
|---|---|
| Hito y capacidad | Hxx y resultado concreto que aporta. |
| Dependencias | Operaciones/tablas/contratos que deben existir. |
| Trabajo DB | Migración, restricciones/RPC/vista necesaria; indicar si no aplica. |
| Trabajo aplicación | Repositorio, hook, composición y ruta existente afectada. |
| Criterios | Entrada, resultado y casos de fallo/concurrencia pertinentes. |
| Evidencia | Prueba o demostración que confirma el resultado. |
| Responsable/estado | Asignación real del equipo; pendiente/en curso/en verificación/cerrada. |

## 6. Límites de esta primera versión

Los ocho hitos pertenecen al mismo MVP. Empezar H03 con una regla mensual es una prueba inicial del motor; no elimina las periodicidades comprometidas que se completan en H04. Mostrar una bandeja básica en H03 no reemplaza las actividades adicionales ni avisos completos de H06.

Quedan para versiones posteriores las ampliaciones de la [matriz de pendientes](diseno-tecnico.md#191-matriz-de-pendientes): operación comercial con varios estudios, planes/facturación, correo/SMS/push, firma digital, aplicación móvil nativa, integraciones externas adicionales, OCR/IA, calendario tributario integrado y reportes/indicadores avanzados.

Dominio, credenciales, proveedor WhatsApp, webhook real, configuración de respaldos y T01 son tareas para publicar esta primera versión, no funcionalidades aplazadas. La lista completa de [prepublicación](diseno-tecnico.md#20-configuraciones-necesarias-antes-de-publicar) se resuelve en H08.

Valores iniciales ya documentados —America/Lima, 20.000.000 bytes por archivo, ventana de siete días y resumen a las 09:00— son bases técnicas configurables. El equipo no debe convertirlas silenciosamente en límites inmutables ni deducir fechas legales de SUNAT.
