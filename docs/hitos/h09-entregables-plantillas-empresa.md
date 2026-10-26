# H09 — Entregables, plantillas por régimen y configuración documental de empresas

**Estado: implementado y validado en Docker; SQL publicado en Cloud por solicitud posterior del usuario.** Acuerdos confirmados el 25/10/2026. Dependencias funcionales: H02–H05 y vista documental por periodos. Su cierre es independiente de los pendientes operativos de H08. Evidencias: [H09](evidencias/h09.md) y [publicación SQL](evidencias/h09-cloud.json). El frontend H09 permanece validado localmente, pendiente de despliegue. Aplican [las reglas del agente](../../.agents/rules.md), [desarrollo](../desarrollo.md) y la Definition of Done común del [índice](README.md).

## Objetivo y alcance

Preparar automáticamente los entregables aplicables a cada empresa nueva desde una plantilla publicada de su régimen, con una presentación comprensible y una lista documental única. Mantener archivos, revisiones, periodos, autorizaciones e historial existentes. El alcance inicial fue local, sin modificar automáticamente empresas anteriores. La solicitud posterior autorizó publicar las once migraciones pendientes en Cloud, sin fixtures, despliegue de frontend ni cambios de automatización.

## Acuerdos confirmados

1. «Reglas» pasa a «Entregables» en la interfaz. Catálogo de entregables, Plantillas por régimen y Entregables por empresa son niveles distintos. Las posiciones de archivo se llaman Archivos requeridos.
2. Ocho opciones cerradas: Nuevo RUS; RER - Régimen Especial de Renta; MYPE - Régimen Mype Tributario; RG - Régimen General; 4ta Categoría; 1ra Categoría; 2da Categoría; 5ta Categoría. No deducir obligaciones legales del nombre ni de un RUC.
3. Cada régimen dispone de un borrador editable independiente. El administrador confirma incluidos, frecuencias, formatos, archivos y plazos antes de publicar. Publicar exige validar todos los incluidos. No inventar vencimientos.
4. El checklist de empresa comienza siempre sin seleccionar. Exigir PLAME o IGV renta antes de terminar el alta. Elegir régimen no selecciona opciones.
5. PLAME habilita Laboral por trabajador y Laboral general. AFP requiere PLAME y añade Planilla AFP y Pago AFP. Sin AFP se conservan los demás entregables laborales; no añadir documentos ONP.
6. Con PLAME, elegir expresamente SIS, EsSalud o Sin entregables de seguro. SIS y EsSalud son excluyentes; sin PLAME se limpia AFP y se fija Sin entregables de seguro.
7. IGV renta habilita Tributario. Los tipos concretos proceden de la plantilla del régimen, no de una inferencia tributaria automática.
8. Incorporar Reporte EsSalud y Pago EsSalud como alternativas a Reporte SIS y Pago SIS.
9. Alta con datos, módulos/cobertura y resumen. Plantilla no publicada bloquea finalizar. Empresa y configuración se crean juntas, con versión confirmada, control de concurrencia e idempotencia.
10. Responsables se asignan después: estado Pendiente de responsable, sin obligaciones ni avisos. La asignación exige permisos previos; no los concede. Solo activa la preparación pendiente, nunca pausas administrativas.
11. Asignación tardía inicia el periodo vigente de cada frecuencia, respetando un inicio futuro. No recuperar automáticamente periodos anteriores.
12. Tipos iniciales y adicionales forman una lista continua por empresa y etapa: tres aplicables → 01, 02, 03; el siguiente → 04. Siete → siguiente 08. No «Otros tipos configurados». Orden independiente de los conteos del mes.
13. Tipos configurados sin obligaciones muestran Pendiente de responsable, Programado, Pausado o Sin obligaciones en este periodo. Varios requerimientos del mismo tipo se agrupan en un acceso.
14. Nuevo entregable: Empezar a solicitar desde, fecha explícita predeterminada a hoy en Lima o inicio de control posterior. Edición: Aplicar cambios desde el próximo periodo permitido o uno posterior válido. Conservar las condiciones ya emitidas.
15. Vencimiento recurrente: cierre, N días después o N días antes; eventual: fecha del evento; único: fecha explícita. La simulación explica inicio, primer periodo y fecha límite sin efectos de negocio.
16. Modificar una plantilla no modifica empresas anteriores. Agregar un entregable particular no modifica su plantilla.
17. Conservar empresas ficticias de Docker y el sistema de presentación en 4001. Pruebas con posibles interrupciones en laboratorio local aislado. Cloud, Vercel y automatizaciones productivas fuera de alcance.

**Base técnica acordada en el plan:** para cambios futuros de régimen/checklist en una empresa creada, presentar qué se añade, deja de solicitarse o conserva, y confirmar antes de aplicar. Mantener ajustes propios, obligaciones emitidas e historial.

Especificación de implementación y contratos: [entregables y plantillas](../entregables-plantillas-empresa.md). Diccionario físico: [extensión H09](../tablas-db.md#extensión-h09--plantillas-y-perfil-documental).

## Condiciones del checklist

| Condición | Validación y efecto |
|---|---|
| Ningún módulo seleccionado | Bloquear finalizar; explicar PLAME o IGV renta. El régimen por sí solo no selecciona nada. |
| IGV renta sin PLAME | Tributario; AFP deshabilitada y cobertura none. |
| PLAME sin elegir cobertura | Bloquear continuar; exigir SIS, EsSalud o Sin entregables de seguro. |
| AFP sin PLAME | Rechazar en interfaz y PostgreSQL. |
| PLAME + AFP | Ambos módulos laborales y los dos tipos AFP, además de la cobertura elegida. |
| PLAME + SIS | Reporte SIS y Pago SIS; excluir ambos EsSalud. |
| PLAME + EsSalud | Reporte EsSalud y Pago EsSalud; excluir ambos SIS. |
| PLAME sin seguro | Excluir SIS y EsSalud; AFP depende de su casilla. |
| Desactivar PLAME | Limpiar AFP/cobertura, conservar IGV renta y explicar el cambio. Volver a marcar exige elegir cobertura nuevamente. |
| Plantilla sin publicar | Impedir el alta; indicar pendientes de ese régimen y ofrecer abrir su configuración sin perder el borrador de empresa. |
| Publicación cambió desde el resumen | Rechazar por conflicto; actualizar el resumen y confirmar la versión vigente. |

Los incluidos/excluidos de la plantilla se aplican después del checklist. No inferir obligaciones legales de estos códigos ni incorporar ONP. Los valores reales de cada régimen requieren confirmación del administrador.

## Estados, contratos y conservación

| Recurso | Estado o contrato |
|---|---|
| Plantilla | Cabecera por estudio/régimen; última versión y publicación vigente separadas. |
| Borrador | Configuración editable con periodicidad/plazo incompletos; faltantes por código/nombre. |
| Publicada | Inmutable en PostgreSQL; editar crea un nuevo borrador. No actualiza empresas anteriores. |
| Preparación | `preparation_pending=true`, sin responsable operativo, obligaciones ni avisos. |
| Activación | Permiso de entrega previo y responsable elegible. Se inicia la ocurrencia vigente y se conservan inicio futuro, lotes y cursores. |
| Pausa manual | Nunca reactivada al volver a guardar responsable; conserva historial. |
| Evento laboral | Se reutiliza el evento registrado si ocurrió durante la preparación; no se inventan ingresos/ceses/eventuales. Se conserva avance H05. |
| Empresa anterior | Perfil NULL y configuración conservados. Una edición de contacto no vacía el régimen histórico ni aplica una plantilla. |
| Cambio de perfil H09 | Mostrar añadir/dejar de solicitar/conservar y confirmar; mantener ajustes propios compatibles y las obligaciones emitidas. |

RPC existentes: `h02_command` para plantillas/empresa/responsables y `h03_query` para lecturas de plantillas, preparación, uso, inicio y vista documental. `h03_command` conserva configuración y generación. Todos mantienen sesión, estudio, administración/permisos, `request_id` y revisiones. Nuevas tablas `deliverable_templates`/`deliverable_template_versions`, perfiles y procedencia tienen migraciones CLI, contratos Zod y tipos; el [diccionario](../tablas-db.md#extensión-h09--plantillas-y-perfil-documental) detalla campos/FK/JSONB y RLS.

## Orden técnico de las tareas

1. Configuración: persistencia aislada, catálogo EsSalud, borradores de los ocho regímenes, validación, edición individual, previsualización y publicación independiente.
2. Empresas: perfil cerrado, checklist, pasos, resumen/versiones, transacción idempotente y compatibilidad con empresas anteriores.
3. Motor: preparación pendiente, elegibilidad, periodo vigente, futuros, eventos registrados, continuaciones y conservación de pausas/snapshots.
4. Interfaz: términos, fechas, lista única/orden estable, uso por empresas y alta desde el módulo; accesibilidad y feedback asíncrono.
5. Validación: pruebas unitarias/SQL/HTTP, perfiles/dispositivos/teclado, compilación Yarn, bundle y documentación de resultados.

## Requerimientos funcionales

| ID | Requerimiento |
|---|---|
| H09-RF01 | Terminología consistente y separación catálogo/plantilla/empresa/archivo requerido. |
| H09-RF02 | Catálogo con módulo, búsqueda, conteos de empresas activas/pendientes/pausadas y consulta histórica separada, paginada. |
| H09-RF03 | Plantillas por régimen y módulo; trabajador por etapa; lista compacta y edición de un elemento a la vez. |
| H09-RF04 | Número, nombre, condición, frecuencia, plazo, archivos, preparación y resumen de faltantes; acceso directo a corregirlos. |
| H09-RF05 | Previsualizar checklist sin escrituras; publicar cada régimen independientemente. |
| H09-RF06 | Alta guiada y validaciones de régimen/checklist/cobertura en navegador y servidor. |
| H09-RF07 | Copia transaccional e idempotente de versión publicada y aplicables; rechazar versión distinta a la previsualizada. |
| H09-RF08 | Preparación sin responsable, activación elegible y generación desde periodo vigente, con progreso y errores. |
| H09-RF09 | Respeto de eventos de ingreso/cese/solicitud; ningún documento sin destino laboral correspondiente. |
| H09-RF10 | Lista continua, estable entre meses, con entregables sin obligaciones y explicaciones específicas. |
| H09-RF11 | Agregar desde empresa/módulo usando el mismo formulario y conservando el contexto. |
| H09-RF12 | Inicio, cambios futuros, plazo y simulación comprensibles; historial inmutable. |
| H09-RF13 | Cambios de perfil mediante resumen confirmado, preservando configuración propia compatible. |

## Requerimientos técnicos

- H09-RT01: tablas de plantillas y versiones por estudio; publicación inmutable, borradores incompletos, soft delete de cabeceras y conservación de versiones.
- H09-RT02: perfil documental y régimen con códigos estables en empresa, versión aplicada y procedencia/orden/preparación de requerimientos copiados. No reinterpretar registros anteriores.
- H09-RT03: ampliar RPC existentes con validación, sesión admitida, administración, aislamiento, auditoría, request_id y expected_revision. Datos JSONB con contratos explícitos.
- H09-RT04: nuevas entidades protegidas por RLS; ningún secreto al navegador; consultas directas Supabase. Conservar políticas y operaciones existentes.
- H09-RT05: reutilizar motor, snapshots, periodos, eventos, cursores y lotes; no duplicar generación ni reactivar pausas manuales.
- H09-RT06: migraciones Supabase CLI, tipos generados, Zod y DTO coherentes; enlaces tab=reglas compatibles y nueva sección de plantillas sin nuevas páginas App Router.
- H09-RT07: Atomic Design, Tailwind, tipos separados, componentes <=170 líneas, Proxy, feedback asíncrono real y ausencia de dependencias circulares.

## Tareas

- [x] T01: laboratorio aislado y comprobación de continuidad de 4001.
- [x] T02: persistencia, validadores, autorización, auditoría y migraciones incrementales.
- [x] T03: catálogo base EsSalud, borradores de los ocho regímenes, edición/publicación/previsualización.
- [x] T04: perfil de empresa, checklist, alta guiada y copia atómica.
- [x] T05: activación pendiente, periodos vigentes, eventos y cambio confirmado de perfil.
- [x] T06: listado documental único, estados, agregar por contexto y conteos de uso.
- [x] T07: términos, fechas, simulación y navegación compatibles.
- [x] T08: regresiones, aislamiento y comprobación visual por perfil/dispositivo.
- [x] T09: documentación central, diagrama/diccionario, evidencias y matriz de aceptación.

## Matriz mínima de aceptación y Definition of Done

- [x] CA01: ocho regímenes válidos; texto libre y valores desconocidos rechazados.
- [x] CA02: checklist vacío; bloqueo sin PLAME/IGV; AFP inválida sin PLAME; cobertura explícita.
- [x] CA03: SIS/EsSalud/ninguno y PLAME/AFP producen exactamente los módulos y tipos esperados.
- [x] CA04: borrador incompleto no publica; errores identifican el elemento; publicada no se modifica.
- [x] CA05: previsualización sin mutaciones; versión concurrente y reintentos no crean copias incorrectas.
- [x] CA06: empresa y requerimientos atómicos; errores no dejan configuración parcial.
- [x] CA07: pendiente sin obligaciones; permiso previo; activación sin concesión; pausa manual conservada.
- [x] CA08: asignación tardía empieza en periodo vigente; inicio futuro respetado; sin eventos inventados.
- [x] CA09: numeración continua y estable; extras en misma lista; conteos antes de paginar.
- [x] CA10: uso por empresa/estado y consulta histórica correctos, sin datos de otros estudios.
- [x] CA11: fechas, vencimientos, eventos, reingreso e historial preservados.
- [x] CA12: carga, aprobación parcial, observación, corrección, reapertura y sesión revocada conservadas.
- [x] CA13: administrador/contador/supervisor/cliente y móvil/escritorio/teclado/foco verificados.
- [x] CA14: tipos, lint, arquitectura, pruebas, yarn build y bundle aprobados; evidencias enlazadas.
- [x] CA15: datos reales de plantillas distinguidos de fixtures; validación funcional exclusivamente local. Publicación SQL posterior autorizada y verificada, sin fixtures ni cambios de automatización.

No marcar H09 como terminado por disponer de código: registrar resultados concretos y defectos pendientes en su evidencia. Los valores reales de las plantillas deben ser confirmados por el administrador antes del uso.
