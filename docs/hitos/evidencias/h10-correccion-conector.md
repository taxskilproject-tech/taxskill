# H10 — corrección del conector y contraste directo en SOL

Fecha: **28/10/2026, America/Lima**. [Hito](../h10-buzon-sunat.md) · [Implementación](../../buzon-sunat-implementacion.md) · [Comparación previa](h10-comparacion-acceso.md) · [Resultado del worker](h10-conector-docker.json) · [Ejecución Docker](../../../integrations/sunat/worker/README.md).

## Resultado y alcance

El bloqueo de acceso del prototipo se corrigió. El conector propio pudo iniciar sesión, abrir el buzón correcto, consultar Notificaciones de octubre y septiembre, descargar el PDF de referencia y renovar su sesión. **Esto no completa H10:** Mensajes devuelve cantidades inconsistentes desde SUNAT y no se ha aprobado la revisión diaria incremental ni la operación productiva.

Solo se utilizó la segunda empresa autorizada. Credenciales, documentos y observaciones detalladas permanecen en archivos privados ignorados; este informe no contiene RUC, nombres, asuntos, usuarios, cookies o URLs autenticadas. No se modificó Cloud/Vercel ni se activaron jobs o WhatsApp. El simulador y la presentación local se conservaron.

## Correcciones implementadas

1. **Entrada oficial:** utilizar `https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm`; seguir la redirección generada por SUNAT. Se elimina la dependencia de la página informativa que devolvía Cloudflare 403. No se fija `state`, copia una sesión de Chrome ni construye una URL autenticada estática.
2. **Navegador:** Chromium estándar en modo gráfico sobre Xvfb, con sandbox y TLS activos. El mismo acceso falló en modo headless con `ERR_EMPTY_RESPONSE`; funcionó en modo gráfico sin cambiar User-Agent, señales de automatización, red o certificados. El control HTTP/1.1 no resolvió el fallo y no se incorporó al producto. La prueba no identifica una regla de seguridad interna de SUNAT.
3. **Sesión y apertura:** reconocer Salir como enlace o botón, abrir Buzón y localizar su documento aunque esté en un iframe anidado o en otra ventana del mismo contexto. La identidad exige coincidencia exacta con el RUC que el documento autenticado devuelve en `meta-token`; no basta encontrar un número en texto o URL.
4. **Listado:** leer la respuesta estructurada que utiliza el propio portal, con la sesión aislada y su cabecera `X-Ruc`. Se validan esquema, tipo de bandeja, IDs, fechas, rangos, totales y conteos. Los códigos observados son `2` para Notificaciones y `1` para Mensajes. El campo `page` puede ser nulo: en ese caso se deriva del rango devuelto y el motor comprueba su correspondencia con la página solicitada.
5. **Fechas y estado:** usar `fecPublica`, `indEstado` y `cantidadArchAdj`, evitando extraer la fecha del asunto concatenado o asumir que todos los mensajes tienen archivos.
6. **Detalle y adjuntos:** seleccionar la bandeja sin recargarla de nuevo —la recarga volvía al estado inicial— y recuperar únicamente el contenido del mensaje seleccionado. La descarga exige un enlace observado, identidad correcta, destino coincidente, tamaño máximo y firma binaria admitida. Se elimina el archivo temporal al terminar o fallar.
7. **Errores y evaluación:** no convertir discrepancias en meses vacíos ni completos; conservar la última información válida. El piloto devuelve salida `2` si las consultas o el adjunto quedan incompletos. Los logs excluyen valores privados y la cancelación normal de una navegación por descarga no se registra como fallo de acceso.

## Evidencia real

| Comprobación | Resultado |
|---|---|
| Login y RUC | Sesión abierta por el conector; identidad exacta comprobada antes de leer datos. |
| Notificaciones octubre 2026 | **7** registros del mes; recorrido completo de las **8** páginas informadas por el origen. |
| Notificaciones septiembre 2026 | **4** registros del mes; recorrido completo de las **8** páginas. |
| Mensajes | Primera página: **24 filas**, rango **1–25 de 40**. Segunda página: **0 filas**, rango **26–40 de 40**. Consulta marcada `PAGE_INCONSISTENT`. |
| Adjunto | PDF de **88.793 bytes**; el SHA-256 coincide con la referencia privada del piloto manual anterior. |
| Identificadores | Huella de IDs/fechas estable en consultas consecutivas y después de renovar la sesión. |
| Renovación | Nuevo contexto y login correctos, con los mismos IDs. No se prueban contraseñas incorrectas contra la cuenta real. |
| Lectura | No había una referencia sin leer en los meses autorizados para repetir el cambio. Se registra `NO_UNREAD_REFERENCE`; no se fuerza el estado ni se presenta como prueba aprobada. |

El último informe JSON contiene los tiempos y métricas realmente obtenidos. `max_rss_mb` y `cpu_ms` corresponden al proceso Node. Las métricas bajo `container` corresponden al contenedor completo cuando el kernel las expone; un valor nulo significa no medido, nunca cero. Los límites utilizados fueron 768 MB, 0,75 CPU, 256 procesos, 256 MB de memoria compartida y 250 segundos para el contenedor.

## Contraste solicitado en Mis Trámites y Consultas

La última ejecución duró **37.545 ms**, con **255 solicitudes** en el recorrido completo de pruebas, **422,625 MB** de pico del contenedor y **14.071,7324 ms** de CPU acumulada del contenedor. Incluye dos accesos, consultas repetidas de ID, los dos meses, un adjunto y renovación; no representa el coste de una única consulta mensual ni demuestra operación diaria permanente.

El usuario solicitó comprobarlo directamente en **Consulta SOL**. Se ingresó por la página oficial, se abrió Mis Trámites y Consultas y después Buzón Electrónico → Mensajes en Chrome habitual. La interfaz mostró **1–25 de 40 con 24 filas** y **26–40 de 40 con cero filas**. Coincide con las respuestas autenticadas del worker; la discrepancia no aparece únicamente en TaxSkill.

La revisión automática agotó su cuota al preparar una captura recortada, por lo que esa acción no se ejecutó entonces. Después de restablecerse, la lectura del rango y las cero filas volvió a funcionar; la captura falló por timeout del navegador y no se guardó una imagen. La observación del DOM y los conteos anteriores sí se completaron. No se sustituye esta evidencia por una captura recreada ni por datos ficticios.

## Validación del código

- Regresión general: **57 archivos y 397 pruebas aprobadas**. Incluye contratos del origen, página nula, vacío coherente, IDs con ceros iniciales, identidad equivocada, archivos y discrepancias de paginación.
- Ajuste posterior del vencimiento técnico: **2 pruebas adicionales del flujo del worker aprobadas**, con reloj controlado y transporte simulado, sin solicitudes de red. Un trabajo que excede el tiempo conserva `WORKER_TIMEOUT`; una revocación real del heartbeat conserva `ACCESS_REVOKED`. No se confunden ambas causas.
- Tipos, lint del proyecto, lint de los archivos posteriores y arquitectura aprobados. `yarn h10:worker:build` prepara **41 módulos propios**. Las respuestas de tamaño excesivo usan `FILE_TOO_LARGE` explícito.
- Esta corrección cambia el worker y sus pruebas; no cambia frontend, esquema, endpoints o contratos de Supabase. Se conserva el build web de la presentación. La compilación web anterior y las 20 comprobaciones Docker de persistencia siguen como evidencia separada, sin atribuirlas a una nueva ejecución.
- Presentación **4003 responde HTTP 200** y el worker local de simulación continúa activo. No se reiniciaron ni pausaron para estas pruebas del conector.

## Pendientes de aceptación del origen

- **P02/P06:** reconciliar Mensajes. Se necesita una respuesta consistente de SUNAT o una referencia autorizada adicional para contrastar el comportamiento; no inventar los 16 registros faltantes, reducir el total a 24 ni ocultar la bandeja.
- **P05/P07:** la renovación y el consumo local no prueban por sí solos expiración prolongada, disponibilidad continua ni capacidad del servidor definitivo. Los fallos sintéticos siguen separados de las observaciones reales.
- **P08:** confirmar el efecto del conector con un registro sin leer autorizado; se conserva la aceptación del usuario y la observación manual anterior del cambio de lectura.
- **Consulta diaria:** el orden del origen continúa `unverified`, por lo que esta versión recorre las páginas con límites. Falta demostrar una estrategia incremental que no certifique ausencia de novedades a partir de una página supuesta ordenada. No habilitar el cron real para simular esa demostración.
- **Producción:** revisión de capacidad, secretos, seguridad del framework, publicación y activación permanecen separadas. `SUNAT_SOURCE_VALIDATED` sigue desactivado.

El acceso y el recorrido positivo de Notificaciones están demostrados; **no se declara la funcionalidad al 100 % ni H10 cerrado mientras falten estas condiciones**.
