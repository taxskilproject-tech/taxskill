# Corrección de entornos y datos ficticios

**Fecha:** 15 de octubre de 2026. **Instrucción confirmada:** el proyecto Supabase Cloud compartido por el usuario es para la aplicación real. Todos los datos ficticios, seeds y pruebas SQL/integración corresponden exclusivamente a Supabase local sobre Docker.

**Estado actual:** limpieza de fixtures de Cloud completada y verificada. Se conservaron esquema, migraciones, controles de historial y buckets privados. Ver sección 6.

## 1. Corrección

Se clasificó incorrectamente `gzwrqvqofcrdjvzoblaz` como proyecto de desarrollo. Las verificaciones H02/H03 introdujeron allí datos ficticios. Sus resultados históricos y capturas se conservan con esa aclaración; no son evidencia de haber ejecutado Docker ni autorizan más pruebas en Cloud.

La corrección inicial únicamente hizo inventario y detuvo el servidor local conectado a Cloud. Posteriormente el usuario solicitó eliminar las fixtures y autorizó expresamente la excepción temporal necesaria para su historia inmutable. La limpieza de la sección 6 sí retiró esos datos, conservando las migraciones.

## 2. Protección implementada

- `yarn dev`, `yarn seed:demo`, `yarn test:h02:live` y `yarn test:h03:live` rechazan destinos Cloud antes de iniciar el recorrido. Solo admiten HTTP con host loopback y puerto 54331, sin credenciales, ruta, query ni fragmento.
- `yarn test:h02:sql` y `yarn test:h03:sql` fuerzan `--local`, seleccionan archivos conocidos y rechazan argumentos adicionales; no existe una excepción para ejecutar fixtures en Cloud.
- `yarn db:lint` y `yarn db:types` usan local por defecto. `db:lint:cloud` es una comprobación explícita de funciones sin fixtures; `db:status` consulta el historial remoto sin aplicar cambios.
- `yarn env:local` lee las claves del contenedor sin imprimirlas y conserva la configuración Cloud previa en `.env.cloud.local`. Si Docker/Supabase local no están disponibles, no escribe `.env.local`.
- Las credenciales ficticias de Docker se guardan en `.env.h02-demo.docker.local`; los resultados y otras cuentas, en `test-results/local/`. La limpieza de Edge local usa `.env.h03-operations.docker.local`. No se reutilizan credenciales históricas de Cloud.
- El adaptador administrativo admite `service_role` legado solo con la URL local permitida, para compatibilidad con las claves del CLI local. Cloud conserva el requisito de su clave secreta de servidor.
- `AGENTS.md` registra esta separación como regla obligatoria. Las instrucciones históricas que indicaban sembrar el Cloud fueron corregidas en la [guía de desarrollo](../../desarrollo.md).

## 3. Inventario remoto de lectura

Consulta limitada a las cinco cuentas `*.h02@example.test` conocidas, las dos empresas con RUC ficticio y nombre exacto de demostración, y las reglas `PDT demostracion H03` ligadas a ellas. Los IDs se conservan localmente en `test-results/cloud-fixture-inventory.json`, excluido de Git.

| Recurso identificado | Cantidad |
|---|---:|
| Cuentas Auth de demostración | 5 |
| Empresas de demostración H02 | 2 |
| Reglas documentales de demostración H03 | 3 |
| Obligaciones de esas reglas | 3 |
| Posiciones de esas obligaciones | 6 |
| Versiones documentales confirmadas | 8 |
| Ciclos de entrega | 10 |
| Decisiones de revisión | 9 |

En el estudio consultado no aparecieron otras empresas ni membresías ajenas a las cuentas conocidas. Eso no afirma que otros recursos/proyectos estén vacíos. El inventario no es un script de borrado: existen además relaciones, permisos, operaciones, auditoría, notificaciones y objetos de Storage que deben delimitarse antes de una limpieza. No eliminar todo el proyecto, vaciar tablas ni deshacer el esquema para quitar estos datos.

**Inventario histórico:** estos datos existían al terminar la corrección inicial. El usuario solicitó después su eliminación. Las fixtures identificadas ya se retiraron físicamente; consultar la verificación de la sección 6.

## 4. Estado local y continuidad

El 16 de octubre de 2026 se recuperó el motor Linux: el arranque fallaba por un socket temporal inaccesible de Docker. Se apartó únicamente la carpeta runtime que lo contenía; se conservaron imágenes, volúmenes y otros proyectos. Docker respondió y Supabase TaxSkill quedó disponible con puertos propios. Ver [diagnóstico y validación local](validacion-local-h02-h03.md).

La secuencia `db:local:start` → `env:local` → migraciones locales → `seed:demo` → servidor/pruebas H02/H03 ya se ejecutó. Next.js se recompiló con las variables locales; la configuración real previa se conservó en `.env.cloud.local`. No se usó Cloud como alternativa.

Se completaron la base nueva con 19 migraciones y la actualización H02 → H03 con datos conservados. SQL H02/H03 y ambos recorridos de integración pasaron en Docker; H03 registra 59 comprobaciones. Las migraciones ya aplicadas en Cloud se conservan. RLS y controles de publicación mantienen su etapa H08.

## 5. Verificaciones de la corrección

Los resultados siguientes describen la corrección inicial, antes de recuperar Docker. La [repetición local del 16 de octubre](validacion-local-h02-h03.md) resolvió sus pendientes y pasó 111 pruebas en 18 archivos, compilación, lint SQL y las integraciones locales.

- `yarn verify`: TypeScript, ESLint, arquitectura y 102 pruebas en 17 archivos correctos; incluye destinos remotos, URLs ambiguas y clave administrativa local.
- `yarn build` y `yarn check:bundle`: correctos. La compilación no ejecutó integración ni se volvió a servir como demostración contra Cloud.
- Con la configuración Cloud existente, `dev`, `seed:demo`, `test:h02:live` y `test:h03:live` terminaron rechazados por el bloqueo local antes de iniciar sus recorridos. Son rechazos esperados, no pruebas funcionales de integración.
- `test:h02:sql --linked` rechazó el argumento remoto antes de invocar el CLI; el runner común de H02/H03 admite exclusivamente `--local`.
- `env:local` y `db:local:start` no pudieron completar por el motor Docker no disponible. No se cambiaron credenciales de Cloud, no se insertaron nuevas fixtures remotas y no se declara completada la integración local.

## 6. Limpieza solicitada y estado actual

El usuario autorizó retirar los datos ficticios del Cloud. Se volvió a comprobar la identidad del estudio, las cinco cuentas, las dos empresas y las relaciones. Todos los objetos de Storage de ese estudio coincidían con intenciones de carga de la demostración; no aparecieron objetos ajenos en el inventario.

**Completado y verificado:**

- Eliminados mediante la API de Storage los 19 archivos exactos del inventario: versiones finales y objetos de recepción. Quedan cero objetos bajo el prefijo del estudio ficticio. Los buckets se conservaron.
- Las cinco cuentas se bloquearon inicialmente, comprobando UUID y correo exactos. Tras retirar sus dependencias se eliminaron físicamente mediante Auth Admin. No se crearon cuentas nuevas ni se cambiaron contraseñas.
- El estudio se bloqueó mediante eliminación lógica antes de retirar sus objetos y después se eliminó físicamente junto con las dos empresas y sus registros dependientes.
- Las 19 migraciones y las cinco protecciones de historial siguen presentes y activas. La huella de los objetos de Storage fuera del alcance no cambió.

La revisión automática rechazó inicialmente una transacción con bloqueos exclusivos de todas las tablas; esa variante se descartó. Después exigió autorización adicional para una excepción limitada a la función de historial. El usuario autorizó expresamente esa excepción temporal y completar el borrado. Las variantes rechazadas no se ejecutaron.

Se ejecutó una copia expresamente autorizada del [SQL de limpieza acotada](../../../supabase/maintenance/20261015-remove-cloud-fixtures.sql), sustituyendo únicamente el final ROLLBACK por COMMIT. El archivo conservado termina por defecto con ROLLBACK; no es una migración ni se ejecuta al iniciar/resetear Supabase. La única transacción de borrado bloqueó la fila del estudio ficticio, validó UUID/identidad/autoría y rechazó registros inesperados. La excepción de historial solo admitió DELETE del UUID ficticio en esa transacción administrativa. La función original se restauró antes de confirmar y las huellas de filas ajenas, definiciones del esquema y migraciones coincidieron. No se desactivaron triggers ni se usaron TRUNCATE/CASCADE.

La lectura final verificó:

| Control | Resultado |
|---|---:|
| Filas restantes de las fixtures en las 27 tablas de aplicación | 0 |
| Identidades Auth de las cinco cuentas | 0 |
| Otras cuentas Auth con correo `@example.test` | 0 |
| Archivos bajo el prefijo del estudio ficticio | 0 |
| Tablas públicas conservadas | 27 |
| Migraciones conservadas | 19 |
| Triggers de historial activos | 5 |
| Buckets documentales privados conservados | 2 |
| Excepción temporal presente en la función actual | No |

Se retiraron también versiones/revisiones, intenciones de carga, ciclos, avisos, sesiones admitidas, operaciones, auditoría, asignaciones y los catálogos/permisos pertenecientes al estudio ficticio. Las credenciales antiguas de demostración ya no permiten ingresar. El administrador real debe aprovisionarse mediante el procedimiento previsto, sin volver a sembrar datos ficticios en Cloud.

Evidencia local sin credenciales: `test-results/cloud-cleanup-discovery.json`, `cloud-file-cleanup-before.json`, `cloud-file-cleanup-result.json`, `cloud-cleanup-partial-verification.json`, `cloud-account-cleanup-result.json` y `cloud-cleanup-final-verification.json`. Las evidencias parciales se conservan como historia; la última confirma la limpieza terminada. No se ejecutaron nuevas fixtures para comprobarla.
