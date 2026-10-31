# H10 — comparación del acceso público a SUNAT

**Resultado posterior:** el [informe de corrección](h10-correccion-conector.md) demuestra acceso mediante Chromium gráfico estándar, Notificaciones de dos meses y adjunto real. El diagnóstico siguiente conserva los fallos iniciales; no describe el estado actual completo del conector. Mensajes sigue incompleto y H10 abierto.

Fecha: **27/10/2026, America/Lima**. [Hito](../h10-buzon-sunat.md), [implementación local](h10-implementacion.md) y [diseño](../../buzon-sunat-implementacion.md).

## Alcance

El usuario solicitó comparar navegador, Windows y Docker para identificar el rechazo. Se consultó únicamente la página pública `https://centrovirtual.sunat.gob.pe/tramites/buzon-electronico`. No se enviaron RUC, usuario SOL, contraseña ni cookies del navegador al contenedor. No se consultaron buzones, cambiaron permisos, reiniciaron servicios ni modificaron Cloud/Vercel.

## Resultados observados

| Entorno | Resultado | Evidencia |
|---|---|---|
| Chrome de Windows mediante su perfil normal | Página visible y enlace oficial de acceso SOL disponible. | Título «Revisa tu Buzón SOL», encabezado y enlace comprobados en el DOM. No se infiere un código HTTP a partir del DOM. |
| Windows PowerShell, GET normal | **HTTP 403** | `Server: cloudflare`, título «Attention Required!», sin enlace SOL. |
| Node.js de Windows 22.16.0 / OpenSSL 3.0.16 | **HTTP 403** | Misma identificación de Cloudflare y texto de bloqueo explícito. |
| Node.js del contenedor 24.22.1 / OpenSSL 3.5.9 | **HTTP 403** | Mismo resultado, sin enlace SOL y sin credenciales. |
| Chromium 156.0.8078.4 en Docker, configuración del conector | **HTTP 403** | Página de Cloudflare; cero solicitudes de recursos denegadas por el filtro del conector en esta prueba. |
| El mismo Chromium en un contexto estándar nuevo, sin filtro de dominios | **HTTP 403** | Mismo rechazo inicial de Cloudflare. No se desactivó sandbox ni validación TLS. |

Los navegadores Docker utilizaron contextos nuevos, usuario no root y sandbox activo, con 768 MB, 0,75 CPU, 256 procesos y memoria compartida de 256 MB. El contenedor de diagnóstico fue temporal y separado del simulador activo. No se instalaron herramientas de ocultamiento, copiaron perfiles/cookies ni completaron verificaciones.

Las respuestas HTTP de Windows y Docker expusieron direcciones de salida distintas; se compararon mediante huellas privadas, sin publicar direcciones ni cookies. Por ello tampoco se presume que ambos recorran una red idéntica. Esta observación no determina la regla que rechazó cada petición.

## Conclusiones y límites

1. El rechazo observado procede de **la capa de protección Cloudflare de la página informativa**. Ya no es solo una hipótesis basada en el número 403.
2. No es un fallo exclusivo de Docker: también ocurre con clientes HTTP de Windows.
3. El filtro de dominios del conector no explica el rechazo inicial: no bloqueó recursos y el contexto estándar obtuvo la misma respuesta.
4. No se ha identificado la regla exacta. La documentación oficial de [Cloudflare sobre 403](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/4xx-client-error/error-403/) contempla reglas WAF, integridad del navegador y otras protecciones; estas pruebas no distinguen por sí solas IP, sesión/perfil, señales de automatización o una combinación.
5. La etiqueta `VERIFICATION_REQUIRED` del producto agrupa rechazos del origen; **no demuestra que se haya presentado un CAPTCHA**.
6. No se llegó al formulario SOL desde el contenedor. Estos resultados no demuestran que el servicio SOL ni el buzón completo rechacen la integración, ni permiten atribuir este fallo a una clave incorrecta.

## Qué hace falta a continuación

El administrador no necesita cambiar sus claves, instalar herramientas o modificar su red para completar esta comparación. El siguiente paso técnico es revisar un punto de entrada oficial de SOL que no dependa de esta página informativa y comprobarlo sin omitir verificaciones. No se ha implementado ni se presenta como validada esa alternativa.

Si el rechazo también se produce en el canal oficial correspondiente, la regla concreta requiere revisión del titular del sitio/SUNAT mediante sus registros de seguridad y referencias de la solicitud. No intentar rotación de IP, extracción de cookies de Chrome, suplantación de navegador o elusión de CAPTCHA como solución.

Los probes temporales y resultados técnicos permanecen en `test-results/local/h10-network`, ignorado por Git. Solo este informe sin información tributaria se comparte. Esta comparación no completa P01–P08 ni cierra H10.

## Ampliación: entrada oficial SOL — 28/10/2026

Se comprobó el recorrido alternativo que SUNAT publica: [Operaciones en Línea](https://www.sunat.gob.pe/sol.html) → **Mis Trámites y Consultas**. La [orientación oficial de acceso](https://orientacion.sunat.gob.pe/03-acceso-sunat-operaciones-en-linea-sol) describe este recorrido; el [manual oficial](https://orientacion.sunat.gob.pe/sites/default/files/inline-files/10_Manual%20de%20servicios%20Rest.pdf) también identifica la entrada canónica `https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm`.

| Comprobación | Resultado observado |
|---|---|
| Chrome habitual de Windows: página SOL y botón Mis Trámites y Consultas | Abrió el formulario en `api-seguridad.sunat.gob.pe`, con RUC, usuario, contraseña e Iniciar sesión. Sin rellenar ni enviar. No se infiere un estado HTTP del DOM. |
| HTTP de Windows: `www.sunat.gob.pe/sol.html` | **200**, título de Operaciones en Línea y botón oficial presente. |
| Chromium Docker: página SOL | **200** en ambos contextos nuevos, con y sin filtro de dominios. |
| Chromium Docker: pulsar Mis Trámites y Consultas | Navegación a `e-menu.sunat.gob.pe/cl-ti-itmenucabina/MenuInternet.htm` falló con **`net::ERR_EMPTY_RESPONSE`**, tanto con el filtro como sin él. No se recibió un código HTTP del destino. |
| HTTP de Windows y Docker: destino del botón | **301** hacia la entrada canónica `/cl-ti-itmenu/MenuInternet.htm`. Solo se conservaron host y ruta de la redirección. |
| HTTP de Windows y Docker: entrada canónica | **200**, página de inicio OAuth2 de Menú SOL. Una respuesta HTML no demuestra que se haya mostrado el formulario o autenticado una cuenta. |
| Chromium Docker: entrada canónica directa, publicada por SUNAT | **`net::ERR_EMPTY_RESPONSE`**, cero solicitudes denegadas por el filtro. No llegó al formulario. |

Los contenedores fueron temporales y separados del worker, con Chromium 156.0.8078.4 de la imagen oficial Playwright 1.64.1-noble, sandbox/TLS activos, usuario `pwuser`, 768 MB, 0,75 CPU, 256 procesos y 256 MB de memoria compartida. El control sin filtro no cambió el fallo. Los recursos de tipografía y contenido público externo bloqueados en el contexto restringido fueron secundarios; el contexto sin filtro falló igualmente en la navegación a `e-menu`.

**Interpretación:** la dependencia de la página informativa introduce un bloqueo Cloudflare demostrado. Usar el acceso oficial elimina esa dependencia en este diagnóstico, pero todavía no resuelve la navegación de Chromium Docker a `e-menu`. Este segundo fallo no es un 403 observado, un rechazo de contraseña ni una prueba de CAPTCHA. La diferencia entre el transporte HTTP y Chromium está reproducida; su causa concreta sigue sin determinarse.

No se enviaron RUC, usuario, contraseña ni cookies, no se inició sesión, no se descargaron documentos y no se modificó el adaptador productivo. No se copiaron perfiles ni parámetros de sesión de Chrome al contenedor. Se abrió Docker Desktop porque estaba cerrado; no se detuvieron ni resetearon servicios o datos. Las URLs OAuth con sus parámetros no se almacenaron en código ni documentación.

Los resultados privados sin contenido tributario están en `official-windows.json`, `official-sol.json`, `official-entry-http-windows.json`, `official-entry-http-docker.json` y `official-menu.json` dentro del directorio de probes ignorado. La comprobación solicitada queda registrada; **el acceso del conector al buzón y P01–P08 siguen pendientes**. El siguiente paso es diagnosticar la navegación/red del proceso Chromium hacia el acceso oficial, conservando TLS y sandbox, antes de volver a enviar credenciales. El administrador no necesita cambiar la clave SOL como consecuencia de estas pruebas.
