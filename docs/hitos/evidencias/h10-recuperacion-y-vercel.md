# H10 — recuperación parcial, lectura y preparación de Vercel

Fecha: **28/10/2026, America/Lima**. [Hito](../h10-buzon-sunat.md) · [Piloto anterior](h10-tercer-piloto.md) · [Resultado real](h10-recuperacion-parcial-docker.json) · [Laboratorio sintético](h10-laboratorio-recuperacion.json).

## Correcciones demostradas

Una página cuyo contador y filas discrepan sigue sin aceptarse como completa. Ahora sus registros con contrato válido, empresa/bandeja correctas, ID no ambiguo y fecha dentro del periodo solicitado pueden conservarse por separado. Esta recuperación no incrementa las páginas aceptadas, no salta el cursor ni adelanta la última consulta correcta. Los reintentos conservan la misma identidad y el upsert evita duplicados.

El repositorio utiliza `h10_worker_batch` existente; no requiere migraciones nuevas. Solo confirma su cache local después de recibir una respuesta afirmativa. Si falla la persistencia, informa `CHECKPOINT_STORE_FAILED` explícitamente. Las filas ajenas, de otra bandeja/página, con fechas inválidas o IDs duplicados no se recuperan.

En el tercer piloto real se recuperaron **3 mensajes de octubre y 1 de septiembre de 2026**, manteniendo `PAGE_INCONSISTENT`. Notificaciones conserva **1 registro de octubre y 0 de septiembre**, después de verificar sus cinco páginas. El total de Mensajes continúa sin reconciliar; no convertir estos cuatro registros en una consulta completa ni inventar los que SUNAT no entrega.

## Lectura y protocolo del portal

Con autorización adicional del usuario se analizaron scripts y controles entregados al navegador. Permanecen únicamente en el directorio privado ignorado; no se publican en Git. El campo `tipoOrden` controla la selección de casillas; no demuestra orden cronológico ni permite detener una consulta diaria suponiendo fechas descendentes. Los controles inspeccionados ofrecen búsqueda por asunto, sin demostrar un filtro por fechas o cursor incremental.

La apertura ahora espera la respuesta real de `obtenerDetalleNotiMen`, en lugar de depender de un documento que ya estaba cargado. Su campo booleano `updateLeido` se interpreta con contrato y se conserva solo como observación técnica del adaptador.

**Cambio de lectura demostrado con el conector:** en un mensaje del periodo autorizado, SUNAT informó `updateLeido=true` y la tercera comprobación posterior confirmó el estado leído. No se fuerza ni restaura la lectura. La previsualización automática al entrar sigue cubierta por la advertencia aceptada; este resultado no asegura que toda descarga o todo tipo de mensaje se comporte igual.

Los listados vacíos ya no se consideran evidencia de IDs estables. La prueba de lectura busca referencias en ambas bandejas y excluye los meses no autorizados.

## Validación

- **430 pruebas de 62 archivos aprobadas**, incluida la regresión general. Son pruebas sintéticas; no sustituyen el piloto real.
- **45 comprobaciones del laboratorio Docker** aprobadas con red externa deshabilitada. Incluyen conservación de 24 filas de una página corta, deduplicación, cursor inmóvil y rechazo de empresa ajena.
- **6 comprobaciones PostgreSQL reales en Docker** aprobadas mediante [SQL transaccional](../../../supabase/tests/h10-partial-recovery.sql): upsert repetido sin duplicados, cursor sin avance, rechazo de fecha ajena, conservación del último éxito, conteo persistido y marca diaria intacta. La transacción terminó con `ROLLBACK`; el simulador continuo no ve sus fixtures y no se pausó.
- Tipos y lint aprobados después de corregir el contrato del mock y los imports. Los artefactos privados `.envs/**` se excluyen de ESLint, sin excluir código propio de `src`, `scripts` o `tests`.
- Worker compilado con Yarn: **48 módulos**. Imagen inicial local `taxskill-sunat-worker:h10`, ID `sha256:5539420aa9b02285c60fc4aa878ac238ea1c5bd0802e66a402e8d136683232c0`, construida con Yarn 1.22.22 y Node 24.22.1. La preparación posterior para el SDK añadió `sudo` y produjo otra imagen; consultar [configuración y piloto de Vercel](h10-vercel-configuracion.md). [Dockerfile](../../../integrations/sunat/worker/Dockerfile).
- Smoke sin red: Zod y Playwright cargan; la imagen no contiene `pilot.json`, `.env` ni `.envs`. El modo real continúa rechazándose con `SUNAT_SOURCE_VALIDATED=false` antes de acceder a la cola.
- Último piloto real: **29.883 ms**, **267 solicitudes**, **434,789 MB** de pico y **15.278,3015 ms** de CPU del contenedor; incluye consultas, adjunto, lectura y otro login. La ejecución sigue siendo parcial, no un éxito integral.

## Destino confirmado: Vercel Hobby y Supabase

El usuario confirmó **Vercel Hobby**, sin servidor Easypanel para el conector. La web, sesiones y datos conservan Vercel/Supabase. No se interpreta que una Function corriente ejecute el worker Linux indefinido ya probado.

Se preparó la imagen sin secretos para evaluar **Vercel Sandbox**, que permite entornos Linux aislados e imágenes propias. Es una alternativa pendiente de demostrar en la cuenta, no una compatibilidad ya comprobada. El usuario autorizó publicar la imagen en el registro privado del proyecto y ejecutar **un único piloto temporal de hasta cinco minutos**, con las credenciales cifradas de la tercera empresa, sin snapshots, sin cambiar de plan, sin escribir en Supabase Cloud ni activar revisión diaria. [Entorno Sandbox](https://vercel.com/docs/sandbox), [imágenes](https://vercel.com/docs/sandbox/concepts/images), [cuotas Hobby](https://vercel.com/docs/sandbox/pricing).

Esta autorización no publica la aplicación, migraciones ni automatizaciones productivas. El paquete local y su smoke no prueban todavía Chromium con sandbox dentro de la microVM de Vercel. No desactivar TLS o el sandbox de Chromium para conseguir un resultado favorable.

## Pendientes que impiden el 100 %

1. Integridad de Mensajes: SUNAT sigue indicando más registros que los entregados, también en su interfaz.
2. Consulta diaria incremental real: no hay filtro/cursor temporal demostrado; recorrer el histórico o presuponer orden no satisface el acuerdo.
3. Piloto temporal Vercel autorizado: demostrar imagen privada, ejecución, acceso SUNAT y limpieza sin snapshots en la cuenta Hobby.
4. Implementación y validación de despacho bajo demanda/horario en ese destino, límites de cuota, recuperación y publicación posterior autorizada.

**H10 permanece abierto.** Se preservan el objetivo completo, los gates del origen y los pendientes de H08. No se declara que la presentación use el conector real ni que los nuevos módulos del worker ya sustituyan al simulador continuo.
