# Vista documental común por periodos

Implementación local del 25/10/2026. La petición inicial de rediseñar Tributario se amplió expresamente a **los tres módulos documentales**, porque Laboral general y Laboral por trabajador también contienen controles periódicos. Esta actualización complementa el [diseño técnico](diseno-tecnico.md), el [expediente H05](expediente-laboral.md), la [navegación de módulos](plan-navegacion-modulos.md) y la [auditoría UX/UI](auditoria-ux-ui.md).

## 1. Decisiones de producto y fuentes

**Confirmado por el usuario:** elegir primero el periodo, presentar los archivos en un orden comprensible basado en la documentación y reutilizar esta vista en los demás módulos con controles periódicos.

**Base técnica adoptada:** navegación Año → Mes → Tipo documental → Archivo. En escritorio, tipos numerados junto a los resultados; en móvil, selectores compactos y filtro de estado ampliable. El mes no se selecciona automáticamente. Las frecuencias siguen siendo configurables por regla; la nueva presentación no las convierte en restricciones fijas ni cambia vencimientos.

El orden procede de las secciones 15, 20 y 23–28 del [análisis original](analisis_completo_sistema_documental_contable.md), del catálogo acordado en [H05](hitos/h05-areas-documentales.md) y de `src/domain/documents/constants/catalog-templates.ts`. La sección 57 ilustra la elección mensual; su ejemplo no sustituye el catálogo completo. Las decisiones posteriores del diseño técnico prevalecen sobre propuestas del análisis original.

| Módulo | Orden de partida |
|---|---|
| Tributario | Cálculo tributario Excel, PDT, Registro de compras, Registro de ventas, Control tributario Excel, Consulta de declaraciones PDT, Consulta de pagos. |
| Laboral general | Asistencia, Planilla, Planilla AFP, Pago AFP, Reporte SIS, Pago SIS, Reporte PLAME, Constancia PLAME. |
| Trabajador — Ingreso | Ficha, alta, contrato, CV y examen médico, conforme a los nombres del catálogo. |
| Trabajador — Relación | Boleta de remuneración, memorándum, adenda y comunicación laboral. |
| Trabajador — Cese | Liquidación, certificado, pago y renuncia, conforme a las condiciones aplicables. |

**Actualización H09:** la lista muestra los entregables efectivamente configurados para la empresa y etapa, con una numeración continua y estable entre meses. Los adicionales se agregan al final de la misma lista; se elimina «Otros tipos configurados». No se presentan tipos de plantilla que no se hayan aplicado a esa empresa. Los configurados con cero obligaciones sí permanecen visibles y explican si esperan responsable, están programados, pausados o sin obligaciones en el periodo. Dentro de cada obligación, los archivos siguen `deliverables.display_order`, con desempate estable por identificador. PDT conserva sus dos archivos y su revisión individual. Consultar [plantillas y perfil de empresa](entregables-plantillas-empresa.md) y [H09](hitos/h09-entregables-plantillas-empresa.md).

## 2. Recorridos unificados

- **Tributario y Laboral general:** seleccionar año y mes, elegir tipo documental y abrir el archivo requerido. Los controles diarios, semanales y quincenales aparecen dentro del mes correspondiente, con su rango o quincena visibles.
- **Laboral por trabajador:** conserva Trabajadores / Obligaciones. En Obligaciones se elige etapa documental y periodo; Relación laboral es la etapa inicial. Cada fila identifica al trabajador y su periodo laboral.
- **Expediente individual:** primero se mantiene el periodo laboral seleccionado. Ingreso y Cese usan listas de requisitos de ese periodo laboral, sin obligar a elegir un mes. Relación laboral ofrece **Por periodo** para boletas y otros controles recurrentes, y **Eventuales** para documentos únicos o asociados a un evento.
- **Detalle de archivo:** usa la pantalla existente de obligación, con `deliverableId` seleccionado. Conserva entrega, vista previa, revisión, observación, corrección, reapertura, permisos y feedback asíncrono existentes.

**Periodo documental y vencimiento son distintos.** Una obligación de octubre que vence en noviembre se consulta en octubre. La asociación usa el solapamiento del rango civil del periodo con el mes elegido. Una semana que cruza meses o un control anual pueden verse en varios meses, siempre con el mismo UUID; no se crean copias ni se altera el cálculo de cumplimiento.

No se agrupan únicamente los 25 resultados descargados. El servidor calcula meses, tipos y conteos sobre todo el conjunto autorizado; después selecciona el tipo, filtra por estado y pagina sus obligaciones. Las páginas múltiples conservan controles arriba y abajo. Una sola página utiliza el resumen de conteo sin controles redundantes.

Actividades continúa como bandeja transversal de pendientes y vencimientos. Documentos continúa como buscador de archivos entregados y versiones. Ambos conservan sus recorridos actuales.

## 3. Rutas, contexto y contratos

No se añaden rutas. Los módulos siguen en `/empresas/{companyId}?tab=...` y el expediente en `/empresas/{companyId}/trabajadores/{workerId}`.

| Parámetro de presentación | Contenido |
|---|---|
| `documentYear` | Año civil de Lima; predeterminado al año actual. |
| `documentMonth` | Mes 1–12; ausente significa elegir mes. |
| `documentType` | Código del tipo documental. |
| `documentState` | Estado agregado validado de obligación. |
| `documentPage` | Página de 25 obligaciones del tipo elegido. |
| `documentStage` | Ingreso, relación o cese en la vista de obligaciones de empresa. |
| `documentScope` | Por periodo o eventuales dentro de Relación del expediente. |

El lector admite enlaces mensuales anteriores mediante `obligationPeriod=YYYY-MM`. Cambiar mes o tipo limpia sus filtros dependientes; cambiar periodo laboral o etapa limpia la selección documental anterior. `returnTo` valida y conserva los nuevos parámetros, junto con el retorno del expediente al listado. Una URL inválida no inicia la consulta con filtros ampliados. Año, mes y página se validan también en PostgreSQL.

El navegador usa el repositorio documental existente y `h03_query`, recurso `document_workspace`. La respuesta se valida con Zod: años, meses y conteos, tipos y avance, código seleccionado, obligaciones paginadas y archivos ordenados. No incluye remuneraciones ni nuevos secretos.

Scopes internos: `calendar` para empresa, `periodic` para recurrentes del expediente, `event` para únicos/eventuales y `checklist` para Ingreso/Cese. Los dos últimos requieren trabajador, periodo laboral y etapa. El servidor valida pertenencia al estudio/empresa y permiso de consulta del módulo; conserva protección de sesiones. Las vistas y funciones nuevas son privadas, sin privilegios de consulta/ejecución directos del cliente.

## 4. Organización y migraciones

`src/features/document-workspace/` contiene la composición reutilizada por los tres módulos y el expediente: componentes, constantes, hooks, tipos y funciones puras de navegación/presentación. Reutiliza el catálogo de dominio, controles atómicos y repositorio documental. No crea un motor, almacenamiento, endpoint o formulario de carga paralelo.

Migraciones locales nuevas:

1. `20261025152519_tax_period_workspace.sql`: primera consulta mensual de Tributario.
2. `20261025153532_unified_document_period_workspace.sql`: generalización a los tres módulos, etapas y periodos laborales. Conserva el recurso inicial como adaptador compatible hacia una única consulta compartida.

La primera ya estaba aplicada localmente al ampliar el alcance; se preservó su historia mediante la segunda. Son cambios de lectura, sin reescribir obligaciones, archivos, snapshots o revisiones. La validación original dejó 74 migraciones locales y 72 en Cloud. **Ambas se publicaron después por solicitud del usuario junto a las nueve H09: Cloud tiene 83 versiones coincidentes**, con historial y datos anteriores conservados. Ver [publicación verificada](hitos/evidencias/h09.md#publicación-sql-en-cloud-autorizada). No se desplegó el frontend ni se activaron jobs o envíos reales en esa publicación SQL.

## 5. Demostración y validación local

En <http://127.0.0.1:4001>, elegir **Demostración · Documentos por periodo** y **octubre de 2026**. Se creó exclusivamente en Docker con RUC ficticio `20000000055`, trabajador ficticio Ana Demostración y las 28 reglas del catálogo. Los plazos son valores de demostración configurables, no un calendario legal. Los archivos siguen pendientes: no se inventaron versiones ni objetos de Storage.

Se conservaron las empresas y pruebas anteriores. Los cuatro perfiles usan sus [accesos privados locales](../.envs/local/accesos-pruebas.md); el fixture mantiene roles y permisos diferentes. El administrador no recibe automáticamente permiso de entrega o revisión por usar esta vista.

| Validación | Evidencia |
|---|---|
| Lógica e interfaz | Suite completa final: **340 pruebas en 50 archivos aprobadas**. El posterior ajuste de cabecera es exclusivamente de presentación y se verificó con lint y build. |
| PostgreSQL | 85 verificaciones TAP en H03 documental, H05 laboral, H08 seguridad y las dos consultas nuevas; transacciones de prueba revertidas. |
| Casos de datos | Mes distinto del vencimiento, semana entre meses, anual con mismo ID, conteo antes de paginar, segunda página, aislamiento por empresa/módulo, consulta de cliente, entradas inválidas, Ingreso/Cese, eventuales y reingreso. |
| Cuatro perfiles | Login y nueva consulta de los tres módulos aprobados en Docker para administrador, contador, supervisor y cliente; sin contraseñas en evidencia pública. |
| Calidad | DB lint sin errores; **tipos, lint, arquitectura, build Yarn y control de bundle aprobados**. El último ajuste de cabecera conserva tipos y se compiló nuevamente con Yarn. |
| Navegación interactiva | Octubre → PDT → segundo archivo → volver conserva mes, tipo, empresa y entregable. Cambio a noviembre vacío sin datos de octubre. |

Capturas verificadas de [Tributario escritorio](hitos/evidencias/capturas/documentos-periodos/tributario-escritorio.png), [Tributario móvil](hitos/evidencias/capturas/documentos-periodos/tributario-movil.png), [Laboral general](hitos/evidencias/capturas/documentos-periodos/laboral-general-escritorio.png) y [Laboral por trabajador](hitos/evidencias/capturas/documentos-periodos/laboral-trabajador-escritorio.png). Estas capturas documentan el recorrido verificado antes del último ajuste de filtros/cabecera. En la revisión móvil de 390 × 844, el expediente pasó de aproximadamente **710 a 543 px** antes del primer archivo; después se integró Volver en la cabecera para eliminar otra fila. El recorrido de Tributario se revisó también a 1440 × 900: primera obligación a unos 373 px en escritorio y 461 px en móvil. No hay desbordamiento horizontal en esas mediciones.

**Límite de verificación visual:** el usuario inició una presentación y pidió mantener el sistema abierto. La comprobación final de la nueva cabecera en navegador y la matriz completa de 375/768/1024 px quedan pendientes de una sesión de revisión que no interrumpa esa presentación; no se declaran aprobadas. La compilación final permanece servida con `yarn start` en el puerto 4001 y respondió HTTP 200. No se ejecutarán más reinicios durante la presentación.

La prueba de esta presentación no equivale al cierre del piloto H08. Continúan separados el aviso previo de seguridad del framework y la limitación del respaldo completo de fixtures antiguos que carecen de objetos reales de Storage, ya registrada en [entorno local](entorno-pruebas-local.md). No se ocultaron alertas ni se fabricaron respaldos exitosos. El build detectó el aviso previo de vulnerabilidad de Next.js 16.4.0, se detuvo para mostrarlo y completó correctamente el reintento permitido; no se cambiaron dependencias ni se desactivaron controles.
