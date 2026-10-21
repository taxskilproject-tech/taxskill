# Registro de cierre técnico y dependencias de publicación

**Segunda corrección del 20/10/2026:** [remediación AUD2](correcciones-auditoria-2-2026-10-20.md). Preparación masiva, aislamiento del despacho y panel corregidos; 100 destinatarios/20 páginas, máximo 624,40 ms por RPC, más 286 unitarias, 123 SQL, H06 170, seguridad H08 28 y restauración con 71 migraciones. Supabase Cloud actualizado: **71 migraciones, Edge de notificaciones v3 y 13 huellas conservadas**, sin activar jobs. Frontend comprobado en Docker; falta push/Vercel por conexión a GitHub. Se mantienen los pendientes operativos y de aceptación descritos abajo.

**Seguimiento del 20/10/2026:** [correcciones de la auditoría integral](correcciones-auditoria-2026-10-20.md). Programador, avisos, monitor, CI y JSON TI corregidos y comprobados; CAP-01 finalizó las 12.000 obligaciones activas sin timeout ni duplicados. Cuatro migraciones y Edge de notificaciones publicados: **68 migraciones, 29 tablas con RLS y 13 huellas conservadas**. Jobs productivos sin cambios. Los resultados anteriores de este documento conservan su fecha y las condiciones operativas/piloto de H08 siguen abiertas.

**Actualizado:** 18 de octubre de 2026. **Solicitud:** terminar los hitos pendientes. Este registro consolida las entregas comprobadas y las dependencias que aún requieren recursos, autorizaciones o aceptación del producto. No sustituye el piloto ni acredita acciones no ejecutadas.

Referencias: [índice](../README.md), [H08](../h08-preparacion-produccion.md), [evidencias H08](h08.md), [operación](../../operacion-produccion.md) y [variables privadas](../../variables-entorno.md).

**Canal al 19/10/2026:** [instancia TI publicada y mensaje manual recibido](whatsapp-ti.md). Se corrigió el nombre exacto con espacio inicial mediante `%20TI`: conexión 200/open, envío HTTP 201 con ID y recepción confirmada por el destinatario. Workflow de prueba archivado. Sigue pendiente el digest/receipt productivo completo; sin fixtures Cloud ni activación de jobs.

**Última aceptación funcional:** [pruebas Docker del 18 de octubre](aceptacion-funcional-docker-h08.md). H02–H08 reejecutados localmente; 249 pruebas unitarias y siete nuevas del puerto aprobadas, siete suites SQL/78 casos y recorridos API completos. Lecturas de capacidad H07 con P95 final inferior a dos segundos. Se corrigió y verificó el foco del salto al contenido. Se añade **CAP-01 abierta** para timeout de avisos con 12.000 obligaciones sin responsable; no se presenta el circuito H06 aislado como aceptación de esa carga masiva.

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
- `corepack yarn build`: build de producción correcto, 19 entradas estáticas, Proxy y cuatro API routes; última ejecución en **34,19 s**. Vercel instaló con Yarn **1.22.22** y terminó en **Ready**.
- `yarn check:bundle`: secretos administrativos/HMAC/integraciones ausentes del bundle público.
- Docker limpio: **64 migraciones**, siete suites SQL y **78 casos pgTAP**; H08 live **28 comprobaciones** y H03 live **59**.
- Recuperación Docker aislada: DB cifrada, relaciones, **13 huellas históricas**, objeto real de 883 bytes, sesión previa revocada y login nuevo correcto. No acredita el volumen ni RTO productivo.
- Cloud: **64 migraciones**, **29 tablas públicas con RLS**, lint sin errores y **13 huellas antes/después idénticas**. Cero usuarios, organizaciones, perfiles y versiones antes/después; ningún fixture remoto.
- Cinco variables Edge instaladas y contrastadas por huella; cleanup previo conservado. No se activaron jobs de generación o WhatsApp.
- Panel operativo comprobado en escritorio contra Docker, incluidos actualización y alertas. [Captura](capturas/h08/operacion-escritorio.png). El primer navegador no aplicó viewport móvil; después se verificaron expediente y detalle documental en Chrome móvil real del laboratorio, con [evidencia separada](aceptacion-funcional-docker-h08.md#5-interfaz-móvil-y-teclado). No acredita todos los formularios ni piloto móvil productivo.
- Revisión final del repositorio: 643 archivos candidatos contrastados con 22 valores secretos configurados, sin coincidencias; 486 destinos de enlaces Markdown locales comprobados, sin archivos ausentes. No acredita cada ancla ni los enlaces externos. `.env.vercel`, `.envs/` y resultados privados permanecen ignorados por Git.

Las evidencias históricas mantienen sus fechas y límites; las verificaciones anteriores no se atribuyen todas a una nueva ejecución en esta revisión.

<a id="pendientes-para-cierre-productivo"></a>
## Pendientes para cierre productivo

| Pendiente | Estado concreto | Responsable / condición para cerrarlo |
|---|---|---|
| Auth Cloud | **Aplicado y comprobado** tras autorización: registro desactivado, contraseñas solo administrativas, sin confirmación por correo y hooks activos. Diff declarado restante: cero. | Cerrado el ajuste; nueve opciones remotas ajenas conservadas. Login real de Josmel admitido por el hook. |
| Edge Cloud | **Publicadas**: documentos v5 y notificaciones v1, con autenticación propia. Llamadas anónimas devuelven 401. | Despliegue cerrado; recorridos con documentos reales corresponden al piloto. |
| Vercel | **Publicado en Production, Ready**, commit `2618846`. Logs confirman `corepack yarn install --frozen-lockfile`, Yarn 1.22.22 y compilación correcta. Dominio muestra `/login`; receipt anónimo devuelve 401. [Captura](capturas/h08/vercel-ready.png). | Instalador y publicación resueltos. Completar login y recorridos autorizados por perfiles, preview separado y capacidad objetivo. Las seis variables mantienen su [clasificación](../../variables-entorno.md#importación-en-vercel). |
| Administrador real | **Creado** Josmel, habilitado/listo. Login confiable y cierre de la sesión de comprobación correctos. Contraseña solo en `.envs/cloud/bootstrap.env`, ignorado. | Aprovisionamiento cerrado. Contacto de Josmel queda vacío por indicación del usuario; se actualizará después en Usuarios. |
| Respaldo | Usuario eligió **Supabase Storage temporal**, aplazando el proveedor externo. CA oficial instalada, TLS verificado y copia productiva **correcta**, ID `ffe0c353-a303-4499-8189-57dbd8362eeb`, cifrada en `system-backups`. Descarga y restore Docker nuevo aprobados en **54,38 s**, 64 migraciones, 13 huellas coincidentes, sesiones revocadas y login nuevo correcto. Registro real `c0753bb3-d484-4d96-95cd-b323dd89a606`. | Configurar ejecutor permanente/retención y validar objetivos con volumen real; la copia actual no contiene documentos. Custodiar clave fuera del mismo proyecto. [Opciones externas aplazadas](../../respaldos-opciones.md). |
| n8n/WhatsApp | **Publicado y activo** tras autorización específica: versión **H08 · Canal autenticado TaxSkill**, workflow `MvcIvz2cHEe2jiCj`. Cuatro credenciales separadas seleccionadas; clave Evolution solo en n8n. Webhook anónimo rechazado con 403. [Captura](capturas/h08/n8n-publicado.png). | Comprobar el envío autorizado sin inventar obligaciones en Cloud; recorrido de digest/replay/receipt con datos reales configurados. Publicación no acredita entrega: `sent` no equivale a `delivered`. |
| Programación y monitor | Implementados, sin habilitar automatización productiva. Solo permanece el cleanup que ya existía. | Después de copia/ensayo y canal correctos, habilitar programación y comprobar horarios Lima, progreso y recepción de alertas por el responsable real. |
| CAP-01 · capacidad del procesador de avisos | **Corregida y publicada el 20/10.** Con la fuente masiva activa: 120 páginas, 12.000 incidencias, máximo 408,18 ms por llamada, sin duplicados. H06 completo pasó 170 comprobaciones con la fuente activa. | [Regresión y publicación](correcciones-auditoria-2026-10-20.md). La capacidad concurrente/productiva sigue sujeta al piloto; se conserva el fallo histórico y su criterio. |
| Piloto y aceptación | Aplicación y administrador real disponibles; recorridos y muestra móvil comprobados en Docker. Sin empresas/perfiles de piloto real configurados ni aceptación productiva o medición de capacidad objetivo. | Producto configura empresas/reglas/responsables, ejecuta recorridos por perfil en el entorno objetivo y acepta resultados/objetivos de recuperación; resolver CAP-01 antes de aceptar esa capacidad masiva. |

No se necesita volver a implementar H01–H07 para resolver estas dependencias. **H08 permanece abierto** hasta disponer de sus recursos y evidencias; las funciones futuras comerciales continúan fuera del alcance del MVP.

## Continuación segura

1. Auth/Edge, administrador real y aplicación Vercel ya están disponibles; instalador corregido y publicación Ready comprobada.
2. n8n ya está publicado con autenticación y credenciales separadas. Completar envío/replay/receipts con datos autorizados; mantener jobs detenidos.
3. La copia real temporal en Storage ya existe y pasó descarga/recuperación aislada; configurar ejecutor permanente, retención y objetivos de recuperación. La independencia externa queda aplazada por elección del usuario.
4. Activar jobs/monitor, ejecutar el piloto y registrar aceptación de producto y versión publicada.

Todos los datos sintéticos, SQL de prueba y suites de integración continúan exclusivamente en Docker. En Cloud se publicaron migraciones/configuración/funciones autorizadas, se creó el administrador real y se guardó una copia cifrada real. Los respaldos fallidos anteriores permanecen registrados; no hubo seeds, mensajes ni purgas de datos.

## Continuación autorizada del 18 de octubre

La confirmación del usuario resolvió los rechazos previos de Auth/Edge; no se eludieron. Se verificó el ingreso real, admisión del hook de contraseña y salida de la sesión del operador, sin almacenar JWT. La copia en Storage del mismo proyecto es una decisión provisional explícita: no se presenta como independencia frente a pérdida del proyecto.

Regresión ampliada: **247 pruebas en 31 archivos**, TypeScript, ESLint y arquitectura aprobados. Ensayo de copia local más Storage, reutilización incremental, descarga completa y restore aislado aprobado en **151,40 s**; 64 migraciones, 13 huellas históricas, un objeto real de 883 bytes y sesiones/jobs inactivos tras recuperar. No es una medición de capacidad productiva.

### Corrección del instalador Vercel

El deployment Vercel observado utilizaba Yarn global 1.22.19 y fallaba contra `engines.yarn=1.22.22`. Se añadió `vercel.json` con instalación `corepack yarn install --frozen-lockfile` y compilación `corepack yarn build`, usando el `packageManager` ya fijado. Verificación local: Corepack selecciona 1.22.22, instalación offline/frozen correcta y build de producción aprobado en 34,19 s. No se alteró `yarn.lock`, no se ignoraron engines ni se añadieron variables. El commit **2618846** fue publicado: deployment **3shjjWsSsUiLiuskDeuzwNEwZx22**, Production **Ready**, con login accesible en el [dominio real](https://taxskill.vercel.app/login).

### Publicación n8n y conexión de respaldo

Tras la autorización explícita del usuario se publicó **H08 · Canal autenticado TaxSkill**. n8n confirmó “Workflow published” y disponibilidad de la URL productiva. No se ejecutó manualmente el workflow ni se enviaron mensajes; la programación de Supabase continúa detenida.

La CA pública oficial se validó con `X509Certificate` como **Supabase Root 2021 CA**, vigente hasta abril de 2031. El ejecutor conserva TLS `verify-full`; el dump usa el rol autorizado `postgres` que aplica el propio CLI. Se añadió una regresión para ese rol, conservación de TLS, contraseña fuera de argumentos y rechazo de proyectos ajenos. Verificación del cambio: **19 pruebas en cuatro archivos**, ESLint, TypeScript y arquitectura aprobados. La contraseña temporal del CLI se retiró después del ensayo.

La copia real se descargó y restauró en un proyecto Docker nuevo, vacío y detenido al finalizar, conservando sus volúmenes. Relaciones y 13 huellas contrastadas; 64 migraciones, sesiones previas revocadas, jobs ausentes y login nuevo correcto. Duración del ensayo **54,38 s**. El Cloud actual tiene cero versiones documentales y esta copia tiene **cero objetos**; la prueba de recuperación de bytes permanece acreditada por el ensayo Docker con un PDF. No se añadieron documentos ficticios a Cloud. La recuperación real se registró después del resultado comprobado, sin convertir los fallos anteriores en éxito. RPO diario, retención, volumen objetivo y custodia independiente siguen por validar.
