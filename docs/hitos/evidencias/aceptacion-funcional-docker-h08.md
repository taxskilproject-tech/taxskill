# Aceptación funcional en Docker · H08

**Fecha local:** 18 de octubre de 2026, `America/Lima`; algunos logs corresponden al 19 de octubre en UTC. **Base:** commit `c62ab585608a21de0a63f396619cea24d74b47d2`, más las correcciones registradas en este informe. **Solicitud:** comprobar funcionalidad con datos ficticios exclusivamente en Docker. No constituye aceptación formal del piloto ni cierre productivo de H08.

Referencias: [H08](../h08-preparacion-produccion.md), [seguridad y recuperación previas](h08.md), [cierre de hitos](cierre-hitos.md), [entornos](../../desarrollo.md), [laboratorio n8n](../../../integrations/n8n/README.md).

## 1. Entorno y límites

Supabase TaxSkill sobre Docker, API `http://127.0.0.1:54331`, base con 64 migraciones y cuentas de demostración locales. Next se probó inicialmente en 3001 y terminó en **`http://127.0.0.1:4001`**: después de reiniciar Docker, Windows reservó 3001 dentro de sus rangos excluidos y el servidor devolvía `EACCES` sin otro proceso escuchando. Se eligió 4001 y se obtuvo autorización expresa para su revisión visual; no se modificaron las exclusiones del sistema.

Las suites rechazan Supabase remoto antes de crear clientes o escribir. La nueva configuración `TAXSKILL_LOCAL_APP_PORT` solo permite los puertos 3001/4001 sobre `127.0.0.1`. Las credenciales y resultados operativos permanecen en `.envs/local/` y `test-results/`, ignorados por Git. No se añadieron datos ficticios, migraciones ni jobs en Cloud durante esta aceptación; tampoco se enviaron mensajes reales a WhatsApp.

El proveedor H06 fue simulado y n8n se ejecutó en Docker. Las pruebas SQL usaron rollback. Las pruebas de integración conservaron sus fixtures e historia local; no son una limpieza de producción.

## 2. Verificaciones ejecutadas

Los conteos pertenecen a cada suite y pueden compartir recorridos; no deben sumarse como casos independientes de producto.

| Comprobación | Resultado | Duración del comando | Evidencia privada local |
|---|---|---|---|
| `yarn verify`, primera ejecución | TypeScript, ESLint, arquitectura y **249 pruebas / 32 archivos** aprobados. | 139,47 s | `test-results/h08-acceptance-verify.log` |
| `supabase test db --local` | **7 suites, 78 casos pgTAP**, todos aprobados. | 116 s de la suite | `test-results/h08-acceptance-sql.log` |
| `yarn test:h08:live` | **28 comprobaciones** de seguridad aprobadas. | 28,05 s | `test-results/h08-acceptance-security.log` |
| `yarn test:h03:live` | **59 comprobaciones** documentales aprobadas. | 9,15 s | `test-results/h08-acceptance-documents.log` |
| `yarn test:h02:live` | Accesos, perfiles, CSRF, reintentos y sesiones aprobados también en **4001**. | 9,46 s en la última ejecución | `test-results/h08-acceptance-h02.log` |
| `yarn test:h04:live` | **78 comprobaciones** del motor aprobadas. | 41,13 s | `test-results/h08-acceptance-h04.log` |
| `yarn test:h05:live` | **207 comprobaciones**, tres recorridos documentales y etapas laborales aprobados. | 34,42 s | `test-results/h08-acceptance-h05.log` |
| `yarn test:h06:live` | **170 comprobaciones** de actividades, avisos, fallos y deduplicación aprobadas con la separación de carga descrita abajo. | 109,72 s | `test-results/h08-acceptance-h06.log` |
| `yarn test:h07:live`, repetición sin build/unitarios concurrentes | Volumen, paginación, exportaciones y auditoría aprobados. P95 de los cuatro recursos inferior a dos segundos. | 77,64 s | `test-results/h08-acceptance-h07-isolated.log` |
| Unitarias tras la interrupción de Windows | **249 pruebas / 32 archivos** aprobados con un worker. | 71,77 s | `test-results/h08-acceptance-final-unit.log` |
| Regresión del nuevo validador de puerto | **7 pruebas / 1 archivo** aprobadas: valor predeterminado, alternativa local y cinco entradas rechazadas. | 1,32 s | `test-results/h08-acceptance-port-unit.log` |
| `corepack yarn build` | Compilación de producción aprobada, 19 entradas estáticas, Proxy y cuatro excepciones API. | 30,44 s | `test-results/h08-acceptance-build.log` |
| `yarn check:bundle` | Sin secretos administrativos/HMAC/integraciones configurados en el bundle público. | 0,69 s | Resultado del comando |

La ejecución ampliada de `yarn verify` posterior a los primeros ajustes pasó tipado, ESLint y arquitectura, pero Windows abortó la fase unitaria con código nativo `3221226505` durante agotamiento de memoria. Ese intento **no se considera aprobado**. Se recuperó ejecutando las 249 pruebas con un worker; las siete nuevas se comprobaron después por separado. Son **256 pruebas aprobadas entre ambas ejecuciones**, no una afirmación de una única ejecución conjunta de 33 archivos. ESLint de los archivos modificados y `yarn typecheck` volvieron a pasar tras incorporar el validador de puerto.

## 3. Recorridos funcionales demostrados

| Área | Evidencia funcional |
|---|---|
| Acceso | Cliente, contador, supervisor y administrador; ámbitos distintos por empresa/módulo, gestión administrativa y protección CSRF. |
| Seguridad | Acceso directo Data API/RPC/Storage, Realtime privado, recursos ajenos rechazados, cuenta inhabilitada y sesión revocada sin readmisión mediante refresh. Cambio propio de contraseña y recuperación por correo rechazados. |
| Documentos | Carga TUS/reanudación, validación confiable, revisión por archivo, aprobación parcial, entrega puntual pendiente de revisión, observación con nuevo plazo, corrección y reapertura sin sobrescribir versiones. Descargas breves y limpieza limitada. |
| Motor | Diez periodicidades, generación sin duplicados, concurrencia, snapshots históricos, condiciones y avance real de Cron sin navegador. |
| Laboral | Ingreso, cese y reingreso en etapas distintas; salario exacto, expedientes históricos y generación pendiente recuperable. Flujo de archivo en tributario, laboral general y por trabajador. |
| Actividades | Adicionales de empresa e internas, responsable, prioridad, bandeja y revisión. Cliente sin acceso a internas. Indicador adicional separado. |
| Notificaciones | Avisos personales, Realtime, resumen por Cron Docker, 429/500 y timeouts, respuesta perdida, payload estable, callbacks repetidos/desordenados y replay tras reiniciar n8n sin segundo envío al proveedor simulado. |
| Supervisión | Indicadores, alcance autorizado, consulta histórica, paginación completa y exportación de 1.000 filas a Excel/PDF, con registro de auditoría. |

Los resultados simulados del proveedor demuestran el contrato y sus reintentos. No acreditan disponibilidad de Evolution, recepción de un teléfono real ni estado `delivered` productivo.

## 4. Mediciones de supervisión

Fuente sintética H07: **30 empresas, 100 usuarios, 1.000 trabajadores, 12.000 obligaciones y 1.000 versiones de metadatos**, sin 1.000 objetos reales en Storage. Consultas autenticadas por HTTP loopback, un usuario concurrente, un calentamiento y **20 mediciones por recurso**. No es una prueba de carga multiusuario.

| Recurso | P95 inicial con otras verificaciones concurrentes | P95 repetido sin build/unitarios concurrentes |
|---|---|---|
| Dashboard | 1.702,7 ms | **1.188,8 ms** |
| Reporte | **2.120,3 ms**, superior al objetivo inicial de 2 s | **1.303,1 ms** |
| Documentos | 1.914,5 ms | **761,6 ms** |
| Auditoría | 192,8 ms | **531,7 ms** |

La primera medición se conserva en `test-results/h08-acceptance-h07.log`; no se reemplaza por la repetición favorable. Los datos completos de la repetición están en [las métricas guardadas](aceptacion-h07-metricas.json). Excel: **501,04 ms**; PDF: **1.351,90 ms**; heap Node observado: **74,57 MB**, no memoria total del navegador o de Docker.

### Observación CAP-01 · avisos sobre obligaciones masivas sin responsable

Al ejecutar H06 junto a la fuente de capacidad H07 activa, `h06_run_deadlines` agotó el timeout SQL (`57014`) y Edge devolvió 503. Esa fuente contiene **12.000 obligaciones sin responsable**, además de las fixtures funcionales existentes. No se corrigió la capacidad del procesador en esta revisión.

Para comprobar separadamente el circuito funcional H06, se inactivó temporalmente **solo el estudio sintético de capacidad H07 en Docker** y se restauró su estado activo en `finally`. No se borraron obligaciones, versiones ni historia. H06 pasó las 170 comprobaciones sobre las fixtures funcionales; H07 se volvió a medir con su estudio activo.

**Estado: abierto para capacidad, sin ocultarlo como éxito integral.** Antes de aceptar procesamiento masivo de avisos, acotar/optimizar su recorrido o dividirlo en lotes y repetir el escenario con el estudio H07 activo. Criterio: completar trabajo y avanzar sin `57014`/503, manteniendo exclusiones, idempotencia, avisos válidos y seguimiento de responsables ausentes. La lectura de reportes inferior a dos segundos no cierra esta observación.

## 5. Interfaz, móvil y teclado

Se comprobaron sesión y páginas contra Docker, con cuentas ficticias. Chrome aplicó el viewport móvil solicitado de 390 × 844; el ancho DOM observado fue de unos 391 píxeles y no hubo desbordamiento horizontal de página. La navegación mantiene su propia franja desplazable. La capacidad de redimensionamiento del navegador integrado anterior no se presenta como evidencia móvil.

| Comprobación | Resultado |
|---|---|
| Login y salida | Controles mostraron `Ingresando…` / `Cerrando sesión…`, deshabilitados durante el trabajo. Login también enviado con Enter. |
| Cliente en `/usuarios` | Mensaje de acceso restringido; sin administración en la navegación. [Captura](capturas/h08/aceptacion-cliente-denegado.png). |
| Cliente en obligación | Historial y entrega visibles; sin controles de aprobación/reapertura. Detalle responsive. [Captura móvil](capturas/h08/aceptacion-cliente-entrega-movil.png). |
| Vista PDF | Control `Preparando vista…` deshabilitado; previsualización `Página 1 de 1` y cierre correctos. |
| Supervisor | Sección de revisión y reapertura visible; sin control de carga inicial para la posición pendiente. [Captura](capturas/h08/aceptacion-supervisor.png). No se atribuye una reapertura de UI nueva: la operación está cubierta por la suite API. |
| Expediente laboral | Ficha móvil, etapas separadas y cambio histórico mediante teclado con flecha y Enter. [Captura móvil](capturas/h08/aceptacion-expediente-movil.png). |
| Salto al contenido | Se detectó foco que quedaba en `BODY`. Se añadió `tabIndex={-1}` al `main` existente; tras compilar, Enter en «Ir al contenido» dejó `activeElement.id=main`, etiqueta `MAIN` y foco visible. [Captura de la corrección](capturas/h08/aceptacion-foco.png). |

No se declara revisión exhaustiva móvil de cada formulario ni aceptación del equipo por esta muestra. La sesión final de demostración administrativa quedó abierta en el navegador local 4001.

## 6. Correcciones de reproducibilidad

- **H02:** sus dos empresas se identifican por sus RUC ficticios reservados. Las aserciones se limitan a ese ámbito; las asignaciones legítimas añadidas por H05/H06 ya no causan falsos fallos de conteo. Se conservan comprobaciones de módulos distintos y rechazo de facultades de revisión del cliente.
- **H05:** antes de repetir, pausa únicamente reglas `H05 %` de su empresa ficticia y continúa pendientes anteriores mediante lotes acotados. No borra reglas ni historia. Cese admite el estado `pending` del contrato y comprueba el cierre laboral persistido; continúa su generación antes de verificar documentos no aplicables. La prueba específica de Cron sigue esperando su avance real.
- **Puerto local:** H02, setup H06 y callback H06 comparten la selección validada 3001/4001. Las siete pruebas nuevas impiden que una URL remota, otro puerto o una ruta reciban por error credenciales de la app.
- **Accesibilidad:** `main` ahora recibe el foco del enlace de salto; sin CSS personalizado, rutas nuevas ni cambios de permisos.

## 7. Estado final y trabajo restante

Docker se restableció tras el agotamiento de memoria de Windows. TaxSkill conserva sus volúmenes y servicios; no se detuvieron manualmente servicios del otro proyecto. La compilación de producción se sirve **localmente** en 4001, con funciones Edge locales servidas. El Cron H06 local se dejó **pausado**; proveedor simulado y contenedor n8n del laboratorio detenidos, como estaban antes de la prueba. La programación previa H04/H05 local se conserva. Para repetir H06, regenerar/importar su workflow para el puerto elegido y arrancar sus servicios según la guía.

No se repitieron respaldos ni restauraciones en esta aceptación. El ensayo previo real y el de bytes Docker están documentados en [H08](h08.md#aplicación-y-webhook-publicados). No se atribuyen como una prueba nueva.

Revisión antes de versionar: **656 archivos candidatos** contrastados con **22 valores secretos configurados**, sin coincidencias; **514 destinos de enlaces locales** existentes. En los siete Markdown de esta entrega se comprobaron además **136 enlaces**, incluidas sus anclas locales, sin incidencias. No es una afirmación sobre todos los enlaces externos ni sobre secretos no incluidos en ese inventario. `git diff --check` pasó.

**Resultado:** recorridos funcionales locales aprobados con las condiciones indicadas, corrección de teclado comprobada y métricas de lectura registradas. Permanecen CAP-01, capacidad/aceptación del entorno objetivo, envío y receipts reales, programación/monitor permanentes y piloto autorizado. El destino independiente de respaldo sigue aplazado por decisión del usuario. **H08 no se declara cerrado en producción.**
