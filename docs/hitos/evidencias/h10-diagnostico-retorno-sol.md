# H10 — diagnóstico del retorno de autenticación SOL

**Estado del 30/10/2026:** [quinta prueba y bloqueos pendientes](h10-bloqueo-origen.md). El informe incremental se conservó y confirmó un fallo de acceso inicial en esa ejecución; no hubo consulta del buzón. Instancia detenida, cero snapshots y ninguna escritura Cloud. La cuarta conserva su evidencia independiente de acceso e identidad correctos, seguida de un fallo posterior. No está demostrada la fiabilidad del origen para operación permanente.

**Resultado posterior:** la cuarta instancia expresamente autorizada **sí abrió el buzón en Vercel y verificó la identidad**, antes de fallar un login posterior de renovación. [Evidencia independiente](h10-vercel-piloto-4.json). No se registraron bloqueos de nuestra política, fallos de recursos ni errores de JavaScript en ese segundo login. Los resultados anteriores siguen siendo válidos para sus intentos; ya no es correcto afirmar que nunca se ha podido acceder desde Vercel.

Fecha: **29/10/2026, America/Lima**. [Hito](../h10-buzon-sunat.md) · [Tres pruebas anteriores](h10-runtime-y-validacion.md).

## Problema que queda por explicar

La tercera prueba Vercel confirmó Chromium protegido e imagen oficial, pero terminó en `login_submit`, con HTTP 302 y sin menú. El resultado no conserva el destino de la redirección, los errores de recursos ni los errores de JavaScript. Esas señales hacen falta para distinguir un retorno de autenticación incompleto de un fallo de recursos o de política de salida. El funcionamiento local no prueba compatibilidad remota ni bloqueo por IP.

## Instrumentación preparada

El observador registra únicamente:

- Hasta 16 redirecciones, con categorías de origen/destino, estado HTTP y si el destino utiliza HTTPS.
- Hasta 16 respuestas de navegación y 16 fallos de recursos, con categorías y códigos de red de una lista cerrada.
- Cantidad de solicitudes bloqueadas por nuestra política, categoría del último origen bloqueado y si se alcanzó el límite de solicitudes.
- Cantidad y clase de errores de JavaScript y cantidad de errores de consola.

Los contadores se reinician antes de enviar el formulario de login. No se guardan URL completas, rutas, consultas, Location sin procesar, cookies, cabeceras de acceso, HTML, texto de consola, mensajes de excepciones, RUC ni credenciales. El contrato Zod elimina campos adicionales antes de serializar el diagnóstico. Los lectores reciben copias y las trazas tienen un tamaño acotado.

Se conserva el flujo existente: origen oficial, sandbox, usuario sin privilegios, TLS validado y la misma política de red. Los observadores no alteran el retorno, no conceden acceso a dominios adicionales ni omiten una verificación de SUNAT.

## Evidencia local

- **67 archivos y 458 pruebas aprobadas**. Incluye seis pruebas nuevas de redacción, límites, copia defensiva y clasificación de redirecciones/fallos.
- Tipos y lint aprobados. Worker compilado con **Yarn**, a **59 módulos propios**.
- Fixture integrado ejecutado con Chromium real dentro de Docker, **sin red externa**, con servidor HTTP de loopback, filesystem de solo lectura y capacidades retiradas. Observó una redirección 302, una solicitud de script bloqueada y un `TypeError`; verificó que los valores privados ficticios no aparecieran en el diagnóstico.
- Sin credenciales SOL en ese fixture, consultas a SUNAT, escrituras Cloud ni reinicio de la presentación.

El fixture prueba que el observador funciona con eventos reales de Chromium. **No prueba qué causó el fallo de SUNAT en Vercel.** La imagen instrumentada se prepara en el registro privado; una cuarta instancia requerirá autorización específica, puesto que las tres anteriores ya se consumieron. Su resultado deberá registrarse de forma independiente y comprobarse la limpieza antes de aceptar cualquier conclusión.

[Metadatos y pruebas](h10-diagnostico-red.json): imagen local `sha256:296222282fb9f659e73a9f18ab4b69197f144adde4c2f15e9e664ba94aa55944`, **2.571.730.805 bytes**. La subida de `h10-login-trace-20261029` terminó con salida 0 y el registro asignó el manifiesto `sha256:993effc2ad6fdbec4e84730439e804c789492eed6ac496b06319b183525c7fe2`, **976.763.607 bytes almacenados**. La primera consulta lo mostró en preparación; una consulta posterior confirmó **ready**. La imagen empaquetada también pasó el fixture sin red externa, sin montar código compilado desde el host.

## Resultado de la cuarta instancia autorizada

El usuario autorizó una sola ejecución adicional, con el mismo piloto cifrado, máximo cinco minutos, sin snapshots ni escrituras Cloud. La sesión duró **77.563 ms**, con **20.158 ms de CPU activa**, 1 vCPU y 2.048 MB asignados. SDK y MCP confirmaron estado detenido, una sola sesión para ese intento, cero snapshots y ninguna ruta pública.

El orden de eventos conservado demuestra `pilot_connected` con `verified_identity=true` y, posteriormente, otro `source_login_incomplete`. La nueva traza del fallo muestra una redirección HTTPS 302 dentro del origen SOL seguida de 200, sin respuestas del Menú, solicitudes bloqueadas, límite excedido, errores de red o errores de JavaScript. No identifica el motivo por el que SOL devuelve ese segundo acceso al mismo origen. No demuestra bloqueo por IP ni acceso permanentemente fiable.

El ejecutor escribía `connector.json` únicamente al terminar todas las comprobaciones. Al fallar la conexión posterior se perdió ese informe, aunque hubiera etapas previas realizadas. **Solo se certifican el acceso e identidad observados**: no se deducen cantidades mensuales o un PDF descargado a partir de la duración o del orden del código.

Se corrige el ejecutor para guardar un informe privado por etapas, con escritura temporal y renombrado, conservación de resultados anteriores, etapa fallida y cierre. `run_finished` se distingue de cobertura mensual, adjunto y aprobación del origen. Una renovación fallida no elimina lo ya registrado ni se transforma en sesión correcta. Los fallos del almacenamiento o de la limpieza se informan explícitamente. Esta corrección posterior no recupera retroactivamente el informe que faltó en la cuarta instancia.

Las cuatro autorizaciones remotas ya se consumieron; no se creó ni reanudó otra instancia.

## Corrección y comprobación del informe incremental

[Evidencia](h10-informe-incremental.json): **68 archivos y 464 pruebas aprobadas**, incluyendo seis escenarios del ejecutor real con dependencias simuladas: fallo inicial, fallo posterior de renovación, resultados parciales, almacenamiento fallido, limpieza fallida y conservación del primer error cuando también falla el cierre. Tipos y lint pertinentes aprobados.

El esquema 2 distingue etapa actual, última etapa terminada, identidad, periodos, adjunto, lectura, renovación, fallo, cierre y finalización del recorrido. `run_finished=true` significa que las comprobaciones terminaron; no aprueba el origen ni convierte una consulta parcial en completa. Los motivos se reducen a códigos conocidos. Cada fase escribe un archivo temporal privado y lo renombra; no incluye documentos, textos, RUC o credenciales.

Un fixture de filesystem en Docker, sin red, comprobó reemplazo, modo 0600 y conservación del informe anterior cuando el temporal no puede escribirse. La imagen empaquetada pasó esa comprobación. VCR confirmó **ready** para `h10-pilot-checkpoints-20261029`, manifiesto `sha256:d8116700a4c0f33d1d360b9695e1aeaaa9df6b7d86cd92ab352e5d37d227bbcf`, con 61 módulos propios; no se ejecutó otra instancia remota por preparar la imagen.

El piloto local autorizado terminó el recorrido y guardó identidad, cuatro resultados mensuales, PDF de **87.581 bytes**, renovación con IDs estables y cierre correcto. Conserva Notificaciones 1/0 y Mensajes parciales, con 3/1 registros recuperables en octubre/septiembre. Duró **39.470 ms**, con 252 solicitudes y 20.150,26 ms de CPU del contenedor. RSS de Node: 166,23 MB; cgroup registró un pico de **768 MB**, igual al límite del contenedor. Ese valor no demuestra margen para reducir memoria. El shell devolvió 1 para el resultado parcial; el informe no lo convierte en una consulta completa.

Durante esta reanudación Docker y el servidor estaban detenidos. Se abrieron Docker y los contenedores existentes del laboratorio TaxSkill, sin borrar datos; el worker se verificó como **simulator**, con consultas diarias reales desactivadas. La presentación se reabrió en **4003 con Next.js 16.4.3** desde la copia validada. Después se instalaron las dependencias parcheadas en el proyecto principal y su `yarn h10:app build` y control del bundle terminaron correctamente: 22 páginas, Proxy y ninguna clave privada detectada en el navegador. Esto sustituye el estado anterior que conservaba el build 16.4.0; no constituye publicación en Vercel.

## Condición de avance actual

Resolver primero la diferencia del login local/remoto con evidencia del retorno. Aun resolviéndola, se mantienen pendientes la integridad de Mensajes y la consulta diaria incremental del origen real. No activar `SUNAT_SOURCE_VALIDATED` ni `SUNAT_RUN_DAILY` por el hecho de ampliar el diagnóstico.
