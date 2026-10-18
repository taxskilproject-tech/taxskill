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

- `yarn verify`: TypeScript, ESLint, arquitectura y **232 pruebas en 29 archivos** aprobados.
- `yarn build`: build de producción correcto, 19 entradas estáticas, Proxy y cuatro API routes; última ejecución en **27,47 s**.
- `yarn check:bundle`: secretos administrativos/HMAC/integraciones ausentes del bundle público.
- Docker limpio: **64 migraciones**, siete suites SQL y **78 casos pgTAP**; H08 live **28 comprobaciones** y H03 live **59**.
- Recuperación Docker aislada: DB cifrada, relaciones, **13 huellas históricas**, objeto real de 883 bytes, sesión previa revocada y login nuevo correcto. No acredita el volumen ni RTO productivo.
- Cloud: **64 migraciones**, **29 tablas públicas con RLS**, lint sin errores y **13 huellas antes/después idénticas**. Cero usuarios, organizaciones, perfiles y versiones antes/después; ningún fixture remoto.
- Cinco variables Edge instaladas y contrastadas por huella; cleanup previo conservado. No se activaron jobs de generación o WhatsApp.
- Panel operativo comprobado en escritorio contra Docker, incluidos actualización y alertas. [Captura](capturas/h08/operacion-escritorio.png). La capacidad de viewport del navegador no aplicó el tamaño móvil: validación móvil H08 pendiente.
- Revisión final del repositorio: 634 archivos candidatos contrastados con 20 valores secretos configurados, sin coincidencias; 483 destinos de enlaces Markdown locales comprobados, sin archivos ausentes. No acredita cada ancla ni los enlaces externos. `.env.vercel`, `.envs/` y resultados privados permanecen ignorados por Git.

Las evidencias históricas mantienen sus fechas y límites; las verificaciones anteriores no se atribuyen todas a una nueva ejecución en esta revisión.

<a id="pendientes-para-cierre-productivo"></a>
## Pendientes para cierre productivo

| Pendiente | Estado concreto | Responsable / condición para cerrarlo |
|---|---|---|
| Auth Cloud | Configuración preparada y diff revisado; **no aplicada**. La revisión automática exige autorización específica para dominio, registro, contraseña, confirmación y hooks. | Usuario autoriza el cambio solicitado; agente aplica el subconjunto y verifica configuración efectiva. |
| Edge Cloud | Documentos existe como versión 4 con autenticación propia; notificaciones aún no está publicada. Despliegue bloqueado por revisión automática por `verify_jwt=false`. | Usuario autoriza las dos funciones con autenticación propia; agente publica, conserva secretos y verifica inventario. |
| Vercel | `https://taxskill.vercel.app/` devuelve **404 `DEPLOYMENT_NOT_FOUND`**. El proyecto requiere login en el navegador disponible. | Usuario habilita sesión/acceso al proyecto; importar `.env.vercel`, publicar commit compatible y comprobar dominio, sesión y endpoints. No compartir claves por chat. |
| Administrador real | Cloud no tiene usuarios ni estudio. No se dispone de nombre/correo del administrador real. | Usuario proporciona identidad y nombre del estudio; contraseña mediante configuración privada. Bootstrap una vez y comprobar su cierre. |
| Respaldo independiente | No hay bucket elegido/configurado, conexión DB/CA ni custodia externa de clave. Implementación actual usa AWS S3; B2/R2 requieren adaptar endpoint/autenticación al elegir proveedor. | Usuario indica destino/cuenta/bucket; configurar identidad mínima, cifrado/retención, ejecutar copia externa y restaurarla en Docker aislado. [Opciones](../../respaldos-opciones.md). |
| n8n/WhatsApp | Workflow y Production URL disponibles; tokens por instalar en las credenciales n8n, activación y prueba real pendientes. No se ha indicado destinatario autorizado. | Configurar cuatro credenciales separadas y número autorizado en Usuarios; comprobar envío, replay y receipt. `sent` no equivale a `delivered`. |
| Programación y monitor | Implementados, sin habilitar automatización productiva. Solo permanece el cleanup que ya existía. | Después de copia/ensayo y canal correctos, habilitar programación y comprobar horarios Lima, progreso y recepción de alertas por el responsable real. |
| Piloto y aceptación | Sin estudio/usuarios autorizados ni aplicación publicada; no hay piloto productivo ni medición de capacidad objetivo. | Producto configura empresas/reglas/responsables, ejecuta recorridos por perfil, revisión móvil efectiva y acepta resultados/objetivos de recuperación. |

No se necesita volver a implementar H01–H07 para resolver estas dependencias. **H08 permanece abierto** hasta disponer de sus recursos y evidencias; las funciones futuras comerciales continúan fuera del alcance del MVP.

## Continuación segura

1. Resolver las autorizaciones Auth/Edge ya solicitadas y el acceso Vercel. No repetir operaciones rechazadas por otra vía.
2. Configurar identidad real y recursos privados sin enviar contraseñas por chat.
3. Completar backup independiente y ensayo, publicar la aplicación/canal y verificar los contratos con datos autorizados.
4. Activar jobs/monitor, ejecutar el piloto y registrar aceptación de producto y versión publicada.

Todos los datos sintéticos, SQL de prueba y suites de integración continúan exclusivamente en Docker. Los controles remotos de esta revisión fueron publicación autorizada de migraciones, configuración de secretos e inventarios/lint; no hubo seeds, mensajes reales ni purgas de datos.
