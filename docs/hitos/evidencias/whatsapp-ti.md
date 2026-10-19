# Canal WhatsApp · cambio a TI y prueba manual

**Fecha:** 19 de octubre de 2026, `America/Lima`. El usuario autorizó un mensaje de prueba a su número, terminado en **173**, y corrigió expresamente la instancia remitente a **TI**. El envío se intentó desde n8n con el texto breve acordado. No se crearon obligaciones, usuarios o digests ficticios en Supabase Cloud.

## Cambio publicado

- Workflow productivo: `MvcIvz2cHEe2jiCj`, **TaxSkill · Resumen diario · Evolution API**.
- Versión publicada y estado `Published` comprobados: **TaxSkill · Remitente TI · 19-10-2026**.
- Nodo proveedor: `TaxSkill · Evolution API`; endpoint **`https://n8n-evolution-api.ricijy.easypanel.host/message/sendText/TI`**.
- JSON de importación y [guía de producción](../../../integrations/n8n/produccion/README.md) actualizados. Se conservan contrato, webhook, deduplicación, receipts y programación. No se cambiaron los jobs de Supabase.
- Evolution Manager mostró la instancia **TI** en estado **Connected**. No se reinició ni desconectó ninguna instancia.

## Resultado observado

La comprobación directa previa con la clave facilitada en la conversación devolvió **401** al consultar conexión. No llegó a enviar. La copia temporal local de esa clave se retiró y no está en el repositorio.

Una vez restablecido el navegador, se preparó un flujo manual separado, sin webhook ni programación: **TaxSkill · Prueba única TI · 19-10-2026**, ID `xhK05cjKlbGdpqWr`. Guardado de ejecuciones manuales/exitosas/fallidas desactivado; sin reintentos automáticos. Se ejecutó su nodo de proveedor **una vez** con la credencial existente **TaxSkill · Evolution API**.

Respuesta: HTTP **404**, `The "TI" instance does not exist`. No hubo identificador de mensaje del proveedor ni evidencia de `sent`/`delivered`. El aviso verde de n8n «Node executed successfully» no acredita envío: el nodo conserva `Never Error` y expone el rechazo HTTP en su salida. No se repitió el POST.

La diferencia entre TI conectada en Manager y el rechazo del endpoint desde n8n exige comprobar la clave y su acceso a esa instancia. No se afirma una causa definitiva a partir del 404 ni se interpreta como desconexión. Evidencia mínima privada en `test-results/h08-whatsapp-ti-n8n-once.json`; capturas y contactos de la prueba no se publican.

## Continuación pendiente

Se dejó abierta la credencial en n8n, con cabecera `apikey` y dominio limitado al proveedor. El usuario debe introducir la clave vigente de **TI** en **Value** y guardar; la política del navegador exige intervención humana para cambios de credenciales. No se solicitará la clave por chat ni se copiará desde una sesión del proveedor a archivos del proyecto.

Después de guardar, realizar una nueva comprobación controlada. El intento anterior fue rechazado explícitamente; no fue una respuesta ambigua o un timeout de envío. Si el proveedor acepta el mensaje con ID, registrar `sent`; `delivered` requiere confirmación adicional. Al terminar, archivar el flujo manual mediante la opción recuperable de n8n. Actualmente permanece **sin publicar**, conservado para continuar la prueba; no es un job activo.

El recorrido productivo completo TaxSkill → digest → n8n → proveedor → receipt sigue pendiente. Este cambio de instancia no cierra OP08–OP09 ni H08. Ver [cierre de hitos](cierre-hitos.md), [aceptación funcional Docker](aceptacion-funcional-docker-h08.md) y [evidencias H08](h08.md).
