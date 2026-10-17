# H07 — Supervisión y reportes

**Estado:** implementado; las tres observaciones previas a H08 están [corregidas y cerradas](evidencias/h07-correcciones.md). La migración correctiva adicional se publicó con autorización específica: 56 versiones coincidentes en local/Cloud y 13 huellas históricas conservadas. Las ocho migraciones originales H07 conservan su publicación e historia, sin fixtures remotos. [Evidencias iniciales](evidencias/h07.md) y [contratos](../supervision-reportes.md). Aceptación formal de producto independiente. **Depende de:** [H06](h06-actividades-notificaciones.md). **Habilita:** [H08](h08-preparacion-produccion.md). Aplican las [reglas](README.md#3-reglas-transversales-obligatorias) y la [Definition of Done común](README.md#4-definition-of-done-comun).

<a id="objetivo"></a>
## 1. Objetivo

Permitir al estudio supervisar cumplimiento, entregas y revisiones con indicadores conciliados, buscar documentación y generar reportes/exportaciones que correspondan al mismo universo consultado.

La pantalla, el detalle y el archivo exportado deben contar las mismas unidades y usar las mismas reglas. El cierre de autorización efectiva de consultas/exportaciones se comprueba en H08.

## 2. Alcance, entradas y entregables

**Entrada:** obligaciones de las tres áreas/adicionales, disposiciones, versiones y eventos íntegros de H02–H06.

**Incluye:** dashboard, búsqueda por metadatos, reportes básicos, Excel/PDF, consulta de auditoría/históricos administrativos y medición de rendimiento.

**Entregables:** pantallas operativas, consultas/agregaciones reutilizables, exportadores del navegador, evidencia de conciliación y reporte de medición.

| Ruta existente | Entrega |
|---|---|
| `/dashboard` | Indicadores por alcance y enlaces a listados existentes. |
| `/documentos` | Búsqueda/consulta de documentos por metadatos y acceso al detalle/versiones. |
| `/reportes` | Cumplimiento, pendientes, vencimientos, observaciones y detalle por periodo. |
| `/auditoria` | Consulta paginada de acciones, recurso/actor y momento. |
| `/empresas/{companyId}` | Resumen e historia de empresa con los mismos cálculos. |

No crear una tabla de reportes guardados ni un endpoint de exportación por defecto. Los informes avanzados y el tablero de evolución histórica permanecen posteriores.

<a id="requerimientos-funcionales"></a>
## 3. Requerimientos funcionales

- **H07-RF01 — Dashboard útil.** Mostrar empresas activas, obligaciones pendientes, archivos por revisar, observaciones, entregas vencidas, próximos vencimientos y cumplimiento dentro del alcance seleccionado.
- **H07-RF02 — Unidades inequívocas.** Identificar si se cuentan obligaciones, archivos o empresas. Un atraso puede coexistir con observación/pendiente y no se suma como estado exclusivo para inflar totales.
- **H07-RF03 — Fórmula documental.** Exigibles son obligaciones documentales obligatorias, excluyendo No aplica/canceladas. Aprobadas requieren todos sus entregables aprobados. Cumplimiento = aprobadas/exigibles × 100.
- **H07-RF04 — Vacío y global.** Sin exigibles mostrar “Sin obligaciones”. Global de las tres áreas se obtiene de suma de aprobadas/suma de exigibles, sin promedio simple de porcentajes.
- **H07-RF05 — Adicionales separadas.** Calcular indicador propio por empresa/estudio; no añadir internas a métricas de una empresa ni mezclar adicionales con documental.
- **H07-RF06 — Plazos precisos.** Reportes de vencimientos usan ciclos con entrega abierta y muestran puntualidad histórica cuando corresponde. Una entrega recibida a tiempo todavía por revisar no aparece como atraso del cliente.
- **H07-RF07 — Búsqueda transversal.** Buscar por título, empresa, trabajador, identificación, tipo, periodo, módulo y estado pertinente. Año/mes o periodo permiten acotar resultados. No leer contenido del archivo ni añadir OCR.
- **H07-RF08 — Reportes básicos.** Consultar cumplimiento por empresa/módulo, pendientes, vencimientos, observaciones y detalle por periodo, con filtros admitidos y documentos laborales del alcance. Columnas identifican empresa, área, referencia de periodo/trabajador, obligación/estado, plazo y avance según tipo.
- **H07-RF09 — Navegación desde indicador.** Abrir listados filtrados o detalle existente al seleccionar un dato; mantener contexto/filtros al volver. Un contador no se usa como permiso adicional.
- **H07-RF10 — Excel y PDF.** Exportar todo el resultado solicitado, no solamente la página visible, conservando filtros y alcance. Mostrar progreso, opción de cancelar y error claro; no declarar éxito si la generación falló.
- **H07-RF11 — Exportación entendible.** Excel usa columnas y tipos adecuados; PDF identifica filtros, alcance, fecha de generación, unidades y páginas. Textos no se convierten en fórmulas ejecutables no previstas.
- **H07-RF12 — Auditoría consultable.** Filtrar acciones por actor, recurso/empresa/módulo, periodo/fecha y acción cuando aplique; presentar fecha en Lima y distinguir actor de sistema. No editar ni eliminar eventos.
- **H07-RF13 — Historia administrativa.** Usuarios autorizados pueden consultar registros conservados, con eliminados explícitamente etiquetados cuando sea administración histórica. Operación corriente excluye eliminados/ancestros; desactivar/eliminar no reescribe resultados históricos.
- **H07-RF14 — Consistencia observable.** Dashboard, área, detalle, reporte y exportación concuerdan para los mismos filtros/datos. Identificar última consulta/generación y no prometer una instantánea transaccional entre páginas leídas en tiempos distintos.
- **H07-RF15 — Capacidad y usabilidad.** Recorridos habituales funcionan en móvil/teclado y con la referencia de 30 empresas, 100 usuarios y 1.000 trabajadores. Referencia de tamaño no impone topes de negocio.

**Trazabilidad:** RF-22–RF-23 y RF-25–RF-30; RN-06, RN-07 y RN-15; HU-08–HU-09 y HU-12; D26, D30–D32 y D33–D35; RNF-03–RNF-07 y RNF-10.

<a id="requerimientos-tecnicos"></a>
## 4. Requerimientos técnicos

- **H07-RT01 — Agregación común.** Consultas/vistas/RPC y reglas de dominio usan la misma definición de exigible, aprobado y plazo operativo. No calcular porcentajes independientes por componente o exportador.
- **H07-RT02 — Universo y filtros.** Filtros tipados, valores/orden permitidos, paginación estable, FK/contexto y selección de campos. No interpolar fragmentos SQL ni confiar en el selector como autoridad; enforcement completo H08.
- **H07-RT03 — Modelo existente.** Consultar las tablas ya incorporadas, sin nuevas entidades de dashboard/reportes ni copiar documentos para búsqueda. Migraciones adicionales se justifican por vista/función/índice necesario.
- **H07-RT04 — Exportación en navegador.** Consultar todos los lotes del resultado por Supabase directo y cargar librerías solo al solicitar. Conservar filas obtenidas para generar Excel/PDF sin volver a consultar otro universo.
- **H07-RT05 — Cancelación y recursos.** Controlar progreso, interrupción/cancelación y límites prácticos medidos de memoria. Cancelar consultas/resultado al cambiar usuario/contexto; no presentar un archivo del contexto anterior.
- **H07-RT06 — Excel seguro.** Distinguir texto, fecha y número; preservar RUC/identificación como texto y tratar entradas que parezcan fórmulas, incluidas las variantes pertinentes. No introducir fórmulas de datos provistos por usuarios.
- **H07-RT07 — PDF legible.** Tabla con encabezados, saltos/paginación y textos legibles para los filtros/dataset del reporte. Validar visualmente un resultado representativo, no limitarse a comprobar que existe un archivo.
- **H07-RT08 — Evento de exportación.** Operación controlada registra actor, filtros admitidos, cantidad de filas y resultado. No permitir INSERT arbitrario a auditoría ni afirmar que el evento prueba guardado local del archivo.
- **H07-RT09 — Auditoría mínima/inmutable.** `audit_events` append-only desde operaciones; el visor no expone secretos, cuerpo de archivos, salarios o diagnósticos. Valores anteriores/posteriores y metadata siguen J11/J12; IP/user-agent opcionales con acceso restringido.
- **H07-RT10 — Históricos y soft delete.** `include_deleted` no es facultad otorgada por un query de frontend. Consultas administrativas conservan unicidad/relaciones y etiquetas; vistas operativas revisan ancestros. Privilegios/RLS definitivos H08.
- **H07-RT11 — Rendimiento medido.** Meta base P95 <= 2 segundos para consultas habituales con referencia sintética, excluyendo transferencia de archivos y WhatsApp. Registrar dataset, condiciones de prueba, consultas/métricas y ajustes; no presentarlo como SLA contratado.
- **H07-RT12 — Consumo.** Índices/SQL agregada, metadatos paginados y sin descargas previas de archivos. Estimar Storage con tamaño medio real, versiones y conservación; no usar 20 MB como promedio ni borrar historia para cumplir una cifra.
- **H07-RT13 — Presentación y errores.** Atomic Design y composiciones de reportes/dashboard/auditoría con repositorios/hooks compartidos. Diferenciar vacío de fallo; anunciar filtros/errores y mostrar unidades con etiquetas además de color.

## 5. Cálculos y pruebas de conciliación

| Datos de prueba | Resultado esperado |
|---|---|
| Una obligación con dos posiciones y una aprobada | Avance de archivos 1/2; cero obligaciones aprobadas. |
| Todas las posiciones recibidas a tiempo, ninguna aprobada | Por revisar y cumplimiento pendiente; ninguna entrega vencida de ese ciclo. |
| Opcional, No aplica o cancelada | Visible según filtro, pero fuera de exigibles. |
| Ninguna exigible | “Sin obligaciones”; no inventar 0 % ni 100 %. |
| Área A: 1/1; área B: 0/9 | Global 1/10 = 10 %, no promedio 50 %. |
| Una adicional aprobada | Cambia indicador de adicionales; no modifica las tres áreas. |
| Corrección recibida tarde y después aprobada | Tardanza histórica conservada, sin entrega abierta y cumplimiento aprobado. |
| Empresa eliminada/inactiva | Excluida según consulta operativa; historia administrativa conservada y etiquetada. |

Para comparar exportación con pantalla, congelar el conjunto consultado por el flujo y usar los mismos filtros/datos de prueba. En operación concurrente, explicar que páginas consultadas en distintos instantes pueden observar cambios; no anunciar un cierre contable histórico ni un snapshot global que el contrato no garantiza.

### 5.1 Contratos a completar

| Operación | Alcance |
|---|---|
| Consultas de dashboard/documentos | Data API/vistas/RPC de lectura, misma definición de contexto y filtros. |
| GenerateReport | Tipo, formato y filtros; `reports.view`/`reports.export` según acción. Navegador genera archivo. |
| Consulta de auditoría | `audit.view` y alcance admitido; eventos no mutables por UI. |
| Consulta histórica administrativa | Identificación expresa de eliminados y ancestros; no concesión por parámetro. |
| RequestDownload | Reutilizado H03; buscar no otorga acceso al objeto ni emite URLs anticipadas. |

Reportes de plantilla de trabajadores, actividad de usuarios, envíos automáticos de reportes y evolución histórica avanzada continúan posteriores.

<a id="tareas"></a>
## 6. Tareas del hito

| Tarea | Trabajo concreto y entregable | Requisitos |
|---|---|---|
| H07-T01 | Consolidar fórmula de cumplimiento, unidades y plazo operativo en consultas/reglas compartidas, con dataset de conciliación. | RF02–RF06, RF14; RT01–RT03. |
| H07-T02 | Implementar consultas de dashboard y navegación a listados/detalles filtrados, con indicadores adicionales separados. | RF01–RF06, RF09; RT01, RT02, RT13. |
| H07-T03 | Implementar buscador transversal por metadatos y referencias laborales/periodos, con paginación y descarga existente. | RF07, RF09; RT02, RT03, RT12. |
| H07-T04 | Implementar reportes básicos y contratos de filtros/columnas del alcance, sin nuevas entidades de reporte. | RF08, RF14; RT01–RT03. |
| H07-T05 | Implementar exportación completa por lotes, progreso/cancelación y carga diferida de librerías. | RF10, RF14; RT04, RT05. |
| H07-T06 | Implementar Excel tipado/neutralización y PDF con filtros/unidades/paginación; revisar archivo representativo. | RF11; RT06, RT07. |
| H07-T07 | Registrar exportaciones controladas y completar visor de auditoría, filtros y tratamiento administrativo de historia. | RF12, RF13; RT08–RT10. |
| H07-T08 | Componer dashboard, Documentos, Reportes y Auditoría con Atomic Design, estados y accesibilidad. | RF01–RF15; RT13. |
| H07-T09 | Crear referencia sintética y medir consultas P95/costos de lectura/exportación; ajustar índices/paginación cuando haga falta. | RF15; RT11, RT12. |
| H07-T10 | Conciliar pantallas/reportes/exportaciones y probar cancelación, error, textos de fórmula y cambio de contexto. | RF02–RF15; RT01–RT13. |
| H07-T11 | Entregar demostración, archivos ficticios de ejemplo, evidencia de medición y pendientes de enforcement productivo. | RF01–RF15; RT01–RT13. |

## 7. Escenarios de aceptación

| Caso | Evidencia esperada |
|---|---|
| CA17 Sin exigibles / áreas desiguales | Fórmula, unidades y global correctos en dashboard/reporte/exportación. |
| CA06–CA09 Revisión y corrección | Parcial no aprobada; entrega puntual sin atraso; corrección conserva tardanza histórica. |
| CA23 funcional Exportación filtrada | Mismas columnas/datos del conjunto solicitado, todas las páginas y texto no ejecutable como fórmula. |
| CA23 seguridad | Preparar datos/roles; rechazo de filas ajenas desde acceso directo se acredita H08. |
| CA24 Auditoría | Actor/recurso/momento/decisión consultables sin secretos ni capacidad de edición. Exposición directa se completa H08. |
| Búsqueda laboral | Documento encontrado pertenece a empresa/trabajador/etapa correctos y abre el detalle común. |
| Exportación larga cancelada | Interrupción clara, sin archivo anunciado como completo ni evento de éxito falso. |
| Fallo en un lote de exportación | Error recuperable; no entregar silenciosamente un reporte parcial como total. |
| Soft delete/histórico | Vista corriente excluye; administración histórica conserva y etiqueta sin duplicar identidades. |
| CA30 Rendimiento | Dataset/condiciones y P95 registrados con objetivo satisfecho o ajustes requeridos antes de publicar. |
| CA27 / CA34 Interfaz/contexto | Recorridos móvil/teclado y consulta/exportación no mezclan datos entre contextos. |
| CA31–CA33 Arquitectura | SDK directo, Atomic Design y ausencia de secretos sin API de exportación innecesaria. |

Conservar ejemplos de Excel/PDF generados exclusivamente con datos ficticios, filtros utilizados y recuentos DB/UI/archivo. Registrar condiciones de medición para que el equipo pueda repetirla.

<a id="definition-of-done"></a>
## 8. Definition of Done

- [x] H07-RF01–H07-RF15 y H07-RT01–H07-RT13 tienen evidencia y entregables. REV-01–REV-03 corregidas y validadas en el [cierre](evidencias/h07-correcciones.md).
- [x] Dashboard muestra unidades correctas y navegación a recursos/listados existentes, conservando el recurso de origen con permisos distintos por empresa/módulo (REV-02).
- [x] Cumplimiento usa exigibles/aprobadas y global ponderado; vacío muestra “Sin obligaciones”.
- [x] Adicionales están separadas y las internas no contaminan métricas de empresas.
- [x] Búsqueda por metadatos funciona con filtros/paginación y sin OCR ni descargas anticipadas.
- [x] Reportes básicos concuerdan con detalle/dashboard bajo los mismos datos/filtros.
- [x] Excel/PDF incluyen todos los lotes solicitados, con progreso/cancelación, espera acotada de registro y conciliación idempotente explícita (REV-03).
- [x] Textos de Excel no se ejecutan como fórmulas; PDF representativo fue revisado visualmente.
- [x] Exportación/auditoría registra acciones con datos mínimos y no afirma guardado local.
- [x] Filtros de auditoría incluyen revisiones, descargas y eventos laborales mediante el ámbito correcto del recurso (REV-01).
- [x] Consulta histórica distingue eliminados sin alterar unicidad ni resultados conservados.
- [x] Medición sintética de capacidad/P95 y estimación de consumo están documentadas con ajustes pendientes identificados.
- [x] Estados, Atomic Design y cambio de contexto están verificados.
- [x] CA17, CA23–CA24 funcionales, CA30 y regresión pertinente tienen evidencia, incluidos los casos afectados por REV-01–REV-03. Seguridad efectiva y ajuste productivo pendientes H08.
- [x] Publicación correctiva autorizada en Cloud verificada: 56 migraciones coincidentes, resolver activo, lint sin errores y 13 huellas históricas conservadas. Contratos, tipos, documentación, base Git y pruebas locales preparados para H08.

## 9. Límites y continuidad

No incluir dashboard gerencial avanzado, análisis histórico adicional, reportes automáticos programados, honorarios ni reportes especiales de plantilla/actividad de usuarios. El rendimiento medido en desarrollo no acredita el entorno productivo.

Antes de publicar, H08 comprueba permisos del mismo universo desde Data API/RPC/Storage, archivos exportados autorizados y capacidad operativa real.

## 10. Referencias

- [Índice de hitos](README.md).
- [Cumplimiento y reportes](../diseno-tecnico.md#11-actividades-búsqueda-e-indicadores).
- [Auditoría](../diseno-tecnico.md#15-auditoría-y-observabilidad).
- [Rendimiento](../diseno-tecnico.md#16-rendimiento-y-consumo).
- [Tablas y contratos JSONB](../tablas-db.md).
- [Navegación](../flujo-navegacion.md).
- [Anterior: H06](h06-actividades-notificaciones.md) · [Siguiente: H08](h08-preparacion-produccion.md).
