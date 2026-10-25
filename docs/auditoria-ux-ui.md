# Auditoría y mejora UX/UI de TaxSkill

Fecha de cierre: 25 de octubre de 2026 · America/Lima. Implementación y comprobaciones exclusivamente locales, con Supabase en Docker. La referencia inicial se capturó el 24 de octubre.

**Actualización posterior autorizada, 25/10:** publicada la única migración SQL pendiente en Cloud. Los detalles y la conservación verificada figuran en la [sección 8](#8-publicación-sql-autorizada). La interfaz no se desplegó en esta operación.

La mejora prioriza trabajo pendiente, lectura de resultados y orientación. Conserva rutas, permisos, revisiones individuales, versiones y reglas documentales. No publica cambios, activa automatizaciones productivas ni envía WhatsApp real.

Referencias: [reglas del proyecto](../.agents/rules.md), [hitos](hitos/README.md), [primera mejora UX](plan-mejoras-ux-ui.md), [acceso a módulos](plan-navegacion-modulos.md), [navegación](flujo-navegacion.md), [entornos](desarrollo.md).

## 1. Decisiones y alcance

**Confirmado por el usuario:** evolución de la interfaz existente; computadora y celular con igual prioridad; incorporar más color; barra lateral azul marino. Esta decisión reciente sustituye la restricción visual anterior de utilizar casi exclusivamente neutros. Atomic Design y Tailwind siguen siendo obligatorios.

**Bases técnicas adoptadas:** barra lateral de 240 px; iconos SVG propios reutilizables; azul para acciones y selección; azul, violeta y cian para módulos; estados con verde, ámbar y rojo, acompañados por texto. No hay una biblioteca visual nueva, CSS adicional ni cambios en dependencias.

**Fuera de esta entrega:** despliegue Cloud/Vercel, automatización productiva, piloto real y actualización de dependencias del framework. El estado operativo de H08 sigue documentado por separado en su evidencia.

## 2. Hallazgos atendidos

| Hallazgo | Solución implementada |
|---|---|
| Cinco títulos de grupo se confundían con enlaces y alargaban la barra lateral. | Solo MÓDULOS permanece como etiqueta estática. Los enlaces tienen iconos, selección azul y separadores entre grupos. La navegación completa cabe a 1366 × 768 para administrador. |
| Tarjetas altas para archivos, reglas, eventos y avisos. | Filas compactas y detalle en un inspector modal. Las acciones y metadatos secundarios conservan su funcionalidad. |
| Actividades desplazaba sus resultados por controles y explicaciones. | Acción de alta más breve, resumen de grupos compacto y explicación dentro de los filtros. |
| En móvil faltaban periodo y avance de las obligaciones. | Ambos aparecen junto a estado y plazo. La empresa se omite en cada fila cuando ya está fijada en el contexto. |
| Barra lateral de escritorio junto con tarjetas móviles a 1024 px. | Las tablas de obligaciones, empresas y reportes utilizan el mismo punto de transición de escritorio. |
| Expediente con selectores y paginaciones apiladas. | Periodo laboral y sección comparten fila; las etapas documentales permanecen diferenciadas. El retorno se integra en la cabecera de escritorio. |
| Buscar un tipo documental requería recorrer páginas de un select. | Búsqueda de tipos dentro del asistente, conservando el tipo elegido aunque ya no pertenezca a la página o búsqueda visible. |
| Falta de búsqueda en catálogo y reglas. | Consulta de servidor con filtros, conteos y paginación sobre el mismo universo autorizado. |
| Gestión de usuario con una columna vacía y conservación junto a acciones frecuentes. | Cuenta en una columna, guardados independientes, nombre “Gestionar usuario” y conservación desplegable. |
| Inicio trataba todas las métricas con igual jerarquía. | Vencidas, próximas, revisión y observaciones primero; indicadores de cumplimiento separados; explicación de cálculo bajo demanda. |
| Transiciones de auditoría y datos técnicos expandían cada fila. | Inspector Antes/Después, etiquetas españolas y códigos originales conservados en el detalle. |
| Seguimiento WhatsApp repetía aclaraciones y códigos de error. | Resumen compacto, explicación común y diagnóstico técnico dentro de cada envío. Recepción de webhook y entrega efectiva siguen diferenciadas. |
| Incidencias sin acceso directo a su pantalla de revisión. | Enlaces a reglas, responsables, documentos o WhatsApp cuando existe un destino útil; sin botones que activen trabajos. |
| Tab podía abandonar el panel hacia el navegador. | Ciclo explícito de Tab/Shift+Tab, respetando el diálogo superior cuando hay paneles anidados. Escape, descarte y devolución de foco se conservan. |

## 3. Contratos y conservación

### Consultas de configuración

Migración local: [20261025002003_ux_catalog_rule_filters.sql](../supabase/migrations/20261025002003_ux_catalog_rule_filters.sql), creada y aplicada mediante Supabase CLI. No añade tablas, endpoints ni escrituras de negocio.

La firma pública `h03_query(uuid, text, jsonb)` y la respuesta `{ ok, data: { rows, count } }` permanecen iguales. La extensión privada atiende `catalog` y `rules`; los demás recursos conservan su implementación anterior. El wrapper público que elimina tokens internos de cargas permanece intacto.

| Entrada opcional | Comportamiento |
|---|---|
| `q` | Texto de hasta 200 caracteres; coincidencia literal sin distinguir mayúsculas. Catálogo: nombre/código. Reglas: título/empresa. |
| `module` | Módulo válido; se combina con los demás filtros. |
| `active` | Booleano para habilitados/activos o pausados/borradores. Omitirlo conserva ambos estados. |
| `company_id` | Se conserva el filtro existente de empresa para reglas. |
| `include_deleted` | Histórico explícito; la consulta operativa sigue excluyendo eliminados y, para reglas, empresas eliminadas. |
| `page` | Páginas de 25; conteo y orden se calculan después de filtrar. |

Se conserva la comprobación administrativa por estudio y la admisión de sesión. No se modifica RLS, Storage, snapshots, auditoría ni reglas históricas. La búsqueda no descarga toda la tabla ni filtra exclusivamente los 25 registros visibles.

Los filtros de catálogo y reglas usan parámetros de presentación separados (`catalogQuery`, `catalogModule`, `catalogActive`, `catalogCompany`, `catalogDeleted`, `catalogPage`, y sus equivalentes `rules…`). Cambiar un filtro reinicia su página. Los valores no utilizados por un recurso no modifican sus contratos de consulta.

### Navegación y formularios

- Las rutas existentes permanecen. `laborView=workers|obligations` selecciona la vista dentro de Laboral por trabajador y está admitido en el retorno validado.
- El selector de periodo laboral limpia filtros y entregable de la selección anterior. Los identificadores de periodos y las etapas documentales mantienen su significado de backend.
- Los borradores y contraseñas siguen en memoria/formulario; no se añaden a URL o almacenamiento persistente.
- El catálogo conserva los datos anteriores durante su cambio de página o búsqueda para evitar desmontar los campos del asistente. El selector queda bloqueado mientras recibe los nuevos resultados.
- Cada archivo de Documentos sigue representando una versión. No se agrupan familias de archivos a partir de páginas parciales.
- El estado mostrado en los metadatos se identifica como estado de la obligación; no se atribuye esa decisión a una versión histórica arbitraria.
- Descargas, vista previa, exportación, guardados y lectura de avisos conservan loading contextual, bloqueo y errores explícitos. La navegación normal no recibe loading artificial.
- En páginas únicas se conserva el conteo y se omiten Anterior/Siguiente. La paginación superior e inferior continúa disponible para listados de varias páginas.

## 4. Distribución y medidas

### Altura de los listados con 25 resultados

| Pantalla | Ancho solicitado | Antes | Después | Reducción |
|---|---:|---:|---:|---:|
| Documentos | 1366 px | 4.892 px | 2.116 px | 56.75 % |
| Reglas | 1366 px | 6.089 px | 2.174 px | 64.30 % |
| Auditoría | 1366 px | 3.391 px | 1.998 px | 41.08 % |
| Notificaciones | 1366 px | 3.915 px | 2.279 px | 41.79 % |
| Documentos | 390 px | 6.403 px | 2.718 px | 57.55 % |
| Reglas | 390 px | 7.393 px | 2.833 px | 61.68 % |
| Auditoría | 390 px | 4.431 px | 2.537 px | 42.74 % |
| Notificaciones | 390 px | 4.742 px | 2.406 px | 49.26 % |

Se supera el objetivo del 40 % en los cuatro listados y en ambas dimensiones. Se mide la altura total del documento, con detalles cerrados; no se usa un contenedor de scroll interior ni se reducen los 25 registros.

Metodología y comparabilidad:

- Documentos y Reglas se capturaron antes de la regresión que incorpora nuevas entregas ficticias: mismo tamaño de página y conteos de 192 versiones/351 reglas.
- Auditoría utiliza `to=2026-10-24` en la comparación final para excluir los eventos posteriores al corte y mantener los 2.706 eventos de referencia.
- La regresión creó avisos adicionales. Para Notificaciones se repitió una comparación controlada: disposición original desde Git y disposición final sobre los mismos 25 IDs, mismo orden y misma cuenta, con 372 avisos totales. Se guardó el hash de identidades y se restauró inmediatamente el código definitivo. Las capturas originales del día 24 también se conservan.
- Los tamaños solicitados son 1366 × 768 y 390 × 844. El motor del navegador informa un píxel adicional de ancho en esas capturas; ocurre igual en ambos lados de la comparación.
- [Medidas y referencias](hitos/evidencias/capturas/auditoria-ux/comparacion-resumen.json), [identidades de Notificaciones](hitos/evidencias/capturas/auditoria-ux/comparacion-notificaciones.json).

### Inicio del primer resultado

| Pantalla | Escritorio 1366 px | Móvil 390 px |
|---|---:|---:|
| Actividades | 396 px | 436 px |
| Reportes | 384 px | 452 px |
| Empresas | 316 px | 312 px |
| Usuarios | 304 px | 340 px |
| Tributario / Laboral general | 276 px | 292 px |
| Laboral por trabajador | 372 px | 435 px |
| Expediente laboral | 393 px | 460 px |
| Documentos | 335 px | 471 px |
| Reglas | 311 px | 495 px |
| Auditoría | 331 px | 395 px |
| Notificaciones | 262 px | 313 px |

Todos quedan antes de 400/520 px en esas dimensiones con filtros avanzados cerrados. Los estados vacíos de Actividades, Documentos y Reportes comienzan entre 307–335 px en escritorio y 407–427 px en móvil; Reportes vacío conserva 768/844 px de altura total.

En 375, 390, 768, 1024 y 1440 px no se observó desbordamiento horizontal. A 1024 px las filas documentales y de reportes ya son tablas. A 768 px y 1024 px algunos grupos pueden ocupar dos líneas; no se aplica a esos tamaños intermedios el umbral específico de escritorio de 1366 px. Ver [matriz principal](hitos/evidencias/capturas/auditoria-ux/matriz-principal.json), [matriz adaptable](hitos/evidencias/capturas/auditoria-ux/matriz-adaptable.json) y [vacíos](hitos/evidencias/capturas/auditoria-ux/estados-vacios.json).

## 5. Accesibilidad e interacción

- Navegación con etiquetas y estado activo, sin depender solo del color.
- Botones con mínimo de 44 px en ambas dimensiones; enlaces operativos y controles táctiles mantienen altura de 44 px.
- Diálogos nativos con título, bloqueo del fondo, Tab/Shift+Tab contenido, Escape y devolución de foco. Comprobado con teclado real del navegador y pruebas automatizadas de apertura, carga bajo demanda, anidación y descarte.
- Formularios que conservan valores al buscar tipos y avanzar/retroceder. El cierre de un borrador exige elegir entre continuar editando o descartar.
- Contraste de los pares de la paleta medido desde los colores OKLCH de Tailwind instalado: texto >= 4,5:1; foco >= 3:1. El par de texto más bajo comprobado es zinc-500/blanco, 4,83:1. [Cálculo de paleta](hitos/evidencias/capturas/auditoria-ux/contraste-paleta.json).
- Esto no constituye una certificación WCAG ni una prueba de uso con lector de pantalla humano. Las evidencias describen los controles efectivamente realizados.

## 6. Validación técnica y funcional

| Comprobación | Resultado |
|---|---|
| TypeScript | Aprobado. |
| ESLint | Aprobado. |
| Arquitectura | Aprobado: tipos separados, componentes <= 170 líneas, sin ciclos, secretos aislados y sin CSS adicional. |
| Pruebas unitarias/integración de UI | 313 pruebas en 48 archivos aprobadas; además, repetición dirigida de 8 casos de paneles/asistentes tras ajustar teclado. |
| SQL local | 74 pruebas TAP aprobadas en H04, H08 y nueva configuración. El caso UX añade 16 aserciones de filtros, paginación, histórico y autorización. Todo dentro de transacciones con rollback. |
| H03 local | 59 comprobaciones: TUS interrumpido/reanudado, aprobación parcial, observación/corrección, reapertura, concurrencia y descarga histórica. |
| H05 local | 177 comprobaciones: tres módulos, reglas y ciclo laboral, incluyendo reingreso. |
| H08 local | 28 comprobaciones API de seguridad, sesión y archivos. |
| H07 local | Volumen, universo de consulta, exportaciones completas Excel/PDF y auditoría aprobados. |
| Build | `yarn build` aprobado; advertencia de seguridad del framework registrada abajo. |
| Bundle | `yarn check:bundle` aprobado: sin claves administrativas/HMAC ni secretos de integración configurados. No se añadieron dependencias. |

Se verificaron administrador, contador, supervisor y cliente con cuentas ficticias de Docker. Contador/supervisor mantienen revisión según capacidades; cliente no ve ese acceso. Los accesos administrativos permanecen restringidos. [Resultado por perfil](hitos/evidencias/capturas/auditoria-ux/perfiles.json).

El retorno manual de una obligación conservó `group`, `q` y `page=2`; la recuperación de posición conserva su prueba automatizada de scroll. [Retorno](hitos/evidencias/capturas/auditoria-ux/retorno-listado.json).

### Rendimiento y aviso del framework

La primera ejecución H07 coincidió con compilaciones y comprobaciones: P95 de dashboard 4.208 ms, reportes 5.307 ms, documentos 2.211 ms y auditoría 168 ms sobre el fixture de capacidad. La repetición de solo lectura, con 20 consultas secuenciales por recurso y sin build simultáneo, registró P95 de 1.679 ms, 1.436 ms, 966 ms y 160 ms, respectivamente: los cuatro quedaron por debajo de dos segundos. Ver [latencia local](hitos/evidencias/capturas/auditoria-ux/latencia-local.json). Es una comprobación en Docker sin carga concurrente, no una garantía productiva ni una optimización SQL atribuible a esta compactación.

Next.js 16.4.0 emitió un aviso de seguridad y detuvo inicialmente el build; el reintento terminó correctamente. La advertencia sigue vigente. La actualización del framework debe tratarse como mantenimiento separado con sus regresiones; no se actualizó una dependencia de forma implícita en este trabajo.

## 7. Capturas y cierre

- [Inicio y barra lateral](hitos/evidencias/capturas/auditoria-ux/inicio-1366.png).
- [Documentos antes](hitos/evidencias/capturas/auditoria-ux/antes-documentos-1366.png) / [después](hitos/evidencias/capturas/auditoria-ux/despues-documentos-1366.png).
- [Reglas antes](hitos/evidencias/capturas/auditoria-ux/antes-configuracion-390.png) / [después](hitos/evidencias/capturas/auditoria-ux/despues-configuracion-390.png).
- [Auditoría antes](hitos/evidencias/capturas/auditoria-ux/antes-auditoria-1366.png) / [después](hitos/evidencias/capturas/auditoria-ux/despues-auditoria-1366.png).
- [Notificaciones antes](hitos/evidencias/capturas/auditoria-ux/antes-notificaciones-390.png) / [después](hitos/evidencias/capturas/auditoria-ux/despues-notificaciones-390.png).
- [Expediente](hitos/evidencias/capturas/auditoria-ux/expediente-1366.png), [usuario escritorio](hitos/evidencias/capturas/auditoria-ux/usuario-panel-1366.png) / [móvil](hitos/evidencias/capturas/auditoria-ux/usuario-panel-390.png).
- [Panel documental móvil](hitos/evidencias/capturas/auditoria-ux/documento-panel-390.png), [módulos móvil](hitos/evidencias/capturas/auditoria-ux/modulos-panel-390.png), [borrador conservado](hitos/evidencias/capturas/auditoria-ux/asistente-conserva-datos-1366.png).

La aplicación queda disponible en `http://127.0.0.1:4001`, con Supabase Docker y sesión administrativa ficticia. La implementación inicial no modificó Cloud. Posteriormente el usuario autorizó publicar las migraciones pendientes, según la sección siguiente; el despliegue de la interfaz y el estado operativo de los hitos permanecen separados.

## 8. Publicación SQL autorizada

El 25/10/2026 el usuario solicitó publicar las migraciones pendientes. Tras renovar su sesión CLI, se comprobó que Cloud `gzwrqvqofcrdjvzoblaz` tenía 71 versiones y solo faltaba `20261025002003_ux_catalog_rule_filters.sql`. El dry-run confirmó exclusivamente ese archivo, sin seeds ni roles. Se ejecutó `supabase db push --linked --skip-vault --yes`.

Verificación posterior:

- **72 migraciones** locales/remotas coinciden; el nuevo dry-run indica `upToDate: true` y ninguna pendiente.
- **13 huellas históricas** calculadas dentro de PostgreSQL coinciden antes y después. Solo se consultaron agregados; no se descargaron filas de negocio.
- Las **29 tablas públicas mantienen RLS** y el hash de las políticas de `public`, `storage` y `realtime` permanece igual.
- El wrapper público `h03_query` conserva su definición; el nuevo delegado privado existe y la función privada mantiene `SECURITY DEFINER`, sin ejecución directa para `anon` ni `authenticated`.
- Los jobs permanecen iguales: únicamente `h03-staging-cleanup` estaba activo. No se activaron generación, WhatsApp ni otros procesos.
- `supabase db lint --linked --schema public,private --level error --fail-on error` terminó sin errores.

No se aplicaron fixtures, catálogo inicial, roles adicionales ni secretos de Vault. No se desplegó la interfaz en Vercel ni se cambió la conexión local de la aplicación. Las pruebas con datos ficticios siguen limitadas a Docker. [Evidencia de publicación y hash del archivo](hitos/evidencias/ux-cloud-20261025.json).
