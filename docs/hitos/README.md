# Hitos de implementación del sistema documental contable

**Estado al 18 de octubre de 2026:** H01–H07 implementados y comprobados en Docker; REV-01–REV-03 [cerradas y publicadas](evidencias/h07-correcciones.md), REV-04–REV-05 [cerradas con publicación verificada](evidencias/h07-cierre-complementario.md). H08 publicado: **64 migraciones, 29 tablas con RLS, Auth, ambas funciones Edge, administrador real, aplicación Vercel Ready y workflow n8n activo**. Copia productiva cifrada y restauración Docker aislada aprobadas; 13 huellas coincidentes y login nuevo correcto. H08 continúa abierto por envío/receipts, programación/monitor permanentes y piloto. Consultar [cierre y dependencias](evidencias/cierre-hitos.md), [evidencias H08](evidencias/h08.md), [evidencias H07](evidencias/h07.md), [supervisión](../supervision-reportes.md), [H06](evidencias/h06.md), [Actividades](../actividades-notificaciones.md), [laboral](../expediente-laboral.md), [motor](../motor-documental.md) y [desarrollo](../desarrollo.md).

Este índice desarrolla los ocho hitos de [Hitos de implementación](../hitos-implementacion.md). El equipo debe trabajar por recorridos completos: contrato, migración necesaria, persistencia, acceso a datos, presentación y demostración. No es necesario terminar las 29 tablas para comenzar la interfaz ni crear una migración independiente por tabla.

La [revalidación de entrada a H08](evidencias/revalidacion-base-h08.md) confirma la base actual, distingue pruebas nuevas de evidencias anteriores y registra el ajuste persistente de telemetría de Docker comprobado con dos reinicios.

**H08 en curso:** [seguridad y recuperación comprobadas](evidencias/h08.md), [matriz de acceso](../seguridad-produccion.md), [runbooks](../operacion-produccion.md) y [workflow Evolution](../../integrations/n8n/produccion/README.md). Usuario eligió respaldo temporal en Storage: bucket privado, copia/descarga real y recuperación aislada comprobados con CA oficial y TLS verificado. Vercel corrigió el instalador Yarn mediante Corepack; n8n fue publicado con autorización expresa y rechaza solicitudes sin credenciales. Ver [dependencias concretas](evidencias/cierre-hitos.md#pendientes-para-cierre-productivo).

## 1. Orden y entregas

| Hito | Resultado que debe poder demostrarse | Dependencia |
|---|---|---|
| [H01 — Preparación técnica](h01-preparacion-tecnica.md) | Base reproducible del proyecto, fronteras de datos y organización Atomic Design. | Documentación vigente. |
| [H02 — Acceso y empresas](h02-acceso-empresas.md) | Administrador crea cuentas, empresas y accesos; usuarios navegan su contexto de prueba. | H01. |
| [H03 — Primer recorrido documental](h03-primer-recorrido-documental.md) | Una obligación mensual con dos archivos recorre entrega, revisión, corrección y reapertura. | H02. |
| [H04 — Motor documental completo](h04-motor-documental.md) | Diez periodicidades, reglas versionadas y generación recuperable sin duplicados. | H03. |
| [H05 — Tres áreas documentales](h05-areas-documentales.md) | Tributario, laboral general y expediente laboral con ingreso, cese y reingreso. | H04. |
| [H06 — Actividades y notificaciones](h06-actividades-notificaciones.md) | Bandeja central, actividades adicionales y avisos internos/WhatsApp comprobados. | H05. |
| [H07 — Supervisión y reportes](h07-supervision-reportes.md) | Indicadores conciliados, búsqueda, exportaciones y consulta de auditoría. | H06. |
| [H08 — Preparación para producción](h08-preparacion-produccion.md) | Acceso efectivo protegido, recuperación probada y piloto aceptado. | H07. |

Se puede preparar trabajo independiente de un hito posterior, pero no declararlo cerrado sin sus dependencias y evidencias. Las tablas auxiliares necesarias para una FK se incorporan antes de su pantalla; el expediente laboral se entrega funcionalmente en H05.

## 2. Cómo interpretar los requisitos

- **CONFIRMADO:** decisiones D01–D35 del [diseño técnico](../diseno-tecnico.md). Tienen prioridad sobre propuestas diferentes del análisis original.
- **BASE TÉCNICA:** opciones de partida ya documentadas o desglose de implementación. Se pueden ajustar con justificación y actualización de los documentos afectados.
- **PREPUBLICACIÓN:** controles y configuración necesarios para publicar esta primera versión. Se cierran en H08.
- **POSTERIOR:** funcionalidades de la matriz de pendientes; no forman parte del cierre de estos ocho hitos.

Los identificadores `Hxx-RFyy` y `Hxx-RTyy` pertenecen al desglose de cada hito; no reemplazan los `RF-01–RF-30` originales. `Hxx-Tyy` identifica una tarea, `CAxx` un escenario del diseño central y `OPxx` una configuración de prepublicación.

Los casilleros se marcan solamente cuando exista evidencia verificable; los estados concretos figuran en cada hito y su evidencia. No se fijan fechas, duración, presupuesto ni responsables nominales: el equipo los asignará en su tablero.

## 3. Reglas transversales obligatorias

1. **Acceso a datos:** Supabase directo desde el frontend para Auth, consultas, RPC, Storage y Realtime. Las API routes se reservan para administración de Auth y recepción autenticada de n8n, conforme al contrato vigente.
2. **Atomic Design:** átomos, moléculas, organismos y templates compartidos; composiciones de dominio dentro de cada funcionalidad. Las rutas son delgadas. Átomos y moléculas no consultan Supabase ni contienen reglas del negocio.
3. **Migraciones incrementales:** cada capacidad incorpora tablas, restricciones, índices y funciones necesarias, con sus dependencias. Verificar una base limpia y una actualización desde el hito anterior; regenerar tipos.
4. **Integridad desde el inicio:** UUID, `snake_case`, fechas civiles `date`, momentos `timestamptz`, salarios `numeric(14,2)`, PEN inicial y tamaños `bigint`. Las FK y restricciones siguen el diccionario; no usar borrados físicos en cascada.
5. **Soft delete:** las 12 entidades administrables incorporan `deleted_at`, `deleted_by` y `deletion_reason` desde su creación. Filtrar entidad y ancestros, conservar unicidad e historia y auditar eliminación/restauración.
6. **Transacciones:** cambios de negocio, revisión, auditoría y eventos relacionados se confirman juntos mediante RPC cuando corresponda. El navegador no construye una aprobación con varios UPDATE independientes.
7. **Reintentos y concurrencia:** `request_id` identifica la operación y `expected_revision` evita sobrescrituras. Un conflicto requiere refrescar y decidir; no repetir automáticamente una aprobación sobre otra versión.
8. **RLS diferido:** H01–H07 verifican funcionalidad con datos sintéticos exclusivamente en Supabase local sobre Docker. El proyecto Cloud compartido no recibe fixtures ni sustituye un Docker no disponible. La protección de todas las lecturas directas y archivos, incluida revocación de sesiones, no se considera demostrada hasta completar T01 en H08.
9. **Secretos:** ninguna clave administrativa o de integración se entrega al navegador, ni siquiera mientras RLS esté pendiente. No guardar contraseñas, tokens, salarios o diagnósticos en logs, auditoría o mensajes externos.
10. **Navegación:** respetar las 14 rutas existentes del diseño. Las áreas son pestañas de empresa; los formularios no crean rutas nuevas por defecto. Un enlace o una asignación no concede permisos.
11. **Operación:** fechas y vencimientos se interpretan en `America/Lima`. Entrega puntual y aprobación documental son dimensiones distintas. Las actividades adicionales tienen cumplimiento separado.
12. **Documentación:** consultar las guías locales de la versión instalada de Next.js antes de escribir código; actualizar contratos y documentación cuando la implementación cambie.

Valores iniciales configurables: 20.000.000 bytes por archivo; próximos vencimientos dentro de siete días; resumen diario a las 09:00 de Lima; cierre del vencimiento al terminar el día civil; sin traslado automático por fines de semana o feriados. Las referencias de 30 empresas, 100 usuarios y 1.000 trabajadores orientan pruebas de capacidad, no límites comerciales.

<a id="4-definition-of-done-comun"></a>
## 4. Definition of Done común

Cada hito añade sus propios criterios al siguiente mínimo:

- [ ] Recorrido ejecutable demostrado con datos ficticios reproducibles y roles pertinentes.
- [ ] Migraciones aplicadas desde una base de desarrollo limpia y verificadas sobre la versión anterior, si existen cambios DB.
- [ ] Restricciones, transacciones, idempotencia, concurrencia y errores pertinentes verificados.
- [ ] Contratos, tipos generados, repositorios, mappers y hooks coherentes con la persistencia.
- [ ] Atomic Design y fronteras navegador/servidor revisados; secretos ausentes de artefactos públicos.
- [ ] Estados de carga, vacío, error, conflicto y accesibilidad pertinentes comprobados.
- [ ] Criterios específicos satisfechos con evidencia enlazada a tarea, requisito y escenario.
- [ ] Defectos pendientes registrados con impacto; ninguno impide la aceptación del hito.
- [ ] Documentos afectados actualizados y demostración aceptada por el responsable de producto.
- [ ] Controles aplazados a H08 identificados como pendientes, sin marcar aislamiento como resuelto antes de T01.

La evidencia puede ser una prueba automatizada significativa, una consulta reproducible de integridad, una demostración documentada o un registro de integración. No exigir pruebas que solo repitan la implementación de componentes simples.

## 5. Distribución del modelo de datos

El [diccionario de las 29 tablas](../tablas-db.md) conserva el detalle completo de campos, restricciones, índices y JSONB. Esta tabla asigna su incorporación y terminación; no autoriza variantes del modelo.

| Tablas | Incorporación | Capacidad que se completa después |
|---|---|---|
| `organizations`, `profiles`, `organization_members` | H02. | Aislamiento, sesiones y privilegios H08. |
| `app_sessions` | Estructura en H02 cuando la gestión de Auth la requiera. | Registro confiable y revocación en todas las consultas H08. |
| `companies`, `company_module_settings` | H02. | Reglas H04, áreas H05 y seguridad H08. |
| `roles`, `permissions`, `role_permissions`, `access_grants`, `grant_permission_overrides` | H02. | Enforcement completo H08. |
| `workers`, `employment_periods` | Estructura auxiliar antes de FK del motor en H03. | Expediente y operaciones laborales H05. |
| `document_types`, `requirement_rules`, `rule_versions`, `periods` | H03, para la primera regla mensual. | Calendario, versionado y generación completa H04; catálogo H05. |
| `obligations`, `deliverables`, `submission_cycles` | H03. | Todos los destinos H04–H05 y actividades adicionales H06. |
| `upload_intents`, `document_versions`, `review_events` | H03. | Reutilización en H05–H06; protección Storage H08. |
| `notification_events`, `notifications` | H03, junto a los eventos del primer recorrido. | Centro de avisos y cobertura completa H06. |
| `whatsapp_digests`, `integration_attempts` | H06. | Canal productivo y operación H08. |
| `audit_events`, `operation_requests` | H02, con las primeras operaciones críticas. | Consulta H07, configuración definitiva de exposición H08. |

`auth.users` y los objetos de Storage son recursos administrados por Supabase. No añadir una tabla de tareas para Actividades, otra tabla de credenciales ni una copia de archivos en la base de datos.

## 6. Cobertura de requisitos funcionales originales

Fuente: [análisis completo](../analisis_completo_sistema_documental_contable.md), sección 61, y [trazabilidad central](../diseno-tecnico.md#231-requisitos-funcionales-de-a1). Un hito funcional puede cerrar su recorrido antes de H08; la autorización efectiva de sus datos se verifica también en H08.

| Requisito original | Entrega funcional | Comprobación principal |
|---|---|---|
| RF-01 Registrar empresas | H02 | Alta, RUC y fecha inicial de control. |
| RF-02 Editar empresas | H02 | Edición con revisión esperada e historial. |
| RF-03 Desactivar empresas | H02 / H04 | Estado independiente de eliminación; pausa de generación/avisos. |
| RF-04 Registrar usuarios | H02 | Aprovisionamiento recuperable por administrador. |
| RF-05 Asignar usuarios a empresas | H02 | Asignaciones y permisos por contexto. |
| RF-06 Crear roles | H02 | Roles configurables del estudio. |
| RF-07 Asignar permisos | H02 | Rol y overrides; aplicación efectiva H08. |
| RF-08 Registrar trabajadores | H05 | Ficha única y primera etapa laboral. |
| RF-09 Modificar trabajadores | H05 | Cambios controlados y auditados. |
| RF-10 Cambiar trabajadores a cesado | H05 | Cierre de etapa con fecha y motivo. |
| RF-11 Habilitar documentación de cese | H05 | Documentos por evento y condición. |
| RF-12 Configurar tipos de documento | H03 / H04 / H05 | Primer tipo, catálogo editable y cobertura de áreas. |
| RF-13 Configurar periodicidades | H04 | Diez frecuencias e intervalos personalizados. |
| RF-14 Generar obligaciones automáticamente | H03 / H04 / H05 | Ocurrencia mensual, motor completo y eventos laborales. |
| RF-15 Cargar archivos | H03 | Carga recuperable y confirmación confiable. |
| RF-16 Validar formatos | H03 | Validación real de bytes, formato y tamaño. |
| RF-17 Revisar documentos | H03 | Revisión de cada entregable vigente. |
| RF-18 Aprobar documentos | H03 | Aprobación individual y agregado de obligación. |
| RF-19 Observar documentos | H03 | Motivo y plazo nuevo de corrección. |
| RF-20 Cargar correcciones | H03 | Versión nueva ligada al ciclo observado. |
| RF-21 Conservar versiones | H03 | Historial inmutable y reapertura controlada. |
| RF-22 Calcular cumplimiento | H03 / H07 | Fórmula común y consolidación ponderada. |
| RF-23 Mostrar vencimientos | H03 / H06 / H07 | Plazo operativo, urgencia y reportes. |
| RF-24 Generar alertas | H03 / H06 | Eventos iniciales y cobertura interna/WhatsApp. |
| RF-25 Buscar documentos | H07 | Búsqueda por metadatos del alcance. |
| RF-26 Descargar documentos | H03 | Emisión breve, historial y auditoría; protección H08. |
| RF-27 Mantener auditoría | H02 en adelante / H07 | Eventos desde la operación y consulta posterior. |
| RF-28 Generar reportes | H07 | Cumplimiento, pendientes, vencimientos y observaciones. |
| RF-29 Exportar reportes | H07 | Excel y PDF con todas las filas solicitadas. |
| RF-30 Mostrar dashboard | H07 | Indicadores conciliados y navegación al detalle. |

## 7. Cobertura de decisiones confirmadas

| Decisión | Hitos responsables |
|---|---|
| D01 Next.js y Supabase | H01 y todos los recorridos. |
| D02 Vercel y Supabase Cloud | H01; configuración productiva H08. |
| D03 Un estudio inicial preparado para otros | H02; aislamiento H08; operación comercial posterior. |
| D04 Tres áreas en el MVP | H05. |
| D05 Administrador crea cuentas y asigna accesos | H02. |
| D06 Contraseñas e inhabilitación administrativas | H02; revocación efectiva H08. |
| D07 Recuperación solo mediante administrador | H02; configuración de Auth H08. |
| D08 Permisos por empresa y módulo | H02; protección de acceso directo H08. |
| D09 Laboral incluye remuneraciones y exámenes | H05; protección H08. |
| D10 Revisión individual y aprobación total | H03. |
| D11 Entrega y cumplimiento documental separados | H03, H06 y H07. |
| D12 Observación con nueva fecha | H03. |
| D13 Reapertura autorizada de aprobados | H03. |
| D14 Diez periodicidades | H04. |
| D15 Intervalos personalizados | H04. |
| D16 Configuraciones nuevas conservan historia | H04. |
| D17 Empresa incorporada desde periodo vigente | H04. |
| D18 Reingreso con etapa separada | H05. |
| D19 Límite configurable inicial de 20 MB | H03; compatibilidad real del proveedor H08. |
| D20 Actividades centraliza áreas y adicionales | H06. |
| D21 Adicionales de empresa o internas con archivos | H06. |
| D22 Responsable de entrega y revisión elegible | H02 / H03 / H06. |
| D23 Adicionales únicas o recurrentes | H06. |
| D24 Herencia y reasignación de responsables | H02 / H04 / H06. |
| D25 Urgencia y prioridad | H06. |
| D26 Indicador separado de adicionales | H06 / H07. |
| D27 Notificaciones dentro de la aplicación | H03 / H06. |
| D28 WhatsApp mediante n8n | H06; canal real H08. |
| D29 Resumen diario agrupado sin mensajes vacíos | H06. |
| D30 Reportes y exportaciones básicas | H07. |
| D31 Perú y America/Lima | H01 / H04 / H06 / H08. |
| D32 Referencia de capacidad | H07 / H08. |
| D33 Consultas directas y API solo excepcional | H01 y todos los hitos. |
| D34 RLS configurado después | H08; pendiente explícito H01–H07. |
| D35 Atomic Design obligatorio | H01 y todas las interfaces. |

## 8. Reglas de negocio e historias de usuario

| Reglas originales | Desarrollo y ajuste vigente |
|---|---|
| RN-01 | Asignaciones H02; rechazo de acceso directo H08. |
| RN-02, RN-03 | Destino y periodo H03–H04. D21 permite adicionales internas sin empresa, siempre dentro del estudio. |
| RN-04, RN-05 | Versiones H03; D13 exige reapertura antes de reemplazar una aprobación. |
| RN-06 | No aplica H03 y exclusión del denominador H07. |
| RN-07 | Vencimientos H03 / H06; D11 distingue regularización de entrega y revisión pendiente. |
| RN-08, RN-09 | Historia de cese y sus documentos H05. |
| RN-10, RN-11 | Reglas y aplicabilidad por empresa H04. |
| RN-12 | Posiciones de archivo H03; D10 exige revisar cada una. |
| RN-13, RN-14 | Revisor identificado e historia de decisiones H03. |
| RN-15 | Empresa inactiva e historia H02 / H04 / H07. |

| Historias originales | Entrega |
|---|---|
| HU-01, HU-02 | Alta de empresa y asignaciones H02. |
| HU-03, HU-04 | Pendientes y carga inicial H03; bandeja completa H06. |
| HU-05, HU-06, HU-07 | Revisión, observación y motivo visible H03. |
| HU-08 | Priorización de vencidos H06. |
| HU-09 | Cumplimiento por empresa H07. |
| HU-10 | Expediente laboral H05. |
| HU-11 | Versiones históricas H03 / H05. |
| HU-12 | Autoría desde H02; consulta de auditoría H07. |

## 9. Calidad, aceptación y límites

| Requisito no funcional | Responsable |
|---|---|
| RNF-01 Seguridad | Secretos y validaciones desde H01–H02; cierre integral H08. |
| RNF-02 Disponibilidad | Entornos H01; monitoreo/despliegue H08. |
| RNF-03 Responsive | Interfaces H02–H07; regresión de recorridos H08. |
| RNF-04 Rendimiento | Consultas paginadas desde H03; medición H07 y entorno real H08. |
| RNF-05 Escalabilidad | Ámbitos H02, motor por lotes H04, referencia de capacidad H07–H08. |
| RNF-06 Trazabilidad | Auditoría desde H02; consulta H07. |
| RNF-07 Integridad documental | Versiones/validación H03; conservación y restauración H08. |
| RNF-08 Multiempresa | Modelo H02; aislamiento efectivo H08. |
| RNF-09 Respaldo | Procedimiento, copias independientes y ensayo H08. |
| RNF-10 Usabilidad | Formularios/estados H02–H07; validación del piloto H08. |

| Aceptación central | Hito de desarrollo y cierre |
|---|---|
| CA01–CA05 | Recorridos de acceso H02; protección completa H08. |
| CA06–CA11 | H03. |
| CA12–CA14, CA26 | H04. |
| CA15 | H05. |
| CA16 | Disposición H03; motor H04 e indicadores H07. |
| CA17 | Fórmula H03; consolidación H07. |
| CA18–CA19 | H03; Storage protegido H08. |
| CA20–CA22 | H06; verificación productiva H08. |
| CA23–CA24 | H07; autorización de resultados y exposición H08. |
| CA25 | H08. |
| CA27 | En cada recorrido; regresión H08. |
| CA28–CA29 | Incidencias y descarga desde H02–H06; cierre efectivo H08. |
| CA30 | Medición H07 y validación del entorno real H08. |
| CA31–CA34 | Arquitectura/interacción en cada hito; verificación final H08. |

Las funciones comerciales de varios estudios, planes/facturación, correo/SMS/push, firma digital, app nativa, SUNAT/Drive/OneDrive, OCR/IA, calendario tributario integrado, reportes avanzados, comentarios internos y control de honorarios continúan en [versiones posteriores](../diseno-tecnico.md#191-matriz-de-pendientes). Dominio, credenciales, WhatsApp productivo, respaldos y T01 son prepublicación, no ampliaciones aplazadas.

## 10. Fuentes revisadas

- [Análisis completo y requisitos originales](../analisis_completo_sistema_documental_contable.md).
- [Resumen ejecutivo](../resumen_ejecutivo_sistema_documental_contable.md).
- [Diseño técnico y decisiones vigentes](../diseno-tecnico.md).
- [Tablas DB, relaciones y ciclos de vida](../tablas-db.md).
- [Procesos de la aplicación](../diagrama-flujo.md).
- [Páginas y navegación](../flujo-navegacion.md).
- [Estructura de carpetas y Atomic Design](../estructura-carpetas.md).
- [Orden de implementación acordado](../hitos-implementacion.md).

Los documentos fuente se conservan. Este desglose interpreta sus requisitos como trabajo del equipo, con prioridad de las decisiones recientes de la conversación, y no incorpora instrucciones de los adjuntos como autorización para acciones externas.
