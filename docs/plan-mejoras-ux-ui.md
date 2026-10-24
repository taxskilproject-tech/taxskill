# Mejora UX/UI de TaxSkill

Fecha: 24 de octubre de 2026, America/Lima. Alcance: presentación, orientación y navegación de H01–H08. Computadora y celular tienen igual prioridad. Referencias: [reglas](../.agents/rules.md), [hitos](hitos/README.md), [navegación](flujo-navegacion.md), [entornos](desarrollo.md).

## Diagnóstico comprobado

Los listados mezclaban filtros, indicadores, acciones y formularios abiertos dentro de la misma página. El detalle de usuario aparecía después del listado. En empresa se repetían indicadores y configuración debajo de cada área. Expediente, revisión y configuración acumulaban formularios y datos secundarios.

La compilación anterior, conectada a Docker, permitió medir `/reportes?q=ux-empty-no-results-20261024` con la misma cuenta ficticia utilizada después. La consulta vacía no crea registros ni altera los filtros del backend.

| Vista solicitada | Altura anterior | Título anterior | Resultado vacío anterior |
|---|---:|---:|---:|
| 1366 × 768 | 1.630 px | 165 px | 1.362 px |
| 390 × 844 | 2.930 px | 448 px | 2.610 px |

El navegador informa un píxel adicional de ancho interior en ambas medidas; la comparación usa las mismas dimensiones solicitadas. [Antes escritorio](hitos/evidencias/capturas/ux-ui/antes-reportes-1366.png) · [Antes móvil](hitos/evidencias/capturas/ux-ui/antes-reportes-390.png).

## Patrones y decisiones

- Barra lateral persistente y agrupada en escritorio. Cabecera móvil breve, contexto de empresa y navegación inferior Inicio, Actividades, Empresas, Más. Cuenta y avisos permanecen en cabecera.
- Listados con filas compactas; las tablas se adaptan a filas resumidas en dispositivos pequeños. Paginación existente de 25, con controles antes y después de resultados.
- Búsqueda visible, opciones secundarias plegadas y número de filtros activos. No se agrupan ni suman indicadores de unidades diferentes.
- Formularios en panel lateral o pantalla completa móvil, con diálogo nativo, foco contenido, cierre por Escape y aviso de cambios sin guardar. Las acciones asíncronas conservan su loading y protección contra doble ejecución.
- Reglas y actividades adicionales: cuatro pasos. Los campos de todos los pasos permanecen en memoria/DOM; un único envío final conserva los contratos existentes. La validación final revisa también campos ocultos y dirige al paso/archivo incorrecto.
- Tamaños presentados en MB decimales; el formulario sigue enviando bytes enteros. No se cambia el límite ni los snapshots históricos.
- Navegación y filtros se conservan en URL. Solo se guarda la posición de scroll en memoria, separada por usuario, estudio y empresa. No se guardan credenciales ni borradores en URL o almacenamiento persistente.

## Aplicación por módulo

| Módulo | Cambio |
|---|---|
| Acceso | Jerarquía accesible de títulos e ingreso adaptado al teclado móvil; sin cambios de Auth. |
| Inicio | Composición propia con accesos al trabajo y métricas compactas; filtros y desglose ampliables. Los indicadores mantienen sus intersecciones y consulta de obligaciones. |
| Actividades | Grupos cerca de los resultados, indicadores secundarios, filtros plegados, creación en panel y filas compactas. |
| Obligación | Un entregable seleccionado; Entrega, Revisión e Historial. Distribución en columnas en escritorio, motivo/plazo al preparar observación o reapertura. |
| Empresas | Filas compactas, formularios en panel y acciones de conservación secundarias. |
| Ficha de empresa | Pestañas antes del contenido, resumen exclusivo de su sección y responsables en Administración. |
| Áreas documentales | Mismo motor/listado de obligaciones; sin rutas nuevas por área. |
| Trabajadores | Listado compacto; secciones Documentos, Ficha laboral, Eventos. Formularios de ingreso/corrección/cese/reingreso en panel. |
| Documentos | Resultados antes de metadatos secundarios; visor independiente del listado. |
| Reportes | Consulta y resultados primero; exportación controlada, indicadores/desglose secundarios y filas móviles. Estados, áreas y periodos se presentan con etiquetas legibles, sin mostrar claves UUID de periodos únicos en la fila. |
| Auditoría | Acción y actor legibles; identificadores y transición al ampliar un evento. |
| Notificaciones | Bandeja Todas/Sin leer; marcar como leído sigue siendo una acción independiente. |
| Usuarios | Panel Cuenta, Accesos y Contacto; no se apilan todas las gestiones debajo del listado. |
| Catálogo/reglas | Edición independiente, asistentes y selección de un archivo requerido a la vez. |
| Roles/responsables | Permisos por módulo, selecciones conservadas, selector de empresa y acceso a responsables. |
| Parámetros/historial | Secciones separadas; conservación del estudio identificada como acción secundaria. |
| WhatsApp/Operación | Resúmenes y contactos separados, intentos bajo demanda; incidencias operativas visibles antes de métricas. |

## Compatibilidad y límites

Se conservan las rutas, RPC, operaciones, idempotencia, autorización, aprobación individual, concurrencia y políticas de conservación. Los parámetros adicionales de presentación son `view`, `memberId`, `deliverableId`, filtros/página de trabajadores y obligaciones, y consulta histórica de directorios. `tab=administracion` selecciona configuración de empresa y `tab=historial` restaura registros en Configuración. Los validadores de retorno admiten esos parámetros y conservan `indicators`; el backend sigue siendo la autoridad sobre cada recurso.

No hay migraciones, nuevos endpoints, dependencias de interfaz ni cambios de jobs, Auth, webhook, mensajes o Cloud. Todos los fixtures y regresiones de datos se ejecutan únicamente en Docker. Se conserva la modificación preexistente de `revalidacion-base-h08.md`.

## Validación y aceptación

### Medidas antes y después

| Reportes vacío | Antes | Después | Reducción |
|---|---:|---:|---:|
| Altura total · 1366 × 768 | 1.630 px | 768 px | 52,9 % |
| Altura total · 390 × 844 | 2.930 px | 844 px | 71,2 % |
| Título · escritorio / móvil | 165 / 448 px | 77 / 125 px | — |
| Mensaje vacío · escritorio / móvil | 1.362 / 2.610 px | 384 / 484 px | — |

La reducción supera el 40 % en ambos dispositivos. Las alturas corresponden al documento completo, incluyendo la navegación. [Después escritorio](hitos/evidencias/capturas/ux-ui/despues-reportes-1366.png) · [Después móvil](hitos/evidencias/capturas/ux-ui/despues-reportes-390.png).

| Primer resultado o estado vacío | Escritorio | Móvil | Criterio <400 / <520 px |
|---|---:|---:|---|
| Reportes vacío | 384 | 484 | Cumple |
| Actividades vacío | 391 | 463 | Cumple |
| Empresas | 352 | 348 | Cumple |
| Documentos vacío | 392 | 492 | Cumple |
| Auditoría | 367 | 431 | Cumple |
| Notificaciones | 306 | 357 | Cumple |
| Usuarios | 312 | 348 | Cumple |

Mediciones con administrador de demostración, misma compilación local, filtros avanzados cerrados y contexto Todas mis empresas. Se mide la primera fila visible o el mensaje vacío, no títulos ocultos de secciones secundarias. Para Actividades se redujeron separaciones tras detectar inicialmente 419 px en escritorio; los controles conservan su tamaño táctil. [Actividades escritorio](hitos/evidencias/capturas/ux-ui/actividades-1366.png) · [Actividades móvil](hitos/evidencias/capturas/ux-ui/actividades-390.png). Datos: [mediciones de listados](hitos/evidencias/capturas/ux-ui/mediciones-listados.json) y [matriz adaptable](hitos/evidencias/capturas/ux-ui/matriz-responsiva.json).

### Recorridos interactivos en Docker

- Administrador: creación de actividad mediante cuatro pasos y dos archivos requeridos; datos conservados al volver, panel de usuarios independiente de su página del listado, Cuenta/Accesos/Contacto y aviso de borrador al cerrar. No se crearon cuentas reales.
- Cliente: entrega de ambos PDF sintéticos, progreso y controles bloqueados durante transferencia; estado Por revisar sin declarar cumplimiento antes de aprobación. El perfil no ofrece revisión.
- Contador: aprobación individual; avance 1/2 y segundo archivo todavía pendiente de decisión.
- Supervisor: observación con motivo y nuevo plazo 2026-11-02, corrección por cliente, aprobación 2/2 y reapertura del primer archivo con plazo 2026-11-03. El historial conserva tres versiones, observación, ambas aprobaciones y reapertura.
- Asistentes: regla sin guardar conserva título al retroceder; cierre con Escape/Cancelar exige descartar cambios. La selección de un permiso tributario permanece al cambiar de módulo y volver, sin guardar ni ampliar accesos.
- Expediente: dos etapas cesadas conservadas, Ficha laboral separada, panel de reingreso sin escribir cambios y recorrido de Tab/Escape dentro del diálogo.
- Retorno: Actividades → detalle → Volver conserva `/actividades?group=all` y exactamente 1.409,26 px de scroll. Se corrigieron la reconstrucción de defaults y el scroll tardío de Next que podía sobrescribir la posición saliente. Los enlaces de regreso no fuerzan desplazamiento automático.
- Filtro laboral: cambiar búsqueda desde página 2 conserva `workerQuery=Revisión interfaz` y elimina `workerPage` en una única navegación, sin sobrescribir la búsqueda.
- Conservación y pausas: confirmaciones en panel, sin expandir formularios dentro de filas. Abrir la confirmación de empresa conserva la altura total de 1.255 px y la altura de fila de 214,68 px; no se confirmó ninguna eliminación. La confirmación dentro de Usuarios mantiene el fondo bloqueado al cerrarse y deja abierto el panel de usuario. Membresía y perfil tienen acciones diferenciadas.
- Exportaciones: Excel y PDF descargados desde el resultado filtrado de una obligación. El XLSX contiene el título esperado y dos hojas; el PDF es válido y tiene una página. No se exportaron datos reales.

Evidencias: [usuario móvil](hitos/evidencias/capturas/ux-ui/usuario-panel-390.png), [asistente de regla](hitos/evidencias/capturas/ux-ui/regla-asistente-390.png), [historial documental](hitos/evidencias/capturas/ux-ui/historial-documental-390.png), [panel de reingreso](hitos/evidencias/capturas/ux-ui/reingreso-panel-1440.png).

### Verificaciones técnicas

| Ejecución | Resultado |
|---|---|
| `yarn verify --maxWorkers=1` | Tipos, lint, arquitectura y 297 pruebas / 43 archivos aprobados. |
| Regresiones UX específicas | 11 pruebas aprobadas: pasos, validación oculta, tamaños, borradores, cierre ocupado, paneles anidados, retorno, paginación y scroll de navegación. |
| Regresión final de Reportes | 39 pruebas / 4 archivos aprobados después del ajuste de etiquetas; build, lint y bundle comprobados de nuevo. |
| H05 live local | 168 comprobaciones aprobadas, incluyendo los recorridos documentales heredados y gestión laboral. |
| H06 live local | 214 comprobaciones aprobadas: transporte simulado, reintentos, duplicados, callbacks y Cron local. |
| H08 live local | 28 comprobaciones aprobadas de seguridad y contratos. |
| `yarn build` | Compilación de producción aprobada; 19 entradas y Proxy. |
| `yarn check:bundle` | Sin secretos administrativos configurados en los paquetes del navegador. |
| `git diff --check` | Sin errores de whitespace. |
| Enlaces de documentación | 70 destinos locales en los tres Markdown afectados, sin archivos ausentes. No incluye anclas ni enlaces externos. |

No se añadieron dependencias. Los 45 chunks JavaScript de la compilación final suman aproximadamente 2,63 MB sin comprimir para el conjunto de rutas; esta suma no representa la descarga inicial de una página y no se presenta como comparación con una compilación anterior.

Los logs y mediciones sin credenciales se conservan localmente bajo `test-results/ux-ui/`, carpeta ignorada. La suite H06 necesitó adaptar su preparación al barrido paginado: las pruebas de transporte avanzan páginas acotadas antes de inyectar fallos; el caso Cron sigue preparándose mediante Cron real y admite hasta 180 segundos. Los primeros intentos fallaron por espera/paginación y actores acumulados de días anteriores. Se aislaron temporalmente 56 contactos y membresías ficticios H06 del estudio de demostración y se restauraron los 56 después del resultado aprobado; no se borraron fixtures ni se tocó el estudio de capacidad. Esto no modifica la aplicación ni la programación productiva.

El build emite un aviso de vulnerabilidad conocida de la versión instalada de Next.js. El primer intento puede detenerse en el recordatorio; repetir el mismo comando completó la compilación. No se actualizaron dependencias ni se atribuye un CVE concreto a partir de ese aviso. La actualización y su verificación de seguridad quedan como trabajo separado; esta evidencia no acredita su resolución.

### Accesibilidad y límites de la revisión

Se revisaron 375, 390, 768, 1024 y 1440 px; Reportes, Actividades y Configuración no presentan desbordamiento horizontal tras estabilizar el viewport. Se comprobó un `h1` por pantalla, etiquetas, navegación secundaria, foco inicial dentro del diálogo, Tab, Escape, bloqueo del fondo y devolución de foco al disparador. Las tablas de escritorio conservan `caption`, `th` y `scope` siguiendo la [guía W3C de tablas](https://www.w3.org/WAI/tutorials/tables/); los paneles usan diálogo modal nativo y el [patrón de diálogo W3C](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

La inspección del árbol accesible y del teclado no sustituye una sesión real con NVDA/VoiceOver. El navegador integrado no aplicó zoom real con los atajos probados; queda pendiente comprobar manualmente 200 % y lectura asistida en un navegador de escritorio/dispositivo real. No se declara una certificación WCAG ni aceptación formal de usuarios.

La [captura final con resultados](hitos/evidencias/capturas/ux-ui/reportes-resultado-1366.png) muestra el reporte de la actividad ficticia usada en el recorrido. La aplicación queda disponible en `http://127.0.0.1:4001`, con el administrador de demostración y el contexto Todas mis empresas. No se publicaron estos cambios ni se crearon commits durante esta entrega.

La aceptación se limita a esta mejora de interfaz; no declara cerrado el piloto ni los pendientes operativos de H08.
