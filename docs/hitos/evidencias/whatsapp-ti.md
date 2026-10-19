# Canal WhatsApp · TI comprobada y mensaje recibido

**Fecha:** 19 de octubre de 2026, `America/Lima`. **Resultado:** mensaje manual aceptado por Evolution con HTTP **201** y recepción **confirmada por el destinatario** en este chat. La prueba usa su número autorizado, terminado en **173**. No se crearon obligaciones, usuarios ni digests ficticios en Supabase Cloud.

## Configuración definitiva

- Workflow productivo: `MvcIvz2cHEe2jiCj`, **TaxSkill · Resumen diario · Evolution API**.
- Versión final publicada y estado `Published` comprobados: **TaxSkill · TI nombre exacto verificado · 19-10-2026**.
- Instancia elegida: **TI**. Nombre exacto existente en Evolution: **` TI`**, con espacio inicial, secuencia Unicode **U+0020 U+0054 U+0049**.
- Endpoint verificado: **`https://n8n-evolution-api.ricijy.easypanel.host/message/sendText/%20TI`**. `%20` conserva el espacio; no es otra instancia.
- Cabecera `apikey`, credencial **TaxSkill · Evolution API**. La actualizó y guardó personalmente el usuario; no se leyó ni publicó su valor.
- JSON de importación y [guía de producción](../../../integrations/n8n/produccion/README.md) actualizados. Se conservan webhook, contrato, deduplicación y receipts. No se activaron jobs de Supabase ni se reiniciaron/desconectaron instancias.

## Diagnóstico y resultados conservados

| Paso | Resultado | Interpretación |
|---|---|---|
| Comprobación directa previa con la clave facilitada en la conversación | HTTP 401 al consultar conexión; sin intento de envío. | Ese intento no confirmó acceso. La copia temporal local de la clave fue retirada. |
| Primer intento desde n8n a `/message/sendText/TI` | HTTP 404, `The "TI" instance does not exist`. | Rechazo explícito, sin identificador de mensaje. |
| Usuario actualiza la credencial y se comprueba otra vez `/TI` | HTTP 404 nuevamente. | Cambiar la credencial no resolvía el nombre incorrecto; no hubo envío aceptado. |
| Lectura del nombre en dashboard y tarjeta de Evolution Manager | Texto DOM **` TI`**, códigos `[32,84,73]`, instancia conectada. | Espacio inicial que no era evidente visualmente. No se renombró la instancia. |
| Consulta GET a `/instance/connectionState/%20TI` | **HTTP 200**, estado **`open`**. | Nombre exacto y credencial admitidos, sin enviar mensajes. |
| Un intento al endpoint corregido | **HTTP 201**, ID **`3EB0A4B11943AC7BF1775B4CB79843C8F0DF4512`**, instancia **`003e3bb4-62a2-4eb3-bde2-3066c363847a`**. | Mensaje aceptado del remitente TI. Estado inicial **`PENDING`**. |
| Confirmación del destinatario | Respuesta humana **«Sí, ya lo recibí»**. | Recepción real confirmada; no se inventó un callback del proveedor. |

Hubo dos POST rechazados explícitamente y **un único mensaje aceptado**, sin reintentos automáticos ni repetición después del HTTP 201. Los rechazos se conservan; el aviso verde «Node executed successfully» no se usó como prueba de envío porque el adaptador expone errores HTTP mediante `Never Error`.

La evidencia inicial `PENDING` no se convirtió en `delivered` dentro de la base de TaxSkill. La recepción se confirma por el usuario, no por un receipt de integración. No se fabricó un digest productivo para representar la prueba.

## Flujo temporal y cierre de la prueba

Se utilizó **TaxSkill · Prueba única TI · 19-10-2026**, ID `xhK05cjKlbGdpqWr`, con disparador manual y adaptador HTTP. No se publicó, no tuvo webhook ni programación y no guardó ejecuciones manuales/exitosas/fallidas. Se **archivó mediante la opción recuperable de n8n** al confirmar recepción; la aplicación volvió al listado de workflows. No se borró físicamente.

Texto autorizado: «TaxSkill · Prueba de notificación WhatsApp. Este mensaje confirma la conexión del canal de avisos.» Los contactos, capturas y resultados completos quedan únicamente en `test-results/`, ignorado por Git. Evidencias mínimas: `h08-whatsapp-ti-n8n-once.json`, `h08-whatsapp-ti-n8n-after-credential.json` y `h08-whatsapp-ti-exact-name-once.json`; los primeros conservan el rechazo y el último el mensaje aceptado y la confirmación humana. No contienen claves.

**Cerrado:** acceso n8n al proveedor, nombre exacto de TI, envío manual y recepción en el teléfono autorizado. **Pendiente:** recorrido completo TaxSkill → resumen de obligaciones reales → n8n → proveedor → receipt, deduplicación productiva y programación autónoma. La prueba manual no cierra por sí sola OP08–OP09 ni H08. Ver [cierre de hitos](cierre-hitos.md), [aceptación funcional Docker](aceptacion-funcional-docker-h08.md) y [evidencias H08](h08.md).
