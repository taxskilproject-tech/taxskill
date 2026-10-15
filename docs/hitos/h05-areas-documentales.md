# H05 — Tres áreas documentales

**Estado:** pendiente. **Depende de:** [H04](h04-motor-documental.md). **Habilita:** [H06](h06-actividades-notificaciones.md). Aplican las [reglas](README.md#3-reglas-transversales-obligatorias) y la [Definition of Done común](README.md#4-definition-of-done-comun).

<a id="objetivo"></a>
## 1. Objetivo

Entregar Tributario, Laboral general y Laboral por trabajador sobre el mismo motor, incorporando un expediente que preserve ingreso, relación, cese y reingreso como etapas independientes.

El equipo debe demostrar documentación completa por empresa y trabajador, con reglas configurables y revisión de archivos compartida, sin duplicar lógica entre las áreas.

## 2. Alcance, entradas y entregables

**Entrada:** diez periodicidades, eventos identificados, snapshots y generación recuperable de H04; acceso a empresas y recorrido de archivo/revisión de H02–H03.

**Incluye:** catálogo inicial editable, pestañas de empresa, ficha del trabajador, etapas laborales, eventos de ingreso/cese, documentos por motivo y consulta histórica.

**Entregables:** tres áreas navegables, operaciones laborales, catálogo de prueba, expediente por etapa y evidencia de generación/revisión y reingreso.

| Ruta/pestaña | Entrega |
|---|---|
| `/empresas/{companyId}` | Resumen y pestañas `tributario`, `laboral_general`, `laboral_trabajador`, `actividades` e `historial` conforme a navegación. |
| `/empresas/{companyId}/trabajadores/{workerId}` | Ficha, selector de etapa e ingreso/relación/cese con documentos e historia. |
| `/actividades/{obligationId}` | Detalle común para carga y revisión de cualquier área. |
| `/configuracion` | Catálogo/reglas por empresa, destino y etapa; sin plazos legales hardcodeados. |

Las pestañas usan parámetros de la ruta de empresa, no nuevas rutas de módulo. Formularios de trabajador/etapa se componen sobre estas páginas.

<a id="requerimientos-funcionales"></a>
## 3. Requerimientos funcionales

- **H05-RF01 — Tributario.** Presentar obligaciones del catálogo tributario habilitado, por periodo y estado, con avance por posición, entrega pendiente y cumplimiento. Reutilizar carga/revisión de H03 y motor H04.
- **H05-RF02 — Laboral general.** Presentar documentos colectivos de la empresa y sus frecuencias configuradas, sin asociarlos a un trabajador arbitrario ni convertir cada archivo en una obligación distinta.
- **H05-RF03 — Alta del trabajador.** Usuario con `workers.manage` registra identificación, nombres/apellidos y contactos disponibles en su empresa. Identidad única por estudio/empresa/tipo/número incluso tras eliminación lógica; DNI exige ocho dígitos.
- **H05-RF04 — Edición de ficha.** Modificar datos con validación, revisión esperada y auditoría. La ficha no almacena un estado activo/cesado independiente que contradiga sus etapas.
- **H05-RF05 — Ingreso.** Registrar etapa con fecha de ingreso y condiciones disponibles: cargo, área, contrato y remuneración de referencia. Crear checklist configurado y habilitar obligaciones periódicas aplicables.
- **H05-RF06 — Trabajador previamente contratado.** Si la empresa incorpora un trabajador contratado antes del control, solicitar checklist de ingreso como necesidad actual y periodos vigentes. No generar boletas históricas automáticamente.
- **H05-RF07 — Relación activa.** Mostrar documentos periódicos/eventuales de la etapa: boletas, memorándums, adendas y comunicaciones según reglas activas. Cada obligación laboral referencia la etapa correspondiente.
- **H05-RF08 — Cese.** Exigir fecha, motivo y observación cuando corresponda; cerrar la etapa y generar documentación de cese mediante un evento identificable. No eliminar trabajador ni sus archivos por cesarlo.
- **H05-RF09 — Aplicabilidad por motivo.** Carta de renuncia se exige cuando la regla aplica a renuncia; para otros motivos registrar No aplica según configuración. Los demás documentos se activan por sus propias reglas, sin asumir idéntico checklist para todas las empresas.
- **H05-RF10 — Generación al cesar.** Solo generar periódicas cuyos periodos intersecten la relación; no emitir periodos completamente posteriores al cese. Obligaciones ya generadas conservan plazo, archivos y decisiones.
- **H05-RF11 — Historia anterior al control.** Un trabajador ya cesado antes del inicio de control se conserva como histórico sin generar retroactivamente ciclos de cese.
- **H05-RF12 — Reingreso.** Crear otra etapa con nuevo identificador/secuencia, fechas y checklist. No reabrir la etapa cerrada ni reutilizar sus documentos de cese como evidencia de la nueva.
- **H05-RF13 — Expediente histórico.** Seleccionar etapa, ver documentos/decisiones/versiones asociadas y descargar según capacidad. Por defecto elegir etapa activa o, si no existe, la más reciente.
- **H05-RF14 — Acceso laboral completo.** Acceso al módulo laboral incluye remuneraciones y exámenes médicos; no introducir un permiso adicional para esos datos. Mantenerlos dentro del alcance de empresa/módulo y excluirlos de mensajes/logs externos.
- **H05-RF15 — Eliminación y restauración.** Soft delete del trabajador exige motivo, conserva etapas/obligaciones y bloquea nueva generación. Restaurar no registra ingreso ni modifica su cese; recuperar la ficha existente antes de reutilizar identificación.
- **H05-RF16 — Uso cotidiano.** Listar/buscar trabajadores por identificación/nombre dentro de la empresa y filtrar por relación activa/cesada. Estados vacíos, errores y documentos faltantes deben permitir continuar el recorrido sin perder el contexto.

**Trazabilidad:** RF-08–RF-14, RF-15–RF-23, RF-25–RF-27; RN-08–RN-11 y RN-15; HU-10–HU-11; D04, D09, D18, D22, D24 y D33–D35. Los flujos documentales RF-15–RF-23 se reutilizan, no se reimplementan.

<a id="requerimientos-tecnicos"></a>
## 4. Requerimientos técnicos

- **H05-RT01 — Persistencia laboral.** Completar `workers` y `employment_periods` incorporadas como dependencias del motor, respetando diccionario, FK compuestas y vínculos de obligación a empresa/trabajador/etapa.
- **H05-RT02 — Etapas coherentes.** Una sola etapa abierta por trabajador mediante unicidad parcial; impedir superposición histórica transaccionalmente. Secuencia desde uno, fecha de cese >= ingreso, fecha/motivo de cese establecidos juntos.
- **H05-RT03 — Identidad y tipos.** Número de identificación como texto para conservar ceros; tipos DNI/CE/PASSPORT/OTHER conforme a DB. Remuneración `numeric(14,2)` no negativa o NULL, moneda `char(3)` con PEN inicial. No usar floats para dinero.
- **H05-RT04 — Operaciones laborales.** `RegisterWorker`/`StartEmployment` y `EndEmployment` por RPC directa, con `workers.manage`, contexto real, `request_id` y revisión esperada donde aplica. Cambio laboral, evento identificable y auditoría quedan coherentes.
- **H05-RT05 — Eventos y generación.** Ingreso/cese usan ID estable de la etapa/evento y motor H04 idempotente. Si generación ocurre en un trabajo separado, conservar un evento/progreso recuperable; el reintento no repite el cambio laboral ni el checklist.
- **H05-RT06 — Periodos que intersectan.** Calcular elegibilidad usando fechas civiles de la etapa y del periodo, incluyendo casos de ingreso/cese a mitad de mes. No usar `deleted_at` como fecha de cese ni inventar un estado físico adicional.
- **H05-RT07 — Catálogo configurable.** Seeds del catálogo son datos editables, no código específico por documento. Posiciones múltiples, formatos, plazo, frecuencia y aplicabilidad siguen reglas/snapshots comunes.
- **H05-RT08 — Conservación.** Soft delete solo en ficha `workers`; `employment_periods` se conserva con cambios controlados/auditoría. Cese y reingreso no borran versiones ni revisiones, y ediciones de ficha/condiciones no reescriben archivos históricos.
- **H05-RT09 — Selectores seguros de contexto.** `employmentPeriodId` debe pertenecer al trabajador de la ruta; valor ajeno/inexistente se trata como recurso inexistente. Validar empresa/trabajador/etapa antes de mostrar datos; protección efectiva de accesos directos H08.
- **H05-RT10 — Consultas eficaces.** Paginación/índices para listado de trabajadores y obligaciones; selección de campos por necesidad. No precargar archivos de todas las etapas ni enviar salarios/notas médicas a auditoría, logs o n8n.
- **H05-RT11 — Reutilización por dominio.** Composiciones de Tributario y Laboral consumen mismos contratos de obligación/archivo/revisión. Regla de etapa reside en dominio; presentación Atomic Design, sin tres copias de hooks/repositorios del motor.
- **H05-RT12 — Integración de permisos.** Aplicar acciones `view`, `upload`, `download`, revisión y `workers.manage` según H02. La asignación de responsable no otorga acceso ni convierte al cliente en revisor.
- **H05-RT13 — Corrección y concurrencia.** Ediciones/ingresos/ceses concurrentes respetan revisión y restricciones. Corregir una etapa histórica requiere validación de fechas/superposición y auditoría; no equivale a reingresar.

## 5. Catálogo inicial que debe poder configurarse

Estas son bases del análisis y del diseño vigente; cada empresa define formatos, posiciones y plazos antes de activar sus reglas. No constituyen asesoría ni calendario legal.

| Área/etapa | Tipos iniciales | Periodicidad de partida |
|---|---|---|
| Tributario | Cálculo Excel, PDT de dos posiciones, compras PDF, ventas PDF, control tributario Excel. | Quincenal; mensual para PDT/compras/ventas; semanal para control. |
| Tributario configurable | Consulta de declaraciones PDT y consulta de pagos. | Administrador define frecuencia/plazo antes de activar. |
| Laboral general | Asistencia, planilla, planilla AFP, pago AFP, reporte SIS, pago SIS, reporte PLAME y constancia PLAME. | Asistencia diaria configurable, planilla quincenal y restantes mensuales. |
| Ingreso | Ficha, constancia de alta, contrato, CV, examen médico y otros configurados. | Evento de ingreso / checklist actual para trabajador incorporado. |
| Relación | Boletas, memorándums, adendas y comunicaciones. | Boletas mensuales; restantes por evento conforme a regla. |
| Cese | Liquidación, certificado, acreditación de pago y carta de renuncia condicional. | Evento de cese con plazo desde fecha de referencia y aplicabilidad. |

### 5.1 Datos y transiciones del expediente

| Elemento | Datos/regla | Conservación |
|---|---|---|
| Ficha | Tipo/número, nombres, apellidos, nacimiento/contactos/dirección/notas cuando se informen. | Identidad estable dentro de empresa; eliminación no borra etapas. |
| Etapa | Ingreso, cese/motivo/notas, cargo, área, contrato, salario y moneda. | Nueva etapa por reingreso, secuencia y fechas coherentes. |
| Activo/cesado | Se deriva de presencia de una etapa abierta. | No confundir cese con soft delete. |
| Documentación | Obligación y periodo, más ID de etapa cuando corresponde. | Versiones/revisiones pertenecen a la etapa original. |
| Reingreso | Nueva etapa validada contra las anteriores. | Cese y documentos anteriores permanecen sin reutilización automática. |

No se implementa cálculo de planilla/remuneraciones: se documentan y almacenan referencias y archivos del alcance acordado.

<a id="tareas"></a>
## 6. Tareas del hito

| Tarea | Trabajo concreto y entregable | Requisitos |
|---|---|---|
| H05-T01 | Completar migraciones laborales, identificación única, etapa abierta, secuencias y validaciones de fechas/dinero. | RF03–RF05, RF12; RT01–RT03. |
| H05-T02 | Implementar registro/edición de trabajador con auditoría, concurrencia, soft delete/restauración y búsqueda por empresa. | RF03, RF04, RF15, RF16; RT04, RT08, RT10, RT13. |
| H05-T03 | Implementar ingreso/primera etapa y checklist, incluyendo trabajador contratado antes del control sin boletas atrasadas automáticas. | RF05, RF06; RT04–RT07. |
| H05-T04 | Implementar cese y condiciones documentales por motivo, con evento recuperable/idempotente. | RF08–RF11; RT02, RT04–RT08. |
| H05-T05 | Implementar reingreso, selector de etapas y separación de documentos por relación laboral. | RF12, RF13; RT01, RT02, RT05, RT09, RT13. |
| H05-T06 | Completar catálogo/seed configurable de las tres áreas y documentos de ingreso/relación/cese; validar activación por empresa. | RF01, RF02, RF05–RF10; RT07. |
| H05-T07 | Componer pestañas de empresa y expediente con navegación/retorno al detalle común y permisos de acción. | RF01, RF02, RF13, RF14, RF16; RT09, RT11, RT12. |
| H05-T08 | Integrar carga, revisión, corrección, reapertura e historial existentes en todas las áreas, sin lógica duplicada. | RF01, RF02, RF07, RF13; RT07, RT11. |
| H05-T09 | Revisar consultas y exposición de remuneraciones/exámenes: acceso laboral completo, sin envío de contenido sensible a eventos externos. | RF14, RF16; RT03, RT10, RT12. |
| H05-T10 | Probar ingreso/cese/reingreso, superposición, periodo parcial, historia anterior y reintentos; verificar recorridos en móvil/teclado. | RF03–RF16; RT01–RT13. |
| H05-T11 | Entregar demostración por área y etapa, tipos/contratos actualizados y evidencia de correspondencia entre UI y obligaciones. | RF01–RF16; RT01–RT13. |

## 7. Escenarios de aceptación

| Escenario | Resultado esperado |
|---|---|
| CA15 Ingreso → cese → reingreso | Etapas distintas; checklist y documentos correctos por etapa; historia anterior consultable. |
| Misma identificación ya eliminada | Alta duplicada rechazada; restauración de ficha no crea ingreso automático. |
| Ingreso antes del control | Checklist actual y periodos vigentes; ninguna boleta histórica automática. |
| Dos inicios concurrentes | Solo una etapa abierta; otra operación recibe conflicto/validación y no duplica eventos. |
| Cese sin motivo o anterior al ingreso | Rechazo claro sin cambio parcial ni documentación emitida. |
| Renuncia / otro motivo | Carta aplicable por regla / No aplica documentado; checklist restante según configuración. |
| Cese a mitad de mes | Periodo intersectante puede ser exigible; mes totalmente posterior no se genera. |
| Histórico cesado antes del control | Conservado sin generar cese retroactivo. |
| Repetir evento de cese | Una sola ocurrencia por destino/regla/evento. |
| Selector con etapa de otro trabajador | Recurso no disponible; no muestra condiciones ni documentos ajenos. |
| Mismo proceso en tres áreas | Aprobación parcial, corrección y reapertura se comportan igual que en H03. |
| Acceso laboral habilitado | Remuneración y examen visibles según módulo, sin permiso extra; contenido no sale a mensajes/logs. |
| Eliminar/restaurar trabajador | Historia intacta, generación bloqueada al eliminar y sin reapertura laboral implícita al restaurar. |
| Expediente móvil/teclado | Selector, documentos, acciones y retorno al listado son utilizables con estados claros. |

Además de CA15, repetir la muestra pertinente de CA06–CA11, CA13–CA14, CA27 y CA34 en destinos laborales. CA01–CA03 y protección de datos laborales directos se cierran en H08.

<a id="definition-of-done"></a>
## 8. Definition of Done

- [ ] H05-RF01–H05-RF16 y H05-RT01–H05-RT13 tienen evidencia de las tres áreas y expediente.
- [ ] Catálogo de partida está disponible/editable y plazos/responsables se configuran antes de activar.
- [ ] Tributario y Laboral general utilizan el mismo motor y revisión de posiciones.
- [ ] Ficha única, salario/moneda y etapas cumplen las restricciones del diccionario.
- [ ] Registro/edición/ingreso/cese funcionan por capacidad `workers.manage`, con auditoría e idempotencia.
- [ ] No se admite superposición ni dos etapas abiertas por trabajador.
- [ ] Ingreso previo al control, periodo parcial y cese anterior al control generan únicamente lo acordado.
- [ ] Cese conserva obligaciones/archivos y su evento no se duplica al reintentar.
- [ ] Reingreso crea otra etapa y no reutiliza documentos de cese de la anterior.
- [ ] Selector histórico y enlaces respetan empresa/trabajador/etapa; carga/revisión/corrección/reapertura funcionan en destinos laborales.
- [ ] Soft delete/restauración conserva historia e identidad y no equivale a cese/reingreso.
- [ ] Remuneraciones/exámenes usan acceso laboral sin permiso adicional y no se incluyen en avisos/logs sensibles.
- [ ] Migraciones, tipos, contratos, CA15 y regresión pertinente están entregados; enforcement directo permanece para H08.
- [ ] Definition of Done común satisfecha y obligaciones de las tres áreas listas para H06.

## 9. Límites y continuidad

No se entrega cálculo de nómina, calendario legal, integración SUNAT, firma digital o expediente OCR. Las actividades adicionales y la bandeja completa son H06; reportes y supervisión transversal H07; protección final de acceso y operación H08.

## 10. Referencias

- [Índice de hitos](README.md).
- [Expediente laboral](../diseno-tecnico.md#9-expediente-laboral).
- [Catálogo inicial](../diseno-tecnico.md#74-catálogo-inicial-orientativo).
- [Tablas y ciclo de vida](../tablas-db.md).
- [Navegación y selector de empresa](../flujo-navegacion.md).
- [Procesos](../diagrama-flujo.md).
- [Anterior: H04](h04-motor-documental.md) · [Siguiente: H06](h06-actividades-notificaciones.md).
