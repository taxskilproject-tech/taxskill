# Workflow H06 · Resumen diario WhatsApp

Artefacto: [whatsapp-digest.workflow.json](whatsapp-digest.workflow.json). Contratos, estados y conciliación: [documentación H06](../../docs/actividades-notificaciones.md). Resultado de las pruebas: [evidencias](../../docs/hitos/evidencias/h06.md).

## Laboratorio reproducible

Requiere H02 local y sus perfiles, H03/Edge de archivos, Docker y la app local. Los scripts comprueban Supabase de TaxSkill en HTTP loopback 54331 **antes** de crear SDK, leer fixtures o solicitar escrituras. No usar Cloud.

```powershell
yarn env:local
yarn h06:setup
```

El setup genera `.env.h06-operations.docker.local`, `.env.h06-n8n.docker.local` y los archivos ignorados `test-results/local/h06-runtime/{credentials,workflow}.json`. Preserva los secretos en reintentos. El token de receipts se agrega a `.env.local`; reiniciar/compilar Next.js después de configurarlo.

El laboratorio se verificó con imagen oficial `docker.n8n.io/n8nio/n8n:2.0.0`, limitada a loopback y credenciales ficticias. Es una versión del laboratorio, no una selección productiva; H08 debe fijar una versión vigente compatible y verificar sus actualizaciones.

```powershell
$h06N8nData = (Resolve-Path test-results/local/h06-n8n).Path
docker run -d --name tax-skill-h06-n8n -p 127.0.0.1:5679:5678 --env-file .env.h06-n8n.docker.local --mount "type=bind,source=$h06N8nData,target=/home/node/.n8n" docker.n8n.io/n8nio/n8n:2.0.0
docker cp test-results/local/h06-runtime/credentials.json tax-skill-h06-n8n:/tmp/h06-credentials.json
docker exec tax-skill-h06-n8n n8n import:credentials --input=/tmp/h06-credentials.json
docker cp test-results/local/h06-runtime/workflow.json tax-skill-h06-n8n:/tmp/h06-workflow.json
docker exec tax-skill-h06-n8n n8n import:workflow --input=/tmp/h06-workflow.json
yarn h06:publish:local
```

Si el contenedor ya existe, usarlo con `docker start tax-skill-h06-n8n`; no crear otro ni borrar su directorio. `publish-h06-local.ts` crea exclusivamente el propietario ficticio de esta instancia local y guarda su credencial en archivo ignorado; autentica, guarda una versión y la publica por REST. Esto evita el fallo de historial de versión de la importación CLI de esa versión de n8n. No imprime cookies ni claves.

En terminales independientes:

```powershell
supabase functions serve --env-file .env.h06-operations.docker.local
yarn tsx scripts/fixtures/h06-provider.ts
yarn build
yarn start -p 3001
```

Si Turbopack no puede iniciar el proceso PostCSS en Windows, la opción oficial `yarn build --webpack` también se verificó. No cambiar fuentes/CSS para compensar ese fallo del proceso.

```powershell
yarn test:h06:sql
yarn test:h06:live
```

La integración crea adicionales de empresa e internas y reutiliza el recorrido H03 de archivos. Simula 429/500, respuesta perdida, timeout HTTP, timeout/fallo del proveedor, callbacks repetidos/desordenados y reinicia realmente **solo** `tax-skill-h06-n8n`. El script espera su readiness y registro del webhook; después compara el contador del proveedor. Al final verifica un resumen generado por Cron local. Evidencias sin secretos en `test-results/local/h06-evidence.json`.

Puertos: Next 3001, Supabase 54331, n8n 5679, proveedor/proxy de fallos 5680. El proveedor escucha en la interfaz del host para permitir la conexión desde Docker y exige Bearer ficticio; solo trabaja con las identidades locales creadas por el script. Su estado no guarda teléfonos/texto, solo UUID, contador y evidencia mínima. No comunica con un proveedor externo.

## Configurar un entorno real en H08

El JSON versionado contiene dominios `.invalid` e identificadores de credenciales sin claves. Importarlo crea un workflow inactivo. Configurar credenciales Header Auth entrante, Supabase RPC de sistema, adaptador del proveedor y callback con un secreto diferente. Sustituir los tres dominios por destinos HTTPS reales autorizados, validar contrato/plantilla y publicar solo después de la comprobación productiva.

Cadena: Webhook → separar digests → claim durable → proveedor solo si `send=true` → normalizar evidencia → guardarla → receipt → `{accepted:true}`. Un replay recupera la evidencia y omite proveedor. No habilitar `retryOnFail` en el nodo del proveedor; la ambigüedad se concilia según el procedimiento de H06.

Ejecuciones exitosas/fallidas no guardan payloads completos por defecto; no registrar cabeceras, teléfonos ni textos en logs. Usar IDs, estados y conteos. Los secretos pertenecen a las credenciales de n8n, nunca a nodos Code o al JSON del repositorio.

Referencias primarias: [Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/), [HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/), [Code](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/).
