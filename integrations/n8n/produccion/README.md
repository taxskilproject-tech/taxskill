# Importación en n8n · TaxSkill y Evolution API

Importar [taxskill-whatsapp-evolution.workflow.json](taxskill-whatsapp-evolution.workflow.json) desde **Import from File**. El workflow se entrega inactivo, sin claves ni contactos incrustados. Requiere los RPC H06 existentes y el receptor de receipts desplegado en Vercel.

Esta variante y el workflow genérico usan el mismo path: activar solamente uno en producción. Hay un único nodo Webhook de entrada. `Acknowledge batch` responde a esa misma solicitud; no es otro endpoint. Solo `Evolution API` envía mensajes; los HTTP a Supabase y TaxSkill controlan duplicados y resultados.

## Configuración

Production URL proporcionada por el usuario: `https://n8n-n8n.ricijy.easypanel.host/webhook/taxskill-whatsapp-digest`. La configuración privada está en `.envs/cloud/edge.env`; `.env.vercel` incluye el token de receipts coincidente que debe instalarse también en el nodo Receipt. Ver [variables por ejecutor](../../../docs/variables-entorno.md). No se han probado envíos reales con esta URL.

1. Seleccionar en **Webhook** una credencial **Header Auth**: cabecera `Authorization`, valor `Bearer <N8N_WEBHOOK_TOKEN>`. Ese mismo secreto se configura en el ejecutor Edge de TaxSkill; no es la clave de Evolution.
2. En **Claim delivery** y **Store provider evidence**, seleccionar la credencial **Custom Auth** para Supabase de este proyecto. Usar una clave administrativa exclusivamente de servidor; no una clave pública. Para una clave JWT `service_role`, el JSON de la credencial es `{"headers":{"apikey":"<service_role JWT>","Authorization":"Bearer <service_role JWT>"}}`. No pegar ese JSON con valores reales en el repositorio. Con una clave nueva `sb_secret_…`, configurar `apikey` y comprobar su autorización según la configuración del gateway.
3. En **Evolution API**, seleccionar una credencial **Header Auth** con nombre de cabecera `apikey`. Guardar ahí la clave del proveedor. El endpoint utiliza la instancia `botcci` indicada por el usuario; editar solamente el endpoint si se elige otra instancia.
4. En **Receipt**, seleccionar otra credencial **Header Auth**: cabecera `Authorization`, valor `Bearer <N8N_RECEIPT_TOKEN>`, independiente del token entrante. Instalar su mismo valor en las variables privadas de Vercel.
5. Verificar el dominio `https://taxskill.vercel.app`, publicar el workflow y copiar la **Production URL** del Webhook. Configurar esa URL como `N8N_WEBHOOK_URL` en el ejecutor Edge. La URL de prueba de n8n no es el destino de producción.

Los destinatarios se administran en **Usuarios → detalle → Contacto para resumen WhatsApp**, en formato internacional, por ejemplo `+51` seguido del número peruano. El teléfono se mantiene como texto y no se antepone `51` otra vez. Vaciarlo desactiva WhatsApp y conserva los avisos internos. El remitente permanece configurado en Evolution/n8n.

## Qué hace

TaxSkill envía `whatsapp.digest.batch` versión `1.0`, zona `America/Lima`, con hasta 50 resúmenes no vacíos. El workflow reclama cada `delivery_id` en Supabase antes de responder HTTP 202 con `accepted:true`. Después continúa el envío y registra el resultado. Esa respuesta acredita recepción del lote, no entrega por WhatsApp.

Solo una reclamación durable con `send=true` llama a Evolution. Un reintento recupera la evidencia anterior y omite el envío. No se usa memoria estática ni Google Sheets para controlar duplicados. No habilitar reintentos automáticos en el nodo del proveedor.

El mensaje incluye empresa, actividad, motivo del aviso, plazo y enlace a TaxSkill. No incluye archivos, remuneraciones ni diagnósticos. El cuerpo de Evolution usa `number`, `text` y `delay:4000`; no contiene la clave.

Una respuesta HTTP 2xx con `key.id` registra `sent`: Evolution aceptó un envío identificable. **No se registra `delivered` a partir de esa respuesta.** El resultado incierto o un timeout se conserva como `unknown`; un rechazo explícito se registra como `failed`. Confirmar entrega requiere evidencia posterior del proveedor y su conciliación mediante el contrato de receipts. No reenviar ciegamente un `unknown`.

El workflow desactiva el guardado de payloads de ejecuciones exitosas/fallidas y el guardado de progreso. Proteger también el acceso al editor y la retención operativa de n8n; no compartir capturas con tokens, teléfonos o textos.

## Verificación antes de activar los avisos

Comprobar primero importación/credenciales y el contrato con un destinatario de prueba expresamente autorizado. Probar replay del mismo `delivery_id`, error del proveedor y receipt repetido: no debe producir otro envío. La entrega de este archivo no acredita que el workflow esté instalado o que se haya enviado un mensaje real.

Referencias: [contrato y laboratorio](../README.md), [Actividades/notificaciones](../../../docs/actividades-notificaciones.md), [H08](../../../docs/hitos/h08-preparacion-produccion.md), [Webhook de n8n](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) y [Evolution API](https://doc.evolution-api.com/).
