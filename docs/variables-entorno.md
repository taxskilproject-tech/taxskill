# Variables de entorno y archivo para Vercel

Organización consolidada el 18 de octubre de 2026 por indicación del usuario. Se retiraron los archivos `.env` separados por hito después de conservar y contrastar sus valores vigentes. No se rotaron las claves Supabase, HMAC, cifrado n8n ni recuperación local. Las credenciales ficticias antiguas de Cloud, cuyas cuentas ya habían sido eliminadas, no se trasladaron al bootstrap real.

## Archivos actuales

```text
.env.example                         # Plantilla vacía versionada
.env.local                           # Aplicación y pruebas: Supabase Docker
.env.vercel                          # Exportación privada para Vercel Production
.envs/                               # Privado e ignorado por Git
├── local/
│   ├── bootstrap.env                 # Identidad ficticia local
│   ├── edge.env                      # Edge y laboratorio de notificaciones
│   ├── n8n.env                       # Configuración del contenedor n8n local
│   └── recovery.env                  # Clave de copias del ensayo local
└── cloud/
    ├── application.env               # URL/credenciales/HMAC de la app real
    └── edge.env                      # Mantenimiento y transporte productivos
```

El bootstrap real usa `.envs/cloud/bootstrap.env` cuando el operador lo prepare; no se genera con una cuenta ficticia. No se creó un archivo de backup productivo con credenciales vacías: se prepara al elegir proveedor/destino. Los nombres de variables `H03_`, `H06_`, `H08_` se conservan donde forman parte de contratos ya implementados; sus archivos ya no se organizan por hito.

Next.js carga `.env.local` para desarrollo. `.env.vercel` y los archivos de `.envs/` no se cargan automáticamente: así una exportación productiva no cambia el destino Docker de las pruebas. Los scripts usan rutas compartidas en `scripts/constants/environment-files.ts`.

## Importación en Vercel

El archivo **`.env.vercel` de la raíz** contiene seis valores completos de la aplicación real:

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Cloud del proyecto real. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública de ese mismo proyecto. |
| `SUPABASE_SECRET_KEY` | Exclusivamente servidor/Auth Admin. |
| `IDEMPOTENCY_HMAC_KEY` | Clave existente de solicitudes administrativas; se conserva. |
| `APP_BASE_URL` | `https://taxskill.vercel.app`. |
| `N8N_RECEIPT_TOKEN` | Autenticación del receptor de resultados. |

En el proyecto Vercel, abrir **Settings → Environment Variables**, importar el contenido/archivo `.env.vercel` mediante la opción disponible y seleccionar **Production**. Conservar como secretas las tres variables privadas. Hacer un nuevo deployment para aplicar los valores; cambiar variables no actualiza deployments anteriores. [Referencia de Vercel](https://vercel.com/docs/environment-variables).

No utilizar estos valores productivos en previews de pruebas. El archivo contiene secretos reales y permanece ignorado por Git; se importa en la configuración privada del proyecto, sin subirlo como archivo público del sitio. Para regenerarlo después de una modificación deliberada de configuración privada:

```powershell
yarn env:vercel
```

El exportador no consulta Cloud ni cambia claves. Valida destino/clave pública, clave administrativa, HMAC y receipts y escribe únicamente las seis variables requeridas. La importación no aplica migraciones ni configura Auth/Storage/Supabase Edge.

## n8n y Edge

Production URL confirmada por el usuario:

`https://n8n-n8n.ricijy.easypanel.host/webhook/taxskill-whatsapp-digest`

Está guardada como `N8N_WEBHOOK_URL` en `.envs/cloud/edge.env`. Los secretos productivos de entrada, receipts y dispatch se prepararon en ese archivo con valores independientes. El 18/10/2026 se instalaron y comprobaron por huella en Supabase Edge `APP_BASE_URL`, `H03_PUBLIC_SUPABASE_URL`, `H06_DISPATCH_SECRET`, `N8N_WEBHOOK_URL` y `N8N_WEBHOOK_TOKEN`; se conservó `H03_CLEANUP_SECRET`. **Falta configurar sus contrapartes**: token entrante en Header Auth del Webhook; token receipts en Header Auth del nodo Receipt y en Vercel mediante `.env.vercel`; dispatch en el ejecutor autorizado cuando se habilite. Instalar secretos no activa la función, jobs ni mensajes. La clave Evolution permanece en su credencial de n8n, no en Vercel ni en el repositorio.

Para servir el entorno local, usar exclusivamente:

```powershell
supabase functions serve --env-file .envs/local/edge.env
```

El contenedor n8n local recibe `.envs/local/n8n.env`, no las claves de la aplicación o de backups. La clave de cifrado n8n existente se conserva en ese archivo. Los procedimientos activos se actualizaron; las evidencias históricas pueden mencionar nombres anteriores porque registran lo ejecutado en su fecha.

## Comprobaciones de la consolidación

Se contrastaron valores antes de retirar cada origen; se comprobaron las seis variables Vercel, su proyecto exacto, identidad con las claves Cloud conservadas, separación de tokens y destino Docker de `.env.local`. Esa consolidación fue local. La instalación remota posterior del 18/10/2026 comprende exclusivamente las cinco variables Edge indicadas arriba, comprobadas mediante SHA-256; Vercel y n8n siguen pendientes. No se imprimieron claves ni se enviaron mensajes.

Los respaldos y el estado completo de H08 se describen en [operación](operacion-produccion.md), [opciones económicas](respaldos-opciones.md) y [evidencias H08](hitos/evidencias/h08.md).
