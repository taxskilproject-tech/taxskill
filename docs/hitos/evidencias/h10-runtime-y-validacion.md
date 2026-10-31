# H10 — aislamiento del fallo de acceso y validación del runtime

Fecha: **29/10/2026, America/Lima**. [Hito](../h10-buzon-sunat.md) · [Vercel](h10-vercel-configuracion.md) · [Worker](../../../integrations/sunat/worker/README.md).

## Resultado del segundo piloto autorizado

Se ejecutó exactamente una segunda instancia temporal, con el consentimiento específico del usuario, la imagen de diagnóstico fijada por digest y los mismos accesos cifrados del tercer piloto. [Evidencia sin secretos](h10-vercel-piloto-2.json).

Chromium protegido arrancó con UID 1001. El login no completó: se observó HTTP 302, sin menú ni controles del buzón. El diagnóstico no detectó avisos de credenciales inválidas, CAPTCHA, mantenimiento o denegación. **Su ausencia no demuestra que SUNAT aceptara los accesos ni permite atribuir el fallo a la IP.** No se consultó el buzón en Vercel.

La sesión duró 35.044 ms, con 6.400 ms de CPU activa. Los 2.048 MB son memoria asignada, no un pico medido. Se comprobó independientemente el estado detenido, una única sesión y cero snapshots. Sin rutas públicas, escrituras en Supabase Cloud ni activación diaria. Después de esta prueba se solicitó y obtuvo una autorización separada para la tercera instancia descrita más abajo.

## Comparación controlada en Docker

Se mantuvieron separados los resultados de cada ejecución autorizada. La presentación y su worker simulado continuaron activos.

| Comparación | Base de ejecución | Código | Resultado |
|---|---|---|---|
| Imagen reducida | Ubuntu con componentes seleccionados | Diagnóstico | Reprodujo localmente el fallo de login. |
| Referencia anterior | Imagen oficial completa de Playwright | Anterior | Login e identidad correctos; Notificaciones y PDF disponibles. |
| Prueba cruzada | Imagen oficial completa de Playwright | Exactamente el JavaScript extraído de la imagen de diagnóstico | Login e identidad correctos; mismo resultado documental parcial. |
| Runtime corregido | Imagen oficial completa de Playwright; solo cuatro dependencias Node de ejecución | Código actual, 55 módulos | Login e identidad correctos; Notificaciones, PDF y renovación de sesión comprobados. |

La prueba cruzada muestra una diferencia de comportamiento local asociada a la composición del runtime reducido. **No identifica todavía qué dependencia o configuración del sistema produjo la diferencia**, ni demuestra que corregirla resuelva el acceso remoto. Se retira la recomendación de la variante reducida y se conserva la base oficial del navegador. No se modificaron TLS, sandbox, identidad del navegador ni controles de SUNAT.

El runtime corregido medido localmente tiene ID `sha256:8a1de1b8b6bd3330eba9eebb71fb3a92464026c6f7234a1c66ec2301b3274057`, tamaño **2.571.722.232 bytes** y dependencias Supabase JS, PDF-lib, Playwright Core y Zod. La reconstrucción con el lockfile actualizado produjo exactamente el mismo ID. El registro privado confirmó la etiqueta `h10-supported-20261029`, estado **ready**, manifiesto `sha256:8122542ab101f6895792a2264e5c6304bf859600ac65e4c1f72f130f32976d32` y **976.761.524 bytes almacenados**. [Evidencia](h10-runtime-corregido.json). ID local, manifiesto remoto y tamaños son medidas distintas.

El smoke sin red, con filesystem de solo lectura, capacidades retiradas y UID 1001, verificó las cuatro bibliotecas y la ausencia de archivos privados. `chrome://sandbox` confirmó namespaces, Seccomp-BPF y «adequately sandboxed». La consulta previa `Browser.getBrowserCommandLine` no estaba disponible porque esta versión no activa `--enable-automation`; ese fallo del diagnóstico se conserva y no se añadieron flags para habilitarlo.

## Tercera prueba Vercel: corrección local insuficiente

Tras la autorización específica adicional se creó **una sola tercera instancia**, con el manifiesto corregido `8122542…`, persistencia desactivada, cinco minutos máximos y los mismos accesos cifrados del tercer piloto. [Resultado independiente](h10-vercel-piloto-3.json).

Chromium pasó el preflight, pero el acceso volvió a terminar con `SOURCE_UNAVAILABLE` en `login_submit`: HTTP 302, pantalla clasificada como SOL, sin formulario visible ni menú. No se observaron avisos de credenciales, CAPTCHA o denegación. No se consultó el buzón ni se obtuvo un informe de adjuntos en Vercel. **La imagen corregida funciona localmente, pero no ha resuelto el acceso remoto. La causa remota continúa sin determinarse; no se afirma un bloqueo de IP.**

Duración de la sesión: **38.174 ms**; CPU activa: **10.296 ms**; memoria asignada: **2.048 MB**, sin pico medido. SDK y consultas independientes de MCP confirmaron estado detenido, exactamente una sesión para ese intento, cero snapshots y ninguna ruta pública. Sin escrituras Cloud, cambio de plan, despliegue web ni revisión diaria.

Las tres autorizaciones temporales ya se consumieron. No se creó ni reanudó una cuarta instancia. La diferencia local/remota exige otro diagnóstico del retorno y los recursos del login; repetir sin esa evidencia no demuestra viabilidad. Cualquier siguiente ejecución real necesita alcance y autorización nuevos.

## Resultado real con el runtime corregido

| Bandeja | Octubre de 2026 | Septiembre de 2026 |
|---|---|---|
| Notificaciones | 1 registro; consulta completa | 0 registros; consulta completa |
| Mensajes | Parcial, `PAGE_INCONSISTENT`; 3 registros válidos recuperables | Parcial, `PAGE_INCONSISTENT`; 1 registro válido recuperable |

Se descargó el PDF de referencia, de **87.581 bytes**, con el mismo hash del piloto anterior. Identificadores estables después de renovar la sesión. Esta ejecución no encontró una referencia no leída y **no aporta una nueva demostración del efecto de lectura**; se conserva la evidencia independiente del [piloto anterior](h10-recuperacion-y-vercel.md).

Duración del recorrido: **58.914 ms**; 252 solicitudes. RSS máximo del proceso Node: **167,33 MB**. Memoria máxima del contenedor, incluyendo navegador y display: **430,96 MB**; CPU del contenedor: **24.738,67 ms**. No comparar RSS de Node con consumo total del contenedor.

Los registros recuperables no certifican cobertura mensual, no incrementan páginas aceptadas y no adelantan la última consulta correcta. El informe conserva `query_and_attachment_complete=false` y `source_validated=false`. Las discrepancias de Mensajes previamente contrastadas en SOL siguen abiertas.

## Correcciones del worker y controles de código

- El plazo del trabajo interrumpe la espera aunque el conector no termine su promesa. Un navegador todavía en inicialización puede cerrarse; una inicialización tardía no publica una sesión después del cierre.
- Heartbeat, confirmaciones y limpieza tienen límites explícitos. Los fallos de limpieza se informan; no quedan rechazos de promesas fuera de control ni temporizadores activos.
- Fallar o abandonar un trabajo exige confirmación afirmativa del RPC. Ante pérdida de ambas respuestas se consulta únicamente su ID, estudio y empresa; se conserva el estado terminal existente, incluidos cancelación o éxito ya confirmado en PostgreSQL. Un estado sin resolver produce `WORKER_STATUS_UNAVAILABLE`.
- Las pruebas del bundle aíslan su perfil de build para no heredar accidentalmente el laboratorio H10 ni sus claves. Se verifican `.next`, `.next-h09` y `.next-h10`.

**Validación:** 66 archivos y **452 pruebas aprobadas**, incluyendo 17 comprobaciones de ciclo de vida, estados y plazos. Tipos, lint, arquitectura y control del bundle aprobados. Son pruebas de regresión sintéticas; no sustituyen la conciliación real de SUNAT.

## Actualización de Next.js sin interrumpir la presentación

**Estado posterior:** [informe incremental y recuperación](h10-diagnostico-retorno-sol.md#corrección-y-comprobación-del-informe-incremental). Tras encontrar Docker/servidor detenidos se reabrió 4003 con el build aislado 16.4.3; también quedaron instaladas las dependencias parcheadas y verificado el build/bundle del proyecto principal. La descripción siguiente conserva la primera fase de la actualización.

Se actualizan el manifiesto y lockfile a **Next.js y eslint-config-next 16.4.3**, tras validar en una copia local aislada. La actualización responde al [aviso oficial de seguridad de octubre](https://nextjs.org/blog/nextjs-security-update-october-14-2026); no se desactivó la comprobación de seguridad para compilar. La raíz de Turbopack queda explícita para impedir que un laboratorio anidado resuelva el proyecto padre.

El `yarn build` aislado terminó correctamente, con 22 páginas y Proxy. Se verificó el bundle contra las claves privadas del laboratorio Docker, sin filtraciones. El lockfile solo cambia la familia Next y su selector relacionado de Sharp; conserva las dependencias propias de H10.

El build se abrió separadamente en `127.0.0.2:4004`: login y entrada del buzón respondieron HTTP 200. El 200 de la entrada corresponde a la composición cliente y no acredita autorización. Con contratos válidos y origen local correcto, los endpoints de credenciales y descarga rechazaron solicitudes sin sesión con **401 `UNAUTHENTICATED`** y `Cache-Control: private, no-store`; sin cabecera Origin devolvieron 403. No se crearon conexiones ni se guardaron fixtures mediante esos intentos. El host aislado evita compartir las cookies de la presentación.

**No se reinstalaron las dependencias compartidas ni se reinició 4003**: la presentación conserva su build anterior. El parche validado requiere instalar el lockfile y regenerar el build antes de actualizar ese proceso o un despliegue. No confundir el código preparado con una publicación ya realizada.

## Pendientes para aceptar H10

La [instrumentación posterior del retorno SOL](h10-diagnostico-retorno-sol.md) agrega señales acotadas de redirección, recursos y JavaScript, con 458 pruebas y un fixture Chromium sin red externa. No sustituye los resultados fallidos anteriores ni implica una cuarta ejecución autorizada.

1. Resolver el login en Vercel: la comprobación de la imagen corregida ya se ejecutó y falló; faltan señales del retorno de autenticación que expliquen la diferencia local/remota.
2. Conciliar Mensajes con un origen que entregue todas sus páginas; conservar como parcial cualquier discrepancia.
3. Demostrar consulta diaria incremental y límites con el origen real, sin releer automáticamente todo el historial.
4. Completar la operación permanente, secretos y despliegue autorizados después del piloto.

`SUNAT_SOURCE_VALIDATED=false` y `SUNAT_RUN_DAILY=false` se conservan. H10 permanece abierto; no cierra pendientes de H08 ni autoriza escrituras, fixtures, jobs o migraciones en Cloud.
