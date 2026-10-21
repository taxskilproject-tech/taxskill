# Operación, despliegue y recuperación · H08

Consultar [seguridad](seguridad-produccion.md), [desarrollo local](desarrollo.md), [H08](hitos/h08-preparacion-produccion.md) y [evidencias](hitos/evidencias/h08.md). Este runbook entrega procedimientos; las dependencias externas sin comprobar mantienen H08 abierto.

La [organización de variables y exportación Vercel](variables-entorno.md) reemplaza los antiguos `.env` por hito. El webhook productivo publicado es `https://n8n-n8n.ricijy.easypanel.host/webhook/taxskill-whatsapp-digest`. Variables Edge instaladas, huellas contrastadas y ambas funciones publicadas; cuatro credenciales separadas n8n guardadas y vinculadas. Respaldo temporal en Supabase Storage por decisión del usuario; las [opciones externas](respaldos-opciones.md) se conservan para después.

**Publicación comprobada:** siete migraciones H08 en Cloud; 64 versiones, 29 tablas públicas con RLS, 13 huellas históricas idénticas durante la publicación y lint remoto sin errores. Con autorización posterior se aplicó Auth, se publicaron documentos v5/notificaciones v1 y se creó al administrador real Josmel. Vercel desplegó `2618846` en Production con estado **Ready** y login visible en el dominio real; n8n publicó la versión **H08 · Canal autenticado TaxSkill**. Peticiones sin credenciales: Edge/receipts **401**, webhook n8n **403**. No se crearon datos ficticios ni jobs nuevos. Ver [estado y dependencias](hitos/evidencias/cierre-hitos.md).

## Recursos y configuración

Destino real Supabase: `gzwrqvqofcrdjvzoblaz`. Dominio HTTPS comprobado: `https://taxskill.vercel.app`, con redirección a `/login`. Falta el recorrido autenticado por perfiles en ese despliegue; ver la [evidencia](hitos/evidencias/h08.md). Todos los fixtures, seeds y pruebas SQL/integración permanecen en Docker. Preview necesita otro proyecto Supabase y variables independientes; no apuntarlo a producción para pruebas.

| Ejecutor | Configuración privada/pública necesaria |
|---|---|
| Navegador/Vercel | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, compiladas para ese entorno. |
| Servidor Vercel | `SUPABASE_SECRET_KEY`, `IDEMPOTENCY_HMAC_KEY`, `APP_BASE_URL`, `N8N_RECEIPT_TOKEN`. |
| Edge documentos | Secretos de servicio gestionados por Supabase, `H03_PUBLIC_SUPABASE_URL`, `H03_CLEANUP_SECRET`. |
| Edge notificaciones | `APP_BASE_URL`, `H06_DISPATCH_SECRET`, `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_TOKEN`. |
| n8n | Credenciales de entrada, RPC de servicio, Evolution y receipts, separadas. Remitente en Evolution. |
| Copias independientes | `SUPABASE_SECRET_KEY`, `H08_DATABASE_URL`, `H08_DATABASE_CA_CERT`, `H08_BACKUP_S3_URI`, `H08_BACKUP_ENCRYPTION_KEY` e identidad AWS limitada al prefijo autorizado. |
| Copia temporal Supabase Storage | `H08_BACKUP_DESTINATION=supabase-storage`, servicio Cloud, conexión DB/CA y clave de cifrado. No requiere AWS ni `H08_BACKUP_S3_URI`. |
| Monitor | URL del entorno, servicio privado y `H08_OPERATION_ORGANIZATION_ID`. |

No compartir valores por chat, Git o capturas. Guardar cifrado y clave de recuperación en custodias distintas. Los contactos destinatarios ya se configuran en **Usuarios → detalle → Contacto para resumen WhatsApp**; no se crea otro directorio ni se incrustan en el workflow. La clave Evolution proporcionada se guardó únicamente en la credencial privada n8n limitada al dominio del proveedor.

## Publicación compatible

1. Registrar commit, responsable de cambio, ventana y destino. Tener copia DB/objetos externa comprobada y acceso administrativo del operador.
2. Ejecutar en Docker: `yarn verify`, `yarn build`, `yarn check:bundle`, SQL e integración pertinente. Comprobar actualización desde H07 y una instalación limpia. Nunca ejecutar `db reset` remoto.
3. Revisar `supabase migration list --linked` y `supabase db push --linked --dry-run`: deben incluir exclusivamente las siete migraciones H08 `20261018002635` a `20261018005700`. Si aparece otra migración, detener y resolver el inventario antes de publicar.
4. Aplicar el paquete revisado mediante CLI al proyecto real. Revoca admisiones anteriores: los usuarios necesitan login nuevo. No ejecutar seeds, fixtures o borrados de historia.
5. Configurar Auth Cloud: registro público/anónimo desactivado; mínimo 12 caracteres; cuentas confirmadas por Admin; Custom Access Token=`public.h08_access_token_hook`; Send Email=`public.h08_block_auth_email`. `config.toml` solo no modifica Auth remoto. El subconjunto declarativo está en `supabase/config.production.toml`: copiarlo a un workdir CLI aislado, revisar `supabase config diff --project-ref gzwrqvqofcrdjvzoblaz --workdir <directorio>` y aplicar únicamente tras autorización pendiente con `supabase config push` sobre ese workdir. No copiar toda la configuración Docker a Cloud. Conservar las opciones remotas no declaradas, incluida MFA. Comprobar que el hook es efectivo y no solo visible como configuración.
6. Desplegar funciones `document-operations` y `notification-operations` con verificación propia de JWT/servicio, secretos separados y buckets privados. Revisar límites de plan y de buckets antes de ampliar tamaño; base funcional 20 MB por archivo configurable.
7. Instalar variables Vercel, ejecutar build Yarn y publicar el commit compatible. Verificar login autorizado, contexto, carga, revisión y descarga usando datos reales expresamente autorizados. Conservar evidencia mínima, nunca documentos personales en Git.
8. Instalar/importar n8n según [guía Evolution](../integrations/n8n/produccion/README.md). Comprobar replay/receipt y un destinatario autorizado antes de habilitar avisos automáticos.
9. Completar copia independiente real, ensayo de restauración de esa copia y registro operativo con hash real. Solo entonces activar generación y avisos. Ejecutar piloto por perfiles y aceptación del responsable de producto.

No hay una migración que active jobs o proveedores. `h08_schedule_generation(true)` exige una copia correcta de menos de 24 horas y una recuperación de menos de 30 días. Ese registro acredita un ensayo ejecutado, no permite inventar evidencia para saltar el control.

## Respaldo DB y archivos

**Destino temporal confirmado:** Supabase Storage del mismo proyecto, bucket privado `system-backups`. No equivale a una copia independiente. La elección aplaza el proveedor externo, conservando cifrado y verificación de restauración. Tras conservar los intentos fallidos y corregir CA/rol de conexión, se completó la copia real **ffe0c353-a303-4499-8189-57dbd8362eeb** y su descarga/restauración aislada: 64 migraciones, 13 huellas coincidentes y login nuevo correcto en **54,38 s**. Registro de recuperación **c0753bb3-d484-4d96-95cd-b323dd89a606**. Cero documentos actuales; no es medición de RTO al volumen objetivo. Se mantuvo `verify-full` y no se activaron jobs. [Evidencia](hitos/evidencias/h08.md).

Ejecutor independiente con Node 22, Yarn 1.22.22, Docker y AWS CLI. PostgreSQL se ejecuta con imagen compatible 17.11.0.003. Usar conexión directa Supabase o pooler **session** puerto 5432, del proyecto exacto; no transaction pooler 6543. Descargar la CA desde la configuración del proyecto, guardarla como archivo y usar `H08_DATABASE_CA_CERT`: el contenedor monta la CA de solo lectura y exige TLS `verify-full`.

```powershell
# Desarrollo: únicamente Docker principal; falla si hay versiones sin bytes.
yarn backup:local

# Producción: solo con todas las variables y custodias del ejecutor listas.
yarn backup:cloud
```

La copia contiene dump de datos de negocio, `auth.users`, `auth.identities` y registro técnico de recuperación. El esquema se reconstruye mediante las migraciones exactas. No copia sesiones/refresh tokens Auth ni secretos de Vault/configuración n8n; conservar la configuración de plataforma y las credenciales en su custodia independiente. Estos componentes también se reinstalan al recuperar, sin recuperar sesiones abiertas.

Cada archivo/manifiesto/DB se cifra con AES-256-GCM, IV aleatorio y tag autenticado. El manifiesto v1 contiene fecha, origen, versiones de migraciones, SHA-256 del dump y objetos confirmados con bucket/ruta/tamaño/MIME/SHA-256. Ningún backup se marca correcto si falta un objeto o difieren bytes/hash.

En Cloud, los objetos se conservan por hash y versión de clave: solo los nuevos requieren transferencia. Una reutilización comprueba existencia/tamaño cifrado; la restauración descifra y verifica el hash íntegro. El dump representa su snapshot PostgreSQL; pueden copiarse objetos confirmados durante el inventario posterior además de los de ese snapshot. Los finales son inmutables: no autorizar purgas físicas durante copias. No ejecutar migraciones en paralelo a un respaldo.

S3 utiliza prefijo `runs/<id>/` para dump/manifiesto y `objects/<key-id>/<sha256>.enc` para archivos compartidos. Cifrado adicional S3 SSE y cuenta/bucket independiente del proyecto Supabase. El registro de éxito se escribe después de terminar la copia externa. Conservar versionado/recuperación del bucket y acceso del escritor sin permiso de borrado cuando sea posible.

Con `supabase-storage` se usan esos mismos prefijos dentro de `system-backups`, servicio únicamente, `upsert:false` y cifrado AES-256-GCM local antes de subir. El bucket admite objetos cifrados `application/octet-stream` hasta 50 MB; si DB u objeto supera el límite efectivo, la copia falla explícitamente y debe ampliarse el plan o adaptar el particionado. No se presenta una copia parcial como correcta. No borrar el bucket ni aplicar caducidad a objetos compartidos por hash.

La CA pública enlazada en **Supabase → Database → Settings → SSL Configuration** se guardó en `.envs/cloud/supabase-ca.crt` y se comprobó como `Supabase Root 2021 CA`. Sirve para verificar la identidad del servidor de respaldo y rechazar intermediarios; no es una contraseña. Completar conexión session/directa y ruta CA en la configuración privada. El cliente acepta `postgres` y la identidad temporal `cli_login_postgres` del CLI, únicamente para el proyecto autorizado, puerto 5432 y base `postgres`. Usa `SET ROLE postgres` en la consulta de migraciones y `--role=postgres` en el dump, conforme al comando generado por el CLI; el pooler no aplica necesariamente `PGOPTIONS`. Una credencial temporal no sustituye la identidad de una programación permanente. [Verificación SSL oficial](https://supabase.com/docs/guides/platform/ssl-enforcement).

```powershell
# Variables explícitas del entorno real, sin cambiar .env.local (Docker).
node --env-file=.envs/cloud/application.env --env-file=.envs/cloud/recovery.env --import tsx scripts/backup.ts --cloud

# Descargar DB, manifiesto y objetos; verifica tag, tamaño y SHA-256.
node --env-file=.envs/cloud/application.env --env-file=.envs/cloud/recovery.env --import tsx scripts/fetch-backup.ts <uuid-del-respaldo>
```

`backup:fetch` no exige una conexión DB disponible: descarga vía Storage y prepara una carpeta local completa para `restore:local`. Rechaza UUID, origen, manifiesto, clave o integridad incorrectos y no sobrescribe una descarga existente. El workflow de copias omite AWS/OIDC con `H08_BACKUP_DESTINATION=supabase-storage`; continúa desactivado hasta configurar secretos/CA y verificar la copia real.

Objetivos iniciales: diario, RPO 24 h, RTO 8 h, retención 30 días. Configurar retención de `runs/` según política real y custodiar sus claves. **No aplicar expiración de 30 días a objetos compartidos**: una versión antigua puede seguir referenciada por un manifiesto vigente. Hasta implementar y verificar un recolector que contraste manifiestos retenidos, conservar `objects/` sin expiración automática. Rotar clave crea otro prefijo; conservar claves anteriores mientras existan copias dependientes. Destino, coste, Object Lock/versionado, retención efectiva y eliminación eventual requieren validación del operador; no se dan por configurados con este documento.

`.github/workflows/backup.yml` prepara ejecución diaria 07:00 UTC (02:00 Lima) con OIDC AWS y secrets del environment `production`. Solo funciona si `H08_BACKUP_ENABLED=true`; necesita rol/región/prefijo configurados, CA y secretos. No se activa desde este cambio. Las acciones están fijadas por commit. El resultado fallido debe tener un responsable que reciba y atienda las alertas del repositorio.

## Restauración aislada

```powershell
# Ensayo completo con PDF ficticio real, sin datos remotos.
yarn test:h08:recovery
```

El ensayo crea DOS proyectos nuevos: fuente API 54551/DB 54552/inspector 8186 y destino API 54561/DB 54562/inspector 8187. Copia migraciones y dependencias Edge, prepara un PDF con carga/validación/aprobación real, respalda, instala un destino vacío y ejecuta SQL de regresión antes de restaurar. Termina deteniendo únicamente esos proyectos y conserva sus volúmenes; no toca otros proyectos Docker. Reservar esos puertos antes del ensayo.

La restauración rechaza Cloud y la base principal. Exige contenedor `supabase_db_tax-skill-h08-restore-*`, API loopback 54561, tablas de estudio/Auth vacías y lista exacta de migraciones. Descifra/verifica **todo** antes de escribir; restaura transaccionalmente y solo en ese destino temporal permite desactivar triggers de carga de datos. Después comprueba FK por anti-joins, revoca admisiones, elimina sesiones Auth del destino y desprograma jobs. Crea buckets privados, restaura bytes sin sobrescribir y verifica descarga/hash de cada objeto.

Para una copia Cloud descargada, usar `scripts/restore-local.ts` con su carpeta cifrada, clave y destino aislado preparado; los argumentos exactos se muestran al ejecutar sin parámetros. Recupera los objetos compartidos desde el S3 configurado. No apuntar nunca a producción para hacer un ensayo. Antes de promover una recuperación real: reinstalar secretos/configuración, verificar último snapshot y pérdida de datos respecto al RPO, conciliar digests `unknown` y habilitar jobs únicamente mediante cambio controlado.

Las fixtures de capacidad H07 contienen metadatos sintéticos sin bytes Storage. Una copia íntegra de esa base debe fallar ante esos objetos ausentes. El ensayo H08 usa una fuente nueva con bytes reales; no borra ni reescribe las fixtures/historia para simular una copia correcta. Su duración pequeña no acredita un RTO productivo para 30 empresas; repetir con volumen real y copia externa antes de aceptar publicación.

## Programación y monitoreo

La [segunda remediación](hitos/evidencias/correcciones-auditoria-2-2026-10-20.md) añade preparación acotada: `h06_prepare_digests` conserva URL/fecha/momento y admite `p_organization_id` opcional y `p_batch_size` de **1 a 10**, por defecto **5**. Solo servicio puede ejecutarla. Rota estudios por último intento y conserva cursor por fecha/destinatario en `private.h06_digest_progress`. Una vuelta completa permite recoger nuevos destinatarios o contactos corregidos en el mismo día. Antes de preparar, caduca como máximo **100** resúmenes antiguos no aceptados por llamada; `accepted` y `unknown` mantienen sus reservas.

La consulta calcula permisos una vez por empresa/módulo y agrega únicamente las obligaciones del destinatario. La validación de payload congelado reutiliza esos mismos hechos autorizados, sin cambiar contenido ni omitir la comprobación de permisos. Un fallo de destinatario queda registrado y no revierte a sus vecinos. Un fallo de RPC en avisos o preparación permite intentar el despacho de otros resúmenes durables; Edge devuelve degradación HTTP 503 si hay fallos, aunque ese despacho haya avanzado.

El panel de Configuración muestra el diagnóstico común del monitor, errores de automatización y últimos avances de generación, avisos y preparación. Por defecto evalúa producción y exige los tres jobs. «Prepublicación declarada» es una elección explícita de evaluación en esa pantalla: **no activa/detiene jobs ni persiste configuración** y no se presenta como producción saludable. El monitor permanente conserva su configuración privada `H08_OPERATION_MODE`; la selección de pantalla no la cambia. La fecha del diagnóstico corresponde al snapshot consultado; Actualizar estado vuelve a pedirlo con loading y error reales.

Generación: `h08-generation` se ejecuta cada minuto, con lock y lotes acotados; por estudio comienza a partir de 00:05 Lima y continúa trabajo pendiente sin duplicar. Reemplaza los tres programadores anteriores. Resumen: conservar el ejecutor H06, avisos internos y digest elegible después de 09:00 Lima; un resumen vacío no se envía. Cleanup de staging usa secreto propio y exclusivamente rutas vencidas; nunca elimina finales históricos.

La [corrección de auditoría](hitos/evidencias/correcciones-auditoria-2026-10-20.md) selecciona un estudio por tick según su último intento y pasa IDs de regla/etapa a sus motores. Procesa hasta 100 destinos por motor y registra avance, pendiente y fallo; un `pending` laboral con `error_code` conserva el error y no acredita avance. La rotación evita que un estudio fallido monopolice los siguientes turnos.

`h06_run_deadlines` conserva `p_today` y admite `p_organization_id` opcional de servicio y `p_batch_size` de 1 a 250, por defecto 100. Cada llamada procesa una página con cursor durable por estudio/fecha. Las llamadas automáticas rotan entre estudios; `has_more` permite continuar, y una vuelta terminada reinicia el cursor para recoger cambios e inserciones posteriores. Las incidencias estables sin responsable se omiten antes de ejecutar validadores costosos. Se conservan las claves de eventos y los umbrales 7/3/1/0/-1. Nunca interpretar una página completada como aceptación de todos los estudios.

El progreso vive en `private.h08_generation_progress` y `private.h06_deadline_progress`, con RLS y sin acceso de navegador. Son estados técnicos reconstruibles, no nuevas tablas de tareas ni historia documental: tras restauración empiezan vacíos y los identificadores existentes impiden duplicar documentos/avisos. Si falla una página de avisos, Edge intenta preparar/despachar otros resúmenes elegibles y comunica degradación, sin ocultar el fallo. Las migraciones correctivas no activan jobs.

El administrador consulta **Configuración → Operación**: intenciones estancadas, validaciones rechazadas recientes, reglas fallidas, responsables inválidos, WhatsApp fallido/incierto, copia más reciente y estado/último inicio de jobs. Actualizar muestra loading contextual y error explícito. No muestra comandos cron, claves ni cuerpos privados.

`yarn ops:check --local|--cloud` consulta el mismo RPC y devuelve contadores/estados mínimos. Sale con error por incidencias, backup vencido, ausencia de jobs o ejecución fallida/atrasada: 30 minutos para continuaciones, 90 para cleanup horario y 26 horas para el inicio diario legado mientras aparezca. `.github/workflows/monitor.yml` prepara revisión cada 15 minutos, opt-in `H08_MONITOR_ENABLED=true`; no sustituye un proveedor de alertas ni confirma que alguien reciba notificaciones. Configurar responsable y comprobar una alerta real antes del piloto.

El monitor exige los nombres `h08-generation`, `h06-notifications-dispatch` y `h03-staging-cleanup`; un cleanup sano no compensa la ausencia de generación o avisos. Evalúa además fallos técnicos y trabajo pendiente sin avance durante más de 30 minutos. `H08_OPERATION_MODE=production` es el valor predeterminado. Solo durante una suspensión deliberada puede usarse `prepublication`: exige cleanup, conserva alertas por incidencias y reporta `paused`, nunca `healthy`. Esta variable pertenece al ejecutor/GitHub environment, no a Vercel ni al navegador. No usar ese modo para ocultar una avería en operación real.

| Incidente | Diagnóstico y resolución |
|---|---|
| Generación fallida/atrasada | Revisar último inicio/resultado y cursor de regla; corregir configuración/responsable, repetir lote por servicio. Conservar ocurrencias/idempotencia y snapshot histórico. |
| Intención sin finalizar | Consultar estado, vencimiento y lease; repetir finalización autorizada si corresponde. Si objeto final ya existe, reconciliar hash; nunca sobrescribirlo para ocultar un conflicto. |
| Archivo rechazado | Mostrar formato/tamaño/motivo sanitizado; cargar versión nueva válida. No marcarlo confirmado desde SQL manual. |
| Responsable inválido | Reasignar con permisos actuales mediante UI/RPC. Ser responsable histórico no concede acceso ni debe modificarse para disfrazar una revocación. |
| WhatsApp `unknown` | Buscar `delivery_id` y referencia del proveedor; conciliar evidencia/receipt. No repetir envío ciegamente ni marcar `delivered` con HTTP 202. |
| Backup ausente/fallido | Revisar acceso, CA, espacio, objeto/hash y destino S3. No registrar éxito manual; repetir copia y verificar recuperación. |
| Denegaciones anómalas | Correlacionar hora/recurso/request_id y logs sanitizados de Vercel/Supabase. Revisar concesiones/sesiones. No agregar políticas permisivas o imprimir JWT para diagnosticar. |
| Despliegue fallido | Mantener jobs detenidos, aplicar corrección compatible y volver al frontend anterior solo si su contrato sigue siendo válido. No revertir/borrar datos nuevos. Restauración requiere evaluación de pérdida y aprobación del cambio. |

El operador registra incidente, entorno, commit, tiempos, IDs de correlación y resolución, sin teléfonos, tokens, salarios, diagnósticos o archivos personales. Responsables nominales, guardias, comprobación de alertas, piloto y aceptación formal siguen pendientes hasta designación del equipo.

Referencias: [conexiones PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [backups de Supabase](https://supabase.com/docs/guides/platform/backups), [workflow Evolution](../integrations/n8n/produccion/README.md).
