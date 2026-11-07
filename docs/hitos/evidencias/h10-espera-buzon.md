# H10 · Corrección de la espera de apertura del buzón

El 7 de noviembre de 2026 se corrigió la espera de apertura de SUNAT. Consultar la [evidencia técnica](h10-espera-buzon.json), el [contraste de paginación](h10-contraste-noviembre.md) y la [operación H10](../../buzon-sunat-implementacion.md).

## Incidencia observada

La consulta de metadatos de Cloud confirmó el fallo de las revisiones diarias del 4 y del 6 de noviembre. Ambas terminaron con `SOURCE_UNAVAILABLE` en `mailbox_loaded`, después de unos 58 segundos y antes de procesar páginas.

Los trabajos del 5 y del 7 alcanzaron la lectura y terminaron parciales por su presupuesto. Su diagnóstico incluye las mismas páginas de Mensajes contrastadas en SOL, con 17 de 25 filas en la primera, cero de 25 en la segunda y cero de cuatro en la tercera. Estas ejecuciones son antecedentes separados de la corrección de apertura.

El diagnóstico identifica la espera que falló. El recurso concreto que demoró esas dos ejecuciones productivas no quedó identificado en sus metadatos.

## Corrección

El conector esperaba `DOMContentLoaded` del marco completo antes de comprobar la identidad de la empresa. Se sustituyó esa dependencia por una espera explícita del elemento de identidad del buzón.

La comprobación exige una única identidad y coincidencia exacta con la empresa solicitada. La ausencia de identidad agota una espera de 15 segundos. Identidades duplicadas o de otra empresa producen `UNEXPECTED_RESPONSE`. El presupuesto de conexión, los dos intentos transitorios y el cierre del navegador continúan acotados.

El listado posterior conserva sus validaciones de respuesta, identidad, bandeja y paginación. La cobertura completa requiere que termine correctamente el recorrido de ambas bandejas.

## Reproducción y validación

Un fixture Chromium ejecutado exclusivamente en Docker, sin red exterior, reproduce un recurso pendiente del visor. La espera global anterior agota el plazo aunque la identidad esté disponible. La comprobación nueva continúa con esa identidad.

Se verificaron seis escenarios.

- Espera global bloqueada por un recurso pendiente.
- Apertura por identidad disponible, sin esperar ese recurso.
- Rechazo de identidad de otra empresa.
- Rechazo de identidad duplicada.
- Espera correcta cuando la identidad aparece con retraso.
- Error acotado cuando falta la identidad.

El fixture está en `scripts/fixtures/h10-mailbox-ready.ts` y se prepara mediante `yarn h10:worker:build`. La imagen final pasó las mismas seis comprobaciones sin montar código compilado desde el host.

La verificación real en una única instancia temporal de Vercel abrió el buzón autorizado y comprobó su identidad en **8.553 ms**. La instancia terminó detenida y sin snapshot. La evidencia contiene únicamente estados y métricas.

La regresión general pasó **76 archivos y 504 pruebas**. El laboratorio Docker de paginación pasó **45 comprobaciones**. Los tipos, lint y la arquitectura también pasaron. La compilación aislada con `yarn build --webpack` y el control del bundle pasaron. El primer build local con Turbopack falló al crear el proceso PostCSS de Tailwind, antes de poder establecer su conexión. La opción Webpack se utilizó únicamente para comprobar el build local.

## Publicación y alcance de la evidencia

La imagen corregida está publicada en el registro privado de TaxSkill y su digest está configurado en `SUNAT_SANDBOX_IMAGE` de Production. El despliegue posterior incorpora ese valor para las consultas manuales y la revisión diaria.

La comprobación Vercel demuestra apertura e identidad con la imagen corregida. La próxima revisión de las 08:00 de Lima permitirá comprobar el recorrido diario con esta versión. Una única comprobación de acceso no acredita disponibilidad continua de SUNAT.

## Comprobación posterior a la publicación

El despliegue `dpl_BUz62A5YMs7v8McB2LJVQT3Dp2G8` quedó Ready con el commit `7b7721a` y el dominio `taxskill.vercel.app`. Una actualización real de noviembre finalizó en aproximadamente 35 segundos, con 23.684 ms de ejecución del worker.

| Bandeja | Resultado guardado | Registros de noviembre |
|---|---|---:|
| Notificaciones | Completa | 0 |
| Mensajes | Parcial por paginación del origen | 1 |

La consulta superó la apertura y persistió ambas bandejas. Los seis diagnósticos de reintento de Mensajes reproducen los conteos anteriores de SOL. Esta actualización manual demuestra el recorrido productivo con la nueva imagen. La siguiente ejecución programada sigue siendo una comprobación posterior independiente.
