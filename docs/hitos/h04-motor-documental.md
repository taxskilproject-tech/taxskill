# H04 — Motor documental completo

**Estado:** pendiente. **Depende de:** [H03](h03-primer-recorrido-documental.md). **Habilita:** [H05](h05-areas-documentales.md). Aplican las [reglas](README.md#3-reglas-transversales-obligatorias) y la [Definition of Done común](README.md#4-definition-of-done-comun).

<a id="objetivo"></a>
## 1. Objetivo

Convertir el primer recorrido mensual en un motor documental común, configurable, capaz de generar todas las obligaciones comprometidas sin duplicados, conservar condiciones históricas y recuperarse de fallos operativos.

El resultado debe permitir agregar tipos, frecuencia o condiciones por configuración, sin crear otro motor para cada área.

## 2. Alcance y entregables

**Entrada:** recorrido de carga/revisión probado, snapshots y claves de ocurrencia de H03, empresas/responsables de H02.

**Incluye:** catálogo y reglas completos, diez periodicidades, calendario civil, vigencias, condiciones de aplicabilidad, responsables heredados, pausas deliberadas, cursor/lotes y recuperación de generación.

**Entregables:** motor único, reglas/configuración ejecutables, trabajos programados de desarrollo, pruebas de calendario/idempotencia, registros de avance y demostración de conservación histórica.

No exige tablas nuevas fuera del modelo existente. Se amplían las operaciones y restricciones de `document_types`, `requirement_rules`, `rule_versions`, `periods`, `obligations` y entidades relacionadas. Las condiciones de ingreso/cese se preparan aquí y se ejercitan completamente con H05.

**Rutas:** `/configuracion` para catálogo/reglas/parámetros, `/empresas/{companyId}` para configuración y resultados por empresa, y los listados/detalles ya existentes. No crear rutas distintas por periodicidad o por área.

<a id="requerimientos-funcionales"></a>
## 3. Requerimientos funcionales

- **H04-RF01 — Catálogo editable.** Administrador crea/modifica tipos documentales y su aplicación por empresa o destino laboral. Las empresas pueden exigir documentos distintos, formatos y plazos diferentes.
- **H04-RF02 — Diez periodicidades.** Única, diaria, semanal, quincenal, mensual, trimestral, semestral, anual, eventual y personalizada están disponibles con su instanciación acordada.
- **H04-RF03 — Intervalo personalizado.** Configurar N entero positivo en días/semanas/meses y fecha ancla. Un intervalo mensual mantiene el día original del ancla, ajustando al último día del mes corto y volviendo al original en meses siguientes.
- **H04-RF04 — Plazos.** Recurrentes calculan días calendario respecto al cierre del periodo; eventos respecto a su fecha de referencia; únicas manuales exigen fecha explícita. El vencimiento termina al cierre del día de Lima, sin traslado por fines de semana/feriados.
- **H04-RF05 — Activación válida.** Rechazar activación sin responsable elegible, posiciones, formatos o plazo válido. Diferenciar borrador/inactiva/pausada de una regla operativa; no emitir obligaciones incompletas.
- **H04-RF06 — Cambios hacia nuevas obligaciones.** Modificar configuración crea versión nueva aplicable al siguiente ciclo no iniciado, o una fecha posterior explícita válida. Las obligaciones existentes mantienen frecuencia, plazo, posiciones y formatos originales.
- **H04-RF07 — Incorporación vigente.** Al incorporar una empresa, generar únicamente la ocurrencia que contiene su fecha de inicio de control para cada frecuencia. No crear periodos previos. Si la ocurrencia vigente ya venció, advertir sin cambiar el plazo.
- **H04-RF08 — Generación sin duplicados.** Repetición, concurrencia, cambio de versión o reinicio del trabajo no duplican la misma ocurrencia del mismo destino.
- **H04-RF09 — Recuperación tras caída.** Una caída técnica se recupera desde el último avance confirmado dentro del intervalo de control; no omitir ciclos ni generar anteriores al comienzo de control.
- **H04-RF10 — Pausa y restauración.** Inactividad/suspensión/eliminación del estudio o empresa, y pausa/eliminación de una regla, frenan generación y avisos correspondientes. Restaurar/reactivar retoma el periodo vigente sin emitir ciclos de pausas deliberadas.
- **H04-RF11 — Responsables e incidencias.** Obligación automática hereda el responsable configurado. Administrador puede reasignar a uno elegible, dejando historial y aviso. Si el responsable pierde acceso después, conservar la obligación y advertir incidencia; no omitirla.
- **H04-RF12 — Aplicabilidad.** Permitir reglas por destino y condiciones documentadas, incluidas etapas laborales y motivos de cese que correspondan. Obligaciones opcionales se distinguen de las exigibles; No aplica/cancelación conservan el motivo y no se confunden con borrar la regla.
- **H04-RF13 — Conservación al eliminar configuración.** Eliminar lógicamente tipo/regla impide nuevos usos; no cancela automáticamente obligaciones ya emitidas, que siguen su snapshot. La cancelación requiere operación explícita.
- **H04-RF14 — Visibilidad de avance.** Mostrar resultado/errores de generación y advertencias relevantes al administrador dentro de las pantallas existentes. Las obligaciones nuevas aparecen en área y Actividades con la misma identidad.
- **H04-RF15 — Independencia de calendario legal.** Plazos se configuran por el administrador, sin integrar todavía SUNAT ni deducir vencimientos legales de un RUC.

**Trazabilidad:** RF-03, RF-12–RF-14, RF-22–RF-24 y RF-27; RN-02, RN-03, RN-06, RN-09–RN-12 y RN-15; D14–D17, D24 y D31. D23 se reutiliza en actividades recurrentes de H06.

<a id="requerimientos-tecnicos"></a>
## 4. Requerimientos técnicos

- **H04-RT01 — Calendario puro y probado.** Cálculo determinista desde fechas civiles de Lima; no depende de zona del navegador. Cubrir año ISO, meses cortos, bisiestos y ancla personalizada.
- **H04-RT02 — Clave estable de ocurrencia.** Unicidad por estudio/regla/destino/ocurrencia conforme al diccionario; no incluir versión de configuración como escape para duplicar. Periodos, obligaciones y posiciones tienen restricciones propias.
- **H04-RT03 — Versión y snapshot.** `rule_versions` preserva configuración y vigencia; `obligations.snapshot` conserva lo aplicado. Mappers/contratos JSONB validan estructura exacta, no guardan objetos arbitrarios.
- **H04-RT04 — Transacción de generación.** Crear/obtener periodo, insertar obligación y sus posiciones/ciclos y registrar efectos relevantes en operaciones atómicas por lote. Un fallo no deja una obligación sin sus entregables requeridos.
- **H04-RT05 — Cursor durable.** `generation_cursor` sigue el contrato J03; guardar ocurrencia, versión/destino y progreso necesario. No avanzar una ocurrencia hasta completar todos sus destinos; reanudación de lote conserva la configuración usada.
- **H04-RT06 — Recuperación distinta de pausa.** `operation_pauses` registra intervalos civiles con inicio incluido y fin excluido. El cursor recupera caída técnica, pero respeta exclusiones administrativas, control inicial y disponibilidad de ancestros.
- **H04-RT07 — Ejecución sin navegador.** Supabase Cron invoca funciones DB y los trabajos Edge que correspondan. Base inicial de generación: 00:05 de Lima; evaluar también activación/eventos. La configuración efectiva y monitoreo del cron productivo se cierran en H08.
- **H04-RT08 — Responsabilidad explícita.** Validar elegibilidad al activar/reasignar; `assignment_issue` se deriva o registra según el modelo cuando la identidad pierde acceso. Eventos dirigidos al administrador elegible y nuevo responsable se deduplican.
- **H04-RT09 — Eventos identificados.** La periodicidad eventual usa identificador estable de evento/solicitud, no un cron que cree tareas sin evento. Ingreso/cese/reingreso referencian una etapa concreta; implementación de operaciones laborales en H05.
- **H04-RT10 — Concurrencia de configuración.** `ConfigureRequirement`, reasignación y administración conservan `request_id`/`expected_revision` y auditoría. Dos ediciones no sobrescriben la nueva versión ni recalculan obligaciones antiguas.
- **H04-RT11 — Soft delete y conservación.** Filtros comprueban entidad y ancestros; tipos/reglas incluyen metadatos completos. Pausa, baja y restauración tienen efectos separados; obligaciones/versiones/periodos no se borran.
- **H04-RT12 — Acceso y presentación.** RPC directas para cambios, Data API/vistas para lectura, funciones puras compartidas por dominios y formularios Atomic Design. RLS/privilegios y aislamiento de consultas siguen pendientes H08.
- **H04-RT13 — Capacidad y observabilidad.** Procesamiento paginado por destinos, índices del diccionario y registro de último avance/error. No cargar todas las empresas/trabajadores en cada petición de pantalla ni depender de un timer del navegador.

## 5. Calendario y decisiones a implementar

| Frecuencia | Ocurrencia | Caso límite obligatorio |
|---|---|---|
| Única | Una obligación para el destino; fecha explícita cuando es manual. | Reintento con mismo identificador no duplica. |
| Diaria | Una por fecha civil vigente, incluidos fines de semana inicialmente. | Cambio de día entre UTC y Lima. |
| Semanal | Semana ISO de lunes a domingo. | Semana que cruza diciembre/enero y año ISO distinto. |
| Quincenal | Del 1 al 15; del 16 al último día. | Febrero y fecha de incorporación 15/16. |
| Mensual | Mes civil. | Diciembre/enero, febrero bisiesto. |
| Trimestral | Ene–mar, abr–jun, jul–sep, oct–dic. | Incorporación cerca de fin de trimestre. |
| Semestral | Ene–jun y jul–dic. | Límite junio/julio. |
| Anual | Año civil. | Alta durante año y transición diciembre/enero. |
| Eventual | Un evento o solicitud identificado. | Mismo evento repetido, fecha de referencia y plazo. |
| Personalizada | Cada N días, semanas o meses desde ancla. | Ancla 31 y meses cortos; N=0/negativo rechazado. |

Las semanas/quincenas y horarios son bases técnicas configurables del diseño vigente. Un cambio futuro de estas bases exige una decisión documentada y conservación de snapshots, sin modificar silenciosamente históricos.

### 5.1 Matriz de efectos

| Acción | Nuevas obligaciones | Obligaciones emitidas |
|---|---|---|
| Editar regla | Usa nueva versión desde vigencia acordada. | Conservan condiciones. |
| Pausa deliberada | No genera en el intervalo excluido. | Conserva archivos, plazos e historia. |
| Caída técnica | Recupera pendientes desde avance válido. | No duplica las ya confirmadas. |
| Eliminar tipo/regla | Impide nuevos usos. | Continúan por snapshot hasta disposición explícita. |
| Inactivar/eliminar empresa | Detiene generación y avisos operativos. | Permanece historia; reportes administrativos pueden consultarla. |
| Restaurar empresa/regla | Retoma periodo vigente con condiciones disponibles. | No restaura hijos ni cambia estados. |
| Responsable pierde acceso | Genera lo que corresponda con incidencia. | Conserva responsable histórico; administrador reasigna. |

<a id="tareas"></a>
## 6. Tareas del hito

| Tarea | Trabajo concreto y entregable | Requisitos |
|---|---|---|
| H04-T01 | Completar contratos/validaciones de catálogo, destinos, posiciones, formatos, vigencia, obligatoriedad y plazos; UI de activación. | RF01, RF05, RF12, RF15; RT03, RT10, RT12. |
| H04-T02 | Implementar diez frecuencias y utilidades de periodos/plazos; probar límites civiles/ISO/intervalos. | RF02–RF04; RT01, RT09. |
| H04-T03 | Completar migraciones/índices/unicidad de ocurrencias y versionado; verificar FK y JSONB de snapshots/cursor. | RF06, RF08; RT02–RT05. |
| H04-T04 | Implementar generación por lote transaccional y reanudación durable ante fallos parciales. | RF08, RF09, RF14; RT02, RT04, RT05, RT13. |
| H04-T05 | Implementar nueva incorporación desde periodo vigente, con advertencia de plazo pasado y límite de control. | RF07; RT01, RT06. |
| H04-T06 | Implementar vigencias nuevas y demostrar que editar formatos/posiciones/frecuencia/plazo no reescribe instancias anteriores. | RF06, RF13; RT03, RT10, RT11. |
| H04-T07 | Implementar pausas deliberadas, baja/restauración y recuperación de caída como casos distintos. | RF09, RF10, RF13; RT06, RT11. |
| H04-T08 | Completar herencia/reasignación de responsable e incidencias por pérdida de acceso, sin omitir obligaciones. | RF11; RT08, RT10. |
| H04-T09 | Preparar reglas/eventos laborales y aplicabilidad por etapa/motivo para su consumo en H05. | RF12; RT03, RT09. |
| H04-T10 | Configurar Cron de desarrollo y registro de avance/errores, sin dependencia de un usuario conectado. | RF09, RF14; RT07, RT13. |
| H04-T11 | Componer configuración y resultados con repositorios/hooks y reglas compartidas; mantener rutas acordadas. | RF01–RF15; RT12. |
| H04-T12 | Ejecutar matriz de calendario, concurrencia, pausas, historial y asignaciones; entregar evidencias/tipos/documentación. | RF01–RF15; RT01–RT13. |

## 7. Escenarios de aceptación

| Caso | Resultado esperado |
|---|---|
| CA12 Repetición/concurrencia | Misma ocurrencia produce una obligación y sus posiciones una sola vez. |
| CA13 Cambio de configuración | Instancia anterior conserva condiciones; nueva toma versión vigente, sin duplicar el periodo en curso. |
| CA14 Empresa a mitad de mes | Solo periodo vigente; no pendientes automáticos de meses anteriores. |
| CA26 Calendario | Semanas ISO, quincenas, bisiesto, trimestre/semestre y ancla mensual producen fechas correctas. |
| Regla incompleta | No se activa sin posiciones, formatos, responsable y plazo válidos. |
| Caída durante segundo lote | Primer lote permanece; reintento continúa/concuerda sin omitir o duplicar destinos. |
| Caída de varios ciclos | Recupera desde avance dentro del control y no retrocede antes del alta. |
| Pausa de varios ciclos | Reactivación no recupera ciclos deliberadamente excluidos y retoma el vigente. |
| Eliminación de tipo con obligaciones emitidas | No crea nuevas; históricas conservan snapshot y continúan hasta disposición explícita. |
| CA28 inicial Responsable inhabilitado | Obligación no desaparece; incidencia y reasignación visibles; seguridad directa se cierra H08. |
| Dos administradores editan regla | Solo una revisión confirma; CONFLICT no sobreescribe configuración ni históricos. |
| Plazo vigente ya pasado al alta | Advertencia explícita; fecha original permanece sin traslado silencioso. |
| Obligatoriedad/No aplica | Opcionales, No aplica y canceladas se distinguen de exigibles sin eliminar evidencias. |

Registrar fecha local, regla/versión, clave de ocurrencia, cursor inicial/final y recuentos de obligaciones/posiciones para reproducir los resultados.

<a id="definition-of-done"></a>
## 8. Definition of Done

- [ ] H04-RF01–H04-RF15 y H04-RT01–H04-RT13 están implementados y verificados con datos ficticios.
- [ ] Las diez periodicidades y sus plazos funcionan, con pruebas de límites de calendario pertinentes.
- [ ] No se activa una regla incompleta y sus formularios distinguen errores/estados.
- [ ] Unicidad de ocurrencia soporta repetición, concurrencia y cambio de versión sin duplicados.
- [ ] Versiones/snapshots conservan las condiciones históricas; nueva vigencia no reescribe periodos iniciados.
- [ ] Nueva empresa genera desde periodo vigente; plazo pasado se advierte sin alterar.
- [ ] Lotes y cursor se recuperan tras fallo parcial/caída sin perder destinos.
- [ ] Pausas administrativas y caídas técnicas tienen recuperación diferente y comprobada.
- [ ] Soft delete/restauración respeta ancestros, unicidad y obligaciones emitidas.
- [ ] Responsables se heredan/reasignan y pérdida de elegibilidad produce incidencia sin omisión.
- [ ] Cron de desarrollo funciona sin navegador y existe evidencia de avance/error.
- [ ] Operaciones directas, reglas puras y Atomic Design se reutilizan; no existe motor paralelo por área.
- [ ] CA12–CA14, CA26 y escenarios complementarios tienen evidencia; configuración productiva/RLS permanecen para H08.
- [ ] Contratos/tipos/documentación y Definition of Done común permiten iniciar H05.

## 9. Límites y continuidad

El calendario tributario legal integrado queda posterior. No hardcodear fechas SUNAT para completar este hito. Las tareas manuales adicionales se entregan en H06 reutilizando este motor, no mediante un calendario independiente.

Ingreso/cese/reingreso y su interfaz se completan en H05. Monitoreo, horarios productivos y control de acceso definitivo son H08.

## 10. Referencias

- [Índice de hitos](README.md).
- [Catálogo, reglas y calendario](../diseno-tecnico.md#7-catálogo-reglas-y-calendario).
- [Modelo y JSONB](../tablas-db.md).
- [Soft delete y conservación](../tablas-db.md#2-soft-delete-y-conservación).
- [Procesos](../diagrama-flujo.md).
- [Anterior: H03](h03-primer-recorrido-documental.md) · [Siguiente: H05](h05-areas-documentales.md).
