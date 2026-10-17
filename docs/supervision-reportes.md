# Supervisión, búsqueda y reportes · H07

Implementado el 17 de octubre de 2026. Ocho migraciones originales y una migración correctiva adicional publicadas con autorización expresa, con validación en Docker e historia conservada. Local y Cloud tienen 56 migraciones, sin fixtures remotos. Ver [cierre de observaciones](hitos/evidencias/h07-correcciones.md), [hito y requisitos](hitos/h07-supervision-reportes.md), [evidencia inicial](hitos/evidencias/h07.md), [entornos](desarrollo.md) y [H08](hitos/h08-preparacion-produccion.md).

La [revisión complementaria](hitos/evidencias/revision-final-pre-h08.md) deja dos casos pendientes de los contratos de abajo: navegación de indicadores que sustituye filtros y mensajes de exportación que permanecen al cambiar a un resultado en caché. REV-01–REV-03 conservan su cierre.

## Recorridos

| Ruta | Función |
|---|---|
| `/dashboard` | Empresas activas, obligaciones pendientes, archivos por revisar/observados, entregas vencidas/próximas y cumplimiento. Los enlaces conservan el universo de filtros. |
| `/reportes` | Detalle, cumplimiento por empresa/área, pendientes, vencimientos, observaciones y detalle por periodo. Exportación completa a Excel/PDF. |
| `/documentos` | Metadatos de todas las versiones, incluidas las anteriores a una reapertura; descarga y vista previa usan el circuito documental existente. |
| `/auditoria` | Actor humano/sistema, recurso, alcance, fecha de Lima y transición mínima, sin edición. |
| `/empresas/{id}` | Resumen calculado con las mismas reglas; enlaces a periodos e histórico administrativo. |

La empresa del selector delimita el contexto; un parámetro URL no otorga autorización. Los filtros y `returnTo` sobreviven al recorrido documento → detalle → listado. Los formularios adicionales no introducen rutas.

Los indicadores abren el listado de su recurso de origen: dashboard mantiene `view`, reportes mantiene `reports.view`. Los permisos de otra empresa o módulo no cambian ese destino ni reducen el universo al pasar entre pantallas.

## Unidades y fórmulas

`private.h07_facts` deriva de `h03_obligation_summary`, que calcula la revisión individual y el vencimiento de ciclos abiertos aún sin entrega. Dashboard, reportes y exportación usan `private.h07_rows` y `private.h07_report`. La bandeja H06 comparte los hechos operativos y el denominador documental.

- Documental exigible: `class = documentary`, `is_required = true`, `disposition = active`. Aprobada: todos los entregables aprobados y al menos uno requerido.
- Cumplimiento: suma de obligaciones aprobadas / suma de exigibles. Nunca promedio de porcentajes por empresa. Cero exigibles: **Sin obligaciones**.
- Actividades adicionales: numerador/denominador propios; las internas tienen `company_id = null` y no aparecen al delimitar una empresa.
- Pendientes: obligaciones activas sin aprobación completa. Revisiones y observaciones: **archivos**. Empresas activas: **empresas**, incluso sin obligaciones. Atrasos y estados no son grupos excluyentes.
- Una entrega recibida a tiempo pendiente de revisión no está vencida. `late_cycles` cuenta ciclos entregados después del plazo, según Lima; permanece como historia aunque ya estén aprobados y sin entrega pendiente.
- Operación excluye empresas inactivas/eliminadas y trabajadores eliminados. Pausar/eliminar una regla no borra ni desactiva por sí solo obligaciones ya emitidas.
- `include_deleted = true` exige administración del estudio e identifica `active`, `inactive`, `deleted`. La consulta histórica no modifica registros ni concede descarga de archivos bajo ancestros eliminados.

## Contratos Supabase directos

`h07_query(p_organization_id, p_resource, p_input)` devuelve `{ok,data}` o `{ok:false,error:{code}}`. Recursos: `dashboard`, `report`, `documents`, `audit`. Revalida membresía, cuenta y sesión. Los helpers privados no conceden ejecución a `anon`/`authenticated`.

Filtros tipados y permitidos: empresa, alcance, módulo, clase, estado, búsqueda `q` de hasta 200 caracteres, clave/año/mes del periodo, trabajador/tipo por UUID, rango de entrega, histórico, clase de reporte e indicador. Auditoría admite actor, recurso, acción y rango civil de Lima, con límite superior inclusivo. Orden: plazo, título o periodo; desempate UUID. Páginas 25/50/100; lote de exportación 500. Los filtros inválidos producen error explícito.

La búsqueda incluye archivo original, título de obligación, empresa/RUC, trabajador/identificación, tipo y periodo. No consulta contenido, OCR, salarios ni diagnósticos; no solicita Storage hasta una acción de descarga/vista previa.

Los reportes aplican `reports.view`; exportar exige además `reports.export` sobre las mismas filas. La administración tiene acceso global dentro de su estudio. Auditoría aplica `audit.view`; eventos administrativos sin contexto atribuible se restringen al administrador. La protección efectiva de todas las tablas, Data API y Storage mediante RLS se termina y demuestra en **H08**.

## Exportación y auditoría

1. `h07_export(..., stage=start, {format,filters})` reserva `GenerateReport` en `operation_requests`; calcula cantidad y huella del universo exportable. Mismo UUID/entrada repite la reserva; una entrada diferente genera conflicto.
2. El navegador consulta todos los lotes, conserva las filas y comprueba cantidad, huella, cantidad por lote e identidades únicas. No exporta únicamente la página visible.
3. Un Web Worker carga dinámicamente el generador correspondiente. El usuario ve progreso real y puede cancelar la consulta o terminar el worker. Cambiar contexto/filtros/permisos o desmontar la pantalla aborta la operación y evita descargar archivos del contexto anterior.
4. `stage=finish` vuelve a comprobar el universo antes de aceptar `generated`. `cancelled`/`failed` registran cero filas generadas. La transición es idempotente y no permite sustituir un resultado ya finalizado.
5. Solo después se solicita la descarga al navegador. **Generated significa bytes preparados; no acredita guardado en disco.** No hay endpoint de exportación ni claves privadas en este circuito.

Los lotes no constituyen una transacción de lectura única: se informa momento de consulta/generación y se rechaza un universo cambiado. Un fallo no produce un archivo parcial anunciado como completo. La auditoría guarda actor, filtros estructurados, cantidad, formato y resultado; la búsqueda libre se registra como presencia de búsqueda, sin copiar texto personal a auditoría. No hay INSERT de auditoría arbitrario desde la interfaz.

El registro remoto propaga cancelación y limita cada espera normal a 10 segundos. Al interrumpirse, se concilia con el mismo UUID: replay de `start`, cierre si seguía en curso y comprobación adicional si se perdió la respuesta de cierre; cada espera de conciliación admite 3 segundos. Una operación terminal no se sobrescribe. Si no se confirma el resultado, se libera el loading y se informa la referencia para conciliación, sin descargar ni afirmar que cancelar HTTP revirtió el servidor. Si ya se había confirmado `generated`, la interfaz explica que se preparó el archivo pero no se descargó. “Cancelando…” permanece visible y deshabilitado durante este proceso.

Excel usa celdas de texto explícitas para RUC/identificación, números reales para cantidades y fechas civiles con formato. Neutraliza prefijos `= + - @`, variantes de compatibilidad y prefijos invisibles. No genera fórmulas. Incluye detalle y hoja de resumen con alcance, filtros, unidades y agrupaciones.

PDF usa A4 horizontal, cabeceras/pies repetidos, ajuste de texto y continuidad de filas extensas. Incluye filtros, momentos de Lima, conteo y unidades. Las fuentes estándar conservan español; otros caracteres aparecen como `[U+XXXX]`, sin descartarlos silenciosamente. No es un PDF etiquetado para accesibilidad: mejorar ese formato sigue siendo una mejora posterior.

Base técnica: lote de 500 y máximo de **30.000 filas por archivo** para controlar memoria del navegador; acotar filtros permite continuar. No es un límite comercial del producto. Se midió la referencia de 1.000 filas exportadas; límites/memoria y concurrencia requieren evaluación del equipo en los dispositivos reales antes de publicar.

## Datos mínimos e historia

El visor de auditoría proyecta exclusivamente estados, revisión, disposición y fechas autorizadas en `before_values`/`after_values`. No devuelve JSON crudo de negocio, direcciones IP, agente de navegador, contactos, salarios, información médica ni credenciales. Conserva las filas originales sin reescribir el historial.

`private.h07_audit_scoped` deriva empresa/módulo desde los padres de revisiones, entregables, versiones y etapas laborales, además de configuraciones y asignaciones. Las relaciones usan el estudio del evento; no se reescriben eventos antiguos para completar sus campos. Actividades internas conserva empresa nula y módulo `actividades`; eventos administrativos sin contexto atribuible siguen restringidos a administración. El visor conserva los filtros y la proyección mínima.

Las ocho migraciones H07 (`20261017002000`–`20261017002700`) añaden hechos derivados privados, RPC, límites e índices; no crean tablas de reportes ni alteran la identidad documental. Los índices se añadieron al medir recorridos completos de entregables/ciclos en la consulta anterior.

La migración correctiva `20261017164155_h07_audit_resource_scope.sql` añade la resolución de ámbito de auditoría sin modificar las migraciones anteriores ni los registros de negocio.

## Verificación y operación

```powershell
yarn test:h07:sql
yarn test:h07:live
yarn test
yarn typecheck
yarn lint
yarn check:architecture
yarn db:lint
yarn build
yarn check:bundle
```

`test:h07:live` llama `requireLocalTestEnvironment()` antes de crear el SDK, leer fixtures o hacer solicitudes. Rechaza Cloud y puertos de otros proyectos. Crea/reutiliza un estudio local de capacidad de 30 empresas, 100 usuarios y 1.000 trabajadores: 12.000 obligaciones, 1.000 versiones de metadatos y 12.000 eventos. Estas versiones de capacidad no simulan objetos reales de Storage ni deben usarse para probar descarga; los archivos reales locales de H03–H06 cubren ese circuito.

Medición autenticada HTTP sobre loopback: calentamiento y 20 muestras por recurso, un usuario concurrente, sin SLA productivo. Consultar [mediciones y consumo](hitos/evidencias/h07.md#capacidad). En este equipo fue necesario ejecutar la compilación con `$env:CIRCLE_NODE_TOTAL='3'` antes de `yarn build`, reduciendo Next a dos workers; no se cambió la configuración productiva.

Fuentes de las librerías: [write-excel-file](https://github.com/catamphetamine/write-excel-file), [pdf-lib](https://pdf-lib.js.org/). Se fijaron versiones y carga diferida. RLS, políticas Storage, publicación Vercel, respaldos, monitoreo, piloto y autorización por accesos directos continúan en H08.
