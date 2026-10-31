# H10 — evidencia de implementación local

Fecha: **27/10/2026**. [Hito](../h10-buzon-sunat.md) · [Implementación y operación](../../buzon-sunat-implementacion.md) · [Piloto anterior](h10.md).

## Separación de evidencias

**Estado posterior del conector (28/10/2026):** el bloqueo de acceso está corregido; login, identidad, dos meses de Notificaciones, PDF e IDs estables tras renovar sesión se demostraron realmente. Mensajes conserva el error de integridad reproducido en SOL. Ver [corrección completa](h10-correccion-conector.md) y [resultado del worker](h10-conector-docker.json). Las notas siguientes sobre 403 y 384 pruebas son evidencias históricas, no el estado más reciente del adaptador.

**Comparación posterior solicitada por el usuario:** [Chrome, Windows y Docker](h10-comparacion-acceso.md) identifica una página de bloqueo Cloudflare en la entrada informativa, reproducible también con HTTP en Windows. El perfil normal de Chrome sí la muestra. La regla concreta y el acceso del conector a SOL siguen pendientes; no se enviaron claves durante esta comparación.

**Comprobación del 28/10/2026:** la entrada oficial SOL respondió 200 desde Windows y Docker, y Chrome habitual mostró el formulario. La navegación de Chromium Docker al Menú SOL falló con `net::ERR_EMPTY_RESPONSE`, también sin filtro y usando la entrada canónica publicada. HTTP de Windows/Docker obtuvo 301→200 en esas entradas. Se distinguen este fallo de navegación y el 403 de la página informativa; no se enviaron credenciales ni se valida el piloto por haber recibido HTML. Ver matriz y límites en la comparación enlazada.

- **Navegador autorizado anterior:** acceso SOL, un PDF e IDs repetibles; incongruencia de páginas de Mensajes sin resolver.
- **Conector propio autorizado:** Chromium oficial 1.64.1-noble, usuario `pwuser`, sandbox activo, memoria 768 MB, CPU 0,75, 256 procesos y /dev/shm 256 MB. El arranque del sandbox pasó. La entrada pública respondió HTTP 403; el conector informó `VERIFICATION_REQUIRED` y cerró antes de enviar las claves. No se eludió el bloqueo. No se certificó ningún mes real ni se activó el servicio productivo.
- **Aplicación sintética:** Supabase Docker 54431 y Next 4003; datos ficticios, claves cifradas y archivos generados localmente. Sin Cloud, Vercel, WhatsApp ni cron real.

Los resultados del piloto, claves y referencias tributarias permanecen en rutas privadas ignoradas. No se guardaron URLs autenticadas en código. Una propuesta de fijar el enlace con parámetro `state` fue rechazada automáticamente y no se aplicó; se conservó el descubrimiento dinámico desde la página pública.

## Comprobaciones ejecutadas

| Verificación | Resultado |
|---|---|
| `yarn test --maxWorkers=1 --no-file-parallelism` | **55 archivos, 384 pruebas satisfactorias**. Incluye ocho pruebas H10 nuevas de cifrado/AAD/rotación, permisos, navegación, archivos y guardas del simulador, además de las 16 del evaluador anterior. |
| `yarn h10:app verify` | **20 escenarios Docker satisfactorios**; [reporte compartido sin datos tributarios](h10-aplicacion-docker.json) y original local `test-results/local/h10-live.json`. |
| SQL lint público/privado del laboratorio | Sin errores después de las diez migraciones H10. |
| Tipos y compilación | Tipos comprobados durante `yarn h10:app build`; consultar observación del framework debajo. |
| Arquitectura | Tipos separados, componentes ≤170 líneas, Tailwind, sin ciclos y secretos aislados. |
| Bundle | Sin clave administrativa, HMAC ni keyring configurados en el bundle H10; incluye inspección de cada clave de cifrado. |

Los 20 escenarios cubren origen ajeno rechazado, guardado cifrado/reintento, verificación, concurrencia, exclusión de workers, integridad de dos bandejas, checkpoints, paginación, PDF privado, Storage directo, revisión diaria ficticia, meses parciales, continuación, acceso por perfil, empresa ajena, sesiones revocadas, revocación de permisos con trabajo reclamado y desconexión/reconexión con historia conservada.

El simulador continuo quedó configurado con revisión diaria **desactivada**. Su consumo en reposo observado fue aproximadamente **83 MB y 0 % CPU**, dentro del límite local de 384 MB/0,5 CPU. Esta medición no corresponde al navegador real de SUNAT ni permite dimensionar producción.

## Advertencia del framework

La compilación inicial terminó satisfactoriamente con una advertencia de vulnerabilidad conocida en Next.js 16.4.0. Una compilación posterior terminó compilación, tipos y páginas, pero el mecanismo de recomendación de actualización de Next detuvo el comando con `SecurityFatalError`. Repetir el mismo comando permitió terminar con código 0, sin desactivar comprobaciones ni modificar el framework. Esta advertencia puede volver a interrumpir compilaciones posteriores. La actualización de seguridad requiere revisión independiente antes de publicación; no describir el despliegue como listo.

## Revisión visual y de interacción

Con datos ficticios se revisó la bandeja en escritorio, celular y tableta (375, 390, 768, 1024 y aproximadamente 1366 px), sin desbordamiento horizontal. El primer resultado se acercó de unos **517 a 369 px** en escritorio al colocar periodo, filtros y consulta en una sola barra. En celular de aproximadamente 390 px comenzó a **463 px**. Las medidas se tomaron con los filtros secundarios cerrados y el servicio local disponible.

El panel de conexión muestra usuario y clave vacíos aunque exista conexión y advierte el efecto de lectura en SUNAT. Tab/Shift+Tab quedan contenidos; Escape cierra y devuelve el foco al control de apertura. Se observó **Recuperando mensaje y adjuntos…** y **Preparando y descargando…**, ambos deshabilitados durante la operación. El detalle terminó con su archivo disponible y la descarga dejó el control habilitado, sin error. Se mantienen el periodo y el contexto al cerrar.

- [Bandeja de escritorio](capturas/h10/buzon-local-escritorio.png).
- [Bandeja móvil](capturas/h10/buzon-local-movil.png).
- [Detalle móvil](capturas/h10/detalle-local-movil.png).

La matriz de perfiles de acceso/revocación se verificó por operaciones reales contra Supabase local; la revisión visual de esta entrega utilizó administrador. No equivale a una prueba asistida de lectores de pantalla ni a aceptación visual completa de todos los perfiles.

## Criterios aún pendientes

1. Completar P01–P08 mediante el conector real, incluida conciliación mensual completa y sus fallos observados.
2. Confirmar que la consulta diaria puede detenerse sin releer el historial con presupuestos medidos del servidor real.
3. Validar detalle/adjuntos y lectura mediante el adaptador, no solo en el portal manual.
4. Capacidad del servidor, recuperación y autorización de despliegue/activación.

La implementación local no cierra automáticamente H10 ni H08.

La revisión automática rechazó una pausa posterior del simulador para repetir la regresión completa. No se ejecutó esa pausa; se conservó el resultado satisfactorio anterior y se verificó por prueba unitaria el ajuste posterior de fecha civil del simulador. También bloqueó reemplazar el proceso 4001 sin respuesta por la restricción de no interrumpir el sistema; se solicitó autorización específica para su reparación. Estos bloqueos no se presentan como errores de SUNAT ni como cambios ejecutados.

Al pedir el usuario la alternativa más rápida, se dejó abierta **http://localhost:4003/buzon-sunat**, el mismo proyecto con H10, y se comprobó el título, 25 filas visibles, indicador de simulador y ausencia de errores. 4002 respondió HTTP 200. El proceso de 4001 se conservó sin reiniciar y no respondió al control HTTP; no se declara reparado. La compilación final terminó con código 0, tipos/lint/arquitectura y bundle pasaron, y la regresión completa final fue **55 archivos / 384 pruebas**. No se publicó en Cloud ni se enviaron notificaciones reales.
