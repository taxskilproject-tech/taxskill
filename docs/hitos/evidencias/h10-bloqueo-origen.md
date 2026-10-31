# H10 — validaciones completadas y bloqueos del origen

**Actualización posterior del 30/10/2026:** el fallo de acceso y apertura fue [corregido y comprobado en dos pruebas Vercel con la misma imagen](h10-correccion-autenticacion.md). Ambas verificaron identidad, Notificaciones, PDF y renovación. Las ocho instancias están detenidas, sin snapshots. Mensajes conserva cobertura parcial visible por la inconsistencia del origen; la operación diaria sigue pendiente. El resto de este documento conserva el diagnóstico previo a esa corrección.

Actualizado el **30/10/2026, America/Lima**. [Hito](../h10-buzon-sunat.md) · [Cuarta prueba](h10-vercel-piloto-4.json) · [Quinta prueba](h10-vercel-piloto-5.json) · [Validación local y correcciones](h10-informe-incremental.json).

## Estado comprobado

| Requisito | Evidencia y límite |
|---|---|
| Acceso desde Vercel | La cuarta prueba abrió el buzón y verificó el RUC; otras pruebas, incluida la quinta, fallaron en el login. Compatibilidad puntual demostrada; fiabilidad no demostrada. |
| Renovación | Funciona en Docker con IDs estables; en la cuarta prueba remota falló un acceso posterior de renovación. No está aprobada su fiabilidad en Vercel. |
| Notificaciones y PDF | Demostrados en Docker para los dos meses autorizados. La cuarta ejecución remota no conservó su informe final y no certifica cantidades o adjuntos allí. La quinta no llegó a consultar. |
| Mensajes completos | Discrepancias reproducidas en SOL y Docker. Se conservan registros recuperables sin certificar cobertura ni adelantar la última consulta correcta. |
| Consulta diaria incremental | Pendiente de demostrar con un origen fiable. No se sustituye por releer todo el historial. |
| Seguridad y producto local | 464 pruebas, tipos y lint pertinentes aprobados; build principal Next.js 16.4.3 y bundle sin secretos. Presentación en 4003 con simulador y datos existentes. |
| Limpieza remota | Cinco instancias expresamente autorizadas, detenidas, sin snapshots ni rutas públicas. Sin escrituras Cloud, revisión diaria real ni cambio de plan. |

## Quinta prueba: informe conservado

El usuario autorizó una sola quinta instancia, máximo cinco minutos, mismo piloto cifrado y sin snapshots/escrituras Cloud. Se usó el manifiesto `d811670…`, con informe incremental. El preflight de Chromium pasó, pero el primer acceso terminó en `SOURCE_UNAVAILABLE`.

La traza observó redirección HTTPS 302 dentro del origen SOL y respuesta 200, sin menú, errores de recursos, bloqueos de nuestra política o errores de JavaScript. No explica por qué el servidor devuelve ese acceso al mismo origen. No demuestra credenciales incorrectas, bloqueo de IP o incompatibilidad general de Vercel.

El informe esquema 2 sí se recuperó: etapa `connecting`, identidad no verificada, ninguna consulta mensual, ningún adjunto, fallo explícito y cierre correcto. No se importan resultados de otras ejecuciones para rellenar este intento fallido.

La sesión duró **36.067 ms**, con **12.498 ms de CPU activa** y 2.048 MB asignados. El proceso del piloto midió 29.006 ms y 17 solicitudes; RSS de Node 159,03 MB y pico cgroup 836,46 MB. Estas medidas corresponden únicamente al login fallido, no a una sincronización mensual ni diaria completa.

## Información para una revisión técnica externa

El administrador puede proporcionar este resumen por un canal oficial de soporte, identificando privadamente el RUC autorizado y las horas de los intentos. Este documento no se ha enviado a terceros.

1. Acceso oficial mediante SOL, sin alterar identidad del navegador, TLS, sandbox o controles de verificación.
2. En Vercel `iad1`, un acceso abrió el buzón y verificó identidad; un acceso posterior volvió al origen de autenticación. Otro intento también falló inicialmente con la misma secuencia 302 → 200.
3. Horas UTC de la cuarta sesión: aproximadamente **30/10/2026 01:10–01:12**; quinta: **30/10/2026 05:00–05:01**. Las evidencias individuales conservan el alcance real de cada una.
4. Solicitar explicación del retorno de autenticación y del mecanismo autorizado/soportado para consultar el buzón automáticamente. No se presupone una API pública documentada.
5. Contrastar los contadores de Mensajes y sus páginas completas en la empresa piloto; no corregir el total suponiendo que las filas ausentes no existen.

No incluir claves SOL, cookies, tokens o documentos tributarios en una incidencia pública. Los scripts autenticados permanecen en el directorio privado; su análisis estructural no publica el contenido personalizado.

## Condición para continuar

H10 **no cumple todavía el 100 % operativo**. Hace falta resolver la fiabilidad de autenticación/renovación y la integridad de Mensajes, y luego demostrar la revisión diaria real. Las cinco autorizaciones de instancias temporales están consumidas; no se ejecutó una sexta ni se activó el origen real.

Repetir el mismo intento sin un diagnóstico nuevo no demuestra esas condiciones. Cualquier siguiente validación remota requiere un alcance concreto y autorización adicional; cambiar de plan o de infraestructura tampoco se considera autorizado ni una solución probada.
