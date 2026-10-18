# Registro de cierre técnico y dependencias de publicación

**Actualizado:** 18 de octubre de 2026. **Solicitud:** terminar los hitos pendientes. Este registro consolida las entregas comprobadas y las dependencias que aún requieren recursos, autorizaciones o aceptación del producto. No sustituye el piloto ni acredita acciones no ejecutadas.

Referencias: [índice](../README.md), [H08](../h08-preparacion-produccion.md), [evidencias H08](h08.md), [operación](../../operacion-produccion.md) y [variables privadas](../../variables-entorno.md).

## Entregas de desarrollo

| Hito | Estado técnico | Evidencia vigente / alcance del cierre |
|---|---|---|
| H01 — Preparación | Terminado. | [H01](h01.md), compilación y arquitectura actuales. La dependencia de H02 está satisfecha; sus entregables ya fueron utilizados. |
| H02 — Acceso y empresas | Terminado en Docker. | [Reconstrucción H02/H03](validacion-local-h02-h03.md). Cuentas, empresas, roles y asignaciones; seguridad transversal entregada en H08. |
| H03 — Recorrido documental | Terminado en Docker. | [Reconstrucción](validacion-local-h02-h03.md) y [regresión H08](h08.md): 59 comprobaciones con RLS, carga, revisión, corrección, reapertura y descarga. |
| H04 — Motor | Terminado; esquema publicado. | [H04](h04.md), generación y snapshots preservados. Programación productiva sujeta a backup/recuperación H08. |
| H05 — Áreas y expediente | Terminado; esquema publicado. | [H05](h05.md), ingreso, cese, reingreso e historia laboral. |
| H06 — Actividades y avisos | Desarrollo terminado; canal productivo pendiente en H08. | [H06](h06.md), [contratos](../../actividades-notificaciones.md) y [workflow Evolution entregado](../../../integrations/n8n/produccion/README.md). Las pruebas del proveedor fueron locales. |
| H07 — Supervisión y reportes | Terminado; correcciones publicadas. | [REV-01–03](h07-correcciones.md), [REV-04–05](h07-cierre-complementario.md) y [revalidación](revalidacion-base-h08.md). |
| H08 — Producción | Implementación técnica y recuperación local terminadas; publicación parcial. | [H08](h08.md): esquema completo Cloud y variables Edge instaladas. Quedan los habilitadores y la aceptación indicados abajo. |

Los casilleros de aceptación formal que permanecen en H02–H05 corresponden a decisiones del responsable de producto, no a código faltante. No se inventa una aprobación del equipo ni un piloto a partir de la solicitud de terminar el trabajo. La aceptación integral se registra al completar H08.

## Verificación consolidada

- `yarn verify`: TypeScript, ESLint, arquitectura y **247 pruebas en 31 archivos** aprobados; última ejecución en 117,26 s.
- `yarn build`: build de producción correcto, 19 entradas estáticas, Proxy y cuatro API routes; última ejecución en **19,26 s**.
- `yarn check:bundle`: secretos administrativos/HMAC/integraciones ausentes del bundle público.
- Docker limpio: **64 migraciones**, siete suites SQL y **78 casos pgTAP**; H08 live **28 comprobaciones** y H03 live **59**.
- Recuperación Docker aislada: DB cifrada, relaciones, **13 huellas históricas**, objeto real de 883 bytes, sesión previa revocada y login nuevo correcto. No acredita el volumen ni RTO productivo.
- Cloud: **64 migraciones**, **29 tablas públicas con RLS**, lint sin errores y **13 huellas antes/después idénticas**. Cero usuarios, organizaciones, perfiles y versiones antes/después; ningún fixture remoto.
- Cinco variables Edge instaladas y contrastadas por huella; cleanup previo conservado. No se activaron jobs de generación o WhatsApp.
- Panel operativo comprobado en escritorio contra Docker, incluidos actualización y alertas. [Captura](capturas/h08/operacion-escritorio.png). La capacidad de viewport del navegador no aplicó el tamaño móvil: validación móvil H08 pendiente.
- Revisión final del repositorio: 643 archivos candidatos contrastados con 22 valores secretos configurados, sin coincidencias; 486 destinos de enlaces Markdown locales comprobados, sin archivos ausentes. No acredita cada ancla ni los enlaces externos. `.env.vercel`, `.envs/` y resultados privados permanecen ignorados por Git.

Las evidencias históricas mantienen sus fechas y límites; las verificaciones anteriores no se atribuyen todas a una nueva ejecución en esta revisión.

<a id="pendientes-para-cierre-productivo"></a>
## Pendientes para cierre productivo

| Pendiente | Estado concreto | Responsable / condición para cerrarlo |
|---|---|---|
| Auth Cloud | **Aplicado y comprobado** tras autorización: registro desactivado, contraseñas solo administrativas, sin confirmación por correo y hooks activos. Diff declarado restante: cero. | Cerrado el ajuste; nueve opciones remotas ajenas conservadas. Login real de Josmel admitido por el hook. |
| Edge Cloud | **Publicadas**: documentos v5 y notificaciones v1, con autenticación propia. Llamadas anónimas devuelven 401. | Despliegue cerrado; recorridos con documentos reales corresponden al piloto. |
| Vercel | Usuario confirma proyecto importado y gestiona la publicación. Recibió clasificación de las seis variables. Última comprobación del dominio: `DEPLOYMENT_NOT_FOUND`. | Importar `.env.vercel` como Production, asignar Config/Secret según [tabla](../../variables-entorno.md#importación-en-vercel), redesplegar y verificar dominio/endpoints. No se requiere entregar sesión Vercel al agente. |
| Administrador real | **Creado** Josmel, habilitado/listo. Login confiable y cierre de la sesión de comprobación correctos. Contraseña solo en `.envs/cloud/bootstrap.env`, ignorado. | Aprovisionamiento cerrado. Contacto de Josmel queda vacío por indicación del usuario; se actualizará después en Usuarios. |
| Respaldo | Usuario eligió **Supabase Storage temporal**, aplazando el proveedor externo. Bucket privado `system-backups` creado, cifrado/copia incremental/descarga/restore comprobados en Docker. Intento real falló por faltar CA Supabase; no hay copia productiva confirmada. | Instalar CA/conexión verificadas, ejecutar copia y ensayo real. No reducir TLS. Custodiar clave fuera del mismo proyecto. [Opciones externas aplazadas](../../respaldos-opciones.md). |
| n8n/WhatsApp | Cuatro credenciales separadas configuradas; la clave Evolution proporcionada por el usuario se guardó exclusivamente en la credencial privada y quedó vinculada al nodo. Publish bloqueado por revisión automática: confirmación específica solicitada. | Autorizar publicación/activación y comprobar el envío autorizado sin inventar obligaciones en Cloud; recorrido de digest/replay/receipt con datos reales configurados. `sent` no equivale a `delivered`. |
| Programación y monitor | Implementados, sin habilitar automatización productiva. Solo permanece el cleanup que ya existía. | Después de copia/ensayo y canal correctos, habilitar programación y comprobar horarios Lima, progreso y recepción de alertas por el responsable real. |
| Piloto y aceptación | Sin estudio/usuarios autorizados ni aplicación publicada; no hay piloto productivo ni medición de capacidad objetivo. | Producto configura empresas/reglas/responsables, ejecuta recorridos por perfil, revisión móvil efectiva y acepta resultados/objetivos de recuperación. |

No se necesita volver a implementar H01–H07 para resolver estas dependencias. **H08 permanece abierto** hasta disponer de sus recursos y evidencias; las funciones futuras comerciales continúan fuera del alcance del MVP.

## Continuación segura

1. Auth/Edge y administrador real ya están disponibles. Usuario completa variables y redespliegue Vercel.
2. Resolver la confirmación de publicación n8n y completar CA/conexión del ejecutor de respaldo. La clave Evolution ya está guardada y no se versiona.
3. Completar copia temporal en Storage y ensayo, publicar el canal y verificar los contratos con datos autorizados. La independencia externa queda aplazada por elección del usuario.
4. Activar jobs/monitor, ejecutar el piloto y registrar aceptación de producto y versión publicada.

Todos los datos sintéticos, SQL de prueba y suites de integración continúan exclusivamente en Docker. En Cloud se publicaron migraciones/configuración/funciones autorizadas y se creó el administrador real. El respaldo real fallido permanece registrado; no hubo seeds, mensajes ni purgas de datos.

## Continuación autorizada del 18 de octubre

La confirmación del usuario resolvió los rechazos previos de Auth/Edge; no se eludieron. Se verificó el ingreso real, admisión del hook de contraseña y salida de la sesión del operador, sin almacenar JWT. La copia en Storage del mismo proyecto es una decisión provisional explícita: no se presenta como independencia frente a pérdida del proyecto.

Regresión ampliada: **247 pruebas en 31 archivos**, TypeScript, ESLint y arquitectura aprobados. Ensayo de copia local más Storage, reutilización incremental, descarga completa y restore aislado aprobado en **151,40 s**; 64 migraciones, 13 huellas históricas, un objeto real de 883 bytes y sesiones/jobs inactivos tras recuperar. No es una medición de capacidad productiva.

### Corrección del instalador Vercel

El deployment Vercel observado utilizaba Yarn global 1.22.19 y fallaba contra `engines.yarn=1.22.22`. Se añadió `vercel.json` con instalación `corepack yarn install --frozen-lockfile` y compilación `corepack yarn build`, usando el `packageManager` ya fijado. Verificación local: Corepack selecciona 1.22.22, instalación offline/frozen correcta y build de producción aprobado en 34,19 s. No se alteró `yarn.lock`, no se ignoraron engines ni se añadieron variables. Es necesario desplegar el commit que incluye esta corrección.
