# Revalidación de la base para H08

**Fecha local:** 17 de octubre de 2026 (`America/Bogota`, mismo desplazamiento UTC-5 que Lima). **Versión revisada:** `bcefb6466e9b0950f3c5d17641ab7189912d2d11`. **Dictamen:** no se encontraron nuevos defectos funcionales confirmados en las comprobaciones ejecutadas; la base técnica permite comenzar H08. REV-01–REV-05 conservan su cierre. La preparación productiva y la aceptación formal siguen pendientes.

Referencias: [hitos](../README.md), [H08 y su entrada](../h08-preparacion-produccion.md), [cierre REV-01–REV-03](h07-correcciones.md), [cierre REV-04–REV-05](h07-cierre-complementario.md) y [entornos](../../desarrollo.md).

## 1. Comprobaciones ejecutadas de nuevo

| Comprobación | Resultado |
|---|---|
| `yarn verify` | PASS: TypeScript, ESLint, arquitectura y **227 pruebas en 27 archivos**. |
| `yarn build` | PASS: 19 páginas, dos workers (`CIRCLE_NODE_TOTAL=3`) y Proxy. |
| `yarn check:bundle` | PASS: valores privados configurados ausentes del bundle público. |
| Secretos versionados | PASS: 575 candidatos contrastados con secretos configurados, sin imprimir sus valores; configuración Docker y respaldos personales permanecen fuera del repositorio. |
| SQL Docker | PASS: seis suites, **34 casos pgTAP** y sus aserciones internas; repetidos también después de los reinicios de Docker. |
| `yarn db:lint` | PASS en `public`/`private`, también después del arranque en frío. |
| Auth y Data API locales | HTTP 200 en `/auth/v1/health` y `/rest/v1/`, con destino validado `127.0.0.1:54331`. |
| Cloud, solo lectura | **57 versiones local/remoto coincidentes**, 29 tablas, resolver de auditoría y helper privado de indicadores presentes; selector utiliza indicadores y conserva la exigencia conjunta lectura/exportación. Cero jobs de WhatsApp. |
| Documentación existente | 40 Markdown versionados y 401 destinos locales comprobados, sin archivos destino ausentes. No es una validación de cada ancla Markdown ni de enlaces externos. |
| Base de código | Sin cambios de código, migraciones ni contratos durante esta revisión; se añaden únicamente este registro y la documentación del ajuste local de Docker. |

Cloud conserva cero tablas con RLS: es el trabajo acordado de T01/H08, no una protección ya implementada. No se ejecutaron fixtures, migraciones, SQL de prueba ni operaciones de negocio en Cloud en esta revalidación.

## 2. Cobertura por hito

| Área | Revisión y alcance |
|---|---|
| H01 | Compilación, tipado estricto, Atomic Design, límites de componentes, ciclos, imports, rutas y separación de secretos mediante las verificaciones existentes. |
| H02 | Contratos de acceso, contexto/caché, administración y soft delete en pruebas y SQL. Registro/revocación universal de sesiones, privilegios y RLS siguen en H08. |
| H03 | Regresión SQL de entregas/versiones/revisión/corrección/reapertura y revisión de hooks de carga, descarga y control de concurrencia. |
| H04 | Regresión del motor/calendario, ocurrencias, snapshots e idempotencia; conservación de las migraciones aplicadas. |
| H05 | Regresión laboral y revisión del expediente, selección de etapas, formularios y generación. |
| H06 | Regresión de actividades, avisos e integración en las suites existentes; revisión de filtros, responsables, canal y feedback. |
| H07 | Las cinco observaciones siguen cerradas; regresión de auditoría, navegación, filtros combinados y exportación contextual. La corrección remota permanece presente. |

No se repitió en esta revisión el laboratorio n8n completo, todos los recorridos visuales por dispositivo, las seis integraciones live ni la instalación limpia de todas las migraciones. Sus evidencias anteriores siguen ligadas a la base de código que no cambió. La medición de capacidad y las capturas posteriores a las correcciones se conservan en el [cierre complementario](h07-cierre-complementario.md). No se atribuyen a esta ejecución pruebas históricas ni una nueva aceptación del piloto.

## 3. Incidencia del entorno resuelta: telemetría de Docker

Al comenzar, el motor Linux estaba detenido. El arranque confirmó de nuevo el fallo de `userAnalyticsOtlpHttp.sock`: el componente OTel no podía retirar un socket temporal. Se conservó la carpeta temporal con otro nombre para recuperar el motor; no se borraron imágenes, contenedores, volúmenes ni bases.

Después, a petición expresa del usuario, se cambió únicamente **`analyticsEnabled` a `false`** en `%APPDATA%\Docker\settings.json`, con respaldo íntegro previo junto al original. Docker documenta esa opción como el control del envío local de estadísticas e informes de fallo. [Referencia oficial](https://docs.docker.com/desktop/enterprise/hardened-desktop/settings-management/settings-reference/).

Con autorización explícita para la interrupción de los proyectos locales, se realizaron **dos reinicios**, el segundo incluyendo una terminación exclusiva de la VM `docker-desktop`. Entre esas dos pruebas no se volvió a limpiar ni renombrar el socket. Ambos arranques respondieron con Engine **26.1.4**, el ajuste permaneció en `false` y no se reprodujo el fallo. Versión instalada de Desktop: 4.31.1.

Se guardó el inventario previo, se detuvieron los contenedores con plazo para confirmar datos y se restablecieron exactamente los **18 contenedores originales**. El inventario de **14 volúmenes** permaneció idéntico; las bases y servicios locales volvieron a funcionar. No se cambió el servicio de Windows cuyo inicio carecía de permisos ni se modificaron preferencias de red, recursos o integración WSL. Los respaldos y diagnósticos personales no se versionan.

La comprobación acredita persistencia del ajuste y dos arranques correctos en esta máquina; no demuestra que todas las variantes del fallo interno de Docker estén resueltas para otras versiones o futuras actualizaciones. El [reporte de arranque de la misma versión](https://github.com/docker/for-win/issues/14176) aporta contexto del componente, sin sustituir las verificaciones locales.

## 4. Entrada a H08

No hay una nueva observación funcional que requiera reabrir H07. Empezar por **H08-T01**, inventario de recursos y matriz de acceso, seguido de T02/T03: privilegios/RLS, Storage y sesiones admitidas/revocadas. Conservar las pruebas y recorridos existentes como regresión al introducir esas protecciones.

Dominio, secretos por entorno, n8n/proveedor reales, programación, copias independientes de DB/objetos, restauración, monitoreo y piloto son tareas propias de H08. Las casillas de aceptación de producto que el equipo no ha firmado permanecen abiertas. La entrada a H08 no autoriza un piloto con datos reales antes de cumplir sus controles previos.

## 5. Revisión repetida antes de iniciar H08

**Fecha local:** 17 de octubre de 2026. **Versión contrastada:** `2b4631ffbe4f60a2aedf6f5de7901fda41f2f3f3`. Desde el cierre correctivo `7b18e83` no cambiaron código, migraciones ni contratos; los cambios posteriores corresponden a documentación y evidencias. No se encontraron nuevos defectos funcionales confirmados ni un impedimento técnico para comenzar H08 en el alcance revisado.

Se ejecutaron de nuevo `yarn verify` (**227 pruebas / 27 archivos**, TypeScript, ESLint y arquitectura), las seis suites SQL locales (**34 casos pgTAP**), `yarn db:lint`, `yarn build` (**19 páginas y Proxy**) y `yarn check:bundle`: todos finalizaron correctamente. Los tipos públicos generados desde Docker coinciden con los versionados al normalizar el formato; no se modificó su archivo. El contraste de secretos configurados abarcó 575 archivos candidatos. Se comprobaron 41 Markdown versionados y 410 destinos locales, sin archivos destino ausentes; no incluye verificación de anclas ni enlaces externos.

Los dos primeros intentos de build fallaron al conectar con el subproceso Node de Turbopack, también fuera del sandbox. Se apartó exclusivamente `.next` a una carpeta ignorada dentro de `test-results/revision-pre-h08/`, comprobando previamente sus rutas y que no fuera un enlace. Al regenerar con `yarn build`, el build completo pasó. Se siguió el procedimiento ya documentado en [desarrollo](../../desarrollo.md#10-ajustes-de-compatibilidad-documentados), sin cambiar fuentes, dependencias ni configuración de Next.js.

Cloud se consultó únicamente en lectura: **57 migraciones local/remoto coincidentes**, **13 huellas históricas idénticas** al cierre autorizado, 29 tablas públicas, helper de indicadores privado, intersecciones y exigencia conjunta de lectura/exportación conservadas, resolver de auditoría presente y cero jobs de WhatsApp. RLS sigue pendiente de H08. No se publicaron migraciones, fixtures ni cambios de negocio.

La revisión adicional de fuentes cubrió contexto de sesión/caché, bloqueo de dobles acciones, carga recuperable, cancelación, suscripciones de avisos, intersección de indicadores y exportación paginada/contextual. Los scripts de integración conservan la validación del destino local antes de crear clientes o fixtures. No se repitieron en esta ejecución todos los recorridos visuales, integraciones live, laboratorio n8n, instalación limpia o mediciones de capacidad: se mantienen los límites y evidencias históricas descritos arriba.

**Dictamen vigente:** comenzar H08 por su inventario de recursos y matriz de acceso (T01), seguido de privilegios/RLS/Storage y sesiones (T02/T03). La aceptación formal de producto y el cierre productivo siguen pendientes; no hay una nueva observación que requiera reabrir H01–H07.
