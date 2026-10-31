# H10 — correcciones del prototipo y límite de la validación

**26/10/2026. Estado: núcleo del prototipo corregido y probado en Docker; integración real pendiente.** Consultar [hito](../h10-buzon-sunat.md), [piloto real](h10.md), [reporte Docker](h10-worker-lab.json) y [guía de ejecución](../../../integrations/sunat/README.md).

## Resultado y alcance

Se implementó un núcleo ejecutable para consultas mensuales, con contratos estrictos, persistencia de continuación, aislamiento lógico de conexión y transporte sustituible. El transporte disponible conecta **exclusivamente con un simulador HTTP local**. No contiene el adaptador de autenticación, navegación o descarga automática de SUNAT.

El piloto de navegador y el laboratorio tienen procedencias separadas. Los resultados sintéticos no se utilizaron para convertir el expediente real en un conector validado. El evaluador continúa en `pilot_incomplete` y conserva cuatro comprobaciones sustentadas en navegador.

## Observaciones y correcciones

| ID | Observación | Corrección implementada | Verificación y límite |
|---|---|---|---|
| H10-OBS01 | El contador podía indicar registros sin filas, o 25 registros con solo 24 visibles. | Validación de ámbito, página, rango, total, cantidad e IDs. Reintento acotado; una página inválida no avanza el cursor ni se declara vacía. | Casos transitorio y persistente, primera página corta y ámbito ajeno en Docker. El visor real sigue presentando la discrepancia. |
| H10-OBS02 | Faltaban consulta mensual acotada y continuidad. | Ventana por fecha civil de publicación; parada por límite del mes solo con orden descendente declarado y verificado en cada página. Orden no acreditado exige seguir paginando con presupuestos. | Ventana septiembre/octubre conciliada con 45 registros sintéticos; historial anterior omitido cuando corresponde y continuación duradera cuando se agota el presupuesto. La ordenación de SUNAT debe contrastarse en su adaptador. |
| H10-OBS03 | Una continuación podía duplicar datos o saltar registros si cambiaba la fuente. | IDs únicos, verificación de primera página al reanudar, total estable y rechazo explícito de repetición o cambio de ancla. | Reanudación sin duplicados; total/ancla diferentes requieren reiniciar mediante actualización nueva. |
| H10-OBS04 | No había recuperación controlada de sesión ni clasificación de fallos. | Una renovación por ejecución; credencial rechazada y verificación humana detienen; indisponibilidad y timeout conservan resultados parciales con límites. | Sesión vencida, rechazo, desafío humano, caída y petición bloqueada simulados. Cierre e inicio nuevos de sesión real comprobados; expiración y fallos del adaptador real siguen pendientes. |
| H10-OBS05 | Un fallo posterior podía reemplazar el último resultado válido. | Archivo de trabajo y última consulta completa separados; escritura temporal y renombrado. Solo páginas íntegras se incorporan. | Actualización fallida conserva el archivo de la última consulta completa; checkpoint corrupto produce error explícito. |
| H10-OBS06 | Faltaban límites y mediciones. | Presupuestos de páginas, solicitudes, intentos y duración; timeout por solicitud, tamaño máximo de respuesta y máximo de 5.000 IDs por checkpoint. Tiempo, CPU, RSS y solicitudes reales instrumentados. | Mediciones reales del simulador en contenedor; no representan RAM/CPU de un navegador o conector SUNAT. |
| H10-OBS07 | Consulta diaria podía repetir todo el historial. | Planificación desde el último día consultado correctamente, inclusive, hasta el actual; orden y límites impiden recorrer historia innecesaria. | Consulta diaria sintética acotada a una página. El día es civil de Lima; la programación y la deduplicación de avisos productivos pertenecen a la implementación posterior. |
| H10-OBS08 | Apertura podía alterar lectura sin un acuerdo visible. | Advertencia común versionada y consentimiento obligatorio en el contrato de consulta, antes de cualquier solicitud. Se conserva el acuerdo del usuario. | Falta de consentimiento bloquea llamadas. El formulario de conexión y su registro auditado aún no están construidos. |
| H10-OBS09 | Doble clic y consultas simultáneas podían solaparse. | Ejecutor secuencial; misma conexión y consulta reutilizan promesa, una consulta distinta simultánea recibe error explícito. | Reutilización y bloqueo probados. Es exclusión de un único proceso; la futura operación distribuida requiere lease en base de datos. |

## Contratos y conservación

- `refresh` comienza una consulta nueva; `resume` recupera el checkpoint de la misma conexión, bandeja y ventana. No reutilizar una consulta completa como sustituto de actualizar novedades.
- Estados: `complete`, `partial` y `requires_attention`. Solo `complete` sin error permite avanzar la fecha de última consulta correcta.
- La renovación consume presupuesto de solicitudes, igual que los intentos fallidos. `pages_read` cuenta solicitudes de página; `pages_accepted` cuenta páginas nuevas aceptadas y guardadas. La comprobación del ancla consume solicitudes, sin incrementar las páginas nuevas aceptadas.
- El límite de páginas se aplica a páginas nuevas por ejecución; el límite de solicitudes incluye reintentos y validación de continuidad. La continuación no concede presupuestos infinitos a una única ejecución.
- Los checkpoints usan nombres SHA-256 sobre el ámbito; no incorporan RUC, credenciales, URLs ni asuntos. El trabajo conserva IDs y metadatos mínimos de mensajes. No se mezclan IDs de fila con IDs de adjunto.
- Una discrepancia no se corrige inventando filas ni ajustando el total para que coincida. El adaptador deberá repetir una respuesta válida o conservar el fallo.
- Los códigos HTTP y rutas del simulador son un contrato de pruebas propio: **no documentan una API ni códigos de error oficiales de SUNAT**.

## Ejecución y pruebas

`yarn h10:lab` transpila únicamente el prototipo y su fixture a un directorio ignorado, y lo ejecuta en un contenedor efímero. Utiliza la imagen oficial de n8n ya disponible solo como runtime Node; no inicia n8n ni utiliza sus credenciales.

El contenedor usa red `none`, fixture por loopback, raíz de solo lectura, capacidades retiradas y límites de **256 MB, 0,5 CPU y 64 procesos**. Monta código compilado y Zod como lectura, y exclusivamente su carpeta de resultados como escritura. No monta `.envs`, fuentes completas, Docker socket ni carpetas de otros proyectos. No modifica 4001/4002.

Resultados y métricas exactas: [reporte Docker](h10-worker-lab.json). El conjunto aprobó 41 comprobaciones. La RSS máxima de Node corresponde al proceso completo desde su arranque; la memoria de cgroup es una medición diferente del contenedor. La suite incluye fixture, IO y comprobaciones; no comparar esos valores con un worker real con navegador. [Referencia de métricas de Node.js](https://nodejs.org/api/process.html#processresourceusage).

Se aprobaron también las 16 pruebas del evaluador, tipos, lint dirigido y arquitectura. No se recompiló el frontend: esta corrección afecta scripts y documentación, y conserva el build servido en presentación.

## Nueva comprobación real y pendientes

Se cerró la sesión del segundo piloto y se inició una nueva con los mismos accesos autorizados. El login funcionó. En Mensajes reaparecieron 24 filas en la primera página y cero en la segunda, con contador `26-40 de 40`. La renovación no resolvió la discrepancia.

![Contador del visor después de renovar sesión; captura limitada a ese control](capturas/h10/buzon-paginacion-revalidada.png)

El registro del navegador mostró errores de `MutationObserver`, sin URL de origen identificable. No se atribuyen a SUNAT ni se presentan como causa demostrada de la paginación. No se modificó el portal ni se inventó una API para resolverlo.

Se pidió contrastar la segunda página en el navegador habitual del usuario; respondió que aún no lo ha comprobado. Ese contraste permanece pendiente y no permite atribuir la causa al portal o al navegador de la prueba.

Pendientes indispensables antes de construir el módulo completo:

1. Implementar y contrastar el adaptador propio contra la fuente real: autenticación y vínculo de empresa, consulta mensual, integridad de paginación, descarga y clasificación de sesión/fallos.
2. Resolver o circunscribir de forma verificable la discrepancia del visor; comparar todos los registros del mes antes de certificar integridad.
3. Medir ese adaptador real y demostrar dos consultas incrementales sin intervención, con límites y deduplicación.
4. Confirmar capacidad del servidor y responsable de mantenimiento antes de operación permanente.

**No se cierra H10 ni se habilitan jobs por aprobar el simulador.** El reporte sintético permanece separado del expediente real y de sus cuatro comprobaciones abiertas.
