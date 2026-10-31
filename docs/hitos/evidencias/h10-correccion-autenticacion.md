# H10 — corrección del acceso y la renovación de SOL

Actualizado el **30/10/2026**. [Hito](../h10-buzon-sunat.md) · [Resultado anterior](h10-bloqueo-origen.md) · [Guía del worker](../../../integrations/sunat/worker/README.md).

## Cambio solicitado y límite del diagnóstico

El usuario pidió corregir el acceso intermitente del conector. También confirmó que las páginas inconsistentes de Mensajes son una limitación del propio SUNAT. Se conserva esa limitación explícita: recuperar registros disponibles no equivale a certificar que el mes está completo.

Las cinco pruebas remotas anteriores no permiten atribuir el retorno al login a una causa única. No demuestran bloqueo por IP ni credenciales incorrectas. Esta corrección prepara el formulario antes de enviar accesos y permite recuperarse de un fallo temporal; su eficacia en Vercel requiere una prueba nueva con esta imagen.

## Corrección implementada

- Esperar la carga del formulario y la inicialización de los controles oficiales antes de rellenarlos. Seleccionar el acceso por RUC cuando el formulario esté en otro modo.
- Verificar origen, cliente SOL, retorno autorizado y destino POST `j_security_check` antes de proporcionar credenciales.
- El HTML público de SOL convierte el usuario a mayúsculas mediante `onchange`. Reproducir esa conversión y comprobar los valores antes del envío. La contraseña y el RUC se mantienen exactos; el objeto de credenciales no se modifica.
- Permitir **dos intentos totales**, con dos segundos de espera y una sesión de navegador nueva por intento. Reintentar únicamente `SOURCE_UNAVAILABLE`; no reintentar una clave rechazada, CAPTCHA, intervención humana o contrato inesperado.
- Limitar la conexión completa a 70 segundos, respetando también el plazo y la cancelación del trabajo que la llama. Una renovación con plazo de 45 segundos conserva ese límite menor.
- Cerrar el navegador una sola vez, incluso cuando se cancela durante el inicio. Impedir que una apertura tardía publique una sesión después de cerrar o cancelar el trabajo.
- Esperar que el enlace oficial del buzón tenga registrada su acción de clic antes de pulsarlo. La presencia visible del enlace no garantiza que el menú esté preparado.
- Conservar los informes por etapas y los resultados parciales. No cambiar las políticas de lectura, permisos, contadores o fecha de última consulta correcta.

La espera del formulario previene un envío prematuro, pero no se presenta como causa demostrada de los fallos remotos anteriores. La conversión del usuario sí se observó directamente en el formulario público y corrigió el rechazo `SOURCE_CHANGED` de la nueva comprobación local.

## Pruebas con Chromium y piloto real local

El fixture Docker sin red utiliza el conector compilado y Chromium protegido. Simula inicialización tardía, cambio de modo DNI a RUC, conversión del usuario, un primer acceso temporalmente fallido, recuperación con estado nuevo y renovación posterior. Verifica la contraseña exacta y el cierre único de los tres navegadores. Terminó con salida 0. La navegación sintética usa JavaScript; no reproduce toda la cadena HTTP 302 de SUNAT.

El piloto real autorizado se ejecutó en un contenedor temporal, separado de la cola y sin escrituras en Supabase. La primera apertura del buzón agotó su espera; el segundo intento entró y verificó identidad. El recorrido terminó, descargó el PDF de referencia y renovó la sesión manteniendo IDs estables. Todos los navegadores quedaron cerrados.

| Resultado | Octubre de 2026 | Septiembre de 2026 |
|---|---|---|
| Notificaciones | 1; consulta completa | 0; consulta completa |
| Mensajes recuperables | 3; consulta incompleta | 1; consulta incompleta |
| Motivo de cobertura incompleta | `PAGE_INCONSISTENT` | `PAGE_INCONSISTENT` |

El PDF tiene 87.581 bytes. El recorrido midió 60.432 ms, 324 solicitudes, RSS máximo de Node de 166,55 MB y pico del contenedor de 452,15 MB, con límite de 768 MB. Son medidas de este piloto completo con reintento, no del futuro proceso diario. Docker CLI devolvió 1: el informe confirma recorrido terminado y consultas parciales; no se registra como éxito integral.

Los archivos originales con accesos cifrados y el informe detallado permanecen en el directorio privado ignorado. El intento local previo que detectó la diferencia de mayúsculas se conserva por separado; no se sustituye su evidencia por la del recorrido corregido.

## Verificación y alcance

### Sexta prueba Vercel y corrección del menú

La [sexta prueba autorizada](h10-vercel-piloto-6.json) superó el formulario y alcanzó el menú en sus dos intentos. Ambos terminaron en `mailbox_frame`: el buzón no abrió dentro del plazo. No se verificó identidad dentro del buzón, no se consultaron periodos y no se llegó a la renovación. Por tanto, este resultado demuestra avance de autenticación, no el recorrido remoto completo. La causa remota de la apertura fallida no quedó demostrada.

La instancia terminó detenida, con persistencia desactivada y sin rutas públicas. La comprobación independiente mediante Vercel MCP encontró seis sesiones detenidas y cero snapshots. Duró 72.171 ms con 20.023 ms de CPU activa. El informe se recuperó antes de detenerla; el endpoint de logs respondió 410 después de la detención y no se reanudó la instancia para consultarlo.

Al revisar el menú conservado se observó que el enlace `aOpcionBuzon` recibe su acción mediante un evento registrado posteriormente. Un fixture Chromium sin red reprodujo el problema con tres segundos de demora: el código anterior pulsaba el enlace inerte y terminaba en `SOURCE_UNAVAILABLE`. Con la espera de inicialización pasó con salida 0. La comprobación solo inspecciona si existe un evento de clic o un `onclick`; no ejecuta funciones internas del portal ni modifica sus controles.

El piloto Docker real con esta espera terminó en 29.632 ms, verificó identidad, descargó el mismo PDF y renovó con IDs estables. Midió 252 solicitudes y pico de memoria de 417,55 MB. Notificaciones conservó los resultados completos y Mensajes los parciales descritos antes. El contenedor devolvió 1 por ese resultado parcial; el informe terminó sin fallo y con limpieza correcta.

La espera del menú corrige un defecto reproducible del conector. No se atribuye automáticamente a ese defecto el fallo remoto sin probar la imagen que lo contiene. La imagen nueva tiene 65 módulos; la sexta instancia ejecutó la imagen anterior de 64 módulos.

### Séptima y octava pruebas: corrección comprobada en Vercel

El usuario autorizó una séptima instancia con la espera del menú y una octava condicionada a completar acceso, descarga y renovación en la séptima. Se comprobó esa condición antes de crear la octava. Ambas usaron exactamente el manifiesto `e77607a…`, un máximo de cinco minutos, un vCPU y 2.048 MB, sin persistencia ni puertos públicos.

Las dos completaron apertura, identidad dentro del buzón, Notificaciones de ambos meses, descarga del PDF de 87.581 bytes y renovación con IDs estables. El hash del archivo coincide con la referencia Docker. Los recorridos no presentaron fallos de conexión ni necesitaron el segundo intento. Mensajes conservó tres registros recuperables de octubre y uno de septiembre, con `PAGE_INCONSISTENT`: ambos ejecutores terminaron con salida 2 por cobertura parcial, no con certificación integral.

| Medida | Séptima | Octava |
|---|---|---|
| Recorrido del piloto | 30.650 ms | 32.263 ms |
| Solicitudes | 252 | 250 |
| RSS máximo de Node | 187,57 MB | 190,02 MB |
| Pico de memoria del contenedor | 929,11 MB | 929,95 MB |
| Duración de la instancia Vercel | 36.427 ms | 38.636 ms |
| CPU activa de la instancia | 15.066 ms | 19.446 ms |

El efecto de lectura no se pudo volver a medir en estas ejecuciones porque ya no había un registro de referencia sin leer. Se conserva ese resultado, separado de la comprobación positiva anterior; no se interpreta como ausencia de efecto.

Las evidencias [séptima](h10-vercel-piloto-7.json) y [octava](h10-vercel-piloto-8.json) se recuperaron antes del cierre. Vercel MCP confirmó ambas detenidas sin reanudación, persistencia desactivada, cero rutas públicas, ocho sesiones detenidas en el proyecto y cero snapshots. Esto demuestra la corrección en estos dos recorridos remotos; no equivale a una garantía de disponibilidad continua de SUNAT.

La regresión final aprobó **69 archivos y 482 pruebas**, tipos, lint pertinente, formato, arquitectura, `yarn build` con Next.js 16.4.3 y control del bundle. La compilación se realizó en un build independiente de la presentación.

El [resumen técnico](h10-correccion-autenticacion.json) recoge las comprobaciones, la imagen exacta y el estado de la validación remota.

La presentación en **4003** y el worker simulado continúan activos. No se cambiaron datos Cloud, despliegues web, consultas diarias ni envíos. Las ocho instancias permitidas están consumidas y detenidas; no queda autorización para crear otras.

La corrección de acceso, apertura y renovación queda comprobada en Docker y Vercel. H10 permanece abierto por validación y despliegue de la operación diaria. La cobertura incompleta de Mensajes se conserva como una limitación visible del origen, sin ocultarla ni convertirla en un error de contraseña.
