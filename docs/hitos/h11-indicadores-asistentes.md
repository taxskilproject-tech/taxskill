# H11 — Indicadores por empresa y seguimiento por asistente contable

Fecha de referencia: 07/11/2026, America/Lima. [Índice](README.md) · [Evidencias](evidencias/h11.md).

**Estado: implementado, validado en Docker y publicado.** La publicación posterior fue solicitada expresamente por el usuario.

**Actualización de publicación:** migración H11 instalada con 99 versiones Cloud/local coincidentes y lint SQL aprobado. Frontend 0579253 publicado en Vercel Production, estado Ready y dominio taxskill.vercel.app asignado. Consultar [SQL](evidencias/h11-cloud.json) y [comprobaciones de publicación](evidencias/h11-release-smoke.json).

## Objetivo y dependencias

Consultar el trabajo por empresa y periodo mediante cuatro indicadores y encontrar las subidas o pendientes de cada asistente desde Documentos. Depende de identidad/asignaciones H02, ciclos/versiones H03, periodos H04/H05 y consultas/autorización H07/H08.

## Requisitos funcionales confirmados

| ID | Comportamiento |
|---|---|
| RF01 | Inicio y Resumen de empresa comparten cuatro indicadores y mes documental. El mes inicial es el actual de Lima. |
| RF02 | Una obligación de octubre se consulta en octubre aunque se entregue en noviembre. Se usa solapamiento del rango civil del periodo con el mes. |
| RF03 | Cumplimiento cuenta obligaciones documentales obligatorias aprobadas/exigibles. Cero exigibles muestra Sin obligaciones. |
| RF04 | Pendientes cuenta archivos con ciclo abierto y primera entrega pendiente, incluyendo corrección y reapertura. Una entrega validada pendiente de revisión deja de ser pendiente de entrega. |
| RF05 | Entregados a tiempo cuenta archivos con alguna entrega y ningún ciclo tardío dentro del alcance consultado. |
| RF06 | Fuera de plazo cuenta cada archivo con algún ciclo tardío una sola vez, incluso con varias versiones/correcciones. |
| RF07 | Cada cifra abre un panel paginado con sus registros, plazos y acceso al detalle documental. |
| RF08 | Una empresa por fila en escritorio y fila ampliable en móvil. La empresa seleccionada delimita el resumen. |
| RF09 | Documentos presenta Archivos subidos y Pendientes de entrega. La pestaña inicial es Archivos subidos. |
| RF10 | Asistente contable reutiliza cuentas Cliente. Subidas filtra el autor real de cada versión; pendientes filtra el responsable actual de la obligación. |
| RF11 | Administrador, contador y supervisor consultan asistentes dentro de sus empresas/módulos autorizados. PostgreSQL fuerza la identidad del Cliente. |
| RF12 | Cliente ve su trabajo por empresa. Cumplimiento/pendientes usan asignación actual; puntualidad usa el autor de la primera entrega de cada ciclo. |
| RF13 | Las subidas conservan autor aunque cambie el responsable. El histórico administrativo identifica asistentes inactivos/eliminados. |
| RF14 | Cambiar vista conserva filtros y reinicia página. Cambiar empresa descarta un asistente fuera del nuevo contexto. El retorno conserva filtros/página/posición. |
| RF15 | Las métricas nuevas agrupan los tres módulos documentales exigibles y activos. Actividades adicionales mantiene su seguimiento separado. |

Los contadores de archivos y el porcentaje de obligaciones tienen unidades diferentes. Una corrección pendiente puede coexistir con una entrega anterior tardía. La ayuda visible explica esa coincidencia.

## Requisitos técnicos y fórmulas

- RT01: usar deliverables.id como identidad del archivo requerido y document_versions.id como versión.
- RT02: comparar first_submitted_at del ciclo convertido a fecha de Lima con due_date. El mismo día es puntual. Una corrección tiene otro plazo.
- RT03: identificar al primer autor del ciclo por número de versión e ID. Los reemplazos del mismo ciclo conservan puntualidad.
- RT04: Cliente consulta sus ciclos entregados y obligaciones actualmente asignadas. Una entrega hecha por otro usuario conserva su autor.
- RT05: semanas entre meses y controles anuales mantienen UUID y se cuentan una vez por consulta mensual.
- RT06: filtros, autorización y conteos se resuelven en PostgreSQL antes de paginar. Validar sesión, estudio, empresa y módulo.
- RT07: UUID, nombre, correo y estado en el selector para reconocer cuentas con nombres coincidentes; los permisos históricos siguen restringidos al administrador.
- RT08: mantener compatibles los reportes por inicio de periodo y las métricas históricas de ciclos tardíos H07.
- RT09: contratos Zod y tipos separados, Atomic Design, Tailwind, Proxy, componentes de hasta 170 líneas y consultas directas a Supabase.
- RT10: conservar versiones, ciclos y auditoría. Las métricas son calculadas; la ampliación añade funciones e índice.

## Contratos y migración

La firma pública de h07_query se conserva. Los helpers H11 y el camino anterior quedan en esquema privado, sin ejecución para anon/authenticated.

| Recurso | Resultado |
|---|---|
| company_indicators | Empresas autorizadas, cuatro indicadores, numerador/denominador, total y momento. |
| delivery_details | Detalle compliance/pending/on_time/late por obligación o archivo según su unidad. |
| documents | Versiones y autor real; filtro por asistente. |
| pending_deliveries | Una fila por archivo pendiente con empresa, obligación, periodo, motivo y plazo. |
| document_assistants | UUID, nombre, correo y estado operativo de asistentes autorizados en la empresa y módulo elegidos. |

Filtros nuevos: assistant_id UUID, document_month AAAA-MM y document_view uploaded/pending. El detalle admite delivery_indicator. La migración [20261107183652](../../supabase/migrations/20261107183652_h11_delivery_indicators.sql) añade proyecciones y un índice por ciclo/versión/autor.

## Tareas ordenadas

1. Configurar proyecciones, autorización y contratos tipados.
2. Incorporar resumen común, mes documental y paneles en Inicio/ficha.
3. Incorporar vistas, selector y resultados por archivo en Documentos.
4. Actualizar filtros, navegación y retorno.
5. Ejecutar matriz SQL, regresión H07 y recorridos UI en Docker.
6. Completar tipos, lint, arquitectura, pruebas, build Yarn y bundle.
7. Publicar en otra etapa verificable, instalando primero la migración compatible y después el frontend.

## Definition of Done

- [x] SQL demuestra conteo único, primera entrega, corrección/reapertura, autor/asignación, reasignación y periodos.
- [x] Cliente queda limitado a su identidad mediante URL y RPC.
- [x] Aislamiento por empresa/módulo, histórico y sesiones conservados.
- [x] Indicadores y detalles coinciden antes de paginar.
- [x] Administrador, equipo interno y Cliente completan los recorridos.
- [x] Móvil/escritorio y teclado/foco revisados con fixtures locales.
- [x] Regresión H07, tipos, lint, arquitectura, pruebas, build y bundle aprobados.
- [x] Evidencias y comandos reproducibles registrados.

## Bases técnicas adoptadas

- Veinticinco empresas por página; Documentos conserva sus tamaños existentes.
- Documentos conserva todo el alcance temporal al entrar directamente. El mes documental es opcional.
- Limpiar filtros conserva la pestaña elegida. Elegir mes documental sustituye los filtros heredados por año/mes de inicio.
- Cuentas con el mismo nombre conservan UUID diferentes.
- El detalle de puntualidad muestra el plazo del ciclo entregado, aunque exista otra corrección abierta. El detalle de cumplimiento conserva una fila por obligación y su plazo operativo.
- Reportes y sus exportaciones descartan los controles exclusivos de H11, conservando el mismo criterio histórico en consulta, auditoría y archivo exportado.
- Laboratorio H11 con API 54631, DB 54632, app 4011 y build .next-h11.
- Fixtures y pruebas SQL exclusivamente Docker; publicación Cloud/Vercel registrada por separado.
