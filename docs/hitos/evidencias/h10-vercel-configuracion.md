# H10 — configuración de Vercel y piloto temporal

Fecha: **29/10/2026, America/Lima**. [Hito H10](../h10-buzon-sunat.md) · [Recuperación y preparación previa](h10-recuperacion-y-vercel.md).

**Último resultado:** se ejecutaron las tres instancias temporales expresamente autorizadas; todas quedaron detenidas, sin snapshots. La tercera usó la base oficial corregida, pero el login remoto tampoco completó. [Segundo piloto](h10-vercel-piloto-2.json), [tercer piloto](h10-vercel-piloto-3.json) y [comparación controlada](h10-runtime-y-validacion.md). La imagen oficial completa sí entra localmente y vuelve a ser la base recomendada; no se atribuye el fallo remoto a una IP sin demostrarlo. Las notas siguientes conservan la cronología.

## Configuración comprobada

Se siguió la [guía oficial de configuración](https://vercel.com/get-started.md), solicitada expresamente por el usuario.

| Elemento | Evidencia obtenida |
|---|---|
| Vercel CLI global | `vercel --version`: **65.8.0**, Node **22.16.0**. |
| Cuenta CLI | `whoami` autenticado; `project inspect` identifica el proyecto existente `taxskill`. |
| Orientación para Codex | El instalador oficial detectó Codex y confirmó `vercel@openai-curated`, ámbito de usuario. No se instaló el paquete alternativo de skills. |
| MCP | Endpoint compartido exacto `https://mcp.vercel.com`; configuración de usuario en `C:\Users\ZeCarlos\.codex\config.toml`, conservando las entradas anteriores. |
| Autenticación MCP | OAuth completado por el usuario. Posteriormente autorizó el equipo; `list_teams` devolvió el equipo correcto y `get_project` confirmó TaxSkill. |
| Consulta documental MCP | `search_vercel_documentation` respondió con documentación de Sandbox y registro de imágenes. |
| Confirmación de cambios | La entrada MCP añadida conserva `default_tools_approval_mode = "prompt"`. |

La conexión de Codex CLI necesitó un override temporal de `service_tier` porque el CLI instalado no reconoce el valor `default` de la configuración general. **No se cambió ese ajuste global** ni el modelo utilizado por esta conversación.

El proceso de instalación solicitó recargar las herramientas; el conector de Vercel quedó disponible y sus lecturas funcionaron en esta conversación. No se reinició Codex ni se interrumpió la presentación para comprobarlo. No se afirma que el comando interactivo `/vercel-plugin:status` se haya ejecutado.

## Imagen privada

Se creó únicamente el repositorio **privado** `taxskill-sunat-worker` dentro del proyecto existente. No se creó ni vinculó otro proyecto y no se modificó el despliegue web.

La primera imagen preparada para el SDK tiene ID `sha256:a7634732d2d0affe5923714e1708326d59f78a5661f6455dbba24cfec1cb633a`; este es un ID local, no el digest del manifiesto remoto. Su smoke sin red confirmó UID **1001**, dependencias Zod/Playwright y ausencia de `/private/pilot.json`, `/app/.envs` y `/app/.env`. Incluye `sudo` para el cambio de usuario que utiliza el SDK; no modifica sudoers ni desactiva el sandbox de Chromium.

La transferencia de esa primera imagen presentó reintentos en sus capas grandes. Tras medir **3.127.852.998 bytes**, se detuvo exclusivamente nuestro proceso de subida, identificado por PID y destino, y se preparó una imagen reducida. No se interpretó una observación agotada como proceso terminado ni se reinició un contenedor.

La imagen reducida tiene ID local `sha256:f35086878bf4d37e34e69e947e7bab31a780a90527bd29fe4be4843e7d9d9aa1` y mide **1.040.709.587 bytes**, aproximadamente **67 % menos**. Conserva el Chromium oficial y las cuatro bibliotecas necesarias. Su prueba Docker sin red, con filesystem de solo lectura y capacidades retiradas, confirmó Chromium **156.0.8078.4**, UID 1001 y sandbox activo. [Evidencia histórica de build y smoke](h10-imagen-runtime.json). Los dos primeros pilotos usaron variantes de esa base reducida; la comparación posterior detectó su regresión de login y retiró su recomendación.

El acceso Docker al registro usa una configuración privada separada dentro de `.envs/local/vercel/`; no reemplaza credenciales de otros proyectos. Un primer intento agotó el plazo de red; el segundo confirmó acceso al registro oficial. La CLI 65.8.0 rechazó `--file` al reenviarlo al comando de build; se usó Docker Buildx directamente, con el mismo Dockerfile, proyecto y configuración privada.

**Subida completada:** Buildx terminó con salida 0. VCR confirmó imagen `linux/amd64`, estado **ready**, manifiesto remoto `sha256:d8c62907985d7b96518073920cd31ee4b77cc469e0fc64834e914eed92dc8061`, tamaño almacenado **414.349.793 bytes**. El piloto fija ese digest y no depende de que cambie una etiqueta. El tamaño del registro y el de la imagen local son medidas distintas.

## Alcance de la autorización

El usuario autorizó inicialmente **una instancia temporal de hasta cinco minutos** y después **una segunda instancia adicional**, cada una en Hobby, sin snapshots ni cambio de plan. Ambas utilizaron exclusivamente el tercer piloto autorizado, sin escrituras en Supabase Cloud. No habilitan revisión diaria, WhatsApp, despliegue de la aplicación o publicación de migraciones. Las dos autorizaciones ya se consumieron.

El ejecutor preparatorio exige autorización privada del piloto y mantiene un marcador de intento para evitar crear otra instancia por un reintento accidental. Antes de transferir credenciales comprobará Chromium con sandbox. Las claves no se incluyen en imagen, argumentos o logs; el archivo efímero de claves se elimina antes de iniciar el conector. La instancia tendrá persistencia desactivada, salida de red limitada a SUNAT y limpieza explícita al terminar.

## Resultado remoto del primer piloto autorizado

[Evidencia resumida sin credenciales ni contenido tributario](h10-vercel-piloto.json).

| Comprobación | Resultado real |
|---|---|
| Imagen privada y arranque Linux | Correctos; imagen fijada por digest. |
| Chromium estándar con sandbox | **Correcto**, preflight de 1.119 ms, UID 1001. |
| Recursos | 1 vCPU, 2.048 MB asignados; **34.147 ms** de sesión y **6.902 ms** de CPU activa. La memoria asignada no es un pico medido. |
| Acceso SUNAT | El formulario oficial se abrió y se enviaron los accesos autorizados. La espera de la salida del login terminó con `SOURCE_UNAVAILABLE`, etapa `login_submit`. |
| Consulta del buzón | **No realizada** en Vercel; no hay un `connector.json` remoto que acredite consultas o adjuntos. |
| Limpieza | Estado **stopped**, persistencia desactivada, ninguna ruta pública; consulta independiente confirmó una sesión y **cero snapshots**. |
| Cloud y automatización | Sin escrituras en Supabase Cloud ni revisión diaria real. |

La evidencia demuestra compatibilidad básica de Chromium con Vercel Sandbox. **No demuestra un bloqueo por IP, credenciales incorrectas o incompatibilidad del buzón**: el registro conservado identifica la fase, pero no permite distinguir esas causas. Después de detener la instancia, tanto MCP como CLI devolvieron HTTP 410 al intentar recuperar sus logs; no se reanudó ni se creó otra para omitir ese límite.

Se mejoró el diagnóstico para conservar clasificación de pantalla, visibilidad del formulario, presencia de controles, avisos de verificación/mantenimiento/denegación y estados HTTP de SOL. Solo produce números, categorías y booleanos: no guarda URL, consultas, texto del portal, RUC ni claves. El resultado se registra antes de detener cualquier prueba futura. **75 pruebas H10, tipos, lint y arquitectura aprobados**; worker compilado con Yarn a **50 módulos**. La imagen con diagnóstico también pasó el smoke protegido sin red. Estas verificaciones corresponden a los cambios del conector; la regresión general de 430 pruebas de la etapa anterior conserva su evidencia independiente.

La versión de diagnóstico está preparada en el mismo registro privado: etiqueta `h10-diagnostics-20261029`, estado **ready**, manifiesto `sha256:1089480d8c619f920f11c7839cbcf115ec68654f052ef8993efd73ec354f96c3`, **414.350.658 bytes** almacenados. Su ID local es `sha256:79c381f921b1c939f136d4cc09c68d0ededd2dd24973810f78ac7e2996aced5a`, **1.040.712.748 bytes**. Prepararla no ejecuta un segundo piloto.

Antes de recibir la segunda autorización, el ejecutor rechazó el intento con `SECOND_PILOT_USER_AUTHORIZATION_REQUIRED`, sin crear una instancia. Después de la respuesta afirmativa del usuario se ejecutó una sola segunda sesión: **35.044 ms**, **6.400 ms de CPU**, 1 vCPU y 2.048 MB asignados. Chromium pasó el preflight, pero el login terminó incompleto con HTTP 302 y sin menú; no hubo consulta del buzón. SDK y MCP confirmaron estado detenido, una sesión y cero snapshots. [Diagnóstico resumido](h10-vercel-piloto-2.json).

La comparación posterior en Docker aisló la regresión en la base reducida, sin identificar la dependencia de sistema concreta. Se volvió a la base oficial completa, que sí completó localmente acceso, Notificaciones y PDF. **Otra prueba remota requiere autorización nueva**; no se ha demostrado todavía el login en Vercel con la corrección. H10 continúa abierto también por la integridad de Mensajes y la revisión diaria incremental real.

## Imagen corregida disponible

La reconstrucción que conserva la base oficial de Playwright terminó con Yarn y 55 módulos propios. La subida privada finalizó con salida 0; VCR confirmó `h10-supported-20261029`, estado **ready**, manifiesto `sha256:8122542ab101f6895792a2264e5c6304bf859600ac65e4c1f72f130f32976d32` y **976.761.524 bytes** almacenados. [Validación local y aislamiento del fallo](h10-runtime-y-validacion.md), [metadatos y smoke](h10-runtime-corregido.json).

El usuario autorizó después una tercera y única instancia temporal con esta corrección, bajo los mismos límites de cinco minutos, acceso del tercer piloto, persistencia desactivada, sin snapshots ni escrituras Cloud. Se ejecutó y quedó detenida después de **38.174 ms**, con **10.296 ms de CPU activa**, sin completar el login. MCP confirmó una sola sesión y cero snapshots. [Resultado](h10-vercel-piloto-3.json). La corrección local no resuelve todavía el acceso desde Vercel; no se habilita ejecución permanente.

## Presentación local conservada

Al retomar, Docker Desktop y el servidor estaban detenidos. Se abrió Docker, se conservaron sus contenedores y volúmenes y se arrancaron el simulador H10 existente y el build de presentación. `http://127.0.0.1:4003/login` respondió **HTTP 200** y `taxskill-h10-worker` apareció activo. Continúa siendo un entorno Docker con proveedor simulado; no se sustituyó por el conector real.
